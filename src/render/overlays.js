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
import { knockdownPrompt } from '../systems/knockdown.js';
import { buildColor } from '../systems/colors.js';
import { evolutionLabel, upgradeColor } from '../systems/vignette.js';
import { glyph, glyphText, inputDevice } from '../systems/input_device.js';

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
    const W = 380, H = 12, x = (st.width - W) / 2, y = st.finisher ? 80 : 38; // v17: top-centre, below the letterbox in a Finisher
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

// v18: prompts show the glyph for the device you're actually holding — a PS4
// pad sees □ △ ○, an Xbox pad X Y B, the keyboard your bound keys.
const MOVE_NAME = { up: 'SLIP UP', down: 'SLIP DOWN', jab: 'JAB', cross: 'CROSS', hook: 'HOOK' };
const KEY_COLOR = { up: '#22d3ee', down: '#22d3ee', jab: '#ffffff', cross: '#ec4899', hook: '#facc15' };
function promptGlyph(move) {
    const g = glyph(move), dev = inputDevice();
    const key = (move === 'up' || move === 'down') ? (move === 'up' ? '▲' : '▼') : g.label;
    return { key, hint: MOVE_NAME[move] || move.toUpperCase(), color: dev === 'keyboard' ? KEY_COLOR[move] : (move === 'up' || move === 'down' ? '#22d3ee' : g.color) };
}

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
        const g = promptGlyph(f.seq[i]);
        ctx.fillStyle = done ? g.color : (cur ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)');
        ctx.fillRect(px, H - barH + 14, pipW, 22);
        ctx.fillStyle = done ? '#000' : (cur ? '#fff' : 'rgba(255,255,255,0.35)');
        ctx.font = 'bold 13px Orbitron';
        ctx.fillText(g.key, px + pipW / 2, H - barH + 30);
    }
    ctx.globalAlpha = 1;

    // v19: the prompt sits right OVER the two fighters (screen position of the
    // camera's push-in focus), so your eyes never leave the exchange.
    const z = st.finisherZoom || 1, bp = f.boss;
    const fx = (st.player.x + bp.x) / 2 + 20, fy = st.player.y - 70;
    const cx = fx, cy = Math.max(150, fy - 118 * z); // clears the boss bar (y≈100 in a Finisher)
    const pp = promptProgress();
    if (pp) {
        const g = promptGlyph(pp.move);
        const box = 46;
        // the NEXT prompt waits, small and dim, to the right
        const nextMove = f.seq[f.idx + 1];
        if (nextMove) {
            const ng = promptGlyph(nextMove);
            ctx.globalAlpha = 0.45; ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath(); ctx.arc(cx + 104, cy, 24, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = ng.color; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = ng.color; ctx.font = `900 ${ng.key.length > 2 ? 12 : 20}px Orbitron`;
            ctx.textBaseline = 'middle'; ctx.fillText(ng.key, cx + 104, cy + 1); ctx.textBaseline = 'alphabetic';
            ctx.globalAlpha = 1;
        }
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
        ctx.fillStyle = g.color; ctx.font = `900 ${g.key.length > 2 ? 24 : 40}px Orbitron`;
        ctx.textBaseline = 'middle'; ctx.fillText(g.key, cx, cy + 2); ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#ffffff'; ctx.font = '900 16px Orbitron';
        ctx.fillText(g.hint, cx, cy + box + 30);
    } else if (f.phase === 'intro') {
        ctx.fillStyle = `rgba(255,255,255,${f.bars})`; ctx.font = 'bold 13px Orbitron';
        ctx.fillText('HIT EACH PROMPT ON THE BEAT', cx, cy);
    }
    // a locked-in input flashes where the prompt was
    if (f.phase === 'prompts' && f.lockFlash > 0) {
        ctx.globalAlpha = f.lockFlash / 10; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, 46 + (10 - f.lockFlash) * 3, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }

    // judgement
    if (f.judge && f.judgeTimer > 0) {
        const a = Math.min(1, f.judgeTimer / 12);
        const s = reducedMotion() ? 1 : 1 + Math.max(0, f.judgeTimer - 26) * 0.06;
        ctx.save();
        ctx.translate(cx, f.phase === 'playback' ? Math.max(90, cy - 10) : Math.max(70, cy - 76)); ctx.scale(s, s);
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
    const a = Math.min(1, t / 8);
    const rm = reducedMotion();
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 0, W, H);

    // diagonal colour slash (hero pick's colour)
    const slashIn = rm ? 1 : Math.min(1, t / 10);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate(-0.22);
    const sg = ctx.createLinearGradient(-W, 0, W, 0);
    sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.5, v.color); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a * 0.22;
    ctx.fillStyle = sg; ctx.fillRect(-W * slashIn, -70, W * 2 * slashIn, 140);
    ctx.restore();

    // v18 LAYOUT: the Striker owns the left third, the text owns the right —
    // they never overlap (playtest: the pose covered the upgrade name).
    const pose = { speed: 'jab3', power: 'cross', technique: 'guard_jab' }[v.upgrade.tree] || (v.rarity === 'fusion' || v.rarity === 'evolved' ? 'hook' : 'cross');
    const S = 2.1, bx = 150, by = 440;
    const ent = {
        x: bx / S - 25, y: by / S, w: 50, h: 110, lane: 1, state: 'punching', punchType: pose,
        hitFrame: 0, didHit: true, slipBuff: 0, color: st.strikerColor || '#00ffff', trails: [],
        // colour rule: the upgrade's colour rides the PUNCH TRAIL and sparks,
        // never the Striker's body or gloves.
        trailColor: v.color, trailHeat: Math.min(1, t / 10)
    };
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 380, H); ctx.clip();
    ctx.scale(S, S); drawBoxer(ctx, ent, true, a);
    ctx.restore();
    if (ent.glovePositions) {
        ctx.fillStyle = v.color;
        v.sparks.forEach(sp => {
            const gp = ent.glovePositions[sp.gx];
            ctx.globalAlpha = a * sp.life;
            ctx.fillRect(Math.min(370, gp[0] * S + sp.ox), gp[1] * S + sp.oy, 3, 3);
        });
        ctx.globalAlpha = a;
    }

    const TX = 410, TW = W - TX - 40;           // text column
    const fit = (text, font, size, maxW) => { let s = size; do { ctx.font = font.replace('#', s); s -= 2; } while (ctx.measureText(text).width > maxW && s > 14); };
    const slamK = rm ? 1 : Math.min(1, Math.max(0, (t - 4) / 8));
    ctx.textAlign = 'left';
    const picks = v.picks && v.picks.length ? v.picks : [v.upgrade];
    if (picks.length === 1) {
        const u = picks[0];
        ctx.globalAlpha = a * slamK;
        ctx.fillStyle = v.color; ctx.font = 'bold 14px Orbitron';
        ctx.fillText(evolutionLabel(u), TX, H * 0.40);
        ctx.save();
        const sc = rm ? 1 : 1 + (1 - slamK) * 0.6;
        ctx.translate(TX, H * 0.40 + 52); ctx.scale(sc, sc);
        fit(u.name.toUpperCase(), '900 italic #px Orbitron', 44, TW);
        ctx.fillStyle = '#ffffff'; ctx.shadowColor = v.color; ctx.shadowBlur = 20;
        ctx.fillText(u.name.toUpperCase(), 0, 0);
        ctx.restore();
        ctx.globalAlpha = a * Math.min(1, Math.max(0, (t - 14) / 10));
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '14px Orbitron';
        wrapText(ctx, u.desc, TX, H * 0.40 + 92, TW, 20, 'left');
    } else {
        // a stacked chain: every pick, in the order they were taken
        ctx.globalAlpha = a * slamK;
        ctx.fillStyle = '#ffffff'; ctx.font = '900 italic 34px Orbitron'; ctx.shadowColor = v.color; ctx.shadowBlur = 16;
        ctx.fillText(`${picks.length} EVOLUTIONS`, TX, 118); ctx.shadowBlur = 0;
        const rowH = Math.min(110, (H - 190) / picks.length);
        picks.forEach((u, i) => {
            const y = 150 + i * rowH, col = upgradeColor(u);
            const k = rm ? 1 : Math.min(1, Math.max(0, (t - 8 - i * 6) / 10));
            ctx.globalAlpha = a * k;
            ctx.fillStyle = col; ctx.fillRect(TX, y, 4, rowH - 14);
            ctx.font = 'bold 11px Orbitron'; ctx.fillText(evolutionLabel(u), TX + 16, y + 14);
            fit(u.name.toUpperCase(), '900 italic #px Orbitron', 24, TW - 16);
            ctx.fillStyle = '#ffffff'; ctx.fillText(u.name.toUpperCase(), TX + 16, y + 42);
            ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '12px Orbitron';
            wrapText(ctx, u.desc, TX + 16, y + 62, TW - 16, 16, 'left', Math.max(1, Math.floor((rowH - 70) / 16) + 1));
        });
    }
    ctx.globalAlpha = a;
    // impact flash on the slam frame
    if (!rm && t >= 10 && t <= 13) { ctx.globalAlpha = 0.22 * (14 - t) / 4; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = a; }

    // v18: it waits for you — a clear, pulsing continue prompt once it holds.
    if (v.holding) {
        const pulse = 0.55 + 0.45 * Math.sin(Date.now() * 0.006);
        ctx.globalAlpha = pulse; ctx.fillStyle = '#ffffff'; ctx.font = '900 13px Orbitron'; ctx.textAlign = 'center';
        ctx.fillText(`PRESS ${glyphText('confirm')} TO CONTINUE`, W / 2, H - 40);
    }
    ctx.restore();
}

const TREE_NAME = { speed: 'SPEED', power: 'POWER', technique: 'TECHNIQUE' };

function wrapText(ctx, text, x, y, maxW, lh, align = 'center', maxLines = 99) {
    ctx.textAlign = align;
    const words = String(text || '').split(' ');
    let line = '', yy = y, n = 0;
    for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line) {
            if (++n >= maxLines) { ctx.fillText(line + '…', x, yy); return; }
            ctx.fillText(line, x, yy); line = w; yy += lh;
        }
        else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
}

// ---------- v17 KO shatter shards + orb pickups (world space) ----------
export function drawKoFx(ctx) {
    if (!st.koFx || !st.koFx.length) return;
    ctx.save();
    for (const fx of st.koFx) {
        ctx.fillStyle = fx.color; ctx.shadowColor = fx.color; ctx.shadowBlur = 10;
        if (!fx.orb) {
            const a = fx.t < 14 ? 1 : Math.max(0.3, 1 - (fx.t - 14) / 16);
            ctx.globalAlpha = a;
            fx.shards.forEach(s => {
                ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
                ctx.beginPath(); ctx.moveTo(0, -s.size); ctx.lineTo(s.size * 0.5, s.size * 0.6); ctx.lineTo(-s.size * 0.5, s.size * 0.6); ctx.closePath(); ctx.fill();
                ctx.restore();
            });
        } else {
            const o = fx.orb, r = fx.big ? 13 : 8;
            ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(o.x - o.vx * 2, o.y - o.vy * 2, r * 0.8, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(o.x, o.y, r * 0.45, 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.restore();
}

// ---------- v18 LIVE WIRE's LIVE LANES (world space) ----------
// Warning: a thin crackling yellow line. Live: a thick electric band with arcs.
export function drawLiveLanes(ctx) {
    if (!st.liveLanes || !st.liveLanes.length) return;
    ctx.save();
    for (const z of st.liveLanes) {
        const y = st.height * CONSTANTS.LANE_Y[z.lane];
        if (z.phase === 'warn') {
            const a = 0.35 + 0.35 * Math.sin(Date.now() * 0.04);
            ctx.strokeStyle = `rgba(255, 243, 107, ${a.toFixed(3)})`; ctx.lineWidth = 3; ctx.setLineDash([10, 10]);
            ctx.lineDashOffset = -Date.now() * 0.1 % 20;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(st.width, y); ctx.stroke(); ctx.setLineDash([]);
        } else {
            ctx.shadowColor = '#fff36b'; ctx.shadowBlur = 20;
            ctx.strokeStyle = 'rgba(255, 243, 107, 0.35)'; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(st.width, y); ctx.stroke();
            ctx.strokeStyle = '#fff36b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(st.width, y); ctx.stroke();
            ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
            for (let k = 0; k < 4; k++) {
                let x0 = Math.random() * st.width, y0 = y - 10 + Math.random() * 20;
                ctx.beginPath(); ctx.moveTo(x0, y0);
                for (let s = 0; s < 5; s++) { x0 += 10 + Math.random() * 14; y0 += (Math.random() - 0.5) * 18; ctx.lineTo(x0, y0); }
                ctx.stroke();
            }
        }
    }
    ctx.restore();
}

// ---------- v17 AFTERIMAGES (world space) ----------
export function drawAfterimages(ctx) {
    const all = [...(st.afterimages || []), ...(st.enemyEchoes || []).map(e => ({ ...e, facing: -1, enemy: true }))];
    if (!all.length) return;
    for (const ai of all) {
        const a = ai.fired ? Math.max(0, ai.fade / 22) * 0.7 : 0.55;
        const ghost = {
            x: ai.x + (ai.fired ? 10 * (ai.facing || 1) : 0), y: ai.y, lane: ai.lane, w: 50, h: 110,
            state: ai.fired ? 'punching' : 'idle', punchType: 'cross', hitFrame: 0, didHit: true,
            slipBuff: 0, overrideColor: ai.color, facing: ai.facing || 1, shape: ai.enemy ? 'negative' : undefined
        };
        ctx.save(); ctx.shadowColor = ai.color; ctx.shadowBlur = 16;
        drawBoxer(ctx, ghost, true, a, true);
        ctx.restore();
    }
}

// ---------- v17 TEN-COUNT scene (screen space) ----------
export function drawKnockdownUI(ctx) {
    const k = st.knockdown;
    if (!k) return;
    const W = st.width, H = st.height, p = st.player;
    ctx.save();
    // red-edged vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(120,0,20,${0.55 * k.fall})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // the ref, over the Striker, counting
    const rx = p.x + 130, ry = p.y;
    ctx.globalAlpha = Math.min(1, k.frame / 12);
    drawBoxer(ctx, { x: rx, y: ry, lane: p.lane, w: 50, h: 110, state: 'idle', stun: 0, attackCooldown: 99, color: '#e5e7eb', type: 'grunt', trails: [] }, false, 0.9);
    ctx.globalAlpha = 1;
    const count = Math.max(0, Math.min(10, k.count));
    if (count > 0 && k.phase !== 'up') {
        const pulse = 1 + Math.max(0, 1 - (k.frame % CONSTANTS.KNOCKDOWN.framesPerCount) / 10) * 0.35;
        ctx.save(); ctx.translate(rx + 25, Math.max(150, ry - 190)); ctx.scale(pulse, pulse); // never clipped on the top lane
        ctx.fillStyle = count >= 8 ? '#ff3355' : '#ffffff'; ctx.font = '900 italic 64px Orbitron'; ctx.textAlign = 'center';
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 20;
        ctx.fillText(String(count), 0, 0); ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff'; ctx.font = '900 italic 26px Orbitron';
    ctx.fillText(k.phase === 'up' ? `BACK ON YOUR FEET · ${Math.round((k.hpFrac || 0) * 100)}% HP` : 'GET UP!', W / 2, 60);
    ctx.font = 'bold 12px Orbitron'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(k.phase === 'up' ? '' : 'HIT EACH PROMPT ON THE BEAT · CLEANER = MORE HEALTH', W / 2, 82);
    // progress pips
    const n = k.seq.length;
    for (let i = 0; i < n; i++) {
        ctx.fillStyle = i < k.idx ? '#22d3ee' : 'rgba(255,255,255,0.2)';
        ctx.fillRect(W / 2 - n * 18 + i * 36 + 4, 96, 28, 6);
    }
    // the live prompt
    const pp = knockdownPrompt();
    if (pp) {
        const cx = W * 0.72, cy = H * 0.46, box = 38;
        const ringR = box + 70 * (1 - Math.min(1, pp.progress));
        ctx.lineWidth = 4; ctx.strokeStyle = pp.t >= -CONSTANTS.KNOCKDOWN.windowEarly ? '#ffffff' : 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.beginPath(); ctx.arc(cx, cy, box, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 3; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(cx, cy, box, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#22d3ee'; ctx.font = '900 34px Orbitron';
        ctx.fillText(pp.move === 'up' ? '▲' : '▼', cx, cy + 12);
    }
    if (k.judge && k.judgeTimer > 0) {
        ctx.globalAlpha = Math.min(1, k.judgeTimer / 10); ctx.fillStyle = k.judge.color; ctx.font = '900 italic 26px Orbitron';
        ctx.fillText(k.judge.text, W * 0.72, H * 0.46 - 120);
    }
    ctx.restore();
}

// ---------- v17 TITLE-FIGHT POSTER (screen space, boss intro) ----------
const POSTER_FRAMES = 180;
export function drawBossPoster(ctx) {
    const P = st.bossPoster;
    if (!P || st.bossIntroTimer <= 0) return;
    const W = st.width, H = st.height;
    const t = POSTER_FRAMES - st.bossIntroTimer;          // 0 -> 180
    const inK = Math.min(1, t / 16), outK = Math.min(1, st.bossIntroTimer / 18);
    const a = Math.min(inK, outK);
    const rm = reducedMotion();
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, W, H);
    // poster panel
    const pw = 620, ph = 420, px = (W - pw) / 2, py = (H - ph) / 2 + (rm ? 0 : (1 - inK) * 40);
    const grad = ctx.createLinearGradient(0, py, 0, py + ph);
    grad.addColorStop(0, '#0b0b12'); grad.addColorStop(1, '#050507');
    ctx.fillStyle = grad; ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = P.color; ctx.lineWidth = 3; ctx.shadowColor = P.color; ctx.shadowBlur = 24;
    ctx.strokeRect(px, py, pw, ph); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.strokeRect(px + 8, py + 8, pw - 16, ph - 16);
    ctx.textAlign = 'center';
    ctx.fillStyle = P.color; ctx.font = '900 14px Orbitron';
    ctx.fillText(`TITLE FIGHT · ARC ${P.arc} · ROUND ${P.round}`, W / 2, py + 36);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = 'bold 11px Orbitron';
    ctx.fillText(String(P.venue).toUpperCase(), W / 2, py + 54);
    // the two fighters, facing off
    const fy = py + 352;
    ctx.save(); ctx.translate(px + 150, fy); ctx.scale(1.7, 1.7);
    drawBoxer(ctx, { x: -25, y: 0, lane: 1, w: 50, h: 110, state: 'idle', punchType: null, hitFrame: 0, slipBuff: 0, trails: [] }, true, a); // v19: his idle stance
    ctx.restore();
    ctx.save(); ctx.translate(px + pw - 150, fy); ctx.scale(1.7, 1.7);
    drawBoxer(ctx, { x: -25, y: 0, lane: 1, w: 50, h: 110, isBoss: false, controller: P.controller, type: 'grunt', color: P.color, stun: 0, attackCooldown: 99, trails: [] }, false, a);
    ctx.restore();
    // names
    const slam = rm ? 1 : Math.min(1, Math.max(0, (t - 10) / 10));
    ctx.globalAlpha = a * slam;
    ctx.fillStyle = st.strikerColor || '#00ffff'; ctx.font = '900 italic 26px Orbitron';
    ctx.fillText('THE STRIKER', px + 150, py + 110);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 italic 30px Orbitron';
    ctx.fillText('VS', W / 2, py + 200);
    ctx.fillStyle = P.color; ctx.font = '900 italic 26px Orbitron'; ctx.shadowColor = P.color; ctx.shadowBlur = 14;
    ctx.fillText(P.name, px + pw - 150, py + 110);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'bold 12px Orbitron';
    ctx.fillText(P.tagline, px + pw - 150, py + 130);
    // v18: holds until you're ready
    if (!st.posterConfirmed && st.bossIntroTimer <= CONSTANTS.POSTER_HOLD_FRAME) {
        const pulse = 0.55 + 0.45 * Math.sin(Date.now() * 0.006);
        ctx.globalAlpha = a * pulse; ctx.fillStyle = '#ffffff'; ctx.font = '900 16px Orbitron'; ctx.shadowBlur = 0;
        ctx.fillText(`PRESS ${glyphText('confirm')} TO FIGHT`, W / 2, py + ph - 30);
    }
    // FIGHT! on the way out
    if (st.bossIntroTimer < 40) {
        ctx.globalAlpha = Math.min(1, (40 - st.bossIntroTimer) / 8) * outK;
        ctx.fillStyle = '#ffffff'; ctx.font = '900 italic 54px Orbitron'; ctx.shadowColor = P.color; ctx.shadowBlur = 20;
        ctx.fillText('FIGHT!', W / 2, py + ph - 26);
    }
    ctx.restore();
}

// ---------- v17 ROUND BILLING CARD (drawn by SequenceManager 'billing' steps) ----------
export function drawBillingCard(ctx, card, age, alpha) {
    const W = st.width, H = st.height, rm = reducedMotion();
    const inK = Math.min(1, age / 12);
    ctx.save();
    ctx.globalAlpha = alpha * inK;
    const bw = 520, bh = 150, bx = (W - bw) / 2, by = H / 2 - bh / 2 - 20 + (rm ? 0 : (1 - inK) * 24);
    ctx.fillStyle = 'rgba(4,4,8,0.88)'; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = card.color || '#22d3ee'; ctx.lineWidth = 2; ctx.shadowColor = card.color || '#22d3ee'; ctx.shadowBlur = 18;
    ctx.strokeRect(bx, by, bw, bh); ctx.shadowBlur = 0;
    ctx.fillStyle = card.color || '#22d3ee'; ctx.fillRect(bx, by, 6, bh); ctx.fillRect(bx + bw - 6, by, 6, bh);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = 'bold 11px Orbitron';
    ctx.fillText(card.kicker || '', W / 2, by + 26);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 italic 48px Orbitron';
    ctx.fillText(`ROUND ${card.round}`, W / 2, by + 78);
    ctx.fillStyle = card.color || '#22d3ee'; ctx.font = '900 18px Orbitron';
    ctx.fillText(String(card.venue).toUpperCase(), W / 2, by + 108);
    if (card.tagline) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = 'bold 12px Orbitron'; ctx.fillText(card.tagline, W / 2, by + 132); }
    ctx.restore();
}

// ==========================================
// v20 INCOMING-THREAT PIPS: enemies that have spawned but haven't walked on yet
// get a chevron at the right edge of their lane (their colour; Zoners get a
// double chevron — they shoot from range). Brighter and pulsing as they near
// the edge; a number when several queue in one lane.
// ==========================================
export function drawThreatPips(ctx) {
    if (st.screen !== 'playing' || st.finisher || st.bossIntroTimer > 0) return;
    const W = st.width, lanes = [[], [], []];
    for (const e of st.enemies) if (e.hp > 0 && !e.isBoss && e.x > W - 20 && e.lane >= 0 && e.lane <= 2) lanes[e.lane].push(e);
    const t = (st.uiFrame || 0);
    ctx.save();
    lanes.forEach((list, lane) => {
        if (!list.length) return;
        list.sort((a, b) => a.x - b.x);
        const e = list[0], dist = e.x - W;
        const near = Math.max(0, Math.min(1, 1 - dist / 700));
        const y = st.height * CONSTANTS.LANE_Y[lane] - 38;
        const pulse = near > 0.7 ? 0.5 + 0.5 * Math.sin(t * 0.4) : 0;
        const x = W - 16;
        ctx.globalAlpha = 0.35 + 0.65 * near;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.arc(x - 6, y, 15 + pulse * 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = e.color || '#ff0055'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowColor = e.color || '#ff0055'; ctx.shadowBlur = 6 + pulse * 10;
        const chev = ox => { ctx.beginPath(); ctx.moveTo(x + ox, y - 8); ctx.lineTo(x + ox - 9, y); ctx.lineTo(x + ox, y + 8); ctx.stroke(); };
        chev(0); if (list.some(z => z.type === 'zoner')) chev(-8); // a Zoner anywhere in the queue
        ctx.shadowBlur = 0;
        if (list.length > 1) {
            ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Orbitron'; ctx.textAlign = 'center';
            ctx.fillText(`×${list.length}`, x - 6, y + 28);
        }
    });
    ctx.restore();
}

// ==========================================
// v20 PRACTICE: SLIP WINDOWS. Above each attacker, a bar counting its attack
// down to the hit: the grey band is the GOOD window, the white band the PERFECT
// window. The cursor runs right-to-left; slip while it's in the white.
// ==========================================
export function drawSlipWindows(ctx) {
    if (!st.practice || !st.practice.windows) return;
    for (const e of st.enemies) {
        if (e.hp <= 0 || e.isBoss || e.x > st.width) continue;
        const { perfect, good } = CONSTANTS.getSlipThresholds(e.type, st.progressionMods.perfectSlipWindowBonus);
        const span = good + 30, cd = e.attackCooldown;
        if (cd > span || cd < 0) continue;
        const w = 110, h = 10, x = e.x + 25 - w / 2, y = e.y - (e.h || 110) - 46;
        const X = v => x + w * (v / span); // cooldown value -> x (0 = the hit, at the left)
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
        ctx.fillStyle = 'rgba(255,0,85,0.35)'; ctx.fillRect(X(good), y, w - (X(good) - x), h);
        ctx.fillStyle = 'rgba(229,231,235,0.45)'; ctx.fillRect(x, y, X(good) - x, h);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, X(perfect) - x, h);
        const inPerfect = cd <= perfect, inGood = cd <= good;
        ctx.fillStyle = inPerfect ? '#22d3ee' : (inGood ? '#facc15' : '#ff3355');
        ctx.fillRect(X(cd) - 2, y - 5, 4, h + 10);
        ctx.font = 'bold 9px Orbitron'; ctx.textAlign = 'center';
        ctx.fillStyle = inPerfect ? '#22d3ee' : '#9ca3af';
        ctx.fillText(inPerfect ? 'SLIP NOW' : (inGood ? 'GOOD' : 'WAIT'), x + w / 2, y - 7);
        ctx.restore();
    }
}
