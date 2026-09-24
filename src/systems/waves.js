import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { spawnTutorialEnemy } from './tutorial.js';
import { random } from './rng.js';

// ==========================================
// FORMATIONS (systemic "squads")
// A layer over the authored packet: a Zoner sometimes gets a Shield barricade in front
// of it, an Assassin sometimes hides screened behind a tank. Coverage is a per-arc
// probability, NEVER guaranteed — that unpredictability is the whole point, so a wave
// can't be memorised. Uses the SEEDED rng, so a Daily is identical for everyone that
// day while normal runs vary. "In front" = smaller delay `d` = reaches the player first.
// ==========================================
export function applyFormations(defs, arcIndex) {
    const out = defs.map(e => ({ ...e }));
    let added = 0;
    const cap = CONSTANTS.FORMATION_RULES.maxAddsPerPacket || 2;
    // A tank already covering this lane (spawning ahead of position `d`)?
    const coveredInFront = (lane, d) => out.some(e => (e.t === 'shield' || e.t === 'bruiser') && e.l === lane && e.d < d);

    const pBarricade = CONSTANTS.formationChance('barricade', arcIndex);
    const pScreen = CONSTANTS.formationChance('screen', arcIndex);

    // Consume one rng roll per candidate (kept in a stable order) so the outcome is a
    // pure function of the seed — deterministic per Daily, varied in free play.
    for (const e of defs) {
        if (added >= cap) break;
        if (e.t === 'zoner') {
            if (random() < pBarricade && !coveredInFront(e.l, e.d)) {
                out.push({ t: 'shield', l: e.l, d: Math.max(0, (e.d || 0) - 30) });
                added++;
            }
        }
    }
    for (const e of defs) {
        if (added >= cap) break;
        if (e.t === 'assassin') {
            if (random() < pScreen && !coveredInFront(e.l, e.d)) {
                out.push({ t: 'shield', l: e.l, d: Math.max(0, (e.d || 0) - 25) });
                added++;
            }
        }
    }
    return out;
}

// ==========================================
// BASE WAVE CHOREOGRAPHY (BOXING & SPACING) — the hand-authored source of truth.
// Arcs 2-5 are DERIVED from this table (see deriveArc below). Arc 1 plays a
// compressed cut of it (ARC1_LEVELS further down).
// FIXED: Vastly increased delay timings (d) in Levels 1-3 to fan out the enemies. 
// Provides enough space to successfully combat all 3 individually without forced evasion early on.
// ==========================================
const ARC_BASE_LEVELS = {
    1: { // SHATTERED CATHEDRAL (Fundamentals)
        speedMult: 1.00,
        packets: [
            [ { t:'grunt', l:1, d:0 }, { t:'grunt', l:0, d:50 }, { t:'grunt', l:2, d:100 }, { b: 60, th: 1 } ],
            [ { t:'grunt', l:0, d:0 }, { t:'grunt', l:2, d:45 }, { t:'grunt', l:1, d:90 }, { t:'grunt', l:1, d:135 }, { b: 60, th: 1 } ],
            [ { t:'shield', l:1, d:0 }, { t:'grunt', l:0, d:60 }, { t:'grunt', l:2, d:120 }, { t:'grunt', l:1, d:180 }, { b: 70, th: 1 } ],
            [ { t:'grunt', l:0, d:0 }, { t:'grunt', l:2, d:50 }, { t:'shield', l:1, d:100 }, { t:'grunt', l:1, d:150 }, { b: 90, th: 0 } ]
        ]
    },
    2: { // GLASS RELIQUARY (Lane Awareness)
        speedMult: 1.05,
        packets: [
            [ { t:'assassin', l:1, d:0 }, { t:'grunt', l:0, d:45 }, { t:'grunt', l:2, d:90 }, { b: 60, th: 1 } ],
            [ { t:'grunt', l:0, d:0 }, { t:'assassin', l:2, d:40 }, { t:'grunt', l:1, d:80 }, { t:'assassin', l:0, d:120 }, { b: 60, th: 1 } ],
            [ { t:'shield', l:1, d:0 }, { t:'assassin', l:0, d:50 }, { t:'assassin', l:2, d:100 }, { t:'grunt', l:1, d:150 }, { b: 60, th: 1 } ],
            [ { t:'assassin', l:1, d:0 }, { t:'assassin', l:0, d:35 }, { t:'assassin', l:2, d:70 }, { t:'grunt', l:1, d:110 }, { t:'grunt', l:0, d:150 }, { b: 90, th: 0 } ]
        ]
    },
    3: { // ASHEN CLOISTER (Target Prioritization)
        speedMult: 1.10,
        packets: [
            [ { t:'shield', l:1, d:0 }, { t:'zoner', l:1, d:50 }, { t:'grunt', l:0, d:100 }, { t:'grunt', l:2, d:150 }, { b: 60, th: 1 } ],
            [ { t:'bruiser', l:1, d:0 }, { t:'grunt', l:0, d:50 }, { t:'grunt', l:2, d:100 }, { t:'assassin', l:1, d:150 }, { b: 60, th: 1 } ],
            [ { t:'zoner', l:0, d:0 }, { t:'zoner', l:2, d:30 }, { t:'assassin', l:1, d:70 }, { t:'grunt', l:1, d:110 }, { b: 50, th: 2 } ],
            [ { t:'shield', l:0, d:0 }, { t:'shield', l:2, d:40 }, { t:'zoner', l:1, d:80 }, { t:'bruiser', l:1, d:140 }, { b: 70, th: 1 } ],
            [ { t:'bruiser', l:1, d:0 }, { t:'zoner', l:0, d:50 }, { t:'zoner', l:2, d:90 }, { t:'assassin', l:1, d:130 }, { t:'assassin', l:0, d:170 }, { b: 90, th: 0 } ]
        ]
    },
    4: { // MIDNIGHT CAUSEWAY (The Flowing River)
        speedMult: 1.15,
        packets: [
            [ { t:'assassin', l:1, d:0 }, { t:'assassin', l:0, d:40 }, { t:'assassin', l:2, d:40 }, { t:'grunt', l:1, d:100 }, { b: 40, th: 2 } ],
            [ { t:'assassin', l:0, d:0 }, { t:'assassin', l:2, d:30 }, { t:'grunt', l:1, d:80 }, { t:'assassin', l:1, d:120 }, { t:'grunt', l:0, d:160 }, { b: 50, th: 2 } ],
            [ { t:'grunt', l:0, d:0 }, { t:'grunt', l:1, d:30 }, { t:'grunt', l:2, d:60 }, { t:'assassin', l:1, d:100 }, { t:'assassin', l:0, d:140 }, { t:'assassin', l:2, d:140 }, { b: 60, th: 2 } ],
            [ { t:'shield', l:1, d:0 }, { t:'assassin', l:0, d:40 }, { t:'assassin', l:2, d:40 }, { t:'bruiser', l:1, d:100 }, { b: 60, th: 1 } ],
            [ { t:'assassin', l:1, d:0 }, { t:'grunt', l:0, d:40 }, { t:'assassin', l:2, d:80 }, { t:'grunt', l:1, d:120 }, { t:'assassin', l:0, d:160 }, { t:'grunt', l:2, d:200 }, { b: 90, th: 0 } ]
        ]
    },
    5: { // ABYSS RAIL (Crack the Formation)
        speedMult: 1.20,
        packets: [
            [ { t:'shield', l:1, d:0 }, { t:'zoner', l:1, d:40 }, { t:'grunt', l:0, d:80 }, { t:'grunt', l:2, d:80 }, { t:'assassin', l:1, d:140 }, { b: 60, th: 2 } ],
            [ { t:'zoner', l:0, d:0 }, { t:'zoner', l:2, d:0 }, { t:'shield', l:1, d:40 }, { t:'grunt', l:0, d:90 }, { t:'grunt', l:2, d:90 }, { b: 60, th: 2 } ],
            [ { t:'shield', l:0, d:0 }, { t:'shield', l:2, d:0 }, { t:'zoner', l:0, d:60 }, { t:'zoner', l:2, d:60 }, { t:'assassin', l:1, d:120 }, { b: 60, th: 1 } ],
            [ { t:'bruiser', l:1, d:0 }, { t:'zoner', l:0, d:40 }, { t:'zoner', l:2, d:40 }, { t:'grunt', l:1, d:100 }, { t:'assassin', l:0, d:140 }, { b: 70, th: 1 } ],
            [ { t:'shield', l:0, d:0 }, { t:'shield', l:1, d:0 }, { t:'shield', l:2, d:0 }, { t:'zoner', l:1, d:60 }, { t:'bruiser', l:1, d:150 }, { b: 90, th: 0 } ]
        ]
    },
    6: { // THRONE OF STATIC (The Composure Exam)
        speedMult: 1.25,
        packets: [
            [ { t:'assassin', l:1, d:0 }, { t:'shield', l:0, d:40 }, { t:'shield', l:2, d:40 }, { t:'grunt', l:1, d:100 }, { t:'zoner', l:0, d:140 }, { b: 50, th: 2 } ],
            [ { t:'shield', l:1, d:0 }, { t:'zoner', l:1, d:40 }, { t:'assassin', l:0, d:80 }, { t:'assassin', l:2, d:80 }, { t:'bruiser', l:1, d:140 }, { b: 50, th: 2 } ],
            [ { t:'grunt', l:0, d:0 }, { t:'grunt', l:2, d:0 }, { t:'assassin', l:1, d:40 }, { t:'zoner', l:0, d:100 }, { t:'zoner', l:2, d:100 }, { t:'shield', l:1, d:160 }, { b: 60, th: 1 } ],
            [ { t:'bruiser', l:1, d:0 }, { t:'shield', l:0, d:40 }, { t:'shield', l:2, d:40 }, { t:'zoner', l:0, d:100 }, { t:'zoner', l:2, d:100 }, { b: 60, th: 1 } ],
            [ { t:'assassin', l:0, d:0 }, { t:'assassin', l:2, d:30 }, { t:'shield', l:1, d:80 }, { t:'grunt', l:0, d:130 }, { t:'grunt', l:2, d:130 }, { t:'assassin', l:1, d:180 }, { b: 60, th: 1 } ],
            [ { t:'shield', l:0, d:0 }, { t:'shield', l:1, d:0 }, { t:'shield', l:2, d:0 }, { t:'zoner', l:0, d:80 }, { t:'zoner', l:2, d:80 }, { t:'bruiser', l:1, d:140 }, { b: 90, th: 0 } ]
        ]
    }
};

// ==========================================
// ARCS 2-5: DERIVED WAVE CHOREOGRAPHY
// Arc 1's packets above are the single hand-authored source of truth. Rather than
// hand-duplicate 24 more literal packet tables (error-prone, hard to maintain),
// each later arc is produced by a small deterministic transform applied to Arc 1's
// data. Each transform is a direct mechanical expression of that arc's own design
// copy in ARC_LAWS — this isn't filler, it's the theme made concrete:
//   Arc 2 "success is no longer the end of the exchange" -> an echo spawn lands
//     right as you'd expect the packet to be over.
//   Arc 3 "space is harder to keep, make your own space"  -> opening pressure
//     spreads across lanes instead of queuing, plus a bruiser forces a real
//     footwork decision (advance to interrupt it, or give ground).
//   Arc 4 "tells become less literal, read the real strike" -> more Assassins
//     (guard barely works on them) and tighter Zoner windows — Guard-turtling
//     specifically stops being a safe default.
//   Arc 5 "pressure must be sustained, not merely survived" -> all three rules
//     compose together, breathers cut to the floor.
// This is deterministic and computed once at module load — it must stay that way
// so a Daily Challenge run has identical wave composition for every player; only
// boss AI, drafts, and affixes are seeded per-day (see systems/rng.js).
// ==========================================

function cloneEnemyDefs(packet) {
    return packet.filter(e => e.t).map(e => ({ ...e }));
}
function markerOf(packet) {
    return packet.find(e => !e.t) || { b: 75, th: 1 };
}

function ruleEcho(enemies) {
    // "The exchange isn't over" — an extra spawn lands shortly after the packet's
    // last arrival, in a different lane, so clearing the visible wave isn't safe.
    if (!enemies.length) return enemies;
    const last = enemies[enemies.length - 1];
    const echoLane = (last.l + 1) % 3;
    return [...enemies, { t: last.t === 'zoner' ? 'grunt' : last.t, l: echoLane, d: last.d + 55 }];
}

function rulePincerAndBruiser(enemies) {
    // Spread the opening pressure across lanes instead of a single-lane queue,
    // and guarantee a Bruiser is present to force an active spacing decision.
    let out = enemies.map(e => ({ ...e }));
    if (out.length >= 2 && out[0].l === out[1].l) out[1] = { ...out[1], l: (out[1].l + 1) % 3 };
    if (!out.some(e => e.t === 'bruiser')) {
        const midDelay = Math.round(out.reduce((s, e) => s + e.d, 0) / Math.max(1, out.length));
        out.push({ t: 'bruiser', l: 1, d: midDelay });
    }
    return out;
}

function ruleReadOverGuard(enemies) {
    // Convert alternating Grunts to Assassins (guard barely works on them) and
    // tighten Zoner windows — turtling stops being a free default answer.
    let assassinToggle = false;
    return enemies.map(e => {
        if (e.t === 'grunt') {
            assassinToggle = !assassinToggle;
            return assassinToggle ? { ...e, t: 'assassin' } : e;
        }
        if (e.t === 'zoner') return { ...e, d: Math.max(0, e.d - 20) };
        return e;
    });
}

function deriveArc(baseLevels, transforms, breatherCut, speedBump) {
    const out = {};
    for (const key of Object.keys(baseLevels)) {
        const base = baseLevels[key];
        const packets = base.packets.map(pkt => {
            let enemies = cloneEnemyDefs(pkt);
            for (const t of transforms) enemies = t(enemies);
            const marker = markerOf(pkt);
            const newB = Math.max(20, (marker.b || 75) - breatherCut);
            const newTh = Math.max(0, (marker.th ?? 1) - (breatherCut >= 20 ? 1 : 0));
            return [...enemies, { b: newB, th: newTh }];
        });
        out[key] = { speedMult: +(base.speedMult * speedBump).toFixed(3), packets };
    }
    return out;
}

const ARC2_LEVELS = deriveArc(ARC_BASE_LEVELS, [ruleEcho], 12, 1.03);
const ARC3_LEVELS = deriveArc(ARC_BASE_LEVELS, [rulePincerAndBruiser], 16, 1.05);
const ARC4_LEVELS = deriveArc(ARC_BASE_LEVELS, [ruleReadOverGuard], 20, 1.04);
const ARC5_LEVELS = deriveArc(ARC_BASE_LEVELS, [ruleEcho, rulePincerAndBruiser, ruleReadOverGuard], 24, 1.08);

// ==========================================
// ARC 1 — COMPRESSED CUT (v16 pacing pass)
// Playtest: "pacing feels off in Arc 1… I didn't really feel compelled to push
// further." Arc 1 now runs levels 1, 2, 3, 6 then the boss (CONSTANTS.ARC_LEVEL_KEYS)
// and each level keeps only its strongest 3-4 packets with tighter breathers. The
// cut levels (Causeway, Abyss Rail) still arrive in Arc 2+ via derivation.
// ==========================================
function compressLevel(level, keep, breather = 45) {
    const packets = keep.map((pi, i) => {
        const pkt = level.packets[pi];
        const enemies = cloneEnemyDefs(pkt);
        const marker = markerOf(pkt);
        const last = i === keep.length - 1;
        return [...enemies, { b: last ? marker.b : Math.min(marker.b, breather), th: marker.th ?? 1 }];
    });
    return { speedMult: level.speedMult, packets };
}
const ARC1_LEVELS = {
    ...ARC_BASE_LEVELS,
    1: compressLevel(ARC_BASE_LEVELS[1], [0, 2, 3]),     // grunts -> first armor -> mixed
    2: compressLevel(ARC_BASE_LEVELS[2], [0, 2, 3]),     // assassin lead -> screened -> finale
    3: compressLevel(ARC_BASE_LEVELS[3], [0, 1, 4]),     // zoner -> bruiser -> finale
    6: compressLevel(ARC_BASE_LEVELS[6], [0, 1, 3, 5])   // the composure exam, trimmed
};

export const ARC_WAVE_TABLES = { 1: ARC1_LEVELS, 2: ARC2_LEVELS, 3: ARC3_LEVELS, 4: ARC4_LEVELS, 5: ARC5_LEVELS };

export function spawnEnemy() {
    if (st.stageClearing || st.bossActive || st.bossIntroTimer > 0 || st.screen !== 'playing' || st.purifyTimer > 0) return; 

    if (CONSTANTS.isBossStage(st.currentStage)) {
        if (!st.bossActive && !st.stageClearing) {
            st.stageClearing = true;
            st.purifyTimer = 90; 
        }
        return;
    }

    if (st.currentStage === 1 && st.tutorialEnabled) {
        if (st.spawnTotal < 5) {
            if (st.enemies.length > 0 || st.tutorialDelay > 0) return; 
            if (st.spawnTotal === 0) spawnTutorialEnemy('slip');
            else if (st.spawnTotal === 1) spawnTutorialEnemy('counter');
            else if (st.spawnTotal === 2) spawnTutorialEnemy('shield');
            else if (st.spawnTotal === 3) spawnTutorialEnemy('guard');
            // FIX: the ghost_step dummy was fully built (spawnTutorialEnemy already
            // supports it, combat.js already has its hint text ready) but never
            // actually invoked here — resetGame()'s tutorial-skip value was already
            // set to 5, not 4, which is what gave this away. Ghost Step had zero
            // onboarding in actual play despite the manual describing it as an
            // "emergency evade."
            else if (st.spawnTotal === 4) spawnTutorialEnemy('ghost_step');
            return; 
        }
        if (st.enemies.some(e => e.tutorialType)) return;
    }

    // v16 PACING: an earned Evolution is drafted the moment the field is clear —
    // the next packet waits for it instead of racing the breather timer (drafts
    // used to be skipped whenever the last kill landed under 30 frames of breather).
    if (st.pendingUpgrades > 0 && st.enemies.length === 0) return;

    if (st.waveThreshold === undefined || st.wavesCleared === 0) st.waveThreshold = 0;

    if (st.enemies.length <= st.waveThreshold && st.tutorialDelay <= 0) {
        if (st.waveTimer > 0) {
            st.waveTimer--;
            return;
        }

        // FIX: this used to be an independent mod-6 counter racing against the
        // arc structure's mod-7 cycle (6 levels + 1 boss). Every boss clear pushed
        // the two further out of phase — by Arc 2's hardest pre-boss level the game
        // was serving Arc 1's easiest packet. Pin it directly to level-in-arc instead.
        const rawArcIndex = CONSTANTS.getArcIndex(st.currentStage);
        const law = CONSTANTS.ARC_LAWS[Math.min(rawArcIndex, 5)] || CONSTANTS.ARC_LAWS[5];
        const gm = law.globalMods;

        let packetIndex = CONSTANTS.getLevelInArc(st.currentStage);
        let levelData = ARC_WAVE_TABLES[Math.min(rawArcIndex, 5)][packetIndex];

        if (st.wavesCleared >= levelData.packets.length) {
            if (st.enemies.length === 0) {
                st.stageClearing = true;
                st.purifyTimer = 60;
            }
            return;
        }

        // AFFIX hooks: a stage modifier can compress spacing, speed the rail up, and
        // swap a fraction of plain Grunts for a tougher archetype. Substitution is a
        // deterministic per-packet counter (NOT RNG) so wave composition stays
        // byte-identical for everyone on a given seed — only which affix is active
        // is seeded per stage. See CONSTANTS.AFFIXES.
        const affix = st.currentAffix;
        const affixDelayMult = CONSTANTS.affixMod(affix, 'packetDelayMult', 1);
        const affixSubType = CONSTANTS.affixMod(affix, 'gruntSub', null);
        const affixSubEvery = CONSTANTS.affixMod(affix, 'gruntSubEvery', 0);
        let gruntSubCounter = 0;

        st.stageSpeedMult = levelData.speedMult * gm.railSpeedMult * CONSTANTS.affixMod(affix, 'speedMult', 1);
        let packet = levelData.packets[st.wavesCleared];
        st.wavesCleared++;

        // Arc laws were fully authored in constants.js but never read — wiring
        // them in now means Arcs 2-5 escalate meaningfully even before they get
        // their own hand-authored packets (tracked separately as content work).
        let nextBreather = Math.max(20, 75 - gm.maxBreatherCut);
        let nextThreshold = 0;

        // The breather/threshold marker travels in the packet as a non-enemy entry.
        const marker = packet.find(d => !d.t);
        if (marker) {
            if (marker.b !== undefined) nextBreather = marker.b;
            if (marker.th !== undefined) nextThreshold = marker.th;
        }

        // FORMATIONS: augment the authored enemy list with sometimes-cover before spawn.
        const enemyDefs = applyFormations(packet.filter(d => d.t), Math.min(rawArcIndex, 5));

        enemyDefs.forEach(enemyDef => {
                st.spawnTotal++;
                let type = enemyDef.t;
                // AFFIX substitution: promote a deterministic fraction of Grunts to the
                // affix's target archetype (leave authored non-grunts untouched).
                if (type === 'grunt' && affixSubType && affixSubEvery > 0) {
                    if (gruntSubCounter % affixSubEvery === 0) type = affixSubType;
                    gruntSubCounter++;
                }
                let lane = enemyDef.l;
                let delayFrames = (enemyDef.d || 0) * gm.packetDelayMult * affixDelayMult;

                let color = '#ff0055'; let hp = 45; let speed = 3.0; let cooldown = 60; let weight = 1;

                if (type === 'bruiser') { color = '#cc0000'; hp = 150; speed = 1.8; cooldown = 80; weight = 2; }
                else if (type === 'shield') { color = '#ffaa00'; hp = 80; speed = 2.4; weight = 1.5; }
                else if (type === 'zoner') { color = '#00ff00'; hp = 40; speed = 1.5; cooldown = 100; }
                else if (type === 'assassin') { color = '#aa00ff'; hp = 30; speed = 4.5; cooldown = 35; }

                hp = Math.floor(hp * (1 + (CONSTANTS.difficultyStage(st.currentStage) - 1) * 0.10) * gm.packetDensityMult);
                if (type === 'shield' || type === 'bruiser') cooldown = Math.max(20, Math.round(cooldown * gm.enemyRecoveryMult));
                speed *= st.stageSpeedMult;
                // LANE TEMPO: a hot lane closes the approach faster (telegraph untouched).
                if (st.laneTempo && st.laneTempo[lane] !== undefined) speed *= st.laneTempo[lane];

                let spawnX = st.width + 50 + (delayFrames * speed);

                st.enemies.push({
                    x: spawnX, lane, y: st.height * CONSTANTS.LANE_Y[lane],
                    w: type === 'bruiser' ? 70 : 50, h: type === 'bruiser' ? 130 : 110,
                    hp, maxHp: hp, speed, baseSpeed: speed, color, type, weight, stun: 0, stunResist: 0,
                    attackCooldown: cooldown, maxCooldown: cooldown, isBoss: false,
                    justAttacked: 0, trails: [], trailTimer: 0, vx: 0,
                    pressure: 0, pressureDecay: 0, menace: 0, menaceLevel: 0
                });
        });

        st.waveTimer = nextBreather;
        st.waveThreshold = nextThreshold;
    }
}