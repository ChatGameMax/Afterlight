/* Fictional, abstract equipment rules. No real-world weapon specifications. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AfterlightArmory=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const weapons={
    melee:{name:'Melee kit',ammo:null,rounds:0,protection:.12,noise:2,cost:0,stage:1,desc:'Always available. Modest protection without ammunition.'},
    pistol:{name:'Pistol',ammo:'light',rounds:2,protection:.40,noise:12,cost:25,stage:1,desc:'Balanced protection. Uses two pistol rounds per hostile contact.'},
    shotgun:{name:'Shotgun',ammo:'shells',rounds:1,protection:.55,noise:20,cost:42,stage:1,desc:'Stronger protection and more noise. Uses one shell per hostile contact.'},
    rifle:{name:'Rifle',ammo:'rifle',rounds:2,protection:.65,noise:16,cost:65,stage:2,desc:'High protection. Uses two rifle rounds per contact. Available from Stage 2.'}
  };
  const ammo={light:{name:'Pistol rounds',amount:12,cost:6},shells:{name:'Shotgun shells',amount:8,cost:8},rifle:{name:'Rifle rounds',amount:10,cost:12}};
  const policies={conserve:{name:'Conserve ammo',desc:'Use the equipped firearm only for incoming impact of 10 or more. Otherwise use the melee kit.'},defensive:{name:'Use equipped weapon',desc:'Use a loaded firearm on every hostile contact. Higher protection costs ammunition and creates noise.'},quiet:{name:'Stay quiet',desc:'Use the melee kit only, even when a firearm is equipped. Keep ammunition in reserve.'}};
  const initial=()=>({owned:{melee:1,pistol:0,shotgun:0,rifle:0},equipped:'melee',ammo:{light:0,shells:0,rifle:0},policy:'conserve',level:0,spent:0,contacts:0});
  const upgradeCost=s=>({scrap:18*(s.armory.level+1)});
  const daily=s=>({light:s.armory.level*2,shells:s.armory.level>=2?1:0,rifle:s.armory.level>=3?1:0});
  function ammoTotal(s,key){const t=s.expedition?.active;return s.armory.ammo[key]+(t?t.ammoLoot[key]+t.members.reduce((sum,m)=>sum+(weapons[m.weapon]?.ammo===key?m.ammo:0),0):0);}
  function addAmmo(s,key,n,field=false){const t=s.expedition?.active,store=field&&t?t.ammoLoot:s.armory.ammo;const count=Math.max(0,Math.min(n,9999-ammoTotal(s,key)));store[key]+=count;return count;}
  function status(s,action,args={}){
    const a=s.armory;
    if(action==='equip'&&s.expedition?.active)return 'Return home to change equipment. Ammunition-use policy can still be changed in the field.';
    if(action==='equip')return !Object.hasOwn(weapons,args.key)||!a.owned[args.key]?'You do not own that weapon.':a.equipped===args.key?'Already equipped.':'';
    if(action==='policy')return !Object.hasOwn(policies,args.key)?'Choose a valid ammunition policy.':a.policy===args.key?'Policy is already active.':'';
    if(!['buyWeapon','buyAmmo','upgradeArmory'].includes(action))return null;
    if(s.position!==s.base)return 'Return home to use the armory and its supply traders.';
    if(action==='buyWeapon'){
      if(!Object.hasOwn(weapons,args.key))return 'Choose a valid weapon.';
      const w=weapons[args.key];
      if(args.key==='melee')return 'Melee kits are already available.';
      if(a.owned[args.key]>=128)return 'Weapon storage is full.';
      if(s.baseStage<w.stage)return `Expand to Stage ${w.stage} first.`;
      return s.resources.scrap<w.cost?'Not enough scrap for this weapon.':'';
    }
    if(action==='buyAmmo'){
      if(!Object.hasOwn(ammo,args.key))return 'Choose a valid ammunition type.';
      const pack=ammo[args.key];
      if(ammoTotal(s,args.key)+pack.amount>9999)return 'There is not enough storage for a full ammunition pack.';
      return s.resources.scrap<pack.cost?'Not enough scrap for this ammunition pack.':'';
    }
    if(a.level>=Math.min(3,s.baseStage))return a.level>=3?'Supply station is fully upgraded.':'Expand the base to unlock the next supply-station level.';
    if(!s.camp.workshop)return 'Build a salvage workshop first.';
    return s.resources.scrap<upgradeCost(s).scrap?'Not enough scrap to expand the supply station.':'';
  }
  function respond(s,impact){
    const a=s.armory;let key=a.equipped,reason='';
    if(impact<=0)return {damage:0,used:0,noise:0,key:'melee',avoided:0,reason:'defenses held'};
    const selected=weapons[key];
    if(a.policy==='quiet'){key='melee';reason='quiet policy';}
    else if(a.policy==='conserve'&&impact<10){key='melee';reason='ammunition conserved';}
    else if(selected.ammo&&a.ammo[selected.ammo]<selected.rounds){key='melee';reason='insufficient ammunition; melee fallback';}
    const w=weapons[key],used=w.ammo?w.rounds:0;
    if(used)a.ammo[w.ammo]-=used;
    const remaining=Math.max(1,Math.round(impact*(1-w.protection)));
    a.spent=Math.min(100000000,a.spent+used);a.contacts=Math.min(100000000,a.contacts+1);
    s.noise=Math.min(100,s.noise+w.noise);
    return {damage:remaining,used,noise:w.noise,key,avoided:Math.max(0,Math.round(impact)-remaining),reason};
  }
  function salvage(s,t,random){
    const found=[];
    const factor=s.config.abundance/100;
    const pack={residential:['light',2],market:['light',3],shelter:['shells',3],garage:['shells',2],industrial:['rifle',3]};
    if(pack[t.type]){const [key,n]=pack[t.type];const count=addAmmo(s,key,Math.max(1,Math.round((n+Math.floor(random(s)*4))*factor)),true);if(count)found.push(`${count} ${ammo[key].name.toLowerCase()}`);}
    if(['garage','shelter','industrial'].includes(t.type)&&random(s)<.16){
      const key=t.type==='garage'?'shotgun':t.type==='industrial'&&s.baseStage>=2?'rifle':'pistol';
      if(s.armory.owned[key]<128){s.armory.owned[key]++;if(s.expedition?.active)s.expedition.active.weaponsLoot[key]++;found.push(weapons[key].name);}
    }
    return found;
  }
  function validate(a,legacy=false){
    const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
    const keys=(x,allowed)=>obj(x)&&Object.keys(x).length===allowed.length&&allowed.every(k=>Object.hasOwn(x,k));
    const int=(x,lo,hi)=>Number.isInteger(x)&&x>=lo&&x<=hi;
    return keys(a,['owned','equipped','ammo','policy','level','spent','contacts'])&&keys(a.owned,Object.keys(weapons))&&Object.values(a.owned).every(n=>int(n,0,legacy?1:128))&&a.owned.melee===1&&Object.hasOwn(weapons,a.equipped)&&a.owned[a.equipped]>0&&keys(a.ammo,Object.keys(ammo))&&Object.values(a.ammo).every(n=>int(n,0,9999))&&Object.hasOwn(policies,a.policy)&&int(a.level,0,3)&&int(a.spent,0,100000000)&&int(a.contacts,0,100000000);
  }
  return {weapons,ammo,policies,initial,upgradeCost,daily,ammoTotal,addAmmo,status,respond,salvage,validate};
});
