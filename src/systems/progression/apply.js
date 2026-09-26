import { gameState as st } from '../../state.js';
import { CONSTANTS } from '../../constants.js';
import { UPGRADE_POOL } from '../../data/upgrades.js';
import { SequenceManager } from '../sequences.js';
import { showToast } from '../../vfx_audio/effects.js';
import { random } from '../rng.js';
import { rollWagerOffer, clearWager } from '../wagers.js';
import { addScore } from '../score.js';
import { reducedMotion, profileFlag, setProfileFlag } from '../settings.js';
import { playSound } from '../../vfx_audio/audio.js';
import { tmEvolution, tmStage, tmArc } from '../telemetry.js';
import { judgeArc, arcParStart, MEDALS, fmtSecs, fmtK } from '../arc_par.js';

function applyEffect(st, effect) {
    switch (effect.op) {
        case "incOrb": {
            let currentCount = st.orbCounts[effect.tree] !== undefined ? st.orbCounts[effect.tree] : 0;
            let addAmount = effect.amount !== undefined ? effect.amount : 1;
            st.orbCounts[effect.tree] = Math.min(CONSTANTS.MAX_RANK, currentCount + addAmount);
            if (!st.rankOrder) st.rankOrder = [];
            st.rankOrder.push(effect.tree); // "most recently ranked" tie-breaks colour + teases
            let el = document.getElementById(`orb-${effect.tree}`);
            if (el) el.innerText = st.orbCounts[effect.tree];
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
    // Only an option that's actually on the table can be taken — guards against a
    // click and a key (or pad) both landing on the same draft in one frame.
    if (!st.currentDraftOptions.some(o => o.id === upgrade.id)) return;

    for (const effect of upgrade.effects) applyEffect(st, effect);
    tmEvolution(upgrade.id);

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
    let upgradeScreen = document.getElementById('upgrade-screen');
    if (upgradeScreen) upgradeScreen.style.display = 'none';

    // v18 STACKED EVOLUTIONS: back-to-back picks are drafted one after another,
    // then celebrated TOGETHER on one screen that lists every pick (playtest:
    // "stack multiple evolutions and let the end screen read all of them").
    if (!st.evoChain || !st.evoChain.active) st.evoChain = { active: true, total: 1, picks: [] };
    st.evoChain.picks.push(upgrade);
    if (st.pendingUpgrades > 0) {
        // FIXED: Using the global window object to 100% bypass circular module import crashes!
        if (window.engineTriggerUpgradeDraft) window.engineTriggerUpgradeDraft();
        else st.screen = 'playing';
        return;
    }
    const picks = st.evoChain.picks.slice();
    st.evoChain = { active: false, total: 0, picks: [] };
    const resume = () => { st.screen = 'playing'; };
    if (window.enginePlayUpgradeVignette) window.enginePlayUpgradeVignette(picks, resume);
    else resume();
}

const ARC_COLORS = { 1: '#22d3ee', 2: '#34d399', 3: '#f87171', 4: '#c084fc', 5: '#facc15' };
const ARC_TINTS = {
    1: 'rgba(34, 211, 238, 0.18)', 2: 'rgba(52, 211, 153, 0.18)', 3: 'rgba(248, 113, 113, 0.18)',
    4: 'rgba(192, 132, 252, 0.18)', 5: 'rgba(250, 204, 21, 0.18)'
};

export function stageHudText(stage) {
    const arc = Math.min(CONSTANTS.getArcIndex(stage), 5);
    const law = CONSTANTS.ARC_LAWS[arc] || CONSTANTS.ARC_LAWS[5];
    const data = CONSTANTS.ARC_STAGE_TABLES[arc]?.[CONSTANTS.getLevelInArc(stage)] || { stageName: "UNKNOWN DEPTHS" };
    return { text: `${law.shortName}: ${data.stageName}`, color: ARC_COLORS[arc] || '#ec4899' };
}

export function refreshStageHud() {
    if (st.practice) { st.lastHUD.practice = null; return; } // v20: Practice owns the stage line (ui.js)
    const stageUI = document.getElementById('stage-ui');
    const affixUI = document.getElementById('affix-ui');
    const hud = stageHudText(st.currentStage);
    if (stageUI) {
        stageUI.innerText = hud.text;
        stageUI.style.color = hud.color;
        // Re-trigger the pulse animation even if it's already mid-run.
        stageUI.classList.remove('stage-pulse');
        void stageUI.offsetWidth;
        stageUI.classList.add('stage-pulse');
    }
    if (affixUI) affixUI.innerText = st.wagerMult > 1 && st.currentAffix ? `WAGER: ${st.currentAffix.name} x${st.wagerMult}` : '';
}

// The Arc 1 theme ("Learn the language of lane-boxing.") surfaces ONCE per save
// (playtest: it "doesn't need to keep surfacing"); after that the stage's own
// tagline takes its place. Returns the subtitle for the run-opening card.
export function openingSubtitle() {
    if (!profileFlag('seenArc1Theme')) {
        setProfileFlag('seenArc1Theme');
        return CONSTANTS.ARC_LAWS[1].theme;
    }
    return CONSTANTS.STAGE_TAGLINES[1];
}

// v17 ROUND FRAMING: "ROUND N — VENUE" billing card data for a stage.
export function roundCard(stage, tagline) {
    const arc = Math.min(CONSTANTS.getArcIndex(stage), 5);
    const law = CONSTANTS.ARC_LAWS[arc] || CONSTANTS.ARC_LAWS[5];
    const data = CONSTANTS.ARC_STAGE_TABLES[arc]?.[CONSTANTS.getLevelInArc(stage)] || { stageName: 'Unknown Depths' };
    return { round: stage, venue: data.stageName, tagline: tagline || '', kicker: `${law.shortName} · ${law.name.toUpperCase()}`, color: ARC_COLORS[arc] || '#22d3ee' };
}

export function advanceStage() {
    const prevStage = st.currentStage;
    // Stage-clear bonus for the fight just won (wager applies, combo doesn't).
    // v19: every enemy is KO'd to clear a stage now, so the clear is an ALL CLEAR;
    // doing it without taking a single hit is FLAWLESS (the target to chase).
    const clearPts = addScore(CONSTANTS.SCORE.stageClear, undefined, undefined, { noCombo: true });
    if (clearPts > 0) showToast(`ALL CLEAR +${clearPts.toLocaleString()}`, '#facc15');
    if ((st.stageHitsTaken || 0) === 0 && prevStage > 1) {
        const fl = addScore(CONSTANTS.SCORE.flawless, undefined, undefined, { noCombo: true });
        showToast(`FLAWLESS +${fl.toLocaleString()}`, '#ffffff');
        st.statFlawless = (st.statFlawless || 0) + 1;
    }
    st.stageHitsTaken = 0;

    st.currentStage++;
    tmStage(st.currentStage);
    st.bossDefeatedThisStage = false;
    // v16 WAGERS: no modifier is active until the player accepts one.
    clearWager();
    st.wagerOffer = rollWagerOffer(st.currentStage);

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

    // STAGE TRANSITION palette: the old arena morphs into the new one during the
    // light sweep (render/atmosphere.js lerps paletteFrom -> paletteTo).
    st.paletteFrom = CONSTANTS.paletteKeyForStage(prevStage);
    st.paletteTo = CONSTANTS.paletteKeyForStage(st.currentStage);
    st.paletteT = 0;

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
        ? [{ type: 'text', title: 'LANE SURGE', subtitle: `${LANE_LABEL[st.hotLane]} LANE RUNNING HOT`, duration: 120 }]
        : [];
    let stageData = CONSTANTS.ARC_STAGE_TABLES[safeArcIndex]?.[levelInArc] || { stageName: "UNKNOWN DEPTHS" };

    let titleText = isBoss ? stageData.stageName : `${law.shortName} — ${stageData.stageName}`;
    // Arc themes live on the arc's chapter card now; stage cards carry the level's
    // own tagline instead of repeating the arc line every single stage.
    let subtitleText = isBoss ? law.uiText : CONSTANTS.STAGE_TAGLINES[levelInArc];

    // Every stage transition already got a card, but a brand-new arc used to get
    // the exact same treatment as clearing any other stage within it — no
    // distinction between "next fight" and "the game's philosophy just changed."
    // A new arc gets its own two-beat chapter card first (arc number, then arc
    // name + its theme line), colored to that arc, before the stage card.
    const isNewArc = CONSTANTS.locateStage(st.currentStage).ordinal === 1 && st.currentStage > 1;
    // v17 TEN-COUNT: the once-per-arc knockdown refreshes with each new arc.
    if (isNewArc) st.knockdownsThisArc = 0;
    // v20 ARC PAR: judge the Arc that just ended, pay its medal, restart the clock.
    let medalSteps = [];
    if (isNewArc) {
        const r = judgeArc(CONSTANTS.getArcIndex(prevStage));
        const M = MEDALS[r.medal];
        addScore(M.bonus * r.arc, undefined, undefined, { noCombo: true });
        tmArc(r);
        st.lastArcResult = r;
        if (r.medal === 'gold') st.goldThisRun = true; // v21: unlocks the Prism Striker
        medalSteps = [{ type: 'text', title: `ARC ${r.arc} · ${M.label}${r.isBest ? ' ★' : ''}`,
            subtitle: `TIME ${fmtSecs(r.secs)} / PAR ${fmtSecs(r.par.time)}  ·  SCORE ${fmtK(r.score)} / PAR ${fmtK(r.par.score)}  ·  +${(M.bonus * r.arc).toLocaleString()}`, duration: 150 }];
        arcParStart();
    }
    const chapterCardSteps = isNewArc ? [
        { type: 'tint', color: 'rgba(0, 0, 0, 0.82)', duration: 20 },
        ...medalSteps,
        { type: 'text', title: `ARC ${safeArcIndex}`, subtitle: law.name.toUpperCase(), duration: 85 },
        { type: 'tint', color: ARC_TINTS[safeArcIndex] || 'rgba(236, 72, 153, 0.18)', duration: 10 },
        { type: 'text', title: law.name.toUpperCase(), subtitle: law.theme, duration: 160 },
        { type: 'tint', color: 'transparent', duration: 10 },
    ] : [];

    const rm = reducedMotion();
    SequenceManager.playDynamic([
        { type: 'walkout', duration: rm ? 24 : 46 },
        { type: 'call', fn: () => { playSound('sweep'); refreshStageHud(); } },
        { type: 'sweep', duration: rm ? 24 : 54 },
        ...chapterCardSteps,
        // v17 ROUND FRAMING: every fight opens on a bell + billing card; a boss
        // stage instead gets its title-fight poster when the champion walks out.
        ...(isBoss ? [] : [{ type: 'billing', duration: 120, card: roundCard(st.currentStage, subtitleText) }]),
        { type: 'wager' },
        ...hotLaneCard,
        { type: 'walkin', duration: rm ? 24 : 44 },
        { type: 'call', fn: refreshStageHud },
        { type: 'resume' }
    ]);
}
