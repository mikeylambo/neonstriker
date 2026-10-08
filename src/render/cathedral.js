import { gameState as st } from '../state.js';
import { ctx } from '../engine_core.js';

// ==========================================
// v25.1 STAINED-GLASS CATHEDRAL (Arc 1 vertical slice — "premium" pass).
// Real stained glass, built from cells + lead lines, PRE-RENDERED once to
// offscreen canvases (glow + blur baked in), then composited each frame as
// parallax layers. Back to front:
//   0 fog wash            atmospheric depth
//   1 far nave arcade     blurred arches, fogged toward the back
//   2 rose window         the focal point: tracery rings + petals + medallion
//   3 lancet windows      tall pointed-arch glass between the columns
//   4 light               coloured shafts from the glass, pooling on the floor
//   5 columns             dark stone, rim-lit by the glass
//   6 foreground framing  dark blurred arch tops / rubble — top edge and
//                         below the bottom lane only, never over a fighter
// Reactive: the glass flares on a K.O., runs magenta in Instinct, and every
// window breathes slowly. The lanes and tells are drawn on top, untouched.
// Uses its OWN tiny RNG — never the game's seeded stream.
// ==========================================

export const HORIZON = 0.29;
export const GLASS = [[0, 229, 255], [255, 43, 214], [138, 92, 255], [255, 176, 32], [40, 120, 255], [0, 255, 170]];
export const LEAD = '#05040a';

export function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const rgb = (c, a = 1) => `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${a})`;
export const shade = (c, k) => c.map(v => Math.max(0, Math.min(255, v * k)));

export function makeCanvas(w, h) {
    if (typeof document === 'undefined' || !document.createElement) return null;
    const c = document.createElement('canvas');
    if (!c || typeof c.getContext !== 'function') return null;
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    return x && typeof x.drawImage === 'function' ? { c, x } : null;
}

// One pane of glass: a gradient fill (bright core, dark edge) + a lead line.
export function pane(x, path, col, rand, leadW) {
    const k = 0.75 + rand() * 0.5, base = shade(col, k);
    x.save(); path(); x.clip();
    const b = x.__bounds || [0, 0, 100, 100];
    const g = x.createRadialGradient(b[0] + b[2] * (0.3 + rand() * 0.4), b[1] + b[3] * (0.3 + rand() * 0.4), 2, b[0] + b[2] / 2, b[1] + b[3] / 2, Math.max(b[2], b[3]));
    g.addColorStop(0, rgb(shade(base, 1.5), 1)); g.addColorStop(0.55, rgb(base, 1)); g.addColorStop(1, rgb(shade(base, 0.45), 1));
    x.fillStyle = g; x.fillRect(b[0] - 4, b[1] - 4, b[2] + 8, b[3] + 8);
    // glass grain: a few faint streaks
    x.globalAlpha = 0.12; x.strokeStyle = '#ffffff'; x.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const sx = b[0] + rand() * b[2]; x.beginPath(); x.moveTo(sx, b[1]); x.lineTo(sx + (rand() - 0.5) * 20, b[1] + b[3]); x.stroke(); }
    x.globalAlpha = 1; x.restore();
    path(); x.strokeStyle = LEAD; x.lineWidth = leadW; x.lineJoin = 'round'; x.stroke();
}

// ---------- ROSE WINDOW: rings of sectors, petal tracery, medallion ----------
export function buildRose(R, opt = {}) {
    const PAL = opt.palette || GLASS, MED = opt.medallion || [255, 230, 160], RIM = opt.rim || 'rgba(0,229,255,0.35)', LW = opt.lead || 4;
    const pad = 60, S = R * 2 + pad * 2, cv = makeCanvas(S, S);
    if (!cv) return null;
    const { x } = cv, cx = S / 2, cy = S / 2, rand = mulberry(opt.seed || 7);
    x.translate(cx, cy);
    const rings = [[R * 0.22, R * 0.45, 8], [R * 0.45, R * 0.72, 16], [R * 0.72, R * 0.94, 24]];
    rings.forEach(([r0, r1, n], ri) => {
        for (let i = 0; i < n; i++) {
            const a0 = (i / n) * Math.PI * 2 + ri * 0.13, a1 = ((i + 1) / n) * Math.PI * 2 + ri * 0.13;
            const col = PAL[(i + ri * 2) % (ri === 1 ? Math.min(3, PAL.length) : PAL.length)];
            const path = () => { x.beginPath(); x.arc(0, 0, r1, a0, a1); x.arc(0, 0, r0, a1, a0, true); x.closePath(); };
            x.__bounds = [-r1, -r1, r1 * 2, r1 * 2];
            pane(x, path, col, rand, LW);
        }
    });
    // petal tracery over ring 2
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        x.save(); x.rotate(a);
        const path = () => { x.beginPath(); x.moveTo(0, -R * 0.24); x.quadraticCurveTo(R * 0.2, -R * 0.55, 0, -R * 0.86); x.quadraticCurveTo(-R * 0.2, -R * 0.55, 0, -R * 0.24); x.closePath(); };
        x.__bounds = [-R * 0.2, -R * 0.86, R * 0.4, R * 0.62];
        pane(x, path, PAL[i % 2 ? 1 : 0], rand, LW + 2);
        x.restore();
    }
    // medallion
    x.__bounds = [-R * 0.22, -R * 0.22, R * 0.44, R * 0.44];
    pane(x, () => { x.beginPath(); x.arc(0, 0, R * 0.22, 0, Math.PI * 2); }, MED, rand, LW + 2);
    x.beginPath(); x.arc(0, 0, R * 0.08, 0, Math.PI * 2); x.fillStyle = '#fff6d8'; x.fill();
    // stone frame: heavy outer rings
    x.lineWidth = 14; x.strokeStyle = '#0b0a12'; x.beginPath(); x.arc(0, 0, R * 0.97, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 4; x.strokeStyle = RIM; x.beginPath(); x.arc(0, 0, R + 4, 0, Math.PI * 2); x.stroke();
    return withGlow(cv, 26);
}

// ---------- LANCET: a tall pointed arch of jittered panes + an oculus ----------
export function archPath(x, w, h) {
    x.beginPath(); x.moveTo(0, h); x.lineTo(0, w * 0.6);
    x.quadraticCurveTo(0, 0, w / 2, 0); x.quadraticCurveTo(w, 0, w, w * 0.6); x.lineTo(w, h); x.closePath();
}
export function buildLancet(w, h, seed, hue, palette = GLASS, oculus = [255, 214, 120]) {
    const pad = 40, cv = makeCanvas(w + pad * 2, h + pad * 2);
    if (!cv) return null;
    const { x } = cv, rand = mulberry(seed);
    x.translate(pad, pad);
    x.save(); archPath(x, w, h); x.clip();
    const cols = 3, rows = Math.round(h / (w / cols) * 0.9);
    const pts = [];
    for (let r = 0; r <= rows; r++) { pts[r] = []; for (let c = 0; c <= cols; c++) { const jx = (c > 0 && c < cols) ? (rand() - 0.5) * (w / cols) * 0.5 : 0, jy = (r > 0 && r < rows) ? (rand() - 0.5) * (h / rows) * 0.5 : 0; pts[r][c] = [c * w / cols + jx, r * h / rows + jy]; } }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const q = [pts[r][c], pts[r][c + 1], pts[r + 1][c + 1], pts[r + 1][c]];
        const path = () => { x.beginPath(); x.moveTo(...q[0]); q.slice(1).forEach(p => x.lineTo(...p)); x.closePath(); };
        x.__bounds = [Math.min(...q.map(p => p[0])), Math.min(...q.map(p => p[1])), w / cols * 1.4, h / rows * 1.4];
        const pick = rand();
        pane(x, path, pick < 0.55 ? hue : palette[Math.floor(rand() * palette.length)], rand, 3.5);
    }
    // oculus near the top
    const oy = w * 0.55, orr = w * 0.26;
    x.__bounds = [w / 2 - orr, oy - orr, orr * 2, orr * 2];
    pane(x, () => { x.beginPath(); x.arc(w / 2, oy, orr, 0, Math.PI * 2); }, oculus, rand, 5);
    x.restore();
    x.lineWidth = 9; x.strokeStyle = '#0b0a12'; archPath(x, w, h); x.stroke();
    return withGlow(cv, 18);
}

// Bake a soft halo behind the glass (blurred copy, additive) — fallback: none.
export function withGlow(cv, r) {
    const out = makeCanvas(cv.c.width, cv.c.height);
    if (!out) return cv.c;
    const { x } = out;
    try { x.filter = `blur(${r}px)`; x.globalAlpha = 0.75; x.drawImage(cv.c, 0, 0); x.filter = 'none'; x.globalAlpha = 1; } catch (e) {}
    x.drawImage(cv.c, 0, 0);
    return out.c;
}

// ---------- far arcade: repeating blurred arches (one tile) ----------
export function buildArcade(W, H, color = '#16233a') {
    const cv = makeCanvas(W, H);
    if (!cv) return null;
    const { x } = cv, hy = H * HORIZON;
    x.fillStyle = color;
    for (let i = 0; i < 6; i++) {
        const ax = i * (W / 6), aw = W / 6 - 26;
        x.beginPath(); x.rect(ax, 0, W / 6, hy + 40); x.fill();
        // the arch openings let a cooler fog through
        x.save(); x.globalCompositeOperation = 'destination-out';
        x.beginPath(); x.moveTo(ax + 13, hy + 40); x.lineTo(ax + 13, 120); x.quadraticCurveTo(ax + 13, 40, ax + 13 + aw / 2, 40); x.quadraticCurveTo(ax + 13 + aw, 40, ax + 13 + aw, 120); x.lineTo(ax + 13 + aw, hy + 40); x.closePath(); x.fill();
        x.restore();
    }
    const out = makeCanvas(W, H);
    if (!out) return cv.c;
    try { out.x.filter = 'blur(3px)'; } catch (e) {}
    out.x.globalAlpha = 0.9; out.x.drawImage(cv.c, 0, 0);
    return out.c;
}

// ---------- foreground framing: arch tops + rubble, blurred dark ----------
function buildForeground(W, H) {
    const cv = makeCanvas(W, H);
    if (!cv) return null;
    const { x } = cv, rand = mulberry(31);
    x.fillStyle = '#010103';
    // hanging arch tops along the top edge
    for (let i = 0; i < 3; i++) {
        const ax = i * (W / 3) + 40, aw = W / 3 - 80;
        x.beginPath(); x.moveTo(ax - 40, 0); x.lineTo(ax + aw + 40, 0); x.lineTo(ax + aw + 40, 70);
        x.quadraticCurveTo(ax + aw, 18, ax + aw / 2, 14); x.quadraticCurveTo(ax, 18, ax - 40, 70); x.closePath(); x.fill();
        // a chain with a hanging lamp
        x.fillRect(ax + aw * 0.7, 10, 3, 60 + rand() * 40);
    }
    // rubble line below the bottom lane
    x.beginPath(); x.moveTo(0, H);
    for (let px = 0; px <= W; px += 30) x.lineTo(px, H - 34 - rand() * 26);
    x.lineTo(W, H); x.closePath(); x.fill();
    const out = makeCanvas(W, H);
    if (!out) return cv.c;
    try { out.x.filter = 'blur(2.5px)'; } catch (e) {}
    out.x.drawImage(cv.c, 0, 0);
    return out.c;
}

// Soft light beam (pre-blurred trapezoid), one sprite per colour.
export function buildBeam(col, topW, botW, h) {
    const pad = 40, w = botW + pad * 2, cv = makeCanvas(w, h + pad);
    if (!cv) return null;
    const { x } = cv, cx = w / 2;
    try { x.filter = 'blur(14px)'; } catch (e) {}
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, rgb(col, 1)); g.addColorStop(1, rgb(col, 0));
    x.fillStyle = g; x.beginPath(); x.moveTo(cx - topW / 2, 10); x.lineTo(cx + topW / 2, 10); x.lineTo(cx + botW / 2, h); x.lineTo(cx - botW / 2, h); x.closePath(); x.fill();
    return cv.c;
}

let built = null;
function build() {
    if (built !== null) return built;
    const W = st.width || 1000, H = st.height || 600;
    const rose = buildRose(92);
    if (!rose) { built = false; return built; }
    built = {
        rose,
        lancets: [buildLancet(64, 168, 11, GLASS[0]), buildLancet(64, 168, 23, GLASS[1]), buildLancet(64, 168, 37, GLASS[2])],
        arcade: buildArcade(W, H),
        beams: [[0, 200, 255], [255, 60, 200], [140, 90, 255], [255, 0, 200], [180, 0, 255]].map(c => buildBeam(c, 40, 150, 420)),
        roseBeam: buildBeam([255, 210, 150], 110, 360, 430), roseBeamI: buildBeam([255, 0, 200], 110, 360, 430),
        fg: buildForeground(W, H)
    };
    return built;
}
export function cathedralReady() { return !!build(); }

// ---------- per frame ----------
let flare = 0, lastKo = 0;
export function drawCathedral(acc, pal, boss) {
    const B = build();
    if (!B) return false;
    const W = st.width, H = st.height, hy = H * HORIZON, t = Date.now() * 0.001;
    const sx = st.scrollX || 0;
    // reactive light
    const koNow = (st.koFx && st.koFx.length) || 0;
    if (koNow > lastKo || (st.bossKo && st.bossKo.t === 1)) flare = 1;
    lastKo = koNow; flare *= 0.93;
    const inst = st.isInstinct ? 1 : 0;
    const breathe = 0.82 + 0.1 * Math.sin(t * 0.7) + flare * 0.4;

    // 0 · fog wash at the horizon
    const fog = ctx.createLinearGradient(0, hy - 120, 0, hy + 80);
    fog.addColorStop(0, 'rgba(20, 40, 70, 0)'); fog.addColorStop(0.6, 'rgba(30, 60, 100, 0.22)'); fog.addColorStop(1, 'rgba(10, 20, 40, 0)');
    ctx.fillStyle = fog; ctx.fillRect(0, hy - 120, W, 200);

    // 1 · far arcade (tiles, slow parallax)
    if (B.arcade) { const o = -((sx * 0.05) % W); ctx.drawImage(B.arcade, o, 0); ctx.drawImage(B.arcade, o + W, 0); }

    // 2 · rose window (focal, barely drifts)
    const rx = W * 0.62, ry = 100; // the focal point holds still; everything else drifts past it
    ctx.save(); ctx.globalAlpha = Math.min(1, breathe * (boss ? 0.5 : 0.66));
    ctx.drawImage(B.rose, rx - B.rose.width / 2, ry - B.rose.height / 2);
    ctx.restore();

    // 3 · lancets between the columns (parallax tile of 4 bays)
    const bay = 250, off = (sx * 0.2) % bay;
    ctx.save(); ctx.globalAlpha = Math.min(1, breathe * 0.55);
    for (let i = -1; i < 5; i++) {
        const lx = i * bay - off + 60;
        if (Math.abs(lx - rx) < 150) continue; // keep the rose window clear
        const L = B.lancets[((i % 3) + 3) % 3];
        ctx.drawImage(L, lx - 40, 22 - 40);
    }
    ctx.restore();

    // floor: polished stone catching the glass — a soft reflection band + seams
    const fl = ctx.createLinearGradient(0, hy, 0, H);
    fl.addColorStop(0, 'rgba(0,0,0,0.35)'); fl.addColorStop(0.5, 'rgba(0,0,0,0.1)'); fl.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = fl; ctx.fillRect(0, hy, W, H - hy);

    // 4 · light: coloured shafts from the glass, pooling on the floor
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const shaftIdx = inst ? [3, 4] : [0, 1, 2];
    for (let i = -1; i < 5; i++) {
        const lx = i * bay - off + 95;
        if (Math.abs(lx - 35 - rx) < 150) continue;
        const ci = shaftIdx[((i % shaftIdx.length) + shaftIdx.length) % shaftIdx.length];
        const a = (0.16 + 0.06 * Math.sin(t * 0.9 + i)) * breathe;
        const beam = B.beams[ci];
        if (beam) { ctx.globalAlpha = a; ctx.save(); ctx.translate(lx, 190); ctx.transform(1, 0, 0.18, 1, 0, 0); ctx.drawImage(beam, -beam.width / 2, 0); ctx.restore(); }
        // pool where it lands
        const c = [[0, 200, 255], [255, 60, 200], [140, 90, 255], [255, 0, 200], [180, 0, 255]][ci];
        const px = lx + 75 + Math.sin(t * 0.4 + i) * 8, py = H - 70;
        const pg = ctx.createRadialGradient(px, py, 4, px, py, 90);
        pg.addColorStop(0, rgb(c, 0.1 * breathe)); pg.addColorStop(1, rgb(c, 0));
        ctx.globalAlpha = 1; ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(px, py, 90, 22, 0, 0, Math.PI * 2); ctx.fill();
    }
    // the rose window's own beam, down the middle
    const rb = inst ? B.roseBeamI : B.roseBeam;
    if (rb) { ctx.globalAlpha = 0.1 * breathe; ctx.drawImage(rb, rx - rb.width / 2, ry + 70); ctx.globalAlpha = 1; }
    ctx.restore();

    // 5 · columns: dark stone, rim-lit by the glass beside them
    for (let i = -1; i < 6; i++) {
        const cx = i * bay - ((sx * 0.4) % bay) - 20;
        ctx.fillStyle = '#04040a'; ctx.fillRect(cx, 0, 44, H);
        const rim = ctx.createLinearGradient(cx + 36, 0, cx + 44, 0);
        rim.addColorStop(0, 'rgba(0,229,255,0)'); rim.addColorStop(1, `rgba(0,229,255,${(0.18 * breathe).toFixed(3)})`);
        ctx.fillStyle = rim; ctx.fillRect(cx + 36, 0, 8, H);
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(cx + 4, 0, 2, H);
    }

    return true;
}

// 6 · foreground framing — drawn AFTER the fighters (draw.js), but only along the
// top edge and below the bottom lane, so it frames the fight without covering it.
export function drawCathedralForeground() {
    const B = build();
    if (!B || !B.fg) return;
    const W = st.width, sx = st.scrollX || 0, o = -((sx * 1.1) % W);
    ctx.drawImage(B.fg, o, 0); ctx.drawImage(B.fg, o + W, 0);
}
