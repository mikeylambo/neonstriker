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
// v22 pass verification (headless, real modules).
const { CONSTANTS } = await import('../src/constants.js');
const { gameState: st } = await import('../src/state.js');
const settings = await import('../src/systems/settings.js');
const bosses = await import('../src/entities/bosses.js');
const enemies = await import('../src/entities/enemies.js');
const player = await import('../src/entities/player.js');
const ko = await import('../src/systems/boss_ko.js');
const main = await import('../src/main.js');
const T = main.__test;
const { SequenceManager: SM } = await import('../src/systems/sequences.js');
const frames = (n, fn) => { for (let i = 0; i < n; i++) fn(i); };
const PAD0 = { up: false, down: false, ghost: false, leftHeld: false, rightHeld: false, guard: false, jab: false, cross: false, crossHeld: false, hook: false, instinct: false, pause: false };
const run = () => { localStorage.clear(); settings.reloadSettings(); T.startGame({ tutorial: false, seed: 3 }); SM.active = false; st.screen = 'playing'; st.seenTutorials.footwork_tip = true; st.seenTutorials.instinct = true; st.pendingUpgrades = 0; st.enemies = []; st.waveTimer = 9999; st.pad = { ...PAD0 }; st.keys = {}; st.lastKeys = {}; st.player.x = 180; st.player.lane = 1; st.player.y = st.height * CONSTANTS.LANE_Y[1]; st.player.state = 'idle'; st.hitstop = 0; st.inputGrace = 0; st.tutorialGrace = 0; };
const mob = (over = {}) => ({ x: st.player.x + 80, lane: st.player.lane, y: st.player.y, w: 50, h: 110, hp: 400, maxHp: 400, speed: 0, color: '#f05', type: 'grunt', weight: 1, stun: 0, stunResist: 0, attackCooldown: 200, maxCooldown: 60, isBoss: false, justAttacked: 0, trails: [], vx: 0, pressure: 0, pressureDecay: 0, stringLen: 1, stringIdx: 0, ...over });
let bossStage = 1; while (!CONSTANTS.isBossStage(bossStage)) bossStage++;

// ---- 1. zoners walk the rail, fire while in front, never from behind ----
run();
const z = mob({ type: 'zoner', lane: 0, x: 900, speed: 2, attackCooldown: 60, maxCooldown: 60, color: '#0f0' });
st.enemies = [z];
let fired = 0, firedBehind = false, looped = false;
for (let i = 0; i < 900 && !looped; i++) { const cd = z.attackCooldown; enemies.updateEnemies(); if (z.attackCooldown > cd) { fired++; if (z.x < st.player.x - 20) firedBehind = true; } if (z.loops) looped = true; }
ok('zoner: drifts past and loops back round', looped);
ok('zoner: fires while it is in front of you', fired >= 2, `fired ${fired}`);
ok('zoner: never fires from behind', !firedBehind);

// ---- 2. Phantom Boxer shifts on its own ----
run(); st.currentStage = CONSTANTS.isBossStage(bossStage) ? bossStage + 7 : bossStage; // Arc 2 boss = Phantom
let ph = 1; while (!(CONSTANTS.isBossStage(ph) && CONSTANTS.getArcIndex(ph) === 2)) ph++;
st.currentStage = ph; bosses.spawnBoss(); st.bossIntroTimer = 0;
const b = st.enemies.find(e => e.isBoss);
eq('phantom: arc 2 boss is the Phantom Boxer', b.controller, 'phantom_boxer');
b.x = st.player.x + 100; b.lane = st.player.lane; b.y = st.player.y;
st.player.state = 'guarding';
let shifts = 0, prevLane = b.lane, minLead = 999, attacks = 0;
for (let i = 0; i < 1500; i++) {
    st.player.state = 'guarding'; st.health = st.maxHealth;
    const beforeX = b.x, wasOpen = b.recoverTimer > 0;
    bosses.updateBosses(); enemies.updateEnemies();
    if (b.justAttacked === 5) { attacks++; if (b.telegraphAt !== undefined) minLead = Math.min(minLead, b.telegraphAt); }
    if (wasOpen && b.recoverTimer === 0 && b.attacksSinceShift === 0 && b.x > beforeX + 50) { shifts++; ok('phantom: shift changes lane', b.lane !== prevLane); ok('phantom: re-enters out of reach', b.x - st.player.x > 140, `${b.x - st.player.x}`); }
    prevLane = b.lane;
    if (b.lane !== st.player.lane && b.recoverTimer <= 0) { st.player.lane = b.lane; st.player.y = b.y; }
}
ok('phantom: shifts without being mashed', shifts >= 2, `shifts ${shifts} in ${attacks} attacks`);
ok('phantom: every attack still gets a full telegraph', minLead >= CONSTANTS.BOSS_OFFENSE.minTelegraphLead, `min ${minLead}`);

// ---- 3. boss KO: launched, floored, counted out, then shattered ----
run(); st.currentStage = bossStage; bosses.spawnBoss(); st.bossIntroTimer = 0;
const kb = st.enemies.find(e => e.isBoss); kb.koDone = true; kb.hp = 0; st.koFx = [];
enemies.updateEnemies();
ok('ko: boss leaves the fight roster', !st.enemies.some(e => e.isBoss));
ok('ko: KO animation starts instead of an instant shatter', !!st.bossKo && st.koFx.length === 0);
ok('ko: stage transition waits for the KO', st.purifyTimer >= ko.BOSS_KO_FRAMES);
const x0 = st.bossKo.body.x; let maxLift = 0, banner = 0, shatterAt = -1;
for (let i = 0; i < ko.BOSS_KO_FRAMES + 5 && st.bossKo; i++) { ko.updateBossKo(); if (!st.bossKo) break; maxLift = Math.max(maxLift, st.bossKo.lift); banner = Math.max(banner, ko.koBannerAlpha()); if (shatterAt < 0 && st.koFx.length) shatterAt = i; }
ok('ko: launched back and up', maxLift > 30);
ok('ko: K.O. banner shows', banner > 0.9);
ok('ko: shatters only once it has lain there', shatterAt > 60, `at ${shatterAt}`);
ok('ko: clears itself', st.bossKo === null);

// ---- 4. Arc transition: KO -> draft -> one chapter card -> fight ----
run(); st.currentStage = bossStage; st.stageClearing = true; st.bossDefeatedThisStage = true; st.purifyTimer = 0; st.pendingUpgrades = 1; st.enemies = [];
frames(40, () => { if (st.screen === 'playing') T.update(); });
eq('flow: an earned Evolution drafts BEFORE the walk-out', st.screen, 'upgrading');
eq('flow: ...and the stage has not advanced yet', st.currentStage, bossStage);
st.pendingUpgrades = 0; st.screen = 'playing'; T.update();
eq('flow: then the stage advances', st.currentStage, bossStage + 1);
const steps = SM.currentSequence.map(s => s.type + (s.title ? ':' + s.title : ''));
const cards = SM.currentSequence.filter(s => s.type === 'text' || s.type === 'billing');
eq('flow: a new Arc gets exactly one card', cards.length, 1);
ok('flow: that card names the Arc and its law', /^ARC 2 · /.test(cards[0].title || ''), cards[0].title);
ok('flow: medal result rides on the chapter card', /PAR/.test(cards[0].detail || ''), cards[0].detail);
const seqFrames = SM.currentSequence.reduce((a, s) => a + (s.duration || 0), 0);
ok('flow: whole transition well under half the v21 length (699f)', seqFrames < 330, `${seqFrames}f ${steps.join(',')}`);
// skip
let guard = 0; while (SM.active && SM.currentSequence[SM.stepIndex].type !== 'text' && guard++ < 500) SM.update();
frames(15, () => SM.update());
const before = SM.timer; SM.skipCard();
ok('flow: a press cuts a card short', SM.timer <= 10 && before > 10, `${before} -> ${SM.timer}`);
// ordinary stage still has its billing
run(); st.currentStage = bossStage + 1; st.stageClearing = true; st.purifyTimer = 0; st.enemies = []; T.update();
ok('flow: ordinary stages keep their billing card', SM.currentSequence.some(s => s.type === 'billing'));

// ---- 5. slip speed ----
run();
eq('slip: re-slip cooldown trimmed', CONSTANTS.SLIP_MOVE.cooldown, 9);
st.player.lane = 1; st.player.y = st.height * CONSTANTS.LANE_Y[1]; st.keys = { ArrowUp: true }; st.lastKeys = {};
let settle = -1; const ty = st.height * CONSTANTS.LANE_Y[0];
for (let i = 0; i < 30; i++) { player.updatePlayer(); st.lastKeys = { ...st.keys }; st.keys = {}; if (settle < 0 && Math.abs(st.player.y - ty) < 4) settle = i; }
ok('slip: reaches the new lane within ~6 frames', settle >= 0 && settle <= 7, `settled at ${settle} lane ${st.player.lane}`);

console.log(`V22 PASSED ${passed} / ${passed + failed}`);
if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exitCode = 1; }
