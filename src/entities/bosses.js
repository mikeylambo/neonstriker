import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { playSound } from '../vfx_audio/audio.js';
import { createImpact, spawnFloatingText, doFlash, triggerShockwave, createShatter } from '../vfx_audio/effects.js';
import { takeDamage } from './player.js';
import { random } from '../systems/rng.js';

const BOSS_ROSTER = [
    {
        name: 'NEON ENFORCER',
        color: '#ffaa00',
        controller: 'neon_enforcer',
        type: 'shield',
        weight: 2.0,
        speed: 1.2,
        cooldown: 60,
        baseHpMult: 1.0,
        startMove: 'jab'
    },
    {
        name: 'PHANTOM BOXER',
        color: '#aa00ff',
        controller: 'phantom_boxer',
        type: 'assassin',
        weight: 1.5,
        speed: 2.5,
        cooldown: 40,
        baseHpMult: 0.75,
        startMove: 'feint'
    },
    {
        name: 'STATIC MONK',
        color: '#00ff00',
        controller: 'static_monk',
        type: 'zoner',
        weight: 1.2,
        speed: 1.0,
        cooldown: 120, 
        baseHpMult: 0.85,
        startMove: 'laser'
    }
];

// A lone Grunt add summoned by the Static Monk's Arc 3+ recharge (summonSupportPressure).
// Uses the same stat/scaling shape as a normal wave Grunt so it reads as a familiar
// threat, and enters off the right edge so it's always slippable/beatable on arrival.
function spawnMonkAdd() {
    let hp = Math.floor(45 * (1 + (st.currentStage - 1) * 0.10));
    let lane = Math.floor(random() * 3);
    st.enemies.push({
        x: st.width + 60, lane, y: st.height * CONSTANTS.LANE_Y[lane],
        w: 50, h: 110, hp, maxHp: hp, speed: 3.0 * (st.stageSpeedMult || 1),
        color: '#ff0055', type: 'grunt', weight: 1, stun: 0, stunResist: 0,
        attackCooldown: 60, maxCooldown: 60, isBoss: false,
        justAttacked: 0, trails: [], trailTimer: 0, vx: 0, pressure: 0, pressureDecay: 0
    });
    spawnFloatingText(st.width - 120, st.height * 0.2, "SUPPORT INBOUND", "#00ff00");
}

export function spawnBoss() {
    st.bossActive = true; 
    st.bossIntroTimer = 120; 
    st.shake = 15; 
    playSound('bash_tell');
    
    let baseHp = 300 + (st.currentStage * 100); 

    const rawArcIndex = CONSTANTS.getArcIndex(st.currentStage);
    const bossIndex = (rawArcIndex - 1) % BOSS_ROSTER.length;
    const template = BOSS_ROSTER[bossIndex];
    
    st.bossThemeColor = template.color; 
    st.bossIntroText = template.name;

    // --- MACRO PLUMBING: Inject scaling behavioral traits based on current Arc ---
    const arcMods = CONSTANTS.getBossArcMods(template.controller, rawArcIndex);

    st.enemies.push({ 
        name: template.name, 
        controller: template.controller,
        x: st.width - 150, 
        lane: 1, 
        y: st.height * CONSTANTS.LANE_Y[1], 
        w: template.type === 'shield' ? 60 : 50, 
        h: template.type === 'shield' ? 140 : 130, 
        hp: baseHp * template.baseHpMult, 
        maxHp: baseHp * template.baseHpMult, 
        speed: template.speed, 
        color: template.color, 
        type: template.type, 
        weight: template.weight, 
        phase: 1, 
        currentMove: template.startMove, 
        lastMove: null, 
        stun: 0, 
        stunResist: 0, 
        attackCooldown: template.cooldown, 
        maxCooldown: template.cooldown, 
        isBoss: true, 
        pressure: 0, 
        pressureDecay: 0, 
        justAttacked: 0, 
        trails: [], 
        trailTimer: 0, 
        bossMashCount: 0, 
        mashDecay: 0, 
        hitstunScaling: 0, 
        stunDecay: 0, 
        shiftWarning: 0, 
        shiftCooldown: 0, 
        vx: 0, 
        exposedTimer: 0, 
        desperation: false, 
        enraged: false,
        targetLanes: [],
        decoyTimer: 0, decoyLane: -1, decoyRolledThisCycle: false,
        arcMods: arcMods // Assigned directly to the entity!
    });
}

// Resolves a melee boss connect. Bosses are no longer processed by the generic
// enemy attack loop, so damage/evade handling lives here.
function resolveBossStrike(en, rawDmg, isHeavy) {
    if (en.lane !== st.player.lane) return;
    if (Math.abs(en.x - st.player.x) > 100) return;

    if (st.player.state === 'ghost_step') {
        spawnFloatingText(st.player.x, st.player.y - 50, "GHOST STEP", "#888888");
        if (st.progressionMods.ghostCounter && st.player.slipBuff === 0) {
            st.player.slipBuff = 1; playSound('perfect_slip');
            spawnFloatingText(st.player.x, st.player.y - 80, "GHOST COUNTER!", "#ffffff");
        }
        return;
    }
    let dmg = st.isInstinct ? Math.floor(rawDmg * 0.5) : rawDmg;
    takeDamage(dmg, isHeavy, en);
}

function handleNeonEnforcer(en) {
    en.attackCooldown--;
    if (en.desperation && st.runCount % 2 === 0) en.attackCooldown -= 1; 

    // Moves relentlessly forward unless executing a plant-move
    if (en.currentMove !== 'bash' && en.x > st.player.x + 100) {
        en.x -= (en.speed * 0.5 * en.arcMods.walkDownMult);
    }

    if (Math.abs(en.x - st.player.x) < 140 && en.stun <= 0) {
        if (en.attackCooldown === Math.floor(22 * en.arcMods.punishWindowMult)) {
            playSound('bash_tell');
            if (en.currentMove === 'bash') createImpact(en.x, en.y - 60, '#ffaa00');
        }

        if (en.attackCooldown <= 0) {
            en.justAttacked = 5; 
            resolveBossStrike(en, en.currentMove === 'bash' ? 30 : 12, en.currentMove === 'bash');
            if (en.enraged) {
                en.currentMove = 'bash';
                en.enraged = false;
            } else {
                let roll = random();
                if (en.phase === 1) {
                    en.currentMove = roll > 0.6 ? 'bash' : 'jab'; 
                    en.maxCooldown = (en.currentMove === 'bash' ? 70 : 45);
                } else {
                    en.currentMove = roll > 0.5 ? 'bash' : 'jab';
                    en.maxCooldown = (en.currentMove === 'bash' ? 55 : 35);
                }
            }
            en.attackCooldown = en.maxCooldown;
        }
    }
}

function handlePhantomBoxer(en) {
    en.attackCooldown--;
    if (en.desperation && st.runCount % 2 === 0) en.attackCooldown -= 1; 

    if (en.x > st.player.x + 100) {
        en.x -= en.speed;
    }

    // ARC MUTATION (was authored, never read): at Arc 4-5, Phantom Boxer sometimes
    // flashes a decoy lane that isn't actually under threat, baiting a wasted slip.
    // Delivers on Arc 4's own copy ("tells become less literal") using data that
    // was already sitting in constants.js unused.
    if (en.arcMods.fakeLaneFlash && !en.decoyRolledThisCycle && Math.abs(en.x - st.player.x) < 140 &&
        en.attackCooldown === Math.floor(28 * en.arcMods.punishWindowMult) && random() < 0.45) {
        en.decoyRolledThisCycle = true;
        const otherLanes = [0, 1, 2].filter(l => l !== en.lane);
        en.decoyLane = otherLanes[Math.floor(random() * otherLanes.length)];
        en.decoyTimer = 16;
    }
    if (en.decoyTimer > 0) {
        en.decoyTimer--;
        st.laneFlash[en.decoyLane] = Math.max(st.laneFlash[en.decoyLane], en.decoyTimer < 6 ? 2 : 1);
    }

    // ARC MUTATION (afterimageThreat, was authored, never read): at Arc 4-5 the
    // Phantom's trailing afterimage reads as a faint threat of its own — its lane
    // throws a low decoy flash, but only early (>20 frames out), so it always
    // clears before the real perfect-slip window and can only bait a wasted read.
    if (en.arcMods.afterimageThreat && en.trails && en.trails.length > 0 && en.attackCooldown > 20) {
        const ghost = en.trails[0];
        if (ghost && ghost.lane !== undefined && ghost.lane !== en.lane) {
            st.laneFlash[ghost.lane] = Math.max(st.laneFlash[ghost.lane], 1);
        }
    }

    if (Math.abs(en.x - st.player.x) < 140 && en.stun <= 0) {
        if (en.attackCooldown === Math.floor(22 * en.arcMods.punishWindowMult)) {
            playSound(en.currentMove === 'feint' ? 'feint_tell' : 'jab_tell');
        }

        if (en.currentMove === 'feint' && en.attackCooldown === Math.floor(12 * en.arcMods.punishWindowMult)) {
            en.lane = st.player.lane; 
            en.y = st.height * CONSTANTS.LANE_Y[en.lane];
            createImpact(en.x, en.y - 60, '#aa00ff');
        }

        if (en.attackCooldown <= 0) {
            en.justAttacked = 5; 
            resolveBossStrike(en, 15, false);
            en.decoyRolledThisCycle = false; en.decoyTimer = 0;
            let roll = random();
            if (en.phase === 1) {
                en.currentMove = roll > 0.5 ? 'feint' : 'jab'; 
                en.maxCooldown = (en.currentMove === 'feint' ? 45 : 30);
            } else {
                if (en.lastMove === 'feint') en.currentMove = 'jab'; 
                else en.currentMove = roll > 0.2 ? 'feint' : 'jab';
                en.maxCooldown = (en.currentMove === 'feint' ? 35 : 20);
            }
            en.lastMove = en.currentMove; 
            en.attackCooldown = en.maxCooldown;
        }
    }
}

function handleStaticMonk(en) {
    en.attackCooldown--;
    if (en.desperation && st.runCount % 2 === 0) en.attackCooldown -= 1; 

    if (en.currentMove === 'recharge') {
        en.x = st.player.x + 100;
        if (en.attackCooldown <= 0) {
            en.currentMove = 'laser';
            en.x = st.width - 150;
            en.attackCooldown = 100;
            playSound('ghost_step');
            createShatter(en.x, en.y - 60, '#00ff00');
        }
    } else {
        en.x = (st.width - 150) + Math.sin(Date.now() * 0.002) * 50;

        if (en.attackCooldown === 80) {
            playSound('zoner_tell');
            en.targetLanes = [st.player.lane];
            let adjacentLane = st.player.lane === 1 ? (random() > 0.5 ? 0 : 2) : 1; 
            en.targetLanes.push(adjacentLane);
        }

        if (en.attackCooldown <= 80 && en.attackCooldown > 0 && en.targetLanes.length > 0) {
            en.targetLanes.forEach(laneIndex => {
                st.laneFlash[laneIndex] = en.attackCooldown <= 15 ? 2 : 1;
                if (st.player.lane === laneIndex) {
                    st.player.dangerLevel = Math.max(st.player.dangerLevel, en.attackCooldown <= 15 ? 2 : 1);
                }
            });
            // ARC MUTATION (deceptiveOrder, was authored, never read): at Arc 4-5 the
            // safe lane also throws an early, low decoy flash — but only well before
            // the lethal window (>45 frames out), so it always clears in time and
            // never suppresses the real tell. It punishes a panic-slip, not a read.
            if (en.arcMods.deceptiveOrder && en.attackCooldown > 45) {
                const safeLane = [0, 1, 2].find(l => !en.targetLanes.includes(l));
                if (safeLane !== undefined) st.laneFlash[safeLane] = Math.max(st.laneFlash[safeLane], 1);
            }
        }

        if (en.attackCooldown <= 0) {
            playSound('laser');
            en.justAttacked = 10;
            st.shake = 15;
            
            if (en.targetLanes.length > 0) {
                en.targetLanes.forEach(laneIndex => {
                    for (let i = 0; i < 6; i++) {
                        createImpact(en.x - (i * 150), st.height * CONSTANTS.LANE_Y[laneIndex], '#00ff00');
                    }
                    if (st.player.lane === laneIndex) {
                        if (st.player.state === 'ghost_step') spawnFloatingText(st.player.x, st.player.y - 50, "EVADED", "#888888");
                        else takeDamage(st.isInstinct ? 15 : 30, true, en);
                    }
                });
            }
            
            en.targetLanes = [];
            en.bossMashCount++;

            // ARC MUTATION (patternChainLength, was authored, never read): volleys per
            // burst = 1 + patternChainLength, so Arc 1 keeps the original 2-volley
            // rhythm (1+1) and Arc 5 chains up to 4 before the recharge opening.
            const volleysPerBurst = 1 + (en.arcMods.patternChainLength || 1);
            if (en.bossMashCount >= volleysPerBurst) {
                en.currentMove = 'recharge';
                en.attackCooldown = Math.floor(180 / en.arcMods.teleportRateMult);
                en.bossMashCount = 0;
                en.lane = st.player.lane;
                en.y = st.height * CONSTANTS.LANE_Y[en.lane];
                en.x = st.player.x + 100;
                playSound('ghost_step');
                createImpact(en.x, en.y - 60, '#00ff00');
                spawnFloatingText(en.x, en.y - 120, "RECHARGING!", "#00ff00");
                // ARC MUTATION (summonSupportPressure, Arc 3+): the recharge is no
                // longer a free breather — one Grunt add walks in so the opening has
                // a cost. Capped at one live add so it stays pressure, not a swarm.
                if (en.arcMods.summonSupportPressure && st.enemies.filter(e => !e.isBoss).length < 1) {
                    spawnMonkAdd();
                }
            } else {
                // ARC MUTATION (followupPattern, Arc 2+): a tighter beat between volleys
                // (88 vs 100). Kept above 80 so the telegraph at attackCooldown===80
                // always still fires — the rhythm hardens, the read stays honest.
                en.attackCooldown = en.arcMods.followupPattern ? 88 : 100;
                let otherLanes = [0, 1, 2].filter(l => l !== en.lane);
                en.lane = otherLanes[Math.floor(random() * otherLanes.length)];
                en.y = st.height * CONSTANTS.LANE_Y[en.lane];
            }
        }
    }
}

export function updateBosses() {
    st.enemies.forEach(en => {
        if (!en.isBoss || en.stun > 0 || st.bossIntroTimer > 0) return;
        if (en.controller === 'neon_enforcer') handleNeonEnforcer(en);
        else if (en.controller === 'phantom_boxer') handlePhantomBoxer(en);
        else if (en.controller === 'static_monk') handleStaticMonk(en);
    });
}