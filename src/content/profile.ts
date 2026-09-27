// Single source of truth for identity. Edit here; UI reads from this file.
export const profile = {
  name: "Deepesh Sonar",
  handle: "deepnar",
  host: "orien",
  location: "Mumbai, India",
  tagline: "I build systems, then try to break my own claims about them.",
  aboutLong: [
    "Computer Engineering undergraduate in Mumbai (TCET, expected 2028). I like building things from first principles, pushing them until they break, and figuring out which parts actually mattered.",
    "Some projects become research. Some become tools. Some exist because I wanted to understand an idea properly and ended up implementing far more of it than originally planned.",
    "Working style: separate “didn't work” from “wasn't actually tested”. Prefer precise results to impressive-sounding ones. Care about the whole system — data path, API, evaluation harness, deployment, cost, failure modes — not just the model. Document heavily.",
  ],
  education: {
    school: "Thakur College of Engineering and Technology (TCET), Mumbai",
    degree: "B.E. Computer Engineering",
    expected: "2028",
    cgpa: "9.53 / 10",
  },
  links: {
    github: "https://github.com/Deepnar",
    linkedin: "https://www.linkedin.com/in/deepeshsonar/",
    orcid: "https://orcid.org/0009-0008-1762-4246",
    x: "https://x.com/DeepnarS",
    email: "mailto:18deepnar@gmail.com",
    arxivPaper: "https://arxiv.org/abs/2609.16730",
  },
  status: {
    branch: "main",
    editor: "nvim",
    os: "Arch",
  },
  stack: [
    "Python",
    "PyTorch",
    "FastAPI",
    "PostgreSQL + pgvector",
    "Docker",
    "Linux",
    "Java",
    "OR-Tools",
    "Ollama",
  ],
  interests: ["AI/ML", "retrieval & memory systems", "evaluation", "open source", "developer tools", "systems"],
} as const;

export type Profile = typeof profile;
