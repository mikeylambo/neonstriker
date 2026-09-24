import { gameState as st } from '../state.js';

export function drawBoxer(ctx, entity, isPlayer, opacity = 1, isTrail = false) {
    const dl = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const dc = (x, y, r, f, s) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); if(f) ctx.fill(); if(s) ctx.stroke(); };

    const d = isPlayer ? 1 : -1; 
    const bS = entity.isBoss ? 1.5 : (entity.type === 'bruiser' ? 1.3 : 1);
    let t = Date.now(), bn = 0, br = 0;
    
    if (entity.state === 'idle' || (!isPlayer && entity.stun <= 0)) { 
        bn = Math.sin(t * 0.005 + entity.x) * 3; 
        br = Math.sin(t * 0.003 + entity.x) * 2; 
    }
    if (isPlayer && entity.state === 'hurt') bn -= 10;
    
    let h = (entity.h * (entity.isBoss ? 1 : 0.8)) + br; 
    const w = entity.w; 
    const hS = 12 * bS, gS = 10 * bS; 
    let rX = entity.x + w/2, rY = entity.y; 
    
    if (!isTrail) { 
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; 
        ctx.beginPath(); ctx.ellipse(rX, rY, w * 0.6 * bS, 6 * bS, 0, 0, Math.PI * 2); ctx.fill(); 
    }
    
    let pL = 0; 
    if (!isPlayer && entity.stun <= 0 && entity.attackCooldown >= 15) { 
        if (entity.type === 'assassin') pL = 20 * d; 
        if (entity.type === 'zoner') pL = -10 * d;
        if (entity.type === 'shield') pL = -5 * d;
        if (entity.type === 'bruiser') { h *= 0.85; pL = 15 * d; } 
    }
    
    let hY = rY - h * 0.2 + bn, nY = rY - h * 0.75 + bn, hdY = rY - h * 0.85 + bn;
    if (!isPlayer && entity.type === 'bruiser') hdY += 10;
    if (!isPlayer && entity.type === 'assassin') hdY += 5;
    
    let lX = pL; 
    if (isPlayer && st.player.slipCooldown > 15) lX += 15 * d; 
    if (isPlayer && entity.state === 'ghost_step') {
        let sn = entity.ghostStepTimer > 10 ? (14 - entity.ghostStepTimer) / 4 : entity.ghostStepTimer / 10;
        opacity *= 0.3 + (1 - sn) * 0.7; lX -= 35 * sn * d;
    } else if (isPlayer && entity.state === 'hurt') { lX -= 25 * d; }
    
    let sL = 0; if (entity.stun > 0) sL = -15 * d; lX += sL;
    
    let lg1X, lg2X; 
    if (isPlayer && entity.walking) {
        // v16 stage transitions: a real walk cycle for the walk-out / walk-in.
        const wc = Math.sin(t * 0.018) * 16;
        lg1X = wc * d; lg2X = -wc * d; bn += Math.abs(Math.sin(t * 0.018)) * -3;
    }
    else if (isPlayer) { lg1X = 15 * d; lg2X = -10 * d; } 
    else { 
        let wP = 0; 
        if (entity.stun <= 0 && entity.attackCooldown >= 15 && (!entity.isBoss || entity.currentMove !== 'feint')) wP = entity.x * 0.08; 
        lg1X = Math.sin(wP) * 15 * d; lg2X = Math.sin(wP + Math.PI) * 15 * d; 
    }
    
    // Counter ready visual hook
    let dC = entity.color, isCounterReady = false; 
    if (isPlayer) { 
        dC = entity.state === 'hurt' ? '#ff0000' : (st.strikerColor || '#00ffff');
        if (isTrail) dC = '#ffffff'; 
        else if (!isTrail && st.player.slipBuff > 0) isCounterReady = true; 
    } 
    if (!isPlayer && entity.shiftWarning > 0) dC = Math.floor(Date.now() / 50) % 2 === 0 ? '#ffffff' : '#aa00ff';
    if (!isPlayer && entity.isActiveThreat) {
        let pT = entity.type === 'zoner' ? 10 : 8;
        if (entity.attackCooldown > 0 && entity.attackCooldown <= pT) dC = '#ffffff';
    }
    
    ctx.globalAlpha = opacity; ctx.strokeStyle = dC; ctx.lineWidth = (entity.type === 'bruiser' ? 12 : 8) * bS; 
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    
    if (!isPlayer && entity.isBoss && entity.exposedTimer > 0) {
        ctx.save(); ctx.strokeStyle = Math.floor(Date.now() / 50) % 2 === 0 ? '#00ffff' : '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(rX + lX, nY, 30 + Math.sin(Date.now() * 0.01) * 5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    
    dl(rX + lX, hY, rX + lg1X, rY); dl(rX + lX, hY, rX + lg2X, rY); 
    let sX = rX + (entity.type === 'bruiser' ? 10 * d : 5 * d) + lX; 
    dl(rX + lX, hY, sX, nY); 
    ctx.fillStyle = entity.stun > 0 ? '#fff' : dC; dc(sX + 3 * d, hdY, hS, true, false);

    // DANGER RINGS & CYBER EYE
    if (isPlayer && !isTrail) {
        let eC = '#ff00ff', fF = Math.sin(Date.now() * 0.02) * 3;
        ctx.save();
        
        if (st.player.dangerLevel === 1) {
            ctx.strokeStyle = `rgba(0,255,255,${0.4+Math.sin(t*0.02)*0.3})`; ctx.lineWidth = 2;
            dc(sX + 3 * d, hdY, hS + 6, false, true);
        } else if (st.player.dangerLevel === 2) {
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                let a = Math.PI + (i * Math.PI / 4) - Math.PI / 2; if (d < 0) a = -a;
                let r1 = hS + 2, r2 = hS + 12 + Math.random() * 5;
                ctx.moveTo(sX + 3 * d + Math.cos(a) * r1, hdY + Math.sin(a) * r1); ctx.lineTo(sX + 3 * d + Math.cos(a) * r2, hdY + Math.sin(a) * r2);
            }
            ctx.stroke();
        }
        
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(sX + 5 * d, hdY - 3, 5, 2, Math.PI / 8 * d, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = eC; ctx.globalAlpha = 0.8; ctx.beginPath(); 
        ctx.moveTo(sX + 5 * d, hdY - 4); ctx.quadraticCurveTo(sX - 1 * d, hdY - 8 + fF, sX - 11 * d, hdY - 6 + fF); ctx.quadraticCurveTo(sX + 1 * d, hdY - 1, sX + 5 * d, hdY - 2); ctx.fill(); 
        ctx.restore();
    }

    let ldX = sX + 20 * d, ldY = nY + 10, rrX = sX - 10 * d, rrY = nY - 5;
    if (isPlayer && (entity.state === 'recovery' || entity.state === 'ghost_step' || entity.state === 'hurt')) {
        ldX += 15 * d; rrX += 5 * d; lX += 10 * d;
    } else if (isPlayer && entity.state === 'punching') {
        let iH = entity.hitFrame <= 2 || entity.didHit, ex = iH ? 1 : 0.4, iJ = entity.punchType && entity.punchType.startsWith('jab');
        if (iJ) {
            if (entity.punchType === 'jab2') { rrX += 50 * ex * d; sX += 15 * d; } 
            else if (entity.punchType === 'jab3') { ldX += 60 * ex * d; ldY -= 10 * ex; lX += 10 * d; } 
            else ldX += 50 * ex * d;
        } else if (entity.punchType === 'guard_jab') { ldX += 40 * ex * d; rrX = sX + 15 * d; rrY = nY - 5; } 
        else if (entity.punchType === 'check_hook') { ldX = sX + 10 * d; ldY = nY - 15; rrX += 30 * ex * d; rrY -= 15 * ex; } 
        else if (entity.punchType === 'cross') { let rM = (st.orbCounts.power >= 2) ? 1.25 : 1; rrX += (90 * rM) * ex * d; ldX -= 15 * d; sX += 10 * d; } 
        else if (entity.punchType === 'hook') { ldX += 40 * ex * d; ldY -= 30 * ex; rrX -= 10 * d; }
    } else if (isPlayer && entity.state === 'guarding') {
        ldX = sX + 10 * d; ldY = nY - 15; rrX = sX + 15 * d; rrY = nY - 5;
    } else if (!isPlayer && entity.isBoss && entity.stun <= 0 && (entity.recoverTimer > 0 || entity.currentMove === 'recharge')) {
        // v16 PUNISH WINDOW pose: guard dropped, arms hanging — visibly OPEN.
        ldX = sX + 12 * d; ldY = nY + 38; rrX = sX - 6 * d; rrY = nY + 34;
    } else if (!isPlayer && entity.stun <= 0) {
        if (entity.justAttacked > 0) {
            if (entity.currentMove === 'bash' || entity.type === 'shield' || entity.type === 'bruiser') { rrX += 60 * d; sX += 10 * d; } 
            else if (entity.type !== 'zoner') ldX += 50 * d;
        } else if (entity.attackCooldown < 15 && entity.attackCooldown >= 0) { // FIXED: Bounded Attack Cooldown check to prevent infinite stretchy arms!
            let wp = 1 - (entity.attackCooldown / 15);
            if (entity.currentMove === 'bash' || entity.type === 'shield' || entity.type === 'bruiser') { rrX -= 30 * wp * d; rrY -= 20 * wp; } 
            else if (entity.type !== 'zoner') ldX -= 20 * wp * d;
        } else {
            if (entity.type === 'shield') { ldX = sX + 5 * d; ldY = nY - 10; rrX = sX - 5 * d; rrY = nY - 5; } 
            else if (entity.type === 'zoner') { ldX = sX + 35 * d; ldY = nY; rrX = sX - 10 * d; rrY = nY + 10; } 
            else if (entity.type === 'assassin') { ldX = sX + 15 * d; ldY = nY + 20; rrX = sX - 5 * d; rrY = nY + 15; } 
            else { ldX = sX + 15 * d; ldY = nY + 10; rrX = sX - 5 * d; rrY = nY + 5; }
        }
    } else if (entity.stun > 0) {
        ldX = sX - 10 * d; ldY = nY - 30; rrX = sX - 20 * d; rrY = nY - 20;
    }

    ctx.lineWidth = 4 * bS; dl(sX, nY, rrX, rrY); ctx.fillStyle = dC; dc(rrX, rrY, gS, true, false); 
    ctx.beginPath(); ctx.moveTo(sX, nY); 
    if (isPlayer && entity.punchType === 'hook' && entity.state === 'punching') ctx.quadraticCurveTo(sX + 30 * d, nY - 20, ldX, ldY); else ctx.lineTo(ldX, ldY);
    ctx.stroke(); ctx.fillStyle = dC; dc(ldX, ldY, gS, true, false);
    
    // v16 IDENTITY MOMENT: gloves ignite in the upgrade's tree colour.
    if (entity.gloveGlow) {
        const heat = entity.gloveHeat === undefined ? 1 : entity.gloveHeat;
        const fl = 1 + Math.sin(t * 0.04) * 0.12;
        ctx.save();
        ctx.shadowColor = entity.gloveGlow; ctx.shadowBlur = 28 * heat;
        ctx.fillStyle = entity.gloveGlow;
        ctx.globalAlpha = opacity * heat;
        dc(ldX, ldY, (gS + 3) * fl, true, false); dc(rrX, rrY, (gS + 3) * fl, true, false);
        ctx.globalAlpha = opacity * heat * 0.45;
        dc(ldX, ldY, (gS + 9) * fl, true, false); dc(rrX, rrY, (gS + 9) * fl, true, false);
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = opacity * heat * 0.9;
        dc(ldX, ldY, gS * 0.45, true, false); dc(rrX, rrY, gS * 0.45, true, false);
        ctx.restore();
        entity.glovePositions = [[ldX, ldY], [rrX, rrY]];
    }

    if (isPlayer && !isTrail && isCounterReady) {
        let cP = Math.sin(Date.now() * 0.02) * 2;
        ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        dc(rrX, rrY, gS + 4 + cP, false, true); dc(ldX, ldY, gS + 4 + cP, false, true);
        ctx.restore();
    }
    
    ctx.globalAlpha = 1;
}