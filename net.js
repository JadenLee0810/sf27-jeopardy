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
//  Net.connect()              start listening
//
//  If there's no server (page opened as a plain file / static hosting) everything still
//  works locally; edits just can't be shared.
// ====================================================
const Net = (function () {
  const KEYS = ["Noah", "Hany", "Jihoo", "Kevin"];
  let state = { scores: Object.fromEntries(KEYS.map((k) => [k, 0])), rev: 0 };
  let online = false, es = null;
  const stateFns = [], statusFns = [];

  const emitState = () => stateFns.forEach((f) => f(state.scores));
  const setOnline = (v) => { if (v !== online) { online = v; statusFns.forEach((f) => f(online)); } };
  let needSync = true;                       // after (re)connecting, trust the server even if its counter went back
  function accept(next, force) {
    if (!next || !next.scores) return;
    if (!force && next.rev < state.rev) return;   // an older answer that arrived late: ignore it
    KEYS.forEach((k) => { if (!Number.isFinite(next.scores[k])) next.scores[k] = 0; });
    state = next;
    emitState();
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

  function connect() {
    if (!window.EventSource || es) return;
    es = new EventSource("/api/events");
    es.onopen = () => { needSync = true; setOnline(true); };
    es.onmessage = (e) => { setOnline(true); try { accept(JSON.parse(e.data), needSync); needSync = false; } catch (_) {} };
    es.onerror = () => setOnline(false);          // the browser retries by itself
  }

  return {
    KEYS,
    get scores() { return state.scores; },
    isOnline: () => online,
    on(fn) { stateFns.push(fn); fn(state.scores); },
    onStatus(fn) { statusFns.push(fn); fn(online); },
    add: (who, name, n) => post({ who, add: { [name]: n } }),
    set: (who, name, n) => post({ who, set: { [name]: n } }),
    reset: (who) => post({ who, reset: true }),
    connect,
  };
})();
