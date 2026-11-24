// Efeitos visuais (explosões do piloto + feixes, faíscas, dissolução).
import { THREE, scene, V, VA, hash, clamp, ss, easeOut, flashLight, glow } from './core.js';

export const PALETTES = {
  fire: [0xfff2b0, 0xff7a1a, 0xff4a10], blue: [0xe8fbff, 0x3ac8ff, 0x9ae8ff], red: [0xfff0a0, 0xff3020, 0xffd020],
  green: [0xf0ffd0, 0x5aff4a, 0xb4ff3a], purple: [0xffe0ff, 0xb45cff, 0xff5ce0], lava: [0xfff2b0, 0xff5a10, 0xffb020],
  gold: [0xffffe0, 0xffc21a, 0xffe680], white: [0xffffff, 0xcfe8ff, 0xffffff], pink: [0xffe0f4, 0xff4ad8, 0xff9ae8],
};
function makeExplosion() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), glow(0xffffff));
  const outer = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), glow(0xffffff));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), glow(0xffffff, { side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2;
  const deb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ emissiveIntensity: 2.2, roughness: .5 }), 30); deb.frustumCulled = false;
  const smoke = [];
  for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x3a3238, transparent: true, depthWrite: false, roughness: 1, flatShading: true })); smoke.push(s); g.add(s); }
  g.add(core, outer, ring, deb); g.visible = false; scene.add(g);
  return { g, core, outer, ring, deb, smoke };
}
const pool = Array.from({ length: 6 }, makeExplosion);
const dummy = new THREE.Object3D();

// feixes verticais (captura / teleporte / chave)
const beams = Array.from({ length: 3 }, () => { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 40, 32, 1, true), glow(0xffffff, { side: THREE.DoubleSide, opacity: 0 })); b.visible = false; scene.add(b); return b; });
// faíscas / partículas de dissolução
const SPARK = 80;
const sparks = Array.from({ length: 3 }, () => { const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), glow(0xffffff), SPARK); m.frustumCulled = false; m.visible = false; scene.add(m); return m; });
// laser entre dois pontos
const lasers = Array.from({ length: 2 }, () => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 8), glow(0xff4ad8)); l.visible = false; scene.add(l); return l; });

// list: [{type, t0, dur, pos(Vector3), pos2, size, pal, color}]
export function updateFx(t, list) {
  let flash = 0, fpos = null, fcol = 0xffaa44, ei = 0, bi = 0, si = 0, li = 0;
  pool.forEach(p => p.g.visible = false); beams.forEach(b => b.visible = false); sparks.forEach(s => s.visible = false); lasers.forEach(l => l.visible = false);
  for (const e of list) {
    const l = t - e.t0;
    if (e.type === 'explosion') {
      if (l < 0 || l > 2.6 || ei >= pool.length) continue;
      const ex = pool[ei++]; const s = e.size || 1.5; const P = PALETTES[e.pal || 'fire']; const i = ei * 7 + Math.floor(e.t0 * 10);
      ex.g.visible = true; ex.g.position.copy(e.pos);
      const k = easeOut(clamp(l / 0.35));
      ex.core.scale.setScalar(s * (0.3 + k * 1.1) * (1 - ss(l, 0.25, 0.7) * 0.6)); ex.core.material.color.setHex(P[0]); ex.core.material.opacity = 0.75 * (1 - ss(l, 0.1, 0.55));
      ex.outer.scale.setScalar(s * (0.5 + easeOut(clamp(l / 0.6)) * 1.9)); ex.outer.material.color.setHex(P[1]); ex.outer.material.opacity = 0.6 * (1 - ss(l, 0.15, 0.9)); ex.outer.rotation.set(l * 2, l * 3, 0);
      ex.ring.scale.setScalar(s * (0.5 + easeOut(clamp(l / 0.7)) * 4)); ex.ring.material.color.setHex(P[2]); ex.ring.material.opacity = 0.8 * (1 - ss(l, 0.1, 0.7));
      ex.deb.material.color.setHex(P[2]); ex.deb.material.emissive.setHex(P[1]);
      for (let j = 0; j < 30; j++) {
        const a = hash(i * 50 + j) * Math.PI * 2, el = hash(i * 50 + j + 0.3) * 1.2 + 0.1, sp = (5 + hash(j + i * 9) * 9) * Math.sqrt(s);
        dummy.position.set(Math.cos(a) * Math.cos(el) * sp * l, Math.sin(el) * sp * l - 9 * l * l, Math.sin(a) * Math.cos(el) * sp * l);
        dummy.rotation.set(l * 7 + j, l * 5, 0); dummy.scale.setScalar(Math.max(0.001, (1 - l / 2.6)) * (0.6 + hash(j) * 1.2) * Math.sqrt(s));
        dummy.updateMatrix(); ex.deb.setMatrixAt(j, dummy.matrix);
      }
      ex.deb.instanceMatrix.needsUpdate = true;
      ex.smoke.forEach((m, j) => {
        const a = j / 9 * Math.PI * 2 + i; const r = s * (0.6 + easeOut(clamp(l / 1.2)) * 1.6);
        m.position.set(Math.cos(a) * r * 0.8, s * 0.3 + l * 1.6 * s * 0.5 + hash(j + i) * s * 0.5, Math.sin(a) * r * 0.8);
        m.scale.setScalar(s * (0.4 + easeOut(clamp((l - 0.1) / 1.4)) * 0.9) * (0.8 + hash(j * 3 + i) * 0.5));
        m.material.opacity = 0.6 * ss(l, 0.08, 0.3) * (1 - ss(l, 0.7, 1.6));
      });
      const f = Math.max(0, 1 - l / 0.6) * s; if (f > flash) { flash = f; fpos = ex.g.position; fcol = P[1]; }
    } else if (e.type === 'beam') {
      const d = e.dur || 1.2; if (l < 0 || l > d || bi >= beams.length) continue;
      const b = beams[bi++]; b.visible = true; b.position.copy(e.pos).add(V(0, 18, 0));
      const o = ss(l, 0, 0.15) * (1 - ss(l, d - 0.4, d)); b.material.opacity = 0.55 * o; b.material.color.setHex(e.color || 0xff2a3a);
      b.scale.set((e.size || 1) * (0.6 + 0.4 * o), 1, (e.size || 1) * (0.6 + 0.4 * o));
      if (o > flash * 0.3) { flash = Math.max(flash, o * 0.8); fpos = e.pos; fcol = e.color || 0xff2a3a; }
    } else if (e.type === 'sparkle' || e.type === 'dissolve' || e.type === 'hit') {
      const d = e.dur || (e.type === 'hit' ? 0.6 : 1.6); if (l < 0 || l > d || si >= sparks.length) continue;
      const m = sparks[si++]; m.visible = true; m.material.color.setHex(e.color || (e.type === 'dissolve' ? 0x9ae8ff : 0xffd23a));
      const k = l / d;
      for (let j = 0; j < SPARK; j++) {
        const a = hash(j * 3.1 + e.t0) * Math.PI * 2, r = hash(j * 1.7 + e.t0) * (e.size || 1.5);
        if (e.type === 'dissolve') dummy.position.set(e.pos.x + Math.cos(a) * r, e.pos.y + hash(j * 5.3) * 5 * (e.size || 1) / 1.5 + k * (2 + hash(j) * 6), e.pos.z + Math.sin(a) * r);
        else { const sp = (e.type === 'hit' ? 6 : 3) * (0.4 + hash(j * 2.3)); dummy.position.set(e.pos.x + Math.cos(a) * sp * k * 1.5, e.pos.y + Math.sin(a * 1.3) * sp * k + (e.type === 'sparkle' ? k * 2 : 0), e.pos.z + Math.sin(a) * sp * k * 1.5); }
        dummy.rotation.set(k * 5 + j, k * 3, 0); dummy.scale.setScalar(Math.max(0.001, (1 - k) * (0.5 + hash(j * 9.1)))); dummy.updateMatrix(); m.setMatrixAt(j, dummy.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    } else if (e.type === 'laser') {
      const d = e.dur || 0.5; if (l < 0 || l > d || li >= lasers.length) continue;
      const L = lasers[li++]; L.visible = true; L.material.color.setHex(e.color || 0xff4ad8);
      const a = e.pos, b = e.pos2; const mid = a.clone().add(b).multiplyScalar(0.5); L.position.copy(mid);
      L.scale.set(1 + Math.sin(l * 60) * 0.3, a.distanceTo(b), 1 + Math.sin(l * 60) * 0.3); L.lookAt(b); L.rotateX(Math.PI / 2);
      L.material.opacity = 1 - ss(l, d * 0.6, d);
    }
  }
  flashLight.intensity = flash * 70; if (fpos) { flashLight.position.copy(fpos).add(V(0, 2, 2)); flashLight.color.setHex(fcol); }
  return flash;
}
