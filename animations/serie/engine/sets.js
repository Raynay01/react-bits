// Cenários da série. Todos seguem a linguagem visual do piloto: blocos arredondados,
// studs, neon, céu em degradê com estrelas, lava com shader, brasas e névoa colorida.
import { THREE, scene, V, mat, rbox, mesh, glow, canvasTex, studMat, hash, clamp, ss, lerp, hemi, key, rim, fillLight, renderer } from './core.js';

// ------------------------------------------------------------ céu configurável
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uTop: { value: new THREE.Color(0x120d38) }, uMid: { value: new THREE.Color(0x8c2a6b) }, uHor: { value: new THREE.Color(0xff7329) },
    uGrid: { value: 0 }, uStars: { value: 1 }, uDark: { value: 0 }, uDarkCol: { value: new THREE.Color(0x1f0005) }, uTime: { value: 0 }, uGlitch: { value: 0 } },
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `varying vec3 vP; uniform vec3 uTop, uMid, uHor, uDarkCol; uniform float uGrid, uStars, uDark, uTime, uGlitch;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      float y = vP.y;
      vec3 c = mix(uHor, uMid, smoothstep(-0.05, 0.18, y));
      c = mix(c, uTop, smoothstep(0.18, 0.7, y));
      vec2 g = floor(vP.xz / (y + 1.2) * 180.);
      c += step(0.996, h(g)) * smoothstep(0.25, 0.6, y) * 0.9 * uStars;
      vec2 q = vec2(atan(vP.z, vP.x) * 6.0, y * 14.0);
      float grid = max(smoothstep(0.96, 1.0, abs(sin(q.x * 3.1416))), smoothstep(0.96, 1.0, abs(sin(q.y * 3.1416))));
      c += vec3(0.6, 0.3, 1.0) * grid * uGrid * (0.4 + 0.6 * smoothstep(0.6, -0.3, y));
      float band = step(0.93, h(vec2(floor(y * 60.0 + uTime * 7.0), floor(uTime * 12.0))));
      c = mix(c, vec3(1.0, 0.1, 0.3) * 1.4, band * uGlitch * 0.6);
      c = mix(c, uDarkCol, uDark);
      gl_FragColor = vec4(c, 1.);
    }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), skyMat); scene.add(sky);

// ------------------------------------------------------------ lava (do piloto)
const LAVA_Y = -14;
const lavaMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uBoil: { value: 0 } },
  vertexShader: `
    uniform float uTime; uniform float uBoil; varying vec3 vW;
    void main(){
      vec3 p = position;
      float w = sin(p.x*0.18 + uTime*1.3)*0.35 + cos(p.y*0.21 - uTime*1.1)*0.35;
      w += sin((p.x+p.y)*0.6 + uTime*4.0)*0.12*(1.0+uBoil*3.0);
      p.z += w;
      vec4 wp = modelMatrix*vec4(p,1.); vW = wp.xyz;
      gl_Position = projectionMatrix*viewMatrix*wp;
    }`,
  fragmentShader: `
    uniform float uTime; uniform float uBoil; varying vec3 vW;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }
    void main(){
      vec2 p = vW.xz*0.09;
      float n = fbm(p + vec2(uTime*0.05, uTime*0.03) + fbm(p*1.7 - uTime*0.08));
      float cracks = smoothstep(0.42, 0.62, n);
      vec3 hot = mix(vec3(1.0,0.22,0.02), vec3(1.0,0.75,0.2), smoothstep(0.62,0.85,n));
      vec3 c = mix(vec3(0.16,0.02,0.01), hot*2.2, cracks);
      c += vec3(1.,.35,.05) * pow(fbm(p*4. + uTime*.4), 3.) * (0.8 + uBoil*2.0);
      float d = length(vW - cameraPosition);
      c = mix(c, vec3(0.32,0.07,0.12), 1.0 - exp(-d*0.0065));
      gl_FragColor = vec4(c, 1.);
    }`
});
function makeLava() { const l = new THREE.Mesh(new THREE.PlaneGeometry(700, 700, 200, 200), lavaMat); l.rotation.x = -Math.PI / 2; l.position.y = LAVA_Y; return l; }

// ------------------------------------------------------------ partículas (brasas / poeira digital)
function makeParticles(color, yBase, height, spread = 90, count = 600, size = 60) {
  const geo = new THREE.BufferGeometry();
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) seed.set([(hash(i) - .5) * spread, (hash(i + 99) - .5) * spread, hash(i + 7), 0.5 + hash(i + 3)], i * 4);
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uBoost: { value: 0 }, uCol: { value: new THREE.Color(color) } },
    vertexShader: `attribute vec4 seed; uniform float uTime; uniform float uBoost; varying float vA;
      void main(){
        float life = fract(seed.z + uTime*0.06*seed.w*(1.+uBoost));
        vec3 p = vec3(seed.x + sin(uTime*0.7+seed.z*30.)*2., ${yBase.toFixed(1)} + life*${height.toFixed(1)}, seed.y + cos(uTime*0.5+seed.z*20.)*2.);
        vA = sin(life*3.1416);
        vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_PointSize = (${size.toFixed(1)}*seed.w) / -mv.z;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: `uniform vec3 uCol; varying float vA; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard;
        gl_FragColor = vec4(uCol*2., vA*(1.-d*2.)); }`
  });
  const p = new THREE.Points(geo, m); p.frustumCulled = false; return p;
}

// ------------------------------------------------------------ peças reutilizáveis
function island(w, d, top = 0x3fbf3f, dirt = 0x8a5a2b, rock = 0x6b4a2a, tree = false) {
  const g = new THREE.Group();
  const grass = mesh(rbox(w, 1, d, 0.2), mat(top)); grass.position.y = 0.5;
  const di = mesh(rbox(w * 0.9, 2.2, d * 0.9, 0.2), mat(dirt)); di.position.y = -1.1;
  const ro = mesh(rbox(w * 0.53, 2.4, d * 0.53, 0.2), mat(rock)); ro.position.y = -3.0;
  g.add(grass, di, ro);
  if (tree) { const tr = mesh(rbox(0.7, 2.5, 0.7, 0.1), mat(0x7a4b22)); tr.position.set(w * 0.2, 2.2, d * 0.13); const lf = mesh(rbox(2.6, 2.2, 2.6, 0.3), mat(0x2fa84f)); lf.position.set(w * 0.2, 4.2, d * 0.13); g.add(tr, lf); }
  return g;
}
function neonBlock(c, w = 2.4, h = 0.7, d = 2.4, ei = 0.55) { return mesh(rbox(w, h, d, 0.15), mat(c, { emissive: c, emissiveIntensity: ei }), false); }
function house(w, h, d, wall, roof) {
  const g = new THREE.Group();
  const body = mesh(rbox(w, h, d, 0.15), mat(wall)); body.position.y = h / 2; g.add(body);
  const r = mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.7, 4), mat(roof)); r.rotation.y = Math.PI / 4; r.position.y = h + h * 0.35; g.add(r);
  const door = mesh(rbox(w * 0.28, h * 0.5, 0.12, 0.05), mat(0x4a2c14)); door.position.set(0, h * 0.25, d / 2 + 0.02); g.add(door);
  for (const s of [-1, 1]) { const win = mesh(rbox(w * 0.2, w * 0.2, 0.1, 0.04), mat(0xffd27a, { emissive: 0xffb84a, emissiveIntensity: 1.1 }), false); win.position.set(s * w * 0.3, h * 0.62, d / 2 + 0.02); g.add(win); }
  return g;
}
function lantern() {
  const g = new THREE.Group();
  const post = mesh(rbox(0.25, 3.2, 0.25, 0.06), mat(0x3a2a1a)); post.position.y = 1.6;
  const lamp = mesh(rbox(0.6, 0.6, 0.6, 0.12), mat(0xffb84a, { emissive: 0xffa030, emissiveIntensity: 1.6 }), false); lamp.position.y = 3.4;
  g.add(post, lamp); return g;
}
function textSign(text, w = 6, h = 1.4, bg = '#2a1a10', fg = '#ffd23b') {
  const tex = canvasTex(512, 120, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 512, 120); g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(6, 6, 500, 108); g.fillStyle = fg; g.font = '900 54px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 64); });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex })); return s;
}
function codeTex(seed, col = '#2a9df4', bg = 'rgba(0,0,0,0)') {
  return canvasTex(256, 256, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 256, 256); g.fillStyle = col; g.font = '700 18px JetBrains Mono';
    for (let y = 0; y < 13; y++) { let s = ''; for (let x = 0; x < 20; x++) s += hash(seed * 31 + y * 20 + x) > 0.5 ? '1' : '0'; g.fillText(s, 6, 20 + y * 19); } });
}

// ------------------------------------------------------------ SETS
export const sets = {};
const lavaShared = makeLava(); scene.add(lavaShared);
const embers = makeParticles(0xff8c26, -14, 30); scene.add(embers);
const motes = makeParticles(0xb48cff, -20, 45, 120, 500, 50); scene.add(motes);

function base(name, build, env) { const g = new THREE.Group(); g.visible = false; scene.add(g); const x = build(g) || {}; sets[name] = { g, env, ...x }; }

// ARENA — a plataforma do piloto sobre a lava
base('arena', (g) => {
  const p = mesh(rbox(9, 1.4, 6.5, 0.2), [mat(0x8b919a), mat(0x8b919a), studMat(0xffffff, 4, 3), mat(0x6c7179), mat(0x8b919a), mat(0x8b919a)]); p.position.y = -0.7; g.add(p);
  for (const s of [-1, 1]) { const st = mesh(rbox(0.5, 0.3, 6.5, 0.08), mat(0xffc400, { emissive: 0x442200 })); st.position.set(s * 4.3, 0.05, 0); g.add(st); }
  for (const [x, z] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) for (let i = 0; i < 30; i++) { const l = mesh(new THREE.TorusGeometry(0.28, 0.08, 6, 12), mat(0x555a63, { metalness: .7, roughness: .35 }), false); l.position.set(x, 1 + i * 0.5, z); l.rotation.y = i % 2 ? Math.PI / 2 : 0; g.add(l); }
  [[-26, 4, -30, 1.4], [30, -2, -42, 1.8], [-40, 8, -70, 2.4], [18, 10, -80, 2.2], [44, 6, -15, 1.5], [-46, 1, -10, 1.6]].forEach(([x, y, z, s], i) => { const isl = island(6, 6, 0x3fbf3f, 0x8a5a2b, 0x6b4a2a, i % 2 === 0); isl.position.set(x, y, z); isl.scale.setScalar(s); g.add(isl); });
}, { lava: true, embers: true, sky: [0x120d38, 0x8c2a6b, 0xff7329], grid: 0, fog: [0x3a1630, 0.0085], hemi: [0x9a8cff, 0xff6a2a, 1.1], key: [0xfff1dc, 2.6], rim: [0x6fd0ff, 1.6], fill: [0xff5a1a, 260, [0, -9, 4]] });

// LIMBO — o vazio dos banidos
base('limbo', (g) => {
  const main = mesh(rbox(22, 2, 14, 0.3), [mat(0x55566a), mat(0x55566a), studMat(0x8e8fa8, 10, 6), mat(0x3a3a4c), mat(0x55566a), mat(0x55566a)]); main.position.y = -1; g.add(main);
  // rachaduras brilhantes
  for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.12 + hash(i) * 0.1, 0.02, 2 + hash(i + 3) * 4), glow(0xb45cff, { opacity: 0.8 })); c.position.set(-9 + i * 3, 0.02, -4 + hash(i + 8) * 8); c.rotation.y = hash(i + 1) * 3; g.add(c); }
  const frags = [];
  for (let i = 0; i < 26; i++) {
    const s = 1 + hash(i) * 3.5; const b = mesh(rbox(s, s * (0.4 + hash(i + 2) * 0.6), s, 0.15), mat(hash(i + 5) > 0.7 ? 0x6b4ba0 : 0x4b4c5e));
    const a = hash(i + 11) * Math.PI * 2, r = 16 + hash(i + 13) * 40;
    b.position.set(Math.cos(a) * r, -8 + hash(i + 17) * 22, Math.sin(a) * r - 10); b.rotation.set(hash(i) * 2, hash(i + 1) * 2, 0);
    b.userData = { y: b.position.y, ph: i }; g.add(b); frags.push(b);
  }
  const glitchCubes = [];
  for (let i = 0; i < 18; i++) { const c = [0xff3bd8, 0x3bf0ff, 0xb45cff][i % 3]; const b = neonBlock(c, 0.8, 0.8, 0.8, 1.2); const a = hash(i + 40) * Math.PI * 2, r = 9 + hash(i + 41) * 26; b.position.set(Math.cos(a) * r, 1 + hash(i + 42) * 12, Math.sin(a) * r - 6); b.userData = { y: b.position.y, ph: i }; g.add(b); glitchCubes.push(b); }
  // grade de "chão" lá embaixo
  const grid = new THREE.GridHelper(600, 120, 0xb45cff, 0x5a2a9a); grid.position.y = -40; grid.material.transparent = true; grid.material.opacity = 0.35; g.add(grid);
  return { frags, glitchCubes };
}, { lava: false, motes: true, sky: [0x07051a, 0x2a0f4a, 0x6a2a8a], grid: 0.32, stars: 1, fog: [0x1c0d33, 0.012], hemi: [0x8a7cff, 0x3a1a5a, 1.0], key: [0xe8e4ff, 2.2], rim: [0xff4ad8, 2.0], fill: [0xb45cff, 120, [0, -6, 6]] });

// VILA DOS BANIDOS
base('vila', (g) => {
  const ground = mesh(rbox(34, 2, 22, 0.3), [mat(0x55566a), mat(0x55566a), studMat(0x7d8a6a, 14, 9), mat(0x3a3a4c), mat(0x55566a), mat(0x55566a)]); ground.position.set(0, -1, -2); g.add(ground);
  const hs = [[-11, -9, 4.5, 4, 4, 0xc9b38a, 0xa83232], [-4, -11, 5, 4.5, 4, 0x8aa0c9, 0x3a5aa8], [5, -10.5, 4, 3.6, 3.6, 0xd2a46a, 0x6b3a1a], [12, -8, 4.6, 4.2, 4, 0xa0c98a, 0x2f7a3a], [-14, 1, 4, 3.6, 3.6, 0xc98aa8, 0x7a2f5a]];
  hs.forEach(([x, z, w, h, d, wall, roof], i) => { const hh = house(w, h, d, wall, roof); hh.position.set(x, 0, z); hh.rotation.y = x > 0 ? -0.3 : 0.3; g.add(hh); });
  const lanterns = [];
  for (const [x, z] of [[-7, -4], [7, -4], [-7, 5], [8, 4], [0, -6]]) { const l = lantern(); l.position.set(x, 0, z); g.add(l); lanterns.push(l); const pl = new THREE.PointLight(0xffa040, 18, 12, 1.8); pl.position.set(x, 3.6, z); g.add(pl); }
  // banca do Zé
  const stall = new THREE.Group();
  const counter = mesh(rbox(5, 1.4, 1.6, 0.12), mat(0x8a5a2b)); counter.position.y = 0.7; stall.add(counter);
  for (const s of [-1, 1]) { const p = mesh(rbox(0.25, 3.6, 0.25, 0.05), mat(0x5a3a1a)); p.position.set(s * 2.3, 1.8, -0.5); stall.add(p); }
  const awn = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.15, 2.4), new THREE.MeshStandardMaterial({ map: canvasTex(256, 64, (gg) => { for (let i = 0; i < 8; i++) { gg.fillStyle = i % 2 ? '#fff' : '#e8243c'; gg.fillRect(i * 32, 0, 32, 64); } }) }));
  awn.position.set(0, 3.7, 0.1); awn.rotation.x = 0.18; awn.castShadow = true; stall.add(awn);
  for (let i = 0; i < 6; i++) { const c = [0xff3b5c, 0x3bb4ff, 0xffd23b, 0x4dff8a, 0xb45cff, 0xff8a1a][i]; const it = neonBlock(c, 0.5, 0.5, 0.5, 0.7); it.position.set(-1.8 + i * 0.72, 1.65, 0.2); stall.add(it); }
  const sign = textSign('ZÉ TIJOLO • VENDE TUDO', 5, 0.8, '#1a0d05', '#ffd23b'); sign.position.set(0, 4.25, 1.3); stall.add(sign);
  stall.position.set(9, 0, 2); stall.rotation.y = -0.5; g.add(stall);
  const vsign = textSign('VILA DOS BANIDOS', 7, 1.4); vsign.position.set(-2, 6.5, -13.2); g.add(vsign);
  for (const s of [-1, 1]) { const pole = mesh(rbox(0.4, 6.6, 0.4, 0.08), mat(0x3a2a1a)); pole.position.set(-2 + s * 3.2, 3.3, -13.3); g.add(pole); }
  // aldeões banidos (NPCs simples)
  const npcCols = [[0xff8a8a, 0x3a3a3a], [0x8ad0ff, 0x4a2a6a], [0xc8ff8a, 0x6a4a2a]];
  npcCols.forEach(([t, l], i) => { const n = new THREE.Group(); const b = mesh(rbox(2, 2, 1, .1), mat(t)); b.position.y = 3; const hd = mesh(rbox(1.2, 1.2, 1.2, .3), mat(0xe8c4a0)); hd.position.y = 4.7; const lg = mesh(rbox(2, 2, 1, .1), mat(l)); lg.position.y = 1; n.add(b, hd, lg); n.position.set([-12, -9, 14][i], 0, [-3, 7, -2][i]); n.rotation.y = [0.6, 2.5, -0.9][i]; n.scale.setScalar(0.95); g.add(n); });
  const frags = [];
  for (let i = 0; i < 14; i++) { const s = 1.5 + hash(i + 70) * 3; const b = mesh(rbox(s, s * 0.6, s, 0.15), mat(0x4b4c5e)); const a = hash(i + 71) * Math.PI * 2, r = 30 + hash(i + 72) * 30; b.position.set(Math.cos(a) * r, -4 + hash(i + 73) * 18, Math.sin(a) * r - 15); b.userData = { y: b.position.y, ph: i }; g.add(b); frags.push(b); }
  return { frags, stall };
}, { motes: true, sky: [0x0d0826, 0x3a1652, 0xa8456a], grid: 0.35, stars: 1, fog: [0x2a1438, 0.01], hemi: [0xa89cff, 0x5a3a2a, 1.15], key: [0xffe2c4, 2.2], rim: [0xff7ac8, 1.6], fill: [0xffa040, 40, [0, 12, 16]] });

// TORRE DO OBBY — sobre a lava
base('torre', (g) => {
  const steps = [];
  const P = [[0, -0.5, 0, 6, 4], [5, 3, -2, 2.6, 2.6], [8, 6.5, -6, 2.6, 2.6], [5, 10, -10.5, 2.4, 2.4], [0, 13.5, -12, 2.4, 2.4], [-5, 17, -10, 2.4, 2.4], [-8, 20.5, -6, 2.6, 2.6], [-5, 24, -1.5, 2.6, 2.6], [0, 27.5, 0, 6, 4.5]];
  P.forEach(([x, y, z, w, d], i) => { const c = [0x8b919a, 0xff3b5c, 0x3bb4ff, 0xffd23b, 0x4dff8a, 0xb45cff, 0xff8a1a, 0x3bf0ff, 0x8b919a][i]; const b = i === 0 || i === 8 ? mesh(rbox(w, 1, d, 0.18), [mat(c), mat(c), studMat(0xffffff, w / 2, d / 2), mat(c), mat(c), mat(c)]) : neonBlock(c, w, 0.8, d, 0.5); b.position.set(x, y, z); b.userData = { y, ph: i }; g.add(b); steps.push(b); });
  // paredes de laser
  const lasers = [];
  for (const [x, y, z, ry] of [[6.5, 5, -4, 0.8], [-6.5, 19, -8, -0.8]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.12), glow(0xff2030)); l.position.set(x, y, z); l.rotation.y = ry; g.add(l); lasers.push(l); }
  // portal no topo
  const portal = new THREE.Group();
  const ringP = new THREE.Mesh(new THREE.TorusGeometry(3, 0.35, 12, 48), mat(0x2a2a3a, { emissive: 0x46e0ff, emissiveIntensity: 1.4 }));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.7, 48), new THREE.ShaderMaterial({ transparent: true, uniforms: { uTime: { value: 0 } }, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec2 vUv; uniform float uTime; void main(){ vec2 p=vUv-.5; float r=length(p); float a=atan(p.y,p.x); float s=sin(a*6.+r*30.-uTime*6.); vec3 c=mix(vec3(.1,.6,1.),vec3(.9,.3,1.),.5+.5*s); gl_FragColor=vec4(c*1.6,(1.-smoothstep(.45,.5,r))*.92); }' }));
  portal.add(ringP, disc); portal.position.set(0, 33.5, -5); g.add(portal);
  const pl = new THREE.PointLight(0x46e0ff, 40, 25, 1.6); pl.position.set(0, 33, -2); g.add(pl);
  return { steps, lasers, portal, disc };
}, { lava: true, embers: true, sky: [0x120d38, 0x8c2a6b, 0xff7329], fog: [0x3a1630, 0.0075], hemi: [0x9a8cff, 0xff6a2a, 1.1], key: [0xfff1dc, 2.4], rim: [0x6fd0ff, 1.8], fill: [0xff5a1a, 320, [0, -6, 6]] });

// PRISÃO DO VÓRTEX — espaço de código branco
base('prisao', (g) => {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xeef3fb, roughness: .7, map: canvasTex(256, 256, (gg) => { gg.fillStyle = '#eef3fb'; gg.fillRect(0, 0, 256, 256); gg.strokeStyle = '#9ccfff'; gg.lineWidth = 3; gg.strokeRect(0, 0, 256, 256); }) }));
  floor.material.map.wrapS = floor.material.map.wrapT = THREE.RepeatWrapping; floor.material.map.repeat.set(50, 50);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const panels = [];
  for (let i = 0; i < 22; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ map: codeTex(i, '#2a9df4'), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })); const a = hash(i + 90) * Math.PI * 2, r = 10 + hash(i + 91) * 22; p.position.set(Math.cos(a) * r, 2 + hash(i + 92) * 12, Math.sin(a) * r - 4); p.lookAt(0, p.position.y, 0); p.userData = { y: p.position.y, ph: i }; g.add(p); panels.push(p); }
  // jaulas de laser (duas: Noob e Vovô)
  const cages = [];
  for (const [x, z] of [[-3.2, -1], [3.2, -1]]) {
    const c = new THREE.Group();
    const bars = [];
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 6.4, 0.08), glow(0xff2a3a, { opacity: 0.85 })); b.position.set(Math.cos(a) * 2.1, 3.2, Math.sin(a) * 2.1); c.add(b); bars.push(b); }
    const top = mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.4, 24), mat(0x2a2a3a, { emissive: 0xff2a3a, emissiveIntensity: .4 })); top.position.y = 6.6; c.add(top);
    const bot = mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.3, 24), mat(0x2a2a3a)); bot.position.y = 0.15; c.add(bot);
    c.position.set(x, 0, z); g.add(c); cages.push({ g: c, bars });
  }
  const wall = mesh(rbox(30, 14, 1, 0.2), mat(0xdfe6f2, { roughness: .8 })); wall.position.set(0, 7, -12); g.add(wall);
  return { panels, cages, wall };
}, { sky: [0xb8c8e8, 0xe6edf8, 0xffffff], grid: 0.0, stars: 0, fog: [0xdfe7f5, 0.008], hemi: [0xffffff, 0x8a9ab8, 0.9], key: [0xffffff, 2.4], rim: [0x9ccfff, 1.2], fill: [0xff2a3a, 30, [0, 9, 9]] });

// SERVIDOR PRINCIPAL — mundo diurno que pode ser "deletado"
base('servidor', (g) => {
  const tiles = [];
  const N = 9, S = 6;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const t = mesh(rbox(S, 1.2, S, 0.08), [mat(0x3c8f3c), mat(0x3c8f3c), studMat(0x58c24f, 3, 3), mat(0x2f6f2f), mat(0x3c8f3c), mat(0x3c8f3c)]);
    t.position.set((i - (N - 1) / 2) * S, -0.6, (j - (N - 1) / 2) * S - 6); t.userData = { base: t.position.clone(), d: Math.hypot(i - 4, j - 4) + hash(i * 9 + j) * 2, i, j }; g.add(t); tiles.push(t);
  }
  const props = [];
  const spawn = mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.4, 32), mat(0xffffff, { map: canvasTex(256, 256, (gg) => { gg.fillStyle = '#1e88e5'; gg.fillRect(0, 0, 256, 256); gg.fillStyle = '#fff'; gg.beginPath(); gg.arc(128, 128, 70, 0, 7); gg.fill(); gg.fillStyle = '#1e88e5'; gg.font = '900 90px Inter'; gg.textAlign = 'center'; gg.fillText('S', 128, 160); }) }));
  spawn.position.set(0, 0.2, 0); g.add(spawn); props.push(spawn);
  [[-12, -16, 6, 5, 5, 0xe8e0d0, 0xc0392b], [12, -18, 7, 6, 5, 0xd0e0e8, 0x2c5aa0], [-15, 4, 5, 4, 4, 0xf0d8a8, 0x7a4a1a], [15, 2, 5, 4.5, 4, 0xe8d0e0, 0x8a2f6a]].forEach(([x, z, w, h, d, wa, ro]) => { const hh = house(w, h, d, wa, ro); hh.position.set(x, 0, z); hh.rotation.y = -Math.atan2(x, z + 6) + Math.PI; g.add(hh); props.push(hh); });
  for (const [x, z] of [[-6, -20], [7, -24], [-20, -8], [20, -10], [-9, 10], [10, 12]]) { const tr = new THREE.Group(); const tk = mesh(rbox(0.9, 3, 0.9, 0.1), mat(0x7a4b22)); tk.position.y = 1.5; const lf = mesh(rbox(3.2, 3, 3.2, 0.4), mat(0x2fa84f)); lf.position.y = 4.4; tr.add(tk, lf); tr.position.set(x, 0, z); g.add(tr); props.push(tr); }
  const clouds = [];
  for (let i = 0; i < 10; i++) { const c = new THREE.Group(); for (let k = 0; k < 3; k++) { const b = mesh(rbox(4 + k, 1.6, 3, 0.6), mat(0xffffff, { roughness: 1 }), false); b.position.set(k * 2.2 - 2, k === 1 ? 0.6 : 0, 0); c.add(b); } c.position.set(-60 + i * 14, 22 + hash(i + 200) * 10, -40 - hash(i + 201) * 30); c.userData = { x: c.position.x }; g.add(c); clouds.push(c); }
  // jogadores do servidor (NPCs) — fogem em pânico durante o Reset
  const npcs = [];
  const cols = [[0xff6b6b, 0x2b2b33, 0xf5cd30], [0x6bc5ff, 0x3a2a6a, 0xeac4a0], [0x9bff6b, 0x5a3a1a, 0xd9a47a], [0xffb86b, 0x1a4a6a, 0xf1c9a8], [0xd66bff, 0x2b2b33, 0xf5cd30]];
  cols.forEach(([t, l, h], i) => { const n = new THREE.Group(); const b = mesh(rbox(2, 2, 1, .1), mat(t)); b.position.y = 3; const hd = mesh(rbox(1.2, 1.2, 1.2, .3), mat(h)); hd.position.y = 4.7; const lg = mesh(rbox(2, 2, 1, .1), mat(l)); lg.position.y = 1; const al = mesh(rbox(1, 2, 1, .1), mat(h)); al.position.set(-1.5, 3, 0); const ar = mesh(rbox(1, 2, 1, .1), mat(h)); ar.position.set(1.5, 3, 0); n.add(b, hd, lg, al, ar); n.position.set(-14 + i * 7, 0, -9 - (i % 2) * 5); n.userData = { x: n.position.x, z: n.position.z, ph: i }; g.add(n); npcs.push(n); });
  return { tiles, props, clouds, npcs, spawn };
}, { sky: [0x2f7bf0, 0x7cc0ff, 0xd8f0ff], grid: 0, stars: 0, fog: [0xbfe3ff, 0.006], hemi: [0xdff0ff, 0x6a8a4a, 1.5], key: [0xfff6e0, 3.0], rim: [0xffffff, 1.0], fill: [0xffffff, 0, [0, 5, 5]] });

// ------------------------------------------------------------ aplicação do set e efeitos de ambiente
let current = null;
const tmpC = new THREE.Color();
export function useSet(name) {
  if (current === name) return sets[name];
  for (const k in sets) sets[k].g.visible = k === name;
  const e = sets[name].env;
  lavaShared.visible = !!e.lava; embers.visible = !!e.embers; motes.visible = !!e.motes;
  skyMat.uniforms.uTop.value.setHex(e.sky[0]); skyMat.uniforms.uMid.value.setHex(e.sky[1]); skyMat.uniforms.uHor.value.setHex(e.sky[2]);
  skyMat.uniforms.uGrid.value = e.grid || 0; skyMat.uniforms.uStars.value = e.stars ?? 1;
  scene.fog.color.setHex(e.fog[0]); scene.fog.density = e.fog[1];
  hemi.color.setHex(e.hemi[0]); hemi.groundColor.setHex(e.hemi[1]); hemi.intensity = e.hemi[2];
  key.color.setHex(e.key[0]); key.intensity = e.key[1]; rim.color.setHex(e.rim[0]); rim.intensity = e.rim[1];
  fillLight.color.setHex(e.fill[0]); fillLight.intensity = e.fill[1]; fillLight.position.set(...e.fill[2]);
  current = name; return sets[name];
}
export function currentSet() { return current; }

// env: { quake, dark, glitch, reset(0..1), boil }
export function updateSet(t, env = {}) {
  const S = sets[current]; if (!S) return;
  const q = env.quake || 0;
  skyMat.uniforms.uTime.value = t; skyMat.uniforms.uDark.value = env.dark || 0; skyMat.uniforms.uGlitch.value = env.glitch || 0;
  lavaMat.uniforms.uTime.value = t; lavaMat.uniforms.uBoil.value = q;
  embers.material.uniforms.uTime.value = t; embers.material.uniforms.uBoost.value = q;
  motes.material.uniforms.uTime.value = t; motes.material.uniforms.uBoost.value = q;
  const bob = (arr, a = 0.8, sp = 0.6) => arr && arr.forEach(b => { b.position.y = b.userData.y + Math.sin(t * sp + b.userData.ph) * a + Math.sin(t * 23 + b.userData.ph) * q * 0.5; b.rotation.y += 0.002; });
  bob(S.frags); bob(S.glitchCubes, 1.2, 0.9); bob(S.panels, 0.5, 0.5);
  if (S.glitchCubes) S.glitchCubes.forEach((b, i) => { b.visible = Math.sin(t * 3 + i * 7) > -0.85; });
  if (S.disc) S.disc.material.uniforms.uTime.value = t;
  if (S.lasers) S.lasers.forEach((l, i) => { l.position.x = (i ? -6.5 : 6.5) + Math.sin(t * 2 + i) * 1.4; });
  if (S.steps) S.steps.forEach((b, i) => { if (i > 0 && i < 8) b.position.y = b.userData.y + Math.sin(t * 1.5 + i) * 0.15; });
  if (S.clouds) S.clouds.forEach(c => { c.position.x = c.userData.x + t * 0.8; });
  if (S.tiles) {   // Grande Reset: o chão se desfaz do centro para fora
    const r = env.reset || 0;
    S.tiles.forEach(tl => {
      const thr = (1 - r) * 9; const k = clamp((tl.userData.d - thr) / 1.5);
      const u = tl.userData; tl.position.set(u.base.x, u.base.y - k * k * 30 + Math.sin(t * 20 + u.d) * q * 0.08, u.base.z);
      tl.rotation.set(k * (hash(u.i) - .5) * 2, 0, k * (hash(u.j) - .5) * 2); tl.visible = k < 0.98;
    });
    S.props.forEach((p, i) => { const k = clamp(((env.reset || 0) * 10 - 3 - (i % 5)) / 2); p.position.y = -k * k * 20; p.visible = k < 0.98; });
    S.npcs.forEach((n, i) => { const panic = env.panic || 0; n.position.x = n.userData.x + Math.sin(t * 3 + i) * 3 * panic; n.position.y = Math.abs(Math.sin(t * 10 + i)) * 0.5 * panic; n.rotation.y = panic ? Math.sin(t * 2 + i) * 3 : 0; n.visible = !(env.npcsGone > i * 0.2); });
  }
  if (S.cages && env.cages) S.cages.forEach((c, i) => { const v = env.cages[i] ?? 1; c.g.visible = v > 0.01; c.bars.forEach((b, j) => { b.scale.y = v; b.material.opacity = 0.85 * v * (0.8 + 0.2 * Math.sin(t * 20 + j)); }); });
}
export { LAVA_Y };
