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


const { CONSTANTS } = await import('../src/constants.js');
const { gameState: st } = await import('../src/state.js');
const settings = await import('../src/systems/settings.js');
const dev = await import('../src/systems/input_device.js');
const vig = await import('../src/systems/vignette.js');
const player = await import('../src/entities/player.js');
const bosses = await import('../src/entities/bosses.js');
const { UPGRADE_POOL } = await import('../src/data/upgrades.js');
const main = await import('../src/main.js');
const T = main.__test;
const { SequenceManager } = await import('../src/systems/sequences.js');
const frames = (n, fn) => { for (let i = 0; i < n; i++) fn(i); };
const PAD0 = { up: false, down: false, ghost: false, leftHeld: false, rightHeld: false, guard: false, jab: false, cross: false, crossHeld: false, hook: false, instinct: false, pause: false };
const run = () => { localStorage.clear(); settings.reloadSettings(); T.startGame({ tutorial: false, seed: 3 }); SequenceManager.active = false; st.screen = 'playing'; st.seenTutorials.footwork_tip = true; st.pendingUpgrades = 0; st.enemies = []; st.waveTimer = 9999; st.pad = { ...PAD0 }; st.keys = {}; st.lastKeys = {}; };

// ---- glyphs follow the device you're holding ----
eq('pad family: DualShock 4 (USB) reads as PlayStation', dev.padFamily('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)'), 'playstation');
eq('pad family: DualSense reads as PlayStation', dev.padFamily('DualSense Wireless Controller'), 'playstation');
eq('pad family: Xbox pad', dev.padFamily('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)'), 'xbox');
eq('glyph: PS jab is □', dev.glyph('jab', 'playstation').label, '□');
eq('glyph: PS cross is △', dev.glyph('cross', 'playstation').label, '△');
eq('glyph: PS confirm is ×', dev.glyph('confirm', 'playstation').label, '×');
eq('glyph: Xbox jab is X', dev.glyph('jab', 'xbox').label, 'X');
eq('glyph: keyboard shows the bound key', dev.glyph('ghost', 'keyboard').label, 'L-SHIFT');
settings.rebind('jab', 'KeyJ'); eq('glyph: keyboard follows remaps', dev.glyph('jab', 'keyboard').label, 'J'); settings.resetBinds();

// ---- title-fight poster holds for a button ----
run();
st.currentStage = CONSTANTS.bossStageOfArc(1); bosses.spawnBoss();
frames(400, () => T.update());
eq('poster: holds on screen until a button is pressed', st.bossIntroTimer, CONSTANTS.POSTER_HOLD_FRAME);
ok('poster: reports it is waiting', T.posterWaiting());
T.confirmPoster(); frames(60, () => T.update());
eq('poster: a press lets FIGHT! play out and the bout start', st.bossIntroTimer, 0);

// ---- Loaded Cross charges from ANY state (it used to silently become a tap) ----
run(); st.progressionMods.loadedCross = true;
st.player.state = 'recovery'; st.player.recoveryTimer = 10;
st.keys = { KeyS: true }; player.updatePlayer(); st.lastKeys = { ...st.keys };
frames(CONSTANTS.VERBS.loadedCross.chargeFrames + 2, () => { st.keys = { KeyS: true }; player.updatePlayer(); st.lastKeys = { ...st.keys }; });
st.keys = {}; player.updatePlayer();
ok('loaded cross: pressed during recovery still charges and fires LOADED', st.player.punchType === 'cross' && st.player.crossLoaded, `state ${st.player.state} loaded ${st.player.crossLoaded}`);
run(); st.progressionMods.loadedCross = true; st.enemies = [];
st.keys = { KeyS: true }; player.updatePlayer(); st.lastKeys = { ...st.keys };
st.keys = { KeyS: true, ArrowDown: true }; player.updatePlayer(); st.lastKeys = { ...st.keys };
ok('loaded cross: slipping keeps the charge', st.player.charging && st.player.lane === 2);

// ---- the Zone only burns while something is in reach ----
run(); st.zoneTimer = 100; st.isInstinct = true; st.instinctMeter = 100; st.hitstop = 0;
st.enemies = [{ x: 900, lane: 2, y: 450, w: 50, h: 110, hp: 45, maxHp: 45, speed: 0, color: '#f05', type: 'grunt', weight: 1, stun: 0, stunResist: 0, attackCooldown: 999, maxCooldown: 60, isBoss: false, justAttacked: 0, trails: [], vx: 0, pressure: 0, pressureDecay: 0 }];
frames(60, () => { st.hitstop = 0; T.update(); });
ok('zone: with enemies on screen but out of reach, the Zone holds (up to a cap)', st.zoneTimer === 100, `${st.zoneTimer}`);
ok('zone: the instinct meter isn\'t drained while in the Zone', st.instinctMeter === 100);
st.enemies[0].x = st.player.x + 120;
frames(20, () => { st.hitstop = 0; T.update(); });
ok('zone: with a target in reach it burns', st.zoneTimer < 100);

// ---- stacked evolutions: drafted back to back, celebrated together ----
run(); st.pendingUpgrades = 3; st.orbCounts = { speed: 0, power: 0, technique: 0 };
T.triggerUpgradeDraft();
const picked = [];
for (let i = 0; i < 3; i++) {
    eq(`chain: draft ${i + 1} is on screen (no vignette between)`, st.screen, 'upgrading');
    const o = st.currentDraftOptions[0]; picked.push(o.id); window.engineApplyUpgradeState(o.id);
}
eq('chain: after the last pick, ONE screen lists all three', st.vignette && st.vignette.picks.length, 3);
ok('chain: the list is the picks in order', JSON.stringify(st.vignette.picks.map(p => p.id)) === JSON.stringify(picked));
frames(300, () => vig.updateVignette());
eq('chain: it waits for a button', st.screen, 'vignette');

// ---- draft focus (pad-friendly) + grace ----
run(); st.pendingUpgrades = 1; st.uiFrame = 1000;
T.triggerUpgradeDraft();
eq('draft: exactly three cards', st.currentDraftOptions.length, 3);
eq('draft: focus starts on the first card', st.draftFocus, 0);

// ---- regression: a Finisher starts from a clean boss state ----
{
    const fin = await import('../src/systems/finisher.js');
    run(); st.currentStage = CONSTANTS.bossStageOfArc(2); bosses.spawnBoss(); st.bossIntroTimer = 0;
    const b = st.enemies.find(e => e.isBoss);
    Object.assign(b, { recoverTimer: 20, telegraphed: true, shiftWarning: 10, exposedTimer: 30, decoyTimer: 8, targetLanes: [0, 1], justAttacked: 5 });
    fin.startFinisher(b, 'break1');
    ok('finisher: boss OPEN/telegraph/shift/decoy state is cleared at the stagger', !b.recoverTimer && !b.telegraphed && !b.shiftWarning && !b.exposedTimer && !b.decoyTimer && b.targetLanes.length === 0);
    st.finisher = null;
}

console.log(`\n${'='.repeat(48)}`);
console.log(`V18 PASSED ${passed} / ${passed + failed}`);
if (failed) { console.log('FAILED:'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
else { console.log('ALL GREEN ✓'); process.exit(0); }
