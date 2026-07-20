import { buildDeck, JOKER_IDS } from "./cards.js";
import {
  BUILT_IN_HAND,
  HAND_EVALUATOR,
  HAND_CATEGORY,
  getHandsForGame,
  handById,
} from "./hands.js";
import { classifyFiveCardPoker } from "./handEvaluator.js";
import {
  createFastFiveCardMatcher,
  createFiveCardProfile,
  maximumRepresentedPlayers,
} from "./fiveCardMatcher.js";
import {
  GAME_FORMAT,
  getAttendanceProbabilityHands,
} from "./setupRules.js";
import { people } from "./people.js";
import {
  combinationCount,
  countSubsetsContainingRequiredCards,
} from "./combinatorics.js";

export const FIVE_CARD_CALCULATION_METHOD = Object.freeze({
  EXHAUSTIVE_ENUMERATION: "exhaustive_enumeration",
  CLOSED_FORM_EXACT: "closed_form_exact",
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export { combinationCount };

export function fiveCardCombinationCount(deckSize) {
  return combinationCount(deckSize, 5);
}

export function countHandsContainingSpecificCards(
  deckSize,
  requiredPhysicalCardCount,
  handSize = 5
) {
  return countSubsetsContainingRequiredCards(
    deckSize,
    requiredPhysicalCardCount,
    handSize
  );
}

function normalizeStringArray(values, fieldName, { allowEmpty = true } = {}) {
  if (!Array.isArray(values)) throw new TypeError(`${fieldName} must be an array`);
  if (!allowEmpty && values.length === 0) {
    throw new RangeError(`${fieldName} cannot be empty`);
  }
  if (values.some((value) => typeof value !== "string" || value.length === 0)) {
    throw new TypeError(`${fieldName} must contain non-empty strings`);
  }
  if (new Set(values).size !== values.length) {
    throw new RangeError(`${fieldName} cannot contain duplicates`);
  }
  return [...values];
}

function normalizeSettings(settings = {}) {
  const includedJokerIds = normalizeStringArray(
    settings.includedJokerIds ?? JOKER_IDS,
    "includedJokerIds"
  );
  for (const jokerId of includedJokerIds) {
    if (!JOKER_IDS.includes(jokerId)) {
      throw new RangeError(`Unknown Joker ID: ${jokerId}`);
    }
  }

  const selectedOptionalHandIds = normalizeStringArray(
    settings.selectedOptionalHandIds ?? [],
    "selectedOptionalHandIds"
  );
  const selectedPlayerIds = normalizeStringArray(
    settings.selectedPlayerIds ?? [],
    "selectedPlayerIds"
  );
  for (const personId of selectedPlayerIds) {
    if (!people[personId]) throw new RangeError(`Unknown selected player: ${personId}`);
  }

  const virtualSelfGameplayEnabled = Boolean(settings.useVirtualSelf);
  if (settings.playerId !== undefined && settings.playerId !== null) {
    throw new TypeError(
      "playerId is not accepted by the probability engine because rankings are shared and exclude virtual self"
    );
  }

  const requestedHandIds = settings.handIds
    ? normalizeStringArray(settings.handIds, "handIds", { allowEmpty: false })
    : null;
  if (requestedHandIds) {
    for (const handId of requestedHandIds) {
      if (!handById[handId]) throw new RangeError(`Unknown hand ID: ${handId}`);
    }
  }

  return Object.freeze({
    format: GAME_FORMAT.FIVE_CARD_DRAW,
    includedJokerIds: Object.freeze(includedJokerIds),
    selectedOptionalHandIds: Object.freeze(selectedOptionalHandIds),
    selectedPlayerIds: Object.freeze(selectedPlayerIds),
    virtualSelfGameplayEnabled,
    probabilityUsesVirtualSelf: false,
    requestedHandIds: requestedHandIds ? Object.freeze(requestedHandIds) : null,
  });
}

function isTheoreticallyPossible(hand, settings) {
  if (!hand.supportedFormats.includes(GAME_FORMAT.FIVE_CARD_DRAW)) return false;
  if (hand.minimumPhysicalCards > 5) return false;
  return hand.minimumContributingSlots <= 5;
}

function makeHandResultBase(hand) {
  return {
    handId: hand.id,
    handName: hand.name,
    description: hand.description,
    category: hand.category,
    availability: hand.availability,
    rankingMode: hand.rankingMode,
    rankingTier: hand.rankingTier,
  };
}

function makeAttendanceResultBase(definition) {
  return {
    handId: definition.id,
    handName: definition.label,
    description: `${definition.requiredCount} of the ${definition.selectedPlayerCount} selected players are represented.`,
    category: HAND_CATEGORY.ATTENDANCE,
    availability: "generated",
    rankingMode: "generated_probability",
    rankingTier: null,
  };
}

function compileExactMatcher(hand) {
  if (hand.evaluator === HAND_EVALUATOR.EXACT_CARD_SET) {
    const required = [...hand.requirements.requiredCardIds];
    return (cardIds) => required.every((cardId) => cardIds.has(cardId));
  }
  if (hand.evaluator === HAND_EVALUATOR.EXACT_CARD_ALTERNATIVES) {
    const alternatives = hand.requirements.alternatives.map((item) => [...item]);
    return (cardIds) =>
      alternatives.some((alternative) =>
        alternative.every((cardId) => cardIds.has(cardId))
      );
  }
  if (hand.evaluator === HAND_EVALUATOR.EXACT_CARD_SET_WITH_ONE_OF) {
    const required = [...hand.requirements.requiredCardIds];
    const oneOf = [...hand.requirements.oneOfCardIds];
    return (cardIds) =>
      required.every((cardId) => cardIds.has(cardId)) &&
      oneOf.some((cardId) => cardIds.has(cardId));
  }
  return null;
}

function buildCalculationPlan(settings) {
  let hands = [...getHandsForGame({
    selectedOptionalHandIds: settings.selectedOptionalHandIds,
  })];

  if (settings.requestedHandIds) {
    const requested = new Set(settings.requestedHandIds);
    hands = hands.filter((hand) => requested.has(hand.id));
  }

  const standardHands = [];
  const closedFormHands = [];
  const matcherHands = [];
  const impossibleHands = [];

  for (const hand of hands) {
    if (!isTheoreticallyPossible(hand, settings)) {
      impossibleHands.push(hand);
      continue;
    }
    if (hand.evaluator === HAND_EVALUATOR.STANDARD_POKER_CATEGORY) {
      standardHands.push(hand);
    } else if (
      hand.evaluator === HAND_EVALUATOR.FIXED_SPECIFIC_CARD_PAIR_PROBABILITY
    ) {
      closedFormHands.push(hand);
    } else {
      matcherHands.push(hand);
    }
  }

  const attendanceDefinitions =
    settings.selectedPlayerIds.length >= 2 &&
    (!settings.requestedHandIds ||
      settings.requestedHandIds.includes(BUILT_IN_HAND.ATTENDANCE_FAMILY))
      ? [...getAttendanceProbabilityHands({
          selectedPlayerCount: settings.selectedPlayerIds.length,
          format: GAME_FORMAT.FIVE_CARD_DRAW,
        })]
      : [];

  return {
    hands,
    standardHands,
    closedFormHands,
    matcherHands,
    impossibleHands,
    attendanceDefinitions,
  };
}

function createState(settings) {
  const deck = [...buildDeck({ includedJokerIds: settings.includedJokerIds })];
  const totalCombinations = fiveCardCombinationCount(deck.length);
  const plan = buildCalculationPlan(settings);
  const counts = new Map();

  for (const hand of plan.hands) counts.set(hand.id, 0);
  for (const definition of plan.attendanceDefinitions) counts.set(definition.id, 0);

  for (const hand of plan.closedFormHands) {
    counts.set(
      hand.id,
      countHandsContainingSpecificCards(
        deck.length,
        hand.requirements.specificPhysicalCardCount,
        5
      )
    );
  }

  const pokerHandByCategory = new Map(
    plan.standardHands.map((hand) => [hand.requirements.pokerCategory, hand])
  );
  const context = Object.freeze({
    format: GAME_FORMAT.FIVE_CARD_DRAW,
    playerId: null,
    useVirtualSelf: false,
    selectedPlayerIds: settings.selectedPlayerIds,
  });

  const compiledMatchers = plan.matcherHands.map((hand) => {
    const matches = createFastFiveCardMatcher(hand, context);
    if (!matches) {
      throw new Error(`No fast five-card matcher for evaluator ${hand.evaluator}`);
    }
    return { hand, matches };
  });

  const attendanceUsesSelf = false;

  const needsEnumeration =
    pokerHandByCategory.size > 0 ||
    compiledMatchers.length > 0 ||
    plan.attendanceDefinitions.length > 0;

  function processCombination(cards) {
    if (pokerHandByCategory.size > 0) {
      const poker = classifyFiveCardPoker(cards);
      const matchingHand = pokerHandByCategory.get(poker.category);
      if (matchingHand) counts.set(matchingHand.id, counts.get(matchingHand.id) + 1);
    }

    let profile = null;
    if (compiledMatchers.length > 0 || plan.attendanceDefinitions.length > 0) {
      profile = createFiveCardProfile(cards, context);
    }

    for (const { hand, matches } of compiledMatchers) {
      if (matches(profile)) counts.set(hand.id, counts.get(hand.id) + 1);
    }

    if (plan.attendanceDefinitions.length > 0) {
      const maximumRepresented = maximumRepresentedPlayers(
        profile,
        settings.selectedPlayerIds,
        attendanceUsesSelf
      );
      for (const definition of plan.attendanceDefinitions) {
        if (maximumRepresented >= definition.requiredCount) {
          counts.set(definition.id, counts.get(definition.id) + 1);
        }
      }
    }
  }

  function finalize(processedCombinations, elapsedMilliseconds) {
    if (needsEnumeration && processedCombinations !== totalCombinations) {
      throw new Error(
        `Exact calculation stopped at ${processedCombinations} of ${totalCombinations} combinations`
      );
    }

    const handResults = [];
    for (const hand of plan.hands) {
      const count = counts.get(hand.id) ?? 0;
      const method = plan.closedFormHands.includes(hand)
        ? FIVE_CARD_CALCULATION_METHOD.CLOSED_FORM_EXACT
        : FIVE_CARD_CALCULATION_METHOD.EXHAUSTIVE_ENUMERATION;
      handResults.push({
        ...makeHandResultBase(hand),
        qualifyingCombinationCount: count,
        totalCombinationCount: totalCombinations,
        probabilityPercent: (count / totalCombinations) * 100,
        possible: count > 0,
        exact: true,
        calculationMethod: method,
      });
    }

    for (const definition of plan.attendanceDefinitions) {
      const count = counts.get(definition.id) ?? 0;
      handResults.push({
        ...makeAttendanceResultBase(definition),
        qualifyingCombinationCount: count,
        totalCombinationCount: totalCombinations,
        probabilityPercent: (count / totalCombinations) * 100,
        possible: count > 0,
        exact: true,
        calculationMethod: FIVE_CARD_CALCULATION_METHOD.EXHAUSTIVE_ENUMERATION,
        requiredPlayerCount: definition.requiredCount,
      });
    }

    return deepFreeze({
      exact: true,
      format: GAME_FORMAT.FIVE_CARD_DRAW,
      deckSize: deck.length,
      includedJokerIds: [...settings.includedJokerIds],
      totalCombinationCount: totalCombinations,
      processedCombinationCount: needsEnumeration ? processedCombinations : 0,
      elapsedMilliseconds,
      virtualSelfGameplayEnabled: settings.virtualSelfGameplayEnabled,
      probabilityUsesVirtualSelf: false,
      selectedPlayerIds: [...settings.selectedPlayerIds],
      selectedOptionalHandIds: [...settings.selectedOptionalHandIds],
      handResults,
    });
  }

  return {
    deck,
    totalCombinations,
    plan,
    needsEnumeration,
    processCombination,
    finalize,
  };
}

export function enumerateFiveCardCombinations(deck, callback) {
  if (!Array.isArray(deck)) throw new TypeError("deck must be an array");
  if (typeof callback !== "function") throw new TypeError("callback must be a function");
  let processed = 0;
  for (let a = 0; a < deck.length - 4; a += 1) {
    for (let b = a + 1; b < deck.length - 3; b += 1) {
      for (let c = b + 1; c < deck.length - 2; c += 1) {
        for (let d = c + 1; d < deck.length - 1; d += 1) {
          for (let e = d + 1; e < deck.length; e += 1) {
            callback([deck[a], deck[b], deck[c], deck[d], deck[e]], processed);
            processed += 1;
          }
        }
      }
    }
  }
  return processed;
}

export function calculateFiveCardProbabilitiesExactSync(settings = {}, options = {}) {
  const normalized = normalizeSettings(settings);
  const state = createState(normalized);
  const startedAt = Date.now();
  let processed = 0;

  if (state.needsEnumeration) {
    processed = enumerateFiveCardCombinations(state.deck, (cards, index) => {
      state.processCombination(cards);
      if (options.onProgress && (index + 1) % (options.progressInterval ?? 25000) === 0) {
        options.onProgress({
          processedCombinations: index + 1,
          totalCombinations: state.totalCombinations,
          fractionComplete: (index + 1) / state.totalCombinations,
        });
      }
    });
  }

  return state.finalize(processed, Date.now() - startedAt);
}

function yieldToBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function calculateFiveCardProbabilitiesExact(settings = {}, options = {}) {
  const normalized = normalizeSettings(settings);
  const state = createState(normalized);
  const startedAt = Date.now();
  const batchSize = options.batchSize ?? 5000;
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError("batchSize must be a positive integer");
  }

  let processed = 0;
  if (state.needsEnumeration) {
    const deck = state.deck;
    for (let a = 0; a < deck.length - 4; a += 1) {
      for (let b = a + 1; b < deck.length - 3; b += 1) {
        for (let c = b + 1; c < deck.length - 2; c += 1) {
          for (let d = c + 1; d < deck.length - 1; d += 1) {
            for (let e = d + 1; e < deck.length; e += 1) {
              if (options.signal?.aborted) {
                throw new DOMException("Five-card calculation was cancelled", "AbortError");
              }
              state.processCombination([deck[a], deck[b], deck[c], deck[d], deck[e]]);
              processed += 1;
              if (processed % batchSize === 0) {
                options.onProgress?.({
                  processedCombinations: processed,
                  totalCombinations: state.totalCombinations,
                  fractionComplete: processed / state.totalCombinations,
                });
                await yieldToBrowser();
              }
            }
          }
        }
      }
    }
  }

  options.onProgress?.({
    processedCombinations: processed,
    totalCombinations: state.totalCombinations,
    fractionComplete: 1,
  });
  return state.finalize(processed, Date.now() - startedAt);
}
