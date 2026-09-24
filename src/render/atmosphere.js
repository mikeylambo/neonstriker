import { gameState as st } from '../state.js';
import { ctx } from '../engine_core.js';
import { CONSTANTS } from '../constants.js';

export function initAtmosphere() {
    st.ambientDust = []; 
    for (let i = 0; i < 30; i++) st.ambientDust.push({ x: Math.random() * st.width, y: Math.random() * st.height, vx: (Math.random() - 0.5) * 0.5 - 1, vy: (Math.random() - 0.5) * 0.5, size: Math.random() * 3 + 1, alpha: Math.random() * 0.5 });
    
    st.cathedralShards = []; 
    for (let i = 0; i < 15; i++) { 
        let pts = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 })); 
        st.cathedralShards.push({ x: Math.random() * st.width * 2, y: Math.random() * st.height, size: Math.random() * 80 + 40, angle: Math.random() * Math.PI * 2, speed: Math.random() * 0.2 + 0.1, rotSpeed: (Math.random() - 0.5) * 0.01, color: 'rgba(0, 255, 255, 0.03)', points: pts }); 
    }

    st.cathedralPillars = []; for (let i = 0; i < 8; i++) st.cathedralPillars.push({ x: i * 250, w: 60, speed: 0.5 });
    st.lightShafts = []; for (let i = 0; i < 3; i++) st.lightShafts.push({ x: st.width * 0.2 + (i * 300), speed: 0.1 });
    
    st.roseWindow = { x: st.width * 0.8, baseY: st.height * 0.25, y: st.height * 0.25, rotation: 0, floatTime: 0, petals: [] }; 
    for (let i = 0; i < 8; i++) if (Math.random() > 0.15) st.roseWindow.petals.push(i * (Math.PI / 4));
    
    st.foregroundLines = []; for (let i = 0; i < 5; i++) st.foregroundLines.push({ x: Math.random() * st.width, y: st.height - Math.random() * 100, speed: Math.random() * 15 + 10, length: Math.random() * 100 + 50, alpha: Math.random() * 0.3 + 0.1 });
}

export function updateAtmosphere() {
    let scrollSpeed = st.scrollX * (st.stageSpeedMult || 1.0);

    st.ambientDust.forEach(d => { 
        d.x += d.vx - (scrollSpeed * 0.01); 
        const lk = CONSTANTS.getLevelInArc(st.currentStage);
        if (lk === 3 || lk === 5) d.y += d.vy + 2.0; 
        else d.y += d.vy; 
        
        if (d.x < 0) d.x = st.width; 
        if (d.y < 0) d.y = st.height; 
        if (d.y > st.height) d.y = 0; 
    });
    
    st.foregroundLines.forEach(f => { f.x -= f.speed + (scrollSpeed * 0.2); if (f.x + f.length < 0) { f.x = st.width + Math.random() * 500; f.y = st.height - Math.random() * 100; } });
    st.cathedralPillars.forEach(p => { p.x -= p.speed + (scrollSpeed * 0.01); if (p.x < -200) p.x = st.width + 200; });
    st.lightShafts.forEach(L => { L.x -= L.speed + (scrollSpeed * 0.005); if (L.x < -500) L.x = st.width + 200; });
    
    st.cathedralShards.forEach(s => { s.x -= s.speed + (scrollSpeed * 0.05); s.angle += s.rotSpeed; if (s.x < -200) s.x = st.width + 200; });
    st.roseWindow.rotation += 0.0005; st.roseWindow.floatTime += 0.01; st.roseWindow.y = st.roseWindow.baseY + Math.sin(st.roseWindow.floatTime) * 15; st.roseWindow.x -= (scrollSpeed * 0.002); if (st.roseWindow.x < -400) st.roseWindow.x = st.width + 400;
}

// v16 STAGE TRANSITIONS: the arena palette is lerped between two level palettes
// (st.paletteFrom -> st.paletteTo by st.paletteT) instead of switching on the
// stage number, so a transition MORPHS one arena into the next rather than
// hard-cutting. Outside a transition paletteT sits at 1 on the current stage.
const lerp = (a, b, t) => a + (b - a) * t;
const mixRGB = (a, b, t) => `rgb(${Math.round(lerp(a[0], b[0], t))}, ${Math.round(lerp(a[1], b[1], t))}, ${Math.round(lerp(a[2], b[2], t))})`;
const mixRGBA = (a, b, t) => `rgba(${Math.round(lerp(a[0], b[0], t))}, ${Math.round(lerp(a[1], b[1], t))}, ${Math.round(lerp(a[2], b[2], t))}, ${lerp(a[3], b[3], t).toFixed(3)})`;

export function currentPalette() {
    const P = CONSTANTS.PALETTES;
    const from = P[st.paletteFrom] || P[1];
    const to = P[st.paletteTo] || P[CONSTANTS.paletteKeyForStage(st.currentStage)] || P[1];
    const t = Math.min(1, Math.max(0, st.paletteT === undefined ? 1 : st.paletteT));
    return { from, to, t };
}

export function drawAtmosphere() {
    let grad = ctx.createLinearGradient(0, 0, 0, st.height); 
    const { from, to, t } = currentPalette();
    
    if (st.purifyTimer > 0) { 
        let pAlpha = st.purifyTimer / 100; 
        grad.addColorStop(0, `rgba(2, 30, 60, ${pAlpha})`); grad.addColorStop(0.5, `rgba(10, 40, 70, ${pAlpha})`); grad.addColorStop(1, `rgba(5, 15, 30, ${pAlpha})`); 
    } else {
        grad.addColorStop(0, mixRGB(from.top, to.top, t));
        grad.addColorStop(0.5, mixRGB(from.mid, to.mid, t));
        grad.addColorStop(1, mixRGB(from.bot, to.bot, t));
    }
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, st.width, st.height); 
    
    const accentColor = mixRGBA(from.accent, to.accent, t);
    const shardColor = mixRGBA(from.shard, to.shard, t);

    st.lightShafts.forEach(L => { 
        let gradLight = ctx.createLinearGradient(L.x, 0, L.x + 200, st.height);
        gradLight.addColorStop(0, accentColor);
        gradLight.addColorStop(1, 'transparent');
        ctx.fillStyle = gradLight;
        ctx.beginPath(); ctx.moveTo(L.x, 0); ctx.lineTo(L.x + 150, 0); ctx.lineTo(L.x + 300, st.height); ctx.lineTo(L.x + 150, st.height); ctx.fill(); 
    });
    
    ctx.save(); 
    ctx.translate(st.roseWindow.x, st.roseWindow.y); 
    ctx.rotate(st.roseWindow.rotation); 
    ctx.strokeStyle = st.purifyTimer > 0 ? 'rgba(0, 255, 255, 0.1)' : shardColor; 
    ctx.lineWidth = 4; 
    ctx.beginPath(); ctx.arc(0, 0, 250, 0, Math.PI * 2); ctx.stroke();
    
    st.roseWindow.petals.forEach(angle => { 
        ctx.save(); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(60, 220); ctx.lineTo(0, 280); ctx.lineTo(-60, 220); ctx.closePath(); 
        ctx.fillStyle = st.purifyTimer > 0 ? 'rgba(0, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.2)'; ctx.fill(); ctx.stroke(); 
        ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(30, 140); ctx.lineTo(-30, 140); ctx.closePath();
        ctx.strokeStyle = st.purifyTimer > 0 ? 'rgba(0, 255, 255, 0.15)' : shardColor; ctx.stroke();
        ctx.restore(); 
    });
    
    ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fillStyle = st.purifyTimer > 0 ? 'rgba(0, 255, 255, 0.1)' : shardColor; ctx.fill(); ctx.stroke(); 
    ctx.restore();
    
    ctx.fillStyle = '#030305'; 
    st.cathedralPillars.forEach(p => { 
        ctx.fillRect(p.x, 0, p.w, st.height); 
        ctx.fillStyle = shardColor; ctx.fillRect(p.x + 5, 0, 5, st.height); ctx.fillStyle = '#030305';
    });

    ctx.save();
    st.cathedralShards.forEach(shard => {
        ctx.translate(shard.x, shard.y);
        ctx.rotate(shard.angle);
        ctx.fillStyle = shardColor;
        ctx.strokeStyle = shardColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        shard.points.forEach((p, i) => {
            if(i === 0) ctx.moveTo(p.x * shard.size, p.y * shard.size);
            else ctx.lineTo(p.x * shard.size, p.y * shard.size);
        });
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.rotate(-shard.angle);
        ctx.translate(-shard.x, -shard.y);
    });
    ctx.restore();
}

// v16 NEON LIGHT SWEEP: a bright vertical band that crosses the arena during a
// stage transition (st.lightSweep 0..1; <0 = off). Drawn over the arena, under
// the fighters, so it reads as the ring re-lighting itself.
export function drawLightSweep() {
    if (!(st.lightSweep >= 0 && st.lightSweep <= 1)) return;
    const { to } = currentPalette();
    const x = -250 + st.lightSweep * (st.width + 500);
    const c = to.shard;
    const g = ctx.createLinearGradient(x - 220, 0, x + 220, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.42, `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.18)`);
    g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.58, `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.18)`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 220, 0, 440, st.height);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(x - 1, 0, 2, st.height);
}
