import { CONSTANTS } from './constants.js';

export const gameState = {
    screen: 'start',
    previousScreen: 'start',
    runCount: 0,
    strikerColor: '#00ffff', // cosmetic: player's neon, set from the selected unlocked skin
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
    hazardsThisStage: 0,   // per-stage hazard count (hard cap, see CONSTANTS.HAZARDS)
    surpriseBudget: 0,     // shared per-stage acute-surprise pool (CONSTANTS.SURPRISE)
    spawnTotal: 0,
    stageClearing: false,
    bossActive: false,
    bossDefeatedThisStage: false,
    
    // FIXED: Hardcoded fallback to prevent Temporal Dead Zone crashes during module imports
    currentAffix: { name: 'NONE', desc: 'System stable. No anomalies detected.' },

    // v16 LIVE SCORE + WAGERS
    score: 0,
    displayScore: 0,
    scorePops: [],
    wagerMult: 1,
    wagerOffer: null,       // affix currently being offered pre-stage (null = none)
    // v16 BOSS FINISHER / UPGRADE VIGNETTE / STAGE TRANSITION state
    finisher: null,
    finisherZoom: 1,
    vignette: null,
    paletteFrom: 1, paletteTo: 1, paletteT: 1,
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
    seenTutorials: { shield: false, slip: false, guard: false, instinct: false, counter: false, ghost_step: false, bruiser_id: false, assassin_id: false, footwork_tip: false },
    tutorialGrace: 0,
    tutorialDelay: 0,

    purifyTimer: 0,
    laneFlash: [0, 0, 0],
    bossIntroTimer: 0,
    bossThemeColor: '#fff',
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

// APEX (Flow State): a sustained streak of clean hits/Perfect Slips ramps gain,
// reset the instant a hit lands. This is also the first mechanic that makes
// Arc 5's own design copy ("pressure must be sustained, not merely survived")
// literally true rather than just a difficulty multiplier with flavor text.
export function getFlowMultiplier(state) {
    if (!state.progressionMods.flowState) return 1;
    const streak = state.player.flowStreak || 0;
    if (streak >= 25) return 1.5;
    if (streak >= 10) return 1.25;
    return 1;
}