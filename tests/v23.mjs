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
// v23 pass verification (headless, real modules).
const { CONSTANTS } = await import('../src/constants.js');
const { gameState: st } = await import('../src/state.js');
const settings = await import('../src/systems/settings.js');
const bosses = await import('../src/entities/bosses.js');
const enemies = await import('../src/entities/enemies.js');
const player = await import('../src/entities/player.js');
const combat = await import('../src/systems/combat.js');
const practice = await import('../src/systems/practice.js');
const { UPGRADE_POOL } = await import('../src/data/upgrades.js');
const main = await import('../src/main.js');
const T = main.__test;
const { SequenceManager: SM } = await import('../src/systems/sequences.js');
const fs = await import('node:fs');
const frames = (n, fn) => { for (let i = 0; i < n; i++) fn(i); };
const PAD0 = { up: false, down: false, ghost: false, leftHeld: false, rightHeld: false, guard: false, jab: false, cross: false, crossHeld: false, hook: false, instinct: false, pause: false };
const run = (seed = 3) => { localStorage.clear(); settings.reloadSettings(); T.startGame({ tutorial: false, seed }); SM.active = false; st.screen = 'playing'; st.seenTutorials.footwork_tip = true; st.seenTutorials.instinct = true; st.pendingUpgrades = 0; st.enemies = []; st.waveTimer = 9999; st.pad = { ...PAD0 }; st.keys = {}; st.lastKeys = {}; st.player.x = 180; st.player.lane = 1; st.player.y = st.height * CONSTANTS.LANE_Y[1]; st.player.state = 'idle'; st.hitstop = 0; st.inputGrace = 0; st.tutorialGrace = 0; };
const mob = (over = {}) => ({ x: st.player.x + 80, lane: st.player.lane, y: st.player.y, w: 50, h: 110, hp: 400, maxHp: 400, speed: 0, color: '#f05', type: 'grunt', weight: 1, stun: 0, stunResist: 0, attackCooldown: 200, maxCooldown: 60, isBoss: false, justAttacked: 0, trails: [], vx: 0, pressure: 0, pressureDecay: 0, stringLen: 1, stringIdx: 0, ...over });
const bossOfArc = arc => { let s = 1; while (!(CONSTANTS.isBossStage(s) && CONSTANTS.getArcIndex(s) === arc)) s++; return s; };
const spawnBossAt = arc => { run(); st.currentStage = bossOfArc(arc); bosses.spawnBoss(); st.bossIntroTimer = 0; const b = st.enemies.find(e => e.isBoss); b.x = st.player.x + 100; b.lane = 1; b.y = st.player.y; return b; };

// ---- 1. menu / copy ----
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const startHTML = html.slice(html.indexOf('id="start-screen"'), html.indexOf('id="unlock-screen"'));
ok('menu: no sub-copy on the main menu', !/class="sub"/.test(startHTML) && !/The Neon Striker/.test(startHTML));
ok('menu: Heat is called Modifiers', /MODIFIERS/.test(startHTML) && !/>HEAT</.test(html));
ok('menu: Combat Manual is neon green', /color:#a3e635;">COMBAT MANUAL/.test(startHTML));
const src = ['src/render/overlays.js', 'src/main.js', 'index.html'].map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')).join('\n');
ok('copy: no "title fight" left on screen', !/['"`>][^'"`<]*title fight/i.test(src.replace(/\/\/.*$/gm, '')));
ok('copy: no "IS DOWN" on the KO banner', !/IS DOWN/.test(src));
ok('copy: no move-name caption in the Finisher QTE', !/SLIP UP/.test(src));

// ---- 2. passed enemies are out of the exchange ----
run();
const passer = mob({ lane: 0, x: st.player.x - 40, speed: 2 });
st.enemies = [passer]; enemies.updateEnemies();
ok('passed: an enemy behind you is flagged passed', passer.passed === true);
st.player.lane = 0; st.player.y = st.height * CONSTANTS.LANE_Y[0];
const px = st.player.x; player.resolveBodies(st.player);
eq('passed: it is not solid (no snap in front of it)', st.player.x, px);
passer.x = st.player.x - 15; const hp0 = passer.hp; combat.checkHit('hook');
eq('passed: it cannot be hit', passer.hp, hp0);
passer.x = CONSTANTS.RAIL_LOOP.exitX - 5; enemies.updateEnemies();
ok('passed: looping back in clears the flag', passer.passed === false && passer.x > st.width);

// ---- 3. boss knockback / Loaded Cross ----
let b = spawnBossAt(2); b.recoverTimer = 0; b.stunResist = 0; b.vx = 0;
combat.checkHit('hook');
ok('boss: a hook on a boss that is NOT open does not move it', b.vx <= 0.01, `vx ${b.vx}`);
b = spawnBossAt(2); b.recoverTimer = 20; b.vx = 0; b.stunResist = 0; b.stun = 0; st.stats.powerMult = 3;
combat.checkHit('hook');
ok('boss: an OPEN boss is rocked by a hook…', b.vx > 0);
ok('boss: …but never punted (vx capped)', b.vx <= CONSTANTS.BOSS_KB.cap + 1e-9, `vx ${b.vx}`);
b = spawnBossAt(2); b.recoverTimer = 0; b.stunResist = 999; b.stun = 0; st.progressionMods.loadedCross = true; st.player.crossLoaded = true;
combat.checkHit('cross');
ok('loaded cross: staggers a boss straight through stun resist', b.stun >= CONSTANTS.BOSS_KB.loadedStagger, `stun ${b.stun}`);
ok('loaded cross: push capped too', b.vx <= CONSTANTS.BOSS_KB.loadedCap + 1e-9);
// instinct: press = loaded cross, no hold
run(); st.progressionMods.loadedCross = true; st.isInstinct = true; st.instinctMeter = 100;
const K = settings.getBinds(); st.keys = { [K.cross]: true }; st.lastKeys = {};
player.updatePlayer();
ok('instinct: Cross fires on PRESS with Loaded Cross', st.player.state === 'punching' && st.player.punchType === 'cross' && st.player.crossLoaded, `${st.player.state} ${st.player.punchType} ${st.player.crossLoaded}`);
st.isInstinct = false;

// ---- 4. jab: floors + SET UP ----
run(); st.stats.speedMult = 3; st.orbCounts.speed = 4; player.startPunch('jab1');
ok('jab: Speed keeps paying past the old 5-frame floor', st.player.punchTimer < 5, `${st.player.punchTimer}`);
run(); const tgt = mob({ hp: 999, maxHp: 999 }); st.enemies = [tgt];
st.player.setUpTimer = CONSTANTS.JAB_SETUP.window; const a = tgt.hp; combat.checkHit('hook'); const setDmg = a - tgt.hp;
tgt.stun = 0; tgt.stunResist = 0; tgt.x = st.player.x + 80; const b2 = tgt.hp; combat.checkHit('hook'); const plainDmg = b2 - tgt.hp;
ok('set up: a Hook after Jab 3 lands harder', setDmg > plainDmg, `${setDmg} vs ${plainDmg}`);
ok('set up: and it is spent on use', !(st.player.setUpTimer > 0));

// ---- 5. continue / retry ----
run(); st.currentStage = 4; st.score = 10001; st.orbCounts.power = 2; st.enemies = [mob()]; st.health = 0; st.knockdownsThisArc = 1;
T.update();
eq('continue: dying offers the Continue prompt', st.screen, 'continue');
T.resolveContinue(true);
eq('continue: retry halves the score', st.score, 5000);
ok('continue: same round, full health, build kept', st.currentStage === 4 && st.health === st.maxHealth && st.orbCounts.power === 2 && st.enemies.length === 0);
eq('continue: back in the fight', st.screen, 'playing');
st.health = 0; st.knockdownsThisArc = 1; SM.active = false; T.update(); T.resolveContinue(false);
eq('continue: END RUN goes to results', st.screen, 'gameover');

// ---- 6. Static Monk canisters ----
b = spawnBossAt(3); eq('canister: arc 3 boss is the Monk', b.controller, 'static_monk');
b.currentMove = 'laser'; b.attackCooldown = 81; b.telegraphed = false; st.canisters = [];
bosses.updateBosses();
ok('canister: telegraph rolls one canister per targeted lane', st.canisters.length === 2 && st.canisters.every(c => b.targetLanes.includes(c.lane)));
const c0 = st.canisters[0].x; frames(40, () => bosses.updateBosses());
ok('canister: rolls toward the Striker', st.canisters[0].x < c0 - 50, `${c0} -> ${st.canisters[0].x}`);
const lane = b.targetLanes.find(l => l !== st.player.lane) ?? b.targetLanes[0];
const add = mob({ lane, x: st.player.x + 30, hp: 45, maxHp: 45 }); st.enemies.push(add);
st.player.lane = [0, 1, 2].find(l => !b.targetLanes.includes(l)); st.health = st.maxHealth;
frames(45, () => bosses.updateBosses());
ok('canister: detonates and clears', st.canisters.length === 0);
ok('canister: the blast catches the Monk\'s own adds', add.hp <= 0, `hp ${add.hp}`);
eq('canister: the safe lane is safe', st.health, st.maxHealth);

// ---- 7. card fixes ----
run(); st.progressionMods.hookKnockbackFloor = 10; const rc = mob({ weight: 1 }); st.enemies = [rc]; combat.checkHit('hook'); const kbRing = rc.vx;
run(); const rc2 = mob({ weight: 1 }); st.enemies = [rc2]; combat.checkHit('hook');
ok('Ring Cutter: actually adds hook knockback now', kbRing > rc2.vx, `${kbRing} vs ${rc2.vx}`);
const whiff = (speed, relentless) => { run(); st.orbCounts.speed = speed; st.progressionMods.relentlessRhythm = relentless; st.combo = 6; st.enemies = []; player.startPunch('jab1'); frames(20, () => player.updatePlayer()); return st.combo; };
eq('Rhythm Keeper: base whiff snaps combo', whiff(0, false), 0);
eq('Rhythm Keeper: Speed 2 whiff costs 1', whiff(2, false), 5);
eq('Relentless Rhythm: whiff costs nothing', whiff(2, true), 6);
const descs = Object.values(UPGRADE_POOL).flat().map(u => u.desc).join(' ');
ok('cards: no vague "authority" / "armor states" copy left', !/authority|armor states/.test(descs));

// ---- 8. practice build picker ----
run(); localStorage.clear(); settings.reloadSettings();
eq('practice: nothing earned -> rank 0 available', practice.earnedRank('power'), 0);
['pwr_r1', 'pwr_r2', 'pwr_r3', 'spd_r1', 'spd_r2', 'spd_r3'].forEach(settings.markUpgradeSeen);
eq('practice: earned rank tracks what you have seen', practice.earnedRank('power'), 3);
const tgtP = practice.practiceTargets()[0];
T.startGame({ practice: tgtP, windows: false, tutorial: false, build: { speed: 3, power: 5, technique: 2 } });
ok('practice: build applied, capped at earned', st.orbCounts.power === 3 && st.orbCounts.speed === 3 && st.orbCounts.technique === 0, JSON.stringify(st.orbCounts));
ok('practice: rank-3 verbs come with it', st.progressionMods.loadedCross === true && st.progressionMods.pivotSlip === true);
ok('practice: qualifying Fusion granted', st.acquiredUpgradeIds.includes('fuse_dempsey_circuit'));

console.log(`V23 PASSED ${passed} / ${passed + failed}`);
if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exitCode = 1; }
