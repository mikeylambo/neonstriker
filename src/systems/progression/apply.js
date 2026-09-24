import { gameState as st } from '../../state.js';
import { CONSTANTS } from '../../constants.js';
import { UPGRADE_POOL } from '../../data/upgrades.js';
import { SequenceManager } from '../sequences.js';
import { showToast } from '../../vfx_audio/effects.js';
import { random } from '../rng.js';

function applyEffect(st, effect) {
    switch (effect.op) {
        case "incOrb": {
            let currentCount = st.orbCounts[effect.tree] !== undefined ? st.orbCounts[effect.tree] : 0;
            let addAmount = effect.amount !== undefined ? effect.amount : 1;
            st.orbCounts[effect.tree] = currentCount + addAmount;
            
            let el = document.getElementById(`orb-${effect.tree}`);
            if (el) el.innerText = st.orbCounts[effect.tree];
            
            let newLvl = st.orbCounts[effect.tree];
            if (newLvl === 2) {
                if (effect.tree === 'speed') showToast("SPEED LVL 2: Missing Jabs won't break combo!");
                if (effect.tree === 'power') showToast("POWER LVL 2: Cross attack gains massive reach!");
                if (effect.tree === 'technique') showToast("TECH LVL 2: Perfect Slips charge 2 Counter hits!");
            } else if (newLvl === 3) {
                if (effect.tree === 'speed') showToast("SPEED MAX: Slip Cancel active!");
                if (effect.tree === 'power') showToast("POWER MAX: Bowling Collateral active!");
                if (effect.tree === 'technique') showToast("TECH MAX: True Read active!");
            }
            break;
        }
        case "mulStat": {
            let currentStat = st.stats[effect.stat] !== undefined ? st.stats[effect.stat] : 1;
            let addStatAmount = effect.amount !== undefined ? effect.amount : 0;
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
            let currentMod = st.progressionMods[effect.key] !== undefined ? st.progressionMods[effect.key] : 0;
            let addModAmount = effect.amount !== undefined ? effect.amount : 0;
            st.progressionMods[effect.key] = currentMod + addModAmount;
            break;
        }
        case "mulMod": {
            let currentModM = st.progressionMods[effect.key] !== undefined ? st.progressionMods[effect.key] : 1;
            let mulModAmount = effect.amount !== undefined ? effect.amount : 1;
            st.progressionMods[effect.key] = currentModM * mulModAmount;
            break;
        }
        case "heal": {
            let currentHealth = st.health !== undefined ? st.health : 0;
            let maxHealth = st.maxHealth !== undefined ? st.maxHealth : 100;
            let healAmount = effect.amount !== undefined ? effect.amount : 0;
            st.health = Math.min(maxHealth, currentHealth + healAmount);
            break;
        }
        case "incOverclock": {
            let currentOc = st.overclockCounts[effect.key] !== undefined ? st.overclockCounts[effect.key] : 0;
            let addOcAmount = effect.amount !== undefined ? effect.amount : 1;
            st.overclockCounts[effect.key] = currentOc + addOcAmount;
            break;
        }
        default: {
            console.warn("Unknown upgrade effect op:", effect.op, effect);
            break;
        }
    }
}

export function applyUpgrade(st, upgrade) {
    if (!upgrade || !upgrade.effects) return;

    for (const effect of upgrade.effects) applyEffect(st, effect);

    // Overclocks are pure invisible math (a flat stat nudge, no new mechanic to
    // feel) — without some acknowledgment, a late-game draft of nothing-but-
    // overclocks reads as "nothing happened." A brief flourish plus a toast
    // gives the pick a moment, even though the underlying effect is small.
    if (upgrade.kind === 'overclock') {
        const screenEl = document.getElementById('upgrade-screen');
        if (screenEl) {
            screenEl.classList.remove('overclock-flourish');
            void screenEl.offsetWidth;
            screenEl.classList.add('overclock-flourish');
        }
        showToast(`${upgrade.name.toUpperCase()} ONLINE`, '#facc15');
    }

    if (st.pendingUpgrades > 0) st.pendingUpgrades -= 1;
    st.currentDraftOptions = [];

    if (st.pendingUpgrades > 0) {
        // FIXED: Using the global window object to 100% bypass circular module import crashes!
        if (window.engineTriggerUpgradeDraft) {
            window.engineTriggerUpgradeDraft();
        }
    } else {
        st.screen = 'playing';
        let upgradeScreen = document.getElementById('upgrade-screen');
        if (upgradeScreen) upgradeScreen.style.display = 'none';
    }
}

export function advanceStage() {
    st.currentStage++;
    st.bossDefeatedThisStage = false;
    st.currentAffix = CONSTANTS.AFFIXES[Math.floor(random() * CONSTANTS.AFFIXES.length)];
    
    st.stageClearing = false; 
    st.bossActive = false; 
    st.stageProgress = 0; 
    st.wavesCleared = 0; 
    st.waveThreshold = 0;
    
    st.waveTimer = 90; 
    st.health = Math.min(st.maxHealth, st.health + 25);
    
    if (st.player) {
        st.player.state = 'idle';
        st.player.punchTimer = 0;
        st.player.hitFrame = 0;
        st.player.didHit = false;
        st.player.recoveryTimer = 0;
        st.player.comboWindow = 0;
        st.player.jabStep = 0;
        st.player.inputBuffer = null;
        st.player.movementBuffer = null;
    }

    let arcIndex = CONSTANTS.getArcIndex(st.currentStage);
    let levelInArc = CONSTANTS.getLevelInArc(st.currentStage);
    let isBoss = CONSTANTS.isBossStage(st.currentStage);
    
    let safeArcIndex = Math.min(arcIndex, 5);
    let law = CONSTANTS.ARC_LAWS[safeArcIndex] || CONSTANTS.ARC_LAWS[5];

    // LANE TEMPO: selectively make one lane "hot" this stage (faster approach only,
    // telegraph untouched). Signature of Arc 3; never on a boss stage. Seeded -> a
    // Daily plays the same hot lane for everyone, free-play varies run to run.
    // Clear any lane hazards from the previous stage; give a grace window before new ones.
    st.hazards = [];
    st.hazardCooldown = CONSTANTS.HAZARDS.cooldownFrames;
    st.hazardsThisStage = 0;
    // SURPRISE BUDGET: one shared per-stage pool for every acute surprise system.
    // Boss stages get none — the duel stays clean (same rule lane tempo already had).
    st.surpriseBudget = isBoss ? 0 : ((CONSTANTS.SURPRISE.budgetByArc || {})[safeArcIndex] || 0);
    st.laneTempo = [1, 1, 1];
    st.hotLane = -1;
    if (!isBoss) {
        const hotChance = (CONSTANTS.LANE_TEMPO.hotChanceByArc || {})[safeArcIndex] || 0;
        const hotCost = CONSTANTS.SURPRISE.hotLaneCost;
        // A hot lane is a stage-long surprise, so it pays into the same pool and
        // leaves proportionally less room for hazards on that stage.
        if (st.surpriseBudget >= hotCost && random() < hotChance) {
            st.hotLane = Math.floor(random() * 3);
            st.laneTempo[st.hotLane] = CONSTANTS.LANE_TEMPO.hotMult;
            st.surpriseBudget -= hotCost;
        }
    }
    const LANE_LABEL = ['TOP', 'MID', 'BOTTOM'];
    const hotLaneCard = st.hotLane >= 0
        ? [{ type: 'text', title: 'LANE SURGE', subtitle: `${LANE_LABEL[st.hotLane]} LANE RUNNING HOT`, duration: 150 }]
        : [];
    let stageData = CONSTANTS.ARC_STAGE_TABLES[safeArcIndex]?.[levelInArc] || { stageName: "UNKNOWN DEPTHS" };
    
    let titleText = isBoss ? stageData.stageName : `${law.shortName} — ${stageData.stageName}`;
    let subtitleText = isBoss ? law.uiText : law.theme;

    let affixName = st.currentAffix.name !== 'NONE' ? `[${st.currentAffix.name}]` : 'SYSTEM STABLE';
    let affixDesc = st.currentAffix.name !== 'NONE' ? st.currentAffix.desc : 'No anomalies detected.';

    const ARC_COLORS = { 1: '#22d3ee', 2: '#34d399', 3: '#f87171', 4: '#c084fc', 5: '#facc15' };
    const ARC_TINTS = {
        1: 'rgba(34, 211, 238, 0.18)', 2: 'rgba(52, 211, 153, 0.18)', 3: 'rgba(248, 113, 113, 0.18)',
        4: 'rgba(192, 132, 252, 0.18)', 5: 'rgba(250, 204, 21, 0.18)'
    };

    // Every stage transition already got a card, but a brand-new arc used to get
    // the exact same treatment as clearing any other stage within it — no
    // distinction between "next fight" and "the game's philosophy just changed."
    // A new arc now gets its own two-beat chapter card first (arc number, then
    // arc name + its own Act theme line), colored to that arc, before rolling
    // into the regular stage/affix card underneath.
    const isNewArc = levelInArc === 1 && st.currentStage > 1;
    const chapterCardSteps = isNewArc ? [
        { type: 'tint', color: 'rgba(0, 0, 0, 0.92)', duration: 35 },
        { type: 'text', title: `ARC ${safeArcIndex}`, subtitle: law.name.toUpperCase(), duration: 85 },
        { type: 'tint', color: ARC_TINTS[safeArcIndex] || 'rgba(236, 72, 153, 0.18)', duration: 10 },
        { type: 'text', title: law.name.toUpperCase(), subtitle: law.theme, duration: 170 },
    ] : [
        { type: 'tint', color: 'rgba(0, 0, 0, 0.9)', duration: 30 },
    ];

    SequenceManager.playDynamic([
        ...chapterCardSteps,
        { type: 'text', title: titleText, subtitle: subtitleText, duration: 140 }, 
        { type: 'text', title: `STAGE MODIFIER: ${affixName}`, subtitle: affixDesc, duration: 200 },
        ...hotLaneCard,
        { type: 'tint', color: 'transparent', duration: 30 },
        { type: 'resume' }
    ]);
    
    const stageUI = document.getElementById('stage-ui');
    const affixUI = document.getElementById('affix-ui');
    if (stageUI) {
        stageUI.innerText = `${law.shortName}: ${stageData.stageName}`;
        stageUI.style.color = ARC_COLORS[safeArcIndex] || '#ec4899';
        // Re-trigger the pulse animation even if it's already mid-run.
        stageUI.classList.remove('stage-pulse');
        void stageUI.offsetWidth;
        stageUI.classList.add('stage-pulse');
    }
    if (affixUI) affixUI.innerText = st.currentAffix.name !== 'NONE' ? affixName : '';
}