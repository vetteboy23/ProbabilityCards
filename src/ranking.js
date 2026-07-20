import { fixedRankingTiers, RANKING_MODE } from "./hands.js";

export const RANKING_DIRECTION = Object.freeze({
  STRONGEST_FIRST: "strongest_first",
  WEAKEST_FIRST: "weakest_first",
});

const CATEGORY_LABELS = Object.freeze({
  standard_poker: "Poker",
  echo: "Echo",
  relationship: "Relationship",
  exact_card: "Exact cards",
  attendance: "Players represented",
});

function median(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function approximatelyEqual(a, b) {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= scale * 1e-12;
}

function cloneResult(result) {
  return { ...result };
}

function addGameplayAttendanceAliases(results, setup) {
  if (!setup?.attendanceRankingRules?.length) return results;
  const byId = new Map(results.map((result) => [result.handId, result]));
  const expanded = [...results];

  for (const rule of setup.attendanceRankingRules) {
    if (!rule.sharesPhysicalMaximumRank) continue;
    if (byId.has(rule.gameplayHandId)) continue;
    const basis = byId.get(rule.probabilityHandId);
    if (!basis) continue;

    const alias = {
      ...basis,
      handId: rule.gameplayHandId,
      handName: rule.gameplayLabel,
      description:
        `${rule.gameplayLabel} during play. Virtual self supplies the extra representation, ` +
        `so this uses the physical-card probability of ${rule.probabilityLabel}.`,
      probabilitySourceHandId: rule.probabilityHandId,
      probabilitySourceHandName: rule.probabilityLabel,
      gameplayVirtualSelfAlias: true,
      rankingMode: RANKING_MODE.GENERATED_PROBABILITY,
    };
    expanded.push(alias);
    byId.set(alias.handId, alias);
  }

  return expanded;
}

function applyFixedTierAnchors(results) {
  const tierAnchors = new Map();

  for (const tier of Object.values(fixedRankingTiers)) {
    const probabilities = results
      .filter((result) => result.rankingTier === tier.id && result.possible !== false)
      .map((result) => result.probabilityPercent)
      .filter(Number.isFinite);
    if (probabilities.length > 0) tierAnchors.set(tier.id, median(probabilities));
  }

  return results.map((result) => {
    const tierAnchor = result.rankingTier
      ? tierAnchors.get(result.rankingTier)
      : null;
    return {
      ...result,
      categoryLabel: CATEGORY_LABELS[result.category] ?? result.category ?? "Other",
      rankingProbabilityPercent:
        Number.isFinite(tierAnchor) ? tierAnchor : result.probabilityPercent,
      tiedByHouseRule: Boolean(result.rankingTier && Number.isFinite(tierAnchor)),
    };
  });
}

function assignDenseRanks(sortedResults) {
  let currentRank = 0;
  let priorRankingProbability = null;

  return sortedResults.map((result) => {
    const probability = result.rankingProbabilityPercent;
    if (
      priorRankingProbability === null ||
      !approximatelyEqual(probability, priorRankingProbability)
    ) {
      currentRank += 1;
      priorRankingProbability = probability;
    }
    return { ...result, rank: currentRank };
  });
}

export function formatProbabilityPercent(value) {
  if (!Number.isFinite(value)) return "—";
  let decimals;
  if (value >= 10) decimals = 2;
  else if (value >= 1) decimals = 3;
  else if (value >= 0.1) decimals = 4;
  else if (value >= 0.01) decimals = 5;
  else if (value >= 0.001) decimals = 6;
  else decimals = 8;
  return `${value.toFixed(decimals).replace(/\.?0+$/, "")}%`;
}

/**
 * Converts exact probability-engine output into the static gameplay hierarchy.
 * Rarer hands rank higher. Fixed-tier hands share a gameplay rank while retaining
 * their own displayed probability percentages.
 */
export function buildStaticHandRanking(
  probabilityResult,
  setup,
  { direction = RANKING_DIRECTION.STRONGEST_FIRST } = {}
) {
  if (!probabilityResult || !Array.isArray(probabilityResult.handResults)) {
    throw new TypeError("probabilityResult.handResults must be an array");
  }
  if (!Object.values(RANKING_DIRECTION).includes(direction)) {
    throw new RangeError(`Unsupported ranking direction: ${direction}`);
  }

  const possible = probabilityResult.handResults
    .filter(
      (result) =>
        result.possible !== false &&
        Number.isFinite(result.probabilityPercent) &&
        result.probabilityPercent > 0
    )
    .map(cloneResult);

  const withAliases = addGameplayAttendanceAliases(possible, setup);
  const anchored = applyFixedTierAnchors(withAliases);

  const strongestFirst = [...anchored].sort((a, b) => {
    const probabilityDifference =
      a.rankingProbabilityPercent - b.rankingProbabilityPercent;
    if (!approximatelyEqual(a.rankingProbabilityPercent, b.rankingProbabilityPercent)) {
      return probabilityDifference;
    }
    if (a.rankingTier && b.rankingTier && a.rankingTier === b.rankingTier) {
      return a.handName.localeCompare(b.handName);
    }
    if (a.probabilityPercent !== b.probabilityPercent) {
      return a.probabilityPercent - b.probabilityPercent;
    }
    return a.handName.localeCompare(b.handName);
  });

  const rankedStrongestFirst = assignDenseRanks(strongestFirst);
  const rows =
    direction === RANKING_DIRECTION.STRONGEST_FIRST
      ? rankedStrongestFirst
      : [...rankedStrongestFirst].reverse();

  const impossibleCount = probabilityResult.handResults.length - possible.length;
  return Object.freeze({
    exact: probabilityResult.exact === true,
    format: probabilityResult.format,
    deckSize: probabilityResult.deckSize,
    totalCombinationCount: probabilityResult.totalCombinationCount,
    direction,
    rowCount: rows.length,
    impossibleOrZeroCount: impossibleCount,
    rows: Object.freeze(rows.map((row) => Object.freeze(row))),
  });
}
