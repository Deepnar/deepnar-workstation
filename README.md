# deepnar — workstation portfolio

My portfolio as an interactive browser-based research/development workstation:
Neovim-inspired TUI shell, Hyprland-like motion, real working terminal, contextual
local assistant, and my actual work embedded as files, workspaces and artifacts.

Live: deploy via **GitHub → Vercel → Import → Deploy**. No env vars needed.

## stack

Next.js (app router) · React · TypeScript · Tailwind v4 · Zustand · framer-motion ·
lucide-react. JetBrains Mono + Inter via `next/font`. No backend, no DB, no LLM key.
The terminal is a custom lightweight emulator + parser (xterm.js deliberately
deferred — keeps the static bundle small; the parser interface allows a swap).
The assistant is a deterministic local intent engine (`src/lib/assistant/`).

## run

```sh
npm install
npm run dev        # http://localhost:3000
npm run lint       # tsc + secret scan
npm run build      # production build
npm run sync-github  # refresh github-sync.json via gh (manual reconcile into oss.ts)
```

## content — where to edit

All portfolio data lives in `src/content/` — UI reads from there, nothing is
hardcoded in components:

| file | what |
|---|---|
| `profile.ts` | identity, links, education, stack (single source) |
| `projects.ts` | flagships + archive/team lanes, evidence, links |
| `research.ts` | papers, experiments (metrics or `null`), timeline |
| `oss.ts` | PRs with `merged`/`open` state — verify with `gh` before claiming |
| `navigation.ts` | workspaces + explorer tree |

Rules: never invent metrics (use `null` + “qualitative” label), label team work
as team work with your lane, prefer the most recently verifiable source on
conflicts. `CGPA` and other changing facts live in `profile.ts`/`research.ts`.

## terminal commands

`help ls cd pwd tree open cat find grep projects research oss about resume contact
github whoami neofetch theme history clear ask` + easter eggs
(`vim`, `sudo hire deepnar`, `fortune`, `cowsay`, `rm -rf /` refuses).
Plain English works too — unknown long input routes to the local assistant.

## keyboard

`1–8` workspaces · `ctrl/⌘k` palette · `ctrl/⌘p` finder · `ctrl+`` terminal ·
`:` terminal · `/` assistant · `?` help · `esc` close · `↑↓/tab` history/complete.

## assistant (no LLM)

`src/lib/assistant/engine.ts`: normalize → entities/aliases → workspace context
(“this” = current project) → scored intents → retrieve from content → templated
answer with `◇ detecting → ◇ searching → ◆ answer` staging (90ms steps, instant
under `prefers-reduced-motion`). Unknown → “not indexed yet” + suggestions.
Optional future `/api/ask` BYOK route must stay isolated — the site works without it.

## deploy

Vercel: import the repo, Deploy. No environment variables. Static-friendly
(prerendered `/`); no `output: "export"` lock-in so a future API route still works.

## privacy

`npm run scan-secrets` runs on lint. Never commit: phone, addresses, IDs, keys,
tokens, private email bodies, `rzp_live_` keys. The Razorpay integration in
RapidRail is test-mode demo only — keep it described that way.
