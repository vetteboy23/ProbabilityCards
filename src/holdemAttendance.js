import { combinationCount } from "./combinatorics.js";
import { buildDeck } from "./cards.js";
import { people } from "./people.js";
import { getAttendanceProbabilityHands, GAME_FORMAT } from "./setupRules.js";

function normalizeUniqueIds(values, name) {
  if (!Array.isArray(values)) throw new TypeError(`${name} must be an array`);
  if (values.some((value) => typeof value !== "string" || !value)) {
    throw new TypeError(`${name} must contain non-empty strings`);
  }
  if (new Set(values).size !== values.length) {
    throw new RangeError(`${name} cannot contain duplicates`);
  }
  return [...values];
}

function popcount(value) {
  let count = 0;
  let remaining = value >>> 0;
  while (remaining) {
    remaining &= remaining - 1;
    count += 1;
  }
  return count;
}

/** Maximum bipartite matching between selected physical cards and roster people. */
export function maximumAttendanceMatching(cardMasks, selectedPlayerCount) {
  if (!Array.isArray(cardMasks)) throw new TypeError("cardMasks must be an array");
  const matchForPerson = new Int16Array(selectedPlayerCount);
  matchForPerson.fill(-1);

  const sortedCards = cardMasks
    .map((mask, index) => ({ mask: mask >>> 0, index }))
    .sort((left, right) => popcount(left.mask) - popcount(right.mask));

  function augment(cardPosition, seen) {
    let options = sortedCards[cardPosition].mask;
    while (options) {
      const bit = options & -options;
      options ^= bit;
      const personIndex = 31 - Math.clz32(bit);
      if (seen[personIndex]) continue;
      seen[personIndex] = 1;
      const previousCard = matchForPerson[personIndex];
      if (previousCard < 0 || augment(previousCard, seen)) {
        matchForPerson[personIndex] = cardPosition;
        return true;
      }
    }
    return false;
  }

  let matched = 0;
  for (let cardPosition = 0; cardPosition < sortedCards.length; cardPosition += 1) {
    const seen = new Uint8Array(selectedPlayerCount);
    if (augment(cardPosition, seen)) matched += 1;
  }
  return matched;
}

export function groupCardsByRosterMask(deck, selectedPlayerIds) {
  const playerIndex = new Map(selectedPlayerIds.map((personId, index) => [personId, index]));
  const counts = new Map();
  for (const card of deck) {
    let mask = 0;
    for (const personId of card.relationalIdentityOptions) {
      const index = playerIndex.get(personId);
      if (index !== undefined) mask |= 1 << index;
    }
    counts.set(mask >>> 0, (counts.get(mask >>> 0) ?? 0) + 1);
  }
  const blankCount = counts.get(0) ?? 0;
  counts.delete(0);
  const groups = [...counts.entries()]
    .map(([mask, count]) => ({ mask: mask >>> 0, count }))
    .sort((left, right) => left.count - right.count || popcount(left.mask) - popcount(right.mask));
  return { groups, blankCount };
}

/**
 * Exact weighted attendance counts for an arbitrary physical deck and hand size.
 * This lower-level function is also used by validation on small decks.
 */
export function countGroupedAttendanceExact({
  deck,
  selectedPlayerIds,
  handSize = 7,
  requiredCounts,
  onProgress,
  progressInterval = 25000,
}) {
  if (!Array.isArray(deck)) throw new TypeError("deck must be an array");
  if (!Number.isInteger(handSize) || handSize < 0) {
    throw new RangeError("handSize must be a non-negative integer");
  }
  if (!Array.isArray(requiredCounts)) {
    throw new TypeError("requiredCounts must be an array");
  }
  const normalizedCounts = [...new Set(requiredCounts)].sort((a, b) => a - b);
  const totalCombinationCount = combinationCount(deck.length, handSize);
  const { groups, blankCount } = groupCardsByRosterMask(deck, selectedPlayerIds);
  const countsByRequired = new Map(normalizedCounts.map((count) => [count, 0]));
  const selectedMasks = [];
  let groupedStateCount = 0;
  let weightedTotal = 0;
  const minimumRequired = normalizedCounts[0] ?? Number.POSITIVE_INFINITY;

  function visit(groupIndex, relevantSelectedCount, ways) {
    if (relevantSelectedCount > handSize) return;
    if (groupIndex === groups.length) {
      const blanksNeeded = handSize - relevantSelectedCount;
      if (blanksNeeded < 0 || blanksNeeded > blankCount) return;
      const weightedWays = ways * combinationCount(blankCount, blanksNeeded);
      if (weightedWays === 0) return;
      groupedStateCount += 1;
      weightedTotal += weightedWays;
      let maximumRepresented = 0;
      if (relevantSelectedCount >= minimumRequired) {
        maximumRepresented = maximumAttendanceMatching(
          selectedMasks,
          selectedPlayerIds.length
        );
      }
      for (const requiredCount of normalizedCounts) {
        if (maximumRepresented >= requiredCount) {
          countsByRequired.set(
            requiredCount,
            countsByRequired.get(requiredCount) + weightedWays
          );
        }
      }
      if (groupedStateCount % progressInterval === 0) {
        onProgress?.({
          groupedStateCount,
          weightedCombinationCount: weightedTotal,
          totalCombinationCount,
        });
      }
      return;
    }

    const group = groups[groupIndex];
    const maxTake = Math.min(group.count, handSize - relevantSelectedCount);
    for (let take = 0; take <= maxTake; take += 1) {
      for (let index = 0; index < take; index += 1) selectedMasks.push(group.mask);
      visit(
        groupIndex + 1,
        relevantSelectedCount + take,
        ways * combinationCount(group.count, take)
      );
      selectedMasks.length -= take;
    }
  }

  visit(0, 0, 1);
  if (weightedTotal !== totalCombinationCount) {
    throw new Error(
      `Attendance grouped total ${weightedTotal} does not equal ${totalCombinationCount}`
    );
  }
  return Object.freeze({
    exact: true,
    handSize,
    totalCombinationCount,
    groupedStateCount,
    countsByRequired: Object.freeze(
      Object.fromEntries(normalizedCounts.map((count) => [count, countsByRequired.get(count)]))
    ),
  });
}

/**
 * Exact Hold'em attendance counts using weighted multisets of roster-relevant
 * card masks. Cards with identical roster representations are interchangeable,
 * so the engine avoids enumerating all C(N, 7) physical hands.
 */
export function calculateHoldemAttendanceExact(settings = {}, options = {}) {
  const selectedPlayerIds = normalizeUniqueIds(
    settings.selectedPlayerIds ?? [],
    "selectedPlayerIds"
  );
  for (const personId of selectedPlayerIds) {
    if (!people[personId]) throw new RangeError(`Unknown selected player: ${personId}`);
  }
  const includedJokerIds = normalizeUniqueIds(
    settings.includedJokerIds ?? [],
    "includedJokerIds"
  );
  const deck = buildDeck({ includedJokerIds });
  const totalCombinationCount = combinationCount(deck.length, 7);
  const definitions = getAttendanceProbabilityHands({
    selectedPlayerCount: selectedPlayerIds.length,
    format: GAME_FORMAT.TEXAS_HOLDEM,
  });

  if (definitions.length === 0) {
    return Object.freeze({
      exact: true,
      deckSize: deck.length,
      totalCombinationCount,
      groupedStateCount: 0,
      selectedPlayerIds: Object.freeze([...selectedPlayerIds]),
      handResults: Object.freeze([]),
    });
  }

  const counted = countGroupedAttendanceExact({
    deck,
    selectedPlayerIds,
    handSize: 7,
    requiredCounts: definitions.map((definition) => definition.requiredCount),
    onProgress: options.onProgress,
    progressInterval: options.progressInterval,
  });

  const handResults = definitions.map((definition) => {
    const count = counted.countsByRequired[definition.requiredCount] ?? 0;
    return Object.freeze({
      handId: definition.id,
      handName: definition.label,
      description: `${definition.requiredCount} of the ${definition.selectedPlayerCount} selected players are represented by physical cards.`,
      requiredPlayerCount: definition.requiredCount,
      qualifyingCombinationCount: count,
      totalCombinationCount,
      probabilityPercent: (count / totalCombinationCount) * 100,
      exact: true,
      possible: count > 0,
      calculationMethod: "grouped_exact_attendance",
      probabilityUsesVirtualSelf: false,
    });
  });

  return Object.freeze({
    exact: true,
    deckSize: deck.length,
    totalCombinationCount,
    groupedStateCount: counted.groupedStateCount,
    selectedPlayerIds: Object.freeze([...selectedPlayerIds]),
    maximumPhysicalRepresentations: Math.min(7, selectedPlayerIds.length),
    maximumRequired: Math.max(...definitions.map((definition) => definition.requiredCount)),
    handResults: Object.freeze(handResults),
  });
}
