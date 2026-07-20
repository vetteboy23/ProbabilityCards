import { fullDeck } from "./cards.js";
import { combinationCount, countSubsetsContainingRequiredCards } from "./combinatorics.js";
import { holdemPrecomputed } from "./holdemPrecomputed.js";
import {
  calculateHoldemAttendanceExact,
  countGroupedAttendanceExact,
  maximumAttendanceMatching,
} from "./holdemAttendance.js";
import { calculateHoldemProbabilitiesExact } from "./sevenCardProbability.js";

function combinations(values, count) {
  const output = [];
  function choose(start, selected) {
    if (selected.length === count) {
      output.push([...selected]);
      return;
    }
    for (let index = start; index <= values.length - (count - selected.length); index += 1) {
      selected.push(values[index]);
      choose(index + 1, selected);
      selected.pop();
    }
  }
  choose(0, []);
  return output;
}

function rosterMasks(cards, selectedPlayerIds) {
  const index = new Map(selectedPlayerIds.map((id, position) => [id, position]));
  return cards.map((card) => {
    let mask = 0;
    for (const personId of card.relationalIdentityOptions) {
      const position = index.get(personId);
      if (position !== undefined) mask |= 1 << position;
    }
    return mask >>> 0;
  });
}

export function validateSevenCardProbability() {
  const checks = [];
  function check(condition, message) {
    checks.push({ passed: Boolean(condition), message });
    if (!condition) throw new Error(message);
  }

  const configToJokers = {
    none: [],
    kick_only: ["JOKER_KICK"],
    pipe_only: ["JOKER_MATERNAL"],
    both: ["JOKER_KICK", "JOKER_MATERNAL"],
  };

  for (const [config, jokerIds] of Object.entries(configToJokers)) {
    const table = holdemPrecomputed.decks[config];
    check(table.totalCombinationCount === combinationCount(table.deckSize, 7), `${config}: total equals C(${table.deckSize},7)`);
    const pokerIds = ["high_card","one_pair","two_pair","three_of_a_kind","straight","flush","full_house","four_of_a_kind","straight_flush","royal_flush"];
    const pokerTotal = pokerIds.reduce((sum, id) => sum + table.counts[id], 0);
    check(pokerTotal === table.totalCombinationCount, `${config}: ordinary poker categories partition the seven-card space`);
    const expectedPairCount = countSubsetsContainingRequiredCards(table.deckSize, 2, 7);
    check(table.counts.jersey_pair === expectedPairCount, `${config}: Jersey Pair has fixed two-card count`);
    check(table.counts.family_album === expectedPairCount, `${config}: Family Album has fixed two-card count`);
    check(table.counts.grandparents_album === expectedPairCount, `${config}: Grandparents Album has fixed two-card count`);

    const result = calculateHoldemProbabilitiesExact({
      includedJokerIds: jokerIds,
      selectedPlayerIds: [],
      selectedOptionalHandIds: [],
    });
    check(result.totalCombinationCount === table.totalCombinationCount, `${config}: engine uses correct total`);
    const dancers = result.handResults.find((item) => item.handId === "dancers");
    check(dancers.qualifyingCombinationCount === expectedPairCount, `${config}: Dancers uses abstract fixed-pair count`);
    const echoEight = result.handResults.find((item) => item.handId === "echo_eight_of_a_kind");
    check(echoEight.qualifyingCombinationCount === 0 && !echoEight.possible, `${config}: Echo Eight is physically impossible in seven cards`);
  }

  check(
    holdemPrecomputed.decks.kick_only.counts.fun_flight > holdemPrecomputed.decks.pipe_only.counts.fun_flight,
    "Kick Joker increases Fun Flight while Pipe does not"
  );
  check(
    holdemPrecomputed.decks.kick_only.counts.three_brothers === holdemPrecomputed.decks.pipe_only.counts.three_brothers,
    "Joker identity does not affect Three Brothers"
  );

  const sharedSettings = {
    includedJokerIds: ["JOKER_KICK"],
    selectedPlayerIds: ["dopey", "doc", "bashful", "happy", "sleepy"],
    selectedOptionalHandIds: ["dynamic_duo", "heritage"],
  };
  const withoutSelf = calculateHoldemProbabilitiesExact({ ...sharedSettings, useVirtualSelf: false });
  const withSelf = calculateHoldemProbabilitiesExact({ ...sharedSettings, useVirtualSelf: true });
  check(
    JSON.stringify(withoutSelf.handResults.map((item) => [item.handId, item.qualifyingCombinationCount])) ===
      JSON.stringify(withSelf.handResults.map((item) => [item.handId, item.qualifyingCombinationCount])),
    "Virtual self does not change Hold'em probabilities"
  );
  let rejectedPlayerId = false;
  try {
    calculateHoldemProbabilitiesExact({ ...sharedSettings, playerId: "dopey" });
  } catch (error) {
    rejectedPlayerId = /playerId/.test(error.message);
  }
  check(rejectedPlayerId, "Player-specific probability input is rejected");

  const optionalOff = calculateHoldemProbabilitiesExact({ includedJokerIds: [], selectedOptionalHandIds: [] });
  const optionalOn = calculateHoldemProbabilitiesExact({ includedJokerIds: [], selectedOptionalHandIds: ["dynamic_duo"] });
  check(!optionalOff.handResults.some((item) => item.handId === "dynamic_duo"), "Unselected optional hand is omitted");
  check(optionalOn.handResults.some((item) => item.handId === "dynamic_duo"), "Selected optional hand is included");

  // Independent grouped-attendance cross-check on a small deck.
  const smallDeck = fullDeck.slice(0, 12);
  const roster = ["dopey", "snow_white", "grumpy", "sneezy"];
  const requiredCounts = [2, 3, 4];
  const grouped = countGroupedAttendanceExact({
    deck: smallDeck,
    selectedPlayerIds: roster,
    handSize: 7,
    requiredCounts,
  });
  const directCounts = Object.fromEntries(requiredCounts.map((count) => [count, 0]));
  for (const hand of combinations(smallDeck, 7)) {
    const maximum = maximumAttendanceMatching(rosterMasks(hand, roster), roster.length);
    for (const required of requiredCounts) if (maximum >= required) directCounts[required] += 1;
  }
  for (const required of requiredCounts) {
    check(grouped.countsByRequired[required] === directCounts[required], `Grouped attendance equals direct enumeration for threshold ${required}`);
  }

  const attendance = calculateHoldemAttendanceExact({
    includedJokerIds: ["JOKER_KICK", "JOKER_MATERNAL"],
    selectedPlayerIds: ["dopey", "doc", "bashful", "happy", "sleepy", "ball"],
  });
  check(attendance.handResults.length === 3, "Six-player Hold'em roster generates 4-, 5-, and 6-player probability hands");
  check(attendance.handResults.every((item) => item.exact), "Attendance probabilities are exact");

  return Object.freeze({
    passed: checks.every((item) => item.passed),
    checkCount: checks.length,
    checks: Object.freeze(checks.map(Object.freeze)),
  });
}
