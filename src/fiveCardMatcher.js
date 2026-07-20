import {
  PERSON,
  people,
  parentChildRelationships,
} from "./people.js";
import {
  HAND_EVALUATOR,
} from "./hands.js";

const personIds = Object.freeze(Object.keys(people));
const personIndex = Object.freeze(
  Object.fromEntries(personIds.map((personId, index) => [personId, index]))
);
const personBit = Object.freeze(
  Object.fromEntries(personIds.map((personId, index) => [personId, 1 << index]))
);

function bitFor(personId) {
  return personBit[personId] ?? 0;
}

function maskForPeople(ids) {
  let mask = 0;
  for (const id of ids) mask |= bitFor(id);
  return mask;
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

function bitsIn(mask) {
  const bits = [];
  let remaining = mask >>> 0;
  while (remaining) {
    const bit = remaining & -remaining;
    bits.push(bit);
    remaining ^= bit;
  }
  return bits;
}

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

export function createCardPoolProfile(cards, context = {}) {
  const masks = cards.map((card) => maskForPeople(card.relationalIdentityOptions));
  const ids = cards.map((card) => card.id);
  const ranks = cards.map((card) => card.rank);
  const suits = cards.map((card) => card.suit);
  const selfEnabled = Boolean(context.useVirtualSelf && context.playerId);
  if (selfEnabled) {
    masks.push(bitFor(context.playerId));
    ids.push(null);
    ranks.push(null);
    suits.push(null);
  }
  return {
    cards,
    masks,
    ids,
    ranks,
    suits,
    physicalCount: cards.length,
    contributorCount: masks.length,
    selfIndex: selfEnabled ? cards.length : -1,
    selfPersonId: selfEnabled ? context.playerId : null,
  };
}

function contributorAllowed(profile, index, allowSelf) {
  return index !== profile.selfIndex || allowSelf;
}

function canAssignBits(profile, requiredBits, { allowSelf = false, usedContributorMask = 0 } = {}) {
  if (requiredBits.length === 0) return true;
  const slots = [...requiredBits].sort((left, right) => {
    let leftCount = 0;
    let rightCount = 0;
    for (let index = 0; index < profile.contributorCount; index += 1) {
      if (usedContributorMask & (1 << index)) continue;
      if (!contributorAllowed(profile, index, allowSelf)) continue;
      if (profile.masks[index] & left) leftCount += 1;
      if (profile.masks[index] & right) rightCount += 1;
    }
    return leftCount - rightCount;
  });

  function search(position, usedMask) {
    if (position === slots.length) return true;
    const target = slots[position];
    for (let index = 0; index < profile.contributorCount; index += 1) {
      const contributorBit = 1 << index;
      if (usedMask & contributorBit) continue;
      if (!contributorAllowed(profile, index, allowSelf)) continue;
      if (!(profile.masks[index] & target)) continue;
      if (search(position + 1, usedMask | contributorBit)) return true;
    }
    return false;
  }

  return search(0, usedContributorMask);
}

function maxDistinctPeople(profile, allowedPeopleMask, { allowSelf = false, usedContributorMask = 0 } = {}) {
  const memo = new Map();

  function search(index, usedPeopleMask) {
    while (
      index < profile.contributorCount &&
      ((usedContributorMask & (1 << index)) || !contributorAllowed(profile, index, allowSelf))
    ) {
      index += 1;
    }
    if (index >= profile.contributorCount) return 0;
    const key = `${index}:${usedPeopleMask}`;
    if (memo.has(key)) return memo.get(key);

    let best = search(index + 1, usedPeopleMask);
    const availablePeople = profile.masks[index] & allowedPeopleMask & ~usedPeopleMask;
    for (const person of bitsIn(availablePeople)) {
      best = Math.max(best, 1 + search(index + 1, usedPeopleMask | person));
    }
    memo.set(key, best);
    return best;
  }

  return search(0, 0);
}

function countContributorsForPerson(profile, targetBit, allowSelf) {
  let count = 0;
  for (let index = 0; index < profile.contributorCount; index += 1) {
    if (!contributorAllowed(profile, index, allowSelf)) continue;
    if (profile.masks[index] & targetBit) count += 1;
  }
  return count;
}

function findPhysicalCardIndex(profile, cardId) {
  for (let index = 0; index < profile.physicalCount; index += 1) {
    if (profile.ids[index] === cardId) return index;
  }
  return -1;
}

function reserveExactCards(profile, requiredCardIds) {
  let usedMask = 0;
  for (const cardId of requiredCardIds) {
    const index = findPhysicalCardIndex(profile, cardId);
    if (index < 0) return null;
    usedMask |= 1 << index;
  }
  return usedMask;
}

function exactSetMatcher(requiredCardIds) {
  return (profile) => reserveExactCards(profile, requiredCardIds) !== null;
}

function exactAlternativesMatcher(alternatives) {
  return (profile) => alternatives.some((alternative) => reserveExactCards(profile, alternative) !== null);
}

function exactSetWithOneOfMatcher(requiredCardIds, oneOfCardIds) {
  return (profile) => {
    if (reserveExactCards(profile, requiredCardIds) === null) return false;
    return oneOfCardIds.some((cardId) => findPhysicalCardIndex(profile, cardId) >= 0);
  };
}

function childPhysicalCandidates(profile, childId, childRank, allowSelf) {
  const target = bitFor(childId);
  const candidates = [];
  for (let index = 0; index < profile.physicalCount; index += 1) {
    if (profile.ranks[index] === childRank && (profile.masks[index] & target)) {
      candidates.push(index);
    }
  }
  if (
    allowSelf &&
    profile.selfIndex >= 0 &&
    profile.selfPersonId === childId
  ) {
    candidates.push(profile.selfIndex);
  }
  return candidates;
}

function anyCoupleMatcher(couples, allowSelf) {
  const pairs = couples.map((couple) => couple.partners.map(bitFor));
  return (profile) => pairs.some((pair) => canAssignBits(profile, pair, { allowSelf }));
}

function exactPeopleMatcher(requiredPeople, allowSelf) {
  const bits = requiredPeople.map(bitFor);
  return (profile) => canAssignBits(profile, bits, { allowSelf });
}

function chooseDistinctPeopleMatcher(peoplePool, requiredCount, allowSelf) {
  const poolMask = maskForPeople(peoplePool);
  return (profile) => maxDistinctPeople(profile, poolMask, { allowSelf }) >= requiredCount;
}

function atTheGrillMatcher(requirements, allowSelf) {
  const childSets = combinations(requirements.childrenPool, requirements.requiredChildCount);
  const groups = childSets.map((children) =>
    [...requirements.requiredAdults, ...children].map(bitFor)
  );
  return (profile) => groups.some((bits) => canAssignBits(profile, bits, { allowSelf }));
}

function echoMultiplicityMatcher(multiplicity, allowSelf) {
  const allBits = personIds.map(bitFor);
  return (profile) =>
    allBits.some((person) => countContributorsForPerson(profile, person, allowSelf) >= multiplicity);
}

function echoPatternMatcher(multiplicities, allowSelf) {
  const allBits = personIds.map(bitFor);
  const [firstRequired, secondRequired] = multiplicities;
  return (profile) => {
    const contributorMasks = allBits.map((person) => {
      let mask = 0;
      for (let index = 0; index < profile.contributorCount; index += 1) {
        if (!contributorAllowed(profile, index, allowSelf)) continue;
        if (profile.masks[index] & person) mask |= 1 << index;
      }
      return mask;
    });

    for (let first = 0; first < allBits.length; first += 1) {
      const firstMask = contributorMasks[first];
      if (popcount(firstMask) < firstRequired) continue;
      for (let second = 0; second < allBits.length; second += 1) {
        if (first === second) continue;
        const secondMask = contributorMasks[second];
        if (popcount(secondMask) < secondRequired) continue;
        // With only two repeated identities, Hall's condition is sufficient:
        // each identity has enough contributors and their union has enough
        // distinct contributors for all required slots.
        if (popcount(firstMask | secondMask) >= firstRequired + secondRequired) {
          return true;
        }
      }
    }
    return false;
  };
}

function grandparentAndChildMatcher(requirements, allowSelf) {
  const grandparentMask = maskForPeople(requirements.grandparentPeople);
  return (profile) => {
    for (const childId of requirements.childPeople) {
      for (const childIndex of childPhysicalCandidates(
        profile,
        childId,
        requirements.childPhysicalCardsUseRank,
        allowSelf
      )) {
        const used = 1 << childIndex;
        for (let index = 0; index < profile.physicalCount; index += 1) {
          if (used & (1 << index)) continue;
          if (profile.masks[index] & grandparentMask) return true;
        }
      }
    }
    return false;
  };
}

function heritageMatcher(alternatives, allowSelf) {
  const compiled = alternatives.map((alternative) => ({
    portraitCardId: alternative.portraitCardId,
    parentBit: bitFor(alternative.parentPerson),
  }));
  return (profile) => {
    for (const alternative of compiled) {
      const portraitIndex = findPhysicalCardIndex(profile, alternative.portraitCardId);
      if (portraitIndex < 0) continue;
      if (
        canAssignBits(profile, [alternative.parentBit], {
          allowSelf,
          usedContributorMask: 1 << portraitIndex,
        })
      ) {
        return true;
      }
    }
    return false;
  };
}

function doubleHeritageMatcher(requirements, allowSelf) {
  const parentBits = requirements.parentPeople.map(bitFor);
  return (profile) => {
    const used = reserveExactCards(profile, requirements.requiredPortraitCardIds);
    if (used === null) return false;
    return canAssignBits(profile, parentBits, {
      allowSelf,
      usedContributorMask: used,
    });
  };
}

function allSlotsFromGroupMatcher(requirements, allowSelf) {
  const groupMask = maskForPeople(requirements.peoplePool);
  return (profile) => {
    let count = 0;
    for (let index = 0; index < profile.contributorCount; index += 1) {
      if (!contributorAllowed(profile, index, allowSelf)) continue;
      if (profile.masks[index] & groupMask) count += 1;
    }
    return count >= requirements.requiredSlotCount;
  };
}

function dynamicDuoMatcher(requirements, allowSelf) {
  const pairs = requirements.personPairs.map((personPair, index) => ({
    people: personPair.map(bitFor),
    ranks: requirements.rankPairs[index],
  }));

  return (profile) => {
    for (const pair of pairs) {
      for (let first = 0; first < profile.contributorCount; first += 1) {
        if (!contributorAllowed(profile, first, allowSelf)) continue;
        if (!(profile.masks[first] & pair.people[0])) continue;
        for (let second = 0; second < profile.contributorCount; second += 1) {
          if (second === first) continue;
          if (!contributorAllowed(profile, second, allowSelf)) continue;
          if (!(profile.masks[second] & pair.people[1])) continue;

          const usedSelf = first === profile.selfIndex || second === profile.selfIndex;
          const eightCount =
            (profile.ranks[first] === "8" ? 1 : 0) +
            (profile.ranks[second] === "8" ? 1 : 0);
          if (eightCount > requirements.maximumEightSubstitutions) continue;
          if (!usedSelf) {
            const hasNatural =
              profile.ranks[first] === pair.ranks[0] ||
              profile.ranks[second] === pair.ranks[1];
            if (!hasNatural) continue;
          }
          return true;
        }
      }
    }
    return false;
  };
}

function coupleIsParents(couple, childId, childParents) {
  const parents = childParents[childId] ?? [];
  return couple.partners.every((partner) => parents.includes(partner));
}

function familySleepoverMatcher(requirements, allowSelf) {
  const coupleData = requirements.auntUncleCouples.map((couple) => ({
    ...couple,
    partnerBits: couple.partners.map(bitFor),
  }));
  const grandparentBits = requirements.grandparentsAlternative.map(bitFor);

  return (profile) => {
    for (const childId of requirements.childPeople) {
      const childCandidates = childPhysicalCandidates(
        profile,
        childId,
        requirements.childRank,
        allowSelf
      );
      for (const childIndex of childCandidates) {
        const childUsed = 1 << childIndex;
        for (const couple of coupleData) {
          if (coupleIsParents(couple, childId, requirements.childParents)) continue;

          if (couple.weddingCardId) {
            const portraitIndex = findPhysicalCardIndex(profile, couple.weddingCardId);
            if (portraitIndex >= 0 && portraitIndex !== childIndex) return true;
          }

          if (
            canAssignBits(profile, couple.partnerBits, {
              allowSelf,
              usedContributorMask: childUsed,
            })
          ) {
            return true;
          }
        }

        if (
          canAssignBits(profile, grandparentBits, {
            allowSelf,
            usedContributorMask: childUsed,
          })
        ) {
          return true;
        }
      }
    }
    return false;
  };
}

function sameSuitRelationshipMatcher(requirements) {
  const brotherMask = maskForPeople(
    requirements.allowedSubtypes.find((item) => item.id === "two_brothers_same_suit").peoplePool
  );
  const sisterMask = maskForPeople(
    requirements.allowedSubtypes.find((item) => item.id === "two_sisters_same_suit").peoplePool
  );
  const couples = requirements.allowedSubtypes
    .find((item) => item.id === "married_couple_same_suit")
    .couples.map((couple) => couple.partners.map(bitFor));
  const relationships = requirements.allowedSubtypes
    .find((item) => item.id === "parent_child_same_suit")
    .relationships;
  const parentChildPairs = [];
  for (const relationship of relationships) {
    for (const parent of relationship.parents) {
      for (const child of relationship.children) {
        parentChildPairs.push([bitFor(parent), bitFor(child)]);
      }
    }
  }

  return (profile) => {
    for (const suit of ["clubs", "diamonds", "hearts", "spades"]) {
      const suitedProfile = {
        ...profile,
        masks: profile.masks.slice(0, profile.physicalCount).map((mask, index) =>
          profile.suits[index] === suit ? mask : 0
        ),
        contributorCount: profile.physicalCount,
        selfIndex: -1,
      };
      if (maxDistinctPeople(suitedProfile, brotherMask) >= 2) return true;
      if (maxDistinctPeople(suitedProfile, sisterMask) >= 2) return true;
      if (couples.some((pair) => canAssignBits(suitedProfile, pair))) return true;
      if (parentChildPairs.some((pair) => canAssignBits(suitedProfile, pair))) return true;
    }
    return false;
  };
}

export function createFastCardPoolMatcher(hand, context = {}) {
  const allowSelf = Boolean(context.useVirtualSelf && context.playerId && hand.virtualSelfAllowed);
  const requirements = hand.requirements;

  switch (hand.evaluator) {
    case HAND_EVALUATOR.ECHO_MULTIPLICITY:
      return echoMultiplicityMatcher(requirements.multiplicity, allowSelf);
    case HAND_EVALUATOR.ECHO_PATTERN:
      return echoPatternMatcher(requirements.multiplicities, allowSelf);
    case HAND_EVALUATOR.ANY_RECOGNIZED_COUPLE:
      return anyCoupleMatcher(requirements.couples, allowSelf);
    case HAND_EVALUATOR.EXACT_PEOPLE_GROUP:
      return exactPeopleMatcher(requirements.people, allowSelf);
    case HAND_EVALUATOR.CHOOSE_DISTINCT_PEOPLE:
      return chooseDistinctPeopleMatcher(requirements.peoplePool, requirements.requiredCount, allowSelf);
    case HAND_EVALUATOR.AT_THE_GRILL:
      return atTheGrillMatcher(requirements, allowSelf);
    case HAND_EVALUATOR.EXACT_CARD_SET:
      return exactSetMatcher(requirements.requiredCardIds);
    case HAND_EVALUATOR.EXACT_CARD_ALTERNATIVES:
      return exactAlternativesMatcher(requirements.alternatives);
    case HAND_EVALUATOR.EXACT_CARD_SET_WITH_ONE_OF:
      return exactSetWithOneOfMatcher(requirements.requiredCardIds, requirements.oneOfCardIds);
    case HAND_EVALUATOR.GRANDPARENT_AND_CHILD:
      return grandparentAndChildMatcher(requirements, allowSelf);
    case HAND_EVALUATOR.HERITAGE:
      return heritageMatcher(requirements.alternatives, allowSelf);
    case HAND_EVALUATOR.DOUBLE_HERITAGE:
      return doubleHeritageMatcher(requirements, allowSelf);
    case HAND_EVALUATOR.ALL_SLOTS_FROM_GROUP:
      return allSlotsFromGroupMatcher(requirements, allowSelf);
    case HAND_EVALUATOR.DYNAMIC_DUO:
      return dynamicDuoMatcher(requirements, allowSelf);
    case HAND_EVALUATOR.FAMILY_SLEEPOVER:
      return familySleepoverMatcher(requirements, allowSelf);
    case HAND_EVALUATOR.SAME_SUIT_RELATIONSHIP_PAIR:
      return sameSuitRelationshipMatcher(requirements);
    default:
      return null;
  }
}

/**
 * Backward-compatible aliases retained for the five-card engine.
 * The underlying profile and matcher logic supports any small physical card
 * pool that fits within JavaScript's contributor bit mask (including seven
 * cards for Hold'em).
 */
export const createFiveCardProfile = createCardPoolProfile;
export const createFastFiveCardMatcher = createFastCardPoolMatcher;

export function relationalPersonMask(personIdsToMask) {
  return maskForPeople(personIdsToMask);
}

export function cardRelationalMask(card) {
  return maskForPeople(card.relationalIdentityOptions);
}

export function maximumRepresentedPlayers(profile, selectedPlayerIds, allowSelf) {
  return maxDistinctPeople(profile, maskForPeople(selectedPlayerIds), { allowSelf });
}

export const cardPoolMatcherMetadata = Object.freeze({
  personCount: personIds.length,
  usesOneContributorPerSlot: true,
  supportsVirtualSelf: true,
  supportsExactCardReservations: true,
  maximumSupportedContributors: 30,
});

export const fiveCardMatcherMetadata = cardPoolMatcherMetadata;
