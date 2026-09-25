// ==========================================
// v17 TEN-COUNT (player only)
// At 0 HP the Striker goes DOWN instead of out — once per arc. The ref counts to
// ten; clear 3-5 lane prompts (UP/DOWN, on the Finisher's beat-ring language)
// before ten and you get up at 50% HP with a short grace period. Combo resets. A
// miss doesn't reset progress — that prompt just comes round again on the next
// beat, costing you count. A second knockdown in the same arc ends the run.
// Bosses never get a count. The world is frozen while you're down.
// ==========================================
import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { playSound } from '../vfx_audio/audio.js';
import { spawnFloatingText, doFlash, triggerShockwave } from '../vfx_audio/effects.js';
import { getBinds } from './settings.js';
import { tmKnockdown } from './telemetry.js';

const K = CONSTANTS.KNOCKDOWN;

export function canBeKnockedDown() {
    return (st.knockdownsThisArc || 0) === 0;
}

// PURE-ish: a lane-prompt sequence (no two identical in a row reads as a stumble).
export function knockdownSequence(n, rnd = Math.random) {
    const seq = [];
    for (let i = 0; i < n; i++) {
        let m = rnd() < 0.5 ? 'up' : 'down';
        if (i > 0 && m === seq[i - 1] && rnd() < 0.6) m = m === 'up' ? 'down' : 'up';
        seq.push(m);
    }
    return seq;
}

export function startKnockdown() {
    const arc = Math.min(CONSTANTS.getArcIndex(st.currentStage), 5);
    const n = K.promptsByArc[arc] || 3;
    st.knockdown = {
        frame: 0, count: 0, seq: knockdownSequence(n), idx: 0,
        nextBeat: K.framesPerCount + K.beatFrames, phase: 'down', fall: 0,
        judge: null, judgeTimer: 0, upTimer: 0, perfects: 0, goods: 0, stumbles: 0, hpFrac: 0
    };
    st.knockdownsThisArc = (st.knockdownsThisArc || 0) + 1;
    st.statKnockdowns = (st.statKnockdowns || 0) + 1;
    tmKnockdown();
    st.health = 0;
    st.combo = 0;
    st.isInstinct = false; st.zoneTimer = 0;
    const p = st.player;
    p.state = 'down'; p.charging = false; p.inputBuffer = null; p.movementBuffer = null;
    st.shake = 30; doFlash(0.6); playSound('knockdown');
    spawnFloatingText(p.x + 20, p.y - 150, 'KNOCKDOWN!', '#ff3355');
}

function justPressed(code) { return !!st.keys[code] && !st.lastKeys[code]; }
function readLaneInput() {
    const B = getBinds();
    if (justPressed(B.up) || st.pad.up) return 'up';
    if (justPressed(B.down) || st.pad.down) return 'down';
    // any other action button counts as a wrong read (mashing)
    if (justPressed(B.jab) || justPressed(B.cross) || justPressed(B.hook) || st.pad.jab || st.pad.cross || st.pad.hook) return 'other';
    return null;
}

function judge(text, color) { const k = st.knockdown; k.judge = { text, color }; k.judgeTimer = 26; }

// PURE: recovery HP fraction from how the prompts were hit. All PERFECT -> 75%,
// all merely on time -> 55%, stumbles drag it down toward the 20% floor.
export function recoveryHpFrac({ perfects = 0, goods = 0, stumbles = 0, prompts = 3 }) {
    const quality = (perfects + goods * 0.6) / Math.max(1, prompts) - stumbles * 0.1;
    return Math.min(K.hpMax, Math.max(K.hpMin, K.hpBase + K.hpSpan * quality));
}

function getUp() {
    const k = st.knockdown, p = st.player;
    k.phase = 'up'; k.upTimer = 50;
    k.hpFrac = recoveryHpFrac({ perfects: k.perfects, goods: k.goods, stumbles: k.stumbles, prompts: k.seq.length });
    st.health = Math.round(st.maxHealth * k.hpFrac);
    st.combo = 0;
    p.invuln = K.invulnFrames;
    st.inputGrace = 8; // the last get-up press doesn't also slip you
    // Breathing room: whatever was standing over you steps back and re-winds.
    for (const en of st.enemies) {
        if (Math.abs(en.x - p.x) < 220) { en.x = Math.max(en.x, p.x + 180); en.attackCooldown = Math.max(en.attackCooldown, en.maxCooldown || 60); en.telegraphed = false; en.stringIdx = 0; }
    }
    st.hazards = [];
    playSound('stagger'); doFlash(0.4); triggerShockwave(p.x + 25, p.y - 60, '#ffffff');
    spawnFloatingText(p.x + 20, p.y - 160, `BACK UP · ${Math.round(k.hpFrac * 100)}% HP`, k.hpFrac >= 0.7 ? '#facc15' : '#22d3ee');
}

// Returns 'down' while counting, 'up' once risen, 'out' if the count reached ten.
export function updateKnockdown() {
    const k = st.knockdown;
    if (!k) return null;
    k.frame++;
    if (k.judgeTimer > 0) k.judgeTimer--;

    if (k.phase === 'up') {
        k.fall = Math.max(0, k.fall - 0.06);
        if (--k.upTimer <= 0) { st.player.state = 'idle'; st.knockdown = null; return 'up'; }
        return 'down';
    }
    k.fall = Math.min(1, k.fall + 0.12);

    // the ref's count
    if (k.frame % K.framesPerCount === 0) {
        k.count++;
        playSound(k.count >= 8 ? 'ref_count_hi' : 'ref_count');
        if (k.count >= 10) { k.phase = 'out'; playSound('bell'); return 'out'; }
    }

    // the get-up prompts
    const t = k.frame - k.nextBeat;
    if (t >= -K.beatFrames) {
        const input = readLaneInput();
        const want = k.seq[k.idx];
        const advance = () => { k.nextBeat += K.beatFrames; };
        if (input) {
            if (t < -K.windowEarly || input !== want) { k.stumbles++; judge('STUMBLE', '#ff8800'); playSound('finisher_miss'); advance(); }
            else {
                const perfect = Math.abs(t) <= K.perfectWindow;
                if (perfect) k.perfects++; else k.goods++;
                judge(perfect ? 'PERFECT' : 'UP!', perfect ? '#ffffff' : '#22d3ee'); playSound('perfect_slip');
                k.idx++;
                if (k.idx >= k.seq.length) { getUp(); return 'down'; }
                advance();
            }
        } else if (t > K.windowLate) { k.stumbles++; judge('TOO SLOW', '#ff8800'); advance(); }
    }
    return 'down';
}

export function knockdownPrompt() {
    const k = st.knockdown;
    if (!k || k.phase !== 'down') return null;
    const t = k.frame - k.nextBeat;
    if (t < -K.beatFrames) return null;
    return { move: k.seq[k.idx], progress: Math.min(1.2, Math.max(0, (t + K.beatFrames) / K.beatFrames)), t };
}
