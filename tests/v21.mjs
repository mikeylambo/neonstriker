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
// v21 pass verification (headless, real modules).

const { CONSTANTS } = await import('../src/constants.js');
const { gameState: st } = await import('../src/state.js');
const settings = await import('../src/systems/settings.js');
const player = await import('../src/entities/player.js');
const bosses = await import('../src/entities/bosses.js');
const waves = await import('../src/systems/waves.js');
const combat = await import('../src/systems/combat.js');
const score = await import('../src/systems/score.js');
const knock = await import('../src/systems/knockdown.js');
const par = await import('../src/systems/arc_par.js');
const heat = await import('../src/systems/heat.js');
const practice = await import('../src/systems/practice.js');
const recap = await import('../src/systems/recap.js');
const reqs = await import('../src/systems/progression/requirements.js');
const records = await import('../src/systems/records.js');
const { UPGRADE_POOL } = await import('../src/data/upgrades.js');
const apply = await import('../src/systems/progression/apply.js');
const main = await import('../src/main.js');
const T = main.__test;
const { SequenceManager } = await import('../src/systems/sequences.js');
const frames = (n, fn) => { for (let i = 0; i < n; i++) fn(i); };
const PAD0 = { up: false, down: false, ghost: false, leftHeld: false, rightHeld: false, guard: false, jab: false, cross: false, crossHeld: false, hook: false, instinct: false, pause: false };
const run = () => { localStorage.clear(); settings.reloadSettings(); T.startGame({ tutorial: false, seed: 3 }); SequenceManager.active = false; st.screen = 'playing'; st.seenTutorials.footwork_tip = true; st.seenTutorials.instinct = true; st.pendingUpgrades = 0; st.enemies = []; st.waveTimer = 9999; st.pad = { ...PAD0 }; st.keys = {}; st.lastKeys = {}; st.player.x = 180; st.player.lane = 1; st.player.y = st.height * CONSTANTS.LANE_Y[1]; st.player.state = 'idle'; st.hitstop = 0; st.inputGrace = 0; };
const mob = (over = {}) => ({ x: st.player.x + 80, lane: st.player.lane, y: st.player.y, w: 50, h: 110, hp: 400, maxHp: 400, speed: 0, color: '#f05', type: 'grunt', weight: 1, stun: 0, stunResist: 0, attackCooldown: 200, maxCooldown: 60, isBoss: false, justAttacked: 0, trails: [], vx: 0, pressure: 0, pressureDecay: 0, stringLen: 1, stringIdx: 0, ...over });
const enemies = await import('../src/entities/enemies.js');
const fs = await import('node:fs');

// ---- 1. punch strings off; Daily gone ----
ok('strings: off in every Arc', Object.values(CONSTANTS.PUNCH_STRINGS.chanceByArc).every(v => v === 0));
ok('practice: no punch-string target', !practice.practiceTargets().some(t => t.id === 'string'));
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
ok('daily: no Daily Challenge button / board', !/startDailyChallenge|global-daily|DAILY CHALLENGE/.test(html));
T.startGame(true); eq('daily: a daily start is an ordinary run', st.dailyMode, false);

// ---- 2. Sharp Eye / Sharp Eyes ----
const names = Object.values(UPGRADE_POOL).flat().map(u => u.name.toLowerCase().replace(/s$/, ''));
ok('upgrades: no two names differ only by a plural', names.length === new Set(names).size);

// ---- 3. Zone: earned inside Instinct ----
run(); st.instinctMeter = 100; st.isInstinct = false;
st.enemies = [mob({ attackCooldown: 5, x: st.player.x + 60 })];
st.keys = { ArrowUp: true }; player.updatePlayer(); st.lastKeys = { ...st.keys }; st.keys = {};
ok('zone: a perfect slip on a full meter no longer spends it', !st.isInstinct && st.instinctMeter === 100 && !st.zoneTimer);
run(); st.instinctMeter = 100; st.isInstinct = true; st.zoneTimer = 0;
st.enemies = [mob({ attackCooldown: 5, x: st.player.x + 60 })];
st.keys = { ArrowUp: true }; player.updatePlayer(); st.lastKeys = { ...st.keys }; st.keys = {};
ok('zone: a perfect slip during Instinct enters the Zone', st.zoneTimer === CONSTANTS.ZONE.frames);

// ---- 4. rail loop ----
run(); st.tutorialGrace = 0; st.seenTutorials.bruiser_id = true; st.seenTutorials.assassin_id = true;
const walker = mob({ lane: 0, x: st.player.x + 300, speed: 4, attackCooldown: 60 });
st.enemies = [walker];
let pastP = false, looped = false, swung = false;
for (let i = 0; i < 400 && !looped; i++) { enemies.updateEnemies(); if (walker.x < st.player.x - 30) pastP = true; if (walker.loops) looped = true; if (walker.justAttacked) swung = true; }
ok('rail: an other-lane enemy walks past (no parking)', pastP);
ok('rail: it loops back in from the right', looped && walker.x > st.width, `x ${walker.x | 0} loops ${walker.loops}`);
ok('rail: it never swung from another lane / behind', !swung);
eq('rail: still alive (must be KO\'d to clear)', st.enemies.length, 1);
run(); st.tutorialGrace = 0;
const z = mob({ type: 'zoner', lane: 0, x: 900, speed: 4, attackCooldown: 999, maxCooldown: 999 });
st.enemies = [z]; frames(300, () => enemies.updateEnemies());
ok('rail: zoners still hold range', z.x > st.player.x + 100 && !z.loops, `${z.x | 0}`);
run(); const inLane = mob({ lane: 1, x: st.player.x + 300, speed: 4, attackCooldown: 999 });
st.enemies = [inLane]; frames(200, () => enemies.updateEnemies());
ok('rail: an enemy in YOUR lane stops and fights', inLane.x >= st.player.x && inLane.x <= st.player.x + 95 && !inLane.loops, `${inLane.x | 0}`);

// ---- 5. enemy knockdowns + impact damage ----
run(); st.stats.powerMult = 1; const g1 = mob({ x: st.player.x + 80 }); st.enemies = [g1]; combat.checkHit('hook');
ok('kd: a plain hook (no Power) does not floor', !(g1.floored > 0));
run(); st.stats.powerMult = 1.35; const g2 = mob({ x: st.player.x + 80 }); st.enemies = [g2]; const hp2 = g2.hp; combat.checkHit('hook');
ok('kd: a hook with Power R1 floors a Grunt', g2.floored === CONSTANTS.ENEMY_KD.frames && g2.stun >= CONSTANTS.ENEMY_KD.frames);
ok('kd: the knockdown adds slam damage', hp2 - g2.hp > 35, `${hp2 - g2.hp}`);
run(); const g3 = mob({ x: st.player.x + 80 }); st.enemies = [g3]; st.player.slipBuff = 1; combat.checkHit('jab1');
ok('kd: a counter floors a Grunt at any build', g3.floored > 0);
run(); const g4 = mob({ x: st.player.x + 80, floored: 30, stun: 30 }); const g5 = mob({ x: st.player.x + 80 });
st.enemies = [g4]; combat.checkHit('jab1'); const downDmg = 400 - g4.hp; st.enemies = [g5]; combat.checkHit('jab1'); const upDmg = 400 - g5.hp;
ok('kd: hitting a downed enemy does +25%', downDmg > upDmg, `${downDmg} vs ${upDmg}`);
run(); const bossLike = mob({ isBoss: true, x: st.player.x + 80 }); st.enemies = [bossLike]; st.player.slipBuff = 1; st.isInstinct = true; combat.checkHit('cross');
ok('kd: bosses are never floored (they have finishers)', !(bossLike.floored > 0));
run(); const front = mob({ x: st.player.x + 80, vx: 20, stun: 0 }); const back = mob({ x: st.player.x + 140 });
st.enemies = [front, back]; const bh = back.hp; frames(3, () => enemies.updateEnemies());
ok('impact: a hard-knocked enemy hurts the one it slams into', back.hp < bh, `${bh} → ${back.hp}`);

// ---- 6. anti-farm ----
run(); const zf = mob({ type: 'zoner', lane: 1, x: st.player.x + 200, attackCooldown: 5, maxCooldown: 100 });
st.enemies = [zf]; const s0 = st.score; let paid = 0;
for (let k = 0; k < 10; k++) { const before = st.score; player.triggerPerfectSlip(null, 'perfect', zf); if (st.score > before) paid++; }
eq('anti-farm: a regular enemy only pays slip score for its first few attacks', paid, CONSTANTS.SCORE.slipPayCap);
const bf = mob({ isBoss: true }); let bpaid = 0;
for (let k = 0; k < 10; k++) { const before = st.score; player.triggerPerfectSlip(null, 'perfect', bf); if (st.score > before) bpaid++; }
eq('anti-farm: bosses always pay', bpaid, 10);

// ---- 7. unlock announcements ----
localStorage.clear(); localStorage.setItem('neon_strike_meta_v1', JSON.stringify({ bestStage: 10, bestBossStreak: 1 }));
ok('unlocks: an old save that already unlocked both gets both pop-ups', JSON.stringify(main.pendingUnlocks()) === '["practice","heat"]', JSON.stringify(main.pendingUnlocks()));
localStorage.setItem('neon_strike_announced_v1', JSON.stringify(['practice']));
ok('unlocks: each pop-up shows once', JSON.stringify(main.pendingUnlocks()) === '["heat"]');
localStorage.setItem('neon_strike_meta_v1', JSON.stringify({ bestStage: 2 }));
eq('unlocks: nothing to announce before you earn it', main.pendingUnlocks().length, 0);

// ---- 8. hidden-card regression: the fusion hint must not reuse a rarity class ----
const mainSrc = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
ok('draft: fusion hint uses its own class (it used to hide the card)', /card-fusion-hint/.test(mainSrc) && !/<div class="card-fusion">/.test(mainSrc));

// ---- 9. onboarding mockups removed (pop-ups stay) ----
ok('onboarding: mock module removed', !fs.existsSync(new URL('../src/render/onboarding_mock.js', import.meta.url)));

console.log(`V21 PASSED ${passed} / ${passed + failed}`);
if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exitCode = 1; }
