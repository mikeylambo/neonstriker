import { gameState as st } from '../state.js';
import { ctx } from '../engine_core.js';
import { HORIZON, LEAD, mulberry, rgb, makeCanvas, pane, withGlow, buildBeam, buildLancet, buildRose, buildArcade, archPath } from './cathedral.js';

// ==========================================
// v25.2 PREMIUM ARCS 2-5 — the same bar as the stained-glass Cathedral:
// glass built from real panes + lead lines, pre-rendered once (glow and blur
// baked in), composited as parallax layers, with live light on top.
//   2 DISTORTION  the Cathedral's glass, fractured: sliced + offset in glitch
//                 bursts, colour-split ghosts, floating masonry, cables
//   3 COMPRESSION an iron furnace window of molten glass, slatted vents,
//                 a riveted press slab on pistons, heat rising off the grates
//   4 MIRAGE      a tall violet window mirrored in a flooded floor, floating
//                 stained-glass prisms, mist, crystal shards overhead
//   5 DOMINION    a stained-glass eclipse crown throwing slow god-rays over
//                 obsidian monoliths, banners and braziers
// Same readability rules as the Cathedral: hero glass ends above the top lane,
// framing only along the top edge / below the bottom lane, tells drawn on top.
// ==========================================

const TEAL = [[0, 255, 170], [52, 211, 153], [0, 190, 255], [120, 255, 220], [255, 40, 140]];
const MOLTEN = [[255, 96, 24], [255, 150, 40], [255, 70, 40], [255, 196, 90], [200, 40, 20]];
const VIOLET = [[192, 132, 252], [140, 80, 255], [255, 120, 220], [120, 200, 255], [230, 190, 255]];
const GOLD = [[250, 204, 21], [255, 160, 30], [200, 30, 40], [255, 230, 140], [180, 110, 10]];

const built = {};
function once(key, fn) { if (built[key] === undefined) built[key] = fn() || false; return built[key]; }

// Shared live-light state: the glass breathes, flares on a K.O., and runs
// magenta in Instinct — same contract as the Cathedral.
let flare = 0, lastKo = 0;
function light() {
    const koNow = (st.koFx && st.koFx.length) || 0;
    if (koNow > lastKo || (st.bossKo && st.bossKo.t === 1)) flare = 1;
    lastKo = koNow; flare *= 0.93;
    const t = Date.now() * 0.001;
    return { t, inst: !!st.isInstinct, breathe: 0.82 + 0.1 * Math.sin(t * 0.7) + flare * 0.4 };
}
const W = () => st.width, H = () => st.height, SX = () => st.scrollX || 0;
function tile(img, speed, y = 0) { if (!img) return; const w = W(), o = -((SX() * speed) % w); ctx.drawImage(img, o, y); ctx.drawImage(img, o + w, y); }
function fogBand(col) {
    const hy = H() * HORIZON, g = ctx.createLinearGradient(0, hy - 120, 0, hy + 80);
    g.addColorStop(0, rgb(col, 0)); g.addColorStop(0.6, rgb(col, 0.22)); g.addColorStop(1, rgb(col, 0));
    ctx.fillStyle = g; ctx.fillRect(0, hy - 120, W(), 200);
}
function floorShade() {
    const hy = H() * HORIZON, g = ctx.createLinearGradient(0, hy, 0, H());
    g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.5, 'rgba(0,0,0,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g; ctx.fillRect(0, hy, W(), H() - hy);
}
function beams(set, cols, bay, off, skipX, L, top = 190) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = -1; i < 5; i++) {
        const lx = i * bay - off + 95;
        if (skipX !== null && Math.abs(lx - 35 - skipX) < 150) continue;
        const ci = ((i % set.length) + set.length) % set.length, beam = set[ci];
        const a = (0.16 + 0.06 * Math.sin(L.t * 0.9 + i)) * L.breathe;
        if (beam) { ctx.globalAlpha = a; ctx.save(); ctx.translate(lx, top); ctx.transform(1, 0, 0.18, 1, 0, 0); ctx.drawImage(beam, -beam.width / 2, 0); ctx.restore(); }
        const c = cols[ci], px = lx + 75 + Math.sin(L.t * 0.4 + i) * 8, py = H() - 70;
        const pg = ctx.createRadialGradient(px, py, 4, px, py, 90);
        pg.addColorStop(0, rgb(c, 0.1 * L.breathe)); pg.addColorStop(1, rgb(c, 0));
        ctx.globalAlpha = 1; ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(px, py, 90, 22, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}
function blurred(cv, px) {
    const out = makeCanvas(cv.c.width, cv.c.height);
    if (!out) return cv.c;
    try { out.x.filter = `blur(${px}px)`; } catch (e) {}
    out.x.drawImage(cv.c, 0, 0);
    return out.c;
}
const INST = [[255, 0, 200], [180, 0, 255]];

// =====================================================================
// ARC 2 · DISTORTION — the Cathedral's glass, fractured
// =====================================================================
function buildDistortion() {
    const w = W(), h = H();
    const rose = buildRose(92, { palette: TEAL, medallion: [200, 255, 240], rim: 'rgba(52,211,153,0.4)', seed: 19 });
    if (!rose) return null;
    const fg = makeCanvas(w, h);
    if (fg) { // hanging cables + broken scaffold
        const x = fg.x, r = mulberry(41); x.strokeStyle = '#010303'; x.lineCap = 'round';
        for (let i = 0; i < 5; i++) { const a = i * 220 + r() * 80, b = a + 120 + r() * 140; x.lineWidth = 3 + r() * 3; x.beginPath(); x.moveTo(a, -5); x.quadraticCurveTo((a + b) / 2, 70 + r() * 50, b, -5); x.stroke(); }
        x.fillStyle = '#010303';
        for (let px = 0; px < w; px += 160) { x.fillRect(px, h - 52, 120, 6); x.fillRect(px + 10, h - 52, 6, 52); x.fillRect(px + 104, h - 52, 6, 52); x.save(); x.translate(px + 60, h - 30); x.rotate(0.5); x.fillRect(-60, -3, 120, 5); x.restore(); }
    }
    const blocks = makeCanvas(34, 22);
    if (blocks) { blocks.x.fillStyle = '#030807'; blocks.x.fillRect(0, 0, 34, 22); blocks.x.fillStyle = 'rgba(52,211,153,0.4)'; blocks.x.fillRect(0, 0, 34, 2); blocks.x.fillStyle = 'rgba(0,0,0,0.5)'; blocks.x.fillRect(0, 11, 34, 1); }
    return {
        rose,
        lancets: [0, 1, 2].map(i => buildLancet(64, 168, 101 + i * 13, TEAL[i], TEAL, [200, 255, 240])),
        arcade: buildArcade(w, h, '#0f2622'),
        beams: [...TEAL.slice(0, 3), ...INST].map(c => buildBeam(c, 40, 150, 420)),
        fg: fg ? blurred(fg, 2.5) : null, block: blocks ? blocks.c : null
    };
}
// draw an image in horizontal slices, each shifted — the glitch
function sliced(img, x, y, a, t, burst, seed) {
    const n = 7, sh = img.height / n;
    for (let i = 0; i < n; i++) {
        const dx = burst ? Math.round(Math.sin(i * 2.3 + t * 38 + seed) * 9) : 0;
        ctx.drawImage(img, 0, i * sh, img.width, sh, x + dx, y + i * sh, img.width, sh);
    }
    if (burst) { // colour-split ghosts
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.25;
        ctx.drawImage(img, x - 6, y); ctx.drawImage(img, x + 6, y); ctx.restore();
    }
}
export function drawDistortionPremium(boss) {
    const B = once('d', buildDistortion); if (!B) return false;
    const L = light(), w = W(), h = H(), sx = SX();
    const burst = (Math.sin(L.t * 1.7) > 0.93) || (Math.sin(L.t * 0.63 + 1) > 0.97);
    fogBand([20, 70, 60]);
    tile(B.arcade, 0.05);
    const rx = w * 0.62, ry = 100;
    ctx.save(); ctx.globalAlpha = Math.min(1, L.breathe * (boss ? 0.5 : 0.66));
    sliced(B.rose, rx - B.rose.width / 2, ry - B.rose.height / 2, ctx.globalAlpha, L.t, burst, 1);
    ctx.restore();
    const bay = 250, off = (sx * 0.2) % bay;
    ctx.save(); ctx.globalAlpha = Math.min(1, L.breathe * 0.55);
    for (let i = -1; i < 5; i++) { const lx = i * bay - off + 60; if (Math.abs(lx - rx) < 150) continue; const img = B.lancets[((i % 3) + 3) % 3]; sliced(img, lx - 40, -18, ctx.globalAlpha, L.t, burst, i); }
    ctx.restore();
    floorShade();
    // light flickers through the broken glass
    const flick = burst ? 0.4 + Math.random() * 0.6 : 1;
    beams(L.inst ? B.beams.slice(3) : B.beams.slice(0, 3), L.inst ? INST : TEAL.slice(0, 3), bay, off, rx, { ...L, breathe: L.breathe * flick });
    // columns + masonry that floats a little out of place
    for (let i = -1; i < 6; i++) {
        const cx = i * bay - ((sx * 0.4) % bay) - 20;
        ctx.fillStyle = '#020605'; ctx.fillRect(cx, 0, 44, h);
        const rim = ctx.createLinearGradient(cx + 36, 0, cx + 44, 0); rim.addColorStop(0, 'rgba(52,211,153,0)'); rim.addColorStop(1, `rgba(52,211,153,${(0.18 * L.breathe).toFixed(3)})`);
        ctx.fillStyle = rim; ctx.fillRect(cx + 36, 0, 8, h);
        if (B.block) for (let k = 0; k < 2; k++) { const fy = 110 + k * 46 + Math.sin(L.t * 0.8 + i + k) * 5; ctx.save(); ctx.translate(cx + 22 + (k ? 10 : -8) + (burst ? 4 : 0), fy); ctx.rotate(Math.sin(L.t * 0.5 + i * 2 + k) * 0.25); ctx.drawImage(B.block, -17, -11); ctx.restore(); }
    }
    // faint scanlines over the back wall
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; for (let y = 0; y < h * HORIZON + 30; y += 4) ctx.fillRect(0, y, w, 1);
    return true;
}

// =====================================================================
// ARC 3 · COMPRESSION — the furnace nave
// =====================================================================
function buildCompression() {
    const w = W(), h = H();
    const furnace = buildRose(92, { palette: MOLTEN, medallion: [255, 240, 200], rim: 'rgba(255,120,60,0.5)', seed: 29, lead: 7 });
    if (!furnace) return null;
    // rivets on the furnace frame
    const fc = makeCanvas(furnace.width, furnace.height);
    if (fc) {
        fc.x.drawImage(furnace, 0, 0);
        const c = furnace.width / 2; fc.x.fillStyle = '#2a1410';
        for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; fc.x.beginPath(); fc.x.arc(c + Math.cos(a) * 89, c + Math.sin(a) * 89, 3, 0, Math.PI * 2); fc.x.fill(); }
    }
    // slatted vents: molten glass behind an iron grille
    const vent = (seed) => {
        const vw = 64, vh = 160, pad = 30, cv = makeCanvas(vw + pad * 2, vh + pad * 2);
        if (!cv) return null;
        const x = cv.x, r = mulberry(seed); x.translate(pad, pad);
        x.save(); archPath(x, vw, vh); x.clip();
        const g = x.createLinearGradient(0, 0, 0, vh); g.addColorStop(0, rgb([255, 170, 60])); g.addColorStop(0.5, rgb([255, 80, 30])); g.addColorStop(1, rgb([120, 20, 10]));
        x.fillStyle = g; x.fillRect(0, 0, vw, vh);
        for (let i = 0; i < 6; i++) { x.globalAlpha = 0.25; x.fillStyle = '#ffd08a'; x.fillRect(r() * vw, r() * vh, 2, 10 + r() * 20); }
        x.globalAlpha = 1; x.fillStyle = '#140504';
        for (let y = 26; y < vh; y += 14) x.fillRect(0, y, vw, 5);
        x.fillRect(vw / 2 - 2, 0, 4, vh);
        x.restore(); x.lineWidth = 8; x.strokeStyle = '#120403'; archPath(x, vw, vh); x.stroke();
        return withGlow(cv, 16);
    };
    // the press slab
    const slab = makeCanvas(w, 70);
    if (slab) {
        const x = slab.x; const g = x.createLinearGradient(0, 0, 0, 70); g.addColorStop(0, '#0d0302'); g.addColorStop(1, '#1d0806');
        x.fillStyle = g; x.fillRect(0, 0, w, 70);
        x.fillStyle = 'rgba(248,113,113,0.5)'; x.fillRect(0, 66, w, 2);
        x.fillStyle = '#331410'; for (let px = 12; px < w; px += 40) { x.beginPath(); x.arc(px, 58, 3, 0, Math.PI * 2); x.fill(); }
        x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; for (let px = 0; px < w; px += 200) { x.beginPath(); x.moveTo(px, 0); x.lineTo(px, 66); x.stroke(); }
    }
    const fg = makeCanvas(w, h);
    if (fg) { // chains above, a grate lip below
        const x = fg.x, r = mulberry(53); x.fillStyle = '#060101';
        for (let i = 0; i < 6; i++) { const cx = 80 + i * 170 + r() * 40, len = 40 + r() * 60; for (let y = 0; y < len; y += 12) { x.beginPath(); x.ellipse(cx, y, 4, 7, 0, 0, Math.PI * 2); x.fill(); } }
        x.fillRect(0, h - 40, w, 40);
        x.fillStyle = 'rgba(255,90,40,0.25)'; for (let px = 0; px < w; px += 18) x.fillRect(px, h - 40, 8, 3);
    }
    return {
        furnace: fc ? fc.c : furnace,
        vents: [vent(5), vent(9), vent(13)],
        slab: slab ? slab.c : null,
        arcade: buildArcade(w, h, '#2a0d0a'),
        heat: [[255, 110, 40], [255, 70, 30], [255, 150, 60], ...INST].map(c => buildBeam(c, 50, 160, 380)),
        fg: fg ? blurred(fg, 2) : null
    };
}
export function drawCompressionPremium(boss) {
    const B = once('c', buildCompression); if (!B) return false;
    const L = light(), w = W(), h = H(), sx = SX();
    fogBand([90, 20, 12]);
    tile(B.arcade, 0.05);
    // the walls lean in: dark wedges breathing at the edges
    const lean = 18 + Math.sin(L.t * 0.8) * 8;
    for (const side of [-1, 1]) {
        const x0 = side < 0 ? 0 : w, x1 = side < 0 ? 170 + lean : w - 170 - lean;
        const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#070101'); g.addColorStop(0.7, 'rgba(7,1,1,0.6)'); g.addColorStop(1, 'rgba(7,1,1,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x1 - side * 40, 0); ctx.lineTo(x1, h); ctx.lineTo(x0, h); ctx.closePath(); ctx.fill();
    }
    const rx = w * 0.62, ry = 110;
    ctx.save(); ctx.globalAlpha = Math.min(1, L.breathe * (boss ? 0.55 : 0.72));
    ctx.drawImage(B.furnace, rx - B.furnace.width / 2, ry - B.furnace.height / 2);
    const bay = 250, off = (sx * 0.2) % bay;
    for (let i = -1; i < 5; i++) { const lx = i * bay - off + 60; if (Math.abs(lx - rx) < 150) continue; const v = B.vents[((i % 3) + 3) % 3]; if (v) ctx.drawImage(v, lx - 30, 18); }
    ctx.restore();
    floorShade();
    // heat rising off the floor grates (beams flipped to point upward)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const set = L.inst ? B.heat.slice(3) : B.heat.slice(0, 3);
    for (let i = -1; i < 5; i++) {
        const lx = i * bay - off + 150, beam = set[((i % set.length) + set.length) % set.length];
        if (!beam) continue;
        ctx.globalAlpha = (0.055 + 0.03 * Math.sin(L.t * 2 + i)) * L.breathe;
        ctx.save(); ctx.translate(lx, h + 20); ctx.scale(1, -1); ctx.drawImage(beam, -beam.width / 2, 0); ctx.restore();
    }
    ctx.restore();
    // iron girders, coral rim-light, rivets
    for (let i = -1; i < 6; i++) {
        const cx = i * bay - ((sx * 0.4) % bay) - 20;
        ctx.fillStyle = '#080202'; ctx.fillRect(cx, 0, 44, h); ctx.fillRect(cx - 8, 0, 60, 10);
        const rim = ctx.createLinearGradient(cx + 36, 0, cx + 44, 0); rim.addColorStop(0, 'rgba(248,113,113,0)'); rim.addColorStop(1, `rgba(248,113,113,${(0.2 * L.breathe).toFixed(3)})`);
        ctx.fillStyle = rim; ctx.fillRect(cx + 36, 0, 8, h);
        ctx.fillStyle = '#2a0c08'; for (let y = 40; y < h; y += 60) { ctx.beginPath(); ctx.arc(cx + 10, y, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + 30, y, 2.5, 0, Math.PI * 2); ctx.fill(); }
    }
    // the press slab pumps down on its pistons
    const press = 4 + Math.max(0, Math.sin(L.t * 1.3)) * 20;
    for (let px = 100; px < w; px += 260) { ctx.fillStyle = '#140504'; ctx.fillRect(px, 0, 16, press + 6); ctx.fillStyle = 'rgba(248,113,113,0.3)'; ctx.fillRect(px + 6, 0, 3, press + 6); }
    if (B.slab) ctx.drawImage(B.slab, 0, press - 40);
    return true;
}

// =====================================================================
// ARC 4 · MIRAGE — the flooded mirror
// =====================================================================
function buildMirage() {
    const w = W(), h = H();
    const hero = buildLancet(118, 150, 211, VIOLET[0], VIOLET, [255, 220, 250]);
    if (!hero) return null;
    const prism = (seed, s) => {
        const pad = 30, cv = makeCanvas(s * 2 + pad * 2, s * 2 + pad * 2);
        if (!cv) return null;
        const x = cv.x, r = mulberry(seed); x.translate(s + pad, s + pad);
        const p = [[0, -s], [s * 0.87, s * 0.5], [-s * 0.87, s * 0.5]], c = [0, s * 0.05];
        for (let k = 0; k < 3; k++) { // three panes meeting at the centre
            const a = p[k], b = p[(k + 1) % 3];
            x.__bounds = [-s, -s, s * 2, s * 2];
            pane(x, () => { x.beginPath(); x.moveTo(...c); x.lineTo(...a); x.lineTo(...b); x.closePath(); }, VIOLET[(k + Math.floor(r() * 5)) % 5], r, 3);
        }
        return withGlow(cv, 12);
    };
    const fg = makeCanvas(w, h);
    if (fg) { // crystal shards overhead, the water's dark lip below
        const x = fg.x, r = mulberry(67); x.fillStyle = '#05010a';
        for (let i = 0; i < 9; i++) { const cx = i * 115 + r() * 40, len = 30 + r() * 70, wd = 10 + r() * 14; x.beginPath(); x.moveTo(cx - wd, 0); x.lineTo(cx + wd, 0); x.lineTo(cx + r() * 6, len); x.closePath(); x.fill(); }
        x.fillRect(0, h - 30, w, 30); x.fillStyle = 'rgba(192,132,252,0.3)'; x.fillRect(0, h - 30, w, 1.5);
    }
    return {
        hero, prisms: [prism(3, 34), prism(8, 28), prism(12, 40), prism(17, 26)],
        arcade: buildArcade(w, h, '#140a24'),
        beams: [VIOLET[0], VIOLET[2], VIOLET[3], ...INST].map(c => buildBeam(c, 40, 150, 420)),
        fg: fg ? blurred(fg, 2.5) : null
    };
}
export function drawMiragePremium(boss) {
    const B = once('m', buildMirage); if (!B) return false;
    const L = light(), w = W(), h = H(), sx = SX(), hy = h * HORIZON;
    fogBand([40, 20, 70]);
    tile(B.arcade, 0.05);
    // the hero window, and its reflection shimmering in the flooded floor
    const rx = w * 0.5, hero = B.hero, hx = rx - hero.width / 2, hyTop = -14;
    ctx.save(); ctx.globalAlpha = Math.min(1, L.breathe * (boss ? 0.5 : 0.66)); ctx.drawImage(hero, hx, hyTop); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.16 * L.breathe;
    const n = 24, sh = hero.height / n;
    for (let i = 0; i < n; i++) {
        const sy = hero.height - (i + 1) * sh, dy = hy + 8 + i * sh * 0.8, dx = Math.sin(i * 0.7 + L.t * 2.4) * (2 + i * 0.25);
        ctx.drawImage(hero, 0, sy, hero.width, sh, hx + dx, dy, hero.width, sh * 0.8);
    }
    ctx.restore();
    // slender pillars with heat-shimmer reflections
    const bay = 200;
    for (let i = -1; i < 7; i++) {
        const px = i * bay - ((sx * 0.25) % bay) + 30;
        if (Math.abs(px - rx) < 110) continue;
        ctx.fillStyle = '#0a0214'; ctx.fillRect(px, 0, 26, hy);
        ctx.fillStyle = `rgba(192,132,252,${(0.18 * L.breathe).toFixed(3)})`; ctx.fillRect(px + 20, 0, 4, hy);
        for (let y = 0; y < hy * 0.8; y += 10) { const wob = Math.sin(y * 0.09 + L.t * 3 + i) * (1 + y * 0.02); ctx.fillStyle = `rgba(30,6,50,${(0.5 * (1 - y / hy)).toFixed(3)})`; ctx.fillRect(px + wob * 2, hy + y, 26, 9); }
    }
    ctx.fillStyle = 'rgba(192,132,252,0.3)'; ctx.fillRect(0, hy, w, 1.5);
    floorShade();
    beams(L.inst ? B.beams.slice(3) : B.beams.slice(0, 3), L.inst ? INST : [VIOLET[0], VIOLET[2], VIOLET[3]], 250, (sx * 0.2) % 250, rx, L, 150);
    // floating stained-glass prisms, bobbing and turning slowly (above the lanes)
    for (let i = 0; i < 6; i++) {
        const img = B.prisms[i % B.prisms.length]; if (!img) continue;
        const x = ((i * 190 - sx * 0.15) % (w + 200) + w + 200) % (w + 200) - 100;
        if (Math.abs(x - rx) < 90) continue;
        const y = 50 + (i * 37) % 90 + Math.sin(L.t + i) * 8;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(L.t * 0.3 + i) * 0.6); ctx.globalAlpha = 0.75 * L.breathe;
        ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
    }
    // a slow sheen across the water
    const shx = ((L.t * 120) % (w + 600)) - 300, g = ctx.createLinearGradient(shx - 150, 0, shx + 150, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.035)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, hy, w, h - hy);
    return true;
}

// =====================================================================
// ARC 5 · DOMINION — the eclipse crown
// =====================================================================
function buildDominion() {
    const w = W(), h = H(), R = 80, pad = 70, S = R * 2 + pad * 2;
    const cv = makeCanvas(S, S + 40);
    if (!cv) return null;
    const x = cv.x, r = mulberry(97); x.translate(S / 2, S / 2 + 30);
    // a sunburst of glass rays around a black eclipse disc
    const n = 28;
    for (let i = 0; i < n; i++) {
        const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, outer = i % 2 ? R : R * 0.86;
        x.__bounds = [-R, -R, R * 2, R * 2];
        pane(x, () => { x.beginPath(); x.arc(0, 0, outer, a0, a1); x.arc(0, 0, R * 0.6, a1, a0, true); x.closePath(); }, GOLD[(i + (i % 3)) % GOLD.length], r, 4);
    }
    // crown spikes of glass on top
    for (let k = -2; k <= 2; k++) {
        const a = -Math.PI / 2 + k * 0.36, bx = Math.cos(a) * R, by = Math.sin(a) * R, tall = k === 0 ? 34 : 22;
        const nx = Math.cos(a), ny = Math.sin(a);
        x.__bounds = [bx - 20, by - tall, 40, tall + 10];
        pane(x, () => { x.beginPath(); x.moveTo(bx - ny * 11, by + nx * 11); x.lineTo(bx + nx * tall, by + ny * tall); x.lineTo(bx + ny * 11, by - nx * 11); x.closePath(); }, k === 0 ? [255, 60, 60] : GOLD[3], r, 4);
    }
    // the eclipse itself: black, gold-rimmed
    x.beginPath(); x.arc(0, 0, R * 0.6, 0, Math.PI * 2); x.fillStyle = '#020100'; x.fill();
    x.lineWidth = 6; x.strokeStyle = LEAD; x.stroke();
    x.lineWidth = 2; x.strokeStyle = 'rgba(250,204,21,0.8)'; x.beginPath(); x.arc(0, 0, R * 0.6 + 4, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 12; x.strokeStyle = '#0b0903'; x.beginPath(); x.arc(0, 0, R + 4, 0, Math.PI * 2); x.stroke();
    const crown = withGlow(cv, 24);
    // an obsidian monolith with gold inlay and a small glass emblem
    const mono = makeCanvas(84, h);
    if (mono) {
        const m = mono.x, g = m.createLinearGradient(0, 0, 84, 0); g.addColorStop(0, '#040302'); g.addColorStop(0.8, '#0a0805'); g.addColorStop(1, '#151007');
        m.fillStyle = g; m.fillRect(0, 0, 84, h);
        m.fillStyle = 'rgba(250,204,21,0.45)'; m.fillRect(80, 0, 3, h * 0.4); m.fillRect(6, 70, 72, 2); m.fillRect(6, 76, 72, 1);
        m.strokeStyle = 'rgba(250,204,21,0.25)'; m.lineWidth = 1; m.strokeRect(14, 96, 56, 70);
        m.__bounds = [26, 108, 32, 46];
        pane(m, () => { m.beginPath(); m.moveTo(42, 108); m.lineTo(58, 131); m.lineTo(42, 154); m.lineTo(26, 131); m.closePath(); }, [200, 30, 40], r, 3);
    }
    const fg = makeCanvas(w, h);
    if (fg) { // banners above, braziers at the bottom corners
        const f = fg.x;
        for (let i = 0; i < 4; i++) {
            const bx = 90 + i * 260;
            f.fillStyle = '#120204'; f.beginPath(); f.moveTo(bx, 0); f.lineTo(bx + 40, 0); f.lineTo(bx + 40, 66); f.lineTo(bx + 20, 54); f.lineTo(bx, 66); f.closePath(); f.fill();
            f.strokeStyle = 'rgba(250,204,21,0.45)'; f.lineWidth = 2; f.stroke();
        }
        f.fillStyle = '#050300'; f.fillRect(0, h - 34, w, 34);
        f.fillStyle = 'rgba(250,204,21,0.35)'; f.fillRect(0, h - 34, w, 1.5);
    }
    return {
        crown, mono: mono ? mono.c : null,
        rays: [[250, 204, 21], [255, 160, 30], ...INST].map(c => buildBeam(c, 30, 120, 360)),
        arcade: buildArcade(w, h, '#1c1606'),
        fg: fg ? blurred(fg, 2) : null
    };
}
export function drawDominionPremium(boss) {
    const B = once('o', buildDominion); if (!B) return false;
    const L = light(), w = W(), h = H(), sx = SX(), hy = h * HORIZON;
    fogBand([80, 60, 10]);
    tile(B.arcade, 0.05);
    const cx = w * 0.5, cy = 120; // crown centre lands ~y115: spikes stay on screen, glass ends above the top lane
    // god-rays turning slowly behind the crown
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(cx, cy); ctx.rotate(L.t * 0.04);
    const rays = L.inst ? B.rays.slice(2) : B.rays.slice(0, 2);
    for (let i = 0; i < 12; i++) {
        const img = rays[i % rays.length]; if (!img) continue;
        ctx.save(); ctx.rotate(i / 12 * Math.PI * 2); ctx.globalAlpha = (0.06 + 0.03 * Math.sin(L.t + i)) * L.breathe * (boss ? 0.7 : 1);
        ctx.drawImage(img, -img.width / 2, 60); ctx.restore();
    }
    ctx.restore();
    // monoliths (behind the crown)
    const bay = 300;
    if (B.mono) for (let i = -1; i < 5; i++) {
        const mx = i * bay - ((sx * 0.3) % bay) + 20;
        if (Math.abs(mx + 42 - cx) < 150) continue;
        ctx.drawImage(B.mono, mx, 0);
    }
    ctx.save(); ctx.globalAlpha = Math.min(1, L.breathe * (boss ? 0.55 : 0.72));
    ctx.drawImage(B.crown, cx - B.crown.width / 2, cy - B.crown.height / 2 - 15); ctx.restore();
    floorShade();
    // black marble, a sparse gold lattice, gold pools of light
    const off = sx % 170; ctx.strokeStyle = 'rgba(250,204,21,0.05)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -w; x < w * 2; x += 170) { const bx = x - off; ctx.moveTo(w / 2 + (bx - w / 2) * 0.25, hy); ctx.lineTo(bx + 260, h); ctx.moveTo(w / 2 + (bx - w / 2) * 0.25, hy); ctx.lineTo(bx - 260, h); }
    ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const pg = ctx.createRadialGradient(cx, h - 80, 10, cx, h - 80, 320);
    pg.addColorStop(0, rgb(L.inst ? [255, 0, 200] : [250, 204, 21], 0.08 * L.breathe)); pg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(cx, h - 80, 320, 60, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(250,204,21,0.3)'; ctx.fillRect(0, hy, w, 1);
    return true;
}

// ---------- foreground framing for Arcs 2-5 (drawn after the fighters) ----------
export function drawPremiumForeground(arc) {
    const B = built[{ 2: 'd', 3: 'c', 4: 'm', 5: 'o' }[arc]];
    if (!B || !B.fg) return;
    tile(B.fg, 1.1);
    if (arc === 5) { // brazier flames, bottom corners
        const t = Date.now() * 0.001, h = H();
        for (const bx of [40, W() - 40]) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(bx, h - 46, 2, bx, h - 46, 40 + Math.sin(t * 9 + bx) * 4);
            g.addColorStop(0, 'rgba(255,220,120,0.6)'); g.addColorStop(1, 'rgba(255,120,20,0)');
            ctx.fillStyle = g; ctx.fillRect(bx - 50, h - 100, 100, 70); ctx.restore();
            ctx.fillStyle = '#0a0602'; ctx.fillRect(bx - 16, h - 44, 32, 12);
        }
    }
    if (arc === 3) { // steam puffing off the grate
        const t = Date.now() * 0.001, h = H();
        for (let i = 0; i < 5; i++) {
            const k = ((t * 0.4 + i * 0.2) % 1), x = 120 + i * 190, y = h - 40 - k * 80;
            ctx.fillStyle = `rgba(255,220,200,${(0.08 * (1 - k)).toFixed(3)})`;
            ctx.beginPath(); ctx.ellipse(x, y, 20 + k * 30, 10 + k * 14, 0, 0, Math.PI * 2); ctx.fill();
        }
    }
}
