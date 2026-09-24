import { gameState as st } from '../state.js';
import { $ } from '../engine_core.js';
import { comboMultiplier } from '../systems/score.js';

export const HUD = { 
    get combo() { return $('combo-ui'); },
    get expBar() { return $('exp-bar'); },
    get expMult() { return $('exp-multiplier'); },
    get instinctBar() { return $('instinct-bar'); },
    get instinctBanner() { return $('instinct-ready-banner'); },
    get barCont() { return $('bar-cont'); },
    get health() { return $('health-ui'); },
    get flash() { return $('screen-flash'); },
    get screens() { 
        return {
            upgrade: $('upgrade-screen'),
            pause: $('pause-screen'),
            gameover: $('gameover-screen'),
            start: $('start-screen'),
            howto: $('howto-screen'),
            tutorial: $('tutorial-screen')
        };
    },
    get finalStage() { return $('final-stage-ui'); },
    get slipPopup() { return $('perfect-slip-ui'); },
    get stage() { return $('stage-ui'); },
    get affix() { return $('affix-ui'); },
    get counterHud() { return $('counter-hud'); },
    get counterStatus() { return $('counter-status'); }
};

export function updateHUD() {
    // v16 LIVE SCORE: the number rolls toward the real score so gains read as motion.
    const target = Math.round(st.score || 0);
    if (st.displayScore !== target) {
        const diff = target - st.displayScore;
        st.displayScore = Math.abs(diff) < 4 ? target : st.displayScore + Math.ceil(diff * 0.2);
    }
    if (st.lastHUD.score !== st.displayScore) {
        const el = $('score-ui'); if (el) el.innerText = st.displayScore.toLocaleString();
        st.lastHUD.score = st.displayScore;
    }
    const cm = comboMultiplier(st.combo);
    const key = `${cm}|${st.wagerMult}`;
    if (st.lastHUD.wager !== key) {
        const m = $('score-mult');
        if (m) { m.innerText = `×${cm.toFixed(2)} COMBO`; m.classList.toggle('hot', cm > 1); }
        const w = $('wager-badge');
        if (w) { w.innerText = st.wagerMult > 1 ? `×${st.wagerMult} WAGER` : ''; w.style.display = st.wagerMult > 1 ? 'inline-block' : 'none'; }
        st.lastHUD.wager = key;
    }

    if (st.lastHUD.combo !== st.combo) { 
        HUD.combo.innerText = st.combo; st.lastHUD.combo = st.combo; 
    }
    
    let expPct = Math.min(100, (st.exp / st.expNeeded) * 100);
    if (st.lastHUD.exp !== expPct) {
        if (HUD.expBar) HUD.expBar.style.width = expPct + '%'; 
        st.lastHUD.exp = expPct;
    }

    let mult = 1.0 + Math.min(0.3, Math.floor(st.combo / 2) * 0.1);
    if (st.lastHUD.mult !== mult) {
        if (HUD.expMult) {
            if (mult > 1.0) {
                HUD.expMult.innerText = `x${mult.toFixed(1)}`;
                HUD.expMult.classList.remove('opacity-0');
                HUD.expMult.classList.add('opacity-100');
            } else {
                HUD.expMult.classList.remove('opacity-100');
                HUD.expMult.classList.add('opacity-0');
            }
        }
        st.lastHUD.mult = mult;
    }

    let roundInstinct = Math.floor(st.instinctMeter);
    if (st.lastHUD.instinct !== roundInstinct) { 
        HUD.instinctBar.style.width = roundInstinct + '%'; st.lastHUD.instinct = roundInstinct; 
    }
    let displayHP = Math.max(0, st.health);
    if (st.lastHUD.hp !== displayHP) { 
        HUD.health.innerText = `HP: ${displayHP}`; st.lastHUD.hp = displayHP; 
    }
    if (st.player && st.lastHUD.slipBuff !== st.player.slipBuff) { 
        HUD.counterStatus.innerText = st.player.slipBuff > 0 ? 'READY' : 'INACTIVE'; 
        st.lastHUD.slipBuff = st.player.slipBuff; 
    }
}