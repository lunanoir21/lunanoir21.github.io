export type Kind = 'home' | 'project' | 'contact'

export interface Place {
  id: string
  kind: Kind
  name: string
  short: string
  repo?: string
  tagline: string
  about: string
  lang?: string
  stars?: number
  color: string
  dark: string
  url: string
  live?: string
  x: number
}

export const WORLD_W = 3700

export const PLACES: Place[] = [
  {
    id: 'home', kind: 'home', name: 'Luna’s Cabin', short: 'HOME',
    tagline: 'Luna Noir. Vibe coder.',
    about: 'I build with AI and I say so. Hyprland rice, Quickshell widgets, Rust tools. Everything here is local-first, telemetry-free and open source. Walk right to see what I made.',
    color: '#f7d58a', dark: '#8a5b9a', url: 'https://github.com/lunanoir21', x: 300,
  },
  {
    id: 'island', kind: 'project', name: 'Dynamic Island', short: 'ISLAND', repo: 'quickshell-dynamic-island',
    tagline: 'A monochrome pill that lives on your screen.',
    about: 'A Dynamic Island for Hyprland built on Quickshell. MPRIS media with a cava-driven spectrum, timers and alarms, a pixel-art clock, and live mic and camera privacy indicators.',
    lang: 'QML', stars: 13, color: '#ef6f55', dark: '#a8402c',
    url: 'https://github.com/lunanoir21/quickshell-dynamic-island', live: 'https://lunanoir21.github.io/quickshell-dynamic-island/', x: 760,
  },
  {
    id: 'flare', kind: 'project', name: 'Flare Notch', short: 'FLARE', repo: 'flare-notch',
    tagline: 'Your AI limits, on the edge of the screen.',
    about: 'An AI coding usage notch for Quickshell on Hyprland. Claude Code, Codex, Cursor, OpenCode, Antigravity and Kiro limits, one glance away.',
    lang: 'QML', stars: 6, color: '#e8b449', dark: '#a67a22',
    url: 'https://github.com/lunanoir21/flare-notch', live: 'https://lunanoir21.github.io/flare-notch/', x: 1160,
  },
  {
    id: 'quay', kind: 'project', name: 'Quay', short: 'QUAY', repo: 'quickshell-quay',
    tagline: 'A launcher rail that moves one row per notch.',
    about: 'A vertical, home-screen-style app launcher for Quickshell. Pinned apps, folders and live window previews in one rail that moves one row per wheel notch.',
    lang: 'QML', stars: 6, color: '#5bb59a', dark: '#35806a',
    url: 'https://github.com/lunanoir21/quickshell-quay', x: 1520,
  },
  {
    id: 'life', kind: 'project', name: 'Life OS', short: 'LIFE OS', repo: 'Life-os-project',
    tagline: 'Habits, money, notes and workouts. Local-first.',
    about: 'An open-source, local-first personal life OS. Habits, finance, notes, workouts, recipes and more. Built with Next.js 14 and TypeScript. Your data stays on your machine.',
    lang: 'TypeScript', stars: 6, color: '#8aa4f0', dark: '#5870b8',
    url: 'https://github.com/lunanoir21/Life-os-project', live: 'https://lunanoir21.github.io/Life-os-project/', x: 1900,
  },
  {
    id: 'tally', kind: 'project', name: 'Tally', short: 'TALLY', repo: 'tally-screentime',
    tagline: 'Screen time, counted by a clock tower.',
    about: 'Screen time for Quickshell on Hyprland. A pill on your bar and a card under it, with PNG, PDF and interactive HTML reports.',
    lang: 'QML', stars: 5, color: '#c58be0', dark: '#8e58aa',
    url: 'https://github.com/lunanoir21/tally-screentime', live: 'https://lunanoir21.github.io/tally-screentime/', x: 2280,
  },
  {
    id: 'inktype', kind: 'project', name: 'Inktype', short: 'INKTYPE', repo: 'inktype',
    tagline: 'Learn to type by reading real books.',
    about: 'Free, open-source typing practice through real books: Project Gutenberg, Turkish Vikikaynak, effects, themes and stats. Vibe-coded.',
    lang: 'TypeScript', stars: 0, color: '#e6d3a3', dark: '#9c8450',
    url: 'https://github.com/lunanoir21/inktype', live: 'https://lunanoir21.github.io/inktype/', x: 2660,
  },
  {
    id: 'aurguard', kind: 'project', name: 'Aurguard', short: 'AURGUARD', repo: 'aurguard-project',
    tagline: 'A gatekeeper for the AUR.',
    about: 'Security guard for AUR packages. It analyzes PKGBUILD and .install scripts before you install. Rust, multilingual, no telemetry.',
    lang: 'Rust', stars: 1, color: '#ff7a90', dark: '#b04458',
    url: 'https://github.com/lunanoir21/aurguard-project', live: 'https://lunanoir21.github.io/aurguard-project/', x: 3040,
  },
  {
    id: 'mail', kind: 'contact', name: 'Mailbox', short: 'HELLO',
    tagline: 'Leave a note.',
    about: 'Open an issue, star a repo, or just say hi on GitHub. I read everything. Thanks for walking all the way here.',
    color: '#f7d58a', dark: '#8a5b9a', url: 'https://github.com/lunanoir21', x: 3430,
  },
]

const CACHE_KEY = 'luna-stars-v1'

/** Refresh star counts from the GitHub API. Falls back to the numbers above. */
export async function refreshStars(): Promise<void> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (raw) {
      const cached = JSON.parse(raw) as Record<string, number>
      for (const p of PLACES) if (p.repo && cached[p.repo] != null) p.stars = cached[p.repo]
      return
    }
  } catch { /* ignore */ }
  try {
    const res = await fetch('https://api.github.com/users/lunanoir21/repos?per_page=100&type=owner')
    if (!res.ok) return
    const repos = (await res.json()) as { name: string; stargazers_count: number }[]
    const map: Record<string, number> = {}
    for (const r of repos) map[r.name] = r.stargazers_count
    for (const p of PLACES) if (p.repo && map[p.repo] != null) p.stars = map[p.repo]
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(map)) } catch { /* ignore */ }
  } catch { /* offline: keep fallback */ }
}
