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