// Research — ONE artifact: LSREP + ICE v2 are the same research work.
// No plural papers, no timeline, no duplicate project evals.
export const paper = {
  title: "LSREP: A Longitudinal State-Replay Protocol for Evaluating Conversational Memory, with ICE v2 as an Audited Local-First Architecture",
  venue: "arXiv cs.AI",
  id: "2609.16730",
  url: "https://arxiv.org/abs/2609.16730",
  note: "LSREP treats memory as evolving over time — ordered replay, repeated probes, evolving references, lifecycle schedules, mechanism-fidelity auditing. Grew out of building ICE; the larger question is how you know a system behaves the way its architecture says it does.",
  relationship:
    "One body of work, two halves: LSREP is the evaluation protocol, ICE v2 is the audited local-first architecture it was developed against. The frozen v2 manuscript (37 pp.) reports a controlled evaluation + matched LongMemEval diagnostic; candid failure cases included.",
};

export const researchEval = {
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
  artifact: "manuscript § evaluation",
};
