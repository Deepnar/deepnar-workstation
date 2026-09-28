// Projects — content per DEEPNAR_PORTFOLIO_MASTER_CONTENT_AND_GRAPH.md.
// Verified Sep 2026 against local /home/deepnar/Programs/* + `gh`.
// Rules: local source wins for meaning, GitHub wins for metadata.
// Fast-changing metadata (stars, releases, tags, pushes) lives in
// src/generated/github.json and renders in RepoMetaRail — NEVER in prose.
// kind: solo (personal) | team (owned lane, never sole credit) | practice.
export interface Project {
  slug: string;
  name: string;
  bucket: "projects" | "collaborations" | "practice" | "systems";
  /** practice sub-shelf: ml | software | early */
  track?: "ml" | "software" | "early";
  /** canonical owner/name, even when private */
  repo: string;
  upstream?: string;
  kind: "solo" | "team" | "practice";
  /** primary technical domain — exactly one per project (Signal filter reuses this) */
  domain: "AI/ML" | "RESEARCH" | "SOFTWARE" | "SYSTEMS";
  /** contextual modifier only — TEAM/OSS are not technical domains */
  modifier?: "TEAM" | "OSS";
  /** provenance: competitions / publications / presentations (evidence-backed only) */
  recognition?: Recognition[];
  visibility: "public" | "private";
  period: string;
  status: string;
  blurb: string;
  stack: string[];
  /** github omitted for private source — rail shows `private source` instead */
  links: { github?: string; demo?: string; arxiv?: string; doi?: string };
  lane?: string[];
  evidence: string[];
  motivation?: string;
}

export interface Recognition {
  type: "competition" | "publication" | "presentation" | "award" | "program";
  name: string;
  stage?: string;
  year?: number;
  /** anchor id inside ~/about/notable.md */
  target?: string;
}

/** full VFS directory for a project entry (mirrors the curated tree) */
export const dirOf = (p: Project): string => {
  const H = "/home/deepnar";
  if (p.bucket === "projects") return `${H}/projects/${p.slug}`;
  if (p.bucket === "systems") return `${H}/projects/systems/${p.slug}`;
  if (p.bucket === "collaborations") return `${H}/projects/collaborations/${p.slug}`;
  return `${H}/projects/practice/${p.track ?? "software"}/${p.slug}`;
};

export const projects: Project[] = [
  {
    slug: "ice",
    domain: "RESEARCH",
    recognition: [{type: "publication", name: "LSREP · arXiv 2609.16730", year: 2026, target: "ev-lsrep"}],
    name: "ICE — Infinite Context Engine",
    bucket: "projects",
    repo: "Deepnar/ice",
    kind: "solo",
    visibility: "public",
    period: "Jun 2026 — Present",
    status: "research · v3 system line active (paper line: frozen v2)",
    blurb:
      "A local-first memory layer for conversational AI. It sits between an OpenAI-compatible client and a model and turns long-running conversation state into explicit memory, retrieval, and maintenance machinery instead of treating the context window as if it were memory.",
    stack: ["Python", "PyTorch", "FastAPI", "PostgreSQL + pgvector", "SQLAlchemy", "Docker", "Ollama"],
    links: { github: "https://github.com/Deepnar/ice", arxiv: "https://arxiv.org/abs/2609.16730", doi: "https://doi.org/10.5281/zenodo.21759702" },
    evidence: [
      "Synchronous pre-flight before each model call, asynchronous post-flight after it: a small classifier estimates topic, intent, and context reliance before retrieval; post-flight maintenance extracts, decays, clusters, compacts, and reconciles stored state.",
      "Hybrid retrieval (lexical · vector · graph · procedural · document · timeline) with rank fusion, dedup, diversification, and explicit token budgets. Memory is earned — not every turn deserves lossless storage.",
      "Stores span episodic, temporally versioned knowledge-graph, procedural, and document memory; the graph keeps valid_from / valid_until history so superseded facts stay queryable without staying current.",
      "Frozen v2 paper-run (LSREP replay): 1,985 turns · 219 probes · 1,211 observations · 52 checkpoints. Ordinary density showed no clear answer-quality gap vs vector-RAG while selecting fewer fragments; under density stress the unbudgeted baseline collapsed and ICE held.",
      "Matched LongMemEval check exposed the honest failure: frozen ICE v2 loses decisively to pure vector-RAG there. The fidelity audit separates mechanisms that reached output from ones that ran inert or defective.",
      "Tagged v2-paper-eval on GitHub; paper, source, harness, and audit public under Apache-2.0.",
    ],
    motivation:
      "Once a conversation gets long enough, the model stops carrying decisions, history, and changing facts reliably. Larger context windows delay that failure without giving the system a durable model of what should be remembered, superseded, retrieved, or forgotten.",
  },
  {
    slug: "presentation-forge",
    domain: "SOFTWARE",
    name: "Presentation Forge",
    bucket: "projects",
    repo: "Deepnar/presentation-forge",
    kind: "solo",
    visibility: "public",
    period: "Aug — Sep 2026",
    status: "active · self-hosted",
    blurb:
      "A local-first research-to-artifact pipeline for academic presentations and companion reports. A topic goes in; researched, editable .pptx / .docx artifacts come out. The model never writes layout — it chooses a semantic slide type and writes structured content while human-authored themes and deterministic renderers own geometry.",
    stack: ["Node.js", "React/Vite", "Ollama", "SQLite", "Docker"],
    links: { github: "https://github.com/Deepnar/presentation-forge" },
    evidence: [
      "74 semantic slide types · 34 themes that restyle the same content without changing its meaning; real editable PowerPoint text for normal slide types.",
      "Pipeline: brief → research (SearXNG, arXiv, Crossref, uploads, scoped per slide) → outline → HUMAN APPROVAL → schema-constrained content → deterministic render → raster preview → text/geometry checks + visual critique → PPTX · DOCX · report · script.",
      "Output verification reads its own output back: whether fields were drawn, fit, remained visible, and survived rasterisation. A .pptx on disk proves almost nothing about usability, so the pipeline checks.",
      "Local Ollama support or BYOK OpenAI-compatible providers; Docker-first self-hosting; complete public sample decks with PDF/PPTX/report/script artifacts.",
    ],
    motivation:
      "A language model can write good content and still produce brittle geometry the moment text length changes. Separating what a slide is from how it is laid out fixes that failure mode.",
  },
  {
    slug: "timetable-generator",
    domain: "SOFTWARE",
    name: "Timetable Generator",
    bucket: "projects",
    repo: "Deepnar/timetable-generator",
    kind: "solo",
    visibility: "public",
    period: "Mar 2026 — Present",
    status: "active development",
    blurb:
      "A standalone scheduling service for institutions that turns rooms, faculty, student groups, subjects, assignments, and policy constraints into ranked timetable candidates. Profiles define the resources and rules a run may see; the solver emits diversified candidates; admins review, select, and publish one; future runs treat published schedules as live reservations.",
    stack: ["FastAPI", "PostgreSQL", "SQLAlchemy", "Alembic", "Google OR-Tools", "Next.js", "Docker"],
    links: { github: "https://github.com/Deepnar/timetable-generator" },
    evidence: [
      "Two solvers: deterministic greedy (most-constrained-first) and Google OR-Tools CP-SAT. Hard constraints are inviolable; soft constraints contribute weighted scores via a data-driven constraint registry.",
      "One engine covers class, faculty, room-utilisation, event/seminar, industry-program, exam, and lab timetables; candidate lifecycle DRAFT → SELECTED → PUBLISHED → ARCHIVED.",
      "Cross-timetable safety tracked per resource — faculty, room, and group reservations are independent conflict sets, so “same teacher, different room” can't slip through.",
      "PDF, CSV, and iCal exports share one filtering layer; every mutating API call is audit-logged; backend FastAPI + SQLAlchemy/PostgreSQL with a Next.js admin UI.",
    ],
    motivation:
      "Scheduling fails when rules live in people's heads. This makes those rules inspectable and lets the solver fail loudly when reality is impossible.",
  },
  {
    slug: "prompt-routing-classifier",
    domain: "AI/ML",
    name: "Prompt Routing Classifier",
    bucket: "projects",
    repo: "Deepnar/prompt-routing-classifier",
    kind: "solo",
    visibility: "public",
    period: "Mar 2026",
    status: "complete · basis for ICE router",
    blurb:
      "A lightweight multi-label NLP classifier that decides what kind of prompt a system is looking at before a large model handles it. Deliberately CPU-cheap: routing should cost less than the model call it is trying to avoid.",
    stack: ["Python", "sentence-transformers", "scikit-learn", "NumPy", "Pandas"],
    links: { github: "https://github.com/Deepnar/prompt-routing-classifier" },
    evidence: [
      "all-MiniLM-L6-v2 sentence embeddings (384-d) + one-vs-rest logistic regression over a ~5,100-prompt labelled corpus.",
      "Held-out baseline around 0.68 F1 topic / 0.56 intent. Prompts come from private conversation history and are not published.",
      "The first concrete version of an idea that became central in ICE: don't ask an expensive model to infer every routing decision implicitly — build a cheap explicit pre-flight signal first. (ICE's later classifier is a larger design; its numbers stay with ICE.)",
    ],
    motivation:
      "Can a tiny CPU classifier route prompts well enough that a big model never has to guess about context?",
  },
  {
    slug: "deepnar-workstation",
    domain: "SOFTWARE",
    name: "deepnar workstation",
    bucket: "projects",
    repo: "Deepnar/deepnar-workstation",
    kind: "solo",
    visibility: "private",
    period: "Sep 2026 — Present",
    status: "active · this site",
    blurb:
      "This portfolio is itself a project: a browser-based personal Linux workstation rather than a scrolling collection of project cards. It borrows interaction ideas from Hyprland, Neovim, Yazi, tmux, and terminal-native AI tools — and the portfolio data lives in a virtual filesystem so Explorer, terminal, finder, buffers, the local assistant, and project navigation all resolve the same objects.",
    stack: ["Next.js", "TypeScript", "xterm.js", "Zustand", "d3-force", "Playwright"],
    links: {},
    evidence: [
      "System layers: boot/greeter → Hyprland-like desktop workspaces → workstation app → one VFS (file browser + preview, editor buffers, safe shell interpreter, finder, deterministic local agent, project/research/OSS content).",
      "The terminal never gets real machine shell access: an xterm frontend over a controlled interpreter on the same VFS the graphical browser uses.",
      "The local assistant uses no LLM or server — deterministic intent/entity matching over structured portfolio data, with context, navigation, and downloads; visitor data goes nowhere.",
      "State-driven pixel companion, real GitHub activity sync, resizable panes, multiple terminal sessions, separate desktop playgrounds (Orbit, Signal graph).",
      "Not a fake OS with calculator clones — the machine exists to expose the work.",
    ],
    motivation:
      "A resume lists projects; a workstation lets you interrogate them — same objects through a browser, a shell, a finder, and an agent.",
  },
  {
    slug: "orien-config",
    domain: "SYSTEMS",
    name: "orien-config",
    bucket: "systems",
    repo: "Deepnar/orien-config",
    kind: "solo",
    visibility: "public",
    period: "2025 — Present",
    status: "maintained",
    blurb:
      "Linux machine configuration and recovery snapshot for a CachyOS + Hyprland workstation, managed with chezmoi. Split between portable configuration and machine-specific state so a future migration never blindly recreates one laptop's workarounds.",
    stack: ["chezmoi", "Hyprland", "Caelestia", "Zsh", "Neovim", "Ghostty", "tmux", "Yazi", "systemd", "Ollama"],
    links: { github: "https://github.com/Deepnar/orien-config" },
    evidence: [
      "Portable layer: Zsh + Starship, Ghostty, Neovim (LazyVim), Yazi, Fastfetch/Cava, screenshot tooling, Caelestia/Hyprland personal overrides, personal scripts.",
      "Machine snapshots (Lenovo Legion): power/profile, audio, kernel/module quirks, systemd services and logind, keyd device mapping, Ollama service config — reference material, not a generic installer.",
      "Package lists are inventories (explicit pacman + AUR), not a pretend one-command installer.",
      "Design rule: preserve configuration, not accidental state — caches, histories, credentials, sessions, and runtime data are excluded; a known-good recovery reference first.",
    ],
    motivation:
      "Dotfiles rot into folklore. This is the workstation's memory of itself: what reproduces, what was a one-machine quirk, and the difference written down.",
  },
  {
    slug: "nexus",
    domain: "AI/ML",
    modifier: "TEAM",
    name: "NEXUS Fraud Detection",
    bucket: "collaborations",
    repo: "Deepnar/NEXUS-Fraud-Detection",
    upstream: "Rishit1769/NEXUS-Fraud-Detection",
    kind: "team",
    visibility: "public",
    period: "Sep 2026",
    status: "team · expansion PR merged upstream",
    blurb:
      "Team fraud-safety platform for suspicious messages, links, emails, conversations, and transactions — deterministic evidence extraction, versioned scoring rules, optional model explanations, user reporting flows, and an officer investigation portal.",
    stack: ["TypeScript", "Next.js", "Python", "XGBoost", "scikit-learn", "MySQL", "Prisma"],
    links: { github: "https://github.com/Rishit1769/NEXUS-Fraud-Detection/pull/1" },
    lane: [
      "transaction fraud head (XGBoost + calibration)",
      "message-head upgrade (TF-IDF + direction features)",
      "URL-head debias",
      "website txn flows + admin AI-provider console",
      "removed WhatsApp/n8n dependency",
    ],
    evidence: [
      "My expansion: transaction-fraud head with XGBoost, calibration, and grouped user/card splitting; message model with char/word TF-IDF and directional features; URL head debiased against brittle www / bare-domain behavior.",
      "Transaction head reached test PR-AUC around 0.707 (0.689 on a fresh-seed check). Message and URL probe suites improved substantially after the feature/augmentation changes.",
      "Added user transaction flows and an admin-swappable AI-provider surface; removed the WhatsApp/n8n dependency from my branch of the expansion work.",
      "Documented evaluation results and unresolved operating-threshold/auth concerns in the PR instead of hiding them.",
    ],
  },
  {
    slug: "civicresolve",
    domain: "SOFTWARE",
    modifier: "TEAM",
    recognition: [{type: "competition", name: "SIH 2025", stage: "cleared two institute rounds", year: 2025, target: "ev-sih-2025"}, {type: "competition", name: "DIPEX 2026 · State Final", stage: "working model exhibited 5–8 Mar 2026", year: 2026, target: "ev-dipex-2026"}],
    name: "CivicResolve",
    bucket: "collaborations",
    repo: "Deepnar/CivicResolve",
    upstream: "Newer1107/CivicResolve",
    kind: "team",
    visibility: "public",
    period: "Aug 2025 — Mar 2026",
    status: "team of 6 · SIH ×2 rounds, DIPEX state final",
    blurb:
      "A civic issue reporting and municipal-workflow platform: citizens submit problems, organizations assign and resolve them, duplicate reports can be reviewed, appeals are tracked — reachable from web and WhatsApp. Next.js + TypeScript + MySQL/Prisma + Redis, maps, role-aware admin, photo-based flows, AI image analysis/chat.",
    stack: ["TypeScript", "Next.js", "MySQL", "Prisma", "Redis", "Docker"],
    links: { github: "https://github.com/Deepnar/CivicResolve" },
    lane: [
      "AI Observation Engine (street-imagery verification, worker, tests, docs)",
      "security threat model + infrastructure cost model",
      "pitch at SIH ×2 rounds and DIPEX state final",
    ],
    evidence: [
      "My lane centered on the AI Observation Engine for street-imagery verification, including the worker path, tests, and documentation — merged after maintainer review.",
      "Progressed through SIH institute rounds into DIPEX regional/state stages; team grew 2 → 6.",
    ],
  },
  {
    slug: "rapidrail",
    domain: "SOFTWARE",
    modifier: "TEAM",
    name: "RapidRail",
    bucket: "collaborations",
    repo: "Deepnar/rapidrail-utf-project",
    kind: "team",
    visibility: "public",
    period: "2026",
    status: "3-person team · student demo",
    blurb:
      "A three-person student project for Mumbai suburban railway ticketing: booking, wallet, distance-based fares, QR e-tickets, history/validation, admin surface — Java, Spring Boot, JPA, MySQL, plain web frontend.",
    stack: ["Java", "Spring Boot 3", "MySQL", "JPA", "ZXing QR", "Razorpay (test mode)"],
    links: { github: "https://github.com/Deepnar/rapidrail-utf-project" },
    lane: [
      "core service: booking, wallet, QR e-tickets, fare engine",
      "README + docs, sensitive local config moved out of committed source",
    ],
    evidence: [
      "Razorpay flow is deliberately a demo: test keys, checkout, server-side signature verification, and wallet credit work — no live keys, no webhook handler, not production billing.",
      "The step from earlier Java/JDBC apps into a layered Spring Boot service with external integration and generated QR artifacts.",
    ],
  },
  {
    slug: "iis-mini",
    domain: "AI/ML",
    modifier: "TEAM",
    name: "Credit-card fraud detection — team ML study",
    bucket: "collaborations",
    repo: "Deepnar/iis-mini-fraud",
    kind: "team",
    visibility: "public",
    period: "Sep 2026",
    status: "team ML plan · Person-1 lane",
    blurb:
      "A three-lane machine-learning comparison on the IBM synthetic credit-card transaction dataset (~24.4M transactions, ~0.12% fraud): classical models, boosting, and imbalance/sampling experiments under one shared evaluation standard. Accuracy rejected as headline metric — PR-AUC, precision, recall, F1, and confusion matrices instead.",
    stack: ["Python", "scikit-learn", "pandas", "uv"],
    links: { github: "https://github.com/Deepnar/iis-mini-fraud" },
    lane: [
      "Person-1 lane: classical baselines (LogReg + RF, full sweep)",
      "REPORT_PERSON1.md + outputs",
    ],
    evidence: [
      "Strongest Random Forest baseline: PR-AUC 0.618 on the locked test split. Threshold 0.5 → ~0.24 moved recall ~0.43 → ~0.59 and F1 ~0.59 → ~0.67 without retraining — operating point, not ranking quality (PR-AUC unchanged).",
      "Class weighting helped Logistic Regression recall but could damage Random Forest ranking: imbalance handling had to be evaluated per model, not applied as a universal fix.",
    ],
  },
  /* ── practice · ml ── */
  {
    slug: "micrograd-from-scratch",
    domain: "AI/ML",
    name: "micrograd-from-scratch",
    bucket: "practice",
    track: "ml",
    repo: "Deepnar/micrograd-from-scratch",
    kind: "practice",
    visibility: "public",
    period: "—",
    status: "practice",
    blurb: "A from-scratch scalar autodiff engine and small fully connected network: custom Value object, operator-overloaded graphs, reverse-mode autodiff, gradient accumulation, visualisation, Neuron/Layer/MLP, MSE loss, manual training loop. Backprop explicit before trusting a framework.",
    stack: ["Jupyter Notebook", "Python"],
    links: { github: "https://github.com/Deepnar/micrograd-from-scratch" },
    evidence: [],
  },
  {
    slug: "gradient-descent-from-scratch",
    domain: "AI/ML",
    name: "gradient-descent-from-scratch",
    bucket: "practice",
    track: "ml",
    repo: "Deepnar/gradient-descent-from-scratch",
    kind: "practice",
    visibility: "public",
    period: "Jan — Feb 2026",
    status: "practice",
    blurb: "Minimal linear regression in pure NumPy with hand-derived gradients: y = wx + b, MSE, batch updates converging toward the expected slope/intercept on synthetic y = 2x + 1. Deliberately tiny — the optimization step before autodiff.",
    stack: ["NumPy", "Python"],
    links: { github: "https://github.com/Deepnar/gradient-descent-from-scratch" },
    evidence: [],
  },
  {
    slug: "wine-quality-regression",
    domain: "AI/ML",
    name: "wine-quality-regression",
    bucket: "practice",
    track: "ml",
    repo: "Deepnar/wine-quality-regression",
    kind: "practice",
    visibility: "public",
    period: "Jan — Feb 2026",
    status: "practice",
    blurb: "Compact regression on the red-wine quality dataset: cleaning/splitting, scaling, ensemble comparison (Random Forest vs Gradient Boosting) on MAE/MSE/R² — intuition about nonlinear tabular models and continuous targets vs labels.",
    stack: ["scikit-learn", "Pandas"],
    links: { github: "https://github.com/Deepnar/wine-quality-regression" },
    evidence: [],
  },
  {
    slug: "titanic-ml-pipeline",
    domain: "AI/ML",
    name: "titanic-ml-pipeline",
    bucket: "practice",
    track: "ml",
    repo: "Deepnar/titanic-ml-pipeline",
    kind: "practice",
    visibility: "public",
    period: "Jan — Feb 2026",
    status: "practice",
    blurb: "End-to-end Titanic classification: missing-value handling, FamilySize / IsAlone / FarePerPerson features, explicit repeatable preprocessing, then LogReg / Random Forest / Naive Bayes / SVM-GridSearch comparison plus PCA visualisation. The pipeline is the point, not the dataset.",
    stack: ["scikit-learn", "Pandas"],
    links: { github: "https://github.com/Deepnar/titanic-ml-pipeline" },
    evidence: [],
  },
  {
    slug: "ppo-clip-demo",
    domain: "AI/ML",
    name: "PPO-Clip Pendulum demo",
    bucket: "practice",
    track: "ml",
    repo: "Deepnar/ppo-clip-demo",
    kind: "practice",
    visibility: "public",
    period: "—",
    status: "practice · classroom demo",
    blurb: "Small RL demo of PPO-Clip on Gymnasium Pendulum-v1, built for a classroom presentation and shipped with the trained policy artifact. Recorded run −300.74 ± 209.10 mean return (+983.45 over untrained; Pendulum rewards are non-positive, closer to zero is better). PPO mechanics, not novel research.",
    stack: ["Python", "Gymnasium"],
    links: { github: "https://github.com/Deepnar/ppo-clip-demo" },
    evidence: [],
  },
  /* ── practice · software ── */
  {
    slug: "ds-practice",
    domain: "AI/ML",
    name: "DS-Practice",
    bucket: "practice",
    track: "software",
    repo: "Deepnar/DS-Practice",
    kind: "practice",
    visibility: "public",
    period: "—",
    status: "practice · coursework",
    blurb: "Long-running coursework/foundations repo: data structures, algorithms, OS exercises, networking programs (TCET). Linked lists, stacks/queues, sorting, Dijkstra, Kruskal, Floyd-Warshall, LCS, N-Queens, A* 15-puzzle, KMP, Rabin-Karp, Banker's, page replacement, CRC/Hamming, TCP/UDP socket pairs. Implementations stay close to the algorithm; alternate versions kept, not overwritten.",
    stack: ["Python", "Java"],
    links: { github: "https://github.com/Deepnar/DS-Practice" },
    evidence: [],
  },
  {
    slug: "movie-ticket-booking",
    domain: "SOFTWARE",
    name: "CineBook — Movie Ticket Booking",
    bucket: "practice",
    track: "software",
    repo: "Deepnar/movie-ticket-booking",
    kind: "practice",
    visibility: "private",
    period: "—",
    status: "practice · student demo",
    blurb: "Spring Boot / JPA / MySQL booking with plain HTML/CSS/JS frontend: browse movies/shows, book multiple seats, pay from an internal wallet, QR-coded ticket, history, cancel with seat/balance restoration; admin manages movies/cinemas/shows and validates tickets. Standard layered path (controllers → services → JPA → MySQL); no production-auth/payment claims.",
    stack: ["Java", "Spring Boot", "MySQL", "JPA"],
    links: {},
    evidence: [],
  },
  {
    slug: "hostel-room-allocation-system",
    domain: "SOFTWARE",
    name: "ZenHostel — Hostel Room Allocation",
    bucket: "practice",
    track: "software",
    repo: "Deepnar/hostel-room-allocation-system",
    kind: "practice",
    visibility: "public",
    period: "—",
    status: "practice",
    blurb: "Core-Java web app (Servlets/JSP, JDBC, MySQL, MVC): students/guests register, view availability, hold one active room at a time; student pricing rule; admin rooms view plus occupancy/earnings metrics. The earlier Java-web step before Spring Boot — routing, DAO persistence, role views, conflict prevention explicit.",
    stack: ["Java", "Servlets", "JDBC", "MySQL"],
    links: { github: "https://github.com/Deepnar/hostel-room-allocation-system" },
    evidence: [],
  },
  {
    slug: "ecommerce-client",
    domain: "SOFTWARE",
    name: "EcommerceClient",
    bucket: "practice",
    track: "software",
    repo: "Deepnar/EcommerceClient",
    kind: "practice",
    visibility: "public",
    period: "—",
    status: "practice",
    blurb: "Multi-page storefront in plain HTML/CSS/JS before larger framework apps: 20+ pages, responsive Grid/Flexbox, persistent localStorage cart, URL-driven product pages, dynamic rendering, theme persistence. No backend — JavaScript and local data simulate the full shopping flow.",
    stack: ["HTML", "CSS", "JavaScript"],
    links: { github: "https://github.com/Deepnar/EcommerceClient", demo: "https://deepnar.github.io/EcommerceClient/" },
    evidence: [],
  },
  {
    slug: "cricbuzz-app",
    domain: "SOFTWARE",
    name: "CricbuzzApp",
    bucket: "practice",
    track: "software",
    repo: "Deepnar/CricbuzzApp",
    kind: "practice",
    visibility: "private",
    period: "—",
    status: "practice",
    blurb: "Cricket match simulation: Java OOP backend model (teams, batsmen/bowlers/all-rounders, match types, scoring, wickets, results, ratings) plus a separate static frontend for teams/matches/commentary/auth-shaped screens (visual/demo-only). The OOP progression piece: inheritance/abstraction/polymorphism, then a separately hosted browser UI.",
    stack: ["Java", "HTML", "CSS", "JavaScript"],
    links: {},
    evidence: [],
  },
  {
    slug: "quiz-game",
    domain: "SOFTWARE",
    name: "Quiz-Game",
    bucket: "practice",
    track: "software",
    repo: "Deepnar/Quiz-Game",
    kind: "practice",
    visibility: "public",
    period: "—",
    status: "practice · early",
    blurb: "Early Python + MySQL command-line quiz: multiple participants, difficulty levels, score tracking, admin mode for questions. Kept small on purpose — the point where standalone scripts became a stateful database-backed app.",
    stack: ["Python", "MySQL"],
    links: { github: "https://github.com/Deepnar/Quiz-Game" },
    evidence: [],
  },
  {
    slug: "python-practice-lab",
    domain: "SOFTWARE",
    name: "python-practice-lab",
    bucket: "practice",
    track: "software",
    repo: "Deepnar/python-practice-lab",
    kind: "practice",
    visibility: "private",
    period: "—",
    status: "practice · learning archive",
    blurb: "A broad learning archive, not one product: Pandas/NumPy practice, image manipulation, PDF utilities, data-structure exercises, small games, Flask experiments, PyTorch/TensorFlow fundamentals, security/utility scripts. One node explaining the transition from basic Python to the standalone ML/system repos — not eighteen fake projects.",
    stack: ["Python", "Jupyter Notebook"],
    links: {},
    evidence: [],
  },
  /* ── practice · early ── */
  {
    slug: "website-on-ubuntu-vm",
    domain: "SOFTWARE",
    name: "Apache website on an Ubuntu VM",
    bucket: "practice",
    track: "early",
    repo: "Deepnar/website-on-ubuntu-vm",
    kind: "practice",
    visibility: "private",
    period: "—",
    status: "practice · early",
    blurb: "Early deployment/sysadmin exercise: Ubuntu 22.04 in VirtualBox, Apache2 serving a multi-page static site, Guest Additions, manual Unix permissions and deployment into /var/www/html. Small scope, first point where work left “code on my machine” and became a configured Linux service.",
    stack: ["Linux", "Apache2", "VirtualBox"],
    links: {},
    evidence: [],
  },
  {
    slug: "placement-eligibility-checker",
    domain: "SOFTWARE",
    name: "Student Placement Eligibility System",
    bucket: "practice",
    track: "early",
    repo: "Deepnar/Placement-Eligibility-Checker",
    kind: "practice",
    visibility: "private",
    period: "—",
    status: "course assignment · early",
    blurb: "Early C++ console assignment (IIT Bombay C/C++ Spoken Tutorial course): collects student/branch/academic/test details, applies explicit eligibility/category rules, produces a placement recommendation. A course assignment, clearly labeled — rule-driven procedural programming before databases, web, ML, and solvers.",
    stack: ["C++"],
    links: {},
    evidence: [],
  },
  {
    slug: "pricing-tier-panel",
    domain: "SOFTWARE",
    name: "Pricing Tier Panel",
    bucket: "practice",
    track: "early",
    repo: "Deepnar/Pricing-Tier-Panel",
    kind: "practice",
    visibility: "private",
    period: "—",
    status: "code-along · early",
    blurb: "Responsive HTML/CSS pricing component built as a web-development code-along: three-tier layout, responsive behavior, Google Fonts, hover styling. Code-along disclosed — the value is documenting the early CSS/layout stage that grew into larger browser apps.",
    stack: ["HTML", "CSS"],
    links: {},
    evidence: [],
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
