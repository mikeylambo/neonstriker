import { gameState as st } from '../state.js';
import { ctx } from '../engine_core.js';
import { CONSTANTS } from '../constants.js';
import { drawCathedral, drawCathedralForeground } from './cathedral.js';
import { drawDistortionPremium, drawCompressionPremium, drawMiragePremium, drawDominionPremium, drawPremiumForeground } from './arcs_premium.js';

// ==========================================
// v25 ARC IDENTITY (roadmap: "a distinct look per Arc — I have entered a
// different chapter of this game"). Each Arc owns its set pieces, its floor and
// its particle language; the colours come from CONSTANTS.PALETTES (keyed by
// Arc, boss chambers darker). Everything here sits BEHIND the lanes at low
// contrast — the rails and the red/white tells are drawn on top, untouched.
//   1 FOUNDATION  shattered cathedral   (cyan)   dust motes
//   2 DISTORTION  glitching cathedral   (teal)   flickering pixels
//   3 COMPRESSION closing nave          (red)    rising embers
//   4 MIRAGE      mirrored horizon      (violet) twinkling sparkles
//   5 DOMINION    throne room           (gold)   falling gold ash
// ==========================================
export const ARC_ACCENT = { 1: '#22d3ee', 2: '#34d399', 3: '#f87171', 4: '#c084fc', 5: '#facc15' };
const HORIZON = 0.29; // where the back wall meets the floor — kept clear of the top lane (0.35)

const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a.toFixed(3)})`;
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// ---------- per-Arc particles (lazily seeded, shared update) ----------
function particles(arc) {
    st.arcFx = st.arcFx || {};
    if (st.arcFx[arc]) return st.arcFx[arc];
    const W = st.width, H = st.height, list = [];
    const n = { 1: 30, 2: 40, 3: 36, 4: 28, 5: 34 }[arc];
    for (let i = 0; i < n; i++) list.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 3 + 1, p: Math.random() * Math.PI * 2, v: Math.random() * 0.6 + 0.3 });
    return (st.arcFx[arc] = list);
}
export function updateArcLooks() {
    const arc = arcOf(st.currentStage), W = st.width, H = st.height, scroll = (st.stageSpeedMult || 1) * 0.6;
    for (const d of particles(arc)) {
        d.p += 0.05;
        if (arc === 1) { d.x -= 0.6 + scroll; d.y += Math.sin(d.p) * 0.2; }
        else if (arc === 2) { d.x -= scroll * 2; if (Math.random() < 0.02) { d.x = Math.random() * W; d.y = Math.random() * H; } }
        else if (arc === 3) { d.y -= d.v * 1.6; d.x += Math.sin(d.p) * 0.6 - scroll * 0.5; }
        else if (arc === 4) { d.x -= scroll * 0.6; }
        else { d.y += d.v * 0.7; d.x += Math.sin(d.p * 0.5) * 0.4 - scroll * 0.4; }
        if (d.x < -10) d.x = W + 10; if (d.x > W + 10) d.x = -10;
        if (d.y < -10) d.y = H + 10; if (d.y > H + 10) d.y = -10;
    }
}

export function arcOf(stage) { return Math.min(CONSTANTS.getArcIndex(stage), 5); }

// ---------- entry: draw the scene for `arc` at opacity `a` ----------
let sceneBoss = false;
export function drawArcScene(arc, a, pal, boss) {
    if (a <= 0.01) return;
    sceneBoss = !!boss;
    ctx.save(); ctx.globalAlpha = a;
    const acc = hexRgb(ARC_ACCENT[arc]);
    ({ 1: foundation, 2: distortion, 3: compression, 4: mirage, 5: dominion })[arc](acc, pal);
    drawParticles(arc, acc);
    if (boss) bossChamber(acc);
    ctx.restore();
}

function drawParticles(arc, acc) {
    for (const d of particles(arc)) {
        if (arc === 1) { ctx.fillStyle = rgba(acc, 0.18 + 0.1 * Math.sin(d.p)); ctx.fillRect(d.x, d.y, d.s, d.s); }
        else if (arc === 2) { if (Math.sin(d.p * 7) > 0.2) { ctx.fillStyle = rgba(Math.sin(d.p * 3) > 0 ? acc : [255, 60, 120], 0.35); ctx.fillRect(Math.round(d.x / 4) * 4, Math.round(d.y / 4) * 4, 4, 4); } }
        else if (arc === 3) { ctx.fillStyle = `rgba(255, ${120 + Math.round(60 * Math.sin(d.p))}, 40, ${(0.35 + 0.3 * Math.sin(d.p * 2)).toFixed(3)})`; ctx.fillRect(d.x, d.y, d.s * 0.8, d.s * 0.8); }
        else if (arc === 4) { const k = Math.max(0, Math.sin(d.p)); if (k > 0.05) { ctx.strokeStyle = rgba([255, 255, 255], 0.5 * k); ctx.lineWidth = 1; const r = d.s * 2 * k; ctx.beginPath(); ctx.moveTo(d.x - r, d.y); ctx.lineTo(d.x + r, d.y); ctx.moveTo(d.x, d.y - r); ctx.lineTo(d.x, d.y + r); ctx.stroke(); } }
        else { ctx.fillStyle = rgba(acc, 0.3 + 0.2 * Math.sin(d.p)); ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.p); ctx.fillRect(-d.s, -d.s * 0.4, d.s * 2, d.s * 0.8); ctx.restore(); }
    }
}

// ---------- boss chambers: darker, a spotlight on the champion, a vignette ----------
function bossChamber(acc) {
    const W = st.width, H = st.height;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
    const b = st.enemies && st.enemies.find(e => e.isBoss);
    const bx = b ? b.x + 25 : W * 0.72;
    const g = ctx.createLinearGradient(bx, 0, bx, H);
    g.addColorStop(0, rgba(acc, 0.18)); g.addColorStop(1, rgba(acc, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(bx - 40, 0); ctx.lineTo(bx + 40, 0); ctx.lineTo(bx + 170, H); ctx.lineTo(bx - 170, H); ctx.closePath(); ctx.fill();
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// ---------- shared floor helper: perspective seams toward a vanishing point ----------
function perspectiveFloor(color, spacing, rows, scroll) {
    const W = st.width, H = st.height, hy = H * HORIZON;
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath();
    const off = scroll % spacing;
    for (let x = -W; x < W * 2; x += spacing) { const bx = x - off; ctx.moveTo(W / 2 + (bx - W / 2) * 0.25, hy); ctx.lineTo(bx, H); }
    for (let i = 1; i <= rows; i++) { const k = Math.pow(i / rows, 1.8); const y = hy + (H - hy) * k; ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
}
const scrollX = () => (st.scrollX || 0);

// ================= ARC 1 · FOUNDATION — the shattered cathedral =================
function foundation(acc, pal) {
    if (drawCathedral(acc, pal, sceneBoss)) return; // v25.1 stained-glass cathedral (falls back below if canvases are unavailable)
    const W = st.width, H = st.height, shard = rgba(pal.shard, pal.shard[3]);
    (st.lightShafts || []).forEach(L => {
        const g = ctx.createLinearGradient(L.x, 0, L.x + 200, H); g.addColorStop(0, rgba(pal.accent, pal.accent[3] * 2)); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(L.x, 0); ctx.lineTo(L.x + 150, 0); ctx.lineTo(L.x + 300, H); ctx.lineTo(L.x + 150, H); ctx.fill();
    });
    const rw = st.roseWindow;
    if (rw) {
        ctx.save(); ctx.translate(rw.x, rw.y); ctx.rotate(rw.rotation); ctx.strokeStyle = shard; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 250, 0, Math.PI * 2); ctx.stroke();
        rw.petals.forEach(an => { ctx.save(); ctx.rotate(an); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(60, 220); ctx.lineTo(0, 280); ctx.lineTo(-60, 220); ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill(); ctx.stroke(); ctx.restore(); });
        ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fillStyle = shard; ctx.fill(); ctx.restore();
    }
    (st.cathedralPillars || []).forEach(p => { ctx.fillStyle = '#030305'; ctx.fillRect(p.x, 0, p.w, H); ctx.fillStyle = shard; ctx.fillRect(p.x + 5, 0, 5, H); });
    (st.cathedralShards || []).forEach(sh => {
        ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.angle); ctx.fillStyle = shard; ctx.beginPath();
        sh.points.forEach((q, i) => i ? ctx.lineTo(q.x * sh.size, q.y * sh.size) : ctx.moveTo(q.x * sh.size, q.y * sh.size));
        ctx.closePath(); ctx.fill(); ctx.restore();
    });
    // flagstone floor
    perspectiveFloor(rgba(acc, 0.07), 90, 7, scrollX());
}

// ================= ARC 2 · DISTORTION — the cathedral, glitching =================
function distortion(acc, pal) {
    if (drawDistortionPremium(sceneBoss)) return; // v25.2 premium scene (falls back below if canvases are unavailable)
    const W = st.width, H = st.height, t = Date.now() * 0.001;
    const burst = (Math.sin(t * 1.7) > 0.93) || (Math.sin(t * 0.63 + 1) > 0.97); // short glitch bursts
    // rose window, RGB-split
    const rw = st.roseWindow;
    if (rw) for (const [dx, col] of [[-5, [255, 40, 120]], [5, acc], [0, [255, 255, 255]]]) {
        ctx.save(); ctx.translate(rw.x + dx * (burst ? 3 : 1), rw.y); ctx.rotate(rw.rotation); ctx.strokeStyle = rgba(col, dx === 0 ? 0.05 : 0.07); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 240, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, 50); ctx.lineTo(55, 210); ctx.lineTo(-55, 210); ctx.closePath(); ctx.stroke(); }
        ctx.restore();
    }
    // pillars, sliced — each slice shears sideways in a burst
    // (kept calm below the horizon so the fighting floor stays readable)
    (st.cathedralPillars || []).forEach((p, pi) => {
        for (let y = 0; y < H; y += 24) {
            const shear = burst && y < H * HORIZON ? Math.sin(y * 0.11 + t * 40 + pi) * 8 : 0;
            ctx.fillStyle = '#010504'; ctx.fillRect(p.x + shear, y, p.w, 24);
            ctx.fillStyle = rgba(acc, 0.1); ctx.fillRect(p.x + shear + 5, y, 4, 24);
        }
    });
    // a displaced glitch band now and then
    if (burst) { const by = (Math.floor(t * 30) * 53) % (H * HORIZON); ctx.fillStyle = rgba(acc, 0.08); ctx.fillRect(0, by, W, 10 + (Math.floor(t * 30) % 3) * 8); }
    // scanlines over the back wall
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < H * HORIZON + 40; y += 4) ctx.fillRect(0, y, W, 1);
    // floor: a data stream — scanlines running toward you + dashed packets
    const hy = H * HORIZON, run = (Date.now() * 0.05) % 24;
    ctx.strokeStyle = rgba(acc, 0.07); ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 16; i++) { const k = Math.pow(((i * 24 + run) % 384) / 384, 1.7); const y = hy + (H - hy) * k; ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    ctx.setLineDash([6, 22]); ctx.lineDashOffset = -scrollX() * 2; ctx.strokeStyle = rgba(acc, 0.12);
    ctx.beginPath(); for (let x = 0; x < W; x += 140) { ctx.moveTo(W / 2 + (x - W / 2) * 0.25, hy); ctx.lineTo(x, H); } ctx.stroke(); ctx.setLineDash([]);
}

// ================= ARC 3 · COMPRESSION — the nave closes in =================
function compression(acc, pal) {
    if (drawCompressionPremium(sceneBoss)) return; // v25.2 premium scene (falls back below if canvases are unavailable)
    const W = st.width, H = st.height, t = Date.now() * 0.001, hy = H * HORIZON;
    // converging ribs: a tunnel narrowing toward the centre
    ctx.strokeStyle = rgba(acc, 0.11); ctx.lineWidth = 2;
    const ribOff = (scrollX() * 0.5) % 160;
    for (let i = 0; i < 9; i++) {
        const k = ((i * 160 - ribOff) % 1440 + 1440) % 1440 / 1440, sc = 0.35 + k * 1.4;
        ctx.beginPath(); ctx.ellipse(W / 2, hy + 20, 260 * sc, 220 * sc, 0, Math.PI, 0); ctx.stroke();
    }
    // the walls lean in — slow breathing wedges
    const lean = 18 + Math.sin(t * 0.8) * 8;
    for (const side of [-1, 1]) {
        const x0 = side < 0 ? 0 : W, x1 = side < 0 ? 170 + lean : W - 170 - lean;
        const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#070101'); g.addColorStop(0.7, 'rgba(7,1,1,0.6)'); g.addColorStop(1, 'rgba(7,1,1,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x1 + side * -40, 0); ctx.lineTo(x1, H); ctx.lineTo(x0, H); ctx.closePath(); ctx.fill();
    }
    // the ceiling slab, pumped down by pistons
    const press = 10 + Math.max(0, Math.sin(t * 1.3)) * 22;
    ctx.fillStyle = '#0c0202'; ctx.fillRect(0, 0, W, 34 + press);
    ctx.fillStyle = rgba(acc, 0.35); ctx.fillRect(0, 34 + press, W, 2);
    for (let x = 60; x < W; x += 180) { ctx.fillStyle = '#1a0606'; ctx.fillRect(x, 0, 16, 34 + press); ctx.fillStyle = rgba(acc, 0.25); ctx.fillRect(x + 6, 0, 3, 34 + press); }
    // grated floor with heat lines
    const off = scrollX() % 40;
    ctx.strokeStyle = 'rgba(255,90,40,0.06)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -H; x < W + H; x += 40) { ctx.moveTo(x - off, hy); ctx.lineTo(x - off - (H - hy), H); }
    ctx.stroke();
    const heat = 0.05 + 0.03 * Math.sin(t * 3);
    const g = ctx.createLinearGradient(0, H * 0.82, 0, H); g.addColorStop(0, 'rgba(255,60,20,0)'); g.addColorStop(1, `rgba(255,60,20,${heat.toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.82, W, H * 0.18);
}

// ================= ARC 4 · MIRAGE — a mirrored horizon =================
function mirage(acc, pal) {
    if (drawMiragePremium(sceneBoss)) return; // v25.2 premium scene (falls back below if canvases are unavailable)
    const W = st.width, H = st.height, t = Date.now() * 0.001, hy = H * HORIZON;
    // distant pillars with heat shimmer, and their reflection in the glossy floor
    (st.cathedralPillars || []).forEach((p, pi) => {
        const px = p.x * 0.6 + 80;
        for (let y = 0; y < hy; y += 12) {
            const wob = Math.sin(y * 0.08 + t * 3 + pi) * 2.2;
            ctx.fillStyle = '#0b0214'; ctx.fillRect(px + wob, y, 34, 12);
            ctx.fillStyle = rgba(acc, 0.1); ctx.fillRect(px + wob + 4, y, 3, 12);
            // reflection: flipped, fading, wavier
            const ry = hy + (hy - y) * 0.9, fade = 0.45 * (1 - y / hy);
            ctx.fillStyle = rgba([40, 8, 60], fade); ctx.fillRect(px + wob * 2.5, ry, 34, 11);
        }
    });
    // the horizon line
    ctx.fillStyle = rgba(acc, 0.25); ctx.fillRect(0, hy, W, 1.5);
    // floating prisms that catch the light
    for (let i = 0; i < 6; i++) {
        const x = ((i * 190 - scrollX() * 0.15) % (W + 200) + W + 200) % (W + 200) - 100;
        const y = 50 + (i * 37) % 110 + Math.sin(t + i) * 8, s = 22 + (i % 3) * 10, r = t * 0.3 + i;
        ctx.save(); ctx.translate(x, y); ctx.rotate(r);
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.87, s * 0.5); ctx.lineTo(-s * 0.87, s * 0.5); ctx.closePath();
        ctx.fillStyle = rgba(acc, 0.05); ctx.fill();
        ctx.strokeStyle = rgba([255, 255, 255], 0.12); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,120,200,0.12)'; ctx.beginPath(); ctx.moveTo(-s * 0.87 + 3, s * 0.5); ctx.lineTo(s * 0.87 - 3, s * 0.5); ctx.stroke();
        ctx.restore();
    }
    // glossy floor sheen sweeping across
    const sx = ((t * 120) % (W + 600)) - 300;
    const g = ctx.createLinearGradient(sx - 150, 0, sx + 150, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.035)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, hy, W, H - hy);
}

// ================= ARC 5 · DOMINION — the throne room =================
function dominion(acc, pal) {
    if (drawDominionPremium(sceneBoss)) return; // v25.2 premium scene (falls back below if canvases are unavailable)
    const W = st.width, H = st.height, t = Date.now() * 0.001, hy = H * HORIZON;
    // monoliths (every other pillar) with gold edge-light that fades out above the lanes
    (st.cathedralPillars || []).forEach((p, i) => {
        if (i % 2) return;
        const w = 70;
        ctx.fillStyle = '#050402'; ctx.fillRect(p.x, 0, w, H);
        const g = ctx.createLinearGradient(p.x, 0, p.x, hy + 40); g.addColorStop(0, rgba(acc, 0.5)); g.addColorStop(1, rgba(acc, 0));
        ctx.fillStyle = g; ctx.fillRect(p.x + w - 3, 0, 3, hy + 40);
        ctx.fillStyle = rgba(acc, 0.12); ctx.fillRect(p.x, 70, w, 2); ctx.fillRect(p.x, 76, w, 1);
    });
    // the eclipse crown in front of them, slow rays turning
    const cx = W * 0.5, cy = hy - 30;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.05);
    for (let i = 0; i < 24; i++) {
        ctx.rotate(Math.PI / 12);
        const g = ctx.createLinearGradient(0, 0, 0, -340); g.addColorStop(0, rgba(acc, 0.1)); g.addColorStop(1, rgba(acc, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-10, -100); ctx.lineTo(10, -100); ctx.lineTo(i % 2 ? 26 : 44, -340); ctx.lineTo(i % 2 ? -26 : -44, -340); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, 92, 0, Math.PI * 2); ctx.fillStyle = '#020200'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = rgba(acc, 0.5 + 0.1 * Math.sin(t * 2)); ctx.stroke();
    ctx.fillStyle = rgba(acc, 0.35);
    for (let i = -2; i <= 2; i++) { const a = -Math.PI / 2 + i * 0.34; const x = cx + Math.cos(a) * 92, y = cy + Math.sin(a) * 92; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x, y - 20 - (i === 0 ? 10 : 0)); ctx.lineTo(x + 7, y); ctx.fill(); }
    // black marble with a sparse gold inlay lattice
    const off = scrollX() % 170;
    ctx.strokeStyle = rgba(acc, 0.05); ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -W; x < W * 2; x += 170) {
        const bx = x - off;
        ctx.moveTo(W / 2 + (bx - W / 2) * 0.25, hy); ctx.lineTo(bx + 260, H);
        ctx.moveTo(W / 2 + (bx - W / 2) * 0.25, hy); ctx.lineTo(bx - 260, H);
    }
    ctx.stroke();
    ctx.fillStyle = rgba(acc, 0.3); ctx.fillRect(0, hy, W, 1);
}

// v25.1: an Arc's foreground framing layer, drawn over the fighters by draw.js.
export function drawArcForeground() {
    const arc = arcOf(st.currentStage);
    if (arc === 1) drawCathedralForeground(); else drawPremiumForeground(arc);
}
