import './style.css'
import { PLACES, WORLD_W, refreshStars, type Place } from './data'
import { R, glow, text, textC, textWidth, rng, ell, bayer, type Ctx } from './px'
import { buildLayers, PAR, type Layers } from './scenery'
import { makeBuildings, type Building } from './buildings'
import { drawLuna, drawPetty, lunaLantern } from './characters'
import { World, drawPond, drawBridgeBack, drawBridgeFront, POND } from './world'
import { Sound } from './audio'
import { UI } from './ui'

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = canvas.getContext('2d', { alpha: false })! as Ctx
const sound = new Sound()
const buildings = makeBuildings()
const world = new World()

let W = 480, H = 270, scale = 3
let L: Layers
let GY = 0
let started = false

const player = { x: PLACES[0].x + 70, vx: 0, dir: 1 as 1 | -1, moving: false, running: false, stepT: 0 }
const pet = { x: player.x - 22, dir: 1 as 1 | -1, moving: false, sitT: 0, bubble: 0 }
let cam = 0
let target: number | null = null
let pending: Place | null = null
let t = 0
const keys = new Set<string>()
const mouse = { x: -999, y: -999, in: false }
const touch = matchMedia('(pointer: coarse)').matches

interface Shoot { x: number; y: number; vx: number; vy: number; life: number }
const shoots: Shoot[] = []
const sparks: { x: number; y: number; vx: number; vy: number; life: number; col: string }[] = []

const ui = new UI(
  {
    onTravel: (p) => { target = p.x - (p.kind === 'home' ? 70 : 0); pending = null; running = true },
    onOpen: (p) => openPlace(p),
    onClose: () => { /* resume */ },
    onStart: () => { started = true },
    spriteFor: (id) => buildings[id]?.sprite ?? null,
  },
  sound,
)
let running = false

function openPlace(p: Place) {
  if (ui.dialogOpen) return
  target = null; pending = null
  player.vx = 0; player.moving = false
  ui.open(p)
}

function resize() {
  const vh = window.innerHeight, vw = window.innerWidth
  scale = Math.max(2, Math.round(vh / 300))
  while (vw / scale < 240 && scale > 2) scale--
  H = Math.ceil(vh / scale)
  W = Math.ceil(vw / scale)
  canvas.width = W; canvas.height = H
  canvas.style.width = W * scale + 'px'
  canvas.style.height = H * scale + 'px'
  document.documentElement.style.setProperty('--scale', String(scale))
  ctx.imageSmoothingEnabled = false
  L = buildLayers(W, H)
  GY = L.GY
  world.build(GY, H)
}
window.addEventListener('resize', resize)
resize()

function placeAt(x: number): Place | null {
  let best: Place | null = null
  let bd = 1e9
  for (const p of PLACES) {
    const d = Math.abs(p.x - x)
    if (d < bd) { bd = d; best = p }
  }
  return best
}

function nearPlace(): Place | null {
  const p = placeAt(player.x)
  return p && Math.abs(p.x - player.x) < 36 ? p : null
}

// ------------------------------------------------------------------ input
window.addEventListener('keydown', (e) => {
  if (!started) return
  const k = e.key.toLowerCase()
  if (ui.dialogOpen) { if (k === 'escape' || k === 'enter' && false) ui.close(); return }
  if (ui.travelOpen) {
    if (k === 'escape' || k === 'm') ui.toggleTravel(false)
    else if (/^[1-9]$/.test(k)) { const p = PLACES[Number(k) - 1]; if (p) { ui.toggleTravel(false); target = p.x - (p.kind === 'home' ? 70 : 0); running = true } }
    return
  }
  if (k === 'm') { ui.toggleTravel(true); return }
  if (['arrowleft', 'arrowright', 'a', 'd', 'shift'].includes(k)) { keys.add(k); target = null; pending = null; e.preventDefault() }
  if (k === 'e' || k === 'enter' || k === ' ') {
    const p = nearPlace()
    if (p) { openPlace(p); e.preventDefault() }
  }
})
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()))
window.addEventListener('blur', () => keys.clear())

function toWorld(clientX: number, clientY: number) {
  const r = canvas.getBoundingClientRect()
  const sx = (clientX - r.left) / scale, sy = (clientY - r.top) / scale
  return { sx, sy, wx: sx + cam, wy: sy }
}

canvas.addEventListener('pointermove', (e) => {
  const { sx, sy, wx } = toWorld(e.clientX, e.clientY)
  mouse.x = wx; mouse.y = sy; mouse.in = true
  const over = !ui.dialogOpen && (hitPlace(wx, sy) || hitMoon(sx, sy) || hitPet(wx, sy))
  canvas.classList.toggle('hand', !!over)
})
canvas.addEventListener('pointerleave', () => { mouse.in = false })

function hitPlace(wx: number, sy: number): Place | null {
  for (const p of PLACES) {
    const b = buildings[p.id]
    if (!b) continue
    const top = GY + 2 - b.h
    if (Math.abs(wx - p.x) < b.w / 2 && sy > top && sy < GY + 30) return p
  }
  return null
}
function hitMoon(sx: number, sy: number) {
  const mx = W * 0.7 - cam * 0.04, my = H * 0.06 + 49
  return Math.hypot(sx - mx, sy - my) < 30
}
function hitPet(wx: number, sy: number) { return Math.abs(wx - pet.x) < 8 && Math.abs(sy - (GY + 14)) < 12 }

canvas.addEventListener('pointerdown', (e) => {
  if (!started || ui.dialogOpen || ui.travelOpen) return
  const { sx, sy, wx } = toWorld(e.clientX, e.clientY)
  if (hitMoon(sx, sy)) { launchStar(); return }
  if (hitPet(wx, sy)) { pet.bubble = 1.6; sound.meow(); return }
  const p = hitPlace(wx, sy)
  if (p) { target = p.x + (Math.abs(p.x - player.x) < 36 ? 0 : (player.x < p.x ? -26 : 26)); pending = p; running = true; if (Math.abs(p.x - player.x) < 36) openPlace(p); return }
  target = Math.max(20, Math.min(WORLD_W - 20, wx)); pending = null; running = false
})

function launchStar() {
  sound.star()
  shoots.push({ x: W * 0.55 + Math.random() * W * 0.4, y: 10 + Math.random() * 20, vx: -120 - Math.random() * 60, vy: 40 + Math.random() * 20, life: 1.2 })
}

// ------------------------------------------------------------------ update
function update(dt: number) {
  const intro = !started
  const left = keys.has('arrowleft') || keys.has('a')
  const right = keys.has('arrowright') || keys.has('d')
  const shift = keys.has('shift')
  let dirIn = 0
  if (!ui.dialogOpen && started) {
    if (left) dirIn -= 1
    if (right) dirIn += 1
    if (dirIn === 0 && target != null) {
      const d = target - player.x
      if (Math.abs(d) < 2) {
        target = null
        if (pending) { const p = pending; pending = null; openPlace(p) }
      } else dirIn = Math.sign(d)
    }
  }
  const run = shift || (target != null && running)
  const speed = run ? 104 : 62
  player.vx = dirIn * speed
  player.moving = dirIn !== 0
  player.running = run && player.moving
  if (player.moving) {
    player.dir = dirIn > 0 ? 1 : -1
    player.x = Math.max(20, Math.min(WORLD_W - 20, player.x + player.vx * dt))
    player.stepT += dt * (run ? 1.7 : 1)
    if (player.stepT > 0.3) { player.stepT = 0; sound.step() }
  } else { player.stepT = 0.2; running = false }

  // pet follows
  const want = player.x - player.dir * 20
  const pd = want - pet.x
  pet.moving = Math.abs(pd) > 3
  if (pet.moving) { pet.dir = pd > 0 ? 1 : -1; pet.x += Math.sign(pd) * Math.min(Math.abs(pd), (Math.abs(pd) > 40 ? 120 : 70) * dt) }
  pet.sitT = pet.moving ? 0 : pet.sitT + dt
  pet.bubble = Math.max(0, pet.bubble - dt)

  // camera
  let want_cam: number
  if (intro) want_cam = 120 + (Math.sin(t * 0.12) * 0.5 + 0.5) * 1700
  else want_cam = player.x - W / 2 + player.dir * 26
  want_cam = Math.max(0, Math.min(WORLD_W - W, want_cam))
  cam += (want_cam - cam) * Math.min(1, dt * (intro ? 0.6 : 4.2))

  world.updateFlies(dt, t, mouse.in ? { x: mouse.x, y: mouse.y } : null)

  // ambient shooting stars
  if (Math.random() < dt * 0.045) launchStar2()
  for (const s of shoots) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt }
  while (shoots.length && shoots[0].life <= 0) shoots.shift()
  for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 40 * dt; s.life -= dt }
  while (sparks.length && sparks[0].life <= 0) sparks.shift()

  if (!intro) ui.showPrompt(ui.dialogOpen ? null : nearPlace(), touch)
}

function launchStar2() {
  shoots.push({ x: W * 0.4 + Math.random() * W * 0.6, y: 6 + Math.random() * 30, vx: -110 - Math.random() * 60, vy: 36 + Math.random() * 20, life: 1.1 })
}

// ------------------------------------------------------------------ render
function drawSky() {
  ctx.drawImage(L.sky, 0, 0)
  // stars
  for (const s of L.stars) {
    const sx = Math.round(((s.x - cam * (0.012 + s.d * 0.03)) % (W + 60) + (W + 60)) % (W + 60) - 30)
    const tw = Math.sin(t * (1 + s.d * 2.5) + s.ph)
    const a = tw > 0.55 ? 1 : tw > -0.4 ? 0.7 : 0.3
    ctx.globalAlpha = a
    ctx.fillStyle = s.col
    if (s.big) {
      ctx.fillRect(sx, s.y, 1, 1)
      if (tw > 0) { ctx.fillRect(sx - 1, s.y, 3, 1); ctx.fillRect(sx, s.y - 1, 1, 3) }
    } else ctx.fillRect(sx, s.y, 1, 1)
  }
  ctx.globalAlpha = 1
  // clouds behind the moon, moon on top so it never gets clipped
  for (let i = 0; i < L.clouds.length; i++) {
    const c = L.clouds[i]
    const span = W + 240
    const x = ((i * 190 + t * (2 + i * 0.7) - cam * (0.1 + i * 0.03)) % span + span) % span - 120
    ctx.globalAlpha = 0.9
    ctx.drawImage(c, Math.round(x), Math.round(H * 0.12 + i * H * 0.08))
  }
  ctx.globalAlpha = 1
  const mx = Math.round(W * 0.7 - cam * 0.04 - L.moon.width / 2)
  const my = Math.round(H * 0.06)
  ctx.drawImage(L.moon, mx, my)
  // shooting stars
  for (const s of shoots) {
    const a = Math.max(0, Math.min(1, s.life))
    for (let k = 0; k < 9; k++) {
      ctx.globalAlpha = a * (1 - k / 9)
      ctx.fillStyle = k < 2 ? '#ffffff' : '#ffe3b0'
      ctx.fillRect(Math.round(s.x - s.vx * 0.012 * k), Math.round(s.y - s.vy * 0.012 * k), 1, 1)
    }
  }
  ctx.globalAlpha = 1
}

function layer(img: HTMLCanvasElement, par: number) {
  ctx.drawImage(img, -Math.floor(cam * par), 0)
}

function drawLabel(b: Building, p: Place, bx: number, by: number) {
  const near = Math.abs(p.x - player.x) < 60
  const label = p.short
  const w = textWidth(label) + 6
  const x = Math.round(bx + b.w / 2 - w / 2)
  const y = Math.round(by - 12 - (near ? Math.round(Math.sin(t * 6) * 1) : 0))
  R(ctx, '#04061a', x - 1, y - 1, w + 2, 11)
  R(ctx, p.color, x, y, w, 9)
  R(ctx, '#ffffff', x, y, w, 1)
  R(ctx, p.dark, x, y + 8, w, 1)
  text(ctx, label, x + 3, y + 2, '#0b0a1a')
  R(ctx, '#04061a', x + Math.floor(w / 2) - 1, y + 9, 3, 2)
  R(ctx, p.color, x + Math.floor(w / 2), y + 9, 1, 1)
}

function render() {
  drawSky()
  layer(L.far, PAR.far)
  layer(L.mid, PAR.mid)
  layer(L.hills, PAR.hills)
  layer(L.near, PAR.near)
  ctx.drawImage(L.ground, -Math.round(cam), GY)

  world.drawBack(ctx, cam, W)

  // pond sits under the bridge, island floats in it
  const island = buildings['island']
  const isx = Math.round(PLACES[1].x - cam - island.w / 2)
  drawPond(ctx, cam, GY, t, [island.sprite], [PLACES[1].x])
  drawBridgeBack(ctx, cam, GY)

  // buildings
  const lightList: { x: number; y: number; r: number; col: string; k: number }[] = []
  for (const p of PLACES) {
    const b = buildings[p.id]
    if (!b) continue
    const bx = Math.round(p.x - cam - b.w / 2)
    if (bx > W + 10 || bx + b.w < -10) continue
    const by = (p.id === 'island' ? GY + 2 : GY + 2) - b.h + (p.id === 'island' ? Math.round(Math.sin(t * 1.4) * 1) : 0)
    ctx.drawImage(b.sprite, bx, by)
    b.dyn?.(ctx, t, bx, by)
    drawLabel(b, p, bx, by + (p.id === 'flare' || p.id === 'tally' ? 0 : 0))
    for (const l of b.lights?.(t) ?? []) lightList.push({ x: bx + l.x, y: by + l.y, r: l.r, col: l.col, k: l.k ?? 1 })
  }
  void isx

  // actors (sorted by feet)
  const feetY = GY + 18
  const px = Math.round(player.x - cam)
  const petx = Math.round(pet.x - cam)
  drawPetty(ctx, petx, GY + 20, { dir: pet.dir, moving: pet.moving, running: false, t, sit: !pet.moving && pet.sitT > 1.2 })
  if (pet.bubble > 0) {
    const bw = textWidth('MRRP!') + 8
    const bx = petx - Math.round(bw / 2), by = GY + 20 - 24
    R(ctx, '#f7edd0', bx, by, bw, 9)
    R(ctx, '#f7edd0', petx - 1, by + 9, 3, 2)
    text(ctx, 'MRRP!', bx + 4, by + 2, '#241a38')
  }
  drawLuna(ctx, px, feetY, { dir: player.dir, moving: player.moving, running: player.running, t })
  const lan = lunaLantern(px, feetY, player.dir, player.moving, t)
  lightList.push({ x: lan.x, y: lan.y, r: 46, col: '#ffd37a', k: 1.1 + Math.sin(t * 9) * 0.08 })
  lightList.push({ x: lan.x, y: lan.y, r: 20, col: '#fff0b8', k: 0.8 })

  drawBridgeFront(ctx, cam, GY)
  world.drawFront(ctx, cam, W, t)

  // lights
  for (const l of world.lights(cam, W)) lightList.push({ ...l, k: 1 + Math.sin(t * 3 + l.x) * 0.04 })
  for (const l of lightList) {
    if (l.x < -80 || l.x > W + 80) continue
    glow(ctx, l.x, l.y, l.r, l.col, l.k)
  }

  // fireflies
  for (const f of world.flies) {
    const sx = Math.round(f.x - cam), sy = Math.round(f.y)
    if (sx < -6 || sx > W + 6) continue
    const on = Math.sin(t * 3 + f.ph * 3) > -0.3
    if (!on) continue
    R(ctx, '#e6ff9a', sx, sy, 1, 1)
    glow(ctx, sx, sy, 8, '#d8ff7a', 0.9)
  }
  for (const s of sparks) { ctx.globalAlpha = Math.max(0, s.life); R(ctx, s.col, Math.round(s.x - cam), Math.round(s.y), 1, 1) }
  ctx.globalAlpha = 1

  // cursor ring on hovered place
  if (mouse.in && !ui.dialogOpen) {
    const p = hitPlace(mouse.x, mouse.y)
    if (p) {
      const b = buildings[p.id]
      const bx = Math.round(p.x - cam - b.w / 2), by = GY + 2 - b.h
      ctx.strokeStyle = p.color
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      ctx.strokeRect(bx - 2.5, by - 2.5, b.w + 5, b.h + 5)
      ctx.setLineDash([])
    }
  }

  // intro dim handled in DOM; end-of-world fade
  if (cam > WORLD_W - W - 1) { /* edge */ }
}

// ------------------------------------------------------------------ loop
let last = performance.now()
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  t += dt
  update(dt)
  render()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

void refreshStars()

// dev-only hook for screenshots: ?at=<x>&open=<id>&still
if (import.meta.env.DEV) {
  const q = new URLSearchParams(location.search)
  if (q.has('still')) document.documentElement.classList.add('still')
  if (q.has('at')) {
    const at = Number(q.get('at'))
    document.getElementById('intro')!.hidden = true
    document.getElementById('hud')!.hidden = false
    started = true
    player.x = at; cam = at - W / 2; pet.x = at - 20
    t = Number(q.get('t') ?? 3)
    const id = q.get('open')
    if (id) { const p = PLACES.find((v) => v.id === id); if (p) window.setTimeout(() => openPlace(p), 200) }
  }
}
void rng; void ell; void bayer; void textC
