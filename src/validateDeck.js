import {
  PERSON,
  people,
  siblingIds,
  sisterIds,
  brotherIds,
  couples,
  parentChildRelationships,
  households,
} from "./people.js";
import {
  STANDARD_RANKS,
  SUIT,
  suits,
  fullDeck,
  cardById,
  buildDeck,
  provisionalIdentityAssignments,
  relationalCardRule,
  JOKER_IDS,
} from "./cards.js";

function arraysEqualAsSets(actual, expected) {
  return (
    actual.length === expected.length &&
    actual.every((value) => expected.includes(value))
  );
}

function createReporter() {
  const checks = [];

  function check(name, condition, details = "") {
    checks.push({ name, passed: Boolean(condition), details });
  }

  return {
    check,
    finish() {
      const failures = checks.filter((item) => !item.passed);
      return Object.freeze({
        passed: failures.length === 0,
        totalChecks: checks.length,
        passedChecks: checks.length - failures.length,
        failedChecks: failures.length,
        checks: Object.freeze(checks.map(Object.freeze)),
      });
    },
  };
}

export function validateDeckData() {
  const reporter = createReporter();
  const { check } = reporter;

  check("Complete deck contains 55 cards", fullDeck.length === 55, `${fullDeck.length}`);
  check("Deck without Jokers contains 53 cards", buildDeck({ includedJokerIds: [] }).length === 53);
  check(
    "Deck with only Kick's Joker contains 54 cards",
    buildDeck({ includedJokerIds: ["JOKER_KICK"] }).length === 54
  );
  check(
    "Deck with only the maternal-grandfather Joker contains 54 cards",
    buildDeck({ includedJokerIds: ["JOKER_MATERNAL"] }).length === 54
  );
  check("Deck with both Jokers contains 55 cards", buildDeck({ includedJokerIds: JOKER_IDS }).length === 55);

  const ids = fullDeck.map((card) => card.id);
  check("Every card ID is unique", new Set(ids).size === ids.length);

  const standardCards = fullDeck.filter((card) => card.tags.includes("standard_card"));
  check("There are exactly 52 standard cards", standardCards.length === 52, `${standardCards.length}`);
  check("There is exactly one Crown", fullDeck.filter((card) => card.cardType === "crown").length === 1);
  check("There are exactly two Jokers", fullDeck.filter((card) => card.cardType === "joker").length === 2);

  for (const rank of STANDARD_RANKS) {
    for (const suit of suits) {
      const suitCode = { clubs: "C", diamonds: "D", hearts: "H", spades: "S" }[suit];
      const id = `${rank}${suitCode}`;
      check(`Standard card ${id} exists`, Boolean(cardById[id]));
    }
  }

  const knownPersonIds = new Set(Object.keys(people));
  for (const card of fullDeck) {
    check(
      `${card.id} depicts only known people`,
      card.depicts.every((personId) => knownPersonIds.has(personId)),
      card.depicts.join(", ")
    );
    check(
      `${card.id} has no duplicate depicted person`,
      new Set(card.depicts).size === card.depicts.length
    );
    check(
      `${card.id} relational options match depicted people`,
      arraysEqualAsSets(card.relationalIdentityOptions, card.depicts)
    );
  }

  for (const suit of suits) {
    const code = { clubs: "C", diamonds: "D", hearts: "H", spades: "S" }[suit];
    check(
      `8${code} depicts all eight siblings`,
      arraysEqualAsSets(cardById[`8${code}`].depicts, siblingIds)
    );
  }

  check("3S depicts Snow White and Cheese", arraysEqualAsSets(cardById["3S"].depicts, [PERSON.SNOW_WHITE, PERSON.CHEESE]));
  check("4S depicts Grumpy and Old Fashioned", arraysEqualAsSets(cardById["4S"].depicts, [PERSON.GRUMPY, PERSON.OLD_FASHIONED]));
  check("5S depicts Sneezy and Beer", arraysEqualAsSets(cardById["5S"].depicts, [PERSON.SNEEZY, PERSON.BEER]));
  check("7S depicts Happy and Light", arraysEqualAsSets(cardById["7S"].depicts, [PERSON.HAPPY, PERSON.LIGHT]));
  check("9S depicts Bashful and Fly", arraysEqualAsSets(cardById["9S"].depicts, [PERSON.BASHFUL, PERSON.FLY]));
  check(
    "10S depicts Sleepy's five-person household",
    arraysEqualAsSets(cardById["10S"].depicts, [
      PERSON.SLEEPY,
      PERSON.STEAK,
      PERSON.CUBE,
      PERSON.BALL,
      PERSON.NET,
    ])
  );

  check("Jack of Spades is Steak", arraysEqualAsSets(cardById.JS.depicts, [PERSON.STEAK]));
  check("Ace of Spades is Ball", arraysEqualAsSets(cardById.AS.depicts, [PERSON.BALL]));

  check(
    "Queen of Spades depicts maternal grandparents",
    arraysEqualAsSets(cardById.QS.depicts, [PERSON.MATERNAL_GRANDMOTHER, PERSON.MATERNAL_GRANDFATHER])
  );
  check(
    "King of Spades depicts paternal grandparents",
    arraysEqualAsSets(cardById.KS.depicts, [PERSON.PATERNAL_GRANDMOTHER, PERSON.KICK])
  );
  check(
    "Crown depicts Queen and King",
    arraysEqualAsSets(cardById.CROWN_S.depicts, [PERSON.QUEEN, PERSON.KING])
  );

  check("Kick Joker represents only Kick", arraysEqualAsSets(cardById.JOKER_KICK.depicts, [PERSON.KICK]));
  check(
    "Maternal Joker represents only maternal grandfather",
    arraysEqualAsSets(cardById.JOKER_MATERNAL.depicts, [PERSON.MATERNAL_GRANDFATHER])
  );
  check(
    "Jokers are explicitly non-wild",
    fullDeck
      .filter((card) => card.cardType === "joker")
      .every((card) => card.notes?.includes("Never wild"))
  );

  check("Crown ranks between King and Ace", cardById.KS.orderValue < cardById.CROWN_S.orderValue && cardById.CROWN_S.orderValue < cardById.AS.orderValue);
  check("Jokers rank above Aces", cardById.JOKER_KICK.orderValue > cardById.AS.orderValue);
  check("Crown is excluded from ordinary straights by default", cardById.CROWN_S.straightValue === null);
  check("Ranked Jokers are excluded from ordinary straights", cardById.JOKER_KICK.straightValue === null);

  check("There are eight siblings", siblingIds.length === 8);
  check("There are five sisters", sisterIds.length === 5);
  check("There are three brothers", brotherIds.length === 3);
  check("There are four married couples", couples.length === 4);
  check("Happy and Sleepy households are defined", households.length === 2);
  check("Parent-child relationships are defined", parentChildRelationships.length === 2);

  check(
    "Each physical card may represent at most one person per relational evaluation",
    relationalCardRule.maxPeopleRepresentedPerPhysicalCardPerHandEvaluation === 1
  );

  const nonSpadeJacks = [cardById.JC, cardById.JD, cardById.JH];
  const nonSpadeAces = [cardById.AC, cardById.AD, cardById.AH];
  check(
    "Non-Spade Jack identities are marked provisional",
    nonSpadeJacks.every((card) => card.assignmentStatus === provisionalIdentityAssignments.status)
  );
  check(
    "Non-Spade Ace identities are marked provisional",
    nonSpadeAces.every((card) => card.assignmentStatus === provisionalIdentityAssignments.status)
  );

  return reporter.finish();
}

export function formatValidationReport(report) {
  const lines = [
    report.passed ? "DECK VALIDATION PASSED" : "DECK VALIDATION FAILED",
    `${report.passedChecks}/${report.totalChecks} checks passed`,
    "",
  ];

  for (const item of report.checks) {
    lines.push(`${item.passed ? "✓" : "✗"} ${item.name}${item.details ? ` — ${item.details}` : ""}`);
  }

  return lines.join("\n");
}
