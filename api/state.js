// GET /api/state  ->  { scores, rev, ended }   (the phones and the big screen poll this)
const store = require("../lib/store");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).json({ error: "method not allowed" });
  if (!store.configured()) return res.status(503).json({ error: "database not configured" });
  try { res.status(200).json(await store.getState()); }
  catch (e) { console.error(e); res.status(502).json({ error: "database error" }); }
};
