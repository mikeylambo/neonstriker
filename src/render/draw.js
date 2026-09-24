import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { ctx } from '../engine_core.js';
import { drawAtmosphere, drawLightSweep } from './atmosphere.js';
import { drawBoxer } from './boxer.js';
import { SequenceManager } from '../systems/sequences.js';
import { shakeScale } from '../systems/settings.js';
import { drawScorePops, drawBossTells, drawBossHud, drawFinisherDim, drawFinisherUI, drawVignette } from './overlays.js';

const dl = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };

export function draw() {
    ctx.shadowBlur = 0; 
    ctx.clearRect(0, 0, st.width, st.height); 
    ctx.save();
    
    const shake = st.shake * shakeScale();
    if (shake > 1) {
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    // v16 FINISHER CAMERA: push in on the exchange (skipped under reduced motion —
    // finisher.js holds finisherZoom at 1 then).
    const zoom = st.finisher ? (st.finisherZoom || 1) : 1;
    if (zoom !== 1 && st.finisher && st.finisher.boss) {
        const fx = (st.player.x + st.finisher.boss.x) / 2 + 20, fy = st.player.y - 70;
        ctx.translate(fx, fy); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy);
    }
    
    if (st.bossIntroTimer > 0) { 
        ctx.fillStyle = 'rgba(255, 0, 85, 0.15)'; 
        ctx.fillRect(0, 0, st.width, st.height); 
    }

    drawAtmosphere();
    drawLightSweep();
    
    let pLY = st.height * CONSTANTS.LANE_Y[st.player.lane];
    let pG = ctx.createLinearGradient(st.player.x - 150, 0, st.player.x + 150, 0);
    pG.addColorStop(0, 'rgba(0, 255, 255, 0)'); 
    pG.addColorStop(0.5, 'rgba(0, 255, 255, 0.15)'); 
    pG.addColorStop(1, 'rgba(0, 255, 255, 0)');
    ctx.strokeStyle = pG; 
    ctx.lineWidth = 6; 
    ctx.beginPath(); ctx.moveTo(st.player.x - 150, pLY); ctx.lineTo(st.player.x + 150, pLY); ctx.stroke();

    st.shockwaves.forEach(sw => {
        ctx.globalAlpha = sw.alpha;
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.globalAlpha = 1.0;

    ctx.strokeStyle = st.isInstinct ? 'rgba(255, 0, 255, 0.2)' : 'rgba(0, 255, 255, 0.06)';
    ctx.lineWidth = 1; 
    ctx.beginPath();
    for(let i=0; i < st.width + 100; i += 80) { 
        let xPos = (i - (st.scrollX % 80)); 
        ctx.moveTo(xPos, st.height * 0.4); 
        ctx.lineTo(xPos, st.height); 
    } 
    ctx.stroke();

    CONSTANTS.LANE_Y.forEach((yPct, index) => {
        const state = st.laneFlash[index];
        if (state === 2) { 
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; 
            ctx.lineWidth = 16; 
            dl(0, st.height * yPct, st.width, st.height * yPct);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
        } 
        else if (state === 1) { 
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.65)'; 
            ctx.lineWidth = 6; 
        } 
        else if (st.laneTempo && st.laneTempo[index] > 1) {
            // HOT LANE — an always-on, silent telegraph: a warm, streaking rail. Drawn
            // only in the neutral state, so the red/white slip telegraph always wins and
            // the sacred read is never obscured. Motion (dash offset) reads "running hot"
            // without any color on the player or any reliance on sound.
            const y = st.height * yPct;
            ctx.strokeStyle = 'rgba(255, 95, 30, 0.14)';
            ctx.lineWidth = 12;
            dl(0, y, st.width, y);
            ctx.strokeStyle = 'rgba(255, 150, 50, 0.6)';
            ctx.lineWidth = 3;
            ctx.setLineDash([26, 18]);
            ctx.lineDashOffset = -((st.scrollX * 2) % 44);
            dl(0, y, st.width, y);
            ctx.setLineDash([]);
            return; // skip the default rail for this lane
        }
        else {
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 4;
        }
        dl(0, st.height * yPct, st.width, st.height * yPct);
    });

    // LANE HAZARDS — amber pulsing WARNING, then a white-cored STRIKE bar. Deliberately
    // NOT the red/white slip language: this is the arena overloading, not an enemy tell.
    if (st.hazards) st.hazards.forEach(hz => {
        const y = st.height * CONSTANTS.LANE_Y[hz.lane];
        if (hz.phase === 'warn') {
            const p = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(Date.now() * 0.02));
            ctx.strokeStyle = `rgba(255, 140, 0, ${(p * 0.4).toFixed(3)})`;
            ctx.lineWidth = 22; dl(0, y, st.width, y);
            ctx.strokeStyle = `rgba(255, 170, 40, ${p.toFixed(3)})`;
            ctx.lineWidth = 4; ctx.setLineDash([12, 12]); ctx.lineDashOffset = -(Date.now() * 0.05) % 24;
            dl(0, y, st.width, y); ctx.setLineDash([]);
        } else {
            ctx.strokeStyle = 'rgba(255, 200, 60, 0.95)'; ctx.lineWidth = 26; dl(0, y, st.width, y);
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; dl(0, y, st.width, y);
        }
    });
    ctx.lineWidth = 1;

    st.particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        if (p.type === 'shard') {
            ctx.save();
            ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(p.size/2, p.size); ctx.lineTo(-p.size/2, p.size); ctx.fill();
            ctx.restore();
            p.rot += p.rotV;
        } else if (p.type === 'vacuum') {
            ctx.fillRect(p.x, p.y, 2, 2);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(p.x - p.vx, p.y - p.vy, 2, 2); 
        } else if (p.type === 'dash_line') {
            ctx.fillRect(p.x, p.y, 20, 2);
        } else {
            ctx.fillRect(p.x, p.y, 4, 4); 
        }
    });
    ctx.globalAlpha = 1.0;

    drawFinisherDim(ctx);

    st.player.trails.forEach(t => { 
        let ghost = { lane: t.lane, x: t.x, y: t.y, w: 50, h: 110, state: t.state, punchType: t.punchType, hitFrame: t.hitFrame, slipBuff: t.slipBuff, color: '#00ffff' }; 
        drawBoxer(ctx, ghost, true, t.opacity, true); 
    });

    st.enemies.forEach(en => {
        let opacity = en.isActiveThreat ? 1.0 : 0.4;
        if (st.purifyTimer > 0) opacity *= 0.5;
        drawBoxer(ctx, en, false, opacity);

        // --- RESTORED: Zoner Telegraph & Shield Visuals ---
        if (en.isActiveThreat) {
            const { perfect: perfectThresh, good: goodThresh } = CONSTANTS.getSlipThresholds(en.type, st.progressionMods.perfectSlipWindowBonus);
            if (en.type === 'zoner' && en.attackCooldown < 40 && en.stun <= 0 && st.bossIntroTimer <= 0) {
                let intensity = 1 - (en.attackCooldown / 40);
                ctx.strokeStyle = `rgba(0, 255, 0, ${intensity})`; ctx.lineWidth = 2 + (intensity * 6); 
                ctx.setLineDash([15, 10]); ctx.lineDashOffset = -Date.now() * 0.05;
                ctx.beginPath(); ctx.moveTo(en.x, en.y - 60); ctx.lineTo(st.player.x, en.y - 60); ctx.stroke();
                ctx.setLineDash([]); 
                
                ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(st.player.x, en.y - 60, 20 - intensity * 15, 0, Math.PI*2); ctx.stroke();
                ctx.fillStyle = `rgba(0, 255, 0, ${intensity})`; 
                ctx.beginPath(); ctx.arc(st.player.x, en.y - 60, 5 + intensity * 10, 0, Math.PI*2); ctx.fill();
            }

            let xOff = 0;
            if (en.attackCooldown <= goodThresh + 6 && en.attackCooldown > perfectThresh && en.stun <= 0 && en.type !== 'zoner' && st.bossIntroTimer <= 0) {
                xOff = Math.sin(Date.now() * 0.15) * 8; 
                let telColor = '#fff'; let telText = '!';
                if (en.isBoss) {
                    if (en.currentMove === 'bash') { telColor = '#ffaa00'; telText = 'BREAK'; }
                    if (en.currentMove === 'feint') { telColor = '#aa00ff'; telText = '?'; }
                } else if (en.type === 'shield' || en.type === 'bruiser') { telColor = '#ffaa00'; telText = 'BREAK'; }

                ctx.fillStyle = telColor; ctx.font = 'bold 20px Orbitron'; ctx.textAlign = 'center'; ctx.fillText(telText, en.x + en.w/2 + xOff, en.y - en.h - 10); ctx.textAlign = 'left';
            }
        } else if (en.attackCooldown <= (CONSTANTS.getSlipThresholds(en.type, 0).good + 6) && en.stun <= 0 && en.type !== 'zoner' && st.bossIntroTimer <= 0) {
            let telColor = 'rgba(255,255,255,0.3)'; let telText = '!';
            if (en.isBoss) {
                if (en.currentMove === 'bash') { telColor = 'rgba(255,170,0,0.3)'; telText = 'BREAK'; }
                if (en.currentMove === 'feint') { telColor = 'rgba(170,0,255,0.3)'; telText = '?'; }
            } else if (en.type === 'shield' || en.type === 'bruiser') { telColor = 'rgba(255,170,0,0.3)'; telText = 'BREAK'; }
            
            ctx.fillStyle = telColor; ctx.font = 'bold 12px Orbitron'; ctx.textAlign = 'center'; ctx.fillText(telText, en.x + en.w/2, en.y - en.h - 10); ctx.textAlign = 'left';
        }

        if (en.type === 'shield' && en.stun <= 0) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${en.isActiveThreat ? 0.8 : 0.3})`; 
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(en.x - 5, en.y); ctx.lineTo(en.x - 5, en.y - en.h); ctx.stroke();
        }

        // Non-boss enemies had no health readout at all, and the new pressure/cash-out
        // mechanic needs somewhere to show its build-up — a slim bar plus up to 3 pips.
        if (!en.isBoss) {
            const barY = en.y - en.h - 14, barW = en.w;
            ctx.globalAlpha = opacity;
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(en.x, barY, barW, 3);
            ctx.fillStyle = en.color; ctx.fillRect(en.x, barY, barW * Math.max(0, en.hp / en.maxHp), 3);
            const pressure = en.pressure || 0;
            if (pressure > 0) {
                for (let i = 0; i < pressure; i++) {
                    ctx.fillStyle = '#ff0055';
                    ctx.fillRect(en.x + i * 7, barY - 6, 5, 3);
                }
            }
            ctx.globalAlpha = 1.0;
        }

        drawBossTells(ctx, en);

        // v16: the boss's name now lives on its HP bar (render/overlays.js
        // drawBossHud); the floating name + flashing bar above its head is gone so
        // the windup meter and OPEN tag have clean space.
    });

    drawBoxer(ctx, st.player, true);

    st.floatingTexts.forEach(ft => { 
        ctx.globalAlpha = Math.max(0, ft.life); 
        ctx.fillStyle = ft.color; 
        ctx.font = 'bold 16px Orbitron'; 
        ctx.textAlign = 'center'; 
        ctx.fillText(ft.text, ft.x, ft.y); 
        ctx.textAlign = 'left'; 
    });
    ctx.globalAlpha = 1;
    drawScorePops(ctx);

    if (st.bossIntroTimer > 0) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, st.height/2 - 80, st.width, 160);
        let slideIn = Math.min(1, (120 - st.bossIntroTimer) / 20); 
        ctx.fillStyle = '#fff'; ctx.font = '900 italic 40px Orbitron'; ctx.textAlign = 'center';
        ctx.fillText(st.bossIntroText, st.width/2 * slideIn + (st.width/4), st.height/2 - 10);
        ctx.textAlign = 'left';
    }

    ctx.restore();

    // ---- screen-space overlays (never zoomed or shaken) ----
    if (st.screen !== 'start') drawBossHud(ctx);
    drawFinisherUI(ctx);
    SequenceManager.draw(ctx, st.width, st.height);
    drawVignette(ctx);
}