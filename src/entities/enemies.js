import { gameState as st, getFlowMultiplier } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { playSound } from '../vfx_audio/audio.js';
// FIXED: Removed the toxic circular dependency on main.js!
import { spawnFloatingText, createImpact, showToast } from '../vfx_audio/effects.js';
import { triggerTutorial } from '../systems/tutorial.js';
import { takeDamage, registerPerfectGhostStep } from './player.js';
import { addScore, killScore } from '../systems/score.js';
import { setMusicIntensity } from '../vfx_audio/audio.js';
import { keyName } from '../systems/settings.js';
import { createKoShatter } from '../vfx_audio/effects.js';

// v17 PUNCH STRINGS: after each hit of a string resolves (landed, slipped,
// guarded or ghosted), the next hit re-targets the Striker's lane and winds up
// with a FULL telegraph (gap > the red-flash lead from getSlipThresholds). The
// last hit hands back to the normal recovery cycle.
// v17 ROPES: knockback can't carry an enemy through its ropes — it gets PINNED
// there (can't retreat or advance), primed for a rope-bounce counter.
export function applyKnockback(en) {
    const preX = en.x;
    en.x += en.vx; en.vx *= 0.85;
    const ROPE = CONSTANTS.ROPES.enemyRopeX;
    if (en.controller !== 'static_monk' && preX <= ROPE && en.x > ROPE) {
        en.x = ROPE; en.vx = 0;
        if ((en.onRopes || 0) <= 0) {
            playSound('rope_thud'); createImpact(ROPE + 30, en.y - 70, '#ffffff');
            spawnFloatingText(en.x + 20, en.y - 150, 'ON THE ROPES', '#ffffff');
        }
        en.onRopes = CONSTANTS.ROPES.pinFrames;
    }
}

function endAttack(en) {
    if ((en.stringLen || 1) > 1 && (en.stringIdx || 0) < en.stringLen - 1) {
        en.stringIdx = (en.stringIdx || 0) + 1;
        en.attackCooldown = CONSTANTS.PUNCH_STRINGS.gap;
        if (en.lane !== st.player.lane && Math.abs(en.lane - st.player.lane) === 1) en.lane = st.player.lane; // steps after you
        return;
    }
    en.stringIdx = 0;
    if (en.type === 'bruiser') en.currentMove = 'bash';
    en.attackCooldown = en.maxCooldown;
}

// MENACE (target-priority: consequence of ignoring). A lingering Bruiser/Zoner gets
// worse the longer it lives, so you're pushed to prioritise it — the cost is on
// ignoring it, not a reward for killing it. Time-based (no RNG), telegraphed by a
// brightening colour + a floating callout on each escalation. Cooldown floors keep the
// slip-tell frame (Bruiser 22 / Zoner 40) always reachable, so the read never breaks.
export function applyMenace(en) {
    const M = CONSTANTS.MENACE;
    if (!M) return;
    en.menace = (en.menace || 0) + 1;
    const lvl = Math.min(M.maxLevel, Math.floor(en.menace / M.framesPerLevel));
    if (lvl <= (en.menaceLevel || 0)) return;
    en.menaceLevel = lvl;
    const cfg = en.type === 'bruiser' ? M.bruiser : M.zoner;
    en.maxCooldown = Math.max(cfg.minCooldown, en.maxCooldown - cfg.cooldownCutPerLevel);
    if (cfg.speedBonusPerLevel) en.speed = (en.baseSpeed || en.speed) * (1 + cfg.speedBonusPerLevel * lvl);
    en.color = cfg.colors[Math.min(lvl, cfg.colors.length - 1)] || en.color;
    spawnFloatingText(en.x, en.y - 100, en.type === 'bruiser' ? 'HARDENING' : 'CHARGING FASTER', en.type === 'bruiser' ? '#ff3030' : '#66ff33');
}

export function updateEnemies() {
    st.enemies.sort((a, b) => a.x - b.x); 
    
    let blockedX = [-1000, -1000, -1000];
    let frontEnemy = [null, null, null];
    st.laneFlash[0] = st.laneFlash[1] = st.laneFlash[2] = 0;
    st.player.dangerLevel = 0;

    st.enemies.forEach(en => {
        if (en.x >= st.player.x - 60) {
            if (!frontEnemy[en.lane] || en.x < frontEnemy[en.lane].x) {
                frontEnemy[en.lane] = en;
            }
        }
        
        if (en.mashDecay > 0) { en.mashDecay--; if (en.mashDecay <= 0) en.bossMashCount = 0; }
        if (en.stunDecay > 0) { en.stunDecay--; if (en.stunDecay <= 0) en.hitstunScaling = 0; }
        // PRESSURE/CASH-OUT: pin an enemy with Jabs, then Cross to cash the built-up
        // pressure into bonus damage. Decays if you don't follow up in time.
        if (en.pressureDecay > 0) { en.pressureDecay--; if (en.pressureDecay <= 0) en.pressure = 0; }
        // MENACE: lingering Bruisers/Zoners harden once on-screen (not tutorial dummies).
        if ((en.type === 'bruiser' || en.type === 'zoner') && !en.isBoss && !en.tutorialType && en.x < st.width && st.tutorialGrace <= 0) {
            applyMenace(en);
        }
        if (en.isBoss) {
            if (en.shiftWarning > 0) en.shiftWarning--;
            if (en.shiftCooldown > 0) en.shiftCooldown--;
            if (en.exposedTimer > 0) en.exposedTimer--;
        }
    });

    st.enemies.forEach(en => { en.isActiveThreat = ((frontEnemy[en.lane] === en || en.isBoss || en.tutorialType || en.type === 'zoner') && en.x > st.player.x - 30); });
    
    for (let i = 0; i < st.enemies.length; i++) {
        const en = st.enemies[i];

        if (en.tutorialType && !st.seenTutorials[en.tutorialType] && en.x < st.player.x + 250) {
            if (en.tutorialType === 'slip') {
                let slipText = 'When a lane flashes <span class="text-pink-500 font-bold">RED</span>, an attack is winding up.<br><br>Wait for it to flash <span class="text-white font-bold">WHITE</span>, then press <span class="text-cyan-400 font-bold">[UP]</span> or <span class="text-cyan-400 font-bold">[DOWN]</span> to Perfect Slip!<br><br>Slipping too early only counts as a <span class="text-gray-300 font-bold">Good Slip</span> &mdash; it resets the attack, but only a <span class="text-white font-bold">Perfect Slip</span> clears this one.<br><br>' + (st.runCount <= 1 ? '<i>Land a Perfect Slip to pass!</i>' : '<i>Slip the attack to survive!</i>');
                triggerTutorial('slip', 'ENEMY ATTACK', slipText);
            } else if (en.tutorialType === 'counter') {
                let counterText = 'Your Perfect Slip was successful!<br><br>Notice the <span class="text-white font-bold">White Energy Rings</span> around your fists.<br><br>You are now holding a <span class="text-white font-bold">Counter Charge</span>. Your next strike will deal massive damage, shatter their posture, and cause extra hitstop.<br><br>' + (st.runCount <= 1 ? '<i>Strike this dummy enemy to unleash it!</i>' : '<i>Strike an enemy to unleash it!</i>');
                triggerTutorial('counter', 'COUNTER READY', counterText);
            } else if (en.tutorialType === 'shield') { triggerTutorial('shield', 'GOLD ARMOR', `Enemies with Gold Armor will block your Jabs.<br><br>Use your <span class="text-cyan-400 font-bold">CROSS [${keyName('cross')}]</span> to shatter their defense!<br><br><i>Break the armor to pass!</i>`); } 
            else if (en.tutorialType === 'guard') { triggerTutorial('guard', 'GUARDING', `Guard is the stable answer when timing gets crowded, even if a clean slip is possible.<br><br>Hold <span class="text-cyan-400 font-bold">[${keyName('guard')}]</span> to Guard &mdash; it cuts incoming damage by 75% against <i>most</i> attackers.<br><br>Not all, though. A few enemies bite through Guard far more than that. You will get a specific heads-up the first time one shows up &mdash; watch for it.<br><br><i>Guard the next attack to pass!</i>`); }
            else if (en.tutorialType === 'ghost_step') { triggerTutorial('ghost_step', 'GHOST STEP', `This one is too fast to jab, guard, or slip cleanly.<br><br>Press <span class="text-cyan-400 font-bold">[${keyName('ghost')}]</span> for a Ghost Step &mdash; a short evasive dash with a moment of invincibility.<br><br><i>Ghost Step the next attack to pass!</i>`); }
            return; 
        }

        // FIRST-CONTACT IDENTITY: Bruiser and Assassin both got a real mechanical
        // trait (armor / guard-piercing) that isn't covered by any Stage 1 dummy.
        // One-time heads-up the first time each is actually a threat, on the real
        // wave enemy rather than a scripted stand-in. Excludes bosses (Phantom
        // Boxer is assassin-typed) — that's a separate, later lesson.
        if (!en.tutorialType && en.isActiveThreat && en.x - st.player.x < 400) {
            if (en.type === 'bruiser' && !en.isBoss && !st.seenTutorials.bruiser_id) { // (Live Wire is bruiser-typed — bosses get their poster, not this)
                triggerTutorial('bruiser_id', 'ARMORED BRUISER', `This one shrugs off Jabs entirely.<br><br>Jabs still chip its health, but only a <span class="text-cyan-400 font-bold">CROSS [${keyName('cross')}]</span> &mdash; or a Counter Hit &mdash; actually staggers it.`);
                return;
            }
            if ((en.stringLen || 1) > 1 && !en.isBoss && !st.seenTutorials.string_id) {
                triggerTutorial('string_id', 'PUNCH STRING', `This one throws <span class="text-white font-bold">${en.stringLen} punches</span> in a row &mdash; the pips above its head count them.<br><br>Each punch follows you into your new lane and gets its own red &rarr; white tell.<br><br><span class="text-cyan-400 font-bold">Slip every one.</span> Answering only the first is how a string catches you.`);
                return;
            }
            if (en.type === 'assassin' && !en.isBoss && !st.seenTutorials.assassin_id) {
                triggerTutorial('assassin_id', 'ASSASSIN', 'This is the exception the Guard tutorial warned you about.<br><br>Guard normally blocks 75% of incoming damage. Against an Assassin, only about 40% gets blocked &mdash; the rest bites through.<br><br>You have to actually read it and <span class="text-cyan-400 font-bold">SLIP [UP/DOWN]</span>, not just Guard.');
                return;
            }
        }

        if (en.stun > 0 || st.bossIntroTimer > 0) { if (en.vx > 0.1) applyKnockback(en); continue; }


        if (en.type === 'zoner') {
            if (st.tutorialGrace <= 0 && en.x > st.player.x - 20) {
                if (en.name === 'STATIC MONK') continue; 
                if (Math.abs(en.x - st.player.x) < 500) { 
                    if (en.attackCooldown === 40 && en.isActiveThreat) playSound('zoner_tell'); 
                    en.attackCooldown--;
                    if (en.attackCooldown <= 0) {
                        en.justAttacked = 5; createImpact(st.player.x + 50, en.y - 60, '#00ff00'); 
                        if(en.isActiveThreat) playSound('laser'); 
                        
                        if (en.lane === st.player.lane) {
                            if (st.player.state === 'ghost_step') {
                                spawnFloatingText(st.player.x, st.player.y - 50, "EVADED", "#888888");
                                registerPerfectGhostStep();
                                if (st.progressionMods.ghostCounter && st.player.slipBuff === 0) { st.player.slipBuff = 1; playSound('perfect_slip'); spawnFloatingText(st.player.x, st.player.y - 80, "GHOST COUNTER!", "#ffffff"); }
                            } else {
                                let zDmg = 25; if (st.isInstinct) zDmg = Math.floor(zDmg * 0.5); takeDamage(zDmg, true, en);
                            }
                        }
                        en.attackCooldown = en.maxCooldown;
                    }
                }
            }
            continue; 
        }
        
        if (en.isActiveThreat && en.name !== 'STATIC MONK') {
            const { perfect: perfectThresh, good: goodThresh } = CONSTANTS.getSlipThresholds(en.type, st.progressionMods.perfectSlipWindowBonus, CONSTANTS.isCornered(st.player));
            // Red telegraph now starts relative to each archetype's own good-window
            // width (a fixed early-warning buffer past it), not a flat "22" that
            // ignored Bruiser's wider window or Assassin's narrower one. Grunt/Shield
            // land on exactly the same numbers as before (goodThresh=16 -> 22),
            // so nothing regresses there.
            if (Math.abs(en.x - st.player.x) < 130) {
                if (en.attackCooldown <= perfectThresh) st.laneFlash[en.lane] = 2; else if (en.attackCooldown <= goodThresh + 6) st.laneFlash[en.lane] = Math.max(st.laneFlash[en.lane], 1);
            }
            // v16 BOSS TELEGRAPH: a boss's lane goes red for its WHOLE telegraph
            // (BOSS_OFFENSE.telegraphLead), not just the last few frames — the
            // "incoming" read starts the moment the windup starts.
            if (en.isBoss && en.telegraphed && !(en.recoverTimer > 0) && Math.abs(en.x - st.player.x) < 140 && en.attackCooldown > perfectThresh) {
                st.laneFlash[en.lane] = Math.max(st.laneFlash[en.lane], 1);
            }
            if (en.lane === st.player.lane && Math.abs(en.x - st.player.x) < 130 && en.attackCooldown > 0) {
                if (en.attackCooldown <= perfectThresh) st.player.dangerLevel = Math.max(st.player.dangerLevel, 2); else if (en.attackCooldown <= goodThresh) st.player.dangerLevel = Math.max(st.player.dangerLevel, 1);
            }
        }
    }

    for (let i = 0; i < st.enemies.length; i++) {
        const en = st.enemies[i];
        if (en.trails) {
            en.trails.forEach(t => t.opacity -= 0.05); en.trails = en.trails.filter(t => t.opacity > 0);
            if (en.isBoss && en.name === 'PHANTOM BOXER' && (en.currentMove === 'feint' || en.phase === 2) && st.bossIntroTimer <= 0) {
                en.trailTimer--;
                if (en.trailTimer <= 0 || en.trailTimer === undefined) { en.trails.push({ x: en.x, y: en.y, lane: en.lane, opacity: 0.5 }); en.trailTimer = en.phase === 2 ? 3 : 5; if (en.trails.length > 5) en.trails.shift(); }
            }
        }

        if (st.bossIntroTimer > 0 && en.isBoss) continue;
        if (en.justAttacked > 0) en.justAttacked--;
        if (en.stunResist > 0) en.stunResist--; 
        if (en.stun > 0) { en.stun--; } 
        else {
            let isBlockedByEnemy = false;
            if (!en.isBoss) { if (en.x < blockedX[en.lane] + 90) isBlockedByEnemy = true; blockedX[en.lane] = Math.max(blockedX[en.lane], en.x); }
            
            let isAtPlayer = (en.lane === st.player.lane && en.x <= st.player.x + 90 && en.x >= st.player.x - 20);

            if (en.vx > 0.1) {
                applyKnockback(en);
                let isBowling = (st.orbCounts.power >= 4 && en.vx > 5);
                st.enemies.forEach(other => {
                    if (other !== en && other.lane === en.lane && other.x > en.x - 20 && other.x < en.x + 120) {
                        if (isBowling) { other.x += en.vx * 0.8; other.hp -= 25; if (other.stun <= 0) other.stun = 15; createImpact(other.x, other.y - 50, '#ff0055'); } 
                        else { if (en.vx > 3) { other.x += en.vx * 0.5; if (other.stun <= 0) other.stun = 5; } }
                    }
                });
            } else {
                en.vx = 0;
                if (en.isBoss && en.x < st.player.x + 100 && en.name !== 'STATIC MONK') { en.x = st.player.x + 100; } 
                else if ((en.onRopes || 0) > 0) { en.onRopes--; /* pinned on its ropes */ }
                else if (!isBlockedByEnemy && !isAtPlayer && st.tutorialGrace <= 0 && en.name !== 'STATIC MONK') { en.x -= en.speed; }
            }
            
            en.y += ((st.height * CONSTANTS.LANE_Y[en.lane]) - en.y) * 0.3;

            // FIX: bosses are driven exclusively by bosses.js. Running them here too
            // decremented attackCooldown twice per frame (bosses attacked at 2x speed).
            if (en.isBoss) continue;

            if (Math.abs(en.x - st.player.x) < 130 && !isBlockedByEnemy && st.tutorialGrace <= 0) { 

                if (en.attackCooldown === 22 && en.isActiveThreat) {
                    if (en.type === 'bruiser') playSound('bash_tell'); else playSound('jab_tell');
                }
                en.attackCooldown--;

                if (en.attackCooldown <= 0) {
                    en.justAttacked = 5; 

                    // GHOST STEP EVASION (fixed): this used to be checked *before*
                    // the decrement above, so it could only ever see a stale,
                    // still-positive cooldown value and never actually caught the
                    // frame an attack resolves. Zoner's own evasion check (a
                    // separate code path) was structured correctly and worked fine
                    // — this one, covering every melee-type enemy, was effectively
                    // dead. Checking post-decrement, at the point the hit actually
                    // lands, is what makes Ghost Step's "emergency evade" real.
                    if (st.player.state === 'ghost_step' && st.player.ghostStepTimer > 4 && isAtPlayer && en.isActiveThreat) {
                        spawnFloatingText(st.player.x, st.player.y - 50, "GHOST STEP", "#888888");
                        if (!en.tutorialType) registerPerfectGhostStep();
                        if (st.progressionMods.ghostCounter && st.player.slipBuff === 0) { st.player.slipBuff = 1; playSound('perfect_slip'); spawnFloatingText(st.player.x, st.player.y - 80, "GHOST COUNTER!", "#ffffff"); }
                        if (en.tutorialType === 'ghost_step') { en.hp = 0; }
                        endAttack(en);
                        continue;
                    }

                    if (en.tutorialType) {
                        if (en.tutorialType === 'slip') {
                            if (en.hp > 0) {
                                // MERCY PASS: only fires if the player fully whiffs (does
                                // nothing) a full attack cycle in a row — a "Good Slip"
                                // attempt never reaches this branch at all (that's handled
                                // entirely in player.js's checkPerfectSlip and never
                                // increments this counter). Raised from 4 to 8 cycles and
                                // recolored/reworded: at 4, an ordinary player still finding
                                // the rhythm could trip this within their first real
                                // attempts, and its old cyan color read as a success rather
                                // than a fallback — which is exactly what "the tutorial let
                                // a non-perfect slip pass" looks like from the outside, even
                                // though no Good Slip was ever actually accepted.
                                st.tutorialSlipFails = (st.tutorialSlipFails || 0) + 1;
                                if (st.tutorialSlipFails >= 8) {
                                    en.hp = 0;
                                    spawnFloatingText(st.player.x, st.player.y - 50, "SKIPPING AHEAD — PRACTICE THE PERFECT SLIP TIMING", "#ffaa00");
                                    continue;
                                }
                                spawnFloatingText(st.player.x, st.player.y - 50, "WAIT FOR WHITE FLASH TO SLIP!", "#ffaa00"); en.x = st.player.x + 200; en.attackCooldown = en.maxCooldown; st.player.lane = 1; st.player.y = st.height * CONSTANTS.LANE_Y[st.player.lane]; st.player.x = 180; continue;
                            }
                        }
                        if (en.tutorialType === 'shield') { spawnFloatingText(st.player.x, st.player.y - 50, `USE CROSS [${keyName('cross')}] TO BREAK!`, "#ffaa00"); en.x = st.player.x + 200; en.attackCooldown = en.maxCooldown; continue; }
                        if (en.tutorialType === 'guard') { if (st.player.state === 'guarding') { spawnFloatingText(st.player.x, st.player.y - 50, "GUARD SUCCESS!", "#00ffff"); en.hp = 0; playSound('hit'); } else { spawnFloatingText(st.player.x, st.player.y - 50, `HOLD [${keyName('guard')}] TO GUARD!`, "#ffaa00"); en.x = st.player.x + 200; en.attackCooldown = en.maxCooldown; st.player.lane = 1; st.player.y = st.height * CONSTANTS.LANE_Y[st.player.lane]; st.player.x = 180; } continue; }
                    }

                    if (en.lane === st.player.lane && Math.abs(en.x - st.player.x) < 100 && en.tutorialType !== 'counter' && en.tutorialType !== 'ghost_step' && en.x > st.player.x - 30) { 
                        let isHeavy = en.type === 'bruiser'; let rawDmg = isHeavy ? 30 : 12;
                        // AFFIX (HEAVY HANDS): a Bruiser's connect lands harder this stage.
                        if (isHeavy) rawDmg = Math.round(rawDmg * CONSTANTS.affixMod(st.currentAffix, 'bruiserDamageMult', 1));
                        if (st.isInstinct) rawDmg = Math.floor(rawDmg * 0.5);
                        takeDamage(rawDmg, isHeavy, en);
                    } else if (en.tutorialType === 'counter' && Math.abs(en.x - st.player.x) < 100) {
                        spawnFloatingText(st.player.x, st.player.y - 50, "STRIKE BEFORE IT HITS YOU!", "#ffaa00"); en.x = st.player.x + 200; en.attackCooldown = en.maxCooldown; st.player.slipBuff = 1; continue;
                    } else if (en.tutorialType === 'ghost_step' && Math.abs(en.x - st.player.x) < 100) {
                        // Every other dummy is harmless on a whiff and just redirects
                        // with a hint — this one used to be the odd one out and would
                        // deal real chip damage to a brand-new player. Matched now.
                        spawnFloatingText(st.player.x, st.player.y - 50, `PRESS [${keyName('ghost')}] TO GHOST STEP!`, "#ffaa00"); en.x = st.player.x + 200; en.attackCooldown = en.maxCooldown; continue;
                    }
                    
                    // NOTE: bosses no longer reach this branch at all (see the
                    // `if (en.isBoss) continue;` above) — their move selection lives
                    // exclusively in bosses.js now. This used to duplicate that logic
                    // here too, ticking every boss's attackCooldown twice per frame.
                    endAttack(en);
                }
            }
        }
    }

    if (st.purifyTimer > 0) st.purifyTimer--;

    for (let i = st.enemies.length - 1; i >= 0; i--) {
        const en = st.enemies[i];
        // v16: a boss can't simply drop — the killing blow opens its KO Finisher
        // (systems/finisher.js), which sets koDone when it's played out.
        if (en.hp <= 0 && en.isBoss && !en.koDone) {
            en.hp = 1;
            if (!en.pendingFinisher && !st.finisher) en.pendingFinisher = 'ko';
            continue;
        }
        if (en.hp <= 0) {
            st.statTotalKills++;
            let comboMult = 1.0 + Math.min(0.3, Math.floor(st.combo / 2) * 0.1); 
            const flowMult = getFlowMultiplier(st); // APEX (Flow State): kills pay out the streak too

            if (en.isBoss) {
                st.bossActive = false; st.stageClearing = true; st.bossDefeatedThisStage = true; st.statBossKills++; st.purifyTimer = 100; st.health = st.maxHealth;
                st.instinctMeter = Math.min(100, st.instinctMeter + (50 * (1 + st.progressionMods.instinctGainBonusMult) * flowMult)); 
                playSound('perfect_slip'); st.exp += Math.floor(15 * comboMult * (1 + st.progressionMods.expGainBonusMult) * flowMult);
                addScore(CONSTANTS.SCORE.bossKo * Math.min(5, CONSTANTS.getArcIndex(st.currentStage)), en.x + en.w / 2, en.y - 200, { big: true });
                setMusicIntensity(0);
            } else {
                let instGain = 0; let hpGain = 0; let baseExp = 1;
                if (en.type === 'grunt') { instGain = 2; baseExp = 1; }
                else if (en.type === 'shield') { instGain = 5; baseExp = 2; }
                else if (en.type === 'assassin') { instGain = 5; baseExp = 2; }
                else if (en.type === 'zoner') { instGain = 8; baseExp = 3; }
                else if (en.type === 'bruiser') { instGain = 10; hpGain = 5; showToast("+ VITALITY", "#00ff00"); baseExp = 4; }
                
                st.instinctMeter = Math.min(100, st.instinctMeter + (instGain * (1 + st.progressionMods.instinctGainBonusMult) * flowMult)); 
                if (hpGain > 0) st.health = Math.min(st.maxHealth, st.health + hpGain);
                st.exp += Math.floor(baseExp * comboMult * (1 + st.progressionMods.expGainBonusMult) * flowMult);
                if (!en.tutorialType) addScore(killScore(en.type), en.x + en.w / 2, en.y - 130);
            }
            if (en.tutorialType) st.tutorialDelay = 60; 
            // v17 KO SHATTER: the body breaks into neon shards that stream into an orb.
            createKoShatter(en);
            st.enemies.splice(i, 1);

        } else if (en.x < -100) { st.enemies.splice(i, 1); }
    }
}