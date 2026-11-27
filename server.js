// ====================================================
//  Jeopardy @ SF server  -  run with:  npm run local
//
//  * serves the pages (/ = big screen, /join = phones)
//  * keeps the scores in one place so the host's phone, every player's phone
//    and the big screen all see the same numbers, live.
//
//  No dependencies - just Node. Scores are saved to state.json so a restart
//  doesn't lose them.
//
//  API
//    GET  /api/state     -> { scores: { Noah, Hany, Jihoo, Kevin }, rev }
//    GET  /api/events    -> live stream (Server-Sent Events) of that same object
//    POST /api/scores    -> { who, set?: {name: n}, add?: {name: n}, reset?: true }
//                           `who` must be "Jaden" (host phone) or "screen" (big screen)
// ====================================================
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const STATE_FILE = path.join(ROOT, "state.json");
const KEYS = ["Noah", "Hany", "Jihoo", "Kevin"];          // the four players
const WHO = ["Jaden", "screen"];                           // who may change scores
const LIMIT = 1000000;

// ---------- state ----------
const zero = () => Object.fromEntries(KEYS.map((k) => [k, 0]));
function load() {
  try {
    const j = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    const scores = zero();
    KEYS.forEach((k) => { if (Number.isInteger(j.scores && j.scores[k])) scores[k] = j.scores[k]; });
    return { scores, rev: Number.isInteger(j.rev) ? j.rev : 0 };
  } catch (_) { return { scores: zero(), rev: 0 }; }
}
let state = load();
const save = () => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch (_) {} };

// ---------- live updates (Server-Sent Events) ----------
const clients = new Set();
function broadcast() {
  const msg = "data: " + JSON.stringify(state) + "\n\n";
  clients.forEach((res) => res.write(msg));
}
function events(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive", "X-Accel-Buffering": "no",
  });
  res.write("retry: 2000\n\n");
  res.write("data: " + JSON.stringify(state) + "\n\n");
  clients.add(res);
  req.on("close", () => clients.delete(res));
}
setInterval(() => clients.forEach((res) => res.write(": ping\n\n")), 25000);   // keep connections alive

// ---------- helpers ----------
const json = (res, code, obj) => {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
};
const clampScore = (n) => Math.max(-LIMIT, Math.min(LIMIT, n));

function postScores(req, res) {
  let body = "";
  req.on("data", (c) => { body += c; if (body.length > 10000) req.destroy(); });
  req.on("end", () => {
    let b;
    try { b = JSON.parse(body); } catch (_) { return json(res, 400, { error: "bad json" }); }
    if (!b || !WHO.includes(b.who)) return json(res, 403, { error: "not allowed" });
    if (b.reset) KEYS.forEach((k) => { state.scores[k] = 0; });
    if (b.set && typeof b.set === "object")
      for (const k of KEYS) if (Number.isInteger(b.set[k])) state.scores[k] = clampScore(b.set[k]);
    if (b.add && typeof b.add === "object")
      for (const k of KEYS) if (Number.isInteger(b.add[k])) state.scores[k] = clampScore(state.scores[k] + b.add[k]);
    state.rev++;
    save();
    broadcast();
    json(res, 200, state);
  });
}

// ---------- static files ----------
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp",
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".woff2": "font/woff2",
};
const PRIVATE = new Set(["server.js", "state.json", "package.json", "package-lock.json"]);

function serveStatic(p, req, res) {
  if (p === "/") p = "/index.html";
  if (p === "/join") p = "/join.html";
  const rel = path.normalize(p).replace(/^([/\\])+/, "");
  const file = path.join(ROOT, rel);
  const ext = path.extname(file).toLowerCase();
  if (!file.startsWith(ROOT + path.sep) || rel.split(/[\\/]/).some((s) => s.startsWith(".") || s === "node_modules")
      || PRIVATE.has(path.basename(file)) || !MIME[ext]) {
    res.writeHead(404); return res.end("Not found");
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[ext], "Cache-Control": "no-cache" });
    res.end(req.method === "HEAD" ? undefined : data);
  });
}

http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch (_) { res.writeHead(400); return res.end(); }
  if (p === "/api/state" && req.method === "GET") return json(res, 200, state);
  if (p === "/api/events" && req.method === "GET") return events(req, res);
  if (p === "/api/scores" && req.method === "POST") return postScores(req, res);
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
  serveStatic(p, req, res);
}).listen(PORT, () => {
  console.log("\nJeopardy @ SF is running");
  console.log("  Big screen : http://localhost:" + PORT + "/");
  console.log("  Phones     : /join");
  Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal)
    .forEach((i) => console.log("               http://" + i.address + ":" + PORT + "/join   (phones on the same Wi-Fi)"));
  console.log("");
});
