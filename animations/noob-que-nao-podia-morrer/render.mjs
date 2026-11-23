// Renderiza index.html quadro a quadro com Playwright e codifica o MP4 com ffmpeg.
// Uso: node render.mjs <dir_three> <dir_build> [saida.mp4] [--preview t1,t2,...]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const [threeDir, buildDir, outArg] = process.argv.slice(2);
const pIdx = process.argv.indexOf('--preview');
const preview = pIdx > 0 ? process.argv[pIdx + 1].split(',').map(Number) : null;
const FPS = 30, DUR = 45, W = 720, H = 1280;
const out = outArg && !outArg.startsWith('--') ? outArg : path.join(buildDir, 'video.mp4');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.route('**/*', route => {
  const u = new URL(route.request().url());
  let file;
  const m = u.pathname.match(/three@[^/]+\/(.*)$/);
  if (m) file = path.join(threeDir, m[1]);
  else if (u.pathname.endsWith('/lipsync.json')) file = path.join(buildDir, 'lipsync.json');
  else file = path.join(here, u.pathname.replace(/^\//, '') || 'index.html');
  if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
  route.fulfill({ status: 200, body: fs.readFileSync(file), contentType: types[path.extname(file)] || 'application/octet-stream' });
});
await page.goto('http://anim.local/index.html?render=1');
await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
await page.addStyleTag({ content: '#stage{transform:none!important;left:0!important;top:0!important}' });

if (preview) {
  for (const t of preview) {
    await page.evaluate(t => window.renderAt(t), t);
    await page.screenshot({ path: path.join(buildDir, `prev_${t.toFixed(1).padStart(4, '0')}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', path.join(buildDir, 'audio.wav'),
  '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const total = FPS * DUR; const t0 = Date.now();
for (let f = 0; f < total; f++) {
  await page.evaluate(t => window.renderAt(t), f / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 60 === 0) console.log(`quadro ${f}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('ok', out);
