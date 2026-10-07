import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { playSound } from '../vfx_audio/audio.js';
import { createImpact, spawnFloatingText, doFlash, triggerShockwave, createShatter, showToast } from '../vfx_audio/effects.js';
import { takeDamage, registerPerfectGhostStep } from './player.js';
import { random } from '../systems/rng.js';
import { setMusicIntensity } from '../vfx_audio/audio.js';
import { telegraphLead, beginPunishWindow, clampCycle } from '../systems/boss_rules.js';
import { checkBossThresholds, startFinisher } from '../systems/finisher.js';
import { invertHex, ECHO_DELAY, primeNegativeRead } from '../systems/negative.js';
import { getBinds } from '../systems/settings.js';

// v24 BOSS TTK: playtest — Enforcer and Phantom "felt easy", Negative ran ~2.6 min
// against everyone else's 45-80s. Enforcer 1.0 -> 1.15, Phantom 0.75 -> 0.9,
// Negative 1.2 -> 1.0 (its phases + read telegraph carry the length now).
const BOSS_ROSTER = [
    {
        name: 'NEON ENFORCER',
        color: '#ffaa00',
        controller: 'neon_enforcer',
        type: 'shield',
        weight: 2.0,
        speed: 1.2,
        cooldown: 60,
        baseHpMult: 1.15,
        startMove: 'jab'
    },
    {
        name: 'PHANTOM BOXER',
        color: '#aa00ff',
        controller: 'phantom_boxer',
        type: 'assassin',
        weight: 1.5,
        speed: 2.5,
        cooldown: 40,
        baseHpMult: 0.9,
        startMove: 'feint'
    },
    {
        name: 'STATIC MONK',
        color: '#00ff00',
        controller: 'static_monk',
        type: 'zoner',
        weight: 1.2,
        speed: 1.0,
        cooldown: 120,
        baseHpMult: 0.85,
        startMove: 'laser'
    },
    // v17: the rotation no longer repeats inside Arcs 1-5.
    {
        name: 'LIVE WIRE',
        color: '#ffe14d',
        controller: 'live_wire',
        type: 'bruiser',
        weight: 2.2,
        speed: 1.7,
        cooldown: 50,
        baseHpMult: 1.05,
        startMove: 'string'
    },
    {
        name: 'NEGATIVE',
        color: '#ff0000', // replaced at spawn with the inverse of the Striker's colour
        controller: 'negative',
        type: 'grunt',
        weight: 1.3,
        speed: 2.2,
        cooldown: 44,
        baseHpMult: 1.0,
        startMove: 'jab'
    }
];
export const BOSS_ROSTER_IDS = BOSS_ROSTER.map(b => b.controller);

// A lone Grunt add summoned by the Static Monk's Arc 3+ recharge (summonSupportPressure).
// Uses the same stat/scaling shape as a normal wave Grunt so it reads as a familiar
// threat, and enters off the right edge so it's always slippable/beatable on arrival.
function spawnMonkAdd() {
    let hp = Math.floor(60 * CONSTANTS.enemyHpMult(st.currentStage)); // v23: matches the wave Grunt
    let lane = Math.floor(random() * 3);
    st.enemies.push({
        x: st.width + 60, lane, y: st.height * CONSTANTS.LANE_Y[lane],
        w: 50, h: 110, hp, maxHp: hp, speed: 3.0 * (st.stageSpeedMult || 1),
        color: '#ff0055', type: 'grunt', weight: 1, stun: 0, stunResist: 0,
        attackCooldown: 60, maxCooldown: 60, isBoss: false,
        justAttacked: 0, trails: [], trailTimer: 0, vx: 0, pressure: 0, pressureDecay: 0
    });
    spawnFloatingText(st.width - 120, st.height * 0.2, "SUPPORT INBOUND", "#00ff00");
}

export function spawnBoss() {
    st.bossActive = true;
    st.bossIntroTimer = 180; // v17: title-fight poster
    st.posterConfirmed = false;
    st.shake = 15;
    playSound('bash_tell');
    setMusicIntensity(1);

    // HP scales off the stage's DIFFICULTY position (the old uniform 7-per-arc
    // layout), so moving Arc 1's boss earlier doesn't shift every later boss.
    let baseHp = CONSTANTS.bossHp(st.currentStage); // v20: +15%/Arc, capped (was +100 per stage, uncapped)

    const rawArcIndex = CONSTANTS.getArcIndex(st.currentStage);
    const bossIndex = (rawArcIndex - 1) % BOSS_ROSTER.length;
    const template = { ...BOSS_ROSTER[bossIndex] };
    if (template.controller === 'negative') template.color = invertHex(st.strikerColor || '#00ffff');

    st.bossThemeColor = template.color;
    st.bossIntroText = template.name;
    // v17 ROUND FRAMING: the boss stage opens on a title-fight poster.
    const arcData = CONSTANTS.ARC_STAGE_TABLES[Math.min(rawArcIndex, 5)] || {};
    st.bossPoster = {
        name: template.name, controller: template.controller, color: template.color, arc: rawArcIndex,
        tagline: (CONSTANTS.BOSS_BILLING[template.controller] || {}).tagline || '',
        venue: (arcData[7] && arcData[7].stageName) || 'Boss Chamber', round: st.currentStage
    };
    playSound('bell');

    // --- MACRO PLUMBING: Inject scaling behavioral traits based on current Arc ---
    const arcMods = CONSTANTS.getBossArcMods(template.controller, rawArcIndex);

    st.enemies.push({
        name: template.name,
        controller: template.controller,
        x: st.width - 150,
        lane: 1,
        y: st.height * CONSTANTS.LANE_Y[1],
        w: template.type === 'shield' ? 60 : 50,
        h: template.type === 'shield' ? 140 : 130,
        hp: baseHp * template.baseHpMult,
        maxHp: baseHp * template.baseHpMult,
        speed: template.speed,
        color: template.color,
        type: template.type,
        weight: template.weight,
        phase: 1,
        currentMove: template.startMove,
        lastMove: null,
        stun: 0,
        stunResist: 0,
        attackCooldown: template.cooldown,
        maxCooldown: template.cooldown,
        isBoss: true,
        pressure: 0,
        pressureDecay: 0,
        justAttacked: 0,
        trails: [],
        trailTimer: 0,
        bossMashCount: 0,
        mashDecay: 0,
        hitstunScaling: 0,
        stunDecay: 0,
        shiftWarning: 0,
        shiftCooldown: 0,
        vx: 0,
        exposedTimer: 0,
        desperation: false,
        enraged: false,
        targetLanes: [],
        decoyTimer: 0, decoyLane: -1, decoyRolledThisCycle: false,
        // v16 offense audit + finisher bookkeeping
        telegraphed: false, recoverTimer: 0, recoverMax: 0, punishShown: false, feintSwitched: false,
        finisherStage: 0, pendingFinisher: null, koDone: false,
        stringIdx: 0, stringsThrown: 0, shockTimer: 0, slipCooldown: 0,
        arcMods: arcMods // Assigned directly to the entity!
    });
}

// Resolves a melee boss connect. Bosses are no longer processed by the generic
// enemy attack loop, so damage/evade handling lives here.
function resolveBossStrike(en, rawDmg, isHeavy) {
    if (en.lane !== st.player.lane) return;
    if (Math.abs(en.x - st.player.x) > 100) return;

    if (st.player.state === 'ghost_step') {
        spawnFloatingText(st.player.x, st.player.y - 50, "GHOST STEP", "#888888");
        registerPerfectGhostStep();
        if (st.progressionMods.ghostCounter && st.player.slipBuff === 0) {
            st.player.slipBuff = 1; playSound('perfect_slip');
            spawnFloatingText(st.player.x, st.player.y - 80, "GHOST COUNTER!", "#ffffff");
        }
        return;
    }
    let dmg = st.isInstinct ? Math.floor(rawDmg * 0.5) : rawDmg;
    // v19 COUNTER HIT: swinging into a boss that isn't OPEN gets you caught — the
    // mash-fest answer. Heavy boss blows floor you even when they're not counters.
    const counter = st.player.state === 'punching' || st.player.state === 'recovery';
    if (counter) dmg = Math.round(dmg * CONSTANTS.PLAYER_HIT.counterHitMult);
    takeDamage(dmg, isHeavy || counter, en, { floor: isHeavy || counter, counter });
}

// Desperation used to double-decrement the cooldown on even-numbered runs only,
// which could step straight over an `=== N` telegraph frame (the attack landed
// with no tell). It now shortens the CYCLE instead; telegraphs are untouched.
function nextCycle(en, frames) {
    const mult = en.desperation ? CONSTANTS.BOSS_OFFENSE.desperationCooldownMult : 1;
    return clampCycle(frames * mult);
}

// Shared telegraph gate for melee bosses. Out of range, a wound-up attack is
// re-wound (never stored up to land the instant you step back in untold).
function meleeTelegraph(en, inRange, onTell) {
    const lead = telegraphLead(en);
    if (!inRange) {
        if (en.attackCooldown <= lead) { en.attackCooldown = lead + 6; en.telegraphed = false; }
        return;
    }
    if (!en.telegraphed && en.attackCooldown <= lead) {
        en.telegraphed = true;
        en.telegraphAt = en.attackCooldown; // read by the harness: frames of warning given
        onTell();
    }
}

// v24 ENFORCER SLAM (playtest: Enforcer "felt easy"). Every few attacks — or
// whenever you hang back out of reach — he plants and slams the floor: a
// shockwave rolls down YOUR lane toward you (a tell you can watch travel). In
// phase 2 a second wave follows in a neighbouring lane a beat later. After the
// slam he's planted and OPEN.
const SLAM = { every: 3, farFrames: 75, speed: 8, dmg: 20, phase2Gap: 22 };
function enforcerSlam(en) {
    const p = st.player;
    if (!st.slamWaves) st.slamWaves = [];
    st.slamWaves.push({ lane: p.lane, x: en.x - 20, delay: 0, hit: false, color: '#ffaa00' });
    if (en.phase === 2) {
        const adj = p.lane === 1 ? (random() < 0.5 ? 0 : 2) : 1;
        st.slamWaves.push({ lane: adj, x: en.x - 20, delay: SLAM.phase2Gap, hit: false, color: '#ffaa00' });
    }
    st.shake = Math.max(st.shake, 18); createImpact(en.x, en.y - 10, '#ffaa00'); triggerShockwave(en.x, en.y - 10, '#ffaa00');
    playSound('hit'); spawnFloatingText(en.x, en.y - 160, 'SLAM!', '#ffaa00');
}

export function updateSlamWaves() {
    if (!st.slamWaves || !st.slamWaves.length) return;
    const p = st.player;
    for (const w of st.slamWaves) {
        if (w.delay > 0) { w.delay--; continue; }
        w.x -= SLAM.speed;
        const d = w.x - p.x;
        if (d < 260 && d > -30) st.laneFlash[w.lane] = Math.max(st.laneFlash[w.lane], d < 70 ? 2 : 1);
        if (p.lane === w.lane && d < 260 && d > 0) p.dangerLevel = Math.max(p.dangerLevel, d < 70 ? 2 : 1);
        if (!w.hit && Math.abs(d) < 24) {
            w.hit = true;
            if (p.lane === w.lane) {
                if (p.state === 'ghost_step') { spawnFloatingText(p.x, p.y - 50, 'EVADED', '#888888'); registerPerfectGhostStep(); }
                else takeDamage(st.isInstinct ? SLAM.dmg / 2 : SLAM.dmg, true, null, { src: 'neon_enforcer' });
            }
        }
    }
    st.slamWaves = st.slamWaves.filter(w => w.x > -60);
}

function handleNeonEnforcer(en) {
    if (en.recoverTimer > 0) { en.recoverTimer--; return; } // OPEN — punish it
    en.attackCooldown--;
    // v24: hanging back out of reach earns a slam instead of a free walk-down.
    en.farFrames = Math.abs(en.x - st.player.x) > 160 ? (en.farFrames || 0) + 1 : 0;
    if (en.currentMove !== 'slam' && (en.farFrames > SLAM.farFrames || (en.attacksSinceSlam || 0) >= SLAM.every)) {
        en.currentMove = 'slam'; en.attackCooldown = Math.max(en.attackCooldown, telegraphLead(en) + 8); en.telegraphed = false; en.farFrames = 0;
    }
    if (en.currentMove === 'slam') {
        const lead = telegraphLead(en);
        if (!en.telegraphed && en.attackCooldown <= lead) { en.telegraphed = true; en.telegraphAt = en.attackCooldown; playSound('bash_tell'); createImpact(en.x, en.y - 90, '#ffaa00'); }
        if (en.attackCooldown <= 0) {
            en.justAttacked = 8; en.attacksSinceSlam = 0;
            enforcerSlam(en);
            en.currentMove = random() < 0.5 ? 'jab' : 'bash';
            en.maxCooldown = nextCycle(en, 60); en.attackCooldown = en.maxCooldown;
            beginPunishWindow(en, 'bash');
        }
        return;
    }

    // Moves relentlessly forward unless executing a plant-move
    if (en.currentMove !== 'bash' && en.x > st.player.x + 100) {
        en.x -= (en.speed * 0.5 * en.arcMods.walkDownMult);
    }

    const inRange = Math.abs(en.x - st.player.x) < 140 && en.stun <= 0;
    meleeTelegraph(en, inRange, () => {
        playSound(en.currentMove === 'bash' ? 'bash_tell' : 'jab_tell');
        if (en.currentMove === 'bash') createImpact(en.x, en.y - 60, '#ffaa00');
    });

    if (inRange && en.attackCooldown <= 0) {
        en.justAttacked = 5;
        const struck = en.currentMove;
        resolveBossStrike(en, struck === 'bash' ? 30 : 12, struck === 'bash');
        en.attacksSinceSlam = (en.attacksSinceSlam || 0) + 1;
        if (en.enraged) {
            en.currentMove = 'bash';
            en.enraged = false;
            en.maxCooldown = nextCycle(en, 55);
        } else {
            let roll = random();
            if (en.phase === 1) {
                en.currentMove = roll > 0.6 ? 'bash' : 'jab';
                en.maxCooldown = nextCycle(en, en.currentMove === 'bash' ? 70 : 45);
            } else {
                en.currentMove = roll > 0.5 ? 'bash' : 'jab';
                en.maxCooldown = nextCycle(en, en.currentMove === 'bash' ? 55 : 35);
            }
        }
        en.attackCooldown = en.maxCooldown;
        beginPunishWindow(en, struck);
    }
}

// v22 PHANTOM SHIFT, proactive (playtest: "did the assassin boss lose its
// teleport?"). The old shift only fired when you mashed it 4x while it wasn't
// OPEN inside a 20-frame window — which v19's counter hits punish, so clean play
// never saw it. Now, when its OPEN window closes after every few attacks (sooner
// in OVERDRIVE), it vanishes and re-materialises in another lane, backed off out
// of reach, with a full telegraph still owed before its next strike.
const PHANTOM_SHIFT = { every: 3, everyOverdrive: 2, backOff: 250 };
function phantomShift(en) {
    en.attacksSinceShift = 0; st.phantomClones = [];
    const oldX = en.x, oldY = en.y;
    if (en.trails) { en.trails.push({ x: oldX, y: oldY, lane: en.lane, opacity: 0.7 }); if (en.trails.length > 5) en.trails.shift(); }
    createShatter(oldX, oldY - 60, '#aa00ff');
    playSound('ghost_step');
    const otherLanes = [0, 1, 2].filter(l => l !== en.lane);
    const pinch = (en.arcMods && en.arcMods.lanePinchBias) || 0;
    en.lane = random() < pinch
        ? otherLanes.reduce((a, b) => Math.abs(b - st.player.lane) < Math.abs(a - st.player.lane) ? b : a)
        : otherLanes[Math.floor(random() * otherLanes.length)];
    en.y = st.height * CONSTANTS.LANE_Y[en.lane];
    en.x = Math.min(st.width - 120, st.player.x + PHANTOM_SHIFT.backOff);
    en.attackCooldown = Math.max(en.attackCooldown, telegraphLead(en) + 20);
    en.telegraphed = false; en.feintSwitched = false; en.decoyRolledThisCycle = false; en.decoyTimer = 0;
    createImpact(en.x, en.y - 60, '#aa00ff');
    spawnFloatingText(en.x, en.y - 150, 'PHANTOM SHIFT', '#aa00ff');
}

function handlePhantomBoxer(en) {
    if (en.recoverTimer > 0) { // OPEN — punish it
        if (--en.recoverTimer === 0 && (en.attacksSinceShift || 0) >= (en.phase === 2 ? PHANTOM_SHIFT.everyOverdrive : PHANTOM_SHIFT.every)) phantomShift(en);
        return;
    }
    en.attackCooldown--;

    if (en.x > st.player.x + 100) {
        en.x -= en.speed;
    }

    // ARC MUTATION (was authored, never read): at Arc 4-5, Phantom Boxer sometimes
    // flashes a decoy lane that isn't actually under threat, baiting a wasted slip.
    // Delivers on Arc 4's own copy ("tells become less literal") using data that
    // was already sitting in constants.js unused.
    if (en.arcMods.fakeLaneFlash && !en.decoyRolledThisCycle && Math.abs(en.x - st.player.x) < 140 &&
        en.attackCooldown <= Math.floor(28 * en.arcMods.punishWindowMult)) {
        en.decoyRolledThisCycle = true;
        if (random() < 0.45) {
            const otherLanes = [0, 1, 2].filter(l => l !== en.lane);
            en.decoyLane = otherLanes[Math.floor(random() * otherLanes.length)];
            en.decoyTimer = 16;
        }
    }
    if (en.decoyTimer > 0) {
        en.decoyTimer--;
        st.laneFlash[en.decoyLane] = Math.max(st.laneFlash[en.decoyLane], en.decoyTimer < 6 ? 2 : 1);
    }

    // ARC MUTATION (afterimageThreat, was authored, never read): at Arc 4-5 the
    // Phantom's trailing afterimage reads as a faint threat of its own — its lane
    // throws a low decoy flash, but only early (>20 frames out), so it always
    // clears before the real perfect-slip window and can only bait a wasted read.
    if (en.arcMods.afterimageThreat && en.trails && en.trails.length > 0 && en.attackCooldown > 20) {
        const ghost = en.trails[0];
        if (ghost && ghost.lane !== undefined && ghost.lane !== en.lane) {
            st.laneFlash[ghost.lane] = Math.max(st.laneFlash[ghost.lane], 1);
        }
    }

    const inRange = Math.abs(en.x - st.player.x) < 140 && en.stun <= 0;
    meleeTelegraph(en, inRange, () => {
        playSound(en.currentMove === 'feint' ? 'feint_tell' : 'jab_tell');
        // v24 CLONES (Phantom "felt easy"): the windup splits into afterimage
        // clones in the other lanes, mirroring it. Only the real one casts a
        // shadow; punching a clone shatters it and wastes the swing.
        const n = en.phase === 2 ? 2 : (random() < 0.5 ? 1 : 0);
        const lanes = [0, 1, 2].filter(l => l !== en.lane).sort(() => random() - 0.5).slice(0, n);
        st.phantomClones = lanes.map(lane => ({ lane, life: 1 }));
        if (n && !st.seenCloneHint) { st.seenCloneHint = true; showToast('ONLY THE REAL ONE CASTS A SHADOW', '#aa00ff'); }
    });
    if (st.phantomClones && st.phantomClones.length) st.phantomClones = st.phantomClones.filter(c => c.lane !== en.lane); // the real one can't share a lane with a fake

    if (inRange) {
        // The feint's lane-snap now happens a readable beat before impact (was 12
        // frames — 9 at Arc 5 — which left almost nothing to react to).
        if (en.currentMove === 'feint' && !en.feintSwitched && en.attackCooldown <= Math.max(14, Math.floor(16 * en.arcMods.punishWindowMult))) {
            en.feintSwitched = true;
            en.lane = st.player.lane;
            en.y = st.height * CONSTANTS.LANE_Y[en.lane];
            createImpact(en.x, en.y - 60, '#aa00ff');
        }

        if (en.attackCooldown <= 0) {
            en.justAttacked = 5;
            const struck = en.currentMove;
            resolveBossStrike(en, 15, false);
            if (st.phantomClones && st.phantomClones.length) { st.phantomClones.forEach(c => createShatter(en.x, st.height * CONSTANTS.LANE_Y[c.lane] - 60, '#aa00ff')); st.phantomClones = []; }
            en.attacksSinceShift = (en.attacksSinceShift || 0) + 1;
            en.decoyRolledThisCycle = false; en.decoyTimer = 0; en.feintSwitched = false;
            let roll = random();
            if (en.phase === 1) {
                en.currentMove = roll > 0.5 ? 'feint' : 'jab';
                en.maxCooldown = nextCycle(en, en.currentMove === 'feint' ? 45 : 30);
            } else {
                if (en.lastMove === 'feint') en.currentMove = 'jab';
                else en.currentMove = roll > 0.2 ? 'feint' : 'jab';
                en.maxCooldown = nextCycle(en, en.currentMove === 'feint' ? 35 : 26);
            }
            en.lastMove = en.currentMove;
            en.attackCooldown = en.maxCooldown;
            beginPunishWindow(en, struck === 'feint' ? 'feint' : 'jab');
        }
    }
}

function handleStaticMonk(en) {
    en.attackCooldown--;

    if (en.currentMove === 'recharge') {
        // OPEN for the whole recharge: it hovers right in front of you.
        en.x = st.player.x + 100;
        if (en.attackCooldown <= 0) {
            en.currentMove = 'laser';
            en.x = st.width - 150;
            en.attackCooldown = nextCycle(en, 100);
            en.telegraphed = false;
            playSound('ghost_step');
            createShatter(en.x, en.y - 60, '#00ff00');
        }
    } else {
        en.x = (st.width - 150) + Math.sin(Date.now() * 0.002) * 50;
        // v24 VOLLEYS (playtest: "Static Monk most fun boss... evolve his battle with
        // staggered grenade timing and mixing in his attack patterns"). Each volley
        // is a set of items with their OWN fuse, so lanes can land at different beats:
        //   pair    two lanes, same beat (the v23 volley)
        //   stagger two lanes, the second lands a beat later — don't dodge early
        //   sweep   (hurt) all three lanes in order — follow the gap behind it
        //   quick   (hurt) one fast canister in your lane
        //   beam    (hurt) his old straight laser down your lane: a line, not a grenade
        if (!en.volley && en.attackCooldown <= MONK.lead) startMonkVolley(en);
        if (en.volley) updateMonkVolley(en);
    }
}

const MONK = { lead: 80, staggerGap: 26, sweepGap: 24, quickFuse: 55, beamFuse: 50 };

function startMonkVolley(en) {
    const p = st.player, hurt = en.hp <= en.maxHp * 0.5;
    const adj = p.lane === 1 ? (random() > 0.5 ? 0 : 2) : 1;
    const patterns = hurt ? ['pair', 'stagger', 'sweep', 'quick', 'beam'] : ['pair', 'stagger'];
    let kind = patterns[Math.floor(random() * patterns.length)];
    if (kind === en.lastVolley && patterns.length > 1) kind = patterns[(patterns.indexOf(kind) + 1) % patterns.length]; // never the same twice running
    en.lastVolley = kind;
    const can = (lane, fuse) => ({ kind: 'canister', lane, fuse, t: 0, x0: en.x - 30, x: en.x - 30, spin: 0 });
    let items;
    if (kind === 'pair') items = [can(p.lane, MONK.lead), can(adj, MONK.lead)];
    else if (kind === 'stagger') items = [can(p.lane, MONK.lead), can(adj, MONK.lead + MONK.staggerGap)];
    else if (kind === 'sweep') { const order = random() < 0.5 ? [0, 1, 2] : [2, 1, 0]; items = order.map((l, i) => can(l, MONK.lead + i * MONK.sweepGap)); }
    else if (kind === 'quick') items = [can(p.lane, MONK.quickFuse)];
    else items = [{ kind: 'beam', lane: p.lane, fuse: MONK.beamFuse, t: 0, x0: en.x - 30, x: en.x - 30 }];
    en.volley = { kind, items };
    st.canisters = items;
    en.targetLanes = items.map(i => i.lane);
    en.telegraphed = true; en.telegraphAt = Math.min(...items.map(i => i.fuse));
    en.attackCooldown = 99999; // the volley owns the clock until it's spent
    playSound('zoner_tell');
    if (kind !== 'pair') spawnFloatingText(en.x - 20, en.y - 150, { stagger: 'STAGGERED', sweep: 'SWEEP', quick: 'QUICK', beam: 'BEAM' }[kind], '#00ff00');
}

function updateMonkVolley(en) {
    const p = st.player, v = en.volley;
    for (const it of v.items) {
        it.t++;
        const left = it.fuse - it.t;
        if (it.kind === 'canister') { const tx = p.x + 20; it.x = tx + (it.x0 - tx) * Math.max(0, left / it.fuse); it.spin += 0.25; }
        st.laneFlash[it.lane] = Math.max(st.laneFlash[it.lane], left <= 15 ? 2 : 1);
        if (p.lane === it.lane) p.dangerLevel = Math.max(p.dangerLevel, left <= 15 ? 2 : 1);
        if (left <= 0) monkDetonate(en, it);
    }
    v.items = v.items.filter(it => it.t < it.fuse);
    st.canisters = v.items;
    // ARC MUTATION (deceptiveOrder, Arc 4-5): the safe lane throws an early, low
    // decoy flash that always clears well before anything lands.
    if (en.arcMods.deceptiveOrder && v.items.length && v.items.every(it => it.fuse - it.t > 45)) {
        const safe = [0, 1, 2].find(l => !v.items.some(it => it.lane === l));
        if (safe !== undefined) st.laneFlash[safe] = Math.max(st.laneFlash[safe], 1);
    }
    if (!v.items.length) endMonkVolley(en);
}

function monkDetonate(en, it) {
    const p = st.player, ly = st.height * CONSTANTS.LANE_Y[it.lane];
    const bx = it.kind === 'beam' ? p.x : it.x;
    playSound('laser'); en.justAttacked = 10; st.shake = Math.max(st.shake, 15);
    if (it.kind === 'beam') { for (let i = 0; i < 6; i++) createImpact(en.x - i * 150, ly - 60, '#00ff00'); }
    else { for (let i = 0; i < 6; i++) createImpact(bx + (i - 2) * 40, ly - 20 - (i % 2) * 30, '#00ff00'); triggerShockwave(bx, ly - 30, '#00ff00'); }
    // the blast takes out anything in the lane near it — including the Monk's own adds
    for (const add of st.enemies) {
        if (add.isBoss || add.lane !== it.lane || (it.kind !== 'beam' && Math.abs(add.x - bx) > CONSTANTS.CANISTER.radius)) continue;
        add.hp -= CONSTANTS.CANISTER.addDamage; add.stun = Math.max(add.stun, 20); add.vx += 8;
        spawnFloatingText(add.x, add.y - 120, 'CAUGHT IN THE BLAST', '#00ff00');
    }
    if (p.lane === it.lane) {
        if (p.state === 'ghost_step') { spawnFloatingText(p.x, p.y - 50, "EVADED", "#888888"); registerPerfectGhostStep(); }
        else takeDamage(st.isInstinct ? 15 : 30, true, en);
    }
}

function endMonkVolley(en) {
    en.volley = null; st.canisters = [];
    en.targetLanes = [];
    en.telegraphed = false;
    en.bossMashCount++;
    // ARC MUTATION (patternChainLength): volleys per burst = 1 + patternChainLength.
    const volleysPerBurst = 1 + (en.arcMods.patternChainLength || 1);
    if (en.bossMashCount >= volleysPerBurst) {
        en.currentMove = 'recharge';
        en.attackCooldown = Math.floor(180 / en.arcMods.teleportRateMult);
        en.bossMashCount = 0;
        en.lane = st.player.lane;
        en.y = st.height * CONSTANTS.LANE_Y[en.lane];
        en.x = st.player.x + 100;
        en.punishShown = false;
        playSound('ghost_step');
        createImpact(en.x, en.y - 60, '#00ff00');
        spawnFloatingText(en.x, en.y - 120, "RECHARGING — OPEN!", "#00ff00");
        // ARC MUTATION (summonSupportPressure, Arc 3+): one Grunt add walks in.
        if (en.arcMods.summonSupportPressure && st.enemies.filter(e => !e.isBoss).length < 1) spawnMonkAdd();
    } else {
        // ARC MUTATION (followupPattern, Arc 2+): a tighter beat between volleys.
        // Kept above MONK.lead so every volley still gets its full warning.
        en.attackCooldown = en.arcMods.followupPattern ? 88 : 100;
        let otherLanes = [0, 1, 2].filter(l => l !== en.lane);
        en.lane = otherLanes[Math.floor(random() * otherLanes.length)];
        en.y = st.height * CONSTANTS.LANE_Y[en.lane];
    }
}

// ==========================================
// LIVE WIRE (Arc 4): a pressure fighter. Throws 2-3 hit punch strings (every hit
// re-targets your lane with its own telegraph), crowds you backwards, and every
// few strings throws a SHOVE. v18: the ropes are gone — instead each finished
// string leaves the lane he struck LIVE: it crackles (warning) then shocks
// anyone standing in it for a beat. Stay in one lane and you fry.
// ==========================================
export function updateLiveLanes() {
    if (!st.liveLanes || !st.liveLanes.length) return;
    const L = CONSTANTS.LIVE_LANE, p = st.player;
    for (const z of st.liveLanes) {
        z.timer--;
        if (z.phase === 'warn') {
            if (z.timer <= 0) { z.phase = 'live'; z.timer = L.liveFrames; z.tick = 0; playSound('shock'); }
        } else {
            if (p.lane === z.lane && !(p.invuln > 0) && p.state !== 'ghost_step' && (z.tick++ % L.tickEvery) === 0) {
                takeDamage(L.damage, false, null, { src: 'live_lane' });
                playSound('shock'); createImpact(p.x + 20, p.y - 70, '#fff36b');
                spawnFloatingText(p.x + 10, p.y - 130, 'SHOCKED!', '#fff36b');
            }
        }
    }
    st.liveLanes = st.liveLanes.filter(z => z.phase === 'warn' || z.timer > 0);
}

function electrifyLane(lane) {
    if (!st.liveLanes) st.liveLanes = [];
    if (st.liveLanes.some(z => z.lane === lane)) return;
    st.liveLanes.push({ lane, phase: 'warn', timer: CONSTANTS.LIVE_LANE.warnFrames, tick: 0 });
    spawnFloatingText(st.width * 0.5, st.height * CONSTANTS.LANE_Y[lane] - 50, 'LIVE LANE', '#fff36b');
}

function handleLiveWire(en) {
    if (en.recoverTimer > 0) { en.recoverTimer--; return; } // OPEN — punish it
    en.attackCooldown--;
    const p = st.player;
    if (en.x > p.x + 100) en.x -= en.speed * 0.6 * (en.arcMods.walkDownMult || 1);
    // Crowding: toe to toe, he walks you back unless you hold your ground (press forward).
    const K = getBinds();
    const holding = st.keys[K.right] || st.pad.rightHeld;
    if (Math.abs(en.x - p.x) < 112 && !holding && p.state !== 'punching') p.x = Math.max(CONSTANTS.FOOTWORK.minX, p.x - 0.7);

    const inRange = Math.abs(en.x - p.x) < 140 && en.stun <= 0;
    meleeTelegraph(en, inRange, () => {
        playSound(en.currentMove === 'shove' ? 'bash_tell' : 'jab_tell');
        if (en.currentMove === 'shove') createImpact(en.x, en.y - 60, '#ffe14d');
    });
    if (!(inRange && en.attackCooldown <= 0)) return;

    en.justAttacked = 5;
    if (en.currentMove === 'string') {
        resolveBossStrike(en, 10, false);
        const len = en.arcMods.stringLength || 2;
        en.stringIdx = (en.stringIdx || 0) + 1;
        if (en.stringIdx < len) {
            // next hit of the string: steps into your lane, full telegraph again
            if (Math.abs(en.lane - p.lane) === 1) { en.lane = p.lane; en.y = st.height * CONSTANTS.LANE_Y[en.lane]; }
            en.attackCooldown = telegraphLead(en) + 4; en.telegraphed = false;
            return;
        }
        en.stringIdx = 0; en.stringsThrown = (en.stringsThrown || 0) + 1;
        electrifyLane(en.lane); // the lane he just worked goes live
        // v24 PHASE 2 (below half): the current chases you — the lane you're
        // standing in charges too, so holding still in front of him isn't safe.
        if (en.hp <= en.maxHp * 0.5) {
            if (en.phase !== 2) { en.phase = 2; spawnFloatingText(en.x, en.y - 170, 'OVERLOAD', '#fff36b'); st.shake = Math.max(st.shake, 20); }
            if (p.lane !== en.lane) electrifyLane(p.lane);
            else electrifyLane(p.lane === 1 ? (random() < 0.5 ? 0 : 2) : 1);
        }
        const shoveNext = en.stringsThrown % (en.arcMods.shoveEvery || 3) === 0;
        en.currentMove = shoveNext ? 'shove' : 'string';
        en.maxCooldown = nextCycle(en, shoveNext ? 60 : 44);
        en.attackCooldown = en.maxCooldown;
        beginPunishWindow(en, 'jab');
    } else { // SHOVE: walks you back hard (guarding only softens it)
        const connected = en.lane === p.lane && Math.abs(en.x - p.x) <= 100 && p.state !== 'ghost_step';
        resolveBossStrike(en, 14, true);
        if (connected) { p.x = Math.max(CONSTANTS.FOOTWORK.minX, p.x - 60); spawnFloatingText(p.x, p.y - 120, 'WALKED BACK', '#ffe14d'); }
        en.currentMove = 'string';
        en.maxCooldown = nextCycle(en, 44);
        en.attackCooldown = en.maxCooldown;
        beginPunishWindow(en, 'bash');
    }
}

// ==========================================
// v17 NEGATIVE (Arc 5, final): mirror of the Striker. Its reactions to YOUR
// punches live in systems/negative.js (called from combat.js); here it walks
// you down, jabs and crosses, and resolves the echo punches its afterimages throw.
// ==========================================
function updateEnemyEchoes() {
    if (!st.enemyEchoes || !st.enemyEchoes.length) return;
    const p = st.player;
    for (const e of st.enemyEchoes) {
        if (!e.fired) {
            if (e.timer <= 12) st.laneFlash[e.lane] = Math.max(st.laneFlash[e.lane], e.timer <= 6 ? 2 : 1);
            if (--e.timer <= 0) {
                e.fired = true;
                if (p.lane === e.lane && Math.abs(e.x - p.x) < 150) {
                    if (p.state === 'ghost_step') { spawnFloatingText(p.x, p.y - 50, 'GHOST STEP', '#888888'); registerPerfectGhostStep(); }
                    else takeDamage(st.isInstinct ? 6 : 12, false, null, { src: 'negative_echo' });
                }
                createImpact(e.x - 40, e.y - 60, e.color);
            }
        } else e.fade--;
    }
    st.enemyEchoes = st.enemyEchoes.filter(e => !e.fired || e.fade > 0);
}

function handleNegative(en) {
    if (en.slipCooldown > 0) en.slipCooldown--;
    primeNegativeRead(en);
    if (en.phase === 1 && en.hp < en.maxHp * 0.5) {
        en.phase = 2; st.shake = 40; doFlash(0.6); triggerShockwave(en.x, en.y - 60, en.color);
        spawnFloatingText(en.x + 20, en.y - 160, 'THE MIRROR CRACKS', en.color); playSound('hit');
    }
    if (en.recoverTimer > 0) { en.recoverTimer--; return; } // OPEN — punish it
    en.attackCooldown--;
    const p = st.player;
    if (en.x > p.x + 100) en.x -= en.speed * 0.6;
    const inRange = Math.abs(en.x - p.x) < 140 && en.stun <= 0;
    meleeTelegraph(en, inRange, () => playSound(en.currentMove === 'cross' ? 'bash_tell' : 'jab_tell'));
    if (!(inRange && en.attackCooldown <= 0)) return;
    en.justAttacked = 5;
    const struck = en.currentMove;
    resolveBossStrike(en, struck === 'cross' ? 18 : 12, struck === 'cross');
    const roll = random();
    en.currentMove = en.phase === 2 ? (roll > 0.45 ? 'cross' : 'jab') : (roll > 0.65 ? 'cross' : 'jab');
    en.maxCooldown = nextCycle(en, en.currentMove === 'cross' ? 48 : 34);
    en.attackCooldown = en.maxCooldown;
    beginPunishWindow(en, struck === 'cross' ? 'bash' : 'jab');
}

export function updateBosses() {
    updateEnemyEchoes(); // Negative's echoes resolve even while it's stunned
    if (!st.finisher) updateLiveLanes(); // Live Wire's charged lanes run out even while he's stunned
    if (!st.finisher) updateSlamWaves(); // v24 Enforcer slam waves
    for (const en of st.enemies) {
        if (!en.isBoss) continue;
        checkBossThresholds(en); // safety net for non-punch damage
        if (en.pendingFinisher && !st.finisher) {
            const kind = en.pendingFinisher; en.pendingFinisher = null;
            startFinisher(en, kind);
            return; // the finisher owns the rest of this frame
        }
        if (en.stun > 0 || st.bossIntroTimer > 0) continue;
        if (en.controller === 'neon_enforcer') handleNeonEnforcer(en);
        else if (en.controller === 'phantom_boxer') handlePhantomBoxer(en);
        else if (en.controller === 'static_monk') handleStaticMonk(en);
        else if (en.controller === 'live_wire') handleLiveWire(en);
        else if (en.controller === 'negative') handleNegative(en);
    }
}
