// OSS: verified via `gh search prs --author Deepnar` on 27 Sep 2026.
// States: merged | open. No inflight claims beyond what's listed.
export interface PR {
  title: string;
  repo: string;
  url: string;
  state: "merged" | "open";
  note: string;
}

export const prs: PR[] = [
  {
    title: "map Jan runtime capabilities",
    repo: "OpenAgentHQ/modeldock",
    url: "https://github.com/OpenAgentHQ/modeldock/pull/221",
    state: "merged",
    note: "PR #221 — added Jan-runtime capability mapping with focused tests.",
  },
  {
    title: "discover existing GPT4All model directory",
    repo: "OpenAgentHQ/modeldock",
    url: "https://github.com/OpenAgentHQ/modeldock/pull/222",
    state: "merged",
    note: "PR #222 — made existing GPT4All model-directory discovery deterministic; fixed a Windows-only CI failure and got the matrix green.",
  },
  {
    title: "default Envoy logging to info",
    repo: "vllm-project/semantic-router",
    url: "https://github.com/vllm-project/semantic-router/pull/3288",
    state: "merged",
    note: "PR #3288 — changed Envoy\u2019s default logging from debug to info while preserving explicit override behavior; tests/docs included.",
  },
  {
    title: "avoid pytest 10 warnings in sklearn estimator checks",
    repo: "mne-tools/mne-python",
    url: "https://github.com/mne-tools/mne-python/pull/14283",
    state: "merged",
    note: "PR #14283 — fixed pytest/sklearn estimator-check warning compatibility while preserving optional-dependency behavior.",
  },
  {
    title: "AI Observation Engine (street-imagery verification, worker, tests, docs)",
    repo: "Newer1107/CivicResolve",
    url: "https://github.com/Newer1107/CivicResolve/pull/1",
    state: "merged",
    note: "Team project contribution; merged after maintainer review.",
  },
  {
    title: "warn when bridged interpolation uses bad channels",
    repo: "mne-tools/mne-python",
    url: "https://github.com/mne-tools/mne-python/pull/14287",
    state: "open",
    note: "PR #14287 — warns when bridged interpolation uses bad channels; documentation and regression coverage included.",
  },
  {
    title: "per-list E/I id namespaces in the resolution judge",
    repo: "getzep/graphiti",
    url: "https://github.com/getzep/graphiti/pull/1772",
    state: "open",
    note: "PR #1772 — per-list entity/identifier namespace fix in the resolution judge.",
  },
  {
    title: "SentencePiece artifacts in hash_tokenizer_config",
    repo: "AOSSIE-Org/OpenVerifiableLLM",
    url: "https://github.com/AOSSIE-Org/OpenVerifiableLLM/pull/135",
    state: "open",
    note: "PR #135 — include SentencePiece artifacts in tokenizer configuration hashing.",
  },
  {
    title: "gpt-5 context window 128k → 272k",
    repo: "archi-physics/archi",
    url: "https://github.com/archi-physics/archi/pull/653",
    state: "open",
    note: "PR #653 — correct GPT-5 context-window metadata.",
  },
];

export const ossNote =
  "I contribute upstream when I run into bugs or missing pieces worth fixing — small compatibility fixes up to longer debugging sessions with tests and CI archaeology.";
