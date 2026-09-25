// ==========================================
// ITEM 11 — ONBOARDING MOCKUP (NOT WIRED INTO PLAY)
// A prototype of in-world teaching prompts to replace the full-screen modals.
// It only draws when the debug hook sets st.onboardingMock (open the game with
// ?debug, then __ns.mockOnboarding('slip' | 'counter' | 'bruiser' | 'instinct'
// | 'footwork')). Nothing here runs in a normal game; the live tutorial still
// uses the existing modals until the design is signed off.
//
// Visual language: small dark callouts with a coloured edge, tethered to the
// thing they describe by a leader line; real key-caps drawn from the player's
// binds; a lesson rail under the HUD. The fight never stops — at most the world
// eases to 60% speed for a beat the first time a callout appears.
// ==========================================
import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { getBinds, keyLabel } from '../systems/settings.js';

const LESSONS = ['SLIP', 'COUNTER', 'ARMOR', 'GUARD', 'GHOST STEP'];

function keycap(ctx, x, y, label, color = '#22d3ee', pulse = 0) {
    ctx.save();
    ctx.font = '900 13px Orbitron';
    const w = Math.max(28, ctx.measureText(label).width + 16), h = 26;
    ctx.fillStyle = 'rgba(8,10,16,0.92)'; ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.shadowColor = color; ctx.shadowBlur = 8 + pulse * 10;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - h / 2, w, h, 5) : ctx.rect(x - w / 2, y - h / 2, w, h); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 1);
    ctx.restore();
    return w;
}

// A callout: title line + body lines, tethered to (ax, ay).
function callout(ctx, x, y, ax, ay, color, title, lines, keys = []) {
    ctx.save();
    // width = widest text line OR the key row, whichever is wider
    ctx.font = '900 13px Orbitron';
    let keysW = 0; keys.forEach(k => { keysW += Math.max(28, ctx.measureText(k.label).width + 16) + 8; });
    ctx.font = 'bold 10px Orbitron';
    keys.forEach(k => { if (k.after) keysW += ctx.measureText(k.after).width + 14; });
    ctx.font = 'bold 11px Orbitron';
    const w = Math.max(210, keysW + 28, ...lines.map(l => ctx.measureText(l).width + 28)), h = 34 + lines.length * 16 + (keys.length ? 34 : 0);
    // leader line
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(x + (ax < x ? 0 : w), y + h / 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(ax, ay, 4, 0, Math.PI * 2); ctx.fill();
    // panel
    ctx.fillStyle = 'rgba(6,8,14,0.9)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color; ctx.fillRect(x, y, 4, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'left'; ctx.fillStyle = color; ctx.font = '900 12px Orbitron';
    ctx.fillText(title, x + 14, y + 20);
    ctx.fillStyle = '#e5e7eb'; ctx.font = 'bold 11px Orbitron';
    lines.forEach((l, i) => ctx.fillText(l, x + 14, y + 38 + i * 16));
    let kx = x + 14;
    keys.forEach(k => {
        ctx.font = '900 13px Orbitron';
        const kw = Math.max(28, ctx.measureText(k.label).width + 16);
        keycap(ctx, kx + kw / 2, y + h - 20, k.label, k.color || color, k.pulse || 0);
        kx += kw + 8;
        if (k.after) { ctx.fillStyle = '#9ca3af'; ctx.font = 'bold 10px Orbitron'; ctx.textAlign = 'left'; ctx.fillText(k.after, kx, y + h - 16); kx += ctx.measureText(k.after).width + 14; }
    });
    ctx.restore();
}

function lessonRail(ctx, current) {
    ctx.save();
    const x0 = 22, y = 100;
    ctx.font = '900 9px Orbitron'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText('SPARRING', x0, y - 8);
    let x = x0;
    LESSONS.forEach((l, i) => {
        const done = i < current, cur = i === current;
        const label = (done ? '✓ ' : '') + l;
        const w = ctx.measureText(label).width + 16;
        ctx.fillStyle = done ? '#22d3ee' : (cur ? 'rgba(34,211,238,0.18)' : 'rgba(255,255,255,0.05)');
        ctx.fillRect(x, y, w, 16);
        if (cur) { ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, 16); }
        ctx.fillStyle = done ? '#000' : (cur ? '#22d3ee' : '#6b7280');
        ctx.fillText(label, x + 8, y + 11);
        x += w + 4;
    });
    ctx.restore();
}

export function drawOnboardingMock(ctx) {
    const scene = st.onboardingMock;
    if (!scene) return;
    const K = getBinds(), L = c => keyLabel(c);
    const p = st.player, t = Date.now(), pulse = 0.5 + 0.5 * Math.sin(t * 0.008);
    const en = st.enemies[0];
    ctx.save();
    if (scene === 'slip') {
        lessonRail(ctx, 0);
        const ex = en ? en.x + 25 : p.x + 200, ey = en ? en.y - 140 : p.y - 140;
        callout(ctx, ex + 50, ey - 60, ex, ey + 10, '#ff3355', 'IT’S WINDING UP',
            ['The lane flashes RED while it winds up.', 'When it flashes WHITE — slip out.'], []);
        // keycaps floating beside the Striker, pulsing on the white flash
        keycap(ctx, p.x + 25, p.y - 175, L(K.up), '#ffffff', pulse);
        keycap(ctx, p.x + 25, p.y + 30, L(K.down), '#ffffff', pulse);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '900 10px Orbitron'; ctx.textAlign = 'center';
        ctx.fillText('SLIP ON WHITE', p.x + 25, p.y - 196);
        ctx.fillStyle = '#9ca3af'; ctx.fillText('PERFECT SLIPS: 0 / 1', p.x + 25, p.y + 58);
    } else if (scene === 'counter') {
        lessonRail(ctx, 1);
        callout(ctx, p.x + 70, p.y - 250, p.x + 60, p.y - 70, '#ffffff', 'COUNTER CHARGED',
            ['A Perfect Slip charged your next hit.', 'It lands double, shatters posture.'],
            [{ label: L(K.jab) }, { label: L(K.cross) }, { label: L(K.hook), after: 'ANY PUNCH' }]);
    } else if (scene === 'bruiser') {
        const ex = en ? en.x + 35 : p.x + 220, ey = en ? en.y - 150 : p.y - 150;
        callout(ctx, Math.max(ex + 40, 650), ey - 60, ex, ey + 10, '#ff3030', 'NEW: BRUISER',
            ['Jabs chip it but never stagger it.', 'Only a Cross (or a Counter) stops it.'],
            [{ label: L(K.cross), color: '#ff2bd6', after: 'CROSS' }]);
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = 'bold 9px Orbitron'; ctx.textAlign = 'center';
        ctx.fillText('world at 60% speed for a beat · fades on its own', st.width / 2, st.height - 110);
    } else if (scene === 'instinct') {
        callout(ctx, 330, 70, 290, 52, '#22d3ee', 'INSTINCT FULL',
            ['Unleash it now — or keep it banked and', 'Perfect Slip on a full meter for THE ZONE.'],
            [{ label: L(K.instinct), after: 'UNLEASH' }, { label: `${L(K.up)}/${L(K.down)}`, color: '#ffffff', after: 'PERFECT SLIP = ZONE' }]);
    } else if (scene === 'footwork') {
        keycap(ctx, p.x - 10, p.y + 34, L(K.left), '#22d3ee', pulse);
        keycap(ctx, p.x + 60, p.y + 34, L(K.right), '#22d3ee', pulse);
        ctx.fillStyle = '#9ca3af'; ctx.font = 'bold 9px Orbitron'; ctx.textAlign = 'center';
        ctx.fillText('HOLD', p.x + 25, p.y + 38);
        const low = st.height * CONSTANTS.LANE_Y[2] + 20;
        callout(ctx, 90, low, p.x + 25, p.y + 50, '#22d3ee', 'FOOTWORK',
            ['Press forward to meet them early,', 'give ground to buy a beat.'], []);
        keycap(ctx, p.x + 25, p.y - 175, L(K.ghost), '#c084fc', 0);
        ctx.fillStyle = '#c084fc'; ctx.font = '900 9px Orbitron'; ctx.fillText('GHOST STEP', p.x + 25, p.y - 196);
    }
    ctx.restore();
}
