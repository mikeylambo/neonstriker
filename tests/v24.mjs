// ---- global stubs ----
const noop = new Proxy(function () {}, {
    get: (t, p) => (p === Symbol.toPrimitive ? () => '' : noop),
    apply: () => noop,
    set: () => true
});
globalThis.document = { getElementById: () => noop, createElement: () => noop, querySelector: () => null, body: noop };
globalThis.window = globalThis;
globalThis.window.AudioContext = function () { return noop; };
if (typeof globalThis.addEventListener !== 'function') globalThis.addEventListener = () => {};
try { Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [] }, configurable: true }); } catch (e) {}
globalThis.requestAnimationFrame = () => 0;
(() => {
    const store = new Map();
    globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
})();

let passed = 0, failed = 0;
const fails = [], report = [];
function ok(name, cond, detail = '') { if (cond) passed++; else { failed++; fails.push(`${name}${detail ? ' — ' + detail : ''}`); } }
function eq(name, got, want) { ok(name, got === want, `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
// v24 pass verification (headless, real modules).
const { CONSTANTS } = await import('../src/constants.js');
const { gameState: st } = await import('../src/state.js');
const settings = await import('../src/systems/settings.js');
const bosses = await import('../src/entities/bosses.js');
const enemies = await import('../src/entities/enemies.js');
const player = await import('../src/entities/player.js');
const combat = await import('../src/systems/combat.js');
const neg = await import('../src/systems/negative.js');
const { seedRng } = await import('../src/systems/rng.js');
const { UPGRADE_POOL } = await import('../src/data/upgrades.js');
const main = await import('../src/main.js');
const T = main.__test;
const { SequenceManager: SM } = await import('../src/systems/sequences.js');
const fs = await import('node:fs');
const frames = (n, fn) => { for (let i = 0; i < n; i++) fn(i); };
const PAD0 = { up: false, down: false, ghost: false, leftHeld: false, rightHeld: false, guard: false, jab: false, cross: false, crossHeld: false, hook: false, instinct: false, pause: false };
const run = (seed = 3) => { localStorage.clear(); settings.reloadSettings(); T.startGame({ tutorial: false, seed }); SM.active = false; st.screen = 'playing'; st.seenTutorials.footwork_tip = true; st.seenTutorials.instinct = true; st.pendingUpgrades = 0; st.enemies = []; st.waveTimer = 9999; st.pad = { ...PAD0 }; st.keys = {}; st.lastKeys = {}; st.player.x = 180; st.player.lane = 1; st.player.y = st.height * CONSTANTS.LANE_Y[1]; st.player.state = 'idle'; st.hitstop = 0; st.inputGrace = 0; st.tutorialGrace = 0; st.health = st.maxHealth; };
const mob = (over = {}) => ({ x: st.player.x + 80, lane: st.player.lane, y: st.player.y, w: 50, h: 110, hp: 400, maxHp: 400, speed: 0, color: '#f05', type: 'grunt', weight: 1, stun: 0, stunResist: 0, attackCooldown: 200, maxCooldown: 60, isBoss: false, justAttacked: 0, trails: [], vx: 0, pressure: 0, pressureDecay: 0, stringLen: 1, stringIdx: 0, ...over });
const bossAt = arc => { run(); st.currentStage = CONSTANTS.bossStageOfArc(arc); bosses.spawnBoss(); st.bossIntroTimer = 0; const b = st.enemies.find(e => e.isBoss); b.x = st.player.x + 100; b.lane = 1; b.y = st.player.y; return b; };
const tick = () => { st.laneFlash = [0, 0, 0]; st.player.dangerLevel = 0; bosses.updateBosses(); };

// ---- 1. pacing: every Arc is four fights + a boss ----
ok('arcs: all five Arcs are 5 stages', [1, 2, 3, 4, 5].every(a => CONSTANTS.arcLength(a) === 5));
eq('arcs: the final boss is stage 25', CONSTANTS.bossStageOfArc(5), 25);
ok('arcs: boss stages 5/10/15/20/25', [5, 10, 15, 20, 25].every(CONSTANTS.isBossStage));

// ---- 2. no empty lane before a boss ----
run(); st.currentStage = 9; st.stageClearing = true; st.enemies = []; st.purifyTimer = 0; st.bossDefeatedThisStage = false;
T.update(); SM.active = false; st.screen = 'playing';
let f = 0; while (!st.enemies.some(e => e.isBoss) && f++ < 200) T.update();
ok('boss: spawns within a few frames of the round starting', f <= 12, `${f} frames`);

// ---- 3. Instinct Cross: loaded, but no launch ----
run(); st.progressionMods.loadedCross = true; st.player.crossLoaded = true;
let g = mob({ hp: 999, maxHp: 999 }); st.enemies = [g]; combat.checkHit('cross'); const kbNormal = g.vx;
run(); st.progressionMods.loadedCross = true; st.player.crossLoaded = true; st.isInstinct = true;
g = mob({ hp: 999, maxHp: 999 }); st.enemies = [g]; combat.checkHit('cross'); const kbInst = g.vx; st.isInstinct = false;
ok('instinct cross: no Loaded launch in Instinct', kbInst < kbNormal / 2, `${kbInst} vs ${kbNormal}`);

// ---- 4. numbers ----
const glass = CONSTANTS.AFFIXES.find(a => a.name === 'GLASS PROTOCOL');
ok('glass protocol: back to 30/30', glass.mods.playerDamageDealtMult === 1.3 && glass.mods.playerDamageTakenMult === 1.3 && glass.scoreMult === 1.75);
run(); g = mob({ hp: 100, maxHp: 100 }); st.enemies = [g]; combat.checkHit('hook');
eq('hook: 28 damage', 100 - g.hp, 28);
eq('ghost step: 0.6s cooldown', CONSTANTS.GHOST_STEP_COOLDOWN, 36);
const allIds = Object.values(UPGRADE_POOL).flat().map(u => u.id);
ok('cards: Quick Nerves gone, Weaver\'s Step kept', !allIds.includes('oc_quick_nerves') && allIds.includes('mast_weavers_step'));
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
ok('menu: tutorial toggle is a menu button, after START', /class="orb-btn sm tut-toggle"/.test(html) && html.indexOf('tut-toggle') > html.indexOf('START GAUNTLET'));
ok('wager: no button glyphs', !/wager-accept-key|wager-decline-key/.test(html));

// ---- 5. Static Monk volleys ----
let m = bossAt(3); eq('monk: Arc 3 boss', m.controller, 'static_monk');
m.hp = m.maxHp * 0.4; m.finisherStage = 1; m.currentMove = 'laser';
const kinds = []; let repeats = 0, staggerOk = false, sweepOk = false;
for (let v = 0; v < 40; v++) {
    seedRng(100 + v); m.volley = null; m.attackCooldown = 80; m.currentMove = 'laser'; st.player.lane = 1; st.health = 999;
    tick();
    if (!m.volley) continue;
    const k = m.volley.kind; if (kinds.length && kinds[kinds.length - 1] === k) repeats++; kinds.push(k);
    if (k === 'stagger') staggerOk = new Set(m.volley.items.map(i => i.fuse)).size === 2;
    if (k === 'sweep') sweepOk = m.volley.items.length === 3 && new Set(m.volley.items.map(i => i.lane)).size === 3;
    let guard = 0; while (m.volley && guard++ < 400) tick();
}
ok('monk: hurt Monk mixes 4+ patterns', new Set(kinds).size >= 4, [...new Set(kinds)].join(','));
eq('monk: never the same volley twice running', repeats, 0);
ok('monk: STAGGER lands two lanes on different beats', staggerOk);
ok('monk: SWEEP rolls all three lanes', sweepOk);
m = bossAt(3); m.currentMove = 'laser'; m.attackCooldown = 80; st.health = st.maxHealth; seedRng(7);
tick(); ok('monk: healthy Monk only throws pair / stagger', ['pair', 'stagger'].includes(m.volley && m.volley.kind));
const it = m.volley.items[0]; st.player.lane = it.lane; const hp0 = st.health;
for (let i = 0; i < it.fuse + 2; i++) tick();
ok('monk: a canister lands on its own fuse', st.health < hp0);

// ---- 6. Enforcer slam ----
let e = bossAt(1); e.recoverTimer = 0; e.attacksSinceSlam = 3; e.currentMove = 'jab'; e.attackCooldown = 50; st.health = st.maxHealth;
let slammed = false; for (let i = 0; i < 200 && !slammed; i++) { tick(); if (st.slamWaves && st.slamWaves.length) slammed = true; }
ok('enforcer: slams after a few attacks', slammed);
ok('enforcer: the wave rolls down YOUR lane', st.slamWaves[0].lane === st.player.lane);
ok('enforcer: OPEN after the slam', e.recoverTimer > 0);
const hpS = st.health; for (let i = 0; i < 60; i++) tick();
ok('enforcer: standing in the lane gets you hit', st.health < hpS);
e = bossAt(1); e.phase = 2; e.recoverTimer = 0; e.attacksSinceSlam = 3; e.currentMove = 'jab'; e.attackCooldown = 50;
for (let i = 0; i < 200 && !(st.slamWaves && st.slamWaves.length); i++) tick();
ok('enforcer: phase 2 sends a second, later wave in another lane', st.slamWaves.length === 2 && st.slamWaves[1].delay > 0 && st.slamWaves[1].lane !== st.slamWaves[0].lane);
e = bossAt(1); e.recoverTimer = 0; e.x = st.player.x + 300; e.speed = 0; e.arcMods.walkDownMult = 0; e.attackCooldown = 200;
for (let i = 0; i < 130 && e.currentMove !== 'slam'; i++) tick();
eq('enforcer: hanging back earns a slam', e.currentMove, 'slam');

// ---- 7. Phantom clones ----
let ph = bossAt(2); ph.phase = 2; ph.recoverTimer = 0; ph.currentMove = 'jab'; ph.attackCooldown = 40; ph.telegraphed = false;
for (let i = 0; i < 20 && !(st.phantomClones && st.phantomClones.length); i++) tick();
eq('phantom: phase 2 splits into two clones', (st.phantomClones || []).length, 2);
ok('phantom: clones never share the real lane', st.phantomClones.every(c => c.lane !== ph.lane));
const fake = st.phantomClones[0]; st.player.lane = fake.lane; const phHp = ph.hp;
const landed = combat.checkHit('cross');
ok('phantom: punching a clone wastes the swing', landed === false && ph.hp === phHp && st.phantomClones.length === 1);

// ---- 8. Live Wire ----
let lw = bossAt(4); eq('live wire: Arc 4 boss', lw.controller, 'live_wire');
lw.recoverTimer = 0; lw.stun = 0; lw.stunResist = 0; let h0 = lw.hp; combat.checkHit('hook');
ok('live wire: rides through a Hook while not OPEN (half damage, no stagger)', h0 - lw.hp <= 14 && lw.stun === 0, `${h0 - lw.hp} stun ${lw.stun}`);
lw.recoverTimer = 20; lw.stun = 0; lw.stunResist = 0; h0 = lw.hp; combat.checkHit('hook');
ok('live wire: an OPEN Live Wire takes the full Hook', h0 - lw.hp >= 28);
lw = bossAt(4); lw.hp = lw.maxHp * 0.4; lw.finisherStage = 1; lw.recoverTimer = 0; lw.currentMove = 'string'; lw.stringIdx = 0; lw.arcMods.stringLength = 1; lw.attackCooldown = 1; lw.telegraphed = true; st.liveLanes = []; st.health = 999;
st.player.lane = 1; lw.lane = 1; lw.x = st.player.x + 100; tick();
ok('live wire: phase 2 charges a second lane', (st.liveLanes || []).length >= 2 && lw.phase === 2, JSON.stringify((st.liveLanes || []).map(z => z.lane)));

// ---- 9. Negative reads are visible ----
let ng = bossAt(5); ng.slipCooldown = 0; ng.readPrimed = false; ng.recoverTimer = 0; h0 = ng.hp;
ok('negative: unprimed, it never slips', neg.negativeReact(ng, false) === false);
let primedSeen = 0; for (let i = 0; i < 2000; i++) { ng.slipCooldown = 0; neg.primeNegativeRead(ng); if (ng.readPrimed) primedSeen++; }
ok('negative: it primes some of the time (visibly)', primedSeen > 100 && primedSeen < 1900, `${primedSeen}`);
ng.readPrimed = true; ng.slipCooldown = 0;
ok('negative: primed, it slips — and the prime is spent', neg.negativeReact(ng, false) === true && ng.readPrimed === false);

// ---- 10. boss TTK ----
const roster = Object.fromEntries([1, 2, 3, 4, 5].map(a => { const b = bossAt(a); return [b.controller, b.maxHp / CONSTANTS.bossHp(CONSTANTS.bossStageOfArc(a))]; }));
ok('ttk: Enforcer and Phantom tougher, Negative lighter', roster.neon_enforcer === 1.15 && roster.phantom_boxer === 0.9 && roster.negative === 1.0, JSON.stringify(roster));

console.log(`V24 PASSED ${passed} / ${passed + failed}`);
if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exitCode = 1; }
