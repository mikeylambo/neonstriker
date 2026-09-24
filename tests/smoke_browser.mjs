// Browser smoke test against the SHIPPED bundle (dist/game.bundle.js) loaded the way
// index.html loads it — a classic <script> over file://. Catches the class of bug that
// unit tests can't: a bundle that doesn't boot, a missing DOM hook, a dead onclick.
// Run: node tests/smoke_browser.mjs   (requires jsdom; not part of `npm test`)
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const errors = [];
let passed = 0, failed = 0;
const ok = (n, c, d = '') => { if (c) passed++; else { failed++; console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`); } };

// Two passes:
//   file:// — the real distribution path (double-click). Validates boot + wiring.
//             NOTE: jsdom refuses localStorage on opaque origins, so persistence
//             assertions are skipped here and covered by the http:// pass instead.
//   http://  — full pass including persistence.
const MODE = process.argv[2] === 'http' ? 'http' : 'file';
const PAGE_URL = MODE === 'http' ? 'http://localhost:8099/index.html' : 'file://' + path.join(ROOT, 'index.html');
const storageWorks = MODE === 'http';

// The http pass needs the build served over a real origin (jsdom fetches the bundle
// via resources:'usable'). Spin up a throwaway static server so `npm run smoke:http`
// is self-contained — no separate server to start first. Node built-ins only.
let server = null;
if (MODE === 'http') {
    const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html' };
    server = http.createServer((req, res) => {
        let rel = decodeURIComponent(req.url.split('?')[0]);
        if (rel === '/') rel = '/index.html';
        const fp = path.join(ROOT, rel);
        if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.statusCode = 404; res.end('not found'); return; }
        res.setHeader('content-type', TYPES[path.extname(fp)] || 'application/octet-stream');
        fs.createReadStream(fp).pipe(res);
    });
    await new Promise(r => server.listen(8099, '127.0.0.1', r));
}

const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
    url: PAGE_URL,
    runScripts: 'dangerously',
    resources: 'usable',
    beforeParse(win) {
        const ctx = new Proxy({}, {
            get: (t, p) => {
                if (p === 'canvas') return { width: 1000, height: 600 };
                if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
                if (p === 'measureText') return () => ({ width: 50 });
                return p in t ? t[p] : () => {};
            },
            set: (t, p, v) => { t[p] = v; return true; }
        });
        win.HTMLCanvasElement.prototype.getContext = () => ctx;
        class Param { setValueAtTime() {} exponentialRampToValueAtTime() {} linearRampToValueAtTime() {} }
        win.AudioContext = class {
            constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
            resume() {}
            createOscillator() { return { frequency: new Param(), connect() {}, start() {}, stop() {} }; }
            createGain() { return { gain: new Param(), connect() {} }; }
        };
        win.requestAnimationFrame = cb => { win.__raf = cb; return 1; };
        win.navigator.getGamepads = () => [];
        win.addEventListener('error', e => errors.push(e.message));
    }
});

const win = dom.window;
await new Promise(r => setTimeout(r, 2500)); // let the classic script execute

const frame = (n = 1) => { for (let i = 0; i < n; i++) { const cb = win.__raf; if (!cb) return false; win.__raf = null; try { cb(0); } catch (e) { errors.push('FRAME: ' + e.message); return false; } } return true; };

console.log(`BROWSER SMOKE (shipped bundle over ${MODE}://)`);
ok('bundle executes with no page errors', errors.length === 0, errors.join(' | '));
ok('startGame is exposed to inline onclick', typeof win.startGame === 'function');
ok('setOnlineOptIn is exposed to inline onchange', typeof win.setOnlineOptIn === 'function');
ok('records screen exists', !!win.document.getElementById('records-screen'));

const cb = win.document.getElementById('online-optin');
ok('online opt-in checkbox is present', !!cb);
ok('online opt-in defaults to UNCHECKED', cb && cb.checked === false, cb ? `checked=${cb.checked}` : 'missing');

// Toggle it the way a player would, then confirm it persists through a re-render.
if (cb && typeof win.setOnlineOptIn === 'function' && storageWorks) {
    cb.checked = true;
    cb.dispatchEvent(new win.Event('change', { bubbles: true }));
    const after = win.document.getElementById('online-optin');
    ok('toggling opt-in persists (survives re-render)', after.checked === true, `checked=${after.checked}`);
    after.checked = false;
    after.dispatchEvent(new win.Event('change', { bubbles: true }));
    ok('toggling back off persists', win.document.getElementById('online-optin').checked === false);
}

// Start a real run and drive frames — proves the loop still runs with the new gates.
const startBtn = win.document.querySelector('[onclick="startGame()"]');
ok('start button found', !!startBtn);
if (startBtn) {
    startBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 30));
    ok('start screen hides on click', win.document.getElementById('start-screen').style.display === 'none');
    ok('survives 400 frames of play', frame(400));
    ok('no runtime errors during play', errors.length === 0, errors.slice(0, 3).join(' | '));
}

// ---- v16 DOM wiring ----
{
    const d = win.document;
    ok('v16: live score HUD present', !!d.getElementById('score-ui') && !!d.getElementById('score-mult'));
    ok('v16: results screen has no "ROUTE" line', !/ROUTE/.test(d.getElementById('gameover-screen').textContent));
    ok('v16: results has rank + PB delta', !!d.getElementById('stat-grade') && !!d.getElementById('pb-delta'));
    // Pause -> tabs (clear any tutorial modal first — Escape is ignored under one)
    console.log('  (screen before pause: tutorial modal ' + (d.getElementById('tutorial-screen').style.display === 'flex' ? 'UP' : 'down') + ')');
    for (let i = 0; i < 6 && d.getElementById('tutorial-screen').style.display === 'flex'; i++) { win.dismissTutorial(); frame(2); }
    win.dispatchEvent(new win.KeyboardEvent('keydown', { code: 'Escape' }));
    frame(1);
    const paused = d.getElementById('pause-screen').style.display === 'flex';
    ok('v16: Escape opens the pause menu', paused, d.getElementById('pause-screen').style.display);
    ['loadout', 'settings', 'resume'].forEach(t => {
        win.engineSetPauseTab(t);
        ok(`v16: pause tab "${t}" shows its panel`, d.getElementById(`ppanel-${t}`).style.display === 'block');
    });
    win.engineSetPauseTab('loadout');
    ok('v16: loadout renders', d.getElementById('loadout-body').innerHTML.includes('Evolution Trees'));
    win.engineSetPauseTab('settings');
    ok('v16: settings render 7 rows', d.querySelectorAll('#settings-body .set-row').length === 7);
    win.engineSetSetting('reducedMotion', true);
    ok('v16: reduced motion toggles the body class', d.body.classList.contains('reduced-motion'));
    if (storageWorks) {
        const saved = JSON.parse(win.localStorage.getItem('neon_strike_settings_v1') || '{}');
        ok('v16: settings persist to localStorage', saved.reducedMotion === true);
    }
    win.engineSetSetting('reducedMotion', false);
    win.dispatchEvent(new win.KeyboardEvent('keydown', { code: 'Escape' }));
    ok('v16: Escape resumes', d.getElementById('pause-screen').style.display === 'none');
    ok('v16: survives 300 more frames after pause round-trip', frame(300));
    ok('v16: no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));
}

if (!storageWorks) console.log('  (persistence assertions skipped — jsdom blocks localStorage on file://; covered by the http pass)');
console.log(`\nSMOKE[${MODE}]: ${passed} passed, ${failed} failed`);
if (server) server.close();
process.exit(failed ? 1 : 0);
