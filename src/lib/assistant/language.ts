// Agent language core — pure, no imports. Normalization, profanity routing,
// response variants. The deterministic intent/entity engine (engine.ts) calls
// into this; the fixture harness (scripts/agent-coverage.mjs) compiles this
// file standalone to prove breadth without a browser.

export interface Norm {
  /** normalized text for matching (lowercased, de-stretched, de-punctuated) */
  text: string;
  /** did the input carry profanity used conversationally (request still valid)? */
  casual: boolean;
  /** is this pure hostility with no recognizable request? (decided by engine) */
  hostileWords: boolean;
  hinglish: boolean;
}

const STRETCH: [RegExp, string][] = [
  [/\bhe+y+\b/g, "hey"],
  [/\byo+\b/g, "yo"],
  [/\bhi+\b/g, "hi"],
  [/\bsup+\b/g, "sup"],
  [/\bthx+\b/g, "thanks"],
  [/\byo+\b/g, "yo"],
  [/\bno+\b/g, "no"],
  [/\b(ha)+\b/g, "ha"],
];

const CONTRACTIONS: [RegExp, string][] = [
  [/what's/g, "what is"],
  [/where's/g, "where is"],
  [/who's/g, "who is"],
  [/how's/g, "how is"],
  [/that's/g, "that is"],
  [/it's/g, "it is"],
  [/\bi'm\b/g, "i am"],
  [/\bdon't\b/g, "do not"],
  [/\bcan't\b/g, "cannot"],
  [/\bwon't\b/g, "will not"],
  [/\bdidn't\b/g, "did not"],
  [/\bisn't\b/g, "is not"],
  [/\baren't\b/g, "are not"],
  [/ kind of /g, " "],
  [/ sort of /g, " "],
];

/** common misspellings → canonical (kept small; fuzzy edit-distance covers the rest) */
const TYPOS: Record<string, string> = {
  resmue: "resume", reume: "resume", resum: "resume", resumee: "resume",
  timtable: "timetable", tiemtable: "timetable",
  presenation: "presentation", presentaion: "presentation", presntation: "presentation",
  classifer: "classifier", clasifier: "classifier",
  reasearch: "research", reserach: "research", rearch: "research",
  scedule: "schedule", schedul: "schedule",
  contect: "contact", contct: "contact",
  downlod: "download", dowload: "download",
  projct: "project", projet: "project", porject: "project",
  abuot: "about", abot: "about",
  githb: "github", gihub: "github",
  linkdin: "linkedin", linkein: "linkedin",
  pythom: "python", pyton: "python",
  memroy: "memory", memeroy: "memory",
  experince: "experience", expereince: "experience",
  competion: "competition", compettion: "competition",
  edcation: "education", educaton: "education",
  certifcate: "certificate", certicate: "certificate",
  intership: "internship", intenship: "internship",
  documnt: "document", documet: "document",
  architecure: "architecture", architecutre: "architecture",
};

const EN_PROFANE = new Set(
  "fuck,fucking,fucker,fucked,shit,shitty,bullshit,horseshit,crap,crappy,damn,dammit,hell,piss,pissed,dumb,stupid,idiot,idiotic,moron,moronic,suck,sucks,sucked,useless,shutup,wtf,stfu,bitch,asshole,dick,arse,bastard,loser,lame,trash,garbage,hate".split(","),
);
const HI_PROFANE = new Set(
  "chutiya,chutya,chutiye,bhenchod,behanchod,benchod,madarchod,madarchodh,bakwas,bakchod,bakchodi,pagal,gadha,ullu,bewakoof,nalayak,harami,saala,sala,kamina,kutte,kutta,bhosdike,mc,bc".split(","),
);
const HI_MARKERS = new Set(
  "kya,hai,hain,nahi,nahin,mat,ka,ki,ke,ko,bhai,acha,accha,theek,ab,aur,ya,bas,bole,bol,bata,bta,raha,rahi,rahe,chahiye,dekh,dekhne,dhoondh,mujhe,tum,tu,tera,teri,mera,meri".split(","),
);

export const PROFANE = new Set([...EN_PROFANE, ...HI_PROFANE]);

/** directed-at-agent hostility (vs profanity seasoning a real request) */
const HOSTILE_PATTERNS = [
  /\bfuck you\b/, /\bfuck off\b/, /\bshut up\b/, /\bstfu\b/,
  /\byou (are|r) (stupid|dumb|useless|an idiot|a moron|trash|shit|lame)\b/,
  /\byou'?re (stupid|dumb|useless|trash|shit)\b/,
  /\bthis (site|website|portfolio|workstation) sucks\b/,
  /\bthis is (shit|trash|garbage|bakwas)\b/,
  /\b(you|u) suck\b/, /\bkill yourself\b/, /\bchutiya hai kya\b/,
  /\bkya bakwas hai\b/, /\bpagal hai kya\b/,
];

export function normalize(rawInput: string): Norm {
  let t = rawInput.toLowerCase();
  // repeated punctuation (!!!, ???, ...) → single space
  t = t.replace(/[!?.,;:'"()\[\]{}]+/g, " ");
  // collapse 3+ repeated letters (heyyy → heyy) so stretch rules catch them
  t = t.replace(/([a-z])\1{2,}/g, "$1$1");
  for (const [re, to] of STRETCH) t = t.replace(re, to);
  for (const [re, to] of CONTRACTIONS) t = t.replace(re, to);
  t = t.replace(/\s+/g, " ").trim();
  const words = new Set(t.split(" ").filter(Boolean));
  const fixed = [...words].map((w) => TYPOS[w] ?? w);
  t = fixed.join(" ");
  const hasProfane = [...words].some((w) => PROFANE.has(w));
  const hinglish = [...words].some((w) => HI_PROFANE.has(w) || HI_MARKERS.has(w));
  const hostileWords = hasProfane && HOSTILE_PATTERNS.some((re) => re.test(` ${t} `));
  return { text: t, casual: hasProfane && !hostileWords, hostileWords, hinglish };
}

/** random pick — response variation happens AFTER intent resolution */
export function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

export interface VariantTable {
  greeting: string[][];
  farewell: string[];
  thanks: string[];
  whoami: string[][];
  hostile: string[][];
  hostileHi: string[][];
  unknownLead: string[];
}

export const V: VariantTable = {
  greeting: [
    ["hey — what are you looking for?", "projects, research, resume, or the human behind them."],
    ["yo. projects, research, resume, or something else?", "name it and I'll open or explain it."],
    ["hey! poke around, or ask me about anything here.", "I know every project, the paper, and the OSS trail."],
    ["hi. I can navigate the workstation or explain what's in it.", "try “open ICE” or “what has he researched?”"],
    ["hello — looking for something specific?", "a project, the paper, contact lines, the tour…"],
    ["hey there. what do you want to inspect?", "I'm fastest with project names and “show me” phrasings."],
    ["morning. where are we going?", "ICE is the usual first stop."],
    ["welcome to the workstation.", "I'm the local guide — deterministic, no cloud, nothing leaves your tab."],
  ],
  farewell: [
    "later. the workstation stays exactly where you left it.",
    "bye — pry will hold the fort. badly.",
    "see you. the eval logs will still be honest when you're back.",
  ],
  thanks: [
    "anytime. the eval logs are honest, the pet is not — poke it and see.",
    "no problem. want the tour, or are you hunting something specific?",
    "sure thing.",
  ],
  whoami: [
    ["I'm the local guide for this workstation — intent matching, aliases, fuzzy lookup, conversation context, over a structured index of Deepesh's work. No LLM, no server, nothing leaves your browser."],
    ["tiny deterministic guide, at your service: I match what you type to projects, the paper, OSS work and files — then open things or explain them. Ask “how do you work?” for the internals."],
  ],
  hostile: [
    ["noted. need help finding something?", ""],
    ["alright. what are you actually looking for?", ""],
    ["fair enough. projects, research, resume?", ""],
    ["okay. I'm still here if you need something.", ""],
    ["heard. pointing you at the good stuff anyway — ICE is the main story.", ""],
  ],
  hostileHi: [
    ["theek hai bhai. ab bata, kya dhoondh raha hai?", ""],
    ["acha. projects dekhne hain ya bas wahi baat karni thi?", ""],
    ["fair. ab bol, kya chahiye?", ""],
  ],
  unknownLead: [
    "I'm not sure what you mean by that. I can help with projects, research, open source, Deepesh's background, or navigating the workstation.",
    "I don't have an answer for that one. Try asking about a project, publication, skill, experience, or something you can see in the workstation.",
    "I couldn't map that to anything I know here. If you meant a project or file, give me part of its name.",
    "that's outside my index — and I won't invent an answer. I know projects, the paper, upstream work, background, and navigation.",
  ],
};
