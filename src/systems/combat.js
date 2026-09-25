import { gameState as st, getFlowMultiplier } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { playSound } from '../vfx_audio/audio.js';
import { spawnFloatingText, createImpact, createHitRing, doFlash, createShatter, triggerShockwave, createVacuum } from '../vfx_audio/effects.js';
import { takeDamage } from '../entities/player.js';
import { random } from './rng.js';
import { isBossOpen } from './boss_rules.js';
import { gateBossDamage } from './finisher.js';
import { addScore, hitScore } from './score.js';
import { buildColor } from './colors.js';
import { negativeReact } from './negative.js';
import { keyName } from './settings.js';
import { heatOn } from './heat.js';

export function checkHit(type) {
    let isJab = type.startsWith('jab') || type === 'guard_jab';
    let isGuardPunch = type === 'guard_jab' || type === 'check_hook';

    let reachMult = (st.orbCounts.power >= 2) ? 1.25 : 1;
    let reach = isJab ? 120 : (type === 'cross' ? 140 * reachMult : 140);
    let hitSomething = false;
    let buffActive = st.player.slipBuff > 0;
    // v17 POWER R3: a fully loaded Cross (held past chargeFrames, fired on release).
    const loaded = type === 'cross' && !!st.player.crossLoaded;
    const spark = buildColor();
    let novaLanes = [];

    if (st.player.slipBuff > 0) st.player.slipBuff--;

    const jX = () => (Math.random() * 50 - 25);
    const jY = () => (Math.random() * 30 - 15);

    for (let i = 0; i < st.enemies.length; i++) {
        let en = st.enemies[i];

        if (en.lane === st.player.lane && en.x > st.player.x - 20 && en.x < st.player.x + reach) {

            if (en.tutorialType === 'counter') {
                if (buffActive) { en.hp = 0; createShatter(en.x, en.y - 60, '#ffffff'); spawnFloatingText(en.x + jX(), en.y - 100 + jY(), "SHATTERED!", "#ffffff"); st.statCounterHits++; }
                else { spawnFloatingText(st.player.x + jX(), st.player.y - 50 + jY(), "USE CHARGED STRIKE!", "#ffaa00"); en.x = st.player.x + 200; en.attackCooldown = en.maxCooldown; st.player.slipBuff = 1; playSound('bounce'); continue; }
            }

            if (en.tutorialType === 'slip') { spawnFloatingText(en.x, en.y - 80, "SLIP IT! (UP/DOWN)", "#ffaa00"); hitSomething = true; continue; }
            if (en.tutorialType === 'guard') { spawnFloatingText(en.x, en.y - 80, `WAIT & HOLD [${keyName('guard')}]!`, "#ffaa00"); hitSomething = true; continue; }
            if (en.tutorialType === 'ghost_step') { spawnFloatingText(en.x, en.y - 80, `GHOST STEP [${keyName('ghost')}]!`, "#ffaa00"); hitSomething = true; continue; }

            if (en.tutorialType === 'shield') {
                if (type === 'cross') { en.hp = 0; spawnFloatingText(st.player.x + jX(), st.player.y - 50 + jY(), "ARMOR BROKEN!", "#00ffff"); }
                else { spawnFloatingText(st.player.x + jX(), st.player.y - 50 + jY(), `USE CROSS [${keyName('cross')}] TO BREAK!`, "#ffaa00"); en.x = st.player.x + 200; en.attackCooldown = en.maxCooldown; playSound('bounce'); continue; }
            } else if (en.type === 'shield' && type !== 'cross') {
                createImpact(en.x, en.y - 80, '#ffaa00'); en.x += 5; st.shake = 2; playSound('bounce'); continue;
            }

            let dmg = 0;
            if (type === 'jab1' || type === 'jab2') dmg = 15;
            else if (type === 'jab3') dmg = 25;
            else if (type === 'hook') dmg = 35;
            else if (type === 'cross') dmg = 50;
            else if (type === 'guard_jab') dmg = 10;
            else if (type === 'check_hook') dmg = 25;

            // AFFIX (GLASS PROTOCOL): all outgoing damage is boosted. Applied to the
            // base before buff/cash-out so boss phase-thresholds below see the same
            // value the enemy actually takes. The matching +30% incoming lives in
            // player.js takeDamage — the whole stage becomes a coin-flip either way.
            dmg = Math.round(dmg * CONSTANTS.affixMod(st.currentAffix, 'playerDamageDealtMult', 1));
            if (isJab && en.type === 'grunt' && heatOn('plated')) dmg = Math.round(dmg * CONSTANTS.HEAT.platedJabMult); // v20 HEAT

            // PRESSURE/CASH-OUT: any landed non-guard punch pins pressure onto its
            // target (capped at 3). Branch into a Cross before it decays and the
            // built-up pressure converts into a real damage bonus below — the same
            // "bank now or push your luck" tension a Jab-string is supposed to create.
            const prevPressure = en.pressure || 0;
            if (!isGuardPunch) {
                en.pressure = Math.min(3, prevPressure + 1);
                let jpm = (en.isBoss && en.name === 'NEON ENFORCER' && en.arcMods) ? en.arcMods.jabPressureMult : 1;
                en.pressureDecay = Math.max(15, Math.floor(45 / jpm));
            }

            if (buffActive) dmg *= 2;
            if (loaded) dmg = Math.round(dmg * 1.3);

            // v17 EVOLVED FUSION (Shatter Nova): a Counter-Charged Cross tears a chunk
            // off a boss (still gated by the stagger thresholds), or shatters the lane.
            if (st.progressionMods.shatterNova && buffActive && type === 'cross') {
                if (en.isBoss) dmg += Math.round(en.maxHp * 0.08);
                else novaLanes.push(en.lane);
                spawnFloatingText(en.x + jX(), en.y - 150 + jY(), "SHATTER NOVA", CONSTANTS.FUSION_COLORS.evo_shatter_nova);
            }
            if (loaded) spawnFloatingText(en.x + jX(), en.y - 110 + jY(), "LOADED!", spark);

            if (en.type === 'shield' && type === 'cross') { en.type = 'grunt'; if (!en.isBoss) en.color = '#ff0055'; dmg *= 1.5; } // a boss keeps its own colour when its guard breaks

            // v16 PUNISH WINDOW: a boss that just attacked is OPEN — hits land harder,
            // and its anti-mash defenses (armor recoil, Phantom Shift) stand down.
            // Hitting it while it's NOT open is what those defenses exist to punish.
            const bossOpen = en.isBoss && isBossOpen(en);
            if (bossOpen) {
                dmg = Math.round(dmg * CONSTANTS.BOSS_OFFENSE.punishDamageMult);
                addScore(CONSTANTS.SCORE.punishBonus, en.x + jX(), en.y - 170 + jY(), { silent: true });
                if (!en.punishShown) {
                    en.punishShown = true;
                    spawnFloatingText(en.x + jX(), en.y - 150 + jY(), "PUNISH!", "#22d3ee");
                    playSound('punish');
                }
            }

            // v17 NEGATIVE: punch it while it isn't OPEN and it may slip you with an
            // afterimage, or read your Counter and answer it (systems/negative.js).
            if (en.controller === 'negative' && !bossOpen && negativeReact(en, buffActive)) return false;

            let trueReadActive = false;
            if (en.isBoss && (en.exposedTimer || 0) > 0 && (type === 'cross' || type === 'hook' || buffActive)) {
                trueReadActive = true; en.exposedTimer = 0; dmg = Math.floor(dmg * 1.25); st.hitstop += 8; st.instinctPauseTimer = 45; st.statBossBreaks++;
                spawnFloatingText(en.x + jX(), en.y - 140 + jY(), "TRUE READ!", "#00ffff"); triggerShockwave(en.x, en.y - 60, '#00ffff'); playSound('laser');
            }

            // CASH OUT: a Cross lands while pressure is banked (and this isn't already
            // a Counter Hit or True Read — those have their own bonuses). Converts the
            // pin-and-build Jab string into a real payoff instead of just chip damage.
            if (type === 'cross' && !buffActive && !trueReadActive && prevPressure > 0) {
                let cashOutBonus = prevPressure * 15;
                dmg += cashOutBonus;
                en.pressure = 0;
                spawnFloatingText(en.x + jX(), en.y - 110 + jY(), `CASH OUT! +${cashOutBonus}`, "#ff0055");
                st.shake += 4;
            }

            if (en.isBoss) {
                if (en.name === 'PHANTOM BOXER' && !bossOpen) {
                    en.bossMashCount = (en.bossMashCount || 0) + 1; en.mashDecay = 60;
                    if (en.shiftWarning > 0) {
                        if (trueReadActive) { en.shiftWarning = 0; en.shiftCooldown = 150; en.bossMashCount = 0; }
                        else {
                            en.shiftWarning = 0; en.bossMashCount = 0; en.shiftCooldown = 150;
                            let oldX = en.x; let oldY = en.y; createShatter(oldX, oldY - 60, '#ffffff'); playSound('shatter'); spawnFloatingText(oldX + jX(), oldY - 100 + jY(), "PHANTOM SHIFT", "#aa00ff");
                            let otherLanes = [0, 1, 2].filter(l => l !== en.lane);
                            // ARC MUTATION (lanePinchBias, was authored, never read): higher
                            // arcs bias the re-entry lane toward the player's lane (pinching
                            // their space) instead of a flat random pick. Still never lands
                            // directly on the player — it re-enters adjacent, then telegraphs.
                            let pinch = (en.arcMods && en.arcMods.lanePinchBias) || 0;
                            if (random() < pinch) {
                                en.lane = otherLanes.reduce((a, b) => Math.abs(b - st.player.lane) < Math.abs(a - st.player.lane) ? b : a);
                            } else {
                                en.lane = otherLanes[Math.floor(random() * otherLanes.length)];
                            }
                            en.y = st.height * CONSTANTS.LANE_Y[en.lane];
                            // ARC MUTATION (reentryDelayVariant, was authored, never read):
                            // jitter the re-entry timing so its post-shift beat can't be
                            // memorized, around the shipped value of 18.
                            createImpact(en.x, en.y - 60, '#aa00ff');
                            en.attackCooldown = (en.arcMods && en.arcMods.reentryDelayVariant) ? (14 + Math.floor(random() * 11)) : 18;
                            return false;
                        }
                    } else if (en.bossMashCount >= 3 && (en.shiftCooldown || 0) <= 0 && en.hp > 0 && !trueReadActive) {
                        en.shiftWarning = 20; spawnFloatingText(en.x + jX(), en.y - 100 + jY(), "SHIFT READY", "#ffffff");
                    }
                }

                // ARC MUTATION (retaliationTimingVariant, was authored, never read): at
                // Arc 4-5 the Enforcer starts punishing jab-spam a phase early, before
                // its armor even breaks — it's learned the lesson sooner.
                let enforcerArmored = !bossOpen && en.name === 'NEON ENFORCER' && (en.phase === 2 || (en.arcMods && en.arcMods.retaliationTimingVariant));
                if (enforcerArmored) {
                    if (isJab && !trueReadActive && !isGuardPunch) {
                        // ARC MUTATION (armoredRetaliationChain): higher arcs chain the
                        // recoil punish harder, escalating "don't mash jabs into armor"
                        // from a one-time nip into a real deterrent as the run progresses.
                        let chain = (en.arcMods && en.arcMods.armoredRetaliationChain) || 1;
                        dmg = Math.floor(dmg * 0.25); takeDamage(2 * chain, false, en); st.statRecoilTaken++; spawnFloatingText(st.player.x + jX(), st.player.y - 50 + jY(), "RECOIL!", "#ff0000"); return false;
                    }
                }

                // v16: stagger thresholds (66% / 33%) and the KO blow clamp the hit
                // here and queue an authored Finisher (systems/finisher.js). Gated
                // BEFORE the phase checks below so they see the damage that lands.
                dmg = gateBossDamage(en, dmg);

                if (en.hp - dmg <= en.maxHp * 0.25 && !en.desperation) {
                    en.desperation = true; spawnFloatingText(en.x + jX(), en.y - 120 + jY(), "DESPERATION!", "#ff0000"); st.shake += 15;
                    if (en.name === 'PHANTOM BOXER') { en.shiftCooldown = 0; en.shiftWarning = 1; }
                    else if (en.name === 'NEON ENFORCER') { en.attackCooldown = 10; en.currentMove = 'bash'; en.enraged = true; }
                }

                if (en.name === 'NEON ENFORCER' && en.phase === 1 && (en.hp - dmg <= en.maxHp * 0.5)) {
                    en.phase = 2; en.speed = 3.5; st.shake = 50; doFlash(0.8); st.hitstop = 10; triggerShockwave(en.x, en.y - 60, '#ff0000'); spawnFloatingText(en.x + jX(), en.y - 120 + jY(), "SHIELD SHATTERED!", "#ff0000"); for(let j=0; j<20; j++) createImpact(en.x, en.y - 60, '#ffaa00'); playSound('hit');
                }

                if (en.name === 'PHANTOM BOXER' && en.phase === 1 && (en.hp - dmg <= en.maxHp * 0.5)) {
                    en.phase = 2; en.speed = 3.5; st.shake = 40; doFlash(0.6); st.hitstop = 10; triggerShockwave(en.x, en.y - 60, '#aa00ff'); createImpact(en.x, en.y - 80, '#aa00ff'); spawnFloatingText(en.x + jX(), en.y - 120 + jY(), "OVERDRIVE", "#aa00ff"); playSound('hit');
                }
            }

            en.hp -= dmg;

            // APEX (Executioner's Cross): a Cross against a below-threshold, non-boss
            // enemy is a guaranteed finish. Checked after damage so it only fires on
            // an already-weakened target, not as a flat execute-on-hit.
            if (type === 'cross' && st.progressionMods.executionerCross && !en.isBoss && en.hp > 0 && en.hp <= en.maxHp * 0.25) {
                en.hp = 0;
                spawnFloatingText(en.x + jX(), en.y - 100 + jY(), "EXECUTED!", "#ff0055");
                createShatter(en.x, en.y - 60, '#ff0055');
            }

            // v18: inside the Zone knockback is softened so targets stay in reach
            // for the slow-mo flurry instead of being blasted out of it.
            const instinctKB = st.isInstinct ? ((st.zoneTimer || 0) > 0 ? CONSTANTS.ZONE.knockbackMult : 2) : 1;
            let powerFactor = st.stats.powerMult * instinctKB * (buffActive ? 1.5 : 1);
            if (trueReadActive) powerFactor *= 1.5;

            let baseKB = 0;
            if (loaded) { baseKB = CONSTANTS.VERBS.loadedCross.knockback; }
            else if (buffActive || trueReadActive) { baseKB = 45; }
            else {
                if (type === 'jab1' || type === 'jab2') { baseKB = 1; }
                else if (type === 'jab3') { baseKB = 12; }
                else if (type === 'guard_jab') { baseKB = 2; }
                else if (type === 'hook' || type === 'check_hook') { baseKB = Math.max(30, st.progressionMods.hookKnockbackFloor); }
                else if (type === 'cross') { baseKB = 5; }
            }

            if (en.isBoss) {
                baseKB = isJab ? 0 : Math.max(2, Math.floor(baseKB * 0.3));
                if (en.name === 'NEON ENFORCER' && en.phase === 2 && !trueReadActive) { baseKB = (buffActive || (st.isInstinct && type === 'cross')) ? 10 : 0; }
            } else { baseKB = Math.floor(baseKB / (en.weight || 1)); }

            en.vx += baseKB * powerFactor;

            if (type === 'cross' || type === 'hook' || type === 'check_hook' || buffActive || trueReadActive || isJab) {
                let canStun = true; let stunAmount = 0;
                // IDENTITY: Bruisers used to differ from every other grunt only in HP/speed
                // numbers — same read as anything else, just slower. Now jabs still chip
                // their HP (pressure still builds) but can't stagger them; only a Cross,
                // Counter, or True Read does. Forces an actual tool choice, not just a
                // faster/slower version of the same answer.
                if (en.type === 'bruiser' && isJab && !buffActive && !trueReadActive) canStun = false;
                if (isJab) stunAmount = 18;
                else if (type === 'guard_jab') stunAmount = 10;
                else if (type === 'hook') stunAmount = 15;
                else if (type === 'check_hook') stunAmount = 20;
                else if (type === 'cross') stunAmount = 40;

                if (buffActive) stunAmount += 15;
                if (loaded) stunAmount += CONSTANTS.VERBS.loadedCross.stun;
                if (type === 'cross' && (en.type === 'shield' || en.type === 'bruiser' || (en.isBoss && en.name === 'NEON ENFORCER' && en.phase === 2))) {
                    stunAmount += st.progressionMods.crossArmorStunBonus;
                }

                if (st.progressionMods.shatterRead && buffActive && type === 'cross' && en.isBoss) {
                    en.stunResist = Math.max(0, en.stunResist - (100 * st.progressionMods.shatterReadBossBypass));
                    stunAmount += st.progressionMods.shatterReadStaggerBonus;
                    spawnFloatingText(en.x + jX(), en.y - 120 + jY(), "SHATTER READ!", "#ff0055");
                }

                if (en.name === 'NEON ENFORCER' && en.phase === 2) {
                    if (buffActive || trueReadActive || loaded) {
                        canStun = true; stunAmount += 10; st.statBossBreaks++; spawnFloatingText(en.x + jX(), en.y - 100 + jY(), "ARMOR SHATTERED!", "#00ffff");
                    } else if (st.isInstinct && type === 'cross') { canStun = true; stunAmount = 6; spawnFloatingText(en.x + jX(), en.y - 100 + jY(), "PARTIAL BREAK", "#ff00ff");
                    } else { canStun = false; }
                }

                if (canStun) {
                    let isResisting = en.isBoss && en.stunResist > 0;
                    if (!isResisting) {
                        if (trueReadActive) stunAmount += 15; en.stun = Math.max(en.stun, stunAmount); if (en.isBoss) en.stunResist = en.stun + 30;
                    } else { en.stun = Math.max(en.stun, 2); }
                } else if (!canStun && en.stunResist <= 0) { spawnFloatingText(en.x + jX(), en.y - 80 + jY(), "ARMORED", "#ff0000"); }
            }

            if ((type === 'cross' || type === 'hook' || type === 'check_hook') && (en.type === 'shield' || en.type === 'bruiser')) {
                st.instinctMeter = Math.min(100, st.instinctMeter + st.progressionMods.hardTargetInstinctFlat);
                st.exp += st.progressionMods.hardTargetExpFlat;
            }

            hitSomething = true;
            // v17 colour identity: hit sparks wear the build colour.
            const feel = CONSTANTS.punchFeel(type, buffActive);
            if ((buffActive || loaded) && en.tutorialType !== 'counter') { createShatter(en.x, en.y - 60, spark); }
            else if (en.tutorialType !== 'counter') { createImpact(en.x, en.y - 60, spark, feel.spark); }
            if (en.tutorialType !== 'counter') createHitRing(en.x + 10, en.y - 60, buffActive ? '#ffffff' : spark, loaded ? feel.ring * 1.3 : feel.ring);

            if (st.orbCounts.power >= 4 && en.hp <= 0 && (type === 'cross' || buffActive)) { triggerShockwave(en.x, en.y - 60, spark); }
        }
    }

    if (hitSomething) {
        if (!isGuardPunch) { st.combo++; if (st.combo > st.statMaxCombo) st.statMaxCombo = st.combo; }
        addScore(hitScore(type) * (buffActive ? CONSTANTS.SCORE.counterHitMult : 1), st.player.x + reach * 0.6, st.player.y - 110);
        if (buffActive) spawnFloatingText(st.player.x + reach/2 + jX(), st.player.y - 80 + jY(), "COUNTER HIT!", "#ffffff");

        // APEX (Flow State): any clean hit landing extends the streak.
        st.player.flowStreak = (st.player.flowStreak || 0) + 1;
        const flowMult = getFlowMultiplier(st);
        if (st.progressionMods.flowState && (st.player.flowStreak === 10 || st.player.flowStreak === 25)) {
            spawnFloatingText(st.player.x, st.player.y - 90 + jY(), "FLOW STATE!", "#ff8ad8");
        }

        if (!st.isInstinct) {
            let gain = 6 * st.stats.techMult * (1 + st.progressionMods.instinctGainBonusMult) * flowMult;
            gain *= CONSTANTS.affixMod(st.currentAffix, 'instinctGainMult', 1);
            st.instinctMeter = Math.min(100, st.instinctMeter + gain);
        }

        // v20 PUNCH FEEL: per-punch weight from one table; a counter is its own
        // (flat) event rather than the same punch ×1.5.
        const feel = CONSTANTS.punchFeel(type, buffActive);
        const stopMult = st.isInstinct ? 1.5 : 1;
        st.hitstop = Math.floor(feel.stop * stopMult);
        if (loaded) st.hitstop += 6;

        st.shake = feel.shake * stopMult;
        if (type === 'cross' || buffActive) doFlash(buffActive ? 0.6 : 0.2);

        if (type === 'cross' && st.orbCounts.power >= 2) { createImpact(st.player.x + reach, st.player.y - 40, spark); st.shake += 5; }
        if (novaLanes.length) st.enemies.forEach(o => { if (!o.isBoss && novaLanes.includes(o.lane) && !o.tutorialType) { o.hp = 0; createShatter(o.x, o.y - 60, CONSTANTS.FUSION_COLORS.evo_shatter_nova); } });
        if (st.orbCounts.speed >= 4 && (isJab || type === 'hook')) { st.player.moveCancelReady = true; }

        playSound(feel.snd);
    }

    return hitSomething;
}