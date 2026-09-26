// v16 playtest-pass verification. Same approach as harness.mjs: stub the browser,
// import the REAL modules (including main.js and its live update loop), and drive
// them. The second half runs a scripted bot through actual gameplay frames to
// verify pacing, the boss Finisher flow and the stage transitions end to end.
// Run: `node tests/v16.mjs` (part of `npm test`).

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
    globalThis.localStorage = {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: k => store.delete(k),
        clear: () => store.clear()
    };
})();

let passed = 0, failed = 0;
const fails = [];
function ok(name, cond, detail = '') { if (cond) passed++; else { failed++; fails.push(`${name}${detail ? ' — ' + detail : ''}`); } }
function eq(name, got, want) { ok(name, got === want, `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
const report = [];

const { CONSTANTS } = await import('../src/constants.js');
const { gameState: st } = await import('../src/state.js');
const waves = await import('../src/systems/waves.js');
const score = await import('../src/systems/score.js');
const wagers = await import('../src/systems/wagers.js');
const settings = await import('../src/systems/settings.js');
const fin = await import('../src/systems/finisher.js');
const rules = await import('../src/systems/boss_rules.js');
const vig = await import('../src/systems/vignette.js');
const draft = await import('../src/systems/progression/draft.js');
const { UPGRADE_POOL } = await import('../src/data/upgrades.js');
const { seedRng } = await import('../src/systems/rng.js');
const { spawnBoss, updateBosses } = await import('../src/entities/bosses.js');
const { updateEnemies } = await import('../src/entities/enemies.js');
const player = await import('../src/entities/player.js');
const main = await import('../src/main.js');
const T = main.__test;
const { SequenceManager } = await import('../src/systems/sequences.js');

// ======================= 1. ARC STRUCTURE / COUNTER-DESYNC GUARD =======================
eq('arc1: 5 stages (4 fights + boss)', CONSTANTS.arcLength(1), 5);
eq('arc1: boss is stage 5', CONSTANTS.bossStageOfArc(1), 5);
eq('arc2 starts at stage 6', CONSTANTS.firstStageOfArc(2), 6);
eq('arc2 boss at stage 12 (7 stages)', CONSTANTS.bossStageOfArc(2), 12);
{
    // Walk 80 stages: arc/level/palette/wave-table/name must agree at every stage,
    // and the boss flag must land exactly on the last stage of every arc.
    let desync = null;
    for (let s = 1; s <= 80 && !desync; s++) {
        const { arc, ordinal, levelKey } = CONSTANTS.locateStage(s);
        const isBoss = CONSTANTS.isBossStage(s);
        if (isBoss !== (ordinal === CONSTANTS.arcLength(arc))) desync = `boss flag off at stage ${s}`;
        if (isBoss !== (levelKey === 7)) desync = `level key/boss mismatch at ${s}`;
        if (CONSTANTS.getArcIndex(s) !== arc) desync = `arc index mismatch at ${s}`;
        const tableArc = Math.min(arc, 5);
        if (!isBoss && !waves.ARC_WAVE_TABLES[tableArc][levelKey]) desync = `no wave table for stage ${s} (arc ${arc} level ${levelKey})`;
        if (!CONSTANTS.ARC_STAGE_TABLES[tableArc][levelKey]) desync = `no stage name for stage ${s}`;
        if (!CONSTANTS.PALETTES[CONSTANTS.paletteKeyForStage(s)]) desync = `no palette for stage ${s}`;
        if (!CONSTANTS.STAGE_TAGLINES[levelKey]) desync = `no tagline for stage ${s}`;
        // difficulty scaling for Arc 2+ is exactly the old uniform layout
        if (arc >= 2 && CONSTANTS.difficultyStage(s) !== (arc - 1) * 7 + ordinal) desync = `difficulty drift at ${s}`;
        if (s > 1 && CONSTANTS.locateStage(s - 1).arc !== arc && ordinal !== 1) desync = `arc boundary wrong at ${s}`;
    }
    ok('arc structure: arc/level/boss/wave/palette/name stay aligned for 80 stages', !desync, desync || '');
}
eq('arc1 level keys are 1,2,3,6,boss', JSON.stringify(CONSTANTS.arcLevelKeys(1)), JSON.stringify([1, 2, 3, 6, 7]));
eq('arc1 stage 4 plays the composure exam (level 6)', CONSTANTS.getLevelInArc(4), 6);
eq('arc1 stage 4 scales like old stage 6', CONSTANTS.difficultyStage(4), 6);
{
    const a1 = waves.ARC_WAVE_TABLES[1];
    const counts = [1, 2, 3, 6].map(k => a1[k].packets.length);
    ok('arc1 compressed: every level has <= 4 packets', counts.every(c => c <= 4), JSON.stringify(counts));
    const a2 = waves.ARC_WAVE_TABLES[2];
    ok('arc2 still derives from the full base table (6 packets on level 6)', a2[6].packets.length === 6, `${a2[6].packets.length}`);
    const nonFinalBreathers = [1, 2, 3, 6].flatMap(k => a1[k].packets.slice(0, -1).map(p => p.find(e => !e.t).b));
    ok('arc1 compressed: mid-stage breathers <= 45f', nonFinalBreathers.every(b => b <= 45), JSON.stringify(nonFinalBreathers));
}

// ======================= 2. SCORE =======================
eq('combo mult: 0 combo = 1x', score.comboMultiplier(0), 1);
eq('combo mult: 5 combo = 1.25x', score.comboMultiplier(5), 1.25);
eq('combo mult: 12 combo = 1.5x', score.comboMultiplier(12), 1.5);
eq('combo mult caps at 4x', score.comboMultiplier(999), 4);
st.score = 0; st.combo = 10; st.wagerMult = 1.5;
eq('addScore applies combo x wager', score.addScore(100), Math.round(100 * 1.5 * 1.5));
eq('addScore noCombo applies wager only', score.addScore(100, undefined, undefined, { noCombo: true }), 150);
st.wagerMult = 1; st.combo = 0;
const R = CONSTANTS.SCORE.rank;
eq('rank: S', score.rankForRun({ score: R.S, slips: 9, bossKills: 2 }), 'S');
eq('rank: S with zero reads drops to B (S->A->B gates)', score.rankForRun({ score: R.S, slips: 0, bossKills: 2 }), 'B');
eq('rank: A', score.rankForRun({ score: R.A, slips: 3, bossKills: 1 }), 'A');
eq('rank: B', score.rankForRun({ score: R.B, slips: 0 }), 'B');
eq('rank: C', score.rankForRun({ score: R.B - 1, slips: 5 }), 'C');
eq('pb delta: first run', score.pbDeltaText(1000, null).kind, 'new');
eq('pb delta: up', score.pbDeltaText(1500, 1000).text, '+500 OVER YOUR BEST');
eq('pb delta: down', score.pbDeltaText(800, 1000).kind, 'down');

// ======================= 3. WAGERS =======================
const pool = CONSTANTS.wagerPool();
ok('wager pool: only risk modifiers, every one pays > 1x', pool.length === 4 && pool.every(a => a.scoreMult > 1), pool.map(a => a.name).join(','));
ok('wager pool: pure boons (SURGE/ADRENALINE) are never offered', !pool.some(a => a.name === 'SURGE' || a.name === 'ADRENALINE'));
eq('wager: never offered on stage 1', wagers.rollWagerOffer(1), null);
eq('wager: never offered on a boss stage', wagers.rollWagerOffer(CONSTANTS.bossStageOfArc(1)), null);
seedRng(99); const o1 = wagers.rollWagerOffer(3); seedRng(99); const o2 = wagers.rollWagerOffer(3);
ok('wager: offer is seeded (Daily-identical)', o1 && o2 && o1.name === o2.name);
st.wagerOffer = pool.find(a => a.name === 'IRON WALL'); wagers.acceptWager();
ok('wager accept: affix active + multiplier set', st.currentAffix.name === 'IRON WALL' && st.wagerMult === 1.3 && st.wagerOffer === null);
st.wagerOffer = pool[0]; wagers.declineWager();
ok('wager decline: stage runs clean', st.currentAffix.name === 'NONE' && st.wagerMult === 1 && st.wagerOffer === null);

// ======================= 4. SETTINGS / PROFILE =======================
localStorage.clear(); settings.reloadSettings();
eq('settings: defaults load', JSON.stringify(settings.getSettings()), JSON.stringify({ ...settings.SETTINGS_DEFAULTS, binds: settings.DEFAULT_BINDS }));
settings.setSetting('musicVolume', 0.2); settings.setSetting('hitStop', false); settings.setSetting('screenShake', 7);
settings.reloadSettings();
ok('settings: persist across reload', settings.getSettings().musicVolume === 0.2 && settings.getSettings().hitStop === false);
eq('settings: out-of-range values clamp', settings.getSettings().screenShake, 1);
settings.setSetting('reducedMotion', true);
ok('settings: reduced motion zeroes shake & halves flash', settings.shakeScale() === 0 && settings.flashScale() === 0.5);
settings.setSetting('bogusKey', 3);
ok('settings: unknown keys ignored', !('bogusKey' in settings.getSettings()));
eq('settings: sanitize junk', JSON.stringify(settings.sanitizeSettings('nope')), JSON.stringify({ ...settings.SETTINGS_DEFAULTS, binds: settings.DEFAULT_BINDS }));
localStorage.clear(); settings.reloadSettings();
const apply = await import('../src/systems/progression/apply.js');
eq('arc1 theme line: shown on the first run of a save', apply.openingSubtitle(), CONSTANTS.ARC_LAWS[1].theme);
eq('arc1 theme line: never again after that', apply.openingSubtitle(), CONSTANTS.STAGE_TAGLINES[1]);
{
    // ...and no stage card repeats it either.
    seedRng(5); st.currentStage = 1; st.player = player.resetPlayerObj(); st.maxHealth = 100; st.health = 100;
    let repeated = false;
    for (let i = 0; i < 12; i++) {
        apply.advanceStage();
        if (SequenceManager.currentSequence.some(s => (s.type === 'text' && s.subtitle === CONSTANTS.ARC_LAWS[1].theme) || (s.type === 'billing' && s.card.tagline === CONSTANTS.ARC_LAWS[1].theme))) repeated = true;
    }
    ok('arc1 theme line: no stage card repeats it', !repeated);
}

// ======================= 5. VIGNETTE (v18: holds for input, lists stacked picks) =======================
eq('vignette: first view builds for 70 frames', vig.vignetteDuration('x', false), 70);
eq('vignette: repeat view builds faster', vig.vignetteDuration('x', true), 36);
{
    localStorage.clear();
    let done = 0;
    const u = UPGRADE_POOL.orbs[0];
    vig.playUpgradeVignette(u, () => done++);
    eq('vignette: first pick plays the full build', st.vignette.duration, 70);
    ok('vignette: the pick key can\'t dismiss it on its first frames', vig.skipVignette() === false && st.vignette && !st.vignette.holding);
    for (let i = 0; i < 20; i++) vig.updateVignette();
    ok('vignette: a press during the build jumps to the finished screen (not out)', vig.skipVignette() === false && st.vignette.holding && done === 0);
    ok('vignette: a second press continues', vig.skipVignette() === true && done === 1 && st.vignette === null);
    vig.playUpgradeVignette(u, () => done++);
    for (let i = 0; i < 400; i++) vig.updateVignette();
    ok('vignette: it never times out on its own — it waits for input', st.vignette && st.vignette.holding && done === 1);
    vig.skipVignette();
    const picks = [UPGRADE_POOL.orbs[0], UPGRADE_POOL.fusions[0], UPGRADE_POOL.masteries[0]];
    vig.playUpgradeVignette(picks, () => done++);
    ok('vignette: a stacked chain lists every pick', st.vignette.picks.length === 3);
    eq('vignette: the rarest pick is the hero', st.vignette.upgrade.id, UPGRADE_POOL.fusions[0].id);
    for (let i = 0; i < 20; i++) vig.updateVignette(); vig.skipVignette(); vig.skipVignette();
    eq('vignette: fusion wears its mixed colour', vig.upgradeColor(UPGRADE_POOL.fusions[0]), CONSTANTS.FUSION_COLORS[UPGRADE_POOL.fusions[0].id]);
    eq('vignette: mastery wears its tree colour', vig.upgradeColor(UPGRADE_POOL.masteries.find(m => m.tree === 'power')), CONSTANTS.TREES.power.color);
}

// ======================= 6. DRAFT: three cards, nothing locked (v18) =======================
{
    st.acquiredUpgradeIds = []; st.orbCounts = { speed: 2, power: 2, technique: 0 }; st.recentlyOffered = []; st.currentStage = 2;
    const d = draft.buildDraft(st, UPGRADE_POOL);
    eq('draft: exactly three options', d.length, 3);
    ok('draft: no locked / teaser cards', !d.some(o => o.locked) && typeof draft.buildFusionTease === 'undefined');
    ok('draft: nothing offered above the arc cap', !d.some(o => o.kind === 'rank' && o.rank > CONSTANTS.rankCap(1)));
}

// ======================= 7. FINISHER DATA =======================
{
    const F = CONSTANTS.FINISHER;
    const bosses = Object.keys(F.sequences);
    let allValid = true, lengthsOk = true;
    const sigs = new Set();
    for (const b of bosses) for (const k of ['break1', 'break2', 'ko']) {
        const seq = F.sequences[b][k];
        if (!fin.laneValid(seq)) allValid = false;
        if (seq.length < 4 || seq.length > 6) lengthsOk = false;
        if (!seq.every(p => fin.FINISHER_INPUTS.includes(p))) allValid = false;
        sigs.add(seq.join(','));
    }
    ok('finisher: every sequence stays inside the lanes from mid', allValid);
    ok('finisher: every sequence is 4-6 prompts', lengthsOk);
    eq('finisher: all 15 sequences are unique (5 bosses x 3 staggers)', sigs.size, bosses.length * 3);
    ok('finisher: KO sequences are the longest (6)', bosses.every(b => F.sequences[b].ko.length === 6));
    eq('laneValid rejects an out-of-ring path', fin.laneValid(['up', 'up']), false);
}

// ======================= 8. BOSS OFFENSE AUDIT (sim) =======================
function bossArena(arcBossStage) {
    st.width = 1000; st.height = 600; st.screen = 'playing';
    st.enemies = []; st.particles = []; st.floatingTexts = []; st.shockwaves = []; st.scorePops = [];
    st.laneFlash = [0, 0, 0]; st.hazards = []; st.finisher = null; st.isInstinct = false;
    st.currentStage = arcBossStage; st.bossIntroTimer = 0; st.combo = 0;
    st.player = player.resetPlayerObj(); st.player.y = st.height * CONSTANTS.LANE_Y[1];
    st.health = 1e9; st.maxHealth = 1e9;
    spawnBoss(); st.bossIntroTimer = 0;
    return st.enemies.find(e => e.isBoss);
}
{
    const results = [];
    let minLead = Infinity, noOpen = 0, attackedWhileOpen = 0, impacts = 0;
    for (let arc = 1; arc <= 6; arc++) {
        for (const desperate of [false, true]) {
            seedRng(arc * 31 + (desperate ? 7 : 0));
            const boss = bossArena(CONSTANTS.bossStageOfArc(arc));
            boss.desperation = desperate;
            let lastTellAt = null;
            for (let f = 0; f < 2400; f++) {
                // keep the striker parked in range and in the boss's lane (worst case)
                st.player.x = 180; st.player.lane = boss.lane; st.player.state = 'idle';
                const wasOpen = rules.isBossOpen(boss);
                const before = boss.justAttacked;
                updateBosses();
                if (boss.telegraphed && lastTellAt === null) lastTellAt = boss.telegraphAt;
                if (boss.justAttacked > before && boss.justAttacked >= 5) {
                    impacts++;
                    if (wasOpen) attackedWhileOpen++;
                    minLead = Math.min(minLead, lastTellAt === null ? -1 : lastTellAt);
                    // Live Wire's mid-string hits flow straight into the next (each fully
                    // telegraphed); the string as a whole ends in a punish window.
                    const midString = boss.controller === 'live_wire' && (boss.stringIdx || 0) > 0;
                    if (boss.controller !== 'static_monk' && !midString && !(boss.recoverTimer > 0)) noOpen++;
                    lastTellAt = null;
                }
                if (boss.justAttacked > 0) boss.justAttacked--;
            }
            results.push(`${boss.controller}@arc${arc}${desperate ? '+desp' : ''}`);
        }
    }
    ok('boss audit: every attack was telegraphed >= minTelegraphLead frames ahead', minLead >= CONSTANTS.BOSS_OFFENSE.minTelegraphLead, `min lead ${minLead} over ${impacts} impacts`);
    eq('boss audit: every melee attack opens a punish window', noOpen, 0);
    eq('boss audit: a boss never attacks while OPEN', attackedWhileOpen, 0);
    ok('boss audit: sim covered many impacts across all bosses/arcs/desperation', impacts > 200, `${impacts}`);
    report.push(`boss audit: ${impacts} impacts, min telegraph lead ${minLead}f (${results.length} configs)`);
}
{
    // Stepping out of range mid-windup re-winds the attack: no untold hit on return.
    seedRng(3);
    const boss = bossArena(CONSTANTS.bossStageOfArc(1));
    boss.x = 300; st.player.x = 180;
    let tells = 0;
    for (let f = 0; f < 90; f++) { st.player.lane = boss.lane; updateBosses(); if (boss.telegraphed) tells++; }
    st.player.x = 20; boss.x = 400; // step way back
    for (let f = 0; f < 60; f++) updateBosses();
    ok('boss audit: out of range, a wound-up attack re-winds (never stored)', boss.attackCooldown > rules.telegraphLead(boss) && !boss.telegraphed, `cd ${boss.attackCooldown}`);
}
{
    // Punish window: OPEN disables Enforcer recoil and boosts damage.
    const combat = await import('../src/systems/combat.js');
    seedRng(4);
    const boss = bossArena(CONSTANTS.bossStageOfArc(1));
    // (post first Cross: the Enforcer's gold guard is already broken, so jabs connect)
    boss.type = 'grunt'; boss.phase = 2; boss.x = st.player.x + 60; boss.lane = st.player.lane = 1; boss.stunResist = 0;
    boss.recoverTimer = 0;
    const hp0 = boss.hp; const hpP = st.health;
    combat.checkHit('jab1');
    ok('punish: jabbing an ARMORED, non-open Enforcer recoils', st.health < hpP && boss.hp === hp0, `hp ${st.health - hpP}`);
    boss.recoverTimer = 30; const hp1 = boss.hp; const hpP2 = st.health;
    combat.checkHit('jab1');
    ok('punish: jabbing it while OPEN lands full (+25%) with no recoil', st.health === hpP2 && hp1 - boss.hp === Math.round(15 * CONSTANTS.BOSS_OFFENSE.punishDamageMult), `dmg ${hp1 - boss.hp}`);
}

// ======================= 9. FINISHER (behavioural) =======================
function pressFor(move) {
    const code = { up: 'ArrowUp', down: 'ArrowDown', jab: 'KeyA', cross: 'KeyS', hook: 'KeyD' }[move];
    st.keys = { [code]: true };
}
function runFinisher(policy, maxFrames = 800) {
    // policy(pp) -> move to press this frame or null
    let frames = 0;
    while (st.finisher && frames < maxFrames) {
        st.lastKeys = { ...st.keys }; st.keys = {};
        const pp = fin.promptProgress();
        const mv = pp ? policy(pp, st.finisher) : null;
        if (mv) pressFor(mv);
        fin.updateFinisher();
        frames++;
    }
    st.keys = {}; st.lastKeys = {};
    return frames;
}
const perfectPolicy = pp => (pp.t === 0 ? pp.move : null);
{
    const combat = await import('../src/systems/combat.js');
    seedRng(8);
    const boss = bossArena(CONSTANTS.bossStageOfArc(1));
    boss.hp = boss.maxHp * 0.70; boss.x = st.player.x + 60; boss.lane = st.player.lane; boss.stunResist = 0; boss.recoverTimer = 20;
    combat.checkHit('cross'); // crosses the 66% line
    ok('finisher: crossing 66% clamps damage exactly at the line', Math.abs(boss.hp - boss.maxHp * 0.66) < 0.01, `${(boss.hp / boss.maxHp).toFixed(3)}`);
    eq('finisher: stagger 1 is queued', boss.pendingFinisher, 'break1');
    updateBosses();
    ok('finisher: stagger 1 starts from updateBosses', st.finisher && st.finisher.kind === 'break1');
    const hpBefore = boss.hp, pHp = st.health;
    const scoreBefore = st.score;
    runFinisher(perfectPolicy);
    ok('finisher: perfect play lands every prompt', st.statFinishersClean >= 1);
    ok('finisher: a full break deals ~14% max HP', Math.abs((hpBefore - boss.hp) / boss.maxHp - CONSTANTS.FINISHER.breakDamageFrac) < 0.005, `${((hpBefore - boss.hp) / boss.maxHp).toFixed(3)}`);
    ok('finisher: a full break never skips the next threshold', boss.hp > boss.maxHp * 0.33);
    ok('finisher: pays out score', st.score > scoreBefore + 1500);
    eq('finisher: player takes no damage during it', st.health, pHp);
    ok('finisher: world resumes (boss recovers, not dead)', !st.finisher && boss.hp > 0 && boss.attackCooldown > rules.telegraphLead(boss));

    // Mashing: pressing the right move far ahead of the beat ends it — no penalty.
    boss.hp = boss.maxHp * 0.34; boss.pendingFinisher = null;
    boss.x = st.player.x + 60; boss.lane = st.player.lane; boss.stunResist = 0; boss.recoverTimer = 20;
    combat.checkHit('cross'); updateBosses();
    ok('finisher: stagger 2 at 33%', st.finisher && st.finisher.kind === 'break2');
    const hpM = boss.hp, pHpM = st.health;
    runFinisher((pp, f) => pp.move); // mash the right key every frame
    ok('finisher: mashing ends the stagger early (TOO EARLY)', st.finisher === null && boss.hp === hpM);
    eq('finisher: ...with no extra penalty', st.health, pHpM);

    // Wrong input ends it too.
    // KO: a lethal hit opens the KO finisher; boss dies when it ends — even on a miss.
    boss.hp = 5; boss.x = st.player.x + 60; boss.lane = st.player.lane; boss.stunResist = 0; boss.recoverTimer = 20;
    combat.checkHit('cross');
    eq('KO: a lethal blow leaves 1 HP and queues the KO finisher', boss.hp, 1);
    updateEnemies(); // removal loop must NOT kill it yet
    ok('KO: boss is not removed before its finisher', st.enemies.includes(boss));
    updateBosses();
    ok('KO: KO finisher starts', st.finisher && st.finisher.kind === 'ko');
    runFinisher(() => null); // do nothing — miss
    ok('KO: missing still ends in the KO', boss.koDone === true && boss.hp === 0);
    const killsBefore = st.statBossKills;
    updateEnemies();
    ok('KO: defeat resolves after the finisher', !st.enemies.includes(boss) && st.statBossKills === killsBefore + 1 && st.bossDefeatedThisStage);
}
{
    // Non-punch damage (bowling collateral) can't skip a stagger either.
    seedRng(9);
    const boss = bossArena(CONSTANTS.bossStageOfArc(2));
    boss.hp = boss.maxHp * 0.2; // jumped past both lines in one go
    updateBosses();
    ok('finisher: safety net catches a skipped threshold', !!st.finisher);
    st.finisher = null;
}

// ======================= 10. GHOST STEP =======================
{
    st.width = 1000; st.height = 600;
    st.enemies = []; st.floatingTexts = []; st.scorePops = [];
    st.player = player.resetPlayerObj(); st.player.y = st.height * CONSTANTS.LANE_Y[1];
    st.combo = 7; st.statMaxCombo = 7; st.keys = { ShiftLeft: true }; // v17: Ghost Step's own button st.lastKeys = {}; st.pad = { up: false, down: false, left: false, guard: false, jab: false, cross: false, hook: false, instinct: false, pause: false };
    player.updatePlayer();
    eq('ghost step: dashing never resets the combo', st.combo, 7);
    eq('ghost step: player is dashing', st.player.state, 'ghost_step');
    // A melee grunt swings into the dash: a PERFECT ghost step, +1 combo, once.
    st.enemies = [{ x: st.player.x + 40, lane: 1, y: st.player.y, w: 50, h: 110, hp: 45, maxHp: 45, speed: 3, color: '#f05', type: 'grunt', weight: 1, stun: 0, stunResist: 0, attackCooldown: 1, maxCooldown: 60, isBoss: false, justAttacked: 0, trails: [], vx: 0, pressure: 0, pressureDecay: 0 }];
    st.tutorialGrace = 0; st.bossIntroTimer = 0; st.keys = {}; st.lastKeys = {};
    const hp0 = st.health = 100;
    updateEnemies();
    eq('ghost step: evading a live attack is a perfect ghost step (+1 combo)', st.combo, 8);
    eq('ghost step: took no damage', st.health, hp0);
    player.registerPerfectGhostStep();
    eq('ghost step: +1 counts once per dash', st.combo, 8);
}

// ======================= 11. BOT PLAYTHROUGH (real update loop) =======================
// A scripted player: slips on white, punches what's in its lane, walks toward the
// nearest enemy, answers every modal. Crude — but it drives the actual game loop.
const LANE_KEYS = { up: 'ArrowUp', down: 'ArrowDown' };
function laneThreat(lane) {
    return st.enemies.some(e => e.lane === lane && e.x > st.player.x - 20 && e.x - st.player.x < 150 && e.attackCooldown <= 26 && e.stun <= 0) || st.laneFlash[lane] > 0 || st.hazards.some(h => h.lane === lane);
}
function botKeys(tick, opts) {
    const keys = {};
    const p = st.player;
    const f = st.finisher;
    if (f) { const pp = fin.promptProgress(); if (pp && pp.t === (opts.finisherOffset || 0)) keys[{ up: 'ArrowUp', down: 'ArrowDown', jab: 'KeyA', cross: 'KeyS', hook: 'KeyD' }[pp.move]] = true; return keys; }
    if (SequenceManager.active) return keys;
    const dummy = st.enemies.find(e => e.tutorialType);
    if (dummy && dummy.tutorialType === 'guard' && dummy.x - p.x < 160) { keys.KeyW = true; return keys; }
    if (dummy && dummy.tutorialType === 'ghost_step') { if (dummy.lane === p.lane && dummy.x - p.x < 100 && dummy.attackCooldown <= 10) keys.ShiftLeft = true; return keys; }
    const zap = st.enemies.find(e => e.type === 'zoner' && e.lane === p.lane && e.x > p.x - 20 && Math.abs(e.x - p.x) < 500 && e.attackCooldown > 0 && e.attackCooldown <= 12 && e.stun <= 0);
    if (zap && p.slipCooldown <= 0) {
        const safe = [p.lane - 1, p.lane + 1].filter(l => l >= 0 && l <= 2 && !st.enemies.some(e => e.type === 'zoner' && e.lane === l && e.attackCooldown <= 14));
        if (safe.length && tick % 2 === 0) { keys[safe[0] < p.lane ? 'ArrowUp' : 'ArrowDown'] = true; return keys; }
    }
    if (p.dangerLevel >= 2 || (st.laneFlash[p.lane] > 0 && !st.enemies.some(e => e.lane === p.lane && e.x - p.x < 120 && e.isBoss && rules.isBossOpen(e)))) {
        if (p.slipCooldown <= 0 && tick % 2 === 0) {
            const opts2 = [p.lane - 1, p.lane + 1].filter(l => l >= 0 && l <= 2).sort((a, b) => laneThreat(a) - laneThreat(b));
            if (opts2.length) keys[opts2[0] < p.lane ? 'ArrowUp' : 'ArrowDown'] = true;
        }
        return keys;
    }
    // teaching dummies that only want a slip — don't punch into them
    if (dummy && dummy.tutorialType === 'slip') {
        // wait for the WHITE flash (perfect window), like the modal says
        const cd = dummy.attackCooldown, perfect = CONSTANTS.getSlipThresholds(dummy.type).perfect;
        if (dummy.lane === p.lane && Math.abs(dummy.x - p.x) < 130 && cd > 0 && cd <= perfect && p.slipCooldown <= 0) keys[p.lane > 0 ? 'ArrowUp' : 'ArrowDown'] = true;
        return keys;
    }
    const inLane = st.enemies.filter(e => e.lane === p.lane && e.x > p.x - 20 && e.x - p.x < 112).sort((a, b) => a.x - b.x)[0];
    if (inLane) {
        if (tick % 3 === 0) {
            if (inLane.type === 'shield' || inLane.tutorialType === 'shield') keys.KeyS = true;
            else keys[(tick / 3) % 4 === 3 ? 'KeyS' : 'KeyA'] = true;
        }
        return keys;
    }
    // v19: enemies hold a line (zoners at range) — press forward to reach them
    const ahead = st.enemies.filter(e => e.lane === p.lane && e.x > p.x && e.x - p.x >= 112 && e.x - p.x < 520 && e.hp > 0).sort((a, b) => a.x - b.x)[0];
    if (ahead && !laneThreat(p.lane)) keys.ArrowRight = true;
    const target = st.enemies.filter(e => e.x > p.x - 20).sort((a, b) => a.x - b.x)[0];
    if (target && target.lane !== p.lane && p.slipCooldown <= 0 && tick % 6 === 0 && !laneThreat(target.lane < p.lane ? p.lane - 1 : p.lane + 1)) {
        keys[target.lane < p.lane ? 'ArrowUp' : 'ArrowDown'] = true;
    }
    return keys;
}

function botRun(opts) {
    localStorage.clear(); settings.reloadSettings();
    T.startGame({ tutorial: !!opts.tutorial, seed: opts.seed || 1234 });
    const log = { firstDraftFrame: null, stageFrames: {}, stageStart: 0, finishers: [], wagersSeen: 0, reachedArc2: false, frames: 0, bossFightFrames: null, bossStart: null, transitionsSeen: 0, sweepSeen: false, walkoutSeen: false };
    let stage = st.currentStage;
    for (let tick = 0; tick < (opts.maxFrames || 60 * 60 * 12); tick++) {
        log.frames = tick;
        if (opts.god) { st.health = 100; }
        if (st.screen === 'tutorial') { main.__test && window.dismissTutorial(); }
        if (T.posterWaiting()) T.confirmPoster();
        else if (st.screen === 'upgrading') {
            if (log.firstDraftFrame === null) log.firstDraftFrame = tick;
            window.engineApplyUpgradeState(st.currentDraftOptions[0].id);
        }
        else if (st.screen === 'wager') { log.wagersSeen++; T.resolveWager(!!opts.acceptWagers); }
        else if (st.screen === 'gameover') break;
        if (st.finisher && !log.finishers.includes(st.finisher) ) { log.finishers.push(st.finisher); }
        if (SequenceManager.active) {
            const step = SequenceManager.currentSequence[SequenceManager.stepIndex];
            if (step && step.type === 'sweep') log.sweepSeen = true;
            if (step && step.type === 'walkout') log.walkoutSeen = true;
        }
        if (st.bossActive && log.bossStart === null) log.bossStart = tick;
        if (!st.bossActive && log.bossStart !== null && log.bossFightFrames === null && st.statBossKills > 0) log.bossFightFrames = tick - log.bossStart;

        st.lastKeys = { ...st.keys };
        st.keys = st.screen === 'playing' ? botKeys(tick, opts) : {};
        if (st.screen === 'vignette') {
            // let vignettes play out naturally
        }
        // one frame of the real loop
        if (st.screen === 'vignette') { vig.updateVignette(); if (st.vignette && st.vignette.holding) vig.skipVignette(); }
        T.update();
        if (st.currentStage !== stage) { log.stageFrames[stage] = tick - log.stageStart; log.stageStart = tick; stage = st.currentStage; log.transitionsSeen++; }
        if (CONSTANTS.getArcIndex(st.currentStage) >= 2) { log.reachedArc2 = true; if (opts.stopAtArc2 && !SequenceManager.active) break; }
    }
    log.score = st.score; log.stage = st.currentStage; log.health = st.health; log.kills = st.statTotalKills; log.slips = st.statTotalSlips;
    return log;
}

{
    // (a) Pacing: first Evolution drafted within ~30s of play (tutorial off). The
    // stage-1 opening card + footwork tip count as time here, so this is conservative.
    const times = [11, 22, 33, 44, 55].map(seed => botRun({ tutorial: false, seed, maxFrames: 60 * 60 }).firstDraftFrame);
    ok('pacing: first Evolution draft within 30s (tutorial off, 5 seeds)', times.every(t => t !== null && t <= 30 * 60), JSON.stringify(times.map(t => t === null ? null : +(t / 60).toFixed(1))));
    report.push(`first draft (s, tutorial off): ${times.map(t => t === null ? 'none' : (t / 60).toFixed(1)).join(', ')}`);

    const tut = botRun({ tutorial: true, seed: 7, maxFrames: 60 * 90 });
    ok('pacing: with the tutorial on, the first draft lands right after it', tut.firstDraftFrame !== null && tut.firstDraftFrame <= 60 * 60, `${tut.firstDraftFrame}`);
    report.push(`first draft (s, tutorial on): ${tut.firstDraftFrame === null ? 'none' : (tut.firstDraftFrame / 60).toFixed(1)}`);
}
{
    // (b) Full Arc 1 in god mode: every stage transitions (walk-out + sweep), wagers
    // are offered, the boss staggers at 66% and 33% and ends on a KO finisher.
    const g = botRun({ tutorial: false, seed: 2026, god: true, acceptWagers: true, stopAtArc2: true, maxFrames: 60 * 60 * 15 });
    ok('arc1 run: bot reaches Arc 2 through the real loop', g.reachedArc2, `stage ${g.stage} after ${(g.frames / 60).toFixed(0)}s`);
    ok('arc1 run: stage transitions walk out + light-sweep (no hard cut)', g.walkoutSeen && g.sweepSeen);
    ok('arc1 run: wagers offered on non-boss stages', g.wagersSeen >= 3, `${g.wagersSeen}`);
    const kinds = g.finishers.map(f => f.kind);
    ok('arc1 run: boss staggered at 66%, 33%, then KO', JSON.stringify(kinds) === JSON.stringify(['break1', 'break2', 'ko']), JSON.stringify(kinds));
    ok('arc1 run: bot landed its finisher prompts on the beat', g.finishers.every(f => f.result === 'clean'), JSON.stringify(g.finishers.map(f => f.result)));
    const arc1Secs = Object.entries(g.stageFrames).filter(([s]) => +s <= 5).map(([s, fr]) => `${s}:${(fr / 60).toFixed(0)}s`);
    report.push(`arc 1 stage durations (god bot, incl. transitions): ${arc1Secs.join(' ')}`);
    report.push(`arc 1 boss fight: ${g.bossFightFrames === null ? 'n/a' : (g.bossFightFrames / 60).toFixed(0) + 's'}; score at arc 2: ${g.score.toLocaleString()}`);
    const total = Object.entries(g.stageFrames).filter(([s]) => +s <= 5).reduce((a, [, fr]) => a + fr, 0);
    ok('arc1 run: whole arc (4 fights + boss) under ~6 minutes for the bot', total < 60 * 360, `${(total / 60).toFixed(0)}s`);
}
{
    // (c) SCORE CALIBRATION — honest (mortal) bot across seeds. Reported, and the
    // rank ladder sanity-checked against it: a crude bot should not reach S.
    const runs = [101, 202, 303, 404, 505, 606].map(seed => botRun({ tutorial: false, seed, maxFrames: 60 * 60 * 20 }));
    const scores = runs.map(r => r.score);
    report.push(`honest bot runs: ${runs.map(r => `st${r.stage}/${r.score.toLocaleString()}/${score.rankForRun({ score: r.score, slips: r.slips, bossKills: 0 })}`).join('  ')}`);
    const early = runs.filter(r => r.stage <= CONSTANTS.bossStageOfArc(1));
    ok('score calibration: dying inside Arc 1 never ranks above B', early.every(r => ['B', 'C'].includes(score.rankForRun({ score: r.score, slips: r.slips, bossKills: 0 }))), JSON.stringify(early.map(r => r.score)));
    const deep = runs.filter(r => r.stage >= CONSTANTS.firstStageOfArc(3));
    ok('score calibration: deep Arc 3 runs clear the A line', deep.every(r => r.score >= CONSTANTS.SCORE.rank.A), JSON.stringify(deep.map(r => r.score)));
    ok('score calibration: the bot scores something every run', scores.every(s => s > 0), JSON.stringify(scores));
}

// ======================= 12. PAUSE MENU LOGIC =======================
{
    T.startGame({ tutorial: false, seed: 1 });
    SequenceManager.active = false; st.screen = 'playing';
    T.openPause();
    eq('pause: opens to paused', st.screen, 'paused');
    T.closePause();
    eq('pause: resumes', st.screen, 'playing');
    st.finisher = { phase: 'prompts' };
    // pause is refused mid-finisher via the key handler; openPause itself is guarded by screen only
    st.finisher = null;
}

// ---- report ----
console.log('\nv16 REPORT');
report.forEach(r => console.log('  · ' + r));
console.log(`\n${'='.repeat(48)}`);
console.log(`V16 PASSED ${passed} / ${passed + failed}`);
if (failed) { console.log('FAILED:'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
else { console.log('ALL GREEN ✓'); process.exit(0); }
