(() => {
  // src/constants.js
  var CONSTANTS = {
    LANE_Y: [0.35, 0.55, 0.75],
    // Top, Mid, Bottom visual spacing
    // --- ARC MATH HELPERS ---
    getArcIndex: (stage) => Math.floor((stage - 1) / 7) + 1,
    getLevelInArc: (stage) => (stage - 1) % 7 + 1,
    isBossStage: (stage) => (stage - 1) % 7 + 1 === 7,
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
    AFFIXES: [
      { name: "NONE", desc: "System stable. No anomalies detected.", mods: {} },
      { name: "SURGE", desc: "Instinct gain increased by 50%.", mods: { instinctGainMult: 1.5 } },
      { name: "FAST CROWD", desc: "Ranks arrive denser and faster \u2014 Assassins swell the crowd.", mods: { packetDelayMult: 0.7, speedMult: 1.12, gruntSub: "assassin", gruntSubEvery: 2 } },
      { name: "IRON WALL", desc: "The ranks harden. More Gold Armor \u2014 break it with Cross [S].", mods: { gruntSub: "shield", gruntSubEvery: 2 } },
      { name: "HEAVY HANDS", desc: "Bruisers hit harder and press in numbers. Keep your footwork.", mods: { bruiserDamageMult: 1.4, gruntSub: "bruiser", gruntSubEvery: 4 } },
      { name: "ADRENALINE", desc: "Every Perfect Slip mends a sliver of health.", mods: { perfectSlipHeal: 4 } },
      { name: "GLASS PROTOCOL", desc: "You deal 30% more \u2014 and take 30% more. No margin for a miss.", mods: { playerDamageDealtMult: 1.3, playerDamageTakenMult: 1.3 } }
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
    statMaxCombo: 0,
    statTotalSlips: 0,
    statTotalKills: 0,
    statBossKills: 0,
    statCounterHits: 0,
    statBossBreaks: 0,
    statRecoilTaken: 0,
    statDespDamage: 0,
    tutorialEnabled: true,
    seenTutorials: { shield: false, slip: false, guard: false, instinct: false, counter: false, ghost_step: false, bruiser_id: false, assassin_id: false, footwork_tip: false },
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
    pad: { up: false, down: false, left: false, guard: false, jab: false, cross: false, hook: false, instinct: false, pause: false },
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
    let displayHP = Math.max(0, gameState.health);
    if (gameState.lastHUD.hp !== displayHP) {
      HUD.health.innerText = `HP: ${displayHP}`;
      gameState.lastHUD.hp = displayHP;
    }
    if (gameState.player && gameState.lastHUD.slipBuff !== gameState.player.slipBuff) {
      HUD.counterStatus.innerText = gameState.player.slipBuff > 0 ? "READY" : "INACTIVE";
      gameState.lastHUD.slipBuff = gameState.player.slipBuff;
    }
  }

  // src/vfx_audio/audio.js
  function initAudio() {
    if (gameState.audioMuted) return;
    if (!gameState.audioCtx) {
      gameState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gameState.audioEnabled = true;
    }
    if (gameState.audioCtx.state === "suspended") gameState.audioCtx.resume();
  }
  function playSound(type) {
    if (!gameState.audioEnabled || gameState.audioMuted) return;
    const osc = gameState.audioCtx.createOscillator();
    const gain = gameState.audioCtx.createGain();
    const now = gameState.audioCtx.currentTime;
    osc.connect(gain);
    gain.connect(gameState.audioCtx.destination);
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
    }
    osc.type = sq;
    osc.frequency.setValueAtTime(f1, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), now + t);
    gain.gain.setValueAtTime(v1, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(1e-3, v2), now + t);
    osc.start(now);
    osc.stop(now + t);
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
    const sf = document.getElementById("screen-flash");
    if (sf) {
      sf.style.opacity = amt;
      setTimeout(() => {
        sf.style.opacity = 0;
      }, 60);
    }
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

  // src/systems/sequences.js
  var Sequences = {
    stage1Intro: [
      { type: "tint", color: "rgba(0, 0, 0, 0.8)", duration: 30 },
      { type: "text", title: "STAGE 1: SHATTERED CATHEDRAL", duration: 150 },
      { type: "tint", color: "transparent", duration: 30 },
      { type: "resume" }
    ]
  };
  var SequenceManager = {
    active: false,
    currentSequence: null,
    stepIndex: 0,
    timer: 0,
    overlayColor: "transparent",
    text: { title: "", subtitle: "", alpha: 0 },
    play: function(seqId) {
      if (!Sequences[seqId]) return;
      this.active = true;
      this.currentSequence = Sequences[seqId];
      this.stepIndex = 0;
      this.startStep();
    },
    // NEW: Trigger custom dynamic cinematic overlays directly!
    playDynamic: function(stepsArray) {
      this.active = true;
      this.currentSequence = stepsArray;
      this.stepIndex = 0;
      this.startStep();
    },
    startStep: function() {
      if (!this.currentSequence || this.stepIndex >= this.currentSequence.length) {
        this.active = false;
        return;
      }
      let step = this.currentSequence[this.stepIndex];
      this.timer = step.duration || 0;
      if (step.type === "tint") {
        this.overlayColor = step.color;
      }
      if (step.type === "text") {
        this.text = { title: step.title, subtitle: step.subtitle || "", alpha: 1 };
      }
      if (step.type === "resume") {
        this.active = false;
        this.overlayColor = "transparent";
        this.text.alpha = 0;
        return;
      }
    },
    update: function() {
      if (!this.active) return;
      if (this.timer > 0) {
        this.timer--;
        if (this.timer < 30 && this.text.alpha > 0) {
          this.text.alpha = Math.max(0, this.text.alpha - 0.05);
        }
        if (this.timer <= 0) {
          this.stepIndex++;
          this.startStep();
        }
      }
    },
    draw: function(ctx3, w, h) {
      if (!this.active) return;
      if (this.overlayColor !== "transparent") {
        ctx3.fillStyle = this.overlayColor;
        ctx3.fillRect(0, 0, w, h);
      }
      if (this.text.alpha > 0) {
        ctx3.save();
        ctx3.fillStyle = `rgba(255, 255, 255, ${this.text.alpha})`;
        ctx3.textAlign = "center";
        ctx3.font = "900 italic 40px Orbitron";
        ctx3.fillText(this.text.title, w / 2, h / 2 - 10);
        if (this.text.subtitle) {
          ctx3.fillStyle = `rgba(0, 255, 255, ${this.text.alpha})`;
          ctx3.font = "bold 20px Orbitron";
          ctx3.fillText(this.text.subtitle, w / 2, h / 2 + 30);
        }
        ctx3.restore();
      }
    }
  };

  // src/data/upgrades.js
  var UPGRADE_POOL = {
    orbs: [
      { id: "orb_speed", kind: "orb", draftRole: "core", tree: "speed", tier: 1, repeatable: true, memoryPolicy: "none", name: "Speed Evolution", desc: "Faster attacks, quicker recoveries, cleaner offensive flow.", weight: 10, reqs: { orbTreeBelow: { speed: 3 } }, effects: [{ op: "incOrb", tree: "speed", amount: 1 }, { op: "mulStat", stat: "speedMult", amount: 0.25 }] },
      { id: "orb_power", kind: "orb", draftRole: "core", tree: "power", tier: 1, repeatable: true, memoryPolicy: "none", name: "Power Evolution", desc: "Stronger knockback authority and heavier control on your core blows.", weight: 10, reqs: { orbTreeBelow: { power: 3 } }, effects: [{ op: "incOrb", tree: "power", amount: 1 }, { op: "mulStat", stat: "powerMult", amount: 0.35 }] },
      { id: "orb_technique", kind: "orb", draftRole: "core", tree: "technique", tier: 1, repeatable: true, memoryPolicy: "none", name: "Technique Evolution", desc: "Improves Instinct gain and the reward for clean defensive reads.", weight: 10, reqs: { orbTreeBelow: { technique: 3 } }, effects: [{ op: "incOrb", tree: "technique", amount: 1 }, { op: "mulStat", stat: "techMult", amount: 0.3 }] }
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
      { id: "mast_guard_read", kind: "mastery", draftRole: "evolution", tree: "technique", tier: 2, repeatable: false, memoryPolicy: "hard", name: "Guard Read", desc: "Releasing Guard the instant a hit lands charges a Counter. Turtling becomes a second read, not just a shield.", weight: 8, reqs: { orbTreeAtLeast: { technique: 2 }, notOwned: ["mast_guard_read"] }, effects: [{ op: "grantUpgradeId", id: "mast_guard_read" }, { op: "setFlag", key: "guardRead", value: true }] },
      // APEX PERKS (Tier 3, one per maxed tree): a fully-built run used to run out
      // of unique content the moment its orbs/masteries/fusions were all owned —
      // everything after that was six generic overclocks on repeat. These slot
      // into the same masteries pool (orbTreeAtLeast just happens to require the
      // tree be fully maxed at 3), so they surface right at the point staleness
      // would otherwise set in, no new draft-system plumbing required.
      { id: "apex_speed_blur_step", kind: "mastery", draftRole: "apex", tree: "speed", tier: 3, repeatable: false, memoryPolicy: "hard", name: "Blur Step", desc: "Ghost Step gains a second charge \u2014 dash twice in a row before the cooldown has to fully refill.", weight: 6, reqs: { orbTreeAtLeast: { speed: 3 }, notOwned: ["apex_speed_blur_step"] }, effects: [{ op: "grantUpgradeId", id: "apex_speed_blur_step" }, { op: "setFlag", key: "blurStep", value: true }] },
      { id: "apex_power_executioner", kind: "mastery", draftRole: "apex", tree: "power", tier: 3, repeatable: false, memoryPolicy: "hard", name: "Executioner's Cross", desc: "A Cross against an enemy below 25% health is a guaranteed finish.", weight: 6, reqs: { orbTreeAtLeast: { power: 3 }, notOwned: ["apex_power_executioner"] }, effects: [{ op: "grantUpgradeId", id: "apex_power_executioner" }, { op: "setFlag", key: "executionerCross", value: true }] },
      { id: "apex_technique_flow_state", kind: "mastery", draftRole: "apex", tree: "technique", tier: 3, repeatable: false, memoryPolicy: "hard", name: "Flow State", desc: "A sustained streak of clean hits and Perfect Slips ramps your Instinct and EXP gain. Getting hit resets it to zero.", weight: 6, reqs: { orbTreeAtLeast: { technique: 3 }, notOwned: ["apex_technique_flow_state"] }, effects: [{ op: "grantUpgradeId", id: "apex_technique_flow_state" }, { op: "setFlag", key: "flowState", value: true }] }
    ],
    fusions: [
      { id: "fuse_dempsey_circuit", kind: "fusion", draftRole: "capstone", tree: "general", tier: 3, repeatable: false, memoryPolicy: "hard", name: "Dempsey Circuit", desc: "Alternating Jab and Hook reduces recovery and preserves offensive rhythm.", weight: 4, reqs: { orbTreeAtLeast: { speed: 2, power: 2 }, notOwned: ["fuse_dempsey_circuit"] }, effects: [{ op: "grantUpgradeId", id: "fuse_dempsey_circuit" }, { op: "setFlag", key: "dempseyCircuit", value: true }, { op: "addMod", key: "dempseyRecoveryBonus", amount: 0.18 }] },
      { id: "fuse_ghost_counter", kind: "fusion", draftRole: "capstone", tree: "general", tier: 3, repeatable: false, memoryPolicy: "hard", name: "Ghost Counter", desc: "Ghost Step through an active hitbox to gain Counter Charge.", weight: 4, reqs: { orbTreeAtLeast: { speed: 2, technique: 2 }, notOwned: ["fuse_ghost_counter"] }, effects: [{ op: "grantUpgradeId", id: "fuse_ghost_counter" }, { op: "setFlag", key: "ghostCounter", value: true }] },
      { id: "fuse_shatter_read", kind: "fusion", draftRole: "capstone", tree: "general", tier: 3, repeatable: false, memoryPolicy: "hard", name: "Shatter Read", desc: "A Counter-Charged Cross partially bypasses boss resistance and forces a stronger stagger.", weight: 4, reqs: { orbTreeAtLeast: { power: 2, technique: 2 }, notOwned: ["fuse_shatter_read"] }, effects: [{ op: "grantUpgradeId", id: "fuse_shatter_read" }, { op: "setFlag", key: "shatterRead", value: true }, { op: "addMod", key: "shatterReadBossBypass", amount: 0.35 }, { op: "addMod", key: "shatterReadStaggerBonus", amount: 12 }] }
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

  // src/systems/progression/apply.js
  function applyEffect(st, effect) {
    switch (effect.op) {
      case "incOrb": {
        let currentCount = st.orbCounts[effect.tree] !== void 0 ? st.orbCounts[effect.tree] : 0;
        let addAmount = effect.amount !== void 0 ? effect.amount : 1;
        st.orbCounts[effect.tree] = currentCount + addAmount;
        let el = document.getElementById(`orb-${effect.tree}`);
        if (el) el.innerText = st.orbCounts[effect.tree];
        let newLvl = st.orbCounts[effect.tree];
        if (newLvl === 2) {
          if (effect.tree === "speed") showToast("SPEED LVL 2: Missing Jabs won't break combo!");
          if (effect.tree === "power") showToast("POWER LVL 2: Cross attack gains massive reach!");
          if (effect.tree === "technique") showToast("TECH LVL 2: Perfect Slips charge 2 Counter hits!");
        } else if (newLvl === 3) {
          if (effect.tree === "speed") showToast("SPEED MAX: Slip Cancel active!");
          if (effect.tree === "power") showToast("POWER MAX: Bowling Collateral active!");
          if (effect.tree === "technique") showToast("TECH MAX: True Read active!");
        }
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
    for (const effect of upgrade.effects) applyEffect(st, effect);
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
    if (st.pendingUpgrades > 0) {
      if (window.engineTriggerUpgradeDraft) {
        window.engineTriggerUpgradeDraft();
      }
    } else {
      st.screen = "playing";
      let upgradeScreen = document.getElementById("upgrade-screen");
      if (upgradeScreen) upgradeScreen.style.display = "none";
    }
  }
  function advanceStage() {
    var _a;
    gameState.currentStage++;
    gameState.bossDefeatedThisStage = false;
    gameState.currentAffix = CONSTANTS.AFFIXES[Math.floor(random() * CONSTANTS.AFFIXES.length)];
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
    const hotLaneCard = gameState.hotLane >= 0 ? [{ type: "text", title: "LANE SURGE", subtitle: `${LANE_LABEL[gameState.hotLane]} LANE RUNNING HOT`, duration: 150 }] : [];
    let stageData = ((_a = CONSTANTS.ARC_STAGE_TABLES[safeArcIndex]) == null ? void 0 : _a[levelInArc]) || { stageName: "UNKNOWN DEPTHS" };
    let titleText = isBoss ? stageData.stageName : `${law.shortName} \u2014 ${stageData.stageName}`;
    let subtitleText = isBoss ? law.uiText : law.theme;
    let affixName = gameState.currentAffix.name !== "NONE" ? `[${gameState.currentAffix.name}]` : "SYSTEM STABLE";
    let affixDesc = gameState.currentAffix.name !== "NONE" ? gameState.currentAffix.desc : "No anomalies detected.";
    const ARC_COLORS = { 1: "#22d3ee", 2: "#34d399", 3: "#f87171", 4: "#c084fc", 5: "#facc15" };
    const ARC_TINTS = {
      1: "rgba(34, 211, 238, 0.18)",
      2: "rgba(52, 211, 153, 0.18)",
      3: "rgba(248, 113, 113, 0.18)",
      4: "rgba(192, 132, 252, 0.18)",
      5: "rgba(250, 204, 21, 0.18)"
    };
    const isNewArc = levelInArc === 1 && gameState.currentStage > 1;
    const chapterCardSteps = isNewArc ? [
      { type: "tint", color: "rgba(0, 0, 0, 0.92)", duration: 35 },
      { type: "text", title: `ARC ${safeArcIndex}`, subtitle: law.name.toUpperCase(), duration: 85 },
      { type: "tint", color: ARC_TINTS[safeArcIndex] || "rgba(236, 72, 153, 0.18)", duration: 10 },
      { type: "text", title: law.name.toUpperCase(), subtitle: law.theme, duration: 170 }
    ] : [
      { type: "tint", color: "rgba(0, 0, 0, 0.9)", duration: 30 }
    ];
    SequenceManager.playDynamic([
      ...chapterCardSteps,
      { type: "text", title: titleText, subtitle: subtitleText, duration: 140 },
      { type: "text", title: `STAGE MODIFIER: ${affixName}`, subtitle: affixDesc, duration: 200 },
      ...hotLaneCard,
      { type: "tint", color: "transparent", duration: 30 },
      { type: "resume" }
    ]);
    const stageUI = document.getElementById("stage-ui");
    const affixUI = document.getElementById("affix-ui");
    if (stageUI) {
      stageUI.innerText = `${law.shortName}: ${stageData.stageName}`;
      stageUI.style.color = ARC_COLORS[safeArcIndex] || "#ec4899";
      stageUI.classList.remove("stage-pulse");
      void stageUI.offsetWidth;
      stageUI.classList.add("stage-pulse");
    }
    if (affixUI) affixUI.innerText = gameState.currentAffix.name !== "NONE" ? affixName : "";
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
  function buildEligiblePool(st, pool) {
    const pools = {
      orbs: [],
      masteries: [],
      fusions: [],
      overclocks: []
    };
    for (const orb of pool.orbs) {
      if (meetsRequirements(orb, st)) {
        pools.orbs.push(orb);
      }
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
      // Slot 1: Core Growth
      ["masteries", "orbs", "fusions", "overclocks"],
      // Slot 2: Evolution
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

  // src/systems/combat.js
  function checkHit(type) {
    let isJab = type.startsWith("jab") || type === "guard_jab";
    let isGuardPunch = type === "guard_jab" || type === "check_hook";
    let reachMult = gameState.orbCounts.power >= 2 ? 1.25 : 1;
    let reach = isJab ? 120 : type === "cross" ? 140 * reachMult : 140;
    let hitSomething = false;
    let buffActive = gameState.player.slipBuff > 0;
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
          spawnFloatingText(en.x, en.y - 80, "WAIT & HOLD SHIFT!", "#ffaa00");
          hitSomething = true;
          continue;
        }
        if (en.tutorialType === "ghost_step") {
          spawnFloatingText(en.x, en.y - 80, "USE GHOST STEP [LEFT]!", "#ffaa00");
          hitSomething = true;
          continue;
        }
        if (en.tutorialType === "shield") {
          if (type === "cross") {
            en.hp = 0;
            spawnFloatingText(gameState.player.x + jX(), gameState.player.y - 50 + jY(), "ARMOR BROKEN!", "#00ffff");
          } else {
            spawnFloatingText(gameState.player.x + jX(), gameState.player.y - 50 + jY(), "USE CROSS [S] TO BREAK!", "#ffaa00");
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
        if (en.type === "shield" && type === "cross") {
          en.type = "grunt";
          en.color = "#ff0055";
          dmg *= 1.5;
        }
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
          if (en.name === "PHANTOM BOXER") {
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
          let enforcerArmored = en.name === "NEON ENFORCER" && (en.phase === 2 || en.arcMods && en.arcMods.retaliationTimingVariant);
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
        let powerFactor = gameState.stats.powerMult * (gameState.isInstinct ? 2 : 1) * (buffActive ? 1.5 : 1);
        if (trueReadActive) powerFactor *= 1.5;
        let baseKB = 0;
        if (buffActive || trueReadActive) {
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
          if (type === "cross" && (en.type === "shield" || en.type === "bruiser" || en.isBoss && en.name === "NEON ENFORCER" && en.phase === 2)) {
            stunAmount += gameState.progressionMods.crossArmorStunBonus;
          }
          if (gameState.progressionMods.shatterRead && buffActive && type === "cross" && en.isBoss) {
            en.stunResist = Math.max(0, en.stunResist - 100 * gameState.progressionMods.shatterReadBossBypass);
            stunAmount += gameState.progressionMods.shatterReadStaggerBonus;
            spawnFloatingText(en.x + jX(), en.y - 120 + jY(), "SHATTER READ!", "#ff0055");
          }
          if (en.name === "NEON ENFORCER" && en.phase === 2) {
            if (buffActive || trueReadActive) {
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
        if (buffActive && en.tutorialType !== "counter") {
          createShatter(en.x, en.y - 60, "#ffffff");
        } else if (en.tutorialType !== "counter") {
          createImpact(en.x, en.y - 60, gameState.isInstinct ? "#ff00ff" : null);
        }
        if (gameState.orbCounts.power >= 3 && en.hp <= 0 && (type === "cross" || buffActive)) {
          triggerShockwave(en.x, en.y - 60, "#ff0055");
        }
      }
    }
    if (hitSomething) {
      if (!isGuardPunch) {
        gameState.combo++;
        if (gameState.combo > gameState.statMaxCombo) gameState.statMaxCombo = gameState.combo;
      }
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
      gameState.shake = (type === "cross" ? 8 : isJab ? 2 : 4) * stopMult;
      if (type === "cross" || buffActive) doFlash(buffActive ? 0.6 : 0.2);
      if (type === "cross" && gameState.orbCounts.power >= 2) {
        createImpact(gameState.player.x + reach, gameState.player.y - 40, "#ff0055");
        gameState.shake += 5;
      }
      if (gameState.orbCounts.speed >= 3 && (isJab || type === "hook")) {
        gameState.player.moveCancelReady = true;
      }
      if (!buffActive) playSound("hit");
    }
    return hitSomething;
  }

  // src/entities/player.js
  function resetPlayerObj() {
    return { lane: 1, x: 180, y: 0, w: 50, h: 110, state: "idle", punchTimer: 0, punchType: null, hitFrame: 0, didHit: false, slipCooldown: 0, slipBuff: 0, color: "#00ffff", trails: [], trailTimer: 0, recoveryTimer: 0, moveCancelReady: false, jabStep: 0, comboWindow: 0, inputBuffer: null, inputBufferTimer: 0, movementBuffer: null, movementBufferTimer: 0, ghostStepTimer: 0, ghostStepCooldown: 0, ghostStepCharges: 1, dangerLevel: 0, hitStun: 0, lastPunchLanded: null, dempseyActive: false, guardReadTimer: 0, flowStreak: 0 };
  }
  var FOOTWORK_MIN_X = 90;
  var FOOTWORK_MAX_X = 320;
  var FOOTWORK_ADVANCE_SPD = 3;
  var FOOTWORK_RETREAT_SPD = 3.4;
  var FOOTWORK_HOME_PULL = 0.02;
  function resetJabString() {
    if (gameState.player) {
      gameState.player.jabStep = 0;
      gameState.player.comboWindow = 0;
      gameState.player.lastPunchLanded = null;
      gameState.player.dempseyActive = false;
    }
  }
  function executeAttackInput(code) {
    if (gameState.player.state === "guarding") {
      if (code === "KeyA") startPunch("guard_jab");
      if (code === "KeyD") startPunch("check_hook");
      return;
    }
    if (code === "KeyA") {
      if (gameState.player.jabStep === 0) startPunch("jab1");
      else if (gameState.player.jabStep === 1) startPunch("jab2");
      else if (gameState.player.jabStep === 2) startPunch("jab3");
      else startPunch("jab1");
    } else if (code === "KeyS") startPunch("cross");
    else if (code === "KeyD") startPunch("hook");
  }
  function executeMovementInput(code) {
    if (code === "ShiftLeft" || code === "ShiftRight") {
      gameState.player.state = "guarding";
      gameState.combo = 0;
      resetJabString();
    } else if (code === "ArrowLeft") {
      const maxGhostCharges = gameState.progressionMods.blurStep ? 2 : 1;
      if (gameState.player.ghostStepCharges === void 0) gameState.player.ghostStepCharges = maxGhostCharges;
      if (gameState.player.ghostStepCharges > 0) {
        gameState.player.ghostStepCharges--;
        gameState.player.state = "ghost_step";
        gameState.player.ghostStepTimer = 18;
        if (gameState.player.ghostStepCharges <= 0) gameState.player.ghostStepCooldown = Math.max(10, Math.floor(60 * gameState.progressionMods.ghostStepCooldownMult));
        gameState.combo = 0;
        resetJabString();
        playSound("ghost_step");
        for (let i = 0; i < 8; i++) {
          gameState.particles.push({ x: gameState.player.x + Math.random() * 30, y: gameState.player.y - 30 - Math.random() * 60, vx: -10 - Math.random() * 15, vy: 0, life: 0.6, color: "#666666", type: "dash_line" });
        }
      }
    } else if (code === "ArrowUp" || code === "ArrowDown") {
      const oldLane = gameState.player.lane;
      if (code === "ArrowUp") gameState.player.lane = Math.max(0, gameState.player.lane - 1);
      if (code === "ArrowDown") gameState.player.lane = Math.min(2, gameState.player.lane + 1);
      if (oldLane !== gameState.player.lane) {
        if (gameState.player.slipCooldown <= 0) {
          checkPerfectSlip(oldLane);
          gameState.player.slipCooldown = 12;
          resetJabString();
        } else {
          gameState.player.lane = oldLane;
        }
      }
    }
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
  }
  function triggerPerfectSlip(bossSlipped, slipQuality) {
    if (slipQuality === "perfect") {
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
      gameState.exp += Math.floor(2 * (1 + gameState.progressionMods.expGainBonusMult) * flowMult);
      gameState.player.slipBuff = gameState.orbCounts.technique >= 2 ? 2 : 1;
      spawnFloatingText(gameState.player.x, gameState.player.y - 80, "COUNTER READY!", "#ffffff");
      gameState.hitstop += 8;
      if (gameState.orbCounts.speed >= 3) gameState.player.moveCancelReady = true;
      if (bossSlipped && gameState.orbCounts.technique >= 3) {
        bossSlipped.exposedTimer = 90 + gameState.progressionMods.bossExposeBonusFrames;
        spawnFloatingText(bossSlipped.x, bossSlipped.y - 140, "EXPOSED!", "#00ffff");
        playSound("feint_tell");
      }
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
    }
    if (HUD.slipPopup) {
      HUD.slipPopup.style.opacity = 1;
      setTimeout(() => {
        if (HUD.slipPopup) HUD.slipPopup.style.opacity = 0;
      }, 500);
    }
  }
  function startPunch(t) {
    if (gameState.player.state === "guarding") gameState.player.state = "idle";
    gameState.player.state = "punching";
    gameState.player.punchType = t;
    gameState.player.didHit = false;
    gameState.player.moveCancelReady = false;
    gameState.player.comboWindow = 0;
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
    if (gameState.player.slipBuff > 0) {
      playSound("vacuum");
      createVacuum(gameState.player.x + 80, gameState.player.y - 40);
    }
  }
  function takeDamage(amt, isHeavy, en) {
    gameState.player.flowStreak = 0;
    let guardMult = 0.25;
    let piercing = gameState.player.state === "guarding" && en && en.type === "assassin";
    if (piercing) guardMult = 0.6;
    amt = amt * CONSTANTS.affixMod(gameState.currentAffix, "playerDamageTakenMult", 1);
    let actualDmg = gameState.player.state === "guarding" ? Math.floor(amt * guardMult) : Math.floor(amt);
    if (piercing) spawnFloatingText(gameState.player.x, gameState.player.y - 60, "GUARD PIERCED!", "#aa00ff");
    if (gameState.player.state === "guarding" && gameState.progressionMods.guardRead) gameState.player.guardReadTimer = 16;
    gameState.health -= actualDmg;
    gameState.player.hitStun = isHeavy ? 10 : 5;
    gameState.shake = isHeavy ? 30 : 15;
    gameState.player.x = Math.max(20, gameState.player.x - (isHeavy ? 40 : 10) * gameState.progressionMods.incomingRecoilMult);
    gameState.player.state = "hurt";
    resetJabString();
    if (gameState.combo >= 2 && !gameState.isInstinct) spawnFloatingText(gameState.player.x, gameState.player.y - 50, "COMBO BROKEN", "#ff0055");
    gameState.combo = 0;
    if (!gameState.isInstinct) doFlash(isHeavy ? 0.4 : 0.2);
    playSound("hit");
    let sf = document.getElementById("screen-flash");
    if (sf) {
      sf.style.background = "red";
      sf.style.opacity = 0.4;
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
  function updatePlayer() {
    let keyUpJustPressed = gameState.keys["ArrowUp"] && !gameState.lastKeys["ArrowUp"];
    let keyDownJustPressed = gameState.keys["ArrowDown"] && !gameState.lastKeys["ArrowDown"];
    let keyLeftJustPressed = gameState.keys["ArrowLeft"] && !gameState.lastKeys["ArrowLeft"];
    let keyAJustPressed = gameState.keys["KeyA"] && !gameState.lastKeys["KeyA"];
    let keySJustPressed = gameState.keys["KeyS"] && !gameState.lastKeys["KeyS"];
    let keyDJustPressed = gameState.keys["KeyD"] && !gameState.lastKeys["KeyD"];
    let keySpaceJustPressed = gameState.keys["Space"] && !gameState.lastKeys["Space"];
    let attemptGuard = gameState.pad.guard || gameState.keys["ShiftLeft"] || gameState.keys["ShiftRight"];
    let attemptUp = gameState.pad.up || keyUpJustPressed;
    let attemptDown = gameState.pad.down || keyDownJustPressed;
    let attemptLeft = gameState.pad.left || keyLeftJustPressed;
    let attemptJab = gameState.pad.jab || keyAJustPressed;
    let attemptCross = gameState.pad.cross || keySJustPressed;
    let attemptHook = gameState.pad.hook || keyDJustPressed;
    let attemptInstinct = gameState.pad.instinct || keySpaceJustPressed;
    gameState.scrollX += (gameState.isInstinct ? 20 : 8) * (gameState.stageSpeedMult || 1);
    if (gameState.player.slipCooldown > 0) gameState.player.slipCooldown--;
    if (gameState.player.ghostStepCooldown > 0) {
      gameState.player.ghostStepCooldown--;
      if (gameState.player.ghostStepCooldown <= 0) {
        const maxGhostCharges = gameState.progressionMods.blurStep ? 2 : 1;
        gameState.player.ghostStepCharges = Math.min(maxGhostCharges, (gameState.player.ghostStepCharges || 0) + 1);
        if (gameState.player.ghostStepCharges < maxGhostCharges) gameState.player.ghostStepCooldown = Math.max(10, Math.floor(60 * gameState.progressionMods.ghostStepCooldownMult));
      }
    }
    if (gameState.player.guardReadTimer > 0) gameState.player.guardReadTimer--;
    const targetY = gameState.height * CONSTANTS.LANE_Y[gameState.player.lane];
    gameState.player.y += (targetY - gameState.player.y) * 0.25;
    if (gameState.player.state !== "hurt" && gameState.player.state !== "punching") {
      if (gameState.keys["ArrowRight"]) gameState.player.x = Math.min(FOOTWORK_MAX_X, gameState.player.x + FOOTWORK_ADVANCE_SPD);
      else if (gameState.keys["ArrowLeft"]) gameState.player.x = Math.max(FOOTWORK_MIN_X, gameState.player.x - FOOTWORK_RETREAT_SPD);
      else gameState.player.x += (180 - gameState.player.x) * FOOTWORK_HOME_PULL;
    }
    if (attemptInstinct && gameState.instinctMeter >= 100 && !gameState.isInstinct) {
      gameState.isInstinct = true;
      gameState.instinctReadyTimer = 0;
      if (HUD.instinctBanner) HUD.instinctBanner.style.display = "none";
      if (HUD.barCont) HUD.barCont.classList.add("beast-active");
      doFlash(0.5);
      gameState.shake = 20;
      gameState.hitstop = 10;
      triggerShockwave(gameState.player.x, gameState.player.y - 50, "#ffffff");
      playSound("perfect_slip");
    }
    if (gameState.player.inputBufferTimer > 0) {
      if (--gameState.player.inputBufferTimer <= 0) gameState.player.inputBuffer = null;
    }
    if (gameState.player.movementBufferTimer > 0) {
      if (--gameState.player.movementBufferTimer <= 0) gameState.player.movementBuffer = null;
    }
    if (gameState.player.state === "hurt") {
      if (--gameState.player.hitStun <= 0) gameState.player.state = "idle";
      return;
    }
    if (gameState.player.state === "recovery") {
      if (--gameState.player.recoveryTimer <= 0) gameState.player.state = "idle";
    } else if (gameState.player.state === "ghost_step") {
      if (--gameState.player.ghostStepTimer <= 0) gameState.player.state = "idle";
    }
    if (attemptGuard) {
      if (gameState.player.state === "idle") {
        gameState.player.state = "guarding";
        gameState.combo = 0;
        resetJabString();
      }
    } else {
      if (gameState.player.state === "guarding") {
        gameState.player.state = "idle";
        if (gameState.player.guardReadTimer > 0 && gameState.progressionMods.guardRead) {
          gameState.player.guardReadTimer = 0;
          gameState.player.slipBuff = Math.max(gameState.player.slipBuff, 1);
          playSound("perfect_slip");
          doFlash(0.15);
          gameState.shake = Math.max(gameState.shake, 6);
          spawnFloatingText(gameState.player.x, gameState.player.y - 80, "GUARD READ!", "#ffffff");
        }
      }
    }
    let canAct = gameState.player.state === "idle" || gameState.player.state === "guarding";
    let attemptMovement = attemptUp || attemptDown || attemptLeft || attemptGuard;
    if (!canAct && gameState.player.moveCancelReady && attemptMovement && gameState.player.state !== "ghost_step") {
      canAct = true;
      gameState.player.moveCancelReady = false;
      gameState.player.state = "idle";
      createImpact(gameState.player.x, gameState.player.y - 50, "#00ffff");
      playSound("slip");
    }
    if (canAct) {
      let attemptAttackCode = attemptJab ? "KeyA" : attemptCross ? "KeyS" : attemptHook ? "KeyD" : null;
      let attemptMoveCode = attemptUp ? "ArrowUp" : attemptDown ? "ArrowDown" : attemptLeft ? "ArrowLeft" : null;
      if (attemptAttackCode) {
        if (Math.abs(gameState.player.y - targetY) < 5) executeAttackInput(attemptAttackCode);
        else {
          gameState.player.inputBuffer = attemptAttackCode;
          gameState.player.inputBufferTimer = 12;
        }
      } else if (attemptMoveCode) {
        if (gameState.player.state === "guarding") gameState.player.state = "idle";
        executeMovementInput(attemptMoveCode);
      } else if (attemptGuard) {
        executeMovementInput("ShiftLeft");
      } else {
        if (gameState.player.state === "guarding") gameState.player.state = "idle";
      }
    } else if (gameState.player.state === "punching" || gameState.player.state === "recovery") {
      let attemptMoveCode = attemptUp ? "ArrowUp" : attemptDown ? "ArrowDown" : attemptLeft ? "ArrowLeft" : null;
      let attemptAttackCode = attemptJab ? "KeyA" : attemptCross ? "KeyS" : attemptHook ? "KeyD" : null;
      if (attemptAttackCode) {
        gameState.player.inputBuffer = attemptAttackCode;
        gameState.player.inputBufferTimer = 12;
      } else if (attemptMoveCode) {
        gameState.player.movementBuffer = attemptMoveCode;
        gameState.player.movementBufferTimer = 12;
      }
    }
    if (gameState.player.state === "idle" || gameState.player.state === "guarding") {
      if (gameState.player.comboWindow > 0) {
        if (--gameState.player.comboWindow <= 0) resetJabString();
      }
      if (gameState.player.movementBuffer) {
        let c = gameState.player.movementBuffer;
        gameState.player.movementBuffer = null;
        gameState.player.movementBufferTimer = 0;
        executeMovementInput(c);
      } else if (gameState.player.inputBuffer) {
        if (Math.abs(gameState.player.y - targetY) < 5) {
          let c = gameState.player.inputBuffer;
          gameState.player.inputBuffer = null;
          gameState.player.inputBufferTimer = 0;
          executeAttackInput(c);
        }
      }
    }
    if (gameState.player.state === "punching") {
      gameState.player.punchTimer--;
      if (gameState.player.hitFrame > 0) {
        gameState.player.hitFrame--;
        if (gameState.player.hitFrame === 0) {
          gameState.player.didHit = checkHit(gameState.player.punchType);
        }
      }
      if (gameState.player.punchTimer <= 0) {
        if (!gameState.player.didHit) {
          gameState.player.state = "recovery";
          let isJab = gameState.player.punchType && gameState.player.punchType.startsWith("jab"), iGP = gameState.player.punchType === "guard_jab" || gameState.player.punchType === "check_hook";
          gameState.player.recoveryTimer = isJab || gameState.player.punchType === "guard_jab" ? 6 : gameState.player.punchType === "hook" || gameState.player.punchType === "check_hook" ? Math.floor(9 * gameState.progressionMods.hookRecoveryMult) : 13;
          if (gameState.player.dempseyActive) gameState.player.recoveryTimer = Math.max(1, Math.floor(gameState.player.recoveryTimer * (1 - gameState.progressionMods.dempseyRecoveryBonus)));
          if (isJab && !iGP) {
            if (gameState.progressionMods.relentlessRhythm && (gameState.player.punchType === "jab1" || gameState.player.punchType === "jab2")) {
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
            spawnFloatingText(gameState.player.x, gameState.player.y - 50, "MISSED! TRY AGAIN!", "#ffaa00");
            cD.x = gameState.player.x + 250;
            cD.attackCooldown = cD.maxCooldown;
            cD.justAttacked = 0;
            gameState.player.slipBuff = 1;
          }
        } else {
          gameState.player.state = "idle";
          gameState.player.comboWindow = gameState.player.dempseyActive ? 35 : 25;
          gameState.player.lastPunchLanded = gameState.player.punchType;
        }
      }
    }
  }

  // src/entities/enemies.js
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
          triggerTutorial("shield", "GOLD ARMOR", 'Enemies with Gold Armor will block your Jabs.<br><br>Use your <span class="text-cyan-400 font-bold">CROSS [S]</span> to shatter their defense!<br><br><i>Break the armor to pass!</i>');
        } else if (en.tutorialType === "guard") {
          triggerTutorial("guard", "GUARDING", 'Guard is the stable answer when timing gets crowded, even if a clean slip is possible.<br><br>Hold <span class="text-cyan-400 font-bold">[SHIFT]</span> to Guard &mdash; it cuts incoming damage by 75% against <i>most</i> attackers.<br><br>Not all, though. A few enemies bite through Guard far more than that. You will get a specific heads-up the first time one shows up &mdash; watch for it.<br><br><i>Guard the next attack to pass!</i>');
        } else if (en.tutorialType === "ghost_step") {
          triggerTutorial("ghost_step", "GHOST STEP", `This one is too fast to jab, guard, or slip cleanly.<br><br>Tap (don't hold) <span class="text-cyan-400 font-bold">[LEFT ARROW]</span> for a Ghost Step &mdash; a short evasive dash with a moment of invincibility.<br><br><i>Ghost Step the next attack to pass!</i>`);
        }
        return;
      }
      if (!en.tutorialType && en.isActiveThreat && en.x - gameState.player.x < 400) {
        if (en.type === "bruiser" && !gameState.seenTutorials.bruiser_id) {
          triggerTutorial("bruiser_id", "ARMORED BRUISER", 'This one shrugs off Jabs entirely.<br><br>Jabs still chip its health, but only a <span class="text-cyan-400 font-bold">CROSS [S]</span> &mdash; or a Counter Hit &mdash; actually staggers it.');
          return;
        }
        if (en.type === "assassin" && !en.isBoss && !gameState.seenTutorials.assassin_id) {
          triggerTutorial("assassin_id", "ASSASSIN", 'This is the exception the Guard tutorial warned you about.<br><br>Guard normally blocks 75% of incoming damage. Against an Assassin, only about 40% gets blocked &mdash; the rest bites through.<br><br>You have to actually read it and <span class="text-cyan-400 font-bold">SLIP [UP/DOWN]</span>, not just hold Shift.');
          return;
        }
      }
      if (en.stun > 0 || gameState.bossIntroTimer > 0) {
        if (en.vx > 0.1) {
          en.x += en.vx;
          en.vx *= 0.85;
        }
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
          en.x += en.vx;
          en.vx *= 0.85;
          let isBowling = gameState.orbCounts.power >= 3 && en.vx > 5;
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
          } else if (!isBlockedByEnemy && !isAtPlayer && gameState.tutorialGrace <= 0 && en.name !== "STATIC MONK") {
            en.x -= en.speed;
          }
        }
        en.y += (gameState.height * CONSTANTS.LANE_Y[en.lane] - en.y) * 0.3;
        if (en.isBoss) continue;
        if (Math.abs(en.x - gameState.player.x) < 130 && !isBlockedByEnemy && gameState.tutorialGrace <= 0) {
          if (en.attackCooldown === 22 && en.isActiveThreat) {
            if (en.type === "bruiser") playSound("bash_tell");
            else playSound("jab_tell");
          }
          en.attackCooldown--;
          if (en.attackCooldown <= 0) {
            en.justAttacked = 5;
            if (gameState.player.state === "ghost_step" && gameState.player.ghostStepTimer > 4 && isAtPlayer && en.isActiveThreat) {
              spawnFloatingText(gameState.player.x, gameState.player.y - 50, "GHOST STEP", "#888888");
              if (gameState.progressionMods.ghostCounter && gameState.player.slipBuff === 0) {
                gameState.player.slipBuff = 1;
                playSound("perfect_slip");
                spawnFloatingText(gameState.player.x, gameState.player.y - 80, "GHOST COUNTER!", "#ffffff");
              }
              if (en.tutorialType === "ghost_step") {
                en.hp = 0;
              }
              en.attackCooldown = en.maxCooldown;
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
                spawnFloatingText(gameState.player.x, gameState.player.y - 50, "USE CROSS [S] TO BREAK!", "#ffaa00");
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
                  spawnFloatingText(gameState.player.x, gameState.player.y - 50, "HOLD [SHIFT] TO GUARD!", "#ffaa00");
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
              spawnFloatingText(gameState.player.x, gameState.player.y - 50, "TAP [LEFT] TO GHOST STEP!", "#ffaa00");
              en.x = gameState.player.x + 200;
              en.attackCooldown = en.maxCooldown;
              continue;
            }
            if (en.type === "bruiser") {
              en.currentMove = "bash";
              en.attackCooldown = en.maxCooldown;
            } else {
              en.attackCooldown = en.maxCooldown;
            }
          }
        }
      }
    }
    if (gameState.purifyTimer > 0) gameState.purifyTimer--;
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
      const en = gameState.enemies[i];
      if (en.hp <= 0) {
        gameState.statTotalKills++;
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
        }
        if (en.tutorialType) gameState.tutorialDelay = 60;
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
  var ARC1_LEVELS = {
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
  var ARC2_LEVELS = deriveArc(ARC1_LEVELS, [ruleEcho], 12, 1.03);
  var ARC3_LEVELS = deriveArc(ARC1_LEVELS, [rulePincerAndBruiser], 16, 1.05);
  var ARC4_LEVELS = deriveArc(ARC1_LEVELS, [ruleReadOverGuard], 20, 1.04);
  var ARC5_LEVELS = deriveArc(ARC1_LEVELS, [ruleEcho, rulePincerAndBruiser, ruleReadOverGuard], 24, 1.08);
  var ARC_WAVE_TABLES = { 1: ARC1_LEVELS, 2: ARC2_LEVELS, 3: ARC3_LEVELS, 4: ARC4_LEVELS, 5: ARC5_LEVELS };
  function spawnEnemy() {
    if (gameState.stageClearing || gameState.bossActive || gameState.bossIntroTimer > 0 || gameState.screen !== "playing" || gameState.purifyTimer > 0) return;
    if (gameState.currentStage % 7 === 0) {
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
        hp = Math.floor(hp * (1 + (gameState.currentStage - 1) * 0.1) * gm.packetDensityMult);
        if (type === "shield" || type === "bruiser") cooldown = Math.max(20, Math.round(cooldown * gm.enemyRecoveryMult));
        speed *= gameState.stageSpeedMult;
        if (gameState.laneTempo && gameState.laneTempo[lane] !== void 0) speed *= gameState.laneTempo[lane];
        let spawnX = gameState.width + 50 + delayFrames * speed;
        gameState.enemies.push({
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
    }
  ];
  function spawnMonkAdd() {
    let hp = Math.floor(45 * (1 + (gameState.currentStage - 1) * 0.1));
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
    gameState.bossIntroTimer = 120;
    gameState.shake = 15;
    playSound("bash_tell");
    let baseHp = 300 + gameState.currentStage * 100;
    const rawArcIndex = CONSTANTS.getArcIndex(gameState.currentStage);
    const bossIndex = (rawArcIndex - 1) % BOSS_ROSTER.length;
    const template = BOSS_ROSTER[bossIndex];
    gameState.bossThemeColor = template.color;
    gameState.bossIntroText = template.name;
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
      arcMods
      // Assigned directly to the entity!
    });
  }
  function resolveBossStrike(en, rawDmg, isHeavy) {
    if (en.lane !== gameState.player.lane) return;
    if (Math.abs(en.x - gameState.player.x) > 100) return;
    if (gameState.player.state === "ghost_step") {
      spawnFloatingText(gameState.player.x, gameState.player.y - 50, "GHOST STEP", "#888888");
      if (gameState.progressionMods.ghostCounter && gameState.player.slipBuff === 0) {
        gameState.player.slipBuff = 1;
        playSound("perfect_slip");
        spawnFloatingText(gameState.player.x, gameState.player.y - 80, "GHOST COUNTER!", "#ffffff");
      }
      return;
    }
    let dmg = gameState.isInstinct ? Math.floor(rawDmg * 0.5) : rawDmg;
    takeDamage(dmg, isHeavy, en);
  }
  function handleNeonEnforcer(en) {
    en.attackCooldown--;
    if (en.desperation && gameState.runCount % 2 === 0) en.attackCooldown -= 1;
    if (en.currentMove !== "bash" && en.x > gameState.player.x + 100) {
      en.x -= en.speed * 0.5 * en.arcMods.walkDownMult;
    }
    if (Math.abs(en.x - gameState.player.x) < 140 && en.stun <= 0) {
      if (en.attackCooldown === Math.floor(22 * en.arcMods.punishWindowMult)) {
        playSound("bash_tell");
        if (en.currentMove === "bash") createImpact(en.x, en.y - 60, "#ffaa00");
      }
      if (en.attackCooldown <= 0) {
        en.justAttacked = 5;
        resolveBossStrike(en, en.currentMove === "bash" ? 30 : 12, en.currentMove === "bash");
        if (en.enraged) {
          en.currentMove = "bash";
          en.enraged = false;
        } else {
          let roll = random();
          if (en.phase === 1) {
            en.currentMove = roll > 0.6 ? "bash" : "jab";
            en.maxCooldown = en.currentMove === "bash" ? 70 : 45;
          } else {
            en.currentMove = roll > 0.5 ? "bash" : "jab";
            en.maxCooldown = en.currentMove === "bash" ? 55 : 35;
          }
        }
        en.attackCooldown = en.maxCooldown;
      }
    }
  }
  function handlePhantomBoxer(en) {
    en.attackCooldown--;
    if (en.desperation && gameState.runCount % 2 === 0) en.attackCooldown -= 1;
    if (en.x > gameState.player.x + 100) {
      en.x -= en.speed;
    }
    if (en.arcMods.fakeLaneFlash && !en.decoyRolledThisCycle && Math.abs(en.x - gameState.player.x) < 140 && en.attackCooldown === Math.floor(28 * en.arcMods.punishWindowMult) && random() < 0.45) {
      en.decoyRolledThisCycle = true;
      const otherLanes = [0, 1, 2].filter((l) => l !== en.lane);
      en.decoyLane = otherLanes[Math.floor(random() * otherLanes.length)];
      en.decoyTimer = 16;
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
    if (Math.abs(en.x - gameState.player.x) < 140 && en.stun <= 0) {
      if (en.attackCooldown === Math.floor(22 * en.arcMods.punishWindowMult)) {
        playSound(en.currentMove === "feint" ? "feint_tell" : "jab_tell");
      }
      if (en.currentMove === "feint" && en.attackCooldown === Math.floor(12 * en.arcMods.punishWindowMult)) {
        en.lane = gameState.player.lane;
        en.y = gameState.height * CONSTANTS.LANE_Y[en.lane];
        createImpact(en.x, en.y - 60, "#aa00ff");
      }
      if (en.attackCooldown <= 0) {
        en.justAttacked = 5;
        resolveBossStrike(en, 15, false);
        en.decoyRolledThisCycle = false;
        en.decoyTimer = 0;
        let roll = random();
        if (en.phase === 1) {
          en.currentMove = roll > 0.5 ? "feint" : "jab";
          en.maxCooldown = en.currentMove === "feint" ? 45 : 30;
        } else {
          if (en.lastMove === "feint") en.currentMove = "jab";
          else en.currentMove = roll > 0.2 ? "feint" : "jab";
          en.maxCooldown = en.currentMove === "feint" ? 35 : 20;
        }
        en.lastMove = en.currentMove;
        en.attackCooldown = en.maxCooldown;
      }
    }
  }
  function handleStaticMonk(en) {
    en.attackCooldown--;
    if (en.desperation && gameState.runCount % 2 === 0) en.attackCooldown -= 1;
    if (en.currentMove === "recharge") {
      en.x = gameState.player.x + 100;
      if (en.attackCooldown <= 0) {
        en.currentMove = "laser";
        en.x = gameState.width - 150;
        en.attackCooldown = 100;
        playSound("ghost_step");
        createShatter(en.x, en.y - 60, "#00ff00");
      }
    } else {
      en.x = gameState.width - 150 + Math.sin(Date.now() * 2e-3) * 50;
      if (en.attackCooldown === 80) {
        playSound("zoner_tell");
        en.targetLanes = [gameState.player.lane];
        let adjacentLane = gameState.player.lane === 1 ? random() > 0.5 ? 0 : 2 : 1;
        en.targetLanes.push(adjacentLane);
      }
      if (en.attackCooldown <= 80 && en.attackCooldown > 0 && en.targetLanes.length > 0) {
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
              if (gameState.player.state === "ghost_step") spawnFloatingText(gameState.player.x, gameState.player.y - 50, "EVADED", "#888888");
              else takeDamage(gameState.isInstinct ? 15 : 30, true, en);
            }
          });
        }
        en.targetLanes = [];
        en.bossMashCount++;
        const volleysPerBurst = 1 + (en.arcMods.patternChainLength || 1);
        if (en.bossMashCount >= volleysPerBurst) {
          en.currentMove = "recharge";
          en.attackCooldown = Math.floor(180 / en.arcMods.teleportRateMult);
          en.bossMashCount = 0;
          en.lane = gameState.player.lane;
          en.y = gameState.height * CONSTANTS.LANE_Y[en.lane];
          en.x = gameState.player.x + 100;
          playSound("ghost_step");
          createImpact(en.x, en.y - 60, "#00ff00");
          spawnFloatingText(en.x, en.y - 120, "RECHARGING!", "#00ff00");
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
  function updateBosses() {
    gameState.enemies.forEach((en) => {
      if (!en.isBoss || en.stun > 0 || gameState.bossIntroTimer > 0) return;
      if (en.controller === "neon_enforcer") handleNeonEnforcer(en);
      else if (en.controller === "phantom_boxer") handlePhantomBoxer(en);
      else if (en.controller === "static_monk") handleStaticMonk(en);
    });
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
    if (gameState.screen !== "playing" || gameState.bossActive || gameState.stageClearing || gameState.bossIntroTimer > 0 || gameState.currentStage % 7 === 0) return;
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
  function loadLeaderboard() {
    const a = safeGet(LB_KEY);
    return Array.isArray(a) ? a : [];
  }
  function loadMeta() {
    const m = safeGet(META_KEY) || {};
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
    safeSet(META_KEY, m);
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
  function isSubmittableRun(run) {
    if (!run) return false;
    return (run.score || 0) > 0 && (run.stage || 0) >= 2;
  }
  function rankInsert(list, entry, max = MAX_ENTRIES) {
    const next = [...list, entry].sort((a, b) => b.score - a.score).slice(0, max);
    const idx = next.indexOf(entry);
    return { list: next, rank: idx >= 0 ? idx + 1 : -1 };
  }
  function unlocksForRun(run, unlocked) {
    var _a, _b;
    const out = [];
    for (const s of STRIKER_SKINS) {
      if (unlocked.includes(s.id) || out.includes(s.id)) continue;
      if (s.unlock === "default") {
        out.push(s.id);
        continue;
      }
      if (s.unlock === "daily") {
        if (run.daily && (run.bossKills || 0) >= 1) out.push(s.id);
        continue;
      }
      if (s.unlock.startsWith("grade:")) {
        const need = s.unlock.split(":")[1];
        if (((_a = GRADE_RANK[run.grade]) != null ? _a : -1) >= ((_b = GRADE_RANK[need]) != null ? _b : 99)) out.push(s.id);
      }
    }
    return out;
  }
  function commitRunRecord(run) {
    const entry = { score: run.score, grade: run.grade, stage: run.stage, daily: !!run.daily, at: Date.now() };
    const { list, rank } = rankInsert(loadLeaderboard(), entry);
    safeSet(LB_KEY, list);
    const meta = loadMeta();
    meta.totalRuns += 1;
    meta.bestBossStreak = Math.max(meta.bestBossStreak, run.bossKills || 0);
    const newly = unlocksForRun(run, meta.unlocked);
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
  async function submitScore(run) {
    if (!onlineEnabled()) return false;
    const body = {
      game: GAME,
      name: String(run.name || "STRIKER").slice(0, 16),
      score: Math.max(0, Math.min(1e6, Math.round(run.score || 0))),
      grade: ["C", "B", "A", "S"].includes(run.grade) ? run.grade : "C",
      stage: Math.max(1, Math.min(999, Math.round(run.stage || 1))),
      daily: !!run.daily,
      date_key: run.daily ? run.dateKey || null : null
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
      if (gameState.currentStage === 3 || gameState.currentStage === 5) d.y += d.vy + 2;
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
  function drawAtmosphere() {
    let grad = ctx.createLinearGradient(0, 0, 0, gameState.height);
    let levelInArc = CONSTANTS.getLevelInArc(gameState.currentStage);
    let cStage = levelInArc === 7 ? 6 : levelInArc;
    if (gameState.purifyTimer > 0) {
      let pAlpha = gameState.purifyTimer / 100;
      grad.addColorStop(0, `rgba(2, 30, 60, ${pAlpha})`);
      grad.addColorStop(0.5, `rgba(10, 40, 70, ${pAlpha})`);
      grad.addColorStop(1, `rgba(5, 15, 30, ${pAlpha})`);
    } else if (cStage === 1) {
      grad.addColorStop(0, "#020205");
      grad.addColorStop(0.5, "#05050a");
      grad.addColorStop(1, "#0a0a14");
    } else if (cStage === 2) {
      grad.addColorStop(0, "#001a1a");
      grad.addColorStop(0.5, "#002b33");
      grad.addColorStop(1, "#00404d");
    } else if (cStage === 3) {
      grad.addColorStop(0, "#1a0505");
      grad.addColorStop(0.5, "#2b0a0a");
      grad.addColorStop(1, "#4d1010");
    } else if (cStage === 4) {
      grad.addColorStop(0, "#140026");
      grad.addColorStop(0.5, "#20003b");
      grad.addColorStop(1, "#3d004d");
    } else if (cStage === 5) {
      grad.addColorStop(0, "#000000");
      grad.addColorStop(0.5, "#020502");
      grad.addColorStop(1, "#051005");
    } else {
      grad.addColorStop(0, "#1a1a1a");
      grad.addColorStop(0.5, "#333333");
      grad.addColorStop(1, "#4d4d4d");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, gameState.width, gameState.height);
    let accentColor = "rgba(0, 255, 255, 0.02)";
    let shardColor = "rgba(0, 255, 255, 0.05)";
    if (cStage === 2) {
      accentColor = "rgba(0, 255, 255, 0.04)";
      shardColor = "rgba(0, 255, 255, 0.09)";
    } else if (cStage === 3) {
      accentColor = "rgba(255, 50, 50, 0.03)";
      shardColor = "rgba(255, 50, 50, 0.06)";
    } else if (cStage === 4) {
      accentColor = "rgba(255, 0, 255, 0.03)";
      shardColor = "rgba(255, 0, 255, 0.08)";
    } else if (cStage === 5) {
      accentColor = "rgba(0, 255, 0, 0.02)";
      shardColor = "rgba(0, 255, 0, 0.04)";
    } else if (cStage === 6) {
      accentColor = "rgba(255, 255, 255, 0.05)";
      shardColor = "rgba(255, 255, 255, 0.15)";
    }
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

  // src/render/boxer.js
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
    const d = isPlayer ? 1 : -1;
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
    if (isPlayer) {
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
    ctx3.fillStyle = entity.stun > 0 ? "#fff" : dC;
    dc(sX + 3 * d, hdY, hS, true, false);
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
    if (gameState.shake > 1) {
      ctx.translate((Math.random() - 0.5) * gameState.shake, (Math.random() - 0.5) * gameState.shake);
    }
    if (gameState.bossIntroTimer > 0) {
      ctx.fillStyle = "rgba(255, 0, 85, 0.15)";
      ctx.fillRect(0, 0, gameState.width, gameState.height);
    }
    drawAtmosphere();
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
        const pressure = en.pressure || 0;
        if (pressure > 0) {
          for (let i = 0; i < pressure; i++) {
            ctx.fillStyle = "#ff0055";
            ctx.fillRect(en.x + i * 7, barY - 6, 5, 3);
          }
        }
        ctx.globalAlpha = 1;
      }
      if (en.isBoss) {
        let nameY = en.y - en.h - 35;
        let flashAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.4;
        ctx.fillStyle = `rgba(255, 170, 0, ${flashAlpha * 0.4})`;
        ctx.fillRect(en.x - 30, nameY - 15, en.w + 60, 22);
        ctx.fillStyle = `rgba(255, 170, 0, ${flashAlpha})`;
        ctx.fillRect(en.x - 30, nameY + 5, en.w + 60, 2);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px Orbitron";
        ctx.textAlign = "center";
        ctx.fillText(en.name, en.x + en.w / 2, nameY);
        ctx.textAlign = "left";
      }
    });
    drawBoxer(ctx, gameState.player, true);
    gameState.floatingTexts.forEach((ft) => {
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color;
      ctx.font = "bold 16px Orbitron";
      ctx.textAlign = "center";
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.textAlign = "left";
    });
    ctx.globalAlpha = 1;
    if (gameState.bossIntroTimer > 0) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, gameState.height / 2 - 80, gameState.width, 160);
      let slideIn = Math.min(1, (120 - gameState.bossIntroTimer) / 20);
      ctx.fillStyle = "#fff";
      ctx.font = "900 italic 40px Orbitron";
      ctx.textAlign = "center";
      ctx.fillText(gameState.bossIntroText, gameState.width / 2 * slideIn + gameState.width / 4, gameState.height / 2 - 10);
      ctx.textAlign = "left";
    }
    SequenceManager.draw(ctx, gameState.width, gameState.height);
    ctx.restore();
  }

  // src/main.js
  var $2 = function(id) {
    return document.getElementById(id);
  };
  var canvas2 = document.getElementById("gameCanvas");
  var ctx2 = canvas2 ? canvas2.getContext("2d", { alpha: false }) : null;
  function triggerUpgradeDraft() {
    gameState.screen = "upgrading";
    const title = document.getElementById("upgrade-title");
    if (title) {
      if (gameState.pendingUpgrades > 1) {
        title.innerText = `EVOLUTIONS REMAINING: ${gameState.pendingUpgrades}`;
        title.style.color = "#ff00ff";
      } else {
        title.innerText = "EVOLUTION READY";
        title.style.color = "#ffffff";
      }
    }
    let draftOptions = buildDraft(gameState, UPGRADE_POOL);
    const container = document.getElementById("draft-container");
    if (container) {
      container.innerHTML = "";
      draftOptions.forEach((option, index) => {
        let themeColor = "#ffffff";
        if (option.tree === "speed") themeColor = "#22d3ee";
        if (option.tree === "power") themeColor = "#ec4899";
        if (option.tree === "technique") themeColor = "#facc15";
        const PAD_LABEL = ["X", "Y", "B"];
        let iconText = `[${index + 1}] / [${PAD_LABEL[index] || "?"}]`;
        if (option.kind === "overclock") themeColor = "#c084fc";
        if (option.kind === "mastery") themeColor = "#34d399";
        if (option.kind === "fusion") themeColor = "#ff0055";
        let btnHTML = `
                <div class="orb-btn flex-1 min-w-[250px] max-w-[320px] flex flex-col justify-between cursor-pointer" onclick="window.engineApplyUpgradeState('${option.id}')" style="border-color: ${themeColor}40;">
                    <div>
                        <div class="text-[10px] uppercase font-black tracking-widest mb-2" style="color: ${themeColor};">${option.kind}</div>
                        <div class="font-bold text-xl text-white mb-2">${option.name} <span class="text-xs ml-2 opacity-60">${iconText}</span></div>
                        <div class="text-xs opacity-80 mb-4 text-gray-300 leading-relaxed">${option.desc}</div>
                    </div>
                </div>
            `;
        container.insertAdjacentHTML("beforeend", btnHTML);
      });
    }
    if (HUD.screens.upgrade) HUD.screens.upgrade.style.display = "flex";
  }
  window.engineTriggerUpgradeDraft = triggerUpgradeDraft;
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
    gameState.seenTutorials = { shield: false, slip: false, guard: false, instinct: false, counter: false, ghost_step: false, bruiser_id: false, assassin_id: false, footwork_tip: false };
    gameState.tutorialSlipFails = 0;
    gameState.orbCounts = { speed: 0, power: 0, technique: 0 };
    gameState.stats = { speedMult: 1, powerMult: 1, techMult: 1 };
    gameState.exp = 0;
    gameState.expNeeded = 8;
    gameState.pendingUpgrades = 0;
    gameState.totalLevel = 0;
    gameState.bossDefeatedThisStage = false;
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
    gameState.lastHUD.exp = -1;
    gameState.lastHUD.mult = -1;
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
    let barCont = document.getElementById("bar-cont");
    if (barCont) barCont.classList.remove("beast-active");
    ["speed", "power", "technique"].forEach((t) => {
      const orbUI = document.getElementById(`orb-${t}`);
      if (orbUI) orbUI.innerText = "0";
    });
  }
  function startGame(daily = false) {
    gameState.runCount = (gameState.runCount || 0) + 1;
    initAudio();
    const toggle = document.getElementById("tutorial-toggle-cb");
    gameState.tutorialEnabled = toggle ? toggle.checked : true;
    gameState.dailyMode = daily;
    gameState.dailyDateKey = daily ? todayKey() : null;
    seedRng(daily ? dailySeedFromDate() : Math.random() * 4294967295 >>> 0);
    resetGame();
    gameState.screen = "playing";
    const startScreen = document.getElementById("start-screen");
    if (startScreen) startScreen.style.display = "none";
    const goScreen = document.getElementById("gameover-screen");
    if (goScreen) goScreen.style.display = "none";
    SequenceManager.play("stage1Intro");
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
    const pauseScreen = document.getElementById("pause-screen");
    if (pauseScreen) pauseScreen.style.display = "none";
    const goScreen = document.getElementById("gameover-screen");
    if (goScreen) goScreen.style.display = "none";
    SequenceManager.active = false;
  }
  window.engineApplyUpgradeState = function(id) {
    let option = gameState.currentDraftOptions.find((o) => o.id === id);
    if (option) applyUpgrade(gameState, option);
  };
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
      gameState.pad.up = jp(12) || aU && !gameState.lastGamepadState.axes[0];
      gameState.pad.down = jp(13) || aD && !gameState.lastGamepadState.axes[1];
      gameState.pad.left = jp(14) || jp(6);
      gameState.pad.guard = p(4) || p(5) || p(7);
      gameState.pad.jab = jp(2);
      gameState.pad.cross = jp(3);
      gameState.pad.hook = jp(1);
      gameState.pad.instinct = jp(0);
      gameState.pad.pause = jp(9) || jp(16);
      if (gameState.screen === "start") {
        if (gameState.pad.instinct || gameState.pad.pause || gameState.pad.jab) startGame();
      } else if (gameState.screen === "playing") {
        if (gameState.pad.pause && !SequenceManager.active) {
          gameState.screen = "paused";
          let p2 = document.getElementById("pause-screen");
          if (p2) p2.style.display = "flex";
        }
      } else if (gameState.screen === "paused") {
        if (gameState.pad.instinct || gameState.pad.pause) {
          gameState.screen = "playing";
          let p2 = document.getElementById("pause-screen");
          if (p2) p2.style.display = "none";
        }
      } else if (gameState.screen === "tutorial") {
        if (gameState.pad.instinct || gameState.pad.jab || gameState.pad.cross) dismissTutorial();
      } else if (gameState.screen === "upgrading") {
        if (gameState.pad.jab && gameState.currentDraftOptions[0]) applyUpgrade(gameState, gameState.currentDraftOptions[0]);
        if (gameState.pad.cross && gameState.currentDraftOptions[1]) applyUpgrade(gameState, gameState.currentDraftOptions[1]);
        if (gameState.pad.hook && gameState.currentDraftOptions[2]) applyUpgrade(gameState, gameState.currentDraftOptions[2]);
      } else if (gameState.screen === "gameover") {
        if (gameState.pad.instinct || gameState.pad.jab) startGame();
        if (gameState.pad.hook || gameState.pad.cross) returnToMenu();
      }
      for (let i = 0; i < gp.buttons.length; i++) gameState.lastGamepadState.buttons[i] = p(i);
      gameState.lastGamepadState.axes[0] = aU;
      gameState.lastGamepadState.axes[1] = aD;
    }
  }
  window.startGame = window.engineStartGame = startGame;
  window.toggleHowTo = window.engineToggleHowTo = toggleHowTo;
  window.dismissTutorial = window.engineDismissTutorial = dismissTutorial;
  window.returnToMenu = window.engineReturnToMenu = returnToMenu;
  window.addEventListener("keydown", (e) => {
    gameState.keys[e.code] = true;
    if (gameState.screen === "records") {
      if (e.code === "Escape" || e.code === "KeyH" || e.code === "Enter") toggleRecords();
      return;
    }
    if (gameState.screen === "start" && (e.code === "Space" || e.code === "Enter" || e.code === "KeyA")) {
      startGame();
      return;
    }
    if (e.code === "KeyP" || e.code === "Escape" && gameState.screen !== "howto" && gameState.screen !== "tutorial") {
      if (gameState.screen === "playing") {
        gameState.screen = "paused";
        let p = document.getElementById("pause-screen");
        if (p) p.style.display = "flex";
      } else if (gameState.screen === "paused") {
        gameState.screen = "playing";
        let p = document.getElementById("pause-screen");
        if (p) p.style.display = "none";
      }
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
      if (e.code === "Digit1" && gameState.currentDraftOptions[0]) applyUpgrade(gameState, gameState.currentDraftOptions[0]);
      if (e.code === "Digit2" && gameState.currentDraftOptions[1]) applyUpgrade(gameState, gameState.currentDraftOptions[1]);
      if (e.code === "Digit3" && gameState.currentDraftOptions[2]) applyUpgrade(gameState, gameState.currentDraftOptions[2]);
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
  function update() {
    if (gameState.screen !== "playing") return;
    if (gameState.hitstop > 0) {
      gameState.hitstop--;
      return;
    }
    if (gameState.shake > 0) gameState.shake *= 0.88;
    updateAtmosphere();
    updateParticlesAndTrails();
    if (SequenceManager.active) {
      SequenceManager.update();
      return;
    }
    if (gameState.tutorialGrace > 0) gameState.tutorialGrace--;
    if (gameState.tutorialDelay > 0) gameState.tutorialDelay--;
    if (gameState.bossIntroTimer > 0) gameState.bossIntroTimer--;
    if (gameState.instinctPauseTimer > 0) {
      gameState.instinctPauseTimer--;
    } else if (gameState.isInstinct) {
      gameState.instinctMeter -= 0.25;
      if (gameState.instinctMeter <= 0) {
        gameState.isInstinct = false;
        let barCont = document.getElementById("bar-cont");
        if (barCont) barCont.classList.remove("beast-active");
      }
    }
    let banner = document.getElementById("instinct-ready-banner");
    if (gameState.instinctMeter >= 100 && !gameState.isInstinct) {
      if (!gameState.seenTutorials.instinct) {
        triggerTutorial("instinct", "INSTINCT MAXED", 'Your meter is full!<br><br>Instinct is gained by landing consecutive hits and executing Perfect Slips.<br><br>Press <span class="text-cyan-400 font-bold">[SPACE] / [A]</span> to unleash double knockback and massive hitstop.');
        return;
      } else if (banner) banner.style.display = "block";
    } else if (banner) banner.style.display = "none";
    updatePlayer();
    updateEnemies();
    if (typeof updateBosses === "function") updateBosses();
    maybeScheduleHazard();
    updateHazards();
    while (gameState.exp >= gameState.expNeeded) {
      gameState.exp -= gameState.expNeeded;
      gameState.totalLevel++;
      gameState.expNeeded = Math.floor(8 * Math.pow(1.12, gameState.totalLevel));
      gameState.pendingUpgrades++;
      showToast("EVOLUTION CHARGED!", "#00ffff");
      playSound("perfect_slip");
    }
    if (gameState.stageClearing && gameState.enemies.length === 0 && !gameState.bossActive && gameState.screen === "playing" && gameState.purifyTimer <= 0) {
      if (gameState.currentStage % 7 === 0 && !gameState.bossDefeatedThisStage) {
        if (typeof spawnBoss === "function") spawnBoss();
      } else {
        advanceStage();
      }
    }
    if (gameState.waveTimer <= 30 || gameState.enemies.length > 0) gameState.draftedThisBreather = false;
    if (gameState.screen === "playing" && gameState.pendingUpgrades > 0 && gameState.enemies.length === 0 && !gameState.bossActive && !gameState.stageClearing && !gameState.draftedThisBreather) {
      if (gameState.waveTimer > 30 && gameState.bossIntroTimer <= 0) {
        gameState.draftedThisBreather = true;
        triggerUpgradeDraft();
      }
    }
    if (gameState.health <= 0) {
      gameState.screen = "gameover";
      if (HUD.finalStage) HUD.finalStage.innerText = `STAGE REACHED: ${gameState.currentStage}`;
      let title = "SURVIVOR ROUTE";
      if (gameState.orbCounts.speed === 3) title = "VELOCITY ROUTE";
      else if (gameState.orbCounts.power === 3) title = "TYRANT ROUTE";
      else if (gameState.orbCounts.technique === 3) title = "PHANTOM ROUTE";
      const runTitle = document.getElementById("run-title-ui");
      if (runTitle) runTitle.innerText = `"${title}"`;
      const runMode = document.getElementById("run-mode-ui");
      if (runMode) runMode.innerText = gameState.dailyMode ? `DAILY CHALLENGE \xB7 ${gameState.dailyDateKey}` : "";
      let score = gameState.statTotalKills * 10 + gameState.statMaxCombo * 50 + gameState.statTotalSlips * 250 + gameState.statBossKills * 250 + gameState.statCounterHits * 200 + gameState.statBossBreaks * 350 - gameState.statRecoilTaken * 150 - gameState.statDespDamage * 200;
      let grade = "C";
      if (score > 3e3) grade = "S";
      else if (score > 1500) grade = "A";
      else if (score > 800) grade = "B";
      let reqSlipsForS = Math.min(gameState.statBossKills, 3);
      if (reqSlipsForS === 0) reqSlipsForS = 1;
      if (grade === "S" && gameState.statTotalSlips < reqSlipsForS) grade = "A";
      if (grade === "A" && gameState.statTotalSlips < 1) grade = "B";
      const statGrade = document.getElementById("stat-grade");
      if (statGrade) {
        statGrade.innerText = grade;
        if (grade === "S") statGrade.className = "stat-val text-5xl ml-2 text-yellow-400";
        else if (grade === "A") statGrade.className = "stat-val text-5xl ml-2 text-pink-500";
        else statGrade.className = "stat-val text-5xl ml-2 text-cyan-400";
      }
      const scCombo = document.getElementById("stat-combo");
      if (scCombo) scCombo.innerText = gameState.statMaxCombo;
      const scSlips = document.getElementById("stat-slips");
      if (scSlips) scSlips.innerText = gameState.statTotalSlips;
      const scKills = document.getElementById("stat-kills");
      if (scKills) scKills.innerText = gameState.statTotalKills;
      const scBosses = document.getElementById("stat-bosses");
      if (scBosses) scBosses.innerText = gameState.statBossKills;
      const scBuild = document.getElementById("stat-build");
      if (scBuild) scBuild.innerText = `FINAL BUILD: SPD ${gameState.orbCounts.speed} | PWR ${gameState.orbCounts.power} | TEC ${gameState.orbCounts.technique}`;
      const scScore = document.getElementById("stat-score");
      if (scScore) scScore.innerText = Math.max(0, score).toLocaleString();
      const runResult = commitRun(Math.max(0, score), grade, gameState.currentStage);
      const rec = commitRunRecord({ score: Math.max(0, score), grade, stage: gameState.currentStage, daily: gameState.dailyMode, bossKills: gameState.statBossKills });
      const submittable = { name: getAlias(), score: Math.max(0, score), grade, stage: gameState.currentStage, daily: gameState.dailyMode, dateKey: gameState.dailyDateKey };
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
      if (HUD.screens.gameover) HUD.screens.gameover.style.display = "flex";
    }
    gameState.health = Math.round(gameState.health);
    if (typeof updateHUD === "function") updateHUD();
    if (!gameState.seenTutorials.footwork_tip && gameState.currentStage === 1 && gameState.enemies.length === 0 && (!gameState.tutorialEnabled || gameState.spawnTotal >= 5)) {
      triggerTutorial("footwork_tip", "FOOTWORK", 'You are not locked to one spot.<br><br>Hold <span class="text-cyan-400 font-bold">[RIGHT]</span> to press forward &mdash; you reach enemies sooner and can interrupt a windup before it becomes a threat, but more of them converge on you at once.<br><br>Hold <span class="text-cyan-400 font-bold">[LEFT]</span> past the initial Ghost Step burst to give ground &mdash; buys you time, at the cost of tempo.<br><br><i>Let go of both and you drift back to a neutral stance on your own.</i>');
    }
    spawnEnemy();
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
  function commitRun(score, grade, stage) {
    const prev = loadBest();
    const isBest = !prev || score > prev.score;
    if (isBest) saveBest({ score, grade, stage, at: Date.now() });
    let isDailyBest = false;
    if (gameState.dailyMode) {
      const prevDaily = loadDailyBest();
      isDailyBest = !prevDaily || score > prevDaily.score;
      if (isDailyBest) saveDailyBest({ score, grade, stage, dateKey: gameState.dailyDateKey, at: Date.now() });
    }
    renderBest();
    return { isBest, isDailyBest };
  }
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
  function loop() {
    pollGamepad();
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
    resetGame();
    initAtmosphere();
    fitViewport();
    renderBest();
    applyStrikerColor();
    loop();
  }
  init();
})();
