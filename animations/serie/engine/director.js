// Diretor: interpreta o roteiro do episódio (eventos com tempos vindos da dublagem)
// e controla personagens, câmera, efeitos e interface a cada quadro.
import { THREE, scene, camera, composer, renderer, V, VA, vlerp, clamp, seg, ss, lerp, easeOut, easeInOut, easeOutBack, hash } from './core.js';
import { buildCast, cast, setFace, applyAnim, animChicken, animVortex, animDrone, animBot, setOpacity } from './characters.js';
import { useSet, updateSet, sets } from './sets.js';
import { updateFx } from './fx.js';

export const WHO = {
  noob: ['Noob', '#2f8be0'], pro: ['xX_ProGamer_Xx', '#e8243c'], luna: ['Luna_Exe', '#9b4dff'], pipoca: ['Pipoca2017', '#ff8a1a'],
  vovo: ['Vovô Byte', '#c99a10'], ze: ['Zé Tijolo', '#2f7a3a'], vortex: ['VÓRTEX', '#7a0014'], sistema: ['SISTEMA', '#1e88e5'], drone: ['BAN-BOT', '#30303a'],
  chicken: ['xX_ProGamer_Xx', '#e8243c'], vbot: ['VÓRTEX', '#1e88e5'],
};
const SUB_COLOR = { noob: '#ffe14d', pro: '#ffffff', luna: '#e6c9ff', pipoca: '#ffd08a', vovo: '#fff3c4', ze: '#c8ffb0', vortex: '#ff4a5a', sistema: '#8fd8ff', drone: '#ff8a8a', chicken: '#ffffff', vbot: '#8fd8ff' };
const EMO_FACE = { neutro: 'neutral', calmo: 'smile', ironia: 'smug', alegria: 'happy', empolgado: 'happy', raiva: 'angry', grito: 'angry', medo: 'scared', desespero: 'scared', tristeza: 'sad', choro: 'cry', surpresa: 'shock', sussurro: 'neutral', ameaca: 'angry', orgulho: 'smug' };
const DEFAULT_FACE = { noob: 'smile', pipoca: 'happy' };
const BODY = (c) => (c.startsWith('drone') ? 'drone' : c);
const HEAD_Y = { noob: 4.7, pro: 4.7, luna: 4.7, pipoca: 4.7 * 0.72, vovo: 4.7 * 0.96, ze: 4.7 * 1.05, chicken: 4.5, vortex: 4.8, vbot: 0.2, drone1: 0, drone2: 0, drone3: 0, drone4: 0 };

let EP, TL, LIPS = {};
const $ = id => document.getElementById(id);

export async function load(ep, timeline) {
  EP = ep; TL = timeline; LIPS = timeline.lips || {};
  buildCast();
  EP.events.forEach((e, i) => { e.start = TL.events[i].start; e.end = TL.events[i].end; e.i = i; });
  EP.duration = TL.duration;
  // pré-calcula efeitos com tempos absolutos
  EP.fxList = [];
  EP.events.forEach(e => (e.fx || []).forEach(f => EP.fxList.push({ ...f, t0: e.start + offset(f.at, e) })));
  $('epTitle').innerHTML = `<small>EPISÓDIO ${EP.n}</small>${EP.title}`;
}
function offset(at, e) { if (at === undefined) return 0; if (at === 'end') return e.end - e.start; if (typeof at === 'string' && at.startsWith('end')) return e.end - e.start + parseFloat(at.slice(3)); return at; }

const lip = (who, t) => { const a = LIPS[who]; if (!a) return 0; const f = t * 30; const i = Math.floor(f); const v = lerp(a[i] || 0, a[i + 1] || 0, f - i); return clamp(v * 1.4); };
const toV = (p, fb) => (p ? (Array.isArray(p) ? VA(p) : p) : fb);

// ------------------------------------------------------------ estado dos personagens no tempo t
function charStates(t, idx) {
  const st = {};
  for (let i = 0; i <= idx; i++) {
    const e = EP.events[i]; const ch = e.chars || {};
    for (const name in ch) {
      const c = ch[name]; const s = st[name] || (st[name] = { pos: V(0, 0, 0), rot: 0, anim: 'idle', face: null, vis: true, props: {}, opacity: 1, scale: 1 });
      const prevPos = s.pos.clone(), prevRot = s.rot;
      if (c.pos) s.pos = VA(c.pos);
      if (c.rot !== undefined) s.rot = c.rot * Math.PI / 180;
      if (c.anim !== undefined) s.anim = c.anim;
      if (c.face !== undefined) s.face = c.face;
      if (c.vis !== undefined) s.vis = c.vis;
      if (c.scale !== undefined) s.scale = c.scale;
      if (c.props) Object.assign(s.props, c.props);
      if (c.glitch !== undefined) s.glitch = c.glitch;
      s.look = c.look !== undefined ? c.look : s.look;
      // fade de opacidade ao longo do evento
      if (c.opacity !== undefined) { const from = s.opacity; const k = i === idx ? ss(t, e.start + (c.fadeAt || 0), e.start + (c.fadeAt || 0) + (c.fade || 0.6)) : 1; s.opacity = lerp(from, c.opacity, k); }
      if (c.to) {   // deslocamento durante o evento
        const d0 = e.start + (c.delay || 0); const d1 = c.dur ? d0 + c.dur : e.end;
        const kk = i === idx ? clamp((t - d0) / Math.max(0.01, d1 - d0)) : 1;
        const ek = c.ease === 'out' ? easeOut(kk) : c.ease === 'linear' ? kk : easeInOut(kk);
        const from = s.pos.clone(); const to = VA(c.to);
        s.pos = vlerp(from, to, ek); if (c.arc) s.pos.y += Math.sin(ek * Math.PI) * c.arc;
        s.moving = i === idx && kk > 0 && kk < 1 && !c.arc;
        if (c.rot === undefined && c.look === undefined && i === idx && kk < 1 && from.distanceTo(to) > 0.3 && !c.noTurn) s.rot = Math.atan2(to.x - from.x, to.z - from.z);
        if (kk >= 1 || i < idx) { s.moving = false; if (c.endRot !== undefined) s.rot = c.endRot * Math.PI / 180; }
      } else if (i === idx) s.moving = false;
      if (c.spin && i === idx) s.spin = (t - e.start) * c.spin; else if (i === idx) s.spin = 0;
      if (c.fall && i === idx) s.fallK = clamp((t - e.start) / (e.end - e.start));
    }
  }
  // "look": vira para outro personagem ou ponto
  for (const n in st) { const s = st[n]; if (s.look && !s.moving) { const tgt = Array.isArray(s.look) ? V(s.look[0], 0, s.look[1]) : st[s.look]?.pos; if (tgt) s.rot = Math.atan2(tgt.x - s.pos.x, tgt.z - s.pos.z); } }
  return st;
}

// ------------------------------------------------------------ câmera
let lastCam = null;
const _w = new THREE.Vector3();
function headOf(name, st) {
  const s = st[name]; const c = cast[name];
  if (!s) return V(0, 4, 0);
  if (c && c.visible) {   // posição real da cabeça (inclui pose: ajoelhado, deitado, pulando...)
    if (c.userData.headG) { c.userData.headG.getWorldPosition(_w); return _w.clone().add(V(0, 0.62 * (c.userData.scale || 1) * (s.scale || 1), 0)); }
    if (c.userData.headC) { c.userData.headC.getWorldPosition(_w); return _w.clone(); }
    if (name === 'vortex') return c.position.clone().add(V(0, 4.8 * c.scale.y, 0));
    return c.position.clone();
  }
  return s.pos.clone().add(V(0, (HEAD_Y[name] ?? 4.7) * (s.scale || 1), 0));
}
// folga entre a linha de visão (câmera -> alvo) e os outros personagens; < 0 = obstruído
function clearance(pos, look, st, except) {
  const d = look.clone().sub(pos); const L = d.length(); d.normalize(); let best = 99;
  for (const n in st) {
    if (n === except || !st[n].vis || !cast[n] || !cast[n].visible || n === 'vortex') continue;
    const sc = (st[n].scale || 1) * (cast[n].userData.scale || 1); const drone = n.startsWith('drone');
    const r = (drone ? 1.0 : 1.95) * sc;
    const ctr = cast[n].position.clone().add(V(0, drone ? 0 : 3.0 * sc, 0));
    const k = clamp(ctr.clone().sub(pos).dot(d), 0, L - 0.6); const p = pos.clone().add(d.clone().multiplyScalar(k));
    best = Math.min(best, p.distanceTo(ctr) - r, pos.distanceTo(ctr) - (drone ? 1.8 : 3.4) * sc);
  }
  return best;
}
function frontDir(name, st) { const s = st[name]; const r = s ? s.rot : 0; return V(Math.sin(r), 0, Math.cos(r)); }
function evalCam(spec, st, k) {
  const c = { ...spec, ...(spec.to && typeof spec.to === 'object' && !Array.isArray(spec.to) ? {} : {}) };
  const res = (sp) => {
    let pos, look, fov = sp.fov || 38;
    if (sp.type === 'close' || sp.type === 'low' || sp.type === 'xclose') {
      const H = headOf(sp.on, st); const f = frontDir(sp.on, st); const side = sp.side ?? 1; const ang0 = (sp.ang ?? 0.45) * side;
      const dist = (sp.dist ?? (sp.type === 'xclose' ? 3.6 : 5.6)) * (st[sp.on]?.scale || 1) * (cast[sp.on]?.userData.scale || 1) * (sp.on === 'vortex' ? 7.5 : 1);
      look = H.clone().add(V(0, sp.type === 'low' ? 0.3 : (sp.lookH ?? -0.2), 0)); fov = sp.fov || (sp.type === 'low' ? 46 : 36);
      let bestC = -1e9, bestP = null;
      for (const a of [ang0, -ang0, ang0 * 0.2, ang0 * 2, -ang0 * 2, 1.15 * side, -1.15 * side, 1.5 * side, -1.5 * side]) {
        const dir = f.clone().applyAxisAngle(V(0, 1, 0), a);
        const p = H.clone().add(dir.multiplyScalar(dist)).add(V(0, sp.type === 'low' ? -2.2 : (sp.h ?? 0.05), 0));
        const c = clearance(p, look, st, sp.on);
        if (c > 0.2) { bestP = p; break; }
        if (c > bestC) { bestC = c; bestP = p; }
      }
      pos = bestP;
    } else if (sp.type === 'two' || sp.type === 'ots') {
      const A = headOf(sp.a || sp.from, st), B = headOf(sp.b || sp.to, st);
      const mid = A.clone().add(B).multiplyScalar(0.5); const ab = B.clone().sub(A); const L = Math.max(1.5, ab.length());
      const perp = V(-ab.z, 0, ab.x).normalize().multiplyScalar(sp.side ?? 1);
      if (sp.type === 'two') { pos = mid.clone().add(perp.multiplyScalar(L * 1.1 + (sp.dist ?? 6.5))).add(V(0, sp.h ?? 0.8, 0)); look = mid.clone().add(V(0, sp.lookH ?? -0.9, 0)); fov = sp.fov || 44; }
      else { pos = A.clone().sub(ab.clone().normalize().multiplyScalar(sp.dist ?? 3.4)).add(perp.multiplyScalar(1.7)).add(V(0, sp.h ?? 0.6, 0)); look = B.clone().add(V(0, -0.5, 0)); fov = sp.fov || 40; }
    } else if (sp.type === 'group' || sp.type === 'wide') {
      const names = sp.on ? (Array.isArray(sp.on) ? sp.on : [sp.on]) : null;
      let ctr = sp.at ? VA(sp.at) : V(0, 2.5, 0);
      if (names) { ctr = V(0, 0, 0); names.forEach(n => ctr.add(headOf(n, st))); ctr.multiplyScalar(1 / names.length); ctr.y -= 1.2; }
      const ang = sp.ang ?? 0; const dist = sp.dist ?? 16;
      pos = ctr.clone().add(V(Math.sin(ang) * dist, sp.h ?? 3, Math.cos(ang) * dist)); look = ctr.clone().add(V(0, sp.lookH ?? 0, 0)); fov = sp.fov || 44;
    } else { pos = VA(sp.pos); look = VA(sp.look); fov = sp.fov || 44; }
    return { pos, look, fov };
  };
  const a = res(spec);
  if (spec.end) {   // movimento de câmera dentro do plano
    const b = res({ ...spec, ...spec.end }); const e = easeInOut(k);
    return { pos: vlerp(a.pos, b.pos, e), look: vlerp(a.look, b.look, e), fov: lerp(a.fov, b.fov, e), roll: lerp(spec.roll || 0, spec.end.roll ?? spec.roll ?? 0, e) };
  }
  if (spec.push) { const d = a.pos.clone().sub(a.look); a.pos = a.look.clone().add(d.multiplyScalar(1 - spec.push * easeInOut(k))); }
  if (spec.orbit) { const d = a.pos.clone().sub(a.look).applyAxisAngle(V(0, 1, 0), spec.orbit * easeInOut(k)); a.pos = a.look.clone().add(d); }
  if (spec.rise) a.pos.y += spec.rise * easeInOut(k);
  a.roll = spec.roll || 0;
  return a;
}
function cameraFor(idx, st) {
  // procura o plano ativo: evento atual com 'cam', ou automático pela fala, ou o último plano
  const e = EP.events[idx];
  if (e.cam) return { spec: e.cam, e };
  if (e.say && cast[e.say] && !['sistema', 'drone'].includes(e.say)) return { spec: { type: e.say === 'vortex' ? 'low' : 'close', on: e.say, side: idx % 2 ? 1 : -1, ang: 0.4 }, e };
  for (let j = idx - 1; j >= 0; j--) { const p = EP.events[j]; if (p.cam || (p.say && cast[p.say] && !['sistema', 'drone'].includes(p.say))) { return cameraFor(j, st); } }
  return { spec: { type: 'wide', at: [0, 2, 0], dist: 16 }, e };
}

// ------------------------------------------------------------ interface
let countdown = null;
function updateUI(t, idx, shake) {
  const e = EP.events[idx];
  // título do episódio
  const tt = $('epTitle'); tt.style.opacity = 1 - ss(t, 2.6, 3.1); tt.style.transform = `scale(${lerp(1.25, 1, easeOut(seg(t, 0, 0.35)))})`;
  $('logo').style.opacity = 1 - ss(t, 2.6, 3.1);
  // legendas
  let L = null;
  for (let i = idx; i >= Math.max(0, idx - 1); i--) { const ev = EP.events[i]; if (ev.say && t >= ev.start && t <= ev.end + 0.2) { L = ev; break; } }
  const sub = $('sub');
  if (L) {
    const who = L.as || L.say; const [name, col] = WHO[who] || [who, '#333'];
    $('who').textContent = name; $('who').style.background = col;
    const words = L.text.split(' '); const n = Math.ceil(clamp((t - L.start) / ((L.end - L.start) * 0.8)) * words.length);
    $('txt').textContent = words.slice(0, Math.max(1, n)).join(' ');
    $('txt').style.color = SUB_COLOR[who] || '#fff';
    const pop = easeOutBack(seg(t, L.start, L.start + 0.18));
    sub.style.opacity = 1; sub.style.transform = `scale(${lerp(0.6, 1, pop)}) translate(${shake.x * 3}px, ${shake.y * 3}px)`;
  } else sub.style.opacity = 0;
  // elementos de UI programados
  const ui = { toast: null, kick: null, banner: null, broadcast: null, menu: null, wanted: null, flash: 0, black: 0 };
  countdown = null;
  for (let i = 0; i <= idx; i++) {
    const ev = EP.events[i];
    for (const u of ev.ui || []) {
      const t0 = ev.start + offset(u.at, ev); const t1 = u.dur ? t0 + u.dur : (u.type === 'countdown' ? 1e9 : ev.end);
      if (u.type === 'countdown') { if (t >= t0) countdown = u.text ? { ...u, t0 } : null; continue; }
      if (t < t0 || t > t1 + 0.4) continue;
      const k = { t0, t1, ...u };
      if (u.type === 'flash') ui.flash = Math.max(ui.flash, (u.amount ?? 1) * (1 - seg(t, t0, t1)));
      else if (u.type === 'black') ui.black = Math.max(ui.black, ss(t, t0, t0 + (u.fade ?? 0)) * (u.dur ? 1 - ss(t, t1, t1 + 0.01) : 1));
      else ui[u.type] = k;
    }
  }
  const show = (el, k, build) => { if (!k) { el.style.opacity = 0; return; } el.style.opacity = (1 - ss(t, k.t1, k.t1 + 0.3)); if (build) build(); };
  show($('toast'), ui.toast, () => { const k = ui.toast; $('toast').style.background = k.color || 'rgba(15,15,25,.92)'; $('toastTxt').innerHTML = k.text; $('toast').style.transform = `translateY(${lerp(-160, 0, easeOutBack(seg(t, k.t0, k.t0 + 0.35)))}px)`; });
  show($('kick'), ui.kick, () => { const k = ui.kick; $('kickHd').textContent = k.title || 'DESCONECTADO'; $('kickBd').innerHTML = k.text; $('kick').style.transform = `scale(${easeOutBack(seg(t, k.t0, k.t0 + 0.3))})`; });
  show($('banner'), ui.banner, () => { const k = ui.banner; $('bannerTxt').innerHTML = k.text; $('bannerSub').innerHTML = k.sub || ''; $('banner').style.transform = `scale(${lerp(1.8, 1, easeOutBack(seg(t, k.t0, k.t0 + 0.35)))})`; $('bannerTxt').style.color = k.color || '#fff'; });
  show($('broadcast'), ui.broadcast, () => { $('bcLabel').textContent = ui.broadcast.label || 'TRANSMISSÃO • VÓRTEX'; $('broadcast').style.setProperty('--off', `${(t * 80) % 8}px`); });
  show($('menu'), ui.menu, () => { const k = ui.menu; $('menu').style.transform = `perspective(900px) rotateX(${lerp(-70, 0, easeOutBack(seg(t, k.t0, k.t0 + 0.4)))}deg)`; const b = $('adminBadge'); b.innerHTML = k.text || b.innerHTML; b.style.transform = `scale(${easeOutBack(seg(t, k.t0 + 0.6, k.t0 + 0.95))})`; b.style.opacity = seg(t, k.t0 + 0.6, k.t0 + 0.7); });
  show($('wanted'), ui.wanted, () => { const k = ui.wanted; $('wanted').style.transform = `rotate(-4deg) scale(${easeOutBack(seg(t, k.t0, k.t0 + 0.35))})`; });
  const cd = $('countdown');
  if (countdown) { cd.style.opacity = 1; $('cdTxt').textContent = countdown.text; $('cdLbl').textContent = countdown.label || 'GRANDE RESET'; const pulse = 1 + 0.08 * Math.max(0, 1 - ((t % 1) / 0.25)); cd.style.transform = `scale(${pulse * easeOutBack(seg(t, countdown.t0, countdown.t0 + 0.3))})`; }
  else cd.style.opacity = 0;
  $('flash').style.opacity = ui.flash;
  // final: CONTINUA / FIM
  const endT = EP.duration - (EP.endCard ?? 3.2);
  const black = Math.max(ui.black, t >= endT ? 1 : 0);
  $('black').style.opacity = black;
  const ec = $('endCard'); ec.style.opacity = t >= endT + 0.25 ? 1 : 0;
  if (t >= endT) {
    const pk = easeOutBack(seg(t, endT + 0.25, endT + 0.6)); const gl = Math.sin(t * 70) > 0.75;
    $('endMain').textContent = EP.n === 10 ? 'FIM' : 'CONTINUA...';
    $('endNext').innerHTML = EP.next ? `PRÓXIMO: <b>EP. ${EP.n + 1} — ${EP.next}</b>` : 'OBRIGADO POR ASSISTIR!';
    $('endMain').style.transform = `scale(${lerp(2.2, 1, pk)}) translateX(${gl ? 8 : 0}px) rotate(-3deg)`;
    $('endNext').style.opacity = ss(t, endT + 0.8, endT + 1.1);
  }
  return black >= 1;
}

// ------------------------------------------------------------ quadro
export function renderAt(t) {
  t = clamp(t, 0, EP.duration - 1e-3);
  let idx = 0; for (let i = 0; i < EP.events.length; i++) if (t >= EP.events[i].start) idx = i;
  const ev = EP.events[idx]; const local = t - ev.start; const k = clamp(local / Math.max(0.01, ev.end - ev.start));
  // set e ambiente
  let setName = EP.set; let env = { quake: 0, dark: 0, glitch: 0, reset: 0, panic: 0, cages: [1, 1] };
  for (let i = 0; i <= idx; i++) {
    const e = EP.events[i]; if (e.set) setName = e.set;
    if (e.env) { const kk = i === idx ? ss(t, e.start, e.start + (e.env.ramp ?? 0.8)) : 1; for (const n in e.env) if (n !== 'ramp') { if (Array.isArray(e.env[n])) env[n] = e.env[n].map((v, j) => lerp(env[n][j] ?? 1, v, kk)); else env[n] = lerp(env[n] ?? 0, e.env[n], kk); } }
  }
  useSet(setName); updateSet(t, env);
  // personagens
  const st = charStates(t, idx);
  for (const name in cast) {
    const c = cast[name]; const s = st[name];
    if (!s || !s.vis) { c.visible = false; continue; }
    c.visible = true;
    const speaking = ev.say && (ev.say === name || (ev.say === 'pro' && name === 'chicken') || (ev.say === 'vortex' && name === 'vbot' && st.vbot?.vis)) && t <= ev.end;
    const who = name === 'chicken' ? 'pro' : name;
    const m = lip(who, t);
    c.position.copy(s.pos); c.rotation.set(0, s.rot, 0);
    if (s.spin) c.rotateZ(s.spin);
    const B = BODY(name);
    if (c.userData.prop) { c.scale.setScalar(s.scale); continue; }
    if (B === 'drone') { c.position.y += animDrone(c, t); c.scale.setScalar(s.scale); continue; }
    if (name === 'chicken') { c.position.y += animChicken(c, t, m, s.anim); c.scale.setScalar(s.scale); continue; }
    if (name === 'vortex') { animVortex(c, t, m, s.anim); c.scale.setScalar(s.scale); c.userData.light.intensity = 300 * s.opacity; c.traverse(o => { if (o.material) { o.material.transparent = s.opacity < 1; o.material.opacity = s.opacity; } }); continue; }
    if (name === 'vbot') { c.position.y += animBot(c, t, m); c.scale.setScalar(s.scale); continue; }
    // avatares humanos
    c.scale.setScalar((c.userData.scale || 1) * s.scale);
    let face = speaking ? (ev.face || EMO_FACE[ev.emo] || 'neutral') : (s.face || DEFAULT_FACE[name] || 'neutral');
    let anim = s.anim; if (speaking && anim === 'idle') anim = 'talk';
    applyAnim(c, anim, t, local, speaking ? m : 0, s.moving);
    setFace(c, face, speaking ? m : 0, t);
    setOpacity(c, s.opacity);
    const P = c.userData.props || {};
    if (P.burger) P.burger.visible = !!s.props.burger;
    if (P.crown) { P.crown.visible = !!s.props.crown; P.crown.rotation.y = t * 1.5; }
    if (P.key) { P.key.visible = !!s.props.key; P.key.position.y = 3.2 + Math.sin(t * 2) * 0.15; P.key.rotation.y = t * 2; P.key.userData.halo.material.opacity = 0.14 + 0.08 * Math.sin(t * 6); P.key.scale.setScalar(0.6 * (s.props.keyBig || 1)); }
    if (P.aura) { P.aura.visible = !!s.props.aura; P.aura.material.opacity = 0.4 + 0.15 * Math.sin(t * 6); P.aura.rotation.z = t * 2; }
    if (P.sword) P.sword.visible = !!s.props.sword;
    if (P.tablet) P.tablet.visible = !!s.props.tablet;
    if (P.whip) { P.whip.visible = !!s.props.whip; P.whip.userData.beam.material.opacity = 0.7 + 0.3 * Math.sin(t * 30); }
    if (c.userData.feather) c.userData.feather.visible = !!s.props.feather;
    c.userData.g.position.x = s.glitch && Math.sin(t * 53) > 0.82 ? 0.25 : 0;
  }
  // efeitos (posições podem referenciar personagens)
  const fx = EP.fxList.filter(f => t >= f.t0 - 0.01 && t <= f.t0 + (f.dur || 2.6) + 0.1).map(f => ({ ...f, pos: f.on ? headOf(f.on, st).add(V(0, (f.dy ?? -1.5), 0)) : toV(f.pos, V(0, 2, 0)), pos2: f.on2 ? headOf(f.on2, st).add(V(0, -1, 0)) : toV(f.pos2, V(0, 2, 0)) }));
  const flash = updateFx(t, fx);
  // câmera
  const { spec, e } = cameraFor(idx, st);
  const ck = clamp((t - e.start) / Math.max(0.01, e.end - e.start));
  const cam = evalCam(spec, st, ck);
  const exShake = EP.fxList.reduce((a, f) => a + (f.type === 'explosion' ? Math.max(0, 1 - Math.abs(t - f.t0 - 0.1) / 0.4) * (f.size || 1.5) * 0.06 : 0), 0);
  let shk = (env.quake || 0) * 0.18 + exShake;
  for (let i = 0; i <= idx; i++) for (const s of EP.events[i].shake ? [EP.events[i].shake] : []) { const t0 = EP.events[i].start + offset(s.at, EP.events[i]); shk += (s.amp || 0.3) * Math.max(0, 1 - (t - t0) / (s.dur || 0.6)) * (t >= t0 ? 1 : 0); }
  const shake = { x: (hash(Math.floor(t * 30)) - .5) * 2 * shk, y: (hash(Math.floor(t * 30) + 77) - .5) * 2 * shk };
  cam.pos.x += shake.x; cam.pos.y += shake.y;
  camera.position.copy(cam.pos); camera.fov = cam.fov; camera.updateProjectionMatrix(); camera.lookAt(cam.look); camera.rotateZ((cam.roll || 0) + shake.x * 0.05);
  const allBlack = updateUI(t, idx, shake);
  if (!allBlack) composer.render(); else { renderer.setClearColor(0x000000); renderer.clear(); }
}
