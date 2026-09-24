// ==========================================
// v16 OVERLAYS — everything drawn on top of the arena that is new this pass:
// score pops, the boss HP bar (with its 66% / 33% stagger notches), boss windup
// meters + OPEN tags, the Finisher (letterbox, beat-ring prompts, judgements) and
// the upgrade equip vignette. Pure canvas; reads state, never mutates gameplay.
// ==========================================
import { gameState as st } from '../state.js';
import { CONSTANTS } from '../constants.js';
import { drawBoxer } from './boxer.js';
import { isBossOpen } from '../systems/boss_rules.js';
import { promptProgress } from '../systems/finisher.js';
import { reducedMotion } from '../systems/settings.js';

const MOVE_STYLE = {
    bash:  { label: 'BASH',  color: '#ffaa00' },
    jab:   { label: 'JAB',   color: '#ffffff' },
    feint: { label: 'FEINT', color: '#c084fc' },
    laser: { label: 'LASER', color: '#39ff14' }
};

// ---------- score pops (world space) ----------
export function drawScorePops(ctx) {
    if (!st.scorePops || !st.scorePops.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    st.scorePops.forEach(p => {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
        ctx.font = p.big ? '900 italic 26px Orbitron' : 'bold 13px Orbitron';
        ctx.fillStyle = p.big ? '#facc15' : '#fde68a';
        ctx.shadowColor = '#facc15'; ctx.shadowBlur = p.big ? 12 : 4;
        ctx.fillText(p.text, p.x, p.y);
    });
    ctx.restore();
}

// ---------- boss windup meter + OPEN tag (world space, per boss) ----------
export function drawBossTells(ctx, en) {
    if (!en.isBoss || st.bossIntroTimer > 0) return;
    // Anchored at chest height on the side facing the player — readable in every
    // lane (above the head clipped off-screen in the top lane and fought the HP bar).
    const cx = en.x - 34, top = en.y - en.h * 0.95;
    ctx.save();
    if (isBossOpen(en)) {
        const max = en.recoverMax || 1;
        const left = en.controller === 'static_monk' && en.currentMove === 'recharge' ? Math.max(0, en.attackCooldown) / Math.max(1, Math.floor(180 / ((en.arcMods && en.arcMods.teleportRateMult) || 1))) : (en.recoverTimer || 0) / max;
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.02);
        ctx.strokeStyle = `rgba(34, 211, 238, ${pulse})`; ctx.lineWidth = 3;
        // brackets around the body
        const bx = en.x - 22, by = en.y - en.h * 1.5 - 10, bw = en.w + 44, bh = en.h * 1.5 + 16, k = 14;
        ctx.beginPath();
        ctx.moveTo(bx, by + k); ctx.lineTo(bx, by); ctx.lineTo(bx + k, by);
        ctx.moveTo(bx + bw - k, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + k);
        ctx.moveTo(bx, by + bh - k); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + k, by + bh);
        ctx.moveTo(bx + bw - k, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - k);
        ctx.stroke();
        ctx.fillStyle = '#22d3ee'; ctx.font = '900 italic 18px Orbitron'; ctx.textAlign = 'center';
        ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 12;
        ctx.fillText('OPEN', cx, top + 8);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(34, 211, 238, 0.25)'; ctx.fillRect(cx - 40, top + 16, 80, 4);
        ctx.fillStyle = '#22d3ee'; ctx.fillRect(cx - 40, top + 16, 80 * Math.max(0, Math.min(1, left)), 4);
    } else if (en.telegraphed && en.stun <= 0 && en.attackCooldown > 0) {
        const move = en.controller === 'static_monk' ? 'laser' : (en.currentMove || 'jab');
        const style = MOVE_STYLE[move] || MOVE_STYLE.jab;
        const lead = Math.max(1, en.telegraphAt || 30);
        const k = Math.max(0, Math.min(1, 1 - en.attackCooldown / lead));
        const r = 16;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.arc(cx, top - 4, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = k > 0.8 ? '#ffffff' : style.color;
        ctx.shadowColor = style.color; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(cx, top - 4, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = style.color; ctx.font = 'bold 12px Orbitron'; ctx.textAlign = 'center';
        ctx.fillText(style.label, cx, top + 28);
    }
    ctx.restore();
}

// ---------- boss HP bar (screen space) ----------
export function drawBossHud(ctx) {
    const boss = st.enemies.find(e => e.isBoss);
    if (!boss) return;
    const W = 460, H = 12, x = (st.width - W) / 2, y = 104;
    const pct = Math.max(0, boss.hp / boss.maxHp);
    const inFinisher = !!st.finisher;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 4, y - 22, W + 8, H + 30);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Orbitron'; ctx.textAlign = 'left';
    ctx.fillText(boss.name, x, y - 7);
    ctx.textAlign = 'right'; ctx.fillStyle = isBossOpen(boss) ? '#22d3ee' : (boss.desperation ? '#ff3355' : '#9ca3af');
    ctx.fillText(isBossOpen(boss) ? 'OPEN — PUNISH' : (boss.desperation ? 'DESPERATION' : ''), x + W, y - 7);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, W, H);
    const flash = inFinisher ? 0.7 + 0.3 * Math.sin(Date.now() * 0.03) : 1;
    ctx.globalAlpha = flash;
    ctx.fillStyle = st.bossThemeColor || '#ff0055';
    ctx.fillRect(x, y, W * pct, H);
    ctx.globalAlpha = 1;
    // Stagger notches: lit until used, then cracked/dim.
    CONSTANTS.FINISHER.thresholds.forEach((th, i) => {
        const used = (boss.finisherStage || 0) > i;
        const nx = x + W * th;
        ctx.fillStyle = used ? 'rgba(255,255,255,0.25)' : '#ffffff';
        ctx.fillRect(nx - 1.5, y - 5, 3, H + 10);
        if (!used) {
            ctx.fillStyle = '#ffffff'; ctx.beginPath();
            ctx.moveTo(nx, y - 5); ctx.lineTo(nx - 5, y - 11); ctx.lineTo(nx + 5, y - 11); ctx.closePath(); ctx.fill();
        }
    });
    ctx.restore();
}

// ---------- finisher: dimmer under the fighters (world space) ----------
export function drawFinisherDim(ctx) {
    const f = st.finisher;
    if (!f) return;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.55 * f.bars})`;
    ctx.fillRect(-200, -200, st.width + 400, st.height + 400);
}

// The prompt lives in the open space right of the (pushed-in) fighters — clear
// of the boss HP bar up top and the fighters themselves.
const PROMPT_X = 0.72, PROMPT_Y = 0.48;

const PROMPT_GLYPH = {
    up:    { key: '▲', hint: '↑ / D-PAD', color: '#22d3ee' },
    down:  { key: '▼', hint: '↓ / D-PAD', color: '#22d3ee' },
    jab:   { key: 'A', hint: 'JAB · X', color: '#ffffff' },
    cross: { key: 'S', hint: 'CROSS · Y', color: '#ec4899' },
    hook:  { key: 'D', hint: 'HOOK · B', color: '#facc15' }
};

// ---------- finisher UI (screen space) ----------
export function drawFinisherUI(ctx) {
    const f = st.finisher;
    if (!f) return;
    const W = st.width, H = st.height;
    ctx.save();
    // letterbox
    const barH = 58 * f.bars;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, barH); ctx.fillRect(0, H - barH, W, barH);
    // radial vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.55 * f.bars})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    const title = f.kind === 'ko' ? 'FINAL BLOW' : (f.kind === 'break1' ? 'STAGGER I' : 'STAGGER II');
    ctx.globalAlpha = f.bars;
    ctx.fillStyle = f.kind === 'ko' ? '#ff0055' : '#ffffff';
    ctx.font = '900 italic 22px Orbitron';
    ctx.fillText(title, W / 2, Math.max(24, barH - 18));

    // sequence pips
    const n = f.seq.length, pipW = 34, gap = 8, total = n * pipW + (n - 1) * gap;
    for (let i = 0; i < n; i++) {
        const px = W / 2 - total / 2 + i * (pipW + gap);
        const done = i < f.idx, cur = i === f.idx && f.phase === 'prompts';
        const g = PROMPT_GLYPH[f.seq[i]];
        ctx.fillStyle = done ? g.color : (cur ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)');
        ctx.fillRect(px, H - barH + 14, pipW, 22);
        ctx.fillStyle = done ? '#000' : (cur ? '#fff' : 'rgba(255,255,255,0.35)');
        ctx.font = 'bold 13px Orbitron';
        ctx.fillText(g.key, px + pipW / 2, H - barH + 30);
    }
    ctx.globalAlpha = 1;

    // the live prompt: key box + closing beat ring
    const pp = promptProgress();
    if (pp) {
        const g = PROMPT_GLYPH[pp.move];
        const cx = PROMPT_X * W, cy = PROMPT_Y * H;
        const box = 38;
        const ringR = box + 70 * (1 - Math.min(1, pp.progress));
        const inWindow = pp.t >= -CONSTANTS.FINISHER.windowEarly;
        ctx.lineWidth = 4;
        ctx.strokeStyle = inWindow ? '#ffffff' : 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath(); ctx.arc(cx, cy, box, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = g.color; ctx.lineWidth = 3; ctx.shadowColor = g.color; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(cx, cy, box, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = g.color; ctx.font = '900 34px Orbitron';
        ctx.fillText(g.key, cx, cy + 12);
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = 'bold 11px Orbitron';
        ctx.fillText(g.hint, cx, cy + box + 22);
    } else if (f.phase === 'intro') {
        ctx.fillStyle = `rgba(255,255,255,${f.bars})`; ctx.font = 'bold 13px Orbitron';
        ctx.fillText('HIT EACH PROMPT ON THE BEAT', PROMPT_X * W, PROMPT_Y * H);
    }

    // judgement
    if (f.judge && f.judgeTimer > 0) {
        const a = Math.min(1, f.judgeTimer / 12);
        const s = reducedMotion() ? 1 : 1 + Math.max(0, f.judgeTimer - 26) * 0.06;
        ctx.save();
        ctx.translate(PROMPT_X * W, PROMPT_Y * H - 128); ctx.scale(s, s);
        ctx.globalAlpha = a; ctx.fillStyle = f.judge.color;
        ctx.font = '900 italic 30px Orbitron'; ctx.shadowColor = f.judge.color; ctx.shadowBlur = 14;
        ctx.fillText(f.judge.text, 0, 0);
        ctx.restore();
    }
    ctx.restore();
}

// ---------- upgrade equip vignette (screen space) ----------
export function drawVignette(ctx) {
    const v = st.vignette;
    if (!v) return;
    const W = st.width, H = st.height, t = v.timer, D = v.duration;
    const inA = Math.min(1, t / 8), outA = Math.min(1, (D - t) / 8);
    const a = Math.min(inA, outA);
    const rm = reducedMotion();
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.86)'; ctx.fillRect(0, 0, W, H);

    // diagonal colour slash
    const slashIn = rm ? 1 : Math.min(1, t / 10);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate(-0.22);
    const sg = ctx.createLinearGradient(-W, 0, W, 0);
    sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.5, v.color); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a * 0.28;
    ctx.fillStyle = sg; ctx.fillRect(-W * slashIn, -70, W * 2 * slashIn, 140);
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = v.color; ctx.fillRect(-W * slashIn, 72, W * 2 * slashIn, 3);
    ctx.restore();

    // the Striker, posed and scaled up, gloves ignited
    const pose = { speed: 'jab3', power: 'cross', technique: 'guard_jab' }[v.upgrade.tree] || (v.rarity === 'fusion' ? 'hook' : 'cross');
    const S = 2.3, bx = 250, by = 430;
    const ent = {
        x: bx / S - 25, y: by / S, w: 50, h: 110, lane: 1, state: 'punching', punchType: pose,
        hitFrame: 0, didHit: true, slipBuff: 0, color: st.strikerColor || '#00ffff', trails: [],
        gloveGlow: v.color, gloveHeat: Math.min(1, t / 14)
    };
    ctx.save();
    ctx.scale(S, S);
    drawBoxer(ctx, ent, true, a);
    ctx.restore();
    // sparks off the gloves
    if (ent.glovePositions) {
        ctx.fillStyle = v.color;
        v.sparks.forEach(sp => {
            const gp = ent.glovePositions[sp.gx];
            ctx.globalAlpha = a * sp.life;
            ctx.fillRect(gp[0] * S + sp.ox, gp[1] * S + sp.oy, 3, 3);
        });
        ctx.globalAlpha = a;
    }

    // name slam
    const slamK = rm ? 1 : Math.min(1, Math.max(0, (t - 4) / 8));
    const scale = rm ? 1 : 1 + (1 - slamK) * 1.6;
    const kindLabel = { fusion: '✦ FUSION ✦', apex: '★ APEX MASTERY ★', mastery: '◆ MASTERY', overclock: 'OVERCLOCK', orb: 'EVOLUTION' }[v.rarity] || 'EVOLUTION';
    ctx.save();
    ctx.translate(W * 0.64, H * 0.46);
    ctx.globalAlpha = a * slamK;
    ctx.fillStyle = v.color; ctx.font = 'bold 14px Orbitron'; ctx.textAlign = 'center';
    ctx.fillText(kindLabel + (v.upgrade.tree && TREE_NAME[v.upgrade.tree] ? ` · ${TREE_NAME[v.upgrade.tree]}` : ''), 0, -48);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 italic 44px Orbitron';
    ctx.shadowColor = v.color; ctx.shadowBlur = 24;
    ctx.fillText(v.upgrade.name.toUpperCase(), 0, 0);
    ctx.restore();
    if (!v.repeat) {
        ctx.globalAlpha = a * Math.min(1, Math.max(0, (t - 16) / 10));
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '13px Orbitron'; ctx.textAlign = 'center';
        wrapText(ctx, v.upgrade.desc, W * 0.64, H * 0.46 + 40, 440, 18);
    }
    // impact flash on the slam frame
    if (!rm && t >= 10 && t <= 13) { ctx.globalAlpha = 0.25 * (14 - t) / 4; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }

    ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#fff'; ctx.font = '11px Orbitron'; ctx.textAlign = 'center';
    ctx.fillText('ANY KEY TO SKIP', W / 2, H - 96);
    ctx.restore();
}

const TREE_NAME = { speed: 'SPEED', power: 'POWER', technique: 'TECHNIQUE' };

function wrapText(ctx, text, x, y, maxW, lh) {
    const words = String(text || '').split(' ');
    let line = '', yy = y;
    for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
        else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
}
