// ~/about/ content — reconciled from: portfolio About, GitHub profile README,
// LinkedIn copy, canonical resume (Deepesh_Sonar_Resume.pdf), and a read-only
// audit of /home/deepnar/Deepesh CV_files/ (Sep 2026).
// Rules: no fabricated dates/roles/results; ambiguous → omitted or flagged.

export const aboutReadme: string[] = [
  `# Deepesh Sonar`,
  ``,
  `computer engineering @ TCET, mumbai — expected 2028.`,
  ``,
  `i build systems from first principles, push them until they break, and figure out which parts actually mattered. some of my work turns into research, some into tools, and some starts because i wanted to understand a problem properly and ended up building much more of it than planned.`,
  ``,
  `## what i work on`,
  `· LSREP — a longitudinal evaluation protocol for conversational memory, with ICE (a local-first memory architecture) as its audited case study`,
  `· presentation forge — a self-hosted presentation and report generation system`,
  `· constraint-based scheduling systems`,
  `· developer tooling, linux workstation configuration, evaluation harnesses`,
  ``,
  `## how i work`,
  `· i care about the whole path: models and algorithms, apis, databases, evaluation, deployment, failure modes, cost, documentation`,
  `· i try to make my work falsifiable — and to distinguish something genuinely failing from something never exercised or never affecting the result`,
  `· positive findings, failures, quality-cost tradeoffs and non-superiority findings all get reported, not just the wins`,
  ``,
  `## current direction`,
  `· preparing for graduate study`,
  `· open to research and startup internships on technically difficult problems across ai/ml, systems, tooling, or adjacent areas`,
  ``,
  `## education`,
  `· B.E. computer engineering, thakur college of engineering and technology (TCET), mumbai — expected 2028 · CGPA 9.53/10`,
  `· coursework so far leans math + systems: discrete structures, data structures, analysis of algorithms, operating systems, computer networks, database systems`,
  ``,
  `## elsewhere`,
  `· github.com/Deepnar — 34 repos, merged oss, full commit history on home`,
  `· scholar — LSREP preprint (arxiv 2609.16730)`,
  `· linkedin, orcid, x — see contact.json`,
  `· detailed record — [[/home/deepnar/about/notable.md|notable.md]] (every claim below links its evidence)`,
  `· resume — [[/home/deepnar/about/resume.pdf|resume.pdf]] (two pages, general research/systems version)`,
];

/** one notable entry: anchor id, heading, body lines (may contain [[path|label]] links) */
export interface NotableEntry {
  id: string;
  kind: string;
  body: string[];
}

export const notable: NotableEntry[] = [
  {
    id: "ev-lsrep",
    kind: "research / publication · 2026",
    body: [
      `## LSREP + ICE — preprint, sole author`,
      `LSREP: a longitudinal state-replay protocol for evaluating conversational memory, with ICE v2 as an audited local-first architecture. public arxiv preprint (2609.16730), zenodo doi.`,
      `the paper keeps the careful distinction: positive findings, failures, quality-cost tradeoffs and non-superiority findings — not marketing.`,
      `related: [[/home/deepnar/projects/ice/README.md|ice]] · [[/home/deepnar/research/lsrep-ice/README.md|research writeup]]`,
    ],
  },
  {
    id: "ev-pixel",
    kind: "presentation · 2024",
    body: [
      `## pixel over paper — multicon 2024, top 25`,
      `research + analysis + delivery on the transition to digital note-taking in education and the workplace. selected among the top 25 submissions for live presentation; led a four-member team.`,
      `writeup: [[/home/deepnar/research/pixel-over-paper/README.md|research/pixel-over-paper]]`,
    ],
  },
  {
    id: "ev-sih-2025",
    kind: "competition · aug–dec 2025",
    body: [
      `## smart india hackathon 2025 — past institute rounds`,
      `team of six. civic-reporting platform positioned against CPGRAMS, with technical documentation; cleared two institute-level rounds. led the pitch.`,
      `related: [[/home/deepnar/projects/collaborations/civicresolve/README.md|civicresolve]]`,
    ],
  },
  {
    id: "ev-dipex-2026",
    kind: "competition · dec 2025–mar 2026",
    body: [
      `## DIPEX 2026 — state final exhibitor`,
      `cleared the MMR regional (idea presentation round, 11 feb 2026, APSIT thane) and exhibited the working model at the DIPEX 2026 state final (5–8 mar 2026, MIT sambhajinagar): civeserve, an enterprise-grade platform for ai-enhanced civic engagement.`,
      `team grew from two to six; my lanes were the security threat model, infrastructure/cost modeling, and pitch leadership.`,
      `evidence: [[/home/deepnar/about/evidence/dipex/regional.pdf|regional certificate]] · [[/home/deepnar/about/evidence/dipex/state-final.pdf|state-final certificate]]`,
      `related: [[/home/deepnar/projects/collaborations/civicresolve/README.md|civicresolve]]`,
    ],
  },
  {
    id: "ev-research-cell",
    kind: "organization · technical team",
    body: [
      `## research cell, TCET — technical team`,
      `built a networking/TCP-IP physical model; helped organize two student hackathons.`,
    ],
  },
  {
    id: "ev-csi",
    kind: "organization · jun 2025–may 2026",
    body: [
      `## computer society of india (TCET) — creative committee`,
      `social media / visual identity work: id cards, reveal campaigns, event collateral and logistics. 119 officially allocated activity hours.`,
      `the committee's public face: https://www.instagram.com/tcet_csi/`,
    ],
  },
  {
    id: "ev-nep-sarthi",
    kind: "program · feb 2026–present",
    body: [
      `## NEP sarthi + departmental magazine`,
      `NEP sarthi, computer engineering department (feb 2026–present). editorial team for the departmental semester magazine — two editions.`,
    ],
  },
  {
    id: "ev-egd",
    kind: "coursework · first year",
    body: [
      `## engineering drawing sheets — first-year EGD`,
      `hand-drafted sheets from the first-year engineering-graphics course: a chair drawn in isometric projection and in orthographic projection, dimensioned. the drawing-table-era kind of precision work.`,
      `evidence: [[/home/deepnar/about/evidence/egd/iso.pdf|isometric sheet]] · [[/home/deepnar/about/evidence/egd/ortho.pdf|orthographic sheet]]`,
    ],
  },
  {
    id: "ev-iste",
    kind: "membership · 2025–2029",
    body: [
      `## ISTE — member`,
      `member, indian society for technical education (TCET chapter), 01-05-2025 to 01-05-2029.`,
      `evidence: [[/home/deepnar/about/evidence/certs/iste.pdf|membership certificate]]`,
    ],
  },
  {
    id: "ev-cyberpeace",
    kind: "experience · jan 2025 · remote",
    body: [
      `## cyberpeace foundation — internship trainee`,
      `cybersecurity awareness, OSINT techniques, cyber law/policy, threat identification and digital-footprint analysis.`,
    ],
  },
  {
    id: "ev-deloitte",
    kind: "program · jun–jul 2025",
    body: [
      `## deloitte data analytics job simulation (forage) — completion`,
      `data analysis + forensic technology simulation: dashboards, classification, business conclusions.`,
      `evidence: [[/home/deepnar/about/evidence/certs/deloitte.pdf|completion certificate]]`,
    ],
  },
  {
    id: "ev-certs",
    kind: "certifications",
    body: [
      `## course completions`,
      `· spoken tutorial C training (EduPyramids / SINE IIT Bombay, invigilated exam — score 95%) — [[/home/deepnar/about/evidence/certs/spoken-c.pdf|certificate]]`,
      `· introduction to mongodb (for students, jun 2025) — [[/home/deepnar/about/evidence/certs/mongodb.pdf|certificate]]`,
      `· learn JAVA programming, Abdul Bari (udemy, 61.5h, dec 2025) — [[/home/deepnar/about/evidence/certs/java-udemy.jpg|certificate]]`,
      `· the complete python developer, Andrei Neagoie (udemy, 31h, dec 2025) — [[/home/deepnar/about/evidence/certs/python-udemy.pdf|certificate]]`,
    ],
  },
  {
    id: "ev-dcdc",
    kind: "volunteering",
    body: [
      `## degree certificate distribution ceremony — volunteer`,
      `volunteered through the DCDC event: professionalism, dedication and responsibility in running the ceremony — appreciation certificate.`,
      `evidence: [[/home/deepnar/about/evidence/certs/dcdc.pdf|appreciation certificate]]`,
    ],
  },
];

export const notableBody: string[] = [
  `# notable`,
  ``,
  `curated record of research, competitions, organizations, experience and credentials that are not standalone projects. newest first.`,
  ``,
  ...notable.flatMap((e) => [`@@${e.id}`, e.body[0], e.kind, ...e.body.slice(1), ``]),
];
