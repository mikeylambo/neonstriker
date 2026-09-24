import { gameState as st } from './state.js';
import { CONSTANTS } from './constants.js';
import { updateHUD, HUD } from './ui/ui.js';
import { initAudio, playSound, startMusic, stopMusic, duckMusic, refreshAudioLevels, setMusicIntensity } from './vfx_audio/audio.js';
import { updateParticlesAndTrails, spawnFloatingText, showToast, triggerShockwave, doFlash, createImpact, createVacuum, createShatter } from './vfx_audio/effects.js';
import { SequenceManager } from './systems/sequences.js';
import { applyUpgrade, advanceStage, refreshStageHud, openingSubtitle } from './systems/progression/apply.js';

// FIXED: Corrected path and filename to match the architectural rename (draft.js)
import { buildDraft, buildFusionTease } from './systems/progression/draft.js';

import { UPGRADE_POOL } from './data/upgrades.js';
import { dismissTutorial, triggerTutorial, spawnTutorialEnemy } from './systems/tutorial.js';
import { resetPlayerObj, updatePlayer } from './entities/player.js';
import { updateEnemies } from './entities/enemies.js';
import { spawnEnemy } from './systems/waves.js';
import { spawnBoss, updateBosses } from './entities/bosses.js';
import { maybeScheduleHazard, updateHazards, clearHazards } from './systems/hazards.js';
import { seedRng, dailySeedFromDate, todayKey } from './systems/rng.js';
import { commitRunRecord, loadLeaderboard, loadMeta, selectSkin, selectedStrikerColor, STRIKER_SKINS, getAlias, setAlias, getOnlineOptIn, setOnlineOptIn, isSubmittableRun } from './systems/records.js';
import { submitScore, fetchTopAllTime, fetchTopDaily, onlineEnabled } from './systems/online.js';
import { initAtmosphere, updateAtmosphere } from './render/atmosphere.js';
import { draw } from './render/draw.js';
import { getSettings, setSetting, hitStopEnabled, applySettingsSideEffects } from './systems/settings.js';
import { rankForRun, pbDeltaText, comboMultiplier } from './systems/score.js';
import { acceptWager, declineWager } from './systems/wagers.js';
import { updateFinisher } from './systems/finisher.js';
import { playUpgradeVignette, updateVignette, skipVignette, upgradeRarity, upgradeColor } from './systems/vignette.js';

export const $ = function(id) { return document.getElementById(id); };
export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;

// ==========================================
// DRAFT SCREEN (v16 rarity visuals + Arc 1 fusion tease)
// ==========================================
const RARITY_BADGE = { orb: 'EVOLUTION', mastery: '◆ MASTERY', apex: '★ APEX MASTERY', fusion: '✦ FUSION ✦', overclock: 'OVERCLOCK' };

function escapeAttr(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

export function triggerUpgradeDraft() {
    st.screen = 'upgrading';
    st.draftHold = 0;
    const title = document.getElementById('upgrade-title');

    if (title) {
        if (st.pendingUpgrades > 1) {
            title.innerText = `EVOLUTIONS REMAINING: ${st.pendingUpgrades}`;
            title.style.color = '#ff00ff';
        } else {
            title.innerText = "EVOLUTION READY";
            title.style.color = '#ffffff';
        }
    }

    let draftOptions = buildDraft(st, UPGRADE_POOL);
    const tease = buildFusionTease(st, UPGRADE_POOL, CONSTANTS.getArcIndex(st.currentStage));
    const container = document.getElementById('draft-container');

    if (container) {
        container.innerHTML = '';
        const PAD_LABEL = ['X', 'Y', 'B'];
        draftOptions.forEach((option, index) => {
            const rarity = upgradeRarity(option);
            const color = upgradeColor(option);
            const iconText = `[${index + 1}] / [${PAD_LABEL[index] || '?'}]`;
            const treeTag = option.tree && option.tree !== 'general' ? ` · ${option.tree.toUpperCase()}` : '';
            const btnHTML = `
                <div class="draft-card card-${rarity}" style="--card-color:${color}; animation-delay:${index * 90 + (rarity === 'fusion' || rarity === 'apex' ? 220 : 0)}ms" onclick="window.engineApplyUpgradeState('${escapeAttr(option.id)}')">
                    <div class="card-inner">
                        <div class="card-badge">${RARITY_BADGE[rarity]}${treeTag}</div>
                        <div class="card-name">${option.name}</div>
                        <div class="card-desc">${option.desc}</div>
                        <div class="card-key">${iconText}</div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', btnHTML);
        });
        if (tease) {
            container.insertAdjacentHTML('beforeend', `
                <div class="draft-card card-fusion card-locked" style="--card-color:#ff0055; animation-delay:${draftOptions.length * 90 + 260}ms" title="Locked — build toward it">
                    <div class="card-inner">
                        <div class="card-badge">🔒 FUSION · LOCKED</div>
                        <div class="card-name">${tease.name}</div>
                        <div class="card-desc">${tease.desc}</div>
                        <div class="card-key card-req">REQUIRES ${tease.reqText}</div>
                    </div>
                </div>`);
        }
    }

    // Rare-card reveal stings, timed to the card's reveal animation.
    const rarest = draftOptions.map(upgradeRarity).find(r => r === 'fusion' || r === 'apex') || draftOptions.map(upgradeRarity).find(r => r === 'mastery');
    if (rarest) setTimeout(() => playSound(rarest === 'mastery' ? 'sting_mastery' : 'sting_fusion'), rarest === 'mastery' ? 120 : 300);

    if (HUD.screens.upgrade) HUD.screens.upgrade.style.display = 'flex';
}

window.engineTriggerUpgradeDraft = triggerUpgradeDraft;
window.enginePlayUpgradeVignette = playUpgradeVignette;

export { HUD, playSound, spawnFloatingText, showToast, triggerShockwave, doFlash, createImpact, createVacuum, createShatter, triggerTutorial, spawnTutorialEnemy, SequenceManager };

export function resetGame() {
    st.health = 100; st.combo = 0; st.instinctMeter = 0; st.isInstinct = false;
    st.currentStage = 1; st.stageSpeedMult = 1.0;
    st.wavesCleared = 0; st.waveTimer = 0;
    st.laneFlash = [0, 0, 0]; st.laneTempo = [1, 1, 1]; st.hotLane = -1; st.hazards = []; st.hazardCooldown = 90; st.purifyTimer = 0;
    // Stage 1 of a fresh run: no acute surprises at all (blueprint — "never in the
    // first stage of a run"). advanceStage() sets the real per-arc budget from Stage 2 on.
    st.hazardsThisStage = 0; st.surpriseBudget = 0;
    st.spawnTotal = st.tutorialEnabled ? 0 : 5; st.stageClearing = false; st.bossActive = false;
    st.bossIntroTimer = 0; st.tutorialDelay = 0; st.tutorialGrace = 0; st.instinctPauseTimer = 0;
    st.seenTutorials = { shield: false, slip: false, guard: false, instinct: false, counter: false, ghost_step: false, bruiser_id: false, assassin_id: false, footwork_tip: false };
    st.tutorialSlipFails = 0;
    st.orbCounts = { speed: 0, power: 0, technique: 0 }; st.stats = { speedMult: 1, powerMult: 1, techMult: 1 };

    st.exp = 0; st.expNeeded = 8; st.pendingUpgrades = 0; st.totalLevel = 0; st.bossDefeatedThisStage = false;
    st.draftHold = 0; st.firstEvolutionGranted = false;

    st.acquiredUpgradeIds = []; st.recentlyOffered = []; st.currentDraftOptions = [];
    st.overclockCounts = { vitality: 0, nerves: 0, focus: 0, instinct: 0, clinch: 0, finish: 0 };
    st.progressionMods = {
        ghostStepCooldownMult: 1, hookRecoveryMult: 1, relentlessRhythm: false, crossArmorStunBonus: 0, hookKnockbackFloor: 0, hardTargetInstinctFlat: 0, hardTargetExpFlat: 0, perfectSlipWindowBonus: 0, bossExposeBonusFrames: 0, perfectSlipHeal: 0, dempseyCircuit: false, dempseyRecoveryBonus: 0, ghostCounter: false, shatterRead: false, shatterReadBossBypass: 0, shatterReadStaggerBonus: 0, perfectSlipRewardBonusMult: 0, instinctGainBonusMult: 0, incomingRecoilMult: 1, expGainBonusMult: 0, guardRead: false, blurStep: false, executionerCross: false, flowState: false
    };

    // FIX: run stats used to carry over between runs in the same session (resetGame
    // never cleared them), silently inflating every run after the first.
    st.statMaxCombo = 0; st.statTotalSlips = 0; st.statTotalKills = 0; st.statBossKills = 0;
    st.statCounterHits = 0; st.statBossBreaks = 0; st.statRecoilTaken = 0; st.statDespDamage = 0;
    st.statGhostSteps = 0; st.statFinisherHits = 0; st.statFinishersClean = 0;

    // v16 score / wager / finisher / vignette / transition state
    st.score = 0; st.displayScore = 0; st.scorePops = [];
    st.wagerMult = 1; st.wagerOffer = null; st.currentAffix = CONSTANTS.AFFIXES[0];
    st.finisher = null; st.finisherZoom = 1; st.vignette = null;
    st.paletteFrom = 1; st.paletteTo = 1; st.paletteT = 1; st.lightSweep = -1;
    setMusicIntensity(0);

    st.lastHUD.exp = -1; st.lastHUD.mult = -1; st.lastHUD.score = -1; st.lastHUD.wager = -1;

    st.enemies = []; st.particles = []; st.floatingTexts = []; st.shockwaves = [];
    st.player = resetPlayerObj(); st.player.y = st.height * CONSTANTS.LANE_Y[st.player.lane];

    let stageElem = document.getElementById('stage-ui'); if (stageElem) { stageElem.innerText = `ARC 1: SHATTERED CATHEDRAL`; stageElem.style.color = '#22d3ee'; stageElem.classList.remove('stage-pulse'); }
    let affixElem = document.getElementById('affix-ui'); if (affixElem) affixElem.innerText = '';
    let barCont = document.getElementById('bar-cont'); if (barCont) barCont.classList.remove('beast-active');

    ['speed', 'power', 'technique'].forEach(t => { const orbUI = document.getElementById(`orb-${t}`); if (orbUI) orbUI.innerText = '0'; });
}

function hideOverlay(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

// opts.tutorial overrides the menu checkbox (used by the headless sim).
function startGame(daily = false, opts = {}) {
    if (typeof daily === 'object' && daily !== null) { opts = daily; daily = !!opts.daily; }
    st.runCount = (st.runCount || 0) + 1; initAudio();
    const toggle = document.getElementById('tutorial-toggle-cb');
    st.tutorialEnabled = opts.tutorial !== undefined ? !!opts.tutorial : (toggle ? toggle.checked === true : true);
    st.dailyMode = !!daily;
    st.dailyDateKey = daily ? todayKey() : null;
    seedRng(opts.seed !== undefined ? opts.seed : (daily ? dailySeedFromDate() : ((Math.random() * 0xffffffff) >>> 0)));
    resetGame(); st.screen = 'playing';
    ['start-screen', 'gameover-screen', 'pause-screen', 'wager-screen', 'upgrade-screen'].forEach(hideOverlay);
    duckMusic(false); startMusic();
    // Run opening: the Striker walks into the ring under the stage card. The Arc 1
    // theme line shows here once per save, then the stage tagline takes over.
    SequenceManager.playDynamic([
        { type: 'walkin', duration: 50 },
        { type: 'text', title: 'ARC 1 — SHATTERED CATHEDRAL', subtitle: openingSubtitle(), duration: 130 },
        { type: 'resume' }
    ]);
}
function startDailyChallenge() { startGame(true); }
window.startDailyChallenge = startDailyChallenge;

function toggleHowTo() {
    initAudio(); const howTo = document.getElementById('howto-screen');
    if (st.screen === 'howto') { st.screen = st.previousScreen; if(howTo) howTo.style.display = 'none'; }
    else { st.previousScreen = st.screen; st.screen = 'howto'; if(howTo) howTo.style.display = 'flex'; }
}

function returnToMenu() {
    st.dailyMode = false; st.dailyDateKey = null;
    resetGame(); st.screen = 'start';
    const startScreen = document.getElementById('start-screen'); if(startScreen) startScreen.style.display = 'flex';
    ['pause-screen', 'gameover-screen', 'wager-screen', 'upgrade-screen'].forEach(hideOverlay);
    SequenceManager.active = false; SequenceManager.waiting = false;
    stopMusic();
}

window.engineApplyUpgradeState = function(id) {
    if (st.screen !== 'upgrading') return;
    let option = st.currentDraftOptions.find(o => o.id === id);
    if(option) applyUpgrade(st, option);
};

// ==========================================
// PAUSE MENU (v16): Resume / Loadout / Settings tabs
// ==========================================
const PAUSE_TABS = ['resume', 'loadout', 'settings'];
const SETTINGS_ROWS = [
    { key: 'masterVolume', label: 'Master Volume', type: 'range' },
    { key: 'musicVolume', label: 'Music Volume', type: 'range' },
    { key: 'sfxVolume', label: 'SFX Volume', type: 'range' },
    { key: 'screenShake', label: 'Screen Shake', type: 'range' },
    { key: 'flashIntensity', label: 'Flash Intensity', type: 'range' },
    { key: 'hitStop', label: 'Hit-Stop', type: 'toggle' },
    { key: 'reducedMotion', label: 'Reduced Motion', type: 'toggle' }
];
let pauseTab = 'resume';
let settingsFocus = 0;

function openPause() {
    if (st.screen !== 'playing') return;
    st.screen = 'paused';
    duckMusic(true);
    setPauseTab('resume');
    const p = document.getElementById('pause-screen'); if (p) p.style.display = 'flex';
}
function closePause() {
    if (st.screen !== 'paused') return;
    st.screen = 'playing';
    duckMusic(false);
    const p = document.getElementById('pause-screen'); if (p) p.style.display = 'none';
}
window.engineClosePause = closePause;

function setPauseTab(tab) {
    if (!PAUSE_TABS.includes(tab)) return;
    pauseTab = tab;
    PAUSE_TABS.forEach(t => {
        const btn = document.getElementById(`ptab-${t}`), panel = document.getElementById(`ppanel-${t}`);
        if (btn) btn.classList.toggle('active', t === tab);
        if (panel) panel.style.display = t === tab ? 'block' : 'none';
    });
    if (tab === 'loadout') renderLoadout();
    if (tab === 'settings') renderSettings();
}
window.engineSetPauseTab = setPauseTab;
function cyclePauseTab(dir) {
    const i = PAUSE_TABS.indexOf(pauseTab);
    setPauseTab(PAUSE_TABS[(i + dir + PAUSE_TABS.length) % PAUSE_TABS.length]);
}

const ORB_PERKS = {
    speed: ['Faster strikes', "Missed Jabs don't snap Combo", 'Slip Cancel'],
    power: ['Heavier knockback', 'Cross gains reach', 'Bowling Collateral'],
    technique: ['More Instinct from reads', 'Perfect Slips charge 2 Counters', 'True Read on bosses']
};
const TREE_COLOR = { speed: '#22d3ee', power: '#ec4899', technique: '#facc15' };
const OC_NAMES = { vitality: 'oc_vital_surge', nerves: 'oc_quick_nerves', focus: 'oc_sharp_eye', instinct: 'oc_calm_engine', clinch: 'oc_clinch_breaker', finish: 'oc_clean_finish' };

function findUpgrade(id) {
    return [...UPGRADE_POOL.orbs, ...UPGRADE_POOL.masteries, ...UPGRADE_POOL.fusions, ...UPGRADE_POOL.overclocks].find(u => u.id === id);
}

export function renderLoadout() {
    const el = document.getElementById('loadout-body');
    if (!el) return;
    const orbRows = ['speed', 'power', 'technique'].map(tree => {
        const lvl = st.orbCounts[tree] || 0;
        const perks = ORB_PERKS[tree].map((p, i) => `<span class="perk ${i < lvl ? 'on' : ''}">${p}</span>`).join('');
        return `<div class="lo-orb"><span class="lo-orb-name" style="color:${TREE_COLOR[tree]}">${tree.toUpperCase()} ${lvl}/3</span>${perks}</div>`;
    }).join('');
    const owned = st.acquiredUpgradeIds.map(findUpgrade).filter(Boolean);
    const cards = owned.map(u => {
        const r = upgradeRarity(u);
        return `<div class="lo-card lo-${r}" style="--card-color:${upgradeColor(u)}"><div class="lo-badge">${RARITY_BADGE[r]}</div><div class="lo-name">${u.name}</div><div class="lo-desc">${u.desc}</div></div>`;
    }).join('');
    const ocs = Object.entries(st.overclockCounts).filter(([, n]) => n > 0).map(([k, n]) => {
        const u = findUpgrade(OC_NAMES[k]);
        return u ? `<div class="lo-oc"><b>${u.name}</b> ×${n} <span>${u.desc}</span></div>` : '';
    }).join('');
    const wager = st.wagerMult > 1 && st.currentAffix ? `<div class="lo-wager">ACTIVE WAGER: <b>${st.currentAffix.name}</b> ×${st.wagerMult} score — ${st.currentAffix.desc}</div>` : '';
    el.innerHTML = `
        ${wager}
        <h4 class="lo-h">Evolution Trees</h4>${orbRows}
        <h4 class="lo-h">Masteries &amp; Fusions</h4>
        ${cards || '<div class="lo-empty">None yet — Masteries unlock at tree level 2; Fusions combine two trees at level 2.</div>'}
        ${ocs ? `<h4 class="lo-h">Overclocks</h4>${ocs}` : ''}`;
}

export function renderSettings() {
    const el = document.getElementById('settings-body');
    if (!el) return;
    const s = getSettings();
    el.innerHTML = SETTINGS_ROWS.map((row, i) => {
        const focus = i === settingsFocus ? ' focused' : '';
        if (row.type === 'range') {
            const v = Math.round(s[row.key] * 100);
            return `<div class="set-row${focus}" data-i="${i}"><label>${row.label}</label><input type="range" min="0" max="100" step="5" value="${v}" oninput="window.engineSetSetting('${row.key}', this.value / 100, true)"><span class="set-val">${v}%</span></div>`;
        }
        const on = s[row.key] === true;
        return `<div class="set-row${focus}" data-i="${i}"><label>${row.label}</label><button class="set-toggle ${on ? 'on' : ''}" onclick="window.engineSetSetting('${row.key}', ${!on})">${on ? 'ON' : 'OFF'}</button></div>`;
    }).join('') + '<div class="set-hint">[↑/↓] select · [←/→] adjust · [ENTER] toggle · saved automatically</div>';
}

// `fromSlider` avoids re-rendering (and dropping focus from) a range being dragged.
window.engineSetSetting = function(key, value, fromSlider = false) {
    setSetting(key, value);
    refreshAudioLevels();
    if (fromSlider) {
        const row = SETTINGS_ROWS.findIndex(r => r.key === key);
        const val = document.querySelector(`#settings-body .set-row[data-i="${row}"] .set-val`);
        if (val) val.innerText = `${Math.round(getSettings()[key] * 100)}%`;
    } else renderSettings();
};

function adjustFocusedSetting(dir) {
    const row = SETTINGS_ROWS[settingsFocus];
    const s = getSettings();
    if (row.type === 'range') setSetting(row.key, Math.round((s[row.key] + dir * 0.05) * 100) / 100);
    else setSetting(row.key, !s[row.key]);
    refreshAudioLevels();
    renderSettings();
}

function pauseKey(code) {
    if (code === 'KeyQ') { cyclePauseTab(-1); return; }
    if (code === 'KeyE' || code === 'Tab') { cyclePauseTab(1); return; }
    if (pauseTab === 'settings') {
        if (code === 'ArrowUp') { settingsFocus = (settingsFocus - 1 + SETTINGS_ROWS.length) % SETTINGS_ROWS.length; renderSettings(); }
        else if (code === 'ArrowDown') { settingsFocus = (settingsFocus + 1) % SETTINGS_ROWS.length; renderSettings(); }
        else if (code === 'ArrowLeft') adjustFocusedSetting(-1);
        else if (code === 'ArrowRight') adjustFocusedSetting(1);
        else if (code === 'Enter' || code === 'Space') { if (SETTINGS_ROWS[settingsFocus].type === 'toggle') adjustFocusedSetting(1); }
        return;
    }
    if (pauseTab === 'resume' && (code === 'Enter' || code === 'Space')) closePause();
}

// ==========================================
// STAGE WAGER UI (v16)
// ==========================================
function showWager() {
    const offer = st.wagerOffer;
    if (!offer) { SequenceManager.resumeFromWait(); return; }
    st.screen = 'wager';
    playSound('wager');
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    set('wager-name', offer.name);
    set('wager-desc', offer.desc);
    set('wager-mult', `×${offer.scoreMult} SCORE THIS STAGE`);
    const w = document.getElementById('wager-screen'); if (w) w.style.display = 'flex';
}
window.engineShowWager = showWager;

function resolveWager(accept) {
    if (st.screen !== 'wager') return;
    const w = document.getElementById('wager-screen'); if (w) w.style.display = 'none';
    st.screen = 'playing';
    if (accept) {
        const a = acceptWager();
        playSound('perfect_slip');
        if (a) SequenceManager.injectNext([{ type: 'text', title: `WAGER ACCEPTED ×${a.scoreMult}`, subtitle: a.name, duration: 80 }]);
    } else {
        declineWager();
    }
    refreshStageHud();
    SequenceManager.resumeFromWait();
}
window.engineResolveWager = resolveWager;

function pollGamepad() {
    let gamepads = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null;
    for (let i = 0; i < gamepads.length; i++) { if (gamepads[i] && gamepads[i].connected) { gp = gamepads[i]; break; } }
    if (gp) {
        let p = (btn) => gp.buttons[btn] && gp.buttons[btn].pressed; let jp = (btn) => p(btn) && !st.lastGamepadState.buttons[btn];
        let aU = gp.axes[1] < -0.5 || gp.axes[3] < -0.5, aD = gp.axes[1] > 0.5 || gp.axes[3] > 0.5;
        st.pad.up = jp(12) || (aU && !st.lastGamepadState.axes[0]); st.pad.down = jp(13) || (aD && !st.lastGamepadState.axes[1]);
        st.pad.left = jp(14) || jp(6); st.pad.guard = p(4) || p(5) || p(7); st.pad.jab = jp(2); st.pad.cross = jp(3); st.pad.hook = jp(1); st.pad.instinct = jp(0); st.pad.pause = jp(9) || jp(16);
        const anyPress = gp.buttons.some((b, i) => jp(i));

        if (st.screen === 'start') { if (st.pad.instinct || st.pad.pause || st.pad.jab) startGame(); }
        else if (st.screen === 'playing') { if (st.pad.pause && !SequenceManager.active && !st.finisher) openPause(); }
        else if (st.screen === 'paused') {
            if (st.pad.pause) closePause();
            else if (jp(4)) cyclePauseTab(-1);
            else if (jp(5)) cyclePauseTab(1);
            else if (st.pad.up) pauseKey('ArrowUp');
            else if (st.pad.down) pauseKey('ArrowDown');
            else if (jp(14)) pauseKey('ArrowLeft');
            else if (jp(15)) pauseKey('ArrowRight');
            else if (st.pad.instinct) pauseKey('Enter');
            else if (st.pad.hook) returnToMenu();
        }
        else if (st.screen === 'tutorial') { if (st.pad.instinct || st.pad.jab || st.pad.cross) dismissTutorial(); }
        else if (st.screen === 'vignette') { if (anyPress) skipVignette(); }
        else if (st.screen === 'wager') {
            if (st.pad.jab || st.pad.instinct) resolveWager(true);
            else if (st.pad.hook) resolveWager(false);
        }
        else if (st.screen === 'upgrading') {
            if (st.pad.jab && st.currentDraftOptions[0]) applyUpgrade(st, st.currentDraftOptions[0]);
            else if (st.pad.cross && st.currentDraftOptions[1]) applyUpgrade(st, st.currentDraftOptions[1]);
            else if (st.pad.hook && st.currentDraftOptions[2]) applyUpgrade(st, st.currentDraftOptions[2]);
        }
        else if (st.screen === 'gameover') {
            if (st.pad.instinct || st.pad.jab) startGame();
            if (st.pad.hook || st.pad.cross) returnToMenu();
        }

        for(let i=0; i<gp.buttons.length; i++) st.lastGamepadState.buttons[i] = p(i);
        st.lastGamepadState.axes[0] = aU; st.lastGamepadState.axes[1] = aD;
    }
}

window.startGame = window.engineStartGame = startGame; window.toggleHowTo = window.engineToggleHowTo = toggleHowTo;
window.dismissTutorial = window.engineDismissTutorial = dismissTutorial; window.returnToMenu = window.engineReturnToMenu = returnToMenu;

window.addEventListener('keydown', e => {
    st.keys[e.code] = true;
    // Records/leaderboard is a modal opened from the menu — close it (and swallow
    // other keys) rather than letting a stray keypress start a run underneath it.
    if (st.screen === 'records') { if (e.code === 'Escape' || e.code === 'KeyH' || e.code === 'Enter') toggleRecords(); return; }
    // FIXED: Keyboard 'A' now starts the game as indicated by menu text
    if (st.screen === 'start' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyA')) { startGame(); return; }
    if (st.screen === 'vignette') { if (!e.repeat) skipVignette(); return; }
    if (st.screen === 'wager') {
        if (e.code === 'Digit1' || e.code === 'KeyA' || e.code === 'Enter') resolveWager(true);
        else if (e.code === 'Digit2' || e.code === 'KeyD' || e.code === 'Escape') resolveWager(false);
        return;
    }
    if (e.code === 'KeyP' || (e.code === 'Escape' && st.screen !== 'howto' && st.screen !== 'tutorial')) {
        if (st.screen === 'playing' && !st.finisher) openPause();
        else if (st.screen === 'paused') closePause();
        return;
    }
    if (st.screen === 'paused' && e.code !== 'KeyH' && e.code !== 'KeyM') { if (e.code === 'Tab') e.preventDefault && e.preventDefault(); pauseKey(e.code); return; }
    if (e.code === 'KeyM') { toggleAudio(); return; }
    if (e.code === 'KeyH') { toggleHowTo(); return; }
    if (st.screen === 'tutorial' && (e.code === 'Enter' || e.code === 'Space')) { dismissTutorial(); return; }

    if (st.screen === 'upgrading') {
        if (e.repeat) return;
        if (e.code === 'Digit1' && st.currentDraftOptions[0]) applyUpgrade(st, st.currentDraftOptions[0]);
        else if (e.code === 'Digit2' && st.currentDraftOptions[1]) applyUpgrade(st, st.currentDraftOptions[1]);
        else if (e.code === 'Digit3' && st.currentDraftOptions[2]) applyUpgrade(st, st.currentDraftOptions[2]);
        return;
    }
    if (st.screen === 'gameover' && e.code === 'KeyR') { startGame(); return; }
});
window.addEventListener('keyup', e => { st.keys[e.code] = false; });
window.addEventListener('pointerdown', () => { if (st.screen === 'vignette') skipVignette(); });

// v16 PACING: the first Evolution is guaranteed early — at the end of the Stage 1
// tutorial, or after the first three kills with the tutorial off (~20-30s in).
function tutorialRunning() {
    return st.currentStage === 1 && st.tutorialEnabled && (st.spawnTotal < 5 || st.enemies.some(e => e.tutorialType));
}
function maybeGrantFirstEvolution() {
    if (st.firstEvolutionGranted) return;
    if (st.totalLevel > 0 || st.pendingUpgrades > 0) { st.firstEvolutionGranted = true; return; }
    if (st.currentStage !== 1 || st.enemies.length > 0) return;
    const ready = st.tutorialEnabled ? (st.spawnTotal >= 5 && !tutorialRunning()) : st.statTotalKills >= 3;
    if (ready) { st.firstEvolutionGranted = true; st.exp = Math.max(st.exp, st.expNeeded); }
}

const DRAFT_HOLD_FRAMES = 20;

export function update() {
    if (st.screen !== 'playing') return;

    // v16 FINISHER: the whole exchange drops into slow-mo — only the finisher,
    // particles (at half rate, frozen on impact) and the HUD advance.
    if (st.finisher) {
        if (st.shake > 0) st.shake *= 0.9;
        const f = st.finisher;
        if (f.freeze <= 0 && f.frame % 2 === 0) updateParticlesAndTrails();
        updateFinisher();
        if (typeof updateHUD === 'function') updateHUD();
        return;
    }

    if (st.hitstop > 0) {
        if (!hitStopEnabled()) st.hitstop = 0;
        else { st.hitstop--; return; }
    }
    if (st.shake > 0) st.shake *= 0.88;

    updateAtmosphere();
    updateParticlesAndTrails();
    if (SequenceManager.active) {
        SequenceManager.update();
        if (typeof updateHUD === 'function') updateHUD();
        return;
    }

    if (st.tutorialGrace > 0) st.tutorialGrace--;
    if (st.tutorialDelay > 0) st.tutorialDelay--;
    if (st.bossIntroTimer > 0) st.bossIntroTimer--;
    if (st.instinctPauseTimer > 0) {
        st.instinctPauseTimer--;
    } else if (st.isInstinct) {
        st.instinctMeter -= 0.25;
        if (st.instinctMeter <= 0) {
            st.isInstinct = false;
            let barCont = document.getElementById('bar-cont');
            if (barCont) barCont.classList.remove('beast-active');
        }
    }

    let banner = document.getElementById('instinct-ready-banner');
    if(st.instinctMeter >= 100 && !st.isInstinct) {
        if(!st.seenTutorials.instinct) {
            triggerTutorial('instinct','INSTINCT MAXED','Your meter is full!<br><br>Instinct is gained by landing consecutive hits and executing Perfect Slips.<br><br>Press <span class="text-cyan-400 font-bold">[SPACE] / [A]</span> to unleash double knockback and massive hitstop.');
            return;
        } else if (banner) banner.style.display = 'block';
    } else if (banner) banner.style.display = 'none';

    updatePlayer(); updateEnemies(); if (typeof updateBosses === 'function') updateBosses();
    if (st.finisher) { if (typeof updateHUD === 'function') updateHUD(); return; } // a stagger just began
    // LANE HAZARDS: schedule + resolve environmental lane-strikes (Arc 4-5 surprise).
    maybeScheduleHazard(); updateHazards();

    maybeGrantFirstEvolution();
    // Level-ups are evaluated every tick so EXP from any source converts immediately.
    while (st.exp >= st.expNeeded) {
        st.exp -= st.expNeeded;
        st.totalLevel++;
        st.expNeeded = Math.floor(8 * Math.pow(1.12, st.totalLevel));
        st.pendingUpgrades++;
        showToast("EVOLUTION CHARGED!", "#00ffff");
        playSound('perfect_slip');
    }

    if (st.stageClearing && st.enemies.length === 0 && !st.bossActive && st.screen === 'playing' && st.purifyTimer <= 0) {
        if (CONSTANTS.isBossStage(st.currentStage) && !st.bossDefeatedThisStage) {
            if (typeof spawnBoss === 'function') spawnBoss();
        } else {
            advanceStage();
            if (typeof updateHUD === 'function') updateHUD();
            return;
        }
    }

    if (st.health <= 0) { endRun(); return; }

    st.health = Math.round(st.health);
    if (typeof updateHUD === 'function') updateHUD();
    // Footwork has no dummy gate, and a toast here turned out to be too easy to
    // miss entirely during real play — a full modal, same as every other Stage 1
    // lesson, guarantees it's actually seen rather than optimistically glimpsed.
    if (!st.seenTutorials.footwork_tip && st.currentStage === 1 && st.enemies.length === 0 &&
        (!st.tutorialEnabled || st.spawnTotal >= 5)) {
        triggerTutorial('footwork_tip', 'FOOTWORK', 'You are not locked to one spot.<br><br>Hold <span class="text-cyan-400 font-bold">[RIGHT]</span> to press forward &mdash; you reach enemies sooner and can interrupt a windup before it becomes a threat, but more of them converge on you at once.<br><br>Hold <span class="text-cyan-400 font-bold">[LEFT]</span> past the initial Ghost Step burst to give ground &mdash; buys you time, at the cost of tempo.<br><br><i>Let go of both and you drift back to a neutral stance on your own.</i>');
        return;
    }

    // v16: an earned Evolution drafts as soon as the field is clear (after a short
    // beat so the last kill lands), and spawns wait for it (see waves.js).
    if (st.pendingUpgrades > 0 && st.enemies.length === 0 && !st.bossActive && !st.stageClearing &&
        st.bossIntroTimer <= 0 && !tutorialRunning()) {
        if (++st.draftHold >= DRAFT_HOLD_FRAMES) { triggerUpgradeDraft(); return; }
    } else st.draftHold = 0;

    spawnEnemy();
}

// ==========================================
// RESULTS (v16): live score, letter rank, PB delta. No "____ ROUTE" line.
// ==========================================
function endRun() {
    st.screen = 'gameover';
    stopMusic();
    if (HUD.finalStage) HUD.finalStage.innerText = `STAGE REACHED: ${st.currentStage}`;
    const runMode = document.getElementById('run-mode-ui');
    if (runMode) runMode.innerText = st.dailyMode ? `DAILY CHALLENGE · ${st.dailyDateKey}` : '';

    const score = Math.max(0, Math.round(st.score || 0));
    const grade = rankForRun({ score, slips: st.statTotalSlips, bossKills: st.statBossKills });
    const prev = st.dailyMode ? loadDailyBest() : loadBest();
    const delta = pbDeltaText(score, prev ? prev.score : null);

    const statGrade = document.getElementById('stat-grade');
    if (statGrade) {
        statGrade.innerText = grade;
        statGrade.className = `rank-letter rank-${grade}`;
    }
    const pb = document.getElementById('pb-delta');
    if (pb) { pb.innerText = (st.dailyMode ? 'DAILY: ' : '') + delta.text; pb.className = `pb-delta pb-${delta.kind}`; }

    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    setText('stat-combo', st.statMaxCombo);
    setText('stat-slips', st.statTotalSlips);
    setText('stat-ghosts', st.statGhostSteps || 0);
    setText('stat-kills', st.statTotalKills);
    setText('stat-bosses', st.statBossKills);
    setText('stat-finishers', `${st.statFinishersClean || 0} clean · ${st.statFinisherHits || 0} hits`);
    setText('stat-build', `FINAL BUILD: SPD ${st.orbCounts.speed} | PWR ${st.orbCounts.power} | TEC ${st.orbCounts.technique}`);
    setText('stat-score', score.toLocaleString());

    const runResult = commitRun(score, grade, st.currentStage);

    // RETENTION: commit to the local leaderboard + lifetime stats and grant any
    // grade-keyed cosmetics this run earned. The per-run boss streak is simply
    // the number of bosses cleared in a row this run (a loss ends the run).
    const rec = commitRunRecord({ score, grade, stage: st.currentStage, daily: st.dailyMode, bossKills: st.statBossKills });

    // ONLINE: submit to the global leaderboard, fire-and-forget. Gated twice —
    // (1) the player must have opted in (default OFF; nothing is uploaded until
    // they say so), and (2) the run must clear a quality floor, so stage-1 deaths
    // and 0-score quits stay local instead of spamming the global board.
    // Offline / paused backend still degrades silently to local-only.
    const submittable = { name: getAlias(), score, grade, stage: st.currentStage, daily: st.dailyMode, dateKey: st.dailyDateKey };
    if (getOnlineOptIn() && isSubmittableRun(submittable)) submitScore(submittable);
    const scStreak = document.getElementById('stat-streak');
    if (scStreak) scStreak.innerText = `${st.statBossKills}${rec.bestBossStreak > st.statBossKills ? ` (best ${rec.bestBossStreak})` : ''}`;
    const rankLine = document.getElementById('run-rank-ui');
    if (rankLine) rankLine.innerText = rec.rank > 0 ? `LEADERBOARD #${rec.rank}` : '';
    if (rec.newUnlocks && rec.newUnlocks.length) {
        rec.newUnlocks.filter(id => id !== 'cyan').forEach(id => {
            const skin = STRIKER_SKINS.find(s => s.id === id);
            if (skin) showToast(`STRIKER UNLOCKED: ${skin.name.toUpperCase()}`, skin.color);
        });
    }

    const nb = document.getElementById('new-best');
    if (nb) {
        if (st.dailyMode) { nb.innerText = 'NEW DAILY BEST'; nb.style.display = runResult.isDailyBest ? 'block' : 'none'; }
        else { nb.innerText = 'NEW PERSONAL BEST'; nb.style.display = runResult.isBest ? 'block' : 'none'; }
    }

    if (HUD.screens.gameover) HUD.screens.gameover.style.display = 'flex';
}

// ==========================================
// RELEASE LAYER: persistence, audio toggle, viewport fit
// ==========================================
const SAVE_KEY = 'neon_strike_best_v1';
const DAILY_KEY = 'neon_strike_daily_v1';

function loadDailyBest() {
    try {
        const raw = localStorage.getItem(DAILY_KEY);
        if (!raw) return null;
        const d = JSON.parse(raw);
        return (d && d.dateKey === todayKey()) ? d : null; // yesterday's daily doesn't count today
    } catch (e) { return null; }
}

function saveDailyBest(entry) {
    try { localStorage.setItem(DAILY_KEY, JSON.stringify(entry)); } catch (e) {}
}

export function loadBest() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const b = JSON.parse(raw);
        return (b && typeof b.score === 'number') ? b : null;
    } catch (e) { return null; }
}

function saveBest(best) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(best)); } catch (e) {}
}

function renderBest() {
    const el = document.getElementById('best-run');
    if (el) {
        const b = loadBest();
        el.innerHTML = b
            ? `BEST RUN<br><b>${b.grade}</b> &middot; STAGE ${b.stage} &middot; ${b.score.toLocaleString()} PTS`
            : `BEST RUN<br><b>—</b> NO RECORD YET`;
    }
    const daily = document.getElementById('daily-sub');
    if (daily) {
        const d = loadDailyBest();
        daily.innerText = d
            ? `Today's best: ${d.grade} · ${d.score.toLocaleString()} pts`
            : `Same seed for everyone, today only`;
    }
}

function commitRun(score, grade, stage) {
    const prev = loadBest();
    const isBest = !prev || score > prev.score;
    if (isBest) saveBest({ score, grade, stage, at: Date.now() });

    let isDailyBest = false;
    if (st.dailyMode) {
        const prevDaily = loadDailyBest();
        isDailyBest = !prevDaily || score > prevDaily.score;
        if (isDailyBest) saveDailyBest({ score, grade, stage, dateKey: st.dailyDateKey, at: Date.now() });
    }
    renderBest();
    return { isBest, isDailyBest };
}

// RETENTION: the records/leaderboard/cosmetics screen.
function applyStrikerColor() { st.strikerColor = selectedStrikerColor(); }

function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Render one online board into a container. Names come from a shared server, so
// they are always HTML-escaped. Handles the loading / offline / empty states.
function renderGlobalBoard(elId, rowsPromise, emptyMsg) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = '<div class="opacity-60 text-xs py-2">Loading…</div>';
    rowsPromise.then(rows => {
        if (rows === null) { el.innerHTML = '<div class="opacity-60 text-xs py-2">Offline — global board unavailable.</div>'; return; }
        if (!rows.length) { el.innerHTML = `<div class="opacity-60 text-xs py-2">${emptyMsg}</div>`; return; }
        el.innerHTML = rows.map((e, i) => {
            const gc = e.grade === 'S' ? '#facc15' : e.grade === 'A' ? '#ec4899' : e.grade === 'B' ? '#22d3ee' : '#9ca3af';
            return `<div class="rec-row"><span class="rec-rank">${i + 1}</span><span class="rec-grade" style="color:${gc}">${e.grade}</span><span class="rec-name">${escapeHTML(e.name)}</span><span class="rec-score">${(e.score || 0).toLocaleString()}</span></div>`;
        }).join('');
    });
}

function renderRecords() {
    const lb = loadLeaderboard();
    const meta = loadMeta();

    const aliasInput = document.getElementById('alias-input');
    if (aliasInput) aliasInput.value = meta.alias;

    const optIn = document.getElementById('online-optin');
    if (optIn) optIn.checked = meta.onlineOptIn;

    // Global boards (async): all-time + today's daily seed.
    renderGlobalBoard('global-alltime', onlineEnabled() ? fetchTopAllTime(10) : Promise.resolve(null), 'No global runs yet. Be the first.');
    renderGlobalBoard('global-daily', onlineEnabled() ? fetchTopDaily(todayKey(), 10) : Promise.resolve(null), 'No daily runs yet today.');

    const list = document.getElementById('records-list');
    if (list) {
        if (!lb.length) {
            list.innerHTML = '<div class="opacity-60 text-sm py-4">No runs recorded yet.<br>Play a gauntlet to set the pace.</div>';
        } else {
            list.innerHTML = lb.map((e, i) => {
                const gc = e.grade === 'S' ? '#facc15' : e.grade === 'A' ? '#ec4899' : e.grade === 'B' ? '#22d3ee' : '#9ca3af';
                const tag = e.daily ? ' · DAILY' : '';
                return `<div class="rec-row"><span class="rec-rank">${i + 1}</span><span class="rec-grade" style="color:${gc}">${e.grade}</span><span class="rec-score">${e.score.toLocaleString()}</span><span class="rec-stage">St. ${e.stage}${tag}</span></div>`;
            }).join('');
        }
    }

    const stats = document.getElementById('records-stats');
    if (stats) {
        const best = lb.length ? lb[0].score.toLocaleString() : '—';
        stats.innerHTML = `RUNS <b>${meta.totalRuns}</b> &nbsp;·&nbsp; BEST SCORE <b>${best}</b> &nbsp;·&nbsp; BEST BOSS STREAK <b>${meta.bestBossStreak}</b>`;
    }

    const picker = document.getElementById('striker-picker');
    if (picker) {
        picker.innerHTML = STRIKER_SKINS.map(s => {
            const unlocked = meta.unlocked.includes(s.id);
            const selected = meta.selectedSkin === s.id;
            const cls = `striker-swatch${selected ? ' selected' : ''}${unlocked ? '' : ' locked'}`;
            const click = unlocked ? `onclick="selectStriker('${s.id}')"` : '';
            const label = unlocked ? s.name : `🔒 ${s.hint}`;
            return `<div class="${cls}" ${click}><span class="sw-dot" style="background:${s.color};box-shadow:0 0 10px ${s.color}"></span><span class="sw-name">${label}</span></div>`;
        }).join('');
    }
}

function toggleRecords() {
    initAudio();
    const rs = document.getElementById('records-screen');
    if (st.screen === 'records') {
        st.screen = st.previousScreen === 'records' ? 'start' : st.previousScreen;
        if (rs) rs.style.display = 'none';
    } else {
        st.previousScreen = st.screen === 'records' ? 'start' : st.screen;
        renderRecords();
        st.screen = 'records';
        if (rs) rs.style.display = 'flex';
    }
}
window.toggleRecords = toggleRecords;
window.selectStriker = function (id) { selectSkin(id); applyStrikerColor(); renderRecords(); };
window.setAlias = function (name) { const el = document.getElementById('alias-input'); const clean = setAlias(name); if (el) el.value = clean; };
window.setOnlineOptIn = function (on) { setOnlineOptIn(on); renderRecords(); };

function toggleAudio() {
    st.audioMuted = !st.audioMuted;
    st.audioEnabled = !st.audioMuted && !!st.audioCtx;
    refreshAudioLevels();
    const el = document.getElementById('audio-state');
    if (el) el.innerText = `[M] AUDIO: ${st.audioMuted ? 'OFF' : 'ON'}`;
}
window.toggleAudio = toggleAudio;

function fitViewport() {
    const shell = document.getElementById('game-container');
    if (!shell) return;
    const scale = Math.min(window.innerWidth / st.width, window.innerHeight / st.height);
    shell.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', fitViewport);

// Cinematic moments (upgrade vignette, boss Finisher) dim the DOM HUD that sits
// above the canvas, so the moment owns the frame. Toggled only on change.
let lastCine = '';
function syncCinematicClass() {
    const mode = st.screen === 'vignette' ? 'vignette' : (st.finisher ? 'finisher' : '');
    if (mode === lastCine) return;
    lastCine = mode;
    try {
        const b = document.body;
        b.classList.toggle('cine-vignette', mode === 'vignette');
        b.classList.toggle('cine-finisher', mode === 'finisher');
    } catch (e) {}
}

function loop() {
    pollGamepad();
    syncCinematicClass();
    if (st.screen === 'vignette') updateVignette();
    update(); draw();
    st.lastKeys = { ...st.keys };
    requestAnimationFrame(loop);
}
function init() { st.width = 1000; st.height = 600; if(canvas) { canvas.width = st.width; canvas.height = st.height; } applySettingsSideEffects(); resetGame(); initAtmosphere(); fitViewport(); renderBest(); applyStrikerColor(); loop(); }
init();

// Test hooks for the headless harness / bot sim (tests/*.mjs). Not used in play.
export const __test = { startGame, resetGame, update, triggerUpgradeDraft, resolveWager, openPause, closePause, setPauseTab, renderLoadout, renderSettings, endRun };

// Dev/playtest hook: open the game with ?debug in the URL to get window.__ns —
// state access plus a stage jump (e.g. __ns.jump(5) = Arc 1 boss). Off otherwise.
try {
    if (typeof location !== 'undefined' && /[?&]debug\b/.test(location.search)) {
        window.__ns = {
            st, CONSTANTS, SequenceManager,
            jump(stage) { st.enemies = []; st.currentStage = Math.max(1, stage - 1); st.stageClearing = false; st.bossActive = false; advanceStage(); },
            draft(n = 1) { st.pendingUpgrades += n; triggerUpgradeDraft(); },
            // Advance the real frame loop n times synchronously (works even when the
            // tab is hidden and requestAnimationFrame is paused).
            step(n = 1) { for (let i = 0; i < n; i++) { pollGamepad(); syncCinematicClass(); if (st.screen === 'vignette') updateVignette(); update(); st.lastKeys = { ...st.keys }; } draw(); }
        };
    }
} catch (e) {}
