// POST /api/scores  { who, set?, add?, reset?, end? }  ->  the new { scores, rev, ended }
// `who` must be "Jaden" (host phone) or "screen" (big screen); anyone else gets 403.
const store = require("../lib/store");
const { parse } = require("../lib/rules");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { return res.status(400).json({ error: "bad json" }); } }
  const p = parse(body);
  if (p.error) return res.status(p.status).json({ error: p.error });
  if (!store.configured()) return res.status(503).json({ error: "database not configured" });
  try { res.status(200).json(await store.apply(p.op)); }
  catch (e) { console.error(e); res.status(502).json({ error: "database error" }); }
};
