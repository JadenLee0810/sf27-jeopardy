// ====================================================
//  Big-screen scene: the five of us in front of the Golden Gate.
//  The cap on the Berkeley guy is the (invisible) JOIN button. Press it and everyone raises
//  their right hand and jumps (Mario style) while the camera zooms into the hat
//  and cuts to the Jeopardy board.
//
//  SceneStage.mount(rootElement, onEnter)   build the scene
// ====================================================
const SceneStage = (function () {
  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
  const clamp01 = (t) => Math.max(0, Math.min(1, t));

  let root, zoom, stage, L, heroes = [], hatBtn, busy = false, onEnter = null;

  // --- timeline (ms) ---
  const JUMP = 950;          // one jump
  const STAGGER = 45;        // each friend leaves the ground a hair after the last
  const ZOOM_AT = 480;       // camera starts zooming while we're still in the air
  const ZOOM_LEN = 1500;
  const ZOOM_MAX = 20;
  const BOARD_AT = ZOOM_AT + ZOOM_LEN * 0.6;   // the board starts swelling in near the end of the zoom
  const BOARD_LEN = 700;

  // squat -> launch -> hang at the top -> fall -> squash on landing
  const JUMP_KF = [
    { transform: "translateY(0) scale(1, 1)", offset: 0 },
    { transform: "translateY(0) scale(1.07, .9)", offset: 0.09, easing: "cubic-bezier(.15,.75,.3,1)" },
    { transform: "translateY(-190px) scale(.95, 1.07)", offset: 0.43 },
    { transform: "translateY(-178px) scale(1, 1)", offset: 0.56, easing: "cubic-bezier(.7,0,.9,.5)" },
    { transform: "translateY(0) scale(1.1, .88)", offset: 0.9 },
    { transform: "translateY(0) scale(1, 1)", offset: 1 },
  ];
  const SHADOW_KF = [
    { transform: "scale(1)", opacity: 1, offset: 0 },
    { transform: "scale(.55)", opacity: .45, offset: 0.43 },
    { transform: "scale(.6)", opacity: .5, offset: 0.56 },
    { transform: "scale(1)", opacity: 1, offset: 0.9 },
    { transform: "scale(1)", opacity: 1, offset: 1 },
  ];

  // fit the 1280x720 scene to the screen like "object-fit: cover", anchored to the bottom
  function fit() {
    const vw = root.clientWidth, vh = root.clientHeight;
    if (!vw || !vh) return;
    const s = Math.max(vw / L.W, vh / L.H);
    stage.style.transform = `translate(${(vw - L.W * s) / 2}px, ${vh - L.H * s}px) scale(${s})`;
  }

  function mount(rootEl, enterCb) {
    root = rootEl; onEnter = enterCb || null; busy = false; heroes = [];
    root.innerHTML = "";
    zoom = el("div", "scene-zoom");
    stage = el("div", "scene-stage");
    zoom.appendChild(stage); root.appendChild(zoom);
    L = Scene.layout();
    stage.style.width = L.W + "px"; stage.style.height = L.H + "px";

    // background (no people: they are separate sprites so they can move)
    const bg = el("canvas");
    Scene.draw(bg, { people: false });
    stage.appendChild(bg);

    L.items.forEach((it) => {
      const sh = el("div", "hero-shadow");
      sh.style.left = it.x + 16 * L.CH + "px"; sh.style.top = it.footY + 3 + "px";
      sh.style.width = (L.BWc - 32) * L.CH + "px";
      stage.appendChild(sh);

      const h = el("div", "hero");
      h.style.cssText = `left:${it.x}px;top:${it.y}px;width:${it.w}px;height:${it.h}px`;
      const idle = Scene.sprite(it.kind); idle.className = "pose-idle";
      const up = Scene.sprite(it.kind, "raise"); up.className = "pose-up";
      h.append(idle, up);
      stage.appendChild(h);
      heroes.push({ h, sh, kind: it.kind });
    });

    // the join link, written just above everyone's heads
    const link = el("div", "scene-link");
    link.textContent = "https://sf27-jeopardy.vercel.app/join";
    link.style.top = Math.max(8, Math.min(...L.items.map((it) => it.y)) - 60) + "px";
    stage.appendChild(link);
    // hidden until the host presses NEXT (button, Enter, Space or the right arrow)
    const nextBtn = el("button", "scene-next");
    nextBtn.type = "button"; nextBtn.textContent = "NEXT ▶";
    root.appendChild(nextBtn);
    const showLink = () => {
      if (link.classList.contains("show")) return;
      link.classList.add("show"); nextBtn.classList.add("gone"); Sfx.select();
    };
    nextBtn.addEventListener("click", showLink);
    if (!SceneStage._keys) {
      SceneStage._keys = true;
      document.addEventListener("keydown", (e) => {
        if (!["Enter", " ", "ArrowRight"].includes(e.key)) return;
        if (!document.getElementById("screen-scene").classList.contains("active") || busy) return;
        e.preventDefault(); SceneStage._show && SceneStage._show();
      });
    }
    SceneStage._show = showLink;

    // the Berkeley guy's cap is the JOIN button
    const ci = L.items.findIndex((it) => Scene.PEOPLE.find((p) => p.kind === it.kind).cap);
    if (ci >= 0) {
      hatBtn = el("button", "hat-btn");
      hatBtn.type = "button"; hatBtn.setAttribute("aria-label", "Join the game");
      // the cap spans sprite pixels x 3..20, y 0..6 (4 px per pixel + 2 px outline), drawn at CH device px each
      hatBtn.style.cssText = `left:${(3 * 4 + 2) * L.CH}px;top:${2 * L.CH}px;width:${18 * 4 * L.CH}px;height:${7 * 4 * L.CH}px`;
      heroes[ci].h.append(hatBtn);
      hatBtn.addEventListener("click", enter);
    }

    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(root);
    window.addEventListener("resize", fit);
    fit();
  }

  function reset() {
    zoom.style.transform = ""; zoom.style.transformOrigin = "";
    heroes.forEach((o) => o.h.classList.remove("up"));
    const game = document.getElementById("screen-game");
    game.classList.remove("entering");
    game.getAnimations().forEach((a) => a.cancel());
    busy = false;
  }

  function enter() {
    if (busy) return;
    busy = true;
    root.classList.add("pressed");
    Sfx.jump();

    // everyone raises their right hand and jumps
    heroes.forEach((o, i) => {
      setTimeout(() => o.h.classList.add("up"), i * STAGGER + 40);
      o.h.animate(JUMP_KF, { duration: JUMP, delay: i * STAGGER, easing: "linear" });
      o.sh.animate(SHADOW_KF, { duration: JUMP, delay: i * STAGGER, easing: "linear" });
    });

    // camera: zoom into the hat (origin = where the hat is right now, before we leave the ground)
    const hb = hatBtn.getBoundingClientRect(), rb = root.getBoundingClientRect();
    zoom.style.transformOrigin = `${hb.left + hb.width / 2 - rb.left}px ${hb.top + hb.height / 2 - rb.top}px`;

    const game = document.getElementById("screen-game");
    const t0 = performance.now();
    let boardShown = false, finished = false, whooshed = false;
    const total = BOARD_AT + BOARD_LEN;

    function frame(now) {
      const t = now - t0;
      if (!whooshed && t >= ZOOM_AT) { whooshed = true; Sfx.whoosh(); }
      if (t >= ZOOM_AT) {
        const p = clamp01((t - ZOOM_AT) / ZOOM_LEN);
        zoom.style.transform = `scale(${Math.exp(Math.log(ZOOM_MAX) * Math.pow(p, 2.4)).toFixed(3)})`;
      }
      if (!boardShown && t >= BOARD_AT) {
        boardShown = true;
        Sfx.boardFill(); Sfx.music("board");
        game.classList.add("entering");
        game.animate(
          [{ opacity: 0, transform: "scale(.25)" }, { opacity: 1, transform: "scale(1)" }],
          { duration: BOARD_LEN, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" }
        );
      }
      if (t >= total && !finished) {
        finished = true;
        if (onEnter) onEnter();
        reset();
        root.classList.remove("pressed");
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  return { mount, enter, _keys: false, _show: null };
})();
