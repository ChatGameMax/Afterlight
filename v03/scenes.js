/* Original lightweight vector scenes. Rendering is pure and never consumes gameplay RNG. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AfterlightScenes=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stageNames=['','Holdout','Outpost','Settlement','Stronghold','Haven'];
  const types={residential:'Apartments',market:'Supply store',clinic:'Clinic',industrial:'Factory',garage:'Motor depot',park:'Overgrown park',shelter:'Old shelter',road:'Broken road',water:'Floodwater'};
  const pt=(x,y,z=0)=>[+(414+(x-y)*.95).toFixed(1),+(52+(x+y)*.44-z).toFixed(1)];
  const point=(x,y,z=0)=>pt(x,y,z).join(',');
  const polygon=(points,fill,stroke='#17281f',extra='')=>`<polygon points="${points.map(p=>point(...p)).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1" ${extra}/>`;
  const line=(a,b,color='#d6c59c',width=1,extra='')=>`<line x1="${pt(...a)[0]}" y1="${pt(...a)[1]}" x2="${pt(...b)[0]}" y2="${pt(...b)[1]}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
  const text=(x,y,z,value,color='#cfddc3',size=9)=>`<text x="${pt(x,y,z)[0]}" y="${pt(x,y,z)[1]}" text-anchor="middle" fill="${color}" font-size="${size}" font-family="system-ui,sans-serif" letter-spacing="1">${esc(value)}</text>`;
  function box(x,y,w,d,h,roof='#65725a',label='',night=false){
    let out=polygon([[x,y],[x+w,y],[x+w,y+d],[x,y+d]],'#14291e','#14291e','opacity=".4" transform="translate(8 5)"');
    out+=polygon([[x,y,h],[x+w,y,h],[x+w,y+d,h],[x,y+d,h]],roof);
    out+=polygon([[x,y+d],[x+w,y+d],[x+w,y+d,h],[x,y+d,h]],'#485746');
    out+=polygon([[x+w,y],[x+w,y+d],[x+w,y+d,h],[x+w,y,h]],'#344b3e');
    for(let n=0;n<Math.floor(w/13);n++)out+=polygon([[x+5+n*13,y+d,8],[x+11+n*13,y+d,8],[x+11+n*13,y+d,17],[x+5+n*13,y+d,17]],night?'#efc583':'#91a697','#304635');
    if(label)out+=text(x+w/2,y+d/2,h+5,label,'#f0e7ce',8);
    return out;
  }
  function tree(x,y,h=30){
    return line([x,y],[x,y,h-8],'#605b40',3)+polygon([[x-12,y,h-12],[x+12,y,h-12],[x,y,h+8]],'#58734f')+polygon([[x-9,y,h-2],[x+9,y,h-2],[x,y,h+18]],'#718761');
  }
  function person(x,y,tone='#cfb78a'){
    const [sx,sy]=pt(x,y);return `<g transform="translate(${sx} ${sy})"><ellipse cy="1" rx="5" ry="2" fill="#14241b" opacity=".6"/><path d="M-2 0v-7m4 7v-7m-4-4h4v5h-4z" fill="${tone}" stroke="${tone}" stroke-width="2"/><circle cy="-15" r="3" fill="#cfb89b"/></g>`;
  }
  function render(s,id=s.position){
    const tile=s.map[id],night=s.hour>=20||s.hour<6,home=id===s.base,known=tile.seen;
    const stage=s.baseStage||1,c=s.camp,weather=s.weather;
    const title=known?(home?`Stage ${stage} ${stageNames[stage]} — home base`:tile.name):'Uncharted district';
    const description=!known?'Scout this district to reveal a location illustration.':home?`Living quarters ${c.beds}, defenses ${c.barricade}, water collectors ${c.water}, gardens ${c.garden}, workshop ${c.workshop}, radio ${c.radio}, supply station ${s.armory?.level||0}. All upgrades are reflected in the illustration.`:`${types[tile.type]}. ${tile.searched?'Searched district.':'Unsearched district.'} ${weather} weather, ${night?'night':'day'}.`;
    let out=`<svg class="location-svg" viewBox="0 0 840 450" role="img" aria-label="${esc(title+'. '+description)}" xmlns="http://www.w3.org/2000/svg"><title>${esc(title)}</title><desc>${esc(description)}</desc><rect width="840" height="450" fill="${night?'#172c32':'#899281'}"/><path d="M0 113 70 65 160 103 250 42 340 92 440 58 550 118 660 73 760 111 840 62V450H0Z" fill="${night?'#243b3c':'#647a66'}"/><path d="M0 153 120 127 230 156 350 119 500 162 620 120 840 149V450H0Z" fill="${night?'#2d4240':'#506b55'}"/><circle cx="710" cy="62" r="22" fill="${night?'#d3ded2':'#eddbac'}" opacity=".72"/><ellipse cx="420" cy="315" rx="335" ry="98" fill="#122a20" opacity=".22"/>`;
    if(!known)return out+`<path d="M0 190Q230 125 440 200T840 178V450H0Z" fill="#213b34"/><text x="420" y="270" fill="#b8c6b3" text-anchor="middle" font-family="system-ui" font-size="20">Beyond the known</text></svg>`;
    const ground=s.config.region==='desert'?'#8a7d57':s.config.region==='alpine'?'#87928a':'#566f4c';
    out+=polygon([[0,0],[420,0],[420,310],[0,310]],ground,'#3d5946');
    // Neighbor silhouettes use only revealed types; they disclose no fog-of-war information.
    for(let i=0;i<6;i++)out+=tree(i*75+10,8,18+(id+i*7)%18);
    out+=polygon([[0,115],[420,115],[420,142],[0,142]],'#8b8b70','#737b62')+polygon([[205,0],[234,0],[234,310],[205,310]],'#8b8b70','#737b62');
    if(home){
      const w=270+stage*23,d=215+stage*12;
      out+=`<g data-layer="stage" data-stage="${stage}">`+polygon([[20,25],[w,25],[w,d],[20,d]],'#7c8564','#d7c48c')+'</g>';
      out+=polygon([[28,120],[w-6,120],[w-6,139],[28,139]],'#a29f7c','#a29f7c');
      // Housing grows by both structure level and base-stage housing expansion.
      out+=`<g data-building="beds" data-level="${c.beds}">`;
      const homes=Math.min(10,Math.max(1,stage+Math.ceil(c.beds/2)));
      for(let i=0;i<homes;i++){const row=Math.floor(i/5),col=i%5;out+=box(32+col*61,35+row*44,45,30,20+c.beds*2,'#778263',i===0?'QUARTERS':'',night);}
      for(let i=0;i<c.beds;i++)out+=polygon([[36+i*4,65,26],[38+i*4,65,26],[38+i*4,65,30],[36+i*4,65,30]],'#e5c58b');
      out+='</g>';
      // Command shelter expands in height and has stage-specific wings.
      out+=box(156,152,65,49,30+stage*5,'#879473',stageNames[stage].toUpperCase(),night);
      if(stage>=3)out+=box(226,155,43,38,23,'#94a196','CLINIC',night);
      if(stage>=4)out+=box(277,159,44,38,25,'#aaa17a','LOGISTICS',night);
      if(stage>=5)out+=box(328,158,38,42,30,'#969c80','COUNCIL',night);
      out+=`<g data-building="garden" data-level="${c.garden}">`;
      out+=polygon([[33,157],[138,157],[138,230],[33,230]],c.garden?'#53472f':'#747e5f','#c0af78');
      for(let i=0;i<c.garden;i++){let x=38+(i%6)*16,y=164+Math.floor(i/6)*30;out+=line([x,y],[x,y+23],'#96b36a',4);for(let j=0;j<3;j++)out+=polygon([[x-4,y+j*8,3],[x+4,y+j*8,3],[x,y+j*8,10]],'#c2cc83','#5b783e');}
      out+=text(87,236,0,c.garden?'GARDENS · '+c.garden:'GARDEN SITE')+'</g>';
      out+=`<g data-building="water" data-level="${c.water}">`;
      for(let i=0;i<c.water;i++){const x=280+(i%4)*22,y=212+Math.floor(i/4)*20;out+=box(x,y,15,14,20+c.water,'#aac7bf','',night);out+=line([x+7,y+7,25+c.water],[x+7,y+7,33+c.water],'#c1d8cf',2);}
      out+=text(326,281,0,c.water?'WATER · '+c.water:'WATER SITE')+'</g>';
      out+=`<g data-building="workshop" data-level="${c.workshop}">`;
      if(c.workshop){out+=box(39,244,45+Math.min(c.workshop,6)*7,35,24+c.workshop*3,'#a48d63','WORKSHOP',night);for(let i=0;i<c.workshop;i++)out+=box(42+i*11,282,7,9,4+i,'#9a9b7a');}
      else out+=text(78,260,0,'WORKSHOP SITE');out+='</g>';
      out+=`<g data-building="radio" data-level="${c.radio}">`;
      if(c.radio){const x=252,y=109,h=66+stage*7;out+=box(x-10,y-8,20,16,13,'#859678');out+=line([x-9,y],[x,y,h],'#c3c5a5',3)+line([x+9,y],[x,y,h],'#c3c5a5',3);for(let j=12;j<h;j+=13)out+=line([x-7,y,j],[x+7,y,j+9],'#c3c5a5');out+=line([x-13,y,h-4],[x+13,y,h-4],'#e5d6a6',3);const [xx,yy]=pt(x,y,h);out+=`<circle cx="${xx}" cy="${yy}" r="4" fill="#df9e70"/>`;}
      out+='</g>';
      const arms=s.armory?.level||0;
      out+=`<g data-building="armory" data-level="${arms}">`+box(166,246,35+arms*9,28,16+arms*8,'#76716b',arms?'SUPPLY · '+arms:'GEAR',night);
      for(let i=0;i<arms;i++)out+=box(226+i*12,266,9,11,8,'#b09668');out+='</g>';
      for(let i=0;i<Math.min(s.crew.length,16);i++)out+=person(46+i*17,130+(i%2)*7,i%3?'#b2b695':'#c7a374');
      // Repeated supports and level markings make every defense purchase observable.
      out+=`<g data-building="barricade" data-level="${c.barricade}">`;
      if(c.barricade){const h=8+c.barricade*2;out+=polygon([[20,d],[w,d],[w,d,h],[20,d,h]],'#746f51');out+=polygon([[w,25],[w,d],[w,d,h],[w,25,h]],'#515f47');for(let x=25;x<w;x+=13)out+=line([x,d],[x,d,h+2],'#bdad79',2);for(let y=32;y<d;y+=13)out+=line([w,y],[w,y,h+2],'#adab77',2);out+=box(w-21,d-21,17,17,h+17,'#929370','',night);for(let n=0;n<c.barricade;n++)out+=line([26+n*4,d,h-2],[26+n*4,d,h-7],'#efd8a1',2);}
      out+='</g>';
    }else{
      const k=tile.type;
      if(k==='park'){for(let i=0;i<18;i++)out+=tree(25+(i*53+id*11)%350,30+(i*37+id*3)%230,22+i%4*5);out+=polygon([[245,180],[350,180],[370,236],[260,249]],'#63898a','#739c9b');}
      else if(k==='water'){out+=polygon([[5,10],[406,10],[406,300],[5,300]],'#48777b','#96b2ab');for(let i=0;i<16;i++)out+=line([15+i*23,20+i%4*60],[50+i*20,20+i%4*60],'#93b9b2');out+=box(96,85,58,55,13,'#a79b80');}
      else if(k==='road'){for(let i=0;i<6;i++){out+=box(35+i*56,51+i%2*20,40,44,24+i%3*12,'#748371');}out+=box(155,198,40,17,12,'#b0906d','CONVOY');}
      else{const h=k==='residential'?74:k==='industrial'?52:32;out+=box(68,48,100,67,h,'#8a9177',types[k].toUpperCase(),night);out+=box(253,55,75,48,h*.65,'#74866f','',night);out+=box(72,206,59,43,30,'#847d62','',night);if(k==='clinic'){out+=line([113,82,h+2],[129,82,h+2],'#d1d7c4',4)+line([121,74,h+2],[121,90,h+2],'#d1d7c4',4);}if(k==='industrial'){out+=box(165,55,16,18,94,'#a5a38a');out+=box(194,53,13,16,79,'#9c9b84');}if(k==='garage'){out+=box(254,167,43,20,15,'#b5a17b');out+=box(301,176,38,18,13,'#708b87');}if(k==='shelter')out+=polygon([[210,203],[302,203],[278,203,33]],'#7e8e61');for(let i=0;i<8;i++)out+=box(256+i%4*15,252+Math.floor(i/4)*17,10,10,5,'#958264');}
      for(let i=0;i<Math.min(s.crew.length,6);i++)out+=person(195+i*13,158+i*5);
      if(tile.searched)out+=text(203,298,0,'SEARCHED · FORAGING REMAINS');
    }
    if(weather==='rain')for(let i=0;i<45;i++){const x=(i*97+id*13)%830,y=(i*67)%420;out+=`<path d="M${x} ${y}l-5 12" stroke="#c1d5d0" opacity=".35"/>`;}
    if(weather==='ash'||weather==='cold')for(let i=0;i<50;i++)out+=`<circle cx="${(i*67+id)%840}" cy="${(i*91)%450}" r="1.5" fill="#dedbc8" opacity=".5"/>`;
    if(weather==='heat')out+='<rect width="840" height="450" fill="#d9a45b" opacity=".09"/>';
    if(night)out+='<rect width="840" height="450" fill="#07172c" opacity=".20"/>';
    out+=`<rect x="20" y="402" width="800" height="30" rx="5" fill="#182c24" opacity=".82"/><text x="35" y="422" fill="#e1ddc2" font-family="system-ui,sans-serif" font-size="12" letter-spacing="1">${esc(home?`STAGE ${stage} / 5 · ${stageNames[stage].toUpperCase()} · ${s.crew.length} SURVIVORS`:types[tile.type].toUpperCase())}</text><text x="803" y="422" text-anchor="end" fill="#c2d0bb" font-family="system-ui,sans-serif" font-size="11">${esc(weather.toUpperCase())} · ${night?'NIGHT':'DAY'}</text></svg>`;
    return out;
  }
  return {render};
});
