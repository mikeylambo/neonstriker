// Headless verification harness for the v9 roadmap work. Stubs the browser globals
// the game modules expect (document/window/localStorage/canvas/audio), then imports
// the REAL source modules and drives their actual logic — no mock reimplementation.
// Run: `node tests/harness.mjs` (or `npm test`).

// ---- global stubs (must exist before importing any game module) ----
const noop = new Proxy(function () {}, {
    get: (t, p) => (p === Symbol.toPrimitive ? () => '' : noop),
    apply: () => noop,
    set: () => true
});
globalThis.document = { getElementById: () => noop, createElement: () => noop };
globalThis.window = globalThis;
globalThis.window.AudioContext = function () { return noop; };
try { Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [] }, configurable: true }); } catch (e) { /* navigator already present in Node — fine, unused here */ }
globalThis.requestAnimationFrame = () => 0;
(() => {
    const store = new Map();
    globalThis.localStorage = {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: k => store.delete(k),
        clear: () => store.clear()
    };
})();

// ---- tiny test runner ----
let passed = 0, failed = 0;
const fails = [];
function ok(name, cond, detail = '') {
    if (cond) { passed++; }
    else { failed++; fails.push(`${name}${detail ? ' — ' + detail : ''}`); }
}
function eq(name, got, want) { ok(name, got === want, `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }

// ---- imports (post-stub) ----
const { CONSTANTS } = await import('../src/constants.js');
const { gameState: st } = await import('../src/state.js');
const { spawnEnemy, applyFormations } = await import('../src/systems/waves.js');
const { seedRng, random } = await import('../src/systems/rng.js');
const { spawnBoss, updateBosses } = await import('../src/entities/bosses.js');
const records = await import('../src/systems/records.js');

// baseline geometry
st.width = 1000; st.height = 600;

function resetForWave(affix) {
    st.screen = 'playing'; st.currentStage = 1; st.tutorialEnabled = false;
    st.spawnTotal = 5; st.enemies = []; st.particles = []; st.floatingTexts = [];
    st.wavesCleared = 0; st.waveThreshold = 99; st.waveTimer = 0; st.tutorialDelay = 0;
    st.bossActive = false; st.stageClearing = false; st.bossIntroTimer = 0; st.purifyTimer = 0;
    st.currentAffix = affix;
    st.stageSpeedMult = 1;
}
function findAffix(name) { return CONSTANTS.AFFIXES.find(a => a.name === name); }
function typeCounts() {
    const c = {};
    st.enemies.forEach(e => { c[e.type] = (c[e.type] || 0) + 1; });
    return c;
}

// ============ 1. AFFIX DATA ============
eq('affix count restored', CONSTANTS.AFFIXES.length, 7);
eq('affixMod SURGE instinct', CONSTANTS.affixMod(findAffix('SURGE'), 'instinctGainMult', 1), 1.5);
eq('affixMod GLASS dealt', CONSTANTS.affixMod(findAffix('GLASS PROTOCOL'), 'playerDamageDealtMult', 1), 1.3);
eq('affixMod GLASS taken', CONSTANTS.affixMod(findAffix('GLASS PROTOCOL'), 'playerDamageTakenMult', 1), 1.3);
eq('affixMod HEAVY bruiser', CONSTANTS.affixMod(findAffix('HEAVY HANDS'), 'bruiserDamageMult', 1), 1.4);
eq('affixMod ADRENALINE heal', CONSTANTS.affixMod(findAffix('ADRENALINE'), 'perfectSlipHeal', 0), 4);
eq('affixMod default when absent', CONSTANTS.affixMod(findAffix('NONE'), 'playerDamageDealtMult', 1), 1);

// ============ 2. WAVE COMPOSITION UNDER AFFIXES ============
// Formations now consume the seeded rng for packets containing shooters/assassins;
// seed it so this section is reproducible run-to-run.
seedRng(777);
// Stage 1 packet 0 is three plain Grunts (l1,l0,l2) — a clean substitution target.
resetForWave(findAffix('NONE'));
spawnEnemy();
let base = typeCounts();
eq('NONE: 3 grunts baseline', base.grunt, 3);
eq('NONE: stageSpeedMult 1.0', +st.stageSpeedMult.toFixed(3), 1.0);

resetForWave(findAffix('IRON WALL'));
spawnEnemy();
let iron = typeCounts();
eq('IRON WALL: 2 grunts -> shields (every 2nd)', iron.shield, 2);
eq('IRON WALL: 1 grunt remains', iron.grunt, 1);

resetForWave(findAffix('HEAVY HANDS'));
spawnEnemy();
let heavy = typeCounts();
eq('HEAVY HANDS: 1 grunt -> bruiser (every 4th)', heavy.bruiser, 1);
eq('HEAVY HANDS: 2 grunts remain', heavy.grunt, 2);

resetForWave(findAffix('FAST CROWD'));
spawnEnemy();
let fast = typeCounts();
eq('FAST CROWD: 2 grunts -> assassins', fast.assassin, 2);
eq('FAST CROWD: speedMult applied (1.12)', +st.stageSpeedMult.toFixed(3), 1.12);
eq('FAST CROWD packetDelayMult is 0.7', CONSTANTS.affixMod(findAffix('FAST CROWD'), 'packetDelayMult', 1), 0.7);
// Isolate the delay hook (no substitution/speed noise): a synthetic affix that ONLY
// compresses spacing must place the same Grunt nearer the edge than NONE does.
resetForWave(findAffix('NONE')); spawnEnemy();
const noneLastX = st.enemies.find(e => e.type === 'grunt' && e.lane === 2).x; // grunt d100,l2
resetForWave({ name: 'TESTDELAY', mods: { packetDelayMult: 0.5 } }); spawnEnemy();
const halfLastX = st.enemies.find(e => e.type === 'grunt' && e.lane === 2).x;
ok('packetDelayMult tightens spawn spacing', halfLastX < noneLastX, `half ${halfLastX.toFixed(0)} vs none ${noneLastX.toFixed(0)}`);

// Substitution must NOT touch already-authored non-grunts: assassin-led packet keeps its assassin.
resetForWave(findAffix('IRON WALL')); st.wavesCleared = 0; st.currentStage = 2; // arc1 lvl2 packet0 leads with assassin
spawnEnemy();
ok('IRON WALL leaves authored assassin intact', st.enemies.some(e => e.type === 'assassin'), JSON.stringify(typeCounts()));

// ============ 3. BOSS ARC MUTATIONS (data wiring) ============
const monk5 = CONSTANTS.getBossArcMods('static_monk', 5);
eq('static_monk arc5 patternChainLength', monk5.patternChainLength, 3);
eq('static_monk arc5 deceptiveOrder', monk5.deceptiveOrder, true);
eq('static_monk arc5 summonSupportPressure', monk5.summonSupportPressure, true);
const monk1 = CONSTANTS.getBossArcMods('static_monk', 1);
eq('static_monk arc1 patternChainLength', monk1.patternChainLength, 1);
const phantom5 = CONSTANTS.getBossArcMods('phantom_boxer', 5);
eq('phantom arc5 lanePinchBias', phantom5.lanePinchBias, 0.45);
eq('phantom arc5 afterimageThreat', phantom5.afterimageThreat, true);
eq('phantom arc5 reentryDelayVariant', phantom5.reentryDelayVariant, true);

// ============ 4. STATIC MONK volleys-per-burst (behavioral sim) ============
function simMonkBursts(stage, frames) {
    st.currentStage = stage;
    st.enemies = []; st.particles = []; st.floatingTexts = []; st.laneFlash = [0, 0, 0];
    st.bossIntroTimer = 0; st.isInstinct = true; st.screen = 'playing';
    st.player = { x: 780, lane: 1, y: st.height * CONSTANTS.LANE_Y[1], state: 'idle', dangerLevel: 0, ghostStepTimer: 0, flowStreak: 0 };
    st.health = 100000; st.maxHealth = 100000;
    // Force the roster to land on Static Monk: arc index (stage-1)/7+1, bossIndex=(arc-1)%3.
    spawnBoss();
    const boss = st.enemies.find(e => e.isBoss);
    if (!boss || boss.controller !== 'static_monk') return null;
    boss.arcMods = CONSTANTS.getBossArcMods('static_monk', CONSTANTS.getArcIndex(stage));
    st.bossIntroTimer = 0;
    const bursts = [];
    let prev = boss.bossMashCount;
    for (let f = 0; f < frames; f++) {
        updateBosses();
        const cur = boss.bossMashCount;
        // A recharge resets bossMashCount to 0 in the SAME frame the final volley
        // incremented it, so the volley that triggers the recharge is folded into
        // this transition — burst length is the previous frame's count plus that
        // triggering volley (prev + 1).
        if (prev > 0 && cur === 0) bursts.push(prev + 1);
        prev = cur;
    }
    return bursts;
}
// Stage 21 = arc 3 boss? arc=(21-1)/7+1=3 -> bossIndex=(3-1)%3=2 -> static_monk. patternChainLength arc3=2 -> burst 3.
// Stage 35 = arc 5 boss -> bossIndex=(5-1)%3=1 -> phantom. Need a static_monk arc-5-ish: bossIndex 2 => arc where (arc-1)%3==2 => arc 3 or 6. Arc 6 clamps mods to arc5.
// Arc 6 boss stage = (6-1)*7+7 = 42. getArcIndex(42)=6 -> bossIndex (6-1)%3=2 -> static_monk, mods clamp to 5 (patternChainLength 3 -> burst 4).
const burstsArc3 = simMonkBursts(21, 2000);
const burstsArc6 = simMonkBursts(42, 2000);
ok('static monk fires bursts (arc3)', burstsArc3 && burstsArc3.length >= 2, JSON.stringify(burstsArc3));
ok('arc3 burst length = 3 (1+patternChainLength 2)', burstsArc3 && burstsArc3.every(b => b === 3), JSON.stringify(burstsArc3));
ok('arc6 burst length = 4 (1+patternChainLength 3)', burstsArc6 && burstsArc6.every(b => b === 4), JSON.stringify(burstsArc6));

// summonSupportPressure: at arc6 a Grunt add should appear during the fight.
ok('summonSupportPressure spawns a Grunt add', st.enemies.some(e => !e.isBoss && e.type === 'grunt'), JSON.stringify(st.enemies.map(e => e.type)));

// ============ 5. DETERMINISM (Daily seed reproducibility) ============
seedRng(20260917);
const seqA = Array.from({ length: 24 }, () => random());
seedRng(20260917);
const seqB = Array.from({ length: 24 }, () => random());
ok('same seed -> identical RNG stream', JSON.stringify(seqA) === JSON.stringify(seqB));
seedRng(20260918);
const seqC = Array.from({ length: 24 }, () => random());
ok('different seed -> diverges', JSON.stringify(seqA) !== JSON.stringify(seqC));
// affix picks are just random()*len — same seed reproduces the same affix order:
seedRng(555); const affA = Array.from({ length: 12 }, () => CONSTANTS.AFFIXES[Math.floor(random() * CONSTANTS.AFFIXES.length)].name);
seedRng(555); const affB = Array.from({ length: 12 }, () => CONSTANTS.AFFIXES[Math.floor(random() * CONSTANTS.AFFIXES.length)].name);
ok('same seed -> identical affix order', JSON.stringify(affA) === JSON.stringify(affB));

// ============ 6. RECORDS / LEADERBOARD / UNLOCKS ============
const { list: l1, rank: r1 } = records.rankInsert([], { score: 100 });
eq('rankInsert empty -> rank 1', r1, 1);
const seed = [{ score: 300 }, { score: 200 }, { score: 100 }];
const ins = records.rankInsert(seed, { score: 250 });
eq('rankInsert orders desc (250 -> rank 2)', ins.rank, 2);
eq('rankInsert keeps desc order', JSON.stringify(ins.list.map(e => e.score)), JSON.stringify([300, 250, 200, 100]));
const capped = records.rankInsert(Array.from({ length: 10 }, (_, i) => ({ score: 1000 - i * 10 })), { score: 5 });
eq('rankInsert caps at 10', capped.list.length, 10);
eq('rankInsert below-cutoff -> rank -1', capped.rank, -1);

eq('unlock: grade C unlocks nothing but default', JSON.stringify(records.unlocksForRun({ grade: 'C', daily: false, bossKills: 0 }, ['cyan'])), JSON.stringify([]));
ok('unlock: grade B unlocks ember', records.unlocksForRun({ grade: 'B', daily: false, bossKills: 1 }, ['cyan']).includes('ember'));
ok('unlock: grade S unlocks ember+violet+gold', ['ember', 'violet', 'gold'].every(x => records.unlocksForRun({ grade: 'S', daily: false, bossKills: 3 }, ['cyan']).includes(x)));
ok('unlock: daily+boss unlocks prism', records.unlocksForRun({ grade: 'C', daily: true, bossKills: 1 }, ['cyan']).includes('prism'));
ok('unlock: daily no-boss does NOT unlock prism', !records.unlocksForRun({ grade: 'C', daily: true, bossKills: 0 }, ['cyan']).includes('prism'));

// commit + persistence round-trip
localStorage.clear();
const c1 = records.commitRunRecord({ score: 3200, grade: 'S', stage: 15, daily: false, bossKills: 2 });
eq('commit: rank 1 on first run', c1.rank, 1);
ok('commit: S run unlocks gold', c1.newUnlocks.includes('gold'));
eq('commit: bestBossStreak tracked', c1.bestBossStreak, 2);
records.commitRunRecord({ score: 800, grade: 'B', stage: 6, daily: false, bossKills: 4 });
const meta = records.loadMeta();
eq('meta: totalRuns accumulates', meta.totalRuns, 2);
eq('meta: bestBossStreak takes the max', meta.bestBossStreak, 4);
eq('leaderboard persisted + ordered', JSON.stringify(records.loadLeaderboard().map(e => e.score)), JSON.stringify([3200, 800]));
records.selectSkin('gold');
eq('selectSkin applies to unlocked', records.selectedStrikerColor(), '#facc15');
records.selectSkin('prism'); // not unlocked in this store -> should be ignored
eq('selectSkin ignores locked skin', records.selectedStrikerColor(), '#facc15');

// ============ 7. advanceStage integration (affix pick + stage tables + arc clamp) ============
const { advanceStage } = await import('../src/systems/progression/apply.js');
st.player = { state: 'idle', punchTimer: 0, hitFrame: 0, didHit: false, recoveryTimer: 0, comboWindow: 0, jabStep: 0, inputBuffer: null, movementBuffer: null, lane: 1, x: 180, y: 300 };
st.maxHealth = 100; st.health = 100; st.currentStage = 1; st.bossActive = false;
let advThrew = null;
seedRng(2026);
const affixesSeen = new Set();
try {
    for (let i = 0; i < 45; i++) { advanceStage(); if (st.currentAffix) affixesSeen.add(st.currentAffix.name); }
} catch (e) { advThrew = e && e.message; }
ok('advanceStage: 45 stages without throwing', advThrew === null, advThrew || '');
ok('advanceStage: clamps past arc 5 (reaches stage 46)', st.currentStage >= 46, `stage ${st.currentStage}`);
ok('advanceStage: affix rotation surfaces >=4 distinct modifiers', affixesSeen.size >= 4, [...affixesSeen].join(','));

// ============ 8. FORMATIONS (systemic squads: variable + arc-ramped + deterministic) ============
function coverageRate(defs, arc, trials) {
    let covered = 0;
    for (let s = 1; s <= trials; s++) {
        seedRng((s * 2654435761) >>> 0);
        if (applyFormations(defs, arc).length > defs.length) covered++;
    }
    return covered / trials;
}
const zonerDef = [{ t: 'zoner', l: 1, d: 60 }];
const rateArc1 = coverageRate(zonerDef, 1, 400);
const rateArc5 = coverageRate(zonerDef, 5, 400);
ok('formations: Arc 5 barricades a zoner most of the time', rateArc5 > 0.6 && rateArc5 < 0.95, `arc5 ${rateArc5.toFixed(2)}`);
ok('formations: NEVER guaranteed — some seeds leave it uncovered', rateArc5 < 1.0, `arc5 ${rateArc5.toFixed(2)}`);
ok('formations: rarer in Arc 1 than Arc 5 (macro tension ramp)', rateArc1 < rateArc5, `arc1 ${rateArc1.toFixed(2)} vs arc5 ${rateArc5.toFixed(2)}`);
ok('formations: Arc 1 coverage stays low (teach the read)', rateArc1 < 0.35, `arc1 ${rateArc1.toFixed(2)}`);

seedRng(4242); const f1 = applyFormations(zonerDef, 5);
seedRng(4242); const f2 = applyFormations(zonerDef, 5);
ok('formations: deterministic per seed (Daily-safe)', JSON.stringify(f1) === JSON.stringify(f2));

let sawAdd = null;
for (let s = 1; s <= 60 && !sawAdd; s++) { seedRng(s); const out = applyFormations(zonerDef, 5); if (out.length > 1) sawAdd = out; }
const barricade = sawAdd && sawAdd.find(e => e.t === 'shield');
ok("formations: barricade is a Shield in the zoner's lane, in front (smaller d)", !!barricade && barricade.l === 1 && barricade.d < 60, JSON.stringify(barricade));

let maxAdds = 0;
for (let s = 1; s <= 200; s++) { seedRng(s); const out = applyFormations([{ t: 'zoner', l: 0, d: 0 }, { t: 'zoner', l: 1, d: 0 }, { t: 'zoner', l: 2, d: 0 }], 5); maxAdds = Math.max(maxAdds, out.length - 3); }
ok('formations: respects maxAddsPerPacket cap', maxAdds <= CONSTANTS.FORMATION_RULES.maxAddsPerPacket, `max adds ${maxAdds}`);

let gruntTouched = false;
for (let s = 1; s <= 100; s++) { seedRng(s); if (applyFormations([{ t: 'grunt', l: 0, d: 0 }, { t: 'grunt', l: 1, d: 50 }], 5).length !== 2) gruntTouched = true; }
ok('formations: a grunt-only wave is never altered', !gruntTouched);

const screenRate = coverageRate([{ t: 'assassin', l: 2, d: 40 }], 5, 400);
ok('formations: assassins sometimes screened at Arc 5', screenRate > 0.3 && screenRate < 0.9, `screen ${screenRate.toFixed(2)}`);

// ============ 9. LANE TEMPO (hot lane: approach-speed only, selective, deterministic) ============
seedRng(999);
resetForWave(findAffix('NONE'));
st.laneTempo = [1, CONSTANTS.LANE_TEMPO.hotMult, 1];
spawnEnemy();
{
    const g1 = st.enemies.find(e => e.lane === 1 && e.type === 'grunt');
    const g0 = st.enemies.find(e => e.lane === 0 && e.type === 'grunt');
    ok('lane tempo: hot-lane enemy approaches faster', !!g1 && !!g0 && (g1.speed / g0.speed) > 1.3, `ratio ${(g1 && g0) ? (g1.speed / g0.speed).toFixed(2) : 'n/a'}`);
}
st.laneTempo = [1, 1, 1];

function hotLaneAt(stageBefore, seed) { seedRng(seed); st.currentStage = stageBefore; st.bossActive = false; advanceStage(); return st.hotLane; }
let bossHot = false; for (let s = 1; s <= 60; s++) if (hotLaneAt(6, s) >= 0) bossHot = true;   // ->7 boss
ok('lane tempo: a boss stage is never hot', !bossHot);
let arc1Hot = false; for (let s = 1; s <= 60; s++) if (hotLaneAt(1, s) >= 0) arc1Hot = true;   // ->2 arc1
ok('lane tempo: Arc 1 is never hot (teach the read)', !arc1Hot);
let arc3n = 0; const T = 400; for (let s = 1; s <= T; s++) if (hotLaneAt(14, s) >= 0) arc3n++;  // ->15 arc3
const arc3rate = arc3n / T;
ok('lane tempo: Arc 3 runs hot often (its signature)', arc3rate > 0.45 && arc3rate < 0.75, `rate ${arc3rate.toFixed(2)}`);
ok('lane tempo: Arc 3 is NOT always hot (selective)', arc3rate < 1.0, `rate ${arc3rate.toFixed(2)}`);
ok('lane tempo: deterministic per seed (Daily-safe)', hotLaneAt(14, 31337) === hotLaneAt(14, 31337));
{
    // when hot, exactly one lane is boosted, to the configured multiplier
    let found = null; for (let s = 1; s <= 80 && !found; s++) { if (hotLaneAt(14, s) >= 0) found = { lane: st.hotLane, tempo: st.laneTempo.slice() }; }
    const hotCount = found ? found.tempo.filter(v => v > 1).length : -1;
    ok('lane tempo: exactly one lane hot, at hotMult', !!found && hotCount === 1 && found.tempo[found.lane] === CONSTANTS.LANE_TEMPO.hotMult, JSON.stringify(found));
}

// ============ 10. MENACE (target-priority: consequence of ignoring) ============
const { applyMenace } = await import('../src/entities/enemies.js');
const MEN = CONSTANTS.MENACE;
function ranMenace(base, frames) { for (let f = 0; f < frames; f++) applyMenace(base); return base; }

const bru = ranMenace({ type: 'bruiser', x: 800, y: 300, menace: 0, menaceLevel: 0, maxCooldown: 80, speed: 1.8, baseSpeed: 1.8, color: '#cc0000' }, MEN.framesPerLevel * MEN.maxLevel + 5);
eq('menace: bruiser reaches max level when ignored', bru.menaceLevel, MEN.maxLevel);
ok('menace: bruiser cooldown drops but stays above its tell (22)', bru.maxCooldown < 80 && bru.maxCooldown >= 22, `cd ${bru.maxCooldown}`);
ok('menace: bruiser cooldown floors at minCooldown', bru.maxCooldown >= MEN.bruiser.minCooldown, `cd ${bru.maxCooldown}`);
ok('menace: bruiser speeds up from base', bru.speed > 1.8, `spd ${bru.speed.toFixed(2)}`);
ok('menace: bruiser brightens (telegraphed)', bru.color !== '#cc0000', bru.color);

const bruEarly = ranMenace({ type: 'bruiser', x: 800, y: 300, menace: 0, menaceLevel: 0, maxCooldown: 80, speed: 1.8, baseSpeed: 1.8, color: '#cc0000' }, MEN.framesPerLevel - 5);
eq('menace: no escalation before the first threshold', bruEarly.menaceLevel, 0);

const zon = ranMenace({ type: 'zoner', x: 800, y: 300, menace: 0, menaceLevel: 0, maxCooldown: 100, speed: 1.5, baseSpeed: 1.5, color: '#00ff00' }, MEN.framesPerLevel * 3 + 5);
ok('menace: zoner fires faster but stays above its tell (40)', zon.maxCooldown < 100 && zon.maxCooldown >= 40, `cd ${zon.maxCooldown}`);
ok('menace: escalation is telegraphed (float text queued)', st.floatingTexts.length > 0);

// ============ 11. LANE HAZARDS (surprise injector: telegraphed, fair, Arc 4-5) ============
const hazMod = await import('../src/systems/hazards.js');
const HZ = CONSTANTS.HAZARDS;
st.width = 1000; st.height = 600; st.hazards = []; st.floatingTexts = []; st.enemies = [];
st.isInstinct = false; st.maxHealth = 100; st.combo = 0; st.currentAffix = findAffix('NONE');
st.player = { lane: 0, x: 180, y: 300, state: 'idle', flowStreak: 0 };

seedRng(1); hazMod.spawnHazard(1);
eq('hazard: spawns in warn phase', st.hazards[0] && st.hazards[0].phase, 'warn');
eq('hazard: on the requested lane', st.hazards[0].lane, 1);
eq('hazard: warn timer set', st.hazards[0].timer, HZ.warnFrames);

// safe lane -> no damage, and it clears
st.player.lane = 0; st.health = 100;
for (let f = 0; f < HZ.warnFrames + HZ.strikeFrames + 2; f++) hazMod.updateHazards();
eq('hazard: a safe lane takes no damage', st.health, 100);
eq('hazard: clears after the strike window', st.hazards.length, 0);

// standing in the lane at strike -> damage
st.hazards = []; st.player.lane = 2; st.player.state = 'idle'; st.health = 100;
hazMod.spawnHazard(2);
for (let f = 0; f < HZ.warnFrames + 3; f++) hazMod.updateHazards();
ok('hazard: standing in the lane at strike takes damage', st.health < 100, `hp ${st.health}`);

// Ghost Step evades
st.hazards = []; st.player.lane = 1; st.player.state = 'idle'; st.health = 100;
hazMod.spawnHazard(1);
for (let f = 0; f < HZ.warnFrames; f++) hazMod.updateHazards();
st.player.state = 'ghost_step';
hazMod.updateHazards();
eq('hazard: Ghost Step evades the strike', st.health, 100);
st.player.state = 'idle';

// scheduler arc-gating
function hazardScheduled(stage, seed) {
    st.hazards = []; st.currentStage = stage; st.screen = 'playing'; st.bossActive = false; st.stageClearing = false; st.bossIntroTimer = 0; st.hazardCooldown = 0;
    // These cases isolate ARC gating, so grant full budget/cap headroom.
    st.hazardsThisStage = 0; st.surpriseBudget = 99;
    seedRng(seed); hazMod.maybeScheduleHazard(); return st.hazards.length > 0;
}
let a1 = 0; for (let s = 1; s <= 100; s++) if (hazardScheduled(3, s)) a1++;   // stage3 = Arc 1
eq('hazard: Arc 1 never schedules', a1, 0);
let a4 = 0; for (let s = 1; s <= 200; s++) if (hazardScheduled(24, s)) a4++;  // stage24 = Arc 4
ok('hazard: Arc 4 schedules sometimes (but not always)', a4 > 0 && a4 < 200, `${a4}/200`);
eq('hazard: never on a boss stage', hazardScheduled(7, 5) || hazardScheduled(7, 9) || hazardScheduled(7, 13), false);
eq('hazard: respects cooldown (no roll while cooling)', (() => { st.hazards = []; st.currentStage = 24; st.screen = 'playing'; st.bossActive = false; st.stageClearing = false; st.bossIntroTimer = 0; st.hazardCooldown = 50; hazMod.maybeScheduleHazard(); return st.hazards.length; })(), 0);

// ================================================================
// R14 — hazard frequency cap, shared surprise budget, submission gate
// ================================================================

// Drive a realistic stage's worth of frames and count how many hazards actually fire.
function hazardsOverStage(stage, seed, frames = 3600) {
    const arc = Math.min(CONSTANTS.getArcIndex(stage), 5);
    seedRng(seed);
    st.screen = 'playing'; st.currentStage = stage;
    st.bossActive = false; st.stageClearing = false; st.bossIntroTimer = 0;
    st.hazards = []; st.hazardCooldown = 0; st.hazardsThisStage = 0;
    st.surpriseBudget = (CONSTANTS.SURPRISE.budgetByArc || {})[arc] || 0;
    st.player.lane = 1; st.player.state = 'idle'; st.health = 100000;
    let fired = 0;
    for (let f = 0; f < frames; f++) {
        const before = st.hazards.length;
        hazMod.maybeScheduleHazard();
        if (st.hazards.length > before) fired++;
        hazMod.updateHazards();
    }
    return fired;
}

// The headline fix: the old build averaged ~6-7 hazards per Arc 4/5 stage.
let maxA4 = 0, maxA5 = 0;
for (let s = 0; s < 40; s++) maxA4 = Math.max(maxA4, hazardsOverStage(24, 700 + s));
for (let s = 0; s < 40; s++) maxA5 = Math.max(maxA5, hazardsOverStage(31, 700 + s));
ok('R14 hazard: Arc 4 never exceeds its per-stage cap', maxA4 <= CONSTANTS.HAZARDS.maxPerStageByArc[4], `max ${maxA4}`);
ok('R14 hazard: Arc 5 never exceeds its per-stage cap', maxA5 <= CONSTANTS.HAZARDS.maxPerStageByArc[5], `max ${maxA5}`);
ok('R14 hazard: Arc 5 still fires sometimes (not disabled)', (() => {
    for (let s = 0; s < 40; s++) if (hazardsOverStage(31, 900 + s) > 0) return true;
    return false;
})(), 'never fired in 40 seeds');

// Never two live at once.
ok('R14 hazard: never two hazards live simultaneously', (() => {
    seedRng(31337);
    st.screen = 'playing'; st.currentStage = 31; st.bossActive = false; st.stageClearing = false; st.bossIntroTimer = 0;
    st.hazards = []; st.hazardCooldown = 0; st.hazardsThisStage = 0; st.surpriseBudget = 99;
    st.player.lane = 1; st.player.state = 'idle'; st.health = 100000;
    for (let f = 0; f < 5000; f++) {
        hazMod.maybeScheduleHazard(); hazMod.updateHazards();
        if (st.hazards.length > 1) return false;
    }
    return true;
})(), 'two hazards overlapped');

// Budget: a spent budget blocks hazards entirely.
eq('R14 budget: zero budget blocks hazard scheduling', (() => {
    st.hazards = []; st.currentStage = 31; st.screen = 'playing'; st.bossActive = false;
    st.stageClearing = false; st.bossIntroTimer = 0; st.hazardCooldown = 0;
    st.hazardsThisStage = 0; st.surpriseBudget = 0;
    for (let i = 0; i < 50; i++) { seedRng(i); st.hazardCooldown = 0; hazMod.maybeScheduleHazard(); }
    return st.hazards.length;
})(), 0);

// A hot lane must consume budget, leaving less room for hazards that stage.
ok('R14 budget: hot lane costs budget (advanceStage)', (() => {
    let sawHotSpend = false;
    for (let s = 0; s < 60; s++) {
        seedRng(2000 + s);
        st.currentStage = 16; st.bossDefeatedThisStage = false; st.player.state = 'idle';
        st.health = 100; st.maxHealth = 100; st.enemies = [];
        advanceStage(); // -> stage 17 (Arc 3, hottest arc)
        const budget = (CONSTANTS.SURPRISE.budgetByArc || {})[3] || 0;
        if (st.hotLane >= 0) {
            if (st.surpriseBudget !== budget - CONSTANTS.SURPRISE.hotLaneCost) return false;
            sawHotSpend = true;
        } else if (st.surpriseBudget !== budget) return false;
    }
    return sawHotSpend;
})(), 'hot lane never charged, or charged wrongly');

// Boss stages get no surprise budget at all.
eq('R14 budget: boss stage gets zero budget', (() => {
    seedRng(77); st.currentStage = 6; st.bossDefeatedThisStage = false;
    st.player.state = 'idle'; st.health = 100; st.enemies = [];
    advanceStage(); // -> stage 7, a boss stage
    return st.surpriseBudget;
})(), 0);

// ---- submission gate (pure) ----
eq('R14 submit: 0-score stage-1 run is NOT submittable', records.isSubmittableRun({ score: 0, stage: 1 }), false);
eq('R14 submit: stage-1 run with score is NOT submittable', records.isSubmittableRun({ score: 500, stage: 1 }), false);
eq('R14 submit: 0-score deep run is NOT submittable', records.isSubmittableRun({ score: 0, stage: 9 }), false);
eq('R14 submit: real run IS submittable', records.isSubmittableRun({ score: 2240, stage: 3 }), true);
eq('R14 submit: null run is NOT submittable', records.isSubmittableRun(null), false);

// ---- online opt-in (defaults OFF) ----
localStorage.clear();
eq('R14 consent: online submission defaults to OFF', records.getOnlineOptIn(), false);
records.setOnlineOptIn(true);
eq('R14 consent: opt-in persists when enabled', records.getOnlineOptIn(), true);
records.setOnlineOptIn(false);
eq('R14 consent: opt-out persists when disabled', records.getOnlineOptIn(), false);
ok('R14 consent: alias still works alongside opt-in', (() => {
    records.setOnlineOptIn(true); records.setAlias('Mikey Lambo');
    return records.getAlias() === 'MIKEY LAMBO' && records.getOnlineOptIn() === true;
})(), 'alias/opt-in interfered');

// ---- report ----
console.log(`\n${'='.repeat(48)}`);
console.log(`PASSED ${passed} / ${passed + failed}`);
if (failed) { console.log('FAILED:'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
else { console.log('ALL GREEN ✓'); }
