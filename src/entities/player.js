import { gameState as st, getFlowMultiplier } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { playSound } from '../vfx_audio/audio.js';
import { createVacuum, triggerShockwave, doFlash, spawnFloatingText, createImpact, createShatter } from '../vfx_audio/effects.js';
import { HUD } from '../ui/ui.js';
import { checkHit } from '../systems/combat.js';

export function resetPlayerObj() { 
    return { lane: 1, x: 180, y: 0, w: 50, h: 110, state: 'idle', punchTimer: 0, punchType: null, hitFrame: 0, didHit: false, slipCooldown: 0, slipBuff: 0, color: '#00ffff', trails: [], trailTimer: 0, recoveryTimer: 0, moveCancelReady: false, jabStep: 0, comboWindow: 0, inputBuffer: null, inputBufferTimer: 0, movementBuffer: null, movementBufferTimer: 0, ghostStepTimer: 0, ghostStepCooldown: 0, ghostStepCharges: 1, dangerLevel: 0, hitStun: 0, lastPunchLanded: null, dempseyActive: false, guardReadTimer: 0, flowStreak: 0 }; 
}

const FOOTWORK_MIN_X = 90, FOOTWORK_MAX_X = 320, FOOTWORK_ADVANCE_SPD = 3.0, FOOTWORK_RETREAT_SPD = 3.4, FOOTWORK_HOME_PULL = 0.02;

export function resetJabString() { 
    if (st.player) { st.player.jabStep = 0; st.player.comboWindow = 0; st.player.lastPunchLanded = null; st.player.dempseyActive = false; } 
}

function executeAttackInput(code) {
    if (st.player.state === 'guarding') { if (code === 'KeyA') startPunch('guard_jab'); if (code === 'KeyD') startPunch('check_hook'); return; }
    if (code === 'KeyA') {
        if (st.player.jabStep === 0) startPunch('jab1'); 
        else if (st.player.jabStep === 1) startPunch('jab2'); 
        else if (st.player.jabStep === 2) startPunch('jab3'); 
        else startPunch('jab1'); 
    } 
    else if (code === 'KeyS') startPunch('cross'); 
    else if (code === 'KeyD') startPunch('hook');
}

function executeMovementInput(code) {
    if (code === 'ShiftLeft' || code === 'ShiftRight') { st.player.state = 'guarding'; st.combo = 0; resetJabString(); } 
    else if (code === 'ArrowLeft') {
        // APEX (Blur Step): a second charge instead of a single cooldown gate — a
        // real burst tool (dash twice back to back), not just a faster refill.
        const maxGhostCharges = st.progressionMods.blurStep ? 2 : 1;
        if (st.player.ghostStepCharges === undefined) st.player.ghostStepCharges = maxGhostCharges;
        if (st.player.ghostStepCharges > 0) {
            st.player.ghostStepCharges--;
            st.player.state = 'ghost_step'; 
            st.player.ghostStepTimer = 18; 
            if (st.player.ghostStepCharges <= 0) st.player.ghostStepCooldown = Math.max(10, Math.floor(60 * st.progressionMods.ghostStepCooldownMult)); 
            st.combo = 0; resetJabString(); playSound('ghost_step');
            for(let i=0; i<8; i++) { st.particles.push({ x: st.player.x + Math.random() * 30, y: st.player.y - 30 - Math.random() * 60, vx: -10 - Math.random() * 15, vy: 0, life: 0.6, color: '#666666', type: 'dash_line' }); }
        }
    } 
    else if (code === 'ArrowUp' || code === 'ArrowDown') {
        const oldLane = st.player.lane; 
        if (code === 'ArrowUp') st.player.lane = Math.max(0, st.player.lane - 1); 
        if (code === 'ArrowDown') st.player.lane = Math.min(2, st.player.lane + 1);
        if (oldLane !== st.player.lane) {
            if (st.player.slipCooldown <= 0) { checkPerfectSlip(oldLane); st.player.slipCooldown = 12; resetJabString(); } 
            else { st.player.lane = oldLane; }
        }
    }
}

export function checkPerfectSlip(oldLane) {
    let slipQuality = 'none', bossSlipped = null;
    st.enemies.forEach(en => {
        if (en.lane === oldLane && en.stun <= 0) {
            let isThreat = false;
            const { perfect: perfectThresh, good: goodThresh } = CONSTANTS.getSlipThresholds(en.type, st.progressionMods.perfectSlipWindowBonus);
            
            if (en.type === 'zoner') {
                if (en.attackCooldown <= 40 && en.x > st.player.x - 20) isThreat = true;
            } else if (Math.abs(en.x - st.player.x) < 130 && en.attackCooldown <= 22 && en.x > st.player.x - 20) {
                isThreat = true;
            }

            if (isThreat) {
                let oldCooldown = en.attackCooldown;
                if (en.tutorialType === 'slip') {
                    if (oldCooldown <= perfectThresh) { slipQuality = 'perfect'; en.hp = 0; } 
                    else { slipQuality = 'good'; en.x = st.player.x + 200; en.attackCooldown = en.maxCooldown; en.justAttacked = 0; spawnFloatingText(st.player.x, st.player.y - 50, "TOO EARLY!", "#ffaa00"); st.player.slipBuff = 0; }
                } else {
                    if (oldCooldown <= perfectThresh) { 
                        slipQuality = 'perfect'; 
                        if (en.isBoss) bossSlipped = en; 
                        
                        if (en.type === 'zoner') { en.attackCooldown = en.maxCooldown; /* evaded — no attack pose, it never fired */ }
                        else en.attackCooldown = Math.max(en.attackCooldown, 18);
                    } 
                    else if (oldCooldown <= goodThresh && slipQuality !== 'perfect') { 
                        slipQuality = 'good'; 
                        
                        if (en.type === 'zoner') { en.attackCooldown = en.maxCooldown; /* evaded — no attack pose, it never fired */ }
                        else en.attackCooldown = Math.max(en.attackCooldown, 18);
                    } else {
                        en.attackCooldown = Math.max(en.attackCooldown, 18);
                    }
                }
            }
        }
    });
    if (slipQuality !== 'none') triggerPerfectSlip(bossSlipped, slipQuality);
}

export function triggerPerfectSlip(bossSlipped, slipQuality) {
    if (slipQuality === 'perfect') {
        if (HUD.slipPopup) { HUD.slipPopup.innerText = "PERFECT SLIP"; HUD.slipPopup.style.color = "#ffffff"; HUD.slipPopup.style.textShadow = "0 0 24px #00ffff"; }
        // APEX (Flow State): perfect slips build the streak same as clean hits do.
        st.player.flowStreak = (st.player.flowStreak || 0) + 1;
        const flowMult = getFlowMultiplier(st);
        if (st.progressionMods.flowState && (st.player.flowStreak === 10 || st.player.flowStreak === 25)) {
            spawnFloatingText(st.player.x, st.player.y - 110, "FLOW STATE!", "#ff8ad8");
        }
        if (!st.isInstinct) {
            let gain = 20 * st.stats.techMult * (1 + st.progressionMods.perfectSlipRewardBonusMult) * flowMult;
            gain *= CONSTANTS.affixMod(st.currentAffix, 'instinctGainMult', 1);
            st.instinctMeter = Math.min(100, st.instinctMeter + gain);
        }
        // Perk-based slip heal plus the ADRENALINE affix's slip heal stack additively.
        const slipHeal = st.progressionMods.perfectSlipHeal + CONSTANTS.affixMod(st.currentAffix, 'perfectSlipHeal', 0);
        if (slipHeal > 0) st.health = Math.min(st.maxHealth, st.health + slipHeal);

        st.shake = 10; doFlash(0.2); playSound('perfect_slip'); st.statTotalSlips++;
        st.exp += Math.floor(2 * (1 + st.progressionMods.expGainBonusMult) * flowMult); // reads are the core loop; pay them
        st.player.slipBuff = (st.orbCounts.technique >= 2) ? 2 : 1; 
        spawnFloatingText(st.player.x, st.player.y - 80, "COUNTER READY!", "#ffffff"); 
        st.hitstop += 8; 
        if (st.orbCounts.speed >= 3) st.player.moveCancelReady = true;
        if (bossSlipped && st.orbCounts.technique >= 3) { bossSlipped.exposedTimer = 90 + st.progressionMods.bossExposeBonusFrames; spawnFloatingText(bossSlipped.x, bossSlipped.y - 140, "EXPOSED!", "#00ffff"); playSound('feint_tell'); }
    } else if (slipQuality === 'good') {
        if (HUD.slipPopup) { HUD.slipPopup.innerText = "GOOD SLIP"; HUD.slipPopup.style.color = "#ff8ad8"; HUD.slipPopup.style.textShadow = "0 0 10px #ff00ff"; }
        if (!st.isInstinct) { st.instinctMeter = Math.min(100, st.instinctMeter + (5 * st.stats.techMult)); }
        st.shake = 3; playSound('slip');
    }
    if (HUD.slipPopup) { HUD.slipPopup.style.opacity = 1; setTimeout(() => { if (HUD.slipPopup) HUD.slipPopup.style.opacity = 0; }, 500); }
}

export function startPunch(t) {
    if (st.player.state === 'guarding') st.player.state = 'idle'; 
    st.player.state = 'punching'; st.player.punchType = t; st.player.didHit = false; st.player.moveCancelReady = false; st.player.comboWindow = 0; 
    
    let isJab1 = t === 'jab1', isJab2 = t === 'jab2', isJab3 = t === 'jab3';
    if (isJab1) st.player.jabStep = 1; else if (isJab2) st.player.jabStep = 2; else if (isJab3) st.player.jabStep = 3; else st.player.jabStep = 0; 
    
    // Dempsey Circuit Fusion Check
    if (st.progressionMods.dempseyCircuit && st.player.lastPunchLanded) {
        let lastWasJab = st.player.lastPunchLanded.startsWith('jab');
        let thisIsHook = t === 'hook';
        let lastWasHook = st.player.lastPunchLanded === 'hook';
        let thisIsJab = t.startsWith('jab');
        if ((lastWasJab && thisIsHook) || (lastWasHook && thisIsJab)) st.player.dempseyActive = true;
        else st.player.dempseyActive = false;
    } else {
        st.player.dempseyActive = false;
    }

    let sF = Math.max(0.35, (st.isInstinct ? 0.6 : 1) * (1 / st.stats.speedMult));
    let cF = Math.max(0.35, (st.isInstinct ? 0.6 : 1) * (1 / (1 + (st.stats.speedMult - 1) * 0.4)));
    
    if (isJab1 || isJab2 || t === 'guard_jab') { 
        st.player.punchTimer = Math.max(5, st.orbCounts.speed >= 2 ? Math.floor(5 * sF) : Math.floor(8 * sF)); 
        st.player.hitFrame = Math.max(2, Math.floor(2 * sF)); 
    } 
    else if (isJab3) { 
        st.player.punchTimer = Math.max(6, st.orbCounts.speed >= 2 ? Math.floor(7 * sF) : Math.floor(12 * sF)); 
        st.player.hitFrame = Math.max(2, Math.floor(3 * sF)); 
    } 
    else if (t === 'cross') { 
        st.player.punchTimer = Math.max(12, Math.floor(22 * cF)); 
        st.player.hitFrame = Math.max(4, Math.floor(8 * cF)); 
    } 
    else if (t === 'hook' || t === 'check_hook') { 
        st.player.punchTimer = Math.max(8, Math.floor(16 * sF)); 
        st.player.hitFrame = Math.max(3, Math.floor(6 * sF)); 
    }
    
    if (st.player.slipBuff > 0) { playSound('vacuum'); createVacuum(st.player.x + 80, st.player.y - 40); }
}

export function takeDamage(amt, isHeavy, en) {
    // APEX (Flow State): one hit, any hit, zeroes the streak — that's the entire
    // point of "sustained, not merely survived."
    st.player.flowStreak = 0;
    // IDENTITY: Assassins used to differ from a Grunt only by being faster — same
    // "hold Shift and forget it" answer, just on a tighter clock. Guard now barely
    // works against them (60% dmg through instead of 25%), so turtling through an
    // Assassin's lane specifically punishes you: it has to be read and slipped,
    // not blocked on reflex. This also lands on Phantom Boxer for free, since it's
    // built on the assassin archetype — a boss that punishes turtling fits it.
    let guardMult = 0.25;
    let piercing = st.player.state === 'guarding' && en && en.type === 'assassin';
    if (piercing) guardMult = 0.6;
    // AFFIX (GLASS PROTOCOL): incoming damage is amplified too — the mirror of the
    // +30% outgoing in combat.js. Applied before guard reduction so Guard still
    // scales the same proportion of a bigger hit.
    amt = amt * CONSTANTS.affixMod(st.currentAffix, 'playerDamageTakenMult', 1);
    let actualDmg = st.player.state === 'guarding' ? Math.floor(amt * guardMult) : Math.floor(amt);
    if (piercing) spawnFloatingText(st.player.x, st.player.y - 60, "GUARD PIERCED!", "#aa00ff");
    if (st.player.state === 'guarding' && st.progressionMods.guardRead) st.player.guardReadTimer = 16;
    st.health -= actualDmg; 
    st.player.hitStun = isHeavy ? 10 : 5; 
    st.shake = isHeavy ? 30 : 15; 
    st.player.x = Math.max(20, st.player.x - ((isHeavy ? 40 : 10) * st.progressionMods.incomingRecoilMult)); 
    st.player.state = 'hurt'; resetJabString();
    
    if (st.combo >= 2 && !st.isInstinct) spawnFloatingText(st.player.x, st.player.y - 50, "COMBO BROKEN", "#ff0055"); 
    st.combo = 0; 
    if (!st.isInstinct) doFlash(isHeavy ? 0.4 : 0.2); 
    playSound('hit');
    
    let sf = document.getElementById('screen-flash'); 
    if (sf) { sf.style.background = 'red'; sf.style.opacity = 0.4; setTimeout(() => { if (sf) { sf.style.background = 'white'; sf.style.opacity = 0; } }, 150); }
    if (HUD.health) { HUD.health.classList.add('text-red-500', 'scale-125'); setTimeout(() => HUD.health.classList.remove('text-red-500', 'scale-125'), 200); }
    if (st.enemies.some(e => e.isBoss && e.desperation)) st.statDespDamage++;
}

export function updatePlayer() {
    let keyUpJustPressed = st.keys['ArrowUp'] && !st.lastKeys['ArrowUp'];
    let keyDownJustPressed = st.keys['ArrowDown'] && !st.lastKeys['ArrowDown'];
    let keyLeftJustPressed = st.keys['ArrowLeft'] && !st.lastKeys['ArrowLeft'];
    let keyAJustPressed = st.keys['KeyA'] && !st.lastKeys['KeyA'];
    let keySJustPressed = st.keys['KeyS'] && !st.lastKeys['KeyS'];
    let keyDJustPressed = st.keys['KeyD'] && !st.lastKeys['KeyD'];
    let keySpaceJustPressed = st.keys['Space'] && !st.lastKeys['Space']; 
    let attemptGuard = st.pad.guard || st.keys['ShiftLeft'] || st.keys['ShiftRight'];
    
    let attemptUp = st.pad.up || keyUpJustPressed;
    let attemptDown = st.pad.down || keyDownJustPressed;
    let attemptLeft = st.pad.left || keyLeftJustPressed;
    let attemptJab = st.pad.jab || keyAJustPressed;
    let attemptCross = st.pad.cross || keySJustPressed;
    let attemptHook = st.pad.hook || keyDJustPressed;
    let attemptInstinct = st.pad.instinct || keySpaceJustPressed;

    st.scrollX += (st.isInstinct ? 20 : 8) * (st.stageSpeedMult || 1.0); 

    if (st.player.slipCooldown > 0) st.player.slipCooldown--;
    if (st.player.ghostStepCooldown > 0) {
        st.player.ghostStepCooldown--;
        if (st.player.ghostStepCooldown <= 0) {
            const maxGhostCharges = st.progressionMods.blurStep ? 2 : 1;
            st.player.ghostStepCharges = Math.min(maxGhostCharges, (st.player.ghostStepCharges || 0) + 1);
            if (st.player.ghostStepCharges < maxGhostCharges) st.player.ghostStepCooldown = Math.max(10, Math.floor(60 * st.progressionMods.ghostStepCooldownMult));
        }
    }
    if (st.player.guardReadTimer > 0) st.player.guardReadTimer--;
    
    const targetY = st.height * CONSTANTS.LANE_Y[st.player.lane]; 
    st.player.y += (targetY - st.player.y) * 0.25;

    // FOOTWORK: Arc 3's design text promises "make your own space" but the old
    // auto-recenter (`x += (180-x)*0.1`) snapped the player back every frame, so
    // position was never actually a choice. [RIGHT] presses the action forward —
    // you meet enemies sooner, punish sooner, but more of them converge on you at
    // once. [LEFT] held past the Ghost Step burst gives ground — buys reaction
    // time against a bruiser train or a zoner volley, at the cost of tempo. With
    // neither held, a soft passive pull keeps casual play feeling like before.
    if (st.player.state !== 'hurt' && st.player.state !== 'punching') {
        if (st.keys['ArrowRight']) st.player.x = Math.min(FOOTWORK_MAX_X, st.player.x + FOOTWORK_ADVANCE_SPD);
        else if (st.keys['ArrowLeft']) st.player.x = Math.max(FOOTWORK_MIN_X, st.player.x - FOOTWORK_RETREAT_SPD);
        else st.player.x += (180 - st.player.x) * FOOTWORK_HOME_PULL;
    }

    if (attemptInstinct && st.instinctMeter >= 100 && !st.isInstinct) { 
        st.isInstinct = true; st.instinctReadyTimer = 0; if (HUD.instinctBanner) HUD.instinctBanner.style.display = 'none';
        if (HUD.barCont) HUD.barCont.classList.add('beast-active'); doFlash(0.5); st.shake = 20; st.hitstop = 10; triggerShockwave(st.player.x, st.player.y - 50, '#ffffff'); playSound('perfect_slip');
    }

    if (st.player.inputBufferTimer > 0) if (--st.player.inputBufferTimer <= 0) st.player.inputBuffer = null;
    if (st.player.movementBufferTimer > 0) if (--st.player.movementBufferTimer <= 0) st.player.movementBuffer = null;

    if (st.player.state === 'hurt') { if (--st.player.hitStun <= 0) st.player.state = 'idle'; return; }
    if (st.player.state === 'recovery') { if (--st.player.recoveryTimer <= 0) st.player.state = 'idle'; } 
    else if (st.player.state === 'ghost_step') { if (--st.player.ghostStepTimer <= 0) st.player.state = 'idle'; }

    if (attemptGuard) { 
        if (st.player.state === 'idle') { st.player.state = 'guarding'; st.combo = 0; resetJabString(); } 
    } else { 
        if (st.player.state === 'guarding') {
            st.player.state = 'idle';
            // GUARD READ (mastery-gated): a hit landed on your guard, and you let
            // go inside the read window instead of holding forever. Same reward
            // as a Perfect Slip — turtling becomes a second skill expression
            // rather than only a safe, passive fallback.
            if (st.player.guardReadTimer > 0 && st.progressionMods.guardRead) {
                st.player.guardReadTimer = 0;
                st.player.slipBuff = Math.max(st.player.slipBuff, 1);
                playSound('perfect_slip'); doFlash(0.15); st.shake = Math.max(st.shake, 6);
                spawnFloatingText(st.player.x, st.player.y - 80, "GUARD READ!", "#ffffff");
            }
        }
    }

    let canAct = st.player.state === 'idle' || st.player.state === 'guarding';
    let attemptMovement = attemptUp || attemptDown || attemptLeft || attemptGuard;

    if (!canAct && st.player.moveCancelReady && attemptMovement && st.player.state !== 'ghost_step') {
        canAct = true; st.player.moveCancelReady = false; st.player.state = 'idle';
        createImpact(st.player.x, st.player.y - 50, '#00ffff'); playSound('slip');
    }

    if (canAct) {
        let attemptAttackCode = attemptJab ? 'KeyA' : (attemptCross ? 'KeyS' : (attemptHook ? 'KeyD' : null));
        let attemptMoveCode = attemptUp ? 'ArrowUp' : (attemptDown ? 'ArrowDown' : (attemptLeft ? 'ArrowLeft' : null));

        if (attemptAttackCode) {
            if (Math.abs(st.player.y - targetY) < 5) executeAttackInput(attemptAttackCode);
            else { st.player.inputBuffer = attemptAttackCode; st.player.inputBufferTimer = 12; }
        } else if (attemptMoveCode) {
            if (st.player.state === 'guarding') st.player.state = 'idle';
            executeMovementInput(attemptMoveCode);
        } else if (attemptGuard) {
            executeMovementInput('ShiftLeft');
        } else {
            if (st.player.state === 'guarding') st.player.state = 'idle';
        }
    } else if (st.player.state === 'punching' || st.player.state === 'recovery') {
        let attemptMoveCode = attemptUp ? 'ArrowUp' : (attemptDown ? 'ArrowDown' : (attemptLeft ? 'ArrowLeft' : null));
        let attemptAttackCode = attemptJab ? 'KeyA' : (attemptCross ? 'KeyS' : (attemptHook ? 'KeyD' : null));
        if (attemptAttackCode) { st.player.inputBuffer = attemptAttackCode; st.player.inputBufferTimer = 12; } 
        else if (attemptMoveCode) { st.player.movementBuffer = attemptMoveCode; st.player.movementBufferTimer = 12; }
    }

    if (st.player.state === 'idle' || st.player.state === 'guarding') {
        if (st.player.comboWindow > 0) if (--st.player.comboWindow <= 0) resetJabString();
        if (st.player.movementBuffer) { let c = st.player.movementBuffer; st.player.movementBuffer = null; st.player.movementBufferTimer = 0; executeMovementInput(c); } 
        else if (st.player.inputBuffer) {
            if (Math.abs(st.player.y - targetY) < 5) { let c = st.player.inputBuffer; st.player.inputBuffer = null; st.player.inputBufferTimer = 0; executeAttackInput(c); }
        }
    }

    if (st.player.state === 'punching') {
        st.player.punchTimer--;
        if (st.player.hitFrame > 0) { 
            st.player.hitFrame--; 
            if (st.player.hitFrame === 0) {
                st.player.didHit = checkHit(st.player.punchType); 
            }
        }
        if (st.player.punchTimer <= 0) {
            if (!st.player.didHit) {
                st.player.state = 'recovery'; 
                let isJab = st.player.punchType && st.player.punchType.startsWith('jab'), iGP = st.player.punchType === 'guard_jab' || st.player.punchType === 'check_hook';
                st.player.recoveryTimer = (isJab || st.player.punchType === 'guard_jab' ? 6 : (st.player.punchType === 'hook' || st.player.punchType === 'check_hook' ? Math.floor(9 * st.progressionMods.hookRecoveryMult) : 13));
                
                if (st.player.dempseyActive) st.player.recoveryTimer = Math.max(1, Math.floor(st.player.recoveryTimer * (1 - st.progressionMods.dempseyRecoveryBonus)));
                
                if (isJab && !iGP) { 
                    if (st.progressionMods.relentlessRhythm && (st.player.punchType === 'jab1' || st.player.punchType === 'jab2')) {
                        st.combo = Math.max(0, st.combo - 1);
                    } else if (st.orbCounts.speed < 2) {
                        st.combo = Math.max(0, st.combo - 1);
                    } else { st.combo = 0; }
                } else if (!iGP) st.combo = 0;

                resetJabString();
                let cD = st.enemies.find(e => e.tutorialType === 'counter');
                if (cD) { spawnFloatingText(st.player.x, st.player.y - 50, "MISSED! TRY AGAIN!", "#ffaa00"); cD.x = st.player.x + 250; cD.attackCooldown = cD.maxCooldown; cD.justAttacked = 0; st.player.slipBuff = 1; }
            } else { 
                st.player.state = 'idle'; 
                st.player.comboWindow = st.player.dempseyActive ? 35 : 25; 
                st.player.lastPunchLanded = st.player.punchType;
            }
        }
    }
}