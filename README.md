# deepnar workstation

Deepesh Sonar's portfolio as an interactive browser-based Linux
workstation. Enter a guest session, open the workstation app, and explore
the work as files, terminal sessions, research runs and git lanes.

## Run

```sh
npm install
npm run dev        # http://localhost:3000
npm run lint       # typecheck + secret scan
npm run build
```

## Use

- Boot → greeter → `[ enter guest session ]` → desktop → open `workstation`
- Workspaces `1–5`: home · projects · research · git · profile
- `ctrl+k` finder · `ctrl+\`` terminal · `/` local-index assistant · `?` help
- Terminal: `ls · tree · cd · cat · open · find · grep · ask · neofetch`
- Buffers: `:e <path>` · `:bd` · `:bnext` · `:bprev`
- Deep links: `?open=~/projects/ice/README.md`, `#/projects/ice`

## Maintain

- Content: `src/content/` (verified data only) → VFS in `src/vfs/`.
- GitHub snapshot: `npm run sync-github` (local `gh` auth; deploys never need it).
- Public CV: `npm run make-resume`.
- Design decisions: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Deploy

No server, no env vars, no keys. Push to GitHub → import in Vercel → deploy.
