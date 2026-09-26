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
// v20 pass verification (headless, real modules).

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

// ---- 1. HP scaling: flat enemies, capped boss growth ----
const a5 = CONSTANTS.firstStageOfArc(5), a9 = CONSTANTS.firstStageOfArc(9);
eq('hp: enemy HP no longer grows with stages (Arc 5)', CONSTANTS.enemyHpMult(a5), 1);
eq('hp: Arc 1 boss', CONSTANTS.bossHp(CONSTANTS.bossStageOfArc(1)), 1000);
eq('hp: Arc 5 boss (+15%/Arc)', CONSTANTS.bossHp(CONSTANTS.bossStageOfArc(5)), 1600);
eq('hp: boss growth caps at Arc 5', CONSTANTS.bossHp(a9), 1600);
run(); st.currentStage = a5; st.stageSpeedMult = 1;
const g5 = waves.makeEnemy('grunt', 1);
ok('hp: an Arc 5 grunt is within the arc density bump of base 45', g5.hp <= 45 * 1.25, `${g5.hp}`);

// ---- 2. punch feel ----
const F = t => CONSTANTS.punchFeel(t, false);
ok('feel: jab < hook < cross in hitstop', F('jab1').stop < F('hook').stop && F('hook').stop < F('cross').stop);
ok('feel: bigger sparks for heavier punches', F('jab1').spark < F('cross').spark);
ok('feel: a counter is its own (flat, biggest) event', CONSTANTS.punchFeel('jab1', true).stop > F('cross').stop && CONSTANTS.punchFeel('jab1', true) === CONSTANTS.punchFeel('cross', true));
run(); st.enemies = [mob()]; st.player.slipBuff = 1; st.hitstop = 0;
combat.checkHit('jab1');
eq('feel: a countered jab freezes for the counter hitstop', st.hitstop, CONSTANTS.PUNCH_FEEL.counter.stop);
run(); st.enemies = [mob()]; st.hitstop = 0; combat.checkHit('jab1');
eq('feel: a plain jab is light', st.hitstop, CONSTANTS.PUNCH_FEEL.jab.stop);

// ---- 3. arc par + medals ----
const P1 = par.parFor(1);
eq('par: gold = beat time AND score', par.medalFor(P1, P1.time - 1, P1.score), 'gold');
eq('par: silver = one of them', par.medalFor(P1, P1.time + 60, P1.score + 1), 'silver');
eq('par: bronze = cleared', par.medalFor(P1, P1.time + 60, 0), 'bronze');
run(); localStorage.clear();
st.currentStage = CONSTANTS.bossStageOfArc(1); par.arcParStart(); st.arcFrames = 60 * 200; st.score = (st.arcStartScore || 0) + P1.score + 5;
const before = st.score;
apply.advanceStage();
ok('par: clearing the Arc judges it (gold)', st.lastArcResult && st.lastArcResult.medal === 'gold', JSON.stringify(st.lastArcResult));
ok('par: the medal pays a bonus', st.score - before >= par.MEDALS.gold.bonus);
eq('par: best medal saved for Records', par.loadMedals()[1], 'gold');
eq('par: the clock restarts for the new Arc', st.arcFrames, 0);

// ---- 4. fusion preview ----
st.acquiredUpgradeIds = []; st.orbCounts = { speed: 2, power: 0, technique: 3 };
const spdCard = { id: 'x', kind: 'rank', tree: 'speed', effects: [{ op: 'incOrb', tree: 'speed', amount: 1 }] };
const fh = reqs.fusionHint(spdCard, st, UPGRADE_POOL);
ok('fusion hint: completing Speed 3 + Tech 3 unlocks Ghost Counter', fh && fh.name === 'Ghost Counter' && fh.missing === 0, JSON.stringify(fh));
st.orbCounts = { speed: 1, power: 0, technique: 3 };
const fh2 = reqs.fusionHint(spdCard, st, UPGRADE_POOL);
ok('fusion hint: "1 MORE →" when one rank short', fh2 && fh2.missing === 1);
st.acquiredUpgradeIds = ['fuse_ghost_counter']; st.orbCounts = { speed: 2, power: 0, technique: 3 };
const fh3 = reqs.fusionHint(spdCard, st, UPGRADE_POOL);
ok('fusion hint: nothing for a fusion you already own (or out of reach)', !fh3 || fh3.name !== 'Ghost Counter');

// ---- 5. heat ----
ok('heat: multiplier sums bonuses', Math.abs(heat.heatMultFor(['relentless', 'one_count']) - 1.5) < 1e-9);
run(); st.heat = ['glass_jaw']; st.health = 100; player.takeDamage(20, false, mob());
eq('heat: GLASS JAW +25% damage', st.health, 75);
run(); st.heat = ['one_count']; st.knockdownsThisArc = 0;
ok('heat: ONE COUNT disables the ten-count', !knock.canBeKnockedDown());
run(); st.heat = ['relentless']; const rel = waves.makeEnemy('grunt', 1); st.heat = []; const nor = waves.makeEnemy('grunt', 1);
ok('heat: RELENTLESS shortens recovery', rel.maxCooldown < nor.maxCooldown, `${rel.maxCooldown} vs ${nor.maxCooldown}`);
run(); st.heat = ['plated']; const pg = mob(); st.enemies = [pg]; combat.checkHit('jab1'); const platedDmg = 400 - pg.hp;
run(); st.heat = []; const ng = mob(); st.enemies = [ng]; combat.checkHit('jab1'); const plainDmg = 400 - ng.hp;
ok('heat: PLATED halves Jab damage on Grunts', platedDmg > 0 && platedDmg < plainDmg, `${platedDmg} vs ${plainDmg}`);
run(); st.heat = ['relentless', 'glass_jaw']; st.score = 0; score.addScore(100, undefined, undefined, { noCombo: true });
eq('heat: score is multiplied', st.score, 140);
run(); st.heat = ['no_mercy']; st.health = 60; st.hpCeil = undefined; T.update(); st.health = 90; T.update();
ok('heat: NO MERCY — health can\'t go back up', st.health <= 60, `${st.health}`);
localStorage.clear(); heat.saveHeat(['crowded']);
localStorage.setItem('neon_strike_meta_v1', JSON.stringify({ bestBossStreak: 1, bestStage: 7 }));
T.startGame({ tutorial: false, seed: 9 });
ok('heat: applies to a normal run once unlocked', heat.heatOn('crowded'));
T.startGame(true); // v21: the Daily flag is ignored now (mode removed)
ok('daily: removed — a daily start is a normal run', st.dailyMode === false);
localStorage.setItem('neon_strike_meta_v1', JSON.stringify({ bestBossStreak: 0, bestStage: 3 }));
T.startGame({ tutorial: false, seed: 9 });
ok('heat: locked until the Arc 1 boss is beaten', !heat.heatOn('crowded'));

// ---- 6. unlocks ----
ok('unlock: practice after reaching the title fight', records.practiceUnlocked({ bestStage: 5, bestBossStreak: 0 }) && !records.practiceUnlocked({ bestStage: 4, bestBossStreak: 0 }));
ok('unlock: heat after beating the Arc 1 boss', records.heatUnlocked({ bestBossStreak: 1 }) && !records.heatUnlocked({ bestBossStreak: 0 }));
localStorage.clear(); localStorage.setItem('neon_strike_leaderboard_v1', JSON.stringify([{ score: 5, stage: 10 }]));
eq('unlock: old saves backfill best round from the leaderboard', records.loadMeta().bestStage, 10);

// ---- 7. practice ----
localStorage.clear();
const zt = practice.practiceTargets().find(t => t.id === 'zoner');
T.startGame({ practice: zt, windows: true, tutorial: false }); SequenceManager.active = false; st.screen = 'playing';
frames(120, () => T.update());
ok('practice: spawns the chosen enemy on a loop', st.enemies.length >= 1 && st.enemies.every(e => e.type === 'zoner'), JSON.stringify(st.enemies.map(e => e.type)));
st.enemies.forEach(e => e.hp = 0); frames(100, () => T.update());
ok('practice: respawns after a KO', st.enemies.some(e => e.hp > 0 && e.type === 'zoner'));
st.health = 10; T.update();
eq('practice: you can\'t lose (HP resets)', st.health, st.maxHealth);
st.exp = 999; T.update();
eq('practice: no drafts', st.pendingUpgrades, 0);
eq('practice: no score multiplier games — no heat', (st.heat || []).length, 0);
const bt = practice.practiceTargets().find(t => t.id === 'boss1');
T.startGame({ practice: bt, tutorial: false }); SequenceManager.active = false; st.screen = 'playing';
frames(200, () => { T.update(); if (T.posterWaiting()) T.confirmPoster(); });
ok('practice: boss drill spawns the boss', st.enemies.some(e => e.isBoss));
{
    const stage0 = st.currentStage;
    for (let k = 0; k < 3000 && st.enemies.some(e => e.isBoss); k++) {
        const b = st.enemies.find(e => e.isBoss); if (b && !st.finisher) b.hp = Math.min(b.hp, 1);
        st.lastKeys = { ...st.keys }; st.keys = {};
        if (st.finisher) { const fp = (await import('../src/systems/finisher.js')).promptProgress(); if (fp && fp.t === 0) st.keys[{ up: 'ArrowUp', down: 'ArrowDown', jab: 'KeyA', cross: 'KeyS', hook: 'KeyD' }[fp.move]] = true; }
        else if (b && k % 4 === 0) { st.player.slipBuff = 1; st.keys.KeyS = true; }
        T.update(); if (st.screen === 'vignette') T.update();
    }
    const killed = !st.enemies.some(e => e.isBoss && e.hp > 0);
    ok('practice: the boss drill can be won', killed, `boss hp ${(st.enemies.find(e => e.isBoss) || {}).hp} finisher ${!!st.finisher} screen ${st.screen}`);
    let respawned = false;
    for (let k = 0; k < 600 && !respawned; k++) { T.update(); if (T.posterWaiting()) T.confirmPoster(); respawned = st.enemies.some(e => e.isBoss && e.hp > 0); }
    ok('practice: a KO\'d boss comes back (no stage advance)', respawned && st.currentStage === stage0, `stage ${stage0}→${st.currentStage} screen ${st.screen} respawned ${respawned}`);
}
ok('practice: targets lock behind rounds', !practice.practiceTargetUnlocked(practice.practiceTargets().find(t => t.id === 'boss3'), 7));

// ---- 8. recap ----
eq('recap: tip for assassin', recap.tipFor('assassin').includes('Guard'), true);
eq('recap: boss tip for any boss', recap.tipFor('live_wire'), recap.tipFor('negative'));
const td = recap.topDamage({ stages: [{ dmg: { zoner: 40, grunt: 12 } }, { dmg: { grunt: 50 } }] });
ok('recap: hurt most = summed across stages', td.src === 'grunt' && td.dmg === 62);

// ---- 9. colour-blind tells setting ----
eq('settings: tell shapes default off', settings.sanitizeSettings({}).tellShapes, false);
eq('settings: tell shapes persists', settings.sanitizeSettings({ tellShapes: true }).tellShapes, true);

console.log(`V20 PASSED ${passed} / ${passed + failed}`);
if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exitCode = 1; }
