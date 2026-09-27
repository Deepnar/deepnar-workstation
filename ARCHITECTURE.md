# ARCHITECTURE — deepnar workstation (public)

A portfolio structured as a small simulated computer. Visitor enters a
guest session, opens one workstation application, and discovers the work
by using the machine: files, terminal, finder, local index, git lanes.

## Layers

```
boot → greeter → desktop → workstation app
                              └─ virtual filesystem
                                   ├─ buffers (files open here)
                                   ├─ terminal (operates on the VFS)
                                   ├─ finder / telescope (searches the VFS)
                                   ├─ assistant (retrieves from the VFS)
                                   └─ portfolio content (lives inside)
```

- `src/system/` — Boot, Greeter, Desktop, Waybar, AppWindow, Overview,
  Pet, Overlays (toasts, contact, settings, help). OS chrome only.
- `src/workstation/` — Workstation shell, buffer line, explorer,
  Terminal, Palette (finder), Assistant, panes (home/research/oss/profile),
  highlight (tiny static syntax highlighters).
- `src/vfs/vfs.ts` — the single filesystem: every node has a path, kind
  (dir/markdown/json/toml/log/link/pdf/contact/resume/activity) and body.
  Explorer, terminal, finder, buffers, breadcrumbs and assistant context
  all resolve through `findNode`/`resolvePath`/`searchVfs`.
- `src/content/` — verified data (profile, projects, research, OSS).
  Bodies in the VFS are assembled from these modules, never invented.
- `src/generated/github.json` — public GitHub snapshot (repo count,
  lifetime merged/open PRs, top stars, 20-week activity). Regenerated
  locally with `npm run sync-github`; the deployed site never needs a token.
- `src/lib/assistant/engine.ts` — deterministic local intent engine:
  normalize → entities → score intents (+workspace context) → retrieve
  from content → templated answer. No model, no key, no network.
- `src/audio/engine.ts` — procedural Web Audio UI sounds + optional
  generative room tone. OFF by default, every cue has a visual twin.

## Workspaces (5)

1 home · 2 projects · 3 research · 4 git · 5 profile.
Notes, contact, resume and the assistant are files/tools, not workspaces.

## Modes

BROWSE · TERMINAL · COMMAND · SEARCH · AGENT — derived from real focus
state, not fake vim modality. Optional vim keys in settings.

## Deliberate non-dependencies

- No xterm.js: no pty exists (all commands are interpreted against the
  VFS), so xterm would add bundle/runtime for rendering the custom shell
  already does — with native selection and screen-reader behavior.
- No cmdk: the finder is custom-styled Telescope semantics (fuzzy files,
  projects, PRs, commands) that cmdk theming would fight.
- No Shiki: static line-based highlighters for json/toml/log cover the
  file types shipped; Shiki's bundle is unjustified here.
- No resizable panel lib: splits are collapsible fixed regions; manual
  dividers would add fragility for little gain.
- No 3D for the companion: SVG + CSS keeps it under a millisecond a frame.

## Content policy

Only verified, public-appropriate material: shipped projects, papers,
merged upstream PRs with owned lanes, curated timeline. No trackers, no
planning notes, no private documents, no credentials. `npm run lint`
typechecks and runs the secret scanner.

## Updating

- Projects/research/OSS: edit `src/content/*`, rebuild.
- GitHub snapshot: `npm run sync-github` (needs `gh` auth locally).
- Public CV: `npm run make-resume` (regenerates the sanitized PDF).
- Deep links: `?open=~/projects/ice/README.md` or `#/projects/ice`.

## Deploy

Static-friendly Next.js, no server required, no env vars. Push to GitHub,
import into Vercel, deploy. All AI/assistant behavior is client-side.
