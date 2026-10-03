import { mk, R, bayer, hex, mix, rng, disc, ell, type Ctx } from './px'
import { WORLD_W } from './data'

export const SKY = ['#070a1c', '#0c1030', '#141848', '#1f2060', '#2f2a74', '#463583', '#68428c', '#8d5290', '#b4678f', '#d98588']

export interface Layers {
  sky: HTMLCanvasElement
  moon: HTMLCanvasElement
  far: HTMLCanvasElement
  mid: HTMLCanvasElement
  hills: HTMLCanvasElement
  near: HTMLCanvasElement
  ground: HTMLCanvasElement
  clouds: HTMLCanvasElement[]
  stars: { x: number; y: number; d: number; ph: number; big: boolean; col: string }[]
  W: number
  H: number
  GY: number
}

export const PAR = { far: 0.1, mid: 0.2, hills: 0.38, near: 0.62 }

function noise1d(seed: number, len: number, octaves: number[]) {
  const rand = rng(seed)
  const out = new Float32Array(len)
  for (const period of octaves) {
    const pts: number[] = []
    for (let i = 0; i < Math.ceil(len / period) + 2; i++) pts.push(rand())
    for (let x = 0; x < len; x++) {
      const i = Math.floor(x / period)
      const f = (x / period) - i
      const s = f * f * (3 - 2 * f)
      out[x] += (pts[i] * (1 - s) + pts[i + 1] * s) * (period / octaves[0])
    }
  }
  let mx = 0
  for (const v of out) mx = Math.max(mx, v)
  for (let i = 0; i < len; i++) out[i] /= mx
  return out
}

function buildSky(W: number, H: number, GY: number) {
  const { c, x } = mk(W, H)
  const img = x.createImageData(W, H)
  const ramp = SKY.map(hex)
  const horizon = GY - 4
  for (let py = 0; py < H; py++) {
    const t = Math.min(1, py / horizon)
    const f = Math.pow(t, 1.35) * (ramp.length - 1)
    const i = Math.min(ramp.length - 2, Math.floor(f))
    const frac = f - i
    for (let px = 0; px < W; px++) {
      const col = frac > bayer(px, py) ? ramp[i + 1] : ramp[i]
      const o = (py * W + px) * 4
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255
    }
  }
  x.putImageData(img, 0, 0)
  return c
}

function buildMoon() {
  const R0 = 24
  const halo = 40
  const S = (R0 + halo) * 2 + 2
  const { c, x } = mk(S, S)
  const img = x.createImageData(S, S)
  const cx = S / 2, cy = S / 2
  const craters = [[-8, -6, 6], [9, 3, 5], [-3, 11, 4], [5, -12, 3], [-13, 6, 3]]
  const light = hex('#fbf3d6'), mid = hex('#e4d6a4'), dark = hex('#bba97b')
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const dx = px - cx + 0.5, dy = py - cy + 0.5
      const d = Math.sqrt(dx * dx + dy * dy)
      const o = (py * S + px) * 4
      if (d <= R0) {
        // light from upper-left
        const lit = 1 - Math.max(0, Math.min(1, (dx * 0.6 + dy * 0.8) / R0 * 0.5 + 0.45))
        let col = lit > 0.62 ? light : lit > bayer(px, py) * 0.62 + 0.08 ? mid : dark
        for (const [ox, oy, rr] of craters) {
          const cd = Math.hypot(dx - ox, dy - oy)
          if (cd < rr) col = cd > rr - 1.2 ? dark : (bayer(px, py) > 0.5 ? mid : dark)
        }
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255
      } else if (d < R0 + halo) {
        const k = 1 - (d - R0) / halo
        if (k * k * 0.9 > bayer(px, py)) {
          img.data[o] = 255; img.data[o + 1] = 232; img.data[o + 2] = 180; img.data[o + 3] = 46
        }
      }
    }
  }
  x.putImageData(img, 0, 0)
  return c
}

function ridge(width: number, height: number, baseY: number, seed: number, octaves: number[], amp: number, col: string, rim: string, trees: boolean, treeCol?: string) {
  const { c, x } = mk(width, height)
  const n = noise1d(seed, width, octaves)
  const rand = rng(seed + 9)
  const tops: number[] = []
  for (let px = 0; px < width; px++) {
    const top = Math.round(baseY - n[px] * amp)
    tops.push(top)
    R(x, col, px, top, 1, height - top)
    // rim light on the side that faces the moon (right-facing slopes)
    const prev = tops[px - 1] ?? top
    if (top <= prev) R(x, rim, px, top, 1, 1)
  }
  // dithered base fade so layers sink into fog
  for (let py = baseY - 6; py < baseY + 2; py++)
    for (let px = 0; px < width; px++)
      if (bayer(px, py) < 0.35 && py >= tops[px]) R(x, mix(col, '#3a3a78', 0.35), px, py, 1, 1)
  if (trees) {
    const tc = treeCol ?? col
    for (let px = 4; px < width - 4; px += 3 + Math.floor(rand() * 7)) {
      if (rand() < 0.2) continue
      const h = 8 + Math.floor(rand() * 11)
      const top = tops[px]
      for (let i = 0; i < h; i++) {
        const half = Math.floor((i / h) * 4) + (i % 3 === 2 ? 1 : 0)
        R(x, tc, px - half, top - h + i + 2, half * 2 + 1, 1)
      }
      R(x, tc, px, top, 1, 2)
      R(x, rim, px + 1, top - h + 2, 1, 1)
    }
  }
  return c
}

function buildFar(wide: number, H: number, GY: number) {
  const w = Math.ceil(WORLD_W * PAR.far + wide + 80)
  const c = ridge(w, H, GY - 34, 11, [180, 70, 26, 9], 78, '#2a2565', '#4a3f8f', false)
  const x = c.getContext('2d')!
  // far village lights
  const rand = rng(77)
  for (let i = 0; i < 46; i++) {
    const px = Math.floor(rand() * w)
    const py = GY - 34 - Math.floor(rand() * 6)
    x.fillStyle = rand() < 0.5 ? '#ffd37a' : '#ffb48a'
    x.fillRect(px, py + 8 + Math.floor(rand() * 14), 1, 1)
  }
  return c
}

function buildMid(wide: number, H: number, GY: number) {
  const w = Math.ceil(WORLD_W * PAR.mid + wide + 80)
  return ridge(w, H, GY - 20, 23, [140, 52, 20, 8], 58, '#1b1b4f', '#33307a', true, '#17184a')
}

function buildHills(wide: number, H: number, GY: number) {
  const w = Math.ceil(WORLD_W * PAR.hills + wide + 80)
  return ridge(w, H, GY - 8, 41, [120, 44, 17], 40, '#141a45', '#26306a', true, '#10163c')
}

function buildNear(wide: number, H: number, GY: number) {
  const w = Math.ceil(WORLD_W * PAR.near + wide + 80)
  return ridge(w, H, GY + 2, 53, [90, 33, 14], 26, '#10183a', '#1f2c5c', true, '#0d1433')
}

function buildGround(H: number, GY: number) {
  const gh = H - GY + 6
  const { c, x } = mk(WORLD_W, gh)
  const rand = rng(5)
  // base soil / grass body
  R(x, '#1b3f4a', 0, 0, WORLD_W, gh)
  // path
  const PY0 = 4, PY1 = 30
  R(x, '#4a4666', 0, PY0, WORLD_W, PY1 - PY0)
  for (let py = PY0; py < PY1; py++)
    for (let px = 0; px < WORLD_W; px++) {
      const b = bayer(px, py)
      if (py < PY0 + 5 && b < 0.45) R(x, '#3a3858', px, py, 1, 1)
      else if (b > 0.9) R(x, '#5c5880', px, py, 1, 1)
      else if (b < 0.1) R(x, '#3a3858', px, py, 1, 1)
    }
  // cobbles
  for (let k = 0; k < 2600; k++) {
    const px = Math.floor(rand() * WORLD_W), py = PY0 + 4 + Math.floor(rand() * (PY1 - PY0 - 6))
    R(x, '#65618a', px, py, 2, 1)
    R(x, '#34324f', px + 1, py + 1, 2, 1)
  }
  // path edges
  R(x, '#2f2d49', 0, PY1, WORLD_W, 1)
  R(x, '#7a7699', 0, PY0, WORLD_W, 1)
  // grass line at the very top (behind buildings)
  R(x, '#2f7d6e', 0, 0, WORLD_W, 2)
  R(x, '#3f9a84', 0, 0, WORLD_W, 1)
  for (let px = 0; px < WORLD_W; px += 2) if (rand() < 0.5) R(x, '#3f9a84', px, -1 + 0, 1, 1)
  // foreground grass
  for (let py = PY1 + 1; py < gh; py++)
    for (let px = 0; px < WORLD_W; px++) {
      const t = (py - PY1) / (gh - PY1)
      const b = bayer(px, py)
      const base = t < 0.4 ? '#245a58' : t < 0.75 ? '#1c4852' : '#163a47'
      R(x, b < 0.12 ? '#2f7d6e' : b > 0.92 ? '#12303d' : base, px, py, 1, 1)
    }
  for (let k = 0; k < 900; k++) {
    const px = Math.floor(rand() * WORLD_W), py = PY1 + 2 + Math.floor(rand() * (gh - PY1 - 4))
    R(x, '#3f9a84', px, py, 1, 2)
    R(x, '#2f7d6e', px + 1, py + 1, 1, 1)
  }
  // flowers
  const fc = ['#ffd37a', '#ef6f55', '#8aa4f0', '#f7edd0', '#c58be0']
  for (let k = 0; k < 220; k++) {
    const px = Math.floor(rand() * WORLD_W), py = PY1 + 3 + Math.floor(rand() * (gh - PY1 - 6))
    R(x, fc[Math.floor(rand() * fc.length)], px, py, 1, 1)
  }
  return c
}

function buildClouds() {
  const out: HTMLCanvasElement[] = []
  const rand = rng(31)
  for (let n = 0; n < 4; n++) {
    const w = 70 + Math.floor(rand() * 60), h = 14 + Math.floor(rand() * 8)
    const { c, x } = mk(w, h)
    const bumps = 5 + Math.floor(rand() * 3)
    for (let i = 0; i < bumps; i++) {
      const cx = 8 + (i / bumps) * (w - 16), cy = h - 5 - rand() * 4, rr = 4 + Math.floor(rand() * 4)
      x.fillStyle = '#3a3380'
      ell(x, cx, cy, rr + 4, rr)
    }
    const src = x.getImageData(0, 0, w, h).data
    for (let py = 0; py < h; py++)
      for (let px = 0; px < w; px++) {
        if (src[(py * w + px) * 4 + 3] === 0) continue
        const lit = py < h * 0.5 && bayer(px, py) > 0.35
        const low = py > h * 0.72 && bayer(px, py) < 0.6
        x.fillStyle = lit ? '#6d5aa8' : low ? '#2a2668' : '#3a3380'
        x.fillRect(px, py, 1, 1)
      }
    out.push(c)
  }
  return out
}

export function buildLayers(W: number, H: number): Layers {
  const GY = H - 62
  const rand = rng(2)
  const stars: Layers['stars'] = []
  const n = Math.floor((W * H) / 520)
  for (let i = 0; i < n; i++) {
    const y = Math.floor(rand() * (GY - 40))
    const d = rand()
    stars.push({
      x: Math.floor(rand() * (W + 60)), y, d, ph: rand() * 6.28,
      big: rand() < 0.07, col: rand() < 0.2 ? '#ffe3b0' : rand() < 0.3 ? '#a9c4ff' : '#ffffff',
    })
  }
  return {
    sky: buildSky(W, H, GY), moon: buildMoon(),
    far: buildFar(W, H, GY), mid: buildMid(W, H, GY), hills: buildHills(W, H, GY), near: buildNear(W, H, GY),
    ground: buildGround(H, GY), clouds: buildClouds(), stars, W, H, GY,
  }
}

export { disc }
export type { Ctx }
