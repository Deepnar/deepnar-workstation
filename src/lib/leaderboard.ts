// Global orbit leaderboard (Upstash Redis REST, browser-direct).
// No names: members are random ids, scores only. Everything degrades to
// local-best when env is missing or the request fails.
const URL = (process.env.NEXT_PUBLIC_UPSTASH_URL ?? "").replace(/\/$/, "");
const TOKEN = process.env.NEXT_PUBLIC_UPSTASH_TOKEN ?? "";
const KEY = "orbit:top";
const MAX_ENTRIES = 50;
const MAX_SCORE = 50000;

export function leaderboardOn(): boolean {
  return URL.length > 0 && TOKEN.length > 0;
}

async function call<T>(body: unknown): Promise<T> {
  const res = await fetch(`${URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`leaderboard ${res.status}`);
  return (await res.json()) as T;
}

export async function submitScore(score: number, member?: string): Promise<void> {
  if (!leaderboardOn()) return;
  const s = Math.max(0, Math.min(MAX_SCORE, Math.floor(score)));
  const id = member ?? (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await call([
    ["ZADD", KEY, s, id],
    // keep only the best: trim everything past the top N
    ["ZREMRANGE", KEY, 0, -(MAX_ENTRIES + 1)],
  ]);
}

export async function topScores(n = 5): Promise<number[]> {
  if (!leaderboardOn()) return [];
  const out = await call<Array<{ result: Array<string | number> }>>([
    ["ZREVRANGE", KEY, 0, n - 1, "WITHSCORES"],
  ]);
  const flat = out[0]?.result ?? [];
  const scores: number[] = [];
  for (let i = 1; i < flat.length; i += 2) scores.push(Number(flat[i]));
  return scores.filter((x) => Number.isFinite(x));
}
