export type Ctx = CanvasRenderingContext2D

export function mk(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  const x = c.getContext('2d')!
  x.imageSmoothingEnabled = false
  return { c, x }
}

export const R = (x: Ctx, col: string, px: number, py: number, w: number, h: number) => {
  x.fillStyle = col
  x.fillRect(Math.round(px), Math.round(py), w, h)
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
export const bayer = (x: number, y: number) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16

export function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hex(a)
  const [br, bg, bb] = hex(b)
  const f = (p: number, q: number) => Math.round(p + (q - p) * t).toString(16).padStart(2, '0')
  return `#${f(ar, br)}${f(ag, bg)}${f(ab, bb)}`
}

export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Filled pixel circle (scanline). */
export function disc(x: Ctx, cx: number, cy: number, rad: number) {
  cx = Math.round(cx); cy = Math.round(cy)
  for (let dy = -rad; dy <= rad; dy++) {
    const half = Math.floor(Math.sqrt(rad * rad - dy * dy + 0.25))
    x.fillRect(cx - half, cy + dy, half * 2 + 1, 1)
  }
}

/** Pixel ellipse. */
export function ell(x: Ctx, cx: number, cy: number, rx: number, ry: number) {
  cx = Math.round(cx); cy = Math.round(cy)
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.floor(rx * Math.sqrt(1 - (dy * dy) / (ry * ry + 0.0001)) + 0.3)
    x.fillRect(cx - half, cy + dy, half * 2 + 1, 1)
  }
}

/** Soft additive light made of a few hard-edged steps, so it stays pixel-art. */
export function glow(x: Ctx, cx: number, cy: number, rad: number, col: string, strength = 1) {
  const prev = x.globalCompositeOperation
  x.globalCompositeOperation = 'lighter'
  const [r, g, b] = hex(col)
  const steps = 5
  for (let k = 0; k < steps; k++) {
    const rr = Math.round(rad * (1 - k / steps))
    if (rr < 1) break
    x.fillStyle = `rgba(${r},${g},${b},${0.045 * strength})`
    ell(x, cx, cy, rr, Math.max(1, Math.round(rr * 0.8)))
  }
  x.globalCompositeOperation = prev
}

// 3x5 bitmap font
const GLYPHS: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001110',
  ':': '000010000010000', '!': '010010010000010', '?': '110001010000010', '.': '000000000000010',
  '-': '000000111000000', '+': '000010111010000', '/': '001001010100100', '*': '000101010101000',
  ' ': '000000000000000',
}

export function textWidth(s: string, scale = 1) {
  return s.length * 4 * scale - scale
}

export function text(x: Ctx, s: string, px: number, py: number, col: string, scale = 1) {
  x.fillStyle = col
  let cx = Math.round(px)
  const cy = Math.round(py)
  for (const ch of s.toUpperCase()) {
    const g = GLYPHS[ch] ?? GLYPHS[' ']
    for (let i = 0; i < 15; i++) {
      if (g[i] === '1') x.fillRect(cx + (i % 3) * scale, cy + Math.floor(i / 3) * scale, scale, scale)
    }
    cx += 4 * scale
  }
}

export function textC(x: Ctx, s: string, cx: number, py: number, col: string, scale = 1) {
  text(x, s, cx - textWidth(s, scale) / 2, py, col, scale)
}
