// Flagships first, archive after. No invented metrics — every number below
// was verified against gh / resume / repo README on 27 Sep 2026.
export interface Project {
  slug: string;
  name: string;
  path: string;
  period: string;
  status: string;
  blurb: string;
  stack: string[];
  links: { github: string; arxiv?: string };
  stars: string;
  flagship: boolean;
  evidence: string[];
  motivation?: string;
}

export const projects: Project[] = [
  {
    slug: "ice",
    name: "ICE — Infinite Context Engine",
    path: "~/projects/ice",
    period: "Jun 2026 — Present",
    status: "research · manuscript complete, follow-up eval ongoing",
    blurb:
      "A local-first memory layer for conversational AI: persistent, structured memory for any OpenAI-compatible model, running entirely on your own hardware.",
    stack: ["Python", "PyTorch", "FastAPI", "PostgreSQL + pgvector", "SQLAlchemy", "Docker", "Ollama"],
    links: { github: "https://github.com/Deepnar/ice", arxiv: "https://arxiv.org/abs/2609.16730" },
    stars: "3",
    flagship: true,
    evidence: [
      "Structured episodic, document, procedural and temporal-graph stores behind an OpenAI-compatible proxy.",
      "Pre-flight classifier: multi-head PyTorch head over frozen Qwen3-Embedding-0.6B — 27 labels across topic, intent and context-reliance; calibrated routing decides when retrieval fires at all.",
      "Hybrid retrieval (lexical · vector · graph · procedural · document · timeline) with rank fusion, dedup and bounded token budgets.",
      "LSREP: a longitudinal state-replay protocol for evaluating conversational memory as it evolves over time.",
      "Frozen v2 manuscript reports a controlled evaluation + matched LongMemEval diagnostic: 1,985 turns · 219 probes · 1,211 observations · 52 checkpoints — including failure cases where ICE trails pure vector-RAG.",
    ],
    motivation:
      "Every chat session starts from zero and larger context windows didn't fix it — a window is a buffer, not a memory. The central finding: retrieval quality is governed by what you leave out, not by retrieving more.",
  },
  {
    slug: "presentation-forge",
    name: "Presentation Forge",
    path: "~/projects/presentation-forge",
    period: "Aug — Sep 2026",
    status: "active · self-hosted",
    blurb:
      "Self-hosted research-to-artifact pipeline: topic or sources in, researched, themed, editable PPTX/DOCX and report out. Docker-first, BYOK or Ollama.",
    stack: ["Node.js", "React/Vite", "Ollama", "SQLite", "Docker"],
    links: { github: "https://github.com/Deepnar/presentation-forge" },
    stars: "15",
    flagship: true,
    evidence: [
      "74 slide types · 34 themes with deterministic rendering and schema validation.",
      "Human-approval gates, critique pass and reproducible reports with automated checks.",
      "Local-model support (Ollama) or BYOK providers; no inference bill required.",
    ],
    motivation:
      "Built to make researched decks reproducible artifacts instead of one-off slides — sources in, editable files out, every step checkable.",
  },
  {
    slug: "timetable-generator",
    name: "Timetable Generator",
    path: "~/projects/timetable-generator",
    period: "Mar 2026 — Present",
    status: "active development",
    blurb:
      "Constraint-driven scheduling service for colleges: rooms, faculty, groups and subjects in; ranked, publishable timetables out.",
    stack: ["FastAPI", "PostgreSQL", "SQLAlchemy", "Alembic", "Google OR-Tools", "Docker"],
    links: { github: "https://github.com/Deepnar/timetable-generator" },
    stars: "0",
    flagship: true,
    evidence: [
      "Greedy + OR-Tools CP-SAT solvers under explicit hard constraints and weighted soft-constraint scoring.",
      "Authenticated REST APIs with audit/publishing workflows, shared-resource reservations and cross-timetable safety.",
      "Data-driven constraint registry; no post-generation cleanup hacks.",
    ],
    motivation:
      "Scheduling breaks when constraints live in people's heads. This puts them in a registry and lets the solver argue with reality instead.",
  },
  {
    slug: "prompt-routing-classifier",
    name: "Prompt Routing Classifier",
    path: "~/projects/prompt-routing-classifier",
    period: "Mar 2026",
    status: "complete · basis for ICE router",
    blurb:
      "Multi-label topic + intent classifier for routing prompts to specialised models: sentence embeddings + one-vs-rest logistic regression, CPU-only.",
    stack: ["Python", "sentence-transformers", "scikit-learn", "NumPy", "Pandas"],
    links: { github: "https://github.com/Deepnar/prompt-routing-classifier" },
    stars: "0",
    flagship: true,
    evidence: [
      "5,100-prompt labelled corpus with documented dataset, training path and evaluation split.",
      "Held-out F1 0.68 (topic) / 0.56 (intent); CPU-only inference.",
      "Routing design reused as the basis for ICE's pre-flight classifier.",
    ],
    motivation:
      "Built to answer a concrete question: can a tiny CPU classifier route prompts well enough that a big model never has to guess about context?",
  },
  {
    slug: "nexus",
    name: "NEXUS Fraud Detection (team · my PR merged)",
    path: "~/projects/nexus",
    period: "Sep 2026",
    status: "team · expansion PR merged upstream",
    blurb:
      "Fraud-detection platform (transactions + messages + URLs). I took the deterministic-rules foundation and added a full transaction fraud head, a stronger message head, a debiased URL head, website flows and an admin-swappable AI provider — while removing the WhatsApp/n8n dependency.",
    stack: ["TypeScript", "Next.js", "Python", "XGBoost", "scikit-learn", "MySQL", "Prisma"],
    links: { github: "https://github.com/Rishit1769/NEXUS-Fraud-Detection/pull/1" },
    stars: "—",
    flagship: true,
    evidence: [
      "PR +3,455/−1,228 across 59 files, merged upstream; trains and serves from the repo alone.",
      "Transaction head (XGBoost + Optuna + isotonic calibration, grouped User-Card split): test PR-AUC 0.707; fresh-seed check 0.689 — reported in the PR with eval ledger.",
      "Message head (char+word TF-IDF + direction features + augmentation): 11/18 → 18/18 on unseen probes; URL head debiased (bare-domain + www-bias fixes + ~30k synthetic benign-with-path rows): 12/20 → 19/20.",
      "Casual + batch website flows, officer queue/txn workspace, admin console to swap AI provider without redeploying.",
      "Left honest loose ends in the PR itself: per-head operating thresholds, README rewrite, SMTP/auth gaps — flagged, not hidden.",
    ],
    motivation:
      "The repo had rules but no learning and a hard external dependency. I wanted every head trainable, evaluable and swappable — with unseen-probe ledgers so nobody (including me) can cherry-pick.",
  },
  {
    slug: "micrograd-from-scratch",
    name: "micrograd-from-scratch",
    path: "~/projects/archive/micrograd-from-scratch",
    period: "—",
    status: "archive · learning build",
    blurb: "Minimal autodiff engine + neural net from first principles: scalar compute graph, manual backprop, no ML libraries.",
    stack: ["Jupyter Notebook", "Python"],
    links: { github: "https://github.com/Deepnar/micrograd-from-scratch" },
    stars: "1",
    flagship: false,
    evidence: ["Implemented from the algorithm, not adapted from a library."],
  },
  {
    slug: "ds-practice",
    name: "DS-Practice",
    path: "~/projects/archive/ds-practice",
    period: "—",
    status: "archive · coursework",
    blurb: "Algorithms, data structures, OS and networking programs from coursework — implemented from the algorithm.",
    stack: ["Python", "Java"],
    links: { github: "https://github.com/Deepnar/DS-Practice" },
    stars: "0",
    flagship: false,
    evidence: ["Coursework implementations incl. TCP/UDP networking labs."],
  },
  {
    slug: "rapidrail",
    name: "RapidRail (3-person team)",
    path: "~/projects/archive/rapidrail",
    period: "—",
    status: "archive · 3-person team",
    blurb: "Suburban rail ticketing for Mumbai: bookings, digital wallet, QR e-tickets, fare engine, admin dashboard. I built the core service and docs; the Razorpay checkout is a test-mode demo done with a teammate — sandbox keys only, never live payments.",
    stack: ["Java", "Spring Boot 3", "MySQL", "JPA", "ZXing QR", "Razorpay (test mode)"],
    links: { github: "https://github.com/Deepnar/rapidrail-utf-project" },
    stars: "0",
    flagship: false,
    evidence: [
      "My commits: initial service, core booking/wallet/QR/fare-engine code, README + docs, secured API keys into a local properties profile.",
      "Payment status is honest by design: Razorpay test mode (rzp_test_), signature verification + wallet credit work, but no live keys, no webhook handler — a student demo, not production billing.",
    ],
  },
  {
    slug: "civicresolve",
    name: "CivicResolve (team of 6)",
    path: "~/projects/archive/civicresolve",
    period: "Aug 2025 — Mar 2026",
    status: "archive · SIH ×2 rounds, DIPEX state final",
    blurb:
      "Civic-reporting platform: SIH 2025 (cleared two institute rounds) → DIPEX 2026 (MMR regional → Maharashtra-Goa state final). I authored the technical docs, threat model and cost model and led the pitch.",
    stack: ["TypeScript", "MySQL", "Prisma", "Docker"],
    links: { github: "https://github.com/Deepnar/CivicResolve" },
    stars: "1",
    flagship: false,
    evidence: [
      "Post-competition AI Observation Engine contribution (street-imagery verification, background worker, tests) merged after maintainer review.",
      "Positioned against CPGRAMS; team grew 2 → 6.",
    ],
  },
  {
    slug: "iis-mini",
    name: "IIS mini fraud project (team)",
    path: "~/projects/archive/iis-mini",
    period: "Sep 2026",
    status: "archive · team ML plan, Person-1 lane",
    blurb: "Credit-card fraud modeling split across three lanes. My lane (Person 1): classical baselines — logistic regression + random forest with a full sweep — plus the written report.",
    stack: ["Python", "scikit-learn", "pandas", "uv"],
    links: { github: "https://github.com/Deepnar/iis-mini-fraud" },
    stars: "—",
    flagship: false,
    evidence: [
      "Person-1 baseline scripts (inspect → baseline → full sweep) with outputs and REPORT_PERSON1.md.",
      "Teammates ran the tuning (Person 2) and XGBoost/imbalance lanes (Person 3); team ML plan in-repo.",
    ],
  },
  {
    slug: "ml-notebooks",
    name: "from-scratch ML notebooks",
    path: "~/projects/archive/ml-notebooks",
    period: "Jan — Feb 2026",
    status: "archive · learning builds",
    blurb: "Gradient descent in pure NumPy, wine-quality regression (RF vs GB on MAE/MSE/R²), titanic pipeline (cleaning → feature eng → LR/RF/NB).",
    stack: ["NumPy", "Pandas", "scikit-learn"],
    links: { github: "https://github.com/Deepnar/gradient-descent-from-scratch" },
    stars: "0",
    flagship: false,
    evidence: ["Built to understand the ideas properly, not for benchmarks."],
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
