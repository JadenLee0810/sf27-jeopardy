// ====================================================
//  Pixel-art US map + city pins
//  Outline is a coarse [lon, lat] polygon, rasterized to a tiny
//  canvas and scaled up with image-rendering: pixelated.
// ====================================================
(function () {
  const GRID_W = 176;           // map resolution in "pixels"
  const LON_MIN = -125, LON_MAX = -66;
  const LAT_MIN = 24.3, LAT_MAX = 49.6;
  const K = Math.cos((38 * Math.PI) / 180); // squash longitude
  const SCALE = GRID_W / ((LON_MAX - LON_MIN) * K);
  const GRID_H = Math.ceil((LAT_MAX - LAT_MIN) * SCALE);

  const project = (lon, lat) => [
    (lon - LON_MIN) * K * SCALE,
    (LAT_MAX - lat) * SCALE,
  ];

  // Contiguous US, clockwise from the NW corner
  const LAND = [
    [-124.7, 48.4], [-123.0, 48.3], [-122.8, 49.0], [-95.2, 49.0], [-95.2, 49.4],
    [-94.6, 48.7], [-93.0, 48.6], [-91.5, 48.1], [-89.6, 48.0], [-84.5, 46.5],
    [-83.9, 46.0], [-83.4, 45.3], [-83.3, 44.3], [-83.9, 43.7], [-82.9, 44.05],
    [-82.45, 43.0], [-83.1, 42.0], [-83.4, 41.7], [-82.7, 41.5], [-81.7, 41.5],
    [-80.5, 42.0], [-79.0, 42.8], [-79.0, 43.3], [-77.5, 43.3], [-76.2, 43.6],
    [-76.3, 44.1], [-75.0, 44.9], [-71.5, 45.0], [-70.8, 45.4], [-70.0, 46.7],
    [-69.2, 47.45], [-68.3, 47.35], [-67.8, 47.0], [-67.8, 45.7], [-67.0, 44.8],
    [-68.5, 44.3], [-70.2, 43.6], [-70.7, 42.9], [-70.8, 42.5], [-70.7, 42.0],
    [-70.0, 42.05], [-70.0, 41.7], [-70.6, 41.55], [-71.4, 41.45], [-72.9, 41.25],
    [-73.7, 40.9], [-73.9, 40.6], [-74.0, 40.45], [-74.1, 39.7], [-74.9, 38.95],
    [-75.5, 39.4], [-75.1, 38.4], [-75.9, 37.1], [-76.0, 36.9], [-75.5, 35.25],
    [-76.5, 34.7], [-77.9, 33.9], [-79.2, 33.2], [-80.9, 32.0], [-81.4, 30.7],
    [-81.3, 29.8], [-80.5, 28.4], [-80.0, 26.8], [-80.15, 25.8], [-80.4, 25.2],
    [-81.1, 25.15], [-81.8, 26.1], [-82.7, 27.7], [-82.8, 29.0], [-83.7, 29.9],
    [-84.3, 30.05], [-85.4, 29.7], [-86.5, 30.4], [-88.0, 30.3], [-89.3, 30.3],
    [-89.4, 29.0], [-90.5, 29.1], [-92.0, 29.6], [-93.8, 29.7], [-94.7, 29.3],
    [-95.9, 28.6], [-97.2, 27.7], [-97.4, 26.0], [-99.1, 26.4], [-99.5, 27.5],
    [-100.3, 28.3], [-101.4, 29.8], [-102.4, 29.8], [-103.1, 29.0], [-104.5, 29.6],
    [-104.9, 30.6], [-106.5, 31.75], [-108.2, 31.8], [-108.2, 31.3], [-111.1, 31.3],
    [-114.8, 32.5], [-117.1, 32.5], [-117.3, 33.1], [-118.4, 33.75], [-118.5, 34.0],
    [-119.2, 34.15], [-120.5, 34.5], [-120.65, 35.1], [-121.9, 36.6], [-122.5, 37.5],
    [-122.5, 37.8], [-123.0, 38.0], [-123.7, 38.9], [-123.8, 39.8], [-124.4, 40.4],
    [-124.1, 41.5], [-124.5, 42.8], [-124.1, 44.0], [-123.95, 46.2], [-124.1, 47.0],
  ];

  // Water carved back out of the land (Great Lakes)
  const LAKES = [
    // Superior
    [[-92.2, 46.8], [-90.4, 46.6], [-88.3, 47.45], [-87.4, 46.5], [-85.0, 46.75],
     [-84.4, 46.5], [-84.0, 47.5], [-89.6, 48.5], [-92.2, 47.5]],
    // Michigan
    [[-85.0, 45.85], [-85.6, 45.0], [-86.5, 44.0], [-86.3, 43.0], [-86.6, 42.2],
     [-87.3, 41.65], [-87.8, 42.2], [-87.8, 43.2], [-87.5, 44.3], [-87.0, 45.2],
     [-87.0, 45.8]],
  ];

  // dir = which side the label sits on
  const CITIES = [
    { name: "San Francisco", lat: 37.77, lon: -122.42, dir: "left" },
    { name: "Davis",         lat: 38.54, lon: -121.74, dir: "up" },
    { name: "Los Angeles",   lat: 34.05, lon: -118.24, dir: "left" },
    { name: "New Brunswick",      lat: 40.50, lon: -74.45,  dir: "right" },
    { name: "Boston",        lat: 42.36, lon: -71.06,  dir: "right" },
  ];

  // ---------- colors ----------
  const C = {
    ocean:  [15, 28, 82],
    ocean2: [19, 34, 96],
    shore:  [40, 72, 170],
    land:   [34, 140, 60],
    land2:  [40, 154, 68],
    coast:  [170, 240, 120],
  };

  function trace(ctx, pts) {
    pts.forEach(([lon, lat], i) => {
      const [x, y] = project(lon, lat);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
  }

  function buildMask() {
    const off = document.createElement("canvas");
    off.width = GRID_W; off.height = GRID_H;
    const ctx = off.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.beginPath(); trace(ctx, LAND); ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    LAKES.forEach((l) => { ctx.beginPath(); trace(ctx, l); ctx.fill(); });
    const d = ctx.getImageData(0, 0, GRID_W, GRID_H).data;
    const mask = new Uint8Array(GRID_W * GRID_H);
    for (let i = 0; i < mask.length; i++) mask[i] = d[i * 4 + 3] > 127 ? 1 : 0;
    return mask;
  }

  function drawMap(canvas) {
    canvas.width = GRID_W; canvas.height = GRID_H;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(GRID_W, GRID_H);
    const mask = buildMask();
    const at = (x, y) =>
      x < 0 || y < 0 || x >= GRID_W || y >= GRID_H ? 0 : mask[y * GRID_W + x];
    const nb = (x, y, v) =>
      at(x + 1, y) === v || at(x - 1, y) === v || at(x, y + 1) === v || at(x, y - 1) === v;

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const land = at(x, y);
        const checker = (x + y) % 2 === 0;
        let c;
        if (land) c = nb(x, y, 0) ? C.coast : checker ? C.land : C.land2;
        else c = nb(x, y, 1) ? C.shore : checker ? C.ocean : C.ocean2;
        const i = (y * GRID_W + x) * 4;
        img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function addPins(wrap) {
    CITIES.forEach((city, n) => {
      const [x, y] = project(city.lon, city.lat);
      const pin = document.createElement("div");
      pin.className = "pin";
      pin.dataset.city = city.name;
      pin.style.left = ((x + 0.5) / GRID_W) * 100 + "%";
      pin.style.top = ((y + 0.5) / GRID_H) * 100 + "%";
      pin.style.animationDelay = n * 0.15 + "s";

      const label = document.createElement("span");
      label.className = "pin-label " + city.dir;
      label.textContent = city.name;
      pin.appendChild(label);
      wrap.appendChild(pin);
    });
  }

  function init() {
    const wrap = document.getElementById("us-map");
    if (!wrap) return;
    wrap.style.aspectRatio = GRID_W + " / " + GRID_H;
    const canvas = document.createElement("canvas");
    canvas.className = "map-canvas";
    wrap.appendChild(canvas);
    drawMap(canvas);
    addPins(wrap);
  }

  init();
})();
