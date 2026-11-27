// Board data lives in game-data.js (shared with the host's answer key on /join)
const { VALUES, CATEGORIES } = GAME_DATA;

const TEAMS = ["Noah", "Hany", "Jihoo", "Kevin"];   // scoreboard order, left to right (names can be edited on screen)
const TEAM_KEYS = ["Noah", "Hany", "Jihoo", "Kevin"]; // fixed ids the server keeps scores under

// ====================================================
//  STATE
// ====================================================
let scores = {};
let used = new Set();     // "col-row" keys of answered tiles
let current = null;       // { col, row, clue } while modal is open

const $ = (id) => document.getElementById(id);
const fmt = (n) => (n < 0 ? "-$" : "$") + Math.abs(n);

// ====================================================
//  RENDER
// ====================================================
function renderBoard() {
  const board = $("board");
  board.style.setProperty("--cols", CATEGORIES.length);
  board.innerHTML = "";

  CATEGORIES.forEach((cat) => {
    const h = document.createElement("div");
    h.className = "cell category";
    h.textContent = cat.name;
    board.appendChild(h);
  });

  VALUES.forEach((_, row) => {
    CATEGORIES.forEach((cat, col) => {
      const clue = cat.clues[row];
      const b = document.createElement("button");
      b.className = "cell tile";
      b.textContent = "$" + clue.value;
      if (used.has(`${col}-${row}`)) b.classList.add("used");
      b.addEventListener("click", () => openClue(col, row));
      board.appendChild(b);
    });
  });
}

function renderScores() {
  const sb = $("scoreboard");
  sb.innerHTML = "";
  TEAMS.forEach((name, i) => {
    const el = document.createElement("div");
    el.className = "team";

    const input = document.createElement("input");
    input.className = "team-name";
    input.value = name;
    input.maxLength = 12;
    input.setAttribute("aria-label", `Team ${i + 1} name`);
    input.addEventListener("input", () => { TEAMS[i] = input.value; });

    const score = document.createElement("div");
    score.className = "team-score" + (scores[i] < 0 ? " neg" : "");
    score.textContent = fmt(scores[i]);

    el.append(input, score);
    sb.appendChild(el);
  });
}

// ====================================================
//  MODAL
// ====================================================
function openClue(col, row) {
  const cat = CATEGORIES[col];
  const clue = cat.clues[row];
  current = { col, row, clue };

  $("modal-category").textContent = cat.name;
  $("modal-value").textContent = "$" + clue.value;
  $("modal-question").textContent = clue.question;
  $("modal-answer").textContent = clue.answer;
  $("modal-answer").hidden = true;
  $("award").hidden = true;
  $("btn-reveal").parentElement.hidden = false;

  $("modal").hidden = false;
  $("btn-reveal").focus();
  Sfx.clueOpen(); Sfx.duck(true); Sfx.tickStart();    // zoom-up hit, music down, clock ticking
}

function revealAnswer() {
  Sfx.tickStop(); Sfx.reveal();
  $("modal-answer").hidden = false;
  $("btn-reveal").parentElement.hidden = true;

  const wrap = $("award-buttons");
  wrap.innerHTML = "";
  TEAMS.forEach((name, i) => {
    const b = document.createElement("button");
    b.className = "btn btn-small";
    b.textContent = name || `Team ${i + 1}`;
    b.addEventListener("click", () => closeClue(i));
    wrap.appendChild(b);
  });
  $("award").hidden = false;
}

function closeClue(winnerIndex) {
  if (!current) return;
  Sfx.tickStop(); Sfx.duck(false);
  if (winnerIndex !== null) Sfx.correct(); else Sfx.wrong();      // ding-ding or buzzer
  if (winnerIndex !== null) {
    scores[winnerIndex] += current.clue.value;
    Net.add("screen", TEAM_KEYS[winnerIndex], current.clue.value);   // share it with every phone
  }
  used.add(`${current.col}-${current.row}`);
  current = null;
  $("modal").hidden = true;
  renderBoard();
  renderScores();
}

// ====================================================
//  SCREENS / INIT
// ====================================================
function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
}

function resetGame() {
  scores = Object.fromEntries(TEAMS.map((_, i) => [i, 0]));
  used = new Set();
  current = null;
  $("modal").hidden = true;
  renderBoard();
  renderScores();
}

// Fake QR so the slide has something to look at until you wire up real join codes
function drawPlaceholderQR(canvas) {
  const N = 25;
  canvas.width = N; canvas.height = N;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, N, N);
  ctx.fillStyle = "#000";
  let seed = 27;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const finder = (ox, oy) => {
    ctx.fillRect(ox, oy, 7, 7);
    ctx.fillStyle = "#fff"; ctx.fillRect(ox + 1, oy + 1, 5, 5);
    ctx.fillStyle = "#000"; ctx.fillRect(ox + 2, oy + 2, 3, 3);
  };
  const inFinder = (x, y) =>
    (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (!inFinder(x, y) && rnd() > 0.5) ctx.fillRect(x, y, 1, 1);
  finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
}
drawPlaceholderQR($("qr"));

// Play -> flight animation to SF -> phone instructions -> game
// the scene is built a moment after load so the landing page paints first;
// pressing the Berkeley guy's cap jumps everyone and zooms into the board
setTimeout(() => SceneStage.mount($("scene-root"), () => show("screen-game")), 60);
$("btn-start").addEventListener("click", () => playIntro(() => show("screen-scene")));
$("btn-join-continue").addEventListener("click", () => show("screen-game"));
$("btn-reset").addEventListener("click", () => {
  if (confirm("Reset the board and scores?")) { resetGame(); Net.reset("screen"); Sfx.reset(); }
});
$("btn-reveal").addEventListener("click", revealAnswer);
$("btn-nobody").addEventListener("click", () => closeClue(null));
document.addEventListener("keydown", (e) => {
  // Esc closes the modal without marking the tile as used
  if (e.key === "Escape" && current) { current = null; $("modal").hidden = true; Sfx.tickStop(); Sfx.duck(false); }
});

// sound on / off (remembered)
const sndBtn = $("btn-sound");
const paintSnd = () => { sndBtn.textContent = Sfx.isMuted() ? "SND OFF" : "SND ON"; };
paintSnd();
sndBtn.addEventListener("click", () => { Sfx.setMuted(!Sfx.isMuted()); paintSnd(); });

resetGame();

// scores are shared with the phones (host edits show up here live)
Net.on((s) => { TEAM_KEYS.forEach((k, i) => { scores[i] = s[k]; }); renderScores(); });
Net.connect();
