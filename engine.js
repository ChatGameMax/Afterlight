/* AFTERLIGHT — deterministic, dependency-free survival simulation. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Afterlight = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1, WIDTH = 13, HEIGHT = 11;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const copy = v => JSON.parse(JSON.stringify(v));
  const resources = ['food', 'water', 'scrap', 'medicine', 'fuel'];
  const scenarios = {
    outbreak: { name: 'The infected', tag: 'ZOMBIE OUTBREAK', desc: 'The dead are not staying dead. Noise brings company; darkness changes the odds.', hazard: 'infected', modifier: 1.1, resource: 'medicine', color: 'amber' },
    blackout: { name: 'The long blackout', tag: 'GRID COLLAPSE', desc: 'No power. No resupply. The people left behind are deciding what comes next.', hazard: 'raiders', modifier: .8, resource: 'fuel', color: 'blue' },
    fallout: { name: 'Ashfall', tag: 'NUCLEAR AFTERMATH', desc: 'An ash-covered landscape. Shelter and clean water are worth more than old money.', hazard: 'scavenger gangs', modifier: 1, resource: 'water', color: 'green' },
    climate: { name: 'The drowned world', tag: 'CLIMATE COLLAPSE', desc: 'Flooded streets and hostile weather. Communities survive on the remaining high ground.', hazard: 'desperate crews', modifier: .8, resource: 'food', color: 'blue' },
    pandemic: { name: 'The quiet earth', tag: 'PANDEMIC AFTERMATH', desc: 'Most windows are dark. Small survivor communities navigate scarcity and mistrust.', hazard: 'hostile survivors', modifier: .7, resource: 'medicine', color: 'green' },
    machines: { name: 'The last signal', tag: 'MACHINE UPRISING', desc: 'Autonomous patrols hold the roads. Salvage the old network without becoming its next target.', hazard: 'patrol drones', modifier: 1.15, resource: 'scrap', color: 'amber' }
  };
  const eras = {
    zero: { name: 'Day zero', days: 0, loot: 1.25, threat: .85, desc: 'The collapse is happening now. Supplies remain; certainty does not.' },
    months: { name: 'Six months later', days: 180, loot: 1, threat: 1, desc: 'Abandoned districts, established factions, and no easy rescue.' },
    years: { name: 'Ten years after', days: 3650, loot: .8, threat: 1.15, desc: 'The world has moved on. Ruins are picked clean; settlements know how to endure.' }
  };
  const origins = {
    rooftop: { name: 'Rooftop holdout', place: 'residential', desc: 'You watched the streets empty from an apartment roof.', bonus: { water: 6, food: 3 }, camp: 'barricade' },
    hospital: { name: 'Last hospital shift', place: 'clinic', desc: 'You stayed after the evacuation. The supply cabinet is not quite empty.', bonus: { medicine: 7, water: 2 }, camp: null },
    convoy: { name: 'Stranded convoy', place: 'garage', desc: 'The last vehicle stopped here. The road behind is no longer safe.', bonus: { fuel: 7, scrap: 8 }, camp: null },
    farm: { name: 'Isolated homestead', place: 'park', desc: 'A small plot, a fence, and a decision to stay.', bonus: { food: 9, water: 3 }, camp: 'garden' },
    bunker: { name: 'Bunker emergence', place: 'shelter', desc: 'You have opened the door. The maps inside are no longer reliable.', bonus: { food: 5, water: 5 }, camp: 'beds' },
    prison: { name: 'Prison break', place: 'industrial', desc: 'The gates were opened. Nobody said what was waiting outside.', bonus: { scrap: 12, food: 2 }, camp: 'barricade' },
    camp: { name: 'Abandoned evacuation', place: 'market', desc: 'The buses never returned. You are turning a waiting place into a home.', bonus: { food: 5, medicine: 3 }, camp: 'water' },
    wanderer: { name: 'The lone road', place: 'road', desc: 'Everything you own fits in a bag. Everything else is a possibility.', bonus: { fuel: 2, medicine: 2, scrap: 5 }, camp: null }
  };
  const professions = {
    scavenger: { name: 'Scavenger', desc: '+35% recovered supplies.' },
    medic: { name: 'Medic', desc: 'Treatment restores 45 health instead of 30.' },
    engineer: { name: 'Engineer', desc: 'Construction uses 25% less scrap.' },
    ranger: { name: 'Ranger', desc: 'Travel takes one hour instead of two; scouting reaches farther.' },
    negotiator: { name: 'Negotiator', desc: 'Trades cost less and diplomatic aid earns more trust.' },
    veteran: { name: 'Veteran', desc: 'Incoming encounter damage is reduced by 30%.' }
  };
  const regions = {
    city: { name: 'Coastal city', desc: 'Dense districts around a broken river crossing.' },
    woodland: { name: 'Forest frontier', desc: 'Scattered buildings, more woodland, fewer stocked shops.' },
    desert: { name: 'Dry basin', desc: 'Industrial outskirts. Water starts scarce.' },
    alpine: { name: 'Cold highlands', desc: 'Remote settlements; cold increases daily food needs.' }
  };
  const tiles = {
    residential: { name: 'Apartments', icon: 'home', loot: {food: 5, water: 4, scrap: 3, medicine: 1, fuel: 0} },
    market: { name: 'Supply store', icon: 'store', loot: {food: 10, water: 7, scrap: 2, medicine: 1, fuel: 0} },
    clinic: { name: 'Clinic', icon: 'cross', loot: {food: 1, water: 3, scrap: 1, medicine: 7, fuel: 0} },
    industrial: { name: 'Factory', icon: 'factory', loot: {food: 0, water: 1, scrap: 12, medicine: 0, fuel: 3} },
    garage: { name: 'Motor depot', icon: 'garage', loot: {food: 1, water: 1, scrap: 6, medicine: 0, fuel: 7} },
    park: { name: 'Overgrown park', icon: 'tree', loot: {food: 6, water: 3, scrap: 1, medicine: 1, fuel: 0} },
    shelter: { name: 'Old shelter', icon: 'shield', loot: {food: 4, water: 5, scrap: 4, medicine: 2, fuel: 1} },
    road: { name: 'Broken road', icon: 'road', loot: {food: 0, water: 0, scrap: 3, medicine: 0, fuel: 1} },
    water: { name: 'Floodwater', icon: 'water', loot: {food: 0, water: 0, scrap: 0, medicine: 0, fuel: 0} }
  };
  const structures = {
    beds: { name: 'Living quarters', desc: 'Raises survivor capacity by two per level; improves overnight recovery.', cost: {scrap: 10}, hours: 4, max: 3 },
    barricade: { name: 'Perimeter defenses', desc: 'Reduces danger at home and the damage from night raids.', cost: {scrap: 12}, hours: 4, max: 3 },
    water: { name: 'Water collector', desc: 'Produces 4 water per day per level; more during rain.', cost: {scrap: 14}, hours: 5, max: 3 },
    garden: { name: 'Food garden', desc: 'Produces 3 food per day per level; growers add 2 each.', cost: {scrap: 12, water: 4}, hours: 5, max: 3 },
    workshop: { name: 'Salvage workshop', desc: 'Produces 2 scrap per day per level. Required to construct the radio.', cost: {scrap: 16}, hours: 6, max: 2 },
    radio: { name: 'Radio relay', desc: 'Unlocks broadcasts. Build trust and restore a regional safe-haven network.', cost: {scrap: 24, fuel: 4}, hours: 8, max: 1 }
  };
  const eventDefs = {
    stranger: { title: 'Someone at the perimeter', text: 'A lone survivor waits with empty hands. They ask for a place to sleep, not a promise.', choices: [
      {label: 'Offer a place', hint: '3 food · recruit if there is a free bed', cost: {food: 3}, effect: 'recruit'},
      {label: 'Share a meal', hint: '2 food · +8 morale, +4 trust', cost: {food: 2}, morale: 8, rep: 4},
      {label: 'Keep your distance', hint: 'No cost. They move on.', effect: 'leave'} ] },
    cache: { title: 'An untouched delivery', text: 'A sealed delivery locker has survived the first looters. Opening it will take tools—or time you may not have.', choices: [
      {label: 'Use spare parts', hint: '3 scrap · food and water', cost: {scrap: 3}, gain: {food: 8, water: 7}},
      {label: 'Force the lock', hint: 'Gain supplies · injury and noise', damage: 8, noise: 18, gain: {food: 6, water: 5}},
      {label: 'Leave it sealed', hint: 'No cost. No risk.', effect: 'leave'} ] },
    caravan: { title: 'A caravan under a white flag', text: 'A traveling crew offers supplies at a steep price. A painted symbol identifies them as the Exchange.', choices: [
      {label: 'Buy provisions', hint: '6 scrap · +8 food, +6 water', cost: {scrap: 6}, gain: {food: 8, water: 6}, rep: 5},
      {label: 'Buy medical supplies', hint: '5 scrap · +4 medicine', cost: {scrap: 5}, gain: {medicine: 4}, rep: 5},
      {label: 'Exchange news', hint: 'Reveal nearby districts · +2 trust', effect: 'reveal', rep: 2} ] },
    storm: { title: 'The weather closes in', text: 'The sky turns the color of old steel. Secure the supplies now, or trust that the shelter will hold.', choices: [
      {label: 'Reinforce the shelter', hint: '4 scrap · +5 morale', cost: {scrap: 4}, morale: 5},
      {label: 'Ride it out', hint: 'Lose 3 food · take 5 damage', cost: {}, loss: {food: 3}, damage: 5},
      {label: 'Use emergency fuel', hint: '2 fuel · +6 morale', cost: {fuel: 2}, morale: 6} ] },
    distress: { title: 'A voice on an open channel', text: 'The Commons asks for medical supplies. They will remember who answered when the network was barely a whisper.', choices: [
      {label: 'Send medical aid', hint: '3 medicine · +18 trust, +5 signal', cost: {medicine: 3}, rep: 18, signal: 5},
      {label: 'Share provisions', hint: '4 food, 3 water · +12 trust', cost: {food: 4, water: 3}, rep: 12},
      {label: 'Stay silent', hint: 'No cost. Save what you have.', effect: 'leave'} ] },
    dispute: { title: 'Two versions of tomorrow', text: 'Your people disagree about the future: save every resource, or make this place worth living in. They are waiting for your decision.', choices: [
      {label: 'Hold a shared supper', hint: '4 food · +15 morale', cost: {food: 4}, morale: 15},
      {label: 'Listen to both sides', hint: 'Recover 8 fatigue · +4 morale', fatigue: -8, morale: 4},
      {label: 'Demand discipline', hint: '+5 scrap · −8 morale', gain: {scrap: 5}, morale: -8} ] }
  };
  const firstNames = ['Mara', 'Eli', 'June', 'Idris', 'Sana', 'Theo', 'Nora', 'Lev', 'Inez', 'Ash', 'Ren', 'Sol', 'Ada', 'Beck', 'Luca', 'Rae'];
  const traits = ['Steady hands', 'Night owl', 'Quiet optimist', 'Methodical', 'Quick learner', 'Watchful'];
  const roles = ['forager', 'guard', 'grower', 'rest'];
  const defaults = {name: 'The last neighborhood', seed: 'AFTERLIGHT-01', scenario: 'outbreak', era: 'months', origin: 'rooftop', profession: 'scavenger', region: 'city', party: 3, threat: 45, abundance: 110, weather: 45, infected: 'shamblers'};
  function hash(text) { let h = 2166136261; for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0 || 1; }
  function random(s) { let x = s.rng; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; s.rng = x >>> 0 || 1; return s.rng / 4294967296; }
  const integer = (s, a, b) => a + Math.floor(random(s) * (b - a + 1));
  const pick = (s, arr) => arr[integer(s, 0, arr.length - 1)];
  const atHome = s => s.position === s.base;
  const countRole = (s, r) => s.crew.filter(c => c.role === r).length;
  const capacity = s => 2 + 2 * s.camp.beds;
  const alive = s => !s.over;
  const distance = (a, b) => Math.abs(a % WIDTH - b % WIDTH) + Math.abs(Math.floor(a / WIDTH) - Math.floor(b / WIDTH));
  function neighbors(id) { return [id - WIDTH, id + WIDTH, id % WIDTH ? id - 1 : -1, id % WIDTH < WIDTH - 1 ? id + 1 : -1].filter(n => n >= 0 && n < WIDTH * HEIGHT); }
  function normalizeConfig(input = {}) {
    const c = {...defaults, ...input};
    for (const [key, set] of Object.entries({scenario: scenarios, era: eras, origin: origins, profession: professions, region: regions})) if (!Object.hasOwn(set, c[key])) c[key] = defaults[key];
    for (const [key, lo, hi] of [['party',1,4], ['threat',0,100], ['abundance',30,180], ['weather',0,100]]) c[key] = clamp(Math.round(Number(c[key]) || (key === 'threat' || key === 'weather' ? 0 : defaults[key])), lo, hi);
    c.infected = ['shamblers','runners','nocturnal'].includes(c.infected) ? c.infected : 'shamblers';
    c.name = String(c.name || defaults.name).trim().slice(0, 60) || defaults.name;
    c.seed = String(c.seed || defaults.seed).slice(0, 80);
    return Object.fromEntries(Object.keys(defaults).map(k => [k, c[k]]));
  }
  function log(s, text, tone = 'info') { s.log.unshift({day: s.day, hour: s.hour, text, tone}); s.log = s.log.slice(0, 100); }
  function addResources(s, amounts, factor = 1) { for (const key of resources) if (amounts[key]) s.resources[key] = clamp(s.resources[key] + Math.round(amounts[key] * factor), 0, 9999); }
  const afford = (s, cost) => Object.entries(cost || {}).every(([k,v]) => s.resources[k] >= v);
  function pay(s, cost) { if (!afford(s, cost)) return false; addResources(s, cost, -1); return true; }
  function reveal(s, center, radius) { s.map.forEach(t => { if (distance(center, t.id) <= radius) t.seen = true; }); }
  function recruit(s) {
    const used = s.crew.map(c => c.name);
    const names = firstNames.filter(n => !used.includes(n));
    const c = {id: s.nextCrew++, name: pick(s, names.length ? names : firstNames), profession: pick(s, Object.keys(professions)), role: 'forager', trait: pick(s, traits)};
    s.crew.push(c); return c;
  }
  function newGame(input) {
    const config = normalizeConfig(input);
    const s = {version: VERSION, config, rng: hash(config.seed), day: 1, hour: 8, health: 100, morale: 72, fatigue: 0, noise: 0, resources: {food: 12, water: 15, scrap: 14, medicine: 3, fuel: 3}, crew: [], nextCrew: 1, camp: {beds: 1, barricade: 0, water: 0, garden: 0, workshop: 0, radio: 0}, map: [], base: 0, position: 0, weather: 'clear', fronts: [], factions: [{name: 'The Commons', rep: 15, power: 45}, {name: 'The Exchange', rep: 25, power: 40}, {name: 'The Iron Choir', rep: -30, power: 35}], signal: 0, won: false, over: false, event: null, lastEvent: -5, actionCount: 0, log: [], stats: {searched: 0, built: 0, recruited: 0, broadcasts: 0, survived: 0}};
    for (let id = 0; id < WIDTH * HEIGHT; id++) {
      const x = id % WIDTH, y = Math.floor(id / WIDTH), r = random(s);
      let type = r < .28 ? 'residential' : r < .42 ? 'park' : r < .55 ? 'market' : r < .65 ? 'clinic' : r < .77 ? 'industrial' : r < .87 ? 'garage' : 'shelter';
      if (config.region === 'woodland' && random(s) < .4) type = 'park';
      if (config.region === 'desert' && random(s) < .27) type = 'industrial';
      if (x === 3 || y === 5 || (x === 9 && y > 4)) type = 'road';
      if (config.region === 'city' && x === 10 && y !== 5 && y !== 2 && y !== 8) type = 'water';
      if (config.scenario === 'climate' && random(s) < .1 && type !== 'road') type = 'water';
      const stock = {};
      for (const k of resources) stock[k] = Math.round(tiles[type].loot[k] * (.6 + random(s) * .8) * config.abundance / 100 * eras[config.era].loot * (k === scenarios[config.scenario].resource ? .65 : 1));
      s.map.push({id, type, seen: false, searched: false, stock, danger: integer(s, 5, 30), name: `${pick(s, ['North','Old','West','Lower','East','Upper','South'])} ${tiles[type].name}`, visits: 0});
    }
    // Central origins prevent disconnected starts; four exits remain traversable.
    s.base = (integer(s, 3, 7) * WIDTH) + integer(s, 4, 8); s.position = s.base;
    const start = s.map[s.base]; start.type = origins[config.origin].place; start.name = 'Home base'; start.danger = 0;
    start.stock = Object.fromEntries(resources.map(k => [k, Math.round(tiles[start.type].loot[k] * config.abundance / 100 * eras[config.era].loot * (k === scenarios[config.scenario].resource ? .65 : 1))]));
    for (const id of neighbors(s.base)) if (s.map[id].type === 'water') {s.map[id].type = 'road'; s.map[id].stock = copy(tiles.road.loot); s.map[id].name = 'Raised causeway';}
    // All dry districts connect to the spawn: bridge any isolated flood island.
    let reached = new Set([s.base]), queue = [s.base];
    while (queue.length) {for (const n of neighbors(queue.shift())) if (!reached.has(n) && s.map[n].type !== 'water') {reached.add(n); queue.push(n);}}
    for (const t of s.map) if (t.type !== 'water' && !reached.has(t.id)) {
      let cursor = t.id;
      while (!reached.has(cursor)) {
        reached.add(cursor);
        if (s.map[cursor].type === 'water') {s.map[cursor].type = 'road'; s.map[cursor].stock = copy(tiles.road.loot); s.map[cursor].name = 'Raised causeway';}
        cursor = neighbors(cursor).sort((a,b) => distance(a,s.base)-distance(b,s.base))[0];
      }
    }
    for (let i = 0; i < config.party; i++) recruit(s);
    s.crew[0].profession = config.profession; s.crew[0].role = 'guard';
    addResources(s, origins[config.origin].bonus);
    const structure = origins[config.origin].camp; if (structure) s.camp[structure] = structure === 'beds' ? 2 : Math.max(1, s.camp[structure]);
    if (config.era === 'years') {s.camp.water = 1; s.camp.garden = 1; s.resources.scrap += 6;}
    if (config.era === 'zero') s.morale += 4;
    if (config.region === 'desert') s.resources.water = Math.max(4, s.resources.water - 6);
    reveal(s, s.base, config.profession === 'ranger' ? 3 : 2);
    const dry = s.map.filter(t => t.type !== 'water' && distance(t.id, s.base) > 4);
    if (config.threat > 0) for (let i = 0; i < 3; i++) s.fronts.push({position: pick(s, dry).id, strength: integer(s, 8, 18)});
    log(s, `${origins[config.origin].desc} ${eras[config.era].desc}`, 'story');
    log(s, `${s.crew[0].name} leads ${s.crew.length === 1 ? 'a solo expedition' : `a group of ${s.crew.length}`}. Search your starting district, then secure daily food and water.`, 'good');
    return s;
  }
  function danger(s, id = s.position) {
    if (s.config.threat === 0) return 0;
    const t = s.map[id];
    let n = (t.danger + s.day * .65 + s.noise * (s.config.scenario === 'outbreak' ? .26 : .18)) * s.config.threat / 50 * scenarios[s.config.scenario].modifier * eras[s.config.era].threat;
    if (s.hour >= 20 || s.hour < 6) n *= s.config.scenario === 'outbreak' && s.config.infected === 'nocturnal' ? 2.1 : 1.35;
    if (s.config.scenario === 'outbreak' && s.config.infected === 'runners') n *= 1.3;
    for (const f of s.fronts) if (distance(f.position, id) <= 1) n += f.strength * s.config.threat / 50;
    if (id === s.base) n -= 10 + s.camp.barricade * 13 + countRole(s, 'guard') * 4;
    return Math.round(clamp(n, 0, 90));
  }
  function damage(s, amount) {
    const actual = Math.max(0, Math.round(amount * (s.config.profession === 'veteran' ? .7 : 1)));
    s.health = Math.max(0, s.health - actual);
    if (s.health <= 0) {s.over = true; s.event = null; log(s, 'The expedition has fallen. Your chronicle remains. A new beginning is still possible.', 'bad');}
    return actual;
  }
  function encounter(s, factor = 1) {
    if (random(s) * 100 < danger(s) * .5 * factor) {
      const hit = damage(s, integer(s, 4, 13) + s.fatigue / 18);
      s.morale = clamp(s.morale - 3, 0, 100);
      log(s, `Contact with ${scenarios[s.config.scenario].hazard}. You get clear, but lose ${hit} health.`, 'bad');
    }
  }
  function production(s) {
    return {food: s.camp.garden * 3 + (s.camp.garden ? countRole(s, 'grower') * 2 : 0) + countRole(s, 'forager'), water: s.camp.water * (s.weather === 'rain' ? 6 : 4), scrap: s.camp.workshop * 2};
  }
  function consumption(s) {return {food: s.crew.length * (s.config.region === 'alpine' || s.weather === 'cold' ? 3 : 2), water: s.crew.length * (s.weather === 'heat' || s.config.region === 'desert' ? 3 : 2)};}
  function dawn(s) {
    s.day++; s.stats.survived++; s.noise = Math.max(0, s.noise - 15);
    const severity = Math.min(1, s.config.weather / 100 * (s.config.scenario === 'climate' ? 1.35 : 1));
    s.weather = random(s) < severity ? pick(s, s.config.scenario === 'fallout' ? ['ash','cold','ash','rain'] : s.config.region === 'desert' ? ['heat','heat','wind'] : s.config.region === 'alpine' ? ['cold','cold','wind'] : ['rain','wind','cold','heat']) : 'clear';
    const output = production(s), need = consumption(s);
    addResources(s, output);
    const foodMissing = Math.max(0, need.food - s.resources.food), waterMissing = Math.max(0, need.water - s.resources.water);
    addResources(s, need, -1);
    if (foodMissing || waterMissing) {
      const hit = damage(s, foodMissing * 2 + waterMissing * 3);
      s.morale = clamp(s.morale - 10, 0, 100);
      log(s, `Overnight ration shortage: ${foodMissing} food, ${waterMissing} water missing. −${hit} health.`, 'bad');
    } else {
      s.health = clamp(s.health + s.camp.beds + countRole(s,'rest') * 2, 0, 100);
      s.morale = clamp(s.morale + 2 + countRole(s,'rest'), 0, 100);
      log(s, `Day ${s.day}. Camp produced ${output.food} food, ${output.water} water, ${output.scrap} scrap; consumed ${need.food} food and ${need.water} water.`, 'good');
    }
    if (s.over) return;
    if (s.config.scenario === 'pandemic' && s.day % 3 === 0) {
      if (s.resources.medicine > 0) {s.resources.medicine--; log(s, 'Community care used 1 medicine to protect the group.', 'info');}
      else {damage(s,3); s.morale = clamp(s.morale-3,0,100); log(s, 'Community care ran short of medicine. The group lost 3 health.', 'bad');}
    }
    if (s.over) return;
    for (const faction of s.factions) faction.power = clamp(faction.power + integer(s,-3,4), 5, 95);
    for (const f of s.fronts) {
      for (let step = 0; step < (s.config.scenario === 'machines' ? 2 : 1); step++) {
        const options = neighbors(f.position).filter(id => s.map[id].type !== 'water');
        if (options.length) f.position = s.noise > 20 ? options.sort((a,b) => distance(a,s.position)-distance(b,s.position))[0] : pick(s,options);
      }
      f.strength = clamp(f.strength + integer(s,-2,3),5,35);
    }
    if (s.config.threat > 0 && random(s) < s.config.threat / 700) {
      const hit = damage(s, Math.max(0, 11 - s.camp.barricade * 4 - countRole(s,'guard') * 2));
      log(s, `Your perimeter was tested overnight. ${hit ? `${hit} health lost.` : 'The defenders held the line.'}`, hit ? 'bad' : 'good');
    }
  }
  function advance(s, hours) {
    for (let i = 0; i < hours && alive(s); i++) {
      s.hour++;
      if (s.hour === 24) {s.hour = 0; dawn(s);}
      if (s.fatigue >= 95 && random(s) < .2) damage(s,2);
      if (!atHome(s) && (s.weather === 'ash' || s.weather === 'cold') && random(s) < s.config.weather / 500) damage(s,1);
    }
    s.health = clamp(s.health,0,100); s.morale = clamp(s.morale,0,100); s.fatigue = clamp(s.fatigue,0,100); s.noise = clamp(s.noise,0,100);
  }
  function maybeEvent(s) {
    if (s.over || s.event || s.actionCount - s.lastEvent < 4) return;
    if (random(s) < .26) {
      const list = ['cache','caravan','distress','dispute'];
      if (s.crew.length < capacity(s)) list.push('stranger');
      if (s.weather !== 'clear') list.push('storm');
      s.event = {id: pick(s,list)}; s.lastEvent = s.actionCount;
      log(s, eventDefs[s.event.id].title, 'story');
    }
  }
  function costToBuild(s, key) {
    if (!Object.hasOwn(structures,key)) return null;
    const result = {};
    for (const [k,v] of Object.entries(structures[key].cost)) result[k] = Math.ceil(v * (1 + s.camp[key] * .5) * (k === 'scrap' && s.config.profession === 'engineer' ? .75 : 1));
    return result;
  }
  function status(s, action, args = {}) {
    if (s.over) return 'This expedition has ended. Start a new world or import an earlier save.';
    if (s.event) return 'Resolve the current encounter first.';
    const t = s.map[s.position];
    if (action === 'move') {
      if (!Number.isInteger(args.id) || args.id < 0 || args.id >= s.map.length) return 'Choose a valid district.';
      if (distance(s.position,args.id) !== 1) return 'Travel one neighboring district at a time.';
      if (s.map[args.id].type === 'water') return 'Floodwater is impassable. Find a crossing.';
    } else if (action === 'scavenge') {if (t.searched) return 'This district has already been searched. Move to a fresh location.';}
    else if (action === 'build') {
      if (!atHome(s)) return 'Return to home base to build.';
      if (!Object.hasOwn(structures,args.key)) return 'Unknown structure.';
      if (s.camp[args.key] >= structures[args.key].max) return 'Already at maximum level.';
      if (args.key === 'radio' && !s.camp.workshop) return 'Build a salvage workshop first.';
      if (!afford(s,costToBuild(s,args.key))) return 'Not enough construction supplies.';
    } else if (action === 'heal') {if (s.health >= 100) return 'Your group is already healthy.'; if (s.resources.medicine < 2) return 'Treatment requires 2 medicine.';}
    else if (action === 'broadcast') {
      if (!atHome(s)) return 'Use the relay at home base.';
      if (!s.camp.radio) return 'Build a radio relay first.';
      if (s.resources.fuel < 1 || s.resources.scrap < 2) return 'Broadcasting requires 1 fuel and 2 scrap.';
    } else if (action === 'trade') {if (!atHome(s)) return 'Trade caravans visit your home base.'; if (!['food','water','medicine','fuel'].includes(args.key)) return 'Choose a valid trade.'; if (!afford(s,tradeCost(s,args.key))) return 'Not enough scrap to trade.';}
    else if (action === 'aid') {if (!atHome(s)) return 'Coordinate aid from home base.'; if (!afford(s,{food:4,water:3})) return 'Aid requires 4 food and 3 water.';}
    else if (action === 'role') {if (!roles.includes(args.role) || !s.crew.some(c => c.id === args.id)) return 'Choose a valid survivor and role.';}
    else if (!['rest','scout','forage','wait'].includes(action)) return 'Unknown action.';
    return '';
  }
  function tradeCost(s,key) {const price = {food:5, water:4, medicine:6, fuel:5}[key] || 5; return {scrap: Math.max(2,price - (s.config.profession === 'negotiator' ? 1 : 0) - (s.factions[1].rep >= 50 ? 1 : 0))};}
  function checkWin(s) {
    if (!s.over && !s.won && s.signal >= 100 && s.factions[0].rep >= 40 && s.camp.garden >= 1 && s.camp.water >= 1) {s.won = true; log(s, 'A light answered yours. The regional safe-haven network is alive. You have made a beginning, not an ending. Continue building, or start a different world.', 'victory');}
  }
  function act(s, action, args = {}) {
    const error = status(s,action,args); if (error) return {ok:false,message:error};
    const t = s.map[s.position]; let hours = 0;
    switch (action) {
      case 'move':
        s.position = args.id; s.map[args.id].visits++; reveal(s,s.position,s.config.profession === 'ranger' ? 2 : 1);
        hours = s.config.profession === 'ranger' ? 1 : 2; s.fatigue += 4; s.noise += 3;
        log(s, `Arrived at ${s.map[args.id].name}.`, 'info'); encounter(s,.7); break;
      case 'scavenge': {
        const loot = {}; const multiplier = (s.config.profession === 'scavenger' ? 1.35 : 1) * (s.fatigue > 75 ? .75 : 1) * (s.morale < 30 ? .8 : s.morale >= 85 ? 1.1 : 1);
        for (const k of resources) loot[k] = Math.round(t.stock[k] * multiplier);
        addResources(s,loot); t.stock = Object.fromEntries(resources.map(k=>[k,0])); t.searched = true; s.stats.searched++;
        s.fatigue += 13; s.noise += 13; hours = 3;
        log(s, `Recovered ${Object.entries(loot).filter(([,v])=>v).map(([k,v])=>`${v} ${k}`).join(', ') || 'nothing usable'} from ${t.name}.`, 'good'); encounter(s); break;
      }
      case 'scout':
        reveal(s,s.position,s.config.profession === 'ranger' ? 4 : 3); s.fatigue += 7; hours = 2;
        log(s,'Scouted the surroundings. Nearby sites and roaming threats are now visible.'); encounter(s,.3); break;
      case 'rest':
        hours = 8; s.fatigue = Math.max(0,s.fatigue - (atHome(s) ? 65 : 38));
        s.health = clamp(s.health + (atHome(s) ? 9 + s.camp.beds * 3 : 4),0,100); s.morale = clamp(s.morale+4,0,100); s.noise = Math.max(0,s.noise-20);
        log(s,atHome(s) ? 'You rest behind your own walls. The world outside keeps moving.' : 'You make a temporary camp. Sleep is light, and someone keeps watch.'); if (!atHome(s)) encounter(s,.7); break;
      case 'forage': {
        const found = t.type === 'park' ? {food: 3, water: 2} : {food: 1, water: 1};
        addResources(s,found); hours = 4; s.fatigue += 10; s.noise += 4;
        log(s,`Foraged ${found.food} food and ${found.water} water. Slow, but renewable.`, 'good'); encounter(s,.5); break;
      }
      case 'heal':
        pay(s,{medicine:2}); s.health = clamp(s.health+(s.config.profession === 'medic' ? 45 : 30),0,100); hours = 1;
        log(s,'Treated wounds and checked the group. Used 2 medicine.', 'good'); break;
      case 'build': {
        pay(s,costToBuild(s,args.key)); s.camp[args.key]++; s.stats.built++; hours = structures[args.key].hours; s.fatigue += 8; s.noise += 10;
        log(s,`${structures[args.key].name} completed: level ${s.camp[args.key]}.`, 'good'); break;
      }
      case 'broadcast':
        pay(s,{fuel:1,scrap:2}); s.signal = clamp(s.signal + (s.factions[0].rep >= 40 ? 25 : 18),0,100); s.factions[0].rep = clamp(s.factions[0].rep+4,-100,100); s.stats.broadcasts++; s.noise += 20; hours = 3;
        log(s,`A signal crosses the silence. Network restoration: ${s.signal}%.`, 'good'); break;
      case 'trade': {
        const cost = tradeCost(s,args.key); pay(s,cost); const amount = args.key === 'medicine' ? 3 : args.key === 'fuel' ? 4 : 7;
        addResources(s,{[args.key]:amount}); s.factions[1].rep = clamp(s.factions[1].rep+3,-100,100); hours = 2;
        log(s,`Traded ${cost.scrap} scrap for ${amount} ${args.key} with the Exchange.`, 'good'); break;
      }
      case 'aid':
        pay(s,{food:4,water:3}); s.factions[0].rep = clamp(s.factions[0].rep+(s.config.profession === 'negotiator' ? 18 : 12),-100,100); s.morale = clamp(s.morale+4,0,100); hours = 3;
        log(s,'Your aid reached the Commons. Trust is something you build.', 'good'); break;
      case 'role':
        s.crew.find(c=>c.id===args.id).role = args.role; return {ok:true,message:'Role updated. Daily production will use the new assignment.'};
      case 'wait': hours = 4; s.fatigue += 2; log(s,'Four hours pass. You listen to the world outside.'); break;
    }
    s.actionCount++; advance(s,hours); if (alive(s)) {checkWin(s); maybeEvent(s);}
    return {ok:true,message:s.over ? 'The expedition has ended.' : 'Action complete.'};
  }
  function choiceStatus(s,index) {
    if (!s.event || !eventDefs[s.event.id] || !Number.isInteger(index)) return 'No active encounter.';
    const c = eventDefs[s.event.id].choices[index]; if (!c) return 'Choose a valid response.';
    if (!afford(s,c.cost)) return 'Insufficient supplies.';
    if (c.effect === 'recruit' && s.crew.length >= capacity(s)) return 'Build more living quarters first.';
    return '';
  }
  function resolveEvent(s,index) {
    const error = choiceStatus(s,index); if (error) return {ok:false,message:error};
    const def = eventDefs[s.event.id], c = def.choices[index]; pay(s,c.cost || {});
    if (c.gain) addResources(s,c.gain); if (c.loss) addResources(s,c.loss,-1);
    if (c.damage) damage(s,c.damage); if (c.morale) s.morale = clamp(s.morale+c.morale,0,100);
    if (c.fatigue) s.fatigue = clamp(s.fatigue+c.fatigue,0,100); if (c.noise) s.noise = clamp(s.noise+c.noise,0,100);
    if (c.rep) {const f = def === eventDefs.caravan ? 1 : 0; s.factions[f].rep = clamp(s.factions[f].rep+c.rep,-100,100);}
    if (c.signal) s.signal = clamp(s.signal+c.signal,0,100);
    if (c.effect === 'recruit') {const person = recruit(s); s.stats.recruited++; log(s,`${person.name}, a ${professions[person.profession].name.toLowerCase()}, joined the community.`, 'good');}
    if (c.effect === 'reveal') reveal(s,s.position,4);
    log(s,`${def.title}: ${c.label}.`, 'story'); s.event = null; checkWin(s);
    return {ok:true,message:'Decision recorded.'};
  }
  function tune(s,input) {
    const updated = normalizeConfig({...s.config, ...Object.fromEntries(['threat','abundance','weather'].filter(k=>Object.hasOwn(input,k)).map(k=>[k,input[k]]))});
    const ratio = updated.abundance / s.config.abundance;
    for (const t of s.map) if (!t.searched) for (const key of resources) t.stock[key] = clamp(Math.round(t.stock[key] * ratio),0,9999);
    s.config = updated;
    if (!updated.threat) s.fronts = [];
    else if (!s.fronts.length) s.fronts = s.map.filter(t=>t.type!=='water' && distance(t.id,s.base)>4).slice(0,3).map(t=>({position:t.id,strength:10}));
    log(s,'Sandbox rules updated. Supply abundance affects remaining unsearched stock; it does not reset searched districts.');
    return {ok:true,message:'World rules updated.'};
  }
  function validate(s) {
    const fail = () => {throw new Error('Invalid or incompatible save. Your current world has not been changed.');};
    const num = (n,lo,hi) => typeof n === 'number' && Number.isFinite(n) && n>=lo && n<=hi;
    const int = (n,lo,hi) => num(n,lo,hi) && Number.isInteger(n);
    const text = (v,n) => typeof v === 'string' && v.length<=n;
    const object = v => v && typeof v === 'object' && !Array.isArray(v);
    const bundle = b => object(b) && resources.every(k=>int(b[k],0,9999)) && Object.keys(b).every(k=>resources.includes(k));
    if (!object(s) || s.version !== VERSION || !object(s.config)) fail();
    const normal = normalizeConfig(s.config);
    for (const k of Object.keys(defaults)) if (normal[k] !== s.config[k]) fail();
    for (const k of ['health','morale','fatigue','noise','signal']) if (!num(s[k],0,100)) fail();
    if (!int(s.rng,1,4294967295) || !int(s.day,1,1000000) || !int(s.hour,0,23) || !int(s.actionCount,0,100000000) || !int(s.lastEvent,-5,s.actionCount) || !int(s.nextCrew,1,100000)) fail();
    if (!bundle(s.resources) || !int(s.base,0,WIDTH*HEIGHT-1) || !int(s.position,0,WIDTH*HEIGHT-1)) fail();
    if (!Array.isArray(s.map) || s.map.length !== WIDTH*HEIGHT) fail();
    s.map.forEach((t,id)=>{if (!object(t) || t.id!==id || !Object.hasOwn(tiles,t.type) || typeof t.seen!=='boolean' || typeof t.searched!=='boolean' || !bundle(t.stock) || !num(t.danger,0,100) || !text(t.name,100) || !int(t.visits,0,100000000)) fail();});
    if (s.map[s.base].type==='water' || s.map[s.position].type==='water' || !s.map[s.position].seen) fail();
    if (!object(s.camp) || !Object.keys(structures).every(k=>int(s.camp[k],0,structures[k].max)) || Object.keys(s.camp).some(k=>!Object.hasOwn(structures,k))) fail();
    if (!Array.isArray(s.crew) || s.crew.length<1 || s.crew.length>capacity(s)) fail();
    const ids = new Set();
    for (const c of s.crew) {if (!object(c) || !int(c.id,1,s.nextCrew-1) || ids.has(c.id) || !text(c.name,60) || !Object.hasOwn(professions,c.profession) || !roles.includes(c.role) || !text(c.trait,80)) fail(); ids.add(c.id);}
    if (!['clear','rain','wind','cold','heat','ash'].includes(s.weather)) fail();
    if (!Array.isArray(s.fronts) || s.fronts.length>20) fail();
    for (const f of s.fronts) if (!object(f) || !int(f.position,0,WIDTH*HEIGHT-1) || s.map[f.position].type==='water' || !num(f.strength,0,100)) fail();
    if (!Array.isArray(s.factions) || s.factions.length!==3) fail();
    for (const f of s.factions) if (!object(f) || !text(f.name,80) || !num(f.rep,-100,100) || !num(f.power,0,100)) fail();
    if (s.event!==null && (!object(s.event) || !Object.hasOwn(eventDefs,s.event.id))) fail();
    if (!Array.isArray(s.log) || s.log.length>100) fail();
    for (const e of s.log) if (!object(e) || !int(e.day,1,s.day) || !int(e.hour,0,23) || !text(e.text,2000) || !['info','good','bad','story','victory'].includes(e.tone)) fail();
    if (typeof s.over!=='boolean' || typeof s.won!=='boolean' || s.over !== (s.health===0)) fail();
    if (!object(s.stats) || !['searched','built','recruited','broadcasts','survived'].every(k=>int(s.stats[k],0,100000000))) fail();
    return true;
  }
  function serialize(s) {validate(s); return JSON.stringify(s);}
  function deserialize(text) {
    if (typeof text !== 'string' || text.length>2000000) throw new Error('Save file is too large. Maximum size: 2 MB.');
    let s; try {s=JSON.parse(text);} catch {throw new Error('This file is not a valid JSON save.');}
    validate(s); return s;
  }
  return {VERSION,WIDTH,HEIGHT,defs:{scenarios,eras,origins,professions,regions,tiles,structures,eventDefs,roles,resources,defaults},newGame,act,status,resolveEvent,choiceStatus,costToBuild,tradeCost,production,consumption,danger,capacity,atHome,neighbors,distance,tune,serialize,deserialize,validate};
});
