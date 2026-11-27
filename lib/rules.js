// Shared by the local server (server.js) and the Vercel API functions (api/*.js):
// who may change what, and how a request body is checked.
const KEYS = ["Noah", "Hany", "Jihoo", "Kevin"];      // the four players
const WHO = ["Jaden", "screen"];                       // who may change scores (host phone / big screen)
const LIMIT = 1000000;
const clamp = (n) => Math.max(-LIMIT, Math.min(LIMIT, n));

// -> { status, error }  or  { op: { reset, set:{name:n}, add:{name:n}, end:true|false|null } }
function parse(b) {
  if (!b || typeof b !== "object" || !WHO.includes(b.who)) return { status: 403, error: "not allowed" };
  const op = { reset: !!b.reset, set: {}, add: {}, end: typeof b.end === "boolean" ? b.end : null };
  if (b.set && typeof b.set === "object") for (const k of KEYS) if (Number.isInteger(b.set[k])) op.set[k] = clamp(b.set[k]);
  if (b.add && typeof b.add === "object") for (const k of KEYS) if (Number.isInteger(b.add[k])) op.add[k] = clamp(b.add[k]);
  return { op };
}

module.exports = { KEYS, WHO, LIMIT, clamp, parse };
