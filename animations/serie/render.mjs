// Renderiza um episódio quadro a quadro (Playwright + ffmpeg).
// Uso: node render.mjs <n> [--three <dir node_modules/three>] [--preview t1,t2,...] [--out arquivo.mp4]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');

const here = path.dirname(new URL(import.meta.url).pathname);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const n = String(process.argv[2]).padStart(2, '0');
const threeDir = arg('--three', path.join(here, 'node_modules/three'));
const preview = arg('--preview') ? arg('--preview').split(',').map(Number) : null;
const buildDir = path.join(here, 'build', `ep${n}`);
const out = arg('--out', path.join(buildDir, `ep${n}.mp4`));
const FPS = 30, W = 720, H = 1280;

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('console', m => { if (m.type() === 'error') console.log('[page]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.route('**/*', route => {
  const u = new URL(route.request().url());
  const m = u.pathname.match(/three@[^/]+\/(.*)$/);
  const file = m ? path.join(threeDir, m[1]) : path.join(here, decodeURIComponent(u.pathname).replace(/^\//, ''));
  if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
  route.fulfill({ status: 200, body: fs.readFileSync(file), contentType: types[path.extname(file)] || 'application/octet-stream' });
});
await page.goto(`http://serie.local/player.html?ep=${n}&render=1`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
await page.addStyleTag({ content: '#stage{transform:none!important;left:0!important;top:0!important}' });
const dur = JSON.parse(fs.readFileSync(path.join(buildDir, 'timeline.json'))).duration;

if (preview) {
  for (const t of preview) {
    await page.evaluate(t => window.renderAt(t), t);
    await page.screenshot({ path: path.join(buildDir, `prev_${t.toFixed(1).padStart(5, '0')}.png`) });
  }
  await browser.close(); process.exit(0);
}
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', path.join(buildDir, 'audio.wav'),
  '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const total = Math.ceil(FPS * dur); const t0 = Date.now();
for (let f = 0; f < total; f++) {
  await page.evaluate(t => window.renderAt(t), f / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 150 === 0) console.log(`ep${n} quadro ${f}/${total} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('ok', out);
