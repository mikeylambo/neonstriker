import { gameState as st } from './state.js';
import { CONSTANTS } from './constants.js';
import { updateHUD, HUD } from './ui/ui.js';
import { initAudio, playSound } from './vfx_audio/audio.js';
import { updateParticlesAndTrails, spawnFloatingText, showToast, triggerShockwave, doFlash, createImpact, createVacuum, createShatter } from './vfx_audio/effects.js';
import { SequenceManager } from './systems/sequences.js';
import { applyUpgrade, advanceStage } from './systems/progression/apply.js';

// FIXED: Corrected path and filename to match the architectural rename (draft.js)
import { buildDraft } from './systems/progression/draft.js';

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

export const $ = function(id) { return document.getElementById(id); };
export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;

export function triggerUpgradeDraft() {
    st.screen = 'upgrading';
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
    const container = document.getElementById('draft-container');
    
    if (container) {
        container.innerHTML = ''; 
        
        draftOptions.forEach((option, index) => {
            let themeColor = '#ffffff';
            if (option.tree === 'speed') themeColor = '#22d3ee';
            if (option.tree === 'power') themeColor = '#ec4899';
            if (option.tree === 'technique') themeColor = '#facc15';
            const PAD_LABEL = ['X', 'Y', 'B'];
            let iconText = `[${index + 1}] / [${PAD_LABEL[index] || '?'}]`;
            
            if (option.kind === 'overclock') themeColor = '#c084fc';
            if (option.kind === 'mastery') themeColor = '#34d399';
            if (option.kind === 'fusion') themeColor = '#ff0055';

            let btnHTML = `
                <div class="orb-btn flex-1 min-w-[250px] max-w-[320px] flex flex-col justify-between cursor-pointer" onclick="window.engineApplyUpgradeState('${option.id}')" style="border-color: ${themeColor}40;">
                    <div>
                        <div class="text-[10px] uppercase font-black tracking-widest mb-2" style="color: ${themeColor};">${option.kind}</div>
                        <div class="font-bold text-xl text-white mb-2">${option.name} <span class="text-xs ml-2 opacity-60">${iconText}</span></div>
                        <div class="text-xs opacity-80 mb-4 text-gray-300 leading-relaxed">${option.desc}</div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', btnHTML);
        });
    }

    if (HUD.screens.upgrade) HUD.screens.upgrade.style.display = 'flex';
}

window.engineTriggerUpgradeDraft = triggerUpgradeDraft;

export { HUD, playSound, spawnFloatingText, showToast, triggerShockwave, doFlash, createImpact, createVacuum, createShatter, triggerTutorial, spawnTutorialEnemy, SequenceManager };

function resetGame() {
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
    
    st.acquiredUpgradeIds = []; st.recentlyOffered = []; st.currentDraftOptions = [];
    st.overclockCounts = { vitality: 0, nerves: 0, focus: 0, instinct: 0, clinch: 0, finish: 0 };
    st.progressionMods = {
        ghostStepCooldownMult: 1, hookRecoveryMult: 1, relentlessRhythm: false, crossArmorStunBonus: 0, hookKnockbackFloor: 0, hardTargetInstinctFlat: 0, hardTargetExpFlat: 0, perfectSlipWindowBonus: 0, bossExposeBonusFrames: 0, perfectSlipHeal: 0, dempseyCircuit: false, dempseyRecoveryBonus: 0, ghostCounter: false, shatterRead: false, shatterReadBossBypass: 0, shatterReadStaggerBonus: 0, perfectSlipRewardBonusMult: 0, instinctGainBonusMult: 0, incomingRecoilMult: 1, expGainBonusMult: 0, guardRead: false, blurStep: false, executionerCross: false, flowState: false
    };

    st.lastHUD.exp = -1; st.lastHUD.mult = -1;

    st.enemies = []; st.particles = []; st.floatingTexts = []; st.shockwaves = [];
    st.player = resetPlayerObj(); st.player.y = st.height * CONSTANTS.LANE_Y[st.player.lane];
    
    let stageElem = document.getElementById('stage-ui'); if (stageElem) { stageElem.innerText = `ARC 1: SHATTERED CATHEDRAL`; stageElem.style.color = '#22d3ee'; stageElem.classList.remove('stage-pulse'); }
    let barCont = document.getElementById('bar-cont'); if (barCont) barCont.classList.remove('beast-active');

    ['speed', 'power', 'technique'].forEach(t => { const orbUI = document.getElementById(`orb-${t}`); if (orbUI) orbUI.innerText = '0'; });
}

function startGame(daily = false) { 
    st.runCount = (st.runCount || 0) + 1; initAudio(); 
    const toggle = document.getElementById('tutorial-toggle-cb'); st.tutorialEnabled = toggle ? toggle.checked : true; 
    st.dailyMode = daily;
    st.dailyDateKey = daily ? todayKey() : null;
    seedRng(daily ? dailySeedFromDate() : ((Math.random() * 0xffffffff) >>> 0));
    resetGame(); st.screen = 'playing'; 
    const startScreen = document.getElementById('start-screen'); if (startScreen) startScreen.style.display = 'none'; 
    const goScreen = document.getElementById('gameover-screen'); if (goScreen) goScreen.style.display = 'none';
    SequenceManager.play('stage1Intro'); 
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
    const pauseScreen = document.getElementById('pause-screen'); if(pauseScreen) pauseScreen.style.display = 'none';
    const goScreen = document.getElementById('gameover-screen'); if(goScreen) goScreen.style.display = 'none';
    SequenceManager.active = false;
}

window.engineApplyUpgradeState = function(id) {
    let option = st.currentDraftOptions.find(o => o.id === id);
    if(option) applyUpgrade(st, option);
};

function pollGamepad() {
    let gamepads = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null;
    for (let i = 0; i < gamepads.length; i++) { if (gamepads[i] && gamepads[i].connected) { gp = gamepads[i]; break; } }
    if (gp) {
        let p = (btn) => gp.buttons[btn] && gp.buttons[btn].pressed; let jp = (btn) => p(btn) && !st.lastGamepadState.buttons[btn];
        let aU = gp.axes[1] < -0.5 || gp.axes[3] < -0.5, aD = gp.axes[1] > 0.5 || gp.axes[3] > 0.5;
        st.pad.up = jp(12) || (aU && !st.lastGamepadState.axes[0]); st.pad.down = jp(13) || (aD && !st.lastGamepadState.axes[1]);
        st.pad.left = jp(14) || jp(6); st.pad.guard = p(4) || p(5) || p(7); st.pad.jab = jp(2); st.pad.cross = jp(3); st.pad.hook = jp(1); st.pad.instinct = jp(0); st.pad.pause = jp(9) || jp(16); 
        
        if (st.screen === 'start') { if (st.pad.instinct || st.pad.pause || st.pad.jab) startGame(); } 
        else if (st.screen === 'playing') { if (st.pad.pause && !SequenceManager.active) { st.screen = 'paused'; let p = document.getElementById('pause-screen'); if(p) p.style.display = 'flex'; } } 
        else if (st.screen === 'paused') { if (st.pad.instinct || st.pad.pause) { st.screen = 'playing'; let p = document.getElementById('pause-screen'); if(p) p.style.display = 'none'; } }
        else if (st.screen === 'tutorial') { if (st.pad.instinct || st.pad.jab || st.pad.cross) dismissTutorial(); }
        else if (st.screen === 'upgrading') {
            if (st.pad.jab && st.currentDraftOptions[0]) applyUpgrade(st, st.currentDraftOptions[0]);
            if (st.pad.cross && st.currentDraftOptions[1]) applyUpgrade(st, st.currentDraftOptions[1]);
            if (st.pad.hook && st.currentDraftOptions[2]) applyUpgrade(st, st.currentDraftOptions[2]);
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
    if (e.code === 'KeyP' || (e.code === 'Escape' && st.screen !== 'howto' && st.screen !== 'tutorial')) {
        if (st.screen === 'playing') { st.screen = 'paused'; let p = document.getElementById('pause-screen'); if(p) p.style.display = 'flex'; } 
        else if (st.screen === 'paused') { st.screen = 'playing'; let p = document.getElementById('pause-screen'); if(p) p.style.display = 'none'; } 
        return;
    }
    if (e.code === 'KeyM') { toggleAudio(); return; }
    if (e.code === 'KeyH') { toggleHowTo(); return; }
    if (st.screen === 'tutorial' && (e.code === 'Enter' || e.code === 'Space')) { dismissTutorial(); return; }
    
    if (st.screen === 'upgrading') {
        if (e.code === 'Digit1' && st.currentDraftOptions[0]) applyUpgrade(st, st.currentDraftOptions[0]);
        if (e.code === 'Digit2' && st.currentDraftOptions[1]) applyUpgrade(st, st.currentDraftOptions[1]);
        if (e.code === 'Digit3' && st.currentDraftOptions[2]) applyUpgrade(st, st.currentDraftOptions[2]);
        return;
    }
    if (st.screen === 'gameover' && e.code === 'KeyR') { startGame(); return; }
});
window.addEventListener('keyup', e => { st.keys[e.code] = false; });

function update() {
    if (st.screen !== 'playing') return;
    if (st.hitstop > 0) { st.hitstop--; return; }
    if (st.shake > 0) st.shake *= 0.88;

    updateAtmosphere(); 
    updateParticlesAndTrails(); 
    if (SequenceManager.active) {
        SequenceManager.update();
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
    // LANE HAZARDS: schedule + resolve environmental lane-strikes (Arc 4-5 surprise).
    maybeScheduleHazard(); updateHazards();

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
        if (st.currentStage % 7 === 0 && !st.bossDefeatedThisStage) {
            if (typeof spawnBoss === 'function') spawnBoss();
        } else {
            advanceStage();
        }
    }

    if (st.waveTimer <= 30 || st.enemies.length > 0) st.draftedThisBreather = false;

    if (st.screen === 'playing' && st.pendingUpgrades > 0 && st.enemies.length === 0 && !st.bossActive && !st.stageClearing && !st.draftedThisBreather) {
        if (st.waveTimer > 30 && st.bossIntroTimer <= 0) {
            st.draftedThisBreather = true;
            triggerUpgradeDraft();
        }
    }
    
    if (st.health <= 0) {
        st.screen = 'gameover';
        if (HUD.finalStage) HUD.finalStage.innerText = `STAGE REACHED: ${st.currentStage}`;
        let title = "SURVIVOR ROUTE";
        if (st.orbCounts.speed === 3) title = "VELOCITY ROUTE";
        else if (st.orbCounts.power === 3) title = "TYRANT ROUTE";
        else if (st.orbCounts.technique === 3) title = "PHANTOM ROUTE";
        
        const runTitle = document.getElementById('run-title-ui');
        if (runTitle) runTitle.innerText = `"${title}"`;
        const runMode = document.getElementById('run-mode-ui');
        if (runMode) runMode.innerText = st.dailyMode ? `DAILY CHALLENGE \u00b7 ${st.dailyDateKey}` : '';

        let score = (st.statTotalKills * 10) + (st.statMaxCombo * 50) + (st.statTotalSlips * 250) + (st.statBossKills * 250) + (st.statCounterHits * 200) + (st.statBossBreaks * 350) - (st.statRecoilTaken * 150) - (st.statDespDamage * 200);
        let grade = 'C';
        if (score > 3000) grade = 'S'; else if (score > 1500) grade = 'A'; else if (score > 800) grade = 'B';
        
        let reqSlipsForS = Math.min(st.statBossKills, 3);
        if (reqSlipsForS === 0) reqSlipsForS = 1;
        if (grade === 'S' && st.statTotalSlips < reqSlipsForS) grade = 'A';
        if (grade === 'A' && st.statTotalSlips < 1) grade = 'B';

        const statGrade = document.getElementById('stat-grade');
        if (statGrade) {
            statGrade.innerText = grade;
            if (grade === 'S') statGrade.className = "stat-val text-5xl ml-2 text-yellow-400";
            else if (grade === 'A') statGrade.className = "stat-val text-5xl ml-2 text-pink-500";
            else statGrade.className = "stat-val text-5xl ml-2 text-cyan-400";
        }

        const scCombo = document.getElementById('stat-combo'); if (scCombo) scCombo.innerText = st.statMaxCombo;
        const scSlips = document.getElementById('stat-slips'); if (scSlips) scSlips.innerText = st.statTotalSlips;
        const scKills = document.getElementById('stat-kills'); if (scKills) scKills.innerText = st.statTotalKills;
        const scBosses = document.getElementById('stat-bosses'); if (scBosses) scBosses.innerText = st.statBossKills;
        const scBuild = document.getElementById('stat-build'); if (scBuild) scBuild.innerText = `FINAL BUILD: SPD ${st.orbCounts.speed} | PWR ${st.orbCounts.power} | TEC ${st.orbCounts.technique}`;
        const scScore = document.getElementById('stat-score'); if (scScore) scScore.innerText = Math.max(0, score).toLocaleString();

        const runResult = commitRun(Math.max(0, score), grade, st.currentStage);

        // RETENTION: commit to the local leaderboard + lifetime stats and grant any
        // grade-keyed cosmetics this run earned. The per-run boss streak is simply
        // the number of bosses cleared in a row this run (a loss ends the run).
        const rec = commitRunRecord({ score: Math.max(0, score), grade, stage: st.currentStage, daily: st.dailyMode, bossKills: st.statBossKills });

        // ONLINE: submit to the global leaderboard, fire-and-forget. Gated twice —
        // (1) the player must have opted in (default OFF; nothing is uploaded until
        // they say so), and (2) the run must clear a quality floor, so stage-1 deaths
        // and 0-score quits stay local instead of spamming the global board.
        // Offline / paused backend still degrades silently to local-only.
        const submittable = { name: getAlias(), score: Math.max(0, score), grade, stage: st.currentStage, daily: st.dailyMode, dateKey: st.dailyDateKey };
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
    
    st.health = Math.round(st.health);
    if (typeof updateHUD === 'function') updateHUD(); 
    // Footwork has no dummy gate, and a toast here turned out to be too easy to
    // miss entirely during real play — a full modal, same as every other Stage 1
    // lesson, guarantees it's actually seen rather than optimistically glimpsed.
    if (!st.seenTutorials.footwork_tip && st.currentStage === 1 && st.enemies.length === 0 &&
        (!st.tutorialEnabled || st.spawnTotal >= 5)) {
        triggerTutorial('footwork_tip', 'FOOTWORK', 'You are not locked to one spot.<br><br>Hold <span class="text-cyan-400 font-bold">[RIGHT]</span> to press forward &mdash; you reach enemies sooner and can interrupt a windup before it becomes a threat, but more of them converge on you at once.<br><br>Hold <span class="text-cyan-400 font-bold">[LEFT]</span> past the initial Ghost Step burst to give ground &mdash; buys you time, at the cost of tempo.<br><br><i>Let go of both and you drift back to a neutral stance on your own.</i>');
    }

    spawnEnemy();
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

function loop() { pollGamepad(); update(); draw(); st.lastKeys = { ...st.keys }; requestAnimationFrame(loop); }
function init() { st.width = 1000; st.height = 600; if(canvas) { canvas.width = st.width; canvas.height = st.height; } resetGame(); initAtmosphere(); fitViewport(); renderBest(); applyStrikerColor(); loop(); }
init();