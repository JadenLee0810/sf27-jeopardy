// Scores live in a Redis database (Upstash, via its REST API - no packages needed).
// Used by the Vercel functions in /api. Env vars (added automatically when you connect
// an Upstash Redis / Vercel KV store to the project):
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN   (or KV_REST_API_URL + KV_REST_API_TOKEN)
//
// Layout:  hash "sf27:scores" { Noah, Hany, Jihoo, Kevin }   hash "sf27:meta" { rev, ended }
// Every edit is one atomic MULTI/EXEC, so two people tapping at once can't lose a point.
const { KEYS, LIMIT, clamp } = require("./rules");

const BASE = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").replace(/\/$/, "");
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
const S = "sf27:scores", M = "sf27:meta";

const configured = () => !!(BASE && TOKEN);

async function run(path, cmds) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error("database " + r.status);
  return (await r.json()).map((x) => { if (x && x.error) throw new Error(x.error); return x && x.result; });
}

const toObj = (v) => {                                   // HGETALL comes back flat: [k, v, k, v]
  if (Array.isArray(v)) { const o = {}; for (let i = 0; i + 1 < v.length; i += 2) o[v[i]] = v[i + 1]; return o; }
  return v && typeof v === "object" ? v : {};
};
function toState(scoresRaw, metaRaw) {
  const sc = toObj(scoresRaw), meta = toObj(metaRaw), scores = {};
  KEYS.forEach((k) => { const n = parseInt(sc[k], 10); scores[k] = Number.isFinite(n) ? n : 0; });
  return { scores, rev: parseInt(meta.rev, 10) || 0, ended: String(meta.ended) === "1" };
}

const READ = [["HGETALL", S], ["HGETALL", M]];

async function getState() {
  const [a, b] = await run("/pipeline", READ);
  return toState(a, b);
}

async function apply(op) {
  const w = [];
  if (op.reset) { KEYS.forEach((k) => w.push(["HSET", S, k, 0])); w.push(["HSET", M, "ended", 0]); }
  KEYS.forEach((k) => { if (k in op.set) w.push(["HSET", S, k, op.set[k]]); });
  const addKeys = KEYS.filter((k) => k in op.add);
  addKeys.forEach((k) => w.push(["HINCRBY", S, k, op.add[k]]));
  if (op.end !== null) w.push(["HSET", M, "ended", op.end ? 1 : 0]);
  w.push(["HINCRBY", M, "rev", 1]);
  const res = await run("/multi-exec", [...w, ...READ]);
  const state = toState(res[res.length - 2], res[res.length - 1]);
  const over = KEYS.filter((k) => Math.abs(state.scores[k]) > LIMIT);        // adds can't be clamped inside the transaction
  if (over.length) {
    over.forEach((k) => { state.scores[k] = clamp(state.scores[k]); });
    await run("/pipeline", over.map((k) => ["HSET", S, k, state.scores[k]]));
  }
  return state;
}

module.exports = { configured, getState, apply };
