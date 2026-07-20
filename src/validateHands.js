import { people, PERSON } from "./people.js";
import { cardById } from "./cards.js";
import {
  HAND_AVAILABILITY,
  HAND_CATEGORY,
  HAND_EVALUATOR,
  RANKING_MODE,
  RANKING_TIER,
  OPTIONAL_HAND,
  BUILT_IN_HAND,
  handDefinitions,
  handById,
  builtInHands,
  selectableHands,
  generatedHandFamilies,
  selectableHandIds,
  fixedRankingTiers,
  recognizedCouples,
  grandparentIds,
  grandchildIds,
  sleepyChildIds,
  handLibraryMetadata,
  getHandsForGame,
} from "./hands.js";

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

function collectCardIds(value, keyPath = "", results = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectCardIds(child, `${keyPath}[${index}]`, results));
    return results;
  }
  if (!value || typeof value !== "object") return results;

  for (const [key, child] of Object.entries(value)) {
    const path = keyPath ? `${keyPath}.${key}` : key;
    if (key === "requiredCardIds" || key === "oneOfCardIds" || key === "requiredPortraitCardIds") {
      for (const cardId of child) results.push({ cardId, path });
    } else if (key === "portraitCardId" || key === "crownCardId" || key === "weddingCardId") {
      if (child) results.push({ cardId: child, path });
    } else if (key === "alternatives" && Array.isArray(child)) {
      for (const alternative of child) {
        if (Array.isArray(alternative) && alternative.every((item) => typeof item === "string")) {
          for (const cardId of alternative) results.push({ cardId, path });
        } else {
          collectCardIds(alternative, path, results);
        }
      }
    } else {
      collectCardIds(child, path, results);
    }
  }
  return results;
}

function collectPersonIds(value, keyPath = "", results = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectPersonIds(child, `${keyPath}[${index}]`, results));
    return results;
  }
  if (!value || typeof value !== "object") return results;

  const personKeys = new Set([
    "people",
    "partners",
    "peoplePool",
    "requiredAdults",
    "childrenPool",
    "grandparentPeople",
    "childPeople",
    "parentPeople",
    "grandparentsAlternative",
    "parents",
    "children",
  ]);

  for (const [key, child] of Object.entries(value)) {
    const path = keyPath ? `${keyPath}.${key}` : key;
    if (personKeys.has(key) && Array.isArray(child)) {
      for (const personId of child) {
        if (typeof personId === "string") results.push({ personId, path });
      }
    } else if (key === "parentPerson" && typeof child === "string") {
      results.push({ personId: child, path });
    } else if (key === "personPairs" && Array.isArray(child)) {
      for (const pair of child) {
        for (const personId of pair) results.push({ personId, path });
      }
    } else if (key === "childParents" && child && typeof child === "object") {
      for (const [childId, parentIds] of Object.entries(child)) {
        results.push({ personId: childId, path: `${path}.${childId}` });
        for (const personId of parentIds) results.push({ personId, path: `${path}.${childId}` });
      }
    } else {
      collectPersonIds(child, path, results);
    }
  }
  return results;
}

export function validateHandLibrary() {
  const report = reporter();
  const check = report.check;
  const knownHandIds = new Set(handDefinitions.map((hand) => hand.id));
  const knownPeople = new Set(Object.keys(people));
  const knownCards = new Set(Object.keys(cardById));
  const knownEvaluators = new Set(Object.values(HAND_EVALUATOR));
  const knownCategories = new Set(Object.values(HAND_CATEGORY));
  const knownAvailability = new Set(Object.values(HAND_AVAILABILITY));
  const knownRankingModes = new Set(Object.values(RANKING_MODE));

  check("Every hand ID is unique", knownHandIds.size === handDefinitions.length);
  check("handById contains every definition", Object.keys(handById).length === handDefinitions.length);
  check("There are eight selectable hands", selectableHands.length === 8, `${selectableHands.length}`);
  check("There is one generated attendance family", generatedHandFamilies.length === 1);
  check("The library contains built-in hands", builtInHands.length > 0);

  for (const hand of handDefinitions) {
    check(`${hand.id} has a display name`, Boolean(hand.name));
    check(`${hand.id} uses a known availability`, knownAvailability.has(hand.availability));
    check(`${hand.id} uses a known category`, knownCategories.has(hand.category));
    check(`${hand.id} uses a known evaluator`, knownEvaluators.has(hand.evaluator));
    check(`${hand.id} uses a known ranking mode`, knownRankingModes.has(hand.rankingMode));
    check(`${hand.id} has supported formats`, hand.supportedFormats.length > 0);
    check(
      `${hand.id} availability flags are exclusive`,
      [hand.builtIn, hand.selectable, hand.generated].filter(Boolean).length === 1
    );
    check(
      `${hand.id} has a valid minimum physical-card count`,
      Number.isInteger(hand.minimumPhysicalCards) && hand.minimumPhysicalCards >= 0
    );
    check(
      `${hand.id} has a valid contributing-slot count`,
      Number.isInteger(hand.minimumContributingSlots) &&
        hand.minimumContributingSlots >= hand.minimumPhysicalCards
    );

    for (const { cardId, path } of collectCardIds(hand.requirements)) {
      check(`${hand.id} references valid card ${cardId}`, knownCards.has(cardId), path);
    }
    for (const { personId, path } of collectPersonIds(hand.requirements)) {
      check(`${hand.id} references valid person ${personId}`, knownPeople.has(personId), path);
    }
  }

  check(
    "Selectable IDs match the approved optional-hand constants",
    new Set(selectableHandIds).size === Object.keys(OPTIONAL_HAND).length &&
      Object.values(OPTIONAL_HAND).every((id) => selectableHandIds.includes(id))
  );

  check(
    "All selectable hands expose setup descriptions",
    selectableHands.every((hand) => hand.shortDescription && hand.ruleSummary)
  );

  check(
    "No exact-card built-in hand is a one-card special",
    builtInHands
      .filter((hand) => hand.exactCardRequirement)
      .every((hand) => hand.minimumPhysicalCards >= 2)
  );

  const rareTier = fixedRankingTiers[RANKING_TIER.RARE_EXACT_PAIR];
  check("Rare exact-pair tier exists", Boolean(rareTier));
  check("Rare exact-pair tier contains five hands", rareTier.handIds.length === 5);
  check(
    "Every rare-pair member uses the fixed tier",
    rareTier.handIds.every(
      (id) =>
        handById[id].rankingMode === RANKING_MODE.FIXED_TIER &&
        handById[id].rankingTier === RANKING_TIER.RARE_EXACT_PAIR
    )
  );

  check(
    "Jersey Pair is exactly JS and AS",
    JSON.stringify(handById[BUILT_IN_HAND.JERSEY_PAIR].requirements.requiredCardIds) ===
      JSON.stringify(["JS", "AS"])
  );
  check(
    "Dancers is an abstract fixed pair without stored card IDs",
    handById[BUILT_IN_HAND.DANCERS].evaluator ===
      HAND_EVALUATOR.FIXED_SPECIFIC_CARD_PAIR_PROBABILITY &&
      handById[BUILT_IN_HAND.DANCERS].requirements.specificPhysicalCardCount === 2 &&
      !handById[BUILT_IN_HAND.DANCERS].requirements.requiredCardIds
  );
  check(
    "Family Album is exactly 7S and 10S",
    JSON.stringify(handById[BUILT_IN_HAND.FAMILY_ALBUM].requirements.requiredCardIds) ===
      JSON.stringify(["7S", "10S"])
  );
  check(
    "Grandparents Album is exactly QS and KS",
    JSON.stringify(handById[BUILT_IN_HAND.GRANDPARENTS_ALBUM].requirements.requiredCardIds) ===
      JSON.stringify(["QS", "KS"])
  );
  check(
    "Fun Flight supports KS or Kick Joker",
    JSON.stringify(handById[BUILT_IN_HAND.FUN_FLIGHT].requirements.alternatives) ===
      JSON.stringify([["9S", "KS"], ["9S", "JOKER_KICK"]])
  );
  check(
    "Full Ancestry requires Crown, both grandparent portraits, and one wedding card",
    JSON.stringify(handById[BUILT_IN_HAND.FULL_ANCESTRY].requirements.requiredCardIds) ===
      JSON.stringify(["CROWN_S", "QS", "KS"]) &&
      JSON.stringify(handById[BUILT_IN_HAND.FULL_ANCESTRY].requirements.oneOfCardIds) ===
        JSON.stringify(["3S", "4S", "5S"])
  );

  check("There are seven recognized couples", recognizedCouples.length === 7);
  check("There are four grandparents", grandparentIds.length === 4);
  check("There are four Ace children", grandchildIds.length === 4);
  check("There are three Grill children", sleepyChildIds.length === 3);

  check(
    "Three Brothers uses Dopey, Doc, and Bashful",
    JSON.stringify(handById[BUILT_IN_HAND.THREE_BROTHERS].requirements.people) ===
      JSON.stringify([PERSON.DOPEY, PERSON.DOC, PERSON.BASHFUL])
  );
  check(
    "Three Kids uses Cube, Ball, and Net",
    JSON.stringify(handById[BUILT_IN_HAND.THREE_KIDS].requirements.people) ===
      JSON.stringify([PERSON.CUBE, PERSON.BALL, PERSON.NET])
  );

  check(
    "Five at the Grill requires all three children",
    handById[BUILT_IN_HAND.FIVE_AT_THE_GRILL].requirements.requiredChildCount === 3
  );
  check(
    "Multi-person cards are limited to one identity per hand slot",
    handLibraryMetadata.relationalCardMaximumPeoplePerPhysicalCard === 1
  );
  check("Jokers remain non-wild", handLibraryMetadata.jokersAreWild === false);
  check("Virtual self is not a physical card", handLibraryMetadata.virtualSelfIsPhysicalCard === false);
  check("Virtual self has no suit", handLibraryMetadata.virtualSelfHasSuit === false);
  check("Probability calculations exclude virtual self", handLibraryMetadata.probabilityUsesVirtualSelf === false);
  check("Probability output uses one shared ranking", handLibraryMetadata.probabilityRankingScope === "shared_table_ranking");

  const builtInOnly = getHandsForGame({ selectedOptionalHandIds: [] });
  check("Empty optional selection returns only built-in hands", builtInOnly.length === builtInHands.length);

  const allSelected = getHandsForGame({ selectedOptionalHandIds: selectableHandIds });
  check(
    "Selecting all optional hands returns built-in plus eight selectable hands",
    allSelected.length === builtInHands.length + selectableHands.length
  );

  let unknownIdRejected = false;
  try {
    getHandsForGame({ selectedOptionalHandIds: ["not_a_hand"] });
  } catch (error) {
    unknownIdRejected = error instanceof RangeError;
  }
  check("Unknown optional hand IDs are rejected", unknownIdRejected);

  return report.finish();
}

export function formatHandValidationReport(report) {
  const lines = [
    report.passed ? "HAND LIBRARY VALIDATION PASSED" : "HAND LIBRARY VALIDATION FAILED",
    `${report.passedChecks}/${report.totalChecks} checks passed`,
    "",
  ];

  for (const item of report.checks) {
    lines.push(`${item.passed ? "✓" : "✗"} ${item.name}${item.details ? ` — ${item.details}` : ""}`);
  }

  return lines.join("\n");
}
