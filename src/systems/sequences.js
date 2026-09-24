import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { reducedMotion } from './settings.js';

// v16 STAGE TRANSITIONS: no hard cuts. Tints FADE between colours instead of
// snapping; text sits on a translucent band over the live arena; and a stage
// change is staged as walk-out -> neon light sweep (palette morph) -> cards ->
// walk-in. Step types:
//   tint    { color, duration }           fade the overlay to `color`
//   text    { title, subtitle, duration } a title card on a band
//   walkout { duration }                  the Striker walks off the right edge
//   sweep   { duration }                  light band crosses; palette from->to
//   walkin  { duration }                  the Striker walks in from the left
//   call    { fn }                        run fn() and continue immediately
//   wager   {}                            wait for the pre-stage wager choice
//   resume  {}                            hand control back to gameplay
const Sequences = {
    stage1Intro: [
        { type: 'text', title: 'STAGE 1: SHATTERED CATHEDRAL', duration: 150 },
        { type: 'resume' }
    ]
};

const HOME_X = 180;
const FADE_FRAMES = 14;

function parseColor(c) {
    if (!c || c === 'transparent') return [0, 0, 0, 0];
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return [0, 0, 0, 0];
    const p = m[1].split(',').map(v => parseFloat(v));
    return [p[0] || 0, p[1] || 0, p[2] || 0, p[3] === undefined ? 1 : p[3]];
}
const colorStr = c => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${c[3].toFixed(3)})`;

export const SequenceManager = {
    active: false,
    currentSequence: null,
    stepIndex: 0,
    timer: 0,
    stepDuration: 0,
    waiting: false,
    overlayColor: 'transparent',
    overlayFrom: [0, 0, 0, 0],
    overlayTo: [0, 0, 0, 0],
    overlayNow: [0, 0, 0, 0],
    fadeT: 1,
    text: { title: '', subtitle: '', alpha: 0, age: 0 },
    walkFromX: HOME_X,

    play: function(seqId) {
        if (!Sequences[seqId]) return;
        this.playDynamic(Sequences[seqId].slice());
    },

    playDynamic: function(stepsArray) {
        this.active = true;
        this.waiting = false;
        this.currentSequence = stepsArray;
        this.stepIndex = 0;
        this.startStep();
    },

    // Insert steps right after the current one (used by the wager to add its
    // "accepted" card once the player has chosen).
    injectNext: function(steps) {
        if (!this.currentSequence) return;
        this.currentSequence.splice(this.stepIndex + 1, 0, ...steps);
    },

    // Called by the wager UI once the player has chosen.
    resumeFromWait: function() {
        if (!this.waiting) return;
        this.waiting = false;
        this.stepIndex++;
        this.startStep();
    },

    startStep: function() {
        // Instant steps (call / skipped wager) chain without spending a frame.
        for (let guard = 0; guard < 64; guard++) {
            if (!this.currentSequence || this.stepIndex >= this.currentSequence.length) {
                this.active = false;
                return;
            }
            const step = this.currentSequence[this.stepIndex];
            this.timer = step.duration || 0;
            this.stepDuration = this.timer;

            if (step.type === 'call') { try { step.fn && step.fn(); } catch (e) { console.warn(e); } this.stepIndex++; continue; }
            if (step.type === 'wager') {
                if (st.wagerOffer && typeof window !== 'undefined' && window.engineShowWager) {
                    this.waiting = true;
                    window.engineShowWager();
                    return;
                }
                this.stepIndex++; continue;
            }
            if (step.type === 'tint') {
                this.overlayFrom = this.overlayNow.slice();
                this.overlayTo = parseColor(step.color);
                this.fadeT = 0;
                this.overlayColor = step.color;
            }
            if (step.type === 'text') {
                this.text = { title: step.title, subtitle: step.subtitle || '', alpha: 1, age: 0 };
            }
            if (step.type === 'walkout' && st.player) {
                this.walkFromX = st.player.x;
                st.player.state = 'idle'; st.player.walking = true;
            }
            if (step.type === 'walkin' && st.player) {
                st.player.x = -80; st.player.walking = true;
                st.player.lane = 1; st.player.y = st.height * CONSTANTS.LANE_Y[1];
            }
            if (step.type === 'sweep') { st.lightSweep = 0; st.paletteT = 0; }
            if (step.type === 'resume') {
                this.active = false;
                this.overlayColor = 'transparent';
                this.overlayNow = [0, 0, 0, 0]; this.overlayTo = [0, 0, 0, 0];
                this.text.alpha = 0;
                st.lightSweep = -1; st.paletteT = 1;
                if (st.player) { st.player.walking = false; if (st.player.x < 0 || st.player.x > st.width) st.player.x = HOME_X; }
                return;
            }
            return;
        }
    },

    update: function() {
        if (!this.active || this.waiting) return;
        const step = this.currentSequence && this.currentSequence[this.stepIndex];

        // Overlay fade runs across steps (a tint keeps easing while text shows).
        if (this.fadeT < 1) {
            this.fadeT = Math.min(1, this.fadeT + 1 / (reducedMotion() ? 6 : FADE_FRAMES));
            for (let i = 0; i < 4; i++) this.overlayNow[i] = this.overlayFrom[i] + (this.overlayTo[i] - this.overlayFrom[i]) * this.fadeT;
        }

        if (step && this.stepDuration > 0) {
            const k = 1 - this.timer / this.stepDuration; // 0 -> 1 across the step
            const ease = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, k));
            if (step.type === 'walkout' && st.player) {
                st.player.x = this.walkFromX + (st.width + 120 - this.walkFromX) * ease;
                st.player.y += ((st.height * CONSTANTS.LANE_Y[1]) - st.player.y) * 0.1;
            } else if (step.type === 'walkin' && st.player) {
                st.player.x = -80 + (HOME_X + 80) * ease;
            } else if (step.type === 'sweep') {
                st.lightSweep = k;
                st.paletteT = ease;
            }
        }
        if (step && step.type === 'text') this.text.age++;

        if (this.timer > 0) {
            this.timer--;
            if (this.timer < 30 && this.text.alpha > 0 && step && step.type === 'text') {
                this.text.alpha = Math.max(0, this.text.alpha - 0.05);
            }
            if (this.timer <= 0) {
                if (step && step.type === 'sweep') { st.lightSweep = -1; st.paletteT = 1; }
                if (step && (step.type === 'walkout' || step.type === 'walkin') && st.player) st.player.walking = false;
                this.stepIndex++;
                this.startStep();
            }
        }
    },

    draw: function(ctx, w, h) {
        if (!this.active) return;

        if (this.overlayNow[3] > 0.002) {
            ctx.fillStyle = colorStr(this.overlayNow);
            ctx.fillRect(0, 0, w, h);
        }

        if (this.text.alpha > 0 && this.text.title) {
            const a = this.text.alpha;
            const inT = Math.min(1, this.text.age / 12);
            const slide = reducedMotion() ? 0 : (1 - inT) * 60;
            ctx.save();
            // Translucent band over the live arena (was a near-opaque full-screen tint).
            const bandH = this.text.subtitle ? 110 : 80;
            const bg = ctx.createLinearGradient(0, 0, w, 0);
            bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(0.2, `rgba(0,0,0,${0.72 * a * inT})`);
            bg.addColorStop(0.8, `rgba(0,0,0,${0.72 * a * inT})`); bg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = bg; ctx.fillRect(0, h / 2 - bandH / 2 - 14, w, bandH);
            ctx.fillStyle = `rgba(0, 255, 255, ${0.6 * a * inT})`;
            ctx.fillRect(w * 0.2, h / 2 - bandH / 2 - 14, w * 0.6 * inT, 2);
            ctx.fillRect(w * 0.8 - w * 0.6 * inT, h / 2 + bandH / 2 - 14, w * 0.6 * inT, 2);

            ctx.fillStyle = `rgba(255, 255, 255, ${a * inT})`;
            ctx.textAlign = 'center';
            ctx.font = '900 italic 40px Orbitron';
            ctx.fillText(this.text.title, w / 2 + slide, h / 2 - 10);

            if (this.text.subtitle) {
                ctx.fillStyle = `rgba(0, 255, 255, ${a * inT})`;
                ctx.font = 'bold 20px Orbitron';
                ctx.fillText(this.text.subtitle, w / 2 - slide, h / 2 + 30);
            }
            ctx.restore();
        }
    }
};
