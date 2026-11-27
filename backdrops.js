// ====================================================
//  Pixel-art sunset backdrops for each player's phone screen.
//    Backdrops.draw(canvas, kind [, viewW, viewH])
//    kind: "campanile" (UC Berkeley)  "palace" (Palace of Fine Arts)
//          "coit" (Coit Tower)        "union" (Union Square)
//  Every scene is 256 rows tall; its width follows the screen's aspect ratio.
// ====================================================
(function () {
  const H = 256;

  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const toRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { const A = toRGB(a), B = toRGB(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const gauss = (u) => Math.exp(-u * u);
  function gradient(stops, v) {
    for (let i = 0; i < stops.length - 1; i++) {
      const [a, ca] = stops[i], [b, cb] = stops[i + 1];
      if (v <= b) return mix(ca, cb, Math.max(0, (v - a) / (b - a)));
    }
    return stops[stops.length - 1][1];
  }

  function setup(canvas, seed, vw, vh) {
    vw = vw || window.innerWidth || 390; vh = vh || window.innerHeight || 844;
    const W = Math.max(112, Math.min(480, Math.round((H * vw) / vh)));
    const S = Math.max(2, Math.ceil(vh / H));
    canvas.width = W * S; canvas.height = H * S;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(S, 0, 0, S, 0, 0);
    const P = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const hl = (x0, x1, y, c) => R(x0, y, x1 - x0 + 1, 1, c);
    return { W, S, ctx, P, R, hl, rand: rng(seed), CX: Math.floor(W / 2) };
  }

  const SKY = [[0, "#1b1340"], [40, "#43205f"], [80, "#7c2e7a"], [110, "#c4407f"],
    [135, "#ee6a5a"], [155, "#ff9a4a"], [170, "#ffc46a"], [182, "#ffe49a"]];

  // stepped sky bands with dithered seams (+ stars); returns the band colour function
  function sky(e, HOR) {
    const { W, P, rand } = e, BAND = 7;
    const bc = (bi) => gradient(SKY, Math.min(HOR, bi * BAND + BAND / 2));
    for (let y = 0; y < HOR; y++) {
      const bi = Math.floor(y / BAND), r = y % BAND, c = bc(bi);
      for (let x = 0; x < W; x++) {
        let col = c;
        if (r === BAND - 1 && (x + y) % 2 === 0) col = bc(bi + 1);
        else if (r === 0 && bi > 0 && (x + y) % 2 === 1) col = bc(bi - 1);
        P(x, y, col);
      }
    }
    for (let y = 0; y < 70; y++) for (let x = 0; x < W; x++) if (rand() < 0.012) P(x, y, "#efe4ff");
    return (y) => bc(Math.floor(Math.min(HOR - 1, y) / BAND));
  }
  function sun(e, sx, sy, HOR) {
    const { W, P } = e;
    for (let y = 90; y < HOR; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - sx, y - sy);
      if (d < 15) P(x, y, "#fff4be");
      else if (d < 17) P(x, y, "#ffe08a");
      else if (d < 30 && (x + y) % 2 === 0) P(x, y, "#ffd27a");
      else if (d < 50 && x % 2 === 0 && y % 2 === 0) P(x, y, "#ffc07a");
    }
  }
  function clouds(e) {
    const { W, P, hl } = e;
    const streak = (cx, cy, w, top, bot) => {
      hl(cx - w * 0.3, cx + w * 0.3, cy, top); hl(cx - w * 0.5, cx + w * 0.5, cy + 1, top);
      hl(cx - w * 0.4, cx + w * 0.45, cy + 2, bot); hl(cx - w * 0.2, cx + w * 0.25, cy + 3, bot);
    };
    streak(W * 0.22, 52, 54, "#6a2a78", "#b0407f");
    streak(W * 0.8, 40, 58, "#5a2570", "#a83a80");
    streak(W * 0.3, 98, 66, "#9a3580", "#e85a70");
    streak(W * 0.78, 118, 62, "#c8487e", "#ff8a5e");
    [[0.18, 70], [0.24, 66], [0.82, 84]].forEach(([fx, y]) => {
      const x = W * fx; [[0, 0], [1, 1], [2, 0], [3, 1], [4, 0]].forEach(([a, b]) => P(x + a, y + b, "#2a1840"));
    });
  }

  // blobby evergreen / eucalyptus tree
  function tree(e, x, baseY, h, w, dark, lit) {
    const { P, R, rand } = e;
    const th = Math.round(h * 0.25);
    R(x - 1, baseY - th, 3, th, "#4a3a40");
    const cy = baseY - th - (h - th) / 2, ry = (h - th) / 2;
    for (let yy = -ry; yy <= ry; yy++) {
      const hw = Math.round(w * Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2)) * (0.75 + 0.25 * (yy / ry + 1) / 2));
      for (let xx = -hw; xx <= hw; xx++) {
        let c = dark;
        if (xx + yy < -hw * 0.4 && (xx + yy) % 2 === 0) c = lit;
        else if (rand() < 0.1) c = mix(dark, "#000000", 0.35);
        P(x + xx, cy + yy, c);
      }
    }
  }

  // mirror the strip above the waterline into the water, fading with depth
  function reflect(e, WY, N, alpha) {
    const { ctx, W, S } = e;
    for (let i = 0; i < N; i += 3) {
      ctx.save();
      ctx.setTransform(1, 0, 0, -1, 0, 2 * WY * S);
      ctx.globalAlpha = alpha * (1 - i / N);
      ctx.imageSmoothingEnabled = false;
      const sy = (WY - i - 3) * S;
      ctx.drawImage(ctx.canvas, 0, sy, W * S, 3 * S, 0, sy, W * S, 3 * S);
      ctx.restore();
    }
  }
  function ripples(e, y0, y1, light, dark) {
    const { W, hl, rand } = e;
    for (let y = y0; y < y1; y++) for (let i = 0; i < 5; i++) {
      const x = Math.floor(rand() * W), l = 2 + Math.floor(rand() * 7);
      hl(x, x + l, y, rand() < 0.5 ? light : dark);
    }
  }

  // ===================================================== PALACE OF FINE ARTS
  function palace(e) {
    const { W, CX, P, R, hl, rand } = e, WY = 170;
    sky(e, WY); sun(e, CX + 20, 158, WY); clouds(e);
    // far Presidio tree line
    for (let x = 0; x < W; x++) {
      const top = Math.round(WY - 7 - 3 * Math.sin(x / 9) - 2 * Math.sin(x / 3.7));
      for (let y = top; y < WY; y++) P(x, y, "#6a3578");
    }
    const PINK = "#e8a285", PL = "#ffc9a0", PD = "#b8707a", PDD = "#8a5068", IN = "#4a2848";
    // a row of columns under an entablature
    const colonnade = (x0, x1, yTop, yBot, sp) => {
      R(x0, yTop + 5, x1 - x0 + 1, yBot - yTop - 5, IN);
      for (let x = x0 + 1; x + 1 <= x1; x += sp) {
        R(x, yTop + 5, 2, yBot - yTop - 5, PINK); P(x, yTop + 5, PL);
        for (let y = yTop + 6; y < yBot; y++) { P(x, y, PL); P(x + 1, y, PD); }
      }
      hl(x0, x1, yTop, PL); R(x0, yTop + 1, x1 - x0 + 1, 3, PINK); hl(x0, x1, yTop + 4, PDD);
      for (let x = x0 + 2; x < x1; x += 4) P(x, yTop + 2, PD);                    // frieze detail
      R(x0, yBot, x1 - x0 + 1, 3, PD); hl(x0, x1, yBot, PL);
    };
    // side trees behind the wings
    const tcol = ["#27304a", "#3c5a52"];
    tree(e, 3, 150, 70, 11, tcol[0], tcol[1]); tree(e, W - 5, 152, 66, 11, tcol[0], tcol[1]);
    // wings
    colonnade(0, CX - 31, 142, 164, 6);
    colonnade(CX + 30, W - 1, 142, 164, 6);
    for (let x = 4; x < CX - 33; x += 12) { P(x, 140, PD); P(x, 139, PL); }
    for (let x = CX + 34; x < W - 2; x += 12) { P(x, 140, PD); P(x, 139, PL); }
    // rotunda: base steps, colonnade, drum, dome
    for (let i = 0; i < 3; i++) hl(CX - 35 + i, CX + 34 - i, 165 + i, i === 0 ? PL : PD);
    colonnade(CX - 31, CX + 30, 126, 165, 6);
    for (let x = CX - 30; x < CX + 30; x += 6) { P(x, 124, PD); P(x, 123, PL); P(x + 1, 123, PD); }       // urns
    for (let y = 106; y < 126; y++) {                                                                      // drum
      for (let x = CX - 18; x < CX + 18; x++) {
        const rel = x - CX;
        P(x, y, rel < -12 ? PL : rel > 11 ? PD : (rel % 6 === 0 && y > 109 && y < 123) ? "#5a3058" : PINK);
      }
    }
    hl(CX - 19, CX + 18, 106, PL); hl(CX - 19, CX + 18, 107, PD);
    // dome
    for (let y = 80; y < 106; y++) {
      const t = (106 - y) / 26, hw = Math.round(19 * Math.sqrt(Math.max(0, 1 - t * t)));
      for (let x = CX - hw; x < CX + hw; x++) {
        const rel = (x - CX) / 19;
        let c = rel < -0.45 ? PL : rel < 0.2 ? PINK : rel < 0.58 ? "#c9807a" : PD;
        if (Math.abs((x - CX) % 5) === 0 && y > 86) c = mix(c, "#6a3060", 0.3);
        if ((106 - y) % 7 === 0 && (x + y) % 2 === 0) c = mix(c, "#6a3060", 0.25);
        P(x, y, c);
      }
    }
    R(CX - 2, 76, 4, 5, "#e8b86a"); P(CX - 1, 74, "#ffe08a"); R(CX - 1, 75, 2, 1, "#f6c445");              // lantern
    for (let y = 80; y < 126; y++) {                                                                       // rim light
      const hw = y < 106 ? Math.round(19 * Math.sqrt(Math.max(0, 1 - ((106 - y) / 26) ** 2))) : y < 126 ? 18 : 0;
      if (hw) P(CX + hw, y, "#ffb26a");
    }
    // lagoon
    const WATER = [[0, "#ff9a7a"], [0.5, "#c0507e"], [1, "#4a2a62"]];
    const N = 50;
    for (let y = WY; y < WY + N + 4; y++) R(0, y, W, 1, gradient(WATER, (y - WY) / N));
    reflect(e, WY, N, 0.65);
    ripples(e, WY, WY + N, "#ffb08a", "#5a2a62");
    [[CX - 24, 196], [CX + 14, 205]].forEach(([sx, sy]) => {                                                // swans
      hl(sx, sx + 5, sy, "#fff3e4"); hl(sx + 1, sx + 6, sy + 1, "#e8d8d0"); R(sx + 5, sy - 3, 1, 3, "#fff3e4"); P(sx + 6, sy - 3, "#ff8a4a");
    });
    // shore + reeds
    for (let x = 0; x < W; x++) {
      const gt = Math.round(WY + N - 2 + 3 * Math.sin(x / 11) + 2 * Math.sin(x / 4));
      for (let y = gt; y < H; y++) P(x, y, y - gt < 3 ? "#5a6a40" : y - gt < 14 ? "#2a4a3c" : "#14282c");
      if (rand() < 0.35) { const hgt = 5 + Math.floor(rand() * 9); R(x, gt - hgt, 1, hgt, "#2a4a3c"); if (rand() < 0.4) R(x, gt - hgt - 2, 1, 3, "#7a4a3a"); }
    }
    tree(e, 8, 236, 74, 15, "#13262c", "#27503f"); tree(e, W - 9, 238, 70, 15, "#13262c", "#27503f");
    for (let x = 0; x < W; x++) { const bt = Math.round(H - 7 - 5 * gauss((x - W * 0.5) / 22)); for (let y = bt; y < H; y++) P(x, y, (x + y) % 3 === 0 ? "#27503f" : "#13262c"); }
  }

  // ===================================================== COIT TOWER
  function coit(e) {
    const { W, CX, P, R, hl, rand } = e, HOR = 182;
    sky(e, HOR); sun(e, Math.round(W * 0.78), 172, HOR); clouds(e);
    // East Bay hills + the Bay
    for (let x = 0; x < W; x++) {
      const top = Math.round(HOR - 8 - 5 * gauss((x - W * 0.7) / (W * 0.3)) - 2 * Math.sin(x / 6));
      for (let y = top; y < HOR; y++) P(x, y, "#7a3a80");
    }
    const WATER = [[0, "#ffa06a"], [0.5, "#d85a7e"], [1, "#6a3480"]];
    for (let y = HOR; y < 206; y++) {
      const base = gradient(WATER, (y - HOR) / 24); R(0, y, W, 1, base);
      for (let i = 0; i < 4; i++) { const x = Math.floor(rand() * W), l = 2 + Math.floor(rand() * 6); hl(x, x + l, y, rand() < 0.5 ? mix(base, "#ffffff", 0.2) : mix(base, "#000000", 0.25)); }
    }
    // Bay Bridge (right side)
    const bx0 = Math.round(W * 0.42), deck = 191;
    hl(bx0, W - 1, deck, "#3a2448"); hl(bx0, W - 1, deck + 1, "#241838");
    for (let x = bx0; x < W; x += 5) P(x, deck - 1, "#ffd27a");
    [Math.round(W * 0.6), Math.round(W * 0.86)].forEach((tx) => {
      R(tx, deck - 26, 2, 27, "#3a2448"); R(tx + 4, deck - 26, 2, 27, "#3a2448"); hl(tx, tx + 5, deck - 26, "#3a2448"); hl(tx, tx + 5, deck - 14, "#3a2448");
    });
    // downtown skyline with the Transamerica Pyramid
    const lit = (x0, y0, x1, y1, base) => {
      R(x0, y0, x1 - x0, y1 - y0, base);
      for (let y = y0 + 3; y < y1 - 2; y += 3) for (let x = x0 + 2; x < x1 - 1; x += 3) if (rand() < 0.45) P(x, y, "#ffcf7a");
      hl(x0, x1 - 1, y0, mix(base, "#ffb080", 0.5));
    };
    const bl = [[0.02, 0.1, 96], [0.1, 0.17, 78], [0.3, 0.37, 88], [0.36, 0.43, 108], [0.25, 0.3, 112]];
    bl.forEach(([a, b, top]) => lit(Math.round(W * a), top, Math.round(W * b), 196, "#4a2a5e"));
    const px = Math.round(W * 0.21);                                           // pyramid
    for (let y = 98; y < 196; y++) {
      const hw = Math.round(1 + (y - 98) * 0.055);
      for (let x = px - hw; x <= px + hw; x++) P(x, y, x > px + hw - 2 ? "#ff9a7a" : x < px - hw + 2 ? "#5a3a70" : "#7a5a88");
      if (y > 104 && y % 4 === 0) P(px + (y % 8 === 0 ? -1 : 1), y, "#ffcf7a");
    }
    R(px, 90, 1, 9, "#6a4a78"); P(px, 89, "#ff6a5a");
    // Telegraph Hill
    const gt = (x) => Math.round(198 - 13 * gauss((x - CX) / (W * 0.42)) + 2 * Math.sin(x / 8) + 1.5 * Math.sin(x / 3.1));
    for (let x = 0; x < W; x++) {
      const t = gt(x);
      for (let y = t; y < H; y++) {
        const d = y - t;
        let c = d < 2 ? "#a89a4a" : d < 14 ? "#4c6a3c" : d < 50 ? "#2c4a38" : "#162a30";
        if (d >= 2 && ((d + 2) % 12 === 0 || (d + 2) % 50 === 0) && (x + y) % 2 === 0) c = d < 14 ? "#4c6a3c" : "#2c4a38";
        P(x, y, c);
      }
    }
    // Filbert steps zig-zagging up the hill
    for (let y = 206; y < H; y++) {
      const hw = 3 + (y - 206) * 0.28, off = Math.round(Math.sin((y - 206) / 9) * 7);
      for (let x = Math.round(CX + off - hw); x <= CX + off + hw; x++) P(x, y, (y % 3 === 0) ? "#d8b98a" : x === Math.round(CX + off - hw) ? "#6a5a50" : "#b08a66");
    }
    // the tower
    const TL = "#f4e2c8", TD = "#a07c88", TDD = "#6a5070", base = gt(CX);
    const ty0 = 98, ty1 = base + 2;
    for (let y = ty0; y < ty1; y++) {                                           // fluted shaft (sun from the right)
      const hw = y < 118 ? 7 : 8;
      for (let x = CX - hw; x < CX + hw; x++) {
        const rel = x - (CX - hw);
        let c = rel < 3 ? TDD : rel < hw ? TD : rel < hw * 2 - 3 ? "#d8b8a0" : TL;
        if ((x - CX) % 3 === 0) c = mix(c, "#6a4a60", 0.3);
        P(x, y, c);
      }
      P(CX + hw, y, "#ffb26a");
    }
    for (let y = base - 9; y < base + 2; y++) for (let x = CX - 12; x < CX + 12; x++) P(x, y, x < CX - 8 ? TDD : x > CX + 8 ? "#e8c8a8" : TD);
    R(CX - 3, base - 8, 6, 8, "#2f2038"); R(CX - 2, base - 10, 4, 2, "#2f2038");                           // door arch
    hl(CX - 12, CX + 11, base - 10, "#ffc890");
    for (let y = 90; y < 98; y++) for (let x = CX - 6; x < CX + 6; x++) {                                    // lookout drum
      const rel = x - CX; P(x, y, (rel === -4 || rel === -1 || rel === 2 || rel === 4) && y > 91 ? "#2f2038" : rel < -3 ? TDD : rel > 3 ? TL : "#d8b8a0");
    }
    hl(CX - 9, CX + 8, 98, "#ffc890"); hl(CX - 9, CX + 8, 99, TDD); hl(CX - 9, CX + 8, 89, "#ffc890"); hl(CX - 9, CX + 8, 88, TD);
    for (let x = CX - 8; x < CX + 8; x += 2) P(x, 100, TDD);
    R(CX - 1, 82, 2, 6, "#e8c8a8"); P(CX, 80, "#ff6a5a"); R(CX, 81, 1, 1, "#ffd27a");
    // cypress/eucalyptus on the hill + foreground
    tree(e, 6, 232, 80, 14, "#13262c", "#27503f"); tree(e, W - 8, 236, 84, 14, "#13262c", "#27503f");
    tree(e, Math.round(W * 0.28), 222, 44, 9, "#16302e", "#2c5a48"); tree(e, Math.round(W * 0.74), 224, 40, 9, "#16302e", "#2c5a48");
    for (let x = 0; x < W; x++) { const bt = Math.round(H - 7 - 4 * gauss((x - W * 0.9) / 12) - 4 * gauss((x - W * 0.1) / 12)); for (let y = bt; y < H; y++) P(x, y, (x + y) % 3 === 0 ? "#27503f" : "#13262c"); }
  }

  // ===================================================== UNION SQUARE
  function union(e) {
    const { W, CX, P, R, hl, rand } = e, HOR = 200;
    sky(e, HOR); sun(e, CX, 150, HOR); clouds(e);
    // buildings: far layer (hazy), then near layer; lit windows
    const win = (x0, y0, x1, y1, base, litP) => {
      R(x0, y0, x1 - x0, y1 - y0, base);
      for (let y = y0 + 4; y < y1 - 2; y += 5) for (let x = x0 + 2; x < x1 - 2; x += 4) {
        R(x, y, 2, 3, rand() < litP ? "#ffcf7a" : mix(base, "#000000", 0.4));
      }
      hl(x0, x1 - 1, y0, mix(base, "#ffb080", 0.5)); hl(x0, x1 - 1, y0 + 1, mix(base, "#000000", 0.25));
      for (let y = y0 + 14; y < y1; y += 30) hl(x0, x1 - 1, y, mix(base, "#ffb080", 0.25));      // cornice lines
    };
    const bw = Math.round(W * 0.27), fw = Math.round(W * 0.14);
    win(bw - 2, 92, bw + fw, 207, "#8a4a78", 0.25); win(W - bw - fw, 100, W - bw + 2, 207, "#8a4a78", 0.25);
    win(0, 52, bw, 207, "#6a3a68", 0.35); win(W - bw, 40, W, 207, "#60305e", 0.35);
    R(bw - 1, 52, 1, 155, "#ffb26a"); R(W - bw, 40, 1, 167, "#ffb26a");               // sun-side edges
    // the Dewey (Victory) column
    const ST = "#f0dcc0", SL = "#fff0d0", SD = "#b0907c", SDD = "#7a5a70", GOLD = "#f6c445";
    for (let i = 0; i < 4; i++) hl(CX - 16 + i, CX + 15 - i, 206 - i * 2, i % 2 ? SD : ST);                       // base steps
    for (let y = 176; y < 198; y++) for (let x = CX - 10; x < CX + 10; x++) P(x, y, x < CX - 7 ? SL : x > CX + 6 ? SDD : x > CX + 3 ? SD : ST);
    hl(CX - 11, CX + 10, 176, SL); hl(CX - 11, CX + 10, 175, SD);
    R(CX - 5, 182, 10, 8, SD); R(CX - 4, 183, 8, 6, mix(SD, "#6a4a60", 0.4));                                // relief panel
    for (let y = 104; y < 175; y++) for (let x = CX - 4; x < CX + 4; x++) {                                    // fluted shaft
      let c = x < CX - 2 ? SL : x < CX + 1 ? ST : x < CX + 3 ? SD : SDD;
      if ((x - CX) % 2 === 0 && x > CX - 4) c = mix(c, "#6a4a60", 0.2);
      P(x, y, c);
    }
    for (let y = 150; y < 175; y += 12) hl(CX - 5, CX + 4, y, SD);
    for (let y = 98; y < 104; y++) for (let x = CX - 7; x < CX + 7; x++) P(x, y, x < CX - 4 ? SL : x > CX + 3 ? SDD : (x + y) % 2 ? ST : SD);   // capital
    hl(CX - 8, CX + 7, 97, SL); hl(CX - 8, CX + 7, 98, SD);
    R(CX - 2, 82, 4, 15, GOLD); R(CX - 3, 84, 1, 6, "#ffe08a"); R(CX + 1, 82, 1, 15, "#c8962a");               // Victory figure
    R(CX - 2, 79, 4, 3, "#ffe08a"); P(CX - 2, 78, GOLD); P(CX + 1, 78, GOLD);                                  // head + wreath
    for (let i = 0; i < 8; i++) { P(CX - 3 - i, 84 + (i >> 1) - 1, GOLD); P(CX + 2 + i, 84 + (i >> 1) - 1, i > 3 ? "#c8962a" : GOLD); }   // wings
    R(CX + 3, 62, 1, 17, "#c8962a"); P(CX + 2, 62, GOLD); P(CX + 4, 62, GOLD); P(CX + 3, 60, "#ffe08a");        // trident
    for (let y = 60; y < 206; y++) { const hw = y < 98 ? (y < 80 ? 2 : 3) : y < 104 ? 7 : y < 175 ? 4 : y < 176 ? 11 : 10; if (y > 76) P(CX + hw, y, "#ffb26a"); }
    // palms
    const palm = (x, baseY, h, lean) => {
      for (let i = 0; i < h; i++) { const tx = x + lean * Math.sin((i / h) * 1.6) * 6; R(tx, baseY - i, 2, 1, i % 4 === 0 ? "#6a4a4a" : "#4a3040"); }
      const cx = x + lean * Math.sin(1.6) * 6 + 1, cy = baseY - h;
      [[-1, -0.2], [-0.8, -0.65], [-0.35, -0.95], [0.35, -0.95], [0.8, -0.65], [1, -0.2], [-0.9, 0.2], [0.9, 0.2]].forEach(([dx, dy]) => {
        for (let t = 0; t < 15; t++) {
          const fx = cx + dx * t, fy = cy + dy * t + (t * t) / 28;
          P(fx, fy, "#1a4a38"); if (t % 2 === 0) { P(fx, fy + 1, "#14382c"); P(fx, fy - 1, "#2c6a48"); }
        }
      });
      P(cx, cy, "#2c6a48"); P(cx - 1, cy + 1, "#7a5a4a"); P(cx, cy + 1, "#7a5a4a");
    };
    palm(Math.round(W * 0.2), 212, 70, 1); palm(Math.round(W * 0.8), 214, 80, -1);
    // plaza
    for (let y = 206; y < H; y++) {
      const t = (y - 206) / (H - 206);
      for (let x = 0; x < W; x++) {
        const tile = (Math.floor((x + (y - 206) * ((x - CX) / 60)) / 8) + Math.floor((y - 206) / 5)) % 2;
        P(x, y, mix(tile ? "#d8b48e" : "#c9a07e", "#2a2036", 0.15 + t * 0.7));
      }
    }
    hl(0, W - 1, 206, "#ffb26a");
    for (const lx of [Math.round(W * 0.07), Math.round(W * 0.93)]) {                                          // lamp posts
      R(lx, 160, 1, 56, "#2a2036"); R(lx - 1, 158, 3, 3, "#ffe08a"); P(lx, 157, "#fff6c0");
      for (let r = 4; r < 9; r++) if ((r + lx) % 2 === 0) { P(lx - r, 159, "#ffcf7a"); P(lx + r, 159, "#ffcf7a"); }
    }
    // string lights across the square
    for (let x = 0; x < W; x += 1) { const cy = 120 + 14 * (1 - (2 * x / W - 1) ** 2) * -1 + 14; if (x % 4 === 0) P(x, cy, "#ffe08a"); else if (x % 4 === 2) P(x, cy, "#7a4a60"); }
    for (let x = 0; x < W; x++) { const bt = Math.round(H - 8 - 5 * gauss((x - W * 0.08) / 10) - 6 * gauss((x - W * 0.94) / 12)); for (let y = bt; y < H; y++) P(x, y, (x + y) % 3 === 0 ? "#27503f" : "#13262c"); }
  }

  const SCENES = { palace, coit, union };
  const SEEDS = { palace: 1915, coit: 1933, union: 1904 };      // years they were built
  function draw(canvas, kind, vw, vh) {
    if (kind === "campanile" || !SCENES[kind]) { window.Campanile.draw(canvas, vw, vh); return; }
    SCENES[kind](setup(canvas, SEEDS[kind], vw, vh));
  }
  window.Backdrops = { draw };
})();
