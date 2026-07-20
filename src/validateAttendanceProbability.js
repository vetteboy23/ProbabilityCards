import { cardById, fullDeck } from "./cards.js";
import { BUILT_IN_HAND } from "./hands.js";
import {
  createFiveCardProfile,
  maximumRepresentedPlayers,
} from "./fiveCardMatcher.js";
import { calculateFiveCardProbabilitiesExactSync } from "./fiveCardProbability.js";
import {
  GAME_FORMAT,
  getAttendanceHands,
  getAttendanceProbabilityHands,
  getAttendanceRankingRules,
} from "./setupRules.js";

function seededRandom(seed = 20260720) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function sampleFiveCards(random) {
  const indexes = new Set();
  while (indexes.size < 5) indexes.add(Math.floor(random() * fullDeck.length));
  return [...indexes].map((index) => fullDeck[index]);
}

function popcount(mask) {
  let count = 0;
  let remaining = mask >>> 0;
  while (remaining) {
    remaining &= remaining - 1;
    count += 1;
  }
  return count;
}

/**
 * Independent attendance reference implementation.
 *
 * Each card may be skipped or assigned to exactly one selected person shown on
 * that card. The dynamic-programming state records the subset of selected
 * players represented so far.
 */
function referenceMaximumRepresented(cards, selectedPlayerIds) {
  const playerIndex = new Map(
    selectedPlayerIds.map((personId, index) => [personId, index])
  );
  let reachable = new Set([0]);

  for (const card of cards) {
    const optionBits = card.relationalIdentityOptions
      .filter((personId) => playerIndex.has(personId))
      .map((personId) => 1 << playerIndex.get(personId));
    const next = new Set(reachable);
    for (const representedMask of reachable) {
      for (const optionBit of optionBits) {
        next.add(representedMask | optionBit);
      }
    }
    reachable = next;
  }

  let maximum = 0;
  for (const representedMask of reachable) {
    maximum = Math.max(maximum, popcount(representedMask));
  }
  return maximum;
}

function resultMap(result) {
  return new Map(
    result.handResults.map((hand) => [hand.handId, hand.qualifyingCombinationCount])
  );
}

export function validateAttendanceProbability({ samplesPerRoster = 2000 } = {}) {
  const checks = [];
  const failures = [];

  function check(name, condition, details = "") {
    if (condition) {
      checks.push(`✓ ${name}${details ? ` — ${details}` : ""}`);
    } else {
      failures.push(`${name}${details ? ` — ${details}` : ""}`);
    }
  }

  const sixPlayerGameplay = getAttendanceHands({
    selectedPlayerCount: 6,
    format: GAME_FORMAT.FIVE_CARD_DRAW,
    useVirtualSelf: true,
  });
  const sixPlayerProbability = getAttendanceProbabilityHands({
    selectedPlayerCount: 6,
    format: GAME_FORMAT.FIVE_CARD_DRAW,
  });
  const sixPlayerRanking = getAttendanceRankingRules({
    selectedPlayerCount: 6,
    format: GAME_FORMAT.FIVE_CARD_DRAW,
    useVirtualSelf: true,
  });

  check(
    "Six-player five-card gameplay offers 4, 5, and 6 represented players",
    JSON.stringify(sixPlayerGameplay.map((hand) => hand.requiredCount)) ===
      JSON.stringify([4, 5, 6])
  );
  check(
    "Six-player five-card probability ranking stops at five physical players",
    JSON.stringify(sixPlayerProbability.map((hand) => hand.requiredCount)) ===
      JSON.stringify([4, 5])
  );
  const sixRule = sixPlayerRanking.find(
    (rule) => rule.gameplayRequiredCount === 6
  );
  check(
    "Six Players Represented shares the physical rank of Five Players Represented",
    sixRule?.probabilityRequiredCount === 5 &&
      sixRule?.sharesPhysicalMaximumRank === true
  );

  const eightPlayerRanking = getAttendanceRankingRules({
    selectedPlayerCount: 8,
    format: GAME_FORMAT.TEXAS_HOLDEM,
    useVirtualSelf: true,
  });
  const eightRule = eightPlayerRanking.find(
    (rule) => rule.gameplayRequiredCount === 8
  );
  check(
    "Eight Players Represented shares the physical rank of Seven Players Represented",
    eightRule?.probabilityRequiredCount === 7 &&
      eightRule?.sharesPhysicalMaximumRank === true
  );

  for (const playerCount of [2, 3, 4]) {
    const withoutSelf = getAttendanceHands({
      selectedPlayerCount: playerCount,
      format: GAME_FORMAT.FIVE_CARD_DRAW,
      useVirtualSelf: false,
    });
    const withSelf = getAttendanceHands({
      selectedPlayerCount: playerCount,
      format: GAME_FORMAT.FIVE_CARD_DRAW,
      useVirtualSelf: true,
    });
    check(
      `Virtual self does not alter attendance hands with ${playerCount} players`,
      JSON.stringify(withSelf) === JSON.stringify(withoutSelf)
    );
  }

  const examples = [
    {
      name: "One 8 represents only one of three brothers",
      cards: ["8C"],
      roster: ["dopey", "doc", "bashful"],
      expected: 1,
    },
    {
      name: "Mixed household portraits can represent four selected players",
      cards: ["10S", "JS", "AS", "7S", "2C"],
      roster: ["sleepy", "steak", "ball", "happy", "light"],
      expected: 4,
    },
    {
      name: "Five physical cards can represent five selected players",
      cards: ["10H", "JS", "AS", "7H", "7S"],
      roster: ["sleepy", "steak", "ball", "happy", "light"],
      expected: 5,
    },
  ];

  for (const example of examples) {
    const cards = example.cards.map((cardId) => cardById[cardId]);
    const profile = createFiveCardProfile(cards, {
      selectedPlayerIds: example.roster,
      useVirtualSelf: false,
      playerId: null,
    });
    const actual = maximumRepresentedPlayers(profile, example.roster, false);
    check(example.name, actual === example.expected, `expected ${example.expected}, got ${actual}`);
  }

  const random = seededRandom();
  const sampledRosters = [
    ["happy", "light"],
    ["dopey", "doc", "bashful"],
    ["sleepy", "steak", "ball", "happy"],
    ["sleepy", "steak", "ball", "happy", "light", "queen"],
  ];

  for (const roster of sampledRosters) {
    let mismatch = null;
    for (let sample = 0; sample < samplesPerRoster; sample += 1) {
      const cards = sampleFiveCards(random);
      const profile = createFiveCardProfile(cards, {
        selectedPlayerIds: roster,
        useVirtualSelf: false,
        playerId: null,
      });
      const fast = maximumRepresentedPlayers(profile, roster, false);
      const reference = referenceMaximumRepresented(cards, roster);
      if (fast !== reference) {
        mismatch = `${cards.map((card) => card.id).join(",")}: fast ${fast}, reference ${reference}`;
        break;
      }
    }
    check(
      `Fast attendance assignment matches independent DP for ${roster.length}-player roster`,
      mismatch === null,
      mismatch ?? `${samplesPerRoster} sampled hands`
    );
  }

  const regressionCases = [
    {
      roster: ["happy", "light"],
      expected: { attendance_2_of_2: 249123 },
    },
    {
      roster: ["dopey", "doc", "bashful"],
      expected: {
        attendance_2_of_3: 1229105,
        attendance_3_of_3: 283205,
      },
    },
    {
      roster: ["sleepy", "steak", "ball", "happy"],
      expected: {
        attendance_3_of_4: 154573,
        attendance_4_of_4: 6226,
      },
    },
    {
      roster: ["sleepy", "steak", "ball", "happy", "light", "queen"],
      expected: {
        attendance_4_of_6: 64099,
        attendance_5_of_6: 2046,
      },
    },
  ];

  for (const regression of regressionCases) {
    const result = calculateFiveCardProbabilitiesExactSync({
      includedJokerIds: [],
      selectedPlayerIds: regression.roster,
      handIds: [BUILT_IN_HAND.ATTENDANCE_FAMILY],
      useVirtualSelf: false,
    });
    const counts = resultMap(result);
    for (const [handId, expectedCount] of Object.entries(regression.expected)) {
      check(
        `${handId} exact 53-card count is stable`,
        counts.get(handId) === expectedCount,
        `expected ${expectedCount}, got ${counts.get(handId)}`
      );
    }
    check(
      `${regression.roster.length}-player attendance counts are cumulative`,
      result.handResults.every(
        (hand, index, all) =>
          index === 0 ||
          hand.qualifyingCombinationCount <=
            all[index - 1].qualifyingCombinationCount
      )
    );
  }

  const sixRoster = ["sleepy", "steak", "ball", "happy", "light", "queen"];
  const withoutGameplaySelf = calculateFiveCardProbabilitiesExactSync({
    includedJokerIds: [],
    selectedPlayerIds: sixRoster,
    handIds: [BUILT_IN_HAND.ATTENDANCE_FAMILY],
    useVirtualSelf: false,
  });
  const withGameplaySelf = calculateFiveCardProbabilitiesExactSync({
    includedJokerIds: [],
    selectedPlayerIds: sixRoster,
    handIds: [BUILT_IN_HAND.ATTENDANCE_FAMILY],
    useVirtualSelf: true,
  });
  check(
    "Turning on gameplay virtual self does not change attendance probability counts",
    JSON.stringify(
      withoutGameplaySelf.handResults.map((hand) => [
        hand.handId,
        hand.qualifyingCombinationCount,
      ])
    ) ===
      JSON.stringify(
        withGameplaySelf.handResults.map((hand) => [
          hand.handId,
          hand.qualifyingCombinationCount,
        ])
      )
  );
  check(
    "Five-card probability output never creates a six-player physical probability hand",
    withGameplaySelf.handResults.every(
      (hand) => hand.requiredPlayerCount <= 5
    )
  );

  return Object.freeze({
    valid: failures.length === 0,
    checks: Object.freeze(checks),
    failures: Object.freeze(failures),
    samplesPerRoster,
  });
}
