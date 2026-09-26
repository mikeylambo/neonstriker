import { gameState as st, getFlowMultiplier } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { playSound } from '../vfx_audio/audio.js';
import { createVacuum, triggerShockwave, doFlash, spawnFloatingText, createImpact, createShatter } from '../vfx_audio/effects.js';
import { HUD } from '../ui/ui.js';
import { checkHit } from '../systems/combat.js';
import { addScore } from '../systems/score.js';
import { flashScale, getBinds } from '../systems/settings.js';
import { buildColor } from '../systems/colors.js';
import { heatOn } from '../systems/heat.js';
import { gateBossDamage } from '../systems/finisher.js';
import { tmKill, tmDamage, tmAttack, tmLanded, tmSlip, tmGhost, tmGuard, tmKnockdown, tmFloored, tmFinisher, tmEvolution, tmWager, tmStage, tmStartRun, tmTick, tmEndRun } from '../systems/telemetry.js';

export function resetPlayerObj() {
    return { lane: 1, x: 180, y: 0, w: 50, h: 110, state: 'idle', punchTimer: 0, punchType: null, hitFrame: 0, didHit: false, slipCooldown: 0, slipBuff: 0, color: '#00ffff', trails: [], trailTimer: 0, recoveryTimer: 0, moveCancelReady: false, jabStep: 0, comboWindow: 0, inputBuffer: null, inputBufferTimer: 0, movementBuffer: null, movementBufferTimer: 0, ghostStepTimer: 0, ghostStepCooldown: 0, ghostStepCharges: 1, dangerLevel: 0, hitStun: 0, lastPunchLanded: null, dempseyActive: false, guardReadTimer: 0, flowStreak: 0,
        // v17
        invuln: 0, pivotTimer: 0, charging: false, crossCharge: 0, crossLoaded: false, bufferedCharge: 0, dempseyAlternations: 0 };
}

const FW = CONSTANTS.FOOTWORK;
const FOOTWORK_MIN_X = FW.minX, FOOTWORK_MAX_X = FW.maxX, FOOTWORK_ADVANCE_SPD = FW.advanceSpd, FOOTWORK_RETREAT_SPD = FW.retreatSpd, FOOTWORK_HOME_PULL = FW.homePull;

export function resetJabString() {
    if (st.player) { st.player.jabStep = 0; st.player.comboWindow = 0; st.player.lastPunchLanded = null; st.player.dempseyActive = false; }
}

// Internal action names ('jab' | 'cross' | 'hook' | 'up' | 'down' | 'ghost' |
// 'guard') — keys are translated through the remappable binds before this point.
function executeAttackInput(action, charge = 0) {
    if (st.player.state === 'guarding') { if (action === 'jab') startPunch('guard_jab'); if (action === 'hook') startPunch('check_hook'); return; }
    if (action === 'jab') {
        if (st.player.jabStep === 0) startPunch('jab1');
        else if (st.player.jabStep === 1) startPunch('jab2');
        else if (st.player.jabStep === 2) startPunch('jab3');
        else startPunch('jab1');
    }
    else if (action === 'cross') startPunch('cross', charge);
    else if (action === 'hook') startPunch('hook');
}

function ghostStep() {
    // APEX (Blur Step): a second charge instead of a single cooldown gate — a
    // real burst tool (dash twice back to back), not just a faster refill.
    const maxGhostCharges = st.progressionMods.blurStep ? 2 : 1;
    if (st.player.ghostStepCharges === undefined) st.player.ghostStepCharges = maxGhostCharges;
    if (st.player.ghostStepCharges <= 0) return;
    st.player.ghostStepCharges--;
    tmGhost(false);
    st.player.state = 'ghost_step';
    st.player.ghostStepTimer = 18;
    st.player.ghostPerfected = false;
    st.player.charging = false;
    if (st.player.ghostStepCharges <= 0) st.player.ghostStepCooldown = Math.max(10, Math.floor(60 * st.progressionMods.ghostStepCooldownMult));
    // v16: Ghost Step never touches the combo — only the jab STRING restarts.
    resetJabString(); playSound('ghost_step');
    for(let i=0; i<8; i++) { st.particles.push({ x: st.player.x + Math.random() * 30, y: st.player.y - 30 - Math.random() * 60, vx: -10 - Math.random() * 15, vy: 0, life: 0.6, color: '#666666', type: 'dash_line' }); }
}

function executeMovementInput(action) {
    if (action === 'guard') { tmGuard(); st.player.state = 'guarding'; st.player.charging = false; st.combo = 0; resetJabString(); }
    else if (action === 'ghost') ghostStep();
    else if (action === 'up' || action === 'down') {
        const oldLane = st.player.lane;
        if (action === 'up') st.player.lane = Math.max(0, st.player.lane - 1);
        if (action === 'down') st.player.lane = Math.min(2, st.player.lane + 1);
        if (oldLane !== st.player.lane) {
            if (st.player.slipCooldown <= 0) {
                checkPerfectSlip(oldLane); st.player.slipCooldown = 12; resetJabString();
                if (st.progressionMods.pivotSlip) pivotForward();
                resolveBodies(st.player);
            }
            else { st.player.lane = oldLane; }
        }
    }
}

// v17 SPEED R3 — PIVOT SLIP: a slip carries you forward into punching range of
// whatever is in your new lane, and the next punch inside a short window is
// instant (no windup). Slipping stops being purely defensive.
function pivotForward() {
    const V = CONSTANTS.VERBS.pivotSlip, p = st.player;
    const target = st.enemies.filter(e => e.lane === p.lane && e.x > p.x).sort((a, b) => a.x - b.x)[0];
    const want = target ? Math.min(target.x - 95, p.x + V.advance) : p.x;
    if (want > p.x + 4) {
        p.x = Math.min(FOOTWORK_MAX_X, want);
        for (let i = 0; i < 6; i++) st.particles.push({ x: p.x - 20 - Math.random() * 30, y: p.y - 30 - Math.random() * 60, vx: -8 - Math.random() * 8, vy: 0, life: 0.5, color: buildColor(), type: 'dash_line' });
    }
    p.pivotTimer = V.instantWindow;
}

// v16: a Ghost Step that actually evades a live attack is a PERFECT Ghost Step —
// +1 combo, score, and it feeds Flow State like a Perfect Slip. Counted once per
// dash even if one dash slips several attacks. Called from every evade site
// (melee, zoner beam, boss strikes, Monk lasers, lane hazards).
export function registerPerfectGhostStep(attacker) {
    const p = st.player;
    if (!p || p.ghostPerfected) return false;
    p.ghostPerfected = true;
    st.combo++; if (st.combo > st.statMaxCombo) st.statMaxCombo = st.combo;
    st.statGhostSteps = (st.statGhostSteps || 0) + 1;
    tmGhost(true);
    p.flowStreak = (p.flowStreak || 0) + 1;
    addScore(CONSTANTS.SCORE.perfectGhostStep, p.x + 40, p.y - 120);
    spawnFloatingText(p.x, p.y - 95, "PERFECT GHOST +1", "#e5e7eb");
    // v19 PARITY: a perfect Ghost Step pays like a Perfect Slip — Instinct, the
    // slip-heal perks (Vantage Point, ADRENALINE), EXP, and it can open the Zone.
    // (The Counter charge stays the Ghost Counter fusion's signature.)
    const toZone = zoneReady();
    const flowMult = getFlowMultiplier(st);
    if (!st.isInstinct) {
        let gain = 20 * st.stats.techMult * (1 + st.progressionMods.perfectSlipRewardBonusMult) * flowMult;
        gain *= CONSTANTS.affixMod(st.currentAffix, 'instinctGainMult', 1);
        st.instinctMeter = Math.min(100, st.instinctMeter + gain);
    }
    const heal = st.progressionMods.perfectSlipHeal + CONSTANTS.affixMod(st.currentAffix, 'perfectSlipHeal', 0);
    if (heal > 0) st.health = Math.min(st.maxHealth, st.health + heal);
    st.exp += Math.floor(2 * (1 + st.progressionMods.expGainBonusMult) * flowMult);
    if (toZone) enterZone();
    // EVOLVED FUSION (Phantom Riposte): the dash leaves an afterimage that echoes back.
    if (st.progressionMods.phantomRiposte) spawnAfterimage(p.lane, p.x, 8);
    return true;
}

export function checkPerfectSlip(oldLane) {
    let slipQuality = 'none', bossSlipped = null, slipSrc = null;
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
                        slipQuality = 'perfect'; slipSrc = en;
                        if (en.isBoss) bossSlipped = en;

                        if (en.type === 'zoner') { en.attackCooldown = en.maxCooldown; /* evaded — no attack pose, it never fired */ }
                        else en.attackCooldown = Math.max(en.attackCooldown, 18);
                    }
                    else if (oldCooldown <= goodThresh && slipQuality !== 'perfect') {
                        slipQuality = 'good'; slipSrc = en;

                        if (en.type === 'zoner') { en.attackCooldown = en.maxCooldown; /* evaded — no attack pose, it never fired */ }
                        else en.attackCooldown = Math.max(en.attackCooldown, 18);
                    } else {
                        en.attackCooldown = Math.max(en.attackCooldown, 18);
                    }
                }
            }
        }
    });
    if (slipQuality !== 'none') triggerPerfectSlip(bossSlipped, slipQuality, slipSrc);
    // v17 TECHNIQUE R3 — AFTERIMAGE SLIP: a perfect slip leaves a neon copy in the
    // lane you left, which throws a delayed echo punch at whatever swung at you.
    if (slipQuality === 'perfect' && st.progressionMods.afterimageSlip) spawnAfterimage(oldLane, st.player.x);
}

// ---- AFTERIMAGES (Technique R3 / Phantom Riposte / used against you by NEGATIVE) ----
export function spawnAfterimage(lane, x, delayOverride) {
    if (!st.afterimages) st.afterimages = [];
    st.afterimages.push({ lane, x, y: st.height * CONSTANTS.LANE_Y[lane], timer: delayOverride !== undefined ? delayOverride : CONSTANTS.VERBS.afterimage.delay, fade: 22, fired: false, color: buildColor() });
}

function fireAfterimage(ai) {
    const V = CONSTANTS.VERBS.afterimage;
    let hit = false;
    for (const en of st.enemies) {
        if (en.lane !== ai.lane || en.x < ai.x - 20 || en.x > ai.x + V.reach || en.hp <= 0) continue;
        let dmg = Math.round(V.damage * st.stats.powerMult);
        if (en.isBoss) dmg = gateBossDamage(en, dmg);
        en.hp -= dmg; en.stun = Math.max(en.stun, en.isBoss ? 6 : V.stun);
        createImpact(en.x, en.y - 60, ai.color); createShatter(en.x, en.y - 70, ai.color);
        spawnFloatingText(en.x, en.y - 120, 'ECHO!', ai.color);
        hit = true;
    }
    if (hit) {
        st.combo++; if (st.combo > st.statMaxCombo) st.statMaxCombo = st.combo;
        addScore(CONSTANTS.SCORE.hit.hook, ai.x + 80, ai.y - 110);
        playSound('hit'); st.shake = Math.max(st.shake, 6);
    }
}

function updateAfterimages() {
    if (!st.afterimages || !st.afterimages.length) return;
    for (const ai of st.afterimages) {
        if (!ai.fired) { if (--ai.timer <= 0) { ai.fired = true; fireAfterimage(ai); } }
        else ai.fade--;
    }
    st.afterimages = st.afterimages.filter(ai => !ai.fired || ai.fade > 0);
}

// Instinct activation, shared by the [Instinct] button and the v17 ZONE trigger.
// v21 THE ZONE is now earned INSIDE Instinct: a Perfect Slip / Perfect Ghost
// Step while Instinct is running drops you in. (It used to fire on a Perfect Slip
// with a full meter — which spent the meter automatically, often with nothing
// on screen to use it on.) A full meter now just stays banked until you press it.
export function zoneReady() { return st.isInstinct && !(st.zoneTimer > 0); }
export function enterZone() {
    st.zoneTimer = CONSTANTS.ZONE.frames; st.zoneHold = 0;
    doFlash(0.4); st.hitstop = Math.max(st.hitstop || 0, 10); triggerShockwave(st.player.x, st.player.y - 50, '#ffffff');
    playSound('zone');
    spawnFloatingText(st.player.x, st.player.y - 140, 'THE ZONE', '#ffffff');
}
export function activateInstinct(zone = false) {
    st.isInstinct = true; st.instinctReadyTimer = 0; if (HUD.instinctBanner) HUD.instinctBanner.style.display = 'none';
    if (HUD.barCont) HUD.barCont.classList.add('beast-active'); doFlash(0.5); st.shake = 20; st.hitstop = 10; triggerShockwave(st.player.x, st.player.y - 50, '#ffffff'); playSound('perfect_slip');
    if (zone) {
        // v17 INSTINCT ZONE: slow-mo world + colour-inverted screen (render only).
        st.zoneTimer = CONSTANTS.ZONE.frames; st.zoneHold = 0;
        playSound('zone');
        spawnFloatingText(st.player.x, st.player.y - 140, 'THE ZONE', '#ffffff');
    }
}

export function triggerPerfectSlip(bossSlipped, slipQuality, src = null) {
    tmSlip(slipQuality);
    // v21 ANTI-FARM: a regular enemy only pays slip SCORE + EXP for its first few
    // attacks — standing in a Zoner's lane slipping forever used to farm points
    // while the stage never ended. Bosses always pay (that's the fight).
    const pays = !src || src.isBoss || ((src.slipsPaid = (src.slipsPaid || 0) + 1) <= CONSTANTS.SCORE.slipPayCap);
    if (slipQuality === 'perfect') {
        // v21: a Perfect Slip DURING Instinct drops you into the Zone.
        const toZone = zoneReady();
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
        if (pays) {
            addScore(CONSTANTS.SCORE.perfectSlip, st.player.x + 40, st.player.y - 120);
            st.exp += Math.floor(2 * (1 + st.progressionMods.expGainBonusMult) * flowMult); // reads are the core loop; pay them
        }
        st.player.slipBuff = (st.orbCounts.technique >= 2) ? 2 : 1;
        spawnFloatingText(st.player.x, st.player.y - 80, "COUNTER READY!", "#ffffff");
        st.hitstop += 8;
        if (st.orbCounts.speed >= 4) st.player.moveCancelReady = true;
        if (bossSlipped && st.orbCounts.technique >= 4) { bossSlipped.exposedTimer = 90 + st.progressionMods.bossExposeBonusFrames; spawnFloatingText(bossSlipped.x, bossSlipped.y - 140, "EXPOSED!", "#00ffff"); playSound('feint_tell'); }
        if (toZone) enterZone();
    } else if (slipQuality === 'good') {
        if (HUD.slipPopup) { HUD.slipPopup.innerText = "GOOD SLIP"; HUD.slipPopup.style.color = "#ff8ad8"; HUD.slipPopup.style.textShadow = "0 0 10px #ff00ff"; }
        if (!st.isInstinct) { st.instinctMeter = Math.min(100, st.instinctMeter + (5 * st.stats.techMult)); }
        st.shake = 3; playSound('slip');
        if (pays) addScore(CONSTANTS.SCORE.goodSlip, st.player.x + 40, st.player.y - 120);
    }
    if (HUD.slipPopup) { HUD.slipPopup.style.opacity = 1; setTimeout(() => { if (HUD.slipPopup) HUD.slipPopup.style.opacity = 0; }, 500); }
}

export function startPunch(t, charge = 0) {
    if (st.player.state === 'guarding') st.player.state = 'idle';
    tmAttack(t);
    st.player.state = 'punching'; st.player.punchType = t; st.player.didHit = false; st.player.moveCancelReady = false; st.player.comboWindow = 0;
    st.player.charging = false;
    st.player.crossLoaded = t === 'cross' && !!st.progressionMods.loadedCross && charge >= CONSTANTS.VERBS.loadedCross.chargeFrames;

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
    // v18 ZONE LUNGE: inside the Zone every punch closes the distance to the nearest
    // enemy in your lane (playtest: knocked-back targets made the slow-mo feel wasted).
    if ((st.zoneTimer || 0) > 0 && t !== 'guard_jab' && t !== 'check_hook') {
        const tgt = st.enemies.filter(e => e.lane === st.player.lane && e.x > st.player.x && e.x - st.player.x < 320).sort((a, b) => a.x - b.x)[0];
        if (tgt && tgt.x - st.player.x > 95) {
            st.player.x = Math.min(tgt.x - 90, FOOTWORK_MAX_X + 120);
            for (let i = 0; i < 6; i++) st.particles.push({ x: st.player.x - 20 - Math.random() * 40, y: st.player.y - 30 - Math.random() * 60, vx: -9, vy: 0, life: 0.5, color: '#ffffff', type: 'dash_line' });
        }
    }
    // PIVOT SLIP: the first punch out of a pivot is instant.
    if (st.player.pivotTimer > 0 && t !== 'guard_jab' && t !== 'check_hook') { st.player.hitFrame = 1; st.player.pivotTimer = 0; }

    if (st.player.slipBuff > 0) { playSound('vacuum'); createVacuum(st.player.x + 80, st.player.y - 40); }
}

export function takeDamage(amt, isHeavy, en, opts = {}) {
    // v17 TEN-COUNT: back on your feet you get a short grace period.
    if ((st.player.invuln || 0) > 0) return;
    const PH = CONSTANTS.PLAYER_HIT;
    const guarding = st.player.state === 'guarding';
    // APEX (Flow State): one hit, any hit, zeroes the streak — that's the entire
    // point of "sustained, not merely survived."
    st.player.flowStreak = 0;
    st.player.charging = false;
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
    if (heatOn('glass_jaw')) amt *= CONSTANTS.HEAT.glassJawMult; // v20 HEAT
    let actualDmg = st.player.state === 'guarding' ? Math.floor(amt * guardMult) : Math.floor(amt);
    if (piercing) spawnFloatingText(st.player.x, st.player.y - 60, "GUARD PIERCED!", "#aa00ff");
    if (st.player.state === 'guarding' && st.progressionMods.guardRead) st.player.guardReadTimer = 16;
    st.health -= actualDmg;
    tmDamage(opts.src || (en ? (en.isBoss ? en.controller : en.type) : 'hazard'), actualDmg);
    st.stageHitsTaken = (st.stageHitsTaken || 0) + 1;
    st.player.hitStun = isHeavy ? PH.hitStun.heavy : PH.hitStun.light;
    st.shake = isHeavy ? 30 : 15;
    // v19: the hit freezes the frame for a beat, then shoves you back in a slide
    // (was an instant teleport with no weight to it).
    st.hitstop = Math.max(st.hitstop || 0, isHeavy ? PH.hitStop.heavy : PH.hitStop.light);
    st.player.slideVx = -(isHeavy ? PH.slide.heavy : PH.slide.light) * st.progressionMods.incomingRecoilMult;
    st.player.state = 'hurt'; resetJabString();
    st.player.charging = false;
    // v19: heavy boss blows and COUNTER HITS put you on the floor for a moment.
    if (opts.floor && !guarding) {
        tmFloored(!!opts.counter);
        st.player.state = 'floored';
        st.player.floorTimer = PH.floorFrames;
        st.player.invuln = PH.floorFrames + PH.floorGrace;
        st.player.slideVx *= 1.6;
        spawnFloatingText(st.player.x + 10, st.player.y - 140, opts.counter ? 'COUNTERED!' : 'DOWN!', '#ff3355');
        playSound('knockdown');
    }

    if (st.combo >= 2 && !st.isInstinct) spawnFloatingText(st.player.x, st.player.y - 50, "COMBO BROKEN", "#ff0055");
    st.combo = 0;
    if (!st.isInstinct) doFlash(isHeavy ? 0.4 : 0.2);
    playSound('hit');

    let sf = document.getElementById('screen-flash');
    if (sf && flashScale() > 0.01) { sf.style.background = 'red'; sf.style.opacity = 0.4 * flashScale(); setTimeout(() => { if (sf) { sf.style.background = 'white'; sf.style.opacity = 0; } }, 150); }
    if (HUD.health) { HUD.health.classList.add('text-red-500', 'scale-125'); setTimeout(() => HUD.health.classList.remove('text-red-500', 'scale-125'), 200); }
    if (st.enemies.some(e => e.isBoss && e.desperation)) st.statDespDamage++;
}

// v19 BODY BLOCKING: fighters in your lane are solid — you can't walk through
// them, and a slip onto an occupied spot sets you down just in front of them.
const BODY_GAP = 62;
// v21: only your own lane is solid. Enemies in other lanes now walk the rail past
// you (RAIL_LOOP), so they no longer shove you back as they go by; anyone who has
// already passed (behind you) is ignored.
export function resolveBodies(p) {
    for (const e of st.enemies) {
        if (e.hp <= 0 || e.controller === 'static_monk' || e.x > st.width || e.lane !== p.lane) continue;
        if (e.x - p.x < BODY_GAP && e.x > p.x - 10) p.x = Math.max(FOOTWORK_MIN_X, e.x - BODY_GAP);
    }
}

// Mid-combo, or a target in punching range in YOUR lane? Then the Striker holds
// his ground (no drifting backwards under your own punches). Anything looser
// — e.g. "someone anywhere nearby" — kept him parked too far forward.
function isEngaged(p) {
    if (p.comboWindow > 0 || p.state === 'punching' || p.state === 'recovery') return true;
    return st.enemies.some(e => e.hp > 0 && e.lane === p.lane && e.x > p.x - 30 && e.x - p.x < 160);
}

// Reads the remappable binds + pad into one input snapshot for this frame.
function readInput() {
    // v19: right after a menu hands control back, nothing registers (see main.js).
    if ((st.inputGrace || 0) > 0) {
        st.inputGrace--;
        return { up: false, down: false, ghost: false, jab: false, cross: false, hook: false, instinct: false, guard: false, holdLeft: false, holdRight: false, crossHeld: false };
    }
    const K = getBinds();
    const jp = code => !!st.keys[code] && !st.lastKeys[code];
    const pad = st.pad;
    return {
        up: pad.up || jp(K.up), down: pad.down || jp(K.down),
        ghost: pad.ghost || jp(K.ghost),
        jab: pad.jab || jp(K.jab), cross: pad.cross || jp(K.cross), hook: pad.hook || jp(K.hook),
        instinct: pad.instinct || jp(K.instinct),
        guard: !!(pad.guard || st.keys[K.guard]),
        holdLeft: !!(st.keys[K.left] || pad.leftHeld), holdRight: !!(st.keys[K.right] || pad.rightHeld),
        crossHeld: !!(st.keys[K.cross] || pad.crossHeld)
    };
}

export function updatePlayer() {
    const input = readInput();
    const p = st.player;

    st.scrollX += (st.isInstinct ? 20 : 8) * (st.stageSpeedMult || 1.0);

    if (p.invuln > 0) p.invuln--;
    if (p.pivotTimer > 0) p.pivotTimer--;
    if (p.slipCooldown > 0) p.slipCooldown--;
    if (p.ghostStepCooldown > 0) {
        p.ghostStepCooldown--;
        if (p.ghostStepCooldown <= 0) {
            const maxGhostCharges = st.progressionMods.blurStep ? 2 : 1;
            p.ghostStepCharges = Math.min(maxGhostCharges, (p.ghostStepCharges || 0) + 1);
            if (p.ghostStepCharges < maxGhostCharges) p.ghostStepCooldown = Math.max(10, Math.floor(60 * st.progressionMods.ghostStepCooldownMult));
        }
    }
    if (p.guardReadTimer > 0) p.guardReadTimer--;
    updateAfterimages();

    const targetY = st.height * CONSTANTS.LANE_Y[p.lane];
    p.y += (targetY - p.y) * 0.25;

    // FOOTWORK: [RIGHT] presses forward, [LEFT] gives ground (v17: LEFT is footwork
    // ONLY — Ghost Step has its own button). With neither held, a soft pull home.
    if (p.state !== 'hurt' && p.state !== 'punching') {
        if (input.holdRight) p.x = Math.min(FOOTWORK_MAX_X, p.x + FOOTWORK_ADVANCE_SPD);
        else if (input.holdLeft) p.x = Math.max(FOOTWORK_MIN_X, p.x - FOOTWORK_RETREAT_SPD);
        // v18: the drift back to neutral only happens when you're NOT engaged —
        // mid-combo (or with anyone in reach) you stay planted where you stepped.
        // (Playtest: the pull home turned combos into retreating punches.)
        else if (!FW.holdGroundWhenEngaged || !isEngaged(p)) p.x += (180 - p.x) * FOOTWORK_HOME_PULL;
    }
    resolveBodies(p);

    if (input.instinct && st.instinctMeter >= 100 && !st.isInstinct) activateInstinct(false);

    if (p.inputBufferTimer > 0) if (--p.inputBufferTimer <= 0) { p.inputBuffer = null; p.bufferedCharge = 0; }
    if (p.movementBufferTimer > 0) if (--p.movementBufferTimer <= 0) p.movementBuffer = null;

    // v19: knockback slides out instead of teleporting
    if (p.slideVx && Math.abs(p.slideVx) > 0.2) { p.x = Math.max(FOOTWORK_MIN_X, p.x + p.slideVx); p.slideVx *= 0.8; } else p.slideVx = 0;
    if (p.state === 'floored') { if (--p.floorTimer <= 0) { p.state = 'idle'; st.inputGrace = 6; } return; }
    if (p.state === 'hurt') { if (--p.hitStun <= 0) p.state = 'idle'; return; }
    if (p.state === 'recovery') { if (--p.recoveryTimer <= 0) p.state = 'idle'; }
    else if (p.state === 'ghost_step') { if (--p.ghostStepTimer <= 0) p.state = 'idle'; }

    // POWER R3 — LOADED CROSS: with it, Cross fires on RELEASE. A tap is a normal
    // Cross; hold it to load a guard-breaking blow. v18: the charge counts from the
    // moment Cross goes down in ANY state (it used to only start from idle, so a
    // press during a punch or recovery silently became a tap), and slipping while
    // holding keeps the charge.
    let crossAttempt = input.cross, crossCharge = 0;
    if (st.progressionMods.loadedCross) {
        const LC = CONSTANTS.VERBS.loadedCross;
        crossAttempt = false;
        if (input.cross) { p.charging = true; p.crossCharge = 0; }
        if (p.charging) {
            if (input.crossHeld) {
                p.crossCharge = Math.min(LC.maxFrames, p.crossCharge + 1);
                // v19: the charge lives ON THE GLOVE (Mega Buster style, see boxer.js);
                // just a chime when it's loaded — no screen-wide effects.
                if (p.crossCharge === LC.chargeFrames) playSound('charge_ready');
            } else { crossAttempt = true; crossCharge = p.crossCharge; p.charging = false; }
        }
    }

    if (input.guard) {
        if (p.state === 'idle' && !p.charging) { p.state = 'guarding'; st.combo = 0; resetJabString(); }
    } else {
        if (p.state === 'guarding') {
            p.state = 'idle';
            // GUARD READ (mastery-gated): a hit landed on your guard, and you let
            // go inside the read window instead of holding forever. Same reward
            // as a Perfect Slip — turtling becomes a second skill expression
            // rather than only a safe, passive fallback.
            if (p.guardReadTimer > 0 && st.progressionMods.guardRead) {
                p.guardReadTimer = 0;
                p.slipBuff = Math.max(p.slipBuff, 1);
                playSound('perfect_slip'); doFlash(0.15); st.shake = Math.max(st.shake, 6);
                spawnFloatingText(p.x, p.y - 80, "GUARD READ!", "#ffffff");
            }
        }
    }

    let canAct = p.state === 'idle' || p.state === 'guarding';
    const moveAction = input.up ? 'up' : (input.down ? 'down' : (input.ghost ? 'ghost' : null));
    const attackAction = input.jab ? 'jab' : (crossAttempt ? 'cross' : (input.hook ? 'hook' : null));
    let attemptMovement = !!moveAction || input.guard;

    if (!canAct && p.moveCancelReady && attemptMovement && p.state !== 'ghost_step') {
        canAct = true; p.moveCancelReady = false; p.state = 'idle';
        createImpact(p.x, p.y - 50, '#00ffff'); playSound('slip');
    }

    if (canAct) {
        if (attackAction) {
            if (p.charging && attackAction !== 'cross') p.charging = false;
            if (Math.abs(p.y - targetY) < 5) executeAttackInput(attackAction, crossCharge);
            else { p.inputBuffer = attackAction; p.bufferedCharge = crossCharge; p.inputBufferTimer = 12; }
        } else if (moveAction) {
            if (p.state === 'guarding') p.state = 'idle';
            if (moveAction === 'ghost') p.charging = false; // a slip keeps a Loaded Cross charging
            executeMovementInput(moveAction);
        } else if (input.guard && !p.charging) {
            executeMovementInput('guard');
        } else {
            if (p.state === 'guarding') p.state = 'idle';
        }
    } else if (p.state === 'punching' || p.state === 'recovery') {
        if (attackAction) { p.inputBuffer = attackAction; p.bufferedCharge = crossCharge; p.inputBufferTimer = 12; }
        else if (moveAction) { p.movementBuffer = moveAction; p.movementBufferTimer = 12; }
    }

    if (p.state === 'idle' || p.state === 'guarding') {
        if (p.comboWindow > 0) if (--p.comboWindow <= 0) resetJabString();
        if (p.movementBuffer) { let c = p.movementBuffer; p.movementBuffer = null; p.movementBufferTimer = 0; executeMovementInput(c); }
        else if (p.inputBuffer) {
            if (Math.abs(p.y - targetY) < 5) { let c = p.inputBuffer, ch = p.bufferedCharge || 0; p.inputBuffer = null; p.bufferedCharge = 0; p.inputBufferTimer = 0; executeAttackInput(c, ch); }
        }
    }

    if (p.state === 'punching') {
        p.punchTimer--;
        if (p.hitFrame > 0) {
            p.hitFrame--;
            if (p.hitFrame === 0) {
                p.didHit = checkHit(p.punchType);
                if (p.didHit) tmLanded(p.punchType);
            }
        }
        if (p.punchTimer <= 0) {
            if (!p.didHit) {
                p.state = 'recovery';
                let isJab = p.punchType && p.punchType.startsWith('jab'), iGP = p.punchType === 'guard_jab' || p.punchType === 'check_hook';
                p.recoveryTimer = (isJab || p.punchType === 'guard_jab' ? 6 : (p.punchType === 'hook' || p.punchType === 'check_hook' ? Math.floor(9 * st.progressionMods.hookRecoveryMult) : 13));

                if (p.dempseyActive) p.recoveryTimer = Math.max(1, Math.floor(p.recoveryTimer * (1 - st.progressionMods.dempseyRecoveryBonus)));

                // EVOLVED FUSION (Infinite Circuit): an alternating Jab/Hook string never drops combo on a whiff.
                const circuitSafe = st.progressionMods.infiniteCircuit && p.dempseyActive;
                if (circuitSafe) { /* combo kept */ }
                else if (isJab && !iGP) {
                    if (st.progressionMods.relentlessRhythm && (p.punchType === 'jab1' || p.punchType === 'jab2')) {
                        st.combo = Math.max(0, st.combo - 1);
                    } else if (st.orbCounts.speed < 2) {
                        st.combo = Math.max(0, st.combo - 1);
                    } else { st.combo = 0; }
                } else if (!iGP) st.combo = 0;

                resetJabString();
                let cD = st.enemies.find(e => e.tutorialType === 'counter');
                if (cD) { spawnFloatingText(p.x, p.y - 50, "MISSED! TRY AGAIN!", "#ffaa00"); cD.x = p.x + 250; cD.attackCooldown = cD.maxCooldown; cD.justAttacked = 0; p.slipBuff = 1; }
            } else {
                p.state = 'idle';
                p.comboWindow = p.dempseyActive ? 35 : 25;
                // EVOLVED FUSION (Infinite Circuit): every 4th alternation charges a Counter.
                if (st.progressionMods.infiniteCircuit && p.dempseyActive) {
                    p.dempseyAlternations = (p.dempseyAlternations || 0) + 1;
                    if (p.dempseyAlternations % 4 === 0) { p.slipBuff = Math.max(p.slipBuff, 1); spawnFloatingText(p.x, p.y - 100, 'CIRCUIT CHARGED', CONSTANTS.FUSION_COLORS.evo_infinite_circuit); }
                }
                p.lastPunchLanded = p.punchType;
            }
            p.crossLoaded = false;
        }
    }
}
