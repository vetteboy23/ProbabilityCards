import { JOKER_IDS } from "./cards.js";
import {
  BUILT_IN_HAND,
  HAND_CATEGORY,
  HAND_EVALUATOR,
  getHandsForGame,
  handById,
} from "./hands.js";
import { combinationCount, countSubsetsContainingRequiredCards } from "./combinatorics.js";
import { holdemPrecomputed } from "./holdemPrecomputed.js";
import { calculateHoldemAttendanceExact } from "./holdemAttendance.js";
import { GAME_FORMAT } from "./setupRules.js";
import { people } from "./people.js";

export const HOLDEM_CALCULATION_METHOD = Object.freeze({
  PRECOMPUTED_EXACT_POKER: "precomputed_exact_poker",
  PRECOMPUTED_EXACT_FAMILY: "precomputed_exact_family",
  CLOSED_FORM_EXACT: "closed_form_exact",
  GROUPED_EXACT_ATTENDANCE: "grouped_exact_attendance",
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
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

function deckConfigurationKey(includedJokerIds) {
  const hasKick = includedJokerIds.includes("JOKER_KICK");
  const hasPipe = includedJokerIds.includes("JOKER_MATERNAL");
  if (hasKick && hasPipe) return "both";
  if (hasKick) return "kick_only";
  if (hasPipe) return "pipe_only";
  return "none";
}

function normalizeSettings(settings = {}) {
  const includedJokerIds = normalizeStringArray(
    settings.includedJokerIds ?? JOKER_IDS,
    "includedJokerIds"
  );
  for (const jokerId of includedJokerIds) {
    if (!JOKER_IDS.includes(jokerId)) throw new RangeError(`Unknown Joker ID: ${jokerId}`);
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
  if (settings.playerId !== undefined && settings.playerId !== null) {
    throw new TypeError(
      "playerId is not accepted because Hold'em rankings are shared and exclude virtual self"
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
    format: GAME_FORMAT.TEXAS_HOLDEM,
    includedJokerIds: Object.freeze(includedJokerIds),
    selectedOptionalHandIds: Object.freeze(selectedOptionalHandIds),
    selectedPlayerIds: Object.freeze(selectedPlayerIds),
    virtualSelfGameplayEnabled: Boolean(settings.useVirtualSelf),
    probabilityUsesVirtualSelf: false,
    requestedHandIds: requestedHandIds ? Object.freeze(requestedHandIds) : null,
    deckConfigurationKey: deckConfigurationKey(includedJokerIds),
  });
}

function isPossibleWithPhysicalCards(hand) {
  return (
    hand.supportedFormats.includes(GAME_FORMAT.TEXAS_HOLDEM) &&
    hand.minimumPhysicalCards <= 7 &&
    hand.minimumContributingSlots <= 7
  );
}

function baseResult(hand) {
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

function calculationMethodFor(hand) {
  if (hand.evaluator === HAND_EVALUATOR.STANDARD_POKER_CATEGORY) {
    return HOLDEM_CALCULATION_METHOD.PRECOMPUTED_EXACT_POKER;
  }
  if (hand.evaluator === HAND_EVALUATOR.FIXED_SPECIFIC_CARD_PAIR_PROBABILITY) {
    return HOLDEM_CALCULATION_METHOD.CLOSED_FORM_EXACT;
  }
  return HOLDEM_CALCULATION_METHOD.PRECOMPUTED_EXACT_FAMILY;
}

/**
 * Exact seven-card Hold'em probabilities.
 *
 * Stable hands use precomputed exact counts generated from the finalized deck.
 * Roster-dependent attendance hands are counted live with weighted card-mask
 * groups. Virtual self remains a gameplay bonus and is excluded throughout.
 */
export function calculateHoldemProbabilitiesExact(settings = {}, options = {}) {
  const normalized = normalizeSettings(settings);
  const startedAt = Date.now();
  const table = holdemPrecomputed.decks[normalized.deckConfigurationKey];
  if (!table) throw new Error(`Missing Hold'em table: ${normalized.deckConfigurationKey}`);
  const expectedTotal = combinationCount(table.deckSize, 7);
  if (table.totalCombinationCount !== expectedTotal) {
    throw new Error("Precomputed Hold'em table has an invalid combination total");
  }

  let hands = [...getHandsForGame({
    selectedOptionalHandIds: normalized.selectedOptionalHandIds,
  })];
  if (normalized.requestedHandIds) {
    const requested = new Set(normalized.requestedHandIds);
    hands = hands.filter((hand) => requested.has(hand.id));
  }

  const handResults = [];
  for (const hand of hands) {
    let count = 0;
    if (isPossibleWithPhysicalCards(hand)) {
      if (hand.evaluator === HAND_EVALUATOR.FIXED_SPECIFIC_CARD_PAIR_PROBABILITY) {
        count = countSubsetsContainingRequiredCards(
          table.deckSize,
          hand.requirements.specificPhysicalCardCount,
          7
        );
      } else {
        const precomputed = table.counts[hand.id];
        if (!Number.isInteger(precomputed) || precomputed < 0) {
          throw new Error(`Missing exact Hold'em count for ${hand.id}`);
        }
        count = precomputed;
      }
    }
    handResults.push({
      ...baseResult(hand),
      qualifyingCombinationCount: count,
      totalCombinationCount: table.totalCombinationCount,
      probabilityPercent: (count / table.totalCombinationCount) * 100,
      possible: count > 0,
      exact: true,
      calculationMethod: calculationMethodFor(hand),
    });
  }

  const attendanceRequested =
    normalized.selectedPlayerIds.length >= 2 &&
    (!normalized.requestedHandIds ||
      normalized.requestedHandIds.includes(BUILT_IN_HAND.ATTENDANCE_FAMILY));
  let attendance = null;
  if (attendanceRequested) {
    attendance = calculateHoldemAttendanceExact(
      {
        includedJokerIds: normalized.includedJokerIds,
        selectedPlayerIds: normalized.selectedPlayerIds,
      },
      { onProgress: options.onAttendanceProgress }
    );
    for (const result of attendance.handResults) {
      handResults.push({
        ...result,
        category: HAND_CATEGORY.ATTENDANCE,
        availability: "generated",
        rankingMode: "generated_probability",
        rankingTier: null,
        calculationMethod: HOLDEM_CALCULATION_METHOD.GROUPED_EXACT_ATTENDANCE,
      });
    }
  }

  return deepFreeze({
    exact: true,
    format: GAME_FORMAT.TEXAS_HOLDEM,
    deckSize: table.deckSize,
    deckConfigurationKey: normalized.deckConfigurationKey,
    includedJokerIds: [...normalized.includedJokerIds],
    totalCombinationCount: table.totalCombinationCount,
    elapsedMilliseconds: Date.now() - startedAt,
    virtualSelfGameplayEnabled: normalized.virtualSelfGameplayEnabled,
    probabilityUsesVirtualSelf: false,
    probabilityRankingScope: "shared_table_ranking",
    selectedPlayerIds: [...normalized.selectedPlayerIds],
    selectedOptionalHandIds: [...normalized.selectedOptionalHandIds],
    attendanceGroupedStateCount: attendance?.groupedStateCount ?? 0,
    handResults,
  });
}

export const sevenCardProbabilityMetadata = Object.freeze({
  handSize: 7,
  exact: true,
  stableHandsUsePrecomputedCounts: true,
  attendanceUsesGroupedExactCounting: true,
  probabilityUsesVirtualSelf: false,
  precomputedVersion: holdemPrecomputed.version,
});
