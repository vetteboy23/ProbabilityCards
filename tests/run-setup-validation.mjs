import assert from "node:assert/strict";
import {
  GAME_FORMAT,
  JOKER_OPTION,
  selectablePlayers,
  getAttendanceHands,
  getAttendanceProbabilityHands,
  getAttendanceRankingRules,
  buildGameSetup,
  validateGameSetup,
} from "../src/setupRules.js";
import { optionalHands, optionalHandIds } from "../src/optionalHands.js";

const expectedPlayerNames = [
  "Ball",
  "Bashful",
  "Beer",
  "Cheese",
  "Cube",
  "Doc",
  "Dopey",
  "Grumpy",
  "Happy",
  "King",
  "Light",
  "Net",
  "Old Fashioned",
  "Queen",
  "Sleepy",
  "Sneezy",
  "Snow White",
  "Steak",
];

assert.deepEqual(
  selectablePlayers.map((person) => person.displayName),
  expectedPlayerNames,
  "Selectable players must be the approved 18 people in alphabetical order"
);

function counts(playerCount, format, useVirtualSelf) {
  return getAttendanceHands({
    selectedPlayerCount: playerCount,
    format,
    useVirtualSelf,
  }).map((hand) => hand.requiredCount);
}

assert.deepEqual(counts(2, GAME_FORMAT.FIVE_CARD_DRAW, true), [2]);
assert.deepEqual(counts(3, GAME_FORMAT.FIVE_CARD_DRAW, true), [2, 3]);
assert.deepEqual(counts(4, GAME_FORMAT.FIVE_CARD_DRAW, true), [3, 4]);
assert.deepEqual(counts(5, GAME_FORMAT.FIVE_CARD_DRAW, false), [4, 5]);
assert.deepEqual(counts(6, GAME_FORMAT.FIVE_CARD_DRAW, false), [4, 5]);
assert.deepEqual(counts(6, GAME_FORMAT.FIVE_CARD_DRAW, true), [4, 5, 6]);
assert.deepEqual(counts(9, GAME_FORMAT.FIVE_CARD_DRAW, true), [4, 5, 6]);
assert.deepEqual(counts(7, GAME_FORMAT.TEXAS_HOLDEM, false), [4, 5, 6, 7]);
assert.deepEqual(counts(8, GAME_FORMAT.TEXAS_HOLDEM, true), [4, 5, 6, 7, 8]);
assert.deepEqual(counts(12, GAME_FORMAT.TEXAS_HOLDEM, true), [4, 5, 6, 7, 8]);

assert.deepEqual(
  getAttendanceProbabilityHands({
    selectedPlayerCount: 6,
    format: GAME_FORMAT.FIVE_CARD_DRAW,
  }).map((hand) => hand.requiredCount),
  [4, 5]
);
assert.deepEqual(
  getAttendanceProbabilityHands({
    selectedPlayerCount: 8,
    format: GAME_FORMAT.TEXAS_HOLDEM,
  }).map((hand) => hand.requiredCount),
  [4, 5, 6, 7]
);

const fiveCardAttendanceRanking = getAttendanceRankingRules({
  selectedPlayerCount: 6,
  format: GAME_FORMAT.FIVE_CARD_DRAW,
  useVirtualSelf: true,
});
assert.equal(
  fiveCardAttendanceRanking.find((rule) => rule.gameplayRequiredCount === 6)
    .probabilityRequiredCount,
  5
);

const holdemAttendanceRanking = getAttendanceRankingRules({
  selectedPlayerCount: 8,
  format: GAME_FORMAT.TEXAS_HOLDEM,
  useVirtualSelf: true,
});
assert.equal(
  holdemAttendanceRanking.find((rule) => rule.gameplayRequiredCount === 8)
    .probabilityRequiredCount,
  7
);

for (const playerCount of [2, 3, 4]) {
  const hands = getAttendanceHands({
    selectedPlayerCount: playerCount,
    format: GAME_FORMAT.TEXAS_HOLDEM,
    useVirtualSelf: true,
  });
  assert.ok(hands.every((hand) => !hand.virtualSelfAllowed));
}

const playerIds = selectablePlayers.slice(0, 6).map((person) => person.id);
const setup = buildGameSetup({
  selectedPlayerIds: playerIds,
  selectedOptionalHandIds: ["dynamic_duo", "heritage"],
  format: GAME_FORMAT.FIVE_CARD_DRAW,
  jokerOption: JOKER_OPTION.PIPE_ONLY,
  useVirtualSelf: true,
});

assert.equal(setup.playerCount, 6);
assert.equal(setup.optionalHandCount, 2);
assert.deepEqual(setup.selectedOptionalHandNames, ["Dynamic Duo", "Heritage"]);
assert.equal(setup.deckSize, 54);
assert.deepEqual(setup.includedJokerIds, ["JOKER_MATERNAL"]);
assert.deepEqual(setup.attendanceHands.map((hand) => hand.requiredCount), [4, 5, 6]);
assert.equal(setup.attendanceUsesVirtualSelf, true);
assert.deepEqual(setup.probabilityAttendanceHands.map((hand) => hand.requiredCount), [4, 5]);
assert.equal(setup.attendanceRankingRules.length, 3);
assert.equal(
  setup.attendanceRankingRules.find((rule) => rule.gameplayRequiredCount === 6)
    .probabilityRequiredCount,
  5
);
assert.equal(setup.probabilityUsesVirtualSelf, false);
assert.equal(setup.probabilityRankingScope, "shared_table_ranking");

const invalid = validateGameSetup({
  selectedPlayerIds: [playerIds[0]],
  selectedOptionalHandIds: [],
  format: GAME_FORMAT.FIVE_CARD_DRAW,
  jokerOption: JOKER_OPTION.BOTH,
  useVirtualSelf: false,
});
assert.equal(invalid.valid, false);
assert.ok(invalid.errors.some((message) => message.includes("at least two")));

assert.equal(optionalHands.length, 8);
assert.equal(new Set(optionalHandIds).size, optionalHandIds.length);
assert.ok(optionalHands.every((hand) => hand.selectable && !hand.builtIn));
assert.ok(optionalHands.every((hand) => hand.name && hand.shortDescription && hand.ruleSummary));

const noOptionalHands = buildGameSetup({
  selectedPlayerIds: playerIds.slice(0, 2),
  selectedOptionalHandIds: [],
  format: GAME_FORMAT.FIVE_CARD_DRAW,
  jokerOption: JOKER_OPTION.NONE,
  useVirtualSelf: false,
});
assert.equal(noOptionalHands.optionalHandCount, 0);
assert.deepEqual(noOptionalHands.selectedOptionalHandIds, []);

const invalidOptionalHand = validateGameSetup({
  selectedPlayerIds: playerIds.slice(0, 2),
  selectedOptionalHandIds: ["not_a_real_hand"],
  format: GAME_FORMAT.FIVE_CARD_DRAW,
  jokerOption: JOKER_OPTION.BOTH,
  useVirtualSelf: false,
});
assert.equal(invalidOptionalHand.valid, false);
assert.ok(invalidOptionalHand.errors.some((message) => message.includes("not recognized")));

const duplicateOptionalHand = validateGameSetup({
  selectedPlayerIds: playerIds.slice(0, 2),
  selectedOptionalHandIds: ["heritage", "heritage"],
  format: GAME_FORMAT.FIVE_CARD_DRAW,
  jokerOption: JOKER_OPTION.BOTH,
  useVirtualSelf: false,
});
assert.equal(duplicateOptionalHand.valid, false);
assert.ok(duplicateOptionalHand.errors.some((message) => message.includes("more than once")));

console.log("SETUP VALIDATION PASSED");
console.log("40 setup and optional-hand checks passed");
