"""Install only the already-finalized v0.4 player runtime into a separate release commit."""
from pathlib import Path
from urllib.request import Request, urlopen
import base64, hashlib, json, lzma, os, re, subprocess
REPO='ChatGameMax/Afterlight'
BASE='224af1c612261409bc35b2677230cd02eaf917a4'
PARTS=['39b006ffbc0fedfda00127de1c1ec9dc8df85ce0','0d52e03ef07736c92376e76da1e689fa0044b246']
DIGEST='c74f22d57112ef081f5617bf48df61b5a045a58e5be4bcf748a6d6e7a92432f9'
NAMES={'systems.js','armory.js','expeditions.js','engine.js','scenes.js','app.js','styles.css'}
assert os.environ['GITHUB_REPOSITORY']==REPO and os.environ['GITHUB_REF']=='refs/heads/release/v04-package'
TOKEN=os.environ['GH_TOKEN']
def run(args,env=None):
 r=subprocess.run(args,capture_output=True,text=True,env=env)
 if r.returncode:
  print((r.stdout+r.stderr).replace(TOKEN,'[redacted]'))
  raise RuntimeError('Release operation failed; no forced update permitted')
 return r.stdout
parts=[]
for sha in PARTS:
 req=Request(f'https://api.github.com/repos/{REPO}/git/blobs/{sha}',headers={'Authorization':'Bearer '+TOKEN,'Accept':'application/vnd.github+json','User-Agent':'afterlight-release'})
 with urlopen(req,timeout=30) as response:data=json.load(response)
 assert data['sha']==sha and data['encoding']=='base64'
 parts.append(base64.b64decode(data['content']))
packed=b''.join(parts);assert hashlib.sha256(packed).hexdigest()==DIGEST
payload=json.loads(lzma.decompress(packed,memlimit=128*1024*1024))
assert set(payload['manifest'])==NAMES and set(payload['files'])<=NAMES
Path('v04').mkdir(exist_ok=True)
for name,expected in payload['manifest'].items():
 old=Path('v03',name).read_text() if Path('v03',name).exists() else ''
 if name in payload['files']:
  change=payload['files'][name]
  assert hashlib.sha256(old.encode()).hexdigest()==change['old'],name
  bound=len(old)
  for start,stop,replacement in reversed(change['edits']):
   assert isinstance(start,int) and 0<=start<=stop<=bound
   old=old[:start]+replacement+old[stop:];bound=start
 assert hashlib.sha256(old.encode()).hexdigest()==expected,name
 Path('v04',name).write_text(old)
 if name.endswith('.js'):run(['node','--check','v04/'+name])
index=run(['git','show',BASE+':index.html']).replace('content="0.3.0"','content="0.4.0"').replace('v03/','v04/')
index=index.replace('  <script defer src="v04/engine.js">','  <script defer src="v04/expeditions.js"></script>\n  <script defer src="v04/engine.js">')
assert re.findall(r'<script defer src="([^"]+)"',index)==['v04/'+x for x in ['systems.js','armory.js','expeditions.js','engine.js','scenes.js','app.js']]
Path('index.html').write_text(index)
Path('README.md').write_text('''# AFTERLIGHT

Playable apocalypse survival sandbox, version 0.4.

At home, use Expedition planning to choose how many survivors travel and whether to bring the best available weapons/ammo and armor or leave gear at home. Preview the named party and residents before leaving. Away survivors cannot work or defend at home, and carried gear is reserved for its wearer.

Buy coats, jackets and protective vests in Armory. All protection values are fictional game balance. Defense upgrades now progress from timber to layered fortress walls, towers and a gatehouse. In the zombie scenario, departure and return scenes show the actual party, gear and unspent recovered supplies. Animations can be skipped or disabled and honor reduced motion.

Export your save before refreshing or changing devices. Valid v0.1/v0.2/v0.3 saves migrate with existing progress retained. v0.4 saves do not load in older versions. Browser saves are local to this site and device. Returning cargo is already included in shared stock; unloading never credits it twice.

This repository contains released player runtime and hosting material. Older versioned assets remain for cached pages. No account, remote AI service or telemetry is required.
''')
# A separate index guarantees the release commit contains no packaging workflow or script.
env=os.environ.copy();env['GIT_INDEX_FILE']='/tmp/afterlight-release-v04-index'
run(['git','read-tree',BASE],env)
run(['git','add','--','v04','index.html','README.md'],env)
tree=run(['git','write-tree'],env).strip()
paths=run(['git','ls-tree','-r','--name-only',tree]).splitlines()
allowed=lambda p:p in ['.nojekyll','README.md'] or re.fullmatch(r'(?:v0[234]/)?(?:index\.html|systems\.js|armory\.js|expeditions\.js|engine\.js|scenes\.js|app\.js|styles\.css)',p)
assert all(allowed(p) for p in paths),paths
run(['git','config','user.name','github-actions[bot]'])
run(['git','config','user.email','41898282+github-actions[bot]@users.noreply.github.com'])
sha=run(['git','commit-tree',tree,'-p',BASE,'-m','Release AFTERLIGHT v0.4 playable runtime','-m','Add armor, automatic expedition loadouts, home staffing, fortified base illustrations and named cargo-aware gate scenes. Preserve older saves through validated migration.']).strip()
auth=os.environ.copy();auth.update({'GIT_CONFIG_COUNT':'1','GIT_CONFIG_KEY_0':'http.https://github.com/.extraheader','GIT_CONFIG_VALUE_0':'AUTHORIZATION: basic '+base64.b64encode(('x-access-token:'+TOKEN).encode()).decode()})
assert run(['git','ls-remote','origin','refs/heads/gh-pages'],auth).split()[0]==BASE,'Live branch changed; stop for review'
run(['git','push','origin',sha+':refs/heads/release/v04-ready'],auth)
out=Path('release-output');out.mkdir()
run(['git','archive','--format=zip','-o',str(out/'released-runtime.zip'),sha])
manifest={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in ['index.html','README.md']+['v04/'+n for n in sorted(NAMES)]}
(out/'release-receipt.json').write_text(json.dumps({'release':'0.4.0','repository':REPO,'commit':sha,'tree':tree,'parent':BASE,'files':manifest,'hosting_branch_updated':False},indent=2))
print('Runtime-only release ready:',sha)
