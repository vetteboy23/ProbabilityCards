import { PERSON } from "./people.js";
import {
  BUILT_IN_HAND,
  OPTIONAL_HAND,
  HAND_EVALUATOR,
  handDefinitions
} from "./hands.js";
import {
  POKER_CATEGORY,
  classifyFiveCardPoker,
  classifyBestPokerHand,
  evaluateAttendanceHands,
  evaluateHand,
  evaluateHands,
  handEvaluatorMetadata,
  qualifyingHands,
} from "./handEvaluator.js";


function reporter() {
  const checks = [];
  return {
    check(name, passed, details = "") {
      checks.push(Object.freeze({ name, passed: Boolean(passed), details }));
    },
    finish() {
      const passedChecks = checks.filter((item) => item.passed).length;
      return Object.freeze({
        passed: passedChecks === checks.length,
        totalChecks: checks.length,
        passedChecks,
        failedChecks: checks.length - passedChecks,
        checks: Object.freeze(checks),
      });
    },
  };
}

function matched(handId, cards, context = {}) {
  return evaluateHand(handId, cards, context).matched === true;
}

function notMatched(handId, cards, context = {}) {
  return evaluateHand(handId, cards, context).matched === false;
}

export function validateHandEvaluator() {
  const report = reporter();
  const check = report.check;

  // Ordinary poker categories.
  const pokerExamples = [
    [POKER_CATEGORY.ROYAL_FLUSH, ["10H", "JH", "QH", "KH", "AH"]],
    [POKER_CATEGORY.STRAIGHT_FLUSH, ["5D", "6D", "7D", "8D", "9D"]],
    [POKER_CATEGORY.FOUR_OF_A_KIND, ["2C", "2D", "2H", "2S", "KH"]],
    [POKER_CATEGORY.FULL_HOUSE, ["3C", "3D", "3H", "4C", "4D"]],
    [POKER_CATEGORY.FLUSH, ["2H", "5H", "8H", "JH", "KH"]],
    [POKER_CATEGORY.STRAIGHT, ["AC", "2D", "3H", "4C", "5S"]],
    [POKER_CATEGORY.THREE_OF_A_KIND, ["6C", "6D", "6H", "9C", "KH"]],
    [POKER_CATEGORY.TWO_PAIR, ["7C", "7D", "9C", "9D", "KH"]],
    [POKER_CATEGORY.ONE_PAIR, ["10C", "10D", "2H", "6S", "KH"]],
    [POKER_CATEGORY.HIGH_CARD, ["2C", "5D", "8H", "JS", "KC"]],
  ];
  for (const [category, cards] of pokerExamples) {
    check(`Five-card classifier recognizes ${category}`, classifyFiveCardPoker(cards).category === category);
  }
  check(
    "Seven-card classifier chooses the strongest five-card subset",
    classifyBestPokerHand(["10H", "JH", "QH", "KH", "AH", "2C", "2D"]).category ===
      POKER_CATEGORY.ROYAL_FLUSH
  );
  check(
    "Crown does not complete an ordinary straight",
    classifyFiveCardPoker(["10C", "JD", "QH", "KS", "CROWN_S"]).category === POKER_CATEGORY.HIGH_CARD
  );
  check(
    "Ranked Joker does not complete an ordinary straight",
    classifyFiveCardPoker(["10C", "JD", "QH", "KS", "JOKER_KICK"]).category === POKER_CATEGORY.HIGH_CARD
  );
  check(
    "Two Jokers form an ordinary pair",
    classifyFiveCardPoker(["JOKER_KICK", "JOKER_MATERNAL", "2C", "6D", "9H"]).category ===
      POKER_CATEGORY.ONE_PAIR
  );
  check(
    "Ordinary hand evaluator matches only the best category",
    matched(BUILT_IN_HAND.ROYAL_FLUSH, ["10H", "JH", "QH", "KH", "AH", "2C", "2D"], {
      format: "texas_holdem",
    }) &&
      notMatched(BUILT_IN_HAND.STRAIGHT_FLUSH, ["10H", "JH", "QH", "KH", "AH", "2C", "2D"], {
        format: "texas_holdem",
      })
  );

  // Echoes.
  check("Echo Pair recognizes two Sleepy representations", matched(BUILT_IN_HAND.ECHO_PAIR, ["10S", "10H"]));
  check("One physical card cannot create an Echo Pair", notMatched(BUILT_IN_HAND.ECHO_PAIR, ["10S"]));
  check(
    "Virtual self can complete an Echo Pair",
    matched(BUILT_IN_HAND.ECHO_PAIR, ["10S"], {
      playerId: PERSON.SLEEPY,
      useVirtualSelf: true,
    })
  );
  check(
    "Echo Two Pair assigns two different people twice",
    matched(BUILT_IN_HAND.ECHO_TWO_PAIR, ["8C", "8D", "8H", "8S"])
  );
  check(
    "Echo Three of a Kind recognizes three representations",
    matched(BUILT_IN_HAND.ECHO_THREE_OF_A_KIND, ["2C", "2D", "8H"])
  );
  check(
    "Echo Full House recognizes 3-and-2 pattern",
    matched(BUILT_IN_HAND.ECHO_FULL_HOUSE, ["3C", "3D", "8H", "4C", "8S"])
  );
  check(
    "Echo Four of a Kind recognizes four representations",
    matched(BUILT_IN_HAND.ECHO_FOUR_OF_A_KIND, ["2C", "2D", "2H", "8S"])
  );

  // Built-in relationship hands.
  check("Married Couple recognizes separate spouse cards", matched(BUILT_IN_HAND.MARRIED_COUPLE, ["3C", "JC"]));
  check("A wedding portrait alone cannot satisfy Married Couple", notMatched(BUILT_IN_HAND.MARRIED_COUPLE, ["3S"]));
  check(
    "Virtual self can complete Married Couple",
    matched(BUILT_IN_HAND.MARRIED_COUPLE, ["JC"], {
      playerId: PERSON.SNOW_WHITE,
      useVirtualSelf: true,
    })
  );
  check("Happy and Light recognizes separate slots", matched(BUILT_IN_HAND.HAPPY_AND_LIGHT, ["7S", "AC"]));
  check("One 7S cannot be both Happy and Light", notMatched(BUILT_IN_HAND.HAPPY_AND_LIGHT, ["7S"]));
  check("Three Brothers accepts an 8 for one brother", matched(BUILT_IN_HAND.THREE_BROTHERS, ["2C", "6D", "8H"]));
  check("One 8 cannot satisfy Three Brothers", notMatched(BUILT_IN_HAND.THREE_BROTHERS, ["8H"]));
  check("Three Sisters recognizes three distinct sisters", matched(BUILT_IN_HAND.THREE_SISTERS, ["3C", "4D", "8H"]));
  check("Repeated Snow White cards are not Three Sisters", notMatched(BUILT_IN_HAND.THREE_SISTERS, ["3C", "3D", "3H"]));
  check("Four Sisters recognizes four distinct sisters", matched(BUILT_IN_HAND.FOUR_SISTERS, ["3C", "4D", "5H", "8S"]));
  check("Five Sisters recognizes all five sister slots", matched(BUILT_IN_HAND.FIVE_SISTERS, ["3C", "4D", "5H", "7C", "10D"]));
  check("The Three Kids recognizes Cube, Ball, and Net", matched(BUILT_IN_HAND.THREE_KIDS, ["AD", "AS", "AH"]));
  check("Three at the Grill recognizes parents and one child", matched(BUILT_IN_HAND.THREE_AT_THE_GRILL, ["10H", "JS", "AS"]));
  check("One 10S cannot fill all Grill slots", notMatched(BUILT_IN_HAND.THREE_AT_THE_GRILL, ["10S"]));
  check(
    "Virtual Sleepy can help complete Three at the Grill",
    matched(BUILT_IN_HAND.THREE_AT_THE_GRILL, ["JS", "AS"], {
      playerId: PERSON.SLEEPY,
      useVirtualSelf: true,
    })
  );
  check("Four at the Grill recognizes two children", matched(BUILT_IN_HAND.FOUR_AT_THE_GRILL, ["10H", "JS", "AD", "AS"]));
  check("Five at the Grill recognizes the complete household", matched(BUILT_IN_HAND.FIVE_AT_THE_GRILL, ["10H", "JS", "AD", "AS", "AH"]));

  // Exact-card hands.
  check("Jersey Pair requires JS and AS", matched(BUILT_IN_HAND.JERSEY_PAIR, ["JS", "AS"]));
  check("Jersey Pair rejects a different Ace", notMatched(BUILT_IN_HAND.JERSEY_PAIR, ["JS", "AC"]));
  const dancers = evaluateHand(BUILT_IN_HAND.DANCERS, ["2C", "3D"]);
  check("Dancers is marked probability-only", dancers.matched === null && dancers.probabilityOnly && !dancers.qualificationAvailable);
  check("Family Album requires 7S and 10S", matched(BUILT_IN_HAND.FAMILY_ALBUM, ["7S", "10S"]));
  check("Grandparents Album requires QS and KS", matched(BUILT_IN_HAND.GRANDPARENTS_ALBUM, ["QS", "KS"]));
  check("Fun Flight accepts 9S plus KS", matched(BUILT_IN_HAND.FUN_FLIGHT, ["9S", "KS"]));
  check("Fun Flight accepts 9S plus Kick Joker", matched(BUILT_IN_HAND.FUN_FLIGHT, ["9S", "JOKER_KICK"]));
  check("Fun Flight rejects Pipe Joker", notMatched(BUILT_IN_HAND.FUN_FLIGHT, ["9S", "JOKER_MATERNAL"]));
  check("Full Ancestry accepts one wedding Spade", matched(BUILT_IN_HAND.FULL_ANCESTRY, ["CROWN_S", "QS", "KS", "4S"]));
  check("Full Ancestry rejects a non-wedding fourth card", notMatched(BUILT_IN_HAND.FULL_ANCESTRY, ["CROWN_S", "QS", "KS", "7S"]));

  // Selectable hands.
  check("Grandparent and Ace accepts a portrait plus Ace child", matched(OPTIONAL_HAND.GRANDPARENT_AND_ACE, ["KS", "AS"]));
  check("Grandparent and Ace rejects a non-Ace child portrait", notMatched(OPTIONAL_HAND.GRANDPARENT_AND_ACE, ["KS", "10S"]));
  check(
    "Virtual child can complete Grandparent and Ace",
    matched(OPTIONAL_HAND.GRANDPARENT_AND_ACE, ["KS"], {
      playerId: PERSON.BALL,
      useVirtualSelf: true,
    })
  );
  check("Heritage recognizes Queen with QS", matched(OPTIONAL_HAND.HERITAGE, ["QS", "QC"]));
  check("Heritage allows Crown to represent the parent", matched(OPTIONAL_HAND.HERITAGE, ["QS", "CROWN_S"]));
  check("One QS cannot fill both Heritage slots", notMatched(OPTIONAL_HAND.HERITAGE, ["QS"]));
  check("Double Heritage recognizes both portraits and both parents", matched(OPTIONAL_HAND.DOUBLE_HERITAGE, ["QS", "KS", "QC", "KC"]));
  check("Double Heritage lets Crown fill only one parent slot", matched(OPTIONAL_HAND.DOUBLE_HERITAGE, ["QS", "KS", "CROWN_S", "QC"]));
  check("Crown alone cannot fill both Double Heritage parent slots", notMatched(OPTIONAL_HAND.DOUBLE_HERITAGE, ["QS", "KS", "CROWN_S"]));
  check(
    "Virtual King can fill the remaining Double Heritage parent slot",
    matched(OPTIONAL_HAND.DOUBLE_HERITAGE, ["QS", "KS", "CROWN_S"], {
      playerId: PERSON.KING,
      useVirtualSelf: true,
    })
  );
  check("Brother Time accepts five brother-capable cards", matched(OPTIONAL_HAND.BROTHER_TIME, ["2C", "2D", "6C", "8H", "8S"]));
  check("Brother Time rejects a non-brother fifth card", notMatched(OPTIONAL_HAND.BROTHER_TIME, ["2C", "2D", "6C", "8H", "AH"]));
  check(
    "Virtual brother supplies one Brother Time slot",
    matched(OPTIONAL_HAND.BROTHER_TIME, ["2C", "6C", "8H", "8S"], {
      playerId: PERSON.BASHFUL,
      useVirtualSelf: true,
    })
  );
  check("Sister Time accepts five sister-capable cards", matched(OPTIONAL_HAND.SISTER_TIME, ["3C", "4D", "5H", "7C", "8S"]));
  check("Dynamic Duo recognizes a natural pair", matched(OPTIONAL_HAND.DYNAMIC_DUO, ["2C", "3D"]));
  check("Dynamic Duo recognizes one natural card plus an 8", matched(OPTIONAL_HAND.DYNAMIC_DUO, ["2C", "8H"]));
  check("Two 8s alone are not Dynamic Duo", notMatched(OPTIONAL_HAND.DYNAMIC_DUO, ["8C", "8D"]));
  check(
    "Virtual self plus an 8 can complete Dynamic Duo",
    matched(OPTIONAL_HAND.DYNAMIC_DUO, ["8H"], {
      playerId: PERSON.DOPEY,
      useVirtualSelf: true,
    })
  );
  check("Family Sleepover accepts an Ace child with a wedding portrait", matched(OPTIONAL_HAND.FAMILY_SLEEPOVER, ["AS", "3S"]));
  check("Family Sleepover accepts separate non-parent spouses", matched(OPTIONAL_HAND.FAMILY_SLEEPOVER, ["AS", "3C", "JC"]));
  check("Family Sleepover excludes a child’s own parents", notMatched(OPTIONAL_HAND.FAMILY_SLEEPOVER, ["AS", "10H", "JS"]));
  check("Family Sleepover accepts Queen and King as grandparents", matched(OPTIONAL_HAND.FAMILY_SLEEPOVER, ["AS", "QC", "KC"]));
  check(
    "Virtual Ace child can complete Family Sleepover",
    matched(OPTIONAL_HAND.FAMILY_SLEEPOVER, ["3S"], {
      playerId: PERSON.BALL,
      useVirtualSelf: true,
    })
  );
  check("Same-Suit Relationship Pair accepts two brothers", matched(OPTIONAL_HAND.SAME_SUIT_RELATIONSHIP_PAIR, ["2D", "6D"]));
  check("Same-Suit Relationship Pair accepts two sisters", matched(OPTIONAL_HAND.SAME_SUIT_RELATIONSHIP_PAIR, ["3C", "4C"]));
  check("Same-Suit Relationship Pair accepts a married couple", matched(OPTIONAL_HAND.SAME_SUIT_RELATIONSHIP_PAIR, ["3C", "JC"]));
  check("Same-Suit Relationship Pair accepts parent and child", matched(OPTIONAL_HAND.SAME_SUIT_RELATIONSHIP_PAIR, ["10S", "AS"]));
  check("Same-Suit Relationship Pair rejects different suits", notMatched(OPTIONAL_HAND.SAME_SUIT_RELATIONSHIP_PAIR, ["3C", "4D"]));
  check(
    "Virtual self cannot complete a suited relationship",
    notMatched(OPTIONAL_HAND.SAME_SUIT_RELATIONSHIP_PAIR, ["JC"], {
      playerId: PERSON.SNOW_WHITE,
      useVirtualSelf: true,
    })
  );

  // Attendance generation.
  const twoPlayers = evaluateAttendanceHands(["2C"], {
    selectedPlayerIds: [PERSON.DOPEY, PERSON.DOC],
    playerId: PERSON.DOC,
    useVirtualSelf: true,
  });
  check("Two-player attendance ignores virtual self", twoPlayers.maximumRepresented === 1 && twoPlayers.matchedHands.length === 0);
  const threePlayers = evaluateAttendanceHands(["2C", "6D"], {
    selectedPlayerIds: [PERSON.DOPEY, PERSON.DOC, PERSON.BASHFUL],
    playerId: PERSON.BASHFUL,
    useVirtualSelf: true,
  });
  check("Three-player attendance counts two physical players", threePlayers.maximumRepresented === 2 && threePlayers.matchedHands.length === 1);
  const fivePlayers = evaluateAttendanceHands(["10S", "JS", "AS", "7S"], {
    format: "five_card_draw",
    selectedPlayerIds: [PERSON.SLEEPY, PERSON.STEAK, PERSON.BALL, PERSON.HAPPY, PERSON.LIGHT],
    playerId: PERSON.LIGHT,
    useVirtualSelf: true,
  });
  check("Five-player attendance can use virtual self", fivePlayers.maximumRepresented === 5 && fivePlayers.matchedHands.length === 2);
  check(
    "Attendance assigns each multi-person card to one player only",
    new Set(fivePlayers.assignments.map((item) => item.contributorId)).size === fivePlayers.assignments.length
  );
  check(
    "Attendance family evaluator returns generated matches",
    evaluateHand(BUILT_IN_HAND.ATTENDANCE_FAMILY, ["10S", "JS", "AS", "7S"], {
      selectedPlayerIds: [PERSON.SLEEPY, PERSON.STEAK, PERSON.BALL, PERSON.HAPPY, PERSON.LIGHT],
      playerId: PERSON.LIGHT,
      useVirtualSelf: true,
    }).details.matchedHands.length === 2
  );

  // Public APIs and coverage.
  check("Every declared evaluator has executable logic", handEvaluatorMetadata.allKnownEvaluatorTypesImplemented);
  check(
    "Evaluator metadata count matches declared evaluator types",
    handEvaluatorMetadata.executableEvaluatorCount === Object.values(HAND_EVALUATOR).length
  );
  const evaluated = evaluateHands(
    [
      handDefinitions.find((hand) => hand.id === BUILT_IN_HAND.JERSEY_PAIR),
      handDefinitions.find((hand) => hand.id === BUILT_IN_HAND.FAMILY_ALBUM),
    ],
    ["JS", "AS", "7S", "10S"]
  );
  check("evaluateHands evaluates multiple definitions", evaluated.length === 2 && evaluated.every((item) => item.matched));
  check(
    "qualifyingHands filters nonqualifying results",
    qualifyingHands(
      [
        handDefinitions.find((hand) => hand.id === BUILT_IN_HAND.JERSEY_PAIR),
        handDefinitions.find((hand) => hand.id === BUILT_IN_HAND.GRANDPARENTS_ALBUM),
      ],
      ["JS", "AS"]
    ).length === 1
  );

  return report.finish();
}

export function formatHandEvaluatorValidationReport(report) {
  const lines = [
    report.passed ? "HAND EVALUATOR VALIDATION PASSED" : "HAND EVALUATOR VALIDATION FAILED",
    `${report.passedChecks}/${report.totalChecks} checks passed`,
    "",
  ];
  for (const item of report.checks) {
    lines.push(`${item.passed ? "✓" : "✗"} ${item.name}${item.details ? ` — ${item.details}` : ""}`);
  }
  return lines.join("\n");
}
