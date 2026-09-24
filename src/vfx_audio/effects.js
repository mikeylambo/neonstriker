import { gameState as st } from '../state.js';
import { playSound } from './audio.js';
import { flashScale } from '../systems/settings.js';

export function spawnFloatingText(x, y, text, color) { 
    st.floatingTexts.push({ x: x, y: y, text: text, color: color, life: 1.0, velocity: -1.5 }); 
}

// --- FIXED: Toast Cascade Logic ---
// Checks if other texts exist in the same area and cascades them downwards so they remain readable!
export function showToast(msg, color='#fff') { 
    let yOffset = 0;
    st.floatingTexts.forEach(ft => {
        if (ft.y >= st.height * 0.25 - 10 && ft.y <= st.height * 0.25 + 100 && ft.life > 0.5) {
            yOffset += 25;
        }
    });

    spawnFloatingText(st.width / 2, st.height * 0.25 + yOffset, msg, color); 
    
    if (st.floatingTexts.length > 0) {
        st.floatingTexts[st.floatingTexts.length - 1].velocity = -0.5; 
        st.floatingTexts[st.floatingTexts.length - 1].life = 2.0; 
    }
}

export function triggerShockwave(x, y, color) { 
    st.shockwaves.push({ x: x, y: y, radius: 10, maxRadius: 300, color: color, alpha: 1.0 }); 
}

export function doFlash(amt) { 
    const scaled = amt * flashScale();
    if (scaled <= 0.001) return;
    const sf = document.getElementById('screen-flash');
    if(sf) { sf.style.opacity = scaled; setTimeout(() => { sf.style.opacity = 0; }, 60); }
}

// v16 LIVE SCORE: floating "+120" pops at the point of impact. Kept in their own
// list (not floatingTexts) so they render smaller/brighter and never push toasts
// around in the cascade logic above.
export function spawnScorePop(x, y, pts, big = false) {
    if (!st.scorePops) st.scorePops = [];
    if (st.scorePops.length > 24) st.scorePops.shift();
    st.scorePops.push({ x: x + (Math.random() * 30 - 15), y, text: `+${pts.toLocaleString()}`, life: 1.0, big });
}

export function createImpact(x, y, color) { 
    if (st.particles.length > 100) return; 
    let count = st.particles.length > 80 ? 3 : 5; 
    for (let i = 0; i < count; i++) {
        st.particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 1, color: color || '#fff', type: 'spark' }); 
    }
}

export function createVacuum(cx, cy) { 
    for (let i = 0; i < 15; i++) { 
        let a = Math.random() * Math.PI * 2; let d = 60 + Math.random() * 40; 
        st.particles.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, vx: -Math.cos(a) * 10, vy: -Math.sin(a) * 10, life: 0.5, color: '#ffffff', type: 'vacuum' }); 
    } 
}

export function createShatter(x, y, color) { 
    for (let i = 0; i < 20; i++) {
        st.particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 1.5, color: color, type: 'shard', size: Math.random() * 8 + 3, rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.5 }); 
    }
    playSound('shatter');
}

export function updateParticlesAndTrails() {
    updateKoFx();
    for (let i = st.particles.length - 1; i >= 0; i--) { 
        st.particles[i].x += st.particles[i].vx; 
        st.particles[i].y += st.particles[i].vy; 
        st.particles[i].life -= 0.04; 
        if (st.particles[i].life <= 0) st.particles.splice(i, 1); 
    }
    
    for (let i = st.floatingTexts.length - 1; i >= 0; i--) { 
        st.floatingTexts[i].y += st.floatingTexts[i].velocity; 
        st.floatingTexts[i].life -= 0.02; 
        if (st.floatingTexts[i].life <= 0) st.floatingTexts.splice(i, 1); 
    }
    
    if (st.scorePops) for (let i = st.scorePops.length - 1; i >= 0; i--) {
        st.scorePops[i].y -= st.scorePops[i].big ? 0.9 : 1.3;
        st.scorePops[i].life -= st.scorePops[i].big ? 0.014 : 0.025;
        if (st.scorePops[i].life <= 0) st.scorePops.splice(i, 1);
    }

    for (let i = st.shockwaves.length - 1; i >= 0; i--) {
        st.shockwaves[i].radius += 15;
        st.shockwaves[i].alpha -= 0.05;
        if (st.shockwaves[i].alpha <= 0) st.shockwaves.splice(i, 1);
    }

    if (st.player && st.player.trails) {
        st.player.trails.forEach(t => { t.opacity -= 0.06; }); 
        st.player.trails = st.player.trails.filter(t => t.opacity > 0);
        st.player.trailTimer--;
        
        if (st.player.trailTimer <= 0 && (st.isInstinct || st.player.state === 'ghost_step')) {
            st.player.trails.push({ x: st.player.x, y: st.player.y, lane: st.player.lane, opacity: 0.6, state: st.player.state, punchType: st.player.punchType, hitFrame: st.player.hitFrame, slipBuff: st.player.slipBuff, instinct: st.isInstinct });
            st.player.trailTimer = 4; 
            if (st.player.trails.length > 6) st.player.trails.shift();
        }
    }
}
// ==========================================
// v17 KO SHATTER: a KO'd enemy breaks into neon light shards in its own colour;
// after a beat the shards pull together into an orb pickup that streams into the
// Striker (EXP is already banked on the kill — the orb is the readable payoff).
// ==========================================
export function createKoShatter(en) {
    if (!st.koFx) st.koFx = [];
    if (st.koFx.length > 14) st.koFx.shift();
    const cx = en.x + (en.w || 50) / 2, cy = en.y - (en.h || 110) * 0.55;
    const shards = [];
    const n = en.isBoss ? 28 : 14;
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 7;
        shards.push({ x: cx + (Math.random() - 0.5) * 30, y: cy + (Math.random() - 0.5) * 70, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, rot: Math.random() * 6, rv: (Math.random() - 0.5) * 0.4, size: 4 + Math.random() * 7 });
    }
    st.koFx.push({ shards, color: en.color || '#ff0055', cx, cy, t: 0, orb: null, big: !!en.isBoss });
    playSound('shatter');
}

export function updateKoFx() {
    if (!st.koFx || !st.koFx.length) return;
    const p = st.player;
    for (const fx of st.koFx) {
        fx.t++;
        if (fx.t < 14) {
            fx.shards.forEach(s => { s.x += s.vx; s.y += s.vy; s.vx *= 0.9; s.vy *= 0.9; s.rot += s.rv; });
        } else if (!fx.orb) {
            // shards converge on the collection point...
            fx.shards.forEach(s => { s.x += (fx.cx - s.x) * 0.22; s.y += (fx.cy - s.y) * 0.22; s.rot += s.rv * 2; });
            if (fx.t >= 26) fx.orb = { x: fx.cx, y: fx.cy, vx: 0, vy: -3, life: 1 };
        } else {
            // ...into an orb that homes onto the Striker
            const o = fx.orb, tx = p ? p.x + 25 : 180, ty = p ? p.y - 70 : 300;
            const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy) || 1;
            o.vx = o.vx * 0.82 + (dx / d) * 2.6; o.vy = o.vy * 0.82 + (dy / d) * 2.6;
            o.x += o.vx; o.y += o.vy;
            if (d < 26 || fx.t > 110) { fx.done = true; st.orbPulse = 12; playSound('orb'); }
        }
    }
    st.koFx = st.koFx.filter(fx => !fx.done);
    if (st.orbPulse > 0) st.orbPulse--;
}
