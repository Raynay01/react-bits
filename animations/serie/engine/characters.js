// Personagens da série: avatares blocados (mesmo construtor do piloto), rostos desenhados e poses.
import { THREE, scene, V, mat, rbox, mesh, glow, canvasTex, clamp, lerp, hash } from './core.js';

// ------------------------------------------------------------ rostos
const ellipse = (g, x, y, rx, ry, fill) => { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, 7); g.fill(); };
const CX = 256;

let ROUND = 0;   // 0 = boca larga (A/E), 1 = arredondada (O/U): vem do áudio (v2)
function mouthOpen(g, w, h, y = 160, tongue = true) {
  if (ROUND > 0.05 && h > 12) { w *= 1 - 0.5 * ROUND; h *= 1 + 0.25 * ROUND; }
  g.fillStyle = '#2a0a0a'; g.beginPath(); g.moveTo(CX - w, y - 8); g.quadraticCurveTo(CX, y - 8 + h * 0.15, CX + w, y - 8); g.quadraticCurveTo(CX + w * 0.9, y + h, CX, y + h); g.quadraticCurveTo(CX - w * 0.9, y + h, CX - w, y - 8); g.fill();
  if (tongue && h > 18) ellipse(g, CX, y + h * 0.78, w * 0.45, h * 0.22, '#e8556a');
  if (h > 14) { g.fillStyle = '#fff'; g.fillRect(CX - w * 0.6, y - 6, w * 1.2, Math.min(10, h * 0.2)); }
}
function stroke(g, w = 10, c = '#111') { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; }
function curve(g, x0, y0, cx, cy, x1, y1) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke(); }
function brows(g, ang, dy = 0, col = '#111', w = 11, spread = 0) {
  stroke(g, w, col);
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(CX + s * (22 + spread), 66 + dy + ang); g.lineTo(CX + s * (70 + spread), 66 + dy - ang); g.stroke(); }
}
function tears(g, t, y = 120) {
  for (const s of [-1, 1]) {
    const k = (t * 1.6 + (s > 0 ? 0.5 : 0)) % 1;
    g.fillStyle = 'rgba(110,200,255,.95)';
    g.beginPath(); g.ellipse(CX + s * 46, y + k * 60, 7, 11, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(110,200,255,.6)'; g.fillRect(CX + s * 46 - 5, y - 6, 10, k * 60);
  }
}
function sweat(g, x = CX + 96, y = 64) { g.fillStyle = '#7fd8ff'; g.beginPath(); g.moveTo(x, y - 18); g.quadraticCurveTo(x + 12, y + 4, x, y + 12); g.quadraticCurveTo(x - 12, y + 4, x, y - 18); g.fill(); }

// olhos por estilo
function eyes(g, style, expr, blink) {
  const wide = ['shock', 'scared', 'frozen'].includes(expr);
  const happyClosed = ['laugh'].includes(expr);
  const y = 100;
  if (happyClosed) { stroke(g, 10); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(CX + s * 26, y + 4); g.lineTo(CX + s * 44, y - 14); g.lineTo(CX + s * 62, y + 4); g.stroke(); } return; }
  if (expr === 'sleep') { stroke(g, 9); for (const s of [-1, 1]) curve(g, CX + s * 24, y, CX + s * 44, y + 14, CX + s * 64, y); return; }
  if (wide) {
    for (const s of [-1, 1]) { ellipse(g, CX + s * 44, y - 2, 22, 30, '#fff'); stroke(g, 5); g.beginPath(); g.ellipse(CX + s * 44, y - 2, 22, 30, 0, 0, 7); g.stroke(); ellipse(g, CX + s * 44, y + 2, 6, 7, '#000'); }
    return;
  }
  if (style === 'pro' && !['sad', 'cry'].includes(expr)) {   // óculos escuros
    g.fillStyle = '#111';
    g.beginPath(); g.roundRect(CX - 92, 78, 78, 40, 12); g.roundRect(CX + 14, 78, 78, 40, 12); g.fill();
    g.fillRect(CX - 20, 86, 40, 9);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(CX - 80, 86, 20, 6); g.fillRect(CX + 26, 86, 20, 6);
    return;
  }
  const smug = expr === 'smug';
  for (const s of [-1, 1]) {
    const x = CX + s * 44;
    if (style === 'luna') {
      ellipse(g, x, y, 17, 22 * blink, '#1b1030'); if (blink > 0.5) { ellipse(g, x - 5, y - 8, 5, 6, '#fff'); ellipse(g, x + 4, y + 6, 3, 3, '#b48cff'); }
      stroke(g, 6); g.beginPath(); g.moveTo(x - s * -14, y - 18 * blink); g.lineTo(x + s * 26, y - 26 * blink); g.stroke();
    } else if (style === 'pipoca') {
      ellipse(g, x, y, 20, 26 * blink, '#2a1a10'); if (blink > 0.5) { ellipse(g, x - 6, y - 9, 7, 8, '#fff'); ellipse(g, x + 6, y + 8, 3, 3, '#fff'); }
    } else if (style === 'vovo') {
      ellipse(g, x, y + 4, 9, 12 * blink, '#111');
    } else {
      ellipse(g, x, y, 13, 22 * blink, '#111');
    }
    if (smug) { g.fillStyle = FACE_SKIN[style] || '#ffd400'; g.fillRect(x - 24, y - 26, 48, 22); }
  }
}
const FACE_SKIN = { noob: '#f5cd30', pro: '#eac4a0', luna: '#f1c9a8', pipoca: '#f3c49b', vovo: '#e8bf9a', ze: '#d9a47a' };

function drawFace(g, style, expr, m, t) {
  g.clearRect(0, 0, 512, 256);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const blink = (Math.sin(t * 1.7 + style.length) > 0.985 && !['shock', 'scared', 'frozen'].includes(expr)) ? 0.12 : 1;
  const browCol = style === 'vovo' ? '#f4f4f4' : style === 'luna' ? '#5a2a8a' : style === 'pro' ? '#7a1020' : '#111';
  const browW = style === 'vovo' ? 16 : style === 'ze' ? 15 : 11;
  const mouthY = style === 'vovo' ? 150 : style === 'ze' ? 168 : 158;
  // sobrancelhas
  const B = { angry: [11, -6], determined: [7, -4], sad: [-10, -6], cry: [-12, -6], scared: [-10, -12], shock: [-6, -16], frozen: [-12, -12], think: [5, -8], smug: [-4, 8], neutral: [0, -6], happy: [-3, -10], laugh: [-3, -12], smile: [-1, -8], chew: [-1, -8] }[expr] || [0, -6];
  if (!(style === 'pro' && !['sad', 'cry', 'shock', 'scared', 'frozen'].includes(expr)) || expr === 'angry' || expr === 'determined') {
    if (style !== 'noob' || ['angry', 'sad', 'cry', 'scared', 'shock', 'frozen', 'determined', 'smug', 'think'].includes(expr)) brows(g, B[0], B[1] + (style === 'pro' ? -6 : 0), browCol, browW, style === 'pipoca' ? 4 : 0);
  }
  eyes(g, style, expr, blink);
  if (style === 'pipoca') for (const s of [-1, 1]) for (let i = 0; i < 3; i++) ellipse(g, CX + s * (58 + i * 9), 132 + (i % 2) * 6, 3.5, 3.5, '#c0703a');
  if (['happy', 'laugh'].includes(expr) && style !== 'pro') for (const s of [-1, 1]) ellipse(g, CX + s * 76, 140, 14, 9, 'rgba(255,120,140,.45)');
  if (expr === 'cry') tears(g, t);
  if (['scared', 'frozen', 'shock'].includes(expr) && style !== 'vovo') sweat(g);
  // boca
  const mo = m > 0.06 ? m : 0;
  const Y = mouthY;
  if (expr === 'laugh') mouthOpen(g, 62, 50 + mo * 25, Y - 8);
  else if (expr === 'shock') ellipse(g, CX, Y + 14, 22 + mo * 14, 24 + mo * 22, '#2a0a0a');
  else if (expr === 'scared' || expr === 'frozen') { if (mo) ellipse(g, CX, Y + 12, 26 + mo * 10, 14 + mo * 24, '#2a0a0a'); else { stroke(g, 8); g.beginPath(); for (let i = 0; i <= 6; i++) { const x = CX - 36 + i * 12; const yy = Y + 10 + (i % 2 ? -5 : 5); i ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); } }
  else if (expr === 'chew') { const c = Math.sin(t * 18) * 0.5 + 0.5; ellipse(g, CX, Y + 4, 26 + c * 8, 10 + c * 10, '#2a0a0a'); }
  else if (mo) {
    const w = { pipoca: 40, luna: 36, vovo: 42 }[style] || 50;
    if (['sad', 'cry'].includes(expr)) { ellipse(g, CX, Y + 12, w * 0.6, 8 + mo * 26, '#2a0a0a'); }
    else mouthOpen(g, w * (expr === 'angry' ? 1.1 : 1), 12 + mo * 44, Y, style !== 'vovo');
  } else {
    stroke(g, style === 'luna' || style === 'pipoca' ? 8 : 10);
    if (['sad', 'cry'].includes(expr)) curve(g, CX - 40, Y + 14, CX, Y - 10, CX + 40, Y + 14);
    else if (expr === 'angry' || expr === 'determined') { g.beginPath(); g.moveTo(CX - 40, Y + 6); g.lineTo(CX + 40, Y + (expr === 'angry' ? 0 : 6)); g.stroke(); }
    else if (expr === 'smug') curve(g, CX - 40, Y + 2, CX + 10, Y + 18, CX + 52, Y - 12);
    else if (expr === 'think') { g.beginPath(); g.moveTo(CX - 20, Y + 6); g.lineTo(CX + 30, Y + 2); g.stroke(); }
    else if (expr === 'happy') mouthOpen(g, style === 'pipoca' ? 40 : 52, 30, Y);
    else if (expr === 'neutral' && style !== 'noob') { g.beginPath(); g.moveTo(CX - 30, Y + 6); g.quadraticCurveTo(CX, Y + 12, CX + 30, Y + 6); g.stroke(); }
    else curve(g, CX - 60 * (style === 'luna' ? 0.6 : 1), Y - 10, CX, Y + 28, CX + 60 * (style === 'luna' ? 0.6 : 1), Y - 10);
  }
  if (style === 'ze') { // bigodão
    g.fillStyle = '#1a120c'; g.beginPath(); g.moveTo(CX, Y - 22); g.bezierCurveTo(CX - 40, Y - 34, CX - 90, Y - 18, CX - 86, Y + 4); g.bezierCurveTo(CX - 60, Y - 6, CX - 30, Y - 4, CX, Y - 8);
    g.bezierCurveTo(CX + 30, Y - 4, CX + 60, Y - 6, CX + 86, Y + 4); g.bezierCurveTo(CX + 90, Y - 18, CX + 40, Y - 34, CX, Y - 22); g.fill();
  }
}

// ------------------------------------------------------------ construtor do avatar (igual ao piloto)
const headProfile = (() => {
  const p = [new THREE.Vector2(0, -0.62)];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI / 2; p.push(new THREE.Vector2(0.5 + Math.cos(a) * 0.14, -0.48 + Math.sin(a) * 0.14)); }
  for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; p.push(new THREE.Vector2(0.5 + Math.cos(a) * 0.14, 0.48 + Math.sin(a) * 0.14)); }
  p.push(new THREE.Vector2(0, 0.62)); return p;
})();
const headGeo = new THREE.LatheGeometry(headProfile, 32);
const faceGeo = new THREE.CylinderGeometry(0.648, 0.648, 0.96, 32, 1, true, -1.1, 2.2);

function makeAvatar({ head, torso, arms, legs, style, torsoDecal, legDecal, scale = 1 }) {
  const root = new THREE.Group();
  const g = new THREE.Group(); root.add(g);
  const headG = new THREE.Group(); headG.position.y = 4.08;
  const headM = mesh(headGeo, mat(head)); headM.position.y = 0.62; headG.add(headM);
  const fc = document.createElement('canvas'); fc.width = 512; fc.height = 256;
  const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace;
  const faceM = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: ft, transparent: true, roughness: .6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  faceM.position.y = 0.62; headG.add(faceM);
  const torsoMats = torsoDecal ? [mat(torso), mat(torso), mat(torso), mat(torso), mat(0xffffff, { map: torsoDecal }), mat(torso)] : mat(torso);
  const torsoM = mesh(rbox(2, 2, 1, 0.1), torsoMats); torsoM.position.y = 3;
  const limb = (color, x, y, dy) => { const p = new THREE.Group(); p.position.set(x, y, 0); const m = mesh(rbox(0.98, 2, 0.98, 0.12), legDecal && y < 3 ? [mat(color), mat(color), mat(color), mat(color), mat(0xffffff, { map: legDecal }), mat(color)] : mat(color)); m.position.y = dy; p.add(m); g.add(p); return p; };
  const lArm = limb(arms, -1.5, 3.85, -0.85), rArm = limb(arms, 1.5, 3.85, -0.85);
  const lLeg = limb(legs, -0.5, 2, -1), rLeg = limb(legs, 0.5, 2, -1);
  g.add(torsoM, headG);
  root.scale.setScalar(scale);
  root.userData = { g, headG, torsoM, lArm, rArm, lLeg, rLeg, fc, ft, faceM, style, lastKey: '', scale, mats: [] };
  root.traverse(o => { if (o.material && !Array.isArray(o.material)) root.userData.mats.push(o.material); else if (Array.isArray(o.material)) root.userData.mats.push(...o.material); });
  scene.add(root);
  return root;
}
export function setFace(av, expr, m, t, round = 0) {
  const u = av.userData; const mq = Math.round(m * 10) / 10; const rq = Math.round(round * 4) / 4;
  const blink = Math.sin(t * 1.7 + u.style.length) > 0.985;
  const key = expr + mq + '|' + rq + (['chew', 'cry'].includes(expr) ? Math.round(t * 20) : '') + blink;
  if (key === u.lastKey) return; u.lastKey = key;
  ROUND = rq; drawFace(u.fc.getContext('2d'), u.style, expr, mq, t); ROUND = 0; u.ft.needsUpdate = true;
}
export function setOpacity(av, o) {
  for (const m of av.userData.mats) { m.transparent = o < 0.999 || m.userData?.wasTransparent; m.opacity = o; }
}

// ------------------------------------------------------------ acessórios / props
function hairPro(headG) {
  const hair = new THREE.Group(); const hm = mat(0xd61f35);
  const cap = mesh(rbox(1.36, 0.42, 1.36, 0.14), hm); cap.position.y = 1.26; hair.add(cap);
  for (let i = 0; i < 5; i++) { const s = mesh(new THREE.ConeGeometry(0.28, 0.8, 4), hm); s.position.set(-0.5 + i * 0.25, 1.6, -0.1 - (i % 2) * 0.2); s.rotation.z = (i - 2) * -0.25; hair.add(s); }
  const back = mesh(rbox(1.36, 0.9, 0.3, 0.1), hm); back.position.set(0, 0.95, -0.55); hair.add(back);
  const feather = new THREE.Group();
  const f1 = mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0xffffff)); f1.scale.set(0.5, 2.6, 0.18); f1.position.y = 0.38;
  const f2 = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 5), mat(0xdddddd)); f2.position.y = 0.3;
  feather.add(f1, f2); feather.position.set(0.42, 1.55, 0.1); feather.rotation.z = -0.5; hair.add(feather);
  headG.add(hair); return { feather };
}
function hairLuna(headG) {
  const hm = mat(0x7b3fd1);
  const top = mesh(rbox(1.42, 0.5, 1.42, 0.2), hm); top.position.y = 1.22; headG.add(top);
  const back = mesh(rbox(1.42, 1.0, 0.36, 0.14), hm); back.position.set(0, 0.85, -0.56); headG.add(back);
  for (const s of [-1, 1]) {
    const side = mesh(rbox(0.3, 0.95, 1.1, 0.12), hm); side.position.set(s * 0.66, 0.86, -0.1); headG.add(side);
    const cup = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 16), mat(0xff7ac8)); cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.82, 0.62, 0); headG.add(cup);
    const ear = mesh(new THREE.ConeGeometry(0.2, 0.36, 4), mat(0xff7ac8)); ear.position.set(s * 0.5, 1.62, 0); ear.rotation.y = Math.PI / 4; headG.add(ear);
  }
  const band = mesh(new THREE.TorusGeometry(0.78, 0.06, 6, 24, Math.PI), mat(0xff7ac8)); band.position.y = 0.66; band.rotation.y = Math.PI / 2; band.rotation.x = 0; headG.add(band);
}
function capPipoca(headG) {
  const cm = mat(0xff8a1a);
  const cap = mesh(rbox(1.36, 0.38, 1.36, 0.16), cm); cap.position.y = 1.26; headG.add(cap);
  const brim = mesh(rbox(1.0, 0.1, 0.7, 0.04), cm); brim.position.set(0, 1.1, -0.92); headG.add(brim);
  const btn = mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0xffffff)); btn.position.y = 1.47; headG.add(btn);
}
function vovoGear(av) {
  const { headG, rArm } = av.userData;
  const hat = mesh(new THREE.SphereGeometry(0.78, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffc21a, { roughness: .35 })); hat.position.y = 1.18; headG.add(hat);
  const rimH = mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.08, 24), mat(0xffc21a, { roughness: .35 })); rimH.position.y = 1.18; headG.add(rimH);
  const beard = mesh(rbox(1.2, 0.9, 0.5, 0.2), mat(0xf2f2f2, { roughness: .9 })); beard.position.set(0, 0.12, 0.42); headG.add(beard);
  const cane = new THREE.Group(); const sh = mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), mat(0x6b4423)); sh.position.y = -1.0;
  const hd = mesh(new THREE.TorusGeometry(0.22, 0.08, 6, 12, Math.PI), mat(0x6b4423)); hd.position.y = 0.6; cane.add(sh, hd);
  rArm.add(cane); cane.position.set(0, -1.8, 0.45);
  return { cane };
}
function zeGear(av) {
  const { headG, torsoM } = av.userData;
  const cap = mesh(rbox(1.4, 0.32, 1.5, 0.14), mat(0x6d6f73)); cap.position.set(0, 1.2, 0.05); headG.add(cap);
  const brim = mesh(rbox(1.2, 0.08, 0.5, 0.04), mat(0x6d6f73)); brim.position.set(0, 1.08, 0.75); headG.add(brim);
  const pack = mesh(rbox(1.6, 1.8, 0.9, 0.2), mat(0x8a5a2b)); pack.position.set(0, 3.1, -0.95); av.userData.g.add(pack);
  const roll = mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.8, 12), mat(0x3a6ea5)); roll.rotation.z = Math.PI / 2; roll.position.set(0, 4.15, -0.95); av.userData.g.add(roll);
  for (let i = 0; i < 3; i++) { const it = mesh(rbox(0.4, 0.4, 0.4, 0.08), mat([0xff3b5c, 0xffd23b, 0x4dff8a][i], { emissive: [0xff3b5c, 0xffd23b, 0x4dff8a][i], emissiveIntensity: .4 })); it.position.set(-0.5 + i * 0.5, 4.2, -1.3); av.userData.g.add(it); }
}

export function makeSword() {
  const sword = new THREE.Group();
  const handle = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.9, 8), mat(0x3a2414));
  const guard = mesh(rbox(0.9, 0.2, 0.3, 0.06), mat(0xffc21a, { metalness: .6, roughness: .3 })); guard.position.y = 0.5;
  const blade = mesh(rbox(0.32, 3.4, 0.12, 0.05), mat(0xdfe8f5, { metalness: .9, roughness: .15, emissive: 0x3ac8ff, emissiveIntensity: 0.6 })); blade.position.y = 2.3;
  sword.add(handle, guard, blade); return sword;
}
export function makeBurger() {
  const burger = new THREE.Group();
  const bunB = mesh(new THREE.CylinderGeometry(0.5, 0.45, 0.22, 16), mat(0xd08a3a));
  const pat = mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.17, 16), mat(0x5a2e14)); pat.position.y = 0.19;
  const ch = mesh(new THREE.BoxGeometry(0.95, 0.06, 0.95), mat(0xffc21a)); ch.position.y = 0.3; ch.rotation.y = 0.4;
  const let_ = mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.06, 12), mat(0x4ccf3a)); let_.position.y = 0.36;
  const bunT = mesh(new THREE.SphereGeometry(0.52, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xe09a46)); bunT.position.y = 0.38; bunT.scale.y = 0.75;
  burger.add(bunB, pat, ch, let_, bunT); return burger;
}
export function makeCrown() {
  const crown = new THREE.Group();
  const gm = mat(0xffcc22, { metalness: .9, roughness: .25, emissive: 0xffaa00, emissiveIntensity: .7 });
  crown.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 20, 1, true), gm));
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const c = mesh(new THREE.ConeGeometry(0.14, 0.45, 6), gm); c.position.set(Math.cos(a) * 0.52, 0.35, Math.sin(a) * 0.52); crown.add(c); }
  const gem = mesh(new THREE.OctahedronGeometry(0.13), mat(0xff2a6a, { emissive: 0xff2a6a, emissiveIntensity: 1.5 })); gem.position.set(0, 0.05, 0.56); crown.add(gem);
  return crown;
}
export function makeKey() {   // Chave do Fundador
  const k = new THREE.Group();
  const gm = mat(0xffd23a, { metalness: .9, roughness: .2, emissive: 0xffb000, emissiveIntensity: 1.2 });
  const ring = mesh(new THREE.TorusGeometry(0.42, 0.12, 10, 24), gm); ring.position.y = 0.9;
  const shaft = mesh(rbox(0.18, 1.5, 0.18, 0.05), gm);
  const t1 = mesh(rbox(0.42, 0.16, 0.16, 0.04), gm); t1.position.set(0.2, -0.55, 0);
  const t2 = mesh(rbox(0.3, 0.16, 0.16, 0.04), gm); t2.position.set(0.14, -0.3, 0);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), glow(0xffd060, { opacity: 0.18 }));
  halo.position.y = 0.3; k.add(ring, shaft, t1, t2, halo); k.userData.halo = halo;
  return k;
}
export function makeTablet() {
  const t = new THREE.Group();
  const b = mesh(rbox(1.3, 0.9, 0.08, 0.05), mat(0x1a1a22));
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.75), new THREE.MeshBasicMaterial({ color: 0x46e0ff })); s.position.z = 0.05;
  t.add(b, s); return t;
}
export function makeWhip() {   // chicote de laser da Luna
  const w = new THREE.Group();
  const h = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), mat(0x222233));
  const pts = []; for (let i = 0; i < 12; i++) pts.push(V(Math.sin(i * 0.6) * 0.3 * i / 11, 0.35 + i * 0.32, Math.cos(i * 0.5) * 0.15 * i / 11));
  const beam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.06, 6), glow(0xff4ad8, { opacity: 0.95 }));
  w.add(h, beam); w.userData.beam = beam; return w;
}

// ------------------------------------------------------------ elenco
const decal = (draw) => canvasTex(256, 256, draw);
const proDecal = decal((g) => { g.fillStyle = '#1a1a22'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#e8243c'; g.fillRect(0, 96, 256, 26); g.fillStyle = '#fff'; g.font = '900 64px Inter'; g.textAlign = 'center'; g.fillText('PRO', 128, 200); g.fillStyle = '#e8243c'; g.beginPath(); g.moveTo(128, 20); g.lineTo(160, 70); g.lineTo(96, 70); g.fill(); });
const lunaDecal = decal((g) => { g.fillStyle = '#167a80'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#0f5a5e'; g.fillRect(70, 150, 116, 70); g.strokeStyle = '#ff7ac8'; g.lineWidth = 10; g.beginPath(); g.moveTo(80, 70); g.lineTo(120, 105); g.lineTo(80, 140); g.stroke(); g.fillStyle = '#ff7ac8'; g.fillRect(132, 128, 46, 12); g.fillStyle = '#e8f7f7'; for (const x of [96, 160]) g.fillRect(x, 0, 6, 60); });
const pipDecal = decal((g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#e8243c'; g.fillRect(0, i * 32, 256, 32); } g.fillStyle = '#ffd23b'; g.beginPath(); g.arc(128, 128, 44, 0, 7); g.fill(); g.fillStyle = '#e8243c'; g.font = '900 54px Inter'; g.textAlign = 'center'; g.fillText('P', 128, 148); });
const vovoDecal = decal((g) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#7a4a24'; g.fillRect(40, 90, 176, 166); g.fillRect(40, 0, 30, 100); g.fillRect(186, 0, 30, 100); g.fillStyle = '#ffd23b'; g.beginPath(); g.arc(70, 110, 10, 0, 7); g.arc(186, 110, 10, 0, 7); g.fill(); g.fillStyle = '#5a3418'; g.fillRect(90, 140, 76, 50); });
const zeDecal = decal((g) => { g.fillStyle = '#f4efe4'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#7a4a24'; g.fillRect(0, 0, 80, 256); g.fillRect(176, 0, 80, 256); g.fillStyle = '#ffd23b'; for (const y of [70, 130, 190]) { g.beginPath(); g.arc(66, y, 8, 0, 7); g.fill(); } g.fillStyle = '#c62828'; g.fillRect(104, 30, 48, 18); });

export const cast = {};
export function buildCast() {
  const noob = makeAvatar({ head: 0xf5cd30, torso: 0x0d69ac, arms: 0xf5cd30, legs: 0x4b974b, style: 'noob' });
  const pro = makeAvatar({ head: 0xeac4a0, torso: 0x1a1a22, arms: 0x1a1a22, legs: 0x2b2b33, style: 'pro', torsoDecal: proDecal });
  const { feather } = hairPro(pro.userData.headG); pro.userData.feather = feather;
  const sword = makeSword(); pro.userData.rArm.add(sword); sword.position.set(0, -1.75, 0.4); sword.rotation.x = Math.PI / 2; pro.userData.props = { sword };
  const luna = makeAvatar({ head: 0xf1c9a8, torso: 0x167a80, arms: 0x167a80, legs: 0x3b2360, style: 'luna', torsoDecal: lunaDecal });
  hairLuna(luna.userData.headG);
  const tablet = makeTablet(); luna.userData.lArm.add(tablet); tablet.position.set(0.2, -1.9, 0.7); tablet.rotation.set(-0.9, 0, 0);
  const whip = makeWhip(); luna.userData.rArm.add(whip); whip.position.set(0, -1.85, 0.3); whip.rotation.x = Math.PI / 2;
  luna.userData.props = { tablet, whip };
  const pipoca = makeAvatar({ head: 0xf3c49b, torso: 0xe8243c, arms: 0xf3c49b, legs: 0x2f6fd6, style: 'pipoca', torsoDecal: pipDecal, scale: 0.72 });
  capPipoca(pipoca.userData.headG);
  const button = new THREE.Group();   // chaveiro com o botão vermelho (EP2, EP4, EP9)
  const bb = mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.18, 20), mat(0x2a2a2a)); const bt = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 20), mat(0xff1a1a, { emissive: 0xff1a1a, emissiveIntensity: 1.2 })); bt.position.y = 0.14;
  button.add(bb, bt); pipoca.userData.rArm.add(button); button.position.set(0, -2.0, 0.55); button.rotation.x = Math.PI / 2; button.scale.setScalar(1.3);
  pipoca.userData.props = { button };
  const vovo = makeAvatar({ head: 0xe8bf9a, torso: 0x7a4a24, arms: 0xf2f2f2, legs: 0x5a3418, style: 'vovo', torsoDecal: vovoDecal, scale: 0.96 });
  vovo.userData.props = vovoGear(vovo);
  const ze = makeAvatar({ head: 0xd9a47a, torso: 0x7a4a24, arms: 0xf4efe4, legs: 0x2f4a2a, style: 'ze', torsoDecal: zeDecal, scale: 1.05 });
  zeGear(ze);
  // adereços do Noob
  const burger = makeBurger(); noob.userData.rArm.add(burger); burger.position.set(0, -2.1, 0.35); burger.rotation.x = Math.PI / 2; burger.scale.setScalar(1.1);
  const crown = makeCrown(); noob.userData.headG.add(crown); crown.position.y = 1.55;
  const key = makeKey(); noob.add(key); key.position.set(0, 3.2, 1.3); key.scale.setScalar(0.6);
  const aura = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.4, 48), glow(0xffd23a, { side: THREE.DoubleSide }));
  aura.rotation.x = -Math.PI / 2; aura.position.y = 0.06; noob.add(aura);
  noob.userData.props = { burger, crown, key, aura };
  Object.assign(cast, { noob, pro, luna, pipoca, vovo, ze });
  cast.chicken = makeChicken();
  cast.vortex = makeVortex();
  cast.vbot = makeVortexBot();
  for (let i = 1; i <= 4; i++) cast['drone' + i] = makeDrone(i);
  const block = new THREE.Group(); const bm = mesh(rbox(3, 3, 3, 0.3), mat(0x8e8fa8)); bm.position.y = 1.5; block.add(bm); block.userData = { prop: true }; scene.add(block); cast.block = block;
  Object.values(cast).forEach(c => { c.visible = false; });
  return cast;
}

function makeChicken() {   // o Pro-galinha (mesmo modelo do piloto)
  const chicken = new THREE.Group();
  const w = mat(0xfafafa), r = mat(0xe8243c), y = mat(0xffb21a), k = mat(0x111111);
  const body = mesh(rbox(2.6, 2.2, 3, 0.5), w); body.position.y = 2.4;
  const tail = mesh(rbox(1.6, 1.4, 0.8, 0.3), w); tail.position.set(0, 3.3, -1.6); tail.rotation.x = -0.5;
  const headC = new THREE.Group(); headC.position.set(0, 4.2, 1.1);
  headC.add(mesh(rbox(1.4, 1.6, 1.3, 0.35), w));
  const beak = mesh(rbox(0.6, 0.35, 0.7, 0.1), y); beak.position.set(0, 0, 0.9); headC.add(beak);
  const beakL = mesh(rbox(0.5, 0.2, 0.55, 0.08), y); beakL.position.set(0, -0.25, 0.8); headC.add(beakL);
  const wat = mesh(rbox(0.3, 0.5, 0.25, 0.1), r); wat.position.set(0, -0.6, 0.7); headC.add(wat);
  for (let i = 0; i < 3; i++) { const c = mesh(rbox(0.3, 0.55, 0.35, 0.1), r); c.position.set(0, 0.95, -0.3 + i * 0.32); headC.add(c); }
  const eyesC = [];
  for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.16, 10, 8), k); e.position.set(s * 0.71, 0.2, 0.35); headC.add(e); eyesC.push(e); const ew = mesh(new THREE.SphereGeometry(0.24, 10, 8), w); ew.position.set(s * 0.66, 0.2, 0.35); ew.scale.set(.3, 1, 1); headC.add(ew); }
  // óculos escuros do Pro, para deixar claro quem é a galinha
  const shades = mesh(rbox(1.5, 0.28, 0.1, 0.05), k); shades.position.set(0, 0.3, 0.62); headC.add(shades);
  for (const s of [-1, 1]) { const arm = mesh(rbox(0.08, 0.08, 0.7, 0.02), k); arm.position.set(s * 0.72, 0.3, 0.3); headC.add(arm); }
  const hair = mesh(new THREE.ConeGeometry(0.2, 0.6, 4), mat(0xd61f35)); hair.position.set(0.3, 1.2, 0.1); hair.rotation.z = -0.4; headC.add(hair);
  const wings = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 1.3, 3.0, 0); const wm = mesh(rbox(0.4, 1.5, 2.2, 0.2), w); wm.position.y = -0.6; p.add(wm); chicken.add(p); return p; });
  for (const s of [-1, 1]) { const l = mesh(rbox(0.25, 1.4, 0.25, 0.06), y); l.position.set(s * 0.6, 0.7, 0.2); const f = mesh(rbox(0.6, 0.15, 0.8, 0.05), y); f.position.set(s * 0.6, 0.07, 0.4); chicken.add(l, f); }
  chicken.add(body, tail, headC); chicken.userData = { headC, wings, beakL, chicken: true };
  scene.add(chicken); return chicken;
}
function makeVortex() {   // o gigante do piloto
  const giant = new THREE.Group();
  const dm = mat(0x0b0b12, { roughness: .8 }), hm = mat(0x111118, { roughness: .9 });
  const parts = [];
  const add = (geo, m, x, y, z) => { const o = mesh(geo, m); o.position.set(x, y, z); giant.add(o); parts.push(o); return o; };
  add(rbox(2, 2, 1, 0.1), dm, 0, 3, 0); add(rbox(1.3, 1.25, 1.25, 0.35), dm, 0, 4.7, 0); add(rbox(1.6, 1.6, 1.4, 0.4), hm, 0, 4.85, -0.12);
  const armL = new THREE.Group(); armL.position.set(-1.5, 3.85, 0); const al = mesh(rbox(1, 2, 1, .1), dm); al.position.y = -0.85; armL.add(al); giant.add(armL);
  const armR = new THREE.Group(); armR.position.set(1.5, 3.85, 0); const ar = mesh(rbox(1, 2, 1, .1), dm); ar.position.y = -0.85; armR.add(ar); giant.add(armR);
  add(rbox(1, 2, 1, .1), dm, -0.5, 1, 0); add(rbox(1, 2, 1, .1), dm, 0.5, 1, 0);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xff1a2a });
  const eyes = [-1, 1].map(s => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.05), eyeM); e.position.set(s * 0.3, 4.8, 0.66); e.rotation.z = s * -0.22; giant.add(e); return e; });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 8, 40), new THREE.MeshBasicMaterial({ color: 0xff2a3a }));
  halo.position.set(0, 6.1, 0); halo.rotation.x = Math.PI / 2; giant.add(halo);
  const light = new THREE.PointLight(0xff1a2a, 0, 140, 1.2); light.position.set(0, 5, 4); giant.add(light);
  giant.userData = { eyes, halo, armL, armR, light, eyeM };
  scene.add(giant); return giant;
}
function makeVortexBot() {   // VÓRTEX redimido (EP10)
  const b = new THREE.Group();
  const body = mesh(rbox(1.4, 1.3, 1.3, 0.35), mat(0xe8eef7, { roughness: .3 })); b.add(body);
  const screen = mesh(rbox(1.1, 0.7, 0.1, 0.08), mat(0x10131c)); screen.position.set(0, 0.05, 0.64); b.add(screen);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x46c8ff });
  const eyes = [-1, 1].map(s => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.05), eyeM); e.position.set(s * 0.22, 0.08, 0.71); b.add(e); return e; });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 30), new THREE.MeshBasicMaterial({ color: 0x46c8ff })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.95; b.add(ring);
  const light = new THREE.PointLight(0x46c8ff, 8, 8, 1.5); light.position.set(0, 0, 1.5); b.add(light);
  b.userData = { eyes, ring, bot: true };
  scene.add(b); return b;
}
function makeDrone(i) {   // Ban-Bot
  const d = new THREE.Group();
  const body = mesh(rbox(1.2, 1.2, 1.2, 0.2), mat(0x15151c, { metalness: .5, roughness: .35 })); d.add(body);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.05), new THREE.MeshBasicMaterial({ color: 0xff2030 })); eye.position.set(0, 0.1, 0.62); d.add(eye);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 6, 24), new THREE.MeshBasicMaterial({ color: 0xff2030 })); ring.rotation.x = Math.PI / 2; d.add(ring);
  const hammer = new THREE.Group(); const hh = mesh(rbox(0.6, 0.45, 0.45, 0.06), mat(0x2b2b33, { metalness: .6 })); hh.position.y = -0.95;
  const hs = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), mat(0x555a63)); hs.position.y = -0.5; hammer.add(hh, hs);
  const banTxt = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), new THREE.MeshBasicMaterial({ map: canvasTex(128, 48, (g) => { g.fillStyle = '#ff2030'; g.fillRect(0, 0, 128, 48); g.fillStyle = '#fff'; g.font = '900 34px Inter'; g.textAlign = 'center'; g.fillText('BAN', 64, 36); }) }));
  banTxt.position.set(0, -0.95, 0.24); hammer.add(banTxt); hammer.position.set(0.75, -0.2, 0); d.add(hammer);
  const light = new THREE.PointLight(0xff2030, 6, 6, 1.6); light.position.set(0, 0, 1.2); d.add(light);
  d.userData = { ring, hammer, eye, drone: true, ph: i * 1.7 };
  scene.add(d); return d;
}

// ------------------------------------------------------------ poses procedurais
// anim: nome da ação; k: tempo local; talk: abertura da boca (0..1)
export function applyAnim(av, anim, t, k, talk, moving) {
  const u = av.userData; const p = { lArmX: 0, lArmZ: -0.08, rArmX: 0, rArmZ: 0.08, lLegX: 0, rLegX: 0, headX: 0, headY: 0, headZ: 0, bodyX: 0, bodyZ: 0, bob: Math.sin(t * 2.4 + u.style.length) * 0.04 };
  const gest = talk > 0.1 ? Math.sin(t * 7) * 0.12 * talk : 0;
  const walkCycle = (spd, amp) => { const c = Math.sin(t * spd); p.lLegX = c * amp; p.rLegX = -c * amp; p.lArmX = -c * amp * 0.8; p.rArmX = c * amp * 0.8; p.bob = Math.abs(Math.cos(t * spd)) * 0.12; };
  switch (anim) {
    case 'talk': p.rArmX = -0.35 + gest * 2; p.rArmZ = 0.25; p.lArmX = -0.1 - gest; p.headZ = gest * 0.4; p.headX = -gest * 0.3; break;
    case 'walk': walkCycle(9, 0.6); break;
    case 'run': walkCycle(14, 1.0); p.bodyX = 0.18; break;
    case 'point': p.rArmX = -1.55; p.rArmZ = 0.1; p.headY = 0.1; break;
    case 'laugh': p.bob = Math.abs(Math.sin(t * 14)) * 0.3; p.bodyX = -0.2; p.lArmX = -0.6; p.rArmX = -0.6; p.lArmZ = -0.5; p.rArmZ = 0.5; p.headX = -0.2; break;
    case 'scared': p.lArmZ = -0.6; p.rArmZ = 0.6; p.lArmX = -0.5; p.rArmX = -0.5; p.bob = Math.sin(t * 40) * 0.03; p.bodyX = -0.08; break;
    case 'sad': p.headX = 0.35; p.bodyX = 0.12; p.lArmZ = -0.02; p.rArmZ = 0.02; p.bob = Math.sin(t * 1.4) * 0.02; break;
    case 'cry': p.headX = 0.3; p.lArmX = -2.4; p.rArmX = -2.4; p.lArmZ = 0.5; p.rArmZ = -0.5; p.bob = Math.sin(t * 9) * 0.04; break;
    case 'cheer': p.lArmX = -2.9; p.rArmX = -2.9; p.lArmZ = -0.3; p.rArmZ = 0.3; p.bob = Math.abs(Math.sin(t * 9)) * 0.6; break;
    case 'fight': p.lArmX = -1.3; p.rArmX = -1.1 + Math.sin(t * 6) * 0.15; p.lArmZ = 0.4; p.rArmZ = -0.4; p.lLegX = 0.3; p.rLegX = -0.3; p.bodyX = 0.1; break;
    case 'think': p.rArmX = -2.2; p.rArmZ = -0.5; p.headZ = 0.12; p.headX = -0.1; break;
    case 'crossed': p.lArmX = -1.3; p.rArmX = -1.3; p.lArmZ = 0.9; p.rArmZ = -0.9; break;
    case 'shrug': p.lArmZ = -0.7; p.rArmZ = 0.7; p.lArmX = -0.6; p.rArmX = -0.6; p.headZ = 0.15; break;
    case 'typing': p.lArmX = -1.1; p.rArmX = -1.0 + Math.sin(t * 22) * 0.1; p.rArmZ = -0.25; p.headX = 0.25; break;
    case 'wave': p.rArmX = -2.9; p.rArmZ = 0.3 + Math.sin(t * 10) * 0.35; break;
    case 'armsup': p.lArmX = -3.0; p.rArmX = -3.0; break;
    case 'hold': p.rArmX = -1.4; p.rArmZ = 0.15; break;
    case 'reach': p.rArmX = -1.7; p.lArmX = -1.7; p.bodyX = 0.15; break;
    case 'hug': p.rArmX = -1.5; p.lArmX = -1.5; p.rArmZ = -0.6; p.lArmZ = 0.6; break;
    case 'snap': p.rArmX = -2.2; p.rArmZ = 0.3; p.headY = -0.2; break;
    case 'fall': p.lArmZ = -2.4 + Math.sin(t * 25) * 0.5; p.rArmZ = 2.4 + Math.sin(t * 25 + 1) * 0.5; p.lLegX = Math.sin(t * 20) * 0.6; p.rLegX = -Math.sin(t * 20) * 0.6; break;
    case 'float': p.lArmZ = -0.5 + Math.sin(t * 2) * 0.1; p.rArmZ = 0.5 - Math.sin(t * 2) * 0.1; p.lLegX = 0.2; p.rLegX = -0.1; p.bob = Math.sin(t * 2) * 0.3; break;
    case 'kneel': p.lLegX = -1.5; p.rLegX = 0.2; p.bob = -0.9; p.bodyX = 0.15; p.headX = 0.25; break;
    case 'lie': p.bodyX = -1.5; p.bob = -0.4; break;
    case 'swing': { const s = Math.sin(t * 9); p.rArmX = -1.6 + s * 1.2; p.bodyX = 0.15; break; }
    case 'jump': p.lArmX = -2.4; p.rArmX = -2.4; p.lLegX = -0.6; p.rLegX = 0.4; break;
    case 'push': p.rArmX = -1.6; p.lArmX = -1.6; p.bodyX = 0.3; break;
    case 'bow': p.bodyX = 0.5; p.headX = 0.3; break;
    case 'determined': p.lArmZ = -0.25; p.rArmZ = 0.25; p.headX = -0.05; p.lLegX = 0.12; p.rLegX = -0.12; break;
    default: if (talk > 0.1) { p.rArmX = -0.25 + gest * 1.6; p.headZ = gest * 0.3; p.headX = -gest * 0.2; }
  }
  if (moving && !['walk', 'run', 'fall', 'float', 'jump', 'fight'].includes(anim)) walkCycle(9, 0.6);
  u.lArm.rotation.set(p.lArmX, 0, p.lArmZ); u.rArm.rotation.set(p.rArmX, 0, p.rArmZ);
  u.lLeg.rotation.set(p.lLegX, 0, 0); u.rLeg.rotation.set(p.rLegX, 0, 0);
  u.headG.rotation.set(p.headX, p.headY, p.headZ);
  u.g.rotation.set(p.bodyX, 0, p.bodyZ); u.g.position.y = p.bob;
}

export function animChicken(c, t, talk, anim) {
  const u = c.userData; const peck = Math.max(0, Math.sin(t * 5)) ** 6;
  u.headC.rotation.x = peck * 0.5; u.headC.position.z = 1.1 + peck * 0.2; u.headC.rotation.y = Math.sin(t * 2) * 0.25;
  u.beakL.rotation.x = talk > 0.08 ? 0.15 + talk * 0.5 : 0;
  const flap = anim === 'flap' || talk > 0.4 || anim === 'run';
  u.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (flap ? 0.6 + Math.sin(t * 34) * 0.5 : 0.1 + Math.sin(t * 3) * 0.05); });
  c.children.forEach(ch => { if (ch === u.headC) return; });
  return Math.abs(Math.sin(t * (anim === 'run' ? 14 : 3.2))) * (anim === 'run' ? 0.4 : 0.15);
}
export function animVortex(v, t, talk, anim) {
  const u = v.userData; u.halo.rotation.z = t;
  u.eyes.forEach(e => e.scale.set(1, 1 + talk * 1.6, 1));
  u.armL.rotation.set(anim === 'reach' ? -1.6 : Math.sin(t * 0.7) * 0.06, 0, -0.1);
  u.armR.rotation.set(anim === 'reach' || anim === 'point' ? -1.6 : -Math.sin(t * 0.7) * 0.06, 0, 0.1);
  if (anim === 'armsup') { u.armL.rotation.x = -2.8; u.armR.rotation.x = -2.8; }
}
export function animDrone(d, t) {
  const u = d.userData; u.ring.rotation.z = t * 6 + u.ph;
  u.hammer.rotation.z = Math.sin(t * 3 + u.ph) * 0.2;
  return Math.sin(t * 2.2 + u.ph) * 0.25;
}
export function animBot(b, t, talk) {
  const u = b.userData; u.ring.rotation.z = t * 2;
  u.eyes.forEach(e => e.scale.set(1, 1 - (Math.sin(t * 1.7) > 0.98 ? 0.9 : 0) + talk * 0.4, 1));
  return Math.sin(t * 2) * 0.2;
}
