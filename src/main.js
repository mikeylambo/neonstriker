import { gameState as st } from './state.js';
import { CONSTANTS } from './constants.js';
import { updateHUD, HUD } from './ui/ui.js';
import { initAudio, playSound, startMusic, stopMusic, duckMusic, refreshAudioLevels, setMusicIntensity } from './vfx_audio/audio.js';
import { updateParticlesAndTrails, spawnFloatingText, showToast, triggerShockwave, doFlash, createImpact, createVacuum, createShatter } from './vfx_audio/effects.js';
import { SequenceManager } from './systems/sequences.js';
import { applyUpgrade, advanceStage, refreshStageHud, openingSubtitle, roundCard } from './systems/progression/apply.js';

// FIXED: Corrected path and filename to match the architectural rename (draft.js)
import { buildDraft } from './systems/progression/draft.js';
import { fusionHint } from './systems/progression/requirements.js';
import { setInputDevice, inputDevice, padFamily, glyph, glyphHTML, glyphText } from './systems/input_device.js';

import { UPGRADE_POOL } from './data/upgrades.js';
import { dismissTutorial, triggerTutorial, spawnTutorialEnemy } from './systems/tutorial.js';
import { resetPlayerObj, updatePlayer } from './entities/player.js';
import { updateEnemies } from './entities/enemies.js';
import { spawnEnemy } from './systems/waves.js';
import { spawnBoss, updateBosses } from './entities/bosses.js';
import { maybeScheduleHazard, updateHazards, clearHazards } from './systems/hazards.js';
import { seedRng, dailySeedFromDate, todayKey } from './systems/rng.js';
import { practiceUnlocked, heatUnlocked } from './systems/records.js';
import { commitRunRecord, loadLeaderboard, loadMeta, selectSkin, selectedStrikerColor, STRIKER_SKINS, getAlias, setAlias, getOnlineOptIn, setOnlineOptIn, isSubmittableRun } from './systems/records.js';
import { submitScore, fetchTopAllTime, fetchTopDaily, onlineEnabled } from './systems/online.js';
import { initAtmosphere, updateAtmosphere } from './render/atmosphere.js';
import { draw } from './render/draw.js';
import { getSettings, setSetting, hitStopEnabled, applySettingsSideEffects, keyName, getBinds, keyLabel, rebind, resetBinds, BIND_LABELS, DEFAULT_BINDS } from './systems/settings.js';
import { rankForRun, pbDeltaText, comboMultiplier } from './systems/score.js';
import { acceptWager, declineWager } from './systems/wagers.js';
import { updateFinisher } from './systems/finisher.js';
import { practiceTargets, practiceTargetUnlocked, beginPractice, updatePractice, practiceHudText } from './systems/practice.js';
import { loadHeat, toggleHeat, heatMultFor, heatLevel } from './systems/heat.js';
import { captureRecap, resetRecap, startRecapPlayback, recapPlaying, stopRecap, updateRecap, tipFor, topDamage } from './systems/recap.js';
import { arcParStart, arcParTick, loadMedals, MEDALS, ARC_PAR, fmtSecs, fmtK } from './systems/arc_par.js';
import { tmStartRun, tmTick, tmEndRun, liveRun, fmtTime, loadTelemetry, summarizeTelemetry, exportTelemetryJSON } from './systems/telemetry.js';
import { startKnockdown, updateKnockdown, canBeKnockedDown } from './systems/knockdown.js';
import { playUpgradeVignette, updateVignette, skipVignette, upgradeRarity, upgradeColor, evolutionLabel } from './systems/vignette.js';

export const $ = function(id) { return document.getElementById(id); };
export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;

// ==========================================
// DRAFT SCREEN (v16 rarity visuals + Arc 1 fusion tease)
// ==========================================
const evolutionBadge = (option, rarity) => evolutionLabel(option, rarity);

function escapeAttr(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// v18 DRAFT FOCUS: pads pick with D-pad/stick + confirm (× / A), which works the
// same on every controller; keyboard keeps 1/2/3 and gets ←/→ + Enter too. A
// short grace stops a mid-combat button mash from instantly taking a card.
const DRAFT_GRACE_FRAMES = 20;
function renderDraftFocus() {
    const cards = document.querySelectorAll ? document.querySelectorAll('#draft-container .draft-card') : [];
    cards.forEach((c, i) => c.classList.toggle('focused', i === st.draftFocus));
    const hint = document.getElementById('upgrade-hint');
    if (hint) {
        const dev = inputDevice();
        hint.innerHTML = dev === 'keyboard'
            ? `${glyphHTML('left')}${glyphHTML('right')} CHOOSE &nbsp;·&nbsp; <span class="glyph">1</span><span class="glyph">2</span><span class="glyph">3</span> OR ${glyphHTML('confirm')} TAKE IT`
            : `${glyphHTML('left')}${glyphHTML('right')} CHOOSE &nbsp;·&nbsp; ${glyphHTML('confirm')} TAKE IT`;
    }
}
function moveDraftFocus(dir) {
    const n = st.currentDraftOptions.length;
    if (!n) return;
    st.draftFocus = ((st.draftFocus || 0) + dir + n) % n;
    playSound('slip');
    renderDraftFocus();
}
function confirmDraftFocus() {
    if (st.uiFrame - (st.draftOpenedAt || 0) < DRAFT_GRACE_FRAMES) return;
    const opt = st.currentDraftOptions[st.draftFocus || 0];
    if (opt) applyUpgrade(st, opt);
}
window.engineFocusDraft = function (i) { st.draftFocus = i; renderDraftFocus(); };

export function triggerUpgradeDraft() {
    st.screen = 'upgrading';
    st.draftHold = 0;
    st.draftOpenedAt = st.uiFrame || 0;
    st.draftFocus = 0;
    // A run of back-to-back evolutions is one "chain": numbered, then celebrated together.
    if (!st.evoChain || !st.evoChain.active) st.evoChain = { active: true, total: st.pendingUpgrades, picks: [] };
    const title = document.getElementById('upgrade-title');
    if (title) {
        const idx = st.evoChain.picks.length + 1, total = Math.max(st.evoChain.total, idx);
        title.innerText = total > 1 ? `EVOLUTION ${idx} OF ${total}` : 'EVOLUTION';
        title.style.color = total > 1 ? '#ff4fd8' : '#ffffff';
    }
    const sub = document.getElementById('upgrade-sub');
    if (sub) sub.innerText = 'CHOOSE ONE';

    let draftOptions = buildDraft(st, UPGRADE_POOL);
    const container = document.getElementById('draft-container');

    if (container) {
        container.innerHTML = '';
        draftOptions.forEach((option, index) => {
            const rarity = upgradeRarity(option);
            const color = upgradeColor(option);
            // v20: tell the player which Fusion this pick builds toward.
            const fh = fusionHint(option, st, UPGRADE_POOL);
            const fusionLine = fh ? `<div class="card-fusion">${fh.missing === 0 ? `UNLOCKS ${fh.evolved ? 'PERFECTED FUSION' : 'FUSION'}` : `${fh.missing} MORE →`} <b>${fh.name.toUpperCase()}</b></div>` : '';
            const btnHTML = `
                <div class="draft-card card-${rarity}" style="--card-color:${color}; animation-delay:${index * 90 + (rarity === 'fusion' || rarity === 'evolved' || rarity === 'apex' ? 220 : 0)}ms" onmouseenter="window.engineFocusDraft(${index})" onclick="window.engineApplyUpgradeState('${escapeAttr(option.id)}')">
                    <div class="card-inner">
                        <div class="card-badge">${evolutionBadge(option, rarity)}</div>
                        <div class="card-name">${option.name}</div>
                        <div class="card-desc">${option.desc}</div>
                        ${fusionLine}
                        <div class="card-key">${inputDevice() === 'keyboard' ? `<span class="glyph">${index + 1}</span>` : ''}</div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', btnHTML);
        });
    }
    renderDraftFocus();

    // Rare-card reveal stings, timed to the card's reveal animation.
    const rs = draftOptions.map(upgradeRarity);
    const rarest = rs.find(r => r === 'evolved' || r === 'fusion' || r === 'apex') || rs.find(r => r === 'verb' || r === 'mastery');
    if (rarest) setTimeout(() => playSound(rarest === 'verb' || rarest === 'mastery' ? 'sting_mastery' : 'sting_fusion'), rarest === 'verb' || rarest === 'mastery' ? 120 : 300);

    if (HUD.screens.upgrade) HUD.screens.upgrade.style.display = 'flex';
}

window.engineTriggerUpgradeDraft = triggerUpgradeDraft;window.engineTriggerUpgradeDraft = triggerUpgradeDraft;
window.enginePlayUpgradeVignette = playUpgradeVignette;

export { HUD, playSound, spawnFloatingText, showToast, triggerShockwave, doFlash, createImpact, createVacuum, createShatter, triggerTutorial, spawnTutorialEnemy, SequenceManager };

export function resetGame() {
    st.practice = null; st.heat = []; st.hpCeil = undefined; // v20
    st.health = 100; st.combo = 0; st.instinctMeter = 0; st.isInstinct = false;
    st.currentStage = 1; st.stageSpeedMult = 1.0;
    st.wavesCleared = 0; st.waveTimer = 0;
    st.laneFlash = [0, 0, 0]; st.laneTempo = [1, 1, 1]; st.hotLane = -1; st.hazards = []; st.hazardCooldown = 90; st.purifyTimer = 0;
    // Stage 1 of a fresh run: no acute surprises at all (blueprint — "never in the
    // first stage of a run"). advanceStage() sets the real per-arc budget from Stage 2 on.
    st.hazardsThisStage = 0; st.surpriseBudget = 0;
    st.spawnTotal = st.tutorialEnabled ? 0 : 5; st.stageClearing = false; st.bossActive = false;
    st.bossIntroTimer = 0; st.tutorialDelay = 0; st.tutorialGrace = 0; st.instinctPauseTimer = 0;
    st.seenTutorials = { shield: false, slip: false, guard: false, instinct: false, counter: false, ghost_step: false, bruiser_id: false, assassin_id: false, string_id: false, footwork_tip: false };
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
    st.stageHitsTaken = 0; st.statFlawless = 0;
    st.knockdown = null; st.knockdownsThisArc = 0; st.statKnockdowns = 0; st.zoneTimer = 0; st.bossPoster = null; st.enemyEchoes = [];
    st.afterimages = []; st.koFx = []; st.rankOrder = []; st.orbPulse = 0;
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
    const runSeed = opts.seed !== undefined ? opts.seed : (daily ? dailySeedFromDate() : ((Math.random() * 0xffffffff) >>> 0));
    seedRng(runSeed);
    resetGame(); st.screen = 'playing';
    // v20: Practice (no telemetry / score) and Heat (normal runs only, once unlocked).
    if (opts.practice) { beginPractice(opts.practice, opts.windows); st.tutorialEnabled = false; }
    else {
        st.heat = (!daily && heatUnlocked()) ? loadHeat() : [];
        tmStartRun({ seed: runSeed, daily: !!daily });
    }
    resetRecap();
    arcParStart();
    ['start-screen', 'gameover-screen', 'pause-screen', 'wager-screen', 'upgrade-screen', 'practice-screen', 'heat-screen'].forEach(hideOverlay);
    duckMusic(false); startMusic();
    // Run opening: the Striker walks into the ring under the stage card. The Arc 1
    // theme line shows here once per save, then the stage tagline takes over.
    SequenceManager.playDynamic(st.practice ? [
        { type: 'walkin', duration: 40 },
        { type: 'text', title: 'PRACTICE', subtitle: `${st.practice.target.label} · QUIT FROM THE PAUSE MENU`, duration: 90 },
        { type: 'call', fn: refreshStageHud },
        { type: 'resume' }
    ] : [
        { type: 'walkin', duration: 50 },
        { type: 'billing', duration: 130, card: roundCard(1, openingSubtitle()) },
        { type: 'resume' }
    ]);
}

// ==========================================
// v20 PRACTICE + HEAT menus (unlockable, opened from the start screen)
// ==========================================
let practiceWindows = true;
function renderStartExtras() {
    const m = loadMeta();
    const pb = document.getElementById('practice-btn'), hb = document.getElementById('heat-btn');
    if (pb) { const ok = practiceUnlocked(m); pb.classList.toggle('locked', !ok);
        pb.querySelector('.sub').innerText = ok ? 'Drill any enemy or boss' : 'Reach the Arc 1 title fight'; }
    if (hb) { const ok = heatUnlocked(m); hb.classList.toggle('locked', !ok);
        const h = loadHeat();
        hb.querySelector('.sub').innerText = !ok ? 'Beat the Arc 1 boss' : (h.length ? `HEAT ${h.length} · SCORE ×${heatMultFor(h).toFixed(2)}` : 'Off — add modifiers'); }
}
function openSubmenu(screen) {
    initAudio();
    const unlocked = screen === 'practice' ? practiceUnlocked() : heatUnlocked();
    if (!unlocked) { showToast(screen === 'practice' ? 'REACH THE ARC 1 TITLE FIGHT TO UNLOCK' : 'BEAT THE ARC 1 BOSS TO UNLOCK', '#9ca3af'); playSound('bounce'); return; }
    st.screen = screen; hideOverlay('start-screen');
    const el = document.getElementById(`${screen}-screen`); if (el) el.style.display = 'flex';
    if (screen === 'practice') renderPracticeMenu(); else renderHeatMenu();
}
function closeSubmenu() {
    ['practice-screen', 'heat-screen'].forEach(hideOverlay);
    st.screen = 'start';
    const s = document.getElementById('start-screen'); if (s) s.style.display = 'flex';
    renderStartExtras();
}
function renderPracticeMenu() {
    const el = document.getElementById('practice-list'); if (!el) return;
    const best = loadMeta().bestStage || 0;
    el.innerHTML = practiceTargets().map(t => {
        const ok = practiceTargetUnlocked(t, best);
        return `<div class="orb-btn sm${ok ? '' : ' locked'}${t.boss ? ' boss' : ''}" onclick="window.enginePractice('${t.id}')"><div class="font-bold">${ok ? t.label : '???'}</div><div class="sub">${ok ? (t.boss ? `ARC ${t.boss} BOSS` : (t.stringLen ? '3-HIT STRINGS' : 'ENEMY')) : `REACH ROUND ${t.need}`}</div></div>`;
    }).join('') +
    `<div class="orb-btn sm wide" onclick="window.enginePracticeWindows()"><div class="font-bold">SLIP WINDOWS: ${practiceWindows ? 'ON' : 'OFF'}</div><div class="sub">Show each attack's GOOD / PERFECT window</div></div>` +
    `<div class="orb-btn sm wide back" onclick="window.engineCloseSubmenu()"><div class="font-bold">BACK [ESC] / [B]</div></div>`;
}
window.enginePractice = id => {
    const t = practiceTargets().find(x => x.id === id);
    if (!t || !practiceTargetUnlocked(t, loadMeta().bestStage || 0)) { playSound('bounce'); return; }
    startGame({ practice: t, windows: practiceWindows, tutorial: false });
};
window.enginePracticeWindows = () => { practiceWindows = !practiceWindows; renderPracticeMenu(); };
function renderHeatMenu() {
    const el = document.getElementById('heat-list'); if (!el) return;
    const on = loadHeat();
    el.innerHTML = CONSTANTS.HEAT.mods.map(h => `<div class="orb-btn sm wide heat-row${on.includes(h.id) ? ' on' : ''}" onclick="window.engineToggleHeat('${h.id}')"><div class="font-bold">${on.includes(h.id) ? '■' : '□'} ${h.name} <span class="heat-bonus">+${Math.round(h.bonus * 100)}%</span></div><div class="sub">${h.desc}</div></div>`).join('') +
        `<div class="heat-total">HEAT ${heatLevel(on)} · SCORE ×${heatMultFor(on).toFixed(2)} <span>normal runs only · not the Daily</span></div>` +
        `<div class="orb-btn sm wide back" onclick="window.engineCloseSubmenu()"><div class="font-bold">BACK [ESC] / [B]</div></div>`;
}
window.engineToggleHeat = id => { toggleHeat(id); playSound('slip'); renderHeatMenu(); };
window.engineOpenPractice = () => openSubmenu('practice');
window.engineOpenHeat = () => openSubmenu('heat');
window.engineCloseSubmenu = closeSubmenu;
function startDailyChallenge() { startGame(true); }
window.startDailyChallenge = startDailyChallenge;

function toggleHowTo() {
    initAudio(); const howTo = document.getElementById('howto-screen');
    if (st.screen === 'howto') { st.screen = st.previousScreen; if(howTo) howTo.style.display = 'none'; }
    else { st.previousScreen = st.screen; st.screen = 'howto'; if(howTo) howTo.style.display = 'flex'; }
}

function showRecap(on) {
    const ov = document.getElementById('recap-overlay');
    if (ov && ov.style) ov.style.display = on ? 'flex' : 'none';
    if (!on) stopRecap();
}
window.engineSkipRecap = () => showRecap(false);
function returnToMenu() {
    st.dailyMode = false; st.dailyDateKey = null;
    resetGame(); st.screen = 'start';
    const startScreen = document.getElementById('start-screen'); if(startScreen) startScreen.style.display = 'flex';
    ['pause-screen', 'gameover-screen', 'wager-screen', 'upgrade-screen', 'practice-screen', 'heat-screen'].forEach(hideOverlay);
    renderStartExtras();
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
    { key: 'reducedMotion', label: 'Reduced Motion', type: 'toggle' },
    { key: 'tellShapes', label: 'Colour-Blind Tells (shapes)', type: 'toggle' }
];
let pauseTab = 'resume';
let settingsFocus = 0;
// v17 REMAPPABLE CONTROLS: rows after SETTINGS_ROWS are one per action, then a reset.
const BIND_ACTIONS = Object.keys(DEFAULT_BINDS);
let rebindingAction = null;
const settingsRowCount = () => SETTINGS_ROWS.length + BIND_ACTIONS.length + 1;

// Bottom controls bar, built from the live binds. Hidden once you've finished a
// run (the manual and Pause -> Settings -> Controls still list everything).
export function renderInstructions() {
    const el = document.getElementById('instructions');
    if (!el) return;
    const K = getBinds(), L = c => keyLabel(c);
    el.innerHTML = `<span class="text-cyan-400">[${L(K.up)}/${L(K.down)}]</span> SLIP &nbsp;|&nbsp; <span class="text-cyan-400">[${L(K.ghost)}]</span> GHOST STEP &nbsp;|&nbsp; <span class="text-cyan-400">[${L(K.left)}/${L(K.right)}]</span> FOOTWORK &nbsp;|&nbsp; <span class="text-pink-500">[${L(K.jab)}]</span> JAB &nbsp;|&nbsp; <span class="text-pink-500">[${L(K.cross)}]</span> CROSS &nbsp;|&nbsp; <span class="text-pink-500">[${L(K.hook)}]</span> HOOK &nbsp;|&nbsp; <span class="text-gray-400">[${L(K.guard)}]</span> GUARD &nbsp;|&nbsp; <span class="text-yellow-400">[${L(K.instinct)}]</span> INSTINCT<br><span class="text-gray-500">PAD: X JAB · Y CROSS · B HOOK · LB GHOST · RB GUARD · A INSTINCT</span>`;
    let done = 0; try { done = loadMeta().totalRuns; } catch (e) {}
    el.classList.toggle('hidden', done >= 1);
}

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

const TREE_COLOR = { speed: CONSTANTS.TREES.speed.color, power: CONSTANTS.TREES.power.color, technique: CONSTANTS.TREES.technique.color };
const OC_NAMES = { vitality: 'oc_vital_surge', nerves: 'oc_quick_nerves', focus: 'oc_sharp_eye', instinct: 'oc_calm_engine', clinch: 'oc_clinch_breaker', finish: 'oc_clean_finish' };

function findUpgrade(id) {
    return [...UPGRADE_POOL.orbs, ...UPGRADE_POOL.masteries, ...UPGRADE_POOL.fusions, ...UPGRADE_POOL.overclocks].find(u => u.id === id);
}

// v18 LOADOUT: every tree rank (and every other evolution you own) is a
// selectable chip; the panel on top explains the selected one. Mouse, arrows
// or D-pad. No arc gating shown here — just what you have and what's next.
let loadoutSel = { row: 0, col: 0 };
function loadoutRows() {
    const rows = CONSTANTS.TREE_ORDER.map(tree => UPGRADE_POOL.orbs.filter(o => o.tree === tree).sort((a, b) => a.rank - b.rank));
    const owned = st.acquiredUpgradeIds.map(findUpgrade).filter(u => u && u.kind !== 'rank');
    const ocs = Object.entries(st.overclockCounts).filter(([, n]) => n > 0).map(([k, n]) => { const u = findUpgrade(OC_NAMES[k]); return u ? { ...u, stack: n } : null; }).filter(Boolean);
    const extra = [...owned, ...ocs];
    if (extra.length) rows.push(extra);
    return rows;
}
function loadoutStatus(u) {
    if (u.kind !== 'rank') return { text: u.stack ? `OWNED ×${u.stack}` : 'OWNED', cls: 'on' };
    const have = st.orbCounts[u.tree] || 0;
    if (u.rank <= have) return { text: 'OWNED', cls: 'on' };
    if (u.rank === have + 1) return { text: 'NEXT', cls: 'next' };
    return { text: 'NOT YET', cls: '' };
}
export function renderLoadout() {
    const el = document.getElementById('loadout-body');
    if (!el) return;
    const rows = loadoutRows();
    loadoutSel.row = Math.min(loadoutSel.row, rows.length - 1);
    loadoutSel.col = Math.min(loadoutSel.col, rows[loadoutSel.row].length - 1);
    const sel = rows[loadoutSel.row][loadoutSel.col];
    const sStat = loadoutStatus(sel);
    const detail = `<div class="lo-detail" style="--card-color:${upgradeColor(sel)}">
        <div class="lo-badge">${evolutionBadge(sel, upgradeRarity(sel))} · <span class="lo-state ${sStat.cls}">${sStat.text}</span></div>
        <div class="lo-name">${sel.name}</div><div class="lo-desc">${sel.desc}</div></div>`;
    const chip = (u, r, c) => {
        const s = loadoutStatus(u), selected = r === loadoutSel.row && c === loadoutSel.col;
        const label = u.kind === 'rank' ? `${u.rank}. ${u.name}` : u.name + (u.stack ? ` ×${u.stack}` : '');
        return `<span class="lo-rank ${s.cls} ${selected ? 'sel' : ''}" style="--tree-color:${upgradeColor(u)}" onmouseenter="window.engineLoadoutSelect(${r},${c})" onclick="window.engineLoadoutSelect(${r},${c})">${label}</span>`;
    };
    const treeRows = CONSTANTS.TREE_ORDER.map((tree, r) => {
        const lvl = st.orbCounts[tree] || 0;
        return `<div class="lo-orb" style="--tree-color:${TREE_COLOR[tree]}"><span class="lo-orb-name" style="color:${TREE_COLOR[tree]}">${CONSTANTS.TREES[tree].name} ${lvl}/5</span>${rows[r].map((u, c) => chip(u, r, c)).join('')}</div>`;
    }).join('');
    const extraRow = rows.length > 3 ? `<h4 class="lo-h">Masteries, Fusions &amp; Overclocks</h4><div class="lo-orb">${rows[3].map((u, c) => chip(u, 3, c)).join('')}</div>` : '<div class="lo-empty">Masteries and Fusions you pick will appear here.</div>';
    const wager = st.wagerMult > 1 && st.currentAffix ? `<div class="lo-wager">ACTIVE WAGER: <b>${st.currentAffix.name}</b> ×${st.wagerMult} score — ${st.currentAffix.desc}</div>` : '';
    el.innerHTML = `${wager}${detail}<h4 class="lo-h">Evolution Trees</h4>${treeRows}${extraRow}
        <div class="set-hint">${glyphHTML('up')}${glyphHTML('down')}${glyphHTML('left')}${glyphHTML('right')} browse · every evolution explained above</div>`;
}
window.engineLoadoutSelect = function (r, c) { loadoutSel = { row: r, col: c }; renderLoadout(); };
function moveLoadoutSel(dr, dc) {
    const rows = loadoutRows();
    let r = Math.max(0, Math.min(rows.length - 1, loadoutSel.row + dr));
    let c = dr ? Math.min(loadoutSel.col, rows[r].length - 1) : (loadoutSel.col + dc + rows[r].length) % rows[r].length;
    loadoutSel = { row: r, col: c }; renderLoadout();
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
    }).join('') + '<h4 class="lo-h" style="margin-top:14px">Controls</h4>' + BIND_ACTIONS.map((a, j) => {
        const i = SETTINGS_ROWS.length + j;
        const focus = i === settingsFocus ? ' focused' : '';
        const waiting = rebindingAction === a;
        return `<div class="set-row bind-row${focus}" data-i="${i}"><label>${BIND_LABELS[a]}</label><button class="bind-key ${waiting ? 'waiting' : ''}" onclick="window.engineStartRebind('${a}')">${waiting ? 'PRESS A KEY…' : keyLabel(getBinds()[a])}</button></div>`;
    }).join('') + `<div class="set-row${settingsFocus === settingsRowCount() - 1 ? ' focused' : ''}" data-i="${settingsRowCount() - 1}"><label>Reset Controls</label><button class="set-toggle" onclick="window.engineResetBinds()">RESET</button></div>` +
    '<div class="set-hint">[↑/↓] select · [←/→] adjust · [ENTER] toggle / rebind · [ESC] cancels a rebind · saved automatically · gamepad layout is fixed</div>';
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

window.engineStartRebind = function (action) { rebindingAction = action; renderSettings(); };
window.engineResetBinds = function () { resetBinds(); rebindingAction = null; renderSettings(); renderInstructions(); };

function adjustFocusedSetting(dir) {
    if (settingsFocus >= SETTINGS_ROWS.length) {
        const j = settingsFocus - SETTINGS_ROWS.length;
        if (j < BIND_ACTIONS.length) window.engineStartRebind(BIND_ACTIONS[j]); else window.engineResetBinds();
        return;
    }
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
        const n = settingsRowCount();
        const onRange = settingsFocus < SETTINGS_ROWS.length && SETTINGS_ROWS[settingsFocus].type === 'range';
        if (code === 'ArrowUp') { settingsFocus = (settingsFocus - 1 + n) % n; renderSettings(); }
        else if (code === 'ArrowDown') { settingsFocus = (settingsFocus + 1) % n; renderSettings(); }
        else if (code === 'ArrowLeft' && onRange) adjustFocusedSetting(-1);
        else if (code === 'ArrowRight' && onRange) adjustFocusedSetting(1);
        else if (code === 'Enter' || code === 'Space') { if (!onRange) adjustFocusedSetting(1); }
        return;
    }
    if (pauseTab === 'loadout') {
        if (code === 'ArrowUp') moveLoadoutSel(-1, 0);
        else if (code === 'ArrowDown') moveLoadoutSel(1, 0);
        else if (code === 'ArrowLeft') moveLoadoutSel(0, -1);
        else if (code === 'ArrowRight') moveLoadoutSel(0, 1);
        return;
    }
    if (pauseTab === 'resume') {
        if (code === 'ArrowUp') moveMenu(-1);
        else if (code === 'ArrowDown') moveMenu(1);
        else if (code === 'Enter' || code === 'Space') activateMenu();
    }
}

// ==========================================
// STAGE WAGER UI (v16)
// ==========================================
function renderWagerPrompts() {
    const a = document.getElementById('wager-accept-key'), d = document.getElementById('wager-decline-key');
    const kb = inputDevice() === 'keyboard';
    if (a) a.innerHTML = kb ? '<span class="glyph">1</span> / <span class="glyph">ENTER</span>' : glyphHTML('confirm');
    if (d) d.innerHTML = kb ? '<span class="glyph">2</span> / <span class="glyph">ESC</span>' : glyphHTML('back');
}

function showWager() {
    renderWagerPrompts();
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
        const aL = gp.axes[0] < -0.5, aR = gp.axes[0] > 0.5;
        const stickLeft = aL && !st.lastGamepadState.axes[2], stickRight = aR && !st.lastGamepadState.axes[3];
        st.pad.up = jp(12) || (aU && !st.lastGamepadState.axes[0]); st.pad.down = jp(13) || (aD && !st.lastGamepadState.axes[1]);
        // v17: Ghost Step = LB / L2 (its own button); Guard = RB / R2; D-pad or
        // left stick LEFT/RIGHT held = footwork only.
        st.pad.ghost = jp(4) || jp(6); st.pad.guard = p(5) || p(7);
        st.pad.leftHeld = p(14) || gp.axes[0] < -0.5; st.pad.rightHeld = p(15) || gp.axes[0] > 0.5;
        st.pad.jab = jp(2); st.pad.cross = jp(3); st.pad.crossHeld = p(3); st.pad.hook = jp(1); st.pad.instinct = jp(0); st.pad.pause = jp(9) || jp(16);
        const anyPress = gp.buttons.some((b, i) => jp(i));
        // v18: whatever you touch last decides which glyphs the prompts show.
        if (anyPress || aU || aD || aL || aR) {
            const fam = padFamily(gp.id);
            if (st.inputDevice !== fam) { setInputDevice(fam); onDeviceChanged(); }
        }

        // v19 MENU NAV: D-pad / stick moves the highlight, × / A picks it.
        const navUp = st.pad.up || stickLeft, navDown = st.pad.down || stickRight;
        if (st.screen === 'start') {
            if (navUp) moveMenu(-1); else if (navDown) moveMenu(1);
            else if (jp(0)) activateMenu(); else if (st.pad.pause) startGame();
        }
        else if (st.screen === 'playing') {
            if (posterWaiting()) { if (anyPress) confirmPoster(); }
            else if (st.pad.pause && !SequenceManager.active && !st.finisher) openPause();
        }
        else if (st.screen === 'paused') {
            if (st.pad.pause) closePause();
            else if (jp(4)) cyclePauseTab(-1);
            else if (jp(5)) cyclePauseTab(1);
            else if (st.pad.up) pauseKey('ArrowUp');
            else if (st.pad.down) pauseKey('ArrowDown');
            else if (jp(14)) pauseKey('ArrowLeft');
            else if (jp(15)) pauseKey('ArrowRight');
            else if (st.pad.instinct) pauseKey('Enter');
            else if (st.pad.hook) closePause(); // ○ / B = back to the fight (it used to QUIT)
        }
        else if (st.screen === 'tutorial') { if (st.pad.instinct || st.pad.jab || st.pad.cross) dismissTutorial(); }
        else if (st.screen === 'vignette') { if (anyPress) skipVignette(); }
        else if (st.screen === 'wager') {
            if (jp(0)) resolveWager(true);        // × / A
            else if (jp(1)) resolveWager(false);  // ○ / B
        }
        else if (st.screen === 'upgrading') {
            // v18: D-pad / stick to choose, × / A to take it — identical on every pad.
            if (jp(14) || stickLeft) moveDraftFocus(-1);
            else if (jp(15) || stickRight) moveDraftFocus(1);
            else if (jp(0)) confirmDraftFocus();
        }
        else if (st.screen === 'practice' || st.screen === 'heat') {
            if (navUp) moveMenu(-1); else if (navDown) moveMenu(1);
            else if (jp(0)) activateMenu();
            else if (jp(1)) closeSubmenu();
        }
        else if (st.screen === 'records' || st.screen === 'howto') {
            if (jp(0) || jp(1)) activateMenu(true);
        }
        else if (st.screen === 'gameover' && recapPlaying()) {
            if (jp(0) || jp(1) || jp(9)) showRecap(false); // any button skips the replay
        }
        else if (st.screen === 'gameover') {
            if (navUp) moveMenu(-1); else if (navDown) moveMenu(1);
            else if (jp(0)) activateMenu();
            else if (jp(1)) returnToMenu();
        }

        for(let i=0; i<gp.buttons.length; i++) st.lastGamepadState.buttons[i] = p(i);
        st.lastGamepadState.axes[0] = aU; st.lastGamepadState.axes[1] = aD;
        st.lastGamepadState.axes[2] = aL; st.lastGamepadState.axes[3] = aR;
    }
}

window.startGame = window.engineStartGame = startGame; window.toggleHowTo = window.engineToggleHowTo = toggleHowTo;
window.dismissTutorial = window.engineDismissTutorial = dismissTutorial; window.returnToMenu = window.engineReturnToMenu = returnToMenu;

window.addEventListener('keydown', e => {
    // v17: capturing a key for a rebind swallows it (Esc cancels).
    if (rebindingAction) {
        if (e.preventDefault) e.preventDefault();
        if (e.code !== 'Escape') { if (!rebind(rebindingAction, e.code)) showToast('THAT KEY IS RESERVED', '#ff8800'); }
        rebindingAction = null; renderSettings(); renderInstructions();
        return;
    }
    st.keys[e.code] = true;
    if (st.inputDevice !== 'keyboard') { setInputDevice('keyboard'); onDeviceChanged(); }
    if (st.screen === 'gameover' && recapPlaying()) { if (!e.repeat) showRecap(false); return; }
    if (st.screen === 'practice' || st.screen === 'heat') {
        if (e.code === 'ArrowUp') moveMenu(-1);
        else if (e.code === 'ArrowDown') moveMenu(1);
        else if (e.code === 'Enter' || e.code === 'Space') activateMenu();
        else if (e.code === 'Escape' || e.code === 'KeyB') closeSubmenu();
        return;
    }
    // Records/leaderboard is a modal opened from the menu — close it (and swallow
    // other keys) rather than letting a stray keypress start a run underneath it.
    if (st.screen === 'records') { if (e.code === 'Escape' || e.code === 'KeyH' || e.code === 'Enter') toggleRecords(); return; }
    // FIXED: Keyboard 'A' now starts the game as indicated by menu text
    if (st.screen === 'start') {
        if (e.code === 'ArrowUp') { moveMenu(-1); return; }
        if (e.code === 'ArrowDown') { moveMenu(1); return; }
        if (e.code === 'Enter') { activateMenu(); return; }
        if (e.code === 'Space' || e.code === 'KeyA') { startGame(); return; }
    }
    if (st.screen === 'gameover' && (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'Enter')) {
        if (e.code === 'Enter') activateMenu(); else moveMenu(e.code === 'ArrowUp' ? -1 : 1);
        return;
    }
    if (st.screen === 'vignette') { if (!e.repeat) skipVignette(); return; }
    if (posterWaiting()) { if (!e.repeat) confirmPoster(); return; }
    if (st.screen === 'wager') {
        if (e.code === 'Digit1' || e.code === 'KeyA' || e.code === 'Enter') resolveWager(true);
        else if (e.code === 'Digit2' || e.code === 'KeyD' || e.code === 'Escape') resolveWager(false);
        return;
    }
    if (e.code === 'KeyP' || (e.code === 'Escape' && st.screen !== 'howto' && st.screen !== 'tutorial')) {
        if (st.screen === 'playing' && !st.finisher && !st.knockdown) openPause();
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
        else if (e.code === 'ArrowLeft') moveDraftFocus(-1);
        else if (e.code === 'ArrowRight') moveDraftFocus(1);
        else if (e.code === 'Enter' || e.code === 'Space') confirmDraftFocus();
        return;
    }
    if (st.screen === 'gameover' && e.code === 'KeyR') { startGame(); return; }
});
window.addEventListener('keyup', e => { st.keys[e.code] = false; });
window.addEventListener('pointerdown', () => { if (st.screen === 'vignette') skipVignette(); else confirmPoster(); });

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
    tmTick(); // game-clock time (only while actually playing)
    arcParTick();

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

    // v17 TEN-COUNT: while the Striker is down the world holds still.
    if (st.knockdown) {
        if (st.shake > 0) st.shake *= 0.9;
        updateParticlesAndTrails();
        const r = updateKnockdown();
        if (r === 'out') { endRun(); return; }
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
    if (st.bossIntroTimer > 0 && !posterWaiting()) st.bossIntroTimer--;
    if (st.instinctPauseTimer > 0) {
        st.instinctPauseTimer--;
    } else if (st.isInstinct) {
        if (!(st.zoneTimer > 0)) st.instinctMeter -= 0.25; // the Zone is paid for up front
        if (st.instinctMeter <= 0) {
            st.isInstinct = false;
            let barCont = document.getElementById('bar-cont');
            if (barCont) barCont.classList.remove('beast-active');
        }
    }

    let banner = document.getElementById('instinct-ready-banner');
    if(st.instinctMeter >= 100 && !st.isInstinct) {
        if(!st.seenTutorials.instinct) {
            triggerTutorial('instinct','INSTINCT MAXED',`Your meter is full!<br><br>Press <span class="text-cyan-400 font-bold">[${keyName('instinct')}] / pad A</span> to unleash Instinct &mdash; double knockback and massive hitstop.<br><br><b>Or hold it:</b> land a <span class="text-white font-bold">Perfect Slip</span> on a full meter and you drop into <span class="text-white font-bold">THE ZONE</span> &mdash; the world slows down around you.`);
            return;
        } else if (banner) banner.style.display = 'block';
    } else if (banner) banner.style.display = 'none';

    // v17 INSTINCT ZONE: the Striker moves at full speed; the world ticks at a
    // fraction of it (enemies, bosses, hazards) while the screen is inverted.
    let worldTick = true;
    if (st.zoneTimer > 0) {
        // v18: the Zone only burns while something is in reach — knocked-back or
        // not-yet-arrived enemies no longer waste it (the hold is capped).
        const inReach = st.enemies.some(e => e.hp > 0 && Math.abs(e.x - st.player.x) < 280);
        const anyOnScreen = st.enemies.some(e => e.hp > 0 && e.x < st.width);
        if (inReach || !anyOnScreen || (st.zoneHold = (st.zoneHold || 0) + 1) > CONSTANTS.ZONE.maxHold) st.zoneTimer--;
        worldTick = (st.frameCount = (st.frameCount || 0) + 1) % CONSTANTS.ZONE.enemyTick === 0;
        if (st.zoneTimer === 0) spawnFloatingText(st.player.x, st.player.y - 140, 'ZONE OUT', '#9ca3af');
    }
    updatePlayer();
    if (worldTick) { updateEnemies(); if (typeof updateBosses === 'function') updateBosses(); }
    if (st.finisher) { if (typeof updateHUD === 'function') updateHUD(); return; } // a stagger just began
    // LANE HAZARDS: schedule + resolve environmental lane-strikes (Arc 4-5 surprise).
    if (worldTick) { maybeScheduleHazard(); updateHazards(); }

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

    // v20 PRACTICE: loop the target, never die, no drafts.
    if (st.practice) {
        updatePractice();
        if (posterWaiting() && st.practice.posterSeen) confirmPoster();
        if (st.bossActive && st.bossIntroTimer <= 0) st.practice.posterSeen = true; // first poster plays, repeats skip
    }
    // v20 HEAT (NO MERCY): health can only go down (the ten-count resets the ceiling).
    if (st.heat && st.heat.includes('no_mercy')) {
        if (st.hpCeil === undefined || st.health < st.hpCeil) st.hpCeil = st.health;
        else if (st.health > st.hpCeil) st.health = st.hpCeil;
    }
    // v17: 0 HP is a KNOCKDOWN (once per arc) — the second one ends the run.
    if (st.health <= 0) {
        if (canBeKnockedDown()) { startKnockdown(); if (typeof updateHUD === 'function') updateHUD(); return; }
        endRun(); return;
    }

    st.health = Math.round(st.health);
    if (typeof updateHUD === 'function') updateHUD();
    // Footwork has no dummy gate, and a toast here turned out to be too easy to
    // miss entirely during real play — a full modal, same as every other Stage 1
    // lesson, guarantees it's actually seen rather than optimistically glimpsed.
    if (!st.seenTutorials.footwork_tip && st.currentStage === 1 && st.enemies.length === 0 &&
        (!st.tutorialEnabled || st.spawnTotal >= 5)) {
        triggerTutorial('footwork_tip', 'FOOTWORK', `You are not locked to one spot.<br><br>Hold <span class="text-cyan-400 font-bold">[${keyName('right')}]</span> to press forward and meet them early; hold <span class="text-cyan-400 font-bold">[${keyName('left')}]</span> to give ground and buy a beat. While you're fighting you hold your position.<br><br>Ghost Step has its own button: <span class="text-cyan-400 font-bold">[${keyName('ghost')}]</span> &mdash; a short invincible dash straight through an attack.`);
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

    // v19 TELEMETRY: close the run record; show the run clock + what ended it.
    const endedBy = liveRun() && liveRun().lastDamageSrc;
    const rec17 = tmEndRun({ stage: st.currentStage, score, grade });
    const rt = document.getElementById('run-time-ui');
    if (rt && rec17) rt.innerText = `RUN TIME ${fmtTime(rec17.frames)} · ROUND ${st.currentStage}${endedBy ? ' · ENDED BY ' + prettySource(endedBy) : ''}`;
    // v20 DEATH RECAP: replay the last moments + what hurt + one tip.
    const top = topDamage(rec17);
    const tip = tipFor(endedBy || (top && top.src) || 'unknown');
    const setT = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };
    setT('recap-ended', endedBy ? `ENDED BY <b>${prettySource(endedBy)}</b>` : 'RUN OVER');
    setT('recap-most', top ? `HURT MOST BY <b>${prettySource(top.src)}</b> · ${top.dmg} DMG THIS RUN` : '');
    setT('recap-tip', `TIP · ${tip}`);
    setT('run-tip', `TIP · ${tip}`);
    showRecap(startRecapPlayback());

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

    renderInstructions();
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

const SOURCE_NAMES = { grunt: 'GRUNT', shield: 'SHIELD', bruiser: 'BRUISER', assassin: 'ASSASSIN', zoner: 'ZONER', hazard: 'RAIL HAZARD', live_lane: 'LIVE LANE', negative_echo: 'NEGATIVE ECHO', neon_enforcer: 'NEON ENFORCER', phantom_boxer: 'PHANTOM BOXER', static_monk: 'STATIC MONK', live_wire: 'LIVE WIRE', negative: 'NEGATIVE' };
function prettySource(s) { return SOURCE_NAMES[s] || String(s).toUpperCase(); }

// v19 RUN DATA panel on the Records screen + JSON export (tuning telemetry).
// v20: best medal per Arc + each Arc's par.
function medalsHTML() {
    const best = loadMedals();
    return `<div class="rd-sub">ARC MEDALS · beat par time AND score for GOLD</div><div class="rd-chips">` +
        [1, 2, 3, 4, 5].map(a => { const m = best[a] && MEDALS[best[a]]; const p = ARC_PAR[a];
            return `<span class="rd-chip" style="${m ? `border-color:${m.color};color:${m.color}` : 'opacity:.5'}">ARC ${a} ${m ? m.label : '—'} <small>(${fmtSecs(p.time)} · ${fmtK(p.score)})</small></span>`; }).join('') + `</div>`;
}
function renderRunData() {
    const el = document.getElementById('run-data');
    if (!el) return;
    const sum = summarizeTelemetry(loadTelemetry());
    if (!sum.runs) { el.innerHTML = medalsHTML() + '<div class="opacity-60 text-xs py-2">No recorded runs yet.</div>'; return; }
    const stages = Object.keys(sum.reached).map(Number).sort((a, b) => a - b);
    const rows = stages.map(s => `<div class="rd-row"><span>R${s}</span><span>${sum.reached[s]} reached</span><span class="${sum.ends[s] ? 'rd-end' : ''}">${sum.ends[s] || 0} ended</span><span>${fmtTime(sum.avgTime[s])} avg</span></div>`).join('');
    const hurt = sum.topHurt.slice(0, 5).map(([k, v]) => `<span class="rd-chip">${prettySource(k)} ${v}</span>`).join('');
    el.innerHTML = medalsHTML() + `<div class="rd-sub">LAST ${sum.runs} RUNS · WHAT HITS YOU (total damage)</div><div class="rd-chips">${hurt}</div>
        <div class="rd-sub">WHERE RUNS END</div><div class="rd-table">${rows}</div>`;
}
window.engineExportRunData = function () {
    try {
        const blob = new Blob([exportTelemetryJSON()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `neon-strike-runs-${todayKey()}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) { console.warn('export failed', e); }
};

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

    renderRunData();
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
let lastCine = '', lastZone = false;
function syncCinematicClass() {
    const mode = st.screen === 'vignette' ? 'vignette' : (st.finisher ? 'finisher' : (st.knockdown ? 'knockdown' : ((st.bossIntroTimer > 0 && st.bossPoster && st.screen === 'playing') ? 'poster' : '')));
    const zone = st.zoneTimer > 0 && st.screen === 'playing';
    if (zone !== lastZone) {
        lastZone = zone;
        // The full inversion is a big luminance swing: a low Flash Intensity (or
        // Reduced Motion, via CSS) gets the softer treatment instead.
        try { document.body.classList.toggle('cine-zone', zone); document.body.classList.toggle('cine-zone-soft', zone && getSettings().flashIntensity < 0.5); } catch (e) {}
    }
    if (mode === lastCine) return;
    lastCine = mode;
    try {
        const b = document.body;
        b.classList.toggle('cine-vignette', mode === 'vignette');
        b.classList.toggle('cine-finisher', mode === 'finisher');
        b.classList.toggle('cine-knockdown', mode === 'knockdown');
        b.classList.toggle('cine-poster', mode === 'poster');
    } catch (e) {}
}

// v18 TITLE-FIGHT POSTER waits for a button press before the bell.
export function posterWaiting() {
    return st.screen === 'playing' && !!st.bossPoster && !st.posterConfirmed && st.bossIntroTimer === CONSTANTS.POSTER_HOLD_FRAME;
}
function confirmPoster() {
    if (!posterWaiting()) return false;
    st.posterConfirmed = true; playSound('bell'); st.inputGrace = INPUT_GRACE_FRAMES;
    return true;
}
window.engineConfirmPoster = confirmPoster;

// Re-label on-screen DOM prompts when the player switches keyboard <-> pad.
function onDeviceChanged() {
    if (st.screen === 'upgrading') {
        renderDraftFocus();
        document.querySelectorAll('#draft-container .draft-card .card-key').forEach((el, i) => { el.innerHTML = inputDevice() === 'keyboard' ? `<span class="glyph">${i + 1}</span>` : ''; });
    }
    if (st.screen === 'wager') renderWagerPrompts();
    renderInstructions();
}

// v19 MENU NAVIGATION: every menu's buttons are a focus list (D-pad / stick /
// arrows move it, × / A / Enter picks). Playtest: no D-pad on the main menu or
// the pause screen.
const MENU_ROOTS = { start: 'start-screen', gameover: 'gameover-screen', records: 'records-screen', howto: 'howto-screen', practice: 'practice-screen', heat: 'heat-screen' };
let menuFocus = 0, menuFor = null;
function menuButtons() {
    let root = null;
    if (st.screen === 'paused') { if (pauseTab !== 'resume') return []; root = document.getElementById('ppanel-resume'); }
    else if (MENU_ROOTS[st.screen]) root = document.getElementById(MENU_ROOTS[st.screen]);
    if (!root || typeof root.querySelectorAll !== 'function') return [];
    return Array.from(root.querySelectorAll('.orb-btn'));
}
function syncMenuFocus() {
    const key = st.screen + (st.screen === 'paused' ? pauseTab : '');
    if (key !== menuFor) { menuFor = key; menuFocus = 0; }
    const btns = menuButtons();
    if (menuFocus >= btns.length) menuFocus = 0;
    btns.forEach((b, i) => b.classList && b.classList.toggle('menu-focus', i === menuFocus));
}
function moveMenu(d) {
    const b = menuButtons(); if (!b.length) return;
    menuFocus = (menuFocus + d + b.length) % b.length; syncMenuFocus(); playSound('slip');
}
// `last` = the close button of a scrolling screen (records / manual)
function activateMenu(last = false) {
    const b = menuButtons(); const el = last ? b[b.length - 1] : b[menuFocus];
    if (el && typeof el.click === 'function') el.click();
}

// v19 INPUT GRACE: the press that closes a menu / overlay (× on the evolution
// screen, Enter on a wager, Esc on pause…) must not also land in the fight —
// playtest: confirming the upgrade screen with × fired Instinct. Any time
// control returns to play, gameplay input is swallowed for a few frames.
const INPUT_GRACE_FRAMES = 8;
let lastScreenSeen = 'start';
function watchResume() {
    if (st.screen === 'playing' && lastScreenSeen !== 'playing') st.inputGrace = INPUT_GRACE_FRAMES;
    lastScreenSeen = st.screen;
}

function loop() {
    st.uiFrame = (st.uiFrame || 0) + 1;
    pollGamepad();
    watchResume();
    if (st.screen !== 'playing') syncMenuFocus();
    syncCinematicClass();
    if (st.screen === 'vignette') updateVignette();
    update(); draw();
    captureRecap(canvas);
    if (st.screen === 'gameover' && recapPlaying()) updateRecap(document.getElementById('recap-canvas'));
    st.lastKeys = { ...st.keys };
    requestAnimationFrame(loop);
}
function init() { st.width = 1000; st.height = 600; if(canvas) { canvas.width = st.width; canvas.height = st.height; } applySettingsSideEffects(); renderInstructions(); resetGame(); initAtmosphere(); fitViewport(); renderBest(); applyStrikerColor(); renderStartExtras(); loop(); }
init();

// Test hooks for the headless harness / bot sim (tests/*.mjs). Not used in play.
export const __test = { posterWaiting, confirmPoster, watchResume, startGame, resetGame, update, triggerUpgradeDraft, resolveWager, openPause, closePause, setPauseTab, renderLoadout, renderSettings, endRun };

// Dev/playtest hook: open the game with ?debug in the URL to get window.__ns —
// state access plus a stage jump (e.g. __ns.jump(5) = Arc 1 boss). Off otherwise.
try {
    if (typeof location !== 'undefined' && /[?&]debug\b/.test(location.search)) {
        window.__ns = {
            st, CONSTANTS, SequenceManager,
            jump(stage) { st.enemies = []; st.currentStage = Math.max(1, stage - 1); st.stageClearing = false; st.bossActive = false; advanceStage(); },
            draft(n = 1) { st.pendingUpgrades += n; triggerUpgradeDraft(); },
            // Item-11 onboarding mockup: draws in-world teaching callouts over the
            // live scene. null clears it. Never set outside ?debug.
            telemetry() { return { live: liveRun(), runs: loadTelemetry(), summary: summarizeTelemetry(loadTelemetry()) }; },
            mockOnboarding(scene) { st.onboardingMock = scene || null; draw(); },
            // Save the current frame (canvas + a painted stand-in for the DOM HUD
            // clusters) to a local receiver — used to export mockup images.
            capture(name, url = 'http://127.0.0.1:8124/') {
                draw();
                const c = document.createElement('canvas'); c.width = st.width; c.height = st.height;
                const x = c.getContext('2d'); if (st.zoneTimer > 0) x.filter = 'invert(1)'; x.drawImage(canvas, 0, 0); x.filter = 'none';
                const hud = (px, py, w, h) => { x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(px, py, w, h); x.strokeStyle = 'rgba(255,255,255,0.08)'; x.strokeRect(px, py, w, h); };
                hud(16, 14, 290, 74); hud(st.width - 266, 14, 250, 84);
                x.fillStyle = '#fff'; x.font = '900 italic 24px Orbitron'; x.fillText(String(Math.max(0, Math.round(st.health))), 26, 44);
                x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(96, 30, 200, 10); x.fillStyle = '#ff3355'; x.fillRect(96, 30, 200 * Math.max(0, st.health) / st.maxHealth, 10);
                x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(26, 54, 270, 8);
                const ig = x.createLinearGradient(26, 0, 296, 0); ig.addColorStop(0, '#ff00ff'); ig.addColorStop(1, '#00ffff'); x.fillStyle = ig; x.fillRect(26, 54, 270 * st.instinctMeter / 100, 8);
                x.font = '900 9px Orbitron'; x.fillStyle = '#6b7280'; x.fillText('SPD ' + st.orbCounts.speed + '   PWR ' + st.orbCounts.power + '   TEC ' + st.orbCounts.technique, 26, 78);
                x.textAlign = 'right'; x.fillStyle = '#fde68a'; x.font = '900 italic 28px Orbitron'; x.fillText(Math.round(st.score).toLocaleString(), st.width - 26, 46);
                x.fillStyle = '#22d3ee'; x.font = '900 italic 20px Orbitron'; x.fillText(String(st.combo) + ' COMBO', st.width - 26, 72); x.textAlign = 'left';
                return fetch(url, { method: 'POST', body: name + '|' + c.toDataURL('image/png') }).then(r => r.ok).catch(() => false);
            },
            // Advance the real frame loop n times synchronously (works even when the
            // tab is hidden and requestAnimationFrame is paused).
            step(n = 1) { for (let i = 0; i < n; i++) { pollGamepad(); watchResume(); syncCinematicClass(); if (st.screen === 'vignette') updateVignette(); update(); st.lastKeys = { ...st.keys }; } draw(); }
        };
    }
} catch (e) {}
