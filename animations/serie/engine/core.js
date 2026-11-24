// Núcleo visual da série — mesmo estilo do piloto (renderer, bloom, luzes, materiais).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export { THREE };
export const W = 720, H = 1280;

// ------------------------------------------------------------ utilidades
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const smooth = x => x * x * (3 - 2 * x);
export const ss = (t, a, b) => smooth(seg(t, a, b));
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeOut = x => 1 - Math.pow(1 - x, 3);
export const easeIn = x => x * x * x;
export const easeInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutBack = x => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const VA = a => new THREE.Vector3(a[0], a[1], a[2]);
export const vlerp = (a, b, k) => a.clone().lerp(b, k);

// ------------------------------------------------------------ renderer
export const stage = document.getElementById('stage');
export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.prepend(renderer.domElement);
function fit() { const s = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `translate(-50%,-50%) scale(${s})`; }
addEventListener('resize', fit); fit();

export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x3a1630, 0.0085);
export const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 900);

export const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
export const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.32, 0.45, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ------------------------------------------------------------ luzes (os sets ajustam cores/intensidades)
export const hemi = new THREE.HemisphereLight(0x9a8cff, 0xff6a2a, 1.1); scene.add(hemi);
export const key = new THREE.DirectionalLight(0xfff1dc, 2.6);
key.position.set(14, 26, 18); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 90 });
key.shadow.bias = -0.0008; scene.add(key); scene.add(key.target);
export const rim = new THREE.DirectionalLight(0x6fd0ff, 1.6); rim.position.set(-18, 10, -20); scene.add(rim);
export const fillLight = new THREE.PointLight(0xff5a1a, 260, 60, 1.6); fillLight.position.set(0, -9, 4); scene.add(fillLight);
export const flashLight = new THREE.PointLight(0xffaa44, 0, 50, 1.5); scene.add(flashLight);

// ------------------------------------------------------------ materiais e geometrias
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.0, ...o });
export const rbox = (w, h, d, r = 0.12) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
export const mesh = (geo, m, shadow = true) => { const x = new THREE.Mesh(geo, m); x.castShadow = shadow; x.receiveShadow = true; return x; };
export const glow = (color, o = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, ...o });

export const studTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#9aa1ab'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const cx = x * 64 + 32, cy = y * 64 + 32;
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(cx + 3, cy + 4, 20, 0, 7); g.fill();
    g.fillStyle = '#b4bac3'; g.beginPath(); g.arc(cx, cy, 20, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(cx - 6, cy - 6, 8, 0, 7); g.fill();
  }
});
studTex.wrapS = studTex.wrapT = THREE.RepeatWrapping;
export function studMat(color, rx, ry) {
  const t = studTex.clone(); t.repeat.set(rx, ry); t.needsUpdate = true;
  return mat(color, { map: t });
}
