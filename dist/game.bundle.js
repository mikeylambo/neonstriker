(() => {
  // src/constants.js
  var CONSTANTS = {
    LANE_Y: [0.35, 0.55, 0.75],
    // Top, Mid, Bottom visual spacing
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
    locateStage: (stage2) => {
      let s = Math.max(1, Math.floor(stage2) || 1), arc = 1;
      while (s > CONSTANTS.arcLength(arc)) {
        s -= CONSTANTS.arcLength(arc);
        arc++;
      }
      return { arc, ordinal: s, levelKey: CONSTANTS.arcLevelKeys(arc)[s - 1] };
    },
    firstStageOfArc: (arc) => {
      let stage2 = 1;
      for (let a = 1; a < arc; a++) stage2 += CONSTANTS.arcLength(a);
      return stage2;
    },
    bossStageOfArc: (arc) => CONSTANTS.firstStageOfArc(arc) + CONSTANTS.arcLength(arc) - 1,
    // --- ARC MATH HELPERS ---
    getArcIndex: (stage2) => CONSTANTS.locateStage(stage2).arc,
    // Returns the LEVEL KEY (1-7) for content lookups, not the ordinal position.
    getLevelInArc: (stage2) => CONSTANTS.locateStage(stage2).levelKey,
    isBossStage: (stage2) => CONSTANTS.locateStage(stage2).levelKey === CONSTANTS.BOSS_LEVEL_KEY,
    // The stage number this fight WOULD have had under the original uniform
    // 7-per-arc layout. Enemy/boss HP scaling reads this so compressing Arc 1 does
    // not quietly make every later arc easier (Arc 2+ scale exactly as before).
    difficultyStage: (stage2) => {
      const { arc, levelKey } = CONSTANTS.locateStage(stage2);
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
      if (enemyType === "zoner") return { perfect: 10 + progressionBonus, good: 24 };
      if (enemyType === "bruiser") return { perfect: 14 + progressionBonus, good: 26 };
      if (enemyType === "assassin") return { perfect: 5 + progressionBonus, good: 10 };
      return { perfect: 8 + progressionBonus, good: 16 };
    },
    getBossArcMods: (bossId, arcIndex) => {
      const mods = CONSTANTS.BOSS_ARC_MODS[bossId];
      return mods[Math.min(arcIndex, 5)] || mods[5];
    },
    // --- ARC LAWS ---
    ARC_LAWS: {
      1: {
        id: "arc1_foundation",
        name: "Foundation",
        shortName: "ARC 1",
        theme: "Learn the language of lane-boxing.",
        uiText: "The duel begins. Read, slip, space, punish.",
        globalMods: { enemyRecoveryMult: 1, packetDelayMult: 1, packetDensityMult: 1, railSpeedMult: 1, maxBreatherCut: 0 }
      },
      2: {
        id: "arc2_distortion",
        name: "Distortion",
        shortName: "ARC 2",
        theme: "Success is no longer the end of the exchange.",
        uiText: "Old answers still work. Respect the second beat.",
        globalMods: { enemyRecoveryMult: 0.9, packetDelayMult: 0.92, packetDensityMult: 1.05, railSpeedMult: 1.08, maxBreatherCut: 10 }
      },
      3: {
        id: "arc3_compression",
        name: "Compression",
        shortName: "ARC 3",
        theme: "Space is harder to keep.",
        uiText: "The ring tightens. Make your own space.",
        globalMods: { enemyRecoveryMult: 0.88, packetDelayMult: 0.86, packetDensityMult: 1.15, railSpeedMult: 1.14, maxBreatherCut: 18 }
      },
      4: {
        id: "arc4_mirage",
        name: "Mirage",
        shortName: "ARC 4",
        theme: "Tells become less literal.",
        uiText: "Calm beats panic. Read the real strike.",
        globalMods: { enemyRecoveryMult: 0.9, packetDelayMult: 0.9, packetDensityMult: 1.1, railSpeedMult: 1.18, maxBreatherCut: 16 }
      },
      5: {
        id: "arc5_dominion",
        name: "Dominion",
        shortName: "ARC 5",
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
        1: { armoredRetaliationChain: 1, jabPressureMult: 1, walkDownMult: 1, retaliationTimingVariant: false, punishWindowMult: 1 },
        2: { armoredRetaliationChain: 2, jabPressureMult: 1.08, walkDownMult: 1.04, retaliationTimingVariant: false, punishWindowMult: 0.95 },
        3: { armoredRetaliationChain: 2, jabPressureMult: 1.15, walkDownMult: 1.12, retaliationTimingVariant: false, punishWindowMult: 0.92 },
        4: { armoredRetaliationChain: 2, jabPressureMult: 1.15, walkDownMult: 1.12, retaliationTimingVariant: true, punishWindowMult: 0.88 },
        5: { armoredRetaliationChain: 2, jabPressureMult: 1.22, walkDownMult: 1.18, retaliationTimingVariant: true, punishWindowMult: 0.82 }
      },
      phantom_boxer: {
        1: { reentryDelayVariant: false, fakeLaneFlash: false, afterimageThreat: false, lanePinchBias: 0, punishWindowMult: 1 },
        2: { reentryDelayVariant: true, fakeLaneFlash: false, afterimageThreat: false, lanePinchBias: 0.15, punishWindowMult: 0.95 },
        3: { reentryDelayVariant: true, fakeLaneFlash: false, afterimageThreat: false, lanePinchBias: 0.3, punishWindowMult: 0.92 },
        4: { reentryDelayVariant: true, fakeLaneFlash: true, afterimageThreat: true, lanePinchBias: 0.35, punishWindowMult: 0.86 },
        5: { reentryDelayVariant: true, fakeLaneFlash: true, afterimageThreat: true, lanePinchBias: 0.45, punishWindowMult: 0.8 }
      },
      // v17 bosses. They headline Arc 4 / Arc 5; the arc-1..3 rows only matter
      // for endless rotation and tests.
      live_wire: {
        1: { stringLength: 2, walkDownMult: 1, punishWindowMult: 1, shoveEvery: 3 },
        2: { stringLength: 2, walkDownMult: 1.05, punishWindowMult: 0.96, shoveEvery: 3 },
        3: { stringLength: 3, walkDownMult: 1.1, punishWindowMult: 0.94, shoveEvery: 3 },
        4: { stringLength: 3, walkDownMult: 1.15, punishWindowMult: 0.9, shoveEvery: 2 },
        5: { stringLength: 3, walkDownMult: 1.2, punishWindowMult: 0.86, shoveEvery: 2 }
      },
      negative: {
        1: { echoChance: 0.35, counterRead: 0.5, punishWindowMult: 1 },
        2: { echoChance: 0.4, counterRead: 0.6, punishWindowMult: 0.96 },
        3: { echoChance: 0.45, counterRead: 0.7, punishWindowMult: 0.93 },
        4: { echoChance: 0.5, counterRead: 0.8, punishWindowMult: 0.9 },
        5: { echoChance: 0.55, counterRead: 0.9, punishWindowMult: 0.86 }
      },
      static_monk: {
        1: { patternChainLength: 1, teleportRateMult: 1, followupPattern: false, deceptiveOrder: false, summonSupportPressure: false },
        2: { patternChainLength: 2, teleportRateMult: 1.05, followupPattern: true, deceptiveOrder: false, summonSupportPressure: false },
        3: { patternChainLength: 2, teleportRateMult: 1.1, followupPattern: true, deceptiveOrder: false, summonSupportPressure: true },
        4: { patternChainLength: 2, teleportRateMult: 1.12, followupPattern: true, deceptiveOrder: true, summonSupportPressure: true },
        5: { patternChainLength: 3, teleportRateMult: 1.18, followupPattern: true, deceptiveOrder: true, summonSupportPressure: true }
      }
    },
    // Reads an affix modifier with a default. Affix effects are data-driven via the
    // `mods` object on each entry rather than scattered `name === '...'` checks, so a
    // new affix is defined in one place and every system already respects it.
    affixMod: (affix, key, def) => affix && affix.mods && affix.mods[key] !== void 0 ? affix.mods[key] : def,
    // Probability (per arc) that a shooter gets a barricade / an assassin gets a screen.
    // NEVER 1.0 by design — coverage must stay unpredictable so waves can't be reduced
    // to rote muscle memory, and the ramp across arcs doubles as macro tension/release.
    formationChance: (kind, arcIndex) => {
      const a = Math.max(1, Math.min(5, arcIndex));
      const table = CONSTANTS.FORMATION_RULES[kind] || {};
      return table[a] !== void 0 ? table[a] : 0;
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
      { name: "NONE", desc: "System stable. No anomalies detected.", mods: {} },
      { name: "SURGE", desc: "Instinct gain increased by 50%.", mods: { instinctGainMult: 1.5 } },
      { name: "FAST CROWD", desc: "Ranks arrive denser and faster \u2014 Assassins swell the crowd.", scoreMult: 1.5, mods: { packetDelayMult: 0.7, speedMult: 1.12, gruntSub: "assassin", gruntSubEvery: 2 } },
      { name: "IRON WALL", desc: "The ranks harden. More Gold Armor \u2014 break it with a Cross.", scoreMult: 1.3, mods: { gruntSub: "shield", gruntSubEvery: 2 } },
      { name: "HEAVY HANDS", desc: "Bruisers hit harder and press in numbers. Keep your footwork.", scoreMult: 1.4, mods: { bruiserDamageMult: 1.4, gruntSub: "bruiser", gruntSubEvery: 4 } },
      { name: "ADRENALINE", desc: "Every Perfect Slip mends a sliver of health.", mods: { perfectSlipHeal: 4 } },
      { name: "GLASS PROTOCOL", desc: "You deal 30% more \u2014 and take 30% more. No margin for a miss.", scoreMult: 1.75, mods: { playerDamageDealtMult: 1.3, playerDamageTakenMult: 1.3 } }
    ],
    wagerPool: () => CONSTANTS.AFFIXES.filter((a) => a.scoreMult && a.scoreMult > 1),
    WAGERS: {
      firstStage: 2
      // stage 1 is the tutorial/onboarding fight — never wagered
    },
    // Per-level stage-card taglines (keyed by LEVEL KEY). The arc theme line ("Learn
    // the language of lane-boxing.") used to be the subtitle of EVERY stage in its
    // arc — playtest: it "doesn't need to keep surfacing". Arc themes now appear on
    // an arc's chapter card, Arc 1's only once per save, and stages use these.
    STAGE_TAGLINES: {
      1: "Fundamentals. Find the rhythm.",
      2: "Lane awareness. Watch every rail.",
      3: "Target priority. Choose who falls first.",
      4: "The flowing river. Keep moving.",
      5: "Crack the formation.",
      6: "The composure exam.",
      7: "The duel."
    },
    // --- LIVE SCORE (v16) ---
    // Score is earned live and shown on the HUD, so it can actually be played for.
    // Every award is multiplied by the combo multiplier (and an accepted wager).
    SCORE: {
      comboStep: 5,
      // every 5 combo...
      comboMultStep: 0.25,
      // ...adds +0.25x
      maxComboMult: 4,
      hit: { jab: 10, jab3: 20, hook: 30, cross: 40, guard: 5 },
      counterHitMult: 2,
      punishBonus: 60,
      // landing a hit inside a boss's OPEN window
      perfectSlip: 150,
      goodSlip: 25,
      perfectGhostStep: 100,
      kill: { grunt: 50, shield: 90, assassin: 90, zoner: 110, bruiser: 180 },
      finisherHit: 400,
      finisherPerfect: 200,
      finisherClean: 1500,
      // bonus for landing every prompt of a finisher
      bossKo: 3e3,
      // x arc index
      stageClear: 500,
      // ALL CLEAR: flat, NOT combo-multiplied (wager still applies)
      flawless: 1e3,
      // v19: cleared the stage without taking a hit
      // Letter rank thresholds (score). Calibrated against the headless bot sim
      // (tests/v16.mjs "SCORE CALIBRATION"): a stage-4 death lands ~8-12k (C), a
      // clean Arc 1 clear ~45k (B), deep Arc 2-3 runs 150k+ (S). S also needs reads.
      rank: { S: 15e4, A: 5e4, B: 15e3 }
    },
    // --- v17 PROGRESSION: three linear 5-rank trees --------------------------
    // Ranks 1/2/4 = stat ranks, rank 3 = a VERB change, rank 5 = Apex. How far a
    // tree can climb is capped by arc, so the run's power curve follows the arcs.
    // Each tree owns one signature neon colour; Fusions mix two of them. Colour
    // appears on cards, punch trails, hit sparks and the afterimage — never on the
    // Striker's body or gloves (his silhouette stays clean).
    TREES: {
      speed: { name: "SPEED", short: "SPD", color: "#22d3ee" },
      // cyan
      power: { name: "POWER", short: "PWR", color: "#ff2bd6" },
      // magenta
      technique: { name: "TECHNIQUE", short: "TEC", color: "#facc15" }
      // yellow
    },
    TREE_ORDER: ["speed", "power", "technique"],
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
      fuse_dempsey_circuit: "#a855f7",
      // cyan + magenta = violet
      fuse_ghost_counter: "#4ade80",
      // cyan + yellow  = lime
      fuse_shatter_read: "#ff7a3d",
      // magenta + yellow = orange
      evo_infinite_circuit: "#c9a0ff",
      evo_phantom_riposte: "#9dffb8",
      evo_shatter_nova: "#ffb07a"
    },
    FUSION_TREES: {
      fuse_dempsey_circuit: ["speed", "power"],
      fuse_ghost_counter: ["speed", "technique"],
      fuse_shatter_read: ["power", "technique"]
    },
    // --- v17 RANK-3 VERBS --------------------------------------------------------
    VERBS: {
      pivotSlip: { advance: 55, instantWindow: 20 },
      // Speed R3
      loadedCross: { chargeFrames: 18, maxFrames: 42, knockback: 70, stun: 45 },
      // Power R3
      afterimage: { delay: 16, damage: 26, stun: 22, reach: 150 }
      // Technique R3
    },
    // --- FOOTWORK (v18: the v17 ropes are gone — playtest: they cost the game its
    // lane-boxing identity and its sense of forward motion). Just the stage edges.
    FOOTWORK: {
      minX: 90,
      maxX: 320,
      advanceSpd: 3,
      retreatSpd: 3.4,
      homePull: 0.02,
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
    HOLD_LINE: { melee: 90, zoner: 200, reach: 105 },
    // zoners keep range — press forward to reach them
    // --- v19 PLAYER HIT FEEL: taking a hit now has weight — hit-stop on the
    // Striker, a knockback slide, longer hitstun, and heavy boss blows (or a boss
    // catching you mid-punch while it isn't OPEN: a COUNTER HIT) FLOOR you.
    PLAYER_HIT: {
      hitStun: { light: 9, heavy: 18 },
      hitStop: { light: 3, heavy: 6 },
      slide: { light: 4, heavy: 9 },
      floorFrames: 46,
      floorGrace: 22,
      counterHitMult: 1.5
    },
    // --- v17 PUNCH STRINGS -------------------------------------------------------
    // Selected enemies throw 2-3 hit strings. Every hit re-targets your lane and
    // gets its own full telegraph from getSlipThresholds (the single source of
    // truth), so a string is a sequence of reads, not one read and a surprise.
    PUNCH_STRINGS: {
      types: ["grunt", "assassin"],
      chanceByArc: { 1: 0, 2: 0.3, 3: 0.4, 4: 0.5, 5: 0.6 },
      lenByArc: { 1: 2, 2: 2, 3: 2, 4: 3, 5: 3 },
      gap: 28
      // frames between string hits (> red telegraph lead)
    },
    // --- v17 TEN-COUNT (player only) ----------------------------------------------
    KNOCKDOWN: {
      framesPerCount: 50,
      // 10 counts ~ 8.3s
      promptsByArc: { 1: 3, 2: 4, 3: 5, 4: 5, 5: 5 },
      beatFrames: 34,
      windowEarly: 14,
      windowLate: 12,
      // v18: HP on the way up depends on how cleanly you hit the prompts.
      perfectWindow: 5,
      hpBase: 0.25,
      hpSpan: 0.5,
      hpMin: 0.2,
      hpMax: 0.75,
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
      neon_enforcer: { tagline: "THE ARMORED LAW" },
      phantom_boxer: { tagline: "THE MAN WHO ISN\u2019T THERE" },
      static_monk: { tagline: "THE STATIC SAINT" },
      live_wire: { tagline: "THE CURRENT CHAMPION" },
      negative: { tagline: "YOUR OWN WORST ENEMY" }
    },
    // --- BOSS STAGGER + FINISHER (v16) ---
    // Raw hits deal full damage. Crossing 66% and 33% HP staggers the boss into an
    // authored Finisher; the killing blow opens a final KO Finisher. Prompts are on a
    // fixed beat grid — mashing reads as TOO EARLY and ends the stagger (no other
    // penalty). Every sequence starts from the MID lane; UP/DOWN prompts are authored
    // so the lane path never leaves the ring (validated in tests/harness.mjs).
    FINISHER: {
      thresholds: [0.66, 0.33],
      beatFrames: 42,
      // v19: slower (~86 BPM at 60fps)
      leadBeats: 1,
      // a prompt appears one beat before it lands
      windowEarly: 12,
      // frames before the beat a press still counts
      windowLate: 9,
      // frames after the beat before it's a miss
      perfectWindow: 4,
      introFrames: 42,
      outroFrames: 34,
      breakDamageFrac: 0.14,
      // total of a fully-landed 66%/33% finisher, of max HP
      zoom: 1.24,
      sequences: {
        neon_enforcer: {
          break1: ["jab", "jab", "cross", "hook"],
          break2: ["jab", "cross", "down", "hook", "cross"],
          ko: ["hook", "cross", "up", "jab", "down", "cross"]
        },
        phantom_boxer: {
          break1: ["up", "jab", "down", "cross"],
          break2: ["down", "hook", "up", "up", "cross"],
          ko: ["up", "jab", "down", "down", "hook", "cross"]
        },
        static_monk: {
          break1: ["down", "up", "cross", "jab"],
          break2: ["up", "hook", "down", "down", "cross"],
          ko: ["jab", "down", "up", "up", "hook", "cross"]
        },
        // Corner reversal: you spin him into his own electrified wires.
        live_wire: {
          break1: ["jab", "hook", "down", "cross"],
          break2: ["up", "cross", "cross", "down", "hook"],
          ko: ["hook", "up", "cross", "down", "down", "cross"]
        },
        negative: {
          break1: ["down", "cross", "up", "jab"],
          break2: ["jab", "up", "hook", "down", "cross"],
          ko: ["up", "down", "down", "up", "jab", "cross"]
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
      1: { top: [2, 2, 5], mid: [5, 5, 10], bot: [10, 10, 20], accent: [0, 255, 255, 0.02], shard: [0, 255, 255, 0.05] },
      2: { top: [0, 26, 26], mid: [0, 43, 51], bot: [0, 64, 77], accent: [0, 255, 255, 0.04], shard: [0, 255, 255, 0.09] },
      3: { top: [26, 5, 5], mid: [43, 10, 10], bot: [77, 16, 16], accent: [255, 50, 50, 0.03], shard: [255, 50, 50, 0.06] },
      4: { top: [20, 0, 38], mid: [32, 0, 59], bot: [61, 0, 77], accent: [255, 0, 255, 0.03], shard: [255, 0, 255, 0.08] },
      5: { top: [0, 0, 0], mid: [2, 5, 2], bot: [5, 16, 5], accent: [0, 255, 0, 0.02], shard: [0, 255, 0, 0.04] },
      6: { top: [26, 26, 26], mid: [51, 51, 51], bot: [77, 77, 77], accent: [255, 255, 255, 0.05], shard: [255, 255, 255, 0.15] }
    },
    paletteKeyForStage: (stage2) => {
      const k = CONSTANTS.getLevelInArc(stage2);
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
      bruiser: { cooldownCutPerLevel: 12, minCooldown: 44, speedBonusPerLevel: 0.12, colors: ["#cc0000", "#e01818", "#ff2a2a", "#ff5050"] },
      zoner: { cooldownCutPerLevel: 12, minCooldown: 55, speedBonusPerLevel: 0, colors: ["#00ff00", "#40ff40", "#80ff40", "#a0ff20"] }
    },
    // --- LANE HAZARDS (surprise injector) ---
    // Occasionally the arena itself threatens a lane: a warning band pulses, then the
    // rail overloads and strikes that lane. Get out or eat it. "Used wisely" — a
    // signature of Arc 4 ("Mirage / tells become less literal") and Arc 5, never before.
    // There are always two safe lanes, the warning is long and unmistakable (amber, not
    // the red/white slip colours), and a Ghost Step evades. Seeded -> Daily-safe.
    HAZARDS: {
      chanceByArc: { 1: 0, 2: 0, 3: 0, 4: 0.5, 5: 0.6 },
      // rolled once per cooldown window
      // HARD CAP per stage. The per-window cooldown alone is NOT a frequency limit:
      // a ~60s stage is ~12 windows, so 0.6/window produced ~7 hazards per stage —
      // ambient weather, not the blueprint's "one meaningful surprise per stage".
      // The cap is what actually makes hazards read as punctuation.
      maxPerStageByArc: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 },
      warnFrames: 78,
      // ~1.3s telegraph before the strike
      strikeFrames: 20,
      // active-damage window
      cooldownFrames: 300,
      // minimum gap between hazard rolls (~5s)
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
      hotChanceByArc: { 1: 0, 2: 0.15, 3: 0.6, 4: 0.35, 5: 0.5 }
    },
    // --- FORMATION RULES (systemic "squads") ---
    // A layer over the authored packets: a Zoner sometimes gets a Shield barricade in
    // front of it (break the wall to reach the shooter); an Assassin sometimes hides
    // screened behind a tank. Read via CONSTANTS.formationChance(kind, arc). Rare in
    // Arc 1 (teach the read), common by Arc 5. Applied with the SEEDED rng so a Daily
    // is identical for everyone that day while free-play varies run to run.
    FORMATION_RULES: {
      barricade: { 1: 0.15, 2: 0.32, 3: 0.5, 4: 0.65, 5: 0.8 },
      // Zoner  -> Shield in front
      screen: { 1: 0.1, 2: 0.22, 3: 0.36, 4: 0.5, 5: 0.62 },
      // Assassin -> Shield screen
      maxAddsPerPacket: 2
    }
  };

  // src/state.js
  var gameState = {
    screen: "start",
    previousScreen: "start",
    runCount: 0,
    strikerColor: "#00ffff",
    // cosmetic: player's neon, set from the selected unlocked skin
    dailyMode: false,
    dailyDateKey: null,
    width: 0,
    height: 0,
    scrollX: 0,
    health: 100,
    maxHealth: 100,
    combo: 0,
    instinctMeter: 0,
    isInstinct: false,
    instinctPauseTimer: 0,
    shake: 0,
    hitstop: 0,
    exp: 0,
    expNeeded: 8,
    pendingUpgrades: 0,
    totalLevel: 0,
    draftedThisBreather: false,
    // Core Progression
    orbCounts: { speed: 0, power: 0, technique: 0 },
    stats: { speedMult: 1, powerMult: 1, techMult: 1 },
    // Flat Registry & Draft Memory
    acquiredUpgradeIds: [],
    recentlyOffered: [],
    currentDraftOptions: [],
    overclockCounts: { vitality: 0, nerves: 0, focus: 0, instinct: 0, clinch: 0, finish: 0 },
    // Live Gameplay Modifiers
    progressionMods: {
      ghostStepCooldownMult: 1,
      hookRecoveryMult: 1,
      relentlessRhythm: false,
      crossArmorStunBonus: 0,
      hookKnockbackFloor: 0,
      hardTargetInstinctFlat: 0,
      hardTargetExpFlat: 0,
      perfectSlipWindowBonus: 0,
      bossExposeBonusFrames: 0,
      perfectSlipHeal: 0,
      dempseyCircuit: false,
      dempseyRecoveryBonus: 0,
      ghostCounter: false,
      shatterRead: false,
      shatterReadBossBypass: 0,
      shatterReadStaggerBonus: 0,
      perfectSlipRewardBonusMult: 0,
      instinctGainBonusMult: 0,
      incomingRecoilMult: 1,
      expGainBonusMult: 0,
      guardRead: false,
      blurStep: false,
      executionerCross: false,
      flowState: false
    },
    currentStage: 1,
    stageProgress: 0,
    // LANE TEMPO: per-lane approach-speed multiplier (1 = normal). A "hot" lane pushes
    // its enemies at you faster (less runway) WITHOUT touching attack telegraphs — the
    // slip-read stays sacred. Selective, telegraphed, set per stage in advanceStage.
    laneTempo: [1, 1, 1],
    hotLane: -1,
    // LANE HAZARDS: active environmental lane-strikes (surprise injector, Arc 4-5).
    hazards: [],
    hazardCooldown: 0,
    hazardsThisStage: 0,
    // per-stage hazard count (hard cap, see CONSTANTS.HAZARDS)
    surpriseBudget: 0,
    // shared per-stage acute-surprise pool (CONSTANTS.SURPRISE)
    spawnTotal: 0,
    stageClearing: false,
    bossActive: false,
    bossDefeatedThisStage: false,
    // FIXED: Hardcoded fallback to prevent Temporal Dead Zone crashes during module imports
    currentAffix: { name: "NONE", desc: "System stable. No anomalies detected." },
    // v16 LIVE SCORE + WAGERS
    score: 0,
    displayScore: 0,
    scorePops: [],
    wagerMult: 1,
    wagerOffer: null,
    // affix currently being offered pre-stage (null = none)
    // v16 BOSS FINISHER / UPGRADE VIGNETTE / STAGE TRANSITION state
    finisher: null,
    finisherZoom: 1,
    vignette: null,
    paletteFrom: 1,
    paletteTo: 1,
    paletteT: 1,
    lightSweep: -1,
    draftHold: 0,
    firstEvolutionGranted: false,
    statMaxCombo: 0,
    statTotalSlips: 0,
    statTotalKills: 0,
    statBossKills: 0,
    statCounterHits: 0,
    statBossBreaks: 0,
    statRecoilTaken: 0,
    statDespDamage: 0,
    statGhostSteps: 0,
    statFinisherHits: 0,
    statFinishersClean: 0,
    tutorialEnabled: true,
    seenTutorials: { shield: false, slip: false, guard: false, instinct: false, counter: false, ghost_step: false, bruiser_id: false, assassin_id: false, string_id: false, footwork_tip: false },
    tutorialGrace: 0,
    tutorialDelay: 0,
    purifyTimer: 0,
    laneFlash: [0, 0, 0],
    bossIntroTimer: 0,
    bossThemeColor: "#fff",
    bossIntroText: "",
    player: null,
    enemies: [],
    particles: [],
    floatingTexts: [],
    shockwaves: [],
    ambientDust: [],
    cathedralShards: [],
    cathedralPillars: [],
    lightShafts: [],
    foregroundLines: [],
    roseWindow: { x: 0, baseY: 0, y: 0, rotation: 0, floatTime: 0, petals: [] },
    bgGradient: null,
    lightGradNormal: null,
    lightGradPurify: null,
    keys: {},
    lastKeys: {},
    lastGamepadState: { buttons: [], axes: [] },
    pad: { up: false, down: false, ghost: false, leftHeld: false, rightHeld: false, guard: false, jab: false, cross: false, crossHeld: false, hook: false, instinct: false, pause: false },
    audioCtx: null,
    audioEnabled: false,
    audioMuted: false,
    lastHUD: { combo: -1, instinct: -1, hp: -1, slipBuff: -1, exp: -1, mult: -1 }
  };
  function getFlowMultiplier(state) {
    if (!state.progressionMods.flowState) return 1;
    const streak = state.player.flowStreak || 0;
    if (streak >= 25) return 1.5;
    if (streak >= 10) return 1.25;
    return 1;
  }

  // src/engine_core.js
  var $ = (id) => document.getElementById(id);
  var canvas = document.getElementById("gameCanvas");
  var ctx = canvas ? canvas.getContext("2d", { alpha: false }) : null;

  // src/systems/settings.js
  var SETTINGS_KEY = "neon_strike_settings_v1";
  var PROFILE_KEY = "neon_strike_profile_v1";
  var DEFAULT_BINDS = Object.freeze({
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    jab: "KeyA",
    cross: "KeyS",
    hook: "KeyD",
    guard: "KeyW",
    ghost: "ShiftLeft",
    instinct: "Space"
  });
  var BIND_LABELS = {
    up: "Slip Up",
    down: "Slip Down",
    left: "Give Ground",
    right: "Press Forward",
    jab: "Jab",
    cross: "Cross",
    hook: "Hook",
    guard: "Guard",
    ghost: "Ghost Step",
    instinct: "Instinct"
  };
  var RESERVED_KEYS = ["Escape", "KeyP", "KeyM", "KeyH", "Enter", "Tab", "Digit1", "Digit2", "Digit3", "KeyQ", "KeyE", "KeyR"];
  function keyLabel(code) {
    if (!code) return "\u2014";
    const named = { ArrowUp: "\u2191", ArrowDown: "\u2193", ArrowLeft: "\u2190", ArrowRight: "\u2192", Space: "SPACE", ShiftLeft: "L-SHIFT", ShiftRight: "R-SHIFT", ControlLeft: "L-CTRL", ControlRight: "R-CTRL", AltLeft: "L-ALT", AltRight: "R-ALT" };
    if (named[code]) return named[code];
    return code.replace(/^Key/, "").replace(/^Digit/, "").replace(/^Numpad/, "NUM ").toUpperCase();
  }
  function sanitizeBinds(raw) {
    const actions = Object.keys(DEFAULT_BINDS);
    const out = {};
    const valid = (c) => typeof c === "string" && c.length > 0 && c.length < 32 && !RESERVED_KEYS.includes(c);
    const used = /* @__PURE__ */ new Set();
    if (raw && typeof raw === "object") {
      for (const a of actions) if (valid(raw[a]) && !used.has(raw[a])) {
        out[a] = raw[a];
        used.add(raw[a]);
      }
    }
    for (const a of actions) {
      if (out[a]) continue;
      let code = DEFAULT_BINDS[a];
      for (let guard = 0; used.has(code) && guard < actions.length; guard++) {
        const taker = actions.find((x) => out[x] === code);
        code = taker ? DEFAULT_BINDS[taker] : null;
      }
      if (!code || used.has(code)) code = actions.map((x) => DEFAULT_BINDS[x]).find((c) => !used.has(c));
      out[a] = code;
      used.add(code);
    }
    return out;
  }
  var SETTINGS_DEFAULTS = Object.freeze({
    masterVolume: 0.8,
    musicVolume: 0.55,
    sfxVolume: 0.8,
    screenShake: 1,
    // 0..1 multiplier
    flashIntensity: 1,
    // 0..1 multiplier
    hitStop: true,
    reducedMotion: false
  });
  var UNIT_KEYS = ["masterVolume", "musicVolume", "sfxVolume", "screenShake", "flashIntensity"];
  var BOOL_KEYS = ["hitStop", "reducedMotion"];
  function safeGet(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function safeSet(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
    }
  }
  var clamp01 = (v, d) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : d;
  };
  function sanitizeSettings(raw) {
    const out = { ...SETTINGS_DEFAULTS, binds: { ...DEFAULT_BINDS } };
    if (!raw || typeof raw !== "object") return out;
    for (const k of UNIT_KEYS) if (k in raw) out[k] = clamp01(raw[k], SETTINGS_DEFAULTS[k]);
    for (const k of BOOL_KEYS) if (k in raw) out[k] = raw[k] === true;
    out.binds = sanitizeBinds(raw.binds);
    return out;
  }
  var current = sanitizeSettings(safeGet(SETTINGS_KEY));
  var listeners = [];
  function getSettings() {
    return current;
  }
  function getBinds() {
    return current.binds || DEFAULT_BINDS;
  }
  function keyName(action) {
    return keyLabel(getBinds()[action]);
  }
  function rebind(action, code) {
    if (!(action in DEFAULT_BINDS) || RESERVED_KEYS.includes(code)) return false;
    const binds = { ...getBinds() };
    const prev = binds[action];
    const other = Object.keys(binds).find((a) => a !== action && binds[a] === code);
    if (other) binds[other] = prev;
    binds[action] = code;
    setSetting("binds", binds);
    return true;
  }
  function resetBinds() {
    setSetting("binds", { ...DEFAULT_BINDS });
  }
  function setSetting(key, value) {
    if (!(key in SETTINGS_DEFAULTS) && key !== "binds") return current;
    current = sanitizeSettings({ ...current, [key]: value });
    safeSet(SETTINGS_KEY, current);
    applySettingsSideEffects();
    listeners.forEach((fn) => {
      try {
        fn(current);
      } catch (e) {
      }
    });
    return current;
  }
  function onSettingsChange(fn) {
    listeners.push(fn);
  }
  function applySettingsSideEffects() {
    try {
      if (typeof document !== "undefined" && document.body && document.body.classList) {
        if (current.reducedMotion) document.body.classList.add("reduced-motion");
        else document.body.classList.remove("reduced-motion");
      }
    } catch (e) {
    }
  }
  function shakeScale() {
    return current.reducedMotion ? 0 : current.screenShake;
  }
  function flashScale() {
    return current.flashIntensity * (current.reducedMotion ? 0.5 : 1);
  }
  function hitStopEnabled() {
    return current.hitStop;
  }
  function reducedMotion() {
    return current.reducedMotion;
  }
  function loadProfile() {
    const p = safeGet(PROFILE_KEY) || {};
    return {
      flags: p.flags && typeof p.flags === "object" ? p.flags : {},
      seenUpgrades: Array.isArray(p.seenUpgrades) ? p.seenUpgrades : [],
      counts: p.counts && typeof p.counts === "object" ? p.counts : {}
    };
  }
  function profileFlag(name) {
    return loadProfile().flags[name] === true;
  }
  function setProfileFlag(name) {
    const p = loadProfile();
    p.flags[name] = true;
    safeSet(PROFILE_KEY, p);
  }
  function hasSeenUpgrade(id) {
    return loadProfile().seenUpgrades.includes(id);
  }
  function markUpgradeSeen(id) {
    const p = loadProfile();
    if (!p.seenUpgrades.includes(id)) {
      p.seenUpgrades.push(id);
      safeSet(PROFILE_KEY, p);
    }
  }

  // src/vfx_audio/audio.js
  var bus = { master: null, sfx: null, music: null };
  function applyBusLevels() {
    if (!bus.master) return;
    const s = getSettings();
    const t = gameState.audioCtx.currentTime;
    try {
      bus.master.gain.setValueAtTime(gameState.audioMuted ? 0 : s.masterVolume, t);
      bus.sfx.gain.setValueAtTime(s.sfxVolume, t);
      bus.music.gain.setValueAtTime(s.musicVolume * music.duck, t);
    } catch (e) {
    }
  }
  onSettingsChange(applyBusLevels);
  function initAudio() {
    if (gameState.audioMuted) return;
    if (!gameState.audioCtx) {
      gameState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gameState.audioEnabled = true;
      try {
        bus.master = gameState.audioCtx.createGain();
        bus.master.connect(gameState.audioCtx.destination);
        bus.sfx = gameState.audioCtx.createGain();
        bus.sfx.connect(bus.master);
        bus.music = gameState.audioCtx.createGain();
        bus.music.connect(bus.master);
      } catch (e) {
        bus.master = bus.sfx = bus.music = null;
      }
      applyBusLevels();
    }
    if (gameState.audioCtx.state === "suspended") gameState.audioCtx.resume();
  }
  function refreshAudioLevels() {
    applyBusLevels();
  }
  function sfxOut() {
    return bus.sfx || gameState.audioCtx.destination;
  }
  function tone(type, f1, f2, t, v1, v2, delay = 0) {
    const osc = gameState.audioCtx.createOscillator();
    const gain = gameState.audioCtx.createGain();
    const now = gameState.audioCtx.currentTime + delay;
    osc.connect(gain);
    gain.connect(sfxOut());
    osc.type = type;
    osc.frequency.setValueAtTime(f1, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), now + t);
    gain.gain.setValueAtTime(v1, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(1e-3, v2), now + t);
    osc.start(now);
    osc.stop(now + t);
  }
  var STINGS = {
    sting_orb: { root: 440, notes: [0, 7, 12], wave: "triangle", step: 0.06, len: 0.18, vol: 0.12 },
    sting_mastery: { root: 392, notes: [0, 4, 7, 11, 14], wave: "triangle", step: 0.055, len: 0.22, vol: 0.13 },
    sting_fusion: { root: 330, notes: [0, 7, 12, 16, 19, 24], wave: "sawtooth", step: 0.05, len: 0.3, vol: 0.09 },
    sting_overclock: { root: 523, notes: [0, 12], wave: "square", step: 0.07, len: 0.12, vol: 0.06 },
    stagger: { root: 110, notes: [0, -5, -12], wave: "sawtooth", step: 0.08, len: 0.35, vol: 0.14 },
    finisher_ko: { root: 220, notes: [0, 7, 12, 19, 24, 31], wave: "square", step: 0.045, len: 0.4, vol: 0.08 }
  };
  function playSound(type) {
    if (!gameState.audioEnabled || gameState.audioMuted || !gameState.audioCtx) return;
    try {
      const sting = STINGS[type];
      if (sting) {
        sting.notes.forEach((n, i) => {
          const f = sting.root * Math.pow(2, n / 12);
          tone(sting.wave, f, f * 0.995, sting.len, sting.vol, 1e-3, i * sting.step);
        });
        return;
      }
      let t = 0.15, f1 = 100, f2 = 40, v1 = 0.2, v2 = 0.01, sq = "square";
      if (type === "jab_tell") {
        sq = "sine";
        f1 = 1200;
        f2 = 800;
        t = 0.05;
        v1 = 0.1;
      } else if (type === "bash_tell") {
        sq = "sawtooth";
        f1 = 150;
        f2 = 50;
        t = 0.3;
      } else if (type === "feint_tell") {
        sq = "triangle";
        f1 = 400;
        f2 = 1200;
        t = 0.2;
        v1 = 0.1;
        v2 = 0;
      } else if (type === "slip") {
        sq = "sine";
        f1 = 600;
        f2 = 150;
        t = 0.1;
        v1 = 0.05;
      } else if (type === "perfect_slip") {
        f1 = 1200;
        f2 = 300;
      } else if (type === "ghost_step") {
        sq = "sawtooth";
        f1 = 300;
        f2 = 50;
        v1 = 0.1;
      } else if (type === "bounce") {
        sq = "triangle";
        f1 = 200;
        f2 = 100;
        v1 = 0.1;
      } else if (type === "laser") {
        sq = "sawtooth";
        f1 = 800;
        f2 = 100;
        t = 0.3;
      } else if (type === "shatter") {
        f1 = 8e3;
        f2 = 100;
        t = 0.25;
        v1 = 0.3;
      } else if (type === "hit") {
        f1 = 200;
        f2 = 50;
        v1 = 0.3;
      } else if (type === "beat_tick") {
        sq = "sine";
        f1 = 1760;
        f2 = 1500;
        t = 0.04;
        v1 = 0.07;
      } else if (type === "finisher_hit") {
        tone("square", 90, 30, 0.28, 0.35, 0.01);
        tone("sawtooth", 2400, 200, 0.18, 0.12, 1e-3);
        return;
      } else if (type === "finisher_miss") {
        sq = "triangle";
        f1 = 300;
        f2 = 90;
        t = 0.3;
        v1 = 0.12;
      } else if (type === "punish") {
        sq = "triangle";
        f1 = 900;
        f2 = 1400;
        t = 0.08;
        v1 = 0.08;
      } else if (type === "wager") {
        tone("triangle", 660, 660, 0.1, 0.1, 1e-3);
        tone("triangle", 990, 990, 0.16, 0.1, 1e-3, 0.08);
        return;
      } else if (type === "sweep") {
        sq = "sine";
        f1 = 220;
        f2 = 1760;
        t = 0.6;
        v1 = 0.05;
        v2 = 1e-3;
      } else if (type === "bell") {
        for (const at of [0, 0.32]) [[880, 0.16], [2270, 0.07], [3990, 0.04], [5390, 0.025]].forEach(([f, v]) => tone("sine", f, f * 0.998, 1.4, v, 5e-4, at));
        return;
      } else if (type === "ref_count") {
        sq = "triangle";
        f1 = 330;
        f2 = 320;
        t = 0.12;
        v1 = 0.12;
      } else if (type === "ref_count_hi") {
        sq = "triangle";
        f1 = 520;
        f2 = 500;
        t = 0.14;
        v1 = 0.16;
      } else if (type === "knockdown") {
        tone("square", 120, 30, 0.6, 0.3, 0.01);
        tone("sine", 60, 25, 0.8, 0.4, 0.01);
        return;
      } else if (type === "shock") {
        tone("sawtooth", 1200, 90, 0.35, 0.12, 1e-3);
        tone("square", 60, 58, 0.35, 0.1, 0.01);
        return;
      } else if (type === "zone") {
        tone("sine", 110, 55, 1.2, 0.25, 1e-3);
        tone("triangle", 1760, 440, 0.8, 0.06, 1e-3);
        return;
      } else if (type === "charge_ready") {
        sq = "triangle";
        f1 = 700;
        f2 = 1400;
        t = 0.12;
        v1 = 0.08;
      } else if (type === "orb") {
        sq = "sine";
        f1 = 1500 + Math.random() * 300;
        f2 = 2400;
        t = 0.08;
        v1 = 0.04;
        v2 = 1e-3;
      }
      tone(sq, f1, f2, t, v1, v2);
    } catch (e) {
    }
  }
  var music = { timer: null, nextTime: 0, step: 0, bpm: 116, intensity: 0, duck: 1, noise: null };
  var BASS = [0, 0, 12, 0, 3, 0, 10, 7];
  var ARP = [12, 15, 19, 24, 19, 15, 12, 7];
  function noiseBuffer() {
    if (music.noise) return music.noise;
    const ctx3 = gameState.audioCtx, len = Math.floor(ctx3.sampleRate * 0.05);
    const buf = ctx3.createBuffer(1, len, ctx3.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    music.noise = buf;
    return buf;
  }
  function scheduleStep(time) {
    const ctx3 = gameState.audioCtx, out = bus.music;
    const s = music.step % 16;
    const voice = (type, f1, f2, dur, vol) => {
      const o = ctx3.createOscillator(), g = ctx3.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f1, time);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), time + dur);
      g.gain.setValueAtTime(vol, time);
      g.gain.exponentialRampToValueAtTime(1e-3, time + dur);
      o.connect(g);
      g.connect(out);
      o.start(time);
      o.stop(time + dur + 0.02);
    };
    if (s % 4 === 0) voice("sine", 150, 42, 0.22, 0.5);
    if (s % 2 === 0) {
      const f = 55 * Math.pow(2, BASS[s / 2 % BASS.length] / 12);
      voice("sawtooth", f, f, 0.16, 0.09);
    }
    const hat = music.intensity > 0 ? true : s % 4 === 2;
    if (hat) {
      const src = ctx3.createBufferSource(), hp = ctx3.createBiquadFilter(), g = ctx3.createGain();
      src.buffer = noiseBuffer();
      hp.type = "highpass";
      hp.frequency.value = 7e3;
      g.gain.setValueAtTime(s % 4 === 2 ? 0.08 : 0.035, time);
      g.gain.exponentialRampToValueAtTime(1e-3, time + 0.04);
      src.connect(hp);
      hp.connect(g);
      g.connect(out);
      src.start(time);
      src.stop(time + 0.05);
    }
    if (music.intensity > 0 && s % 2 === 1) {
      const f = 220 * Math.pow(2, ARP[(s - 1) / 2 % ARP.length] / 12);
      voice("square", f, f, 0.08, 0.025);
    }
  }
  function tick() {
    if (!gameState.audioCtx || !bus.music) return;
    const ctx3 = gameState.audioCtx, stepDur = 60 / music.bpm / 4;
    if (music.nextTime < ctx3.currentTime) music.nextTime = ctx3.currentTime + 0.05;
    while (music.nextTime < ctx3.currentTime + 0.2) {
      try {
        scheduleStep(music.nextTime);
      } catch (e) {
        stopMusic();
        return;
      }
      music.nextTime += stepDur;
      music.step++;
    }
  }
  function startMusic() {
    if (music.timer || !gameState.audioCtx || !bus.music || typeof setInterval !== "function") return;
    if (typeof gameState.audioCtx.createBuffer !== "function" || typeof gameState.audioCtx.createBiquadFilter !== "function") return;
    if (typeof gameState.audioCtx.currentTime !== "number" || typeof gameState.audioCtx.sampleRate !== "number") return;
    music.nextTime = 0;
    music.step = 0;
    music.timer = setInterval(tick, 50);
  }
  function stopMusic() {
    if (music.timer) {
      clearInterval(music.timer);
      music.timer = null;
    }
  }
  function setMusicIntensity(level) {
    music.intensity = level ? 1 : 0;
  }
  function duckMusic(on) {
    music.duck = on ? 0.3 : 1;
    applyBusLevels();
  }

  // src/vfx_audio/effects.js
  function spawnFloatingText(x, y, text, color) {
    gameState.floatingTexts.push({ x, y, text, color, life: 1, velocity: -1.5 });
  }
  function showToast(msg, color = "#fff") {
    let yOffset = 0;
    gameState.floatingTexts.forEach((ft) => {
      if (ft.y >= gameState.height * 0.25 - 10 && ft.y <= gameState.height * 0.25 + 100 && ft.life > 0.5) {
        yOffset += 25;
      }
    });
    spawnFloatingText(gameState.width / 2, gameState.height * 0.25 + yOffset, msg, color);
    if (gameState.floatingTexts.length > 0) {
      gameState.floatingTexts[gameState.floatingTexts.length - 1].velocity = -0.5;
      gameState.floatingTexts[gameState.floatingTexts.length - 1].life = 2;
    }
  }
  function triggerShockwave(x, y, color) {
    gameState.shockwaves.push({ x, y, radius: 10, maxRadius: 300, color, alpha: 1 });
  }
  function doFlash(amt) {
    const scaled = amt * flashScale();
    if (scaled <= 1e-3) return;
    const sf = document.getElementById("screen-flash");
    if (sf) {
      sf.style.opacity = scaled;
      setTimeout(() => {
        sf.style.opacity = 0;
      }, 60);
    }
  }
  function spawnScorePop(x, y, pts, big = false) {
    if (!gameState.scorePops) gameState.scorePops = [];
    if (gameState.scorePops.length > 24) gameState.scorePops.shift();
    gameState.scorePops.push({ x: x + (Math.random() * 30 - 15), y, text: `+${pts.toLocaleString()}`, life: 1, big });
  }
  function createImpact(x, y, color) {
    if (gameState.particles.length > 100) return;
    let count = gameState.particles.length > 80 ? 3 : 5;
    for (let i = 0; i < count; i++) {
      gameState.particles.push({ x, y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 1, color: color || "#fff", type: "spark" });
    }
  }
  function createVacuum(cx, cy) {
    for (let i = 0; i < 15; i++) {
      let a = Math.random() * Math.PI * 2;
      let d = 60 + Math.random() * 40;
      gameState.particles.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, vx: -Math.cos(a) * 10, vy: -Math.sin(a) * 10, life: 0.5, color: "#ffffff", type: "vacuum" });
    }
  }
  function createShatter(x, y, color) {
    for (let i = 0; i < 20; i++) {
      gameState.particles.push({ x, y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 1.5, color, type: "shard", size: Math.random() * 8 + 3, rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.5 });
    }
    playSound("shatter");
  }
  function updateParticlesAndTrails() {
    updateKoFx();
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
      gameState.particles[i].x += gameState.particles[i].vx;
      gameState.particles[i].y += gameState.particles[i].vy;
      gameState.particles[i].life -= 0.04;
      if (gameState.particles[i].life <= 0) gameState.particles.splice(i, 1);
    }
    for (let i = gameState.floatingTexts.length - 1; i >= 0; i--) {
      gameState.floatingTexts[i].y += gameState.floatingTexts[i].velocity;
      gameState.floatingTexts[i].life -= 0.02;
      if (gameState.floatingTexts[i].life <= 0) gameState.floatingTexts.splice(i, 1);
    }
    if (gameState.scorePops) for (let i = gameState.scorePops.length - 1; i >= 0; i--) {
      gameState.scorePops[i].y -= gameState.scorePops[i].big ? 0.9 : 1.3;
      gameState.scorePops[i].life -= gameState.scorePops[i].big ? 0.014 : 0.025;
      if (gameState.scorePops[i].life <= 0) gameState.scorePops.splice(i, 1);
    }
    for (let i = gameState.shockwaves.length - 1; i >= 0; i--) {
      gameState.shockwaves[i].radius += 15;
      gameState.shockwaves[i].alpha -= 0.05;
      if (gameState.shockwaves[i].alpha <= 0) gameState.shockwaves.splice(i, 1);
    }
    if (gameState.player && gameState.player.trails) {
      gameState.player.trails.forEach((t) => {
        t.opacity -= 0.06;
      });
      gameState.player.trails = gameState.player.trails.filter((t) => t.opacity > 0);
      gameState.player.trailTimer--;
      if (gameState.player.trailTimer <= 0 && (gameState.isInstinct || gameState.player.state === "ghost_step")) {
        gameState.player.trails.push({ x: gameState.player.x, y: gameState.player.y, lane: gameState.player.lane, opacity: 0.6, state: gameState.player.state, punchType: gameState.player.punchType, hitFrame: gameState.player.hitFrame, slipBuff: gameState.player.slipBuff, instinct: gameState.isInstinct });
        gameState.player.trailTimer = 4;
        if (gameState.player.trails.length > 6) gameState.player.trails.shift();
      }
    }
  }
  function createKoShatter(en) {
    if (!gameState.koFx) gameState.koFx = [];
    if (gameState.koFx.length > 14) gameState.koFx.shift();
    const cx = en.x + (en.w || 50) / 2, cy = en.y - (en.h || 110) * 0.55;
    const shards = [];
    const n = en.isBoss ? 28 : 14;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 7;
      shards.push({ x: cx + (Math.random() - 0.5) * 30, y: cy + (Math.random() - 0.5) * 70, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, rot: Math.random() * 6, rv: (Math.random() - 0.5) * 0.4, size: 4 + Math.random() * 7 });
    }
    gameState.koFx.push({ shards, color: en.color || "#ff0055", cx, cy, t: 0, orb: null, big: !!en.isBoss });
    playSound("shatter");
  }
  function updateKoFx() {
    if (!gameState.koFx || !gameState.koFx.length) return;
    const p = gameState.player;
    for (const fx of gameState.koFx) {
      fx.t++;
      if (fx.t < 14) {
        fx.shards.forEach((s) => {
          s.x += s.vx;
          s.y += s.vy;
          s.vx *= 0.9;
          s.vy *= 0.9;
          s.rot += s.rv;
        });
      } else if (!fx.orb) {
        fx.shards.forEach((s) => {
          s.x += (fx.cx - s.x) * 0.22;
          s.y += (fx.cy - s.y) * 0.22;
          s.rot += s.rv * 2;
        });
        if (fx.t >= 26) fx.orb = { x: fx.cx, y: fx.cy, vx: 0, vy: -3, life: 1 };
      } else {
        const o = fx.orb, tx = p ? p.x + 25 : 180, ty = p ? p.y - 70 : 300;
        const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy) || 1;
        o.vx = o.vx * 0.82 + dx / d * 2.6;
        o.vy = o.vy * 0.82 + dy / d * 2.6;
        o.x += o.vx;
        o.y += o.vy;
        if (d < 26 || fx.t > 110) {
          fx.done = true;
          gameState.orbPulse = 12;
          playSound("orb");
        }
      }
    }
    gameState.koFx = gameState.koFx.filter((fx) => !fx.done);
    if (gameState.orbPulse > 0) gameState.orbPulse--;
  }

  // src/systems/score.js
  var SC = CONSTANTS.SCORE;
  function comboMultiplier(combo) {
    const steps = Math.floor(Math.max(0, combo || 0) / SC.comboStep);
    return Math.min(SC.maxComboMult, 1 + steps * SC.comboMultStep);
  }
  function wagerMultiplier() {
    return gameState.wagerMult || 1;
  }
  function currentMultiplier() {
    return comboMultiplier(gameState.combo) * wagerMultiplier();
  }
  function addScore(base, x, y, opts = {}) {
    if (!base || base <= 0) return 0;
    const mult = opts.noCombo ? wagerMultiplier() : currentMultiplier();
    const pts = Math.round(base * mult);
    gameState.score = (gameState.score || 0) + pts;
    if (x !== void 0 && y !== void 0 && !opts.silent) spawnScorePop(x, y, pts, !!opts.big);
    return pts;
  }
  function hitScore(punchType) {
    const H = SC.hit;
    if (punchType === "jab3") return H.jab3;
    if (punchType === "jab1" || punchType === "jab2") return H.jab;
    if (punchType === "hook" || punchType === "check_hook") return H.hook;
    if (punchType === "cross") return H.cross;
    return H.guard;
  }
  function killScore(type) {
    return SC.kill[type] || SC.kill.grunt;
  }
  function rankForRun({ score, slips = 0, bossKills = 0 }) {
    const R = SC.rank;
    let grade = "C";
    if (score >= R.S) grade = "S";
    else if (score >= R.A) grade = "A";
    else if (score >= R.B) grade = "B";
    const reqSlipsForS = Math.max(1, Math.min(bossKills, 3));
    if (grade === "S" && slips < reqSlipsForS) grade = "A";
    if (grade === "A" && slips < 1) grade = "B";
    return grade;
  }
  function pbDeltaText(score, prevBest) {
    if (prevBest === null || prevBest === void 0) return { text: "FIRST RECORDED RUN", kind: "new" };
    const d = score - prevBest;
    if (d > 0) return { text: `+${d.toLocaleString()} OVER YOUR BEST`, kind: "up" };
    if (d === 0) return { text: "TIED YOUR BEST", kind: "even" };
    return { text: `${Math.abs(d).toLocaleString()} SHORT OF YOUR BEST`, kind: "down" };
  }

  // src/ui/ui.js
  var HUD = {
    get combo() {
      return $("combo-ui");
    },
    get expBar() {
      return $("exp-bar");
    },
    get expMult() {
      return $("exp-multiplier");
    },
    get instinctBar() {
      return $("instinct-bar");
    },
    get instinctBanner() {
      return $("instinct-ready-banner");
    },
    get barCont() {
      return $("bar-cont");
    },
    get health() {
      return $("health-ui");
    },
    get flash() {
      return $("screen-flash");
    },
    get screens() {
      return {
        upgrade: $("upgrade-screen"),
        pause: $("pause-screen"),
        gameover: $("gameover-screen"),
        start: $("start-screen"),
        howto: $("howto-screen"),
        tutorial: $("tutorial-screen")
      };
    },
    get finalStage() {
      return $("final-stage-ui");
    },
    get slipPopup() {
      return $("perfect-slip-ui");
    },
    get stage() {
      return $("stage-ui");
    },
    get affix() {
      return $("affix-ui");
    },
    get counterHud() {
      return $("counter-hud");
    },
    get counterStatus() {
      return $("counter-status");
    }
  };
  function updateHUD() {
    const target = Math.round(gameState.score || 0);
    if (gameState.displayScore !== target) {
      const diff = target - gameState.displayScore;
      gameState.displayScore = Math.abs(diff) < 4 ? target : gameState.displayScore + Math.ceil(diff * 0.2);
    }
    if (gameState.lastHUD.score !== gameState.displayScore) {
      const el = $("score-ui");
      if (el) el.innerText = gameState.displayScore.toLocaleString();
      gameState.lastHUD.score = gameState.displayScore;
    }
    const cm = comboMultiplier(gameState.combo);
    const key = `${cm}|${gameState.wagerMult}`;
    if (gameState.lastHUD.wager !== key) {
      const m = $("score-mult");
      if (m) {
        m.innerText = `\xD7${cm.toFixed(2)}`;
        m.classList.toggle("hot", cm > 1);
      }
      const w = $("wager-badge");
      if (w) {
        w.innerText = gameState.wagerMult > 1 ? `\xD7${gameState.wagerMult} WAGER` : "";
        w.style.display = gameState.wagerMult > 1 ? "inline-block" : "none";
      }
      gameState.lastHUD.wager = key;
    }
    if (gameState.lastHUD.combo !== gameState.combo) {
      HUD.combo.innerText = gameState.combo;
      gameState.lastHUD.combo = gameState.combo;
    }
    let expPct = Math.min(100, gameState.exp / gameState.expNeeded * 100);
    if (gameState.lastHUD.exp !== expPct) {
      if (HUD.expBar) HUD.expBar.style.width = expPct + "%";
      gameState.lastHUD.exp = expPct;
    }
    let mult = 1 + Math.min(0.3, Math.floor(gameState.combo / 2) * 0.1);
    if (gameState.lastHUD.mult !== mult) {
      if (HUD.expMult) {
        if (mult > 1) {
          HUD.expMult.innerText = `x${mult.toFixed(1)}`;
          HUD.expMult.classList.remove("opacity-0");
          HUD.expMult.classList.add("opacity-100");
        } else {
          HUD.expMult.classList.remove("opacity-100");
          HUD.expMult.classList.add("opacity-0");
        }
      }
      gameState.lastHUD.mult = mult;
    }
    let roundInstinct = Math.floor(gameState.instinctMeter);
    if (gameState.lastHUD.instinct !== roundInstinct) {
      HUD.instinctBar.style.width = roundInstinct + "%";
      gameState.lastHUD.instinct = roundInstinct;
    }
    let displayHP = Math.max(0, Math.round(gameState.health));
    if (gameState.lastHUD.hp !== displayHP) {
      HUD.health.innerText = `${displayHP}`;
      gameState.lastHUD.hp = displayHP;
      const bar = $("hp-bar");
      if (bar) {
        const pct = Math.max(0, Math.min(100, displayHP / (gameState.maxHealth || 100) * 100));
        bar.style.width = pct + "%";
        bar.classList.toggle("low", pct <= 25);
      }
    }
    if (gameState.player && gameState.lastHUD.slipBuff !== gameState.player.slipBuff) {
      HUD.counterStatus.innerText = gameState.player.slipBuff > 0 ? gameState.player.slipBuff > 1 ? "READY \xD72" : "READY" : "\u2014";
      if (HUD.counterHud) HUD.counterHud.classList.toggle("ready", gameState.player.slipBuff > 0);
      gameState.lastHUD.slipBuff = gameState.player.slipBuff;
    }
    if (HUD.expBar) HUD.expBar.classList.toggle("pulse", (gameState.orbPulse || 0) > 6);
  }

  // src/render/boxer.js
  function silhouetteOf(entity, isPlayer) {
    if (entity.shape) return entity.shape;
    if (isPlayer) return "striker";
    if (entity.controller === "neon_enforcer") return "shield";
    if (entity.controller === "phantom_boxer") return "assassin";
    if (entity.controller === "static_monk") return "zoner";
    if (entity.controller === "live_wire") return "live_wire";
    if (entity.controller === "negative") return "negative";
    return entity.type || "grunt";
  }
  function drawHead(ctx3, shape, x, y, r, d, fill, stroke) {
    ctx3.save();
    ctx3.fillStyle = fill;
    ctx3.strokeStyle = stroke;
    ctx3.beginPath();
    if (shape === "shield") {
      const w = r * 2, h = r * 2.1;
      ctx3.roundRect ? ctx3.roundRect(x - w / 2, y - h / 2, w, h, r * 0.45) : ctx3.rect(x - w / 2, y - h / 2, w, h);
      ctx3.fill();
      ctx3.fillStyle = "#000";
      ctx3.fillRect(x - r * 0.1 * d - (d > 0 ? 0 : r * 0.8), y - r * 0.25, r * 0.9, r * 0.35);
    } else if (shape === "bruiser" || shape === "live_wire") {
      const w = r * 2.5, h = r * 1.9;
      ctx3.moveTo(x - w / 2, y - h / 2);
      ctx3.lineTo(x + w / 2, y - h / 2);
      ctx3.lineTo(x + w / 2 * 0.85, y + h / 2);
      ctx3.lineTo(x - w / 2 * 0.85, y + h / 2);
      ctx3.closePath();
      ctx3.fill();
      if (shape === "live_wire") {
        ctx3.strokeStyle = "#fff36b";
        ctx3.lineWidth = 3;
        for (const sx of [-0.55, 0.55]) {
          const bx = x + sx * w * 0.5;
          ctx3.beginPath();
          ctx3.moveTo(bx, y - h / 2);
          ctx3.lineTo(bx - 5, y - h / 2 - 9);
          ctx3.lineTo(bx + 4, y - h / 2 - 12);
          ctx3.lineTo(bx - 2, y - h / 2 - 22);
          ctx3.stroke();
        }
      }
    } else if (shape === "assassin") {
      ctx3.arc(x, y + 2, r * 0.95, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.beginPath();
      ctx3.moveTo(x + r * 0.9 * d, y - r * 0.6);
      ctx3.lineTo(x - r * 2.1 * d, y - r * 1.6);
      ctx3.lineTo(x - r * 0.6 * d, y + r * 0.6);
      ctx3.closePath();
      ctx3.fill();
    } else if (shape === "zoner") {
      ctx3.arc(x, y, r * 0.9, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.lineWidth = 3;
      ctx3.beginPath();
      ctx3.ellipse(x, y - r * 1.7, r * 1.3, r * 0.4, 0, 0, Math.PI * 2);
      ctx3.stroke();
    } else if (shape === "negative") {
      const n = 6;
      for (let i = 0; i <= n * 2; i++) {
        const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 === 0 ? r * 1.55 : r * 0.9;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) ctx3.moveTo(px, py);
        else ctx3.lineTo(px, py);
      }
      ctx3.closePath();
      ctx3.fillStyle = "#000";
      ctx3.fill();
      ctx3.lineWidth = 3;
      ctx3.stroke();
    } else {
      ctx3.arc(x, y, r, 0, Math.PI * 2);
      ctx3.fill();
    }
    ctx3.restore();
  }
  function drawBoxer(ctx3, entity, isPlayer, opacity = 1, isTrail = false) {
    const dl2 = (x1, y1, x2, y2) => {
      ctx3.beginPath();
      ctx3.moveTo(x1, y1);
      ctx3.lineTo(x2, y2);
      ctx3.stroke();
    };
    const dc = (x, y, r, f, s) => {
      ctx3.beginPath();
      ctx3.arc(x, y, r, 0, Math.PI * 2);
      if (f) ctx3.fill();
      if (s) ctx3.stroke();
    };
    const d = entity.facing !== void 0 ? entity.facing : isPlayer ? 1 : -1;
    const shape = silhouetteOf(entity, isPlayer);
    const bS = entity.isBoss ? 1.5 : entity.type === "bruiser" ? 1.3 : 1;
    let t = Date.now(), bn = 0, br = 0;
    if (entity.state === "idle" || !isPlayer && entity.stun <= 0) {
      bn = Math.sin(t * 5e-3 + entity.x) * 3;
      br = Math.sin(t * 3e-3 + entity.x) * 2;
    }
    if (isPlayer && entity.state === "hurt") bn -= 10;
    let h = entity.h * (entity.isBoss ? 1 : 0.8) + br;
    const w = entity.w;
    const hS = 12 * bS, gS = 10 * bS;
    let rX = entity.x + w / 2, rY = entity.y;
    if (!isTrail) {
      ctx3.fillStyle = "rgba(0,0,0,0.7)";
      ctx3.beginPath();
      ctx3.ellipse(rX, rY, w * 0.6 * bS, 6 * bS, 0, 0, Math.PI * 2);
      ctx3.fill();
    }
    let pL = 0;
    if (!isPlayer && entity.stun <= 0 && entity.attackCooldown >= 15) {
      if (entity.type === "assassin") pL = 20 * d;
      if (entity.type === "zoner") pL = -10 * d;
      if (entity.type === "shield") pL = -5 * d;
      if (entity.type === "bruiser") {
        h *= 0.85;
        pL = 15 * d;
      }
    }
    let hY = rY - h * 0.2 + bn, nY = rY - h * 0.75 + bn, hdY = rY - h * 0.85 + bn;
    if (!isPlayer && entity.type === "bruiser") hdY += 10;
    if (!isPlayer && entity.type === "assassin") hdY += 5;
    let lX = pL;
    if (isPlayer && gameState.player.slipCooldown > 15) lX += 15 * d;
    if (isPlayer && entity.state === "ghost_step") {
      let sn = entity.ghostStepTimer > 10 ? (14 - entity.ghostStepTimer) / 4 : entity.ghostStepTimer / 10;
      opacity *= 0.3 + (1 - sn) * 0.7;
      lX -= 35 * sn * d;
    } else if (isPlayer && entity.state === "hurt") {
      lX -= 25 * d;
    }
    let sL = 0;
    if (entity.stun > 0) sL = -15 * d;
    lX += sL;
    let lg1X, lg2X;
    if (isPlayer && entity.walking) {
      const wc = Math.sin(t * 0.018) * 16;
      lg1X = wc * d;
      lg2X = -wc * d;
      bn += Math.abs(Math.sin(t * 0.018)) * -3;
    } else if (isPlayer) {
      lg1X = 15 * d;
      lg2X = -10 * d;
    } else {
      let wP = 0;
      if (entity.stun <= 0 && entity.attackCooldown >= 15 && (!entity.isBoss || entity.currentMove !== "feint")) wP = entity.x * 0.08;
      lg1X = Math.sin(wP) * 15 * d;
      lg2X = Math.sin(wP + Math.PI) * 15 * d;
    }
    let dC = entity.color, isCounterReady = false;
    if (isPlayer) {
      dC = entity.state === "hurt" ? "#ff0000" : gameState.strikerColor || "#00ffff";
      if (isTrail) dC = "#ffffff";
      else if (!isTrail && gameState.player.slipBuff > 0) isCounterReady = true;
    }
    if (!isPlayer && entity.shiftWarning > 0) dC = Math.floor(Date.now() / 50) % 2 === 0 ? "#ffffff" : "#aa00ff";
    if (!isPlayer && entity.isActiveThreat) {
      let pT = entity.type === "zoner" ? 10 : 8;
      if (entity.attackCooldown > 0 && entity.attackCooldown <= pT) dC = "#ffffff";
    }
    if (entity.overrideColor) dC = entity.overrideColor;
    ctx3.globalAlpha = opacity;
    ctx3.strokeStyle = dC;
    ctx3.lineWidth = (entity.type === "bruiser" ? 12 : 8) * bS;
    ctx3.lineCap = "round";
    ctx3.lineJoin = "round";
    if (!isPlayer && entity.isBoss && entity.exposedTimer > 0) {
      ctx3.save();
      ctx3.strokeStyle = Math.floor(Date.now() / 50) % 2 === 0 ? "#00ffff" : "#ffffff";
      ctx3.lineWidth = 2;
      ctx3.beginPath();
      ctx3.arc(rX + lX, nY, 30 + Math.sin(Date.now() * 0.01) * 5, 0, Math.PI * 2);
      ctx3.stroke();
      ctx3.restore();
    }
    dl2(rX + lX, hY, rX + lg1X, rY);
    dl2(rX + lX, hY, rX + lg2X, rY);
    let sX = rX + (entity.type === "bruiser" ? 10 * d : 5 * d) + lX;
    dl2(rX + lX, hY, sX, nY);
    if (shape === "bruiser" || shape === "live_wire") {
      ctx3.save();
      ctx3.lineWidth = 6 * bS;
      dl2(sX - 22 * d, nY + 4, sX + 18 * d, nY + 2);
      ctx3.restore();
    }
    if (shape === "assassin") {
      ctx3.save();
      ctx3.lineWidth = 3;
      const wv = Math.sin(t * 0.012 + entity.x) * 6;
      ctx3.beginPath();
      ctx3.moveTo(sX, nY - 4);
      ctx3.quadraticCurveTo(sX - 26 * d, nY - 8 + wv, sX - 48 * d, nY + 4 - wv);
      ctx3.stroke();
      ctx3.restore();
    }
    if (shape === "negative") {
      ctx3.save();
      ctx3.lineWidth = 3;
      ctx3.beginPath();
      ctx3.moveTo(sX - 12 * d, nY);
      ctx3.lineTo(sX - 20 * d, nY - 18);
      ctx3.lineTo(sX - 6 * d, nY - 4);
      ctx3.moveTo(sX + 10 * d, nY);
      ctx3.lineTo(sX + 18 * d, nY - 16);
      ctx3.lineTo(sX + 4 * d, nY - 4);
      ctx3.stroke();
      ctx3.restore();
    }
    drawHead(ctx3, shape, sX + 3 * d, hdY, hS, d, entity.stun > 0 ? "#fff" : dC, dC);
    if (isPlayer && !isTrail) {
      let eC = "#ff00ff", fF = Math.sin(Date.now() * 0.02) * 3;
      ctx3.save();
      if (gameState.player.dangerLevel === 1) {
        ctx3.strokeStyle = `rgba(0,255,255,${0.4 + Math.sin(t * 0.02) * 0.3})`;
        ctx3.lineWidth = 2;
        dc(sX + 3 * d, hdY, hS + 6, false, true);
      } else if (gameState.player.dangerLevel === 2) {
        ctx3.strokeStyle = "#ffffff";
        ctx3.lineWidth = 3;
        ctx3.beginPath();
        for (let i = 0; i < 5; i++) {
          let a = Math.PI + i * Math.PI / 4 - Math.PI / 2;
          if (d < 0) a = -a;
          let r1 = hS + 2, r2 = hS + 12 + Math.random() * 5;
          ctx3.moveTo(sX + 3 * d + Math.cos(a) * r1, hdY + Math.sin(a) * r1);
          ctx3.lineTo(sX + 3 * d + Math.cos(a) * r2, hdY + Math.sin(a) * r2);
        }
        ctx3.stroke();
      }
      ctx3.fillStyle = "#fff";
      ctx3.beginPath();
      ctx3.ellipse(sX + 5 * d, hdY - 3, 5, 2, Math.PI / 8 * d, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.fillStyle = eC;
      ctx3.globalAlpha = 0.8;
      ctx3.beginPath();
      ctx3.moveTo(sX + 5 * d, hdY - 4);
      ctx3.quadraticCurveTo(sX - 1 * d, hdY - 8 + fF, sX - 11 * d, hdY - 6 + fF);
      ctx3.quadraticCurveTo(sX + 1 * d, hdY - 1, sX + 5 * d, hdY - 2);
      ctx3.fill();
      ctx3.restore();
    }
    let ldX = sX + 20 * d, ldY = nY + 10, rrX = sX - 10 * d, rrY = nY - 5;
    if (isPlayer && (entity.state === "recovery" || entity.state === "ghost_step" || entity.state === "hurt")) {
      ldX += 15 * d;
      rrX += 5 * d;
      lX += 10 * d;
    } else if (isPlayer && entity.state === "punching") {
      let iH = entity.hitFrame <= 2 || entity.didHit, ex = iH ? 1 : 0.4, iJ = entity.punchType && entity.punchType.startsWith("jab");
      if (iJ) {
        if (entity.punchType === "jab2") {
          rrX += 50 * ex * d;
          sX += 15 * d;
        } else if (entity.punchType === "jab3") {
          ldX += 60 * ex * d;
          ldY -= 10 * ex;
          lX += 10 * d;
        } else ldX += 50 * ex * d;
      } else if (entity.punchType === "guard_jab") {
        ldX += 40 * ex * d;
        rrX = sX + 15 * d;
        rrY = nY - 5;
      } else if (entity.punchType === "check_hook") {
        ldX = sX + 10 * d;
        ldY = nY - 15;
        rrX += 30 * ex * d;
        rrY -= 15 * ex;
      } else if (entity.punchType === "cross") {
        let rM = gameState.orbCounts.power >= 2 ? 1.25 : 1;
        rrX += 90 * rM * ex * d;
        ldX -= 15 * d;
        sX += 10 * d;
      } else if (entity.punchType === "hook") {
        ldX += 40 * ex * d;
        ldY -= 30 * ex;
        rrX -= 10 * d;
      }
    } else if (isPlayer && entity.state === "guarding") {
      ldX = sX + 10 * d;
      ldY = nY - 15;
      rrX = sX + 15 * d;
      rrY = nY - 5;
    } else if (!isPlayer && entity.isBoss && entity.stun <= 0 && (entity.recoverTimer > 0 || entity.currentMove === "recharge")) {
      ldX = sX + 12 * d;
      ldY = nY + 38;
      rrX = sX - 6 * d;
      rrY = nY + 34;
    } else if (!isPlayer && entity.stun <= 0) {
      if (entity.justAttacked > 0) {
        if (entity.currentMove === "bash" || entity.type === "shield" || entity.type === "bruiser") {
          rrX += 60 * d;
          sX += 10 * d;
        } else if (entity.type !== "zoner") ldX += 50 * d;
      } else if (entity.attackCooldown < 15 && entity.attackCooldown >= 0) {
        let wp = 1 - entity.attackCooldown / 15;
        if (entity.currentMove === "bash" || entity.type === "shield" || entity.type === "bruiser") {
          rrX -= 30 * wp * d;
          rrY -= 20 * wp;
        } else if (entity.type !== "zoner") ldX -= 20 * wp * d;
      } else {
        if (entity.type === "shield") {
          ldX = sX + 5 * d;
          ldY = nY - 10;
          rrX = sX - 5 * d;
          rrY = nY - 5;
        } else if (entity.type === "zoner") {
          ldX = sX + 35 * d;
          ldY = nY;
          rrX = sX - 10 * d;
          rrY = nY + 10;
        } else if (entity.type === "assassin") {
          ldX = sX + 15 * d;
          ldY = nY + 20;
          rrX = sX - 5 * d;
          rrY = nY + 15;
        } else {
          ldX = sX + 15 * d;
          ldY = nY + 10;
          rrX = sX - 5 * d;
          rrY = nY + 5;
        }
      }
    } else if (entity.stun > 0) {
      ldX = sX - 10 * d;
      ldY = nY - 30;
      rrX = sX - 20 * d;
      rrY = nY - 20;
    }
    if (isPlayer && !isTrail && entity.trailColor && entity.state === "punching") {
      const fx = entity.punchType === "cross" || entity.punchType === "jab2" ? rrX : ldX;
      const fy = entity.punchType === "cross" || entity.punchType === "jab2" ? rrY : ldY;
      const heat = entity.trailHeat === void 0 ? 1 : entity.trailHeat;
      const g = ctx3.createLinearGradient(sX - 30 * d, nY, fx, fy);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, entity.trailColor);
      ctx3.save();
      ctx3.globalAlpha = opacity * 0.85 * heat;
      ctx3.strokeStyle = g;
      ctx3.lineWidth = 16 * bS;
      ctx3.lineCap = "round";
      ctx3.shadowColor = entity.trailColor;
      ctx3.shadowBlur = 18;
      dl2(sX - 30 * d, nY + 2, fx - 6 * d, fy);
      ctx3.restore();
      ctx3.strokeStyle = dC;
      entity.glovePositions = [[ldX, ldY], [rrX, rrY]];
    }
    if (shape === "shield" && entity.stun <= 0 && !entity.recoverTimer) {
      ctx3.save();
      ctx3.globalAlpha = opacity * 0.35;
      ctx3.fillStyle = dC;
      const sx0 = sX + 24 * d - (d > 0 ? 0 : 12 * bS);
      ctx3.fillRect(sx0, nY - 22 * bS, 12 * bS, hY - nY + 40 * bS);
      ctx3.globalAlpha = opacity;
      ctx3.lineWidth = 2;
      ctx3.strokeRect(sx0, nY - 22 * bS, 12 * bS, hY - nY + 40 * bS);
      ctx3.restore();
    }
    ctx3.lineWidth = 4 * bS;
    dl2(sX, nY, rrX, rrY);
    ctx3.fillStyle = dC;
    dc(rrX, rrY, gS, true, false);
    ctx3.beginPath();
    ctx3.moveTo(sX, nY);
    if (isPlayer && entity.punchType === "hook" && entity.state === "punching") ctx3.quadraticCurveTo(sX + 30 * d, nY - 20, ldX, ldY);
    else ctx3.lineTo(ldX, ldY);
    ctx3.stroke();
    ctx3.fillStyle = dC;
    dc(ldX, ldY, gS, true, false);
    if (shape === "zoner") {
      ctx3.save();
      ctx3.lineWidth = 9 * bS;
      ctx3.lineCap = "butt";
      dl2(ldX - 6 * d, ldY, ldX + 20 * d, ldY);
      ctx3.fillStyle = "#fff";
      dc(ldX + 21 * d, ldY, 3, true, false);
      ctx3.restore();
    }
    if (shape === "live_wire") {
      ctx3.save();
      ctx3.strokeStyle = "#fff36b";
      ctx3.lineWidth = 2;
      for (const [ax, ay] of [[ldX, ldY], [rrX, rrY]]) {
        ctx3.beginPath();
        ctx3.moveTo(sX, nY);
        const mx = (sX + ax) / 2, my = (nY + ay) / 2;
        ctx3.lineTo(mx - 5, my - 6);
        ctx3.lineTo(mx + 5, my + 4);
        ctx3.lineTo(ax, ay);
        ctx3.stroke();
      }
      ctx3.restore();
    }
    if (isPlayer && !isTrail && entity.charging && gameState.progressionMods.loadedCross) {
      const need = 18, k = Math.min(1, (entity.crossCharge || 0) / need), loaded = k >= 1;
      const col = entity.trailColor || "#ffffff";
      const flick = loaded ? Math.floor(t / 70) % 2 ? "#ffffff" : col : col;
      ctx3.save();
      ctx3.globalAlpha = opacity * (loaded ? 0.9 : 0.35 + 0.45 * k * (0.6 + 0.4 * Math.sin(t * 0.05)));
      ctx3.fillStyle = flick;
      ctx3.shadowColor = flick;
      ctx3.shadowBlur = loaded ? 22 : 10;
      dc(rrX, rrY, gS + 2 + (loaded ? 4 + Math.sin(t * 0.03) * 2 : k * 3), true, false);
      ctx3.shadowBlur = 0;
      const n = loaded ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const a = t * (loaded ? 0.018 : 0.012) + i * Math.PI * 2 / n, r = gS + 9;
        ctx3.globalAlpha = opacity;
        ctx3.fillStyle = loaded ? "#ffffff" : col;
        dc(rrX + Math.cos(a) * r, rrY + Math.sin(a) * r, loaded ? 2.5 : 1.8, true, false);
      }
      ctx3.restore();
    }
    if (isPlayer && !isTrail && isCounterReady) {
      let cP = Math.sin(Date.now() * 0.02) * 2;
      ctx3.save();
      ctx3.strokeStyle = "#ffffff";
      ctx3.lineWidth = 2;
      dc(rrX, rrY, gS + 4 + cP, false, true);
      dc(ldX, ldY, gS + 4 + cP, false, true);
      ctx3.restore();
    }
    ctx3.globalAlpha = 1;
  }

  // src/systems/boss_rules.js
  var BO = CONSTANTS.BOSS_OFFENSE;
  function telegraphLead(en) {
    const mult = en && en.arcMods && en.arcMods.punishWindowMult || 1;
    return Math.max(BO.minTelegraphLead, Math.floor(BO.telegraphLead * mult));
  }
  function punishFrames(en, move) {
    const mult = en && en.arcMods && en.arcMods.punishWindowMult || 1;
    const base = BO.punishFrames[move] || BO.punishFrames.jab;
    return Math.max(BO.minPunishFrames, Math.floor(base * mult));
  }
  function beginPunishWindow(en, move) {
    const f = punishFrames(en, move);
    en.recoverTimer = f;
    en.recoverMax = f;
    en.punishShown = false;
    en.telegraphed = false;
  }
  function isBossOpen(en) {
    if (!en || !en.isBoss) return false;
    if ((en.recoverTimer || 0) > 0) return true;
    return en.controller === "static_monk" && en.currentMove === "recharge";
  }
  function clampCycle(frames) {
    return Math.max(BO.minTelegraphLead + 2, Math.round(frames));
  }

  // src/systems/telemetry.js
  var KEY = "neon_strike_telemetry_v1";
  var MAX_RUNS = 25;
  var TELEMETRY_VERSION = "19.0.0";
  var run = null;
  var stage = null;
  function safeGet2() {
    try {
      const r = localStorage.getItem(KEY);
      const a = r ? JSON.parse(r) : [];
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }
  function safeSet2(a) {
    try {
      localStorage.setItem(KEY, JSON.stringify(a));
    } catch (e) {
    }
  }
  var bump = (obj, k, n = 1) => {
    obj[k] = (obj[k] || 0) + n;
  };
  function newStage(n) {
    const arc = CONSTANTS.getArcIndex(n), lvl = CONSTANTS.getLevelInArc(n);
    const t = CONSTANTS.ARC_STAGE_TABLES[Math.min(arc, 5)] || {};
    return {
      stage: n,
      arc,
      level: lvl,
      name: t[lvl] && t[lvl].stageName || "",
      boss: CONSTANTS.isBossStage(n),
      frames: 0,
      kills: {},
      dmg: {},
      hitsTaken: 0,
      attacks: {},
      landed: {},
      slips: { perfect: 0, good: 0 },
      ghosts: { used: 0, perfect: 0 },
      guards: 0,
      knockdowns: 0,
      floored: 0,
      counteredBy: 0,
      finishers: [],
      wager: null
    };
  }
  function tmStartRun({ seed = null, daily = false } = {}) {
    run = { v: TELEMETRY_VERSION, id: `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`, date: (/* @__PURE__ */ new Date()).toISOString(), seed, daily, frames: 0, stages: [], evolutions: [], end: null };
    stage = newStage(1);
    run.stages.push(stage);
  }
  function tmStage(n) {
    if (!run) return;
    stage = newStage(n);
    run.stages.push(stage);
  }
  function tmTick() {
    if (!run || !stage) return;
    run.frames++;
    stage.frames++;
  }
  function tmKill(kind) {
    if (stage) bump(stage.kills, kind);
  }
  function tmDamage(src, amt) {
    if (!stage) return;
    bump(stage.dmg, src || "unknown", Math.max(0, Math.round(amt)));
    stage.hitsTaken++;
    if (run) run.lastDamageSrc = src || "unknown";
  }
  function tmAttack(punch) {
    if (stage) bump(stage.attacks, punch);
  }
  function tmLanded(punch) {
    if (stage) bump(stage.landed, punch);
  }
  function tmSlip(quality) {
    if (stage && stage.slips[quality] !== void 0) stage.slips[quality]++;
  }
  function tmGhost(perfect) {
    if (!stage) return;
    if (perfect) stage.ghosts.perfect++;
    else stage.ghosts.used++;
  }
  function tmGuard() {
    if (stage) stage.guards++;
  }
  function tmKnockdown() {
    if (stage) stage.knockdowns++;
  }
  function tmFloored(counter) {
    if (!stage) return;
    stage.floored++;
    if (counter) stage.counteredBy++;
  }
  function tmFinisher(kind, result, hits, prompts) {
    if (stage) stage.finishers.push({ kind, result, hits, prompts });
  }
  function tmEvolution(id) {
    if (run) run.evolutions.push({ stage: gameState.currentStage, frame: run.frames, id });
  }
  function tmWager(name) {
    if (stage) stage.wager = name || null;
  }
  function tmEndRun({ stage: endStage, score, grade }) {
    if (!run) return null;
    run.end = { stage: endStage, score, grade, frames: run.frames, cause: run.lastDamageSrc || "unknown" };
    const all = safeGet2();
    all.push(run);
    safeSet2(all.slice(-MAX_RUNS));
    const done = run;
    run = null;
    stage = null;
    return done;
  }
  function liveRun() {
    return run;
  }
  function loadTelemetry() {
    return safeGet2();
  }
  function exportTelemetryJSON() {
    return JSON.stringify({ exported: (/* @__PURE__ */ new Date()).toISOString(), game: "neon-strike", version: TELEMETRY_VERSION, runs: safeGet2() }, null, 2);
  }
  function fmtTime(frames) {
    const s = Math.floor((frames || 0) / 60);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  function summarizeTelemetry(runs) {
    const ends = {}, hurt = {}, stageTime = {}, reached = {};
    for (const r of runs) {
      if (r.end) bump(ends, r.end.stage);
      for (const s of r.stages || []) {
        bump(reached, s.stage);
        (stageTime[s.stage] = stageTime[s.stage] || []).push(s.frames);
        for (const [k, v] of Object.entries(s.dmg || {})) bump(hurt, k, v);
      }
    }
    const avgTime = {};
    for (const [k, arr] of Object.entries(stageTime)) avgTime[k] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    const topHurt = Object.entries(hurt).sort((a, b) => b[1] - a[1]);
    return { runs: runs.length, ends, reached, avgTime, topHurt };
  }

  // src/systems/finisher.js
  var F = CONSTANTS.FINISHER;
  var LANE_STEP = { up: -1, down: 1 };
  function finisherSequence(controller, kind) {
    const set = F.sequences[controller] || F.sequences.neon_enforcer;
    return set[kind] || set.break1;
  }
  function gateBossDamage(en, dmg) {
    if (!en || !en.isBoss || en.koDone || gameState.finisher || en.pendingFinisher) return dmg;
    const stage2 = en.finisherStage || 0;
    if (stage2 < F.thresholds.length) {
      const line = en.maxHp * F.thresholds[stage2];
      if (en.hp - dmg <= line) {
        en.finisherStage = stage2 + 1;
        en.pendingFinisher = "break" + (stage2 + 1);
        return Math.max(0, en.hp - line);
      }
    }
    if (en.hp - dmg <= 0) {
      en.pendingFinisher = "ko";
      return Math.max(0, en.hp - 1);
    }
    return dmg;
  }
  function checkBossThresholds(en) {
    if (!en || !en.isBoss || en.koDone || gameState.finisher || en.pendingFinisher) return;
    const stage2 = en.finisherStage || 0;
    if (en.hp <= 0) {
      en.hp = 1;
      en.pendingFinisher = "ko";
      return;
    }
    if (stage2 < F.thresholds.length && en.hp <= en.maxHp * F.thresholds[stage2]) {
      en.finisherStage = stage2 + 1;
      en.pendingFinisher = "break" + (stage2 + 1);
    }
  }
  function startFinisher(en, kind) {
    const seq = finisherSequence(en.controller, kind).slice();
    let dmgPerHit = 0;
    if (kind !== "ko") {
      const nextStage = en.finisherStage || 0;
      const floorFrac = nextStage < F.thresholds.length ? F.thresholds[nextStage] + 0.02 : 0.02;
      const budget = Math.max(0, Math.min(en.maxHp * F.breakDamageFrac, en.hp - en.maxHp * floorFrac));
      dmgPerHit = budget / seq.length;
    }
    gameState.finisher = {
      boss: en,
      kind,
      seq,
      idx: 0,
      phase: "intro",
      frame: 0,
      timer: F.introFrames,
      nextBeat: 0,
      hits: 0,
      perfects: 0,
      result: null,
      dmgPerHit,
      zoom: 1,
      bars: 0,
      freeze: 0,
      poseTimer: 0,
      judge: null,
      judgeTimer: 0,
      jabAlt: false,
      landed: [],
      playIdx: 0,
      playTimer: 0,
      lockFlash: 0
    };
    const p = gameState.player;
    p.state = "idle";
    p.punchTimer = 0;
    p.hitFrame = 0;
    p.inputBuffer = null;
    p.movementBuffer = null;
    p.lane = 1;
    p.x = Math.min(Math.max(p.x, 160), 300);
    en.lane = 1;
    en.x = p.x + 118;
    en.vx = 0;
    en.stun = 0;
    const midY = gameState.height * CONSTANTS.LANE_Y[1];
    en.y = midY;
    p.y = midY;
    en.recoverTimer = 0;
    en.telegraphed = false;
    en.shiftWarning = 0;
    en.exposedTimer = 0;
    en.decoyTimer = 0;
    en.targetLanes = [];
    en.justAttacked = 0;
    gameState.hazards = [];
    gameState.liveLanes = [];
    gameState.hitstop = 0;
    const label = kind === "ko" ? "FINAL BLOW" : "STAGGERED!";
    spawnFloatingText(en.x + en.w / 2, en.y - 190, label, kind === "ko" ? "#ff0055" : "#ffffff");
    playSound("stagger");
    doFlash(kind === "ko" ? 0.7 : 0.5);
    triggerShockwave(en.x, en.y - 60, gameState.bossThemeColor || "#ffffff");
    createShatter(en.x, en.y - 60, gameState.bossThemeColor || "#ffffff");
    gameState.shake = Math.max(gameState.shake, 20);
  }
  function justPressed(code) {
    return !!gameState.keys[code] && !gameState.lastKeys[code];
  }
  function readFinisherInput() {
    const K2 = getBinds();
    if (justPressed(K2.up) || gameState.pad.up) return "up";
    if (justPressed(K2.down) || gameState.pad.down) return "down";
    if (justPressed(K2.jab) || gameState.pad.jab) return "jab";
    if (justPressed(K2.cross) || gameState.pad.cross) return "cross";
    if (justPressed(K2.hook) || gameState.pad.hook) return "hook";
    return null;
  }
  var ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  function judge(text, color) {
    const f = gameState.finisher;
    f.judge = { text, color };
    f.judgeTimer = 34;
  }
  var PLAY_GAP = 17;
  function recordPrompt(isPerfect) {
    const f = gameState.finisher;
    f.landed.push({ move: f.seq[f.idx], perfect: isPerfect });
    judge(isPerfect ? "PERFECT" : "GOOD", isPerfect ? "#ffffff" : "#22d3ee");
    playSound(isPerfect ? "perfect_slip" : "slip");
    f.lockFlash = 10;
    f.idx++;
    if (f.idx >= f.seq.length) endInput("clean");
    else f.nextBeat += F.beatFrames;
  }
  function endInput(result) {
    const f = gameState.finisher;
    f.result = result;
    if (f.landed.length) {
      f.phase = "playback";
      f.playIdx = 0;
      f.playTimer = 14;
      f.judge = null;
    } else endPrompts(result);
  }
  function landPrompt(isPerfect, moveOverride) {
    const f = gameState.finisher, en = f.boss, p = gameState.player;
    const move = moveOverride || f.seq[f.idx];
    if (move in LANE_STEP) {
      const old = { x: en.x, y: en.y };
      p.lane += LANE_STEP[move];
      p.slipCooldown = 20;
      en.lane = p.lane;
      createShatter(old.x, old.y - 60, gameState.bossThemeColor || "#ffffff");
      p.state = "punching";
      p.punchType = "cross";
      p.hitFrame = 0;
      p.didHit = true;
    } else {
      p.state = "punching";
      p.punchType = move === "jab" ? (f.jabAlt = !f.jabAlt) ? "jab1" : "jab2" : move;
      p.hitFrame = 0;
      p.didHit = true;
    }
    f.poseTimer = 12;
    if (f.kind !== "ko") en.hp = Math.max(1, en.hp - f.dmgPerHit);
    f.hits++;
    gameState.statFinisherHits = (gameState.statFinisherHits || 0) + 1;
    if (isPerfect) f.perfects++;
    gameState.combo++;
    if (gameState.combo > gameState.statMaxCombo) gameState.statMaxCombo = gameState.combo;
    addScore(CONSTANTS.SCORE.finisherHit + (isPerfect ? CONSTANTS.SCORE.finisherPerfect : 0), en.x + en.w / 2, en.y - 150, { big: true });
    judge(isPerfect ? "PERFECT" : "GREAT", isPerfect ? "#ffffff" : "#22d3ee");
    playSound("finisher_hit");
    doFlash(isPerfect ? 0.45 : 0.3);
    gameState.shake = Math.max(gameState.shake, isPerfect ? 26 : 18);
    triggerShockwave(en.x, en.y - 60, isPerfect ? "#ffffff" : gameState.bossThemeColor || "#ff0055");
    createShatter(en.x, en.y - 70, isPerfect ? "#ffffff" : gameState.bossThemeColor || "#ff0055");
    for (let i = 0; i < 3; i++) createImpact(en.x, en.y - 60 - i * 20, "#ffffff");
    if (en.controller === "live_wire") {
      createImpact(en.x + 30, en.y - 80, "#fff36b");
      createImpact(en.x + 10, en.y - 40, "#fff36b");
      playSound("shock");
    }
    f.freeze = hitStopEnabled() ? isPerfect ? 9 : 6 : 0;
  }
  function missPrompt(reason) {
    judge(reason, "#ff8800");
    playSound("finisher_miss");
    endInput("broken");
  }
  function endPrompts(result) {
    const f = gameState.finisher;
    tmFinisher(f.kind, result, f.landed ? f.landed.length : f.hits, f.seq.length);
    f.result = result;
    f.phase = "outro";
    f.timer = F.outroFrames;
    const en = f.boss;
    if (result === "clean") {
      gameState.statFinishersClean = (gameState.statFinishersClean || 0) + 1;
      addScore(CONSTANTS.SCORE.finisherClean, en.x + en.w / 2, en.y - 210, { big: true });
      spawnFloatingText(en.x + en.w / 2, en.y - 230, f.kind === "ko" ? "FLAWLESS FINISH" : "FULL BREAK!", "#facc15");
    } else if (f.kind !== "ko") {
      spawnFloatingText(en.x + en.w / 2, en.y - 230, "STAGGER BROKEN", "#ff8800");
    }
    if (f.kind === "ko") {
      playSound("finisher_ko");
      doFlash(0.8);
      gameState.shake = Math.max(gameState.shake, 40);
      for (let i = 0; i < 3; i++) triggerShockwave(en.x, en.y - 60 - i * 10, i === 1 ? "#ffffff" : gameState.bossThemeColor || "#ff0055");
      spawnFloatingText(en.x + en.w / 2, en.y - 260, "K.O.", "#ffffff");
    }
  }
  function finishFinisher() {
    const f = gameState.finisher, en = f.boss, p = gameState.player;
    p.state = "idle";
    p.punchType = null;
    if (f.kind === "ko") {
      en.koDone = true;
      en.hp = 0;
    } else {
      en.x = Math.min(gameState.width - 150, en.x + 150);
      en.stun = 0;
      en.stunResist = 60;
      en.recoverTimer = 0;
      en.telegraphed = false;
      en.attackCooldown = (en.maxCooldown || 60) + 40;
      if (en.controller === "static_monk") {
        en.currentMove = "laser";
        en.attackCooldown = 110;
        en.bossMashCount = 0;
      }
    }
    gameState.finisher = null;
    gameState.finisherZoom = 1;
  }
  function updateFinisher() {
    const f = gameState.finisher;
    if (!f) return;
    f.frame++;
    if (f.judgeTimer > 0) f.judgeTimer--;
    if (f.freeze > 0) f.freeze--;
    if (f.poseTimer > 0 && --f.poseTimer === 0) gameState.player.state = "idle";
    gameState.player.y += (gameState.height * CONSTANTS.LANE_Y[gameState.player.lane] - gameState.player.y) * 0.35;
    f.boss.y += (gameState.height * CONSTANTS.LANE_Y[f.boss.lane] - f.boss.y) * 0.35;
    if (gameState.player.slipCooldown > 0) gameState.player.slipCooldown--;
    if (f.phase === "intro") {
      f.timer--;
      const k = ease(1 - f.timer / F.introFrames);
      f.zoom = 1 + (F.zoom - 1) * k;
      f.bars = k;
      if (f.timer <= 0) {
        f.phase = "prompts";
        f.nextBeat = f.frame + F.beatFrames * F.leadBeats;
      }
    } else if (f.phase === "playback") {
      f.zoom = F.zoom;
      f.bars = 1;
      if (f.freeze <= 0 && --f.playTimer <= 0) {
        const hit = f.landed[f.playIdx++];
        if (hit) {
          landPrompt(hit.perfect, hit.move);
          f.playTimer = PLAY_GAP;
        } else endPrompts(f.result);
      }
    } else if (f.phase === "prompts") {
      f.zoom = F.zoom;
      f.bars = 1;
      if (f.lockFlash > 0) f.lockFlash--;
      const t = f.frame - f.nextBeat;
      if (t === 0) playSound("beat_tick");
      const input = readFinisherInput();
      const want = f.seq[f.idx];
      if (input) {
        if (t < -F.windowEarly) missPrompt("TOO EARLY");
        else if (input !== want) missPrompt("WRONG MOVE");
        else recordPrompt(Math.abs(t) <= F.perfectWindow);
      } else if (t > F.windowLate) {
        missPrompt("MISSED");
      }
    } else if (f.phase === "outro") {
      f.timer--;
      const k = ease(f.timer / F.outroFrames);
      f.zoom = 1 + (F.zoom - 1) * k;
      f.bars = k;
      if (f.timer <= 0) {
        finishFinisher();
        return;
      }
    }
    gameState.finisherZoom = reducedMotion() ? 1 : f.zoom;
  }
  function promptProgress() {
    const f = gameState.finisher;
    if (!f || f.phase !== "prompts") return null;
    const lead = F.beatFrames * F.leadBeats;
    const t = f.frame - f.nextBeat;
    return { move: f.seq[f.idx], progress: Math.min(1.2, Math.max(0, (t + lead) / lead)), t };
  }

  // src/systems/knockdown.js
  var K = CONSTANTS.KNOCKDOWN;
  function canBeKnockedDown() {
    return (gameState.knockdownsThisArc || 0) === 0;
  }
  function knockdownSequence(n, rnd = Math.random) {
    const seq = [];
    for (let i = 0; i < n; i++) {
      let m = rnd() < 0.5 ? "up" : "down";
      if (i > 0 && m === seq[i - 1] && rnd() < 0.6) m = m === "up" ? "down" : "up";
      seq.push(m);
    }
    return seq;
  }
  function startKnockdown() {
    const arc = Math.min(CONSTANTS.getArcIndex(gameState.currentStage), 5);
    const n = K.promptsByArc[arc] || 3;
    gameState.knockdown = {
      frame: 0,
      count: 0,
      seq: knockdownSequence(n),
      idx: 0,
      nextBeat: K.framesPerCount + K.beatFrames,
      phase: "down",
      fall: 0,
      judge: null,
      judgeTimer: 0,
      upTimer: 0,
      perfects: 0,
      goods: 0,
      stumbles: 0,
      hpFrac: 0
    };
    gameState.knockdownsThisArc = (gameState.knockdownsThisArc || 0) + 1;
    gameState.statKnockdowns = (gameState.statKnockdowns || 0) + 1;
    tmKnockdown();
    gameState.health = 0;
    gameState.combo = 0;
    gameState.isInstinct = false;
    gameState.zoneTimer = 0;
    const p = gameState.player;
    p.state = "down";
    p.charging = false;
    p.inputBuffer = null;
    p.movementBuffer = null;
    gameState.shake = 30;
    doFlash(0.6);
    playSound("knockdown");
    spawnFloatingText(p.x + 20, p.y - 150, "KNOCKDOWN!", "#ff3355");
  }
  function justPressed2(code) {
    return !!gameState.keys[code] && !gameState.lastKeys[code];
  }
  function readLaneInput() {
    const B = getBinds();
    if (justPressed2(B.up) || gameState.pad.up) return "up";
    if (justPressed2(B.down) || gameState.pad.down) return "down";
    if (justPressed2(B.jab) || justPressed2(B.cross) || justPressed2(B.hook) || gameState.pad.jab || gameState.pad.cross || gameState.pad.hook) return "other";
    return null;
  }
  function judge2(text, color) {
    const k = gameState.knockdown;
    k.judge = { text, color };
    k.judgeTimer = 26;
  }
  function recoveryHpFrac({ perfects = 0, goods = 0, stumbles = 0, prompts = 3 }) {
    const quality = (perfects + goods * 0.6) / Math.max(1, prompts) - stumbles * 0.1;
    return Math.min(K.hpMax, Math.max(K.hpMin, K.hpBase + K.hpSpan * quality));
  }
  function getUp() {
    const k = gameState.knockdown, p = gameState.player;
    k.phase = "up";
    k.upTimer = 50;
    k.hpFrac = recoveryHpFrac({ perfects: k.perfects, goods: k.goods, stumbles: k.stumbles, prompts: k.seq.length });
    gameState.health = Math.round(gameState.maxHealth * k.hpFrac);
    gameState.combo = 0;
    p.invuln = K.invulnFrames;
    gameState.inputGrace = 8;
    for (const en of gameState.enemies) {
      if (Math.abs(en.x - p.x) < 220) {
        en.x = Math.max(en.x, p.x + 180);
        en.attackCooldown = Math.max(en.attackCooldown, en.maxCooldown || 60);
        en.telegraphed = false;
        en.stringIdx = 0;
      }
    }
    gameState.hazards = [];
    playSound("stagger");
    doFlash(0.4);
    triggerShockwave(p.x + 25, p.y - 60, "#ffffff");
    spawnFloatingText(p.x + 20, p.y - 160, `BACK UP \xB7 ${Math.round(k.hpFrac * 100)}% HP`, k.hpFrac >= 0.7 ? "#facc15" : "#22d3ee");
  }
  function updateKnockdown() {
    const k = gameState.knockdown;
    if (!k) return null;
    k.frame++;
    if (k.judgeTimer > 0) k.judgeTimer--;
    if (k.phase === "up") {
      k.fall = Math.max(0, k.fall - 0.06);
      if (--k.upTimer <= 0) {
        gameState.player.state = "idle";
        gameState.knockdown = null;
        return "up";
      }
      return "down";
    }
    k.fall = Math.min(1, k.fall + 0.12);
    if (k.frame % K.framesPerCount === 0) {
      k.count++;
      playSound(k.count >= 8 ? "ref_count_hi" : "ref_count");
      if (k.count >= 10) {
        k.phase = "out";
        playSound("bell");
        return "out";
      }
    }
    const t = k.frame - k.nextBeat;
    if (t >= -K.beatFrames) {
      const input = readLaneInput();
      const want = k.seq[k.idx];
      const advance = () => {
        k.nextBeat += K.beatFrames;
      };
      if (input) {
        if (t < -K.windowEarly || input !== want) {
          k.stumbles++;
          judge2("STUMBLE", "#ff8800");
          playSound("finisher_miss");
          advance();
        } else {
          const perfect = Math.abs(t) <= K.perfectWindow;
          if (perfect) k.perfects++;
          else k.goods++;
          judge2(perfect ? "PERFECT" : "UP!", perfect ? "#ffffff" : "#22d3ee");
          playSound("perfect_slip");
          k.idx++;
          if (k.idx >= k.seq.length) {
            getUp();
            return "down";
          }
          advance();
        }
      } else if (t > K.windowLate) {
        k.stumbles++;
        judge2("TOO SLOW", "#ff8800");
        advance();
      }
    }
    return "down";
  }
  function knockdownPrompt() {
    const k = gameState.knockdown;
    if (!k || k.phase !== "down") return null;
    const t = k.frame - k.nextBeat;
    if (t < -K.beatFrames) return null;
    return { move: k.seq[k.idx], progress: Math.min(1.2, Math.max(0, (t + K.beatFrames) / K.beatFrames)), t };
  }

  // src/systems/colors.js
  function treeColor(tree) {
    return CONSTANTS.TREES[tree] && CONSTANTS.TREES[tree].color || "#ffffff";
  }
  function upgradeColorFor(u) {
    if (!u) return "#ffffff";
    if (CONSTANTS.FUSION_COLORS[u.id]) return CONSTANTS.FUSION_COLORS[u.id];
    if (u.kind === "overclock") return "#c084fc";
    return treeColor(u.tree);
  }
  function buildColor() {
    const owned = gameState.acquiredUpgradeIds || [];
    for (let i = owned.length - 1; i >= 0; i--) {
      if (CONSTANTS.FUSION_COLORS[owned[i]]) return CONSTANTS.FUSION_COLORS[owned[i]];
    }
    let best = null, bestRank = 0;
    const order = gameState.rankOrder || [];
    for (const tree of CONSTANTS.TREE_ORDER) {
      const r = gameState.orbCounts && gameState.orbCounts[tree] || 0;
      if (r > bestRank || r === bestRank && r > 0 && order.lastIndexOf(tree) > order.lastIndexOf(best)) {
        best = tree;
        bestRank = r;
      }
    }
    return best ? treeColor(best) : "#ffffff";
  }

  // src/systems/vignette.js
  var VIGNETTE_FULL_FRAMES = 70;
  var VIGNETTE_REPEAT_FRAMES = 36;
  var SKIP_GUARD_FRAMES = 16;
  function upgradeColor(u) {
    return upgradeColorFor(u);
  }
  function upgradeRarity(u) {
    if (!u) return "orb";
    if (u.kind === "fusion") return u.evolved ? "evolved" : "fusion";
    if (u.draftRole === "apex") return "apex";
    if (u.verb) return "verb";
    if (u.kind === "mastery") return "mastery";
    if (u.kind === "overclock") return "overclock";
    return "orb";
  }
  var TREE_NAMES = { speed: "SPEED", power: "POWER", technique: "TECHNIQUE" };
  function evolutionLabel(u, rarity = upgradeRarity(u)) {
    if (!u) return "";
    const tree = TREE_NAMES[u.tree];
    if (u.kind === "rank") return `${tree || ""} \xB7 RANK ${u.rank}${rarity === "verb" ? " \xB7 SIGNATURE MOVE" : rarity === "apex" ? " \xB7 APEX" : ""}`;
    if (u.kind === "mastery") return `${tree ? tree + " " : ""}MASTERY`;
    if (u.kind === "fusion") {
      const pair = (u.trees || []).map((t) => TREE_NAMES[t] || t).join(" + ");
      return `${u.evolved ? "PERFECTED FUSION" : "FUSION"}${pair ? " \xB7 " + pair : ""}`;
    }
    return "OVERCLOCK";
  }
  var STING = { evolved: "sting_fusion", fusion: "sting_fusion", apex: "sting_fusion", verb: "sting_mastery", mastery: "sting_mastery", overclock: "sting_overclock", orb: "sting_orb" };
  function vignetteDuration(upgradeId, seenBefore, reduced = false) {
    return seenBefore || reduced ? VIGNETTE_REPEAT_FRAMES : VIGNETTE_FULL_FRAMES;
  }
  var RARITY_ORDER = ["evolved", "fusion", "apex", "verb", "mastery", "orb", "overclock"];
  function playUpgradeVignette(upgradeOrList, onDone) {
    const picks = Array.isArray(upgradeOrList) ? upgradeOrList.filter(Boolean) : [upgradeOrList];
    if (!picks.length) {
      if (onDone) onDone();
      return;
    }
    const allSeen = picks.every((u) => hasSeenUpgrade(u.id));
    picks.forEach((u) => markUpgradeSeen(u.id));
    const hero = picks.slice().sort((a, b) => RARITY_ORDER.indexOf(upgradeRarity(a)) - RARITY_ORDER.indexOf(upgradeRarity(b)))[0];
    const rarity = upgradeRarity(hero);
    gameState.vignette = {
      upgrade: hero,
      picks,
      rarity,
      color: upgradeColor(hero),
      repeat: allSeen,
      timer: 0,
      duration: vignetteDuration(hero.id, allSeen, reducedMotion()),
      holding: false,
      onDone,
      sparks: []
    };
    gameState.screen = "vignette";
    playSound(STING[rarity] || "sting_orb");
  }
  function updateVignette() {
    const v = gameState.vignette;
    if (!v) return;
    v.timer++;
    if (!reducedMotion() && v.timer < v.duration - 8) {
      for (let i = 0; i < 3; i++) v.sparks.push({ gx: Math.random() < 0.5 ? 0 : 1, ox: (Math.random() - 0.5) * 14, oy: 0, vx: (Math.random() - 0.5) * 1.6, vy: -1.5 - Math.random() * 2.5, life: 1 });
    }
    v.sparks.forEach((s) => {
      s.ox += s.vx;
      s.oy += s.vy;
      s.life -= 0.05;
    });
    v.sparks = v.sparks.filter((s) => s.life > 0);
    if (v.timer >= v.duration) {
      v.timer = v.duration;
      v.holding = true;
    }
  }
  function skipVignette() {
    const v = gameState.vignette;
    if (!v || v.timer < SKIP_GUARD_FRAMES) return false;
    if (!v.holding) {
      v.timer = v.duration;
      v.holding = true;
      return false;
    }
    endVignette();
    return true;
  }
  function endVignette() {
    const v = gameState.vignette;
    if (!v) return;
    gameState.vignette = null;
    if (typeof v.onDone === "function") v.onDone();
  }

  // src/systems/input_device.js
  function padFamily(id = "") {
    const s = String(id).toLowerCase();
    if (/045e|xbox|xinput|x-box/.test(s)) return "xbox";
    if (/054c|playstation|dualshock|dualsense|ps4|ps5/.test(s)) return "playstation";
    return "xbox";
  }
  function setInputDevice(dev) {
    if (dev) gameState.inputDevice = dev;
  }
  function inputDevice() {
    return gameState.inputDevice || "keyboard";
  }
  var PAD = {
    playstation: {
      jab: { label: "\u25A1", color: "#f472b6" },
      cross: { label: "\u25B3", color: "#34d399" },
      hook: { label: "\u25CB", color: "#f87171" },
      instinct: { label: "\xD7", color: "#60a5fa" },
      confirm: { label: "\xD7", color: "#60a5fa" },
      back: { label: "\u25CB", color: "#f87171" },
      ghost: { label: "L1", color: "#e5e7eb" },
      guard: { label: "R1", color: "#e5e7eb" },
      up: { label: "\u25B2", color: "#e5e7eb" },
      down: { label: "\u25BC", color: "#e5e7eb" },
      left: { label: "\u25C0", color: "#e5e7eb" },
      right: { label: "\u25B6", color: "#e5e7eb" },
      pause: { label: "OPTIONS", color: "#e5e7eb" },
      tabs: { label: "L1 / R1", color: "#e5e7eb" }
    },
    xbox: {
      jab: { label: "X", color: "#60a5fa" },
      cross: { label: "Y", color: "#facc15" },
      hook: { label: "B", color: "#f87171" },
      instinct: { label: "A", color: "#4ade80" },
      confirm: { label: "A", color: "#4ade80" },
      back: { label: "B", color: "#f87171" },
      ghost: { label: "LB", color: "#e5e7eb" },
      guard: { label: "RB", color: "#e5e7eb" },
      up: { label: "\u25B2", color: "#e5e7eb" },
      down: { label: "\u25BC", color: "#e5e7eb" },
      left: { label: "\u25C0", color: "#e5e7eb" },
      right: { label: "\u25B6", color: "#e5e7eb" },
      pause: { label: "MENU", color: "#e5e7eb" },
      tabs: { label: "LB / RB", color: "#e5e7eb" }
    }
  };
  var KEY_FIXED = { confirm: "ENTER", back: "ESC", pause: "ESC", tabs: "Q / E" };
  function glyph(action, dev = inputDevice()) {
    if (dev === "playstation" || dev === "xbox") return PAD[dev][action] || { label: action.toUpperCase(), color: "#e5e7eb" };
    if (KEY_FIXED[action]) return { label: KEY_FIXED[action], color: "#e5e7eb" };
    const code = getBinds()[action];
    return { label: code ? keyLabel(code) : action.toUpperCase(), color: "#e5e7eb" };
  }
  function glyphText(action, dev) {
    return glyph(action, dev).label;
  }
  function glyphHTML(action, dev) {
    const g = glyph(action, dev);
    return `<span class="glyph" style="--g:${g.color}">${g.label}</span>`;
  }

  // src/render/overlays.js
  var MOVE_STYLE = {
    bash: { label: "BASH", color: "#ffaa00" },
    jab: { label: "JAB", color: "#ffffff" },
    feint: { label: "FEINT", color: "#c084fc" },
    laser: { label: "LASER", color: "#39ff14" }
  };
  function drawScorePops(ctx3) {
    if (!gameState.scorePops || !gameState.scorePops.length) return;
    ctx3.save();
    ctx3.textAlign = "center";
    gameState.scorePops.forEach((p) => {
      ctx3.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
      ctx3.font = p.big ? "900 italic 26px Orbitron" : "bold 13px Orbitron";
      ctx3.fillStyle = p.big ? "#facc15" : "#fde68a";
      ctx3.shadowColor = "#facc15";
      ctx3.shadowBlur = p.big ? 12 : 4;
      ctx3.fillText(p.text, p.x, p.y);
    });
    ctx3.restore();
  }
  function drawBossTells(ctx3, en) {
    if (!en.isBoss || gameState.bossIntroTimer > 0) return;
    const cx = en.x - 34, top = en.y - en.h * 0.95;
    ctx3.save();
    if (isBossOpen(en)) {
      const max = en.recoverMax || 1;
      const left = en.controller === "static_monk" && en.currentMove === "recharge" ? Math.max(0, en.attackCooldown) / Math.max(1, Math.floor(180 / (en.arcMods && en.arcMods.teleportRateMult || 1))) : (en.recoverTimer || 0) / max;
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.02);
      ctx3.strokeStyle = `rgba(34, 211, 238, ${pulse})`;
      ctx3.lineWidth = 3;
      const bx = en.x - 22, by = en.y - en.h * 1.5 - 10, bw = en.w + 44, bh = en.h * 1.5 + 16, k = 14;
      ctx3.beginPath();
      ctx3.moveTo(bx, by + k);
      ctx3.lineTo(bx, by);
      ctx3.lineTo(bx + k, by);
      ctx3.moveTo(bx + bw - k, by);
      ctx3.lineTo(bx + bw, by);
      ctx3.lineTo(bx + bw, by + k);
      ctx3.moveTo(bx, by + bh - k);
      ctx3.lineTo(bx, by + bh);
      ctx3.lineTo(bx + k, by + bh);
      ctx3.moveTo(bx + bw - k, by + bh);
      ctx3.lineTo(bx + bw, by + bh);
      ctx3.lineTo(bx + bw, by + bh - k);
      ctx3.stroke();
      ctx3.fillStyle = "#22d3ee";
      ctx3.font = "900 italic 18px Orbitron";
      ctx3.textAlign = "center";
      ctx3.shadowColor = "#22d3ee";
      ctx3.shadowBlur = 12;
      ctx3.fillText("OPEN", cx, top + 8);
      ctx3.shadowBlur = 0;
      ctx3.fillStyle = "rgba(34, 211, 238, 0.25)";
      ctx3.fillRect(cx - 40, top + 16, 80, 4);
      ctx3.fillStyle = "#22d3ee";
      ctx3.fillRect(cx - 40, top + 16, 80 * Math.max(0, Math.min(1, left)), 4);
    } else if (en.telegraphed && en.stun <= 0 && en.attackCooldown > 0) {
      const move = en.controller === "static_monk" ? "laser" : en.currentMove || "jab";
      const style = MOVE_STYLE[move] || MOVE_STYLE.jab;
      const lead = Math.max(1, en.telegraphAt || 30);
      const k = Math.max(0, Math.min(1, 1 - en.attackCooldown / lead));
      const r = 16;
      ctx3.lineWidth = 4;
      ctx3.strokeStyle = "rgba(255,255,255,0.15)";
      ctx3.beginPath();
      ctx3.arc(cx, top - 4, r, 0, Math.PI * 2);
      ctx3.stroke();
      ctx3.strokeStyle = k > 0.8 ? "#ffffff" : style.color;
      ctx3.shadowColor = style.color;
      ctx3.shadowBlur = 10;
      ctx3.beginPath();
      ctx3.arc(cx, top - 4, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
      ctx3.stroke();
      ctx3.shadowBlur = 0;
      ctx3.fillStyle = style.color;
      ctx3.font = "bold 12px Orbitron";
      ctx3.textAlign = "center";
      ctx3.fillText(style.label, cx, top + 28);
    }
    ctx3.restore();
  }
  function drawBossHud(ctx3) {
    const boss = gameState.enemies.find((e) => e.isBoss);
    if (!boss) return;
    const W = 380, H = 12, x = (gameState.width - W) / 2, y = gameState.finisher ? 80 : 38;
    const pct = Math.max(0, boss.hp / boss.maxHp);
    const inFinisher = !!gameState.finisher;
    ctx3.save();
    ctx3.fillStyle = "rgba(0,0,0,0.6)";
    ctx3.fillRect(x - 4, y - 22, W + 8, H + 30);
    ctx3.fillStyle = "#fff";
    ctx3.font = "bold 12px Orbitron";
    ctx3.textAlign = "left";
    ctx3.fillText(boss.name, x, y - 7);
    ctx3.textAlign = "right";
    ctx3.fillStyle = isBossOpen(boss) ? "#22d3ee" : boss.desperation ? "#ff3355" : "#9ca3af";
    ctx3.fillText(isBossOpen(boss) ? "OPEN \u2014 PUNISH" : boss.desperation ? "DESPERATION" : "", x + W, y - 7);
    ctx3.fillStyle = "rgba(255,255,255,0.08)";
    ctx3.fillRect(x, y, W, H);
    const flash = inFinisher ? 0.7 + 0.3 * Math.sin(Date.now() * 0.03) : 1;
    ctx3.globalAlpha = flash;
    ctx3.fillStyle = gameState.bossThemeColor || "#ff0055";
    ctx3.fillRect(x, y, W * pct, H);
    ctx3.globalAlpha = 1;
    CONSTANTS.FINISHER.thresholds.forEach((th, i) => {
      const used = (boss.finisherStage || 0) > i;
      const nx = x + W * th;
      ctx3.fillStyle = used ? "rgba(255,255,255,0.25)" : "#ffffff";
      ctx3.fillRect(nx - 1.5, y - 5, 3, H + 10);
      if (!used) {
        ctx3.fillStyle = "#ffffff";
        ctx3.beginPath();
        ctx3.moveTo(nx, y - 5);
        ctx3.lineTo(nx - 5, y - 11);
        ctx3.lineTo(nx + 5, y - 11);
        ctx3.closePath();
        ctx3.fill();
      }
    });
    ctx3.restore();
  }
  function drawFinisherDim(ctx3) {
    const f = gameState.finisher;
    if (!f) return;
    ctx3.fillStyle = `rgba(0, 0, 0, ${0.55 * f.bars})`;
    ctx3.fillRect(-200, -200, gameState.width + 400, gameState.height + 400);
  }
  var MOVE_NAME = { up: "SLIP UP", down: "SLIP DOWN", jab: "JAB", cross: "CROSS", hook: "HOOK" };
  var KEY_COLOR = { up: "#22d3ee", down: "#22d3ee", jab: "#ffffff", cross: "#ec4899", hook: "#facc15" };
  function promptGlyph(move) {
    const g = glyph(move), dev = inputDevice();
    const key = move === "up" || move === "down" ? move === "up" ? "\u25B2" : "\u25BC" : g.label;
    return { key, hint: MOVE_NAME[move] || move.toUpperCase(), color: dev === "keyboard" ? KEY_COLOR[move] : move === "up" || move === "down" ? "#22d3ee" : g.color };
  }
  function drawFinisherUI(ctx3) {
    const f = gameState.finisher;
    if (!f) return;
    const W = gameState.width, H = gameState.height;
    ctx3.save();
    const barH = 58 * f.bars;
    ctx3.fillStyle = "#000";
    ctx3.fillRect(0, 0, W, barH);
    ctx3.fillRect(0, H - barH, W, barH);
    const vg = ctx3.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(0,0,0,${0.55 * f.bars})`);
    ctx3.fillStyle = vg;
    ctx3.fillRect(0, 0, W, H);
    ctx3.textAlign = "center";
    const title = f.kind === "ko" ? "FINAL BLOW" : f.kind === "break1" ? "STAGGER I" : "STAGGER II";
    ctx3.globalAlpha = f.bars;
    ctx3.fillStyle = f.kind === "ko" ? "#ff0055" : "#ffffff";
    ctx3.font = "900 italic 22px Orbitron";
    ctx3.fillText(title, W / 2, Math.max(24, barH - 18));
    const n = f.seq.length, pipW = 34, gap = 8, total = n * pipW + (n - 1) * gap;
    for (let i = 0; i < n; i++) {
      const px = W / 2 - total / 2 + i * (pipW + gap);
      const done = i < f.idx, cur = i === f.idx && f.phase === "prompts";
      const g = promptGlyph(f.seq[i]);
      ctx3.fillStyle = done ? g.color : cur ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)";
      ctx3.fillRect(px, H - barH + 14, pipW, 22);
      ctx3.fillStyle = done ? "#000" : cur ? "#fff" : "rgba(255,255,255,0.35)";
      ctx3.font = "bold 13px Orbitron";
      ctx3.fillText(g.key, px + pipW / 2, H - barH + 30);
    }
    ctx3.globalAlpha = 1;
    const z = gameState.finisherZoom || 1, bp = f.boss;
    const fx = (gameState.player.x + bp.x) / 2 + 20, fy = gameState.player.y - 70;
    const cx = fx, cy = Math.max(150, fy - 118 * z);
    const pp = promptProgress();
    if (pp) {
      const g = promptGlyph(pp.move);
      const box = 46;
      const nextMove = f.seq[f.idx + 1];
      if (nextMove) {
        const ng = promptGlyph(nextMove);
        ctx3.globalAlpha = 0.45;
        ctx3.fillStyle = "rgba(0,0,0,0.7)";
        ctx3.beginPath();
        ctx3.arc(cx + 104, cy, 24, 0, Math.PI * 2);
        ctx3.fill();
        ctx3.strokeStyle = ng.color;
        ctx3.lineWidth = 2;
        ctx3.stroke();
        ctx3.fillStyle = ng.color;
        ctx3.font = `900 ${ng.key.length > 2 ? 12 : 20}px Orbitron`;
        ctx3.textBaseline = "middle";
        ctx3.fillText(ng.key, cx + 104, cy + 1);
        ctx3.textBaseline = "alphabetic";
        ctx3.globalAlpha = 1;
      }
      const ringR = box + 70 * (1 - Math.min(1, pp.progress));
      const inWindow = pp.t >= -CONSTANTS.FINISHER.windowEarly;
      ctx3.lineWidth = 4;
      ctx3.strokeStyle = inWindow ? "#ffffff" : "rgba(255,255,255,0.45)";
      ctx3.beginPath();
      ctx3.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx3.stroke();
      ctx3.fillStyle = "rgba(0,0,0,0.75)";
      ctx3.beginPath();
      ctx3.arc(cx, cy, box, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.strokeStyle = g.color;
      ctx3.lineWidth = 3;
      ctx3.shadowColor = g.color;
      ctx3.shadowBlur = 18;
      ctx3.beginPath();
      ctx3.arc(cx, cy, box, 0, Math.PI * 2);
      ctx3.stroke();
      ctx3.shadowBlur = 0;
      ctx3.fillStyle = g.color;
      ctx3.font = `900 ${g.key.length > 2 ? 24 : 40}px Orbitron`;
      ctx3.textBaseline = "middle";
      ctx3.fillText(g.key, cx, cy + 2);
      ctx3.textBaseline = "alphabetic";
      ctx3.fillStyle = "#ffffff";
      ctx3.font = "900 16px Orbitron";
      ctx3.fillText(g.hint, cx, cy + box + 30);
    } else if (f.phase === "intro") {
      ctx3.fillStyle = `rgba(255,255,255,${f.bars})`;
      ctx3.font = "bold 13px Orbitron";
      ctx3.fillText("HIT EACH PROMPT ON THE BEAT", cx, cy);
    }
    if (f.phase === "prompts" && f.lockFlash > 0) {
      ctx3.globalAlpha = f.lockFlash / 10;
      ctx3.strokeStyle = "#ffffff";
      ctx3.lineWidth = 3;
      ctx3.beginPath();
      ctx3.arc(cx, cy, 46 + (10 - f.lockFlash) * 3, 0, Math.PI * 2);
      ctx3.stroke();
      ctx3.globalAlpha = 1;
    }
    if (f.judge && f.judgeTimer > 0) {
      const a = Math.min(1, f.judgeTimer / 12);
      const s = reducedMotion() ? 1 : 1 + Math.max(0, f.judgeTimer - 26) * 0.06;
      ctx3.save();
      ctx3.translate(cx, f.phase === "playback" ? Math.max(90, cy - 10) : Math.max(70, cy - 76));
      ctx3.scale(s, s);
      ctx3.globalAlpha = a;
      ctx3.fillStyle = f.judge.color;
      ctx3.font = "900 italic 30px Orbitron";
      ctx3.shadowColor = f.judge.color;
      ctx3.shadowBlur = 14;
      ctx3.fillText(f.judge.text, 0, 0);
      ctx3.restore();
    }
    ctx3.restore();
  }
  function drawVignette(ctx3) {
    const v = gameState.vignette;
    if (!v) return;
    const W = gameState.width, H = gameState.height, t = v.timer, D = v.duration;
    const a = Math.min(1, t / 8);
    const rm = reducedMotion();
    ctx3.save();
    ctx3.globalAlpha = a;
    ctx3.fillStyle = "rgba(0,0,0,0.88)";
    ctx3.fillRect(0, 0, W, H);
    const slashIn = rm ? 1 : Math.min(1, t / 10);
    ctx3.save();
    ctx3.translate(W / 2, H / 2);
    ctx3.rotate(-0.22);
    const sg = ctx3.createLinearGradient(-W, 0, W, 0);
    sg.addColorStop(0, "rgba(0,0,0,0)");
    sg.addColorStop(0.5, v.color);
    sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx3.globalAlpha = a * 0.22;
    ctx3.fillStyle = sg;
    ctx3.fillRect(-W * slashIn, -70, W * 2 * slashIn, 140);
    ctx3.restore();
    const pose = { speed: "jab3", power: "cross", technique: "guard_jab" }[v.upgrade.tree] || (v.rarity === "fusion" || v.rarity === "evolved" ? "hook" : "cross");
    const S = 2.1, bx = 150, by = 440;
    const ent = {
      x: bx / S - 25,
      y: by / S,
      w: 50,
      h: 110,
      lane: 1,
      state: "punching",
      punchType: pose,
      hitFrame: 0,
      didHit: true,
      slipBuff: 0,
      color: gameState.strikerColor || "#00ffff",
      trails: [],
      // colour rule: the upgrade's colour rides the PUNCH TRAIL and sparks,
      // never the Striker's body or gloves.
      trailColor: v.color,
      trailHeat: Math.min(1, t / 10)
    };
    ctx3.save();
    ctx3.beginPath();
    ctx3.rect(0, 0, 380, H);
    ctx3.clip();
    ctx3.scale(S, S);
    drawBoxer(ctx3, ent, true, a);
    ctx3.restore();
    if (ent.glovePositions) {
      ctx3.fillStyle = v.color;
      v.sparks.forEach((sp) => {
        const gp = ent.glovePositions[sp.gx];
        ctx3.globalAlpha = a * sp.life;
        ctx3.fillRect(Math.min(370, gp[0] * S + sp.ox), gp[1] * S + sp.oy, 3, 3);
      });
      ctx3.globalAlpha = a;
    }
    const TX = 410, TW = W - TX - 40;
    const fit = (text, font, size, maxW) => {
      let s = size;
      do {
        ctx3.font = font.replace("#", s);
        s -= 2;
      } while (ctx3.measureText(text).width > maxW && s > 14);
    };
    const slamK = rm ? 1 : Math.min(1, Math.max(0, (t - 4) / 8));
    ctx3.textAlign = "left";
    const picks = v.picks && v.picks.length ? v.picks : [v.upgrade];
    if (picks.length === 1) {
      const u = picks[0];
      ctx3.globalAlpha = a * slamK;
      ctx3.fillStyle = v.color;
      ctx3.font = "bold 14px Orbitron";
      ctx3.fillText(evolutionLabel(u), TX, H * 0.4);
      ctx3.save();
      const sc = rm ? 1 : 1 + (1 - slamK) * 0.6;
      ctx3.translate(TX, H * 0.4 + 52);
      ctx3.scale(sc, sc);
      fit(u.name.toUpperCase(), "900 italic #px Orbitron", 44, TW);
      ctx3.fillStyle = "#ffffff";
      ctx3.shadowColor = v.color;
      ctx3.shadowBlur = 20;
      ctx3.fillText(u.name.toUpperCase(), 0, 0);
      ctx3.restore();
      ctx3.globalAlpha = a * Math.min(1, Math.max(0, (t - 14) / 10));
      ctx3.fillStyle = "rgba(255,255,255,0.85)";
      ctx3.font = "14px Orbitron";
      wrapText(ctx3, u.desc, TX, H * 0.4 + 92, TW, 20, "left");
    } else {
      ctx3.globalAlpha = a * slamK;
      ctx3.fillStyle = "#ffffff";
      ctx3.font = "900 italic 34px Orbitron";
      ctx3.shadowColor = v.color;
      ctx3.shadowBlur = 16;
      ctx3.fillText(`${picks.length} EVOLUTIONS`, TX, 118);
      ctx3.shadowBlur = 0;
      const rowH = Math.min(110, (H - 190) / picks.length);
      picks.forEach((u, i) => {
        const y = 150 + i * rowH, col = upgradeColor(u);
        const k = rm ? 1 : Math.min(1, Math.max(0, (t - 8 - i * 6) / 10));
        ctx3.globalAlpha = a * k;
        ctx3.fillStyle = col;
        ctx3.fillRect(TX, y, 4, rowH - 14);
        ctx3.font = "bold 11px Orbitron";
        ctx3.fillText(evolutionLabel(u), TX + 16, y + 14);
        fit(u.name.toUpperCase(), "900 italic #px Orbitron", 24, TW - 16);
        ctx3.fillStyle = "#ffffff";
        ctx3.fillText(u.name.toUpperCase(), TX + 16, y + 42);
        ctx3.fillStyle = "rgba(255,255,255,0.75)";
        ctx3.font = "12px Orbitron";
        wrapText(ctx3, u.desc, TX + 16, y + 62, TW - 16, 16, "left", Math.max(1, Math.floor((rowH - 70) / 16) + 1));
      });
    }
    ctx3.globalAlpha = a;
    if (!rm && t >= 10 && t <= 13) {
      ctx3.globalAlpha = 0.22 * (14 - t) / 4;
      ctx3.fillStyle = "#fff";
      ctx3.fillRect(0, 0, W, H);
      ctx3.globalAlpha = a;
    }
    if (v.holding) {
      const pulse = 0.55 + 0.45 * Math.sin(Date.now() * 6e-3);
      ctx3.globalAlpha = pulse;
      ctx3.fillStyle = "#ffffff";
      ctx3.font = "900 13px Orbitron";
      ctx3.textAlign = "center";
      ctx3.fillText(`PRESS ${glyphText("confirm")} TO CONTINUE`, W / 2, H - 40);
    }
    ctx3.restore();
  }
  function wrapText(ctx3, text, x, y, maxW, lh, align = "center", maxLines = 99) {
    ctx3.textAlign = align;
    const words = String(text || "").split(" ");
    let line = "", yy = y, n = 0;
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx3.measureText(test).width > maxW && line) {
        if (++n >= maxLines) {
          ctx3.fillText(line + "\u2026", x, yy);
          return;
        }
        ctx3.fillText(line, x, yy);
        line = w;
        yy += lh;
      } else line = test;
    }
    if (line) ctx3.fillText(line, x, yy);
  }
  function drawKoFx(ctx3) {
    if (!gameState.koFx || !gameState.koFx.length) return;
    ctx3.save();
    for (const fx of gameState.koFx) {
      ctx3.fillStyle = fx.color;
      ctx3.shadowColor = fx.color;
      ctx3.shadowBlur = 10;
      if (!fx.orb) {
        const a = fx.t < 14 ? 1 : Math.max(0.3, 1 - (fx.t - 14) / 16);
        ctx3.globalAlpha = a;
        fx.shards.forEach((s) => {
          ctx3.save();
          ctx3.translate(s.x, s.y);
          ctx3.rotate(s.rot);
          ctx3.beginPath();
          ctx3.moveTo(0, -s.size);
          ctx3.lineTo(s.size * 0.5, s.size * 0.6);
          ctx3.lineTo(-s.size * 0.5, s.size * 0.6);
          ctx3.closePath();
          ctx3.fill();
          ctx3.restore();
        });
      } else {
        const o = fx.orb, r = fx.big ? 13 : 8;
        ctx3.globalAlpha = 0.35;
        ctx3.beginPath();
        ctx3.arc(o.x - o.vx * 2, o.y - o.vy * 2, r * 0.8, 0, Math.PI * 2);
        ctx3.fill();
        ctx3.globalAlpha = 1;
        ctx3.beginPath();
        ctx3.arc(o.x, o.y, r, 0, Math.PI * 2);
        ctx3.fill();
        ctx3.fillStyle = "#ffffff";
        ctx3.beginPath();
        ctx3.arc(o.x, o.y, r * 0.45, 0, Math.PI * 2);
        ctx3.fill();
      }
    }
    ctx3.restore();
  }
  function drawLiveLanes(ctx3) {
    if (!gameState.liveLanes || !gameState.liveLanes.length) return;
    ctx3.save();
    for (const z of gameState.liveLanes) {
      const y = gameState.height * CONSTANTS.LANE_Y[z.lane];
      if (z.phase === "warn") {
        const a = 0.35 + 0.35 * Math.sin(Date.now() * 0.04);
        ctx3.strokeStyle = `rgba(255, 243, 107, ${a.toFixed(3)})`;
        ctx3.lineWidth = 3;
        ctx3.setLineDash([10, 10]);
        ctx3.lineDashOffset = -Date.now() * 0.1 % 20;
        ctx3.beginPath();
        ctx3.moveTo(0, y);
        ctx3.lineTo(gameState.width, y);
        ctx3.stroke();
        ctx3.setLineDash([]);
      } else {
        ctx3.shadowColor = "#fff36b";
        ctx3.shadowBlur = 20;
        ctx3.strokeStyle = "rgba(255, 243, 107, 0.35)";
        ctx3.lineWidth = 22;
        ctx3.beginPath();
        ctx3.moveTo(0, y);
        ctx3.lineTo(gameState.width, y);
        ctx3.stroke();
        ctx3.strokeStyle = "#fff36b";
        ctx3.lineWidth = 3;
        ctx3.beginPath();
        ctx3.moveTo(0, y);
        ctx3.lineTo(gameState.width, y);
        ctx3.stroke();
        ctx3.shadowBlur = 0;
        ctx3.strokeStyle = "#ffffff";
        ctx3.lineWidth = 1.5;
        for (let k = 0; k < 4; k++) {
          let x0 = Math.random() * gameState.width, y0 = y - 10 + Math.random() * 20;
          ctx3.beginPath();
          ctx3.moveTo(x0, y0);
          for (let s = 0; s < 5; s++) {
            x0 += 10 + Math.random() * 14;
            y0 += (Math.random() - 0.5) * 18;
            ctx3.lineTo(x0, y0);
          }
          ctx3.stroke();
        }
      }
    }
    ctx3.restore();
  }
  function drawAfterimages(ctx3) {
    const all = [...gameState.afterimages || [], ...(gameState.enemyEchoes || []).map((e) => ({ ...e, facing: -1, enemy: true }))];
    if (!all.length) return;
    for (const ai of all) {
      const a = ai.fired ? Math.max(0, ai.fade / 22) * 0.7 : 0.55;
      const ghost = {
        x: ai.x + (ai.fired ? 10 * (ai.facing || 1) : 0),
        y: ai.y,
        lane: ai.lane,
        w: 50,
        h: 110,
        state: ai.fired ? "punching" : "idle",
        punchType: "cross",
        hitFrame: 0,
        didHit: true,
        slipBuff: 0,
        overrideColor: ai.color,
        facing: ai.facing || 1,
        shape: ai.enemy ? "negative" : void 0
      };
      ctx3.save();
      ctx3.shadowColor = ai.color;
      ctx3.shadowBlur = 16;
      drawBoxer(ctx3, ghost, true, a, true);
      ctx3.restore();
    }
  }
  function drawKnockdownUI(ctx3) {
    const k = gameState.knockdown;
    if (!k) return;
    const W = gameState.width, H = gameState.height, p = gameState.player;
    ctx3.save();
    const vg = ctx3.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(120,0,20,${0.55 * k.fall})`);
    ctx3.fillStyle = vg;
    ctx3.fillRect(0, 0, W, H);
    const rx = p.x + 130, ry = p.y;
    ctx3.globalAlpha = Math.min(1, k.frame / 12);
    drawBoxer(ctx3, { x: rx, y: ry, lane: p.lane, w: 50, h: 110, state: "idle", stun: 0, attackCooldown: 99, color: "#e5e7eb", type: "grunt", trails: [] }, false, 0.9);
    ctx3.globalAlpha = 1;
    const count = Math.max(0, Math.min(10, k.count));
    if (count > 0 && k.phase !== "up") {
      const pulse = 1 + Math.max(0, 1 - k.frame % CONSTANTS.KNOCKDOWN.framesPerCount / 10) * 0.35;
      ctx3.save();
      ctx3.translate(rx + 25, Math.max(150, ry - 190));
      ctx3.scale(pulse, pulse);
      ctx3.fillStyle = count >= 8 ? "#ff3355" : "#ffffff";
      ctx3.font = "900 italic 64px Orbitron";
      ctx3.textAlign = "center";
      ctx3.shadowColor = ctx3.fillStyle;
      ctx3.shadowBlur = 20;
      ctx3.fillText(String(count), 0, 0);
      ctx3.restore();
    }
    ctx3.textAlign = "center";
    ctx3.fillStyle = "#ffffff";
    ctx3.font = "900 italic 26px Orbitron";
    ctx3.fillText(k.phase === "up" ? `BACK ON YOUR FEET \xB7 ${Math.round((k.hpFrac || 0) * 100)}% HP` : "GET UP!", W / 2, 60);
    ctx3.font = "bold 12px Orbitron";
    ctx3.fillStyle = "rgba(255,255,255,0.7)";
    ctx3.fillText(k.phase === "up" ? "" : "HIT EACH PROMPT ON THE BEAT \xB7 CLEANER = MORE HEALTH", W / 2, 82);
    const n = k.seq.length;
    for (let i = 0; i < n; i++) {
      ctx3.fillStyle = i < k.idx ? "#22d3ee" : "rgba(255,255,255,0.2)";
      ctx3.fillRect(W / 2 - n * 18 + i * 36 + 4, 96, 28, 6);
    }
    const pp = knockdownPrompt();
    if (pp) {
      const cx = W * 0.72, cy = H * 0.46, box = 38;
      const ringR = box + 70 * (1 - Math.min(1, pp.progress));
      ctx3.lineWidth = 4;
      ctx3.strokeStyle = pp.t >= -CONSTANTS.KNOCKDOWN.windowEarly ? "#ffffff" : "rgba(255,255,255,0.45)";
      ctx3.beginPath();
      ctx3.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx3.stroke();
      ctx3.fillStyle = "rgba(0,0,0,0.75)";
      ctx3.beginPath();
      ctx3.arc(cx, cy, box, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.strokeStyle = "#22d3ee";
      ctx3.lineWidth = 3;
      ctx3.shadowColor = "#22d3ee";
      ctx3.shadowBlur = 18;
      ctx3.beginPath();
      ctx3.arc(cx, cy, box, 0, Math.PI * 2);
      ctx3.stroke();
      ctx3.shadowBlur = 0;
      ctx3.fillStyle = "#22d3ee";
      ctx3.font = "900 34px Orbitron";
      ctx3.fillText(pp.move === "up" ? "\u25B2" : "\u25BC", cx, cy + 12);
    }
    if (k.judge && k.judgeTimer > 0) {
      ctx3.globalAlpha = Math.min(1, k.judgeTimer / 10);
      ctx3.fillStyle = k.judge.color;
      ctx3.font = "900 italic 26px Orbitron";
      ctx3.fillText(k.judge.text, W * 0.72, H * 0.46 - 120);
    }
    ctx3.restore();
  }
  var POSTER_FRAMES = 180;
  function drawBossPoster(ctx3) {
    const P = gameState.bossPoster;
    if (!P || gameState.bossIntroTimer <= 0) return;
    const W = gameState.width, H = gameState.height;
    const t = POSTER_FRAMES - gameState.bossIntroTimer;
    const inK = Math.min(1, t / 16), outK = Math.min(1, gameState.bossIntroTimer / 18);
    const a = Math.min(inK, outK);
    const rm = reducedMotion();
    ctx3.save();
    ctx3.globalAlpha = a;
    ctx3.fillStyle = "rgba(0,0,0,0.82)";
    ctx3.fillRect(0, 0, W, H);
    const pw = 620, ph = 420, px = (W - pw) / 2, py = (H - ph) / 2 + (rm ? 0 : (1 - inK) * 40);
    const grad = ctx3.createLinearGradient(0, py, 0, py + ph);
    grad.addColorStop(0, "#0b0b12");
    grad.addColorStop(1, "#050507");
    ctx3.fillStyle = grad;
    ctx3.fillRect(px, py, pw, ph);
    ctx3.strokeStyle = P.color;
    ctx3.lineWidth = 3;
    ctx3.shadowColor = P.color;
    ctx3.shadowBlur = 24;
    ctx3.strokeRect(px, py, pw, ph);
    ctx3.shadowBlur = 0;
    ctx3.strokeStyle = "rgba(255,255,255,0.15)";
    ctx3.lineWidth = 1;
    ctx3.strokeRect(px + 8, py + 8, pw - 16, ph - 16);
    ctx3.textAlign = "center";
    ctx3.fillStyle = P.color;
    ctx3.font = "900 14px Orbitron";
    ctx3.fillText(`TITLE FIGHT \xB7 ARC ${P.arc} \xB7 ROUND ${P.round}`, W / 2, py + 36);
    ctx3.fillStyle = "rgba(255,255,255,0.6)";
    ctx3.font = "bold 11px Orbitron";
    ctx3.fillText(String(P.venue).toUpperCase(), W / 2, py + 54);
    const fy = py + 352;
    ctx3.save();
    ctx3.translate(px + 150, fy);
    ctx3.scale(1.7, 1.7);
    drawBoxer(ctx3, { x: -25, y: 0, lane: 1, w: 50, h: 110, state: "idle", punchType: null, hitFrame: 0, slipBuff: 0, trails: [] }, true, a);
    ctx3.restore();
    ctx3.save();
    ctx3.translate(px + pw - 150, fy);
    ctx3.scale(1.7, 1.7);
    drawBoxer(ctx3, { x: -25, y: 0, lane: 1, w: 50, h: 110, isBoss: false, controller: P.controller, type: "grunt", color: P.color, stun: 0, attackCooldown: 99, trails: [] }, false, a);
    ctx3.restore();
    const slam = rm ? 1 : Math.min(1, Math.max(0, (t - 10) / 10));
    ctx3.globalAlpha = a * slam;
    ctx3.fillStyle = gameState.strikerColor || "#00ffff";
    ctx3.font = "900 italic 26px Orbitron";
    ctx3.fillText("THE STRIKER", px + 150, py + 110);
    ctx3.fillStyle = "#ffffff";
    ctx3.font = "900 italic 30px Orbitron";
    ctx3.fillText("VS", W / 2, py + 200);
    ctx3.fillStyle = P.color;
    ctx3.font = "900 italic 26px Orbitron";
    ctx3.shadowColor = P.color;
    ctx3.shadowBlur = 14;
    ctx3.fillText(P.name, px + pw - 150, py + 110);
    ctx3.shadowBlur = 0;
    ctx3.fillStyle = "rgba(255,255,255,0.75)";
    ctx3.font = "bold 12px Orbitron";
    ctx3.fillText(P.tagline, px + pw - 150, py + 130);
    if (!gameState.posterConfirmed && gameState.bossIntroTimer <= CONSTANTS.POSTER_HOLD_FRAME) {
      const pulse = 0.55 + 0.45 * Math.sin(Date.now() * 6e-3);
      ctx3.globalAlpha = a * pulse;
      ctx3.fillStyle = "#ffffff";
      ctx3.font = "900 16px Orbitron";
      ctx3.shadowBlur = 0;
      ctx3.fillText(`PRESS ${glyphText("confirm")} TO FIGHT`, W / 2, py + ph - 30);
    }
    if (gameState.bossIntroTimer < 40) {
      ctx3.globalAlpha = Math.min(1, (40 - gameState.bossIntroTimer) / 8) * outK;
      ctx3.fillStyle = "#ffffff";
      ctx3.font = "900 italic 54px Orbitron";
      ctx3.shadowColor = P.color;
      ctx3.shadowBlur = 20;
      ctx3.fillText("FIGHT!", W / 2, py + ph - 26);
    }
    ctx3.restore();
  }
  function drawBillingCard(ctx3, card, age, alpha) {
    const W = gameState.width, H = gameState.height, rm = reducedMotion();
    const inK = Math.min(1, age / 12);
    ctx3.save();
    ctx3.globalAlpha = alpha * inK;
    const bw = 520, bh = 150, bx = (W - bw) / 2, by = H / 2 - bh / 2 - 20 + (rm ? 0 : (1 - inK) * 24);
    ctx3.fillStyle = "rgba(4,4,8,0.88)";
    ctx3.fillRect(bx, by, bw, bh);
    ctx3.strokeStyle = card.color || "#22d3ee";
    ctx3.lineWidth = 2;
    ctx3.shadowColor = card.color || "#22d3ee";
    ctx3.shadowBlur = 18;
    ctx3.strokeRect(bx, by, bw, bh);
    ctx3.shadowBlur = 0;
    ctx3.fillStyle = card.color || "#22d3ee";
    ctx3.fillRect(bx, by, 6, bh);
    ctx3.fillRect(bx + bw - 6, by, 6, bh);
    ctx3.textAlign = "center";
    ctx3.fillStyle = "rgba(255,255,255,0.55)";
    ctx3.font = "bold 11px Orbitron";
    ctx3.fillText(card.kicker || "", W / 2, by + 26);
    ctx3.fillStyle = "#ffffff";
    ctx3.font = "900 italic 48px Orbitron";
    ctx3.fillText(`ROUND ${card.round}`, W / 2, by + 78);
    ctx3.fillStyle = card.color || "#22d3ee";
    ctx3.font = "900 18px Orbitron";
    ctx3.fillText(String(card.venue).toUpperCase(), W / 2, by + 108);
    if (card.tagline) {
      ctx3.fillStyle = "rgba(255,255,255,0.7)";
      ctx3.font = "bold 12px Orbitron";
      ctx3.fillText(card.tagline, W / 2, by + 132);
    }
    ctx3.restore();
  }

  // src/systems/sequences.js
  var Sequences = {
    stage1Intro: [
      { type: "text", title: "STAGE 1: SHATTERED CATHEDRAL", duration: 150 },
      { type: "resume" }
    ]
  };
  var HOME_X = 180;
  var FADE_FRAMES = 14;
  function parseColor(c) {
    if (!c || c === "transparent") return [0, 0, 0, 0];
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return [0, 0, 0, 0];
    const p = m[1].split(",").map((v) => parseFloat(v));
    return [p[0] || 0, p[1] || 0, p[2] || 0, p[3] === void 0 ? 1 : p[3]];
  }
  var colorStr = (c) => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${c[3].toFixed(3)})`;
  var SequenceManager = {
    active: false,
    currentSequence: null,
    stepIndex: 0,
    timer: 0,
    stepDuration: 0,
    waiting: false,
    overlayColor: "transparent",
    overlayFrom: [0, 0, 0, 0],
    overlayTo: [0, 0, 0, 0],
    overlayNow: [0, 0, 0, 0],
    fadeT: 1,
    text: { title: "", subtitle: "", alpha: 0, age: 0 },
    walkFromX: HOME_X,
    play: function(seqId) {
      if (!Sequences[seqId]) return;
      this.playDynamic(Sequences[seqId].slice());
    },
    playDynamic: function(stepsArray) {
      this.active = true;
      this.waiting = false;
      this.currentSequence = stepsArray;
      this.stepIndex = 0;
      this.startStep();
    },
    // Insert steps right after the current one (used by the wager to add its
    // "accepted" card once the player has chosen).
    injectNext: function(steps) {
      if (!this.currentSequence) return;
      this.currentSequence.splice(this.stepIndex + 1, 0, ...steps);
    },
    // Called by the wager UI once the player has chosen.
    resumeFromWait: function() {
      if (!this.waiting) return;
      this.waiting = false;
      this.stepIndex++;
      this.startStep();
    },
    startStep: function() {
      for (let guard = 0; guard < 64; guard++) {
        if (!this.currentSequence || this.stepIndex >= this.currentSequence.length) {
          this.active = false;
          return;
        }
        const step = this.currentSequence[this.stepIndex];
        this.timer = step.duration || 0;
        this.stepDuration = this.timer;
        if (step.type === "call") {
          try {
            step.fn && step.fn();
          } catch (e) {
            console.warn(e);
          }
          this.stepIndex++;
          continue;
        }
        if (step.type === "wager") {
          if (gameState.wagerOffer && typeof window !== "undefined" && window.engineShowWager) {
            this.waiting = true;
            window.engineShowWager();
            return;
          }
          this.stepIndex++;
          continue;
        }
        if (step.type === "tint") {
          this.overlayFrom = this.overlayNow.slice();
          this.overlayTo = parseColor(step.color);
          this.fadeT = 0;
          this.overlayColor = step.color;
        }
        if (step.type === "text") {
          this.text = { title: step.title, subtitle: step.subtitle || "", alpha: 1, age: 0 };
        }
        if (step.type === "billing") {
          this.text = { title: "", subtitle: "", alpha: 1, age: 0 };
          this.billing = { ...step.card };
          playSound("bell");
        }
        if (step.type === "walkout" && gameState.player) {
          this.walkFromX = gameState.player.x;
          gameState.player.state = "idle";
          gameState.player.walking = true;
        }
        if (step.type === "walkin" && gameState.player) {
          gameState.player.x = -80;
          gameState.player.walking = true;
          gameState.player.lane = 1;
          gameState.player.y = gameState.height * CONSTANTS.LANE_Y[1];
        }
        if (step.type === "sweep") {
          gameState.lightSweep = 0;
          gameState.paletteT = 0;
        }
        if (step.type === "resume") {
          this.active = false;
          this.overlayColor = "transparent";
          this.overlayNow = [0, 0, 0, 0];
          this.overlayTo = [0, 0, 0, 0];
          this.text.alpha = 0;
          this.billing = null;
          gameState.lightSweep = -1;
          gameState.paletteT = 1;
          if (gameState.player) {
            gameState.player.walking = false;
            if (gameState.player.x < 0 || gameState.player.x > gameState.width) gameState.player.x = HOME_X;
          }
          return;
        }
        return;
      }
    },
    update: function() {
      if (!this.active || this.waiting) return;
      const step = this.currentSequence && this.currentSequence[this.stepIndex];
      if (this.fadeT < 1) {
        this.fadeT = Math.min(1, this.fadeT + 1 / (reducedMotion() ? 6 : FADE_FRAMES));
        for (let i = 0; i < 4; i++) this.overlayNow[i] = this.overlayFrom[i] + (this.overlayTo[i] - this.overlayFrom[i]) * this.fadeT;
      }
      if (step && this.stepDuration > 0) {
        const k = 1 - this.timer / this.stepDuration;
        const ease2 = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, k));
        if (step.type === "walkout" && gameState.player) {
          gameState.player.x = this.walkFromX + (gameState.width + 120 - this.walkFromX) * ease2;
          gameState.player.y += (gameState.height * CONSTANTS.LANE_Y[1] - gameState.player.y) * 0.1;
        } else if (step.type === "walkin" && gameState.player) {
          gameState.player.x = -80 + (HOME_X + 80) * ease2;
        } else if (step.type === "sweep") {
          gameState.lightSweep = k;
          gameState.paletteT = ease2;
        }
      }
      if (step && (step.type === "text" || step.type === "billing")) this.text.age++;
      if (this.timer > 0) {
        this.timer--;
        if (this.timer < 30 && this.text.alpha > 0 && step && (step.type === "text" || step.type === "billing")) {
          this.text.alpha = Math.max(0, this.text.alpha - 0.05);
        }
        if (this.timer <= 0) {
          if (step && step.type === "sweep") {
            gameState.lightSweep = -1;
            gameState.paletteT = 1;
          }
          if (step && step.type === "billing") this.billing = null;
          if (step && (step.type === "walkout" || step.type === "walkin") && gameState.player) gameState.player.walking = false;
          this.stepIndex++;
          this.startStep();
        }
      }
    },
    draw: function(ctx3, w, h) {
      if (!this.active) return;
      if (this.overlayNow[3] > 2e-3) {
        ctx3.fillStyle = colorStr(this.overlayNow);
        ctx3.fillRect(0, 0, w, h);
      }
      if (this.billing && this.text.alpha > 0) drawBillingCard(ctx3, this.billing, this.text.age, this.text.alpha);
      if (this.text.alpha > 0 && this.text.title) {
        const a = this.text.alpha;
        const inT = Math.min(1, this.text.age / 12);
        const slide = reducedMotion() ? 0 : (1 - inT) * 60;
        ctx3.save();
        const bandH = this.text.subtitle ? 110 : 80;
        const bg = ctx3.createLinearGradient(0, 0, w, 0);
        bg.addColorStop(0, "rgba(0,0,0,0)");
        bg.addColorStop(0.2, `rgba(0,0,0,${0.72 * a * inT})`);
        bg.addColorStop(0.8, `rgba(0,0,0,${0.72 * a * inT})`);
        bg.addColorStop(1, "rgba(0,0,0,0)");
        ctx3.fillStyle = bg;
        ctx3.fillRect(0, h / 2 - bandH / 2 - 14, w, bandH);
        ctx3.fillStyle = `rgba(0, 255, 255, ${0.6 * a * inT})`;
        ctx3.fillRect(w * 0.2, h / 2 - bandH / 2 - 14, w * 0.6 * inT, 2);
        ctx3.fillRect(w * 0.8 - w * 0.6 * inT, h / 2 + bandH / 2 - 14, w * 0.6 * inT, 2);
        ctx3.fillStyle = `rgba(255, 255, 255, ${a * inT})`;
        ctx3.textAlign = "center";
        ctx3.font = "900 italic 40px Orbitron";
        ctx3.fillText(this.text.title, w / 2 + slide, h / 2 - 10);
        if (this.text.subtitle) {
          ctx3.fillStyle = `rgba(0, 255, 255, ${a * inT})`;
          ctx3.font = "bold 20px Orbitron";
          ctx3.fillText(this.text.subtitle, w / 2 - slide, h / 2 + 30);
        }
        ctx3.restore();
      }
    }
  };

  // src/data/upgrades.js
  var UPGRADE_POOL = {
    // v17: each tree is a LINEAR 5-rank ladder (drafted one rank at a time, capped
    // by arc — see CONSTANTS.RANK_CAP_BY_ARC). Ranks 1/2/4 are stat ranks with
    // their own names; rank 3 changes a VERB; rank 5 is the tree's Apex.
    // `orbs` is kept as the key the draft/HUD code reads; it now holds all ranks.
    orbs: [
      // ---- SPEED (cyan) ----
      { id: "spd_r1", kind: "rank", tree: "speed", rank: 1, memoryPolicy: "none", name: "Quick Hands", desc: "Faster jabs, hooks and recoveries.", weight: 10, effects: [{ op: "incOrb", tree: "speed", amount: 1 }, { op: "mulStat", stat: "speedMult", amount: 0.25 }] },
      { id: "spd_r2", kind: "rank", tree: "speed", rank: 2, memoryPolicy: "none", name: "Rhythm Keeper", desc: "Faster still \u2014 and a missed Jab no longer snaps your Combo.", weight: 10, effects: [{ op: "incOrb", tree: "speed", amount: 1 }, { op: "mulStat", stat: "speedMult", amount: 0.2 }] },
      { id: "spd_r3", kind: "rank", tree: "speed", rank: 3, verb: true, memoryPolicy: "none", name: "Pivot Slip", desc: "Every slip carries you forward into punching range \u2014 and your first punch out of it lands instantly.", weight: 12, effects: [{ op: "incOrb", tree: "speed", amount: 1 }, { op: "setFlag", key: "pivotSlip", value: true }] },
      { id: "spd_r4", kind: "rank", tree: "speed", rank: 4, memoryPolicy: "none", name: "Hair Trigger", desc: "Faster again \u2014 and a landed Jab or Hook can be cancelled straight into a slip.", weight: 10, effects: [{ op: "incOrb", tree: "speed", amount: 1 }, { op: "mulStat", stat: "speedMult", amount: 0.2 }] },
      { id: "apex_speed_blur_step", kind: "rank", draftRole: "apex", tree: "speed", rank: 5, memoryPolicy: "none", name: "Blur Step", desc: "Ghost Step gains a second charge \u2014 dash twice in a row before it has to refill.", weight: 8, effects: [{ op: "incOrb", tree: "speed", amount: 1 }, { op: "grantUpgradeId", id: "apex_speed_blur_step" }, { op: "setFlag", key: "blurStep", value: true }] },
      // ---- POWER (magenta) ----
      { id: "pwr_r1", kind: "rank", tree: "power", rank: 1, memoryPolicy: "none", name: "Heavy Shoulders", desc: "Every blow carries more knockback authority.", weight: 10, effects: [{ op: "incOrb", tree: "power", amount: 1 }, { op: "mulStat", stat: "powerMult", amount: 0.35 }] },
      { id: "pwr_r2", kind: "rank", tree: "power", rank: 2, memoryPolicy: "none", name: "Long Reach", desc: "Heavier still \u2014 and your Cross reaches 25% further.", weight: 10, effects: [{ op: "incOrb", tree: "power", amount: 1 }, { op: "mulStat", stat: "powerMult", amount: 0.3 }] },
      { id: "pwr_r3", kind: "rank", tree: "power", rank: 3, verb: true, memoryPolicy: "none", name: "Loaded Cross", desc: "Hold Cross to load it, release to throw. A loaded Cross breaks any guard and blasts enemies across the ring. A quick tap is still a normal Cross.", weight: 12, effects: [{ op: "incOrb", tree: "power", amount: 1 }, { op: "setFlag", key: "loadedCross", value: true }] },
      { id: "pwr_r4", kind: "rank", tree: "power", rank: 4, memoryPolicy: "none", name: "Iron Frame", desc: "Heavier again \u2014 knocked-back enemies bowl through everyone behind them.", weight: 10, effects: [{ op: "incOrb", tree: "power", amount: 1 }, { op: "mulStat", stat: "powerMult", amount: 0.3 }] },
      { id: "apex_power_executioner", kind: "rank", draftRole: "apex", tree: "power", rank: 5, memoryPolicy: "none", name: "Executioner's Cross", desc: "a Cross against an enemy below 25% health is a guaranteed finish.", weight: 8, effects: [{ op: "incOrb", tree: "power", amount: 1 }, { op: "grantUpgradeId", id: "apex_power_executioner" }, { op: "setFlag", key: "executionerCross", value: true }] },
      // ---- TECHNIQUE (yellow) ----
      { id: "tec_r1", kind: "rank", tree: "technique", rank: 1, memoryPolicy: "none", name: "Sharp Eyes", desc: "More Instinct from clean reads and Perfect Slips.", weight: 10, effects: [{ op: "incOrb", tree: "technique", amount: 1 }, { op: "mulStat", stat: "techMult", amount: 0.3 }] },
      { id: "tec_r2", kind: "rank", tree: "technique", rank: 2, memoryPolicy: "none", name: "Double Tap", desc: "Sharper still \u2014 a Perfect Slip charges TWO Counter hits.", weight: 10, effects: [{ op: "incOrb", tree: "technique", amount: 1 }, { op: "mulStat", stat: "techMult", amount: 0.25 }] },
      { id: "tec_r3", kind: "rank", tree: "technique", rank: 3, verb: true, memoryPolicy: "none", name: "Afterimage Slip", desc: "A Perfect Slip leaves a neon afterimage in the lane you left \u2014 a beat later it throws an echo punch at whoever swung.", weight: 12, effects: [{ op: "incOrb", tree: "technique", amount: 1 }, { op: "setFlag", key: "afterimageSlip", value: true }] },
      { id: "tec_r4", kind: "rank", tree: "technique", rank: 4, memoryPolicy: "none", name: "True Read", desc: "Sharper again \u2014 a Perfect Slip on a boss EXPOSES it for a True Read.", weight: 10, effects: [{ op: "incOrb", tree: "technique", amount: 1 }, { op: "mulStat", stat: "techMult", amount: 0.25 }] },
      { id: "apex_technique_flow_state", kind: "rank", draftRole: "apex", tree: "technique", rank: 5, memoryPolicy: "none", name: "Flow State", desc: "a sustained streak of clean hits and Perfect Slips ramps Instinct and EXP gain. Getting hit resets it.", weight: 8, effects: [{ op: "incOrb", tree: "technique", amount: 1 }, { op: "grantUpgradeId", id: "apex_technique_flow_state" }, { op: "setFlag", key: "flowState", value: true }] }
    ],
    masteries: [
      { id: "mast_weavers_step", kind: "mastery", draftRole: "evolution", tree: "speed", tier: 2, repeatable: false, memoryPolicy: "hard", name: "Weaver's Step", desc: "Ghost Step cooldown reduced by 20%.", weight: 8, reqs: { orbTreeAtLeast: { speed: 2 }, notOwned: ["mast_weavers_step"] }, effects: [{ op: "grantUpgradeId", id: "mast_weavers_step" }, { op: "mulMod", key: "ghostStepCooldownMult", amount: 0.8 }] },
      { id: "mast_loose_shoulders", kind: "mastery", draftRole: "evolution", tree: "speed", tier: 2, repeatable: false, memoryPolicy: "hard", name: "Loose Shoulders", desc: "Hook and Check Hook recover faster.", weight: 8, reqs: { orbTreeAtLeast: { speed: 2 }, notOwned: ["mast_loose_shoulders"] }, effects: [{ op: "grantUpgradeId", id: "mast_loose_shoulders" }, { op: "mulMod", key: "hookRecoveryMult", amount: 0.82 }] },
      { id: "mast_relentless_rhythm", kind: "mastery", draftRole: "evolution", tree: "speed", tier: 2, repeatable: false, memoryPolicy: "hard", name: "Relentless Rhythm", desc: "Missing Jab 1 or Jab 2 decays Combo instead of snapping it completely.", weight: 8, reqs: { orbTreeAtLeast: { speed: 2 }, notOwned: ["mast_relentless_rhythm"] }, effects: [{ op: "grantUpgradeId", id: "mast_relentless_rhythm" }, { op: "setFlag", key: "relentlessRhythm", value: true }] },
      { id: "mast_heavy_hands", kind: "mastery", draftRole: "evolution", tree: "power", tier: 2, repeatable: false, memoryPolicy: "hard", name: "Heavy Hands", desc: "Cross applies bonus stun and stronger pressure against armor states.", weight: 8, reqs: { orbTreeAtLeast: { power: 2 }, notOwned: ["mast_heavy_hands"] }, effects: [{ op: "grantUpgradeId", id: "mast_heavy_hands" }, { op: "addMod", key: "crossArmorStunBonus", amount: 12 }] },
      { id: "mast_ring_cutter", kind: "mastery", draftRole: "evolution", tree: "power", tier: 2, repeatable: false, memoryPolicy: "hard", name: "Ring Cutter", desc: "Hook gains a stronger minimum knockback floor at close and mid spacing.", weight: 8, reqs: { orbTreeAtLeast: { power: 2 }, notOwned: ["mast_ring_cutter"] }, effects: [{ op: "grantUpgradeId", id: "mast_ring_cutter" }, { op: "addMod", key: "hookKnockbackFloor", amount: 10 }] },
      { id: "mast_body_shot_discipline", kind: "mastery", draftRole: "evolution", tree: "power", tier: 2, repeatable: false, memoryPolicy: "hard", name: "Body Shot Discipline", desc: "Cross and Hook on Shields and Bruisers grant extra Instinct and EXP.", weight: 8, reqs: { orbTreeAtLeast: { power: 2 }, notOwned: ["mast_body_shot_discipline"] }, effects: [{ op: "grantUpgradeId", id: "mast_body_shot_discipline" }, { op: "addMod", key: "hardTargetInstinctFlat", amount: 4 }, { op: "addMod", key: "hardTargetExpFlat", amount: 1 }] },
      { id: "mast_deep_focus", kind: "mastery", draftRole: "evolution", tree: "technique", tier: 2, repeatable: false, memoryPolicy: "hard", name: "Deep Focus", desc: "Perfect Slip window gains +2 frames.", weight: 8, reqs: { orbTreeAtLeast: { technique: 2 }, notOwned: ["mast_deep_focus"] }, effects: [{ op: "grantUpgradeId", id: "mast_deep_focus" }, { op: "addMod", key: "perfectSlipWindowBonus", amount: 2 }] },
      { id: "mast_cold_read", kind: "mastery", draftRole: "evolution", tree: "technique", tier: 2, repeatable: false, memoryPolicy: "hard", name: "Cold Read", desc: "Boss expose / True Read windows last longer.", weight: 8, reqs: { orbTreeAtLeast: { technique: 2 }, notOwned: ["mast_cold_read"] }, effects: [{ op: "grantUpgradeId", id: "mast_cold_read" }, { op: "addMod", key: "bossExposeBonusFrames", amount: 30 }] },
      { id: "mast_vantage_point", kind: "mastery", draftRole: "evolution", tree: "technique", tier: 2, repeatable: false, memoryPolicy: "hard", name: "Vantage Point", desc: "Perfect Slip restores a small amount of health.", weight: 8, reqs: { orbTreeAtLeast: { technique: 2 }, notOwned: ["mast_vantage_point"] }, effects: [{ op: "grantUpgradeId", id: "mast_vantage_point" }, { op: "addMod", key: "perfectSlipHeal", amount: 3 }] },
      { id: "mast_guard_read", kind: "mastery", draftRole: "evolution", tree: "technique", tier: 2, repeatable: false, memoryPolicy: "hard", name: "Guard Read", desc: "Releasing Guard the instant a hit lands charges a Counter. Turtling becomes a second read, not just a shield.", weight: 8, reqs: { orbTreeAtLeast: { technique: 2 }, notOwned: ["mast_guard_read"] }, effects: [{ op: "grantUpgradeId", id: "mast_guard_read" }, { op: "setFlag", key: "guardRead", value: true }] }
    ],
    // v17: a Fusion unlocks when BOTH its trees reach rank 3, and EVOLVES when both
    // reach rank 5 (Arc 5). Colour = the mix of its two trees (constants FUSION_COLORS).
    fusions: [
      { id: "fuse_dempsey_circuit", kind: "fusion", draftRole: "capstone", tree: "general", trees: ["speed", "power"], tier: 3, repeatable: false, memoryPolicy: "hard", name: "Dempsey Circuit", desc: "Alternating Jab and Hook reduces recovery and preserves offensive rhythm.", weight: 6, reqs: { orbTreeAtLeast: { speed: 3, power: 3 }, notOwned: ["fuse_dempsey_circuit"] }, effects: [{ op: "grantUpgradeId", id: "fuse_dempsey_circuit" }, { op: "setFlag", key: "dempseyCircuit", value: true }, { op: "addMod", key: "dempseyRecoveryBonus", amount: 0.18 }] },
      { id: "fuse_ghost_counter", kind: "fusion", draftRole: "capstone", tree: "general", trees: ["speed", "technique"], tier: 3, repeatable: false, memoryPolicy: "hard", name: "Ghost Counter", desc: "Ghost Step through an active hitbox to gain Counter Charge.", weight: 6, reqs: { orbTreeAtLeast: { speed: 3, technique: 3 }, notOwned: ["fuse_ghost_counter"] }, effects: [{ op: "grantUpgradeId", id: "fuse_ghost_counter" }, { op: "setFlag", key: "ghostCounter", value: true }] },
      { id: "fuse_shatter_read", kind: "fusion", draftRole: "capstone", tree: "general", trees: ["power", "technique"], tier: 3, repeatable: false, memoryPolicy: "hard", name: "Shatter Read", desc: "A Counter-Charged Cross partially bypasses boss resistance and forces a stronger stagger.", weight: 6, reqs: { orbTreeAtLeast: { power: 3, technique: 3 }, notOwned: ["fuse_shatter_read"] }, effects: [{ op: "grantUpgradeId", id: "fuse_shatter_read" }, { op: "setFlag", key: "shatterRead", value: true }, { op: "addMod", key: "shatterReadBossBypass", amount: 0.35 }, { op: "addMod", key: "shatterReadStaggerBonus", amount: 12 }] },
      // ---- EVOLVED (both trees at rank 5, base Fusion owned) ----
      { id: "evo_infinite_circuit", kind: "fusion", evolved: true, draftRole: "capstone", tree: "general", trees: ["speed", "power"], tier: 4, repeatable: false, memoryPolicy: "hard", name: "Infinite Circuit", desc: "an alternating Jab/Hook string never drops Combo on a whiff, and every 4th alternation charges a Counter.", weight: 8, reqs: { orbTreeAtLeast: { speed: 5, power: 5 }, hasUpgradeIds: ["fuse_dempsey_circuit"], notOwned: ["evo_infinite_circuit"] }, effects: [{ op: "grantUpgradeId", id: "evo_infinite_circuit" }, { op: "setFlag", key: "infiniteCircuit", value: true }] },
      { id: "evo_phantom_riposte", kind: "fusion", evolved: true, draftRole: "capstone", tree: "general", trees: ["speed", "technique"], tier: 4, repeatable: false, memoryPolicy: "hard", name: "Phantom Riposte", desc: "a perfect Ghost Step leaves an afterimage that instantly echoes a punch back at the attacker.", weight: 8, reqs: { orbTreeAtLeast: { speed: 5, technique: 5 }, hasUpgradeIds: ["fuse_ghost_counter"], notOwned: ["evo_phantom_riposte"] }, effects: [{ op: "grantUpgradeId", id: "evo_phantom_riposte" }, { op: "setFlag", key: "phantomRiposte", value: true }] },
      { id: "evo_shatter_nova", kind: "fusion", evolved: true, draftRole: "capstone", tree: "general", trees: ["power", "technique"], tier: 4, repeatable: false, memoryPolicy: "hard", name: "Shatter Nova", desc: "a Counter-Charged Cross on a boss tears off an extra 8% of its health; on anyone else it shatters every enemy in the lane.", weight: 8, reqs: { orbTreeAtLeast: { power: 5, technique: 5 }, hasUpgradeIds: ["fuse_shatter_read"], notOwned: ["evo_shatter_nova"] }, effects: [{ op: "grantUpgradeId", id: "evo_shatter_nova" }, { op: "setFlag", key: "shatterNova", value: true }] }
    ],
    overclocks: [
      { id: "oc_vital_surge", kind: "overclock", draftRole: "fallback", tree: "general", tier: 4, repeatable: true, memoryPolicy: "soft", name: "Vital Surge", desc: "Restore +20 health.", weight: 20, reqs: {}, effects: [{ op: "heal", amount: 20 }, { op: "incOverclock", key: "vitality", amount: 1 }] },
      { id: "oc_quick_nerves", kind: "overclock", draftRole: "fallback", tree: "general", tier: 4, repeatable: true, memoryPolicy: "soft", name: "Quick Nerves", desc: "Tiny Ghost Step cooldown trim.", weight: 12, reqs: {}, effects: [{ op: "mulMod", key: "ghostStepCooldownMult", amount: 0.95 }, { op: "incOverclock", key: "nerves", amount: 1 }] },
      { id: "oc_sharp_eye", kind: "overclock", draftRole: "fallback", tree: "general", tier: 4, repeatable: true, memoryPolicy: "soft", name: "Sharp Eye", desc: "Perfect Slips reward slightly more meter and value.", weight: 12, reqs: {}, effects: [{ op: "addMod", key: "perfectSlipRewardBonusMult", amount: 0.08 }, { op: "incOverclock", key: "focus", amount: 1 }] },
      { id: "oc_calm_engine", kind: "overclock", draftRole: "fallback", tree: "general", tier: 4, repeatable: true, memoryPolicy: "soft", name: "Calm Engine", desc: "Slightly improve Instinct gain for the rest of the run.", weight: 12, reqs: {}, effects: [{ op: "addMod", key: "instinctGainBonusMult", amount: 0.06 }, { op: "incOverclock", key: "instinct", amount: 1 }] },
      { id: "oc_clinch_breaker", kind: "overclock", draftRole: "fallback", tree: "general", tier: 4, repeatable: true, memoryPolicy: "soft", name: "Clinch Breaker", desc: "Reduce incoming recoil and hit pushback slightly.", weight: 10, reqs: {}, effects: [{ op: "mulMod", key: "incomingRecoilMult", amount: 0.94 }, { op: "incOverclock", key: "clinch", amount: 1 }] },
      { id: "oc_clean_finish", kind: "overclock", draftRole: "fallback", tree: "general", tier: 4, repeatable: true, memoryPolicy: "soft", name: "Clean Finish", desc: "Slightly improve EXP / score efficiency.", weight: 10, reqs: {}, effects: [{ op: "addMod", key: "expGainBonusMult", amount: 0.05 }, { op: "incOverclock", key: "finish", amount: 1 }] }
    ]
  };

  // src/systems/rng.js
  var _state = Math.random() * 4294967295 >>> 0;
  function seedRng(seed) {
    _state = seed >>> 0;
    if (_state === 0) _state = 2654435769;
  }
  function random() {
    _state |= 0;
    _state = _state + 1831565813 | 0;
    let t = Math.imul(_state ^ _state >>> 15, 1 | _state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function dailySeedFromDate(date = /* @__PURE__ */ new Date()) {
    const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate();
    return y * 1e4 + m * 100 + d;
  }
  function todayKey(date = /* @__PURE__ */ new Date()) {
    const y = date.getUTCFullYear(), m = String(date.getUTCMonth() + 1).padStart(2, "0"), d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // src/systems/wagers.js
  var NONE = CONSTANTS.AFFIXES[0];
  function rollWagerOffer(stage2) {
    if (stage2 < CONSTANTS.WAGERS.firstStage || CONSTANTS.isBossStage(stage2)) return null;
    const pool = CONSTANTS.wagerPool();
    if (!pool.length) return null;
    return pool[Math.floor(random() * pool.length)];
  }
  function clearWager() {
    gameState.currentAffix = NONE;
    gameState.wagerMult = 1;
  }
  function acceptWager() {
    const offer = gameState.wagerOffer;
    if (!offer) return null;
    gameState.currentAffix = offer;
    gameState.wagerMult = offer.scoreMult || 1;
    gameState.wagerOffer = null;
    tmWager(offer.name);
    return offer;
  }
  function declineWager() {
    gameState.wagerOffer = null;
    clearWager();
  }

  // src/systems/progression/apply.js
  function applyEffect(st, effect) {
    switch (effect.op) {
      case "incOrb": {
        let currentCount = st.orbCounts[effect.tree] !== void 0 ? st.orbCounts[effect.tree] : 0;
        let addAmount = effect.amount !== void 0 ? effect.amount : 1;
        st.orbCounts[effect.tree] = Math.min(CONSTANTS.MAX_RANK, currentCount + addAmount);
        if (!st.rankOrder) st.rankOrder = [];
        st.rankOrder.push(effect.tree);
        let el = document.getElementById(`orb-${effect.tree}`);
        if (el) el.innerText = st.orbCounts[effect.tree];
        break;
      }
      case "mulStat": {
        let currentStat = st.stats[effect.stat] !== void 0 ? st.stats[effect.stat] : 1;
        let addStatAmount = effect.amount !== void 0 ? effect.amount : 0;
        st.stats[effect.stat] = currentStat + addStatAmount;
        break;
      }
      case "grantUpgradeId": {
        if (effect.id && !st.acquiredUpgradeIds.includes(effect.id)) {
          st.acquiredUpgradeIds.push(effect.id);
        }
        break;
      }
      case "setFlag": {
        st.progressionMods[effect.key] = effect.value;
        break;
      }
      case "addMod": {
        let currentMod = st.progressionMods[effect.key] !== void 0 ? st.progressionMods[effect.key] : 0;
        let addModAmount = effect.amount !== void 0 ? effect.amount : 0;
        st.progressionMods[effect.key] = currentMod + addModAmount;
        break;
      }
      case "mulMod": {
        let currentModM = st.progressionMods[effect.key] !== void 0 ? st.progressionMods[effect.key] : 1;
        let mulModAmount = effect.amount !== void 0 ? effect.amount : 1;
        st.progressionMods[effect.key] = currentModM * mulModAmount;
        break;
      }
      case "heal": {
        let currentHealth = st.health !== void 0 ? st.health : 0;
        let maxHealth = st.maxHealth !== void 0 ? st.maxHealth : 100;
        let healAmount = effect.amount !== void 0 ? effect.amount : 0;
        st.health = Math.min(maxHealth, currentHealth + healAmount);
        break;
      }
      case "incOverclock": {
        let currentOc = st.overclockCounts[effect.key] !== void 0 ? st.overclockCounts[effect.key] : 0;
        let addOcAmount = effect.amount !== void 0 ? effect.amount : 1;
        st.overclockCounts[effect.key] = currentOc + addOcAmount;
        break;
      }
      default: {
        console.warn("Unknown upgrade effect op:", effect.op, effect);
        break;
      }
    }
  }
  function applyUpgrade(st, upgrade) {
    if (!upgrade || !upgrade.effects) return;
    if (!st.currentDraftOptions.some((o) => o.id === upgrade.id)) return;
    for (const effect of upgrade.effects) applyEffect(st, effect);
    tmEvolution(upgrade.id);
    if (upgrade.kind === "overclock") {
      const screenEl = document.getElementById("upgrade-screen");
      if (screenEl) {
        screenEl.classList.remove("overclock-flourish");
        void screenEl.offsetWidth;
        screenEl.classList.add("overclock-flourish");
      }
      showToast(`${upgrade.name.toUpperCase()} ONLINE`, "#facc15");
    }
    if (st.pendingUpgrades > 0) st.pendingUpgrades -= 1;
    st.currentDraftOptions = [];
    let upgradeScreen = document.getElementById("upgrade-screen");
    if (upgradeScreen) upgradeScreen.style.display = "none";
    if (!st.evoChain || !st.evoChain.active) st.evoChain = { active: true, total: 1, picks: [] };
    st.evoChain.picks.push(upgrade);
    if (st.pendingUpgrades > 0) {
      if (window.engineTriggerUpgradeDraft) window.engineTriggerUpgradeDraft();
      else st.screen = "playing";
      return;
    }
    const picks = st.evoChain.picks.slice();
    st.evoChain = { active: false, total: 0, picks: [] };
    const resume = () => {
      st.screen = "playing";
    };
    if (window.enginePlayUpgradeVignette) window.enginePlayUpgradeVignette(picks, resume);
    else resume();
  }
  var ARC_COLORS = { 1: "#22d3ee", 2: "#34d399", 3: "#f87171", 4: "#c084fc", 5: "#facc15" };
  var ARC_TINTS = {
    1: "rgba(34, 211, 238, 0.18)",
    2: "rgba(52, 211, 153, 0.18)",
    3: "rgba(248, 113, 113, 0.18)",
    4: "rgba(192, 132, 252, 0.18)",
    5: "rgba(250, 204, 21, 0.18)"
  };
  function stageHudText(stage2) {
    var _a;
    const arc = Math.min(CONSTANTS.getArcIndex(stage2), 5);
    const law = CONSTANTS.ARC_LAWS[arc] || CONSTANTS.ARC_LAWS[5];
    const data = ((_a = CONSTANTS.ARC_STAGE_TABLES[arc]) == null ? void 0 : _a[CONSTANTS.getLevelInArc(stage2)]) || { stageName: "UNKNOWN DEPTHS" };
    return { text: `${law.shortName}: ${data.stageName}`, color: ARC_COLORS[arc] || "#ec4899" };
  }
  function refreshStageHud() {
    const stageUI = document.getElementById("stage-ui");
    const affixUI = document.getElementById("affix-ui");
    const hud = stageHudText(gameState.currentStage);
    if (stageUI) {
      stageUI.innerText = hud.text;
      stageUI.style.color = hud.color;
      stageUI.classList.remove("stage-pulse");
      void stageUI.offsetWidth;
      stageUI.classList.add("stage-pulse");
    }
    if (affixUI) affixUI.innerText = gameState.wagerMult > 1 && gameState.currentAffix ? `WAGER: ${gameState.currentAffix.name} x${gameState.wagerMult}` : "";
  }
  function openingSubtitle() {
    if (!profileFlag("seenArc1Theme")) {
      setProfileFlag("seenArc1Theme");
      return CONSTANTS.ARC_LAWS[1].theme;
    }
    return CONSTANTS.STAGE_TAGLINES[1];
  }
  function roundCard(stage2, tagline) {
    var _a;
    const arc = Math.min(CONSTANTS.getArcIndex(stage2), 5);
    const law = CONSTANTS.ARC_LAWS[arc] || CONSTANTS.ARC_LAWS[5];
    const data = ((_a = CONSTANTS.ARC_STAGE_TABLES[arc]) == null ? void 0 : _a[CONSTANTS.getLevelInArc(stage2)]) || { stageName: "Unknown Depths" };
    return { round: stage2, venue: data.stageName, tagline: tagline || "", kicker: `${law.shortName} \xB7 ${law.name.toUpperCase()}`, color: ARC_COLORS[arc] || "#22d3ee" };
  }
  function advanceStage() {
    var _a;
    const prevStage = gameState.currentStage;
    const clearPts = addScore(CONSTANTS.SCORE.stageClear, void 0, void 0, { noCombo: true });
    if (clearPts > 0) showToast(`ALL CLEAR +${clearPts.toLocaleString()}`, "#facc15");
    if ((gameState.stageHitsTaken || 0) === 0 && prevStage > 1) {
      const fl = addScore(CONSTANTS.SCORE.flawless, void 0, void 0, { noCombo: true });
      showToast(`FLAWLESS +${fl.toLocaleString()}`, "#ffffff");
      gameState.statFlawless = (gameState.statFlawless || 0) + 1;
    }
    gameState.stageHitsTaken = 0;
    gameState.currentStage++;
    tmStage(gameState.currentStage);
    gameState.bossDefeatedThisStage = false;
    clearWager();
    gameState.wagerOffer = rollWagerOffer(gameState.currentStage);
    gameState.stageClearing = false;
    gameState.bossActive = false;
    gameState.stageProgress = 0;
    gameState.wavesCleared = 0;
    gameState.waveThreshold = 0;
    gameState.waveTimer = 90;
    gameState.health = Math.min(gameState.maxHealth, gameState.health + 25);
    if (gameState.player) {
      gameState.player.state = "idle";
      gameState.player.punchTimer = 0;
      gameState.player.hitFrame = 0;
      gameState.player.didHit = false;
      gameState.player.recoveryTimer = 0;
      gameState.player.comboWindow = 0;
      gameState.player.jabStep = 0;
      gameState.player.inputBuffer = null;
      gameState.player.movementBuffer = null;
    }
    let arcIndex = CONSTANTS.getArcIndex(gameState.currentStage);
    let levelInArc = CONSTANTS.getLevelInArc(gameState.currentStage);
    let isBoss = CONSTANTS.isBossStage(gameState.currentStage);
    let safeArcIndex = Math.min(arcIndex, 5);
    let law = CONSTANTS.ARC_LAWS[safeArcIndex] || CONSTANTS.ARC_LAWS[5];
    gameState.paletteFrom = CONSTANTS.paletteKeyForStage(prevStage);
    gameState.paletteTo = CONSTANTS.paletteKeyForStage(gameState.currentStage);
    gameState.paletteT = 0;
    gameState.hazards = [];
    gameState.hazardCooldown = CONSTANTS.HAZARDS.cooldownFrames;
    gameState.hazardsThisStage = 0;
    gameState.surpriseBudget = isBoss ? 0 : (CONSTANTS.SURPRISE.budgetByArc || {})[safeArcIndex] || 0;
    gameState.laneTempo = [1, 1, 1];
    gameState.hotLane = -1;
    if (!isBoss) {
      const hotChance = (CONSTANTS.LANE_TEMPO.hotChanceByArc || {})[safeArcIndex] || 0;
      const hotCost = CONSTANTS.SURPRISE.hotLaneCost;
      if (gameState.surpriseBudget >= hotCost && random() < hotChance) {
        gameState.hotLane = Math.floor(random() * 3);
        gameState.laneTempo[gameState.hotLane] = CONSTANTS.LANE_TEMPO.hotMult;
        gameState.surpriseBudget -= hotCost;
      }
    }
    const LANE_LABEL = ["TOP", "MID", "BOTTOM"];
    const hotLaneCard = gameState.hotLane >= 0 ? [{ type: "text", title: "LANE SURGE", subtitle: `${LANE_LABEL[gameState.hotLane]} LANE RUNNING HOT`, duration: 120 }] : [];
    let stageData = ((_a = CONSTANTS.ARC_STAGE_TABLES[safeArcIndex]) == null ? void 0 : _a[levelInArc]) || { stageName: "UNKNOWN DEPTHS" };
    let titleText = isBoss ? stageData.stageName : `${law.shortName} \u2014 ${stageData.stageName}`;
    let subtitleText = isBoss ? law.uiText : CONSTANTS.STAGE_TAGLINES[levelInArc];
    const isNewArc = CONSTANTS.locateStage(gameState.currentStage).ordinal === 1 && gameState.currentStage > 1;
    if (isNewArc) gameState.knockdownsThisArc = 0;
    const chapterCardSteps = isNewArc ? [
      { type: "tint", color: "rgba(0, 0, 0, 0.82)", duration: 20 },
      { type: "text", title: `ARC ${safeArcIndex}`, subtitle: law.name.toUpperCase(), duration: 85 },
      { type: "tint", color: ARC_TINTS[safeArcIndex] || "rgba(236, 72, 153, 0.18)", duration: 10 },
      { type: "text", title: law.name.toUpperCase(), subtitle: law.theme, duration: 160 },
      { type: "tint", color: "transparent", duration: 10 }
    ] : [];
    const rm = reducedMotion();
    SequenceManager.playDynamic([
      { type: "walkout", duration: rm ? 24 : 46 },
      { type: "call", fn: () => {
        playSound("sweep");
        refreshStageHud();
      } },
      { type: "sweep", duration: rm ? 24 : 54 },
      ...chapterCardSteps,
      // v17 ROUND FRAMING: every fight opens on a bell + billing card; a boss
      // stage instead gets its title-fight poster when the champion walks out.
      ...isBoss ? [] : [{ type: "billing", duration: 120, card: roundCard(gameState.currentStage, subtitleText) }],
      { type: "wager" },
      ...hotLaneCard,
      { type: "walkin", duration: rm ? 24 : 44 },
      { type: "call", fn: refreshStageHud },
      { type: "resume" }
    ]);
  }

  // src/systems/progression/requirements.js
  function isRecentlyOffered(st, upgrade) {
    if (!upgrade.memoryPolicy || upgrade.memoryPolicy === "none") return false;
    return st.recentlyOffered.includes(upgrade.id);
  }
  function pushRecentlyOffered(st, offeredIds, maxSize = 6) {
    const merged = [...st.recentlyOffered, ...offeredIds];
    st.recentlyOffered = merged.slice(-maxSize);
  }
  function meetsRequirements(upgrade, st) {
    var _a, _b;
    const reqs = upgrade.reqs || {};
    if (reqs.orbTreeBelow) {
      for (const [tree, value] of Object.entries(reqs.orbTreeBelow)) {
        if (((_a = st.orbCounts[tree]) != null ? _a : 0) >= value) return false;
      }
    }
    if (reqs.orbTreeAtLeast) {
      for (const [tree, value] of Object.entries(reqs.orbTreeAtLeast)) {
        if (((_b = st.orbCounts[tree]) != null ? _b : 0) < value) return false;
      }
    }
    if (reqs.hasUpgradeIds) {
      for (const id of reqs.hasUpgradeIds) {
        if (!st.acquiredUpgradeIds.includes(id)) return false;
      }
    }
    if (reqs.notOwned) {
      for (const id of reqs.notOwned) {
        if (st.acquiredUpgradeIds.includes(id)) return false;
      }
    }
    return true;
  }

  // src/systems/progression/draft.js
  function nextRank(st, pool, tree) {
    const r = st.orbCounts && st.orbCounts[tree] || 0;
    return pool.orbs.find((o) => o.tree === tree && o.rank === r + 1) || null;
  }
  function currentRankCap(st) {
    return CONSTANTS.rankCap(CONSTANTS.getArcIndex(st.currentStage || 1));
  }
  function buildEligiblePool(st, pool) {
    const pools = {
      orbs: [],
      masteries: [],
      fusions: [],
      overclocks: []
    };
    const cap = currentRankCap(st);
    for (const tree of CONSTANTS.TREE_ORDER) {
      const next = nextRank(st, pool, tree);
      if (next && next.rank <= cap) pools.orbs.push(next);
    }
    for (const mastery of pool.masteries) {
      if (meetsRequirements(mastery, st) && !isRecentlyOffered(st, mastery)) {
        pools.masteries.push(mastery);
      }
    }
    for (const fusion of pool.fusions) {
      if (meetsRequirements(fusion, st) && !isRecentlyOffered(st, fusion)) {
        pools.fusions.push(fusion);
      }
    }
    for (const overclock of pool.overclocks) {
      if (meetsRequirements(overclock, st)) {
        pools.overclocks.push(overclock);
      }
    }
    return pools;
  }
  function weightedPick(candidates, excludedIds = /* @__PURE__ */ new Set()) {
    const filtered = candidates.filter((c) => !excludedIds.has(c.id));
    if (!filtered.length) return null;
    const totalWeight = filtered.reduce((sum, c) => sum + (c.weight !== void 0 ? c.weight : 1), 0);
    let roll = random() * totalWeight;
    for (const item of filtered) {
      roll -= item.weight !== void 0 ? item.weight : 1;
      if (roll <= 0) return item;
    }
    return filtered[filtered.length - 1];
  }
  function resolveSlotByPriority(pools, priorities, excludedIds, st) {
    for (const category of priorities) {
      if (category === "overclocks") {
        const softFresh = pools.overclocks.filter(
          (oc) => !excludedIds.has(oc.id) && !isRecentlyOffered(st, oc)
        );
        const softAny = pools.overclocks.filter(
          (oc) => !excludedIds.has(oc.id)
        );
        if (softFresh.length) return weightedPick(softFresh, excludedIds);
        if (softAny.length) return weightedPick(softAny, excludedIds);
        continue;
      }
      const pool = pools[category].filter((item) => !excludedIds.has(item.id));
      if (pool.length) {
        return weightedPick(pool, excludedIds);
      }
    }
    return null;
  }
  function buildDraft(st, pool) {
    const pools = buildEligiblePool(st, pool);
    const chosen = [];
    const excludedIds = /* @__PURE__ */ new Set();
    const slotRules = [
      ["orbs", "masteries", "fusions", "overclocks"],
      // Slot 1: a tree rank
      // v17: slot 2 prefers a SECOND tree's rank, so a draft usually lets you
      // choose which tree climbs (and a rank-3 verb isn't crowded out).
      ["orbs", "masteries", "fusions", "overclocks"],
      // Slot 2: another tree rank
      ["fusions", "masteries", "orbs", "overclocks"]
      // Slot 3: Capstone/Flex
    ];
    for (const priorities of slotRules) {
      const pick = resolveSlotByPriority(pools, priorities, excludedIds, st);
      if (pick) {
        chosen.push(pick);
        excludedIds.add(pick.id);
      }
    }
    while (chosen.length < 3) {
      const remaining = pool.overclocks.filter((oc) => !excludedIds.has(oc.id));
      if (!remaining.length) break;
      const pick = weightedPick(remaining, excludedIds);
      if (!pick) break;
      chosen.push(pick);
      excludedIds.add(pick.id);
    }
    st.currentDraftOptions = chosen;
    pushRecentlyOffered(st, chosen.map((c) => c.id));
    return chosen;
  }

  // src/systems/tutorial.js
  function triggerTutorial(id, title, text) {
    if (gameState.seenTutorials[id]) return;
    gameState.seenTutorials[id] = true;
    gameState.screen = "tutorial";
    const titleElem = document.getElementById("tutorial-title");
    const textElem = document.getElementById("tutorial-text");
    const screenElem = document.getElementById("tutorial-screen");
    if (titleElem) titleElem.innerText = title;
    if (textElem) textElem.innerHTML = text;
    if (screenElem) screenElem.style.display = "flex";
  }
  function dismissTutorial() {
    gameState.screen = "playing";
    const screenElem = document.getElementById("tutorial-screen");
    if (screenElem) screenElem.style.display = "none";
    gameState.tutorialGrace = 0;
  }
  function spawnTutorialEnemy(type) {
    gameState.spawnTotal++;
    gameState.player.lane = 1;
    gameState.player.y = gameState.height * CONSTANTS.LANE_Y[gameState.player.lane];
    gameState.player.x = 180;
    let color = "#ff0055";
    let hp = 45;
    let speed = 2;
    let cooldown = 60;
    let weight = 1;
    let enemyType = "grunt";
    let spawnX = gameState.width + 100;
    switch (type) {
      case "slip":
        color = "#ff0055";
        speed = 4;
        cooldown = 60;
        break;
      case "counter":
        color = "#ffaa00";
        speed = 1.5;
        cooldown = 120;
        gameState.player.slipBuff = 1;
        spawnX = gameState.player.x + 100;
        break;
      case "ghost_step":
        color = "#888888";
        speed = 5.5;
        spawnX = gameState.player.x + 100;
        break;
      case "shield":
        color = "#ffaa00";
        hp = 80;
        speed = 1.5;
        cooldown = 80;
        enemyType = "shield";
        spawnX = gameState.player.x + 130;
        break;
      case "guard":
        color = "#aa00ff";
        hp = 30;
        speed = 5.5;
        cooldown = 35;
        enemyType = "assassin";
        break;
    }
    gameState.enemies.push({
      x: spawnX,
      lane: 1,
      y: gameState.player.y,
      w: 50,
      h: 110,
      hp,
      maxHp: hp,
      speed,
      color,
      weight,
      type: enemyType,
      stun: 0,
      stunResist: 0,
      attackCooldown: cooldown,
      maxCooldown: cooldown,
      pressure: 0,
      pressureDecay: 0,
      isBoss: false,
      tutorialType: type,
      justAttacked: 0,
      trails: [],
      trailTimer: 0,
      vx: 0
    });
  }

  // src/systems/negative.js
  var ECHO_DELAY = 26;
  function invertHex(hex) {
    const h = String(hex || "#00ffff").replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
    const n = parseInt(full, 16);
    return "#" + (16777215 ^ n).toString(16).padStart(6, "0");
  }
  function negativeReact(en, buffActive) {
    const m = en.arcMods || {};
    if (en.slipCooldown > 0) return false;
    if (buffActive && random() < (m.counterRead || 0.5)) {
      en.slipCooldown = 40;
      spawnFloatingText(en.x + 20, en.y - 150, "READ YOU.", en.color);
      playSound("feint_tell");
      en.currentMove = "cross";
      en.attackCooldown = telegraphLead(en) + 2;
      en.telegraphed = false;
      return true;
    }
    if (random() < (m.echoChance || 0.35)) {
      en.slipCooldown = 36;
      const oldLane = en.lane;
      const lanes = [oldLane - 1, oldLane + 1].filter((l) => l >= 0 && l <= 2);
      en.lane = lanes[Math.floor(random() * lanes.length)];
      if (!gameState.enemyEchoes) gameState.enemyEchoes = [];
      gameState.enemyEchoes.push({ lane: oldLane, x: en.x, y: gameState.height * CONSTANTS.LANE_Y[oldLane], timer: ECHO_DELAY, fade: 20, fired: false, color: en.color });
      createShatter(en.x, en.y - 60, en.color);
      spawnFloatingText(en.x + 20, en.y - 150, "AFTERIMAGE", en.color);
      playSound("ghost_step");
      return true;
    }
    return false;
  }

  // src/systems/combat.js
  function checkHit(type) {
    let isJab = type.startsWith("jab") || type === "guard_jab";
    let isGuardPunch = type === "guard_jab" || type === "check_hook";
    let reachMult = gameState.orbCounts.power >= 2 ? 1.25 : 1;
    let reach = isJab ? 120 : type === "cross" ? 140 * reachMult : 140;
    let hitSomething = false;
    let buffActive = gameState.player.slipBuff > 0;
    const loaded = type === "cross" && !!gameState.player.crossLoaded;
    const spark = buildColor();
    let novaLanes = [];
    if (gameState.player.slipBuff > 0) gameState.player.slipBuff--;
    const jX = () => Math.random() * 50 - 25;
    const jY = () => Math.random() * 30 - 15;
    for (let i = 0; i < gameState.enemies.length; i++) {
      let en = gameState.enemies[i];
      if (en.lane === gameState.player.lane && en.x > gameState.player.x - 20 && en.x < gameState.player.x + reach) {
        if (en.tutorialType === "counter") {
          if (buffActive) {
            en.hp = 0;
            createShatter(en.x, en.y - 60, "#ffffff");
            spawnFloatingText(en.x + jX(), en.y - 100 + jY(), "SHATTERED!", "#ffffff");
            gameState.statCounterHits++;
          } else {
            spawnFloatingText(gameState.player.x + jX(), gameState.player.y - 50 + jY(), "USE CHARGED STRIKE!", "#ffaa00");
            en.x = gameState.player.x + 200;
            en.attackCooldown = en.maxCooldown;
            gameState.player.slipBuff = 1;
            playSound("bounce");
            continue;
          }
        }
        if (en.tutorialType === "slip") {
          spawnFloatingText(en.x, en.y - 80, "SLIP IT! (UP/DOWN)", "#ffaa00");
          hitSomething = true;
          continue;
        }
        if (en.tutorialType === "guard") {
          spawnFloatingText(en.x, en.y - 80, `WAIT & HOLD [${keyName("guard")}]!`, "#ffaa00");
          hitSomething = true;
          continue;
        }
        if (en.tutorialType === "ghost_step") {
          spawnFloatingText(en.x, en.y - 80, `GHOST STEP [${keyName("ghost")}]!`, "#ffaa00");
          hitSomething = true;
          continue;
        }
        if (en.tutorialType === "shield") {
          if (type === "cross") {
            en.hp = 0;
            spawnFloatingText(gameState.player.x + jX(), gameState.player.y - 50 + jY(), "ARMOR BROKEN!", "#00ffff");
          } else {
            spawnFloatingText(gameState.player.x + jX(), gameState.player.y - 50 + jY(), `USE CROSS [${keyName("cross")}] TO BREAK!`, "#ffaa00");
            en.x = gameState.player.x + 200;
            en.attackCooldown = en.maxCooldown;
            playSound("bounce");
            continue;
          }
        } else if (en.type === "shield" && type !== "cross") {
          createImpact(en.x, en.y - 80, "#ffaa00");
          en.x += 5;
          gameState.shake = 2;
          playSound("bounce");
          continue;
        }
        let dmg = 0;
        if (type === "jab1" || type === "jab2") dmg = 15;
        else if (type === "jab3") dmg = 25;
        else if (type === "hook") dmg = 35;
        else if (type === "cross") dmg = 50;
        else if (type === "guard_jab") dmg = 10;
        else if (type === "check_hook") dmg = 25;
        dmg = Math.round(dmg * CONSTANTS.affixMod(gameState.currentAffix, "playerDamageDealtMult", 1));
        const prevPressure = en.pressure || 0;
        if (!isGuardPunch) {
          en.pressure = Math.min(3, prevPressure + 1);
          let jpm = en.isBoss && en.name === "NEON ENFORCER" && en.arcMods ? en.arcMods.jabPressureMult : 1;
          en.pressureDecay = Math.max(15, Math.floor(45 / jpm));
        }
        if (buffActive) dmg *= 2;
        if (loaded) dmg = Math.round(dmg * 1.3);
        if (gameState.progressionMods.shatterNova && buffActive && type === "cross") {
          if (en.isBoss) dmg += Math.round(en.maxHp * 0.08);
          else novaLanes.push(en.lane);
          spawnFloatingText(en.x + jX(), en.y - 150 + jY(), "SHATTER NOVA", CONSTANTS.FUSION_COLORS.evo_shatter_nova);
        }
        if (loaded) spawnFloatingText(en.x + jX(), en.y - 110 + jY(), "LOADED!", spark);
        if (en.type === "shield" && type === "cross") {
          en.type = "grunt";
          if (!en.isBoss) en.color = "#ff0055";
          dmg *= 1.5;
        }
        const bossOpen = en.isBoss && isBossOpen(en);
        if (bossOpen) {
          dmg = Math.round(dmg * CONSTANTS.BOSS_OFFENSE.punishDamageMult);
          addScore(CONSTANTS.SCORE.punishBonus, en.x + jX(), en.y - 170 + jY(), { silent: true });
          if (!en.punishShown) {
            en.punishShown = true;
            spawnFloatingText(en.x + jX(), en.y - 150 + jY(), "PUNISH!", "#22d3ee");
            playSound("punish");
          }
        }
        if (en.controller === "negative" && !bossOpen && negativeReact(en, buffActive)) return false;
        let trueReadActive = false;
        if (en.isBoss && (en.exposedTimer || 0) > 0 && (type === "cross" || type === "hook" || buffActive)) {
          trueReadActive = true;
          en.exposedTimer = 0;
          dmg = Math.floor(dmg * 1.25);
          gameState.hitstop += 8;
          gameState.instinctPauseTimer = 45;
          gameState.statBossBreaks++;
          spawnFloatingText(en.x + jX(), en.y - 140 + jY(), "TRUE READ!", "#00ffff");
          triggerShockwave(en.x, en.y - 60, "#00ffff");
          playSound("laser");
        }
        if (type === "cross" && !buffActive && !trueReadActive && prevPressure > 0) {
          let cashOutBonus = prevPressure * 15;
          dmg += cashOutBonus;
          en.pressure = 0;
          spawnFloatingText(en.x + jX(), en.y - 110 + jY(), `CASH OUT! +${cashOutBonus}`, "#ff0055");
          gameState.shake += 4;
        }
        if (en.isBoss) {
          if (en.name === "PHANTOM BOXER" && !bossOpen) {
            en.bossMashCount = (en.bossMashCount || 0) + 1;
            en.mashDecay = 60;
            if (en.shiftWarning > 0) {
              if (trueReadActive) {
                en.shiftWarning = 0;
                en.shiftCooldown = 150;
                en.bossMashCount = 0;
              } else {
                en.shiftWarning = 0;
                en.bossMashCount = 0;
                en.shiftCooldown = 150;
                let oldX = en.x;
                let oldY = en.y;
                createShatter(oldX, oldY - 60, "#ffffff");
                playSound("shatter");
                spawnFloatingText(oldX + jX(), oldY - 100 + jY(), "PHANTOM SHIFT", "#aa00ff");
                let otherLanes = [0, 1, 2].filter((l) => l !== en.lane);
                let pinch = en.arcMods && en.arcMods.lanePinchBias || 0;
                if (random() < pinch) {
                  en.lane = otherLanes.reduce((a, b) => Math.abs(b - gameState.player.lane) < Math.abs(a - gameState.player.lane) ? b : a);
                } else {
                  en.lane = otherLanes[Math.floor(random() * otherLanes.length)];
                }
                en.y = gameState.height * CONSTANTS.LANE_Y[en.lane];
                createImpact(en.x, en.y - 60, "#aa00ff");
                en.attackCooldown = en.arcMods && en.arcMods.reentryDelayVariant ? 14 + Math.floor(random() * 11) : 18;
                return false;
              }
            } else if (en.bossMashCount >= 3 && (en.shiftCooldown || 0) <= 0 && en.hp > 0 && !trueReadActive) {
              en.shiftWarning = 20;
              spawnFloatingText(en.x + jX(), en.y - 100 + jY(), "SHIFT READY", "#ffffff");
            }
          }
          let enforcerArmored = !bossOpen && en.name === "NEON ENFORCER" && (en.phase === 2 || en.arcMods && en.arcMods.retaliationTimingVariant);
          if (enforcerArmored) {
            if (isJab && !trueReadActive && !isGuardPunch) {
              let chain = en.arcMods && en.arcMods.armoredRetaliationChain || 1;
              dmg = Math.floor(dmg * 0.25);
              takeDamage(2 * chain, false, en);
              gameState.statRecoilTaken++;
              spawnFloatingText(gameState.player.x + jX(), gameState.player.y - 50 + jY(), "RECOIL!", "#ff0000");
              return false;
            }
          }
          dmg = gateBossDamage(en, dmg);
          if (en.hp - dmg <= en.maxHp * 0.25 && !en.desperation) {
            en.desperation = true;
            spawnFloatingText(en.x + jX(), en.y - 120 + jY(), "DESPERATION!", "#ff0000");
            gameState.shake += 15;
            if (en.name === "PHANTOM BOXER") {
              en.shiftCooldown = 0;
              en.shiftWarning = 1;
            } else if (en.name === "NEON ENFORCER") {
              en.attackCooldown = 10;
              en.currentMove = "bash";
              en.enraged = true;
            }
          }
          if (en.name === "NEON ENFORCER" && en.phase === 1 && en.hp - dmg <= en.maxHp * 0.5) {
            en.phase = 2;
            en.speed = 3.5;
            gameState.shake = 50;
            doFlash(0.8);
            gameState.hitstop = 10;
            triggerShockwave(en.x, en.y - 60, "#ff0000");
            spawnFloatingText(en.x + jX(), en.y - 120 + jY(), "SHIELD SHATTERED!", "#ff0000");
            for (let j = 0; j < 20; j++) createImpact(en.x, en.y - 60, "#ffaa00");
            playSound("hit");
          }
          if (en.name === "PHANTOM BOXER" && en.phase === 1 && en.hp - dmg <= en.maxHp * 0.5) {
            en.phase = 2;
            en.speed = 3.5;
            gameState.shake = 40;
            doFlash(0.6);
            gameState.hitstop = 10;
            triggerShockwave(en.x, en.y - 60, "#aa00ff");
            createImpact(en.x, en.y - 80, "#aa00ff");
            spawnFloatingText(en.x + jX(), en.y - 120 + jY(), "OVERDRIVE", "#aa00ff");
            playSound("hit");
          }
        }
        en.hp -= dmg;
        if (type === "cross" && gameState.progressionMods.executionerCross && !en.isBoss && en.hp > 0 && en.hp <= en.maxHp * 0.25) {
          en.hp = 0;
          spawnFloatingText(en.x + jX(), en.y - 100 + jY(), "EXECUTED!", "#ff0055");
          createShatter(en.x, en.y - 60, "#ff0055");
        }
        const instinctKB = gameState.isInstinct ? (gameState.zoneTimer || 0) > 0 ? CONSTANTS.ZONE.knockbackMult : 2 : 1;
        let powerFactor = gameState.stats.powerMult * instinctKB * (buffActive ? 1.5 : 1);
        if (trueReadActive) powerFactor *= 1.5;
        let baseKB = 0;
        if (loaded) {
          baseKB = CONSTANTS.VERBS.loadedCross.knockback;
        } else if (buffActive || trueReadActive) {
          baseKB = 45;
        } else {
          if (type === "jab1" || type === "jab2") {
            baseKB = 1;
          } else if (type === "jab3") {
            baseKB = 12;
          } else if (type === "guard_jab") {
            baseKB = 2;
          } else if (type === "hook" || type === "check_hook") {
            baseKB = Math.max(30, gameState.progressionMods.hookKnockbackFloor);
          } else if (type === "cross") {
            baseKB = 5;
          }
        }
        if (en.isBoss) {
          baseKB = isJab ? 0 : Math.max(2, Math.floor(baseKB * 0.3));
          if (en.name === "NEON ENFORCER" && en.phase === 2 && !trueReadActive) {
            baseKB = buffActive || gameState.isInstinct && type === "cross" ? 10 : 0;
          }
        } else {
          baseKB = Math.floor(baseKB / (en.weight || 1));
        }
        en.vx += baseKB * powerFactor;
        if (type === "cross" || type === "hook" || type === "check_hook" || buffActive || trueReadActive || isJab) {
          let canStun = true;
          let stunAmount = 0;
          if (en.type === "bruiser" && isJab && !buffActive && !trueReadActive) canStun = false;
          if (isJab) stunAmount = 18;
          else if (type === "guard_jab") stunAmount = 10;
          else if (type === "hook") stunAmount = 15;
          else if (type === "check_hook") stunAmount = 20;
          else if (type === "cross") stunAmount = 40;
          if (buffActive) stunAmount += 15;
          if (loaded) stunAmount += CONSTANTS.VERBS.loadedCross.stun;
          if (type === "cross" && (en.type === "shield" || en.type === "bruiser" || en.isBoss && en.name === "NEON ENFORCER" && en.phase === 2)) {
            stunAmount += gameState.progressionMods.crossArmorStunBonus;
          }
          if (gameState.progressionMods.shatterRead && buffActive && type === "cross" && en.isBoss) {
            en.stunResist = Math.max(0, en.stunResist - 100 * gameState.progressionMods.shatterReadBossBypass);
            stunAmount += gameState.progressionMods.shatterReadStaggerBonus;
            spawnFloatingText(en.x + jX(), en.y - 120 + jY(), "SHATTER READ!", "#ff0055");
          }
          if (en.name === "NEON ENFORCER" && en.phase === 2) {
            if (buffActive || trueReadActive || loaded) {
              canStun = true;
              stunAmount += 10;
              gameState.statBossBreaks++;
              spawnFloatingText(en.x + jX(), en.y - 100 + jY(), "ARMOR SHATTERED!", "#00ffff");
            } else if (gameState.isInstinct && type === "cross") {
              canStun = true;
              stunAmount = 6;
              spawnFloatingText(en.x + jX(), en.y - 100 + jY(), "PARTIAL BREAK", "#ff00ff");
            } else {
              canStun = false;
            }
          }
          if (canStun) {
            let isResisting = en.isBoss && en.stunResist > 0;
            if (!isResisting) {
              if (trueReadActive) stunAmount += 15;
              en.stun = Math.max(en.stun, stunAmount);
              if (en.isBoss) en.stunResist = en.stun + 30;
            } else {
              en.stun = Math.max(en.stun, 2);
            }
          } else if (!canStun && en.stunResist <= 0) {
            spawnFloatingText(en.x + jX(), en.y - 80 + jY(), "ARMORED", "#ff0000");
          }
        }
        if ((type === "cross" || type === "hook" || type === "check_hook") && (en.type === "shield" || en.type === "bruiser")) {
          gameState.instinctMeter = Math.min(100, gameState.instinctMeter + gameState.progressionMods.hardTargetInstinctFlat);
          gameState.exp += gameState.progressionMods.hardTargetExpFlat;
        }
        hitSomething = true;
        if ((buffActive || loaded) && en.tutorialType !== "counter") {
          createShatter(en.x, en.y - 60, spark);
        } else if (en.tutorialType !== "counter") {
          createImpact(en.x, en.y - 60, spark);
        }
        if (gameState.orbCounts.power >= 4 && en.hp <= 0 && (type === "cross" || buffActive)) {
          triggerShockwave(en.x, en.y - 60, spark);
        }
      }
    }
    if (hitSomething) {
      if (!isGuardPunch) {
        gameState.combo++;
        if (gameState.combo > gameState.statMaxCombo) gameState.statMaxCombo = gameState.combo;
      }
      addScore(hitScore(type) * (buffActive ? CONSTANTS.SCORE.counterHitMult : 1), gameState.player.x + reach * 0.6, gameState.player.y - 110);
      if (buffActive) spawnFloatingText(gameState.player.x + reach / 2 + jX(), gameState.player.y - 80 + jY(), "COUNTER HIT!", "#ffffff");
      gameState.player.flowStreak = (gameState.player.flowStreak || 0) + 1;
      const flowMult = getFlowMultiplier(gameState);
      if (gameState.progressionMods.flowState && (gameState.player.flowStreak === 10 || gameState.player.flowStreak === 25)) {
        spawnFloatingText(gameState.player.x, gameState.player.y - 90 + jY(), "FLOW STATE!", "#ff8ad8");
      }
      if (!gameState.isInstinct) {
        let gain = 6 * gameState.stats.techMult * (1 + gameState.progressionMods.instinctGainBonusMult) * flowMult;
        gain *= CONSTANTS.affixMod(gameState.currentAffix, "instinctGainMult", 1);
        gameState.instinctMeter = Math.min(100, gameState.instinctMeter + gain);
      }
      let stopMult = 1 + (gameState.isInstinct ? 0.5 : 0) + (buffActive ? 0.5 : 0);
      gameState.hitstop = isJab ? Math.floor(2 * stopMult) : type === "cross" ? Math.floor(5 * stopMult) : Math.floor(3 * stopMult);
      if (loaded) gameState.hitstop += 6;
      gameState.shake = (type === "cross" ? 8 : isJab ? 2 : 4) * stopMult;
      if (type === "cross" || buffActive) doFlash(buffActive ? 0.6 : 0.2);
      if (type === "cross" && gameState.orbCounts.power >= 2) {
        createImpact(gameState.player.x + reach, gameState.player.y - 40, spark);
        gameState.shake += 5;
      }
      if (novaLanes.length) gameState.enemies.forEach((o) => {
        if (!o.isBoss && novaLanes.includes(o.lane) && !o.tutorialType) {
          o.hp = 0;
          createShatter(o.x, o.y - 60, CONSTANTS.FUSION_COLORS.evo_shatter_nova);
        }
      });
      if (gameState.orbCounts.speed >= 4 && (isJab || type === "hook")) {
        gameState.player.moveCancelReady = true;
      }
      if (!buffActive) playSound("hit");
    }
    return hitSomething;
  }

  // src/entities/player.js
  function resetPlayerObj() {
    return {
      lane: 1,
      x: 180,
      y: 0,
      w: 50,
      h: 110,
      state: "idle",
      punchTimer: 0,
      punchType: null,
      hitFrame: 0,
      didHit: false,
      slipCooldown: 0,
      slipBuff: 0,
      color: "#00ffff",
      trails: [],
      trailTimer: 0,
      recoveryTimer: 0,
      moveCancelReady: false,
      jabStep: 0,
      comboWindow: 0,
      inputBuffer: null,
      inputBufferTimer: 0,
      movementBuffer: null,
      movementBufferTimer: 0,
      ghostStepTimer: 0,
      ghostStepCooldown: 0,
      ghostStepCharges: 1,
      dangerLevel: 0,
      hitStun: 0,
      lastPunchLanded: null,
      dempseyActive: false,
      guardReadTimer: 0,
      flowStreak: 0,
      // v17
      invuln: 0,
      pivotTimer: 0,
      charging: false,
      crossCharge: 0,
      crossLoaded: false,
      bufferedCharge: 0,
      dempseyAlternations: 0
    };
  }
  var FW = CONSTANTS.FOOTWORK;
  var FOOTWORK_MIN_X = FW.minX;
  var FOOTWORK_MAX_X = FW.maxX;
  var FOOTWORK_ADVANCE_SPD = FW.advanceSpd;
  var FOOTWORK_RETREAT_SPD = FW.retreatSpd;
  var FOOTWORK_HOME_PULL = FW.homePull;
  function resetJabString() {
    if (gameState.player) {
      gameState.player.jabStep = 0;
      gameState.player.comboWindow = 0;
      gameState.player.lastPunchLanded = null;
      gameState.player.dempseyActive = false;
    }
  }
  function executeAttackInput(action, charge = 0) {
    if (gameState.player.state === "guarding") {
      if (action === "jab") startPunch("guard_jab");
      if (action === "hook") startPunch("check_hook");
      return;
    }
    if (action === "jab") {
      if (gameState.player.jabStep === 0) startPunch("jab1");
      else if (gameState.player.jabStep === 1) startPunch("jab2");
      else if (gameState.player.jabStep === 2) startPunch("jab3");
      else startPunch("jab1");
    } else if (action === "cross") startPunch("cross", charge);
    else if (action === "hook") startPunch("hook");
  }
  function ghostStep() {
    const maxGhostCharges = gameState.progressionMods.blurStep ? 2 : 1;
    if (gameState.player.ghostStepCharges === void 0) gameState.player.ghostStepCharges = maxGhostCharges;
    if (gameState.player.ghostStepCharges <= 0) return;
    gameState.player.ghostStepCharges--;
    tmGhost(false);
    gameState.player.state = "ghost_step";
    gameState.player.ghostStepTimer = 18;
    gameState.player.ghostPerfected = false;
    gameState.player.charging = false;
    if (gameState.player.ghostStepCharges <= 0) gameState.player.ghostStepCooldown = Math.max(10, Math.floor(60 * gameState.progressionMods.ghostStepCooldownMult));
    resetJabString();
    playSound("ghost_step");
    for (let i = 0; i < 8; i++) {
      gameState.particles.push({ x: gameState.player.x + Math.random() * 30, y: gameState.player.y - 30 - Math.random() * 60, vx: -10 - Math.random() * 15, vy: 0, life: 0.6, color: "#666666", type: "dash_line" });
    }
  }
  function executeMovementInput(action) {
    if (action === "guard") {
      tmGuard();
      gameState.player.state = "guarding";
      gameState.player.charging = false;
      gameState.combo = 0;
      resetJabString();
    } else if (action === "ghost") ghostStep();
    else if (action === "up" || action === "down") {
      const oldLane = gameState.player.lane;
      if (action === "up") gameState.player.lane = Math.max(0, gameState.player.lane - 1);
      if (action === "down") gameState.player.lane = Math.min(2, gameState.player.lane + 1);
      if (oldLane !== gameState.player.lane) {
        if (gameState.player.slipCooldown <= 0) {
          checkPerfectSlip(oldLane);
          gameState.player.slipCooldown = 12;
          resetJabString();
          if (gameState.progressionMods.pivotSlip) pivotForward();
          resolveBodies(gameState.player);
        } else {
          gameState.player.lane = oldLane;
        }
      }
    }
  }
  function pivotForward() {
    const V = CONSTANTS.VERBS.pivotSlip, p = gameState.player;
    const target = gameState.enemies.filter((e) => e.lane === p.lane && e.x > p.x).sort((a, b) => a.x - b.x)[0];
    const want = target ? Math.min(target.x - 95, p.x + V.advance) : p.x;
    if (want > p.x + 4) {
      p.x = Math.min(FOOTWORK_MAX_X, want);
      for (let i = 0; i < 6; i++) gameState.particles.push({ x: p.x - 20 - Math.random() * 30, y: p.y - 30 - Math.random() * 60, vx: -8 - Math.random() * 8, vy: 0, life: 0.5, color: buildColor(), type: "dash_line" });
    }
    p.pivotTimer = V.instantWindow;
  }
  function registerPerfectGhostStep(attacker) {
    const p = gameState.player;
    if (!p || p.ghostPerfected) return false;
    p.ghostPerfected = true;
    gameState.combo++;
    if (gameState.combo > gameState.statMaxCombo) gameState.statMaxCombo = gameState.combo;
    gameState.statGhostSteps = (gameState.statGhostSteps || 0) + 1;
    tmGhost(true);
    p.flowStreak = (p.flowStreak || 0) + 1;
    addScore(CONSTANTS.SCORE.perfectGhostStep, p.x + 40, p.y - 120);
    spawnFloatingText(p.x, p.y - 95, "PERFECT GHOST +1", "#e5e7eb");
    const zoneReady = gameState.instinctMeter >= 100 && !gameState.isInstinct;
    const flowMult = getFlowMultiplier(gameState);
    if (!gameState.isInstinct) {
      let gain = 20 * gameState.stats.techMult * (1 + gameState.progressionMods.perfectSlipRewardBonusMult) * flowMult;
      gain *= CONSTANTS.affixMod(gameState.currentAffix, "instinctGainMult", 1);
      gameState.instinctMeter = Math.min(100, gameState.instinctMeter + gain);
    }
    const heal = gameState.progressionMods.perfectSlipHeal + CONSTANTS.affixMod(gameState.currentAffix, "perfectSlipHeal", 0);
    if (heal > 0) gameState.health = Math.min(gameState.maxHealth, gameState.health + heal);
    gameState.exp += Math.floor(2 * (1 + gameState.progressionMods.expGainBonusMult) * flowMult);
    if (zoneReady) activateInstinct(true);
    if (gameState.progressionMods.phantomRiposte) spawnAfterimage(p.lane, p.x, 8);
    return true;
  }
  function checkPerfectSlip(oldLane) {
    let slipQuality = "none", bossSlipped = null;
    gameState.enemies.forEach((en) => {
      if (en.lane === oldLane && en.stun <= 0) {
        let isThreat = false;
        const { perfect: perfectThresh, good: goodThresh } = CONSTANTS.getSlipThresholds(en.type, gameState.progressionMods.perfectSlipWindowBonus);
        if (en.type === "zoner") {
          if (en.attackCooldown <= 40 && en.x > gameState.player.x - 20) isThreat = true;
        } else if (Math.abs(en.x - gameState.player.x) < 130 && en.attackCooldown <= 22 && en.x > gameState.player.x - 20) {
          isThreat = true;
        }
        if (isThreat) {
          let oldCooldown = en.attackCooldown;
          if (en.tutorialType === "slip") {
            if (oldCooldown <= perfectThresh) {
              slipQuality = "perfect";
              en.hp = 0;
            } else {
              slipQuality = "good";
              en.x = gameState.player.x + 200;
              en.attackCooldown = en.maxCooldown;
              en.justAttacked = 0;
              spawnFloatingText(gameState.player.x, gameState.player.y - 50, "TOO EARLY!", "#ffaa00");
              gameState.player.slipBuff = 0;
            }
          } else {
            if (oldCooldown <= perfectThresh) {
              slipQuality = "perfect";
              if (en.isBoss) bossSlipped = en;
              if (en.type === "zoner") {
                en.attackCooldown = en.maxCooldown;
              } else en.attackCooldown = Math.max(en.attackCooldown, 18);
            } else if (oldCooldown <= goodThresh && slipQuality !== "perfect") {
              slipQuality = "good";
              if (en.type === "zoner") {
                en.attackCooldown = en.maxCooldown;
              } else en.attackCooldown = Math.max(en.attackCooldown, 18);
            } else {
              en.attackCooldown = Math.max(en.attackCooldown, 18);
            }
          }
        }
      }
    });
    if (slipQuality !== "none") triggerPerfectSlip(bossSlipped, slipQuality);
    if (slipQuality === "perfect" && gameState.progressionMods.afterimageSlip) spawnAfterimage(oldLane, gameState.player.x);
  }
  function spawnAfterimage(lane, x, delayOverride) {
    if (!gameState.afterimages) gameState.afterimages = [];
    gameState.afterimages.push({ lane, x, y: gameState.height * CONSTANTS.LANE_Y[lane], timer: delayOverride !== void 0 ? delayOverride : CONSTANTS.VERBS.afterimage.delay, fade: 22, fired: false, color: buildColor() });
  }
  function fireAfterimage(ai) {
    const V = CONSTANTS.VERBS.afterimage;
    let hit = false;
    for (const en of gameState.enemies) {
      if (en.lane !== ai.lane || en.x < ai.x - 20 || en.x > ai.x + V.reach || en.hp <= 0) continue;
      let dmg = Math.round(V.damage * gameState.stats.powerMult);
      if (en.isBoss) dmg = gateBossDamage(en, dmg);
      en.hp -= dmg;
      en.stun = Math.max(en.stun, en.isBoss ? 6 : V.stun);
      createImpact(en.x, en.y - 60, ai.color);
      createShatter(en.x, en.y - 70, ai.color);
      spawnFloatingText(en.x, en.y - 120, "ECHO!", ai.color);
      hit = true;
    }
    if (hit) {
      gameState.combo++;
      if (gameState.combo > gameState.statMaxCombo) gameState.statMaxCombo = gameState.combo;
      addScore(CONSTANTS.SCORE.hit.hook, ai.x + 80, ai.y - 110);
      playSound("hit");
      gameState.shake = Math.max(gameState.shake, 6);
    }
  }
  function updateAfterimages() {
    if (!gameState.afterimages || !gameState.afterimages.length) return;
    for (const ai of gameState.afterimages) {
      if (!ai.fired) {
        if (--ai.timer <= 0) {
          ai.fired = true;
          fireAfterimage(ai);
        }
      } else ai.fade--;
    }
    gameState.afterimages = gameState.afterimages.filter((ai) => !ai.fired || ai.fade > 0);
  }
  function activateInstinct(zone = false) {
    gameState.isInstinct = true;
    gameState.instinctReadyTimer = 0;
    if (HUD.instinctBanner) HUD.instinctBanner.style.display = "none";
    if (HUD.barCont) HUD.barCont.classList.add("beast-active");
    doFlash(0.5);
    gameState.shake = 20;
    gameState.hitstop = 10;
    triggerShockwave(gameState.player.x, gameState.player.y - 50, "#ffffff");
    playSound("perfect_slip");
    if (zone) {
      gameState.zoneTimer = CONSTANTS.ZONE.frames;
      gameState.zoneHold = 0;
      playSound("zone");
      spawnFloatingText(gameState.player.x, gameState.player.y - 140, "THE ZONE", "#ffffff");
    }
  }
  function triggerPerfectSlip(bossSlipped, slipQuality) {
    tmSlip(slipQuality);
    if (slipQuality === "perfect") {
      const zoneReady = gameState.instinctMeter >= 100 && !gameState.isInstinct;
      if (HUD.slipPopup) {
        HUD.slipPopup.innerText = "PERFECT SLIP";
        HUD.slipPopup.style.color = "#ffffff";
        HUD.slipPopup.style.textShadow = "0 0 24px #00ffff";
      }
      gameState.player.flowStreak = (gameState.player.flowStreak || 0) + 1;
      const flowMult = getFlowMultiplier(gameState);
      if (gameState.progressionMods.flowState && (gameState.player.flowStreak === 10 || gameState.player.flowStreak === 25)) {
        spawnFloatingText(gameState.player.x, gameState.player.y - 110, "FLOW STATE!", "#ff8ad8");
      }
      if (!gameState.isInstinct) {
        let gain = 20 * gameState.stats.techMult * (1 + gameState.progressionMods.perfectSlipRewardBonusMult) * flowMult;
        gain *= CONSTANTS.affixMod(gameState.currentAffix, "instinctGainMult", 1);
        gameState.instinctMeter = Math.min(100, gameState.instinctMeter + gain);
      }
      const slipHeal = gameState.progressionMods.perfectSlipHeal + CONSTANTS.affixMod(gameState.currentAffix, "perfectSlipHeal", 0);
      if (slipHeal > 0) gameState.health = Math.min(gameState.maxHealth, gameState.health + slipHeal);
      gameState.shake = 10;
      doFlash(0.2);
      playSound("perfect_slip");
      gameState.statTotalSlips++;
      addScore(CONSTANTS.SCORE.perfectSlip, gameState.player.x + 40, gameState.player.y - 120);
      gameState.exp += Math.floor(2 * (1 + gameState.progressionMods.expGainBonusMult) * flowMult);
      gameState.player.slipBuff = gameState.orbCounts.technique >= 2 ? 2 : 1;
      spawnFloatingText(gameState.player.x, gameState.player.y - 80, "COUNTER READY!", "#ffffff");
      gameState.hitstop += 8;
      if (gameState.orbCounts.speed >= 4) gameState.player.moveCancelReady = true;
      if (bossSlipped && gameState.orbCounts.technique >= 4) {
        bossSlipped.exposedTimer = 90 + gameState.progressionMods.bossExposeBonusFrames;
        spawnFloatingText(bossSlipped.x, bossSlipped.y - 140, "EXPOSED!", "#00ffff");
        playSound("feint_tell");
      }
      if (zoneReady) activateInstinct(true);
    } else if (slipQuality === "good") {
      if (HUD.slipPopup) {
        HUD.slipPopup.innerText = "GOOD SLIP";
        HUD.slipPopup.style.color = "#ff8ad8";
        HUD.slipPopup.style.textShadow = "0 0 10px #ff00ff";
      }
      if (!gameState.isInstinct) {
        gameState.instinctMeter = Math.min(100, gameState.instinctMeter + 5 * gameState.stats.techMult);
      }
      gameState.shake = 3;
      playSound("slip");
      addScore(CONSTANTS.SCORE.goodSlip, gameState.player.x + 40, gameState.player.y - 120);
    }
    if (HUD.slipPopup) {
      HUD.slipPopup.style.opacity = 1;
      setTimeout(() => {
        if (HUD.slipPopup) HUD.slipPopup.style.opacity = 0;
      }, 500);
    }
  }
  function startPunch(t, charge = 0) {
    if (gameState.player.state === "guarding") gameState.player.state = "idle";
    tmAttack(t);
    gameState.player.state = "punching";
    gameState.player.punchType = t;
    gameState.player.didHit = false;
    gameState.player.moveCancelReady = false;
    gameState.player.comboWindow = 0;
    gameState.player.charging = false;
    gameState.player.crossLoaded = t === "cross" && !!gameState.progressionMods.loadedCross && charge >= CONSTANTS.VERBS.loadedCross.chargeFrames;
    let isJab1 = t === "jab1", isJab2 = t === "jab2", isJab3 = t === "jab3";
    if (isJab1) gameState.player.jabStep = 1;
    else if (isJab2) gameState.player.jabStep = 2;
    else if (isJab3) gameState.player.jabStep = 3;
    else gameState.player.jabStep = 0;
    if (gameState.progressionMods.dempseyCircuit && gameState.player.lastPunchLanded) {
      let lastWasJab = gameState.player.lastPunchLanded.startsWith("jab");
      let thisIsHook = t === "hook";
      let lastWasHook = gameState.player.lastPunchLanded === "hook";
      let thisIsJab = t.startsWith("jab");
      if (lastWasJab && thisIsHook || lastWasHook && thisIsJab) gameState.player.dempseyActive = true;
      else gameState.player.dempseyActive = false;
    } else {
      gameState.player.dempseyActive = false;
    }
    let sF = Math.max(0.35, (gameState.isInstinct ? 0.6 : 1) * (1 / gameState.stats.speedMult));
    let cF = Math.max(0.35, (gameState.isInstinct ? 0.6 : 1) * (1 / (1 + (gameState.stats.speedMult - 1) * 0.4)));
    if (isJab1 || isJab2 || t === "guard_jab") {
      gameState.player.punchTimer = Math.max(5, gameState.orbCounts.speed >= 2 ? Math.floor(5 * sF) : Math.floor(8 * sF));
      gameState.player.hitFrame = Math.max(2, Math.floor(2 * sF));
    } else if (isJab3) {
      gameState.player.punchTimer = Math.max(6, gameState.orbCounts.speed >= 2 ? Math.floor(7 * sF) : Math.floor(12 * sF));
      gameState.player.hitFrame = Math.max(2, Math.floor(3 * sF));
    } else if (t === "cross") {
      gameState.player.punchTimer = Math.max(12, Math.floor(22 * cF));
      gameState.player.hitFrame = Math.max(4, Math.floor(8 * cF));
    } else if (t === "hook" || t === "check_hook") {
      gameState.player.punchTimer = Math.max(8, Math.floor(16 * sF));
      gameState.player.hitFrame = Math.max(3, Math.floor(6 * sF));
    }
    if ((gameState.zoneTimer || 0) > 0 && t !== "guard_jab" && t !== "check_hook") {
      const tgt = gameState.enemies.filter((e) => e.lane === gameState.player.lane && e.x > gameState.player.x && e.x - gameState.player.x < 320).sort((a, b) => a.x - b.x)[0];
      if (tgt && tgt.x - gameState.player.x > 95) {
        gameState.player.x = Math.min(tgt.x - 90, FOOTWORK_MAX_X + 120);
        for (let i = 0; i < 6; i++) gameState.particles.push({ x: gameState.player.x - 20 - Math.random() * 40, y: gameState.player.y - 30 - Math.random() * 60, vx: -9, vy: 0, life: 0.5, color: "#ffffff", type: "dash_line" });
      }
    }
    if (gameState.player.pivotTimer > 0 && t !== "guard_jab" && t !== "check_hook") {
      gameState.player.hitFrame = 1;
      gameState.player.pivotTimer = 0;
    }
    if (gameState.player.slipBuff > 0) {
      playSound("vacuum");
      createVacuum(gameState.player.x + 80, gameState.player.y - 40);
    }
  }
  function takeDamage(amt, isHeavy, en, opts = {}) {
    if ((gameState.player.invuln || 0) > 0) return;
    const PH = CONSTANTS.PLAYER_HIT;
    const guarding = gameState.player.state === "guarding";
    gameState.player.flowStreak = 0;
    gameState.player.charging = false;
    let guardMult = 0.25;
    let piercing = gameState.player.state === "guarding" && en && en.type === "assassin";
    if (piercing) guardMult = 0.6;
    amt = amt * CONSTANTS.affixMod(gameState.currentAffix, "playerDamageTakenMult", 1);
    let actualDmg = gameState.player.state === "guarding" ? Math.floor(amt * guardMult) : Math.floor(amt);
    if (piercing) spawnFloatingText(gameState.player.x, gameState.player.y - 60, "GUARD PIERCED!", "#aa00ff");
    if (gameState.player.state === "guarding" && gameState.progressionMods.guardRead) gameState.player.guardReadTimer = 16;
    gameState.health -= actualDmg;
    tmDamage(opts.src || (en ? en.isBoss ? en.controller : en.type : "hazard"), actualDmg);
    gameState.stageHitsTaken = (gameState.stageHitsTaken || 0) + 1;
    gameState.player.hitStun = isHeavy ? PH.hitStun.heavy : PH.hitStun.light;
    gameState.shake = isHeavy ? 30 : 15;
    gameState.hitstop = Math.max(gameState.hitstop || 0, isHeavy ? PH.hitStop.heavy : PH.hitStop.light);
    gameState.player.slideVx = -(isHeavy ? PH.slide.heavy : PH.slide.light) * gameState.progressionMods.incomingRecoilMult;
    gameState.player.state = "hurt";
    resetJabString();
    gameState.player.charging = false;
    if (opts.floor && !guarding) {
      tmFloored(!!opts.counter);
      gameState.player.state = "floored";
      gameState.player.floorTimer = PH.floorFrames;
      gameState.player.invuln = PH.floorFrames + PH.floorGrace;
      gameState.player.slideVx *= 1.6;
      spawnFloatingText(gameState.player.x + 10, gameState.player.y - 140, opts.counter ? "COUNTERED!" : "DOWN!", "#ff3355");
      playSound("knockdown");
    }
    if (gameState.combo >= 2 && !gameState.isInstinct) spawnFloatingText(gameState.player.x, gameState.player.y - 50, "COMBO BROKEN", "#ff0055");
    gameState.combo = 0;
    if (!gameState.isInstinct) doFlash(isHeavy ? 0.4 : 0.2);
    playSound("hit");
    let sf = document.getElementById("screen-flash");
    if (sf && flashScale() > 0.01) {
      sf.style.background = "red";
      sf.style.opacity = 0.4 * flashScale();
      setTimeout(() => {
        if (sf) {
          sf.style.background = "white";
          sf.style.opacity = 0;
        }
      }, 150);
    }
    if (HUD.health) {
      HUD.health.classList.add("text-red-500", "scale-125");
      setTimeout(() => HUD.health.classList.remove("text-red-500", "scale-125"), 200);
    }
    if (gameState.enemies.some((e) => e.isBoss && e.desperation)) gameState.statDespDamage++;
  }
  var BODY_GAP = 62;
  var FRONT_GAP = 70;
  function resolveBodies(p) {
    for (const e of gameState.enemies) {
      if (e.hp <= 0 || e.controller === "static_monk" || e.x > gameState.width) continue;
      const gap = e.lane === p.lane ? BODY_GAP : FRONT_GAP;
      if (e.x - p.x < gap && e.x > p.x - 200) p.x = Math.max(FOOTWORK_MIN_X, e.x - gap);
    }
  }
  function isEngaged(p) {
    if (p.comboWindow > 0 || p.state === "punching" || p.state === "recovery") return true;
    return gameState.enemies.some((e) => e.hp > 0 && e.lane === p.lane && e.x > p.x - 30 && e.x - p.x < 160);
  }
  function readInput() {
    if ((gameState.inputGrace || 0) > 0) {
      gameState.inputGrace--;
      return { up: false, down: false, ghost: false, jab: false, cross: false, hook: false, instinct: false, guard: false, holdLeft: false, holdRight: false, crossHeld: false };
    }
    const K2 = getBinds();
    const jp = (code) => !!gameState.keys[code] && !gameState.lastKeys[code];
    const pad = gameState.pad;
    return {
      up: pad.up || jp(K2.up),
      down: pad.down || jp(K2.down),
      ghost: pad.ghost || jp(K2.ghost),
      jab: pad.jab || jp(K2.jab),
      cross: pad.cross || jp(K2.cross),
      hook: pad.hook || jp(K2.hook),
      instinct: pad.instinct || jp(K2.instinct),
      guard: !!(pad.guard || gameState.keys[K2.guard]),
      holdLeft: !!(gameState.keys[K2.left] || pad.leftHeld),
      holdRight: !!(gameState.keys[K2.right] || pad.rightHeld),
      crossHeld: !!(gameState.keys[K2.cross] || pad.crossHeld)
    };
  }
  function updatePlayer() {
    const input = readInput();
    const p = gameState.player;
    gameState.scrollX += (gameState.isInstinct ? 20 : 8) * (gameState.stageSpeedMult || 1);
    if (p.invuln > 0) p.invuln--;
    if (p.pivotTimer > 0) p.pivotTimer--;
    if (p.slipCooldown > 0) p.slipCooldown--;
    if (p.ghostStepCooldown > 0) {
      p.ghostStepCooldown--;
      if (p.ghostStepCooldown <= 0) {
        const maxGhostCharges = gameState.progressionMods.blurStep ? 2 : 1;
        p.ghostStepCharges = Math.min(maxGhostCharges, (p.ghostStepCharges || 0) + 1);
        if (p.ghostStepCharges < maxGhostCharges) p.ghostStepCooldown = Math.max(10, Math.floor(60 * gameState.progressionMods.ghostStepCooldownMult));
      }
    }
    if (p.guardReadTimer > 0) p.guardReadTimer--;
    updateAfterimages();
    const targetY = gameState.height * CONSTANTS.LANE_Y[p.lane];
    p.y += (targetY - p.y) * 0.25;
    if (p.state !== "hurt" && p.state !== "punching") {
      if (input.holdRight) p.x = Math.min(FOOTWORK_MAX_X, p.x + FOOTWORK_ADVANCE_SPD);
      else if (input.holdLeft) p.x = Math.max(FOOTWORK_MIN_X, p.x - FOOTWORK_RETREAT_SPD);
      else if (!FW.holdGroundWhenEngaged || !isEngaged(p)) p.x += (180 - p.x) * FOOTWORK_HOME_PULL;
    }
    resolveBodies(p);
    if (input.instinct && gameState.instinctMeter >= 100 && !gameState.isInstinct) activateInstinct(false);
    if (p.inputBufferTimer > 0) {
      if (--p.inputBufferTimer <= 0) {
        p.inputBuffer = null;
        p.bufferedCharge = 0;
      }
    }
    if (p.movementBufferTimer > 0) {
      if (--p.movementBufferTimer <= 0) p.movementBuffer = null;
    }
    if (p.slideVx && Math.abs(p.slideVx) > 0.2) {
      p.x = Math.max(FOOTWORK_MIN_X, p.x + p.slideVx);
      p.slideVx *= 0.8;
    } else p.slideVx = 0;
    if (p.state === "floored") {
      if (--p.floorTimer <= 0) {
        p.state = "idle";
        gameState.inputGrace = 6;
      }
      return;
    }
    if (p.state === "hurt") {
      if (--p.hitStun <= 0) p.state = "idle";
      return;
    }
    if (p.state === "recovery") {
      if (--p.recoveryTimer <= 0) p.state = "idle";
    } else if (p.state === "ghost_step") {
      if (--p.ghostStepTimer <= 0) p.state = "idle";
    }
    let crossAttempt = input.cross, crossCharge = 0;
    if (gameState.progressionMods.loadedCross) {
      const LC = CONSTANTS.VERBS.loadedCross;
      crossAttempt = false;
      if (input.cross) {
        p.charging = true;
        p.crossCharge = 0;
      }
      if (p.charging) {
        if (input.crossHeld) {
          p.crossCharge = Math.min(LC.maxFrames, p.crossCharge + 1);
          if (p.crossCharge === LC.chargeFrames) playSound("charge_ready");
        } else {
          crossAttempt = true;
          crossCharge = p.crossCharge;
          p.charging = false;
        }
      }
    }
    if (input.guard) {
      if (p.state === "idle" && !p.charging) {
        p.state = "guarding";
        gameState.combo = 0;
        resetJabString();
      }
    } else {
      if (p.state === "guarding") {
        p.state = "idle";
        if (p.guardReadTimer > 0 && gameState.progressionMods.guardRead) {
          p.guardReadTimer = 0;
          p.slipBuff = Math.max(p.slipBuff, 1);
          playSound("perfect_slip");
          doFlash(0.15);
          gameState.shake = Math.max(gameState.shake, 6);
          spawnFloatingText(p.x, p.y - 80, "GUARD READ!", "#ffffff");
        }
      }
    }
    let canAct = p.state === "idle" || p.state === "guarding";
    const moveAction = input.up ? "up" : input.down ? "down" : input.ghost ? "ghost" : null;
    const attackAction = input.jab ? "jab" : crossAttempt ? "cross" : input.hook ? "hook" : null;
    let attemptMovement = !!moveAction || input.guard;
    if (!canAct && p.moveCancelReady && attemptMovement && p.state !== "ghost_step") {
      canAct = true;
      p.moveCancelReady = false;
      p.state = "idle";
      createImpact(p.x, p.y - 50, "#00ffff");
      playSound("slip");
    }
    if (canAct) {
      if (attackAction) {
        if (p.charging && attackAction !== "cross") p.charging = false;
        if (Math.abs(p.y - targetY) < 5) executeAttackInput(attackAction, crossCharge);
        else {
          p.inputBuffer = attackAction;
          p.bufferedCharge = crossCharge;
          p.inputBufferTimer = 12;
        }
      } else if (moveAction) {
        if (p.state === "guarding") p.state = "idle";
        if (moveAction === "ghost") p.charging = false;
        executeMovementInput(moveAction);
      } else if (input.guard && !p.charging) {
        executeMovementInput("guard");
      } else {
        if (p.state === "guarding") p.state = "idle";
      }
    } else if (p.state === "punching" || p.state === "recovery") {
      if (attackAction) {
        p.inputBuffer = attackAction;
        p.bufferedCharge = crossCharge;
        p.inputBufferTimer = 12;
      } else if (moveAction) {
        p.movementBuffer = moveAction;
        p.movementBufferTimer = 12;
      }
    }
    if (p.state === "idle" || p.state === "guarding") {
      if (p.comboWindow > 0) {
        if (--p.comboWindow <= 0) resetJabString();
      }
      if (p.movementBuffer) {
        let c = p.movementBuffer;
        p.movementBuffer = null;
        p.movementBufferTimer = 0;
        executeMovementInput(c);
      } else if (p.inputBuffer) {
        if (Math.abs(p.y - targetY) < 5) {
          let c = p.inputBuffer, ch = p.bufferedCharge || 0;
          p.inputBuffer = null;
          p.bufferedCharge = 0;
          p.inputBufferTimer = 0;
          executeAttackInput(c, ch);
        }
      }
    }
    if (p.state === "punching") {
      p.punchTimer--;
      if (p.hitFrame > 0) {
        p.hitFrame--;
        if (p.hitFrame === 0) {
          p.didHit = checkHit(p.punchType);
          if (p.didHit) tmLanded(p.punchType);
        }
      }
      if (p.punchTimer <= 0) {
        if (!p.didHit) {
          p.state = "recovery";
          let isJab = p.punchType && p.punchType.startsWith("jab"), iGP = p.punchType === "guard_jab" || p.punchType === "check_hook";
          p.recoveryTimer = isJab || p.punchType === "guard_jab" ? 6 : p.punchType === "hook" || p.punchType === "check_hook" ? Math.floor(9 * gameState.progressionMods.hookRecoveryMult) : 13;
          if (p.dempseyActive) p.recoveryTimer = Math.max(1, Math.floor(p.recoveryTimer * (1 - gameState.progressionMods.dempseyRecoveryBonus)));
          const circuitSafe = gameState.progressionMods.infiniteCircuit && p.dempseyActive;
          if (circuitSafe) {
          } else if (isJab && !iGP) {
            if (gameState.progressionMods.relentlessRhythm && (p.punchType === "jab1" || p.punchType === "jab2")) {
              gameState.combo = Math.max(0, gameState.combo - 1);
            } else if (gameState.orbCounts.speed < 2) {
              gameState.combo = Math.max(0, gameState.combo - 1);
            } else {
              gameState.combo = 0;
            }
          } else if (!iGP) gameState.combo = 0;
          resetJabString();
          let cD = gameState.enemies.find((e) => e.tutorialType === "counter");
          if (cD) {
            spawnFloatingText(p.x, p.y - 50, "MISSED! TRY AGAIN!", "#ffaa00");
            cD.x = p.x + 250;
            cD.attackCooldown = cD.maxCooldown;
            cD.justAttacked = 0;
            p.slipBuff = 1;
          }
        } else {
          p.state = "idle";
          p.comboWindow = p.dempseyActive ? 35 : 25;
          if (gameState.progressionMods.infiniteCircuit && p.dempseyActive) {
            p.dempseyAlternations = (p.dempseyAlternations || 0) + 1;
            if (p.dempseyAlternations % 4 === 0) {
              p.slipBuff = Math.max(p.slipBuff, 1);
              spawnFloatingText(p.x, p.y - 100, "CIRCUIT CHARGED", CONSTANTS.FUSION_COLORS.evo_infinite_circuit);
            }
          }
          p.lastPunchLanded = p.punchType;
        }
        p.crossLoaded = false;
      }
    }
  }

  // src/entities/enemies.js
  function applyKnockback(en) {
    en.x += en.vx;
    en.vx *= 0.85;
  }
  function atHoldLine(en) {
    if (en.isBoss || en.tutorialType) return false;
    let line = gameState.player.x + (en.type === "zoner" ? CONSTANTS.HOLD_LINE.zoner : CONSTANTS.HOLD_LINE.melee);
    line = Math.min(line, CONSTANTS.FOOTWORK.maxX + CONSTANTS.HOLD_LINE.reach);
    return en.x <= line;
  }
  function endAttack(en) {
    if ((en.stringLen || 1) > 1 && (en.stringIdx || 0) < en.stringLen - 1) {
      en.stringIdx = (en.stringIdx || 0) + 1;
      en.attackCooldown = CONSTANTS.PUNCH_STRINGS.gap;
      if (en.lane !== gameState.player.lane && Math.abs(en.lane - gameState.player.lane) === 1) en.lane = gameState.player.lane;
      return;
    }
    en.stringIdx = 0;
    if (en.type === "bruiser") en.currentMove = "bash";
    en.attackCooldown = en.maxCooldown;
  }
  function applyMenace(en) {
    const M = CONSTANTS.MENACE;
    if (!M) return;
    en.menace = (en.menace || 0) + 1;
    const lvl = Math.min(M.maxLevel, Math.floor(en.menace / M.framesPerLevel));
    if (lvl <= (en.menaceLevel || 0)) return;
    en.menaceLevel = lvl;
    const cfg = en.type === "bruiser" ? M.bruiser : M.zoner;
    en.maxCooldown = Math.max(cfg.minCooldown, en.maxCooldown - cfg.cooldownCutPerLevel);
    if (cfg.speedBonusPerLevel) en.speed = (en.baseSpeed || en.speed) * (1 + cfg.speedBonusPerLevel * lvl);
    en.color = cfg.colors[Math.min(lvl, cfg.colors.length - 1)] || en.color;
    spawnFloatingText(en.x, en.y - 100, en.type === "bruiser" ? "HARDENING" : "CHARGING FASTER", en.type === "bruiser" ? "#ff3030" : "#66ff33");
  }
  function updateEnemies() {
    gameState.enemies.sort((a, b) => a.x - b.x);
    let blockedX = [-1e3, -1e3, -1e3];
    let frontEnemy = [null, null, null];
    gameState.laneFlash[0] = gameState.laneFlash[1] = gameState.laneFlash[2] = 0;
    gameState.player.dangerLevel = 0;
    gameState.enemies.forEach((en) => {
      if (en.x >= gameState.player.x - 60) {
        if (!frontEnemy[en.lane] || en.x < frontEnemy[en.lane].x) {
          frontEnemy[en.lane] = en;
        }
      }
      if (en.mashDecay > 0) {
        en.mashDecay--;
        if (en.mashDecay <= 0) en.bossMashCount = 0;
      }
      if (en.stunDecay > 0) {
        en.stunDecay--;
        if (en.stunDecay <= 0) en.hitstunScaling = 0;
      }
      if (en.pressureDecay > 0) {
        en.pressureDecay--;
        if (en.pressureDecay <= 0) en.pressure = 0;
      }
      if ((en.type === "bruiser" || en.type === "zoner") && !en.isBoss && !en.tutorialType && en.x < gameState.width && gameState.tutorialGrace <= 0) {
        applyMenace(en);
      }
      if (en.isBoss) {
        if (en.shiftWarning > 0) en.shiftWarning--;
        if (en.shiftCooldown > 0) en.shiftCooldown--;
        if (en.exposedTimer > 0) en.exposedTimer--;
      }
    });
    gameState.enemies.forEach((en) => {
      en.isActiveThreat = (frontEnemy[en.lane] === en || en.isBoss || en.tutorialType || en.type === "zoner") && en.x > gameState.player.x - 30;
    });
    for (let i = 0; i < gameState.enemies.length; i++) {
      const en = gameState.enemies[i];
      if (en.tutorialType && !gameState.seenTutorials[en.tutorialType] && en.x < gameState.player.x + 250) {
        if (en.tutorialType === "slip") {
          let slipText = 'When a lane flashes <span class="text-pink-500 font-bold">RED</span>, an attack is winding up.<br><br>Wait for it to flash <span class="text-white font-bold">WHITE</span>, then press <span class="text-cyan-400 font-bold">[UP]</span> or <span class="text-cyan-400 font-bold">[DOWN]</span> to Perfect Slip!<br><br>Slipping too early only counts as a <span class="text-gray-300 font-bold">Good Slip</span> &mdash; it resets the attack, but only a <span class="text-white font-bold">Perfect Slip</span> clears this one.<br><br>' + (gameState.runCount <= 1 ? "<i>Land a Perfect Slip to pass!</i>" : "<i>Slip the attack to survive!</i>");
          triggerTutorial("slip", "ENEMY ATTACK", slipText);
        } else if (en.tutorialType === "counter") {
          let counterText = 'Your Perfect Slip was successful!<br><br>Notice the <span class="text-white font-bold">White Energy Rings</span> around your fists.<br><br>You are now holding a <span class="text-white font-bold">Counter Charge</span>. Your next strike will deal massive damage, shatter their posture, and cause extra hitstop.<br><br>' + (gameState.runCount <= 1 ? "<i>Strike this dummy enemy to unleash it!</i>" : "<i>Strike an enemy to unleash it!</i>");
          triggerTutorial("counter", "COUNTER READY", counterText);
        } else if (en.tutorialType === "shield") {
          triggerTutorial("shield", "GOLD ARMOR", `Enemies with Gold Armor will block your Jabs.<br><br>Use your <span class="text-cyan-400 font-bold">CROSS [${keyName("cross")}]</span> to shatter their defense!<br><br><i>Break the armor to pass!</i>`);
        } else if (en.tutorialType === "guard") {
          triggerTutorial("guard", "GUARDING", `Guard is the stable answer when timing gets crowded, even if a clean slip is possible.<br><br>Hold <span class="text-cyan-400 font-bold">[${keyName("guard")}]</span> to Guard &mdash; it cuts incoming damage by 75% against <i>most</i> attackers.<br><br>Not all, though. A few enemies bite through Guard far more than that. You will get a specific heads-up the first time one shows up &mdash; watch for it.<br><br><i>Guard the next attack to pass!</i>`);
        } else if (en.tutorialType === "ghost_step") {
          triggerTutorial("ghost_step", "GHOST STEP", `This one is too fast to jab, guard, or slip cleanly.<br><br>Press <span class="text-cyan-400 font-bold">[${keyName("ghost")}]</span> for a Ghost Step &mdash; a short evasive dash with a moment of invincibility.<br><br><i>Ghost Step the next attack to pass!</i>`);
        }
        return;
      }
      if (!en.tutorialType && en.isActiveThreat && en.x - gameState.player.x < 400) {
        if (en.type === "bruiser" && !en.isBoss && !gameState.seenTutorials.bruiser_id) {
          triggerTutorial("bruiser_id", "ARMORED BRUISER", `This one shrugs off Jabs entirely.<br><br>Jabs still chip its health, but only a <span class="text-cyan-400 font-bold">CROSS [${keyName("cross")}]</span> &mdash; or a Counter Hit &mdash; actually staggers it.`);
          return;
        }
        if ((en.stringLen || 1) > 1 && !en.isBoss && !gameState.seenTutorials.string_id) {
          triggerTutorial("string_id", "PUNCH STRING", `This one throws <span class="text-white font-bold">${en.stringLen} punches</span> in a row &mdash; the pips above its head count them.<br><br>Each punch follows you into your new lane and gets its own red &rarr; white tell.<br><br><span class="text-cyan-400 font-bold">Slip every one.</span> Answering only the first is how a string catches you.`);
          return;
        }
        if (en.type === "assassin" && !en.isBoss && !gameState.seenTutorials.assassin_id) {
          triggerTutorial("assassin_id", "ASSASSIN", 'This is the exception the Guard tutorial warned you about.<br><br>Guard normally blocks 75% of incoming damage. Against an Assassin, only about 40% gets blocked &mdash; the rest bites through.<br><br>You have to actually read it and <span class="text-cyan-400 font-bold">SLIP [UP/DOWN]</span>, not just Guard.');
          return;
        }
      }
      if (en.stun > 0 || gameState.bossIntroTimer > 0) {
        if (en.vx > 0.1) applyKnockback(en);
        continue;
      }
      if (en.type === "zoner") {
        if (gameState.tutorialGrace <= 0 && en.x > gameState.player.x - 20) {
          if (en.name === "STATIC MONK") continue;
          if (Math.abs(en.x - gameState.player.x) < 500) {
            if (en.attackCooldown === 40 && en.isActiveThreat) playSound("zoner_tell");
            en.attackCooldown--;
            if (en.attackCooldown <= 0) {
              en.justAttacked = 5;
              createImpact(gameState.player.x + 50, en.y - 60, "#00ff00");
              if (en.isActiveThreat) playSound("laser");
              if (en.lane === gameState.player.lane) {
                if (gameState.player.state === "ghost_step") {
                  spawnFloatingText(gameState.player.x, gameState.player.y - 50, "EVADED", "#888888");
                  registerPerfectGhostStep();
                  if (gameState.progressionMods.ghostCounter && gameState.player.slipBuff === 0) {
                    gameState.player.slipBuff = 1;
                    playSound("perfect_slip");
                    spawnFloatingText(gameState.player.x, gameState.player.y - 80, "GHOST COUNTER!", "#ffffff");
                  }
                } else {
                  let zDmg = 25;
                  if (gameState.isInstinct) zDmg = Math.floor(zDmg * 0.5);
                  takeDamage(zDmg, true, en);
                }
              }
              en.attackCooldown = en.maxCooldown;
            }
          }
        }
        continue;
      }
      if (en.isActiveThreat && en.name !== "STATIC MONK") {
        const { perfect: perfectThresh, good: goodThresh } = CONSTANTS.getSlipThresholds(en.type, gameState.progressionMods.perfectSlipWindowBonus);
        if (Math.abs(en.x - gameState.player.x) < 130) {
          if (en.attackCooldown <= perfectThresh) gameState.laneFlash[en.lane] = 2;
          else if (en.attackCooldown <= goodThresh + 6) gameState.laneFlash[en.lane] = Math.max(gameState.laneFlash[en.lane], 1);
        }
        if (en.isBoss && en.telegraphed && !(en.recoverTimer > 0) && Math.abs(en.x - gameState.player.x) < 140 && en.attackCooldown > perfectThresh) {
          gameState.laneFlash[en.lane] = Math.max(gameState.laneFlash[en.lane], 1);
        }
        if (en.lane === gameState.player.lane && Math.abs(en.x - gameState.player.x) < 130 && en.attackCooldown > 0) {
          if (en.attackCooldown <= perfectThresh) gameState.player.dangerLevel = Math.max(gameState.player.dangerLevel, 2);
          else if (en.attackCooldown <= goodThresh) gameState.player.dangerLevel = Math.max(gameState.player.dangerLevel, 1);
        }
      }
    }
    for (let i = 0; i < gameState.enemies.length; i++) {
      const en = gameState.enemies[i];
      if (en.trails) {
        en.trails.forEach((t) => t.opacity -= 0.05);
        en.trails = en.trails.filter((t) => t.opacity > 0);
        if (en.isBoss && en.name === "PHANTOM BOXER" && (en.currentMove === "feint" || en.phase === 2) && gameState.bossIntroTimer <= 0) {
          en.trailTimer--;
          if (en.trailTimer <= 0 || en.trailTimer === void 0) {
            en.trails.push({ x: en.x, y: en.y, lane: en.lane, opacity: 0.5 });
            en.trailTimer = en.phase === 2 ? 3 : 5;
            if (en.trails.length > 5) en.trails.shift();
          }
        }
      }
      if (gameState.bossIntroTimer > 0 && en.isBoss) continue;
      if (en.justAttacked > 0) en.justAttacked--;
      if (en.stunResist > 0) en.stunResist--;
      if (en.stun > 0) {
        en.stun--;
      } else {
        let isBlockedByEnemy = false;
        if (!en.isBoss) {
          if (en.x < blockedX[en.lane] + 90) isBlockedByEnemy = true;
          blockedX[en.lane] = Math.max(blockedX[en.lane], en.x);
        }
        let isAtPlayer = en.lane === gameState.player.lane && en.x <= gameState.player.x + 90 && en.x >= gameState.player.x - 20;
        if (en.vx > 0.1) {
          applyKnockback(en);
          let isBowling = gameState.orbCounts.power >= 4 && en.vx > 5;
          gameState.enemies.forEach((other) => {
            if (other !== en && other.lane === en.lane && other.x > en.x - 20 && other.x < en.x + 120) {
              if (isBowling) {
                other.x += en.vx * 0.8;
                other.hp -= 25;
                if (other.stun <= 0) other.stun = 15;
                createImpact(other.x, other.y - 50, "#ff0055");
              } else {
                if (en.vx > 3) {
                  other.x += en.vx * 0.5;
                  if (other.stun <= 0) other.stun = 5;
                }
              }
            }
          });
        } else {
          en.vx = 0;
          if (en.isBoss && en.x < gameState.player.x + 100 && en.name !== "STATIC MONK") {
            en.x = gameState.player.x + 100;
          } else if (!isBlockedByEnemy && !isAtPlayer && !atHoldLine(en) && gameState.tutorialGrace <= 0 && en.name !== "STATIC MONK") {
            en.x -= en.speed;
          }
        }
        en.y += (gameState.height * CONSTANTS.LANE_Y[en.lane] - en.y) * 0.3;
        if (en.isBoss) continue;
        if ((en.stringIdx || 0) > 0 && en.lane !== gameState.player.lane && Math.abs(en.lane - gameState.player.lane) === 1) en.lane = gameState.player.lane;
        if (en.lane !== gameState.player.lane && !en.tutorialType && Math.abs(en.x - gameState.player.x) < 130) {
          en.attackCooldown = Math.max(en.attackCooldown, CONSTANTS.getSlipThresholds(en.type).good + 12);
        }
        if (Math.abs(en.x - gameState.player.x) < 130 && !isBlockedByEnemy && gameState.tutorialGrace <= 0 && (en.lane === gameState.player.lane || en.tutorialType)) {
          if (en.attackCooldown === 22 && en.isActiveThreat) {
            if (en.type === "bruiser") playSound("bash_tell");
            else playSound("jab_tell");
          }
          en.attackCooldown--;
          if (en.attackCooldown <= 0) {
            en.justAttacked = 5;
            if (gameState.player.state === "ghost_step" && gameState.player.ghostStepTimer > 4 && isAtPlayer && en.isActiveThreat) {
              spawnFloatingText(gameState.player.x, gameState.player.y - 50, "GHOST STEP", "#888888");
              if (!en.tutorialType) registerPerfectGhostStep();
              if (gameState.progressionMods.ghostCounter && gameState.player.slipBuff === 0) {
                gameState.player.slipBuff = 1;
                playSound("perfect_slip");
                spawnFloatingText(gameState.player.x, gameState.player.y - 80, "GHOST COUNTER!", "#ffffff");
              }
              if (en.tutorialType === "ghost_step") {
                en.hp = 0;
              }
              endAttack(en);
              continue;
            }
            if (en.tutorialType) {
              if (en.tutorialType === "slip") {
                if (en.hp > 0) {
                  gameState.tutorialSlipFails = (gameState.tutorialSlipFails || 0) + 1;
                  if (gameState.tutorialSlipFails >= 8) {
                    en.hp = 0;
                    spawnFloatingText(gameState.player.x, gameState.player.y - 50, "SKIPPING AHEAD \u2014 PRACTICE THE PERFECT SLIP TIMING", "#ffaa00");
                    continue;
                  }
                  spawnFloatingText(gameState.player.x, gameState.player.y - 50, "WAIT FOR WHITE FLASH TO SLIP!", "#ffaa00");
                  en.x = gameState.player.x + 200;
                  en.attackCooldown = en.maxCooldown;
                  gameState.player.lane = 1;
                  gameState.player.y = gameState.height * CONSTANTS.LANE_Y[gameState.player.lane];
                  gameState.player.x = 180;
                  continue;
                }
              }
              if (en.tutorialType === "shield") {
                spawnFloatingText(gameState.player.x, gameState.player.y - 50, `USE CROSS [${keyName("cross")}] TO BREAK!`, "#ffaa00");
                en.x = gameState.player.x + 200;
                en.attackCooldown = en.maxCooldown;
                continue;
              }
              if (en.tutorialType === "guard") {
                if (gameState.player.state === "guarding") {
                  spawnFloatingText(gameState.player.x, gameState.player.y - 50, "GUARD SUCCESS!", "#00ffff");
                  en.hp = 0;
                  playSound("hit");
                } else {
                  spawnFloatingText(gameState.player.x, gameState.player.y - 50, `HOLD [${keyName("guard")}] TO GUARD!`, "#ffaa00");
                  en.x = gameState.player.x + 200;
                  en.attackCooldown = en.maxCooldown;
                  gameState.player.lane = 1;
                  gameState.player.y = gameState.height * CONSTANTS.LANE_Y[gameState.player.lane];
                  gameState.player.x = 180;
                }
                continue;
              }
            }
            if (en.lane === gameState.player.lane && Math.abs(en.x - gameState.player.x) < 100 && en.tutorialType !== "counter" && en.tutorialType !== "ghost_step" && en.x > gameState.player.x - 30) {
              let isHeavy = en.type === "bruiser";
              let rawDmg = isHeavy ? 30 : 12;
              if (isHeavy) rawDmg = Math.round(rawDmg * CONSTANTS.affixMod(gameState.currentAffix, "bruiserDamageMult", 1));
              if (gameState.isInstinct) rawDmg = Math.floor(rawDmg * 0.5);
              takeDamage(rawDmg, isHeavy, en);
            } else if (en.tutorialType === "counter" && Math.abs(en.x - gameState.player.x) < 100) {
              spawnFloatingText(gameState.player.x, gameState.player.y - 50, "STRIKE BEFORE IT HITS YOU!", "#ffaa00");
              en.x = gameState.player.x + 200;
              en.attackCooldown = en.maxCooldown;
              gameState.player.slipBuff = 1;
              continue;
            } else if (en.tutorialType === "ghost_step" && Math.abs(en.x - gameState.player.x) < 100) {
              spawnFloatingText(gameState.player.x, gameState.player.y - 50, `PRESS [${keyName("ghost")}] TO GHOST STEP!`, "#ffaa00");
              en.x = gameState.player.x + 200;
              en.attackCooldown = en.maxCooldown;
              continue;
            }
            endAttack(en);
          }
        }
      }
    }
    if (gameState.purifyTimer > 0) gameState.purifyTimer--;
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
      const en = gameState.enemies[i];
      if (en.hp <= 0 && en.isBoss && !en.koDone) {
        en.hp = 1;
        if (!en.pendingFinisher && !gameState.finisher) en.pendingFinisher = "ko";
        continue;
      }
      if (en.hp <= 0) {
        gameState.statTotalKills++;
        tmKill(en.isBoss ? en.controller : en.tutorialType ? "dummy" : en.type);
        let comboMult = 1 + Math.min(0.3, Math.floor(gameState.combo / 2) * 0.1);
        const flowMult = getFlowMultiplier(gameState);
        if (en.isBoss) {
          gameState.bossActive = false;
          gameState.stageClearing = true;
          gameState.bossDefeatedThisStage = true;
          gameState.statBossKills++;
          gameState.purifyTimer = 100;
          gameState.health = gameState.maxHealth;
          gameState.instinctMeter = Math.min(100, gameState.instinctMeter + 50 * (1 + gameState.progressionMods.instinctGainBonusMult) * flowMult);
          playSound("perfect_slip");
          gameState.exp += Math.floor(15 * comboMult * (1 + gameState.progressionMods.expGainBonusMult) * flowMult);
          addScore(CONSTANTS.SCORE.bossKo * Math.min(5, CONSTANTS.getArcIndex(gameState.currentStage)), en.x + en.w / 2, en.y - 200, { big: true });
          setMusicIntensity(0);
        } else {
          let instGain = 0;
          let hpGain = 0;
          let baseExp = 1;
          if (en.type === "grunt") {
            instGain = 2;
            baseExp = 1;
          } else if (en.type === "shield") {
            instGain = 5;
            baseExp = 2;
          } else if (en.type === "assassin") {
            instGain = 5;
            baseExp = 2;
          } else if (en.type === "zoner") {
            instGain = 8;
            baseExp = 3;
          } else if (en.type === "bruiser") {
            instGain = 10;
            hpGain = 5;
            showToast("+ VITALITY", "#00ff00");
            baseExp = 4;
          }
          gameState.instinctMeter = Math.min(100, gameState.instinctMeter + instGain * (1 + gameState.progressionMods.instinctGainBonusMult) * flowMult);
          if (hpGain > 0) gameState.health = Math.min(gameState.maxHealth, gameState.health + hpGain);
          gameState.exp += Math.floor(baseExp * comboMult * (1 + gameState.progressionMods.expGainBonusMult) * flowMult);
          if (!en.tutorialType) addScore(killScore(en.type), en.x + en.w / 2, en.y - 130);
        }
        if (en.tutorialType) gameState.tutorialDelay = 60;
        createKoShatter(en);
        gameState.enemies.splice(i, 1);
      } else if (en.x < -100) {
        gameState.enemies.splice(i, 1);
      }
    }
  }

  // src/systems/waves.js
  function applyFormations(defs, arcIndex) {
    const out = defs.map((e) => ({ ...e }));
    let added = 0;
    const cap = CONSTANTS.FORMATION_RULES.maxAddsPerPacket || 2;
    const coveredInFront = (lane, d) => out.some((e) => (e.t === "shield" || e.t === "bruiser") && e.l === lane && e.d < d);
    const pBarricade = CONSTANTS.formationChance("barricade", arcIndex);
    const pScreen = CONSTANTS.formationChance("screen", arcIndex);
    for (const e of defs) {
      if (added >= cap) break;
      if (e.t === "zoner") {
        if (random() < pBarricade && !coveredInFront(e.l, e.d)) {
          out.push({ t: "shield", l: e.l, d: Math.max(0, (e.d || 0) - 30) });
          added++;
        }
      }
    }
    for (const e of defs) {
      if (added >= cap) break;
      if (e.t === "assassin") {
        if (random() < pScreen && !coveredInFront(e.l, e.d)) {
          out.push({ t: "shield", l: e.l, d: Math.max(0, (e.d || 0) - 25) });
          added++;
        }
      }
    }
    return out;
  }
  var ARC_BASE_LEVELS = {
    1: {
      // SHATTERED CATHEDRAL (Fundamentals)
      speedMult: 1,
      packets: [
        [{ t: "grunt", l: 1, d: 0 }, { t: "grunt", l: 0, d: 50 }, { t: "grunt", l: 2, d: 100 }, { b: 60, th: 1 }],
        [{ t: "grunt", l: 0, d: 0 }, { t: "grunt", l: 2, d: 45 }, { t: "grunt", l: 1, d: 90 }, { t: "grunt", l: 1, d: 135 }, { b: 60, th: 1 }],
        [{ t: "shield", l: 1, d: 0 }, { t: "grunt", l: 0, d: 60 }, { t: "grunt", l: 2, d: 120 }, { t: "grunt", l: 1, d: 180 }, { b: 70, th: 1 }],
        [{ t: "grunt", l: 0, d: 0 }, { t: "grunt", l: 2, d: 50 }, { t: "shield", l: 1, d: 100 }, { t: "grunt", l: 1, d: 150 }, { b: 90, th: 0 }]
      ]
    },
    2: {
      // GLASS RELIQUARY (Lane Awareness)
      speedMult: 1.05,
      packets: [
        [{ t: "assassin", l: 1, d: 0 }, { t: "grunt", l: 0, d: 45 }, { t: "grunt", l: 2, d: 90 }, { b: 60, th: 1 }],
        [{ t: "grunt", l: 0, d: 0 }, { t: "assassin", l: 2, d: 40 }, { t: "grunt", l: 1, d: 80 }, { t: "assassin", l: 0, d: 120 }, { b: 60, th: 1 }],
        [{ t: "shield", l: 1, d: 0 }, { t: "assassin", l: 0, d: 50 }, { t: "assassin", l: 2, d: 100 }, { t: "grunt", l: 1, d: 150 }, { b: 60, th: 1 }],
        [{ t: "assassin", l: 1, d: 0 }, { t: "assassin", l: 0, d: 35 }, { t: "assassin", l: 2, d: 70 }, { t: "grunt", l: 1, d: 110 }, { t: "grunt", l: 0, d: 150 }, { b: 90, th: 0 }]
      ]
    },
    3: {
      // ASHEN CLOISTER (Target Prioritization)
      speedMult: 1.1,
      packets: [
        [{ t: "shield", l: 1, d: 0 }, { t: "zoner", l: 1, d: 50 }, { t: "grunt", l: 0, d: 100 }, { t: "grunt", l: 2, d: 150 }, { b: 60, th: 1 }],
        [{ t: "bruiser", l: 1, d: 0 }, { t: "grunt", l: 0, d: 50 }, { t: "grunt", l: 2, d: 100 }, { t: "assassin", l: 1, d: 150 }, { b: 60, th: 1 }],
        [{ t: "zoner", l: 0, d: 0 }, { t: "zoner", l: 2, d: 30 }, { t: "assassin", l: 1, d: 70 }, { t: "grunt", l: 1, d: 110 }, { b: 50, th: 2 }],
        [{ t: "shield", l: 0, d: 0 }, { t: "shield", l: 2, d: 40 }, { t: "zoner", l: 1, d: 80 }, { t: "bruiser", l: 1, d: 140 }, { b: 70, th: 1 }],
        [{ t: "bruiser", l: 1, d: 0 }, { t: "zoner", l: 0, d: 50 }, { t: "zoner", l: 2, d: 90 }, { t: "assassin", l: 1, d: 130 }, { t: "assassin", l: 0, d: 170 }, { b: 90, th: 0 }]
      ]
    },
    4: {
      // MIDNIGHT CAUSEWAY (The Flowing River)
      speedMult: 1.15,
      packets: [
        [{ t: "assassin", l: 1, d: 0 }, { t: "assassin", l: 0, d: 40 }, { t: "assassin", l: 2, d: 40 }, { t: "grunt", l: 1, d: 100 }, { b: 40, th: 2 }],
        [{ t: "assassin", l: 0, d: 0 }, { t: "assassin", l: 2, d: 30 }, { t: "grunt", l: 1, d: 80 }, { t: "assassin", l: 1, d: 120 }, { t: "grunt", l: 0, d: 160 }, { b: 50, th: 2 }],
        [{ t: "grunt", l: 0, d: 0 }, { t: "grunt", l: 1, d: 30 }, { t: "grunt", l: 2, d: 60 }, { t: "assassin", l: 1, d: 100 }, { t: "assassin", l: 0, d: 140 }, { t: "assassin", l: 2, d: 140 }, { b: 60, th: 2 }],
        [{ t: "shield", l: 1, d: 0 }, { t: "assassin", l: 0, d: 40 }, { t: "assassin", l: 2, d: 40 }, { t: "bruiser", l: 1, d: 100 }, { b: 60, th: 1 }],
        [{ t: "assassin", l: 1, d: 0 }, { t: "grunt", l: 0, d: 40 }, { t: "assassin", l: 2, d: 80 }, { t: "grunt", l: 1, d: 120 }, { t: "assassin", l: 0, d: 160 }, { t: "grunt", l: 2, d: 200 }, { b: 90, th: 0 }]
      ]
    },
    5: {
      // ABYSS RAIL (Crack the Formation)
      speedMult: 1.2,
      packets: [
        [{ t: "shield", l: 1, d: 0 }, { t: "zoner", l: 1, d: 40 }, { t: "grunt", l: 0, d: 80 }, { t: "grunt", l: 2, d: 80 }, { t: "assassin", l: 1, d: 140 }, { b: 60, th: 2 }],
        [{ t: "zoner", l: 0, d: 0 }, { t: "zoner", l: 2, d: 0 }, { t: "shield", l: 1, d: 40 }, { t: "grunt", l: 0, d: 90 }, { t: "grunt", l: 2, d: 90 }, { b: 60, th: 2 }],
        [{ t: "shield", l: 0, d: 0 }, { t: "shield", l: 2, d: 0 }, { t: "zoner", l: 0, d: 60 }, { t: "zoner", l: 2, d: 60 }, { t: "assassin", l: 1, d: 120 }, { b: 60, th: 1 }],
        [{ t: "bruiser", l: 1, d: 0 }, { t: "zoner", l: 0, d: 40 }, { t: "zoner", l: 2, d: 40 }, { t: "grunt", l: 1, d: 100 }, { t: "assassin", l: 0, d: 140 }, { b: 70, th: 1 }],
        [{ t: "shield", l: 0, d: 0 }, { t: "shield", l: 1, d: 0 }, { t: "shield", l: 2, d: 0 }, { t: "zoner", l: 1, d: 60 }, { t: "bruiser", l: 1, d: 150 }, { b: 90, th: 0 }]
      ]
    },
    6: {
      // THRONE OF STATIC (The Composure Exam)
      speedMult: 1.25,
      packets: [
        [{ t: "assassin", l: 1, d: 0 }, { t: "shield", l: 0, d: 40 }, { t: "shield", l: 2, d: 40 }, { t: "grunt", l: 1, d: 100 }, { t: "zoner", l: 0, d: 140 }, { b: 50, th: 2 }],
        [{ t: "shield", l: 1, d: 0 }, { t: "zoner", l: 1, d: 40 }, { t: "assassin", l: 0, d: 80 }, { t: "assassin", l: 2, d: 80 }, { t: "bruiser", l: 1, d: 140 }, { b: 50, th: 2 }],
        [{ t: "grunt", l: 0, d: 0 }, { t: "grunt", l: 2, d: 0 }, { t: "assassin", l: 1, d: 40 }, { t: "zoner", l: 0, d: 100 }, { t: "zoner", l: 2, d: 100 }, { t: "shield", l: 1, d: 160 }, { b: 60, th: 1 }],
        [{ t: "bruiser", l: 1, d: 0 }, { t: "shield", l: 0, d: 40 }, { t: "shield", l: 2, d: 40 }, { t: "zoner", l: 0, d: 100 }, { t: "zoner", l: 2, d: 100 }, { b: 60, th: 1 }],
        [{ t: "assassin", l: 0, d: 0 }, { t: "assassin", l: 2, d: 30 }, { t: "shield", l: 1, d: 80 }, { t: "grunt", l: 0, d: 130 }, { t: "grunt", l: 2, d: 130 }, { t: "assassin", l: 1, d: 180 }, { b: 60, th: 1 }],
        [{ t: "shield", l: 0, d: 0 }, { t: "shield", l: 1, d: 0 }, { t: "shield", l: 2, d: 0 }, { t: "zoner", l: 0, d: 80 }, { t: "zoner", l: 2, d: 80 }, { t: "bruiser", l: 1, d: 140 }, { b: 90, th: 0 }]
      ]
    }
  };
  function cloneEnemyDefs(packet) {
    return packet.filter((e) => e.t).map((e) => ({ ...e }));
  }
  function markerOf(packet) {
    return packet.find((e) => !e.t) || { b: 75, th: 1 };
  }
  function ruleEcho(enemies) {
    if (!enemies.length) return enemies;
    const last = enemies[enemies.length - 1];
    const echoLane = (last.l + 1) % 3;
    return [...enemies, { t: last.t === "zoner" ? "grunt" : last.t, l: echoLane, d: last.d + 55 }];
  }
  function rulePincerAndBruiser(enemies) {
    let out = enemies.map((e) => ({ ...e }));
    if (out.length >= 2 && out[0].l === out[1].l) out[1] = { ...out[1], l: (out[1].l + 1) % 3 };
    if (!out.some((e) => e.t === "bruiser")) {
      const midDelay = Math.round(out.reduce((s, e) => s + e.d, 0) / Math.max(1, out.length));
      out.push({ t: "bruiser", l: 1, d: midDelay });
    }
    return out;
  }
  function ruleReadOverGuard(enemies) {
    let assassinToggle = false;
    return enemies.map((e) => {
      if (e.t === "grunt") {
        assassinToggle = !assassinToggle;
        return assassinToggle ? { ...e, t: "assassin" } : e;
      }
      if (e.t === "zoner") return { ...e, d: Math.max(0, e.d - 20) };
      return e;
    });
  }
  function deriveArc(baseLevels, transforms, breatherCut, speedBump) {
    const out = {};
    for (const key of Object.keys(baseLevels)) {
      const base = baseLevels[key];
      const packets = base.packets.map((pkt) => {
        var _a;
        let enemies = cloneEnemyDefs(pkt);
        for (const t of transforms) enemies = t(enemies);
        const marker = markerOf(pkt);
        const newB = Math.max(20, (marker.b || 75) - breatherCut);
        const newTh = Math.max(0, ((_a = marker.th) != null ? _a : 1) - (breatherCut >= 20 ? 1 : 0));
        return [...enemies, { b: newB, th: newTh }];
      });
      out[key] = { speedMult: +(base.speedMult * speedBump).toFixed(3), packets };
    }
    return out;
  }
  var ARC2_LEVELS = deriveArc(ARC_BASE_LEVELS, [ruleEcho], 12, 1.03);
  var ARC3_LEVELS = deriveArc(ARC_BASE_LEVELS, [rulePincerAndBruiser], 16, 1.05);
  var ARC4_LEVELS = deriveArc(ARC_BASE_LEVELS, [ruleReadOverGuard], 20, 1.04);
  var ARC5_LEVELS = deriveArc(ARC_BASE_LEVELS, [ruleEcho, rulePincerAndBruiser, ruleReadOverGuard], 24, 1.08);
  function compressLevel(level, keep, breather = 45) {
    const packets = keep.map((pi, i) => {
      var _a;
      const pkt = level.packets[pi];
      const enemies = cloneEnemyDefs(pkt);
      const marker = markerOf(pkt);
      const last = i === keep.length - 1;
      return [...enemies, { b: last ? marker.b : Math.min(marker.b, breather), th: (_a = marker.th) != null ? _a : 1 }];
    });
    return { speedMult: level.speedMult, packets };
  }
  var ARC1_LEVELS = {
    ...ARC_BASE_LEVELS,
    1: compressLevel(ARC_BASE_LEVELS[1], [0, 2, 3]),
    // grunts -> first armor -> mixed
    2: compressLevel(ARC_BASE_LEVELS[2], [0, 2, 3]),
    // assassin lead -> screened -> finale
    3: compressLevel(ARC_BASE_LEVELS[3], [0, 1, 4]),
    // zoner -> bruiser -> finale
    6: compressLevel(ARC_BASE_LEVELS[6], [0, 1, 3, 5])
    // the composure exam, trimmed
  };
  var ARC_WAVE_TABLES = { 1: ARC1_LEVELS, 2: ARC2_LEVELS, 3: ARC3_LEVELS, 4: ARC4_LEVELS, 5: ARC5_LEVELS };
  function spawnEnemy() {
    if (gameState.stageClearing || gameState.bossActive || gameState.bossIntroTimer > 0 || gameState.screen !== "playing" || gameState.purifyTimer > 0) return;
    if (CONSTANTS.isBossStage(gameState.currentStage)) {
      if (!gameState.bossActive && !gameState.stageClearing) {
        gameState.stageClearing = true;
        gameState.purifyTimer = 90;
      }
      return;
    }
    if (gameState.currentStage === 1 && gameState.tutorialEnabled) {
      if (gameState.spawnTotal < 5) {
        if (gameState.enemies.length > 0 || gameState.tutorialDelay > 0) return;
        if (gameState.spawnTotal === 0) spawnTutorialEnemy("slip");
        else if (gameState.spawnTotal === 1) spawnTutorialEnemy("counter");
        else if (gameState.spawnTotal === 2) spawnTutorialEnemy("shield");
        else if (gameState.spawnTotal === 3) spawnTutorialEnemy("guard");
        else if (gameState.spawnTotal === 4) spawnTutorialEnemy("ghost_step");
        return;
      }
      if (gameState.enemies.some((e) => e.tutorialType)) return;
    }
    if (gameState.pendingUpgrades > 0 && gameState.enemies.length === 0) return;
    if (gameState.waveThreshold === void 0 || gameState.wavesCleared === 0) gameState.waveThreshold = 0;
    if (gameState.enemies.length <= gameState.waveThreshold && gameState.tutorialDelay <= 0) {
      if (gameState.waveTimer > 0) {
        gameState.waveTimer--;
        return;
      }
      const rawArcIndex = CONSTANTS.getArcIndex(gameState.currentStage);
      const law = CONSTANTS.ARC_LAWS[Math.min(rawArcIndex, 5)] || CONSTANTS.ARC_LAWS[5];
      const gm = law.globalMods;
      let packetIndex = CONSTANTS.getLevelInArc(gameState.currentStage);
      let levelData = ARC_WAVE_TABLES[Math.min(rawArcIndex, 5)][packetIndex];
      if (gameState.wavesCleared >= levelData.packets.length) {
        if (gameState.enemies.length === 0) {
          gameState.stageClearing = true;
          gameState.purifyTimer = 60;
        }
        return;
      }
      const affix = gameState.currentAffix;
      const affixDelayMult = CONSTANTS.affixMod(affix, "packetDelayMult", 1);
      const affixSubType = CONSTANTS.affixMod(affix, "gruntSub", null);
      const affixSubEvery = CONSTANTS.affixMod(affix, "gruntSubEvery", 0);
      let gruntSubCounter = 0;
      gameState.stageSpeedMult = levelData.speedMult * gm.railSpeedMult * CONSTANTS.affixMod(affix, "speedMult", 1);
      let packet = levelData.packets[gameState.wavesCleared];
      gameState.wavesCleared++;
      let nextBreather = Math.max(20, 75 - gm.maxBreatherCut);
      let nextThreshold = 0;
      const marker = packet.find((d) => !d.t);
      if (marker) {
        if (marker.b !== void 0) nextBreather = marker.b;
        if (marker.th !== void 0) nextThreshold = marker.th;
      }
      const enemyDefs = applyFormations(packet.filter((d) => d.t), Math.min(rawArcIndex, 5));
      enemyDefs.forEach((enemyDef) => {
        gameState.spawnTotal++;
        let type = enemyDef.t;
        if (type === "grunt" && affixSubType && affixSubEvery > 0) {
          if (gruntSubCounter % affixSubEvery === 0) type = affixSubType;
          gruntSubCounter++;
        }
        let lane = enemyDef.l;
        let delayFrames = (enemyDef.d || 0) * gm.packetDelayMult * affixDelayMult;
        let color = "#ff0055";
        let hp = 45;
        let speed = 3;
        let cooldown = 60;
        let weight = 1;
        if (type === "bruiser") {
          color = "#cc0000";
          hp = 150;
          speed = 1.8;
          cooldown = 80;
          weight = 2;
        } else if (type === "shield") {
          color = "#ffaa00";
          hp = 80;
          speed = 2.4;
          weight = 1.5;
        } else if (type === "zoner") {
          color = "#00ff00";
          hp = 40;
          speed = 1.5;
          cooldown = 100;
        } else if (type === "assassin") {
          color = "#aa00ff";
          hp = 30;
          speed = 4.5;
          cooldown = 35;
        }
        hp = Math.floor(hp * (1 + (CONSTANTS.difficultyStage(gameState.currentStage) - 1) * 0.1) * gm.packetDensityMult);
        if (type === "shield" || type === "bruiser") cooldown = Math.max(20, Math.round(cooldown * gm.enemyRecoveryMult));
        speed *= gameState.stageSpeedMult;
        if (gameState.laneTempo && gameState.laneTempo[lane] !== void 0) speed *= gameState.laneTempo[lane];
        let spawnX = gameState.width + 50 + delayFrames * speed;
        const PS = CONSTANTS.PUNCH_STRINGS, arcI = Math.min(rawArcIndex, 5);
        let stringLen = 1;
        if (PS.types.includes(type) && (PS.chanceByArc[arcI] || 0) > 0 && random() < PS.chanceByArc[arcI]) stringLen = PS.lenByArc[arcI] || 2;
        gameState.enemies.push({
          stringLen,
          stringIdx: 0,
          x: spawnX,
          lane,
          y: gameState.height * CONSTANTS.LANE_Y[lane],
          w: type === "bruiser" ? 70 : 50,
          h: type === "bruiser" ? 130 : 110,
          hp,
          maxHp: hp,
          speed,
          baseSpeed: speed,
          color,
          type,
          weight,
          stun: 0,
          stunResist: 0,
          attackCooldown: cooldown,
          maxCooldown: cooldown,
          isBoss: false,
          justAttacked: 0,
          trails: [],
          trailTimer: 0,
          vx: 0,
          pressure: 0,
          pressureDecay: 0,
          menace: 0,
          menaceLevel: 0
        });
      });
      gameState.waveTimer = nextBreather;
      gameState.waveThreshold = nextThreshold;
    }
  }

  // src/entities/bosses.js
  var BOSS_ROSTER = [
    {
      name: "NEON ENFORCER",
      color: "#ffaa00",
      controller: "neon_enforcer",
      type: "shield",
      weight: 2,
      speed: 1.2,
      cooldown: 60,
      baseHpMult: 1,
      startMove: "jab"
    },
    {
      name: "PHANTOM BOXER",
      color: "#aa00ff",
      controller: "phantom_boxer",
      type: "assassin",
      weight: 1.5,
      speed: 2.5,
      cooldown: 40,
      baseHpMult: 0.75,
      startMove: "feint"
    },
    {
      name: "STATIC MONK",
      color: "#00ff00",
      controller: "static_monk",
      type: "zoner",
      weight: 1.2,
      speed: 1,
      cooldown: 120,
      baseHpMult: 0.85,
      startMove: "laser"
    },
    // v17: the rotation no longer repeats inside Arcs 1-5.
    {
      name: "LIVE WIRE",
      color: "#ffe14d",
      controller: "live_wire",
      type: "bruiser",
      weight: 2.2,
      speed: 1.7,
      cooldown: 50,
      baseHpMult: 1.05,
      startMove: "string"
    },
    {
      name: "NEGATIVE",
      color: "#ff0000",
      // replaced at spawn with the inverse of the Striker's colour
      controller: "negative",
      type: "grunt",
      weight: 1.3,
      speed: 2.2,
      cooldown: 44,
      baseHpMult: 1.2,
      startMove: "jab"
    }
  ];
  var BOSS_ROSTER_IDS = BOSS_ROSTER.map((b) => b.controller);
  function spawnMonkAdd() {
    let hp = Math.floor(45 * (1 + (CONSTANTS.difficultyStage(gameState.currentStage) - 1) * 0.1));
    let lane = Math.floor(random() * 3);
    gameState.enemies.push({
      x: gameState.width + 60,
      lane,
      y: gameState.height * CONSTANTS.LANE_Y[lane],
      w: 50,
      h: 110,
      hp,
      maxHp: hp,
      speed: 3 * (gameState.stageSpeedMult || 1),
      color: "#ff0055",
      type: "grunt",
      weight: 1,
      stun: 0,
      stunResist: 0,
      attackCooldown: 60,
      maxCooldown: 60,
      isBoss: false,
      justAttacked: 0,
      trails: [],
      trailTimer: 0,
      vx: 0,
      pressure: 0,
      pressureDecay: 0
    });
    spawnFloatingText(gameState.width - 120, gameState.height * 0.2, "SUPPORT INBOUND", "#00ff00");
  }
  function spawnBoss() {
    gameState.bossActive = true;
    gameState.bossIntroTimer = 180;
    gameState.posterConfirmed = false;
    gameState.shake = 15;
    playSound("bash_tell");
    setMusicIntensity(1);
    let baseHp = 300 + CONSTANTS.difficultyStage(gameState.currentStage) * 100;
    const rawArcIndex = CONSTANTS.getArcIndex(gameState.currentStage);
    const bossIndex = (rawArcIndex - 1) % BOSS_ROSTER.length;
    const template = { ...BOSS_ROSTER[bossIndex] };
    if (template.controller === "negative") template.color = invertHex(gameState.strikerColor || "#00ffff");
    gameState.bossThemeColor = template.color;
    gameState.bossIntroText = template.name;
    const arcData = CONSTANTS.ARC_STAGE_TABLES[Math.min(rawArcIndex, 5)] || {};
    gameState.bossPoster = {
      name: template.name,
      controller: template.controller,
      color: template.color,
      arc: rawArcIndex,
      tagline: (CONSTANTS.BOSS_BILLING[template.controller] || {}).tagline || "",
      venue: arcData[7] && arcData[7].stageName || "Boss Chamber",
      round: gameState.currentStage
    };
    playSound("bell");
    const arcMods = CONSTANTS.getBossArcMods(template.controller, rawArcIndex);
    gameState.enemies.push({
      name: template.name,
      controller: template.controller,
      x: gameState.width - 150,
      lane: 1,
      y: gameState.height * CONSTANTS.LANE_Y[1],
      w: template.type === "shield" ? 60 : 50,
      h: template.type === "shield" ? 140 : 130,
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
      decoyTimer: 0,
      decoyLane: -1,
      decoyRolledThisCycle: false,
      // v16 offense audit + finisher bookkeeping
      telegraphed: false,
      recoverTimer: 0,
      recoverMax: 0,
      punishShown: false,
      feintSwitched: false,
      finisherStage: 0,
      pendingFinisher: null,
      koDone: false,
      stringIdx: 0,
      stringsThrown: 0,
      shockTimer: 0,
      slipCooldown: 0,
      arcMods
      // Assigned directly to the entity!
    });
  }
  function resolveBossStrike(en, rawDmg, isHeavy) {
    if (en.lane !== gameState.player.lane) return;
    if (Math.abs(en.x - gameState.player.x) > 100) return;
    if (gameState.player.state === "ghost_step") {
      spawnFloatingText(gameState.player.x, gameState.player.y - 50, "GHOST STEP", "#888888");
      registerPerfectGhostStep();
      if (gameState.progressionMods.ghostCounter && gameState.player.slipBuff === 0) {
        gameState.player.slipBuff = 1;
        playSound("perfect_slip");
        spawnFloatingText(gameState.player.x, gameState.player.y - 80, "GHOST COUNTER!", "#ffffff");
      }
      return;
    }
    let dmg = gameState.isInstinct ? Math.floor(rawDmg * 0.5) : rawDmg;
    const counter = gameState.player.state === "punching" || gameState.player.state === "recovery";
    if (counter) dmg = Math.round(dmg * CONSTANTS.PLAYER_HIT.counterHitMult);
    takeDamage(dmg, isHeavy || counter, en, { floor: isHeavy || counter, counter });
  }
  function nextCycle(en, frames) {
    const mult = en.desperation ? CONSTANTS.BOSS_OFFENSE.desperationCooldownMult : 1;
    return clampCycle(frames * mult);
  }
  function meleeTelegraph(en, inRange, onTell) {
    const lead = telegraphLead(en);
    if (!inRange) {
      if (en.attackCooldown <= lead) {
        en.attackCooldown = lead + 6;
        en.telegraphed = false;
      }
      return;
    }
    if (!en.telegraphed && en.attackCooldown <= lead) {
      en.telegraphed = true;
      en.telegraphAt = en.attackCooldown;
      onTell();
    }
  }
  function handleNeonEnforcer(en) {
    if (en.recoverTimer > 0) {
      en.recoverTimer--;
      return;
    }
    en.attackCooldown--;
    if (en.currentMove !== "bash" && en.x > gameState.player.x + 100) {
      en.x -= en.speed * 0.5 * en.arcMods.walkDownMult;
    }
    const inRange = Math.abs(en.x - gameState.player.x) < 140 && en.stun <= 0;
    meleeTelegraph(en, inRange, () => {
      playSound(en.currentMove === "bash" ? "bash_tell" : "jab_tell");
      if (en.currentMove === "bash") createImpact(en.x, en.y - 60, "#ffaa00");
    });
    if (inRange && en.attackCooldown <= 0) {
      en.justAttacked = 5;
      const struck = en.currentMove;
      resolveBossStrike(en, struck === "bash" ? 30 : 12, struck === "bash");
      if (en.enraged) {
        en.currentMove = "bash";
        en.enraged = false;
        en.maxCooldown = nextCycle(en, 55);
      } else {
        let roll = random();
        if (en.phase === 1) {
          en.currentMove = roll > 0.6 ? "bash" : "jab";
          en.maxCooldown = nextCycle(en, en.currentMove === "bash" ? 70 : 45);
        } else {
          en.currentMove = roll > 0.5 ? "bash" : "jab";
          en.maxCooldown = nextCycle(en, en.currentMove === "bash" ? 55 : 35);
        }
      }
      en.attackCooldown = en.maxCooldown;
      beginPunishWindow(en, struck);
    }
  }
  function handlePhantomBoxer(en) {
    if (en.recoverTimer > 0) {
      en.recoverTimer--;
      return;
    }
    en.attackCooldown--;
    if (en.x > gameState.player.x + 100) {
      en.x -= en.speed;
    }
    if (en.arcMods.fakeLaneFlash && !en.decoyRolledThisCycle && Math.abs(en.x - gameState.player.x) < 140 && en.attackCooldown <= Math.floor(28 * en.arcMods.punishWindowMult)) {
      en.decoyRolledThisCycle = true;
      if (random() < 0.45) {
        const otherLanes = [0, 1, 2].filter((l) => l !== en.lane);
        en.decoyLane = otherLanes[Math.floor(random() * otherLanes.length)];
        en.decoyTimer = 16;
      }
    }
    if (en.decoyTimer > 0) {
      en.decoyTimer--;
      gameState.laneFlash[en.decoyLane] = Math.max(gameState.laneFlash[en.decoyLane], en.decoyTimer < 6 ? 2 : 1);
    }
    if (en.arcMods.afterimageThreat && en.trails && en.trails.length > 0 && en.attackCooldown > 20) {
      const ghost = en.trails[0];
      if (ghost && ghost.lane !== void 0 && ghost.lane !== en.lane) {
        gameState.laneFlash[ghost.lane] = Math.max(gameState.laneFlash[ghost.lane], 1);
      }
    }
    const inRange = Math.abs(en.x - gameState.player.x) < 140 && en.stun <= 0;
    meleeTelegraph(en, inRange, () => {
      playSound(en.currentMove === "feint" ? "feint_tell" : "jab_tell");
    });
    if (inRange) {
      if (en.currentMove === "feint" && !en.feintSwitched && en.attackCooldown <= Math.max(14, Math.floor(16 * en.arcMods.punishWindowMult))) {
        en.feintSwitched = true;
        en.lane = gameState.player.lane;
        en.y = gameState.height * CONSTANTS.LANE_Y[en.lane];
        createImpact(en.x, en.y - 60, "#aa00ff");
      }
      if (en.attackCooldown <= 0) {
        en.justAttacked = 5;
        const struck = en.currentMove;
        resolveBossStrike(en, 15, false);
        en.decoyRolledThisCycle = false;
        en.decoyTimer = 0;
        en.feintSwitched = false;
        let roll = random();
        if (en.phase === 1) {
          en.currentMove = roll > 0.5 ? "feint" : "jab";
          en.maxCooldown = nextCycle(en, en.currentMove === "feint" ? 45 : 30);
        } else {
          if (en.lastMove === "feint") en.currentMove = "jab";
          else en.currentMove = roll > 0.2 ? "feint" : "jab";
          en.maxCooldown = nextCycle(en, en.currentMove === "feint" ? 35 : 26);
        }
        en.lastMove = en.currentMove;
        en.attackCooldown = en.maxCooldown;
        beginPunishWindow(en, struck === "feint" ? "feint" : "jab");
      }
    }
  }
  function handleStaticMonk(en) {
    en.attackCooldown--;
    if (en.currentMove === "recharge") {
      en.x = gameState.player.x + 100;
      if (en.attackCooldown <= 0) {
        en.currentMove = "laser";
        en.x = gameState.width - 150;
        en.attackCooldown = nextCycle(en, 100);
        en.telegraphed = false;
        playSound("ghost_step");
        createShatter(en.x, en.y - 60, "#00ff00");
      }
    } else {
      en.x = gameState.width - 150 + Math.sin(Date.now() * 2e-3) * 50;
      if (!en.telegraphed && en.attackCooldown <= 80) {
        en.telegraphed = true;
        en.telegraphAt = en.attackCooldown;
        playSound("zoner_tell");
        en.targetLanes = [gameState.player.lane];
        let adjacentLane = gameState.player.lane === 1 ? random() > 0.5 ? 0 : 2 : 1;
        en.targetLanes.push(adjacentLane);
      }
      if (en.attackCooldown > 0 && en.targetLanes.length > 0) {
        en.targetLanes.forEach((laneIndex) => {
          gameState.laneFlash[laneIndex] = en.attackCooldown <= 15 ? 2 : 1;
          if (gameState.player.lane === laneIndex) {
            gameState.player.dangerLevel = Math.max(gameState.player.dangerLevel, en.attackCooldown <= 15 ? 2 : 1);
          }
        });
        if (en.arcMods.deceptiveOrder && en.attackCooldown > 45) {
          const safeLane = [0, 1, 2].find((l) => !en.targetLanes.includes(l));
          if (safeLane !== void 0) gameState.laneFlash[safeLane] = Math.max(gameState.laneFlash[safeLane], 1);
        }
      }
      if (en.attackCooldown <= 0) {
        playSound("laser");
        en.justAttacked = 10;
        gameState.shake = 15;
        if (en.targetLanes.length > 0) {
          en.targetLanes.forEach((laneIndex) => {
            for (let i = 0; i < 6; i++) {
              createImpact(en.x - i * 150, gameState.height * CONSTANTS.LANE_Y[laneIndex], "#00ff00");
            }
            if (gameState.player.lane === laneIndex) {
              if (gameState.player.state === "ghost_step") {
                spawnFloatingText(gameState.player.x, gameState.player.y - 50, "EVADED", "#888888");
                registerPerfectGhostStep();
              } else takeDamage(gameState.isInstinct ? 15 : 30, true, en);
            }
          });
        }
        en.targetLanes = [];
        en.telegraphed = false;
        en.bossMashCount++;
        const volleysPerBurst = 1 + (en.arcMods.patternChainLength || 1);
        if (en.bossMashCount >= volleysPerBurst) {
          en.currentMove = "recharge";
          en.attackCooldown = Math.floor(180 / en.arcMods.teleportRateMult);
          en.bossMashCount = 0;
          en.lane = gameState.player.lane;
          en.y = gameState.height * CONSTANTS.LANE_Y[en.lane];
          en.x = gameState.player.x + 100;
          en.punishShown = false;
          playSound("ghost_step");
          createImpact(en.x, en.y - 60, "#00ff00");
          spawnFloatingText(en.x, en.y - 120, "RECHARGING \u2014 OPEN!", "#00ff00");
          if (en.arcMods.summonSupportPressure && gameState.enemies.filter((e) => !e.isBoss).length < 1) {
            spawnMonkAdd();
          }
        } else {
          en.attackCooldown = en.arcMods.followupPattern ? 88 : 100;
          let otherLanes = [0, 1, 2].filter((l) => l !== en.lane);
          en.lane = otherLanes[Math.floor(random() * otherLanes.length)];
          en.y = gameState.height * CONSTANTS.LANE_Y[en.lane];
        }
      }
    }
  }
  function updateLiveLanes() {
    if (!gameState.liveLanes || !gameState.liveLanes.length) return;
    const L = CONSTANTS.LIVE_LANE, p = gameState.player;
    for (const z of gameState.liveLanes) {
      z.timer--;
      if (z.phase === "warn") {
        if (z.timer <= 0) {
          z.phase = "live";
          z.timer = L.liveFrames;
          z.tick = 0;
          playSound("shock");
        }
      } else {
        if (p.lane === z.lane && !(p.invuln > 0) && p.state !== "ghost_step" && z.tick++ % L.tickEvery === 0) {
          takeDamage(L.damage, false, null, { src: "live_lane" });
          playSound("shock");
          createImpact(p.x + 20, p.y - 70, "#fff36b");
          spawnFloatingText(p.x + 10, p.y - 130, "SHOCKED!", "#fff36b");
        }
      }
    }
    gameState.liveLanes = gameState.liveLanes.filter((z) => z.phase === "warn" || z.timer > 0);
  }
  function electrifyLane(lane) {
    if (!gameState.liveLanes) gameState.liveLanes = [];
    if (gameState.liveLanes.some((z) => z.lane === lane)) return;
    gameState.liveLanes.push({ lane, phase: "warn", timer: CONSTANTS.LIVE_LANE.warnFrames, tick: 0 });
    spawnFloatingText(gameState.width * 0.5, gameState.height * CONSTANTS.LANE_Y[lane] - 50, "LIVE LANE", "#fff36b");
  }
  function handleLiveWire(en) {
    if (en.recoverTimer > 0) {
      en.recoverTimer--;
      return;
    }
    en.attackCooldown--;
    const p = gameState.player;
    if (en.x > p.x + 100) en.x -= en.speed * 0.6 * (en.arcMods.walkDownMult || 1);
    const K2 = getBinds();
    const holding = gameState.keys[K2.right] || gameState.pad.rightHeld;
    if (Math.abs(en.x - p.x) < 112 && !holding && p.state !== "punching") p.x = Math.max(CONSTANTS.FOOTWORK.minX, p.x - 0.7);
    const inRange = Math.abs(en.x - p.x) < 140 && en.stun <= 0;
    meleeTelegraph(en, inRange, () => {
      playSound(en.currentMove === "shove" ? "bash_tell" : "jab_tell");
      if (en.currentMove === "shove") createImpact(en.x, en.y - 60, "#ffe14d");
    });
    if (!(inRange && en.attackCooldown <= 0)) return;
    en.justAttacked = 5;
    if (en.currentMove === "string") {
      resolveBossStrike(en, 10, false);
      const len = en.arcMods.stringLength || 2;
      en.stringIdx = (en.stringIdx || 0) + 1;
      if (en.stringIdx < len) {
        if (Math.abs(en.lane - p.lane) === 1) {
          en.lane = p.lane;
          en.y = gameState.height * CONSTANTS.LANE_Y[en.lane];
        }
        en.attackCooldown = telegraphLead(en) + 4;
        en.telegraphed = false;
        return;
      }
      en.stringIdx = 0;
      en.stringsThrown = (en.stringsThrown || 0) + 1;
      electrifyLane(en.lane);
      const shoveNext = en.stringsThrown % (en.arcMods.shoveEvery || 3) === 0;
      en.currentMove = shoveNext ? "shove" : "string";
      en.maxCooldown = nextCycle(en, shoveNext ? 60 : 44);
      en.attackCooldown = en.maxCooldown;
      beginPunishWindow(en, "jab");
    } else {
      const connected = en.lane === p.lane && Math.abs(en.x - p.x) <= 100 && p.state !== "ghost_step";
      resolveBossStrike(en, 14, true);
      if (connected) {
        p.x = Math.max(CONSTANTS.FOOTWORK.minX, p.x - 60);
        spawnFloatingText(p.x, p.y - 120, "WALKED BACK", "#ffe14d");
      }
      en.currentMove = "string";
      en.maxCooldown = nextCycle(en, 44);
      en.attackCooldown = en.maxCooldown;
      beginPunishWindow(en, "bash");
    }
  }
  function updateEnemyEchoes() {
    if (!gameState.enemyEchoes || !gameState.enemyEchoes.length) return;
    const p = gameState.player;
    for (const e of gameState.enemyEchoes) {
      if (!e.fired) {
        if (e.timer <= 12) gameState.laneFlash[e.lane] = Math.max(gameState.laneFlash[e.lane], e.timer <= 6 ? 2 : 1);
        if (--e.timer <= 0) {
          e.fired = true;
          if (p.lane === e.lane && Math.abs(e.x - p.x) < 150) {
            if (p.state === "ghost_step") {
              spawnFloatingText(p.x, p.y - 50, "GHOST STEP", "#888888");
              registerPerfectGhostStep();
            } else takeDamage(gameState.isInstinct ? 6 : 12, false, null, { src: "negative_echo" });
          }
          createImpact(e.x - 40, e.y - 60, e.color);
        }
      } else e.fade--;
    }
    gameState.enemyEchoes = gameState.enemyEchoes.filter((e) => !e.fired || e.fade > 0);
  }
  function handleNegative(en) {
    if (en.slipCooldown > 0) en.slipCooldown--;
    if (en.phase === 1 && en.hp < en.maxHp * 0.5) {
      en.phase = 2;
      gameState.shake = 40;
      doFlash(0.6);
      triggerShockwave(en.x, en.y - 60, en.color);
      spawnFloatingText(en.x + 20, en.y - 160, "THE MIRROR CRACKS", en.color);
      playSound("hit");
    }
    if (en.recoverTimer > 0) {
      en.recoverTimer--;
      return;
    }
    en.attackCooldown--;
    const p = gameState.player;
    if (en.x > p.x + 100) en.x -= en.speed * 0.6;
    const inRange = Math.abs(en.x - p.x) < 140 && en.stun <= 0;
    meleeTelegraph(en, inRange, () => playSound(en.currentMove === "cross" ? "bash_tell" : "jab_tell"));
    if (!(inRange && en.attackCooldown <= 0)) return;
    en.justAttacked = 5;
    const struck = en.currentMove;
    resolveBossStrike(en, struck === "cross" ? 18 : 12, struck === "cross");
    const roll = random();
    en.currentMove = en.phase === 2 ? roll > 0.45 ? "cross" : "jab" : roll > 0.65 ? "cross" : "jab";
    en.maxCooldown = nextCycle(en, en.currentMove === "cross" ? 48 : 34);
    en.attackCooldown = en.maxCooldown;
    beginPunishWindow(en, struck === "cross" ? "bash" : "jab");
  }
  function updateBosses() {
    updateEnemyEchoes();
    if (!gameState.finisher) updateLiveLanes();
    for (const en of gameState.enemies) {
      if (!en.isBoss) continue;
      checkBossThresholds(en);
      if (en.pendingFinisher && !gameState.finisher) {
        const kind = en.pendingFinisher;
        en.pendingFinisher = null;
        startFinisher(en, kind);
        return;
      }
      if (en.stun > 0 || gameState.bossIntroTimer > 0) continue;
      if (en.controller === "neon_enforcer") handleNeonEnforcer(en);
      else if (en.controller === "phantom_boxer") handlePhantomBoxer(en);
      else if (en.controller === "static_monk") handleStaticMonk(en);
      else if (en.controller === "live_wire") handleLiveWire(en);
      else if (en.controller === "negative") handleNegative(en);
    }
  }

  // src/systems/hazards.js
  function spawnHazard(laneOverride) {
    const H = CONSTANTS.HAZARDS;
    const lane = laneOverride !== void 0 ? laneOverride : Math.floor(random() * 3);
    gameState.hazards.push({ lane, phase: "warn", timer: H.warnFrames, struck: false });
    playSound("bash_tell");
    spawnFloatingText(gameState.width * 0.5, gameState.height * CONSTANTS.LANE_Y[lane] - 46, "RAIL OVERLOAD", "#ff8800");
  }
  function maybeScheduleHazard() {
    const H = CONSTANTS.HAZARDS;
    if (gameState.hazardCooldown > 0) {
      gameState.hazardCooldown--;
      return;
    }
    if (gameState.screen !== "playing" || gameState.bossActive || gameState.stageClearing || gameState.bossIntroTimer > 0 || CONSTANTS.isBossStage(gameState.currentStage)) return;
    if (gameState.hazards.length > 0) return;
    const arc = Math.min(CONSTANTS.getArcIndex(gameState.currentStage), 5);
    const cap = (H.maxPerStageByArc || {})[arc] || 0;
    if ((gameState.hazardsThisStage || 0) >= cap) return;
    if ((gameState.surpriseBudget || 0) < CONSTANTS.SURPRISE.hazardCost) return;
    gameState.hazardCooldown = H.cooldownFrames;
    const chance = (H.chanceByArc || {})[arc] || 0;
    if (chance > 0 && random() < chance) {
      gameState.hazardsThisStage = (gameState.hazardsThisStage || 0) + 1;
      gameState.surpriseBudget -= CONSTANTS.SURPRISE.hazardCost;
      spawnHazard();
    }
  }
  function updateHazards() {
    const H = CONSTANTS.HAZARDS;
    for (let i = gameState.hazards.length - 1; i >= 0; i--) {
      const hz = gameState.hazards[i];
      hz.timer--;
      if (hz.phase === "warn") {
        if (hz.timer <= 0) {
          hz.phase = "strike";
          hz.timer = H.strikeFrames;
          playSound("laser");
          gameState.shake = Math.max(gameState.shake, 12);
        }
      } else {
        if (!hz.struck) {
          hz.struck = true;
          const evading = gameState.player.state === "ghost_step";
          if (gameState.player.lane === hz.lane && !evading) {
            takeDamage(gameState.isInstinct ? Math.floor(H.damage * 0.5) : H.damage, true, null);
            spawnFloatingText(gameState.player.x, gameState.player.y - 60, "HAZARD!", "#ff8800");
          } else {
            if (evading && gameState.player.lane === hz.lane) registerPerfectGhostStep();
            spawnFloatingText(gameState.width * 0.5, gameState.height * CONSTANTS.LANE_Y[hz.lane] - 40, evading && gameState.player.lane === hz.lane ? "EVADED" : "CLEARED", "#ffaa00");
          }
        }
        if (hz.timer <= 0) gameState.hazards.splice(i, 1);
      }
    }
  }

  // src/systems/records.js
  var LB_KEY = "neon_strike_leaderboard_v1";
  var META_KEY = "neon_strike_meta_v1";
  var MAX_ENTRIES = 10;
  var STRIKER_SKINS = [
    { id: "cyan", name: "Signal Cyan", color: "#00ffff", unlock: "default", hint: "Default" },
    { id: "ember", name: "Ember", color: "#ff5a3c", unlock: "grade:B", hint: "Finish a run at grade B+" },
    { id: "violet", name: "Violet Ghost", color: "#c084fc", unlock: "grade:A", hint: "Finish a run at grade A+" },
    { id: "gold", name: "Apex Gold", color: "#facc15", unlock: "grade:S", hint: "Finish a run at grade S" },
    { id: "prism", name: "Prism", color: "#34d399", unlock: "daily", hint: "Beat a boss in a Daily Challenge" }
  ];
  var GRADE_RANK = { C: 0, B: 1, A: 2, S: 3 };
  function safeGet3(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function safeSet3(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
    }
  }
  function loadLeaderboard() {
    const a = safeGet3(LB_KEY);
    return Array.isArray(a) ? a : [];
  }
  function loadMeta() {
    const m = safeGet3(META_KEY) || {};
    return {
      totalRuns: m.totalRuns || 0,
      bestBossStreak: m.bestBossStreak || 0,
      unlocked: Array.isArray(m.unlocked) && m.unlocked.length ? m.unlocked : ["cyan"],
      selectedSkin: m.selectedSkin || "cyan",
      alias: typeof m.alias === "string" && m.alias.length ? m.alias : "STRIKER",
      // Online submission consent. Defaults to OFF: uploading a player's alias and
      // stats to a third-party server is opt-in, not something to do silently. The
      // game is fully playable — and the LOCAL leaderboard fully works — either way.
      onlineOptIn: m.onlineOptIn === true
    };
  }
  function saveMeta(m) {
    safeSet3(META_KEY, m);
  }
  function getAlias() {
    return loadMeta().alias;
  }
  function setAlias(name) {
    const clean = String(name || "").replace(/[^A-Za-z0-9 _\-.]/g, "").trim().slice(0, 16).toUpperCase() || "STRIKER";
    const m = loadMeta();
    m.alias = clean;
    saveMeta(m);
    return clean;
  }
  function getOnlineOptIn() {
    return loadMeta().onlineOptIn;
  }
  function setOnlineOptIn(on) {
    const m = loadMeta();
    m.onlineOptIn = !!on;
    saveMeta(m);
    return m.onlineOptIn;
  }
  function isSubmittableRun(run2) {
    if (!run2) return false;
    return (run2.score || 0) > 0 && (run2.stage || 0) >= 2;
  }
  function rankInsert(list, entry, max = MAX_ENTRIES) {
    const next = [...list, entry].sort((a, b) => b.score - a.score).slice(0, max);
    const idx = next.indexOf(entry);
    return { list: next, rank: idx >= 0 ? idx + 1 : -1 };
  }
  function unlocksForRun(run2, unlocked) {
    var _a, _b;
    const out = [];
    for (const s of STRIKER_SKINS) {
      if (unlocked.includes(s.id) || out.includes(s.id)) continue;
      if (s.unlock === "default") {
        out.push(s.id);
        continue;
      }
      if (s.unlock === "daily") {
        if (run2.daily && (run2.bossKills || 0) >= 1) out.push(s.id);
        continue;
      }
      if (s.unlock.startsWith("grade:")) {
        const need = s.unlock.split(":")[1];
        if (((_a = GRADE_RANK[run2.grade]) != null ? _a : -1) >= ((_b = GRADE_RANK[need]) != null ? _b : 99)) out.push(s.id);
      }
    }
    return out;
  }
  function commitRunRecord(run2) {
    const entry = { score: run2.score, grade: run2.grade, stage: run2.stage, daily: !!run2.daily, at: Date.now() };
    const { list, rank } = rankInsert(loadLeaderboard(), entry);
    safeSet3(LB_KEY, list);
    const meta = loadMeta();
    meta.totalRuns += 1;
    meta.bestBossStreak = Math.max(meta.bestBossStreak, run2.bossKills || 0);
    const newly = unlocksForRun(run2, meta.unlocked);
    if (newly.length) meta.unlocked = [...meta.unlocked, ...newly];
    saveMeta(meta);
    return { rank, newUnlocks: newly, bestBossStreak: meta.bestBossStreak, totalRuns: meta.totalRuns, leaderboard: list };
  }
  function selectSkin(id) {
    const m = loadMeta();
    if (m.unlocked.includes(id)) {
      m.selectedSkin = id;
      saveMeta(m);
    }
    return loadMeta().selectedSkin;
  }
  function selectedStrikerColor() {
    const m = loadMeta();
    const skin = STRIKER_SKINS.find((x) => x.id === m.selectedSkin);
    return skin && m.unlocked.includes(skin.id) ? skin.color : "#00ffff";
  }

  // src/systems/online.js
  var GAME = "neon-strike";
  var SUPABASE_URL = "https://iysvarvkltihgosbhtaa.supabase.co";
  var SUPABASE_KEY = "sb_publishable_7Kxs-F6HGMgZmb86V1b9_A_qtyUerCh";
  var REST = `${SUPABASE_URL}/rest/v1/scores`;
  var HEADERS = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };
  function onlineEnabled() {
    return typeof fetch === "function";
  }
  async function submitScore(run2) {
    if (!onlineEnabled()) return false;
    const body = {
      game: GAME,
      name: String(run2.name || "STRIKER").slice(0, 16),
      score: Math.max(0, Math.min(5e7, Math.round(run2.score || 0))),
      grade: ["C", "B", "A", "S"].includes(run2.grade) ? run2.grade : "C",
      stage: Math.max(1, Math.min(999, Math.round(run2.stage || 1))),
      daily: !!run2.daily,
      date_key: run2.daily ? run2.dateKey || null : null
    };
    try {
      const res = await fetch(REST, {
        method: "POST",
        headers: { ...HEADERS, "Prefer": "return=minimal" },
        body: JSON.stringify(body)
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }
  async function fetchScores(query) {
    if (!onlineEnabled()) return null;
    try {
      const res = await fetch(`${REST}?${query}`, { headers: HEADERS });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }
  function fetchTopAllTime(limit = 10) {
    return fetchScores(`select=name,score,grade,stage&game=eq.${GAME}&order=score.desc&limit=${limit}`);
  }
  function fetchTopDaily(dateKey, limit = 10) {
    if (!dateKey) return Promise.resolve([]);
    return fetchScores(`select=name,score,grade,stage&game=eq.${GAME}&daily=eq.true&date_key=eq.${encodeURIComponent(dateKey)}&order=score.desc&limit=${limit}`);
  }

  // src/render/atmosphere.js
  function initAtmosphere() {
    gameState.ambientDust = [];
    for (let i = 0; i < 30; i++) gameState.ambientDust.push({ x: Math.random() * gameState.width, y: Math.random() * gameState.height, vx: (Math.random() - 0.5) * 0.5 - 1, vy: (Math.random() - 0.5) * 0.5, size: Math.random() * 3 + 1, alpha: Math.random() * 0.5 });
    gameState.cathedralShards = [];
    for (let i = 0; i < 15; i++) {
      let pts = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 }));
      gameState.cathedralShards.push({ x: Math.random() * gameState.width * 2, y: Math.random() * gameState.height, size: Math.random() * 80 + 40, angle: Math.random() * Math.PI * 2, speed: Math.random() * 0.2 + 0.1, rotSpeed: (Math.random() - 0.5) * 0.01, color: "rgba(0, 255, 255, 0.03)", points: pts });
    }
    gameState.cathedralPillars = [];
    for (let i = 0; i < 8; i++) gameState.cathedralPillars.push({ x: i * 250, w: 60, speed: 0.5 });
    gameState.lightShafts = [];
    for (let i = 0; i < 3; i++) gameState.lightShafts.push({ x: gameState.width * 0.2 + i * 300, speed: 0.1 });
    gameState.roseWindow = { x: gameState.width * 0.8, baseY: gameState.height * 0.25, y: gameState.height * 0.25, rotation: 0, floatTime: 0, petals: [] };
    for (let i = 0; i < 8; i++) if (Math.random() > 0.15) gameState.roseWindow.petals.push(i * (Math.PI / 4));
    gameState.foregroundLines = [];
    for (let i = 0; i < 5; i++) gameState.foregroundLines.push({ x: Math.random() * gameState.width, y: gameState.height - Math.random() * 100, speed: Math.random() * 15 + 10, length: Math.random() * 100 + 50, alpha: Math.random() * 0.3 + 0.1 });
  }
  function updateAtmosphere() {
    let scrollSpeed = gameState.scrollX * (gameState.stageSpeedMult || 1);
    gameState.ambientDust.forEach((d) => {
      d.x += d.vx - scrollSpeed * 0.01;
      const lk = CONSTANTS.getLevelInArc(gameState.currentStage);
      if (lk === 3 || lk === 5) d.y += d.vy + 2;
      else d.y += d.vy;
      if (d.x < 0) d.x = gameState.width;
      if (d.y < 0) d.y = gameState.height;
      if (d.y > gameState.height) d.y = 0;
    });
    gameState.foregroundLines.forEach((f) => {
      f.x -= f.speed + scrollSpeed * 0.2;
      if (f.x + f.length < 0) {
        f.x = gameState.width + Math.random() * 500;
        f.y = gameState.height - Math.random() * 100;
      }
    });
    gameState.cathedralPillars.forEach((p) => {
      p.x -= p.speed + scrollSpeed * 0.01;
      if (p.x < -200) p.x = gameState.width + 200;
    });
    gameState.lightShafts.forEach((L) => {
      L.x -= L.speed + scrollSpeed * 5e-3;
      if (L.x < -500) L.x = gameState.width + 200;
    });
    gameState.cathedralShards.forEach((s) => {
      s.x -= s.speed + scrollSpeed * 0.05;
      s.angle += s.rotSpeed;
      if (s.x < -200) s.x = gameState.width + 200;
    });
    gameState.roseWindow.rotation += 5e-4;
    gameState.roseWindow.floatTime += 0.01;
    gameState.roseWindow.y = gameState.roseWindow.baseY + Math.sin(gameState.roseWindow.floatTime) * 15;
    gameState.roseWindow.x -= scrollSpeed * 2e-3;
    if (gameState.roseWindow.x < -400) gameState.roseWindow.x = gameState.width + 400;
  }
  var lerp = (a, b, t) => a + (b - a) * t;
  var mixRGB = (a, b, t) => `rgb(${Math.round(lerp(a[0], b[0], t))}, ${Math.round(lerp(a[1], b[1], t))}, ${Math.round(lerp(a[2], b[2], t))})`;
  var mixRGBA = (a, b, t) => `rgba(${Math.round(lerp(a[0], b[0], t))}, ${Math.round(lerp(a[1], b[1], t))}, ${Math.round(lerp(a[2], b[2], t))}, ${lerp(a[3], b[3], t).toFixed(3)})`;
  function currentPalette() {
    const P = CONSTANTS.PALETTES;
    const from = P[gameState.paletteFrom] || P[1];
    const to = P[gameState.paletteTo] || P[CONSTANTS.paletteKeyForStage(gameState.currentStage)] || P[1];
    const t = Math.min(1, Math.max(0, gameState.paletteT === void 0 ? 1 : gameState.paletteT));
    return { from, to, t };
  }
  function drawAtmosphere() {
    let grad = ctx.createLinearGradient(0, 0, 0, gameState.height);
    const { from, to, t } = currentPalette();
    if (gameState.purifyTimer > 0) {
      let pAlpha = gameState.purifyTimer / 100;
      grad.addColorStop(0, `rgba(2, 30, 60, ${pAlpha})`);
      grad.addColorStop(0.5, `rgba(10, 40, 70, ${pAlpha})`);
      grad.addColorStop(1, `rgba(5, 15, 30, ${pAlpha})`);
    } else {
      grad.addColorStop(0, mixRGB(from.top, to.top, t));
      grad.addColorStop(0.5, mixRGB(from.mid, to.mid, t));
      grad.addColorStop(1, mixRGB(from.bot, to.bot, t));
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, gameState.width, gameState.height);
    const accentColor = mixRGBA(from.accent, to.accent, t);
    const shardColor = mixRGBA(from.shard, to.shard, t);
    gameState.lightShafts.forEach((L) => {
      let gradLight = ctx.createLinearGradient(L.x, 0, L.x + 200, gameState.height);
      gradLight.addColorStop(0, accentColor);
      gradLight.addColorStop(1, "transparent");
      ctx.fillStyle = gradLight;
      ctx.beginPath();
      ctx.moveTo(L.x, 0);
      ctx.lineTo(L.x + 150, 0);
      ctx.lineTo(L.x + 300, gameState.height);
      ctx.lineTo(L.x + 150, gameState.height);
      ctx.fill();
    });
    ctx.save();
    ctx.translate(gameState.roseWindow.x, gameState.roseWindow.y);
    ctx.rotate(gameState.roseWindow.rotation);
    ctx.strokeStyle = gameState.purifyTimer > 0 ? "rgba(0, 255, 255, 0.1)" : shardColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 250, 0, Math.PI * 2);
    ctx.stroke();
    gameState.roseWindow.petals.forEach((angle) => {
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(60, 220);
      ctx.lineTo(0, 280);
      ctx.lineTo(-60, 220);
      ctx.closePath();
      ctx.fillStyle = gameState.purifyTimer > 0 ? "rgba(0, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.2)";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 40);
      ctx.lineTo(30, 140);
      ctx.lineTo(-30, 140);
      ctx.closePath();
      ctx.strokeStyle = gameState.purifyTimer > 0 ? "rgba(0, 255, 255, 0.15)" : shardColor;
      ctx.stroke();
      ctx.restore();
    });
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fillStyle = gameState.purifyTimer > 0 ? "rgba(0, 255, 255, 0.1)" : shardColor;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#030305";
    gameState.cathedralPillars.forEach((p) => {
      ctx.fillRect(p.x, 0, p.w, gameState.height);
      ctx.fillStyle = shardColor;
      ctx.fillRect(p.x + 5, 0, 5, gameState.height);
      ctx.fillStyle = "#030305";
    });
    ctx.save();
    gameState.cathedralShards.forEach((shard) => {
      ctx.translate(shard.x, shard.y);
      ctx.rotate(shard.angle);
      ctx.fillStyle = shardColor;
      ctx.strokeStyle = shardColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      shard.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x * shard.size, p.y * shard.size);
        else ctx.lineTo(p.x * shard.size, p.y * shard.size);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.rotate(-shard.angle);
      ctx.translate(-shard.x, -shard.y);
    });
    ctx.restore();
  }
  function drawLightSweep() {
    if (!(gameState.lightSweep >= 0 && gameState.lightSweep <= 1)) return;
    const { to } = currentPalette();
    const x = -250 + gameState.lightSweep * (gameState.width + 500);
    const c = to.shard;
    const g = ctx.createLinearGradient(x - 220, 0, x + 220, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.42, `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.18)`);
    g.addColorStop(0.5, "rgba(255,255,255,0.55)");
    g.addColorStop(0.58, `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.18)`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 220, 0, 440, gameState.height);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(x - 1, 0, 2, gameState.height);
  }

  // src/render/onboarding_mock.js
  var LESSONS = ["SLIP", "COUNTER", "ARMOR", "GUARD", "GHOST STEP"];
  function keycap(ctx3, x, y, label, color = "#22d3ee", pulse = 0) {
    ctx3.save();
    ctx3.font = "900 13px Orbitron";
    const w = Math.max(28, ctx3.measureText(label).width + 16), h = 26;
    ctx3.fillStyle = "rgba(8,10,16,0.92)";
    ctx3.strokeStyle = color;
    ctx3.lineWidth = 2;
    ctx3.shadowColor = color;
    ctx3.shadowBlur = 8 + pulse * 10;
    ctx3.beginPath();
    ctx3.roundRect ? ctx3.roundRect(x - w / 2, y - h / 2, w, h, 5) : ctx3.rect(x - w / 2, y - h / 2, w, h);
    ctx3.fill();
    ctx3.stroke();
    ctx3.shadowBlur = 0;
    ctx3.fillStyle = color;
    ctx3.textAlign = "center";
    ctx3.textBaseline = "middle";
    ctx3.fillText(label, x, y + 1);
    ctx3.restore();
    return w;
  }
  function callout(ctx3, x, y, ax, ay, color, title, lines, keys = []) {
    ctx3.save();
    ctx3.font = "900 13px Orbitron";
    let keysW = 0;
    keys.forEach((k) => {
      keysW += Math.max(28, ctx3.measureText(k.label).width + 16) + 8;
    });
    ctx3.font = "bold 10px Orbitron";
    keys.forEach((k) => {
      if (k.after) keysW += ctx3.measureText(k.after).width + 14;
    });
    ctx3.font = "bold 11px Orbitron";
    const w = Math.max(210, keysW + 28, ...lines.map((l) => ctx3.measureText(l).width + 28)), h = 34 + lines.length * 16 + (keys.length ? 34 : 0);
    ctx3.strokeStyle = color;
    ctx3.lineWidth = 1.5;
    ctx3.setLineDash([4, 4]);
    ctx3.beginPath();
    ctx3.moveTo(ax, ay);
    ctx3.lineTo(x + (ax < x ? 0 : w), y + h / 2);
    ctx3.stroke();
    ctx3.setLineDash([]);
    ctx3.fillStyle = color;
    ctx3.beginPath();
    ctx3.arc(ax, ay, 4, 0, Math.PI * 2);
    ctx3.fill();
    ctx3.fillStyle = "rgba(6,8,14,0.9)";
    ctx3.fillRect(x, y, w, h);
    ctx3.fillStyle = color;
    ctx3.fillRect(x, y, 4, h);
    ctx3.strokeStyle = "rgba(255,255,255,0.12)";
    ctx3.lineWidth = 1;
    ctx3.strokeRect(x, y, w, h);
    ctx3.textAlign = "left";
    ctx3.fillStyle = color;
    ctx3.font = "900 12px Orbitron";
    ctx3.fillText(title, x + 14, y + 20);
    ctx3.fillStyle = "#e5e7eb";
    ctx3.font = "bold 11px Orbitron";
    lines.forEach((l, i) => ctx3.fillText(l, x + 14, y + 38 + i * 16));
    let kx = x + 14;
    keys.forEach((k) => {
      ctx3.font = "900 13px Orbitron";
      const kw = Math.max(28, ctx3.measureText(k.label).width + 16);
      keycap(ctx3, kx + kw / 2, y + h - 20, k.label, k.color || color, k.pulse || 0);
      kx += kw + 8;
      if (k.after) {
        ctx3.fillStyle = "#9ca3af";
        ctx3.font = "bold 10px Orbitron";
        ctx3.textAlign = "left";
        ctx3.fillText(k.after, kx, y + h - 16);
        kx += ctx3.measureText(k.after).width + 14;
      }
    });
    ctx3.restore();
  }
  function lessonRail(ctx3, current2) {
    ctx3.save();
    const x0 = 22, y = 100;
    ctx3.font = "900 9px Orbitron";
    ctx3.textAlign = "left";
    ctx3.fillStyle = "rgba(255,255,255,0.55)";
    ctx3.fillText("SPARRING", x0, y - 8);
    let x = x0;
    LESSONS.forEach((l, i) => {
      const done = i < current2, cur = i === current2;
      const label = (done ? "\u2713 " : "") + l;
      const w = ctx3.measureText(label).width + 16;
      ctx3.fillStyle = done ? "#22d3ee" : cur ? "rgba(34,211,238,0.18)" : "rgba(255,255,255,0.05)";
      ctx3.fillRect(x, y, w, 16);
      if (cur) {
        ctx3.strokeStyle = "#22d3ee";
        ctx3.lineWidth = 1.5;
        ctx3.strokeRect(x, y, w, 16);
      }
      ctx3.fillStyle = done ? "#000" : cur ? "#22d3ee" : "#6b7280";
      ctx3.fillText(label, x + 8, y + 11);
      x += w + 4;
    });
    ctx3.restore();
  }
  function drawOnboardingMock(ctx3) {
    const scene = gameState.onboardingMock;
    if (!scene) return;
    const K2 = getBinds(), L = (c) => keyLabel(c);
    const p = gameState.player, t = Date.now(), pulse = 0.5 + 0.5 * Math.sin(t * 8e-3);
    const en = gameState.enemies[0];
    ctx3.save();
    if (scene === "slip") {
      lessonRail(ctx3, 0);
      const ex = en ? en.x + 25 : p.x + 200, ey = en ? en.y - 140 : p.y - 140;
      callout(
        ctx3,
        ex + 50,
        ey - 60,
        ex,
        ey + 10,
        "#ff3355",
        "IT\u2019S WINDING UP",
        ["The lane flashes RED while it winds up.", "When it flashes WHITE \u2014 slip out."],
        []
      );
      keycap(ctx3, p.x + 25, p.y - 175, L(K2.up), "#ffffff", pulse);
      keycap(ctx3, p.x + 25, p.y + 30, L(K2.down), "#ffffff", pulse);
      ctx3.fillStyle = "rgba(255,255,255,0.85)";
      ctx3.font = "900 10px Orbitron";
      ctx3.textAlign = "center";
      ctx3.fillText("SLIP ON WHITE", p.x + 25, p.y - 196);
      ctx3.fillStyle = "#9ca3af";
      ctx3.fillText("PERFECT SLIPS: 0 / 1", p.x + 25, p.y + 58);
    } else if (scene === "counter") {
      lessonRail(ctx3, 1);
      callout(
        ctx3,
        p.x + 70,
        p.y - 250,
        p.x + 60,
        p.y - 70,
        "#ffffff",
        "COUNTER CHARGED",
        ["A Perfect Slip charged your next hit.", "It lands double, shatters posture."],
        [{ label: L(K2.jab) }, { label: L(K2.cross) }, { label: L(K2.hook), after: "ANY PUNCH" }]
      );
    } else if (scene === "bruiser") {
      const ex = en ? en.x + 35 : p.x + 220, ey = en ? en.y - 150 : p.y - 150;
      callout(
        ctx3,
        Math.max(ex + 40, 650),
        ey - 60,
        ex,
        ey + 10,
        "#ff3030",
        "NEW: BRUISER",
        ["Jabs chip it but never stagger it.", "Only a Cross (or a Counter) stops it."],
        [{ label: L(K2.cross), color: "#ff2bd6", after: "CROSS" }]
      );
      ctx3.fillStyle = "rgba(255,255,255,0.45)";
      ctx3.font = "bold 9px Orbitron";
      ctx3.textAlign = "center";
      ctx3.fillText("world at 60% speed for a beat \xB7 fades on its own", gameState.width / 2, gameState.height - 110);
    } else if (scene === "instinct") {
      callout(
        ctx3,
        330,
        70,
        290,
        52,
        "#22d3ee",
        "INSTINCT FULL",
        ["Unleash it now \u2014 or keep it banked and", "Perfect Slip on a full meter for THE ZONE."],
        [{ label: L(K2.instinct), after: "UNLEASH" }, { label: `${L(K2.up)}/${L(K2.down)}`, color: "#ffffff", after: "PERFECT SLIP = ZONE" }]
      );
    } else if (scene === "footwork") {
      keycap(ctx3, p.x - 10, p.y + 34, L(K2.left), "#22d3ee", pulse);
      keycap(ctx3, p.x + 60, p.y + 34, L(K2.right), "#22d3ee", pulse);
      ctx3.fillStyle = "#9ca3af";
      ctx3.font = "bold 9px Orbitron";
      ctx3.textAlign = "center";
      ctx3.fillText("HOLD", p.x + 25, p.y + 38);
      const low = gameState.height * CONSTANTS.LANE_Y[2] + 20;
      callout(
        ctx3,
        90,
        low,
        p.x + 25,
        p.y + 50,
        "#22d3ee",
        "FOOTWORK",
        ["Press forward to meet them early,", "give ground to buy a beat."],
        []
      );
      keycap(ctx3, p.x + 25, p.y - 175, L(K2.ghost), "#c084fc", 0);
      ctx3.fillStyle = "#c084fc";
      ctx3.font = "900 9px Orbitron";
      ctx3.fillText("GHOST STEP", p.x + 25, p.y - 196);
    }
    ctx3.restore();
  }

  // src/render/draw.js
  var dl = (x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  function draw() {
    ctx.shadowBlur = 0;
    ctx.clearRect(0, 0, gameState.width, gameState.height);
    ctx.save();
    const shake = gameState.shake * shakeScale();
    if (shake > 1) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    const zoom = gameState.finisher ? gameState.finisherZoom || 1 : 1;
    if (zoom !== 1 && gameState.finisher && gameState.finisher.boss) {
      const fx = (gameState.player.x + gameState.finisher.boss.x) / 2 + 20, fy = gameState.player.y - 70;
      ctx.translate(fx, fy);
      ctx.scale(zoom, zoom);
      ctx.translate(-fx, -fy);
    }
    if (gameState.bossIntroTimer > 0) {
      ctx.fillStyle = "rgba(255, 0, 85, 0.15)";
      ctx.fillRect(0, 0, gameState.width, gameState.height);
    }
    drawAtmosphere();
    drawLightSweep();
    let pLY = gameState.height * CONSTANTS.LANE_Y[gameState.player.lane];
    let pG = ctx.createLinearGradient(gameState.player.x - 150, 0, gameState.player.x + 150, 0);
    pG.addColorStop(0, "rgba(0, 255, 255, 0)");
    pG.addColorStop(0.5, "rgba(0, 255, 255, 0.15)");
    pG.addColorStop(1, "rgba(0, 255, 255, 0)");
    ctx.strokeStyle = pG;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(gameState.player.x - 150, pLY);
    ctx.lineTo(gameState.player.x + 150, pLY);
    ctx.stroke();
    gameState.shockwaves.forEach((sw) => {
      ctx.globalAlpha = sw.alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = gameState.isInstinct ? "rgba(255, 0, 255, 0.2)" : "rgba(0, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < gameState.width + 100; i += 80) {
      let xPos = i - gameState.scrollX % 80;
      ctx.moveTo(xPos, gameState.height * 0.4);
      ctx.lineTo(xPos, gameState.height);
    }
    ctx.stroke();
    CONSTANTS.LANE_Y.forEach((yPct, index) => {
      const state = gameState.laneFlash[index];
      if (state === 2) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 16;
        dl(0, gameState.height * yPct, gameState.width, gameState.height * yPct);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
      } else if (state === 1) {
        ctx.strokeStyle = "rgba(255, 0, 85, 0.65)";
        ctx.lineWidth = 6;
      } else if (gameState.laneTempo && gameState.laneTempo[index] > 1) {
        const y = gameState.height * yPct;
        ctx.strokeStyle = "rgba(255, 95, 30, 0.14)";
        ctx.lineWidth = 12;
        dl(0, y, gameState.width, y);
        ctx.strokeStyle = "rgba(255, 150, 50, 0.6)";
        ctx.lineWidth = 3;
        ctx.setLineDash([26, 18]);
        ctx.lineDashOffset = -(gameState.scrollX * 2 % 44);
        dl(0, y, gameState.width, y);
        ctx.setLineDash([]);
        return;
      } else {
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 4;
      }
      dl(0, gameState.height * yPct, gameState.width, gameState.height * yPct);
    });
    if (gameState.hazards) gameState.hazards.forEach((hz) => {
      const y = gameState.height * CONSTANTS.LANE_Y[hz.lane];
      if (hz.phase === "warn") {
        const p = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(Date.now() * 0.02));
        ctx.strokeStyle = `rgba(255, 140, 0, ${(p * 0.4).toFixed(3)})`;
        ctx.lineWidth = 22;
        dl(0, y, gameState.width, y);
        ctx.strokeStyle = `rgba(255, 170, 40, ${p.toFixed(3)})`;
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 12]);
        ctx.lineDashOffset = -(Date.now() * 0.05) % 24;
        dl(0, y, gameState.width, y);
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = "rgba(255, 200, 60, 0.95)";
        ctx.lineWidth = 26;
        dl(0, y, gameState.width, y);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 6;
        dl(0, y, gameState.width, y);
      }
    });
    ctx.lineWidth = 1;
    gameState.particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      if (p.type === "shard") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size / 2, p.size);
        ctx.lineTo(-p.size / 2, p.size);
        ctx.fill();
        ctx.restore();
        p.rot += p.rotV;
      } else if (p.type === "vacuum") {
        ctx.fillRect(p.x, p.y, 2, 2);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillRect(p.x - p.vx, p.y - p.vy, 2, 2);
      } else if (p.type === "dash_line") {
        ctx.fillRect(p.x, p.y, 20, 2);
      } else {
        ctx.fillRect(p.x, p.y, 4, 4);
      }
    });
    ctx.globalAlpha = 1;
    drawLiveLanes(ctx);
    drawFinisherDim(ctx);
    drawAfterimages(ctx);
    gameState.player.trails.forEach((t) => {
      let ghost = { lane: t.lane, x: t.x, y: t.y, w: 50, h: 110, state: t.state, punchType: t.punchType, hitFrame: t.hitFrame, slipBuff: t.slipBuff, color: "#00ffff" };
      drawBoxer(ctx, ghost, true, t.opacity, true);
    });
    gameState.enemies.forEach((en) => {
      let opacity = en.isActiveThreat ? 1 : 0.4;
      if (gameState.purifyTimer > 0) opacity *= 0.5;
      drawBoxer(ctx, en, false, opacity);
      if (en.isActiveThreat) {
        const { perfect: perfectThresh, good: goodThresh } = CONSTANTS.getSlipThresholds(en.type, gameState.progressionMods.perfectSlipWindowBonus);
        if (en.type === "zoner" && en.attackCooldown < 40 && en.stun <= 0 && gameState.bossIntroTimer <= 0) {
          let intensity = 1 - en.attackCooldown / 40;
          ctx.strokeStyle = `rgba(0, 255, 0, ${intensity})`;
          ctx.lineWidth = 2 + intensity * 6;
          ctx.setLineDash([15, 10]);
          ctx.lineDashOffset = -Date.now() * 0.05;
          ctx.beginPath();
          ctx.moveTo(en.x, en.y - 60);
          ctx.lineTo(gameState.player.x, en.y - 60);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = "#00ff00";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(gameState.player.x, en.y - 60, 20 - intensity * 15, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(0, 255, 0, ${intensity})`;
          ctx.beginPath();
          ctx.arc(gameState.player.x, en.y - 60, 5 + intensity * 10, 0, Math.PI * 2);
          ctx.fill();
        }
        let xOff = 0;
        if (en.attackCooldown <= goodThresh + 6 && en.attackCooldown > perfectThresh && en.stun <= 0 && en.type !== "zoner" && gameState.bossIntroTimer <= 0) {
          xOff = Math.sin(Date.now() * 0.15) * 8;
          let telColor = "#fff";
          let telText = "!";
          if (en.isBoss) {
            if (en.currentMove === "bash") {
              telColor = "#ffaa00";
              telText = "BREAK";
            }
            if (en.currentMove === "feint") {
              telColor = "#aa00ff";
              telText = "?";
            }
          } else if (en.type === "shield" || en.type === "bruiser") {
            telColor = "#ffaa00";
            telText = "BREAK";
          }
          ctx.fillStyle = telColor;
          ctx.font = "bold 20px Orbitron";
          ctx.textAlign = "center";
          ctx.fillText(telText, en.x + en.w / 2 + xOff, en.y - en.h - 10);
          ctx.textAlign = "left";
        }
      } else if (en.attackCooldown <= CONSTANTS.getSlipThresholds(en.type, 0).good + 6 && en.stun <= 0 && en.type !== "zoner" && gameState.bossIntroTimer <= 0) {
        let telColor = "rgba(255,255,255,0.3)";
        let telText = "!";
        if (en.isBoss) {
          if (en.currentMove === "bash") {
            telColor = "rgba(255,170,0,0.3)";
            telText = "BREAK";
          }
          if (en.currentMove === "feint") {
            telColor = "rgba(170,0,255,0.3)";
            telText = "?";
          }
        } else if (en.type === "shield" || en.type === "bruiser") {
          telColor = "rgba(255,170,0,0.3)";
          telText = "BREAK";
        }
        ctx.fillStyle = telColor;
        ctx.font = "bold 12px Orbitron";
        ctx.textAlign = "center";
        ctx.fillText(telText, en.x + en.w / 2, en.y - en.h - 10);
        ctx.textAlign = "left";
      }
      if (en.type === "shield" && en.stun <= 0) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${en.isActiveThreat ? 0.8 : 0.3})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(en.x - 5, en.y);
        ctx.lineTo(en.x - 5, en.y - en.h);
        ctx.stroke();
      }
      if (!en.isBoss) {
        const barY = en.y - en.h - 14, barW = en.w;
        ctx.globalAlpha = opacity;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(en.x, barY, barW, 3);
        ctx.fillStyle = en.color;
        ctx.fillRect(en.x, barY, barW * Math.max(0, en.hp / en.maxHp), 3);
        if ((en.stringLen || 1) > 1) {
          for (let i = 0; i < en.stringLen; i++) {
            ctx.fillStyle = i < (en.stringIdx || 0) ? "#ffffff" : "rgba(255,255,255,0.3)";
            ctx.beginPath();
            ctx.arc(en.x + barW - 4 - i * 9, barY - 7, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        const pressure = en.pressure || 0;
        if (pressure > 0) {
          for (let i = 0; i < pressure; i++) {
            ctx.fillStyle = "#ff0055";
            ctx.fillRect(en.x + i * 7, barY - 6, 5, 3);
          }
        }
        ctx.globalAlpha = 1;
      }
      drawBossTells(ctx, en);
    });
    gameState.player.trailColor = buildColor();
    if (gameState.knockdown) {
      ctx.fillStyle = `rgba(0, 0, 0, ${(0.72 * Math.max(0.25, gameState.knockdown.fall)).toFixed(3)})`;
      ctx.fillRect(-200, -200, gameState.width + 400, gameState.height + 400);
      const k = gameState.knockdown.fall, p = gameState.player;
      ctx.save();
      ctx.translate(p.x + 25, p.y);
      ctx.rotate(-Math.PI / 2 * k);
      ctx.translate(-(p.x + 25), -p.y);
      drawBoxer(ctx, { ...p, state: "hurt" }, true);
      ctx.restore();
    } else if (gameState.player.state === "floored") {
      const p = gameState.player, T = CONSTANTS.PLAYER_HIT.floorFrames, t = p.floorTimer || 0;
      const k = Math.min(1, (T - t) / 7, t / 10);
      ctx.save();
      ctx.translate(p.x + 25, p.y);
      ctx.rotate(-Math.PI / 2 * k);
      ctx.translate(-(p.x + 25), -p.y);
      drawBoxer(ctx, { ...p, state: "hurt" }, true);
      ctx.restore();
    } else {
      const inv = (gameState.player.invuln || 0) > 0 && Math.floor(Date.now() / 80) % 2 === 0;
      drawBoxer(ctx, gameState.player, true, inv ? 0.45 : 1);
    }
    gameState.floatingTexts.forEach((ft) => {
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color;
      ctx.font = "bold 16px Orbitron";
      ctx.textAlign = "center";
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.textAlign = "left";
    });
    ctx.globalAlpha = 1;
    drawKoFx(ctx);
    drawScorePops(ctx);
    ctx.restore();
    if (gameState.screen !== "start") drawBossHud(ctx);
    drawFinisherUI(ctx);
    drawKnockdownUI(ctx);
    drawBossPoster(ctx);
    if (gameState.onboardingMock) drawOnboardingMock(ctx);
    SequenceManager.draw(ctx, gameState.width, gameState.height);
    drawVignette(ctx);
  }

  // src/main.js
  var $2 = function(id) {
    return document.getElementById(id);
  };
  var canvas2 = document.getElementById("gameCanvas");
  var ctx2 = canvas2 ? canvas2.getContext("2d", { alpha: false }) : null;
  var evolutionBadge = (option, rarity) => evolutionLabel(option, rarity);
  function escapeAttr(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  var DRAFT_GRACE_FRAMES = 20;
  function renderDraftFocus() {
    const cards = document.querySelectorAll ? document.querySelectorAll("#draft-container .draft-card") : [];
    cards.forEach((c, i) => c.classList.toggle("focused", i === gameState.draftFocus));
    const hint = document.getElementById("upgrade-hint");
    if (hint) {
      const dev = inputDevice();
      hint.innerHTML = dev === "keyboard" ? `${glyphHTML("left")}${glyphHTML("right")} CHOOSE &nbsp;\xB7&nbsp; <span class="glyph">1</span><span class="glyph">2</span><span class="glyph">3</span> OR ${glyphHTML("confirm")} TAKE IT` : `${glyphHTML("left")}${glyphHTML("right")} CHOOSE &nbsp;\xB7&nbsp; ${glyphHTML("confirm")} TAKE IT`;
    }
  }
  function moveDraftFocus(dir) {
    const n = gameState.currentDraftOptions.length;
    if (!n) return;
    gameState.draftFocus = ((gameState.draftFocus || 0) + dir + n) % n;
    playSound("slip");
    renderDraftFocus();
  }
  function confirmDraftFocus() {
    if (gameState.uiFrame - (gameState.draftOpenedAt || 0) < DRAFT_GRACE_FRAMES) return;
    const opt = gameState.currentDraftOptions[gameState.draftFocus || 0];
    if (opt) applyUpgrade(gameState, opt);
  }
  window.engineFocusDraft = function(i) {
    gameState.draftFocus = i;
    renderDraftFocus();
  };
  function triggerUpgradeDraft() {
    gameState.screen = "upgrading";
    gameState.draftHold = 0;
    gameState.draftOpenedAt = gameState.uiFrame || 0;
    gameState.draftFocus = 0;
    if (!gameState.evoChain || !gameState.evoChain.active) gameState.evoChain = { active: true, total: gameState.pendingUpgrades, picks: [] };
    const title = document.getElementById("upgrade-title");
    if (title) {
      const idx = gameState.evoChain.picks.length + 1, total = Math.max(gameState.evoChain.total, idx);
      title.innerText = total > 1 ? `EVOLUTION ${idx} OF ${total}` : "EVOLUTION";
      title.style.color = total > 1 ? "#ff4fd8" : "#ffffff";
    }
    const sub = document.getElementById("upgrade-sub");
    if (sub) sub.innerText = "CHOOSE ONE";
    let draftOptions = buildDraft(gameState, UPGRADE_POOL);
    const container = document.getElementById("draft-container");
    if (container) {
      container.innerHTML = "";
      draftOptions.forEach((option, index) => {
        const rarity = upgradeRarity(option);
        const color = upgradeColor(option);
        const btnHTML = `
                <div class="draft-card card-${rarity}" style="--card-color:${color}; animation-delay:${index * 90 + (rarity === "fusion" || rarity === "evolved" || rarity === "apex" ? 220 : 0)}ms" onmouseenter="window.engineFocusDraft(${index})" onclick="window.engineApplyUpgradeState('${escapeAttr(option.id)}')">
                    <div class="card-inner">
                        <div class="card-badge">${evolutionBadge(option, rarity)}</div>
                        <div class="card-name">${option.name}</div>
                        <div class="card-desc">${option.desc}</div>
                        <div class="card-key">${inputDevice() === "keyboard" ? `<span class="glyph">${index + 1}</span>` : ""}</div>
                    </div>
                </div>
            `;
        container.insertAdjacentHTML("beforeend", btnHTML);
      });
    }
    renderDraftFocus();
    const rs = draftOptions.map(upgradeRarity);
    const rarest = rs.find((r) => r === "evolved" || r === "fusion" || r === "apex") || rs.find((r) => r === "verb" || r === "mastery");
    if (rarest) setTimeout(() => playSound(rarest === "verb" || rarest === "mastery" ? "sting_mastery" : "sting_fusion"), rarest === "verb" || rarest === "mastery" ? 120 : 300);
    if (HUD.screens.upgrade) HUD.screens.upgrade.style.display = "flex";
  }
  window.engineTriggerUpgradeDraft = triggerUpgradeDraft;
  window.engineTriggerUpgradeDraft = triggerUpgradeDraft;
  window.enginePlayUpgradeVignette = playUpgradeVignette;
  function resetGame() {
    gameState.health = 100;
    gameState.combo = 0;
    gameState.instinctMeter = 0;
    gameState.isInstinct = false;
    gameState.currentStage = 1;
    gameState.stageSpeedMult = 1;
    gameState.wavesCleared = 0;
    gameState.waveTimer = 0;
    gameState.laneFlash = [0, 0, 0];
    gameState.laneTempo = [1, 1, 1];
    gameState.hotLane = -1;
    gameState.hazards = [];
    gameState.hazardCooldown = 90;
    gameState.purifyTimer = 0;
    gameState.hazardsThisStage = 0;
    gameState.surpriseBudget = 0;
    gameState.spawnTotal = gameState.tutorialEnabled ? 0 : 5;
    gameState.stageClearing = false;
    gameState.bossActive = false;
    gameState.bossIntroTimer = 0;
    gameState.tutorialDelay = 0;
    gameState.tutorialGrace = 0;
    gameState.instinctPauseTimer = 0;
    gameState.seenTutorials = { shield: false, slip: false, guard: false, instinct: false, counter: false, ghost_step: false, bruiser_id: false, assassin_id: false, string_id: false, footwork_tip: false };
    gameState.tutorialSlipFails = 0;
    gameState.orbCounts = { speed: 0, power: 0, technique: 0 };
    gameState.stats = { speedMult: 1, powerMult: 1, techMult: 1 };
    gameState.exp = 0;
    gameState.expNeeded = 8;
    gameState.pendingUpgrades = 0;
    gameState.totalLevel = 0;
    gameState.bossDefeatedThisStage = false;
    gameState.draftHold = 0;
    gameState.firstEvolutionGranted = false;
    gameState.acquiredUpgradeIds = [];
    gameState.recentlyOffered = [];
    gameState.currentDraftOptions = [];
    gameState.overclockCounts = { vitality: 0, nerves: 0, focus: 0, instinct: 0, clinch: 0, finish: 0 };
    gameState.progressionMods = {
      ghostStepCooldownMult: 1,
      hookRecoveryMult: 1,
      relentlessRhythm: false,
      crossArmorStunBonus: 0,
      hookKnockbackFloor: 0,
      hardTargetInstinctFlat: 0,
      hardTargetExpFlat: 0,
      perfectSlipWindowBonus: 0,
      bossExposeBonusFrames: 0,
      perfectSlipHeal: 0,
      dempseyCircuit: false,
      dempseyRecoveryBonus: 0,
      ghostCounter: false,
      shatterRead: false,
      shatterReadBossBypass: 0,
      shatterReadStaggerBonus: 0,
      perfectSlipRewardBonusMult: 0,
      instinctGainBonusMult: 0,
      incomingRecoilMult: 1,
      expGainBonusMult: 0,
      guardRead: false,
      blurStep: false,
      executionerCross: false,
      flowState: false
    };
    gameState.statMaxCombo = 0;
    gameState.statTotalSlips = 0;
    gameState.statTotalKills = 0;
    gameState.statBossKills = 0;
    gameState.statCounterHits = 0;
    gameState.statBossBreaks = 0;
    gameState.statRecoilTaken = 0;
    gameState.statDespDamage = 0;
    gameState.statGhostSteps = 0;
    gameState.statFinisherHits = 0;
    gameState.statFinishersClean = 0;
    gameState.score = 0;
    gameState.displayScore = 0;
    gameState.scorePops = [];
    gameState.wagerMult = 1;
    gameState.wagerOffer = null;
    gameState.currentAffix = CONSTANTS.AFFIXES[0];
    gameState.finisher = null;
    gameState.finisherZoom = 1;
    gameState.vignette = null;
    gameState.stageHitsTaken = 0;
    gameState.statFlawless = 0;
    gameState.knockdown = null;
    gameState.knockdownsThisArc = 0;
    gameState.statKnockdowns = 0;
    gameState.zoneTimer = 0;
    gameState.bossPoster = null;
    gameState.enemyEchoes = [];
    gameState.afterimages = [];
    gameState.koFx = [];
    gameState.rankOrder = [];
    gameState.orbPulse = 0;
    gameState.paletteFrom = 1;
    gameState.paletteTo = 1;
    gameState.paletteT = 1;
    gameState.lightSweep = -1;
    setMusicIntensity(0);
    gameState.lastHUD.exp = -1;
    gameState.lastHUD.mult = -1;
    gameState.lastHUD.score = -1;
    gameState.lastHUD.wager = -1;
    gameState.enemies = [];
    gameState.particles = [];
    gameState.floatingTexts = [];
    gameState.shockwaves = [];
    gameState.player = resetPlayerObj();
    gameState.player.y = gameState.height * CONSTANTS.LANE_Y[gameState.player.lane];
    let stageElem = document.getElementById("stage-ui");
    if (stageElem) {
      stageElem.innerText = `ARC 1: SHATTERED CATHEDRAL`;
      stageElem.style.color = "#22d3ee";
      stageElem.classList.remove("stage-pulse");
    }
    let affixElem = document.getElementById("affix-ui");
    if (affixElem) affixElem.innerText = "";
    let barCont = document.getElementById("bar-cont");
    if (barCont) barCont.classList.remove("beast-active");
    ["speed", "power", "technique"].forEach((t) => {
      const orbUI = document.getElementById(`orb-${t}`);
      if (orbUI) orbUI.innerText = "0";
    });
  }
  function hideOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  }
  function startGame(daily = false, opts = {}) {
    if (typeof daily === "object" && daily !== null) {
      opts = daily;
      daily = !!opts.daily;
    }
    gameState.runCount = (gameState.runCount || 0) + 1;
    initAudio();
    const toggle = document.getElementById("tutorial-toggle-cb");
    gameState.tutorialEnabled = opts.tutorial !== void 0 ? !!opts.tutorial : toggle ? toggle.checked === true : true;
    gameState.dailyMode = !!daily;
    gameState.dailyDateKey = daily ? todayKey() : null;
    const runSeed = opts.seed !== void 0 ? opts.seed : daily ? dailySeedFromDate() : Math.random() * 4294967295 >>> 0;
    seedRng(runSeed);
    resetGame();
    gameState.screen = "playing";
    tmStartRun({ seed: runSeed, daily: !!daily });
    ["start-screen", "gameover-screen", "pause-screen", "wager-screen", "upgrade-screen"].forEach(hideOverlay);
    duckMusic(false);
    startMusic();
    SequenceManager.playDynamic([
      { type: "walkin", duration: 50 },
      { type: "billing", duration: 130, card: roundCard(1, openingSubtitle()) },
      { type: "resume" }
    ]);
  }
  function startDailyChallenge() {
    startGame(true);
  }
  window.startDailyChallenge = startDailyChallenge;
  function toggleHowTo() {
    initAudio();
    const howTo = document.getElementById("howto-screen");
    if (gameState.screen === "howto") {
      gameState.screen = gameState.previousScreen;
      if (howTo) howTo.style.display = "none";
    } else {
      gameState.previousScreen = gameState.screen;
      gameState.screen = "howto";
      if (howTo) howTo.style.display = "flex";
    }
  }
  function returnToMenu() {
    gameState.dailyMode = false;
    gameState.dailyDateKey = null;
    resetGame();
    gameState.screen = "start";
    const startScreen = document.getElementById("start-screen");
    if (startScreen) startScreen.style.display = "flex";
    ["pause-screen", "gameover-screen", "wager-screen", "upgrade-screen"].forEach(hideOverlay);
    SequenceManager.active = false;
    SequenceManager.waiting = false;
    stopMusic();
  }
  window.engineApplyUpgradeState = function(id) {
    if (gameState.screen !== "upgrading") return;
    let option = gameState.currentDraftOptions.find((o) => o.id === id);
    if (option) applyUpgrade(gameState, option);
  };
  var PAUSE_TABS = ["resume", "loadout", "settings"];
  var SETTINGS_ROWS = [
    { key: "masterVolume", label: "Master Volume", type: "range" },
    { key: "musicVolume", label: "Music Volume", type: "range" },
    { key: "sfxVolume", label: "SFX Volume", type: "range" },
    { key: "screenShake", label: "Screen Shake", type: "range" },
    { key: "flashIntensity", label: "Flash Intensity", type: "range" },
    { key: "hitStop", label: "Hit-Stop", type: "toggle" },
    { key: "reducedMotion", label: "Reduced Motion", type: "toggle" }
  ];
  var pauseTab = "resume";
  var settingsFocus = 0;
  var BIND_ACTIONS = Object.keys(DEFAULT_BINDS);
  var rebindingAction = null;
  var settingsRowCount = () => SETTINGS_ROWS.length + BIND_ACTIONS.length + 1;
  function renderInstructions() {
    const el = document.getElementById("instructions");
    if (!el) return;
    const K2 = getBinds(), L = (c) => keyLabel(c);
    el.innerHTML = `<span class="text-cyan-400">[${L(K2.up)}/${L(K2.down)}]</span> SLIP &nbsp;|&nbsp; <span class="text-cyan-400">[${L(K2.ghost)}]</span> GHOST STEP &nbsp;|&nbsp; <span class="text-cyan-400">[${L(K2.left)}/${L(K2.right)}]</span> FOOTWORK &nbsp;|&nbsp; <span class="text-pink-500">[${L(K2.jab)}]</span> JAB &nbsp;|&nbsp; <span class="text-pink-500">[${L(K2.cross)}]</span> CROSS &nbsp;|&nbsp; <span class="text-pink-500">[${L(K2.hook)}]</span> HOOK &nbsp;|&nbsp; <span class="text-gray-400">[${L(K2.guard)}]</span> GUARD &nbsp;|&nbsp; <span class="text-yellow-400">[${L(K2.instinct)}]</span> INSTINCT<br><span class="text-gray-500">PAD: X JAB \xB7 Y CROSS \xB7 B HOOK \xB7 LB GHOST \xB7 RB GUARD \xB7 A INSTINCT</span>`;
    let done = 0;
    try {
      done = loadMeta().totalRuns;
    } catch (e) {
    }
    el.classList.toggle("hidden", done >= 1);
  }
  function openPause() {
    if (gameState.screen !== "playing") return;
    gameState.screen = "paused";
    duckMusic(true);
    setPauseTab("resume");
    const p = document.getElementById("pause-screen");
    if (p) p.style.display = "flex";
  }
  function closePause() {
    if (gameState.screen !== "paused") return;
    gameState.screen = "playing";
    duckMusic(false);
    const p = document.getElementById("pause-screen");
    if (p) p.style.display = "none";
  }
  window.engineClosePause = closePause;
  function setPauseTab(tab) {
    if (!PAUSE_TABS.includes(tab)) return;
    pauseTab = tab;
    PAUSE_TABS.forEach((t) => {
      const btn = document.getElementById(`ptab-${t}`), panel = document.getElementById(`ppanel-${t}`);
      if (btn) btn.classList.toggle("active", t === tab);
      if (panel) panel.style.display = t === tab ? "block" : "none";
    });
    if (tab === "loadout") renderLoadout();
    if (tab === "settings") renderSettings();
  }
  window.engineSetPauseTab = setPauseTab;
  function cyclePauseTab(dir) {
    const i = PAUSE_TABS.indexOf(pauseTab);
    setPauseTab(PAUSE_TABS[(i + dir + PAUSE_TABS.length) % PAUSE_TABS.length]);
  }
  var TREE_COLOR = { speed: CONSTANTS.TREES.speed.color, power: CONSTANTS.TREES.power.color, technique: CONSTANTS.TREES.technique.color };
  var OC_NAMES = { vitality: "oc_vital_surge", nerves: "oc_quick_nerves", focus: "oc_sharp_eye", instinct: "oc_calm_engine", clinch: "oc_clinch_breaker", finish: "oc_clean_finish" };
  function findUpgrade(id) {
    return [...UPGRADE_POOL.orbs, ...UPGRADE_POOL.masteries, ...UPGRADE_POOL.fusions, ...UPGRADE_POOL.overclocks].find((u) => u.id === id);
  }
  var loadoutSel = { row: 0, col: 0 };
  function loadoutRows() {
    const rows = CONSTANTS.TREE_ORDER.map((tree) => UPGRADE_POOL.orbs.filter((o) => o.tree === tree).sort((a, b) => a.rank - b.rank));
    const owned = gameState.acquiredUpgradeIds.map(findUpgrade).filter((u) => u && u.kind !== "rank");
    const ocs = Object.entries(gameState.overclockCounts).filter(([, n]) => n > 0).map(([k, n]) => {
      const u = findUpgrade(OC_NAMES[k]);
      return u ? { ...u, stack: n } : null;
    }).filter(Boolean);
    const extra = [...owned, ...ocs];
    if (extra.length) rows.push(extra);
    return rows;
  }
  function loadoutStatus(u) {
    if (u.kind !== "rank") return { text: u.stack ? `OWNED \xD7${u.stack}` : "OWNED", cls: "on" };
    const have = gameState.orbCounts[u.tree] || 0;
    if (u.rank <= have) return { text: "OWNED", cls: "on" };
    if (u.rank === have + 1) return { text: "NEXT", cls: "next" };
    return { text: "NOT YET", cls: "" };
  }
  function renderLoadout() {
    const el = document.getElementById("loadout-body");
    if (!el) return;
    const rows = loadoutRows();
    loadoutSel.row = Math.min(loadoutSel.row, rows.length - 1);
    loadoutSel.col = Math.min(loadoutSel.col, rows[loadoutSel.row].length - 1);
    const sel = rows[loadoutSel.row][loadoutSel.col];
    const sStat = loadoutStatus(sel);
    const detail = `<div class="lo-detail" style="--card-color:${upgradeColor(sel)}">
        <div class="lo-badge">${evolutionBadge(sel, upgradeRarity(sel))} \xB7 <span class="lo-state ${sStat.cls}">${sStat.text}</span></div>
        <div class="lo-name">${sel.name}</div><div class="lo-desc">${sel.desc}</div></div>`;
    const chip = (u, r, c) => {
      const s = loadoutStatus(u), selected = r === loadoutSel.row && c === loadoutSel.col;
      const label = u.kind === "rank" ? `${u.rank}. ${u.name}` : u.name + (u.stack ? ` \xD7${u.stack}` : "");
      return `<span class="lo-rank ${s.cls} ${selected ? "sel" : ""}" style="--tree-color:${upgradeColor(u)}" onmouseenter="window.engineLoadoutSelect(${r},${c})" onclick="window.engineLoadoutSelect(${r},${c})">${label}</span>`;
    };
    const treeRows = CONSTANTS.TREE_ORDER.map((tree, r) => {
      const lvl = gameState.orbCounts[tree] || 0;
      return `<div class="lo-orb" style="--tree-color:${TREE_COLOR[tree]}"><span class="lo-orb-name" style="color:${TREE_COLOR[tree]}">${CONSTANTS.TREES[tree].name} ${lvl}/5</span>${rows[r].map((u, c) => chip(u, r, c)).join("")}</div>`;
    }).join("");
    const extraRow = rows.length > 3 ? `<h4 class="lo-h">Masteries, Fusions &amp; Overclocks</h4><div class="lo-orb">${rows[3].map((u, c) => chip(u, 3, c)).join("")}</div>` : '<div class="lo-empty">Masteries and Fusions you pick will appear here.</div>';
    const wager = gameState.wagerMult > 1 && gameState.currentAffix ? `<div class="lo-wager">ACTIVE WAGER: <b>${gameState.currentAffix.name}</b> \xD7${gameState.wagerMult} score \u2014 ${gameState.currentAffix.desc}</div>` : "";
    el.innerHTML = `${wager}${detail}<h4 class="lo-h">Evolution Trees</h4>${treeRows}${extraRow}
        <div class="set-hint">${glyphHTML("up")}${glyphHTML("down")}${glyphHTML("left")}${glyphHTML("right")} browse \xB7 every evolution explained above</div>`;
  }
  window.engineLoadoutSelect = function(r, c) {
    loadoutSel = { row: r, col: c };
    renderLoadout();
  };
  function moveLoadoutSel(dr, dc) {
    const rows = loadoutRows();
    let r = Math.max(0, Math.min(rows.length - 1, loadoutSel.row + dr));
    let c = dr ? Math.min(loadoutSel.col, rows[r].length - 1) : (loadoutSel.col + dc + rows[r].length) % rows[r].length;
    loadoutSel = { row: r, col: c };
    renderLoadout();
  }
  function renderSettings() {
    const el = document.getElementById("settings-body");
    if (!el) return;
    const s = getSettings();
    el.innerHTML = SETTINGS_ROWS.map((row, i) => {
      const focus = i === settingsFocus ? " focused" : "";
      if (row.type === "range") {
        const v = Math.round(s[row.key] * 100);
        return `<div class="set-row${focus}" data-i="${i}"><label>${row.label}</label><input type="range" min="0" max="100" step="5" value="${v}" oninput="window.engineSetSetting('${row.key}', this.value / 100, true)"><span class="set-val">${v}%</span></div>`;
      }
      const on = s[row.key] === true;
      return `<div class="set-row${focus}" data-i="${i}"><label>${row.label}</label><button class="set-toggle ${on ? "on" : ""}" onclick="window.engineSetSetting('${row.key}', ${!on})">${on ? "ON" : "OFF"}</button></div>`;
    }).join("") + '<h4 class="lo-h" style="margin-top:14px">Controls</h4>' + BIND_ACTIONS.map((a, j) => {
      const i = SETTINGS_ROWS.length + j;
      const focus = i === settingsFocus ? " focused" : "";
      const waiting = rebindingAction === a;
      return `<div class="set-row bind-row${focus}" data-i="${i}"><label>${BIND_LABELS[a]}</label><button class="bind-key ${waiting ? "waiting" : ""}" onclick="window.engineStartRebind('${a}')">${waiting ? "PRESS A KEY\u2026" : keyLabel(getBinds()[a])}</button></div>`;
    }).join("") + `<div class="set-row${settingsFocus === settingsRowCount() - 1 ? " focused" : ""}" data-i="${settingsRowCount() - 1}"><label>Reset Controls</label><button class="set-toggle" onclick="window.engineResetBinds()">RESET</button></div><div class="set-hint">[\u2191/\u2193] select \xB7 [\u2190/\u2192] adjust \xB7 [ENTER] toggle / rebind \xB7 [ESC] cancels a rebind \xB7 saved automatically \xB7 gamepad layout is fixed</div>`;
  }
  window.engineSetSetting = function(key, value, fromSlider = false) {
    setSetting(key, value);
    refreshAudioLevels();
    if (fromSlider) {
      const row = SETTINGS_ROWS.findIndex((r) => r.key === key);
      const val = document.querySelector(`#settings-body .set-row[data-i="${row}"] .set-val`);
      if (val) val.innerText = `${Math.round(getSettings()[key] * 100)}%`;
    } else renderSettings();
  };
  window.engineStartRebind = function(action) {
    rebindingAction = action;
    renderSettings();
  };
  window.engineResetBinds = function() {
    resetBinds();
    rebindingAction = null;
    renderSettings();
    renderInstructions();
  };
  function adjustFocusedSetting(dir) {
    if (settingsFocus >= SETTINGS_ROWS.length) {
      const j = settingsFocus - SETTINGS_ROWS.length;
      if (j < BIND_ACTIONS.length) window.engineStartRebind(BIND_ACTIONS[j]);
      else window.engineResetBinds();
      return;
    }
    const row = SETTINGS_ROWS[settingsFocus];
    const s = getSettings();
    if (row.type === "range") setSetting(row.key, Math.round((s[row.key] + dir * 0.05) * 100) / 100);
    else setSetting(row.key, !s[row.key]);
    refreshAudioLevels();
    renderSettings();
  }
  function pauseKey(code) {
    if (code === "KeyQ") {
      cyclePauseTab(-1);
      return;
    }
    if (code === "KeyE" || code === "Tab") {
      cyclePauseTab(1);
      return;
    }
    if (pauseTab === "settings") {
      const n = settingsRowCount();
      const onRange = settingsFocus < SETTINGS_ROWS.length && SETTINGS_ROWS[settingsFocus].type === "range";
      if (code === "ArrowUp") {
        settingsFocus = (settingsFocus - 1 + n) % n;
        renderSettings();
      } else if (code === "ArrowDown") {
        settingsFocus = (settingsFocus + 1) % n;
        renderSettings();
      } else if (code === "ArrowLeft" && onRange) adjustFocusedSetting(-1);
      else if (code === "ArrowRight" && onRange) adjustFocusedSetting(1);
      else if (code === "Enter" || code === "Space") {
        if (!onRange) adjustFocusedSetting(1);
      }
      return;
    }
    if (pauseTab === "loadout") {
      if (code === "ArrowUp") moveLoadoutSel(-1, 0);
      else if (code === "ArrowDown") moveLoadoutSel(1, 0);
      else if (code === "ArrowLeft") moveLoadoutSel(0, -1);
      else if (code === "ArrowRight") moveLoadoutSel(0, 1);
      return;
    }
    if (pauseTab === "resume") {
      if (code === "ArrowUp") moveMenu(-1);
      else if (code === "ArrowDown") moveMenu(1);
      else if (code === "Enter" || code === "Space") activateMenu();
    }
  }
  function renderWagerPrompts() {
    const a = document.getElementById("wager-accept-key"), d = document.getElementById("wager-decline-key");
    const kb = inputDevice() === "keyboard";
    if (a) a.innerHTML = kb ? '<span class="glyph">1</span> / <span class="glyph">ENTER</span>' : glyphHTML("confirm");
    if (d) d.innerHTML = kb ? '<span class="glyph">2</span> / <span class="glyph">ESC</span>' : glyphHTML("back");
  }
  function showWager() {
    renderWagerPrompts();
    const offer = gameState.wagerOffer;
    if (!offer) {
      SequenceManager.resumeFromWait();
      return;
    }
    gameState.screen = "wager";
    playSound("wager");
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.innerText = v;
    };
    set("wager-name", offer.name);
    set("wager-desc", offer.desc);
    set("wager-mult", `\xD7${offer.scoreMult} SCORE THIS STAGE`);
    const w = document.getElementById("wager-screen");
    if (w) w.style.display = "flex";
  }
  window.engineShowWager = showWager;
  function resolveWager(accept) {
    if (gameState.screen !== "wager") return;
    const w = document.getElementById("wager-screen");
    if (w) w.style.display = "none";
    gameState.screen = "playing";
    if (accept) {
      const a = acceptWager();
      playSound("perfect_slip");
      if (a) SequenceManager.injectNext([{ type: "text", title: `WAGER ACCEPTED \xD7${a.scoreMult}`, subtitle: a.name, duration: 80 }]);
    } else {
      declineWager();
    }
    refreshStageHud();
    SequenceManager.resumeFromWait();
  }
  window.engineResolveWager = resolveWager;
  function pollGamepad() {
    let gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i].connected) {
        gp = gamepads[i];
        break;
      }
    }
    if (gp) {
      let p = (btn) => gp.buttons[btn] && gp.buttons[btn].pressed;
      let jp = (btn) => p(btn) && !gameState.lastGamepadState.buttons[btn];
      let aU = gp.axes[1] < -0.5 || gp.axes[3] < -0.5, aD = gp.axes[1] > 0.5 || gp.axes[3] > 0.5;
      const aL = gp.axes[0] < -0.5, aR = gp.axes[0] > 0.5;
      const stickLeft = aL && !gameState.lastGamepadState.axes[2], stickRight = aR && !gameState.lastGamepadState.axes[3];
      gameState.pad.up = jp(12) || aU && !gameState.lastGamepadState.axes[0];
      gameState.pad.down = jp(13) || aD && !gameState.lastGamepadState.axes[1];
      gameState.pad.ghost = jp(4) || jp(6);
      gameState.pad.guard = p(5) || p(7);
      gameState.pad.leftHeld = p(14) || gp.axes[0] < -0.5;
      gameState.pad.rightHeld = p(15) || gp.axes[0] > 0.5;
      gameState.pad.jab = jp(2);
      gameState.pad.cross = jp(3);
      gameState.pad.crossHeld = p(3);
      gameState.pad.hook = jp(1);
      gameState.pad.instinct = jp(0);
      gameState.pad.pause = jp(9) || jp(16);
      const anyPress = gp.buttons.some((b, i) => jp(i));
      if (anyPress || aU || aD || aL || aR) {
        const fam = padFamily(gp.id);
        if (gameState.inputDevice !== fam) {
          setInputDevice(fam);
          onDeviceChanged();
        }
      }
      const navUp = gameState.pad.up || stickLeft, navDown = gameState.pad.down || stickRight;
      if (gameState.screen === "start") {
        if (navUp) moveMenu(-1);
        else if (navDown) moveMenu(1);
        else if (jp(0)) activateMenu();
        else if (gameState.pad.pause) startGame();
      } else if (gameState.screen === "playing") {
        if (posterWaiting()) {
          if (anyPress) confirmPoster();
        } else if (gameState.pad.pause && !SequenceManager.active && !gameState.finisher) openPause();
      } else if (gameState.screen === "paused") {
        if (gameState.pad.pause) closePause();
        else if (jp(4)) cyclePauseTab(-1);
        else if (jp(5)) cyclePauseTab(1);
        else if (gameState.pad.up) pauseKey("ArrowUp");
        else if (gameState.pad.down) pauseKey("ArrowDown");
        else if (jp(14)) pauseKey("ArrowLeft");
        else if (jp(15)) pauseKey("ArrowRight");
        else if (gameState.pad.instinct) pauseKey("Enter");
        else if (gameState.pad.hook) closePause();
      } else if (gameState.screen === "tutorial") {
        if (gameState.pad.instinct || gameState.pad.jab || gameState.pad.cross) dismissTutorial();
      } else if (gameState.screen === "vignette") {
        if (anyPress) skipVignette();
      } else if (gameState.screen === "wager") {
        if (jp(0)) resolveWager(true);
        else if (jp(1)) resolveWager(false);
      } else if (gameState.screen === "upgrading") {
        if (jp(14) || stickLeft) moveDraftFocus(-1);
        else if (jp(15) || stickRight) moveDraftFocus(1);
        else if (jp(0)) confirmDraftFocus();
      } else if (gameState.screen === "records" || gameState.screen === "howto") {
        if (jp(0) || jp(1)) activateMenu(true);
      } else if (gameState.screen === "gameover") {
        if (navUp) moveMenu(-1);
        else if (navDown) moveMenu(1);
        else if (jp(0)) activateMenu();
        else if (jp(1)) returnToMenu();
      }
      for (let i = 0; i < gp.buttons.length; i++) gameState.lastGamepadState.buttons[i] = p(i);
      gameState.lastGamepadState.axes[0] = aU;
      gameState.lastGamepadState.axes[1] = aD;
      gameState.lastGamepadState.axes[2] = aL;
      gameState.lastGamepadState.axes[3] = aR;
    }
  }
  window.startGame = window.engineStartGame = startGame;
  window.toggleHowTo = window.engineToggleHowTo = toggleHowTo;
  window.dismissTutorial = window.engineDismissTutorial = dismissTutorial;
  window.returnToMenu = window.engineReturnToMenu = returnToMenu;
  window.addEventListener("keydown", (e) => {
    if (rebindingAction) {
      if (e.preventDefault) e.preventDefault();
      if (e.code !== "Escape") {
        if (!rebind(rebindingAction, e.code)) showToast("THAT KEY IS RESERVED", "#ff8800");
      }
      rebindingAction = null;
      renderSettings();
      renderInstructions();
      return;
    }
    gameState.keys[e.code] = true;
    if (gameState.inputDevice !== "keyboard") {
      setInputDevice("keyboard");
      onDeviceChanged();
    }
    if (gameState.screen === "records") {
      if (e.code === "Escape" || e.code === "KeyH" || e.code === "Enter") toggleRecords();
      return;
    }
    if (gameState.screen === "start") {
      if (e.code === "ArrowUp") {
        moveMenu(-1);
        return;
      }
      if (e.code === "ArrowDown") {
        moveMenu(1);
        return;
      }
      if (e.code === "Enter") {
        activateMenu();
        return;
      }
      if (e.code === "Space" || e.code === "KeyA") {
        startGame();
        return;
      }
    }
    if (gameState.screen === "gameover" && (e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "Enter")) {
      if (e.code === "Enter") activateMenu();
      else moveMenu(e.code === "ArrowUp" ? -1 : 1);
      return;
    }
    if (gameState.screen === "vignette") {
      if (!e.repeat) skipVignette();
      return;
    }
    if (posterWaiting()) {
      if (!e.repeat) confirmPoster();
      return;
    }
    if (gameState.screen === "wager") {
      if (e.code === "Digit1" || e.code === "KeyA" || e.code === "Enter") resolveWager(true);
      else if (e.code === "Digit2" || e.code === "KeyD" || e.code === "Escape") resolveWager(false);
      return;
    }
    if (e.code === "KeyP" || e.code === "Escape" && gameState.screen !== "howto" && gameState.screen !== "tutorial") {
      if (gameState.screen === "playing" && !gameState.finisher && !gameState.knockdown) openPause();
      else if (gameState.screen === "paused") closePause();
      return;
    }
    if (gameState.screen === "paused" && e.code !== "KeyH" && e.code !== "KeyM") {
      if (e.code === "Tab") e.preventDefault && e.preventDefault();
      pauseKey(e.code);
      return;
    }
    if (e.code === "KeyM") {
      toggleAudio();
      return;
    }
    if (e.code === "KeyH") {
      toggleHowTo();
      return;
    }
    if (gameState.screen === "tutorial" && (e.code === "Enter" || e.code === "Space")) {
      dismissTutorial();
      return;
    }
    if (gameState.screen === "upgrading") {
      if (e.repeat) return;
      if (e.code === "Digit1" && gameState.currentDraftOptions[0]) applyUpgrade(gameState, gameState.currentDraftOptions[0]);
      else if (e.code === "Digit2" && gameState.currentDraftOptions[1]) applyUpgrade(gameState, gameState.currentDraftOptions[1]);
      else if (e.code === "Digit3" && gameState.currentDraftOptions[2]) applyUpgrade(gameState, gameState.currentDraftOptions[2]);
      else if (e.code === "ArrowLeft") moveDraftFocus(-1);
      else if (e.code === "ArrowRight") moveDraftFocus(1);
      else if (e.code === "Enter" || e.code === "Space") confirmDraftFocus();
      return;
    }
    if (gameState.screen === "gameover" && e.code === "KeyR") {
      startGame();
      return;
    }
  });
  window.addEventListener("keyup", (e) => {
    gameState.keys[e.code] = false;
  });
  window.addEventListener("pointerdown", () => {
    if (gameState.screen === "vignette") skipVignette();
    else confirmPoster();
  });
  function tutorialRunning() {
    return gameState.currentStage === 1 && gameState.tutorialEnabled && (gameState.spawnTotal < 5 || gameState.enemies.some((e) => e.tutorialType));
  }
  function maybeGrantFirstEvolution() {
    if (gameState.firstEvolutionGranted) return;
    if (gameState.totalLevel > 0 || gameState.pendingUpgrades > 0) {
      gameState.firstEvolutionGranted = true;
      return;
    }
    if (gameState.currentStage !== 1 || gameState.enemies.length > 0) return;
    const ready = gameState.tutorialEnabled ? gameState.spawnTotal >= 5 && !tutorialRunning() : gameState.statTotalKills >= 3;
    if (ready) {
      gameState.firstEvolutionGranted = true;
      gameState.exp = Math.max(gameState.exp, gameState.expNeeded);
    }
  }
  var DRAFT_HOLD_FRAMES = 20;
  function update() {
    if (gameState.screen !== "playing") return;
    tmTick();
    if (gameState.finisher) {
      if (gameState.shake > 0) gameState.shake *= 0.9;
      const f = gameState.finisher;
      if (f.freeze <= 0 && f.frame % 2 === 0) updateParticlesAndTrails();
      updateFinisher();
      if (typeof updateHUD === "function") updateHUD();
      return;
    }
    if (gameState.knockdown) {
      if (gameState.shake > 0) gameState.shake *= 0.9;
      updateParticlesAndTrails();
      const r = updateKnockdown();
      if (r === "out") {
        endRun();
        return;
      }
      if (typeof updateHUD === "function") updateHUD();
      return;
    }
    if (gameState.hitstop > 0) {
      if (!hitStopEnabled()) gameState.hitstop = 0;
      else {
        gameState.hitstop--;
        return;
      }
    }
    if (gameState.shake > 0) gameState.shake *= 0.88;
    updateAtmosphere();
    updateParticlesAndTrails();
    if (SequenceManager.active) {
      SequenceManager.update();
      if (typeof updateHUD === "function") updateHUD();
      return;
    }
    if (gameState.tutorialGrace > 0) gameState.tutorialGrace--;
    if (gameState.tutorialDelay > 0) gameState.tutorialDelay--;
    if (gameState.bossIntroTimer > 0 && !posterWaiting()) gameState.bossIntroTimer--;
    if (gameState.instinctPauseTimer > 0) {
      gameState.instinctPauseTimer--;
    } else if (gameState.isInstinct) {
      if (!(gameState.zoneTimer > 0)) gameState.instinctMeter -= 0.25;
      if (gameState.instinctMeter <= 0) {
        gameState.isInstinct = false;
        let barCont = document.getElementById("bar-cont");
        if (barCont) barCont.classList.remove("beast-active");
      }
    }
    let banner = document.getElementById("instinct-ready-banner");
    if (gameState.instinctMeter >= 100 && !gameState.isInstinct) {
      if (!gameState.seenTutorials.instinct) {
        triggerTutorial("instinct", "INSTINCT MAXED", `Your meter is full!<br><br>Press <span class="text-cyan-400 font-bold">[${keyName("instinct")}] / pad A</span> to unleash Instinct &mdash; double knockback and massive hitstop.<br><br><b>Or hold it:</b> land a <span class="text-white font-bold">Perfect Slip</span> on a full meter and you drop into <span class="text-white font-bold">THE ZONE</span> &mdash; the world slows down around you.`);
        return;
      } else if (banner) banner.style.display = "block";
    } else if (banner) banner.style.display = "none";
    let worldTick = true;
    if (gameState.zoneTimer > 0) {
      const inReach = gameState.enemies.some((e) => e.hp > 0 && Math.abs(e.x - gameState.player.x) < 280);
      const anyOnScreen = gameState.enemies.some((e) => e.hp > 0 && e.x < gameState.width);
      if (inReach || !anyOnScreen || (gameState.zoneHold = (gameState.zoneHold || 0) + 1) > CONSTANTS.ZONE.maxHold) gameState.zoneTimer--;
      worldTick = (gameState.frameCount = (gameState.frameCount || 0) + 1) % CONSTANTS.ZONE.enemyTick === 0;
      if (gameState.zoneTimer === 0) spawnFloatingText(gameState.player.x, gameState.player.y - 140, "ZONE OUT", "#9ca3af");
    }
    updatePlayer();
    if (worldTick) {
      updateEnemies();
      if (typeof updateBosses === "function") updateBosses();
    }
    if (gameState.finisher) {
      if (typeof updateHUD === "function") updateHUD();
      return;
    }
    if (worldTick) {
      maybeScheduleHazard();
      updateHazards();
    }
    maybeGrantFirstEvolution();
    while (gameState.exp >= gameState.expNeeded) {
      gameState.exp -= gameState.expNeeded;
      gameState.totalLevel++;
      gameState.expNeeded = Math.floor(8 * Math.pow(1.12, gameState.totalLevel));
      gameState.pendingUpgrades++;
      showToast("EVOLUTION CHARGED!", "#00ffff");
      playSound("perfect_slip");
    }
    if (gameState.stageClearing && gameState.enemies.length === 0 && !gameState.bossActive && gameState.screen === "playing" && gameState.purifyTimer <= 0) {
      if (CONSTANTS.isBossStage(gameState.currentStage) && !gameState.bossDefeatedThisStage) {
        if (typeof spawnBoss === "function") spawnBoss();
      } else {
        advanceStage();
        if (typeof updateHUD === "function") updateHUD();
        return;
      }
    }
    if (gameState.health <= 0) {
      if (canBeKnockedDown()) {
        startKnockdown();
        if (typeof updateHUD === "function") updateHUD();
        return;
      }
      endRun();
      return;
    }
    gameState.health = Math.round(gameState.health);
    if (typeof updateHUD === "function") updateHUD();
    if (!gameState.seenTutorials.footwork_tip && gameState.currentStage === 1 && gameState.enemies.length === 0 && (!gameState.tutorialEnabled || gameState.spawnTotal >= 5)) {
      triggerTutorial("footwork_tip", "FOOTWORK", `You are not locked to one spot.<br><br>Hold <span class="text-cyan-400 font-bold">[${keyName("right")}]</span> to press forward and meet them early; hold <span class="text-cyan-400 font-bold">[${keyName("left")}]</span> to give ground and buy a beat. While you're fighting you hold your position.<br><br>Ghost Step has its own button: <span class="text-cyan-400 font-bold">[${keyName("ghost")}]</span> &mdash; a short invincible dash straight through an attack.`);
      return;
    }
    if (gameState.pendingUpgrades > 0 && gameState.enemies.length === 0 && !gameState.bossActive && !gameState.stageClearing && gameState.bossIntroTimer <= 0 && !tutorialRunning()) {
      if (++gameState.draftHold >= DRAFT_HOLD_FRAMES) {
        triggerUpgradeDraft();
        return;
      }
    } else gameState.draftHold = 0;
    spawnEnemy();
  }
  function endRun() {
    gameState.screen = "gameover";
    stopMusic();
    if (HUD.finalStage) HUD.finalStage.innerText = `STAGE REACHED: ${gameState.currentStage}`;
    const runMode = document.getElementById("run-mode-ui");
    if (runMode) runMode.innerText = gameState.dailyMode ? `DAILY CHALLENGE \xB7 ${gameState.dailyDateKey}` : "";
    const score = Math.max(0, Math.round(gameState.score || 0));
    const grade = rankForRun({ score, slips: gameState.statTotalSlips, bossKills: gameState.statBossKills });
    const prev = gameState.dailyMode ? loadDailyBest() : loadBest();
    const delta = pbDeltaText(score, prev ? prev.score : null);
    const statGrade = document.getElementById("stat-grade");
    if (statGrade) {
      statGrade.innerText = grade;
      statGrade.className = `rank-letter rank-${grade}`;
    }
    const pb = document.getElementById("pb-delta");
    if (pb) {
      pb.innerText = (gameState.dailyMode ? "DAILY: " : "") + delta.text;
      pb.className = `pb-delta pb-${delta.kind}`;
    }
    const setText = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.innerText = v;
    };
    setText("stat-combo", gameState.statMaxCombo);
    setText("stat-slips", gameState.statTotalSlips);
    setText("stat-ghosts", gameState.statGhostSteps || 0);
    setText("stat-kills", gameState.statTotalKills);
    setText("stat-bosses", gameState.statBossKills);
    setText("stat-finishers", `${gameState.statFinishersClean || 0} clean \xB7 ${gameState.statFinisherHits || 0} hits`);
    setText("stat-build", `FINAL BUILD: SPD ${gameState.orbCounts.speed} | PWR ${gameState.orbCounts.power} | TEC ${gameState.orbCounts.technique}`);
    setText("stat-score", score.toLocaleString());
    const runResult = commitRun(score, grade, gameState.currentStage);
    const endedBy = liveRun() && liveRun().lastDamageSrc;
    const rec17 = tmEndRun({ stage: gameState.currentStage, score, grade });
    const rt = document.getElementById("run-time-ui");
    if (rt && rec17) rt.innerText = `RUN TIME ${fmtTime(rec17.frames)} \xB7 ROUND ${gameState.currentStage}${endedBy ? " \xB7 ENDED BY " + prettySource(endedBy) : ""}`;
    const rec = commitRunRecord({ score, grade, stage: gameState.currentStage, daily: gameState.dailyMode, bossKills: gameState.statBossKills });
    const submittable = { name: getAlias(), score, grade, stage: gameState.currentStage, daily: gameState.dailyMode, dateKey: gameState.dailyDateKey };
    if (getOnlineOptIn() && isSubmittableRun(submittable)) submitScore(submittable);
    const scStreak = document.getElementById("stat-streak");
    if (scStreak) scStreak.innerText = `${gameState.statBossKills}${rec.bestBossStreak > gameState.statBossKills ? ` (best ${rec.bestBossStreak})` : ""}`;
    const rankLine = document.getElementById("run-rank-ui");
    if (rankLine) rankLine.innerText = rec.rank > 0 ? `LEADERBOARD #${rec.rank}` : "";
    if (rec.newUnlocks && rec.newUnlocks.length) {
      rec.newUnlocks.filter((id) => id !== "cyan").forEach((id) => {
        const skin = STRIKER_SKINS.find((s) => s.id === id);
        if (skin) showToast(`STRIKER UNLOCKED: ${skin.name.toUpperCase()}`, skin.color);
      });
    }
    const nb = document.getElementById("new-best");
    if (nb) {
      if (gameState.dailyMode) {
        nb.innerText = "NEW DAILY BEST";
        nb.style.display = runResult.isDailyBest ? "block" : "none";
      } else {
        nb.innerText = "NEW PERSONAL BEST";
        nb.style.display = runResult.isBest ? "block" : "none";
      }
    }
    renderInstructions();
    if (HUD.screens.gameover) HUD.screens.gameover.style.display = "flex";
  }
  var SAVE_KEY = "neon_strike_best_v1";
  var DAILY_KEY = "neon_strike_daily_v1";
  function loadDailyBest() {
    try {
      const raw = localStorage.getItem(DAILY_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return d && d.dateKey === todayKey() ? d : null;
    } catch (e) {
      return null;
    }
  }
  function saveDailyBest(entry) {
    try {
      localStorage.setItem(DAILY_KEY, JSON.stringify(entry));
    } catch (e) {
    }
  }
  function loadBest() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const b = JSON.parse(raw);
      return b && typeof b.score === "number" ? b : null;
    } catch (e) {
      return null;
    }
  }
  function saveBest(best) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(best));
    } catch (e) {
    }
  }
  function renderBest() {
    const el = document.getElementById("best-run");
    if (el) {
      const b = loadBest();
      el.innerHTML = b ? `BEST RUN<br><b>${b.grade}</b> &middot; STAGE ${b.stage} &middot; ${b.score.toLocaleString()} PTS` : `BEST RUN<br><b>\u2014</b> NO RECORD YET`;
    }
    const daily = document.getElementById("daily-sub");
    if (daily) {
      const d = loadDailyBest();
      daily.innerText = d ? `Today's best: ${d.grade} \xB7 ${d.score.toLocaleString()} pts` : `Same seed for everyone, today only`;
    }
  }
  function commitRun(score, grade, stage2) {
    const prev = loadBest();
    const isBest = !prev || score > prev.score;
    if (isBest) saveBest({ score, grade, stage: stage2, at: Date.now() });
    let isDailyBest = false;
    if (gameState.dailyMode) {
      const prevDaily = loadDailyBest();
      isDailyBest = !prevDaily || score > prevDaily.score;
      if (isDailyBest) saveDailyBest({ score, grade, stage: stage2, dateKey: gameState.dailyDateKey, at: Date.now() });
    }
    renderBest();
    return { isBest, isDailyBest };
  }
  var SOURCE_NAMES = { grunt: "GRUNT", shield: "SHIELD", bruiser: "BRUISER", assassin: "ASSASSIN", zoner: "ZONER", hazard: "RAIL HAZARD", live_lane: "LIVE LANE", negative_echo: "NEGATIVE ECHO", neon_enforcer: "NEON ENFORCER", phantom_boxer: "PHANTOM BOXER", static_monk: "STATIC MONK", live_wire: "LIVE WIRE", negative: "NEGATIVE" };
  function prettySource(s) {
    return SOURCE_NAMES[s] || String(s).toUpperCase();
  }
  function renderRunData() {
    const el = document.getElementById("run-data");
    if (!el) return;
    const sum = summarizeTelemetry(loadTelemetry());
    if (!sum.runs) {
      el.innerHTML = '<div class="opacity-60 text-xs py-2">No recorded runs yet.</div>';
      return;
    }
    const stages = Object.keys(sum.reached).map(Number).sort((a, b) => a - b);
    const rows = stages.map((s) => `<div class="rd-row"><span>R${s}</span><span>${sum.reached[s]} reached</span><span class="${sum.ends[s] ? "rd-end" : ""}">${sum.ends[s] || 0} ended</span><span>${fmtTime(sum.avgTime[s])} avg</span></div>`).join("");
    const hurt = sum.topHurt.slice(0, 5).map(([k, v]) => `<span class="rd-chip">${prettySource(k)} ${v}</span>`).join("");
    el.innerHTML = `<div class="rd-sub">LAST ${sum.runs} RUNS \xB7 WHAT HITS YOU (total damage)</div><div class="rd-chips">${hurt}</div>
        <div class="rd-sub">WHERE RUNS END</div><div class="rd-table">${rows}</div>`;
  }
  window.engineExportRunData = function() {
    try {
      const blob = new Blob([exportTelemetryJSON()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `neon-strike-runs-${todayKey()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
    } catch (e) {
      console.warn("export failed", e);
    }
  };
  function applyStrikerColor() {
    gameState.strikerColor = selectedStrikerColor();
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function renderGlobalBoard(elId, rowsPromise, emptyMsg) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = '<div class="opacity-60 text-xs py-2">Loading\u2026</div>';
    rowsPromise.then((rows) => {
      if (rows === null) {
        el.innerHTML = '<div class="opacity-60 text-xs py-2">Offline \u2014 global board unavailable.</div>';
        return;
      }
      if (!rows.length) {
        el.innerHTML = `<div class="opacity-60 text-xs py-2">${emptyMsg}</div>`;
        return;
      }
      el.innerHTML = rows.map((e, i) => {
        const gc = e.grade === "S" ? "#facc15" : e.grade === "A" ? "#ec4899" : e.grade === "B" ? "#22d3ee" : "#9ca3af";
        return `<div class="rec-row"><span class="rec-rank">${i + 1}</span><span class="rec-grade" style="color:${gc}">${e.grade}</span><span class="rec-name">${escapeHTML(e.name)}</span><span class="rec-score">${(e.score || 0).toLocaleString()}</span></div>`;
      }).join("");
    });
  }
  function renderRecords() {
    const lb = loadLeaderboard();
    const meta = loadMeta();
    const aliasInput = document.getElementById("alias-input");
    if (aliasInput) aliasInput.value = meta.alias;
    const optIn = document.getElementById("online-optin");
    if (optIn) optIn.checked = meta.onlineOptIn;
    renderGlobalBoard("global-alltime", onlineEnabled() ? fetchTopAllTime(10) : Promise.resolve(null), "No global runs yet. Be the first.");
    renderGlobalBoard("global-daily", onlineEnabled() ? fetchTopDaily(todayKey(), 10) : Promise.resolve(null), "No daily runs yet today.");
    const list = document.getElementById("records-list");
    if (list) {
      if (!lb.length) {
        list.innerHTML = '<div class="opacity-60 text-sm py-4">No runs recorded yet.<br>Play a gauntlet to set the pace.</div>';
      } else {
        list.innerHTML = lb.map((e, i) => {
          const gc = e.grade === "S" ? "#facc15" : e.grade === "A" ? "#ec4899" : e.grade === "B" ? "#22d3ee" : "#9ca3af";
          const tag = e.daily ? " \xB7 DAILY" : "";
          return `<div class="rec-row"><span class="rec-rank">${i + 1}</span><span class="rec-grade" style="color:${gc}">${e.grade}</span><span class="rec-score">${e.score.toLocaleString()}</span><span class="rec-stage">St. ${e.stage}${tag}</span></div>`;
        }).join("");
      }
    }
    renderRunData();
    const stats = document.getElementById("records-stats");
    if (stats) {
      const best = lb.length ? lb[0].score.toLocaleString() : "\u2014";
      stats.innerHTML = `RUNS <b>${meta.totalRuns}</b> &nbsp;\xB7&nbsp; BEST SCORE <b>${best}</b> &nbsp;\xB7&nbsp; BEST BOSS STREAK <b>${meta.bestBossStreak}</b>`;
    }
    const picker = document.getElementById("striker-picker");
    if (picker) {
      picker.innerHTML = STRIKER_SKINS.map((s) => {
        const unlocked = meta.unlocked.includes(s.id);
        const selected = meta.selectedSkin === s.id;
        const cls = `striker-swatch${selected ? " selected" : ""}${unlocked ? "" : " locked"}`;
        const click = unlocked ? `onclick="selectStriker('${s.id}')"` : "";
        const label = unlocked ? s.name : `\u{1F512} ${s.hint}`;
        return `<div class="${cls}" ${click}><span class="sw-dot" style="background:${s.color};box-shadow:0 0 10px ${s.color}"></span><span class="sw-name">${label}</span></div>`;
      }).join("");
    }
  }
  function toggleRecords() {
    initAudio();
    const rs = document.getElementById("records-screen");
    if (gameState.screen === "records") {
      gameState.screen = gameState.previousScreen === "records" ? "start" : gameState.previousScreen;
      if (rs) rs.style.display = "none";
    } else {
      gameState.previousScreen = gameState.screen === "records" ? "start" : gameState.screen;
      renderRecords();
      gameState.screen = "records";
      if (rs) rs.style.display = "flex";
    }
  }
  window.toggleRecords = toggleRecords;
  window.selectStriker = function(id) {
    selectSkin(id);
    applyStrikerColor();
    renderRecords();
  };
  window.setAlias = function(name) {
    const el = document.getElementById("alias-input");
    const clean = setAlias(name);
    if (el) el.value = clean;
  };
  window.setOnlineOptIn = function(on) {
    setOnlineOptIn(on);
    renderRecords();
  };
  function toggleAudio() {
    gameState.audioMuted = !gameState.audioMuted;
    gameState.audioEnabled = !gameState.audioMuted && !!gameState.audioCtx;
    refreshAudioLevels();
    const el = document.getElementById("audio-state");
    if (el) el.innerText = `[M] AUDIO: ${gameState.audioMuted ? "OFF" : "ON"}`;
  }
  window.toggleAudio = toggleAudio;
  function fitViewport() {
    const shell = document.getElementById("game-container");
    if (!shell) return;
    const scale = Math.min(window.innerWidth / gameState.width, window.innerHeight / gameState.height);
    shell.style.transform = `scale(${scale})`;
  }
  window.addEventListener("resize", fitViewport);
  var lastCine = "";
  var lastZone = false;
  function syncCinematicClass() {
    const mode = gameState.screen === "vignette" ? "vignette" : gameState.finisher ? "finisher" : gameState.knockdown ? "knockdown" : gameState.bossIntroTimer > 0 && gameState.bossPoster && gameState.screen === "playing" ? "poster" : "";
    const zone = gameState.zoneTimer > 0 && gameState.screen === "playing";
    if (zone !== lastZone) {
      lastZone = zone;
      try {
        document.body.classList.toggle("cine-zone", zone);
        document.body.classList.toggle("cine-zone-soft", zone && getSettings().flashIntensity < 0.5);
      } catch (e) {
      }
    }
    if (mode === lastCine) return;
    lastCine = mode;
    try {
      const b = document.body;
      b.classList.toggle("cine-vignette", mode === "vignette");
      b.classList.toggle("cine-finisher", mode === "finisher");
      b.classList.toggle("cine-knockdown", mode === "knockdown");
      b.classList.toggle("cine-poster", mode === "poster");
    } catch (e) {
    }
  }
  function posterWaiting() {
    return gameState.screen === "playing" && !!gameState.bossPoster && !gameState.posterConfirmed && gameState.bossIntroTimer === CONSTANTS.POSTER_HOLD_FRAME;
  }
  function confirmPoster() {
    if (!posterWaiting()) return false;
    gameState.posterConfirmed = true;
    playSound("bell");
    gameState.inputGrace = INPUT_GRACE_FRAMES;
    return true;
  }
  window.engineConfirmPoster = confirmPoster;
  function onDeviceChanged() {
    if (gameState.screen === "upgrading") {
      renderDraftFocus();
      document.querySelectorAll("#draft-container .draft-card .card-key").forEach((el, i) => {
        el.innerHTML = inputDevice() === "keyboard" ? `<span class="glyph">${i + 1}</span>` : "";
      });
    }
    if (gameState.screen === "wager") renderWagerPrompts();
    renderInstructions();
  }
  var MENU_ROOTS = { start: "start-screen", gameover: "gameover-screen", records: "records-screen", howto: "howto-screen" };
  var menuFocus = 0;
  var menuFor = null;
  function menuButtons() {
    let root = null;
    if (gameState.screen === "paused") {
      if (pauseTab !== "resume") return [];
      root = document.getElementById("ppanel-resume");
    } else if (MENU_ROOTS[gameState.screen]) root = document.getElementById(MENU_ROOTS[gameState.screen]);
    if (!root || typeof root.querySelectorAll !== "function") return [];
    return Array.from(root.querySelectorAll(".orb-btn"));
  }
  function syncMenuFocus() {
    const key = gameState.screen + (gameState.screen === "paused" ? pauseTab : "");
    if (key !== menuFor) {
      menuFor = key;
      menuFocus = 0;
    }
    const btns = menuButtons();
    if (menuFocus >= btns.length) menuFocus = 0;
    btns.forEach((b, i) => b.classList && b.classList.toggle("menu-focus", i === menuFocus));
  }
  function moveMenu(d) {
    const b = menuButtons();
    if (!b.length) return;
    menuFocus = (menuFocus + d + b.length) % b.length;
    syncMenuFocus();
    playSound("slip");
  }
  function activateMenu(last = false) {
    const b = menuButtons();
    const el = last ? b[b.length - 1] : b[menuFocus];
    if (el && typeof el.click === "function") el.click();
  }
  var INPUT_GRACE_FRAMES = 8;
  var lastScreenSeen = "start";
  function watchResume() {
    if (gameState.screen === "playing" && lastScreenSeen !== "playing") gameState.inputGrace = INPUT_GRACE_FRAMES;
    lastScreenSeen = gameState.screen;
  }
  function loop() {
    gameState.uiFrame = (gameState.uiFrame || 0) + 1;
    pollGamepad();
    watchResume();
    if (gameState.screen !== "playing") syncMenuFocus();
    syncCinematicClass();
    if (gameState.screen === "vignette") updateVignette();
    update();
    draw();
    gameState.lastKeys = { ...gameState.keys };
    requestAnimationFrame(loop);
  }
  function init() {
    gameState.width = 1e3;
    gameState.height = 600;
    if (canvas2) {
      canvas2.width = gameState.width;
      canvas2.height = gameState.height;
    }
    applySettingsSideEffects();
    renderInstructions();
    resetGame();
    initAtmosphere();
    fitViewport();
    renderBest();
    applyStrikerColor();
    loop();
  }
  init();
  var __test = { posterWaiting, confirmPoster, watchResume, startGame, resetGame, update, triggerUpgradeDraft, resolveWager, openPause, closePause, setPauseTab, renderLoadout, renderSettings, endRun };
  try {
    if (typeof location !== "undefined" && /[?&]debug\b/.test(location.search)) {
      window.__ns = {
        st: gameState,
        CONSTANTS,
        SequenceManager,
        jump(stage2) {
          gameState.enemies = [];
          gameState.currentStage = Math.max(1, stage2 - 1);
          gameState.stageClearing = false;
          gameState.bossActive = false;
          advanceStage();
        },
        draft(n = 1) {
          gameState.pendingUpgrades += n;
          triggerUpgradeDraft();
        },
        // Item-11 onboarding mockup: draws in-world teaching callouts over the
        // live scene. null clears it. Never set outside ?debug.
        telemetry() {
          return { live: liveRun(), runs: loadTelemetry(), summary: summarizeTelemetry(loadTelemetry()) };
        },
        mockOnboarding(scene) {
          gameState.onboardingMock = scene || null;
          draw();
        },
        // Save the current frame (canvas + a painted stand-in for the DOM HUD
        // clusters) to a local receiver — used to export mockup images.
        capture(name, url = "http://127.0.0.1:8124/") {
          draw();
          const c = document.createElement("canvas");
          c.width = gameState.width;
          c.height = gameState.height;
          const x = c.getContext("2d");
          if (gameState.zoneTimer > 0) x.filter = "invert(1)";
          x.drawImage(canvas2, 0, 0);
          x.filter = "none";
          const hud = (px, py, w, h) => {
            x.fillStyle = "rgba(0,0,0,0.5)";
            x.fillRect(px, py, w, h);
            x.strokeStyle = "rgba(255,255,255,0.08)";
            x.strokeRect(px, py, w, h);
          };
          hud(16, 14, 290, 74);
          hud(gameState.width - 266, 14, 250, 84);
          x.fillStyle = "#fff";
          x.font = "900 italic 24px Orbitron";
          x.fillText(String(Math.max(0, Math.round(gameState.health))), 26, 44);
          x.fillStyle = "rgba(255,255,255,0.08)";
          x.fillRect(96, 30, 200, 10);
          x.fillStyle = "#ff3355";
          x.fillRect(96, 30, 200 * Math.max(0, gameState.health) / gameState.maxHealth, 10);
          x.fillStyle = "rgba(255,255,255,0.06)";
          x.fillRect(26, 54, 270, 8);
          const ig = x.createLinearGradient(26, 0, 296, 0);
          ig.addColorStop(0, "#ff00ff");
          ig.addColorStop(1, "#00ffff");
          x.fillStyle = ig;
          x.fillRect(26, 54, 270 * gameState.instinctMeter / 100, 8);
          x.font = "900 9px Orbitron";
          x.fillStyle = "#6b7280";
          x.fillText("SPD " + gameState.orbCounts.speed + "   PWR " + gameState.orbCounts.power + "   TEC " + gameState.orbCounts.technique, 26, 78);
          x.textAlign = "right";
          x.fillStyle = "#fde68a";
          x.font = "900 italic 28px Orbitron";
          x.fillText(Math.round(gameState.score).toLocaleString(), gameState.width - 26, 46);
          x.fillStyle = "#22d3ee";
          x.font = "900 italic 20px Orbitron";
          x.fillText(String(gameState.combo) + " COMBO", gameState.width - 26, 72);
          x.textAlign = "left";
          return fetch(url, { method: "POST", body: name + "|" + c.toDataURL("image/png") }).then((r) => r.ok).catch(() => false);
        },
        // Advance the real frame loop n times synchronously (works even when the
        // tab is hidden and requestAnimationFrame is paused).
        step(n = 1) {
          for (let i = 0; i < n; i++) {
            pollGamepad();
            watchResume();
            syncCinematicClass();
            if (gameState.screen === "vignette") updateVignette();
            update();
            gameState.lastKeys = { ...gameState.keys };
          }
          draw();
        }
      };
    }
  } catch (e) {
  }
})();
