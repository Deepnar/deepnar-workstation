// Research: papers, experiments with REAL metrics only (null = not measured),
// and a timeline. Numbers verified 27 Sep 2026 against the evidence bank.
export interface Experiment {
  slug: string;
  name: string;
  date: string;
  hypothesis: string;
  setup: string;
  metrics: { label: string; value: string }[] | null;
  result: string;
  artifact: string;
}

export const papers = [
  {
    title: "LSREP: A Longitudinal State-Replay Protocol for Evaluating Conversational Memory, with ICE v2 as an Audited Local-First Architecture",
    venue: "arXiv cs.AI",
    id: "2609.16730",
    url: "https://arxiv.org/abs/2609.16730",
    note: "LSREP treats memory as evolving over time — ordered replay, repeated probes, evolving references, lifecycle schedules, mechanism-fidelity auditing. Grew out of building ICE; the larger question is how you know a system behaves the way its architecture says it does.",
  },
  {
    title: "ICE v2 manuscript (37 pp.)",
    venue: "manuscript — complete, in revision",
    id: null as string | null,
    url: "https://github.com/Deepnar/ice",
    note: "Frozen v2 snapshot: controlled evaluation + matched LongMemEval diagnostic. Further v3 evaluation is follow-up engineering, not a prerequisite for describing the paper.",
  },
];

export const experiments: Experiment[] = [
  {
    slug: "ice-controlled",
    name: "ICE v2 controlled evaluation",
    date: "2026",
    hypothesis: "Selective retrieval (leave out aggressively) beats retrieve-more on evolving conversations.",
    setup: "Frozen ICE v2 snapshot · controlled comparisons + ablations · matched LongMemEval diagnostic",
    metrics: [
      { label: "turns", value: "1,985" },
      { label: "distinct probes", value: "219" },
      { label: "observations", value: "1,211" },
      { label: "checkpoints", value: "52" },
    ],
    result:
      "Reported in the manuscript with candid failure cases — including settings where ICE trails pure vector-RAG. A mechanism that never reached the output is reported as untested, not as failed.",
    artifact: "papers/ICE_paper_v2.pdf (evidence bank)",
  },
  {
    slug: "density-stress",
    name: "density-stress + fidelity audit",
    date: "2026",
    hypothesis: "Memory pressure changes which mechanisms actually affect the final answer.",
    setup: "Density-stress runs + mechanism-fidelity auditing on ICE v2",
    metrics: null,
    result:
      "Findings documented in the manuscript: evaluation traces which mechanisms fired, which were exercised, and which never reached the output.",
    artifact: "manuscript § evaluation",
  },
  {
    slug: "prompt-routing-eval",
    name: "prompt-routing classifier eval",
    date: "Mar 2026",
    hypothesis: "A tiny CPU classifier can route prompts by topic/intent well enough to gate retrieval.",
    setup: "5,100-prompt corpus · MiniLM-L6-v2 + logistic regression · held-out split",
    metrics: [
      { label: "topic F1", value: "0.68" },
      { label: "intent F1", value: "0.56" },
    ],
    result: "Good enough to become ICE's pre-flight router design; documented with dataset + training path.",
    artifact: "github.com/Deepnar/prompt-routing-classifier",
  },
];

export const researchTimeline: { date: string; event: string }[] = [
  { date: "Jan 2025", event: "CyberPeace Foundation — internship trainee (cybersecurity awareness, OSINT, cyber law, threat ID)" },
  { date: "Mar 2026", event: "Prompt-routing classifier + timetable-generator begin" },
  { date: "Jun 2026", event: "ICE begins — local-first conversational memory" },
  { date: "Aug 2026", event: "Presentation Forge + merged OSS run (ModelDock ×2, semantic-router)" },
  { date: "Sep 2026", event: "MNE-Python #14283 merged · LSREP on arXiv (2609.16730) · ICE v2 manuscript frozen" },
];
