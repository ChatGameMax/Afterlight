/* Original lightweight vector scenes. Rendering is pure and never consumes gameplay RNG. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AfterlightScenes=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stageNames=['','Holdout','Outpost','Settlement','Stronghold','Haven'];
  const types={residential:'Apartments',market:'Supply store',clinic:'Clinic',industrial:'Factory',garage:'Motor depot',park:'Overgrown park',shelter:'Old shelter',road:'Broken road',water:'Floodwater'};
  const pt=(x,y,z=0)=>[+(414+(x-y)*.95).toFixed(1),+(66+(x+y)*.44-z).toFixed(1)];
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
  function equippedPerson(x,y,m,s,animate=false){
    const [sx,sy]=pt(x,y),P=typeof module==='object'&&module.exports?require('./expeditions.js'):globalThis.AfterlightExpeditions;
    const c=s.crew.find(c=>c.id===m.id), outfit=m.armor==='none'?'#b5b99b':P.armor[m.armor].color;
    const weapon=m.weapon==='none'?'No weapon':m.weapon==='melee'?'Melee kit':m.weapon;
    const armorName=m.armor==='none'?'ordinary clothing':P.armor[m.armor].name;
    let v=`<g data-survivor-id="${m.id}" data-weapon="${m.weapon}" data-armor="${m.armor}" transform="translate(${sx} ${sy})"><title>${esc((c?.name||'Survivor')+' · '+weapon+' · '+armorName+' · '+m.ammo+' carried rounds')}</title><ellipse cy="2" rx="7" ry="3" fill="#102319" opacity=".6"/><g class="${animate?'walker-body':''}"><path d="M-3 0v-9m6 9v-9" stroke="#373f36" stroke-width="3"/><path d="M-4-20h8l3 ${m.armor==='coat'?'16':'11'}h-14z" fill="${outfit}" stroke="#2c3d35"/>`;
    if(m.armor==='vest'||m.armor==='ballistic')v+='<path d="M-4-18h8v8h-8zM-3-15h6m-6 3h6" fill="#465657" stroke="#a7b5a4" stroke-width="1"/>';
    v+='<circle cy="-24" r="4" fill="#ccb492"/><path d="M-4-26q4-5 8 0" stroke="#4a4e3d" stroke-width="3"/>';
    if(m.weapon==='melee')v+='<path d="M6-15l7-8" stroke="#b7ac8b" stroke-width="3"/>';
    if(m.weapon==='pistol')v+='<path d="M5-14h10v3h-5v4" stroke="#26383b" stroke-width="3"/>';
    if(m.weapon==='shotgun'||m.weapon==='rifle')v+='<path d="M-4-8l19-15" stroke="#252f30" stroke-width="3"/><path d="M-5-7l5-4" stroke="#ac9063" stroke-width="4"/>';
    if(m.ammo>0)v+='<rect x="-7" y="-9" width="4" height="5" rx="1" fill="#cbb079"/>';
    return v+'</g></g>';
  }
  function defenseWorks(s,back=false){
    const level=s.camp.barricade;if(!level)return '';
    const tier=Math.min(3,Math.floor((level-1)/3)),h=9+level*2.8,thick=4+tier*3;
    const fill=['#716b4a','#65705c','#777f73','#879087'][tier],top=['#b0a174','#b4b497','#b8bcaa','#c6cbbb'][tier];
    let v=`<g data-defense-tier="${tier+1}" data-defense-half="${back?'back':'front'}">`;
    function wall(x,y,w,d){
      let q=polygon([[x,y],[x+w,y],[x+w,y,h],[x,y,h]],fill)+polygon([[x,y+d],[x+w,y+d],[x+w,y+d,h],[x,y+d,h]],fill)+polygon([[x+w,y],[x+w,y+d],[x+w,y+d,h],[x+w,y,h]],'#485952')+polygon([[x,y,h],[x+w,y,h],[x+w,y+d,h],[x,y+d,h]],top);
      if(w>d){for(let a=x+7;a<x+w-5;a+=tier<2?12:19){q+=line([a,y+d],[a,y+d,h+3],tier<2?'#c0b080':'#52645b',tier<2?2:3);if(tier>=2)q+=polygon([[a,y+d,h],[a+8,y+d,h],[a+8,y+d,h+8],[a,y+d,h+8]],top);}}
      else{for(let a=y+7;a<y+d-5;a+=tier<2?12:19){q+=line([x+w,a],[x+w,a,h+3],tier<2?'#c0b080':'#53645b',tier<2?2:3);if(tier>=2)q+=polygon([[x+w,a,h],[x+w,a+8,h],[x+w,a+8,h+8],[x+w,a,h+8]],top);}}
      return q;
    }
    function tower(x,y){let q=box(x,y,23,23,h+22,top,'',s.hour>=20||s.hour<6);q+=polygon([[x-3,y-3,h+22],[x+26,y-3,h+22],[x+26,y+26,h+22],[x-3,y+26,h+22]],'#bec2a8');for(let j=0;j<3;j++)q+=line([x+j*9,y+26,h+22],[x+j*9,y+26,h+29],'#778a7b',4);if(level>=10){q+=line([x+12,y+12,h+24],[x+12,y+12,h+31],'#b2bba6',2);q+=text(x+12,y+12,h+33,'◈','#ead49c',12);}return q;}
    if(back){v+=wall(14,18,396,thick)+wall(14,18,thick,276);if(level>=4)v+=tower(12,17);if(level>=7)v+=tower(383,18);}
    else{
      if(level>=7)v+=wall(25,287,169,5)+wall(244,287,154,5); // inner barrier with a separate gate opening
      v+=wall(14,298,180,thick)+wall(244,298,166,thick)+wall(410-thick,18,thick,280);
      if(level>=4)v+=tower(14,280)+tower(388,280);
      v+=box(181,291,14,19,h+12,top,'',false)+box(244,291,14,19,h+12,top,'',false);
      v+=polygon([[195,303,h+6],[244,303,h+6],[244,303,h+15],[195,303,h+15]],top);
      for(let x=200;x<242;x+=8)v+=line([x,303,3],[x,303,h+6],tier>=2?'#a0afa3':'#8e8768',2);
      v+=line([197,303,h*.4],[242,303,h*.4],top,3)+line([197,303,h*.75],[242,303,h*.75],top,3);
      v+=text(221,304,h+21,tier>=2?'GATEHOUSE':'GATE','#e7dbb5',8);
      // Each purchased level adds a visible reinforcement panel, even within one tier.
      for(let n=0;n<level;n++)v+=polygon([[33+n*11,298+thick,6],[40+n*11,298+thick,6],[40+n*11,298+thick,13],[33+n*11,298+thick,13]],'#c6b68b');
    }
    return v+'</g>';
  }
  function transit(s,r,animate=false){
    const returned=r.type==='return',n=r.members.length,rows=Math.ceil(n/7),height=175+rows*82;
    let v=`<svg class="transit-svg ${animate?'transit-animate':''} ${returned?'returning':'departing'}" viewBox="0 0 840 ${height}" role="img" aria-label="${returned?'Returning':'Departing'} expedition: ${n} named survivors" xmlns="http://www.w3.org/2000/svg"><rect width="840" height="${height}" rx="9" fill="#243e34"/><path d="M0 110H840V${height}H0Z" fill="#667859"/><path d="M0 130H840V160H0Z" fill="#9a9676"/><path d="M0 120H290V75H0ZM540 120H840V75H540Z" fill="#859182" stroke="#b4bea7" stroke-width="3"/><path d="M288 132V43H326V65H512V43H550V132" fill="none" stroke="#adba9f" stroke-width="15"/><text x="420" y="30" fill="#f0dcaa" font-size="15" text-anchor="middle" font-family="system-ui">${returned?'BACK THROUGH THE GATE':'OUT INTO THE DISTRICTS'}</text><text x="420" y="97" fill="#ebdfbb" font-size="12" text-anchor="middle" font-family="system-ui">${n} SURVIVORS · ${returned?'UNLOADING':'LOADOUT CHECKED'}</text>`;
    const goods=returned?Object.entries(r.cargo).filter(([,n])=>n>0):[];
    for(let i=0;i<n;i++){
      const m=r.members[i],c=s.crew.find(c=>c.id===m.id),columns=Math.min(7,n-Math.floor(i/7)*7),x=420-(columns-1)*58+(i%7)*116,y=195+Math.floor(i/7)*82;
      v+=`<g class="convoy-member" data-member="${m.id}" style="--delay:${(i%7)*.10}s;--from-x:${returned?0:420-x}px;--from-y:${returned?85:120-y}px"><g transform="translate(${x-414} ${y-66})">${equippedPerson(0,0,m,s,animate)}</g><text x="${x}" y="${y+17}" text-anchor="middle" fill="#f0e4c5" font-size="11" font-family="system-ui">${esc(c?.name||'Survivor')}</text>`;
      const assigned=goods.filter((_,g)=>g%n===i);
      for(let j=0;j<assigned.length;j++){
        const [k,q]=assigned[j],px=x+22+j*17,py=y-9;
        if(k==='scrap'&&q>=12)v+=`<g data-cargo="scrap" data-quantity="${q}" transform="translate(${px} ${py})"><path d="M-3-11h30l-3 14H0z" fill="#8a8d73" stroke="#283d37" stroke-width="2"/><path d="M-4-11l-7-7M2-14l7-8 6 5 7-4 3 7" fill="none" stroke="#b2b59a" stroke-width="3"/><circle cx="3" cy="7" r="4" fill="#253c34"/><circle cx="22" cy="7" r="4" fill="#253c34"/></g>`;
        else if(k==='medicine')v+=`<g data-cargo="medicine" data-quantity="${q}"><rect x="${px}" y="${py-17}" width="18" height="15" rx="2" fill="#d9d7b7" stroke="#536d5a"/><path d="M${px+9} ${py-14}v9m-4-5h8" stroke="#638870" stroke-width="3"/></g>`;
        else v+=`<g data-cargo="${k}" data-quantity="${q}"><path d="M${px+4} ${py-20}h11l-2 5q13 18-5 16-15 0-4-16z" fill="${k==='food'?'#c3ab70':k==='water'?'#82a9a5':k==='fuel'?'#b38b60':'#a9ac96'}" stroke="#4c6554"/></g>`;
      }
      v+='</g>';
    }
    return v+'</svg>';
  }

  function render(s,id=s.position){
    const P=typeof module==='object'&&module.exports?require('./expeditions.js'):globalThis.AfterlightExpeditions;
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
      out+=defenseWorks(s,true);
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
      const homeSlots=P.allocate(s,P.homeCrew(s),'best','best',P.available(s,'weapon'),P.available(s,'armor'),s.armory.ammo).members;
      for(let i=0;i<Math.min(homeSlots.length,16);i++)out+=equippedPerson(46+i*17,130+(i%2)*7,homeSlots[i],s);
      out+=`<g data-building="barricade" data-level="${c.barricade}">`+defenseWorks(s,false)+'</g>';
    }else{
      const k=tile.type;
      if(k==='park'){for(let i=0;i<18;i++)out+=tree(25+(i*53+id*11)%350,30+(i*37+id*3)%230,22+i%4*5);out+=polygon([[245,180],[350,180],[370,236],[260,249]],'#63898a','#739c9b');}
      else if(k==='water'){out+=polygon([[5,10],[406,10],[406,300],[5,300]],'#48777b','#96b2ab');for(let i=0;i<16;i++)out+=line([15+i*23,20+i%4*60],[50+i*20,20+i%4*60],'#93b9b2');out+=box(96,85,58,55,13,'#a79b80');}
      else if(k==='road'){for(let i=0;i<6;i++){out+=box(35+i*56,51+i%2*20,40,44,24+i%3*12,'#748371');}out+=box(155,198,40,17,12,'#b0906d','CONVOY');}
      else{const h=k==='residential'?74:k==='industrial'?52:32;out+=box(68,48,100,67,h,'#8a9177',types[k].toUpperCase(),night);out+=box(253,55,75,48,h*.65,'#74866f','',night);out+=box(72,206,59,43,30,'#847d62','',night);if(k==='clinic'){out+=line([113,82,h+2],[129,82,h+2],'#d1d7c4',4)+line([121,74,h+2],[121,90,h+2],'#d1d7c4',4);}if(k==='industrial'){out+=box(165,55,16,18,94,'#a5a38a');out+=box(194,53,13,16,79,'#9c9b84');}if(k==='garage'){out+=box(254,167,43,20,15,'#b5a17b');out+=box(301,176,38,18,13,'#708b87');}if(k==='shelter')out+=polygon([[210,203],[302,203],[278,203,33]],'#7e8e61');for(let i=0;i<8;i++)out+=box(256+i%4*15,252+Math.floor(i/4)*17,10,10,5,'#958264');}
      const fieldSlots=s.expedition?.active?.members||P.plan(s).members;
      for(let i=0;i<fieldSlots.length;i++)out+=equippedPerson(175+(i%12)*15,160+Math.floor(i/12)*20,fieldSlots[i],s);
      if(tile.searched)out+=text(203,298,0,'SEARCHED · FORAGING REMAINS');
    }
    if(weather==='rain')for(let i=0;i<45;i++){const x=(i*97+id*13)%830,y=(i*67)%420;out+=`<path d="M${x} ${y}l-5 12" stroke="#c1d5d0" opacity=".35"/>`;}
    if(weather==='ash'||weather==='cold')for(let i=0;i<50;i++)out+=`<circle cx="${(i*67+id)%840}" cy="${(i*91)%450}" r="1.5" fill="#dedbc8" opacity=".5"/>`;
    if(weather==='heat')out+='<rect width="840" height="450" fill="#d9a45b" opacity=".09"/>';
    if(night)out+='<rect width="840" height="450" fill="#07172c" opacity=".20"/>';
    out+=`<rect x="20" y="402" width="800" height="30" rx="5" fill="#182c24" opacity=".82"/><text x="35" y="422" fill="#e1ddc2" font-family="system-ui,sans-serif" font-size="12" letter-spacing="1">${esc(home?`STAGE ${stage} / 5 · ${stageNames[stage].toUpperCase()} · ${P.homeCrew(s).length} HOME / ${s.crew.length} TOTAL`:types[tile.type].toUpperCase())}</text><text x="803" y="422" text-anchor="end" fill="#c2d0bb" font-family="system-ui,sans-serif" font-size="11">${esc(weather.toUpperCase())} · ${night?'NIGHT':'DAY'}</text></svg>`;
    return out;
  }
  return {render,transit};
});
