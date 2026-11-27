// ====================================================
//  Phone join page  (customlink.com/join)
//  title animation -> ENTER YOUR NAME -> player card / host key
//  Roster + demo numbers live in players.js, answer key in game-data.js.
// ====================================================
(function () {
  const $ = (id) => document.getElementById(id);
  const STORE = "jsf.player";
  const live = [];                       // functions that refresh the screen when scores change

  // ---------- sprites (cached; built from the same pixel art as the big screen) ----------
  const sprites = {}, avatars = {};
  const personOf = (kind) => Scene.PEOPLE.find((p) => p.kind === kind);
  const spriteOf = (kind) => sprites[kind] || (sprites[kind] = Scene.spriteCanvas(personOf(kind)));
  const cloneCanvas = (src) => {
    const c = document.createElement("canvas");
    c.width = src.width; c.height = src.height;
    c.getContext("2d").drawImage(src, 0, 0);
    return c;
  };
  // head + shoulders crop (girls' sprites are shorter, so find the first painted row)
  function avatarOf(kind) {
    if (!avatars[kind]) {
      const s = spriteOf(kind), d = s.getContext("2d").getImageData(0, 0, s.width, s.height).data;
      let top = 0;
      outer: for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) if (d[(y * s.width + x) * 4 + 3]) { top = y; break outer; }
      const c = document.createElement("canvas");
      c.width = s.width; c.height = 96;
      c.getContext("2d").drawImage(s, 0, top, s.width, 96, 0, 0, s.width, 96);
      avatars[kind] = c;
    }
    return cloneCanvas(avatars[kind]);
  }

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const byName = (v) => ROSTER.find((r) => r.name.toLowerCase() === String(v).trim().toLowerCase());
  // the four players, best score first (ties keep the big-screen order)
  const standings = () =>
    Net.KEYS.map((k, i) => ({ r: ROSTER.find((x) => x.name === k), score: Net.scores[k] || 0, i }))
      .sort((a, b) => b.score - a.score || a.i - b.i);
  const rankOf = (score, list) => 1 + list.filter((s) => s.score > score).length;
  const money = (n) => (n < 0 ? "-$" : "$") + Math.abs(n);
  const ordinal = (n) => n + (["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) % 4] || "th");

  // ---------- screens ----------
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("on", s.id === id));
    window.scrollTo(0, 0);
  }

  // ====================================================
  //  1. TITLE  - "JEOPARDY @ SF" drops in letter by letter, then waves
  // ====================================================
  function buildWordmark() {
    const wm = $("wm");
    let i = 0;
    [["JEOPARDY", "l1"], ["@ SF", "l2"]].forEach(([text, cls]) => {
      const row = document.createElement("div");
      row.className = "wm-line " + cls;
      [...text].forEach((ch) => {
        const s = document.createElement("span");
        s.className = "wm-ch" + (ch === " " ? " sp" : "") + (ch === "@" ? " at" : "");
        s.textContent = ch === " " ? " " : ch;
        s.style.setProperty("--i", i++);
        row.appendChild(s);
      });
      wm.appendChild(row);
    });
  }

  // ====================================================
  //  2. ENTER YOUR NAME - only the five valid names get in
  // ====================================================
  const input = $("name-input");
  function refreshName() {
    const v = input.value.trim().toLowerCase();
    $("name-msg").textContent = "";
    input.classList.remove("bad");
    // suggestions that match what's typed so far
    const chips = $("chips");
    chips.innerHTML = "";
    if (v) ROSTER.filter((r) => r.name.toLowerCase().startsWith(v) && r.name.toLowerCase() !== v).forEach((r) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = r.name;
      b.addEventListener("click", () => { input.value = r.name; refreshName(); input.focus(); });
      chips.appendChild(b);
    });
    // exact match -> little "hey, that's you" preview
    const prev = $("preview"), r = byName(v);
    prev.innerHTML = "";
    if (r) {
      const av = document.createElement("div");
      av.className = "av"; av.appendChild(avatarOf(r.kind));
      const t = document.createElement("div");
      t.innerHTML = `<b>HEY ${r.name.toUpperCase()}!</b>${r.school.toUpperCase()}${r.host ? "<br>HOST" : ""}`;
      prev.append(av, t);
    }
  }
  input.addEventListener("input", refreshName);
  $("name-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const r = byName(input.value);
    if (!r) {
      const msg = $("name-msg");
      msg.textContent = input.value.trim()
        ? `NO PLAYER NAMED "${input.value.trim().toUpperCase()}". CHECK THE SPELLING!`
        : "TYPE YOUR NAME FIRST!";
      input.classList.remove("bad"); void input.offsetWidth; input.classList.add("bad");
      return;
    }
    try { localStorage.setItem(STORE, r.name); } catch (_) {}
    openApp(r);
  });
  $("btn-back").addEventListener("click", () => show("s-title"));

  // ====================================================
  //  3. APP  - players: CARD + RANKS     host: ANSWER KEY + SCORES + CARD
  // ====================================================
  function statBar(v) {
    const filled = Math.round(v / 10);
    return `<span class="bar">${Array.from({ length: 10 }, (_, i) => `<i class="${i < filled ? "f" : ""}"></i>`).join("")}</span>`;
  }

  function cardPane(r) {
    const st = DEMO_STATE.stats[r.name], score = Net.scores[r.name] || 0;
    const stage = document.createElement("div");
    stage.className = "card-stage";
    stage.innerHTML = `
      <div class="card" style="--c1:${r.c1};--c2:${r.c2}">
        <div class="card-in">
          <div class="c-head">
            <span class="stage">${r.host ? "HOST" : "BASIC"}</span>
            <span class="c-name">${r.name.toUpperCase()}</span>
            <span class="hp"><small>HP</small><span class="hp-val">${r.host ? "--" : score}</span></span>
          </div>
          <div class="art"><div class="stars"></div></div>
          <div class="typeline"><span>${r.school.toUpperCase()}</span><span>${r.mascot.toUpperCase()} TYPE &middot; LV${1 + st.right}</span></div>
          <div class="stats">
            <div class="stat"><span>BUZZ</span>${statBar(st.buzz)}<b>${st.buzz}</b></div>
            <div class="stat"><span>BRAIN</span>${statBar(st.brain)}<b>${st.brain}</b></div>
            <div class="stat"><span>LUCK</span>${statBar(st.luck)}<b>${st.luck}</b></div>
          </div>
          ${r.moves.map((m) => `
            <div class="move">
              <div class="row"><span class="cost">&#9733;</span><b>${m.n}</b><span>${m.p}</span></div>
              <p>${m.d}</p>
            </div>`).join("")}
          <div class="foot"><span>STREAK ${st.streak}</span><span>RIGHT ${st.right}</span><span>WRONG ${st.wrong}</span></div>
          <p class="flavor">${r.flavor}</p>
          <div class="c-num"><span>No. ${String(ROSTER.indexOf(r) + 1).padStart(2, "0")}/${String(ROSTER.length).padStart(2, "0")}</span><span>SF27 &middot; JEOPARDY @ SF</span></div>
        </div>
        <div class="holo"></div>
      </div>`;
    const art = stage.querySelector(".art");
    const sceneCv = document.createElement("canvas");          // this player's landmark behind them
    sceneCv.className = "scene-bg";
    Backdrops.draw(sceneCv, r.bg || "campanile", 250, 212);
    art.classList.add("scene"); art.insertBefore(sceneCv, art.firstChild);
    art.appendChild(cloneCanvas(spriteOf(r.kind)));
    live.push(() => { const e = stage.querySelector(".hp-val"); if (e && !r.host) e.textContent = Net.scores[r.name] || 0; });

    // little 3D tilt when you drag a finger / mouse over the card
    const card = stage.querySelector(".card");
    const tilt = (e) => {
      const b = card.getBoundingClientRect();
      const x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
      card.style.transform = `rotateY(${(x * 16).toFixed(1)}deg) rotateX(${(-y * 16).toFixed(1)}deg)`;
    };
    const flat = () => { card.style.transform = ""; };
    stage.addEventListener("pointermove", tilt);
    ["pointerleave", "pointerup", "pointercancel"].forEach((ev) => stage.addEventListener(ev, flat));
    return stage;
  }

  // everyone's rank + score, live
  function ranksPane(me) {
    const wrap = document.createElement("div");
    const render = () => {
      const list = standings(), idx = list.findIndex((s) => s.r === me);
      wrap.innerHTML = me.host
        ? `<h3 class="sec">LIVE SCORES</h3>`
        : `<div class="rank-hero"><small>YOUR RANK</small><div class="big">${ordinal(rankOf(list[idx].score, list)).toUpperCase()}</div><small>OF ${list.length} &middot; ${money(list[idx].score)}</small></div>`;
      const rows = document.createElement("div");
      rows.className = "rank-list";
      list.forEach(({ r, score }) => {
        const row = document.createElement("div");
        row.className = "rank-row" + (r === me ? " me" : "");
        row.innerHTML = `<span class="n">${rankOf(score, list)}</span><span class="av"></span><span class="who">${r.name.toUpperCase()}<small>${r.school.toUpperCase()}</small></span><span class="pts">${money(score)}</span>`;
        row.querySelector(".av").appendChild(avatarOf(r.kind));
        rows.appendChild(row);
      });
      wrap.appendChild(rows);
    };
    render(); live.push(render);
    return wrap;
  }

  // little message at the bottom of the screen
  let toastTimer = null;
  function toast(msg) {
    let t = $("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 2200);
  }
  // send a score edit; tell the host if it did not go through
  async function edit(promise) {
    const ok = await promise;
    if (!ok) toast("COULD NOT REACH THE SERVER");
    return ok;
  }

  // HOST: end the game -> the big screen shows a solo shot of the winner
  function endPane(me) {
    const wrap = document.createElement("div");
    const render = () => {
      const list = standings(), top = list[0].score, w = list.filter((s) => s.score === top);
      wrap.innerHTML = `<h3 class="sec">END GAME</h3>
        <div class="end-card"><small>${Net.ended ? "GAME OVER - WINNER ON THE BIG SCREEN" : (w.length > 1 ? "TIED FOR THE LEAD" : "CURRENT LEADER")}</small>
          <div class="end-av"></div><div class="end-name">${w.map((s) => s.r.name.toUpperCase()).join(" &amp; ")}</div><small>${money(top)}</small></div>
        <div class="rank-list"></div>
        <button type="button" class="btn big wide ${Net.ended ? "" : "danger"}" id="btn-end">${Net.ended ? "RESUME GAME" : "END GAME + SHOW WINNER"}</button>
        <p class="net-note">${Net.isOnline() ? "" : "SERVER OFFLINE - CANNOT END THE GAME"}</p>`;
      const av = wrap.querySelector(".end-av"); w.forEach((s) => av.appendChild(avatarOf(s.r.kind)));
      const rows = wrap.querySelector(".rank-list");
      list.forEach(({ r, score }) => {
        const row = document.createElement("div");
        row.className = "rank-row";
        row.innerHTML = `<span class="n">${rankOf(score, list)}</span><span class="av"></span><span class="who">${r.name.toUpperCase()}<small>${r.school.toUpperCase()}</small></span><span class="pts">${money(score)}</span>`;
        row.querySelector(".av").appendChild(avatarOf(r.kind));
        rows.appendChild(row);
      });
      wrap.querySelector("#btn-end").addEventListener("click", () => {
        if (Net.ended) edit(Net.end(me.name, false));
        else if (confirm("End the game and show the winner?")) edit(Net.end(me.name, true));
      });
    };
    render(); live.push(render);
    return wrap;
  }

  // HOST: edit everyone's points (shows up on every phone and the big screen right away)
  function scoresPane(me) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `<h3 class="sec">EDIT POINTS</h3><p class="net-note" id="net-note"></p><div class="edit-list"></div>
      <button type="button" class="btn danger wide" id="btn-reset-all">RESET ALL TO $0</button>`;
    const list = wrap.querySelector(".edit-list"), pts = {};
    Net.KEYS.forEach((k) => {
      const r = ROSTER.find((x) => x.name === k);
      const row = document.createElement("div");
      row.className = "edit-row";
      const btns = (sign) => [100, 200, 300, 400, 500].map((d) =>
        `<button type="button" class="qb ${sign < 0 ? "neg" : "pos"}" data-d="${sign * d}">${sign < 0 ? "-" : "+"}${d}</button>`).join("");
      row.innerHTML = `
        <div class="edit-top"><span class="av"></span><span class="who">${k.toUpperCase()}<small>${r.school.toUpperCase()}</small></span><span class="pts">$0</span></div>
        <div class="quick">${btns(1)}</div>
        <div class="quick">${btns(-1)}</div>
        <form class="set-form" novalidate><input type="number" inputmode="numeric" placeholder="SET EXACT SCORE" aria-label="Set ${k}'s score"><button class="btn" type="submit">SET</button></form>`;
      row.querySelector(".av").appendChild(avatarOf(r.kind));
      pts[k] = row.querySelector(".pts");
      row.querySelectorAll(".qb").forEach((b) => b.addEventListener("click", () => edit(Net.add(me.name, k, Number(b.dataset.d)))));
      const input = row.querySelector("input");
      row.querySelector("form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const n = parseInt(input.value, 10);
        if (!Number.isFinite(n)) { toast("TYPE A NUMBER"); return; }
        if (await edit(Net.set(me.name, k, n))) input.value = "";
      });
      list.appendChild(row);
    });
    wrap.querySelector("#btn-reset-all").addEventListener("click", () => {
      if (confirm("Reset every score to $0?")) edit(Net.reset(me.name));
    });
    const refresh = () => {
      Net.KEYS.forEach((k) => {
        const v = Net.scores[k] || 0;
        pts[k].textContent = money(v);
        pts[k].classList.toggle("neg", v < 0);
      });
      wrap.querySelector("#net-note").textContent = Net.isOnline() ? "" : "SERVER OFFLINE - CHANGES WILL NOT SAVE";
    };
    refresh(); live.push(refresh);
    return wrap;
  }

  function keyPane(r) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `<div class="host-badge"><span class="av"></span><span><b>HOST MODE</b>${r.name.toUpperCase()} &middot; FULL ANSWER KEY</span></div>`;
    wrap.querySelector(".av").appendChild(avatarOf(r.kind));
    const chips = document.createElement("div");
    chips.className = "cat-chips";
    GAME_DATA.CATEGORIES.forEach((c, i) => {
      const a = document.createElement("a");
      a.href = "#cat-" + i; a.textContent = c.name.toUpperCase();
      chips.appendChild(a);
    });
    wrap.appendChild(chips);
    GAME_DATA.CATEGORIES.forEach((c, i) => {
      const sec = document.createElement("section");
      sec.className = "cat"; sec.id = "cat-" + i;
      const row = (cl, tag) =>
        `<div class="clue"><div class="v">${tag || ""}$${cl.value}</div><p class="q">${esc(cl.question)}</p><p class="a">${esc(cl.answer)}</p></div>`;
      sec.innerHTML = `<h4>${c.name.toUpperCase()}</h4>` + c.clues.map((cl) => row(cl)).join("") + (c.bonus ? row(c.bonus, "BONUS ") : "");
      wrap.appendChild(sec);
    });
    return wrap;
  }

  // everyone's phone: GAME OVER card with the winner (tap to close)
  let curPlayer = null, overDismissed = false;
  function paintOver() {
    let o = $("over");
    if (!Net.ended || !curPlayer || overDismissed) { if (o) o.hidden = true; return; }
    if (!o) {
      o = document.createElement("div"); o.id = "over"; o.className = "over";
      o.addEventListener("click", () => { overDismissed = true; o.hidden = true; });
      document.body.appendChild(o);
    }
    const list = standings(), top = list[0].score, w = list.filter((s) => s.score === top);
    const mine = list.find((s) => s.r === curPlayer);
    o.innerHTML = `<div class="over-in"><div class="over-t">GAME OVER</div><div class="over-av"></div>
      <small>${w.length > 1 ? "TIE FOR 1ST" : "WINNER"}</small><div class="over-n">${w.map((s) => s.r.name.toUpperCase()).join(" &amp; ")}</div><div class="over-s">${money(top)}</div>
      ${curPlayer.host ? "" : `<div class="over-me">YOU: ${ordinal(rankOf(mine.score, list)).toUpperCase()} &middot; ${money(mine.score)}</div>`}
      <small class="over-tap">TAP TO CLOSE</small></div>`;
    w.forEach((s) => o.querySelector(".over-av").appendChild(avatarOf(s.r.kind)));
    o.hidden = false;
  }

  function openApp(r) {
    curPlayer = r; overDismissed = false; paintOver();
    live.length = 0;                       // drop refreshers from a previous login
    const tabs = r.host
      ? [["key", "ANSWER KEY", keyPane(r)], ["scores", "POINTS", scoresPane(r)], ["end", "END GAME", endPane(r)], ["card", "CARD", cardPane(r)]]
      : [["card", "CARD", cardPane(r)], ["ranks", "RANKS", ranksPane(r)]];
    const panes = $("panes"), nav = $("nav");
    panes.innerHTML = ""; nav.innerHTML = "";
    tabs.forEach(([id, label, el], i) => {
      const pane = document.createElement("div");
      pane.className = "pane" + (i === 0 ? " on" : ""); pane.id = "pane-" + id;
      pane.appendChild(el); panes.appendChild(pane);
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label; b.className = i === 0 ? "on" : "";
      b.addEventListener("click", () => {
        nav.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
        panes.querySelectorAll(".pane").forEach((p) => p.classList.toggle("on", p === pane));
        window.scrollTo(0, 0);
      });
      nav.appendChild(b);
    });
    bgKind = r.bg || "campanile"; paintBg();
    show("s-app");
  }

  $("btn-exit").addEventListener("click", () => {
    try { localStorage.removeItem(STORE); } catch (_) {}
    input.value = ""; refreshName();
    bgKind = "campanile"; paintBg(); curPlayer = null; paintOver();
    show("s-name");
  });

  // ====================================================
  //  boot
  // ====================================================
  buildWordmark();
  Net.connect();
  Net.on(() => { live.forEach((f) => f()); paintOver(); });
  Net.onEnd((e) => { if (!e) overDismissed = false; live.forEach((f) => f()); paintOver(); });
  Net.onStatus((on) => {
    const b = $("live-badge");
    b.classList.toggle("off", !on);
    b.lastElementChild.textContent = on ? "LIVE" : "OFFLINE";
    live.forEach((f) => f());
  });
  $("btn-join").addEventListener("click", () => {
    let saved = null;
    try { saved = localStorage.getItem(STORE); } catch (_) {}
    const r = saved && byName(saved);
    if (r) openApp(r); else { show("s-name"); setTimeout(() => input.focus(), 50); }
  });
  // Campanile backdrop; redrawn when the phone rotates / resizes so it always fits
  let bgKind = "campanile";                // title screen = Campanile; after joining = the player's own spot
  const paintBg = () => Backdrops.draw($("bg"), bgKind);
  requestAnimationFrame(paintBg);
  let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(paintBg, 150); });
})();
