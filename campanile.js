// ====================================================
//  Pixel-art Campanile (Sather Tower, UC Berkeley) at sunset.
//  Portrait backdrop for the phone page. The scene is always 256 rows tall;
//  its width follows the screen's aspect ratio so it fits any phone.
//  Usage: Campanile.draw(canvasElement)
// ====================================================
(function () {
  const H = 256, HOR = 178;           // scene height, horizon row

  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  const toRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { const A = toRGB(a), B = toRGB(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const shade = (h, t) => (t < 0 ? mix(h, "#000000", -t) : mix(h, "#ffffff", t));
  const gauss = (u) => Math.exp(-u * u);
  function gradient(stops, v) {
    for (let i = 0; i < stops.length - 1; i++) {
      const [a, ca] = stops[i], [b, cb] = stops[i + 1];
      if (v <= b) return mix(ca, cb, Math.max(0, (v - a) / (b - a)));
    }
    return stops[stops.length - 1][1];
  }

  const SKY = [[0, "#1b1340"], [40, "#43205f"], [80, "#7c2e7a"], [110, "#c4407f"],
    [135, "#ee6a5a"], [155, "#ff9a4a"], [170, "#ffc46a"], [178, "#ffe49a"]];

  function draw(canvas) {
    const vw = window.innerWidth || 390, vh = window.innerHeight || 844;
    const W = Math.max(112, Math.min(480, Math.round((H * vw) / vh)));
    const S = Math.max(2, Math.ceil(vh / H));
    canvas.width = W * S; canvas.height = H * S;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(S, 0, 0, S, 0, 0);
    const rand = rng(1868);                       // Berkeley was chartered in 1868

    const P = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const hl = (x0, x1, y, c) => R(x0, y, x1 - x0 + 1, 1, c);
    const CX = Math.floor(W / 2);                 // tower axis (tower spans CX-hw .. CX+hw-1)

    // ---------- sky (stepped bands with dithered seams) ----------
    const BAND = 7, bandColor = (bi) => gradient(SKY, Math.min(HOR, bi * BAND + BAND / 2));
    for (let y = 0; y < HOR; y++) {
      const bi = Math.floor(y / BAND), r = y % BAND, c = bandColor(bi);
      for (let x = 0; x < W; x++) {
        let col = c;
        if (r === BAND - 1 && (x + y) % 2 === 0) col = bandColor(bi + 1);
        else if (r === 0 && bi > 0 && (x + y) % 2 === 1) col = bandColor(bi - 1);
        P(x, y, col);
      }
    }
    for (let y = 0; y < 70; y++) for (let x = 0; x < W; x++) if (rand() < 0.012) P(x, y, "#efe4ff");

    // ---------- sun + glow, low behind the tower ----------
    const SY = 170;
    for (let y = 90; y < HOR; y++)
      for (let x = 0; x < W; x++) {
        const d = Math.hypot(x - CX, y - SY);
        if (d < 15) P(x, y, "#fff4be");
        else if (d < 17) P(x, y, "#ffe08a");
        else if (d < 30 && (x + y) % 2 === 0) P(x, y, "#ffd27a");
        else if (d < 50 && x % 2 === 0 && y % 2 === 0) P(x, y, "#ffc07a");
      }

    // ---------- clouds + birds ----------
    const streak = (cx, cy, w, top, bot) => {
      hl(cx - w * 0.3, cx + w * 0.3, cy, top); hl(cx - w * 0.5, cx + w * 0.5, cy + 1, top);
      hl(cx - w * 0.4, cx + w * 0.45, cy + 2, bot); hl(cx - w * 0.2, cx + w * 0.25, cy + 3, bot);
    };
    streak(W * 0.22, 52, 54, "#6a2a78", "#b0407f");
    streak(W * 0.8, 40, 58, "#5a2570", "#a83a80");
    streak(W * 0.3, 98, 66, "#9a3580", "#e85a70");
    streak(W * 0.78, 118, 62, "#c8487e", "#ff8a5e");
    streak(W * 0.2, 142, 52, "#e86a5a", "#ffb060");
    [[0.18, 70], [0.24, 66], [0.82, 84]].forEach(([fx, y]) => {
      const x = W * fx;
      P(x, y, "#2a1840"); P(x + 1, y + 1, "#2a1840"); P(x + 2, y, "#2a1840"); P(x + 3, y + 1, "#2a1840"); P(x + 4, y, "#2a1840");
    });

    // ---------- far hills (the Bay / Marin beyond), water ----------
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const far = Math.round(HOR - 9 * gauss((u - 0.12) / 0.16) - 6 * gauss((u - 0.9) / 0.14) - 3 * gauss((u - 0.55) / 0.2));
      for (let y = far; y < HOR; y++) P(x, y, "#8a3a78");
    }
    const WATER = [[0, "#ffa86a"], [0.4, "#e0607a"], [1, "#8a3a8a"]];
    for (let y = HOR; y < 190; y++) {
      const t = (y - HOR) / 12, base = gradient(WATER, t);
      R(0, y, W, 1, base);
      for (let i = 0; i < 4; i++) { const x = Math.floor(rand() * W), l = 2 + Math.floor(rand() * 6); hl(x, x + l, y, rand() < 0.5 ? mix(base, "#ffffff", 0.16) : shade(base, -0.2)); }
      const hw = 5 + (y - HOR) * 0.7;
      for (let x = Math.floor(CX - hw); x <= CX + hw; x++) if ((x * 7 + y * 13) % 5 < 2) P(x, y, mix("#ffe49a", "#ff9a5a", t));
    }

    // ---------- THE CAMPANILE ----------
    const STONE = "#dccab0", STONE_L = "#ffc890", STONE_D = "#9c8090", STONE_DD = "#6f5a72", GOLD = "#f6c445";
    // a stone block with lit left edge / shaded right edge
    const block = (hw, y0, y1, base) => {
      for (let y = y0; y <= y1; y++)
        for (let x = CX - hw; x < CX + hw; x++) {
          const e = x - (CX - hw), e2 = CX + hw - 1 - x;
          P(x, y, e2 <= 1 ? STONE_DD : e2 <= 3 ? STONE_D : e <= 1 ? STONE_L : base);
        }
    };
    const skyAt = (y) => bandColor(Math.floor(Math.min(HOR - 1, y) / BAND));

    // base + steps
    for (let i = 0; i < 4; i++) block(15 - i, 200 + i, 200 + i, mix(STONE, "#ffffff", 0.05));   // steps (wider at the bottom)
    hl(CX - 15, CX + 14, 204, STONE_DD);
    block(11, 190, 199, STONE);
    for (let y = 192; y < 200; y++) { const w = y < 194 ? 2 : 3; R(CX - w, y, w * 2, 1, "#2f2038"); }   // doorway
    hl(CX - 11, CX + 10, 190, STONE_L); hl(CX - 11, CX + 10, 189, STONE_DD);
    // shaft
    block(8, 142, 189, STONE);
    [150, 163, 176].forEach((wy) => { R(CX - 1, wy, 2, 7, "#352640"); P(CX - 1, wy + 6, "#ffae6a"); P(CX, wy + 6, "#ffae6a"); });
    [146, 159, 172, 185].forEach((by) => hl(CX - 8, CX + 7, by, STONE_D));      // horizontal bands
    vlineShade();
    function vlineShade() { for (let y = 142; y < 190; y += 2) { P(CX - 5, y, mix(STONE, "#ffffff", 0.1)); P(CX + 3, y, STONE_D); } }
    // clock section
    block(9, 120, 141, STONE);
    hl(CX - 9, CX + 8, 120, STONE_L); hl(CX - 9, CX + 8, 141, STONE_DD);
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
      const d = Math.hypot(x + 0.5, y + 0.5);
      if (d <= 6.2) P(CX + x, 131 + y, d >= 5.2 ? "#5a4a3a" : "#fff3d4");
    }
    hl(CX - 0, CX + 0, 126, "#3a2a2a"); R(CX, 127, 1, 5, "#3a2a2a"); R(CX, 131, 3, 1, "#3a2a2a");       // clock hands
    for (const [dx, dy] of [[0, -4], [0, 4], [-4, 0], [4, 0]]) P(CX + dx, 131 + dy, "#5a4a3a");
    // belfry: open arches showing the sunset through them
    block(10, 101, 119, STONE);
    hl(CX - 11, CX + 10, 100, STONE_L); hl(CX - 11, CX + 10, 101, STONE_D);
    hl(CX - 11, CX + 10, 118, STONE_L); hl(CX - 11, CX + 10, 119, STONE_D);
    for (let y = 103; y <= 116; y++) for (const ax of [-7, -2, 3]) {
      const arch = y < 106 ? 1 : 0;
      for (let x = CX + ax + arch; x < CX + ax + 4 - arch; x++) P(x, y, y > 113 ? "#4a2f4a" : skyAt(y + 40));
    }
    for (let x = CX - 11; x < CX + 11; x += 2) P(x, 119, STONE_DD);                                // balustrade dots
    // pyramid cap + spire
    for (let r = 0; r < 20; r++) {
      const hw = Math.max(1, Math.round(1 + r * 0.45)), y = 82 + r;
      for (let x = CX - hw; x < CX + hw; x++) {
        const e2 = CX + hw - 1 - x;
        P(x, y, e2 <= 2 ? "#7d6a86" : x <= CX - hw + 1 ? "#ffc890" : "#cfd8c8");
      }
    }
    hl(CX - 10, CX + 9, 101, "#7d6a86");
    R(CX - 1, 74, 2, 8, GOLD); R(CX - 1, 71, 2, 3, "#ffe08a");                                    // finial
    P(CX - 1, 72, "#fff6c0");

    // rim light: sun is right behind the tower
    for (let y = 72; y < 204; y++) {
      let hw = y < 82 ? 1 : y < 101 ? Math.round(1 + (y - 82) * 0.45) : y < 120 ? 10 : y < 142 ? 9 : y < 190 ? 8 : y < 200 ? 11 : 15;
      if (y < 82) hw = 1;
      P(CX - hw - 1, y, "#ffb26a"); P(CX + hw, y, "#e0607a");
    }

    // ---------- Memorial Glade lawn + path ----------
    const groundTop = (x) => Math.round(190 + 3 * Math.sin(x / 17) + 2 * Math.sin(x / 7 + 1) + Math.abs(x - CX) * 0.07);
    for (let x = 0; x < W; x++) {
      const gt = groundTop(x);
      for (let y = gt; y < H; y++) {
        const d = y - gt;
        let c = d === 0 ? "#e08a50" : d < 3 ? "#9aa14a" : d < 12 ? "#5c7a40" : d < 40 ? "#3a5a3c" : "#243a38";
        if ((d === 3 || d === 12 || d === 40) && (x + y) % 2 === 0) c = d === 3 ? "#5c7a40" : d === 12 ? "#3a5a3c" : "#243a38";
        P(x, y, c);
      }
      if (rand() < 0.15) P(x, gt - 1, "#9aa14a");
    }
    for (let y = 205; y < H; y++) {                                           // path leading to the tower
      const hw = 5 + (y - 205) * 0.5, t = (y - 205) / (H - 205);
      for (let x = Math.floor(CX - hw); x <= CX + hw; x++) {
        const edge = x <= CX - hw + 1 || x >= CX + hw - 1;
        P(x, y, edge ? "#b08a66" : (x + y) % 4 === 0 ? "#c9a97e" : mix("#d8b98a", "#7a5a50", t * 0.6));
      }
    }

    // ---------- eucalyptus groves on both sides ----------
    const tree = (x, baseY, h, lean) => {
      const th = Math.round(h * 0.6);                               // bare trunk, then a full canopy
      for (let i = 0; i < th; i++) {
        const tx = x + Math.round(lean * (i / th) * 4);
        R(tx, baseY - i, 3, 1, i % 6 === 0 ? "#7a6a66" : "#4a3a40");
        P(tx, baseY - i, "#8a7a74");                                // sunlit bark edge
      }
      const topX = x + Math.round(lean * 4) + 1, topY = baseY - th;
      const clumps = [[0, 0, 11, 8], [-9, 7, 10, 6], [9, 6, 10, 6], [-4, 15, 11, 6], [5, 17, 10, 5], [0, -7, 8, 5]];
      clumps.forEach(([dx, dy, rx, ry]) => {
        for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) {
          if ((xx / rx) ** 2 + (yy / ry) ** 2 > 1) continue;
          let c = "#16302e";
          if (xx + yy < -rx * 0.5 && (xx + yy) % 2 === 0) c = "#2c5a48";      // sunlit upper-left
          else if (rand() < 0.1) c = "#0f2224";
          P(topX + dx + xx, topY + dy + yy, c);
        }
      });
    };
    const spots = [];
    for (let k = 0; ; k++) {                                        // groves on both sides, clear of the tower
      const off = 7 + k * 17;
      if (off > CX - 26) break;
      spots.push([off, 216 - (k % 2) * 6, 104 + (k % 3) * 14, 0.3 - (k % 2) * 0.6]);
      spots.push([W - 1 - off, 216 - ((k + 1) % 2) * 6, 108 + ((k + 1) % 3) * 14, -0.3 + (k % 2) * 0.6]);
    }
    spots.sort((p, q) => p[1] - q[1]).forEach(([x, by, h, lean]) => tree(x, by, h, lean));

    // foreground shrubs
    for (let x = 0; x < W; x++) {
      const bt = Math.round(H - 8 - 5 * gauss((x - W * 0.08) / 10) - 6 * gauss((x - W * 0.94) / 12));
      for (let y = bt; y < H; y++) P(x, y, (x + y) % 3 === 0 ? "#2c5a48" : "#16302e");
    }
  }

  window.Campanile = { draw };
})();
