# deepnar.dev — browser workstation portfolio · PLAN

Source of truth for content: `/home/deepnar/Deepesh CV_files/` (read-only) + `gh` as Deepnar.
Build scope: everything below lives in `/home/deepnar/Programs/portfolio/`. Never touch `~/.config`, never publish secrets.

## 1. Who this is about (verified 27 Sep 2026)

- Deepesh Sonar (Deepnar), Mumbai. BE Computer Engineering, TCET, expected 2028. CGPA 9.53/10 as stated in resume (Sem-IV revaluation pending — keep value in one editable field).
- Public links: github.com/Deepnar · linkedin.com/in/deepeshsonar · orcid.org/0009-0008-1762-4246 · x.com/DeepnarS · 18deepnar@gmail.com · arXiv 2609.16730 (LSREP).
- Voice: "I build systems, then try to break my own claims about them." Direct technical prose. No marketing fluff.
- Flagships (unequal weight): ICE (local-first conv-memory, Python/PyTorch/FastAPI/pgvector/Docker/Ollama, paper: 1985 turns · 219 probes · 1211 obs · 52 checkpoints on frozen v2) → Presentation Forge (15★, self-hosted research→PPTX/DOCX, 74 slide types · 34 themes) → timetable-generator (OR-Tools CP-SAT + greedy, audit/publish workflows) → prompt-routing-classifier (5.1k prompts, F1 0.68 topic / 0.56 intent, basis for ICE router). Archive: micrograd-from-scratch, DS-Practice, from-scratch ML repos.
- OSS merged: ModelDock #221/#222 · vLLM semantic-router #3288 · MNE-Python #14283 · CivicResolve team PR #1. Open/monitored: MNE #14287 · graphiti #1772 · t3code #9031. Never claim sole ownership of team work (CivicResolve team of 6, SIH/DIPEX).
- Skills shown only as evidence: `skill → used in → repo/proof` links. No percentage bars.

## 2. UI/UX Pro Max usage (and deliberate overrides)

Ran `search.py --design-system` + `--domain ux` + `--stack nextjs`. Adopted: JetBrains Mono everywhere chrome; full keyboard operability with visible focus + skip link; App Router; 120–250ms transform/opacity motion with `prefers-reduced-motion`; responsive 375/768/1024/1440.
Rejected with reason: skill's recommended FAQ-landing pattern + green CTA + light-default would turn this into a SaaS page — the brief forbids that. Reinterpreted inside the workstation/TUI language: docs-pattern becomes the file-tree + `help`/`:` command system; green becomes success-only status color; dark stays canonical.

## 3. Identity system (from actual environment, read-only inspection)

- Ghostty: JetBrainsMono Nerd Font · catppuccin-mocha · opacity .8 · pad 10 · no decorations. Hypr: gaps 5/10 · rounding 15 · 1px borders · blur 8/2 · opacity .95 · active-border accent. Nvim: LazyVim + tokyonight. Starship: P10K hybrid `╭─ <os> <dir:3> <git> / ╰─ ❯(green|red)`, right side lang/runtime + `took Xs` + clock.
- Semantic tokens (dark canonical / light daylight-workstation mirror), JetBrains Mono chrome + Inter body:
  `--bg0 #0b0c11 · --bg1 #101117 · --bg2 #151720 · --surface #1b1e27 · --raised #242831 · --border (low-contrast luminance) · --fg #eceefa · --muted #8b91a5 · --accent #9ba7e8 (periwinkle) · --accent2 #6dd6ff (icy) · --warm #f59e72 (sparingly) · --ok #a6e3a1 · --err #f38ba8` (catppuccin-mocha success/error, matches Ghostty). Light: paper `#f4f2ec`, surfaces `#e9e7df/#dedcd2`, ink `#23242c`, same accent hues deepened (`#4c58b8`, `#0369a1`) for 4.5:1.
- Rules: 1px low-contrast borders, brighter active-pane border only; ~zero glow; radius 8–10px; dense grid spacing; thin TUI scrollbars; Lucide icons only (no emoji icons); Starship-style prompt `deepnar@nexus:~/projects/ice$` with `❯`; lualine-style statusline.

## 4. Information architecture — workstation, portfolio is the data

Workspaces (numbered, Hypr-like indicators): `1 home · 2 projects · 3 research · 4 oss · 5 about · 6 notes · 7 contact · 8 ai`. Boot (`$ boot deepnar`, <1s, skippable) → LazyVim-dashboard home (`[f]ind [p]rojects [r]esearch [o]ss [n]otes [a]bout [c]hat [g]ithub [?]help` + recent work, branch, activity).
- Projects as directories (`~/projects/ice/` → README · architecture · experiments · links), flagship depth vs `~/projects/archive`.
- Research as lab notebook (`research/{papers,experiments,evaluations,notes,timeline.log}`), LSREP + ICE v2 numbers only where real; tiny charts only on real data.
- OSS as lazygit view: repos | PRs/activity | diff-detail, from local JSON (see §7).
- About as files (`about/{README,now,stack,timeline,contact}.md`) + readable overview. Contact as `contact.json` + human pane. Resume renders structured data (no private fields; no PDF copied).

## 5. Component architecture (`src/`)

- `shell/`: TopBar (tabs/breadcrumbs/controls) · Explorer (neo-tree style) · Statusline (mode NORMAL/INSERT/COMMAND/SEARCH, path, branch, lang, AI, clock) · TerminalPanel · RightPane (context/AI) · Overview (workspace tiles) · Boot · Pet (idle companion, localStorage off-switch, pauses when hidden).
- `workspaces/`: Home · Projects (+ProjectDetail) · Research · Oss · About · Notes · Contact · AiSession (Codex-style composer + context chips).
- `terminal/`: custom lightweight emulator + parser (history, ↑↓, tab-complete, aliases, easter eggs `neofetch/vim/sudo hire`). xterm.js intentionally deferred: custom keeps static export + bundle small; parser interface allows swap.
- `palette/`: cmdk `Ctrl/⌘K` + Telescope finder (`Ctrl/⌘P`, ↑↓/Enter/Esc, path·title·category·meta).
- `assistant/`: deterministic local intent engine (see §8) rendered with agent activity states (`◇ detecting → ◇ searching → ◆ answer`, 50–150ms steps, never blocking).
- State: Zustand (`workspace, pane visibility, theme, pet, terminal history, assistant context`). Motion: CSS + minimal framer-motion for pane/palette transitions only.

## 6. Keyboard / terminal / palette models

- Global: `1–8` workspaces · `Ctrl/⌘K` palette · `Ctrl/⌘P` finder · `Ctrl+`` terminal · `:` command · `/` search · `?` help · `j/k/h/l Enter Esc gg G` in lists/trees · mouse always first-class equivalent.
- Terminal commands: `help ls cd pwd tree open cat find grep projects research oss about resume contact github whoami neofetch theme history clear ask <nl>`. Paths mirror explorer (`~/projects/ice`). `:w`-style vim jokes → hint. `sudo hire deepnar` → playful hire card. Destructive (`rm -rf /`, `exit`) → in-character refusal/joke, zero side effects.
- Palette actions: Open Project: X · Go to Research/OSS/… · Search · Toggle Terminal/AI/Pet · Theme · Resume · GitHub · Overview · Help.

## 7. Data model (`src/content/*.ts` + generated JSON)

`profile.ts (single source: links, bio, education, status) · projects.ts (slug, blurb, stack, evidence[], links, flagship flag) · research.ts (papers, experiments with real metrics|null, timeline) · oss.ts (prs with state merged|open, repo, url) · navigation.ts (tree) · commands.ts`. `scripts/sync-github.ts` refreshes `oss.json` via `gh` at build/dev time; deployed app ships local JSON (no token, no per-visit API). Cross-check rule: GitHub-vs-CV conflicts prefer newest verifiable + keep field editable.

## 8. Local assistant (no LLM, no key, no server)

`src/lib/assistant/{tokenizer,patterns,intents,matcher,responses,context}.ts`. Flow: normalize → keywords/entities (aliases: oss=open source=contributions=prs; ml=ai=llm) → add workspace context (`currentProject` resolves "this") → score intents (ABOUT, PROJECTS, PROJECT_DETAIL/MOTIVATION/TECH, RESEARCH/RESULT, SKILLS, OSS, EXPERIENCE, EDUCATION, CONTACT, RESUME, GITHUB, CURRENT_WORK, HELP, UNKNOWN) → retrieve from content → templated answer with artifact links. Unknown → in-character "not indexed yet" + suggestions. Empty input → workspace-aware suggestions. ELIZA-style fallback only as rare easter egg.

## 9. Responsive / a11y / performance

Desktop flagship 3-pane; ≤1024px right pane becomes overlay; ≤640px single column, terminal = full sheet, workspaces = nav. Skip link, aria labels, focus-visible rings, semantic landmarks, contrast-checked tokens, no keyboard traps, reduced-motion disables pet/parallax. Static-first (SSG), terminal/palette/assistant lazy-loaded, no WebGL, no background loops, images optimized, fonts via `next/font` (no layout shift).

## 10. Dependencies (pinned at install)

next (app router) · react · typescript · tailwind v4 · zustand · cmdk · framer-motion · lucide-react. No backend, no DB, no xterm (deferred), no chart lib unless real data needs it (then recharts, lazy). Optional future `/api/ask` BYOK route isolated so site works without it.

## 11. Build order (layers)

1 shell+theme+statusline+responsive → 2 content+tree+navigation → 3 terminal+parser+completion → 4 palette+finder+shortcuts → 5 research/oss/project depth → 6 assistant engine + AI pane → 7 pet+theme-switch+overview+eggs+polish. Never start layer N+1 with layer N broken; never animate pet before portfolio has substance.

## 12. Deploy / run / update

`npm i · npm run dev · npm run lint · npm run build`. Vercel: import repo → Deploy (no env needed; static-friendly, no `output:export` lock-in). Update content: edit `src/content/*`, or `npm run sync-github` to refresh OSS JSON. Secrets: none required; `.env.example` documents optional future BYOK only. Pre-ship: lint+build+typecheck clean, keyboard/terminal/palette/mobile/reduced-motion/empty-states/links pass, `npm run scan-secrets` (no phone/ids/keys/tokens in `public/` or content).
