// ====================================================
//  The five valid names on the phone join page.
//  `kind` links each person to their pixel sprite in scene.js.
//  Jaden is the host (sees the full answer key); the rest play.
// ====================================================
const ROSTER = [
  { name: "Noah", bg: "campanile", school: "Boston University", short: "BU", mascot: "Terrier", kind: "bu",
    c1: "#e23c2e", c2: "#4a0d0a",
    moves: [
      { n: "Comm Ave Dash", d: "Buzz in first and snag the clue.", p: "30" },
      { n: "Fenway Rally", d: "Bounce back after a wrong answer.", p: "50+" },
    ],
    flavor: "Has never once let a clue slip past the Charles." },

  { name: "Kevin", bg: "union", school: "UC Davis", short: "UCD", mascot: "Aggie", kind: "davis",
    c1: "#d3b05a", c2: "#1e3f78",
    moves: [
      { n: "Aggie Stampede", d: "Chain correct answers for a bonus.", p: "40" },
      { n: "Cow Town Calm", d: "Stay cool on a Daily Double.", p: "60+" },
    ],
    flavor: "Bikes to every question. Arrives early." },

  { name: "Hany", bg: "palace", school: "Rutgers", short: "RU", mascot: "Scarlet Knight", kind: "rutgers",
    c1: "#d71f4b", c2: "#3a1018",
    moves: [
      { n: "Scarlet Charge", d: "Steal a clue another player misses.", p: "30" },
      { n: "Turnpike Turbo", d: "Double speed on the next buzz.", p: "50+" },
    ],
    flavor: "Knows the answer. Also knows a shortcut." },

  { name: "Jihoo", bg: "coit", school: "UCLA", short: "UCLA", mascot: "Bruin", kind: "ucla",
    c1: "#2b8de0", c2: "#0d2e57",
    moves: [
      { n: "Bruin Blitz", d: "Fast buzz, big payout.", p: "40" },
      { n: "Westwood Wave", d: "Pick a category and own it.", p: "60+" },
    ],
    flavor: "Sunny disposition. Ruthless on the buzzer." },

  { name: "Jaden", bg: "campanile", school: "UC Berkeley", short: "CAL", mascot: "Golden Bear", kind: "cal", host: true,
    c1: "#1d2850", c2: "#0a1128",
    moves: [
      { n: "Golden Bear Roar", d: "Silences the room before a clue.", p: "--" },
      { n: "Answer Key Peek", d: "Sees every answer. Tells no one.", p: "--" },
    ],
    flavor: "Runs the show. Wears the cap." },
];

// ---- DEMO card stats (scores are real now: they live on the server, see net.js) ----
// Replace these with live numbers from the real game later.
const DEMO_STATE = {
  stats: {
    Noah:  { buzz: 78, brain: 64, luck: 41, streak: 3, right: 7, wrong: 2 },
    Kevin: { buzz: 52, brain: 71, luck: 66, streak: 1, right: 5, wrong: 1 },
    Hany:  { buzz: 88, brain: 80, luck: 35, streak: 4, right: 9, wrong: 3 },
    Jihoo: { buzz: 45, brain: 58, luck: 79, streak: 0, right: 3, wrong: 4 },
    Jaden: { buzz: 99, brain: 99, luck: 99, streak: 0, right: 0, wrong: 0 },
  },
};
