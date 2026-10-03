import { PLACES, type Place } from './data'
import type { Sound } from './audio'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

export interface UIHooks {
  onTravel: (p: Place) => void
  onOpen: (p: Place) => void
  onClose: () => void
  onStart: () => void
  spriteFor: (id: string) => HTMLCanvasElement | null
}

const VISITED_KEY = 'luna-visited-v1'

export class UI {
  private hud = $('hud')
  private prompt = $('prompt')
  private toastEl = $('toast')
  private travel = $('travel')
  private dialog = $('dialog')
  private intro = $('intro')
  private visited = new Set<string>()
  private typing = 0
  private toastTimer = 0
  dialogOpen = false
  travelOpen = false
  current: Place | null = null

  constructor(private hooks: UIHooks, private sound: Sound) {
    try { JSON.parse(localStorage.getItem(VISITED_KEY) || '[]').forEach((v: string) => this.visited.add(v)) } catch { /* ignore */ }
    this.buildIntro()
    this.buildHud()
    this.buildTravel()
    this.buildPlain()
  }

  private total() { return PLACES.filter((p) => p.kind === 'project').length }
  private found() { return PLACES.filter((p) => p.kind === 'project' && this.visited.has(p.id)).length }

  private buildIntro() {
    this.intro.innerHTML = `
      <div class="intro-card">
        <div class="intro-moon" aria-hidden="true"></div>
        <h1 class="intro-title">LUNA<br>NOIR</h1>
        <p class="intro-sub">vibe coder · hyprland · quickshell · rust</p>
        <button class="px-btn px-btn-big" id="start-btn"><span class="blink">▶</span> ENTER THE WORLD</button>
        <p class="intro-note">sound on · arrow keys or tap to walk</p>
      </div>`
    const go = () => {
      this.intro.classList.add('out')
      window.setTimeout(() => { this.intro.hidden = true }, 900)
      this.hud.hidden = false
      this.sound.start()
      this.hooks.onStart()
      this.toast('A / D or ← → to walk · E to enter a building', 5200)
      window.removeEventListener('keydown', onKey)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key !== 'Tab') go() }
    $('start-btn').addEventListener('click', go)
    window.addEventListener('keydown', onKey)
  }

  private buildHud() {
    this.hud.innerHTML = `
      <div class="hud-left">
        <span class="hud-moon" aria-hidden="true"></span>
        <span class="hud-title">LUNA NOIR</span>
      </div>
      <div class="hud-found" id="hud-found" aria-live="polite"></div>
      <div class="hud-right">
        <button class="px-btn" id="btn-map" aria-label="Open map">MAP <kbd>M</kbd></button>
        <button class="px-btn" id="btn-snd" aria-label="Toggle sound">SND</button>
      </div>`
    $('btn-map').addEventListener('click', () => this.toggleTravel())
    $('btn-snd').addEventListener('click', () => {
      const m = this.sound.toggle()
      $('btn-snd').classList.toggle('off', m)
      $('btn-snd').textContent = m ? 'MUTE' : 'SND'
    })
    if (this.sound.muted) { $('btn-snd').classList.add('off'); $('btn-snd').textContent = 'MUTE' }
    this.renderFound()
  }

  private renderFound() {
    const el = $('hud-found')
    const f = this.found(), t = this.total()
    let dots = ''
    for (let i = 0; i < t; i++) dots += `<i class="${i < f ? 'on' : ''}"></i>`
    el.innerHTML = `<span class="lbl">FOUND</span><span class="dots">${dots}</span><span class="num">${f}/${t}</span>`
  }

  private buildTravel() {
    this.travel.innerHTML = `
      <div class="px-panel travel-panel" role="menu" aria-label="Map">
        <div class="travel-head"><span>MAP</span><button class="px-btn px-btn-s" id="travel-x" aria-label="Close map">X</button></div>
        <ul class="travel-list">
          ${PLACES.map((p, i) => `
            <li><button class="travel-item" data-id="${p.id}" style="--c:${p.color}">
              <span class="ti-num">${i + 1}</span>
              <span class="ti-dot"></span>
              <span class="ti-name">${p.name}</span>
              <span class="ti-seen" data-seen="${p.id}">${this.visited.has(p.id) ? '★' : ''}</span>
            </button></li>`).join('')}
        </ul>
        <p class="travel-hint">click a place to walk there</p>
      </div>`
    this.travel.addEventListener('click', (e) => {
      const t = e.target as HTMLElement
      if (t.id === 'travel' || t.id === 'travel-x') { this.toggleTravel(false); return }
      const b = t.closest('.travel-item') as HTMLElement | null
      if (!b) return
      const p = PLACES.find((q) => q.id === b.dataset.id)
      if (p) { this.toggleTravel(false); this.hooks.onTravel(p) }
    })
  }

  private buildPlain() {
    const ul = document.getElementById('plain-list')
    if (!ul) return
    ul.innerHTML = PLACES.map((p) => `<li><a href="${p.url}">${p.name}</a>: ${p.tagline} ${p.about}</li>`).join('')
  }

  toggleTravel(force?: boolean) {
    if (this.dialogOpen) return
    this.travelOpen = force ?? !this.travelOpen
    this.travel.hidden = !this.travelOpen
    if (this.travelOpen) this.sound.blip()
  }

  showPrompt(p: Place | null, touch: boolean) {
    if (!p || this.dialogOpen || this.travelOpen) { this.prompt.hidden = true; this.current = null; return }
    if (this.current?.id !== p.id || this.prompt.hidden) {
      this.current = p
      const verb = p.kind === 'home' ? 'Come inside' : p.kind === 'contact' ? 'Open the mailbox' : 'Enter'
      this.prompt.innerHTML = `<button class="px-btn px-btn-prompt" style="--c:${p.color}"><kbd>${touch ? 'TAP' : 'E'}</kbd> ${verb} ${p.kind === 'project' ? p.name : ''}</button>`
      this.prompt.hidden = false
      this.prompt.querySelector('button')!.addEventListener('click', () => this.hooks.onOpen(p))
    }
  }

  toast(msg: string, ms = 3200) {
    this.toastEl.textContent = msg
    this.toastEl.hidden = false
    this.toastEl.classList.remove('show'); void this.toastEl.offsetWidth; this.toastEl.classList.add('show')
    clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => { this.toastEl.hidden = true }, ms)
  }

  open(p: Place) {
    this.dialogOpen = true
    this.prompt.hidden = true
    this.current = null
    const idx = PLACES.indexOf(p) + 1
    const links = [
      `<a class="px-btn px-btn-go" href="${p.url}" target="_blank" rel="noopener">${p.kind === 'project' ? 'GitHub' : 'github.com/lunanoir21'} ↗</a>`,
      p.live ? `<a class="px-btn" href="${p.live}" target="_blank" rel="noopener">Live page ↗</a>` : '',
      `<button class="px-btn" id="d-close">Close <kbd>ESC</kbd></button>`,
    ].join('')
    const chips = [
      p.lang ? `<span class="chip">${p.lang}</span>` : '',
      p.stars != null && p.kind === 'project' ? `<span class="chip chip-star">★ ${p.stars}</span>` : '',
      p.kind === 'project' ? '<span class="chip">open source</span>' : '',
    ].join('')
    this.dialog.style.setProperty('--c', p.color)
    this.dialog.style.setProperty('--d', p.dark)
    this.dialog.innerHTML = `
      <div class="d-scrim" id="d-scrim"></div>
      <div class="px-panel d-panel">
        <div class="d-art"><canvas id="d-icon" aria-hidden="true"></canvas></div>
        <div class="d-body">
          <div class="d-kicker">${p.kind === 'project' ? `PROJECT ${String(idx - 1).padStart(2, '0')}` : p.kind === 'home' ? 'ABOUT' : 'CONTACT'}</div>
          <h2 class="d-title">${p.name}</h2>
          <p class="d-tag">${p.tagline}</p>
          <p class="d-text" id="d-text" aria-label="${p.about}"></p>
          <div class="d-chips">${chips}</div>
          <div class="d-actions">${links}</div>
        </div>
      </div>`
    this.dialog.hidden = false
    const cv = $<HTMLCanvasElement>('d-icon')
    const spr = this.hooks.spriteFor(p.id)
    if (spr) {
      cv.width = 128; cv.height = 112
      const x = cv.getContext('2d')!
      x.imageSmoothingEnabled = false
      const s = Math.min(1, Math.floor(100 / spr.height * 10) / 10)
      const sc = spr.height > 100 ? 100 / spr.height : 1
      const w = Math.round(spr.width * sc), h = Math.round(spr.height * sc)
      x.drawImage(spr, Math.round((128 - w) / 2), 108 - h, w, h)
      void s
    }
    this.typewrite(p.about)
    this.sound.chime()
    $('d-close').addEventListener('click', () => this.close())
    $('d-scrim').addEventListener('click', () => this.close())
    ;(this.dialog.querySelector('.px-btn-go') as HTMLElement | null)?.focus()
    if (p.kind === 'project' && !this.visited.has(p.id)) {
      this.visited.add(p.id)
      try { localStorage.setItem(VISITED_KEY, JSON.stringify([...this.visited])) } catch { /* ignore */ }
      this.renderFound()
      const seen = this.travel.querySelector(`[data-seen="${p.id}"]`)
      if (seen) seen.textContent = '★'
      if (this.found() === this.total()) window.setTimeout(() => this.toast('★ You found every project. Thanks for exploring.', 6000), 400)
    }
  }

  private typewrite(s: string) {
    const el = $('d-text')
    clearInterval(this.typing)
    let i = 0
    el.textContent = ''
    this.typing = window.setInterval(() => {
      i += 2
      el.textContent = s.slice(0, i)
      if (i % 6 === 0) this.sound.blip()
      if (i >= s.length) { clearInterval(this.typing); el.textContent = s }
    }, 22)
  }

  close() {
    if (!this.dialogOpen) return
    this.dialogOpen = false
    clearInterval(this.typing)
    this.dialog.hidden = true
    this.sound.close()
    this.hooks.onClose()
  }
}
