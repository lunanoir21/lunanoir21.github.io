import { mk, R, bayer, mix, rng, ell, disc, glow, text, textC, type Ctx } from './px'

export interface Light { x: number; y: number; r: number; col: string; k?: number }

export interface Building {
  id: string
  w: number
  h: number
  sprite: HTMLCanvasElement
  /** animated overlay, drawn at the sprite's top-left screen position */
  dyn?: (c: Ctx, t: number, x: number, y: number) => void
  /** lights relative to sprite top-left */
  lights?: (t: number) => Light[]
}

const WARM = '#ffd37a'
const WARM2 = '#ffb454'

function bricks(x: Ctx, px: number, py: number, w: number, h: number, base: string, dark: string, light: string, bw = 6, bh = 4) {
  R(x, base, px, py, w, h)
  for (let j = 0; j < h; j += bh) {
    R(x, dark, px, py + j, w, 1)
    const off = ((j / bh) & 1) * Math.floor(bw / 2)
    for (let i = -off; i < w; i += bw) {
      if (i >= 0) R(x, dark, px + i, py + j, 1, bh)
      const lx = i + 1
      if (lx >= 0 && lx < w - 1 && j + 1 < h) R(x, light, px + lx, py + j + 1, Math.min(3, bw - 2), 1)
    }
  }
}

function planks(x: Ctx, px: number, py: number, w: number, h: number, base: string, dark: string, light: string) {
  R(x, base, px, py, w, h)
  for (let i = 0; i < w; i += 4) {
    R(x, dark, px + i, py, 1, h)
    R(x, light, px + i + 1, py, 1, h)
  }
  for (let j = 7; j < h; j += 11) R(x, dark, px, py + j, w, 1)
}

function gable(x: Ctx, cx: number, top: number, w: number, h: number, a: string, b: string, rim: string) {
  for (let i = 0; i < h; i++) {
    const half = Math.round((w / 2) * (i + 1) / h)
    R(x, a, cx - half, top + i, half * 2, 1)
    if (i % 4 === 3) R(x, b, cx - half, top + i, half * 2, 1)
    const row = Math.floor(i / 4)
    for (let k = cx - half + ((row & 1) ? 2 : 0); k < cx + half; k += 5) R(x, b, k, top + i, 1, i % 4 === 3 ? 1 : 3 - (i % 4 === 0 ? 0 : 1) > 0 ? 1 : 0)
    R(x, rim, cx + half - 1, top + i, 1, 1)
    R(x, mix(a, '#000000', 0.25), cx - half, top + i, 1, 1)
  }
  R(x, rim, cx - 1, top, 2, 1)
}

function win(x: Ctx, px: number, py: number, w: number, h: number, lit = true, frame = '#241a38') {
  R(x, frame, px - 1, py - 1, w + 2, h + 2)
  if (lit) {
    R(x, WARM, px, py, w, Math.ceil(h / 2))
    R(x, WARM2, px, py + Math.ceil(h / 2), w, Math.floor(h / 2))
  } else {
    R(x, '#1a2146', px, py, w, h)
    R(x, '#2a3466', px, py, 1, h)
  }
  R(x, frame, px + Math.floor(w / 2), py, 1, h)
  R(x, frame, px, py + Math.floor(h / 2), w, 1)
}

function door(x: Ctx, px: number, py: number, w: number, h: number, base = '#b87b3e', frame = '#3a2410') {
  R(x, frame, px - 1, py - 1, w + 2, h + 1)
  R(x, base, px, py, w, h)
  R(x, mix(base, '#000000', 0.25), px + Math.floor(w / 2), py, 1, h)
  R(x, mix(base, '#ffffff', 0.2), px, py, 1, h)
  R(x, '#ffd37a', px + w - 3, py + Math.floor(h / 2), 1, 2)
  R(x, mix(base, '#000000', 0.3), px + 2, py + 3, Math.max(2, w - 5), 1)
}

function crescent(x: Ctx, cx: number, cy: number, r: number, col: string, bg: string) {
  x.fillStyle = col
  disc(x, cx, cy, r)
  x.fillStyle = bg
  disc(x, cx + Math.ceil(r * 0.55), cy - 1, r)
}

function chip(x: Ctx, px: number, py: number, w: number, h: number, base: string, light: string, dark: string) {
  R(x, base, px, py, w, h)
  R(x, light, px, py, w, 1)
  R(x, dark, px, py + h - 1, w, 1)
}

function bld(w: number, h: number, draw: (x: Ctx) => void) {
  const { c, x } = mk(w, h)
  draw(x)
  return c
}

// ------------------------------------------------------------------ HOME
function home(): Building {
  const w = 104, h = 84
  const sprite = bld(w, h, (x) => {
    planks(x, 12, 38, 80, 42, '#5b3f6e', '#46304f', '#6e4f84')
    R(x, '#34244a', 12, 74, 80, 6)
    for (let i = 12; i < 92; i += 6) R(x, '#463a63', i, 75, 3, 2)
    gable(x, 52, 10, 96, 30, '#2b2145', '#3a2d5e', '#8a5b9a')
    // eaves
    R(x, '#1c1530', 4, 39, 96, 2)
    R(x, '#8a5b9a', 4, 38, 96, 1)
    // chimney
    R(x, '#4a3a6a', 72, 6, 10, 24)
    R(x, '#5d4b8c', 72, 6, 3, 24)
    R(x, '#2a1f45', 70, 4, 14, 3)
    // gable crescent
    crescent(x, 52, 28, 5, '#f7edd0', '#2b2145')
    R(x, '#f7edd0', 60, 24, 1, 1); R(x, '#f7edd0', 62, 30, 1, 1)
    win(x, 20, 48, 14, 14)
    win(x, 70, 48, 14, 14)
    // flower boxes
    R(x, '#3a2410', 19, 63, 16, 3); R(x, '#3a2410', 69, 63, 16, 3)
    for (let i = 0; i < 4; i++) { R(x, '#ef6f55', 20 + i * 4, 62, 2, 2); R(x, '#8aa4f0', 70 + i * 4, 62, 2, 2); R(x, '#3f9a84', 20 + i * 4, 64, 2, 1); R(x, '#3f9a84', 70 + i * 4, 64, 2, 1) }
    door(x, 44, 54, 16, 26)
    // lamp over door
    R(x, '#241a38', 51, 49, 2, 4); R(x, WARM, 50, 52, 4, 3)
    // step
    R(x, '#3a3858', 40, 80, 24, 3)
    R(x, '#55517a', 40, 80, 24, 1)
    // hanging sign
    R(x, '#3a2410', 90, 50, 8, 1); R(x, '#3a2410', 97, 50, 1, 4)
    chip(x, 88, 54, 14, 8, '#7a5230', '#9b6e42', '#4d3320')
    text(x, 'LUNA', 89, 56, '#f7edd0')
  })
  return {
    id: 'home', w, h, sprite,
    dyn: (c, t, x, y) => {
      // chimney smoke
      for (let i = 0; i < 7; i++) {
        const p = (t * 0.35 + i / 7) % 1
        const sx = x + 77 + Math.sin(p * 5 + i) * 3 + p * 8
        const sy = y + 2 - p * 36
        c.fillStyle = `rgba(190,180,230,${0.55 * (1 - p)})`
        const s = 2 + Math.floor(p * 3)
        c.fillRect(Math.round(sx), Math.round(sy), s, s)
      }
    },
    lights: (t) => [
      { x: 27, y: 55, r: 26, col: WARM, k: 1 + Math.sin(t * 7) * 0.06 },
      { x: 77, y: 55, r: 26, col: WARM, k: 1 },
      { x: 52, y: 66, r: 30, col: WARM2, k: 0.9 },
    ],
  }
}

// ------------------------------------------------------------------ ISLAND (pill hut on a rock)
function island(): Building {
  const w = 112, h = 64
  const sprite = bld(w, h, (x) => {
    // rock islet (small, the pill is the star)
    x.fillStyle = '#2b2a45'; ell(x, 56, 56, 38, 6)
    x.fillStyle = '#3a3858'; ell(x, 56, 54, 36, 5)
    x.fillStyle = '#2f7d6e'; ell(x, 56, 51, 32, 3)
    x.fillStyle = '#3f9a84'; ell(x, 56, 50, 28, 2)
    for (let i = 0; i < 24; i++) { const px = 24 + ((i * 53) % 64); R(x, '#5d4b8c', px, 56 + ((i * 7) % 4), 2, 1) }
    // stilts
    R(x, '#3a3858', 34, 38, 3, 14); R(x, '#3a3858', 75, 38, 3, 14)
    R(x, '#55517a', 34, 38, 1, 14); R(x, '#55517a', 75, 38, 1, 14)
    // capsule body: rect + two half discs
    const cap = (col: string, inset: number) => {
      x.fillStyle = col
      R(x, col, 34, 8 + inset, 44, 32 - inset * 2)
      disc(x, 34, 24, 16 - inset)
      disc(x, 78, 24, 16 - inset)
    }
    cap('#34343e', 0)
    cap('#0a0a0d', 1)
    // top sheen + bottom edge light
    R(x, '#2a2a34', 30, 10, 52, 1)
    R(x, '#4a4a58', 38, 9, 36, 1)
    R(x, '#16161c', 26, 36, 60, 1)
    R(x, '#3a3a46', 30, 39, 52, 1)
  })
  return {
    id: 'island', w, h, sprite,
    dyn: (c, t, x, y) => {
      const d = new Date()
      const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0')
      const colon = Math.floor(t * 2) % 2 === 0 ? ':' : ' '
      text(c, hh + colon + mm, x + 26, y + 19, '#f1ece2')
      // spectrum
      for (let i = 0; i < 7; i++) {
        const v = 2 + Math.floor((Math.sin(t * 5 + i * 1.7) * 0.5 + 0.5) * 8 * (0.6 + 0.4 * Math.sin(t * 1.3 + i)))
        R(c, '#f1ece2', x + 60 + i * 3, y + 30 - v, 2, v)
      }
      // privacy dot
      if (Math.floor(t * 1.2) % 3 === 0) R(c, '#ef6f55', x + 86, y + 21, 3, 3)
      else R(c, '#5bb59a', x + 86, y + 21, 3, 3)
    },
    lights: (t) => [{ x: 56, y: 26, r: 48, col: '#ef6f55', k: 0.55 + Math.sin(t * 2) * 0.05 }],
  }
}

// ------------------------------------------------------------------ FLARE lighthouse
function flare(): Building {
  const w = 64, h = 150
  const sprite = bld(w, h, (x) => {
    // base hut
    bricks(x, 8, 124, 48, 24, '#473a66', '#34294d', '#5d4b8c')
    gable(x, 32, 112, 56, 14, '#2b2145', '#3a2d5e', '#8a5b9a')
    door(x, 26, 132, 12, 16)
    // tower trapezoid with stripes
    for (let i = 0; i < 80; i++) {
      const py = 38 + i
      const half = 11 + Math.floor(i / 80 * 6)
      const stripe = Math.floor(i / 13) % 2 === 0
      const base = stripe ? '#e8b449' : '#2b2145'
      R(x, base, 32 - half, py, half * 2, 1)
      R(x, mix(base, '#000000', 0.3), 32 - half, py, 3, 1)
      R(x, mix(base, '#ffffff', 0.25), 32 + half - 3, py, 2, 1)
    }
    // window slits
    R(x, '#ffd37a', 31, 62, 2, 5); R(x, '#ffd37a', 31, 92, 2, 5)
    // gallery
    R(x, '#241a38', 14, 34, 36, 5)
    R(x, '#5d4b8c', 14, 34, 36, 1)
    for (let i = 15; i < 50; i += 4) R(x, '#241a38', i, 27, 1, 8)
    R(x, '#241a38', 14, 27, 36, 1)
    // lantern room
    R(x, '#241a38', 21, 12, 22, 2)
    R(x, '#ffe9a8', 23, 14, 18, 13)
    R(x, '#ffd37a', 23, 20, 18, 7)
    for (let i = 0; i < 4; i++) R(x, '#241a38', 23 + i * 6, 14, 1, 13)
    R(x, '#241a38', 21, 27, 22, 2)
    // dome
    for (let i = 0; i < 9; i++) {
      const half = 3 + i
      R(x, i < 3 ? '#a8402c' : '#8a3322', 32 - half, 3 + i, half * 2, 1)
    }
    R(x, '#ef6f55', 33, 3, 6, 1)
    R(x, '#241a38', 31, 0, 2, 4)
  })
  return {
    id: 'flare', w, h, sprite,
    dyn: (c, t, x, y) => {
      // flicker inside lantern
      const f = Math.sin(t * 18) > 0 ? '#fff6d0' : '#ffe08a'
      R(c, f, x + 29, y + 17, 6, 8)
      // rotating beam
      const a = Math.sin(t * 0.9)
      const dir = a >= 0 ? 1 : -1
      const len = 150 * Math.abs(a) + 20
      const ox = x + 32, oy = y + 20
      c.save()
      c.globalCompositeOperation = 'lighter'
      const strength = 0.05 + 0.1 * Math.abs(a)
      const slices = 12
      for (let s = 0; s < slices; s++) {
        const x0 = (s / slices) * len, x1 = ((s + 1) / slices) * len
        const half = 2 + x1 * 0.16
        c.fillStyle = `rgba(255,226,150,${strength * (1 - s / slices) * 0.9})`
        c.beginPath()
        c.moveTo(ox + dir * x0, oy - (2 + x0 * 0.16)); c.lineTo(ox + dir * x1, oy - half)
        c.lineTo(ox + dir * x1, oy + half); c.lineTo(ox + dir * x0, oy + (2 + x0 * 0.16))
        c.closePath(); c.fill()
      }
      c.restore()
    },
    lights: (t) => [
      { x: 32, y: 20, r: 38, col: '#ffd37a', k: 1.1 + Math.sin(t * 6) * 0.1 },
      { x: 32, y: 138, r: 24, col: WARM, k: 0.8 },
    ],
  }
}

// ------------------------------------------------------------------ QUAY tower
function quay(): Building {
  const w = 72, h = 156
  const sprite = bld(w, h, (x) => {
    bricks(x, 14, 22, 44, 130, '#1f4d52', '#173a40', '#2a6168', 8, 4)
    R(x, '#12303a', 14, 22, 44, 3)
    R(x, '#5bb59a', 14, 22, 44, 1)
    // battlement
    for (let i = 0; i < 6; i++) R(x, '#1f4d52', 14 + i * 8, 17, 5, 5)
    R(x, '#5bb59a', 14, 17, 44, 1)
    // flagpole
    R(x, '#241a38', 36, 0, 1, 18)
    // window rows
    for (let i = 0; i < 7; i++) {
      const py = 32 + i * 16
      R(x, '#0f2428', 22, py - 1, 28, 12)
      R(x, '#12302f', 23, py, 26, 10)
      for (let k = 0; k < 4; k++) R(x, '#1d4a4c', 25 + k * 6, py + 2, 4, 6)
    }
    // rail on the right side
    R(x, '#173a40', 54, 32, 3, 104)
    // door
    door(x, 28, 134, 16, 18, '#2a6168', '#0f2428')
    R(x, '#5bb59a', 34, 138, 4, 6)
    // crates
    chip(x, 2, 142, 12, 10, '#7a5230', '#9b6e42', '#4d3320')
    chip(x, 6, 134, 9, 8, '#8a5e38', '#a77a4c', '#4d3320')
  })
  return {
    id: 'quay', w, h, sprite,
    dyn: (c, t, x, y) => {
      const step = t * 0.9
      const row = Math.floor(step) % 7
      const frac = step - Math.floor(step)
      const ease = frac < 0.25 ? frac / 0.25 : 1
      for (let i = 0; i < 7; i++) {
        const py = y + 32 + i * 16
        const on = i === row
        if (on) {
          R(c, '#5bb59a', x + 23, py, 26, 10)
          R(c, '#a8f0d8', x + 23, py, 26, 2)
          for (let k = 0; k < 4; k++) R(c, '#1f4d52', x + 25 + k * 6, py + 3, 4, 5)
        } else {
          const near = Math.abs(i - row) === 1
          for (let k = 0; k < 4; k++) if (near || (i + k + Math.floor(t * 0.4)) % 5 === 0) R(c, near ? '#2d8a76' : '#256a5f', x + 25 + k * 6, y + 34 + i * 16, 4, 6)
        }
      }
      // rail indicator
      const iy = y + 32 + (row + (row === 6 ? 0 : ease) - (ease < 1 ? 1 : 0)) * 16
      R(c, '#a8f0d8', x + 54, Math.round(Math.max(y + 32, iy)), 3, 10)
      // flag
      for (let i = 0; i < 14; i++) R(c, '#5bb59a', x + 37 + i, y + 1 + Math.round(Math.sin(t * 5 + i * 0.5) * 1.2), 1, 6 - Math.floor(i / 5))
    },
    lights: () => [
      { x: 36, y: 60, r: 40, col: '#5bb59a', k: 0.9 },
      { x: 36, y: 120, r: 36, col: '#5bb59a', k: 0.7 },
    ],
  }
}

// ------------------------------------------------------------------ LIFE OS cottage
function life(): Building {
  const w = 112, h = 92
  const sprite = bld(w, h, (x) => {
    planks(x, 10, 44, 92, 40, '#566aa8', '#44588f', '#7488c4')
    R(x, '#34406e', 10, 78, 92, 6)
    gable(x, 56, 14, 108, 32, '#2c3566', '#3a4585', '#8aa4f0')
    R(x, '#1c2244', 2, 45, 108, 2); R(x, '#8aa4f0', 2, 44, 108, 1)
    // dormer
    R(x, '#3a4585', 46, 22, 20, 14)
    gable(x, 56, 15, 24, 8, '#2c3566', '#3a4585', '#8aa4f0')
    win(x, 51, 25, 10, 9)
    win(x, 20, 54, 16, 16)
    win(x, 76, 54, 16, 16)
    // checkmarks in windows
    R(x, '#e6f0ff', 25, 63, 1, 2); R(x, '#e6f0ff', 26, 64, 1, 2); R(x, '#e6f0ff', 27, 63, 1, 1); R(x, '#e6f0ff', 28, 62, 1, 1); R(x, '#e6f0ff', 29, 61, 1, 1)
    door(x, 48, 58, 16, 26, '#3a4585', '#1c2244')
    R(x, '#ffd37a', 60, 70, 2, 2)
    // garden beds
    chip(x, 2, 84, 28, 6, '#4d3320', '#7a5230', '#2d1d12')
    chip(x, 82, 84, 28, 6, '#4d3320', '#7a5230', '#2d1d12')
    for (let i = 0; i < 6; i++) { R(x, '#3f9a84', 5 + i * 4, 80 - (i % 3), 2, 5 + (i % 3)); R(x, '#ef6f55', 5 + i * 4, 79 - (i % 3), 2, 2) }
    for (let i = 0; i < 6; i++) { R(x, '#52b27a', 85 + i * 4, 80 - ((i + 1) % 3), 2, 5 + ((i + 1) % 3)); R(x, '#ffd37a', 85 + i * 4, 79 - ((i + 1) % 3), 2, 2) }
    // habit board
    chip(x, 36, 50, 0, 0, '#000', '#000', '#000')
  })
  return {
    id: 'life', w, h, sprite,
    dyn: (c, t, x, y) => {
      // habit streak dots above door
      const lit = Math.floor(t * 0.8) % 8
      for (let i = 0; i < 7; i++) {
        R(c, '#241a38', x + 40 + i * 4 - 1, y + 49, 4, 4)
        R(c, i < lit ? '#8aa4f0' : '#34406e', x + 40 + i * 4, y + 50, 2, 2)
      }
      // swaying plants
      for (let i = 0; i < 3; i++) R(c, '#52b27a', x + 6 + i * 8 + Math.round(Math.sin(t * 2 + i)), y + 76, 1, 3)
    },
    lights: (t) => [
      { x: 28, y: 62, r: 26, col: WARM, k: 1 },
      { x: 84, y: 62, r: 26, col: WARM, k: 1 + Math.sin(t * 3) * 0.05 },
      { x: 56, y: 28, r: 18, col: WARM, k: 0.7 },
    ],
  }
}

// ------------------------------------------------------------------ TALLY clock tower
function tally(): Building {
  const w = 76, h = 142
  const sprite = bld(w, h, (x) => {
    bricks(x, 18, 50, 40, 90, '#4a3a74', '#3a2c5e', '#5d4b8c', 8, 4)
    R(x, '#2a2050', 18, 50, 40, 2)
    // clock block
    R(x, '#3a2c5e', 12, 16, 52, 36)
    R(x, '#5d4b8c', 12, 16, 52, 1)
    R(x, '#241a38', 12, 51, 52, 2)
    R(x, '#241a38', 12, 16, 1, 36); R(x, '#241a38', 63, 16, 1, 36)
    // face
    x.fillStyle = '#241a38'; disc(x, 38, 34, 15)
    x.fillStyle = '#f1e8ff'; disc(x, 38, 34, 13)
    x.fillStyle = '#d6c6f0'; disc(x, 38, 35, 11)
    x.fillStyle = '#f1e8ff'; disc(x, 38, 34, 10)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      R(x, '#3a2c5e', Math.round(38 + Math.sin(a) * 11), Math.round(34 - Math.cos(a) * 11), 1, 1)
    }
    // roof
    for (let i = 0; i < 16; i++) {
      const half = 4 + Math.floor(i * 1.8)
      R(x, i % 4 === 3 ? '#1c1538' : '#2a2050', 38 - half, i, half * 2, 1)
      R(x, '#8e58aa', 38 + half - 1, i, 1, 1)
    }
    R(x, '#c58be0', 37, 0, 2, 3)
    // door
    door(x, 30, 122, 16, 18, '#4a3a74', '#241a38')
    R(x, '#c58be0', 36, 126, 4, 8)
    // slit windows
    R(x, '#ffd37a', 36, 70, 4, 8); R(x, '#ffd37a', 36, 94, 4, 8)
  })
  return {
    id: 'tally', w, h, sprite,
    dyn: (c, t, x, y) => {
      const d = new Date()
      const cx = x + 38, cy = y + 34
      const sec = d.getSeconds() + d.getMilliseconds() / 1000
      const min = d.getMinutes() + sec / 60
      const hr = (d.getHours() % 12) + min / 60
      const hand = (ang: number, len: number, col: string) => {
        c.fillStyle = col
        const steps = len
        for (let i = 0; i <= steps; i++) c.fillRect(Math.round(cx + Math.sin(ang) * i), Math.round(cy - Math.cos(ang) * i), 1, 1)
      }
      hand((hr / 12) * Math.PI * 2, 5, '#241a38')
      hand((min / 60) * Math.PI * 2, 8, '#241a38')
      hand((sec / 60) * Math.PI * 2, 9, '#c58be0')
      R(c, '#241a38', cx, cy, 1, 1)
      // tally ring
      const prog = (t * 0.12) % 1
      for (let i = 0; i < Math.floor(prog * 56); i++) {
        const a = (i / 56) * Math.PI * 2
        R(c, '#c58be0', Math.round(cx + Math.sin(a) * 16), Math.round(cy - Math.cos(a) * 16), 1, 1)
      }
    },
    lights: () => [{ x: 38, y: 34, r: 34, col: '#c58be0', k: 0.8 }, { x: 38, y: 130, r: 22, col: WARM, k: 0.6 }],
  }
}

// ------------------------------------------------------------------ INKTYPE shop
function inktype(): Building {
  const w = 112, h = 80
  const sprite = bld(w, h, (x) => {
    planks(x, 10, 26, 92, 50, '#7a6a48', '#5e5034', '#9c8450')
    R(x, '#3a2d2a', 4, 18, 104, 9)
    for (let i = 4; i < 108; i += 8) { R(x, '#4d3b36', i, 18, 4, 9); R(x, '#241a38', i + 4, 18, 1, 9) }
    R(x, '#7a5230', 4, 17, 104, 1)
    // awning
    for (let i = 0; i < 100; i += 8) {
      R(x, '#e6d3a3', 6 + i, 27, 4, 8)
      R(x, '#8a3a3a', 10 + i, 27, 4, 8)
      R(x, '#c9b78a', 6 + i, 34, 4, 1); R(x, '#5e2626', 10 + i, 34, 4, 1)
    }
    // big window with book
    R(x, '#241a38', 16, 40, 40, 30)
    R(x, WARM, 18, 42, 36, 26)
    R(x, WARM2, 18, 56, 36, 12)
    R(x, '#241a38', 36, 42, 2, 26)
    // open book on sill
    R(x, '#6e1d1d', 22, 60, 28, 7)
    R(x, '#f1ece2', 24, 58, 12, 8); R(x, '#f1ece2', 37, 58, 12, 8)
    for (let i = 0; i < 4; i++) { R(x, '#9c8450', 26, 60 + i * 2, 8, 1); R(x, '#9c8450', 39, 60 + i * 2, 8, 1) }
    // door
    door(x, 70, 46, 16, 30, '#3a2d2a', '#1b1310')
    R(x, '#e6d3a3', 76, 52, 4, 6)
    R(x, '#3a2d2a', 62, 78, 32, 2)
    // sign: nib
    R(x, '#241a38', 96, 36, 1, 10); R(x, '#241a38', 96, 36, 10, 1)
    for (let i = 0; i < 9; i++) { const half = Math.max(0, 4 - Math.floor(i / 2)); R(x, '#e6d3a3', 101 - half, 38 + i, half * 2 + 1, 1) }
    R(x, '#241a38', 101, 41, 1, 3)
    // chimney
    R(x, '#4d3b36', 80, 4, 10, 16)
    R(x, '#241a38', 78, 3, 14, 3)
    // step
    R(x, '#3a3858', 66, 76, 24, 3)
  })
  const letters = 'INKTYPE'
  return {
    id: 'inktype', w, h, sprite,
    dyn: (c, t, x, y) => {
      for (let i = 0; i < 6; i++) {
        const p = (t * 0.28 + i / 6) % 1
        const sx = x + 82 + Math.sin(p * 6 + i * 2) * 6 + p * 10
        const sy = y + 2 - p * 38
        if (p > 0.9) continue
        text(c, letters[(i + Math.floor(t * 0.28)) % letters.length], sx, sy, `rgba(230,211,163,${1 - p})`)
      }
    },
    lights: () => [{ x: 36, y: 56, r: 36, col: WARM, k: 1 }, { x: 78, y: 62, r: 20, col: WARM, k: 0.5 }],
  }
}

// ------------------------------------------------------------------ AURGUARD gatehouse
function aurguard(): Building {
  const w = 100, h = 104
  const sprite = bld(w, h, (x) => {
    const base = '#566488', dark = '#414e6e', light = '#6f7fa6'
    // curtain wall
    bricks(x, 28, 54, 44, 50, base, dark, light, 8, 4)
    // towers
    bricks(x, 4, 24, 26, 80, base, dark, light, 8, 4)
    bricks(x, 70, 24, 26, 80, base, dark, light, 8, 4)
    // battlements
    for (let i = 0; i < 4; i++) { R(x, base, 4 + i * 7, 18, 5, 6); R(x, base, 70 + i * 7, 18, 5, 6); R(x, light, 4 + i * 7, 18, 5, 1); R(x, light, 70 + i * 7, 18, 5, 1) }
    for (let i = 0; i < 3; i++) { R(x, base, 32 + i * 14, 48, 8, 6); R(x, light, 32 + i * 14, 48, 8, 1) }
    // arch
    R(x, '#0f1226', 34, 62, 32, 42)
    for (let i = 0; i < 16; i++) {
      const half = Math.round(Math.sqrt(256 - i * i * 1.0))
      R(x, '#0f1226', 50 - half, 62 - Math.floor(i * 0.5) + 8 - 8, half * 2, 1)
    }
    R(x, '#0f1226', 34, 56, 32, 8)
    for (let i = 0; i < 14; i++) R(x, light, 34 + i, 62 - Math.round(Math.sin(i / 14 * Math.PI) * 4), 1, 1)
    // arrow slits
    R(x, '#ffb454', 15, 40, 2, 8); R(x, '#ffb454', 83, 40, 2, 8)
    // banner
    R(x, '#241a38', 49, 22, 2, 30)
    R(x, '#b04458', 38, 24, 24, 24)
    R(x, '#ff7a90', 38, 24, 24, 2)
    for (let i = 0; i < 6; i++) R(x, '#b04458', 38 + i * 4, 48, 4, i % 2 === 0 ? 4 : 2)
    // shield emblem
    R(x, '#f1ece2', 45, 30, 10, 3)
    for (let i = 0; i < 9; i++) { const half = Math.max(0, 5 - Math.floor(i / 2)); R(x, '#f1ece2', 50 - half, 33 + i, half * 2, 1) }
    R(x, '#b04458', 49, 34, 2, 6)
  })
  return {
    id: 'aurguard', w, h, sprite,
    dyn: (c, t, x, y) => {
      // portcullis
      const lift = Math.round((Math.sin(t * 0.6) * 0.5 + 0.5) * 6)
      for (let i = 0; i < 6; i++) R(c, '#6f7fa6', x + 36 + i * 5, y + 64, 1, 40 - lift)
      for (let j = 0; j < 5; j++) R(c, '#6f7fa6', x + 35, y + 66 + j * 8 - lift, 30, 1)
      // torches
      for (const tx of [30, 70]) {
        R(c, '#241a38', x + tx, y + 70, 2, 8)
        const f = Math.sin(t * 20 + tx) > 0
        R(c, f ? '#ffd37a' : '#ffb454', x + tx - 1, y + 66, 4, 4)
        R(c, '#ef6f55', x + tx, y + 64 - (f ? 1 : 0), 2, 3)
      }
    },
    lights: (t) => [
      { x: 30, y: 72, r: 28, col: '#ffb454', k: 1 + Math.sin(t * 17) * 0.1 },
      { x: 71, y: 72, r: 28, col: '#ffb454', k: 1 + Math.sin(t * 15 + 1) * 0.1 },
    ],
  }
}

// ------------------------------------------------------------------ MAILBOX
function mailbox(): Building {
  const w = 80, h = 84
  const sprite = bld(w, h, (x) => {
    // post
    planks(x, 37, 44, 6, 40, '#7a5230', '#4d3320', '#9b6e42')
    R(x, '#4d3320', 30, 40, 20, 5)
    R(x, '#7a5230', 30, 40, 20, 1)
    // box: arched lid over a deep body
    x.fillStyle = '#5a3a6e'; ell(x, 40, 24, 19, 10)
    x.fillStyle = '#8a5b9a'; ell(x, 40, 23, 18, 9)
    x.fillStyle = '#a574b8'; ell(x, 40, 21, 14, 5)
    R(x, '#8a5b9a', 22, 24, 36, 16)
    R(x, '#6b4478', 22, 24, 3, 16)
    R(x, '#a574b8', 55, 24, 3, 16)
    R(x, '#4a2f5c', 22, 39, 36, 2)
    // door panel + slot + knob
    R(x, '#6b4478', 27, 28, 26, 10)
    R(x, '#4a2f5c', 27, 28, 26, 1)
    R(x, '#f7d58a', 38, 33, 4, 2)
    R(x, '#241a38', 30, 25, 20, 1)
    crescent(x, 33, 33, 2, '#f7d58a', '#6b4478')
    // letters in grass
    chip(x, 6, 76, 12, 8, '#f1ece2', '#ffffff', '#b8b0a0')
    R(x, '#8a5b9a', 8, 78, 3, 1); R(x, '#8a5b9a', 8, 80, 8, 1)
    chip(x, 58, 74, 12, 8, '#f1ece2', '#ffffff', '#b8b0a0')
    R(x, '#ef6f55', 60, 76, 3, 1)
    // lantern post
    R(x, '#241a38', 68, 34, 2, 50)
    R(x, '#241a38', 64, 30, 10, 2)
    R(x, WARM, 66, 32, 6, 6)
    R(x, '#241a38', 65, 29, 8, 2)
  })
  return {
    id: 'mail', w, h, sprite,
    dyn: (c, t, x, y) => {
      // flag
      R(c, '#241a38', x + 58, y + 16, 1, 14)
      const up = Math.sin(t * 2) > -0.2
      R(c, '#ef6f55', x + 59, y + (up ? 16 : 22), 8, 5)
      // sparkle
      const s = Math.floor(t * 3) % 4
      const pts = [[24, 14], [52, 10], [12, 30], [60, 40]]
      const [sx, sy] = pts[s]
      R(c, '#fff6d0', x + sx, y + sy, 1, 3); R(c, '#fff6d0', x + sx - 1, y + sy + 1, 3, 1)
    },
    lights: (t) => [{ x: 69, y: 36, r: 36, col: WARM, k: 1 + Math.sin(t * 5) * 0.05 }],
  }
}

export function makeBuildings(): Record<string, Building> {
  const all = [home(), island(), flare(), quay(), life(), tally(), inktype(), aurguard(), mailbox()]
  const out: Record<string, Building> = {}
  for (const b of all) out[b.id] = b
  return out
}

export { glow, textC, rng, bayer }
