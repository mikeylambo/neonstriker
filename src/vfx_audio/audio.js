import { gameState as st } from '../state.js';
import { getSettings, onSettingsChange } from '../systems/settings.js';

// v16 bus layout: every voice routes through sfx/music buses into a master bus,
// so the pause-menu volume sliders (and [M] mute) act on one node each instead of
// on every individual oscillator.
const bus = { master: null, sfx: null, music: null };

function applyBusLevels() {
    if (!bus.master) return;
    const s = getSettings();
    const t = st.audioCtx.currentTime;
    try {
        bus.master.gain.setValueAtTime(st.audioMuted ? 0 : s.masterVolume, t);
        bus.sfx.gain.setValueAtTime(s.sfxVolume, t);
        bus.music.gain.setValueAtTime(s.musicVolume * music.duck, t);
    } catch (e) {}
}
onSettingsChange(applyBusLevels);

export function initAudio() {
    if (st.audioMuted) return;
    if (!st.audioCtx) {
        st.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        st.audioEnabled = true;
        try {
            bus.master = st.audioCtx.createGain(); bus.master.connect(st.audioCtx.destination);
            bus.sfx = st.audioCtx.createGain(); bus.sfx.connect(bus.master);
            bus.music = st.audioCtx.createGain(); bus.music.connect(bus.master);
        } catch (e) { bus.master = bus.sfx = bus.music = null; }
        applyBusLevels();
    }
    if (st.audioCtx.state === 'suspended') st.audioCtx.resume();
}

export function refreshAudioLevels() { applyBusLevels(); }

function sfxOut() { return bus.sfx || st.audioCtx.destination; }

function tone(type, f1, f2, t, v1, v2, delay = 0) {
    const osc = st.audioCtx.createOscillator();
    const gain = st.audioCtx.createGain();
    const now = st.audioCtx.currentTime + delay;
    osc.connect(gain); gain.connect(sfxOut());
    osc.type = type; osc.frequency.setValueAtTime(f1, now); osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), now + t);
    gain.gain.setValueAtTime(v1, now); gain.gain.exponentialRampToValueAtTime(Math.max(0.001, v2), now + t);
    osc.start(now); osc.stop(now + t);
}

// Short ascending arpeggios used as identity "stings" (upgrade vignette, rare
// card reveals, finisher cues). Notes are semitone offsets from `root`.
const STINGS = {
    sting_orb:      { root: 440, notes: [0, 7, 12],          wave: 'triangle', step: 0.06, len: 0.18, vol: 0.12 },
    sting_mastery:  { root: 392, notes: [0, 4, 7, 11, 14],   wave: 'triangle', step: 0.055, len: 0.22, vol: 0.13 },
    sting_fusion:   { root: 330, notes: [0, 7, 12, 16, 19, 24], wave: 'sawtooth', step: 0.05, len: 0.3, vol: 0.09 },
    sting_overclock:{ root: 523, notes: [0, 12],             wave: 'square',   step: 0.07, len: 0.12, vol: 0.06 },
    stagger:        { root: 110, notes: [0, -5, -12],         wave: 'sawtooth', step: 0.08, len: 0.35, vol: 0.14 },
    finisher_ko:    { root: 220, notes: [0, 7, 12, 19, 24, 31], wave: 'square', step: 0.045, len: 0.4, vol: 0.08 }
};

export function playSound(type) {
    if (!st.audioEnabled || st.audioMuted || !st.audioCtx) return;
    try {
        const sting = STINGS[type];
        if (sting) {
            sting.notes.forEach((n, i) => {
                const f = sting.root * Math.pow(2, n / 12);
                tone(sting.wave, f, f * 0.995, sting.len, sting.vol, 0.001, i * sting.step);
            });
            return;
        }
        let t = 0.15, f1 = 100, f2 = 40, v1 = 0.2, v2 = 0.01, sq = 'square';
        if (type === 'jab_tell') { sq = 'sine'; f1 = 1200; f2 = 800; t = 0.05; v1 = 0.1; }
        else if (type === 'bash_tell') { sq = 'sawtooth'; f1 = 150; f2 = 50; t = 0.3; }
        else if (type === 'feint_tell') { sq = 'triangle'; f1 = 400; f2 = 1200; t = 0.2; v1 = 0.1; v2 = 0; }
        else if (type === 'slip') { sq = 'sine'; f1 = 600; f2 = 150; t = 0.1; v1 = 0.05; }
        else if (type === 'perfect_slip') { f1 = 1200; f2 = 300; }
        else if (type === 'ghost_step') { sq = 'sawtooth'; f1 = 300; f2 = 50; v1 = 0.1; }
        else if (type === 'bounce') { sq = 'triangle'; f1 = 200; f2 = 100; v1 = 0.1; }
        else if (type === 'laser') { sq = 'sawtooth'; f1 = 800; f2 = 100; t = 0.3; }
        else if (type === 'shatter') { f1 = 8000; f2 = 100; t = 0.25; v1 = 0.3; }
        else if (type === 'hit') { f1 = 200; f2 = 50; v1 = 0.3; }
        // v20 punch weight: a jab ticks, a hook thumps, a cross booms, a counter cracks.
        else if (type === 'hit_jab') { f1 = 320; f2 = 120; t = 0.07; v1 = 0.18; }
        else if (type === 'hit_hook') { tone('square', 180, 45, 0.16, 0.28, 0.01); tone('triangle', 900, 300, 0.05, 0.06, 0.001); return; }
        else if (type === 'hit_cross') { tone('square', 140, 32, 0.24, 0.34, 0.01); tone('sine', 70, 30, 0.3, 0.3, 0.01); return; }
        else if (type === 'counter_hit') { tone('sawtooth', 3200, 400, 0.12, 0.16, 0.001); tone('square', 110, 28, 0.4, 0.38, 0.01); tone('sine', 55, 25, 0.5, 0.35, 0.01); return; }
        else if (type === 'beat_tick') { sq = 'sine'; f1 = 1760; f2 = 1500; t = 0.04; v1 = 0.07; }
        else if (type === 'finisher_hit') { tone('square', 90, 30, 0.28, 0.35, 0.01); tone('sawtooth', 2400, 200, 0.18, 0.12, 0.001); return; }
        else if (type === 'finisher_miss') { sq = 'triangle'; f1 = 300; f2 = 90; t = 0.3; v1 = 0.12; }
        else if (type === 'punish') { sq = 'triangle'; f1 = 900; f2 = 1400; t = 0.08; v1 = 0.08; }
        else if (type === 'wager') { tone('triangle', 660, 660, 0.1, 0.1, 0.001); tone('triangle', 990, 990, 0.16, 0.1, 0.001, 0.08); return; }
        else if (type === 'sweep') { sq = 'sine'; f1 = 220; f2 = 1760; t = 0.6; v1 = 0.05; v2 = 0.001; }
        // ---- v17 ----
        else if (type === 'bell') { // ring bell: inharmonic partials, two strikes
            for (const at of [0, 0.32]) [[880, 0.16], [2270, 0.07], [3990, 0.04], [5390, 0.025]].forEach(([f, v]) => tone('sine', f, f * 0.998, 1.4, v, 0.0005, at));
            return;
        }
        else if (type === 'ref_count') { sq = 'triangle'; f1 = 330; f2 = 320; t = 0.12; v1 = 0.12; }
        else if (type === 'ref_count_hi') { sq = 'triangle'; f1 = 520; f2 = 500; t = 0.14; v1 = 0.16; }
        else if (type === 'knockdown') { tone('square', 120, 30, 0.6, 0.3, 0.01); tone('sine', 60, 25, 0.8, 0.4, 0.01); return; }
        else if (type === 'shock') { tone('sawtooth', 1200, 90, 0.35, 0.12, 0.001); tone('square', 60, 58, 0.35, 0.1, 0.01); return; }
        else if (type === 'zone') { tone('sine', 110, 55, 1.2, 0.25, 0.001); tone('triangle', 1760, 440, 0.8, 0.06, 0.001); return; }
        else if (type === 'charge_ready') { sq = 'triangle'; f1 = 700; f2 = 1400; t = 0.12; v1 = 0.08; }
        else if (type === 'orb') { sq = 'sine'; f1 = 1500 + Math.random() * 300; f2 = 2400; t = 0.08; v1 = 0.04; v2 = 0.001; }
        tone(sq, f1, f2, t, v1, v2);
    } catch (e) { /* audio is never allowed to crash the game */ }
}

// ==========================================
// MUSIC BED — a small procedural loop (kick / bass / hats) scheduled ahead on the
// audio clock. Exists so the Music volume slider controls something real, and so
// the Finisher's beat grid has a pulse under it. Intensity 1 adds 16th hats + an
// arp layer (boss fights). Fully guarded: any missing Web Audio feature = silence.
// ==========================================
const music = { timer: null, nextTime: 0, step: 0, bpm: 116, intensity: 0, duck: 1, noise: null };
const BASS = [0, 0, 12, 0, 3, 0, 10, 7]; // A minor-ish walk, semitones from A1
const ARP = [12, 15, 19, 24, 19, 15, 12, 7];

function noiseBuffer() {
    if (music.noise) return music.noise;
    const ctx = st.audioCtx, len = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    music.noise = buf; return buf;
}

function scheduleStep(time) {
    const ctx = st.audioCtx, out = bus.music;
    const s = music.step % 16;
    const voice = (type, f1, f2, dur, vol) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f1, time); o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), time + dur);
        g.gain.setValueAtTime(vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + dur);
        o.connect(g); g.connect(out); o.start(time); o.stop(time + dur + 0.02);
    };
    if (s % 4 === 0) voice('sine', 150, 42, 0.22, 0.5);                        // kick
    if (s % 2 === 0) {                                                         // bass (8ths)
        const f = 55 * Math.pow(2, BASS[(s / 2) % BASS.length] / 12);
        voice('sawtooth', f, f, 0.16, 0.09);
    }
    const hat = music.intensity > 0 ? true : (s % 4 === 2);                    // hats
    if (hat) {
        const src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = noiseBuffer(); hp.type = 'highpass'; hp.frequency.value = 7000;
        g.gain.setValueAtTime(s % 4 === 2 ? 0.08 : 0.035, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        src.connect(hp); hp.connect(g); g.connect(out); src.start(time); src.stop(time + 0.05);
    }
    if (music.intensity > 0 && s % 2 === 1) {                                 // boss arp
        const f = 220 * Math.pow(2, ARP[((s - 1) / 2) % ARP.length] / 12);
        voice('square', f, f, 0.08, 0.025);
    }
}

function tick() {
    if (!st.audioCtx || !bus.music) return;
    const ctx = st.audioCtx, stepDur = 60 / music.bpm / 4;
    if (music.nextTime < ctx.currentTime) music.nextTime = ctx.currentTime + 0.05;
    while (music.nextTime < ctx.currentTime + 0.2) {
        try { scheduleStep(music.nextTime); } catch (e) { stopMusic(); return; }
        music.nextTime += stepDur; music.step++;
    }
}

export function startMusic() {
    if (music.timer || !st.audioCtx || !bus.music || typeof setInterval !== 'function') return;
    if (typeof st.audioCtx.createBuffer !== 'function' || typeof st.audioCtx.createBiquadFilter !== 'function') return;
    if (typeof st.audioCtx.currentTime !== 'number' || typeof st.audioCtx.sampleRate !== 'number') return;
    music.nextTime = 0; music.step = 0;
    music.timer = setInterval(tick, 50);
}

export function stopMusic() {
    if (music.timer) { clearInterval(music.timer); music.timer = null; }
}

export function setMusicIntensity(level) { music.intensity = level ? 1 : 0; }

// Menus / pause sit the loop underneath the UI instead of stopping it cold.
export function duckMusic(on) { music.duck = on ? 0.3 : 1; applyBusLevels(); }
