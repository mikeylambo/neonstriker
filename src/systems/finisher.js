// ==========================================
// BOSS STAGGER + FINISHER (v16)
// Raw hits deal full damage. When a hit would carry a boss across 66% or 33% HP,
// the damage stops exactly at the line and the boss STAGGERS into an authored
// Finisher: the world drops into slow-mo, the camera pushes in, and a unique
// 4-6 prompt sequence plays on a fixed beat grid. Each landed prompt is a heavy
// hit (hit-stop, shatter, shockwave). A wrong key, a press far ahead of the beat
// (mashing) or no press at all ends the stagger early — no extra penalty. The
// blow that would kill the boss opens a final KO Finisher; the boss goes down at
// the end of it whether or not every prompt lands.
// This module never imports combat/enemies/bosses — they import it.
// ==========================================
import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { playSound } from '../vfx_audio/audio.js';
import { spawnFloatingText, createShatter, createImpact, triggerShockwave, doFlash } from '../vfx_audio/effects.js';
import { addScore } from './score.js';
import { hitStopEnabled, reducedMotion, getBinds } from './settings.js';

const F = CONSTANTS.FINISHER;
const LANE_STEP = { up: -1, down: 1 };
export const FINISHER_INPUTS = ['up', 'down', 'jab', 'cross', 'hook'];

export function finisherSequence(controller, kind) {
    const set = F.sequences[controller] || F.sequences.neon_enforcer;
    return set[kind] || set.break1;
}

// PURE: does a sequence's UP/DOWN path stay inside the three lanes when it starts
// from the MID lane? (Every authored sequence must — the harness checks them all.)
export function laneValid(seq, start = 1) {
    let lane = start;
    for (const p of seq) {
        if (p in LANE_STEP) { lane += LANE_STEP[p]; if (lane < 0 || lane > 2) return false; }
    }
    return true;
}

// Called with a pending hit's damage BEFORE it is applied to a boss. Returns the
// damage that should actually land. Crossing a threshold clamps the hit to the
// line and queues that threshold's finisher; a lethal hit leaves 1 HP and queues
// the KO finisher. The queued finisher starts from updateBosses() this frame.
export function gateBossDamage(en, dmg) {
    if (!en || !en.isBoss || en.koDone || st.finisher || en.pendingFinisher) return dmg;
    const stage = en.finisherStage || 0;
    if (stage < F.thresholds.length) {
        const line = en.maxHp * F.thresholds[stage];
        if (en.hp - dmg <= line) {
            en.finisherStage = stage + 1;
            en.pendingFinisher = 'break' + (stage + 1);
            return Math.max(0, en.hp - line);
        }
    }
    if (en.hp - dmg <= 0) {
        en.pendingFinisher = 'ko';
        return Math.max(0, en.hp - 1);
    }
    return dmg;
}

// Safety net for damage that doesn't come through a punch (e.g. Power-3 bowling
// collateral). Same thresholds, no clamp — just never let one be skipped.
export function checkBossThresholds(en) {
    if (!en || !en.isBoss || en.koDone || st.finisher || en.pendingFinisher) return;
    const stage = en.finisherStage || 0;
    if (en.hp <= 0) { en.hp = 1; en.pendingFinisher = 'ko'; return; }
    if (stage < F.thresholds.length && en.hp <= en.maxHp * F.thresholds[stage]) {
        en.finisherStage = stage + 1;
        en.pendingFinisher = 'break' + (stage + 1);
    }
}

export function startFinisher(en, kind) {
    const seq = finisherSequence(en.controller, kind).slice();
    let dmgPerHit = 0;
    if (kind !== 'ko') {
        // A fully-landed break finisher takes breakDamageFrac of max HP, but can
        // never carry the boss past the NEXT threshold (so no finisher is skipped).
        const nextStage = en.finisherStage || 0;
        const floorFrac = nextStage < F.thresholds.length ? F.thresholds[nextStage] + 0.02 : 0.02;
        const budget = Math.max(0, Math.min(en.maxHp * F.breakDamageFrac, en.hp - en.maxHp * floorFrac));
        dmgPerHit = budget / seq.length;
    }

    st.finisher = {
        boss: en, kind, seq, idx: 0, phase: 'intro', frame: 0, timer: F.introFrames,
        nextBeat: 0, hits: 0, perfects: 0, result: null, dmgPerHit,
        zoom: 1, bars: 0, freeze: 0, poseTimer: 0, judge: null, judgeTimer: 0, jabAlt: false
    };

    // Freeze the exchange into a clean tableau: striker mid lane, boss squared up.
    const p = st.player;
    p.state = 'idle'; p.punchTimer = 0; p.hitFrame = 0; p.inputBuffer = null; p.movementBuffer = null;
    p.lane = 1; p.x = Math.min(Math.max(p.x, 160), 300);
    en.lane = 1; en.x = p.x + 118; en.vx = 0; en.stun = 0;
    // v18 FIX: snap BOTH fighters onto the mid lane's line. The boss's drawn y used
    // to stay wherever it was (enemy movement is frozen during a Finisher), so the
    // QTE could show the Striker and the boss in different lanes.
    const midY = st.height * CONSTANTS.LANE_Y[1];
    en.y = midY; p.y = midY;
    en.recoverTimer = 0; en.telegraphed = false; en.shiftWarning = 0; en.exposedTimer = 0;
    en.decoyTimer = 0; en.targetLanes = []; en.justAttacked = 0;
    st.hazards = []; st.liveLanes = [];
    st.hitstop = 0;

    const label = kind === 'ko' ? 'FINAL BLOW' : 'STAGGERED!';
    spawnFloatingText(en.x + en.w / 2, en.y - 190, label, kind === 'ko' ? '#ff0055' : '#ffffff');
    playSound('stagger');
    doFlash(kind === 'ko' ? 0.7 : 0.5);
    triggerShockwave(en.x, en.y - 60, st.bossThemeColor || '#ffffff');
    createShatter(en.x, en.y - 60, st.bossThemeColor || '#ffffff');
    st.shake = Math.max(st.shake, 20);
}

function justPressed(code) { return !!st.keys[code] && !st.lastKeys[code]; }

// One finisher-relevant input per frame (first wins), keyboard or pad.
export function readFinisherInput() {
    const K = getBinds();
    if (justPressed(K.up) || st.pad.up) return 'up';
    if (justPressed(K.down) || st.pad.down) return 'down';
    if (justPressed(K.jab) || st.pad.jab) return 'jab';
    if (justPressed(K.cross) || st.pad.cross) return 'cross';
    if (justPressed(K.hook) || st.pad.hook) return 'hook';
    return null;
}

const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

function judge(text, color) {
    const f = st.finisher;
    f.judge = { text, color }; f.judgeTimer = 34;
}

function landPrompt(isPerfect) {
    const f = st.finisher, en = f.boss, p = st.player;
    const move = f.seq[f.idx];

    if (move in LANE_STEP) {
        // Slip into the new lane; the staggered boss is dragged along with you.
        const old = { x: en.x, y: en.y };
        p.lane += LANE_STEP[move]; p.slipCooldown = 20;
        en.lane = p.lane; // both glide to the new lane together (see updateFinisher)
        createShatter(old.x, old.y - 60, st.bossThemeColor || '#ffffff');
        p.state = 'punching'; p.punchType = 'cross'; p.hitFrame = 0; p.didHit = true;
    } else {
        p.state = 'punching';
        p.punchType = move === 'jab' ? ((f.jabAlt = !f.jabAlt) ? 'jab1' : 'jab2') : move;
        p.hitFrame = 0; p.didHit = true;
    }
    f.poseTimer = 12;

    if (f.kind !== 'ko') en.hp = Math.max(1, en.hp - f.dmgPerHit);
    f.hits++; st.statFinisherHits = (st.statFinisherHits || 0) + 1;
    if (isPerfect) f.perfects++;

    st.combo++; if (st.combo > st.statMaxCombo) st.statMaxCombo = st.combo;
    addScore(CONSTANTS.SCORE.finisherHit + (isPerfect ? CONSTANTS.SCORE.finisherPerfect : 0), en.x + en.w / 2, en.y - 150, { big: true });
    judge(isPerfect ? 'PERFECT' : 'GREAT', isPerfect ? '#ffffff' : '#22d3ee');

    playSound('finisher_hit');
    doFlash(isPerfect ? 0.45 : 0.3);
    st.shake = Math.max(st.shake, isPerfect ? 26 : 18);
    triggerShockwave(en.x, en.y - 60, isPerfect ? '#ffffff' : (st.bossThemeColor || '#ff0055'));
    createShatter(en.x, en.y - 70, isPerfect ? '#ffffff' : (st.bossThemeColor || '#ff0055'));
    for (let i = 0; i < 3; i++) createImpact(en.x, en.y - 60 - i * 20, '#ffffff');
    if (en.controller === 'live_wire') { // his own current arcs off every blow
        createImpact(en.x + 30, en.y - 80, '#fff36b'); createImpact(en.x + 10, en.y - 40, '#fff36b');
        playSound('shock');
    }
    // Hit-stop inside a finisher freezes the PICTURE, never the beat clock — the
    // rhythm grid has to stay honest or the next prompt would drift.
    f.freeze = hitStopEnabled() ? (isPerfect ? 9 : 6) : 0;

    f.idx++;
    if (f.idx >= f.seq.length) endPrompts('clean');
    else f.nextBeat += F.beatFrames;
}

function missPrompt(reason) {
    judge(reason, '#ff8800');
    playSound('finisher_miss');
    endPrompts('broken');
}

function endPrompts(result) {
    const f = st.finisher;
    f.result = result; f.phase = 'outro'; f.timer = F.outroFrames;
    const en = f.boss;
    if (result === 'clean') {
        st.statFinishersClean = (st.statFinishersClean || 0) + 1;
        addScore(CONSTANTS.SCORE.finisherClean, en.x + en.w / 2, en.y - 210, { big: true });
        spawnFloatingText(en.x + en.w / 2, en.y - 230, f.kind === 'ko' ? 'FLAWLESS FINISH' : 'FULL BREAK!', '#facc15');
    } else if (f.kind !== 'ko') {
        spawnFloatingText(en.x + en.w / 2, en.y - 230, 'STAGGER BROKEN', '#ff8800');
    }
    if (f.kind === 'ko') {
        playSound('finisher_ko');
        doFlash(0.8);
        st.shake = Math.max(st.shake, 40);
        for (let i = 0; i < 3; i++) triggerShockwave(en.x, en.y - 60 - i * 10, i === 1 ? '#ffffff' : (st.bossThemeColor || '#ff0055'));
        spawnFloatingText(en.x + en.w / 2, en.y - 260, 'K.O.', '#ffffff');
    }
}

function finishFinisher() {
    const f = st.finisher, en = f.boss, p = st.player;
    p.state = 'idle'; p.punchType = null;
    if (f.kind === 'ko') {
        en.koDone = true; en.hp = 0; // enemies.js resolves the defeat next frame
    } else {
        // The boss reels back and resets; you get a clean breath before its next
        // cycle (a full telegraph always precedes its next attack).
        en.x = Math.min(st.width - 150, en.x + 150);
        en.stun = 0; en.stunResist = 60; en.recoverTimer = 0; en.telegraphed = false;
        en.attackCooldown = (en.maxCooldown || 60) + 40;
        if (en.controller === 'static_monk') { en.currentMove = 'laser'; en.attackCooldown = 110; en.bossMashCount = 0; }
    }
    st.finisher = null;
    st.finisherZoom = 1;
}

// Runs INSTEAD of the normal simulation while a finisher is live (see main.js).
export function updateFinisher() {
    const f = st.finisher;
    if (!f) return;
    f.frame++;
    if (f.judgeTimer > 0) f.judgeTimer--;
    if (f.freeze > 0) f.freeze--;
    if (f.poseTimer > 0 && --f.poseTimer === 0) st.player.state = 'idle';
    st.player.y += ((st.height * CONSTANTS.LANE_Y[st.player.lane]) - st.player.y) * 0.35;
    f.boss.y += ((st.height * CONSTANTS.LANE_Y[f.boss.lane]) - f.boss.y) * 0.35; // same glide as the Striker
    if (st.player.slipCooldown > 0) st.player.slipCooldown--;

    if (f.phase === 'intro') {
        f.timer--;
        const k = ease(1 - f.timer / F.introFrames);
        f.zoom = 1 + (F.zoom - 1) * k; f.bars = k;
        if (f.timer <= 0) {
            f.phase = 'prompts';
            f.nextBeat = f.frame + F.beatFrames * F.leadBeats;
        }
    } else if (f.phase === 'prompts') {
        f.zoom = F.zoom; f.bars = 1;
        const t = f.frame - f.nextBeat;
        if (t === 0) playSound('beat_tick');
        const input = readFinisherInput();
        const want = f.seq[f.idx];
        if (input) {
            if (t < -F.windowEarly) missPrompt('TOO EARLY');
            else if (input !== want) missPrompt('WRONG MOVE');
            else landPrompt(Math.abs(t) <= F.perfectWindow);
        } else if (t > F.windowLate) {
            missPrompt('MISSED');
        }
    } else if (f.phase === 'outro') {
        f.timer--;
        const k = ease(f.timer / F.outroFrames);
        f.zoom = 1 + (F.zoom - 1) * k; f.bars = k;
        if (f.timer <= 0) { finishFinisher(); return; }
    }
    st.finisherZoom = reducedMotion() ? 1 : f.zoom;
}

// For the renderer: where the current prompt is on its approach to the beat.
// progress 0 = just appeared, 1 = on the beat.
export function promptProgress() {
    const f = st.finisher;
    if (!f || f.phase !== 'prompts') return null;
    const lead = F.beatFrames * F.leadBeats;
    const t = f.frame - f.nextBeat;
    return { move: f.seq[f.idx], progress: Math.min(1.2, Math.max(0, (t + lead) / lead)), t };
}
