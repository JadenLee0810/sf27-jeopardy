// ====================================================
//  Pixel-art scene: Golden Gate Bridge at sunset + the 5 of us
//  Renders to a tiny canvas (256x144); CSS scales it up crisp.
//  Usage: Scene.draw(canvasElement)
// ====================================================
(function () {
  const W = 256, H = 144, HORIZON = 104;
  const BG = 5;   // device pixels per background pixel
  const CH = 2;   // device pixels per character pixel (characters are drawn at 4x detail)

  // ---------- helpers ----------
  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  const toRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (c) =>
    "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => {
    const A = toRGB(a), B = toRGB(b);
    return toHex(A.map((v, i) => v + (B[i] - v) * t));
  };
  const shade = (h, t) => (t < 0 ? mix(h, "#000000", -t) : mix(h, "#ffffff", t));
  const gauss = (u) => Math.exp(-u * u);
  function gradient(stops, v) {
    for (let i = 0; i < stops.length - 1; i++) {
      const [a, ca] = stops[i], [b, cb] = stops[i + 1];
      if (v <= b) return mix(ca, cb, Math.max(0, (v - a) / (b - a)));
    }
    return stops[stops.length - 1][1];
  }

  // ====================================================
  //  CHARACTERS  (24 px wide; guys 46 tall, girls 41 tall, standing, side by side)
  // ====================================================
  // Sprites are 24 px wide. Guys (~6'0") are 46 rows tall, girls (~5'4") are 41 rows
  // (64in / 72in = 0.89). Heads are the same size; the difference is torso + legs.
  const SW = 24, SH_MAX = 46;

  // Order left -> right: BU guy, Rutgers girl, Cal guy (cap), Davis guy, UCLA girl.
  // Hoodie colors / details are copied from each school's real hoodie.
  const PEOPLE = [
    // BU: bright red hoodie
    { sex: "m", hair: "side", square: true, wide: 2, hairC: "#2e2420", skin: "#f0c9a8", glasses: null,
      top: "hoodie", topC: "#e23c2e", kind: "bu", strC: "#b02a22", strSh: "#c8352b",
      pants: "#3a3a46", shoe: "#e6e6ee", mouth: "big" },
    // Rutgers: heather grey hoodie
    { sex: "f", hair: "long", hairC: "#1c1618", skin: "#f4d6c2", glasses: null,
      top: "hoodie", topC: "#b6b9be", heather: true, kind: "rutgers",
      strC: "#8f939a", strSh: "#a7abb1", lining: "#9b9ea5",
      pants: "#4a5f8a", shoe: "#e8e8f0", mouth: "smile" },
    // Cal: navy hoodie + navy cap
    { sex: "m", hair: "curly", hairC: "#1e1a20", skin: "#e2b995", glasses: "square", glassC: "#2c2c3a",
      cap: { c: "#1c3d7a", logo: "#fdb515" },
      top: "hoodie", topC: "#1d2850", kind: "cal", strC: "#0f1630", strSh: "#222d57",
      pants: "#2a2a3c", shoe: "#2a2a2a", mouth: "smile" },
    // UC Davis: mustard hoodie
    { sex: "m", hair: "mop", hairC: "#2a2024", skin: "#f0cdb0", glasses: "round", glassC: "#b4bacb",
      top: "hoodie", topC: "#d3b05a", kind: "davis", strC: "#b8943f", strSh: "#c9a64e",
      pants: "#34344a", shoe: "#e2e2ea", mouth: "flat" },
    // UCLA: bright blue hoodie, cream hood lining + cord
    { sex: "f", hair: "wavy", hairC: "#2a2022", skin: "#efc9ab", glasses: null,
      top: "hoodie", topC: "#2b8de0", kind: "ucla", lining: "#f0e7d3",
      strC: "#f0e7d3", strSh: "#d6cdb8",
      pants: "#e7e2d3", shoe: "#3a3030", mouth: "smile" },
  ];

  function buildSprite(p) {
    const f = p.sex === "f";
    const H = f ? 41 : 46;
    const g = Array.from({ length: H }, () => Array(SW).fill(null));
    const M = SW - 1;
    const px = (x, y, c) => { if (x >= 0 && x < SW && y >= 0 && y < H) g[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(x, y, c);
    };
    const hline = (x0, x1, y, c) => rect(x0, y, x1, y, c);
    const vl = (x, y0, y1, c) => rect(x, y0, x, y1, c);
    const mpx = (x, y, c) => { px(x, y, c); px(M - x, y, c); };
    const mrect = (x0, y0, x1, y1, c) => { rect(x0, y0, x1, y1, c); rect(M - x1, y0, M - x0, y1, c); };
    const inE = (x, y, cx, cy, rx, ry) => {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      return dx * dx + dy * dy <= 1;
    };
    const fillE = (cx, cy, rx, ry, c) => {
      for (let y = 0; y < H; y++) for (let x = 0; x < SW; x++) if (inE(x, y, cx, cy, rx, ry)) px(x, y, c);
    };

    // ---- layout ----
    const SHY = 18;                       // shoulder row
    const TL = f ? 11 : 14;               // torso rows
    const bodyEnd = SHY + TL - 1;         // 31 (guys) / 28 (girls)
    const legTop = bodyEnd + 1;
    const shoeTop = H - 3;
    const tx0 = 5;                // torso left edge (mirrored on the right)
    const ax0 = 2;                // arm left edge  (3 wide)

    // ---- colors ----
    const skin = p.skin, skinSh = shade(skin, -0.13), skinHi = shade(skin, 0.08);
    const blush = mix(skin, "#ff8a9a", 0.3);
    const topSh = shade(p.topC, -0.17), topHi = shade(p.topC, 0.12);
    const hairHl = shade(p.hairC, 0.13), hairDk = shade(p.hairC, -0.3);
    const eye = "#1f1519", mc = "#a85a5a", mcSoft = mix(skin, "#a85a5a", 0.45);

    // ---- hair behind the body ----
    const hairEnd = 27;
    if (p.hair === "long") rect(4, 4, 19, hairEnd, p.hairC);
    if (p.hair === "wavy") rect(3, 4, 20, hairEnd + 1, p.hairC);

    // ---- legs + shoes ----
    {
      const ps = shade(p.pants, -0.18), pl = shade(p.pants, 0.1);
      rect(tx0, legTop, M - tx0, legTop + 1, p.pants);
      mrect(6, legTop + 2, 10, shoeTop - 1, p.pants);
      mrect(10, legTop + 2, 10, shoeTop - 1, ps);                 // inner leg shade
      mrect(6, legTop + 2, 6, shoeTop - 1, pl);                   // lit outer edge
      mrect(7, legTop + 8, 9, legTop + 8, ps);                    // knee crease
      mrect(7, shoeTop - 2, 9, shoeTop - 2, ps);                  // hem fold
      mrect(5, shoeTop, 10, H - 1, p.shoe);
      mpx(5, shoeTop, null);
      mrect(5, H - 1, 10, H - 1, shade(p.shoe, -0.35));
      mrect(7, shoeTop, 9, shoeTop, shade(p.shoe, -0.15));
      mpx(8, shoeTop + 1, shade(p.shoe, -0.2)); mpx(9, shoeTop + 1, shade(p.shoe, -0.2));
    }

    // ---- neck ----
    rect(10, 16, 13, 17, skin);
    hline(10, 13, 16, skinSh);

    // ---- torso + arms ----
    const base = g.map((r) => r.slice());   // body layer (legs, neck, back hair); the hoodie is drawn on top at 2x

    // ---- head ----
    if (p.square) {                                                     // squarer head: flat sides, wide jaw
      for (let y = 2; y <= 15; y++) hline(5, 18, y, skin);
      px(4, 8, skin); px(4, 9, skin); px(19, 8, skin); px(19, 9, skin);  // ears
      px(4, 9, skinSh); px(19, 9, skinSh);
      hline(7, 16, 15, skinSh);                                         // chin shade
      mpx(5, 13, skinSh); mpx(5, 14, skinSh);                           // jaw corners
    } else {
      fillE(11.5, 8.6, 6.0, 7.3, skin);
      px(5, 8, skin); px(5, 9, skin); px(18, 8, skin); px(18, 9, skin); // ears
      px(5, 9, skinSh); px(18, 9, skinSh);
      hline(10, 13, 15, skinSh);                                        // chin shade
    }
    mrect(7, 10, 8, 10, blush);                                         // cheeks

    // ---- face ----
    const brow = shade(p.hairC, 0.14);
    hline(7, 9, 6, brow); hline(14, 16, 6, brow);
    mrect(8, 8, 8, 9, eye);
    px(11, 11, skinSh); px(12, 11, skinSh);
    if (p.mouth === "flat") hline(10, 13, 13, mc);
    if (p.mouth === "smile") { hline(10, 13, 13, mc); mpx(9, 12, mcSoft); }
    if (p.mouth === "big") {
      mpx(9, 12, mcSoft);
      hline(10, 13, 13, "#ffffff"); hline(11, 12, 14, mc);
    }

    // ---- front hair (shapes via ellipses + a per-column lower edge) ----
    const paintHair = (fn) => {
      for (let y = 0; y < 18; y++) for (let x = 0; x < SW; x++) if (fn(x, y)) px(x, y, p.hairC);
    };
    const cap = p.square
      ? (x, y) => x >= 4 && x <= 19 && y >= 0 && y <= 12   // boxy hair block
      : (x, y) => inE(x, y, 11.5, 6.4, 8.2, 6.8);
    const edge = (arr, x0) => (x) => arr[x - x0];

    switch (p.cap ? "capped" : p.hair) {
      case "capped": {           // cap covers the top; short curly hair shows only at the sides, hugging the head
        const side = [[5, 6], [5, 7], [5, 8], [5, 9], [5, 10], [6, 6], [6, 7], [6, 8], [4, 7], [4, 8], [4, 9]];
        side.forEach(([x, y]) => { px(x, y, p.hairC); px(M - x, y, p.hairC); });
        [[4, 9], [5, 10]].forEach(([x, y]) => { px(x, y, hairDk); px(M - x, y, hairDk); });
        break;
      }
      case "mop": {
        const fr = edge([4, 6, 5, 4, 5, 6, 6, 5, 4, 5, 6, 4], 6);
        paintHair((x, y) => cap(x, y) && y <= (x <= 5 || x >= 18 ? 10 : fr(x)));
        break;
      }
      case "side": {
        const ymax = (x) => (x <= 5 ? 10 : x <= 8 ? 7 : x <= 11 ? 6 : x <= 13 ? 5 : x <= 17 ? 4 : 8);
        paintHair((x, y) => cap(x, y) && y <= ymax(x));
        break;
      }
      case "long": {
        paintHair((x, y) => cap(x, y) && y <= (x <= 5 || x >= 18 ? 12 : x <= 7 || x >= 16 ? 6 : 5));
        mrect(4, 5, 5, 15, p.hairC); mrect(6, 6, 6, 10, p.hairC);
        break;
      }
      case "wavy": {
        const ymax = (x) => Math.min(9, 4 + Math.floor(Math.abs(x - 11.5) * 0.7));
        paintHair((x, y) => cap(x, y) && y <= (x <= 5 || x >= 18 ? 12 : ymax(x)));
        mrect(4, 5, 5, 15, p.hairC); mrect(6, 8, 6, 11, p.hairC);
        for (let y = 16; y <= hairEnd + 1; y++) {
          const off = Math.floor(y / 4) % 2;
          mrect(3 + off, y, 5 + off, y, p.hairC);
        }
        px(11, 1, hairDk); px(12, 1, hairDk); px(11, 2, hairDk); px(12, 2, hairDk); // part (hair line, not scalp)
        break;
      }
      case "curly": {
        const curls = [[5, 5], [7, 2], [10, 1], [13, 1], [16, 2], [18, 5], [4, 8], [19, 8],
          [8, 4], [11, 3], [15, 4], [6, 6], [9, 5], [12, 5], [14, 6], [17, 6]];
        curls.forEach(([cx, cy]) => fillE(cx + 0.5, cy + 0.5, 2.7, 2.5, p.hairC));
        for (let y = 0; y < 18; y++) for (let x = 0; x < SW; x++) if (y > 6 && x > 5 && x < 18) px(x, y, g[y][x] === p.hairC ? null : g[y][x]);
        [[5, 7], [18, 7], [4, 9], [19, 9]].forEach(([x, y]) => px(x, y, p.hairC));
        // curl highlights (upper-left of each curl)
        curls.forEach(([cx, cy]) => { if (g[cy - 1] && g[cy - 1][cx - 1] === p.hairC) px(cx - 1, cy - 1, hairHl); });
        break;
      }
    }
    // soft shadow cast on the forehead by the fringe
    for (let y = 0; y < 14; y++)
      for (let x = 6; x < 18; x++)
        if ((g[y][x] === p.hairC) && g[y + 1][x] === skin) g[y + 1][x] = skinSh;
    // highlights + sparse strands
    for (let y = 0; y < 14; y++)
      for (let x = 0; x < SW; x++)
        if (g[y][x] === p.hairC) {
          if (p.hair !== "wavy" && (inE(x, y, 8.5, 2.4, 3.0, 0.9) || inE(x, y, 14.5, 3.0, 1.6, 0.7))) g[y][x] = hairHl;
          else if ((x * 3 + y * 7) % 13 === 0) g[y][x] = hairDk;
        }

    // ---- ball cap (crown over the hair, brim band across the forehead) ----
    if (p.cap) {
      const cc = p.cap.c, cDk = shade(cc, -0.28), cHi = shade(cc, 0.16);
      for (let y = 0; y <= 4; y++)
        for (let x = 0; x < SW; x++) if (inE(x, y, 11.5, 4.2, 7.6, 4.6)) px(x, y, cc);
      hline(3, 20, 5, cc); hline(3, 20, 5, shade(cc, -0.08));       // brim, a touch wider than the crown
      hline(4, 19, 6, cDk);                                         // brim underside shadow on the forehead
      hline(3, 20, 5, shade(cc, -0.08));
      [8, 15].forEach((x) => { for (let y = 1; y <= 4; y++) px(x, y, cDk); });   // panel seams
      px(11, 0, cHi); px(12, 0, cHi);                               // button
      hline(5, 7, 2, cHi); hline(5, 6, 3, cHi);                     // light from the upper left
      hline(10, 12, 1, p.cap.logo); px(10, 2, p.cap.logo); hline(10, 12, 3, p.cap.logo);   // gold C
    }

    // ---- glasses ----
    if (p.glasses) {
      const fc = p.glassC;
      const frame = (x0) => {
        hline(x0, x0 + 4, 7, fc); hline(x0, x0 + 4, 11, fc);
        vl(x0, 7, 11, fc); vl(x0 + 4, 7, 11, fc);
        if (p.glasses === "round")
          [[x0, 7], [x0 + 4, 7], [x0, 11], [x0 + 4, 11]].forEach(([x, y]) => px(x, y, skin));
        px(x0 + 3, 10, "#e6ecff");
      };
      frame(6); frame(13);
      px(11, 8, fc); px(12, 8, fc);
    }

    return { base, g, H };
  }

  // ---------------------------------------------------------------
  //  Hoodie at 2x detail. Drawn on the doubled sprite grid (48 wide)
  //  between the body (legs, neck) and the head/hair layers.
  // ---------------------------------------------------------------

  function drawHoodie(o, p, f) {
    const W2 = SW * 2, M2 = W2 - 1, H2 = o.length;
    const raise = p.pose === "raise";                // pose: right hand up (the arm on the viewer's left)
    let raising = false;
    const dxw = p.wide || 0;                        // broader build: sides/arms pushed outward, centre stretched
    const rawPx = (x, y, c) => { if (x >= 0 && x < W2 && y >= 0 && y < H2) o[y][x] = c; };
    const px = (x, y, c) => {
      if (raise && !raising && x <= 9 && y >= 36) return;   // the lowered arm is not drawn in this pose
      if (!dxw) return rawPx(x, y, c);
      if (x <= 23) { rawPx(x - dxw, y, c); if (x === 23) for (let k = 1; k <= dxw; k++) rawPx(23 - dxw + k, y, c); }
      else { rawPx(x + dxw, y, c); if (x === 24) for (let k = 0; k < dxw; k++) rawPx(24 + k, y, c); }
    };
    const hline = (x0, x1, y, c) => { for (let x = x0; x <= x1; x++) px(x, y, c); };
    const mpx = (x, y, c) => { px(x, y, c); px(M2 - x, y, c); };
    const inE = (x, y, cx, cy, rx, ry) => {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      return dx * dx + dy * dy <= 1;
    };

    const hd = p.topC;
    const T = { base: hd, sh1: shade(hd, -0.12), sh2: shade(hd, -0.25), sh3: shade(hd, -0.42),
      hi1: shade(hd, 0.1), hi2: shade(hd, 0.2), pocket: shade(hd, -0.05) };
    const skin = p.skin, skinSh = shade(skin, -0.14), skinHi = shade(skin, 0.08);
    const metal = "#b9bccb", metalDk = "#6c6f80", str = p.strC || "#eeeef6", strSh = p.strSh || "#a9aab8";

    const R_END = f ? 66 : 67;           // hoodie hem (covers the hips)
    const SH0 = 36;                      // shoulder row
    const cuffEnd = R_END + 2, cuffTop = cuffEnd - 3;
    const lx = (y) => { const r = y - SH0; return p.square ? (r === 0 ? 11 : 10) : r === 0 ? 14 : r === 1 ? 12 : r === 2 ? 11 : 10; };
    const armX0 = (y) => (p.square ? 4 : y === 38 ? 7 : y === 39 ? 5 : 4);
    const armTone = (d, left) => (d === 9 ? T.sh2 : d === 8 ? T.sh1 : d === 4 ? (left ? T.hi1 : T.sh1) : T.base);

    // ---- cloth: torso + sleeves (light from the upper left) ----
    for (let y = SH0; y <= R_END; y++)
      for (let x = lx(y); x <= M2 - lx(y); x++) {
        const ex = x - lx(y), ex2 = M2 - lx(y) - x;
        px(x, y, ex2 === 0 ? T.sh2 : ex2 <= 2 ? T.sh1 : ex <= 1 ? T.hi1 : T.base);
      }
    for (let y = p.square ? 37 : 38; y <= cuffEnd; y++)
      for (let d = armX0(y); d <= 9; d++) { px(d, y, armTone(d, true)); px(M2 - d, y, armTone(d, false)); }

    // fabric texture (heather grey gets a speckled look)
    for (let y = SH0; y <= cuffEnd; y++)
      for (let x = 0; x < W2; x++)
        if (o[y][x] === T.base) {
          if (p.heather) {
            const r = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 100;
            if (r < 16) o[y][x] = shade(hd, 0.08); else if (r < 32) o[y][x] = shade(hd, -0.07);
          } else if ((x * 7 + y * 13) % 17 === 0) o[y][x] = shade(hd, -0.05);
          else if ((x * 5 + y * 3) % 19 === 0) o[y][x] = shade(hd, 0.05);
        }

    // ---- ribbed cuffs + hem ----
    for (let y = cuffTop; y <= cuffEnd; y++)
      for (let x = 4; x <= 9; x++) { const c = x % 2 ? T.sh1 : T.sh2; px(x, y, c); px(M2 - x, y, c); }
    hline(4, 9, cuffTop - 1, T.sh2); hline(M2 - 9, M2 - 4, cuffTop - 1, T.sh2);
    for (let y = R_END - 3; y <= R_END; y++)
      for (let x = 10; x <= 37; x++) px(x, y, x % 2 ? T.sh1 : T.sh2);
    hline(10, 37, R_END - 4, T.sh2);

    // ---- seams, stitching, folds ----
    for (let y = 40; y <= 52; y++) { mpx(10, y, T.sh2); if (y % 2 === 0) mpx(11, y, T.hi1); }
    mpx(13, 38, T.sh1); mpx(12, 39, T.sh1);
    const e = cuffTop - 12;
    for (let k = 0; k < 3; k++) {
      const y = e + k * 3;
      [[4, 0], [5, 1], [6, 1], [7, 0], [8, 1]].forEach(([x, dy]) => px(x, y + dy, T.sh1));
      [[5, 2], [6, 2], [7, 1]].forEach(([x, dy]) => px(x, y + dy, T.hi1));
      [[39, 1], [40, 0], [41, 0], [42, 1], [43, 0]].forEach(([x, dy]) => px(x, y + 1 + dy, T.sh2));
    }
    [[12, 44], [13, 45], [14, 46], [15, 46]].forEach(([x, y]) => px(x, y, T.sh1));
    [[13, 46], [14, 47]].forEach(([x, y]) => px(x, y, T.hi1));
    [[35, 45], [34, 46], [33, 47]].forEach(([x, y]) => px(x, y, T.sh1));

    // ---- hood: bunched roll around the neck + dark lining ----
    for (let y = 28; y <= 46; y++)
      for (let x = 0; x < W2; x++) {
        const outer = inE(x, y, 23.5, 37, 10.5, 6.2), inner = inE(x, y, 23.5, 36.5, 5.8, 5.2);
        if (outer && !inner) {
          const dx = x + 0.5 - 23.5, dy = y + 0.5 - 37;
          let c = T.base;
          if (dy < -1.5 && dx < 1) c = T.hi1;
          if (dx > 3.5 && dy > -4) c = T.sh1;
          if (dy > 3.2) c = T.sh2;
          if (!inE(x - 1, y - 1, 23.5, 37, 10.5, 6.2) && dx < 0 && dy < 0) c = T.hi2;
          px(x, y, c);
        } else if (inner && y >= 31) px(x, y, p.lining ? (Math.abs(x + 0.5 - 23.5) > 4.2 || y > 40 ? shade(p.lining, -0.18) : p.lining) : T.sh3);
      }
    [[32, 20, 27], [33, 20, 27], [34, 20, 27], [35, 20, 27], [36, 19, 28], [37, 20, 27],
      [38, 21, 26], [39, 22, 25], [40, 23, 24]]
      .forEach(([y, a, b]) => hline(a, b, y, y <= 33 ? skinSh : skin));
    // eyelets + short drawstrings (the chest design sits below them)
    mpx(19, 41, metal); mpx(19, 42, metalDk);
    for (let y = 43; y <= 46; y++) { const c = y % 2 ? str : strSh; px(19, y, c); px(28, y, c); }
    px(19, 47, metal); px(28, 47, metal);

    // ---- kangaroo pocket ----
    const pb = R_END - 5, pt = pb - 4;
    for (let y = pt; y <= pb; y++) {
      const t = (y - pt) / 4, L = Math.round(15 - 3 * t), R = M2 - L;
      hline(L, R, y, T.pocket);
      const open = y <= pt + 3;
      px(L, y, open ? T.sh3 : T.sh2); px(R, y, open ? T.sh3 : T.sh2);
      if (!open) px(L + 1, y, T.hi1);
    }
    for (let x = 15; x <= 32; x++) px(x, pt, x % 2 ? T.hi1 : T.sh2);       // topstitch
    hline(16, 31, pt + 1, T.sh1);
    [[14, pt - 1], [13, pt - 2], [12, pt - 3], [11, pt - 4]].forEach(([x, y]) => px(x, y, T.sh1));
    [[15, pt - 1], [14, pt - 2], [13, pt - 3]].forEach(([x, y]) => px(x, y, T.hi1));
    [[33, pt - 1], [34, pt - 2], [35, pt - 3]].forEach(([x, y]) => px(x, y, T.sh1));

    // ---- hands (fists with finger grooves) ----
    const hy = cuffEnd + 1;
    for (let r = 0; r < 6; r++) {
      const a = r === 5 ? 6 : 5, b = r === 5 ? 8 : 9;
      for (let x = a; x <= b; x++) {
        let c = skin;
        if (x === a) c = skinHi;
        if (x === 9 && r < 5) c = skinSh;
        if (r >= 3 && x === 7) c = skinSh;
        px(x, hy + r, c);
        px(M2 - x, hy + r, c === skinHi ? skinSh : c === skinSh ? skinHi : c);
      }
    }
    px(9, hy + 1, skinHi); px(9, hy + 2, skinHi);

    // ---- pose: arm straight up beside the head, open hand waving ----
    if (raise) {
      raising = true;
      const X = (x) => x - (p.cap ? 1 : 0);          // a cap brim sticks out, so move the arm out a bit
      const tone = (c) => (c === 0 ? T.hi1 : c <= 2 ? T.base : c === 3 ? T.sh1 : T.sh2);
      for (let y = 38; y >= 37; y--) for (let x = 4; x <= 9; x++) px(X(x), y, armTone(x, true));   // shoulder joint
      for (let y = 36; y >= 14; y--) for (let c = 0; c < 5; c++) px(X(3 + c), y, tone(c));          // sleeve
      for (let y = 10; y <= 13; y++) for (let x = 3; x <= 7; x++) px(X(x), y, x % 2 ? T.sh1 : T.sh2); // ribbed cuff
      hline(X(3), X(7), 14, T.sh2);
      [[4, 20], [5, 21], [6, 20], [4, 27], [5, 28], [6, 27]].forEach(([x, y]) => px(X(x), y, T.sh1));
      [[4, 21], [5, 22], [4, 28], [5, 29]].forEach(([x, y]) => px(X(x), y, T.hi1));
      // hand: wrist, palm, four fingers, thumb toward the head
      hline(X(3), X(7), 9, skin);
      for (let y = 6; y <= 8; y++) for (let x = 2; x <= 8; x++) px(X(x), y, x === 2 ? skinHi : x === 8 ? skinSh : skin);
      [[2, 4, 5], [4, 3, 5], [6, 2, 5], [8, 3, 5]].forEach(([x, top, bot]) => {
        for (let y = top; y <= bot; y++) px(X(x), y, y === top ? skinHi : skin);
      });
      [3, 5, 7].forEach((x) => px(X(x), 5, skinSh));
      hline(X(4), X(6), 7, skinSh);
      px(X(9), 7, skin); px(X(9), 6, skin); px(X(10), 6, skinHi);
      raising = false;
    }
  }

  // ---------------------------------------------------------------
  //  Chest designs at 4x (the torso is ~56 px wide here). Text is rasterized
  //  from real fonts, thresholded to pixels, arched, outlined, etc.
  // ---------------------------------------------------------------
  const SERIF = '"Cambria", "Georgia", "Times New Roman", serif';
  const SANS = '"Arial Narrow", "Arial", sans-serif';
  const SCRIPT = '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive';

  function textMask(str, o) {
    const OS = 8, pad = 4 * OS;
    const fs = (o.h * OS) / (o.cap || 0.7);
    const cv = document.createElement("canvas");
    cv.width = Math.ceil(o.w * OS * 2) + pad * 2;
    cv.height = Math.ceil(fs * 2) + pad * 2;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.font = (o.style || "bold") + " " + fs + "px " + o.family;
    if ("letterSpacing" in ctx) ctx.letterSpacing = (o.spacing || 0) * OS + "px";
    ctx.fillStyle = "#000"; ctx.textBaseline = "alphabetic";
    const nat = Math.max(1, ctx.measureText(str).width);
    ctx.setTransform((o.w * OS) / nat, 0, 0, 1, pad, 0);   // squeeze/stretch to the target width
    ctx.fillText(str, 0, pad + fs);
    if (o.weight) { ctx.lineJoin = "round"; ctx.lineWidth = fs * o.weight; ctx.strokeStyle = "#000"; ctx.strokeText(str, 0, pad + fs); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const CW = cv.width, d = ctx.getImageData(0, 0, CW, cv.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < cv.height; y++)
      for (let x = 0; x < CW; x++)
        if (d[(y * CW + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return { w: 1, h: 1, m: new Uint8Array(1) };
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const w = o.w, h = o.forceH === false ? Math.max(1, Math.round(bh / OS)) : o.h;
    const m = new Uint8Array(w * h);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const sx0 = x0 + (i * bw) / w, sx1 = x0 + ((i + 1) * bw) / w;
        const sy0 = y0 + (j * bh) / h, sy1 = y0 + ((j + 1) * bh) / h;
        let sum = 0, n = 0;
        for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++)
          for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) { sum += d[(y * CW + x) * 4 + 3]; n++; }
        if (n && sum / n / 255 > (o.thr || 0.33)) m[j * w + i] = 1;
      }
    return { w, h, m };
  }

  // bend a text mask into an arch (centre rises by `a` px), like collegiate lettering
  function archMask(m, a) {
    const out = new Uint8Array(m.w * (m.h + a));
    for (let x = 0; x < m.w; x++) {
      const u = (2 * x) / (m.w - 1) - 1, up = Math.round(a * (1 - u * u));
      for (let y = 0; y < m.h; y++) if (m.m[y * m.w + x]) out[(y + a - up) * m.w + x] = 1;
    }
    return { w: m.w, h: m.h + a, m: out };
  }

  const KEY = (x, y) => (y + 24) * 512 + (x + 24);
  const UNKEY = (k) => [(k % 512) - 24, Math.floor(k / 512) - 24];
  function setOf(m) {
    const s = new Set();
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.m[y * m.w + x]) s.add(KEY(x, y));
    return s;
  }
  function growSet(s, r) {
    const o = new Set();
    s.forEach((k) => { const [x, y] = UNKEY(k); for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) o.add(KEY(x + dx, y + dy)); });
    return o;
  }
  function shiftSet(s, dx, dy) {
    const o = new Set();
    s.forEach((k) => { const [x, y] = UNKEY(k); o.add(KEY(x + dx, y + dy)); });
    return o;
  }
  const minusSet = (a, b) => { const o = new Set(); a.forEach((k) => { if (!b.has(k)) o.add(k); }); return o; };

  function drawLogo4(o, p, f) {
    const W4 = SW * 4, H4 = o.length;
    const put = (x, y, c) => { if (x >= 0 && x < W4 && y >= 0 && y < H4) o[y][x] = c; };
    const cxOf = (w) => Math.round(47.5 - (w - 1) / 2);

    // paint a text mask: optional outline (1px, optionally with a drop shadow) + fill
    const stamp = (m, topY, fill, edge, shadow) => {
      const F = setOf(m), ox = cxOf(m.w);
      const blit = (S, c) => S.forEach((k) => { const [x, y] = UNKEY(k); put(ox + x, topY + y, c); });
      if (edge) {
        let E = growSet(F, 1);
        if (shadow) E = new Set([...E, ...shiftSet(E, 1, 1)]);
        blit(minusSet(E, F), edge);
      }
      blit(F, fill);
    };
    const pill = (y0, w, h, fill, border, label) => {
      const x0 = cxOf(w), r = h / 2;
      const inside = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return false;
        const cx = x + 0.5 < r ? r : x + 0.5 > w - r ? w - r : x + 0.5;
        return (x + 0.5 - cx) ** 2 + (y + 0.5 - r) ** 2 <= r * r;
      };
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (!inside(x, y)) continue;
          const edgePx = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
          put(x0 + x, y0 + y, edgePx && border ? border : fill);
        }
      if (label) {
        const SHAPES = [["11", "10", "11"], ["11", "01", "11"], ["10", "11", "10"], ["11", "11", "01"], ["01", "11", "11"], ["11", "10", "10"]];
        const chars = [...label.t];
        const tw = chars.reduce((a, ch) => a + (ch === " " ? 2 : 3), -1);
        let lx = cxOf(tw), ly = y0 + Math.round((h - 3) / 2);
        chars.forEach((ch) => {
          if (ch === " ") { lx += 2; return; }
          SHAPES[ch.charCodeAt(0) % SHAPES.length].forEach((row, ry) => [...row].forEach((v, rx) => { if (v === "1") put(lx + rx, ly + ry, label.c); }));
          lx += 3;
        });
      }
    };

    const hemEnd = 2 * (f ? 66 : 67) + 1;       // last row of the hem at 4x

    if (p.kind === "bu") {
      // white arched "BOSTON / UNIVERSITY" with a heavy black outline
      const A = archMask(textMask("BOSTON", { w: 38, h: 9, family: SERIF, spacing: 0 }), 2);
      const B = archMask(textMask("UNIVERSITY", { w: 46, h: 7, family: SERIF, spacing: 0 }), 1);
      stamp(A, 91, "#ffffff", "#141414", true);
      stamp(B, 91 + A.h + 4, "#ffffff", "#141414", true);
      // Champion patch on the sleeve cuff
      const px0 = 80, py0 = hemEnd - 12;
      for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) put(px0 + x, py0 + y, "#2d3f9c");
      put(px0 + 1, py0 + 1, "#e23c2e"); put(px0 + 2, py0 + 1, "#e23c2e");
    }

    if (p.kind === "rutgers") {
      // RUTGERS (scarlet, black outline) / NEW BRUNSWICK pill / EST 1766
      const R = textMask("RUTGERS", { w: 40, h: 8, family: SERIF, spacing: 0 });
      stamp(R, 90, "#cc0033", "#141414", false);
      pill(100, 46, 7, "#cc0033", null, { t: "NEW BRUNSWICK", c: "#ffffff" });
      const E = textMask("EST 1766", { w: 30, h: 4, family: SANS, thr: 0.3 });
      stamp(E, 109, "#cc0033", null, false);
    }

    if (p.kind === "cal") {
      // gold arched BERKELEY + the university seal
      const Bk = archMask(textMask("BERKELEY", { w: 46, h: 9, family: SERIF, spacing: 0 }), 2);
      stamp(Bk, 91, "#f2b630", null, false);
      const cx = 47.5, cy = 108, gold = "#f2b630", navy = "#1d2850";
      for (let y = Math.floor(cy - 8); y <= Math.ceil(cy + 8); y++)
        for (let x = 38; x <= 57; x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          if (d > 7) continue;
          let c = navy;
          if (d >= 5.8) c = gold;                                  // outer ring
          else if (d >= 3.8 && (x * 3 + y * 5) % 3 !== 0) c = gold; // ring of tiny text
          else if (d >= 3.8) c = navy;
          else if (d >= 3.0) c = gold;                              // inner ring
          put(x, y, c);
        }
      [[0, -2], [-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [0, 1], [-1, 1], [1, 1]].forEach(([dx, dy]) => put(48 + dx, 108 + dy, gold)); // shield
      put(47, 107, navy); put(48, 109, navy);
    }

    if (p.kind === "davis") {
      // navy arched "UC DAVIS" (light outline, a bit distressed) + AGGIES pill
      const D = archMask(textMask("UC DAVIS", { w: 50, h: 10, family: SERIF, spacing: 0 }), 3);
      stamp(D, 92, "#2b3b63", "#f4f1e6", false);
      const ox = cxOf(D.w);
      for (let y = 0; y < D.h; y++) for (let x = 0; x < D.w; x++)
        if (D.m[y * D.w + x] && ((x * 31 + y * 17) % 11 === 0)) put(ox + x, 92 + y, "#51618a");   // worn print
      pill(108, 28, 7, "#2b3b63", "#f4f1e6", { t: "AGGIES", c: "#ffffff" });
    }

    if (p.kind === "ucla") {
      // big gold script "Ucla" with a white outline
      const U = textMask("Ucla", { w: 48, h: 17, family: SCRIPT, style: "bold", cap: 0.62, thr: 0.4, weight: 0.015, forceH: false });
      stamp(U, 92, "#f6b81c", "#ffffff", false);
      // woven label on the hem
      const lx = 40, ly = hemEnd - 9;
      for (let y = 0; y < 6; y++) for (let x = 0; x < 10; x++)
        put(lx + x, ly + y, y === 0 || y === 5 || x === 0 || x === 9 ? "#bfb7a4" : "#f1ebdc");
      for (let x = 2; x < 8; x += 2) { put(lx + x, ly + 2, "#c8372d"); put(lx + x, ly + 3, "#2d4f9c"); }
    }
  }

  // base layer (legs/neck/back hair) -> hoodie (2x) -> chest design (4x) -> head/hair/glasses (4x)
  function composeSprite(p) {
    const { base, g, H } = buildSprite(p);
    const f = p.sex === "f";
    const o2 = Array.from({ length: H * 2 }, () => Array(SW * 2).fill(null));
    for (let y = 0; y < H; y++)
      for (let x = 0; x < SW; x++) {
        const c = base[y][x];
        if (!c) continue;
        o2[y * 2][x * 2] = c; o2[y * 2][x * 2 + 1] = c; o2[y * 2 + 1][x * 2] = c; o2[y * 2 + 1][x * 2 + 1] = c;
      }
    drawHoodie(o2, p, f);
    const o4 = Array.from({ length: H * 4 }, () => Array(SW * 4).fill(null));
    for (let y = 0; y < H * 2; y++)
      for (let x = 0; x < SW * 2; x++) {
        const c = o2[y][x];
        if (!c) continue;
        o4[y * 2][x * 2] = c; o4[y * 2][x * 2 + 1] = c; o4[y * 2 + 1][x * 2] = c; o4[y * 2 + 1][x * 2 + 1] = c;
      }
    drawLogo4(o4, p, f);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < SW; x++) {
        const c = g[y][x];
        if (!c || c === base[y][x]) continue;
        for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) o4[y * 4 + dy][x * 4 + dx] = c;
      }
    return o4;
  }

  // Warm sunset tint, rim light on top edges, tinted 2px outline; bottom-aligned so
  // different heights share one baseline.
  function spriteCanvas(p) {
    const g = composeSprite(p);
    const H = g.length, SW4 = SW * 4, SHM = SH_MAX * 4;
    const BW = SW4 + 4, BH = SHM + 4;
    const buf = Array.from({ length: BH }, () => Array(BW).fill(null));
    const top = SHM - H;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < SW4; x++)
        if (g[y][x]) buf[y + 2 + top][x + 2] = mix(g[y][x], "#ff9a6a", 0.07);

    const at = (x, y) => (x < 0 || y < 0 || x >= BW || y >= BH ? null : buf[y][x]);
    const lit = [];
    for (let y = 0; y < BH; y++)
      for (let x = 0; x < BW; x++)
        if (buf[y][x] && !at(x, y - 1)) lit.push([x, y]);
    lit.forEach(([x, y]) => (buf[y][x] = mix(buf[y][x], "#ffc98a", 0.3)));

    for (let pass = 0; pass < 2; pass++) {
      const add = [];
      for (let y = 0; y < BH; y++)
        for (let x = 0; x < BW; x++) {
          if (buf[y][x]) continue;
          const nb = at(x, y + 1) || at(x - 1, y) || at(x + 1, y) || at(x, y - 1);
          if (nb) add.push([x, y, mix(nb, "#150d24", 0.75)]);
        }
      add.forEach(([x, y, c]) => (buf[y][x] = c));
    }

    const c = document.createElement("canvas");
    c.width = BW; c.height = BH;
    const ctx = c.getContext("2d");
    for (let y = 0; y < BH; y++)
      for (let x = 0; x < BW; x++)
        if (buf[y][x]) { ctx.fillStyle = buf[y][x]; ctx.fillRect(x, y, 1, 1); }
    return c;
  }

  // ====================================================
  //  BACKGROUND
  // ====================================================
  function draw(canvas, opts) {
    canvas.width = W * BG; canvas.height = H * BG;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(BG, 0, 0, BG, 0, 0); // background drawn in 256x144 logical pixels
    const rand = rng(2026);
    const P = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
    const hline = (x0, x1, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x0), Math.round(y), Math.round(x1 - x0) + 1, 1); };
    const rectF = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

    // ---------- sky (stepped bands with dithered seams) ----------
    const BAND = 6;
    const skyStops = [[0, "#1b1340"], [24, "#43205f"], [42, "#7c2e7a"], [58, "#c4407f"],
      [72, "#ee6a5a"], [86, "#ff9a4a"], [96, "#ffc46a"], [104, "#ffe49a"]];
    const bandColor = (bi) => gradient(skyStops, Math.min(HORIZON, bi * BAND + BAND / 2));
    for (let y = 0; y < HORIZON; y++) {
      const bi = Math.floor(y / BAND), r = y % BAND, c = bandColor(bi);
      for (let x = 0; x < W; x++) {
        let col = c;
        if (r === BAND - 1 && (x + y) % 2 === 0) col = bandColor(bi + 1);
        else if (r === 0 && bi > 0 && (x + y) % 2 === 1) col = bandColor(bi - 1);
        P(x, y, col);
      }
    }
    for (let y = 0; y < 28; y++)
      for (let x = 0; x < W; x++) if (rand() < 0.008) P(x, y, "#efe4ff");

    // ---------- sun + glow ----------
    const SX = 128, SY = 98;
    for (let y = 56; y < HORIZON; y++) {
      for (let x = 70; x < 186; x++) {
        const d = Math.hypot(x - SX, y - SY);
        if (d < 14) P(x, y, "#fff4be");
        else if (d < 16) P(x, y, "#ffe08a");
        else if (d < 27 && (x + y) % 2 === 0) P(x, y, "#ffd27a");
        else if (d < 42 && x % 2 === 0 && y % 2 === 0) P(x, y, "#ffc07a");
      }
    }

    // ---------- clouds ----------
    const streak = (cx, cy, w, top, bot) => {
      hline(cx - w * 0.3, cx + w * 0.3, cy, top);
      hline(cx - w * 0.5, cx + w * 0.5, cy + 1, top);
      hline(cx - w * 0.4, cx + w * 0.45, cy + 2, bot);
      hline(cx - w * 0.2, cx + w * 0.25, cy + 3, bot);
    };
    streak(52, 34, 62, "#6a2a78", "#b0407f");
    streak(204, 28, 72, "#5a2570", "#a83a80");
    streak(112, 47, 84, "#9a3580", "#e85a70");
    streak(38, 63, 70, "#c24a80", "#ff8a60");
    streak(214, 58, 82, "#c8487e", "#ff8a5e");
    streak(168, 72, 56, "#e86a5a", "#ffb060");
    streak(78, 78, 48, "#f07a58", "#ffc070");

    // birds
    [[40, 52], [48, 48], [214, 44], [222, 41]].forEach(([x, y]) => {
      P(x, y, "#2a1840"); P(x + 1, y + 1, "#2a1840"); P(x + 2, y, "#2a1840");
      P(x + 3, y + 1, "#2a1840"); P(x + 4, y, "#2a1840");
    });

    // ---------- distant hills + city ----------
    const hills = (color, f) => {
      for (let x = 0; x < W; x++) {
        const top = Math.round(f(x));
        for (let y = top; y < HORIZON; y++) P(x, y, color);
      }
    };
    hills("#8a3a78", (x) => 104 - 16 * gauss((x - 40) / 50) - 10 * gauss((x - 100) / 25) - 12 * gauss((x - 235) / 40));
    hills("#4a2459", (x) => 104 - 25 * gauss((x - 5) / 38) - 5 * gauss((x - 50) / 12));
    for (let bx = 206; bx < 254; bx += 4) {
      const h = 4 + Math.floor(rand() * 11);
      rectF(bx, HORIZON - h, 3, h, "#5a2a68");
      for (let k = 0; k < h / 3; k++) if (rand() < 0.5) P(bx + (rand() < 0.5 ? 0 : 1), HORIZON - 2 - k * 3, "#ffd27a");
    }

    // ---------- water ----------
    const waterStops = [[0, "#ffa86a"], [0.12, "#e0607a"], [0.35, "#7a3a8a"], [1, "#241c50"]];
    for (let y = HORIZON; y < H; y++) {
      const bi = Math.floor((y - HORIZON) / 3);
      const t = Math.min(1, (bi * 3 + 1.5) / (H - HORIZON));
      rectF(0, y, W, 1, gradient(waterStops, t));
    }
    for (let y = HORIZON; y < H; y++) {
      const t = (y - HORIZON) / (H - HORIZON);
      const base = gradient(waterStops, t);
      const n = 6 + Math.floor((y - HORIZON) / 3);
      for (let i = 0; i < n; i++) {
        const x = Math.floor(rand() * W), len = 2 + Math.floor(rand() * 7);
        hline(x, x + len, y, rand() < 0.5 ? mix(base, "#ffffff", 0.14) : shade(base, -0.22));
      }
      // sun reflection
      const hw = 6 + (y - HORIZON) * 0.35;
      for (let x = Math.floor(SX - hw); x <= SX + hw; x++) {
        if ((x * 7 + y * 13) % 5 < 2 && !(y % 2 === 0 && x % 3 === 0))
          P(x, y, mix("#ffe49a", "#ff9a5a", Math.min(1, t * 1.6)));
      }
    }

    // ---------- Golden Gate Bridge ----------
    const DECK = 84, T1 = 70, T2 = 186, TOP = 34, CEN = 128;
    const ORANGE = "#d8482e", LIT = "#ff7a46", DARK = "#8f2a24";
    const cableY = (x) => {
      if (x >= T1 && x <= T2) {
        const u = (x - CEN) / (T2 - CEN);
        return 83 - (83 - (TOP + 1)) * u * u;
      }
      if (x < T1) { const v = (T1 - x) / (T1 - 8); return TOP + 1 + (80 - (TOP + 1)) * Math.pow(Math.min(1, v), 1.6); }
      const v = (x - T2) / (248 - T2);
      return TOP + 1 + (80 - (TOP + 1)) * Math.pow(Math.min(1, v), 1.6);
    };
    for (let x = 0; x < W; x++) {
      const y = Math.round(cableY(x));
      if (x < 8 || x > 248) continue;
      if (x % 4 === 2) for (let yy = y + 2; yy < DECK; yy++) P(x, yy, x % 8 === 2 ? "#e0603a" : "#b43a28");
      P(x, y, LIT); P(x, y + 1, ORANGE);
    }
    // deck + truss
    hline(0, W - 1, DECK, "#f06a40");
    hline(0, W - 1, DECK + 1, ORANGE);
    hline(0, W - 1, DECK + 2, "#9a2c26");
    for (let x = 0; x < W; x++) {
      if (x % 4 < 2) P(x, DECK + 3, "#7d2622"); else P(x, DECK + 4, "#7d2622");
    }
    hline(0, W - 1, DECK + 5, "#5a1c1c");
    // towers
    const tower = (T, litRight) => {
      const leftC = litRight ? DARK : LIT, rightC = litRight ? LIT : DARK;
      for (let y = TOP; y < HORIZON; y++) {
        rectF(T - 4, y, 2, 1, leftC);
        rectF(T + 2, y, 2, 1, rightC);
      }
      [40, 50, 60, 70, 79].forEach((cy) => {
        hline(T - 4, T + 3, cy, "#ff8a56");
        hline(T - 4, T + 3, cy + 1, ORANGE);
      });
      hline(T - 5, T + 4, TOP - 1, LIT);
      hline(T - 5, T + 4, TOP, ORANGE);
      hline(T - 4, T + 3, TOP + 1, DARK);
      rectF(T - 1, TOP - 3, 2, 2, "#ffa060");
      rectF(T - 6, 101, 12, 3, "#6a1f22"); // pier base
    };
    tower(T1, true);
    tower(T2, false);

    // fog drifting around the bridge base
    for (let y = 91; y < HORIZON; y++) {
      for (let x = 0; x < W; x++) {
        const n = Math.sin(x * 0.09 + y * 0.5) + Math.sin(x * 0.031 + 1.3);
        if (y < 98) { if (n > 0.7 && (x + y) % 2 === 0) P(x, y, "#f6b8a8"); }
        else if (n > 0.9) P(x, y, "#e89a9e");
        else if (n > 0.0 && (x + y) % 2 === 0) P(x, y, "#e89a9e");
      }
    }

    // ---------- foreground hill ----------
    const groundTop = (x) =>
      Math.round(126 + 3 * Math.sin(x / 23) + 2 * Math.sin(x / 9 + 1) + (x < 40 ? (40 - x) * 0.12 : 0));
    for (let x = 0; x < W; x++) {
      const gt = groundTop(x);
      for (let y = gt; y < H; y++) {
        const d = y - gt;
        let c = d === 0 ? "#e08a50" : d < 3 ? "#7a8a44" : d < 8 ? "#3f5238" : d < 12 ? "#2c3d3a" : "#1c2634";
        if ((d === 3 || d === 8) && (x + y) % 2 === 0) c = d === 3 ? "#3f5238" : "#2c3d3a";
        P(x, y, c);
      }
      if (rand() < 0.14) P(x, gt - 1, "#7a8a44");
      if (rand() < 0.04) { P(x, gt - 1, "#7a8a44"); P(x, gt - 2, "#a6b858"); }
    }
    for (let i = 0; i < 16; i++) {
      const x = Math.floor(rand() * W), y = groundTop(x) + 4 + Math.floor(rand() * 10);
      P(x, y, rand() < 0.5 ? "#ffd36a" : "#ff8fb0");
    }

    // ---------- the five of us (drawn in device pixels, CH per sprite pixel) ----------
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const footY = 138 * BG;               // bottom of the shoes
    const BWc = SW * 4 + 4;               // sprite width incl. outline (fine pixels)
    const GAPc = 96;                      // spacing between characters (fine pixels)
    const x0 = Math.round((W * BG - (GAPc * 4 + BWc) * CH) / 2);
    if (!(opts && opts.people === false)) PEOPLE.forEach((p, i) => {
      const ox = x0 + i * GAPc * CH, oy = footY - (SH_MAX * 4 + 2) * CH;
      ctx.fillStyle = "rgba(10,8,30,0.4)";  // ground shadow
      ctx.fillRect(ox + 16 * CH, footY + 3, (BWc - 32) * CH, 8);
      ctx.fillRect(ox + 24 * CH, footY + 11, (BWc - 48) * CH, 5);
      ctx.drawImage(spriteCanvas(p), ox, oy, BWc * CH, (SH_MAX * 4 + 4) * CH);
    });
  }

  // Where each character stands, in the scene's native pixels (used by stage.js)
  function layout() {
    const footY = 138 * BG, BWc = SW * 4 + 4, GAPc = 96;
    const x0 = Math.round((W * BG - (GAPc * 4 + BWc) * CH) / 2);
    return {
      W: W * BG, H: H * BG, CH, BWc, footY,
      items: PEOPLE.map((p, i) => ({
        kind: p.kind, x: x0 + i * GAPc * CH, y: footY - (SH_MAX * 4 + 2) * CH,
        w: BWc * CH, h: (SH_MAX * 4 + 4) * CH, footY,
      })),
    };
  }
  const spriteCache = {};
  // a fresh canvas of one character, in an optional pose ("raise" = right hand up)
  function sprite(kind, pose) {
    const key = kind + "|" + (pose || "");
    if (!spriteCache[key]) {
      const base = PEOPLE.find((p) => p.kind === kind);
      spriteCache[key] = spriteCanvas(pose ? Object.assign({}, base, { pose }) : base);
    }
    const src = spriteCache[key], c = document.createElement("canvas");
    c.width = src.width; c.height = src.height;
    c.getContext("2d").drawImage(src, 0, 0);
    return c;
  }

  window.Scene = { draw, PEOPLE, textMask, spriteCanvas, layout, sprite };
})();
