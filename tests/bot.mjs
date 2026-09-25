// Scripted headless player shared by the test suites. It slips on the white
// flash, punches what's in its lane, walks toward the nearest enemy, answers every
// modal, hits Finisher and ten-count prompts on the beat. Crude — but it drives
// the REAL update loop (main.__test.update), so pacing numbers are real frames.
// Must be imported AFTER the browser stubs + game modules are loaded.

export function makeBot({ st, T, SequenceManager, fin, knock, rules, vig, settings }) {
    const codeFor = move => ({ up: 'ArrowUp', down: 'ArrowDown', jab: 'KeyA', cross: 'KeyS', hook: 'KeyD' }[move]);

    function laneThreat(lane) {
        return st.enemies.some(e => e.lane === lane && e.x > st.player.x - 20 && e.x - st.player.x < 150 && e.attackCooldown <= 26 && e.stun <= 0) || st.laneFlash[lane] > 0 || st.hazards.some(h => h.lane === lane);
    }

    function botKeys(tick, opts) {
        const keys = {};
        const p = st.player;
        if (st.finisher) { const pp = fin.promptProgress(); if (pp && pp.t === (opts.finisherOffset || 0)) keys[codeFor(pp.move)] = true; return keys; }
        if (st.knockdown) {
            const pp = knock.knockdownPrompt();
            if (pp && pp.t === 0 && !(opts.failGetUp)) keys[codeFor(pp.move)] = true;
            return keys;
        }
        if (SequenceManager.active) return keys;
        const dummy = st.enemies.find(e => e.tutorialType);
        if (dummy && dummy.tutorialType === 'guard' && dummy.x - p.x < 160) { keys.KeyW = true; return keys; }
        if (dummy && dummy.tutorialType === 'ghost_step' && p.dangerLevel >= 1 && tick % 2 === 0) { keys.ShiftLeft = true; return keys; }
        // v18: a Bruiser SWEEP can't be slipped — Ghost Step through it
        // Zoners telegraph with their own beam (not the lane flash) — a human reads
        // the green countdown; the bot reads the same timer. (It used to be blind to them.)
        const zap = st.enemies.find(e => e.type === 'zoner' && e.lane === p.lane && e.x > p.x - 20 && Math.abs(e.x - p.x) < 500 && e.attackCooldown > 0 && e.attackCooldown <= 12 && e.stun <= 0);
        if (zap && p.slipCooldown <= 0) {
            const safe = [p.lane - 1, p.lane + 1].filter(l => l >= 0 && l <= 2 && !st.enemies.some(e => e.type === 'zoner' && e.lane === l && e.attackCooldown <= 14));
            if (safe.length && tick % 2 === 0) { keys[safe[0] < p.lane ? 'ArrowUp' : 'ArrowDown'] = true; return keys; }
        }
        const sweep = st.enemies.find(e => e.currentMove === 'sweep' && e.type === 'bruiser' && Math.abs(p.lane - e.lane) <= 1 && Math.abs(e.x - p.x) < 130 && e.attackCooldown > 0 && e.attackCooldown <= 8);
        if (sweep) { if (tick % 2 === 0) keys.ShiftLeft = true; return keys; }
        if (p.dangerLevel >= 2 || (st.laneFlash[p.lane] > 0 && !st.enemies.some(e => e.lane === p.lane && e.x - p.x < 120 && e.isBoss && rules.isBossOpen(e)))) {
            if (p.slipCooldown <= 0 && tick % 2 === 0) {
                const opts2 = [p.lane - 1, p.lane + 1].filter(l => l >= 0 && l <= 2).sort((a, b) => laneThreat(a) - laneThreat(b));
                if (opts2.length) keys[opts2[0] < p.lane ? 'ArrowUp' : 'ArrowDown'] = true;
            }
            return keys;
        }
        const inLane = st.enemies.filter(e => e.lane === p.lane && e.x > p.x - 20 && e.x - p.x < 125).sort((a, b) => a.x - b.x)[0];
        if (inLane) {
            if (tick % 3 === 0) {
                if (inLane.type === 'shield' || inLane.tutorialType === 'shield') keys.KeyS = true;
                else keys[(tick / 3) % 4 === 3 ? 'KeyS' : 'KeyA'] = true;
            }
            return keys;
        }
        const target = st.enemies.filter(e => e.x > p.x - 20).sort((a, b) => a.x - b.x)[0];
        if (target && target.lane !== p.lane && p.slipCooldown <= 0 && tick % 6 === 0 && !laneThreat(target.lane < p.lane ? p.lane - 1 : p.lane + 1)) {
            keys[target.lane < p.lane ? 'ArrowUp' : 'ArrowDown'] = true;
        }
        return keys;
    }

    function run(opts = {}) {
        localStorage.clear(); settings.reloadSettings();
        T.startGame({ tutorial: !!opts.tutorial, seed: opts.seed || 1234 });
        const log = { firstDraftFrame: null, stageFrames: {}, stageStart: 0, finishers: [], wagersSeen: 0, reachedArc2: false, frames: 0, bossFightFrames: null, bossStart: null, sweepSeen: false, walkoutSeen: false, billingSeen: 0, knockdowns: [], ended: false, endStage: null, posterSeen: false };
        let stage = st.currentStage, wasDown = false;
        for (let tick = 0; tick < (opts.maxFrames || 60 * 60 * 12); tick++) {
            log.frames = tick;
            if (opts.god) st.health = 100;
            if (st.screen === 'tutorial') window.dismissTutorial();
            if (T.posterWaiting()) T.confirmPoster();
            else if (st.screen === 'upgrading') {
                if (log.firstDraftFrame === null) log.firstDraftFrame = tick;
                window.engineApplyUpgradeState(st.currentDraftOptions[0].id);
            }
            else if (st.screen === 'wager') { log.wagersSeen++; T.resolveWager(!!opts.acceptWagers); }
            else if (st.screen === 'gameover') { log.ended = true; log.endStage = st.currentStage; break; }
            if (st.finisher && !log.finishers.includes(st.finisher)) log.finishers.push(st.finisher);
            if (st.knockdown && !wasDown) log.knockdowns.push(st.currentStage);
            wasDown = !!st.knockdown;
            if (st.bossIntroTimer > 0 && st.bossPoster) log.posterSeen = true;
            if (SequenceManager.active) {
                const step = SequenceManager.currentSequence[SequenceManager.stepIndex];
                if (step && step.type === 'sweep') log.sweepSeen = true;
                if (step && step.type === 'walkout') log.walkoutSeen = true;
                if (step && step.type === 'billing' && SequenceManager.timer === step.duration - 1) log.billingSeen++;
            }
            if (st.bossActive && log.bossStart === null) log.bossStart = tick;
            if (!st.bossActive && log.bossStart !== null && log.bossFightFrames === null && st.statBossKills > 0) log.bossFightFrames = tick - log.bossStart;

            st.lastKeys = { ...st.keys };
            st.keys = st.screen === 'playing' ? botKeys(tick, opts) : {};
            if (st.screen === 'vignette') { vig.updateVignette(); if (st.vignette && st.vignette.holding) vig.skipVignette(); }
            T.update();
            if (st.currentStage !== stage) { log.stageFrames[stage] = tick - log.stageStart; log.stageStart = tick; stage = st.currentStage; }
            if (opts.stopAtArc && st.currentStage >= opts.stopAtArc && !SequenceManager.active) { log.reachedArc2 = true; break; }
        }
        log.score = st.score; log.stage = st.currentStage; log.slips = st.statTotalSlips;
        return log;
    }

    return { run, botKeys };
}
