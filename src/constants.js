export const CONSTANTS = {
    LANE_Y: [0.35, 0.55, 0.75], // Top, Mid, Bottom visual spacing

    // --- ARC STRUCTURE (single source of truth for stage flow) ---
    // Each arc is an ordered list of LEVEL KEYS (1-6 = authored levels, 7 = boss
    // chamber). The level key — not the raw stage number — is what every per-level
    // table reads: wave packets, stage names, palettes, taglines. Arc 1 is
    // compressed (playtest: "pacing feels off in Arc 1") to four fights + an earlier
    // boss; Arcs 2+ keep the full seven. Every system resolves stage -> {arc, level}
    // through locateStage(), so no caller does its own `% 7` math — that's exactly
    // how the old wave/palette counters drifted out of phase with the arc cycle.
    ARC_LEVEL_KEYS: {
        1: [1, 2, 3, 6, 7]
    },
    DEFAULT_ARC_LEVEL_KEYS: [1, 2, 3, 4, 5, 6, 7],
    BOSS_LEVEL_KEY: 7,

    arcLevelKeys: (arc) => CONSTANTS.ARC_LEVEL_KEYS[arc] || CONSTANTS.DEFAULT_ARC_LEVEL_KEYS,
    arcLength: (arc) => CONSTANTS.arcLevelKeys(arc).length,
    locateStage: (stage) => {
        let s = Math.max(1, Math.floor(stage) || 1), arc = 1;
        while (s > CONSTANTS.arcLength(arc)) { s -= CONSTANTS.arcLength(arc); arc++; }
        return { arc, ordinal: s, levelKey: CONSTANTS.arcLevelKeys(arc)[s - 1] };
    },
    firstStageOfArc: (arc) => {
        let stage = 1;
        for (let a = 1; a < arc; a++) stage += CONSTANTS.arcLength(a);
        return stage;
    },
    bossStageOfArc: (arc) => CONSTANTS.firstStageOfArc(arc) + CONSTANTS.arcLength(arc) - 1,

    // --- ARC MATH HELPERS ---
    getArcIndex: (stage) => CONSTANTS.locateStage(stage).arc,
    // Returns the LEVEL KEY (1-7) for content lookups, not the ordinal position.
    getLevelInArc: (stage) => CONSTANTS.locateStage(stage).levelKey,
    isBossStage: (stage) => CONSTANTS.locateStage(stage).levelKey === CONSTANTS.BOSS_LEVEL_KEY,
    // The stage number this fight WOULD have had under the original uniform
    // 7-per-arc layout. Enemy/boss HP scaling reads this so compressing Arc 1 does
    // not quietly make every later arc easier (Arc 2+ scale exactly as before).
    difficultyStage: (stage) => {
        const { arc, levelKey } = CONSTANTS.locateStage(stage);
        return (arc - 1) * 7 + levelKey;
    },
    // SINGLE SOURCE OF TRUTH for slip windows. This used to be duplicated with
    // slightly different hardcoded numbers in player.js (the real gameplay check),
    // enemies.js (the red/white telegraph + danger-ring visuals), and draw.js (the
    // "!" telegraph text) — three copies that could silently drift apart, which is
    // exactly how a telegraph ends up lying to the player. Everything reads from
    // here now. Also where Bruiser/Assassin get their own read-rhythm: a Bruiser's
    // haymaker is slow and wide (forgiving to time, hits like a truck once you do);
    // an Assassin's is fast and narrow (matches its "don't you dare turtle" identity).
    getSlipThresholds: (enemyType, progressionBonus = 0) => {
        if (enemyType === 'zoner') return { perfect: 10 + progressionBonus, good: 24 };
        if (enemyType === 'bruiser') return { perfect: 14 + progressionBonus, good: 26 };
        if (enemyType === 'assassin') return { perfect: 5 + progressionBonus, good: 10 };
        return { perfect: 8 + progressionBonus, good: 16 };
    },

    getBossArcMods: (bossId, arcIndex) => {
        const mods = CONSTANTS.BOSS_ARC_MODS[bossId];
        return mods[Math.min(arcIndex, 5)] || mods[5];
    },

    // --- ARC LAWS ---
    ARC_LAWS: {
        1: {
            id: "arc1_foundation", name: "Foundation", shortName: "ARC 1",
            theme: "Learn the language of lane-boxing.",
            uiText: "The duel begins. Read, slip, space, punish.",
            globalMods: { enemyRecoveryMult: 1.0, packetDelayMult: 1.0, packetDensityMult: 1.0, railSpeedMult: 1.0, maxBreatherCut: 0 }
        },
        2: {
            id: "arc2_distortion", name: "Distortion", shortName: "ARC 2",
            theme: "Success is no longer the end of the exchange.",
            uiText: "Old answers still work. Respect the second beat.",
            globalMods: { enemyRecoveryMult: 0.9, packetDelayMult: 0.92, packetDensityMult: 1.05, railSpeedMult: 1.08, maxBreatherCut: 10 }
        },
        3: {
            id: "arc3_compression", name: "Compression", shortName: "ARC 3",
            theme: "Space is harder to keep.",
            uiText: "The ring tightens. Make your own space.",
            globalMods: { enemyRecoveryMult: 0.88, packetDelayMult: 0.86, packetDensityMult: 1.15, railSpeedMult: 1.14, maxBreatherCut: 18 }
        },
        4: {
            id: "arc4_mirage", name: "Mirage", shortName: "ARC 4",
            theme: "Tells become less literal.",
            uiText: "Calm beats panic. Read the real strike.",
            globalMods: { enemyRecoveryMult: 0.9, packetDelayMult: 0.9, packetDensityMult: 1.1, railSpeedMult: 1.18, maxBreatherCut: 16 }
        },
        5: {
            id: "arc5_dominion", name: "Dominion", shortName: "ARC 5",
            theme: "Pressure must be sustained, not merely survived.",
            uiText: "Stay sharp long enough to earn the opening.",
            globalMods: { enemyRecoveryMult: 0.86, packetDelayMult: 0.84, packetDensityMult: 1.2, railSpeedMult: 1.24, maxBreatherCut: 24 }
        }
    },

    // --- ARC STAGE TABLES ---
    ARC_STAGE_TABLES: {
        1: {
            1: { stageName: "Shattered Cathedral" },
            2: { stageName: "Glass Reliquary" },
            3: { stageName: "Ashen Cloister" },
            4: { stageName: "Midnight Causeway" },
            5: { stageName: "Abyss Rail" },
            6: { stageName: "Throne of Static" },
            7: { stageName: "Boss Chamber: Foundation" }
        },
        2: {
            1: { stageName: "Distorted Cathedral" },
            2: { stageName: "Reliquary Split" },
            3: { stageName: "Ashfall Return" },
            4: { stageName: "Midnight Offset" },
            5: { stageName: "Abyss Echo Rail" },
            6: { stageName: "Static Threshold" },
            7: { stageName: "Boss Chamber: Distortion" }
        },
        3: {
            1: { stageName: "Processional Nave" },
            2: { stageName: "Gilded Bottleneck" },
            3: { stageName: "Cinder Corridor" },
            4: { stageName: "Midnight Crushway" },
            5: { stageName: "Abyss Choke Rail" },
            6: { stageName: "Static Constriction" },
            7: { stageName: "Boss Chamber: Compression" }
        },
        4: {
            1: { stageName: "Mirage Cathedral" },
            2: { stageName: "Prism Reliquary" },
            3: { stageName: "Ember Reflection" },
            4: { stageName: "Midnight Apparition" },
            5: { stageName: "Echo Abyss Rail" },
            6: { stageName: "Throne of False Light" },
            7: { stageName: "Boss Chamber: Mirage" }
        },
        5: {
            1: { stageName: "Cathedral Ascendant" },
            2: { stageName: "Reliquary Dominion" },
            3: { stageName: "Ashen Reign" },
            4: { stageName: "Midnight Crownway" },
            5: { stageName: "Abyss Command Rail" },
            6: { stageName: "Static Empire" },
            7: { stageName: "Boss Chamber: Dominion" }
        }
    },

    // --- BOSS ARC MUTATIONS ---
    BOSS_ARC_MODS: {
        neon_enforcer: {
            1: { armoredRetaliationChain: 1, jabPressureMult: 1.0, walkDownMult: 1.0, retaliationTimingVariant: false, punishWindowMult: 1.0 },
            2: { armoredRetaliationChain: 2, jabPressureMult: 1.08, walkDownMult: 1.04, retaliationTimingVariant: false, punishWindowMult: 0.95 },
            3: { armoredRetaliationChain: 2, jabPressureMult: 1.15, walkDownMult: 1.12, retaliationTimingVariant: false, punishWindowMult: 0.92 },
            4: { armoredRetaliationChain: 2, jabPressureMult: 1.15, walkDownMult: 1.12, retaliationTimingVariant: true, punishWindowMult: 0.88 },
            5: { armoredRetaliationChain: 2, jabPressureMult: 1.22, walkDownMult: 1.18, retaliationTimingVariant: true, punishWindowMult: 0.82 }
        },
        phantom_boxer: {
            1: { reentryDelayVariant: false, fakeLaneFlash: false, afterimageThreat: false, lanePinchBias: 0.0, punishWindowMult: 1.0 },
            2: { reentryDelayVariant: true, fakeLaneFlash: false, afterimageThreat: false, lanePinchBias: 0.15, punishWindowMult: 0.95 },
            3: { reentryDelayVariant: true, fakeLaneFlash: false, afterimageThreat: false, lanePinchBias: 0.3, punishWindowMult: 0.92 },
            4: { reentryDelayVariant: true, fakeLaneFlash: true, afterimageThreat: true, lanePinchBias: 0.35, punishWindowMult: 0.86 },
            5: { reentryDelayVariant: true, fakeLaneFlash: true, afterimageThreat: true, lanePinchBias: 0.45, punishWindowMult: 0.8 }
        },
        // v17 bosses. They headline Arc 4 / Arc 5; the arc-1..3 rows only matter
        // for endless rotation and tests.
        live_wire: {
            1: { stringLength: 2, walkDownMult: 1.0, punishWindowMult: 1.0, shoveEvery: 3 },
            2: { stringLength: 2, walkDownMult: 1.05, punishWindowMult: 0.96, shoveEvery: 3 },
            3: { stringLength: 3, walkDownMult: 1.1, punishWindowMult: 0.94, shoveEvery: 3 },
            4: { stringLength: 3, walkDownMult: 1.15, punishWindowMult: 0.9, shoveEvery: 2 },
            5: { stringLength: 3, walkDownMult: 1.2, punishWindowMult: 0.86, shoveEvery: 2 }
        },
        negative: {
            1: { echoChance: 0.35, counterRead: 0.5, punishWindowMult: 1.0 },
            2: { echoChance: 0.4, counterRead: 0.6, punishWindowMult: 0.96 },
            3: { echoChance: 0.45, counterRead: 0.7, punishWindowMult: 0.93 },
            4: { echoChance: 0.5, counterRead: 0.8, punishWindowMult: 0.9 },
            5: { echoChance: 0.55, counterRead: 0.9, punishWindowMult: 0.86 }
        },
        static_monk: {
            1: { patternChainLength: 1, teleportRateMult: 1.0, followupPattern: false, deceptiveOrder: false, summonSupportPressure: false },
            2: { patternChainLength: 2, teleportRateMult: 1.05, followupPattern: true, deceptiveOrder: false, summonSupportPressure: false },
            3: { patternChainLength: 2, teleportRateMult: 1.1, followupPattern: true, deceptiveOrder: false, summonSupportPressure: true },
            4: { patternChainLength: 2, teleportRateMult: 1.12, followupPattern: true, deceptiveOrder: true, summonSupportPressure: true },
            5: { patternChainLength: 3, teleportRateMult: 1.18, followupPattern: true, deceptiveOrder: true, summonSupportPressure: true }
        }
    },

    // Reads an affix modifier with a default. Affix effects are data-driven via the
    // `mods` object on each entry rather than scattered `name === '...'` checks, so a
    // new affix is defined in one place and every system already respects it.
    affixMod: (affix, key, def) => (affix && affix.mods && affix.mods[key] !== undefined) ? affix.mods[key] : def,

    // Probability (per arc) that a shooter gets a barricade / an assassin gets a screen.
    // NEVER 1.0 by design — coverage must stay unpredictable so waves can't be reduced
    // to rote muscle memory, and the ramp across arcs doubles as macro tension/release.
    formationChance: (kind, arcIndex) => {
        const a = Math.max(1, Math.min(5, arcIndex));
        const table = CONSTANTS.FORMATION_RULES[kind] || {};
        return table[a] !== undefined ? table[a] : 0;
    },

    // Current affixes for stage variations. Restored from the two-entry stub to a
    // real rotation of distinct stage personalities (Phase 5 "3-5 new affixes").
    // Each is a genuine risk/reward or read shift, not a flat number:
    //   SURGE        - reward: bank Instinct faster.
    //   FAST CROWD   - tempo: ranks arrive denser/quicker, more Assassins slip in.
    //   IRON WALL    - read shift: more Gold Armor, so Cross gets mandatory.
    //   HEAVY HANDS  - punish: Bruisers hit harder and show up more; footwork matters.
    //   ADRENALINE   - reward defense: every Perfect Slip mends a sliver of HP.
    //   GLASS PROTOCOL - high variance: you deal +30%, but you also take +30%.
    // Every stage's affix is picked from this list via the seeded RNG, so a Daily
    // Challenge serves the same modifier order to every player (see rng.js).
    // v16 WAGERS: modifiers are no longer imposed. Before a stage, the arena OFFERS
    // one risk modifier; accept it and every point you score that stage is multiplied
    // by its `scoreMult`, decline and the stage runs clean. Only entries with a
    // `scoreMult` are ever offered — SURGE and ADRENALINE are pure boons, and a boon
    // that also pays extra score is a free lunch, not a wager (kept in data for reuse).
    AFFIXES: [
        { name: 'NONE', desc: 'System stable. No anomalies detected.', mods: {} },
        { name: 'SURGE', desc: 'Instinct gain increased by 50%.', mods: { instinctGainMult: 1.5 } },
        { name: 'FAST CROWD', desc: 'Ranks arrive denser and faster — Assassins swell the crowd.', scoreMult: 1.5, mods: { packetDelayMult: 0.7, speedMult: 1.12, gruntSub: 'assassin', gruntSubEvery: 2 } },
        { name: 'IRON WALL', desc: 'The ranks harden. More Gold Armor — break it with a Cross.', scoreMult: 1.3, mods: { gruntSub: 'shield', gruntSubEvery: 2 } },
        { name: 'HEAVY HANDS', desc: 'Bruisers hit harder and press in numbers. Keep your footwork.', scoreMult: 1.4, mods: { bruiserDamageMult: 1.4, gruntSub: 'bruiser', gruntSubEvery: 4 } },
        { name: 'ADRENALINE', desc: 'Every Perfect Slip mends a sliver of health.', mods: { perfectSlipHeal: 4 } },
        { name: 'GLASS PROTOCOL', desc: 'You deal 30% more — and take 30% more. No margin for a miss.', scoreMult: 1.75, mods: { playerDamageDealtMult: 1.3, playerDamageTakenMult: 1.3 } }
    ],
    wagerPool: () => CONSTANTS.AFFIXES.filter(a => a.scoreMult && a.scoreMult > 1),
    WAGERS: {
        firstStage: 2 // stage 1 is the tutorial/onboarding fight — never wagered
    },

    // Per-level stage-card taglines (keyed by LEVEL KEY). The arc theme line ("Learn
    // the language of lane-boxing.") used to be the subtitle of EVERY stage in its
    // arc — playtest: it "doesn't need to keep surfacing". Arc themes now appear on
    // an arc's chapter card, Arc 1's only once per save, and stages use these.
    STAGE_TAGLINES: {
        1: 'Fundamentals. Find the rhythm.',
        2: 'Lane awareness. Watch every rail.',
        3: 'Target priority. Choose who falls first.',
        4: 'The flowing river. Keep moving.',
        5: 'Crack the formation.',
        6: 'The composure exam.',
        7: 'The duel.'
    },

    // --- LIVE SCORE (v16) ---
    // Score is earned live and shown on the HUD, so it can actually be played for.
    // Every award is multiplied by the combo multiplier (and an accepted wager).
    SCORE: {
        comboStep: 5,            // every 5 combo...
        comboMultStep: 0.25,     // ...adds +0.25x
        maxComboMult: 4.0,
        hit: { jab: 10, jab3: 20, hook: 30, cross: 40, guard: 5 },
        counterHitMult: 2,
        punishBonus: 60,         // landing a hit inside a boss's OPEN window
        perfectSlip: 150,
        goodSlip: 25,
        perfectGhostStep: 100,
        kill: { grunt: 50, shield: 90, assassin: 90, zoner: 110, bruiser: 180 },
        finisherHit: 400,
        finisherPerfect: 200,
        finisherClean: 1500,     // bonus for landing every prompt of a finisher
        bossKo: 3000,            // x arc index
        stageClear: 500,         // ALL CLEAR: flat, NOT combo-multiplied (wager still applies)
        flawless: 1000,          // v19: cleared the stage without taking a hit
        // Letter rank thresholds (score). Calibrated against the headless bot sim
        // (tests/v16.mjs "SCORE CALIBRATION"): a stage-4 death lands ~8-12k (C), a
        // clean Arc 1 clear ~45k (B), deep Arc 2-3 runs 150k+ (S). S also needs reads.
        rank: { S: 150000, A: 50000, B: 15000 }
    },

    // --- v17 PROGRESSION: three linear 5-rank trees --------------------------
    // Ranks 1/2/4 = stat ranks, rank 3 = a VERB change, rank 5 = Apex. How far a
    // tree can climb is capped by arc, so the run's power curve follows the arcs.
    // Each tree owns one signature neon colour; Fusions mix two of them. Colour
    // appears on cards, punch trails, hit sparks and the afterimage — never on the
    // Striker's body or gloves (his silhouette stays clean).
    TREES: {
        speed:     { name: 'SPEED',     short: 'SPD', color: '#22d3ee' }, // cyan
        power:     { name: 'POWER',     short: 'PWR', color: '#ff2bd6' }, // magenta
        technique: { name: 'TECHNIQUE', short: 'TEC', color: '#facc15' }  // yellow
    },
    TREE_ORDER: ['speed', 'power', 'technique'],
    MAX_RANK: 5,
    RANK_CAP_BY_ARC: { 1: 2, 2: 3, 3: 3, 4: 4, 5: 5 },
    rankCap: (arc) => CONSTANTS.RANK_CAP_BY_ARC[Math.min(Math.max(1, arc), 5)],
    // First arc in which a given rank becomes reachable ("Unlocks in Arc N").
    arcForRank: (rank) => {
        for (let a = 1; a <= 5; a++) if (CONSTANTS.RANK_CAP_BY_ARC[a] >= rank) return a;
        return 5;
    },
    // Fusion colours are the additive mix of their two trees.
    FUSION_COLORS: {
        fuse_dempsey_circuit: '#a855f7', // cyan + magenta = violet
        fuse_ghost_counter:   '#4ade80', // cyan + yellow  = lime
        fuse_shatter_read:    '#ff7a3d', // magenta + yellow = orange
        evo_infinite_circuit: '#c9a0ff',
        evo_phantom_riposte:  '#9dffb8',
        evo_shatter_nova:     '#ffb07a'
    },
    FUSION_TREES: {
        fuse_dempsey_circuit: ['speed', 'power'],
        fuse_ghost_counter:   ['speed', 'technique'],
        fuse_shatter_read:    ['power', 'technique']
    },

    // --- v17 RANK-3 VERBS --------------------------------------------------------
    VERBS: {
        pivotSlip: { advance: 55, instantWindow: 20 },          // Speed R3
        loadedCross: { chargeFrames: 18, maxFrames: 42, knockback: 70, stun: 45 }, // Power R3
        afterimage: { delay: 16, damage: 26, stun: 22, reach: 150 } // Technique R3
    },

    // --- FOOTWORK (v18: the v17 ropes are gone — playtest: they cost the game its
    // lane-boxing identity and its sense of forward motion). Just the stage edges.
    FOOTWORK: {
        minX: 90, maxX: 320, advanceSpd: 3.0, retreatSpd: 3.4, homePull: 0.02,
        holdGroundWhenEngaged: true
    },

    // --- v18 LIVE WIRE: "live lanes" replace his electrified corner. After a punch
    // string the lane he struck charges up (warning), then runs live for a beat:
    // standing in it shocks you. It forces a lane change — lane boxing, not corners.
    LIVE_LANE: { warnFrames: 26, liveFrames: 80, tickEvery: 24, damage: 6 },

    // --- v19 HOLD THE LINE: enemies stop at a line in front of the Striker in EVERY
    // lane instead of walking past him and off-screen (playtest: "is it possible to
    // end all enemies on each map? right now it doesn't"). Every enemy can now be
    // KO'd — a stage only clears when they all are. Zoners hold back at range.
    HOLD_LINE: { melee: 90, zoner: 200, reach: 105 }, // zoners keep range — press forward to reach them

    // --- v19 PLAYER HIT FEEL: taking a hit now has weight — hit-stop on the
    // Striker, a knockback slide, longer hitstun, and heavy boss blows (or a boss
    // catching you mid-punch while it isn't OPEN: a COUNTER HIT) FLOOR you.
    PLAYER_HIT: {
        hitStun: { light: 9, heavy: 18 },
        hitStop: { light: 3, heavy: 6 },
        slide: { light: 4, heavy: 9 },
        floorFrames: 46, floorGrace: 22,
        counterHitMult: 1.5
    },

    // --- v17 PUNCH STRINGS -------------------------------------------------------
    // Selected enemies throw 2-3 hit strings. Every hit re-targets your lane and
    // gets its own full telegraph from getSlipThresholds (the single source of
    // truth), so a string is a sequence of reads, not one read and a surprise.
    PUNCH_STRINGS: {
        types: ['grunt', 'assassin'],
        chanceByArc: { 1: 0, 2: 0.3, 3: 0.4, 4: 0.5, 5: 0.6 },
        lenByArc: { 1: 2, 2: 2, 3: 2, 4: 3, 5: 3 },
        gap: 28                  // frames between string hits (> red telegraph lead)
    },

    // --- v17 TEN-COUNT (player only) ----------------------------------------------
    KNOCKDOWN: {
        framesPerCount: 50,      // 10 counts ~ 8.3s
        promptsByArc: { 1: 3, 2: 4, 3: 5, 4: 5, 5: 5 },
        beatFrames: 34,
        windowEarly: 14, windowLate: 12,
        // v18: HP on the way up depends on how cleanly you hit the prompts.
        perfectWindow: 5,
        hpBase: 0.25, hpSpan: 0.5, hpMin: 0.2, hpMax: 0.75,
        invulnFrames: 90
    },

    // --- v17 INSTINCT ZONE ---------------------------------------------------------
    // A Perfect Slip with a FULL Instinct meter drops the world into slow-mo with a
    // colour-inverted screen (screen effect only). Enemies tick every `enemyTick`
    // frames while the Striker moves at full speed.
    ZONE: { frames: 180, enemyTick: 2, maxHold: 120, knockbackMult: 0.45 },

    // v18: the poster plays in, then HOLDS on this frame until the player presses
    // something (then "FIGHT!" plays out).
    POSTER_HOLD_FRAME: 50,

    // --- v17 BOSS BILLING (title-fight posters) ----------------------------------
    BOSS_BILLING: {
        neon_enforcer: { tagline: 'THE ARMORED LAW' },
        phantom_boxer: { tagline: 'THE MAN WHO ISN’T THERE' },
        static_monk:   { tagline: 'THE STATIC SAINT' },
        live_wire:     { tagline: 'THE CURRENT CHAMPION' },
        negative:      { tagline: 'YOUR OWN WORST ENEMY' }
    },

    // --- BOSS STAGGER + FINISHER (v16) ---
    // Raw hits deal full damage. Crossing 66% and 33% HP staggers the boss into an
    // authored Finisher; the killing blow opens a final KO Finisher. Prompts are on a
    // fixed beat grid — mashing reads as TOO EARLY and ends the stagger (no other
    // penalty). Every sequence starts from the MID lane; UP/DOWN prompts are authored
    // so the lane path never leaves the ring (validated in tests/harness.mjs).
    FINISHER: {
        thresholds: [0.66, 0.33],
        beatFrames: 42,          // v19: slower (~86 BPM at 60fps)
        leadBeats: 1,            // a prompt appears one beat before it lands
        windowEarly: 12,         // frames before the beat a press still counts
        windowLate: 9,           // frames after the beat before it's a miss
        perfectWindow: 4,
        introFrames: 42,
        outroFrames: 34,
        breakDamageFrac: 0.14,   // total of a fully-landed 66%/33% finisher, of max HP
        zoom: 1.24,
        sequences: {
            neon_enforcer: {
                break1: ['jab', 'jab', 'cross', 'hook'],
                break2: ['jab', 'cross', 'down', 'hook', 'cross'],
                ko:     ['hook', 'cross', 'up', 'jab', 'down', 'cross']
            },
            phantom_boxer: {
                break1: ['up', 'jab', 'down', 'cross'],
                break2: ['down', 'hook', 'up', 'up', 'cross'],
                ko:     ['up', 'jab', 'down', 'down', 'hook', 'cross']
            },
            static_monk: {
                break1: ['down', 'up', 'cross', 'jab'],
                break2: ['up', 'hook', 'down', 'down', 'cross'],
                ko:     ['jab', 'down', 'up', 'up', 'hook', 'cross']
            },
            // Corner reversal: you spin him into his own electrified wires.
            live_wire: {
                break1: ['jab', 'hook', 'down', 'cross'],
                break2: ['up', 'cross', 'cross', 'down', 'hook'],
                ko:     ['hook', 'up', 'cross', 'down', 'down', 'cross']
            },
            negative: {
                break1: ['down', 'cross', 'up', 'jab'],
                break2: ['jab', 'up', 'hook', 'down', 'cross'],
                ko:     ['up', 'down', 'down', 'up', 'jab', 'cross']
            }
        }
    },

    // --- BOSS OFFENSE AUDIT (v16) ---
    // Every boss attack gets (1) a telegraph — sound + a filling windup meter over the
    // boss + a red lane warning — at least `minTelegraphLead` frames before impact,
    // and (2) a readable punish window after it resolves: the boss visibly slumps
    // OPEN, can't attack or move, takes bonus damage, and its anti-mash defenses
    // (armor recoil, Phantom Shift) are OFF. Losses come from missed reads.
    BOSS_OFFENSE: {
        telegraphLead: 30,
        minTelegraphLead: 22,
        punishFrames: { jab: 28, bash: 52, feint: 34 },
        minPunishFrames: 18,
        punishDamageMult: 1.25,
        desperationCooldownMult: 0.8
    },
    STAGE_NAMES: ["Shattered Cathedral", "Glass Reliquary", "Ashen Cloister", "Midnight Causeway", "Abyss Rail", "Throne of Static", "Boss Chamber"],

    // --- ARENA PALETTES (keyed by LEVEL KEY; boss chamber shares Throne's) ---
    // Stored as RGB triples so stage transitions can MORPH one arena into the next
    // instead of hard-cutting (see render/atmosphere.js).
    PALETTES: {
        1: { top: [2, 2, 5],    mid: [5, 5, 10],   bot: [10, 10, 20],  accent: [0, 255, 255, 0.02], shard: [0, 255, 255, 0.05] },
        2: { top: [0, 26, 26],  mid: [0, 43, 51],  bot: [0, 64, 77],   accent: [0, 255, 255, 0.04], shard: [0, 255, 255, 0.09] },
        3: { top: [26, 5, 5],   mid: [43, 10, 10], bot: [77, 16, 16],  accent: [255, 50, 50, 0.03], shard: [255, 50, 50, 0.06] },
        4: { top: [20, 0, 38],  mid: [32, 0, 59],  bot: [61, 0, 77],   accent: [255, 0, 255, 0.03], shard: [255, 0, 255, 0.08] },
        5: { top: [0, 0, 0],    mid: [2, 5, 2],    bot: [5, 16, 5],    accent: [0, 255, 0, 0.02],   shard: [0, 255, 0, 0.04] },
        6: { top: [26, 26, 26], mid: [51, 51, 51], bot: [77, 77, 77],  accent: [255, 255, 255, 0.05], shard: [255, 255, 255, 0.15] }
    },
    paletteKeyForStage: (stage) => {
        const k = CONSTANTS.getLevelInArc(stage);
        return k === CONSTANTS.BOSS_LEVEL_KEY ? 6 : k;
    },

    // --- MENACE (target-priority: consequence of ignoring) ---
    // Some enemies get WORSE the longer they live, so target selection matters — you
    // prioritize them because ignoring them costs you, not because killing them gifts
    // you (keeps the game about staying alive by skill, not farming rewards). Purely
    // time-based (no RNG) so it's fully deterministic / Daily-safe. Every escalation is
    // telegraphed: the enemy visibly brightens + a floating "HARDENING" callout.
    // Cooldown floors stay above each enemy's tell frame (Bruiser 22, Zoner 40), so the
    // slip-read never breaks no matter how hardened they get.
    MENACE: {
        framesPerLevel: 150,
        maxLevel: 3,
        bruiser: { cooldownCutPerLevel: 12, minCooldown: 44, speedBonusPerLevel: 0.12, colors: ['#cc0000', '#e01818', '#ff2a2a', '#ff5050'] },
        zoner:   { cooldownCutPerLevel: 12, minCooldown: 55, speedBonusPerLevel: 0.0,  colors: ['#00ff00', '#40ff40', '#80ff40', '#a0ff20'] }
    },

    // --- LANE HAZARDS (surprise injector) ---
    // Occasionally the arena itself threatens a lane: a warning band pulses, then the
    // rail overloads and strikes that lane. Get out or eat it. "Used wisely" — a
    // signature of Arc 4 ("Mirage / tells become less literal") and Arc 5, never before.
    // There are always two safe lanes, the warning is long and unmistakable (amber, not
    // the red/white slip colours), and a Ghost Step evades. Seeded -> Daily-safe.
    HAZARDS: {
        chanceByArc: { 1: 0, 2: 0, 3: 0, 4: 0.5, 5: 0.6 }, // rolled once per cooldown window
        // HARD CAP per stage. The per-window cooldown alone is NOT a frequency limit:
        // a ~60s stage is ~12 windows, so 0.6/window produced ~7 hazards per stage —
        // ambient weather, not the blueprint's "one meaningful surprise per stage".
        // The cap is what actually makes hazards read as punctuation.
        maxPerStageByArc: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 },
        warnFrames: 78,        // ~1.3s telegraph before the strike
        strikeFrames: 20,      // active-damage window
        cooldownFrames: 300,   // minimum gap between hazard rolls (~5s)
        damage: 22
    },

    // --- SURPRISE BUDGET (blueprint §4: "one meaningful surprise per stage,
    // never two stacked") ---
    // Formations, lane tempo, menace and hazards previously had zero awareness of
    // each other, so Arc 5 could run a hot lane + hazards + dense formations at once
    // with nothing preventing it. Every ACUTE surprise system now draws from one
    // per-stage pool, which makes the blueprint rule real instead of aspirational.
    // (Formations and menace are deliberately NOT charged: formations are wave
    // *composition* and menace is a slow, self-inflicted escalation the player
    // controls by killing things — neither is an acute interrupt.)
    // Arcs 1-4 get ONE acute surprise per stage — so a stage is EITHER a hot lane
    // OR a hazard, never both. Arc 5 ("Dominion / everything at once") is the single
    // deliberate exception at two, and even there a hot lane spends one of them.
    SURPRISE: {
        budgetByArc: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 2 },
        hotLaneCost: 1,
        hazardCost: 1
    },

    // --- LANE TEMPO ("hot lane") ---
    // A hot lane multiplies its enemies' APPROACH speed only (never the telegraph), so
    // there's less runway to react. Deliberately SELECTIVE: the signature of Arc 3
    // ("Compression / the ring tightens"), occasional elsewhere, never in Arc 1 (teach)
    // and never on a boss stage (keep the duel clean). Seeded -> Daily-identical.
    LANE_TEMPO: {
        hotMult: 1.35,
        hotChanceByArc: { 1: 0.0, 2: 0.15, 3: 0.6, 4: 0.35, 5: 0.5 }
    },

    // --- FORMATION RULES (systemic "squads") ---
    // A layer over the authored packets: a Zoner sometimes gets a Shield barricade in
    // front of it (break the wall to reach the shooter); an Assassin sometimes hides
    // screened behind a tank. Read via CONSTANTS.formationChance(kind, arc). Rare in
    // Arc 1 (teach the read), common by Arc 5. Applied with the SEEDED rng so a Daily
    // is identical for everyone that day while free-play varies run to run.
    FORMATION_RULES: {
        barricade: { 1: 0.15, 2: 0.32, 3: 0.50, 4: 0.65, 5: 0.80 }, // Zoner  -> Shield in front
        screen:    { 1: 0.10, 2: 0.22, 3: 0.36, 4: 0.50, 5: 0.62 }, // Assassin -> Shield screen
        maxAddsPerPacket: 2
    }
};