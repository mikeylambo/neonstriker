export const CONSTANTS = {
    LANE_Y: [0.35, 0.55, 0.75], // Top, Mid, Bottom visual spacing
    
    // --- ARC MATH HELPERS ---
    getArcIndex: (stage) => Math.floor((stage - 1) / 7) + 1,
    getLevelInArc: (stage) => ((stage - 1) % 7) + 1,
    isBossStage: (stage) => (((stage - 1) % 7) + 1) === 7,
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
    AFFIXES: [
        { name: 'NONE', desc: 'System stable. No anomalies detected.', mods: {} },
        { name: 'SURGE', desc: 'Instinct gain increased by 50%.', mods: { instinctGainMult: 1.5 } },
        { name: 'FAST CROWD', desc: 'Ranks arrive denser and faster — Assassins swell the crowd.', mods: { packetDelayMult: 0.7, speedMult: 1.12, gruntSub: 'assassin', gruntSubEvery: 2 } },
        { name: 'IRON WALL', desc: 'The ranks harden. More Gold Armor — break it with Cross [S].', mods: { gruntSub: 'shield', gruntSubEvery: 2 } },
        { name: 'HEAVY HANDS', desc: 'Bruisers hit harder and press in numbers. Keep your footwork.', mods: { bruiserDamageMult: 1.4, gruntSub: 'bruiser', gruntSubEvery: 4 } },
        { name: 'ADRENALINE', desc: 'Every Perfect Slip mends a sliver of health.', mods: { perfectSlipHeal: 4 } },
        { name: 'GLASS PROTOCOL', desc: 'You deal 30% more — and take 30% more. No margin for a miss.', mods: { playerDamageDealtMult: 1.3, playerDamageTakenMult: 1.3 } }
    ],
    STAGE_NAMES: ["Shattered Cathedral", "Glass Reliquary", "Ashen Cloister", "Midnight Causeway", "Abyss Rail", "Throne of Static", "Boss Chamber"],

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