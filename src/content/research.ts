// Research — TWO artifacts: LSREP + ICE v2 (the memory work), and
// Pixel over Paper (the earlier Multicon 2024 presentation).
export const paper = {
  title: "LSREP: A Longitudinal State-Replay Protocol for Evaluating Conversational Memory, with ICE v2 as an Audited Local-First Architecture",
  venue: "arXiv cs.AI",
  id: "2609.16730",
  url: "https://arxiv.org/abs/2609.16730",
  note: "LSREP treats memory as evolving over time — ordered replay, repeated probes, evolving references, lifecycle schedules, mechanism-fidelity auditing. Grew out of building ICE; the larger question is how you know a system behaves the way its architecture says it does.",
  relationship:
    "One body of work, two halves: LSREP is the evaluation protocol, ICE v2 is the audited local-first architecture it was developed against. The final v2 manuscript (37 pp.) reports a controlled evaluation + matched LongMemEval diagnostic; candid failure cases included.",
  iceArch: [
    "· four typed stores — episodic turns, a temporally-versioned knowledge graph, procedural patterns, documents — plus user-controlled memory slots",
    "· every prompt is classified first (pre-flight); retrieval legs query the stores, candidates are fused by weighted rank, and a per-query token budget bounds the assembled context",
    "· post-flight maintenance runs async: access-weighted decay, revision handling, lifecycle schedules — the store is inspectable and governable, and it survives the answering model being swapped out",
    "· evaluated snapshot is frozen at tag v2-paper-eval: 1,985 turns, 219 distinct probes, 1,211 probe–checkpoint observations across 52 checkpoints",
  ],
  findings: [
    "· on three ordinary-density datasets: near-zero mean quality difference vs vector-RAG while selecting 32% fewer fragments (6.6% more prompt tokens) — selectivity, not magic",
    "· a fourth dense dataset breaks the unbudgeted baseline catastrophically — budgets are load-bearing, not decoration",
    "· matched LongMemEval diagnostic: ICE v2 loses decisively to pure vector-RAG (50.8 vs 72.8 oracle; 43.0 vs 69.5 full-S) with severe multi-session and temporal failures — a quality–cost tradeoff, reported as one",
    "· fidelity audit: procedural retrieval defective, several mechanisms unexercised, graph utility unestablished. a mechanism that never reached the output is reported as untested, not failed",
  ],
};

export const pixelOverPaper = {
  title: "Pixel over Paper: the transition to digital note-taking",
  venueLine: "multicon 2024 · presented live · selected among the top 25 submissions",
  about:
    "A comparative study of traditional paper-and-pen vs digital note-taking in education and the workplace — cognitive, practical and environmental impacts: retention, access, cooperation, efficiency. Survey-backed (google forms, students + professionals), with a literature spine from the history of note-taking to AI-assisted notes and stylus handwriting recognition. Conclusion it earns: digital wins on organization, portability and interconnectivity; screen fatigue, security risk and technical dependence are real costs.",
  team: "four-member team, led by Deepesh — with Navneet Kumar Singh, Prakriti Pramod Tiwari, Bhavika Shriram Vasule · guided by Mrs. Shruti Pant (TCET)",
  studied: [
    "· retention vs access: does typing keep up with writing for memory, and what do you gain in retrieval",
    "· cooperation + efficiency: shared, standardized notes vs personal paper archives",
    "· stability risks: fatigue, security, dependence on working tech",
    "· where it's going: AI-operated notes, stylus recognition bridging the two worlds",
  ],
};

export const researchEval = {
  slug: "ice-controlled",
  name: "ICE v2 controlled evaluation",
  date: "2026",
  hypothesis: "Selective retrieval (leave out aggressively) beats retrieve-more on evolving conversations.",
  setup: "Final ICE v2 snapshot (tag v2-paper-eval) · four LSREP datasets (A/B/D ordinary-density + C density stress) · controlled comparisons + ablations · matched LongMemEval diagnostic (evidence-only oracle + full-S)",
  metrics: [
    { label: "turns", value: "1,985" },
    { label: "distinct probes", value: "219" },
    { label: "observations", value: "1,211" },
    { label: "checkpoints", value: "52" },
  ],
  detail: [
    "datasets: A/B/D ordinary-density replay + C dense stress (154 probe–checkpoint obs).",
    "RQ1 longitudinal: near-zero mean quality delta vs vector-RAG on A/B/D, 32% fewer fragments, +6.6% prompt tokens; ranks first in 30.6% of generalist comparisons.",
    "RQ1 stress: dataset C exposes catastrophic failure of the unbudgeted baseline — token budgets are load-bearing.",
    "RQ2 fidelity: procedural retrieval defective; several mechanisms unexercised; graph utility not established. untested ≠ failed.",
    "RQ3 public diagnostic: LongMemEval evidence-only 50.8 vs 72.8, full-S 43.0 vs 69.5 (paired −22.0, 95% CI [−26.6,−17.4]; −26.5 [−31.3,−21.8]). severe multi-session + temporal failures; conservative abstention.",
    "human slice: 72 hand-scored probes by the corpus author, paired ICE–vector deltas reported alongside.",
    "reading: replay + fidelity audit + public endpoint testing expose distinct failure modes — the disagreement between regimes is itself a result.",
  ],
  result:
    "Reported in the final manuscript with candid failure cases — including settings where ICE trails pure vector-RAG. A mechanism that never reached the output is reported as untested, not as failed.",
  artifact: "final manuscript § evaluation",
};
