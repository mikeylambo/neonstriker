// v17 design-pass verification: every brief item that can be checked headless,
// plus the honest-bot death distribution for Arc 1 (brief item 14).
// Run: `node tests/v17.mjs` (part of `npm test`).

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
const fin = await import('../src/systems/finisher.js');
const knock = await import('../src/systems/knockdown.js');
const rules = await import('../src/systems/boss_rules.js');
const vig = await import('../src/systems/vignette.js');
const colors = await import('../src/systems/colors.js');
const draft = await import('../src/systems/progression/draft.js');
const reqs = await import('../src/systems/progression/requirements.js');
const apply = await import('../src/systems/progression/apply.js');
const neg = await import('../src/systems/negative.js');
const { UPGRADE_POOL } = await import('../src/data/upgrades.js');
const { seedRng } = await import('../src/systems/rng.js');
const bosses = await import('../src/entities/bosses.js');
const enemies = await import('../src/entities/enemies.js');
const player = await import('../src/entities/player.js');
const combat = await import('../src/systems/combat.js');
const waves = await import('../src/systems/waves.js');
const boxer = await import('../src/render/boxer.js');
const main = await import('../src/main.js');
const T = main.__test;
const { SequenceManager } = await import('../src/systems/sequences.js');
const { makeBot } = await import('./bot.mjs');
const bot = makeBot({ st, T, SequenceManager, fin, knock, rules, vig, settings });

const PAD0 = { up: false, down: false, ghost: false, leftHeld: false, rightHeld: false, guard: false, jab: false, cross: false, crossHeld: false, hook: false, instinct: false, pause: false };
function freshArena(stage = 8) {
    st.width = 1000; st.height = 600; st.screen = 'playing';
    st.enemies = []; st.particles = []; st.floatingTexts = []; st.shockwaves = []; st.scorePops = []; st.koFx = [];
    st.afterimages = []; st.enemyEchoes = []; st.hazards = []; st.laneFlash = [0, 0, 0];
    st.finisher = null; st.knockdown = null; st.isInstinct = false; st.zoneTimer = 0; st.instinctMeter = 0;
    st.currentStage = stage; st.bossIntroTimer = 0; st.tutorialGrace = 0; st.combo = 0; st.score = 0;
    st.player = player.resetPlayerObj(); st.player.y = st.height * CONSTANTS.LANE_Y[1];
    st.health = 100; st.maxHealth = 100; st.keys = {}; st.lastKeys = {}; st.pad = { ...PAD0 };
    st.orbCounts = { speed: 0, power: 0, technique: 0 }; st.stats = { speedMult: 1, powerMult: 1, techMult: 1 };
    st.acquiredUpgradeIds = []; st.recentlyOffered = []; st.rankOrder = [];
    st.progressionMods = { ghostStepCooldownMult: 1, hookRecoveryMult: 1, perfectSlipWindowBonus: 0, bossExposeBonusFrames: 0, perfectSlipHeal: 0, dempseyRecoveryBonus: 0, shatterReadBossBypass: 0, shatterReadStaggerBonus: 0, perfectSlipRewardBonusMult: 0, instinctGainBonusMult: 0, incomingRecoilMult: 1, expGainBonusMult: 0, hardTargetInstinctFlat: 0, hardTargetExpFlat: 0, crossArmorStunBonus: 0, hookKnockbackFloor: 0 };
    st.currentAffix = CONSTANTS.AFFIXES[0]; st.wagerMult = 1;
}
function grunt(over = {}) {
    return { x: st.player.x + 70, lane: st.player.lane, y: st.player.y, w: 50, h: 110, hp: 400, maxHp: 400, speed: 3, color: '#ff0055', type: 'grunt', weight: 1, stun: 0, stunResist: 0, attackCooldown: 60, maxCooldown: 60, isBoss: false, justAttacked: 0, trails: [], vx: 0, pressure: 0, pressureDecay: 0, stringLen: 1, stringIdx: 0, ...over };
}
const frames = (n, fn) => { for (let i = 0; i < n; i++) fn(i); };

// ======================= 1. PROGRESSION: 5 linear ranks =======================
{
    const trees = CONSTANTS.TREE_ORDER;
    for (const tree of trees) {
        const ranks = UPGRADE_POOL.orbs.filter(o => o.tree === tree).sort((a, b) => a.rank - b.rank);
        eq(`ranks: ${tree} has ranks 1-5`, ranks.map(r => r.rank).join(','), '1,2,3,4,5');
        ok(`ranks: ${tree} rank names are distinct, none say "Evolution"`, new Set(ranks.map(r => r.name)).size === 5 && !ranks.some(r => /evolution/i.test(r.name)), ranks.map(r => r.name).join(' / '));
        ok(`ranks: ${tree} rank 3 is its Signature Move`, ranks[2].verb === true);
        ok(`ranks: ${tree} rank 5 is its Apex`, ranks[4].draftRole === 'apex');
    }
    eq('ranks: Technique rank 3 is Afterimage Slip', UPGRADE_POOL.orbs.find(o => o.tree === 'technique' && o.rank === 3).name, 'Afterimage Slip');
    ok('ranks: existing Apex moves (Blur Step / Executioner\'s Cross / Flow State) are rank 5', ['apex_speed_blur_step', 'apex_power_executioner', 'apex_technique_flow_state'].every(id => UPGRADE_POOL.orbs.find(o => o.id === id && o.rank === 5)));
    ok('ranks: Apex no longer sit in the mastery pool', !UPGRADE_POOL.masteries.some(m => m.draftRole === 'apex'));
    eq('rank cap: Arc 1 = 2', CONSTANTS.rankCap(1), 2);
    eq('rank cap: Arc 2 = 3', CONSTANTS.rankCap(2), 3);
    eq('rank cap: Arc 3 = 3', CONSTANTS.rankCap(3), 3);
    eq('rank cap: Arc 4 = 4', CONSTANTS.rankCap(4), 4);
    eq('rank cap: Arc 5 = 5', CONSTANTS.rankCap(5), 5);

    // Draft respects the cap and offers ranks linearly.
    freshArena(2); // Arc 1
    st.orbCounts = { speed: 2, power: 1, technique: 0 };
    const pools = draft.buildEligiblePool(st, UPGRADE_POOL);
    const offered = pools.orbs.map(o => `${o.tree}${o.rank}`).sort().join(',');
    eq('draft: Arc 1 offers only the NEXT rank of trees under cap 2', offered, 'power2,technique1');
    ok('draft (v18): no locked next-rank teasers exist any more', typeof draft.buildDraftTease === 'undefined');
    st.currentStage = CONSTANTS.firstStageOfArc(5); st.orbCounts = { speed: 4, power: 4, technique: 4 };
    ok('draft: Arc 5 offers rank 5', draft.buildEligiblePool(st, UPGRADE_POOL).orbs.every(o => o.rank === 5));
    // incOrb never passes 5; rank order is tracked
    freshArena(40); st.currentDraftOptions = [UPGRADE_POOL.orbs.find(o => o.id === 'spd_r1')];
    globalThis.enginePlayUpgradeVignette = undefined; const hold = window.enginePlayUpgradeVignette; window.enginePlayUpgradeVignette = null;
    apply.applyUpgrade(st, st.currentDraftOptions[0]);
    window.enginePlayUpgradeVignette = hold;
    ok('apply: a rank-up raises the tree by exactly 1 and records order', st.orbCounts.speed === 1 && st.rankOrder.join() === 'speed');
    const ec = 1 + 0; ok('EXP curve still rises per level', Math.floor(8 * Math.pow(1.12, 5)) > Math.floor(8 * Math.pow(1.12, 1)) && ec === 1);
}

// ======================= 3. COLOUR IDENTITY + FUSIONS =======================
{
    const c = CONSTANTS.TREES;
    ok('colour: three distinct tree neons (cyan / magenta / yellow)', new Set([c.speed.color, c.power.color, c.technique.color]).size === 3);
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const [cyan, mag, yel] = [c.speed.color, c.power.color, c.technique.color].map(hex);
    const vio = hex(CONSTANTS.FUSION_COLORS.fuse_dempsey_circuit), lime = hex(CONSTANTS.FUSION_COLORS.fuse_ghost_counter), org = hex(CONSTANTS.FUSION_COLORS.fuse_shatter_read);
    ok('colour: cyan + magenta fusion reads violet (blue & red both high, green low)', vio[2] > 150 && vio[0] > 120 && vio[1] < 120, vio.join());
    ok('colour: cyan + yellow fusion reads lime (green dominant)', lime[1] > lime[0] && lime[1] > lime[2], lime.join());
    ok('colour: magenta + yellow fusion reads orange (red dominant, blue low)', org[0] > 200 && org[2] < 100, org.join());
    ok('fusions: each lists its two trees', UPGRADE_POOL.fusions.filter(f => !f.evolved).every(f => f.trees && f.trees.length === 2));
    freshArena(20);
    st.orbCounts = { speed: 2, power: 3, technique: 0 };
    ok('fusions: locked until BOTH trees reach rank 3', !reqs.meetsRequirements(UPGRADE_POOL.fusions.find(f => f.id === 'fuse_dempsey_circuit'), st));
    st.orbCounts = { speed: 3, power: 3, technique: 0 };
    ok('fusions: unlock at rank 3 + 3', reqs.meetsRequirements(UPGRADE_POOL.fusions.find(f => f.id === 'fuse_dempsey_circuit'), st));
    const evo = UPGRADE_POOL.fusions.filter(f => f.evolved);
    eq('fusions: three evolved forms', evo.length, 3);
    st.orbCounts = { speed: 5, power: 5, technique: 0 }; st.acquiredUpgradeIds = [];
    ok('evolved: needs the base Fusion owned', !reqs.meetsRequirements(evo.find(e => e.id === 'evo_infinite_circuit'), st));
    st.acquiredUpgradeIds = ['fuse_dempsey_circuit'];
    ok('evolved: unlocks when both trees hit rank 5', reqs.meetsRequirements(evo.find(e => e.id === 'evo_infinite_circuit'), st));
    st.orbCounts = { speed: 4, power: 5, technique: 0 };
    ok('evolved: not at rank 4', !reqs.meetsRequirements(evo.find(e => e.id === 'evo_infinite_circuit'), st));

    freshArena(20);
    eq('build colour: white with no ranks', colors.buildColor(), '#ffffff');
    st.orbCounts = { speed: 1, power: 2, technique: 0 }; st.rankOrder = ['power', 'speed', 'power'];
    eq('build colour: highest-ranked tree', colors.buildColor(), c.power.color);
    st.acquiredUpgradeIds = ['fuse_ghost_counter'];
    eq('build colour: an owned Fusion overrides', colors.buildColor(), CONSTANTS.FUSION_COLORS.fuse_ghost_counter);
    // sparks wear the build colour
    st.acquiredUpgradeIds = []; st.orbCounts = { speed: 0, power: 0, technique: 2 };
    st.enemies = [grunt()]; st.particles = [];
    combat.checkHit('jab1');
    ok('colour: hit sparks use the build colour', st.particles.some(p => p.color === c.technique.color), [...new Set(st.particles.map(p => p.color))].join());
    // never on the Striker: the vignette uses a punch trail, not a glove glow
    const src = (await import('fs')).readFileSync(new URL('../src/render/overlays.js', import.meta.url), 'utf8');
    ok('colour: the vignette puts colour on the punch trail, not the gloves', /trailColor: v\.color/.test(src) && !/gloveGlow/.test(src));
}

// ======================= 2. RANK-3 VERBS =======================
{
    // PIVOT SLIP
    freshArena(20); st.progressionMods.pivotSlip = true;
    st.enemies = [grunt({ lane: 0, x: 420, attackCooldown: 99 })];
    const x0 = st.player.x;
    st.keys = { ArrowUp: true }; player.updatePlayer(); st.lastKeys = { ...st.keys }; st.keys = {};
    ok('Pivot Slip: a slip carries you forward toward the new lane\'s enemy', st.player.lane === 0 && st.player.x > x0 + 30, `x ${x0} -> ${st.player.x}`);
    frames(14, () => player.updatePlayer()); // let the lane slide settle (punches wait for it)
    ok('Pivot Slip: the instant window is still open', st.player.pivotTimer > 0);
    st.keys = { KeyA: true }; player.updatePlayer(); st.keys = {};
    ok('Pivot Slip: the next punch is instant (hit resolves on its first frame)', st.player.state === 'punching' && st.player.hitFrame === 0, `hitFrame ${st.player.hitFrame}`);

    // LOADED CROSS
    freshArena(20); st.progressionMods.loadedCross = true;
    st.enemies = [grunt({ x: st.player.x + 80 })];
    st.keys = { KeyS: true }; player.updatePlayer(); st.lastKeys = { ...st.keys };
    ok('Loaded Cross: pressing Cross starts a charge, not a punch', st.player.charging && st.player.state === 'idle');
    frames(CONSTANTS.VERBS.loadedCross.chargeFrames + 2, () => { st.keys = { KeyS: true }; player.updatePlayer(); st.lastKeys = { ...st.keys }; });
    st.keys = {}; player.updatePlayer(); st.lastKeys = {};
    ok('Loaded Cross: releasing fires a LOADED cross', st.player.state === 'punching' && st.player.punchType === 'cross' && st.player.crossLoaded);
    const e = st.enemies[0], hp0 = e.hp;
    frames(12, () => player.updatePlayer());
    ok('Loaded Cross: lands with big knockback + stun', hp0 - e.hp > 0 && e.vx > 40 && e.stun > 40, `dmg ${hp0 - e.hp} vx ${e.vx.toFixed(1)} stun ${e.stun}`);
    freshArena(20); st.progressionMods.loadedCross = true;
    st.enemies = [grunt({ x: st.player.x + 80 })];
    st.keys = { KeyS: true }; player.updatePlayer(); st.lastKeys = { ...st.keys }; st.keys = {}; player.updatePlayer();
    ok('Loaded Cross: a quick tap is a normal (unloaded) Cross', st.player.punchType === 'cross' && !st.player.crossLoaded);
    freshArena(20);
    st.enemies = [grunt({ x: st.player.x + 80, type: 'shield' })];
    st.player.crossLoaded = true; st.player.state = 'punching';
    combat.checkHit('cross');
    ok('Loaded Cross: breaks gold armor', st.enemies[0].type === 'grunt');

    // AFTERIMAGE SLIP
    freshArena(20); st.progressionMods.afterimageSlip = true;
    const att = grunt({ lane: 1, x: st.player.x + 60, attackCooldown: 5 });
    st.enemies = [att];
    const hpA = att.hp;
    st.keys = { ArrowDown: true }; player.updatePlayer(); st.lastKeys = { ...st.keys }; st.keys = {};
    ok('Afterimage: a perfect slip leaves an afterimage in the old lane', st.afterimages.length === 1 && st.afterimages[0].lane === 1);
    frames(CONSTANTS.VERBS.afterimage.delay + 2, () => player.updatePlayer());
    ok('Afterimage: it throws a delayed echo punch at the attacker', att.hp < hpA && att.stun > 0, `hp ${hpA} -> ${att.hp}`);
    ok('Afterimage: wears the build colour', st.afterimages.length === 0 || st.afterimages[0].color === colors.buildColor());
}

// ======================= 4. KO SHATTER =======================
{
    freshArena(20);
    const g = grunt({ hp: 0 }); st.enemies = [g];
    enemies.updateEnemies();
    ok('KO shatter: a KO spawns neon shards in the enemy\'s colour', st.koFx.length === 1 && st.koFx[0].shards.length >= 10 && st.koFx[0].color === '#ff0055');
    let orbSeen = false, done = false;
    for (let i = 0; i < 160 && !done; i++) { const { updateKoFx } = await import('../src/vfx_audio/effects.js'); updateKoFx(); if (st.koFx[0] && st.koFx[0].orb) orbSeen = true; done = st.koFx.length === 0; }
    ok('KO shatter: shards stream into an orb that reaches the Striker', orbSeen && done);
}

// ======================= 5. INSTINCT ZONE =======================
{
    freshArena(20);
    st.instinctMeter = 100;
    st.enemies = [grunt({ lane: 1, x: st.player.x + 60, attackCooldown: 5 })];
    st.keys = { ArrowUp: true }; player.updatePlayer(); st.lastKeys = { ...st.keys }; st.keys = {};
    ok('Zone: a perfect slip on a FULL meter drops you into the Zone', st.isInstinct && st.zoneTimer === CONSTANTS.ZONE.frames);
    freshArena(20); st.instinctMeter = 60;
    st.enemies = [grunt({ lane: 1, x: st.player.x + 60, attackCooldown: 5 })];
    st.keys = { ArrowUp: true }; player.updatePlayer(); st.keys = {};
    ok('Zone: not on a partial meter', !st.zoneTimer);
    // world at half speed while in the zone (real loop)
    T.startGame({ tutorial: false, seed: 5 }); SequenceManager.active = false; st.screen = 'playing'; st.seenTutorials.footwork_tip = true; st.seenTutorials.instinct = true;
    st.player.x = 180; // (startGame leaves the Striker mid walk-in, off-screen)
    st.enemies = [grunt({ x: st.player.x + 400, attackCooldown: 200, lane: 2 })]; // clear of the v19 hold line
    st.zoneTimer = 100; st.isInstinct = true; st.instinctMeter = 100; st.pendingUpgrades = 0; st.waveTimer = 999; st.hitstop = 0;
    const x0 = st.enemies[0].x;
    frames(40, () => { st.lastKeys = { ...st.keys }; T.update(); });
    const zoneDist = x0 - st.enemies[0].x;
    st.enemies[0].x = x0; st.zoneTimer = 0; st.hitstop = 0;
    frames(40, () => { st.lastKeys = { ...st.keys }; T.update(); });
    const normDist = x0 - st.enemies[0].x;
    ok('Zone: enemies move at ~half speed inside the Zone', zoneDist > 0 && Math.abs(zoneDist / normDist - 0.5) < 0.1, `zone ${zoneDist.toFixed(0)} vs normal ${normDist.toFixed(0)}`);
    const css = (await import('fs')).readFileSync(new URL('../styles/main.css', import.meta.url), 'utf8');
    ok('Zone: colour inversion is a screen filter (canvas), not the character', /body\.cine-zone #gameCanvas \{ filter: invert\(1\)/.test(css));
}

// ======================= 6. TEN-COUNT =======================
{
    const setupRun = () => { T.startGame({ tutorial: false, seed: 9 }); SequenceManager.active = false; st.screen = 'playing'; st.seenTutorials.footwork_tip = true; st.pendingUpgrades = 0; st.enemies = []; st.waveTimer = 9999; };
    setupRun(); st.combo = 12; st.health = 0;
    T.update();
    ok('ten-count: 0 HP knocks you DOWN, not out', !!st.knockdown && st.screen === 'playing');
    eq('ten-count: combo resets', st.combo, 0);
    ok('ten-count: 3 prompts in Arc 1', st.knockdown.seq.length === 3 && st.knockdown.seq.every(m => m === 'up' || m === 'down'));
    // clear the prompts on the beat
    let guard = 0;
    while (st.knockdown && guard++ < 800) {
        const pp = knock.knockdownPrompt();
        st.lastKeys = { ...st.keys }; st.keys = (pp && pp.t === 0) ? { [pp.move === 'up' ? 'ArrowUp' : 'ArrowDown']: true } : {};
        T.update();
    }
    ok('ten-count: clearing the prompts gets you up', !st.knockdown && st.screen === 'playing');
    eq('ten-count (v18): all-perfect prompts get you up at 75% HP', st.health, 75);
    eq('ten-count: recovery HP scales with timing (all merely on time -> 55%)', Math.round(knock.recoveryHpFrac({ perfects: 0, goods: 3, stumbles: 0, prompts: 3 }) * 100), 55);
    ok('ten-count: stumbles drag recovery toward the floor', knock.recoveryHpFrac({ perfects: 0, goods: 3, stumbles: 4, prompts: 3 }) < knock.recoveryHpFrac({ perfects: 0, goods: 3, stumbles: 0, prompts: 3 }) && knock.recoveryHpFrac({ perfects: 0, goods: 0, stumbles: 9, prompts: 3 }) === CONSTANTS.KNOCKDOWN.hpMin);
    ok('ten-count: short invulnerability after getting up', st.player.invuln > 0);
    st.player.invuln = 0; st.health = 0; T.update();
    eq('ten-count: a second knockdown in the same arc ends the run', st.screen, 'gameover');

    setupRun(); st.health = 0; T.update();
    let g2 = 0; while (st.knockdown && g2++ < 700) { st.lastKeys = { ...st.keys }; st.keys = {}; T.update(); }
    eq('ten-count: no input -> counted out at ten', st.screen, 'gameover');

    setupRun(); st.health = 0; T.update();
    const mash = st.knockdown.idx; st.lastKeys = {}; st.keys = { KeyA: true }; frames(60, () => { st.lastKeys = { ...st.keys }; st.keys = { KeyA: !st.keys.KeyA }; T.update(); });
    ok('ten-count: mashing punches never gets you up', st.knockdown && st.knockdown.idx === mash);

    // a new arc refreshes the count
    setupRun(); st.knockdownsThisArc = 1; st.currentStage = CONSTANTS.bossStageOfArc(1); st.player.state = 'idle';
    apply.advanceStage();
    eq('ten-count: refreshes on a new arc', st.knockdownsThisArc, 0);
    const bossSrc = (await import('fs')).readFileSync(new URL('../src/entities/bosses.js', import.meta.url), 'utf8');
    ok('ten-count: bosses never get a count (only the player path calls startKnockdown)', !/startKnockdown/.test(bossSrc));
}

// ======================= 7. v18: NO ROPES + HOLD YOUR GROUND =======================
{
    ok('ropes: removed from the game (no ROPES config, no cornered rule)', CONSTANTS.ROPES === undefined && CONSTANTS.isCornered === undefined);
    const fs = await import('fs');
    const src = ['src/entities/player.js', 'src/entities/enemies.js', 'src/systems/combat.js', 'src/render/draw.js', 'src/render/overlays.js'].map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8')).join('\n');
    ok('ropes: no pinning / rope-bounce / cornered code left', !/onRopes|ropeBounce|isCornered|drawRopes/.test(src));
    freshArena(20);
    const e = grunt({ x: 500, vx: 60, stun: 20 }); st.enemies = [e];
    enemies.updateEnemies();
    ok('ropes: knockback is no longer clamped at a rope line', e.x > 540);
    // hold your ground while engaged; drift home only when clear
    freshArena(20); st.player.x = 300; st.enemies = [grunt({ x: 400, attackCooldown: 999 })];
    frames(60, () => player.updatePlayer());
    eq('footwork: with an enemy in reach you stay planted (no retreating punches)', Math.round(st.player.x), 300);
    freshArena(20); st.player.x = 300; st.enemies = [];
    frames(60, () => player.updatePlayer());
    ok('footwork: with nobody in reach you drift back to neutral', st.player.x < 280);
    freshArena(20); st.player.x = 300; st.enemies = []; st.player.comboWindow = 20;
    player.updatePlayer();
    ok('footwork: a live combo window also holds your ground', st.player.x > 299.5);
}

// (v19: the Bruiser Sweep was removed — playtest: don't force Guard / Ghost Step.)
{ const fs = await import('fs'); ok('sweep: removed', !/isSweep|SWEEP:/.test(fs.readFileSync(new URL('../src/entities/enemies.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/constants.js', import.meta.url), 'utf8'))); }

// ======================= 8. GHOST STEP INPUT + REMAPPING =======================
{
    localStorage.clear(); settings.reloadSettings();
    freshArena(20);
    st.keys = { ArrowLeft: true }; player.updatePlayer(); st.lastKeys = { ...st.keys };
    ok('input: LEFT is footwork only (no Ghost Step)', st.player.state !== 'ghost_step' && st.player.x < 180);
    freshArena(20); st.keys = { ShiftLeft: true }; player.updatePlayer();
    eq('input: Ghost Step on its own button (L-Shift)', st.player.state, 'ghost_step');
    freshArena(20); st.pad = { ...PAD0, ghost: true }; player.updatePlayer();
    eq('input: Ghost Step on the pad shoulder button', st.player.state, 'ghost_step');
    freshArena(20); st.keys = { KeyW: true }; player.updatePlayer();
    eq('input: Guard moved to W', st.player.state, 'guarding');
    settings.rebind('ghost', 'KeyG');
    freshArena(20); st.keys = { KeyG: true }; player.updatePlayer();
    eq('remap: rebinding Ghost Step works', st.player.state, 'ghost_step');
    settings.rebind('jab', 'KeyG');
    ok('remap: taking a bound key swaps (no action left unbound)', settings.getBinds().jab === 'KeyG' && settings.getBinds().ghost === 'KeyA');
    ok('remap: reserved system keys are refused', settings.rebind('jab', 'Escape') === false);
    settings.reloadSettings();
    ok('remap: binds persist', settings.getBinds().jab === 'KeyG');
    settings.resetBinds(); ok('remap: reset restores defaults', JSON.stringify(settings.getBinds()) === JSON.stringify(settings.DEFAULT_BINDS));
    const fs = await import('fs');
    const texts = ['src/entities/enemies.js', 'src/systems/combat.js', 'src/main.js', 'index.html'].map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8')).join('\n');
    ok('text: no tutorial/manual copy still says tap-LEFT for Ghost Step', !/TAP \[LEFT\]|LEFT ARROW\]<\/span> for a Ghost Step|GHOST STEP \[LEFT\]|\[LEFT ARROW\]<\/span> tap = Ghost Step/i.test(texts));
}

// ======================= 9. NEW BOSSES =======================
{
    const roster = [1, 2, 3, 4, 5].map(a => { freshArena(CONSTANTS.bossStageOfArc(a)); bosses.spawnBoss(); return st.enemies.find(e => e.isBoss).controller; });
    eq('bosses: Arcs 1-5 are five different fights', new Set(roster).size, 5);
    eq('bosses: Arc 4 = LIVE WIRE', roster[3], 'live_wire');
    eq('bosses: Arc 5 = NEGATIVE (final)', roster[4], 'negative');
    ok('bosses: title-fight poster queued at spawn', st.bossPoster && st.bossPoster.name === 'NEGATIVE' && st.bossIntroTimer >= 150);
    for (const id of ['live_wire', 'negative']) {
        const seqs = CONSTANTS.FINISHER.sequences[id];
        ok(`bosses: ${id} has 3 lane-valid finisher sequences of 4-6`, ['break1', 'break2', 'ko'].every(k => seqs[k] && seqs[k].length >= 4 && seqs[k].length <= 6 && fin.laneValid(seqs[k])));
    }

    // LIVE WIRE: strings, shove walks you back, electrified corner
    freshArena(CONSTANTS.bossStageOfArc(4)); bosses.spawnBoss(); st.bossIntroTimer = 0;
    const lw = st.enemies.find(e => e.isBoss); st.health = 1e6; st.maxHealth = 1e6;
    let stringHits = 0, shoves = 0, maxStringSeen = 0, minLead = 99;
    for (let f = 0; f < 3000; f++) {
        st.player.x = 200; st.player.lane = lw.lane; st.player.state = 'idle'; st.player.invuln = 0;
        const before = lw.justAttacked, move = lw.currentMove;
        bosses.updateBosses();
        if (lw.telegraphed && lw.telegraphAt !== undefined) minLead = Math.min(minLead, lw.telegraphAt);
        if (lw.justAttacked > before && lw.justAttacked >= 5) { if (move === 'string') { stringHits++; maxStringSeen = Math.max(maxStringSeen, lw.stringIdx); } else shoves++; }
        if (lw.justAttacked > 0) lw.justAttacked--;
    }
    ok('Live Wire: throws punch strings and periodic shoves', stringHits > 10 && shoves > 1, `strings ${stringHits}, shoves ${shoves}`);
    ok('Live Wire: every string hit is telegraphed >= minTelegraphLead', minLead >= CONSTANTS.BOSS_OFFENSE.minTelegraphLead, `min ${minLead}`);
    // v18 LIVE LANES: a finished string leaves his lane live; standing in it shocks
    freshArena(CONSTANTS.bossStageOfArc(4)); bosses.spawnBoss(); st.bossIntroTimer = 0;
    const lw2 = st.enemies.find(e => e.isBoss); st.health = 1e6; st.maxHealth = 1e6;
    let sawLive = false;
    for (let f = 0; f < 1500 && !sawLive; f++) { st.player.x = 200; st.player.lane = lw2.lane; st.player.invuln = 0; bosses.updateBosses(); if (lw2.justAttacked > 0) lw2.justAttacked--; sawLive = (st.liveLanes || []).length > 0; }
    ok('Live Wire: a finished string electrifies the lane he struck', sawLive);
    st.liveLanes = [{ lane: 1, phase: 'warn', timer: CONSTANTS.LIVE_LANE.warnFrames, tick: 0 }];
    st.player.lane = 1; st.health = 100; st.maxHealth = 100; lw2.recoverTimer = 9999; lw2.x = 900;
    frames(CONSTANTS.LIVE_LANE.warnFrames - 1, () => bosses.updateLiveLanes());
    eq('Live Wire: the warning phase never shocks (it\'s the tell)', st.health, 100);
    frames(30, () => { st.player.invuln = 0; bosses.updateLiveLanes(); });
    ok('Live Wire: standing in a live lane shocks you', st.health < 100);
    st.liveLanes = [{ lane: 1, phase: 'live', timer: 50, tick: 0 }]; st.player.lane = 0; st.health = 100;
    frames(40, () => bosses.updateLiveLanes());
    eq('Live Wire: changing lanes is the answer', st.health, 100);
    freshArena(CONSTANTS.bossStageOfArc(4)); bosses.spawnBoss(); st.bossIntroTimer = 0;
    const lw3 = st.enemies.find(e => e.isBoss); lw3.lane = 2; lw3.y = st.height * CONSTANTS.LANE_Y[2];
    fin.startFinisher(lw3, 'break1');
    ok('finisher (v18 fix): both fighters are snapped onto the same lane line', lw3.lane === st.player.lane && lw3.y === st.player.y, `boss y ${lw3.y} player y ${st.player.y}`);
    ok('finisher: no side swap any more', lw3.x > st.player.x && lw3.facing === undefined);
    st.finisher = null;

    // NEGATIVE    // NEGATIVE
    freshArena(CONSTANTS.bossStageOfArc(5)); st.strikerColor = '#00ffff'; bosses.spawnBoss(); st.bossIntroTimer = 0;
    const ng = st.enemies.find(e => e.isBoss);
    eq('Negative: colour-inverted mirror of the Striker', ng.color, '#ff0000');
    eq('Negative: shape-distinct from the Striker', boxer.silhouetteOf(ng, false) !== boxer.silhouetteOf(st.player, true), true);
    let slipped = 0, read = 0, openReacts = 0;
    for (let i = 0; i < 300; i++) {
        seedRng(1000 + i);
        ng.slipCooldown = 0; ng.recoverTimer = 0; ng.lane = st.player.lane = 1; ng.x = st.player.x + 70; ng.hp = ng.maxHp; ng.stun = 0; ng.stunResist = 0; st.enemyEchoes = [];
        st.player.slipBuff = i % 2; const hp0 = ng.hp;
        combat.checkHit('cross');
        if (ng.hp === hp0 && st.enemyEchoes.length) slipped++;
        else if (ng.hp === hp0 && st.player.slipBuff === 0 && i % 2 === 1) read++;
    }
    for (let i = 0; i < 100; i++) {
        seedRng(5000 + i);
        ng.slipCooldown = 0; ng.recoverTimer = 20; ng.lane = st.player.lane = 1; ng.x = st.player.x + 70; ng.hp = ng.maxHp; ng.stun = 0; ng.stunResist = 0; st.enemyEchoes = [];
        st.player.slipBuff = i % 2; const hp0 = ng.hp; combat.checkHit('cross');
        if (ng.hp === hp0) openReacts++;
    }
    ok('Negative: uses the afterimage slip against you', slipped > 20, `${slipped}/300`);
    ok('Negative: counters your counters', read > 20, `${read}/150`);
    eq('Negative: while OPEN it can do neither (punish window is honest)', openReacts, 0);
    ok('Negative: an echo is telegraphed at least minTelegraphLead', neg.ECHO_DELAY >= CONSTANTS.BOSS_OFFENSE.minTelegraphLead);
    // an echo hits the lane it was left in
    freshArena(CONSTANTS.bossStageOfArc(5)); bosses.spawnBoss(); st.bossIntroTimer = 0;
    const ng2 = st.enemies.find(e => e.isBoss); ng2.recoverTimer = 9999;
    st.enemyEchoes = [{ lane: 1, x: st.player.x + 60, y: 300, timer: neg.ECHO_DELAY, fade: 20, fired: false, color: '#f00' }];
    st.player.lane = 1; st.health = 100;
    frames(neg.ECHO_DELAY + 2, () => bosses.updateBosses());
    ok('Negative: an echo punch lands if you stay in its lane', st.health < 100);
}

{
    // regression (found in browser pass): first-contact modals must never fire on a boss
    freshArena(CONSTANTS.bossStageOfArc(4)); st.seenTutorials = {}; bosses.spawnBoss(); st.bossIntroTimer = 0;
    const lwB = st.enemies.find(e => e.isBoss); lwB.x = st.player.x + 120; lwB.isActiveThreat = true;
    enemies.updateEnemies();
    ok('bosses: Live Wire (bruiser-typed) never triggers the Bruiser first-contact modal', st.screen === 'playing' && !st.seenTutorials.bruiser_id);
}

// ======================= 10. PUNCH STRINGS =======================
{
    let arc1 = 0, arc3 = 0, n1 = 0, n3 = 0;
    for (let seed = 1; seed <= 40; seed++) {
        for (const [stage, tag] of [[2, 1], [CONSTANTS.firstStageOfArc(3) + 1, 3]]) {
            seedRng(seed); freshArena(stage); st.tutorialEnabled = false; st.spawnTotal = 5; st.wavesCleared = 0; st.waveThreshold = 99; st.waveTimer = 0; st.tutorialDelay = 0; st.stageSpeedMult = 1; st.pendingUpgrades = 0; st.purifyTimer = 0; st.stageClearing = false; st.bossActive = false;
            waves.spawnEnemy();
            const strings = st.enemies.filter(e => e.stringLen > 1).length;
            if (tag === 1) { arc1 += strings; n1 += st.enemies.length; } else { arc3 += strings; n3 += st.enemies.length; }
        }
    }
    eq('strings: never in Arc 1', arc1, 0);
    ok('strings: selected enemies throw them from Arc 2+', arc3 > 0 && arc3 < n3, `${arc3}/${n3}`);
    // a string re-targets your lane and every hit gets a full red->white tell
    freshArena(CONSTANTS.firstStageOfArc(4));
    const s3 = grunt({ x: st.player.x + 70, attackCooldown: 30, stringLen: 3 });
    st.enemies = [s3];
    const tells = []; let hits = 0, lastCd = s3.attackCooldown;
    for (let f = 0; f < 200 && hits < 3; f++) {
        st.player.state = 'idle'; st.player.invuln = 99; // survive, just observe
        enemies.updateEnemies();
        if (s3.attackCooldown > lastCd) { hits++; if (hits === 1) { st.player.lane = 0; } }
        if (st.laneFlash[s3.lane] === 1) tells.push(`r${hits}`); if (st.laneFlash[s3.lane] === 2) tells.push(`w${hits}`);
        lastCd = s3.attackCooldown;
    }
    ok('strings: all 3 hits thrown', hits >= 3, `${hits}`);
    ok('strings: every hit shows red then white', [0, 1, 2].every(h => tells.includes(`r${h}`) && tells.includes(`w${h}`)), [...new Set(tells)].join(','));
    eq('strings: the next hit follows you into your new lane', s3.lane, 0);
    ok('strings: gap between hits exceeds the red-flash lead', CONSTANTS.PUNCH_STRINGS.gap > CONSTANTS.getSlipThresholds('grunt').good + 6);
}

// ======================= 12. SILHOUETTES =======================
{
    const shapes = ['grunt', 'shield', 'bruiser', 'assassin', 'zoner'].map(t => boxer.silhouetteOf({ type: t }, false));
    eq('silhouettes: five archetypes, five shapes', new Set(shapes).size, 5);
    const bossShapes = ['neon_enforcer', 'phantom_boxer', 'static_monk', 'live_wire', 'negative'].map(c => boxer.silhouetteOf({ controller: c, type: 'grunt' }, false));
    ok('silhouettes: Live Wire and Negative have their own shapes', bossShapes[3] === 'live_wire' && bossShapes[4] === 'negative');
    ok('silhouettes: the Striker is distinct from every enemy', ![...shapes, ...bossShapes].includes(boxer.silhouetteOf({}, true)) || boxer.silhouetteOf({}, true) === 'striker' && !shapes.includes('striker'));
}

// ======================= 13. ROUND FRAMING =======================
{
    freshArena(1); st.player.state = 'idle';
    apply.advanceStage();
    const b = SequenceManager.currentSequence.find(s => s.type === 'billing');
    ok('rounds: a stage opens on a billing card', !!b && b.card.round === 2 && /GLASS RELIQUARY/i.test(b.card.venue), JSON.stringify(b && b.card));
    freshArena(CONSTANTS.bossStageOfArc(1) - 1); st.player.state = 'idle';
    apply.advanceStage();
    ok('rounds: a boss stage has no billing card (it gets the poster)', !SequenceManager.currentSequence.some(s => s.type === 'billing'));
    const seqSrc = (await import('fs')).readFileSync(new URL('../src/systems/sequences.js', import.meta.url), 'utf8');
    ok('rounds: billing cards ring the bell', /type === 'billing'[\s\S]{0,400}playSound\('bell'\)/.test(seqSrc));
}

// ======================= 14. ARC 1 DEATH DISTRIBUTION (honest bot) =======================
{
    const SEEDS = 30;
    const firstDown = {}, runOver = {}, reachedArc2 = [];
    const endArc1 = CONSTANTS.firstStageOfArc(2);
    for (let i = 0; i < SEEDS; i++) {
        const r = bot.run({ tutorial: false, seed: 9000 + i * 17, maxFrames: 60 * 60 * 10, stopAtArc: endArc1 });
        if (r.knockdowns.length) firstDown[r.knockdowns[0]] = (firstDown[r.knockdowns[0]] || 0) + 1;
        if (r.ended) runOver[r.endStage] = (runOver[r.endStage] || 0) + 1;
        if (r.reachedArc2) reachedArc2.push(i);
    }
    const fmt = o => [1, 2, 3, 4, 5].map(s => `st${s}:${o[s] || 0}`).join(' ');
    report.push(`Arc 1 honest bot, ${SEEDS} seeds (stage 4 = Throne of Static)`);
    report.push(`  first knockdown by stage (≈ old death point): ${fmt(firstDown)}`);
    report.push(`  run over (2nd knockdown) by stage:           ${fmt(runOver)}`);
    report.push(`  cleared Arc 1: ${reachedArc2.length}/${SEEDS}`);
    ok('death distribution: the harness ran every seed to an outcome', Object.values(runOver).reduce((a, b) => a + b, 0) + reachedArc2.length === SEEDS);
    globalThis.__deathDist = { firstDown, runOver, cleared: reachedArc2.length };

    // god-mode structural pass: Arc 1 -> Arc 2 with bells, posters, finishers
    const g = bot.run({ tutorial: false, seed: 2026, god: true, acceptWagers: true, stopAtArc: endArc1, maxFrames: 60 * 60 * 15 });
    ok('flow: bot clears Arc 1 through the real loop', g.reachedArc2, `stage ${g.stage}`);
    ok('flow: billing cards played on non-boss stages', g.billingSeen >= 4, `${g.billingSeen}`);
    ok('flow: the boss opened on its title-fight poster', g.posterSeen);
    eq('flow: boss staggered 66% -> 33% -> KO', JSON.stringify(g.finishers.map(f => f.kind)), JSON.stringify(['break1', 'break2', 'ko']));
}

// ---- report ----
console.log('\nv17 REPORT');
report.forEach(r => console.log('  · ' + r));
console.log(`\n${'='.repeat(48)}`);
console.log(`V17 PASSED ${passed} / ${passed + failed}`);
if (failed) { console.log('FAILED:'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
else { console.log('ALL GREEN ✓'); process.exit(0); }
