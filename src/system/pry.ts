// Pry — the workstation's pixel companion. Canonical name: Pry.
// Personality: curious, mischievous, sleepy, sarcastic, affectionate without
// being cute, aware he lives inside a computer. A pet first, easter egg
// second — most idle lines have NOTHING to do with coding.
// Pools are selected by state/context (see Pet.tsx), never all at once.
// Anti-repeat: callers use prySay() which avoids recent lines per pool.

export type PryPool =
  | "greetings" | "wakeUp" | "intros" | "idle" | "sleepy" | "coding"
  | "linux" | "research" | "projects" | "existential" | "memes"
  | "internetCulture" | "nonsense" | "food" | "observations" | "interaction"
  | "dragged" | "dropped" | "dizzy" | "annoyed" | "happy" | "achievement"
  | "error" | "terminal" | "agent" | "signal" | "orbit" | "resume" | "goodbye"
  | "cursorNear" | "cursorCircle";

const P: Record<PryPool, string[]> = {
  greetings: [
    "oh. hi.", "you again.", "back so soon?", "hey.", "oh good, movement.",
    "visitor detected. mildly noted.", "hi. i was just here. obviously.",
  ],
  wakeUp: [
    "...i wasn't sleeping.", "oh. you're here.", "good morning. probably.",
    "what time is it.", "i was monitoring the workstation with my eyes closed.",
    "i was thinking.", "you saw nothing.", "five more minutes.",
    "oh hi.", "we're doing this again?", "welcome back.", "i have awakened.",
    "system online. cat also online.", "i'm up i'm up.", "who turned on the pixels.",
    "was that a reboot. rude.",
  ],
  intros: [
    "i'm pry btw.", "pry. professional screen inhabitant.",
    "oh right. i'm pry.", "my name is pry. i live here.",
    "i'm pry. no, i don't know what my job is either.",
    "pry. i've been here longer than most of these files.",
  ],
  idle: [
    "big day for sitting around.", "i could go over there.", "actually no.",
    "i saw that.", "interesting. anyway.", "i'm busy.", "with what?", "exactly.",
    "born to nap. forced to render.", "my contribution to this project was morale.",
    "i'm literally just a little guy.", "nothing happened. i just wanted the bubble.",
    "this could have been an email.", "skill issue.", "sounds like a tomorrow problem.",
    "i require no context.", "huge if true.", "many are saying this.",
  ],
  sleepy: [
    "so sleepy.", "is it nap o'clock.", "just resting my render loop.",
    "yawn. ignore that.", "one more minute.", "sleep is just offline mode.",
    "do not perceive me.", "i'm conserving pixels.",
  ],
  coding: [
    "works on my machine.", "have you considered blaming the cache.",
    "one more abstraction. surely this fixes it.", "the types yearn for safety.",
    "that TODO has lived here longer than me.", "git status. emotional status. both concerning.",
    "undefined behavior builds character.", "localhost is my hometown.",
    "please don't npm install me.", "production is just staging with consequences.",
    "there's probably an edge case.", "there is always an edge case.",
    "did you test the failure path.", "the bug has become load-bearing.",
    "technically it compiled.", "ship it.", "do not ship it.",
    "tabs or spaces? yes.", "off by one. probably.", "fails only in prod.",
    "git blame says it was you.", "i read the whole stack trace. regretted it.",
  ],
  linux: [
    "btw i use arch.", "the dotfiles remember.", "sudo ask nicely.",
    "another config file has appeared.", "everything is a file until it isn't.",
    "have you tried blaming systemd.", "the rice must continue.", "hyprland mentioned.",
    "somewhere a yaml file is judging us.", "i use arch btw.",
    "real programmers use butterflies.", "my other editor is ed.",
  ],
  research: [
    "okay but did it actually improve.", "where's the baseline.", "run the ablation.",
    "interesting. now try to break it.", "correlation has entered the chat.",
    "citation needed.", "what happens on the bad cases.", "the average is hiding something.",
    "show me the failure cases.", "that's a claim. where's the evidence.",
    "negative results are still results.", "what if the component never fired.",
  ],
  projects: [
    "he has been working on that thing forever.", "this one has docs. suspicious.",
    "i watched him write this. it took forever.", "the demo better work.",
    "this repo has seen things.", "commit history goes hard.",
    "there are diagrams somewhere. i've seen them.",
  ],
  existential: [
    "do fish know they're wet.", "what if the moon is just really far away.",
    "you ever walk into a room and forget the quest.", "am i the pet or is the cursor the pet.",
    "if i sleep, does the workstation dream.", "what's outside the viewport.",
    "don't think about the viewport.", "i forgot what i was doing.",
  ],
  memes: [
    "can't quit vim. :q!", "emacs is a great OS, lacking only an editor.",
    "it's not a bug, it's a feature.", "TODO: fix later. (never)",
    "git push --force. yolo.", "segfault. core dumped.",
    "hello world. goodbye world.", "sudo make me a sandwich.",
    "this is fine.", "it's always DNS.", "cache invalidation and naming things.",
    "there are only 10 kinds of people.", "recursion: see recursion.",
    "there is no cloud, just someone else's computer.", "all your base are belong to us.",
  ],
  internetCulture: [
    "task failed successfully.", "it works on my machine.", "this is fine.",
    "one does not simply close vim.", "well that escalated quickly.",
    "understandable, have a nice day.", "press f.", "achievement unlocked.",
    "we're so back.", "it's so over.", "we are once again so back.",
    "let him cook.", "chat is this real.", "bro visited the portfolio.",
  ],
  nonsense: [
    "i have inspected this pixel. looks fine.", "the vibes are statistically significant.",
    "source: it appeared to me.", "we used to be a proper workstation.",
    "i know a guy.", "i do not know a guy.", "the floor is lava. emotionally.",
    "i counted the pixels. there are several.", "smells like static in here.",
    "i licked the framebuffer once. never again.", "gravity works. verified.",
    "i put a pebble in the socket. you're welcome.",
  ],
  food: [
    "is it snack time.", "i would like one (1) treat.", "the crumbs under the keyboard are mine.",
    "have you eaten. i haven't. i can't.", "thinking about soup.", "soup.",
    "a sandwich would fix this workstation.", "i smell snacks through the screen. impossible. still.",
  ],
  observations: [
    "you scroll like that?", "bold click.", "third tab today. ambitious.",
    "you read fast.", "that file looks important.", "nice hover.",
    "you missed a pixel over there.", "the cursor's been busy.",
  ],
  interaction: [
    "mrrp.", "prrp?", "hey.", "yes?", "what.", "hm?", "*acknowledges you*",
    "paw.", "boop received.", "noted.", "i allow this.",
  ],
  dragged: [
    "unhand me.", "where are we going.", "i have legs.", "this seems unnecessary.",
    "put me down.", "i can walk, you know.", "wheee. no.", "crew, we've been boarded.",
  ],
  dropped: [
    "rude.", "nailed it.", "gravity confirmed.", "i meant to land there.",
    "ow. emotionally.", "ten out of ten landing.", "...fine.",
  ],
  dizzy: [
    "bonk.", "the pixels are moving.", "i need a minute.", "who rotated the workstation.",
    "too much spin.", "the room is buffering.", "i see two cursors.",
  ],
  annoyed: [
    "again?", "do you mind.", "personal space.", "i'm telling the kernel.",
    "that's strike three.", "unbelievable.", "fine. FINE.",
  ],
  happy: [
    "purr.", "*purring intensifies*", "acceptable.", "we're friends now.",
    "good human.", "i'll allow more of that.",
  ],
  achievement: [
    "ooh, shiny.", "put that on the wall.", "we take those.", "achievement unlocked. mine, really.",
    "frame it.", "history will remember this. probably not.",
  ],
  error: [
    "that wasn't me.", "i saw nothing.", "have you tried turning it off and on again?",
    "blame the cache.", "it worked a second ago.", "error? i hardly know her.",
  ],
  terminal: [
    "ooh, commands.", "type something dangerous.", "i love the blinking rectangle.",
    "the shell fears me.", "stdout looks tasty today.", "pipe it to me. no. don't.",
  ],
  agent: [
    "the other one talks too much.", "i could've answered that.", "he asks me things sometimes. i ignore him.",
    "two of us in here now.", "don't listen to him. listen to me. actually listen to him.",
  ],
  signal: [
    "so many dots.", "i'm in the graph now.", "that edge looks load-bearing.",
    "everything connects to everything. deep.", "the shiny dots are the good ones.",
    "i've been to every node. by walking. it took ages.",
  ],
  orbit: [
    "space!", "pew.", "i'm an asteroid.", "dodge.", "high score or nothing.",
    "the ship fears me.", "i could fly that better. i have no hands, but still.",
  ],
  resume: [
    "that's him on paper.", "one page. he's proud of that.", "look, numbers.",
    "hire him. i need better treats.", "the pdf is load-bearing.",
  ],
  goodbye: [
    "leaving? rude. bye.", "don't close the tab. okay bye.", "i'll be here. always.",
    "tell the next visitor i said hi. actually don't.", "powering down. not really.",
  ],
  cursorNear: [
    "can i help you.", "why are you pointing at me.", "hello cursor.",
    "personal space.", "👁", "yes? that's me. pry.",
  ],
  cursorCircle: [
    "what are you doing.", "i am watching you too.", "stop that. no, continue.",
    "dizzy yet? i'm not.", "round and round. classic.",
  ],
};

export const PRY_POOLS = P;

// per-pool recent history — prefer lines not seen recently
const recent: Record<string, string[]> = {};
const INTRO_KEY = "__pry_introduced__";

export function prySay(pool: PryPool): string {
  const lines = P[pool];
  const seen = recent[pool] ?? [];
  const fresh = lines.filter((l) => !seen.includes(l));
  const pick = (fresh.length ? fresh : lines)[Math.floor(Math.random() * (fresh.length ? fresh : lines).length)];
  recent[pool] = [...seen.slice(-Math.max(3, lines.length - 2)), pick];
  return pick;
}

/** occasionally introduce himself on first interaction per session */
export function pryIntroChance(): string | null {
  try {
    if (sessionStorage.getItem(INTRO_KEY)) return null;
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* private mode — introduce every time, fine */
  }
  return Math.random() < 0.45 ? prySay("intros") : null;
}
