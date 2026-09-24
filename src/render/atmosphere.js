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
        if (st.currentStage === 3 || st.currentStage === 5) d.y += d.vy + 2.0; 
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

export function drawAtmosphere() {
    let grad = ctx.createLinearGradient(0, 0, 0, st.height); 
    
    // FIX: same mod-6-vs-mod-7 desync as the wave-packet bug — this used to reset
    // to Stage 1's palette on every boss chamber instead of using its own. Boss
    // chambers (level 7 of each arc) now share level 6's "Throne of Static" palette.
    let levelInArc = CONSTANTS.getLevelInArc(st.currentStage);
    let cStage = levelInArc === 7 ? 6 : levelInArc;
    
    if (st.purifyTimer > 0) { 
        let pAlpha = st.purifyTimer / 100; 
        grad.addColorStop(0, `rgba(2, 30, 60, ${pAlpha})`); grad.addColorStop(0.5, `rgba(10, 40, 70, ${pAlpha})`); grad.addColorStop(1, `rgba(5, 15, 30, ${pAlpha})`); 
    } else if (cStage === 1) { 
        grad.addColorStop(0, '#020205'); grad.addColorStop(0.5, '#05050a'); grad.addColorStop(1, '#0a0a14');
    } else if (cStage === 2) { 
        grad.addColorStop(0, '#001a1a'); grad.addColorStop(0.5, '#002b33'); grad.addColorStop(1, '#00404d');
    } else if (cStage === 3) { 
        grad.addColorStop(0, '#1a0505'); grad.addColorStop(0.5, '#2b0a0a'); grad.addColorStop(1, '#4d1010');
    } else if (cStage === 4) { // Midnight Causeway
        grad.addColorStop(0, '#140026'); grad.addColorStop(0.5, '#20003b'); grad.addColorStop(1, '#3d004d');
    } else if (cStage === 5) { // Abyss Rail
        grad.addColorStop(0, '#000000'); grad.addColorStop(0.5, '#020502'); grad.addColorStop(1, '#051005');
    } else { // Throne of Static
        grad.addColorStop(0, '#1a1a1a'); grad.addColorStop(0.5, '#333333'); grad.addColorStop(1, '#4d4d4d');
    }
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, st.width, st.height); 
    
    let accentColor = 'rgba(0, 255, 255, 0.02)';
    let shardColor = 'rgba(0, 255, 255, 0.05)';
    if (cStage === 2) { accentColor = 'rgba(0, 255, 255, 0.04)'; shardColor = 'rgba(0, 255, 255, 0.09)'; }
    else if (cStage === 3) { accentColor = 'rgba(255, 50, 50, 0.03)'; shardColor = 'rgba(255, 50, 50, 0.06)'; }
    else if (cStage === 4) { accentColor = 'rgba(255, 0, 255, 0.03)'; shardColor = 'rgba(255, 0, 255, 0.08)'; }
    else if (cStage === 5) { accentColor = 'rgba(0, 255, 0, 0.02)'; shardColor = 'rgba(0, 255, 0, 0.04)'; }
    else if (cStage === 6) { accentColor = 'rgba(255, 255, 255, 0.05)'; shardColor = 'rgba(255, 255, 255, 0.15)'; }

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