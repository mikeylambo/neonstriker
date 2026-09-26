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
// v19 playtest-pass verification (headless, real modules).

const { CONSTANTS } = await import('../src/constants.js');
const { gameState: st } = await import('../src/state.js');
const settings = await import('../src/systems/settings.js');
const player = await import('../src/entities/player.js');
const bosses = await import('../src/entities/bosses.js');
const enemies = await import('../src/entities/enemies.js');
const fin = await import('../src/systems/finisher.js');
const tm = await import('../src/systems/telemetry.js');
const apply = await import('../src/systems/progression/apply.js');
const main = await import('../src/main.js');
const T = main.__test;
const { SequenceManager } = await import('../src/systems/sequences.js');
const frames = (n, fn) => { for (let i = 0; i < n; i++) fn(i); };
const PAD0 = { up: false, down: false, ghost: false, leftHeld: false, rightHeld: false, guard: false, jab: false, cross: false, crossHeld: false, hook: false, instinct: false, pause: false };
const run = () => { localStorage.clear(); settings.reloadSettings(); T.startGame({ tutorial: false, seed: 3 }); SequenceManager.active = false; st.screen = 'playing'; st.seenTutorials.footwork_tip = true; st.seenTutorials.instinct = true; st.pendingUpgrades = 0; st.enemies = []; st.waveTimer = 9999; st.pad = { ...PAD0 }; st.keys = {}; st.lastKeys = {}; st.player.x = 180; st.player.lane = 1; st.player.y = st.height * CONSTANTS.LANE_Y[1]; st.player.state = 'idle'; st.hitstop = 0; st.inputGrace = 0; };
const mob = (over = {}) => ({ x: st.player.x + 300, lane: st.player.lane, y: st.player.y, w: 50, h: 110, hp: 400, maxHp: 400, speed: 3, color: '#f05', type: 'grunt', weight: 1, stun: 0, stunResist: 0, attackCooldown: 200, maxCooldown: 60, isBoss: false, justAttacked: 0, trails: [], vx: 0, pressure: 0, pressureDecay: 0, stringLen: 1, stringIdx: 0, ...over });

// ---- 1. Bruiser Sweep is gone ----
ok('sweep: no SWEEP constant', !CONSTANTS.SWEEP);

// ---- 2. leaving a menu with × doesn't fire Instinct ----
run(); st.instinctMeter = 100; st.screen = 'upgrading'; T.watchResume(); st.screen = 'playing'; T.watchResume();
ok('input grace: returning to play arms a grace window', st.inputGrace > 0, `${st.inputGrace}`);
st.keys = { Space: true }; player.updatePlayer(); st.lastKeys = { ...st.keys }; st.keys = {};
ok('input grace: the held confirm press does not trigger Instinct', !st.isInstinct);

// ---- 3. body blocking: no backing up into / walking through enemies ----
run(); st.enemies = [mob({ x: 200, lane: 0, attackCooldown: 999 })];
st.player.x = 190; player.resolveBodies(st.player);
ok('bodies: v21 — enemies in OTHER lanes walk past without shoving you', st.player.x === 190, `${st.player.x}`);
run(); st.enemies = [mob({ x: 220, lane: 1, attackCooldown: 999 })];
st.player.x = 200; player.resolveBodies(st.player);
ok('bodies: same lane keeps a body gap', 220 - st.player.x >= 62 - 0.01, `${st.player.x}`);

// ---- 4. perfect Ghost Step pays like a Perfect Slip ----
run(); st.instinctMeter = 0; st.isInstinct = false; st.progressionMods.perfectSlipHeal = 5; st.health = 50; st.player.ghostPerfected = false;
const exp0 = st.exp;
player.registerPerfectGhostStep();
ok('ghost parity: Instinct gained', st.instinctMeter > 0, `${st.instinctMeter}`);
ok('ghost parity: slip-heal perks apply', st.health > 50, `${st.health}`);
ok('ghost parity: EXP gained', st.exp > exp0);
run(); st.instinctMeter = 100; st.isInstinct = true; st.zoneTimer = 0; st.player.ghostPerfected = false;
player.registerPerfectGhostStep();
ok('ghost parity: during Instinct it opens the Zone (v21)', st.isInstinct && st.zoneTimer > 0);

// ---- 5. player hitstun, knockback, floored on counter hits ----
run(); st.health = 100; const x0 = st.player.x;
player.takeDamage(10, false, mob());
ok('hit: light hit freezes the frame (hitstop)', st.hitstop >= CONSTANTS.PLAYER_HIT.hitStop.light);
ok('hit: and shoves you back (slide)', st.player.slideVx < 0);
ok('hit: taken hits are counted for FLAWLESS', st.stageHitsTaken === 1);
run(); st.health = 100;
player.takeDamage(30, true, mob(), { floor: true, counter: true });
eq('floored: a counter hit puts you down', st.player.state, 'floored');
ok('floored: invulnerable while down', st.player.invuln > CONSTANTS.PLAYER_HIT.floorFrames);
st.hitstop = 0; frames(CONSTANTS.PLAYER_HIT.floorFrames + 2, () => player.updatePlayer());
eq('floored: back up after floorFrames', st.player.state, 'idle');
run(); st.health = 100; st.player.state = 'guarding';
player.takeDamage(30, true, mob(), { floor: true });
ok('floored: guarding keeps you on your feet', st.player.state !== 'floored');

// ---- 6. hold line never parks an enemy out of reach ----
run(); st.player.x = CONSTANTS.FOOTWORK.maxX; st.tutorialGrace = 0;
st.enemies = [mob({ type: 'zoner', x: 900, lane: 1, speed: 4, attackCooldown: 999, maxCooldown: 999 })];
frames(400, () => enemies.updateEnemies());
const gap = st.enemies[0].x - st.player.x;
ok('hold line: a zoner stops within a jab of your furthest step', gap < 120 && gap > 0, `gap ${gap.toFixed(0)}`);
run(); st.player.x = 180; st.tutorialGrace = 0;
st.enemies = [mob({ type: 'zoner', x: 900, lane: 1, speed: 4, attackCooldown: 999, maxCooldown: 999 })];
frames(400, () => enemies.updateEnemies());
ok('hold line: with room to press, a zoner keeps its range', st.enemies[0].x - st.player.x >= 190, `${(st.enemies[0].x - st.player.x).toFixed(0)}`);

// ---- 7. strings follow a slip ----
run(); st.tutorialGrace = 0; st.seenTutorials.string_id = true;
st.enemies = [mob({ x: st.player.x + 80, lane: 1, stringLen: 3, stringIdx: 1, attackCooldown: 30 })];
st.player.lane = 0;
enemies.updateEnemies();
eq('strings: mid-string, the attacker steps into your new lane', st.enemies[0].lane, 0);

// ---- 8. ALL CLEAR / FLAWLESS ----
run(); st.currentStage = 2; st.stageHitsTaken = 0; st.statFlawless = 0; const s0 = st.score;
apply.advanceStage();
ok('flawless: a no-hit stage clear pays FLAWLESS', st.statFlawless === 1 && st.score - s0 >= CONSTANTS.SCORE.flawless, `${st.score - s0}`);
run(); st.currentStage = 2; st.stageHitsTaken = 3; st.statFlawless = 0;
apply.advanceStage();
eq('flawless: not after taking hits', st.statFlawless, 0);

// ---- 9. Finisher plays out AFTER the inputs ----
run(); st.currentStage = CONSTANTS.bossStageOfArc(1); bosses.spawnBoss();
const boss = st.enemies.find(e => e.isBoss); boss.hp = boss.maxHp * 0.6; boss.finisherStage = 1; // second break (66% line already passed)
fin.startFinisher(boss, 'break');
const hp0 = boss.hp; let sawPlayback = false, hpDuringPrompts = hp0;
const code = { up: 'ArrowUp', down: 'ArrowDown', jab: 'KeyA', cross: 'KeyS', hook: 'KeyD' };
for (let i = 0; i < 2000 && st.finisher; i++) {
    const f = st.finisher; st.lastKeys = { ...st.keys }; st.keys = {};
    if (f.phase === 'prompts') { hpDuringPrompts = Math.min(hpDuringPrompts, boss.hp); const pp = fin.promptProgress(); if (pp && pp.t === 0) st.keys[code[pp.move]] = true; }
    if (f.phase === 'playback') sawPlayback = true;
    fin.updateFinisher();
}
ok('finisher: no damage lands while you are still inputting', hpDuringPrompts === hp0, `${hp0} → ${hpDuringPrompts}`);
ok('finisher: a playback phase replays the landed hits', sawPlayback);
ok('finisher: the hits land in playback', boss.hp < hp0);
ok('finisher: beat slowed to 42 frames', CONSTANTS.FINISHER.beatFrames === 42);

// ---- 10. telemetry ----
localStorage.clear();
tm.tmStartRun({ seed: 9 });
frames(120, () => tm.tmTick());
tm.tmKill('zoner'); tm.tmKill('zoner'); tm.tmAttack('jab'); tm.tmLanded('jab'); tm.tmDamage('assassin', 12);
tm.tmStage(2); frames(60, () => tm.tmTick());
const done = tm.tmEndRun({ stage: 2, score: 1234, grade: 'B' });
eq('telemetry: run time in frames', done.frames, 180);
eq('telemetry: per-stage time', done.stages[0].frames, 120);
eq('telemetry: kills by enemy type', done.stages[0].kills.zoner, 2);
eq('telemetry: what ended the run', done.end.cause, 'assassin');
eq('telemetry: persisted locally', tm.loadTelemetry().length, 1);
ok('telemetry: export is JSON with the runs', JSON.parse(tm.exportTelemetryJSON()).runs.length === 1);
eq('telemetry: time formats as m:ss', tm.fmtTime(60 * 75), '1:15');
const sum = tm.summarizeTelemetry(tm.loadTelemetry());
eq('telemetry: summary counts where runs end', sum.ends[2], 1);

// ---- 11. the real loop records a run ----
localStorage.clear(); settings.reloadSettings(); T.startGame({ tutorial: false, seed: 4 });
ok('telemetry: startGame opens a live run', !!tm.liveRun());

console.log(`V19 PASSED ${passed} / ${passed + failed}`);
if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exitCode = 1; }
