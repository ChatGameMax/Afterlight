/* AFTERLIGHT: pure travel planning and cumulative settlement progression. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AfterlightSystems = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const WIDTH = 13, HEIGHT = 11;
  const stages = {
    1: {name:'Holdout', desc:'Keep the original shelter and every upgrade you have earned.', beds:0, output:{}, defense:0, caps:{beds:3,barricade:3,water:3,garden:3,workshop:2,radio:1}},
    2: {name:'Outpost', desc:'Add a residential wing, communal stores and a salvage yard.', beds:4, output:{food:4,water:4,scrap:2}, defense:4, caps:{beds:5,barricade:5,water:5,garden:5,workshop:3,radio:1}, cost:{scrap:50,food:15,water:15,fuel:4}, hours:12, crew:4, trust:25, signal:25, requires:{beds:2,barricade:2,water:2,garden:2,workshop:2,radio:1}},
    3: {name:'Settlement', desc:'Open a clinic, expand the farms and add permanent housing.', beds:6, output:{food:6,water:8,scrap:3,medicine:1}, defense:5, caps:{beds:7,barricade:7,water:7,garden:7,workshop:4,radio:1}, cost:{scrap:100,food:25,water:25,fuel:6,medicine:4}, hours:18, crew:6, trust:40, signal:60, requires:{beds:3,barricade:3,water:3,garden:3,workshop:3,radio:1}},
    4: {name:'Stronghold', desc:'Create a logistics network, fuel recovery and a fortified outer district. Travel takes one hour per step.', beds:8, output:{food:8,water:12,scrap:4,medicine:1,fuel:1}, defense:6, caps:{beds:9,barricade:9,water:9,garden:9,workshop:5,radio:1}, cost:{scrap:180,food:40,water:40,fuel:10,medicine:8}, hours:24, crew:8, trust:50, signal:100, requires:{beds:5,barricade:5,water:5,garden:5,workshop:4,radio:1}},
    5: {name:'Haven', desc:'A regional home with expanded farms, waterworks, medical care and renewable fuel.', beds:12, output:{food:12,water:16,scrap:6,medicine:2,fuel:2}, defense:8, caps:{beds:12,barricade:12,water:12,garden:12,workshop:6,radio:1}, cost:{scrap:300,food:60,water:60,fuel:16,medicine:12}, hours:36, crew:12, trust:60, signal:100, requires:{beds:7,barricade:7,water:7,garden:7,workshop:5,radio:1}}
  };
  function benefits(s) {
    const result = {beds:0, defense:0, output:{food:0,water:0,scrap:0,medicine:0,fuel:0}};
    for (let n=2;n<=(s.baseStage || 1);n++) {
      result.beds += stages[n].beds; result.defense += stages[n].defense;
      for (const [key,value] of Object.entries(stages[n].output)) result.output[key] += value;
    }
    return result;
  }
  const maxLevel = (s,key) => stages[s.baseStage || 1].caps[key];
  const travelHours = s => s.config.profession==='ranger' || s.baseStage>=4 ? 1 : 2;
  const travelFatigue = s => s.baseStage>=4 ? 3 : 4;
  const absoluteHour = s => (s.day-1)*24+s.hour;
  const arrivalDelay = s => [0,12,10,8,6,4][s.baseStage || 1];
  const capacity = s => 2+2*s.camp.beds+benefits(s).beds;
  const freeBeds = s => capacity(s)-s.crew.length-(s.recruitment ? 1 : 0);
  function adjacent(a,b) {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a<0 || b<0 || a>=WIDTH*HEIGHT || b>=WIDTH*HEIGHT) return false;
    const dx=Math.abs(a%WIDTH-b%WIDTH), dy=Math.abs(Math.floor(a/WIDTH)-Math.floor(b/WIDTH));
    return Math.max(dx,dy)===1;
  }
  function canStep(s,from,to) {
    if (!adjacent(from,to) || s.map[to].type==='water') return false;
    const dx=to%WIDTH-from%WIDTH, dy=Math.floor(to/WIDTH)-Math.floor(from/WIDTH);
    // Do not squeeze diagonally past either flooded orthogonal side.
    return !dx || !dy || (s.map[from+dx].type!=='water' && s.map[from+dy*WIDTH].type!=='water');
  }
  function travelNeighbors(s,id) {
    const result=[];
    // Fixed ordering makes shortest-route ties reproducible without consuming RNG.
    for (const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]]) {
      const to=id+dy*WIDTH+dx;
      if (canStep(s,id,to)) result.push(to);
    }
    return result;
  }
  function planRoute(s,to) {
    const fail=message=>({ok:false,message,path:[],hours:0,fatigue:0});
    if (!Number.isInteger(to) || to<0 || to>=s.map.length) return fail('Choose a valid district.');
    if (to===s.position) return fail('Your group is already here.');
    if (s.map[to].type==='water') return fail('Floodwater is impassable. Find a crossing.');
    if (!s.map[to].seen && !canStep(s,s.position,to)) return fail('Scout first: long routes use revealed districts only.');
    const queue=[s.position], parent=new Map([[s.position,null]]);
    for (let i=0;i<queue.length && !parent.has(to);i++) {
      for (const next of travelNeighbors(s,queue[i])) {
        if (parent.has(next) || (!s.map[next].seen && !(queue[i]===s.position && next===to))) continue;
        parent.set(next,queue[i]); queue.push(next);
      }
    }
    if (!parent.has(to)) return fail('No revealed land route. Scout a connection or find a crossing.');
    const path=[]; for(let id=to;id!==s.position;id=parent.get(id)) path.unshift(id);
    return {ok:true,message:'',path,hours:path.length*travelHours(s),fatigue:path.length*travelFatigue(s)};
  }
  function stageRequirements(s) {
    const target=stages[(s.baseStage || 1)+1]; if(!target) return [];
    return [...Object.entries(target.requires).map(([key,level])=>({key,label:key,have:s.camp[key],need:level,met:s.camp[key]>=level})),
      {key:'crew',label:'Survivors',have:s.crew.length,need:target.crew,met:s.crew.length>=target.crew},
      {key:'trust',label:'Commons trust',have:s.factions[0].rep,need:target.trust,met:s.factions[0].rep>=target.trust},
      {key:'signal',label:'Network signal',have:s.signal,need:target.signal,met:s.signal>=target.signal}];
  }
  return {stages,benefits,maxLevel,travelHours,travelFatigue,absoluteHour,arrivalDelay,capacity,freeBeds,adjacent,canStep,travelNeighbors,planRoute,stageRequirements};
});
