// ====================================================
//  Intro transition: play button -> plane -> San Francisco
//
//  0.0-0.7s  play button rotates to face SF
//  0.7-1.8s  camera zooms into the button
//  1.8-2.2s  button pops into a pixel plane
//  2.2-4.4s  plane flies to SF, camera follows
//  4.4-4.9s  plane lands, screen fades out -> onDone()
// ====================================================
(function () {
  const T_ROTATE = 700;
  const T_ZOOM = 1800;
  const T_MORPH = 2200;
  const T_FLY = 4400;
  const T_END = 4900;
  const ZOOM_A = 3.6;   // zoom on the button
  const ZOOM_B = 4.8;   // zoom while landing on SF

  const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const sine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const outBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (t) => Math.max(0, Math.min(1, t));

  // Top-down airliner facing right, built from simple rules and mirrored top/bottom.
  const PW = 28, PH = 21, MID = 10;
  const COL = {
    white: "#ffffff", shade: "#c4cdea", red: "#e40058", gold: "#fcd800",
    glass: "#2038ec", engine: "#5c5c7a", nose: "#9aa6d6",
  };

  function buildPlaneCells() {
    const cells = Array.from({ length: PH }, () => Array(PW).fill(null));
    const paint = (x, y, c) => { cells[y][x] = c; cells[PH - 1 - y][x] = c; };

    // swept wings (rows 0-7), trailing edge shaded, tip red
    for (let y = 0; y <= 7; y++) {
      const L = Math.round(8 + (y * 3) / 7), R = 11 + y;
      for (let x = L; x <= R; x++) {
        paint(x, y, y <= 1 ? (x <= L + 1 ? COL.red : COL.white) : x <= L + 1 ? COL.shade : COL.white);
      }
    }
    // engines on the wings
    for (let y = 3; y <= 4; y++) for (let x = 12; x <= 14; x++) paint(x, y, x === 14 ? COL.shade : COL.engine);
    // tail stabilizers
    [[5, 3, 4], [6, 2, 5], [7, 2, 6]].forEach(([y, x0, x1]) => {
      for (let x = x0; x <= x1; x++) paint(x, y, y === 5 ? COL.red : x <= x0 + 1 ? COL.shade : COL.white);
    });
    // fuselage (rows 8-10, mirrored)
    [[8, 3, 23], [9, 2, 25], [10, 1, 27]].forEach(([y, x0, x1]) => {
      for (let x = x0; x <= x1; x++) paint(x, y, y === 8 ? COL.shade : COL.white);
    });
    // red tail, gold cabin stripe, blue cockpit, nose tip
    [[9, 2], [9, 3], [10, 1], [10, 2], [10, 3]].forEach(([y, x]) => paint(x, y, COL.red));
    for (let x = 5; x <= 20; x++) paint(x, MID, COL.gold);
    for (let x = 22; x <= 24; x++) paint(x, MID, COL.glass);
    paint(25, MID, COL.glass);
    paint(27, MID, COL.nose);
    return cells;
  }

  function makePlane(widthPx) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${PW} ${PH}`);
    svg.setAttribute("shape-rendering", "crispEdges");
    buildPlaneCells().forEach((row, y) =>
      row.forEach((c, x) => {
        if (!c) return;
        const r = document.createElementNS(ns, "rect");
        r.setAttribute("x", x); r.setAttribute("y", y);
        r.setAttribute("width", 1); r.setAttribute("height", 1);
        r.setAttribute("fill", c);
        svg.appendChild(r);
      })
    );
    const el = document.createElement("div");
    el.className = "plane";
    el.style.width = widthPx + "px";
    el.style.aspectRatio = PW + " / " + PH;
    el.appendChild(svg);
    return el;
  }

  function square(map, x, y, size, cls) {
    const s = document.createElement("div");
    s.className = cls;
    s.style.width = s.style.height = size + "px";
    s.style.left = x + "px";
    s.style.top = y + "px";
    map.appendChild(s);
    return s;
  }

  let busy = false;

  window.playIntro = function (onDone) {
    if (busy) return;

    const screen = document.getElementById("screen-landing");
    const map = document.getElementById("us-map");
    const btn = document.getElementById("btn-start");
    const icon = btn.querySelector(".play-icon");
    const fade = document.getElementById("fade");
    const sfPin = map.querySelector('.pin[data-city="San Francisco"]');

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!sfPin || reduce) { onDone(); return; }
    busy = true;
    Sfx.click();                 // wakes the audio engine (this runs inside the play-button click)
    Sfx.music("scene");          // mellow sunset music starts under the flight
    Sfx.duck(true);

    // Positions in the map's own (unscaled) pixel space
    const B = { x: btn.offsetLeft, y: btn.offsetTop };
    const S = { x: sfPin.offsetLeft, y: sfPin.offsetTop };
    const r0 = map.getBoundingClientRect();
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const heading = Math.atan2(S.y - B.y, S.x - B.x); // radians, 0 = right

    // Camera: put map point P at screen center at scale s
    const camFor = (P, s) => ({
      s,
      tx: cx - r0.left - P.x * s,
      ty: cy - r0.top - P.y * s,
    });
    const setCam = (c) => {
      map.style.transform = `translate(${c.tx}px, ${c.ty}px) scale(${c.s})`;
    };
    const mixCam = (a, b, t) => ({
      s: lerp(a.s, b.s, t), tx: lerp(a.tx, b.tx, t), ty: lerp(a.ty, b.ty, t),
    });

    const camStart = { s: 1, tx: 0, ty: 0 };
    const camBtn = camFor(B, ZOOM_A);

    const planeW = btn.offsetWidth * 0.5;
    let plane = null;
    let morphed = false;
    let arrived = false;
    let lastTrail = 0;

    screen.classList.add("flying");
    map.classList.add("flying");

    // Path with a gentle arc
    const pathAt = (k) => ({
      x: lerp(B.x, S.x, k),
      y: lerp(B.y, S.y, k) - Math.sin(Math.PI * k) * map.offsetHeight * 0.07,
    });

    function poof() {
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        const sq = Math.max(3, Math.round(planeW / 8));
        const p = square(map, B.x - sq / 2, B.y - sq / 2, sq, "fx-square");
        const d = planeW * 0.9;
        p.animate(
          [
            { transform: "translate(0,0) scale(1)", opacity: 1 },
            { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(.3)`, opacity: 0 },
          ],
          { duration: 450, easing: "steps(5)", fill: "forwards" }
        ).onfinish = () => p.remove();
      }
    }

    function trail(pos, dir) {
      const q = Math.max(2, Math.round(planeW / 14)); // snap to a chunky grid
      const x = Math.round((pos.x - Math.cos(dir) * planeW * 0.45) / q) * q;
      const y = Math.round((pos.y - Math.sin(dir) * planeW * 0.45) / q) * q;
      const p = square(map, x - q / 2, y - q / 2, q, "fx-square");
      p.animate(
        [{ opacity: 0.9, transform: "scale(1)" }, { opacity: 0, transform: "scale(.3)" }],
        { duration: 700, easing: "steps(6)", fill: "forwards" }
      ).onfinish = () => p.remove();
    }

    function cleanup() {
      map.style.transform = "";
      map.classList.remove("flying");
      screen.classList.remove("flying", "zooming");
      icon.style.transform = "";
      btn.style.visibility = "";
      sfPin.classList.remove("arrived");
      if (plane) plane.remove();
      map.querySelectorAll(".fx-square").forEach((n) => n.remove());
      busy = false;
    }

    const t0 = performance.now();
    let jetOn = false;
    function frame(now) {
      const t = now - t0;
      if (!jetOn && t >= T_ZOOM - 300) { jetOn = true; Sfx.jetStart(); }   // engines spool up as the button turns into a plane

      if (t < T_ROTATE) {
        icon.style.transform = `rotate(${heading * inOut(t / T_ROTATE)}rad)`;
      } else if (t < T_ZOOM) {
        icon.style.transform = `rotate(${heading}rad)`;
        screen.classList.add("zooming");
        setCam(mixCam(camStart, camBtn, inOut((t - T_ROTATE) / (T_ZOOM - T_ROTATE))));
      } else if (t < T_MORPH) {
        setCam(camBtn);
        if (!morphed) {
          morphed = true;
          btn.style.visibility = "hidden";
          plane = makePlane(planeW);
          plane.style.left = B.x + "px";
          plane.style.top = B.y + "px";
          map.appendChild(plane);
          poof();
          Sfx.pop();
        }
        const k = outBack(clamp01((t - T_ZOOM) / (T_MORPH - T_ZOOM)));
        plane.style.transform = `translate(-50%, -50%) rotate(${heading}rad) scale(${k})`;
      } else if (t < T_FLY) {
        const k = sine((t - T_MORPH) / (T_FLY - T_MORPH));
        Sfx.jetFly(k);
        const pos = pathAt(k);
        const ahead = pathAt(Math.min(1, k + 0.02));
        const dir = k < 0.98 ? Math.atan2(ahead.y - pos.y, ahead.x - pos.x) : heading;
        plane.style.left = pos.x + "px";
        plane.style.top = pos.y + "px";
        const bank = 1 - 0.1 * Math.sin(k * Math.PI * 5) * Math.sin(Math.PI * k);
        plane.style.transform = `translate(-50%, -50%) rotate(${dir}rad) scaleY(${bank})`;
        setCam(camFor(pos, lerp(ZOOM_A, ZOOM_B, k)));
        if (now - lastTrail > 45) { lastTrail = now; trail(pos, dir); }
      } else if (t < T_END) {
        const k = clamp01((t - T_FLY) / (T_END - T_FLY));
        if (!arrived) {
          arrived = true;
          sfPin.classList.add("arrived");
          Sfx.jetStop(); Sfx.land(); Sfx.duck(false);
          fade.classList.add("on");
        }
        setCam(camFor(S, ZOOM_B));
        plane.style.left = S.x + "px";
        plane.style.top = S.y + "px";
        plane.style.transform = `translate(-50%, -50%) rotate(${heading}rad) scale(${1 - 0.7 * inOut(k)})`;
      } else {
        // Screen is fully faded: swap slides, reset the map, fade back in
        onDone();
        cleanup();
        requestAnimationFrame(() => requestAnimationFrame(() => fade.classList.remove("on")));
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
})();
