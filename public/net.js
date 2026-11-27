// ====================================================
//  Shared scores, used by the big screen AND the phone page.
//  Talks to server.js: reads the scores, listens for live changes, and sends edits.
//
//  Net.scores                 { Noah, Hany, Jihoo, Kevin }  (always present; 0 until the server answers)
//  Net.on(fn)                 fn(scores) every time the scores change (and once right away)
//  Net.onStatus(fn)           fn(true|false) when the connection to the server comes / goes
//  Net.add(who, name, n)      add n points to a player      (who = "Jaden" or "screen")
//  Net.set(who, name, n)      set a player's score
//  Net.reset(who)             everyone back to 0
//  Net.ended / Net.end(who, true|false) / Net.onEnd(fn)   end-of-game flag (host ends it, everyone shows the winner)
//  Net.winners()              names tied for the top score
//  Net.connect()              start listening
//
//  If there's no server (page opened as a plain file / static hosting) everything still
//  works locally; edits just can't be shared.
// ====================================================
const Net = (function () {
  const KEYS = ["Noah", "Hany", "Jihoo", "Kevin"];
  let state = { scores: Object.fromEntries(KEYS.map((k) => [k, 0])), rev: 0, ended: false };
  let online = false, es = null;
  const stateFns = [], statusFns = [], endFns = [];
  let ended = false;

  const emitState = () => stateFns.forEach((f) => f(state.scores));
  const setOnline = (v) => { if (v !== online) { online = v; statusFns.forEach((f) => f(online)); } };
  let needSync = true;                       // after (re)connecting, trust the server even if its counter went back
  function accept(next, force) {
    if (!next || !next.scores) return;
    if (!force && next.rev < state.rev) return;   // an older answer that arrived late: ignore it
    KEYS.forEach((k) => { if (!Number.isFinite(next.scores[k])) next.scores[k] = 0; });
    next.ended = next.ended === true;
    state = next;
    emitState();
    if (state.ended !== ended) { ended = state.ended; endFns.forEach((f) => f(ended)); }
  }

  async function post(body) {
    try {
      const r = await fetch("/api/scores", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!r.ok) return false;
      accept(await r.json());
      setOnline(true);
      return true;
    } catch (_) { setOnline(false); return false; }
  }

  // Live stream when the server offers one (local / always-on hosts). Hosts without
  // long-lived connections (Vercel) answer 404 there, so we fall back to polling /api/state.
  let pollTimer = null;
  async function pollOnce() {
    try {
      const r = await fetch("/api/state", { cache: "no-store" });
      if (!r.ok) throw new Error("bad status");
      accept(await r.json(), needSync); needSync = false;
      setOnline(true);
    } catch (_) { needSync = true; setOnline(false); }
  }
  function startPolling() {
    if (pollTimer) return;
    pollOnce();
    pollTimer = setInterval(() => { if (!document.hidden) pollOnce(); }, 1500);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) pollOnce(); });
  }
  function connect() {
    if (es || pollTimer) return;
    if (!window.EventSource) return startPolling();
    es = new EventSource("/api/events");
    es.onopen = () => { needSync = true; setOnline(true); };
    es.onmessage = (e) => { setOnline(true); try { accept(JSON.parse(e.data), needSync); needSync = false; } catch (_) {} };
    es.onerror = () => {
      setOnline(false);
      if (es.readyState === 2) { es.close(); es = null; startPolling(); }   // no live stream here: poll instead
    };                                                                      // (otherwise the browser retries by itself)
  }

  return {
    KEYS,
    get scores() { return state.scores; },
    isOnline: () => online,
    on(fn) { stateFns.push(fn); fn(state.scores); },
    onStatus(fn) { statusFns.push(fn); fn(online); },
    onEnd(fn) { endFns.push(fn); fn(ended); },
    get ended() { return ended; },
    end: (who, v) => post({ who, end: !!v }),
    winners() {
      const top = Math.max(...KEYS.map((k) => state.scores[k] || 0));
      return KEYS.filter((k) => (state.scores[k] || 0) === top);
    },
    add: (who, name, n) => post({ who, add: { [name]: n } }),
    set: (who, name, n) => post({ who, set: { [name]: n } }),
    reset: (who) => post({ who, reset: true }),
    connect,
  };
})();
