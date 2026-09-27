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
    note: "PR #221 — capability mapping with focused tests.",
  },
  {
    title: "discover existing GPT4All model directory",
    repo: "OpenAgentHQ/modeldock",
    url: "https://github.com/OpenAgentHQ/modeldock/pull/222",
    state: "merged",
    note: "PR #222 — deterministic filename-key ordering; fixed a Windows-only CI failure, full matrix green.",
  },
  {
    title: "default Envoy logging to info",
    repo: "vllm-project/semantic-router",
    url: "https://github.com/vllm-project/semantic-router/pull/3288",
    state: "merged",
    note: "PR #3288 — debug → info default with explicit override preserved; tests + docs.",
  },
  {
    title: "avoid pytest 10 warnings in sklearn estimator checks",
    repo: "mne-tools/mne-python",
    url: "https://github.com/mne-tools/mne-python/pull/14283",
    state: "merged",
    note: "PR #14283 — preserves optional-dependency behavior; 1,215 sklearn-compliance tests passed.",
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
    note: "PR #14287 — warning + doc note + regression-test extension; CI/review pending.",
  },
  {
    title: "per-list E/I id namespaces in the resolution judge",
    repo: "getzep/graphiti",
    url: "https://github.com/getzep/graphiti/pull/1772",
    state: "open",
    note: "PR #1772 — maintainer review pending.",
  },
  {
    title: "SentencePiece artifacts in hash_tokenizer_config",
    repo: "AOSSIE-Org/OpenVerifiableLLM",
    url: "https://github.com/AOSSIE-Org/OpenVerifiableLLM/pull/135",
    state: "open",
    note: "PR #135 — review pending.",
  },
  {
    title: "gpt-5 context window 128k → 272k",
    repo: "archi-physics/archi",
    url: "https://github.com/archi-physics/archi/pull/653",
    state: "open",
    note: "PR #653 — review pending.",
  },
];

export const ossNote =
  "I contribute upstream when I run into bugs or missing pieces worth fixing — small compatibility fixes up to longer debugging sessions with tests and CI archaeology.";
