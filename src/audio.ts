/** Tiny procedural soundtrack + blips. No audio files. */
export class Sound {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private timer = 0
  private idx = 3
  muted = false
  private readonly scale = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33]

  constructor() {
    try { this.muted = localStorage.getItem('luna-muted') === '1' } catch { /* ignore */ }
  }

  start() {
    if (this.ctx) { void this.ctx.resume(); return }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.55
    const comp = ctx.createDynamicsCompressor()
    this.master.connect(comp).connect(ctx.destination)

    // echo bus
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.42
    const fb = ctx.createGain(); fb.gain.value = 0.38
    const wet = ctx.createGain(); wet.gain.value = 0.5
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800
    delay.connect(lp).connect(fb).connect(delay)
    lp.connect(wet).connect(this.master)
    ;(this as unknown as { echo: AudioNode }).echo = delay

    // drone pad
    for (const [f, g] of [[55, 0.05], [82.41, 0.03], [110.2, 0.018]] as const) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f
      const gg = ctx.createGain(); gg.gain.value = g
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07 + f / 2000
      const lg = ctx.createGain(); lg.gain.value = g * 0.5
      lfo.connect(lg).connect(gg.gain)
      o.connect(gg).connect(this.master)
      o.start(); lfo.start()
    }
    // wind
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.7
    const wg = ctx.createGain(); wg.gain.value = 0.02
    const wl = ctx.createOscillator(); wl.frequency.value = 0.09
    const wlg = ctx.createGain(); wlg.gain.value = 0.012
    wl.connect(wlg).connect(wg.gain)
    src.connect(bp).connect(wg).connect(this.master)
    src.start(); wl.start()

    this.timer = window.setInterval(() => this.arp(), 520)
  }

  private arp() {
    const ctx = this.ctx
    if (!ctx || this.muted || document.hidden) return
    if (Math.random() < 0.28) return
    this.idx = Math.max(0, Math.min(this.scale.length - 1, this.idx + Math.round((Math.random() - 0.5) * 4)))
    this.tone(this.scale[this.idx], 'triangle', 0.045, 1.4, true)
    if (Math.random() < 0.18) this.tone(this.scale[this.idx] * 2, 'sine', 0.02, 1.8, true)
  }

  private tone(freq: number, type: OscillatorType, gain: number, dur: number, echo = false) {
    const ctx = this.ctx
    if (!ctx) return
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq
    const g = ctx.createGain()
    const now = ctx.currentTime
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(gain, now + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    o.connect(g)
    g.connect(this.master)
    if (echo) g.connect((this as unknown as { echo: AudioNode }).echo)
    o.start(now); o.stop(now + dur + 0.05)
  }

  blip() { this.tone(640 + Math.random() * 160, 'square', 0.022, 0.05) }
  step() {
    const ctx = this.ctx
    if (!ctx || this.muted) return
    const len = Math.floor(ctx.sampleRate * 0.045)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const s = ctx.createBufferSource(); s.buffer = buf
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700
    const g = ctx.createGain(); g.gain.value = 0.05
    s.connect(f).connect(g).connect(this.master)
    s.start()
  }
  chime() { [659.25, 880, 1046.5].forEach((f, i) => window.setTimeout(() => this.tone(f, 'square', 0.03, 0.5, true), i * 90)) }
  close() { [880, 659.25].forEach((f, i) => window.setTimeout(() => this.tone(f, 'square', 0.025, 0.25), i * 70)) }
  meow() { this.tone(900, 'triangle', 0.04, 0.12); window.setTimeout(() => this.tone(700, 'triangle', 0.04, 0.2), 90) }
  star() { [1318, 1568, 1976, 2349].forEach((f, i) => window.setTimeout(() => this.tone(f, 'sine', 0.03, 0.6, true), i * 70)) }

  toggle() {
    this.muted = !this.muted
    try { localStorage.setItem('luna-muted', this.muted ? '1' : '0') } catch { /* ignore */ }
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.55, this.ctx.currentTime, 0.05)
    return this.muted
  }
}
