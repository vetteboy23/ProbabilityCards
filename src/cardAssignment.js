import { cardById } from "./cards.js";
import { people } from "./people.js";

export const ASSIGNMENT_SLOT = Object.freeze({
  PERSON: "person",
  PERSON_CHOICE: "person_choice",
  EXACT_CARD: "exact_card",
  EXACT_CARD_CHOICE: "exact_card_choice",
});

export const CONTRIBUTOR_SOURCE = Object.freeze({
  PHYSICAL_CARD: "physical_card",
  VIRTUAL_SELF: "virtual_self",
});

function freezeResult(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeResult(child);
  return value;
}

function assertKnownPerson(personId, fieldName = "personId") {
  if (!people[personId]) {
    throw new RangeError(`${fieldName} is not a known person: ${personId}`);
  }
}

function normalizeStringArray(values, fieldName) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty array`);
  }

  const normalized = [...values];
  if (normalized.some((value) => typeof value !== "string" || value.length === 0)) {
    throw new TypeError(`${fieldName} must contain non-empty strings`);
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new RangeError(`${fieldName} cannot contain duplicates`);
  }
  return normalized;
}

function normalizePersonSequence(values, fieldName) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty array`);
  }
  const normalized = [...values];
  normalized.forEach((personId) => assertKnownPerson(personId, `${fieldName} entry`));
  return normalized;
}

/**
 * Accepts card IDs or card objects and returns canonical card objects.
 * Duplicate physical card IDs are rejected because a deck cannot contain the
 * same physical card twice.
 */
export function normalizeCardPool(cardPool) {
  if (!Array.isArray(cardPool)) {
    throw new TypeError("cardPool must be an array of card IDs or card objects");
  }

  const cards = cardPool.map((value, index) => {
    const cardId = typeof value === "string" ? value : value?.id;
    if (!cardId || !cardById[cardId]) {
      throw new RangeError(`cardPool[${index}] is not a known physical card`);
    }
    return cardById[cardId];
  });

  const ids = cards.map((card) => card.id);
  if (new Set(ids).size !== ids.length) {
    throw new RangeError("cardPool cannot contain the same physical card twice");
  }

  return cards;
}

export function getRepresentablePeople(cardOrId) {
  const [card] = normalizeCardPool([cardOrId]);
  return Object.freeze([...card.relationalIdentityOptions]);
}

export function createPersonSlot(id, personId, options = {}) {
  assertKnownPerson(personId);
  return Object.freeze({
    id,
    kind: ASSIGNMENT_SLOT.PERSON,
    personId,
    allowVirtualSelf: options.allowVirtualSelf !== false,
    sameSuitGroup: options.sameSuitGroup ?? null,
    requiredSuit: options.requiredSuit ?? null,
    requiredRanks: options.requiredRanks ? Object.freeze([...options.requiredRanks]) : null,
    requiredTags: options.requiredTags ? Object.freeze([...options.requiredTags]) : null,
    virtualSelfIgnoresPhysicalFilters: Boolean(options.virtualSelfIgnoresPhysicalFilters),
  });
}

export function createPersonChoiceSlot(id, allowedPersonIds, options = {}) {
  const personIds = normalizeStringArray(allowedPersonIds, "allowedPersonIds");
  personIds.forEach((personId) => assertKnownPerson(personId, "allowedPersonIds entry"));

  return Object.freeze({
    id,
    kind: ASSIGNMENT_SLOT.PERSON_CHOICE,
    allowedPersonIds: Object.freeze(personIds),
    allowVirtualSelf: options.allowVirtualSelf !== false,
    distinctGroup: options.distinctGroup ?? null,
    sameSuitGroup: options.sameSuitGroup ?? null,
    requiredSuit: options.requiredSuit ?? null,
    requiredRanks: options.requiredRanks ? Object.freeze([...options.requiredRanks]) : null,
    requiredTags: options.requiredTags ? Object.freeze([...options.requiredTags]) : null,
    virtualSelfIgnoresPhysicalFilters: Boolean(options.virtualSelfIgnoresPhysicalFilters),
  });
}

export function createExactCardSlot(id, cardId, options = {}) {
  if (!cardById[cardId]) throw new RangeError(`Unknown exact card: ${cardId}`);
  return Object.freeze({
    id,
    kind: ASSIGNMENT_SLOT.EXACT_CARD,
    cardId,
    sameSuitGroup: options.sameSuitGroup ?? null,
  });
}

export function createExactCardChoiceSlot(id, cardIds, options = {}) {
  const normalized = normalizeStringArray(cardIds, "cardIds");
  normalized.forEach((cardId) => {
    if (!cardById[cardId]) throw new RangeError(`Unknown exact card: ${cardId}`);
  });
  return Object.freeze({
    id,
    kind: ASSIGNMENT_SLOT.EXACT_CARD_CHOICE,
    cardIds: Object.freeze(normalized),
    sameSuitGroup: options.sameSuitGroup ?? null,
  });
}

function normalizeSlot(slot, index) {
  if (!slot || typeof slot !== "object") {
    throw new TypeError(`slots[${index}] must be an object`);
  }
  if (!slot.id || typeof slot.id !== "string") {
    throw new TypeError(`slots[${index}].id must be a non-empty string`);
  }

  switch (slot.kind) {
    case ASSIGNMENT_SLOT.PERSON:
      return createPersonSlot(slot.id, slot.personId, slot);
    case ASSIGNMENT_SLOT.PERSON_CHOICE:
      return createPersonChoiceSlot(slot.id, slot.allowedPersonIds, slot);
    case ASSIGNMENT_SLOT.EXACT_CARD:
      return createExactCardSlot(slot.id, slot.cardId, slot);
    case ASSIGNMENT_SLOT.EXACT_CARD_CHOICE:
      return createExactCardChoiceSlot(slot.id, slot.cardIds, slot);
    default:
      throw new RangeError(`slots[${index}] has unknown kind: ${slot.kind}`);
  }
}

function physicalCardPassesFilters(card, slot) {
  if (slot.requiredSuit && card.suit !== slot.requiredSuit) return false;
  if (slot.requiredRanks && !slot.requiredRanks.includes(card.rank)) return false;
  if (slot.requiredTags && !slot.requiredTags.every((tag) => card.tags.includes(tag))) {
    return false;
  }
  return true;
}

function createContributors(cards, { playerId, useVirtualSelf, virtualSelfAllowed }) {
  const contributors = cards.map((card) => ({
    id: `card:${card.id}`,
    sourceType: CONTRIBUTOR_SOURCE.PHYSICAL_CARD,
    card,
    cardId: card.id,
    suit: card.suit,
    personOptions: card.relationalIdentityOptions,
  }));

  if (useVirtualSelf && virtualSelfAllowed) {
    if (!playerId) {
      throw new TypeError("playerId is required when virtual self is enabled");
    }
    assertKnownPerson(playerId, "playerId");
    contributors.push({
      id: `self:${playerId}`,
      sourceType: CONTRIBUTOR_SOURCE.VIRTUAL_SELF,
      card: null,
      cardId: null,
      suit: null,
      personOptions: Object.freeze([playerId]),
    });
  }

  return contributors;
}

function candidateAssignments(slot, contributors) {
  const candidates = [];

  for (const contributor of contributors) {
    if (slot.kind === ASSIGNMENT_SLOT.EXACT_CARD) {
      if (
        contributor.sourceType === CONTRIBUTOR_SOURCE.PHYSICAL_CARD &&
        contributor.cardId === slot.cardId
      ) {
        candidates.push({ contributor, assignedPersonId: null });
      }
      continue;
    }

    if (slot.kind === ASSIGNMENT_SLOT.EXACT_CARD_CHOICE) {
      if (
        contributor.sourceType === CONTRIBUTOR_SOURCE.PHYSICAL_CARD &&
        slot.cardIds.includes(contributor.cardId)
      ) {
        candidates.push({ contributor, assignedPersonId: null });
      }
      continue;
    }

    if (contributor.sourceType === CONTRIBUTOR_SOURCE.VIRTUAL_SELF) {
      if (!slot.allowVirtualSelf || slot.sameSuitGroup || slot.requiredSuit) continue;
      if (
        !slot.virtualSelfIgnoresPhysicalFilters &&
        (slot.requiredRanks || slot.requiredTags)
      ) {
        continue;
      }
    }

    if (
      contributor.sourceType === CONTRIBUTOR_SOURCE.PHYSICAL_CARD &&
      !physicalCardPassesFilters(contributor.card, slot)
    ) {
      continue;
    }

    if (slot.kind === ASSIGNMENT_SLOT.PERSON) {
      if (contributor.personOptions.includes(slot.personId)) {
        candidates.push({ contributor, assignedPersonId: slot.personId });
      }
      continue;
    }

    if (slot.kind === ASSIGNMENT_SLOT.PERSON_CHOICE) {
      for (const personId of slot.allowedPersonIds) {
        if (contributor.personOptions.includes(personId)) {
          candidates.push({ contributor, assignedPersonId: personId });
        }
      }
    }
  }

  return candidates;
}

function assignmentRecord(slot, candidate) {
  const contributor = candidate.contributor;
  return {
    slotId: slot.id,
    slotKind: slot.kind,
    sourceType: contributor.sourceType,
    contributorId: contributor.id,
    cardId: contributor.cardId,
    assignedPersonId: candidate.assignedPersonId,
    suit: contributor.suit,
  };
}

/**
 * Solves a one-to-one assignment between requirement slots and contributors.
 * A physical card or virtual-self contributor can occupy at most one slot.
 * A multi-person card chooses exactly one identity for the slot it occupies.
 */
export function findSlotAssignment({
  cardPool,
  slots,
  playerId = null,
  useVirtualSelf = false,
  virtualSelfAllowed = false,
} = {}) {
  const cards = normalizeCardPool(cardPool ?? []);
  if (!Array.isArray(slots) || slots.length === 0) {
    throw new TypeError("slots must be a non-empty array");
  }

  const normalizedSlots = slots.map(normalizeSlot);
  const slotIds = normalizedSlots.map((slot) => slot.id);
  if (new Set(slotIds).size !== slotIds.length) {
    throw new RangeError("slot IDs must be unique");
  }

  const contributors = createContributors(cards, {
    playerId,
    useVirtualSelf,
    virtualSelfAllowed,
  });

  if (normalizedSlots.length > contributors.length) {
    return freezeResult({
      matched: false,
      assignments: [],
      reason: "not_enough_contributors",
    });
  }

  const entries = normalizedSlots.map((slot) => ({
    slot,
    candidates: candidateAssignments(slot, contributors),
  }));

  if (entries.some((entry) => entry.candidates.length === 0)) {
    return freezeResult({
      matched: false,
      assignments: [],
      reason: "slot_without_candidate",
      impossibleSlotIds: entries
        .filter((entry) => entry.candidates.length === 0)
        .map((entry) => entry.slot.id),
    });
  }

  // Most constrained slots first greatly reduces branching and makes exact-card
  // reservations happen before flexible portrait assignments.
  entries.sort((a, b) => {
    const countDifference = a.candidates.length - b.candidates.length;
    if (countDifference !== 0) return countDifference;
    const aExact = a.slot.kind.startsWith("exact_card") ? 0 : 1;
    const bExact = b.slot.kind.startsWith("exact_card") ? 0 : 1;
    return aExact - bExact;
  });

  const usedContributorIds = new Set();
  const distinctPeopleByGroup = new Map();
  const suitByGroup = new Map();
  const chosen = [];

  function backtrack(position) {
    if (position === entries.length) return true;

    const { slot, candidates } = entries[position];
    for (const candidate of candidates) {
      const contributor = candidate.contributor;
      if (usedContributorIds.has(contributor.id)) continue;

      if (slot.distinctGroup && candidate.assignedPersonId) {
        const usedPeople = distinctPeopleByGroup.get(slot.distinctGroup);
        if (usedPeople?.has(candidate.assignedPersonId)) continue;
      }

      if (slot.sameSuitGroup) {
        // Virtual self has no suit and therefore can never satisfy a suited slot.
        if (!contributor.suit) continue;
        const existingSuit = suitByGroup.get(slot.sameSuitGroup);
        if (existingSuit && existingSuit !== contributor.suit) continue;
      }

      usedContributorIds.add(contributor.id);

      let addedDistinctPerson = false;
      if (slot.distinctGroup && candidate.assignedPersonId) {
        if (!distinctPeopleByGroup.has(slot.distinctGroup)) {
          distinctPeopleByGroup.set(slot.distinctGroup, new Set());
        }
        distinctPeopleByGroup.get(slot.distinctGroup).add(candidate.assignedPersonId);
        addedDistinctPerson = true;
      }

      let addedSuit = false;
      if (slot.sameSuitGroup && !suitByGroup.has(slot.sameSuitGroup)) {
        suitByGroup.set(slot.sameSuitGroup, contributor.suit);
        addedSuit = true;
      }

      chosen.push(assignmentRecord(slot, candidate));
      if (backtrack(position + 1)) return true;
      chosen.pop();

      if (addedSuit) suitByGroup.delete(slot.sameSuitGroup);
      if (addedDistinctPerson) {
        const usedPeople = distinctPeopleByGroup.get(slot.distinctGroup);
        usedPeople.delete(candidate.assignedPersonId);
        if (usedPeople.size === 0) distinctPeopleByGroup.delete(slot.distinctGroup);
      }
      usedContributorIds.delete(contributor.id);
    }

    return false;
  }

  const matched = backtrack(0);
  if (!matched) {
    return freezeResult({ matched: false, assignments: [], reason: "no_valid_one_to_one_assignment" });
  }

  // Return assignments in caller slot order rather than search order.
  const order = new Map(slotIds.map((slotId, index) => [slotId, index]));
  chosen.sort((a, b) => order.get(a.slotId) - order.get(b.slotId));

  return freezeResult({
    matched: true,
    assignments: chosen,
    reason: null,
  });
}

export function canAssignSlots(options) {
  return findSlotAssignment(options).matched;
}

export function assignRequiredPeople(
  cardPool,
  requiredPeople,
  {
    playerId = null,
    useVirtualSelf = false,
    virtualSelfAllowed = false,
    sameSuit = false,
  } = {}
) {
  const peopleToAssign = normalizePersonSequence(requiredPeople, "requiredPeople");
  const sameSuitGroup = sameSuit ? "required_people_same_suit" : null;
  const slots = peopleToAssign.map((personId, index) =>
    createPersonSlot(`person_${index}_${personId}`, personId, { sameSuitGroup })
  );

  return findSlotAssignment({
    cardPool,
    slots,
    playerId,
    useVirtualSelf,
    virtualSelfAllowed,
  });
}

export function assignDistinctPeople(
  cardPool,
  peoplePool,
  requiredCount,
  {
    playerId = null,
    useVirtualSelf = false,
    virtualSelfAllowed = false,
    sameSuit = false,
  } = {}
) {
  const allowedPeople = normalizeStringArray(peoplePool, "peoplePool");
  if (!Number.isInteger(requiredCount) || requiredCount < 1) {
    throw new RangeError("requiredCount must be a positive integer");
  }
  if (requiredCount > allowedPeople.length) {
    return freezeResult({ matched: false, assignments: [], reason: "required_count_exceeds_people_pool" });
  }

  const sameSuitGroup = sameSuit ? "distinct_people_same_suit" : null;
  const slots = Array.from({ length: requiredCount }, (_, index) =>
    createPersonChoiceSlot(`distinct_person_${index}`, allowedPeople, {
      distinctGroup: "distinct_people",
      sameSuitGroup,
    })
  );

  return findSlotAssignment({
    cardPool,
    slots,
    playerId,
    useVirtualSelf,
    virtualSelfAllowed,
  });
}

export function assignSlotsFromGroup(
  cardPool,
  peoplePool,
  requiredSlotCount,
  {
    playerId = null,
    useVirtualSelf = false,
    virtualSelfAllowed = false,
    sameSuit = false,
  } = {}
) {
  const allowedPeople = normalizeStringArray(peoplePool, "peoplePool");
  if (!Number.isInteger(requiredSlotCount) || requiredSlotCount < 1) {
    throw new RangeError("requiredSlotCount must be a positive integer");
  }

  const sameSuitGroup = sameSuit ? "group_slots_same_suit" : null;
  const slots = Array.from({ length: requiredSlotCount }, (_, index) =>
    createPersonChoiceSlot(`group_slot_${index}`, allowedPeople, { sameSuitGroup })
  );

  return findSlotAssignment({
    cardPool,
    slots,
    playerId,
    useVirtualSelf,
    virtualSelfAllowed,
  });
}

export function maximizeDistinctPeople(
  cardPool,
  peoplePool,
  {
    playerId = null,
    useVirtualSelf = false,
    virtualSelfAllowed = false,
    sameSuit = false,
  } = {}
) {
  const cards = normalizeCardPool(cardPool);
  const allowedPeople = normalizeStringArray(peoplePool, "peoplePool");
  const virtualContributorCount = useVirtualSelf && virtualSelfAllowed ? 1 : 0;
  const maximum = Math.min(allowedPeople.length, cards.length + virtualContributorCount);

  for (let count = maximum; count >= 1; count -= 1) {
    const result = assignDistinctPeople(cards, allowedPeople, count, {
      playerId,
      useVirtualSelf,
      virtualSelfAllowed,
      sameSuit,
    });
    if (result.matched) {
      return freezeResult({ count, assignments: result.assignments });
    }
  }

  return freezeResult({ count: 0, assignments: [] });
}

export function requireExactCards(cardPool, requiredCardIds) {
  const ids = normalizeStringArray(requiredCardIds, "requiredCardIds");
  const slots = ids.map((cardId, index) => createExactCardSlot(`exact_${index}_${cardId}`, cardId));
  return findSlotAssignment({ cardPool, slots });
}

export function requireOneExactAlternative(cardPool, alternatives) {
  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    throw new TypeError("alternatives must be a non-empty array");
  }

  for (const alternative of alternatives) {
    const result = requireExactCards(cardPool, alternative);
    if (result.matched) {
      return freezeResult({
        matched: true,
        matchedAlternative: Object.freeze([...alternative]),
        assignments: result.assignments,
      });
    }
  }

  return freezeResult({ matched: false, matchedAlternative: null, assignments: [] });
}
