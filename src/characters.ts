import { R, ell, type Ctx } from './px'

export interface Pose {
  dir: 1 | -1
  moving: boolean
  running: boolean
  t: number
}

/** Luna: a small hooded night-walker with a lantern. Original character. */
export function drawLuna(c: Ctx, x: number, y: number, p: Pose) {
  const { dir, moving, running, t } = p
  const px = (dx: number, dy: number, w: number, h: number, col: string) => {
    const rx = dir > 0 ? x + dx : x - dx - w
    R(c, col, rx, y + dy, w, h)
  }
  c.fillStyle = 'rgba(5,6,18,0.45)'
  ell(c, x, y, 7, 2)
  const rate = running ? 14 : 9
  const ph = Math.floor(t * rate) % 4
  const bob = moving ? (ph % 2 === 1 ? -1 : 0) : (Math.floor(t * 1.7) % 2 === 1 ? -1 : 0)
  // legs + boots
  const l1 = moving ? [0, -1, 0, 1][ph] : 0
  const l2 = moving ? [0, 1, 0, -1][ph] : 0
  px(-3 + l1, -4, 2, 3, '#2a2050'); px(1 + l2, -4, 2, 3, '#2a2050')
  px(-4 + l1, -1, 4, 2, '#1c1530'); px(0 + l2, -1, 4, 2, '#1c1530')
  // cloak tail (sways behind)
  for (let k = 0; k < 6; k++) {
    const sw = Math.round(Math.sin(t * (moving ? 10 : 2.2) + k * 0.9) * (moving ? 1.6 : 0.8))
    px(-6 - k, -13 + bob + k + sw + (moving ? Math.floor(k / 2) : 0), 2, 7 - k, k % 2 ? '#382c6a' : '#46397c')
  }
  // cloak body
  px(-5, -15 + bob, 11, 12, '#4a3a86')
  px(-6, -8 + bob, 13, 5, '#4a3a86')
  px(-5, -15 + bob, 2, 12, '#382c6a')
  px(3, -15 + bob, 2, 10, '#6a58b0')
  px(-6, -4 + bob, 13, 1, '#2f2560')
  for (let i = 0; i < 4; i++) px(-5 + i * 3, -4 + bob, 1, 1, '#f7edd0')
  // hood
  px(-4, -23 + bob, 9, 9, '#4a3a86')
  px(-3, -24 + bob, 7, 1, '#4a3a86')
  px(-5, -21 + bob, 1, 5, '#4a3a86')
  px(-6, -19 + bob, 1, 3, '#382c6a')
  px(3, -23 + bob, 1, 7, '#6a58b0')
  // face
  px(0, -20 + bob, 5, 5, '#120d24')
  const blink = Math.floor(t * 0.9) % 6 === 0 && (t * 0.9) % 1 < 0.14
  if (!blink) { px(1, -18 + bob, 1, 2, '#f7edd0'); px(3, -18 + bob, 1, 2, '#f7edd0') }
  else { px(1, -17 + bob, 1, 1, '#f7edd0'); px(3, -17 + bob, 1, 1, '#f7edd0') }
  // moon pin
  px(0, -12 + bob, 2, 3, '#f7edd0'); px(1, -12 + bob, 1, 3, '#4a3a86')
  // arm + lantern
  const sw = moving ? [0, 1, 0, -1][ph] : 0
  px(4, -13 + bob, 3, 3, '#4a3a86')
  px(6, -11 + bob + sw, 1, 3, '#241a38')
  const lf = Math.floor(t * 9) % 2
  px(5, -9 + bob + sw, 5, 5, '#241a38')
  px(6, -8 + bob + sw, 3, 3, lf ? '#fff0b8' : '#ffd37a')
}

export function lunaLantern(x: number, y: number, dir: 1 | -1, moving: boolean, t: number) {
  const ph = Math.floor(t * 9) % 4
  const sw = moving ? [0, 1, 0, -1][ph] : 0
  return { x: x + dir * 7.5, y: y - 6 + sw }
}

/** Petty: a moon-cat. Original character, named after the Rust pet project. */
export function drawPetty(c: Ctx, x: number, y: number, p: Pose & { sit: boolean }) {
  const { dir, moving, t, sit } = p
  const hop = moving ? Math.abs(Math.sin(t * 14)) * 3 : 0
  const yy = Math.round(y - hop)
  const px = (dx: number, dy: number, w: number, h: number, col: string) => {
    const rx = dir > 0 ? x + dx : x - dx - w
    R(c, col, rx, yy + dy, w, h)
  }
  c.fillStyle = 'rgba(5,6,18,0.4)'
  ell(c, x, y, 5, 1)
  // tail
  const tw = Math.round(Math.sin(t * (moving ? 12 : 3)) * 1.5)
  px(-7, -6 + tw, 2, 2, '#cbbf9f'); px(-8, -8 + tw, 2, 3, '#efe6cf'); px(-8, -9 + tw, 1, 1, '#f7edd0')
  // body
  px(-4, -6, 9, 6, '#efe6cf')
  px(-3, -7, 7, 1, '#efe6cf')
  px(-4, -2, 9, 2, '#cbbf9f')
  px(3, -6, 2, 5, '#f7edd0')
  // legs
  if (!sit) { px(-3, 0, 2, 1, '#cbbf9f'); px(2, 0, 2, 1, '#cbbf9f') }
  // ears
  px(-3, -9, 2, 2, '#efe6cf'); px(2, -9, 2, 2, '#efe6cf')
  px(-3, -9, 1, 1, '#e8a0a8'); px(3, -9, 1, 1, '#e8a0a8')
  // eyes
  const blink = (t * 0.7) % 4 < 0.12
  if (sit && !moving && Math.floor(t * 0.2) % 5 === 4) { px(-1, -5, 2, 1, '#3a2c5e'); px(2, -5, 2, 1, '#3a2c5e') }
  else if (!blink) { px(-1, -5, 1, 2, '#241a38'); px(2, -5, 1, 2, '#241a38') }
  else { px(-1, -4, 1, 1, '#241a38'); px(2, -4, 1, 1, '#241a38') }
  px(0, -3, 1, 1, '#e8a0a8')
  // moon mark on forehead
  px(0, -7, 1, 1, '#c58be0')
}
