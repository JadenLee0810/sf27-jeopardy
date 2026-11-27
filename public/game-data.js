// ====================================================
//  GAME DATA - the real clues.
//  Shared by the main board (script.js) and the host's
//  answer key on the phone page (join.js).
// ====================================================
const GAME_DATA = (() => {
  const VALUES = [100, 200, 300, 400, 500];

  const RAW = [
    { name: "San Francisco + Bay Area",
      clues: [
        ["In what year did the California Gold Rush begin?", "1848 or 1849 (accept either)"],
        ["What does BART stand for?", "Bay Area Rapid Transit"],
        ["Name the three UC campuses located in the Bay Area.", "UC Berkeley, UC San Francisco, and UC Santa Cruz"],
        ["This island in San Francisco Bay housed the notorious federal prison nicknamed \u201cThe Rock.\u201d", "Alcatraz"],
        ["This avenue runs through Berkeley and Oakland and shares its name with a Childish Gambino song.", "Telegraph Avenue"],
      ],
      bonus: { value: 250, question: "Name the standalone UC law school in San Francisco, using either its current or former name.", answer: "UC Law San Francisco / UC Hastings" } },
    { name: "Thanksgiving",
      clues: [
        ["This red berry is used to make a classic Thanksgiving sauce.", "Cranberry"],
        ["This ship carried the Pilgrims to New England in 1620.", "Mayflower"],
        ["This president issued the 1863 proclamation establishing a national Thanksgiving observance in November.", "Abraham Lincoln"],
        ["Often seen in Thanksgiving decorations, this horn-shaped basket overflowing with food has a name meaning \u201chorn of plenty.\u201d", "Cornucopia"],
        ["Which U.S. founding father called the turkey a \u201cmuch more respectable bird\u201d than the bald eagle?", "Benjamin Franklin"],
      ] },
    { name: "Christianity",
      clues: [
        ["What does YHWH mean?", "I am"],
        ["What chapter is the longest chapter in the Bible?", "Psalm 119"],
        ["After Judas\u2019s death, this man was chosen by lot to join the eleven apostles.", "Matthias"],
        ["This book of the Bible is the only book that does not have any mentions of Yahweh.", "Esther"],
        ["Whose feast was Daniel at when the hand appeared?", "King Belshazzar"],
      ] },
    { name: "Brain Rot",
      clues: [
        ["This viral character is a singing human head sticking out of a common bathroom fixture.", "Skibidi Toilet"],
        ["In the original chant introducing Tung Tung Tung Sahur, \u201ctung\u201d is repeated this many times before \u201csahur.\u201d", "9"],
        ["Who made the song \u201cGG EZ\u201d?", "Kaien, Sugar"],
        ["This political figure was the \u201cmost memed\u201d of 2025, featuring AI edits to copy his features.", "Charlie Kirk"],
        ["What is the song \u201cChug Jug with You\u201d based off of?", "American Boy by Estelle, Kanye West"],
      ] },
    { name: "Random Trivia",
      clues: [
        ["This is the minimum number of electoral votes needed to win the U.S. presidency out of 538.", "270"],
        ["This famous hypothesis about the zeros of the zeta function had a proof announced in November 2026 by mathematician Levent Alp\u00f6ge, working with Claude AI.", "Riemann Hypothesis, now Riemann Theorem"],
        ["This is the minimum age required to become president of the United States.", "35"],
        ["In a standard English-pattern deck of cards, this king is the only one without a mustache.", "King of Hearts"],
        ["In the U.S. presidential line of succession, this official comes immediately after the vice president.", "Speaker of the House"],
      ] },
  ];

  const CATEGORIES = RAW.map((cat) => ({
    name: cat.name,
    bonus: cat.bonus || null,     // extra clue (not on the board); shown in the host's answer key
    clues: VALUES.map((v, i) => ({ value: v, question: cat.clues[i][0], answer: cat.clues[i][1] })),
  }));

  return { VALUES, CATEGORIES };
})();
