import { mk, R, bayer, mix, rng, ell, glow, text, type Ctx } from './px'
import { PLACES, WORLD_W } from './data'
import type { Light } from './buildings'

export const POND = { x0: 640, x1: 884 }

function pine(h: number, seed: number) {
  const w = Math.round(h * 0.58) | 1
  const { c, x } = mk(w, h)
  const rand = rng(seed)
  const mid = Math.floor(w / 2)
  R(x, '#3a2410', mid - 1, h - 7, 3, 7)
  R(x, '#5a3a1c', mid + 1, h - 7, 1, 7)
  const layers = Math.max(3, Math.round(h / 12))
  for (let L = 0; L < layers; L++) {
    const top = Math.round((L / layers) * (h - 10)) + 1
    const bot = Math.round(((L + 1.35) / layers) * (h - 10)) + 1
    const maxHalf = Math.round(((L + 1) / layers) * (w / 2 - 0.5)) + 1
    for (let py = top; py < bot; py++) {
      const f = (py - top) / Math.max(1, bot - top)
      const half = Math.max(1, Math.round(maxHalf * (0.25 + f * 0.75)))
      for (let px = -half; px <= half; px++) {
        const sx = mid + px, b = bayer(sx, py)
        let col = '#1f5a55'
        if (px < -half * 0.3 && b < 0.7) col = '#154540'
        if (px > half * 0.45 && b > 0.35) col = '#2f7d6e'
        if (f > 0.8 && b < 0.5) col = '#123a38'
        x.fillStyle = col
        x.fillRect(sx, py, 1, 1)
      }
    }
  }
  for (let i = 0; i < h / 3; i++) R(x, '#3f9a84', mid + Math.floor(rand() * 3) - 1, 2 + Math.floor(rand() * (h - 14)), 1, 1)
  return c
}

function lamp() {
  const { c, x } = mk(14, 50)
  R(x, '#241a38', 6, 12, 2, 38)
  R(x, '#3a2c5e', 7, 12, 1, 38)
  R(x, '#241a38', 4, 46, 6, 4)
  R(x, '#241a38', 3, 4, 8, 2)
  R(x, '#241a38', 3, 12, 8, 2)
  R(x, '#ffd37a', 4, 6, 6, 6)
  R(x, '#fff0b8', 5, 7, 3, 3)
  R(x, '#241a38', 6, 1, 2, 3)
  R(x, '#241a38', 4, 3, 6, 1)
  return c
}

function bench() {
  const { c, x } = mk(30, 16)
  R(x, '#4d3320', 2, 6, 26, 3); R(x, '#7a5230', 2, 6, 26, 1)
  R(x, '#4d3320', 2, 1, 26, 3); R(x, '#7a5230', 2, 1, 26, 1)
  R(x, '#2d1d12', 4, 9, 3, 7); R(x, '#2d1d12', 23, 9, 3, 7)
  R(x, '#2d1d12', 4, 3, 3, 5); R(x, '#2d1d12', 23, 3, 3, 5)
  return c
}

function sign(label: string) {
  const w = label.length * 4 + 14
  const { c, x } = mk(w + 2, 30)
  R(x, '#4d3320', 3, 10, 3, 20)
  R(x, '#7a5230', 3, 10, 1, 20)
  R(x, '#6b4a2d', 0, 2, w - 4, 10)
  R(x, '#8a5e38', 0, 2, w - 4, 1)
  R(x, '#3a2410', 0, 11, w - 4, 1)
  for (let i = 0; i < 5; i++) R(x, '#6b4a2d', w - 4 + i, 2 + i, 1, 10 - i * 2)
  text(x, label, 3, 5, '#f7edd0')
  return c
}

function rock(w: number) {
  const { c, x } = mk(w + 2, 8)
  x.fillStyle = '#2d2b4a'; ell(x, w / 2 + 1, 5, w / 2, 3)
  x.fillStyle = '#4a4670'; ell(x, w / 2, 4, w / 2 - 1, 2)
  R(x, '#6a6694', Math.floor(w / 2) - 2, 3, 2, 1)
  return c
}

export interface Firefly { x: number; y: number; vx: number; vy: number; ph: number }
export interface Blade { x: number; y: number; h: number; ph: number }
export interface Prop { x: number; y: number; img: HTMLCanvasElement; light?: Light }

export class World {
  back: Prop[] = []
  front: Prop[] = []
  blades: Blade[] = []
  flies: Firefly[] = []
  mushrooms: { x: number; y: number; col: string }[] = []
  lampImg = lamp()
  GY = 0

  build(GY: number, H: number) {
    this.GY = GY
    const rand = rng(99)
    const near = (x: number, r: number) => PLACES.some((p) => Math.abs(p.x - x) < r) || (x > POND.x0 - 30 && x < POND.x1 + 30)
    this.back = []; this.front = []; this.blades = []; this.mushrooms = []

    const trees = [pine(34, 1), pine(44, 2), pine(54, 3), pine(64, 4)]
    for (let x = 30; x < WORLD_W - 20; x += 36 + Math.floor(rand() * 70)) {
      if (near(x, 78)) continue
      const img = trees[Math.floor(rand() * trees.length)]
      this.back.push({ x, y: GY + 2 + Math.floor(rand() * 3), img })
    }
    // lamps between places
    const ls = PLACES.map((p) => p.x)
    for (let i = 0; i < ls.length - 1; i++) {
      const x = Math.round((ls[i] + ls[i + 1]) / 2)
      if (x > POND.x0 - 20 && x < POND.x1 + 20) continue
      this.back.push({ x, y: GY + 8, img: this.lampImg, light: { x: 0, y: -44, r: 46, col: '#ffd37a' } })
    }
    this.back.push({ x: 90, y: GY + 8, img: this.lampImg, light: { x: 0, y: -44, r: 46, col: '#ffd37a' } })
    this.back.push({ x: WORLD_W - 70, y: GY + 8, img: this.lampImg, light: { x: 0, y: -44, r: 46, col: '#ffd37a' } })
    // benches
    this.back.push({ x: 440, y: GY + 12, img: bench() })
    this.back.push({ x: 3260, y: GY + 12, img: bench() })
    // signs pointing to the next place
    for (let i = 1; i < PLACES.length; i++) {
      const p = PLACES[i]
      const sx = p.x - (p.id === 'island' ? 150 : 128)
      this.back.push({ x: sx, y: GY + 8, img: sign(p.short) })
    }
    // rocks + glow mushrooms on the foreground strip
    for (let x = 20; x < WORLD_W; x += 60 + Math.floor(rand() * 120)) {
      const y = GY + 34 + Math.floor(rand() * (H - GY - 46))
      if (rand() < 0.5) this.front.push({ x, y, img: rock(5 + Math.floor(rand() * 8)) })
      else this.mushrooms.push({ x, y, col: rand() < 0.5 ? '#9fd8ff' : '#f2a6e8' })
    }
    for (let x = 0; x < WORLD_W; x += 3 + Math.floor(rand() * 3)) {
      this.blades.push({ x, y: GY + 32 + Math.floor(rand() * (H - GY - 34)), h: 3 + Math.floor(rand() * 4), ph: rand() * 6.28 })
    }
    this.flies = []
    for (let i = 0; i < 48; i++) {
      this.flies.push({ x: rand() * WORLD_W, y: GY - 10 + rand() * 60, vx: 0, vy: 0, ph: rand() * 6.28 })
    }
  }

  updateFlies(dt: number, t: number, mouse: { x: number; y: number } | null) {
    for (const f of this.flies) {
      f.vx += Math.cos(t * 0.6 + f.ph) * 6 * dt
      f.vy += Math.sin(t * 0.8 + f.ph * 2) * 6 * dt
      if (mouse) {
        const dx = mouse.x - f.x, dy = mouse.y - f.y
        const d = Math.hypot(dx, dy)
        if (d < 90 && d > 4) { f.vx += (dx / d) * 18 * dt; f.vy += (dy / d) * 18 * dt }
      }
      f.vx *= 0.97; f.vy *= 0.97
      f.x += f.vx * dt * 6; f.y += f.vy * dt * 6
      if (f.y < this.GY - 30) f.vy += 6 * dt
      if (f.y > this.GY + 60) f.vy -= 6 * dt
      if (f.x < 0) f.x = WORLD_W
      if (f.x > WORLD_W) f.x = 0
    }
  }

  drawBack(c: Ctx, cam: number, W: number) {
    for (const p of this.back) {
      const sx = Math.round(p.x - cam - p.img.width / 2)
      if (sx > W || sx + p.img.width < 0) continue
      c.drawImage(p.img, sx, Math.round(p.y - p.img.height))
    }
  }

  drawFront(c: Ctx, cam: number, W: number, t: number) {
    for (const p of this.front) {
      const sx = Math.round(p.x - cam - p.img.width / 2)
      if (sx > W || sx + p.img.width < 0) continue
      c.drawImage(p.img, sx, Math.round(p.y - p.img.height))
    }
    for (const m of this.mushrooms) {
      const sx = Math.round(m.x - cam)
      if (sx < -6 || sx > W + 6) continue
      R(c, '#3a2c5e', sx, m.y - 2, 1, 2)
      R(c, m.col, sx - 1, m.y - 3, 3, 1)
      R(c, '#ffffff', sx, m.y - 3, 1, 1)
    }
    for (const b of this.blades) {
      const sx = Math.round(b.x - cam * 1.12)
      if (sx < -4 || sx > W + 4) continue
      const sw = Math.round(Math.sin(t * 1.8 + b.ph + b.x * 0.01) * 1.2)
      R(c, '#2f7d6e', sx + sw, b.y - b.h, 1, b.h)
      R(c, '#3f9a84', sx, b.y - Math.floor(b.h / 2), 1, Math.ceil(b.h / 2))
    }
  }

  lights(cam: number, W: number): { x: number; y: number; r: number; col: string; k: number }[] {
    const out: { x: number; y: number; r: number; col: string; k: number }[] = []
    for (const p of this.back) {
      if (!p.light) continue
      const sx = p.x - cam
      if (sx < -80 || sx > W + 80) continue
      out.push({ x: sx, y: p.y + p.light.y, r: p.light.r, col: p.light.col, k: 1 })
    }
    return out
  }
}

// ---------------------------------------------------------------- pond + bridge
export function drawPond(c: Ctx, cam: number, GY: number, t: number, reflect: HTMLCanvasElement[], reflectX: number[]) {
  const x0 = Math.round(POND.x0 - cam), x1 = Math.round(POND.x1 - cam)
  const y0 = GY + 3, y1 = GY + 44
  const w = x1 - x0
  // water body with stepped shore
  for (let y = y0; y < y1; y++) {
    const inset = y < y0 + 3 ? 4 - (y - y0) : y > y1 - 4 ? 4 - (y1 - 1 - y) : 0
    const grad = (y - y0) / (y1 - y0)
    R(c, grad < 0.35 ? '#17245a' : grad < 0.7 ? '#122052' : '#0e1946', x0 + inset, y, w - inset * 2, 1)
  }
  // reflections
  c.save()
  c.globalAlpha = 0.28
  for (let i = 0; i < reflect.length; i++) {
    const img = reflect[i]
    const rx = Math.round(reflectX[i] - cam - img.width / 2)
    c.save()
    c.beginPath(); c.rect(x0, y0, w, y1 - y0); c.clip()
    c.translate(0, 0)
    for (let row = 0; row < 18; row++) {
      const off = Math.round(Math.sin(t * 2 + row * 0.9) * 1.4)
      c.drawImage(img, 0, img.height - 1 - row, img.width, 1, rx + off, GY + 10 + 2 + row, img.width, 1)
    }
    c.restore()
  }
  c.restore()
  // ripples
  for (let i = 0; i < 22; i++) {
    const rx = x0 + 6 + ((i * 37 + Math.floor(t * 6 + i * 3)) % (w - 12))
    const ry = y0 + 4 + ((i * 11) % (y1 - y0 - 8))
    const a = (Math.sin(t * 2 + i) * 0.5 + 0.5)
    c.fillStyle = a > 0.55 ? '#3c58a8' : '#27408a'
    c.fillRect(rx, ry, 3 + (i % 3), 1)
  }
  // moon glitter
  for (let i = 0; i < 9; i++) {
    const ry = y0 + 4 + i * 4
    const rx = x0 + w * 0.72 + Math.round(Math.sin(t * 3 + i) * (2 + i * 0.4))
    R(c, '#f7edd0', rx, ry, 2 + (i % 3), 1)
  }
  // shore stones
  for (let i = 0; i < 14; i++) { R(c, '#4a4670', x0 + 2 + i * Math.floor(w / 14), y1 - 3, 3, 2); R(c, '#2d2b4a', x0 + 3 + i * Math.floor(w / 14), y1 - 1, 3, 1) }
}

export function drawBridgeBack(c: Ctx, cam: number, GY: number) {
  const x0 = Math.round(POND.x0 - cam) - 12, x1 = Math.round(POND.x1 - cam) + 12
  const w = x1 - x0
  // back posts + rope
  for (let x = x0 + 2; x < x1; x += 22) { R(c, '#2d1d12', x, GY + 0, 3, 16); R(c, '#7a5230', x, GY + 0, 1, 16) }
  R(c, '#7a5230', x0, GY + 3, w, 1)
  R(c, '#4d3320', x0, GY + 4, w, 1)
  // deck
  R(c, '#6e4a2d', x0, GY + 11, w, 14)
  for (let x = x0; x < x1; x += 5) { R(c, '#4d3320', x, GY + 11, 1, 14); R(c, '#8a5e38', x + 1, GY + 11, 1, 14) }
  R(c, '#8a5e38', x0, GY + 11, w, 1)
  R(c, '#3a2410', x0, GY + 24, w, 2)
}

export function drawBridgeFront(c: Ctx, cam: number, GY: number) {
  const x0 = Math.round(POND.x0 - cam) - 12, x1 = Math.round(POND.x1 - cam) + 12
  for (let x = x0 + 2; x < x1; x += 22) { R(c, '#2d1d12', x, GY + 22, 3, 12); R(c, '#7a5230', x, GY + 22, 1, 12); R(c, '#9b6e42', x - 1, GY + 22, 5, 1) }
}
