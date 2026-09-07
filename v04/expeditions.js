/* AFTERLIGHT: deterministic party manifests, fictional armor, and inventory reservations. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./armory.js'):root.AfterlightArmory);if(typeof module==='object'&&module.exports)module.exports=api;else root.AfterlightExpeditions=api;})(typeof globalThis!=='undefined'?globalThis:this,function(A){
  'use strict';
  const armor={
    coat:{name:'Heavy coat',protection:.10,cost:8,stage:1,color:'#b29469',desc:'Layered outerwear. Light protection from fictional zombie contacts.'},
    jacket:{name:'Reinforced jacket',protection:.22,cost:18,stage:1,color:'#88775f',desc:'More coverage than a coat; useful everyday expedition protection.'},
    vest:{name:'Protective vest',protection:.34,cost:40,stage:2,color:'#719487',desc:'An armored vest. Better contact protection, never immunity.'},
    ballistic:{name:'Ballistic vest',protection:.45,cost:65,stage:3,color:'#718099',desc:'The strongest current armor tier. All protection values are fictional game balance.'}
  };
  const weaponModes={best:'Bring best weapons and ammo',equipped:'Bring selected weapon and ammo',home:'Leave weapons at home'};
  const armorModes={best:'Bring best armor',home:'Leave armor at home'};
  const resources=['food','water','scrap','medicine','fuel'];
  const ammoKeys=Object.keys(A.ammo), gunKeys=['pistol','shotgun','rifle'], armorKeys=Object.keys(armor);
  const zero=keys=>Object.fromEntries(keys.map(k=>[k,0]));
  const copy=x=>JSON.parse(JSON.stringify(x));
  const clock=s=>(s.day-1)*24+s.hour;
  const initial=s=>({size:Math.min(3,s.crew.length),weapons:'best',armor:'best',nextId:1,active:null,last:null});
  const inventory=()=>zero(armorKeys);
  const awayIds=s=>new Set(s.expedition?.active?.members.map(m=>m.id)||[]);
  const homeCrew=s=>{const away=awayIds(s);return s.crew.filter(c=>!away.has(c.id));};
  function party(s){
    const count=Math.min(s.expedition.size,s.crew.length), priority={forager:0,rest:1,grower:2,guard:3};
    return [s.crew[0],...s.crew.slice(1).sort((a,b)=>priority[a.role]-priority[b.role]||a.id-b.id)].slice(0,count);
  }
  function available(s,category){
    const total={...(category==='armor'?s.armor:s.armory.owned)}, t=s.expedition?.active;
    if(t){for(const m of t.members){const k=category==='armor'?m.armor:m.weapon;if(k!=='none'&&k!=='melee')total[k]--;}
      const loot=category==='armor'?t.armorLoot:t.weaponsLoot;for(const k of Object.keys(loot))total[k]-=loot[k];}
    return total;
  }
  function allocate(s,people,wm,am,guns=s.armory.owned,protection=s.armor,ammo=s.armory.ammo){
    const remaining={...guns}, shells={...ammo}, clothes={...protection};
    const order=wm==='equipped'?[s.armory.equipped]:['rifle','shotgun','pistol'];
    const members=people.map(c=>{
      let weapon=wm==='home'?'none':'melee', covering='none';
      if(wm!=='home')for(const k of order){const w=A.weapons[k];if(k!=='melee'&&remaining[k]>0&&shells[w.ammo]>=w.rounds){weapon=k;remaining[k]--;shells[w.ammo]-=w.rounds;break;}}
      if(am==='best')for(const k of [...armorKeys].reverse())if(clothes[k]>0){covering=k;clothes[k]--;break;}
      return {id:c.id,weapon,armor:covering,ammo:weapon==='melee'||weapon==='none'?0:A.weapons[weapon].rounds};
    });
    // Start with one complete response per gun, then round-robin up to six. No duplicated rounds.
    for(let round=1;round<6;round++)for(const m of members){const w=A.weapons[m.weapon];if(w?.ammo&&shells[w.ammo]>=w.rounds){m.ammo+=w.rounds;shells[w.ammo]-=w.rounds;}}
    return {members,remainingAmmo:shells,remainingWeapons:remaining,remainingArmor:clothes};
  }
  const searchBonus=s=>s.expedition?.active?Math.min(.25,(s.expedition.active.members.length-1)*.05):0;
  function plan(s){return allocate(s,party(s),s.expedition.weapons,s.expedition.armor);}
  function report(s,t,type){return {id:t.id,type,at:clock(s),members:copy(t.members),cargo:copy(t.cargo),ammoLoot:copy(t.ammoLoot),weaponsLoot:copy(t.weaponsLoot),armorLoot:copy(t.armorLoot)};}
  function depart(s){
    const p=plan(s), t={id:s.expedition.nextId++,startedAt:clock(s),members:p.members,cargo:zero(resources),ammoLoot:zero(ammoKeys),weaponsLoot:zero(gunKeys),armorLoot:zero(armorKeys)};
    s.armory.ammo=p.remainingAmmo;s.expedition.active=t;s.expedition.last=report(s,t,'depart');
    return copy(s.expedition.last);
  }
  function returnHome(s){
    const t=s.expedition.active;if(!t)return null;
    // Cargo resources were credited on collection; this is unloading, never a second grant.
    const receipt=report(s,t,'return');
    for(const m of t.members){const w=A.weapons[m.weapon];if(w?.ammo)s.armory.ammo[w.ammo]+=m.ammo;}
    for(const k of ammoKeys)s.armory.ammo[k]+=t.ammoLoot[k];
    s.expedition.active=null;s.expedition.last=receipt;return copy(receipt);
  }
  function fieldCredit(s,key,n){const t=s.expedition?.active;if(t&&n>0)t.cargo[key]=Math.min(s.resources[key],t.cargo[key]+n);}
  function stockDebit(s,key,n){const t=s.expedition?.active;if(t)t.cargo[key]=Math.max(0,t.cargo[key]-n);}
  function status(s,action,args={}){
    if(!['expeditionSize','weaponLoadout','armorLoadout','buyArmor'].includes(action))return null;
    if(s.position!==s.base||s.expedition.active)return 'Return home before changing the expedition roster or loading and unloading gear.';
    if(action==='expeditionSize')return !Number.isInteger(args.count)||args.count<1||args.count>s.crew.length?'Choose between one survivor and the full community.':'';
    if(action==='weaponLoadout')return Object.hasOwn(weaponModes,args.key)?'':'Choose a valid weapon loadout.';
    if(action==='armorLoadout')return Object.hasOwn(armorModes,args.key)?'':'Choose a valid armor loadout.';
    if(!Object.hasOwn(armor,args.key))return 'Choose a valid armor item.';
    if(s.baseStage<armor[args.key].stage)return `Expand to Stage ${armor[args.key].stage} first.`;
    if(s.armor[args.key]>=128)return 'Armor storage is full.';
    return s.resources.scrap<armor[args.key].cost?'Not enough scrap for this armor.':'';
  }
  function salvage(s,t,random){
    if(!['residential','market','shelter','garage'].includes(t.type)||random(s)>=.26)return '';
    const roll=random(s),key=s.baseStage>=3&&roll>.91?'ballistic':s.baseStage>=2&&roll>.7?'vest':roll>.4?'jacket':'coat';
    if(s.armor[key]>=128)return '';
    s.armor[key]++;if(s.expedition.active)s.expedition.active.armorLoot[key]++;
    return armor[key].name;
  }
  function responders(s,home){
    if(!home&&s.expedition.active)return {members:s.expedition.active.members,loot:s.expedition.active.ammoLoot,field:true};
    const people=homeCrew(s),p=allocate(s,people,'best','best',available(s,'weapon'),available(s,'armor'),s.armory.ammo);
    return {members:p.members,loot:null,field:false};
  }
  function respond(s,impact,home=false){
    if(impact<=0)return {damage:0,used:0,noise:0,key:'melee',reason:'defenses held',armor:0,members:[]};
    const roster=responders(s,home), members=roster.members;
    if(!members.length)return {damage:Math.round(impact),used:0,noise:0,key:'melee',reason:'no survivors at home to respond',armor:0,members:[]};
    let reduction=0,clothing=0,used=0,noise=0;const details=[];
    for(const m of members){
      let key=m.weapon;const selected=A.weapons[key];
      if(key!=='none'&&(s.armory.policy==='quiet'||s.armory.policy==='conserve'&&impact<10))key='melee';
      if(key!=='none'&&A.weapons[key].ammo){
        const w=A.weapons[key];
        if(roster.field){
          const needed=Math.max(0,w.rounds-m.ammo);
          if(needed&&roster.loot[w.ammo]>=needed){roster.loot[w.ammo]-=needed;m.ammo+=needed;}
          if(m.ammo>=w.rounds)m.ammo-=w.rounds;else key='melee';
        }else if(s.armory.ammo[w.ammo]>=w.rounds)s.armory.ammo[w.ammo]-=w.rounds;else key='melee';
      }
      const w=A.weapons[key], protection=m.armor==='none'?0:armor[m.armor].protection;
      reduction+=(w?.protection||0);clothing+=protection;
      used+=w?.rounds||0;noise+=w?.noise||0;
      details.push({id:m.id,weapon:key,armor:m.armor,used:w?.rounds||0});
    }
    // Coverage is averaged across the actual party; one vest never protects everyone.
    reduction/=members.length;clothing/=members.length;
    noise=Math.round(noise/members.length);s.noise=Math.min(100,s.noise+noise);
    s.armory.spent=Math.min(100000000,s.armory.spent+used);s.armory.contacts=Math.min(100000000,s.armory.contacts+1);
    return {damage:Math.max(1,Math.round(impact*(1-reduction)*(1-clothing))),used,noise,key:details.find(m=>m.weapon!=='none'&&m.weapon!=='melee')?.weapon||'melee',reason:`${members.length} ${home?'home responders':'expedition members'}; ${Math.round(clothing*100)}% armor coverage`,armor:clothing,members:details};
  }
  function migrate(s){
    s.armor=inventory();s.expedition=initial(s);
    // An older save outside home had no split roster. Keep its whole crew together until return.
    if(s.position!==s.base){s.expedition.size=s.crew.length;depart(s);s.expedition.last=null;}
  }
  function validate(s){
    const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x), int=(x,lo,hi)=>Number.isInteger(x)&&x>=lo&&x<=hi;
    const exact=(x,keys)=>obj(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
    const bundle=(x,keys,max=9999)=>exact(x,keys)&&keys.every(k=>int(x[k],0,max));
    const e=s.expedition;
    if(!bundle(s.armor,armorKeys,128)||!exact(e,['size','weapons','armor','nextId','active','last'])||!int(e.size,1,s.crew.length)||!Object.hasOwn(weaponModes,e.weapons)||!Object.hasOwn(armorModes,e.armor)||!int(e.nextId,1,100000000))return false;
    const checkMembers=members=>Array.isArray(members)&&members.length>0&&members.length<=s.crew.length&&new Set(members.map(m=>m.id)).size===members.length&&members.every(m=>exact(m,['id','weapon','armor','ammo'])&&s.crew.some(c=>c.id===m.id)&&(m.weapon==='none'||Object.hasOwn(A.weapons,m.weapon))&&(m.armor==='none'||Object.hasOwn(armor,m.armor))&&int(m.ammo,0,9999)&&(!(m.weapon==='none'||m.weapon==='melee')||m.ammo===0));
    const checkCargo=t=>bundle(t.cargo,resources)&&bundle(t.ammoLoot,ammoKeys)&&bundle(t.weaponsLoot,gunKeys,128)&&bundle(t.armorLoot,armorKeys,128);
    const t=e.active;
    if(t){
      if(!exact(t,['id','startedAt','members','cargo','ammoLoot','weaponsLoot','armorLoot'])||!int(t.id,1,e.nextId-1)||!int(t.startedAt,0,clock(s))||!checkMembers(t.members)||!checkCargo(t)||s.position===s.base||t.members[0].id!==s.crew[0].id)return false;
      for(const k of gunKeys)if(t.members.filter(m=>m.weapon===k).length+t.weaponsLoot[k]>s.armory.owned[k])return false;
      for(const k of armorKeys)if(t.members.filter(m=>m.armor===k).length+t.armorLoot[k]>s.armor[k])return false;
      for(const k of resources)if(t.cargo[k]>s.resources[k])return false;
      for(const k of ammoKeys)if(s.armory.ammo[k]+t.ammoLoot[k]+t.members.reduce((n,m)=>n+(A.weapons[m.weapon]?.ammo===k?m.ammo:0),0)>9999)return false;
    }else if(s.position!==s.base)return false;
    const last=e.last;
    if(last&&(!exact(last,['id','type','at','members','cargo','ammoLoot','weaponsLoot','armorLoot'])||!int(last.id,1,e.nextId-1)||!['depart','return'].includes(last.type)||!int(last.at,0,clock(s))||!checkMembers(last.members)||!checkCargo(last)))return false;
    return true;
  }
  return {searchBonus,armor,weaponModes,armorModes,resources,initial,inventory,party,homeCrew,available,allocate,plan,depart,returnHome,fieldCredit,stockDebit,status,salvage,respond,migrate,validate};
});
