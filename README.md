# Luna Noir: a tiny pixel world

An interactive portfolio for [lunanoir21](https://github.com/lunanoir21). You walk a small
night world; every building is a project.

- **Engine:** TypeScript + Canvas 2D, written from scratch. No game framework, no image assets:
  every sprite, the dithered sky, parallax, lights and both characters are drawn in code.
- **Sound:** procedural WebAudio (drone, wind, generative pentatonic arp, blips). No audio files.
- **UI:** DOM overlay with Pixelify Sans and Press Start 2P (self-hosted via Fontsource).
- **Data:** star counts refresh from the GitHub API at runtime; offline falls back to built-in numbers.

## Controls

| Input | Action |
|---|---|
| `A` `D` / `←` `→` | walk (hold `Shift` to run) |
| `E` / `Enter` / `Space` | enter the building you stand at |
| `M` | map / fast travel (`1`–`9` jump) |
| click / tap | walk there; click a building to walk and open it |
| click the moon | shooting star; click Petty | meow |

## Develop

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # type-check + production build into dist/
```

Dev-only screenshot hook: `/?at=1160&open=flare&still` teleports and opens a project.

## Add a project

Add an entry to `PLACES` in `src/data.ts` and a building in `src/buildings.ts`
(`makeBuildings`). Keep `x` spacing around 380px.

## Deploy

Pushing to `main` deploys `dist/` through `.github/workflows/pages.yml`.
In the repo settings choose **Pages → Source: GitHub Actions**.
