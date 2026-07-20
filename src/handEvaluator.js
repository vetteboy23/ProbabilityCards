import {
  PERSON,
  people,
} from "./people.js";
import {
  cardById,
  siblingByRank,
} from "./cards.js";
import {
  HAND_EVALUATOR,
  BUILT_IN_HAND,
  handById,
  recognizedCouples,
} from "./hands.js";
import {
  CONTRIBUTOR_SOURCE,
  assignDistinctPeople,
  assignRequiredPeople,
  assignSlotsFromGroup,
  createExactCardChoiceSlot,
  createExactCardSlot,
  createPersonChoiceSlot,
  createPersonSlot,
  findSlotAssignment,
  maximizeDistinctPeople,
  normalizeCardPool,
  requireExactCards,
  requireOneExactAlternative,
} from "./cardAssignment.js";
import {
  GAME_FORMAT,
  getAttendanceHands,
} from "./setupRules.js";

export const POKER_CATEGORY = Object.freeze({
  HIGH_CARD: "high_card",
  ONE_PAIR: "one_pair",
  TWO_PAIR: "two_pair",
  THREE_OF_A_KIND: "three_of_a_kind",
  STRAIGHT: "straight",
  FLUSH: "flush",
  FULL_HOUSE: "full_house",
  FOUR_OF_A_KIND: "four_of_a_kind",
  STRAIGHT_FLUSH: "straight_flush",
  ROYAL_FLUSH: "royal_flush",
});

export const POKER_CATEGORY_STRENGTH = Object.freeze({
  [POKER_CATEGORY.HIGH_CARD]: 0,
  [POKER_CATEGORY.ONE_PAIR]: 1,
  [POKER_CATEGORY.TWO_PAIR]: 2,
  [POKER_CATEGORY.THREE_OF_A_KIND]: 3,
  [POKER_CATEGORY.STRAIGHT]: 4,
  [POKER_CATEGORY.FLUSH]: 5,
  [POKER_CATEGORY.FULL_HOUSE]: 6,
  [POKER_CATEGORY.FOUR_OF_A_KIND]: 7,
  [POKER_CATEGORY.STRAIGHT_FLUSH]: 8,
  [POKER_CATEGORY.ROYAL_FLUSH]: 9,
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function result({
  hand,
  matched,
  assignments = [],
  subtype = null,
  details = {},
  reason = null,
  qualificationAvailable = true,
  probabilityOnly = false,
}) {
  return deepFreeze({
    handId: hand.id,
    handName: hand.name,
    matched,
    qualificationAvailable,
    probabilityOnly,
    subtype,
    assignments: [...assignments],
    details,
    reason,
  });
}

function normalizeHand(handOrId) {
  const hand = typeof handOrId === "string" ? handById[handOrId] : handOrId;
  if (!hand || typeof hand !== "object" || !hand.id || !hand.evaluator) {
    throw new RangeError("handOrId must identify a known hand definition");
  }
  return hand;
}

function normalizeContext(context = {}) {
  const normalized = {
    format: context.format ?? GAME_FORMAT.FIVE_CARD_DRAW,
    playerId: context.playerId ?? null,
    useVirtualSelf: Boolean(context.useVirtualSelf),
    selectedPlayerIds: context.selectedPlayerIds ? [...context.selectedPlayerIds] : [],
  };

  if (!Object.values(GAME_FORMAT).includes(normalized.format)) {
    throw new RangeError(`Unsupported game format: ${normalized.format}`);
  }
  if (normalized.playerId && !people[normalized.playerId]) {
    throw new RangeError(`Unknown playerId: ${normalized.playerId}`);
  }
  for (const personId of normalized.selectedPlayerIds) {
    if (!people[personId]) throw new RangeError(`Unknown selected player: ${personId}`);
  }
  if (new Set(normalized.selectedPlayerIds).size !== normalized.selectedPlayerIds.length) {
    throw new RangeError("selectedPlayerIds cannot contain duplicates");
  }
  return normalized;
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

function fiveCardSubsets(cards) {
  if (cards.length === 5) return [cards];
  if (cards.length < 5) return [];
  return combinations(cards, 5);
}

function straightHighValue(cards) {
  const values = cards.map((card) => card.straightValue);
  if (values.some((value) => value === null || value === undefined)) return null;
  const unique = [...new Set(values)].sort((a, b) => a - b);
  if (unique.length !== 5) return null;
  if (JSON.stringify(unique) === JSON.stringify([2, 3, 4, 5, 14])) return 5;
  for (let index = 1; index < unique.length; index += 1) {
    if (unique[index] !== unique[0] + index) return null;
  }
  return unique[4];
}

export function classifyFiveCardPoker(cardPool) {
  const cards = normalizeCardPool(cardPool);
  if (cards.length !== 5) {
    throw new RangeError("classifyFiveCardPoker requires exactly five physical cards");
  }

  const rankCounts = new Map();
  for (const card of cards) {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) ?? 0) + 1);
  }
  const countPattern = [...rankCounts.values()].sort((a, b) => b - a);
  const flush = Boolean(cards[0].suit) && cards.every((card) => card.suit === cards[0].suit);
  const straightHigh = straightHighValue(cards);
  const straight = straightHigh !== null;
  const royalValues = [10, 11, 12, 13, 14];
  const sortedStraightValues = cards
    .map((card) => card.straightValue)
    .filter((value) => value !== null && value !== undefined)
    .sort((a, b) => a - b);
  const royal = flush && JSON.stringify(sortedStraightValues) === JSON.stringify(royalValues);

  let category;
  if (royal) category = POKER_CATEGORY.ROYAL_FLUSH;
  else if (flush && straight) category = POKER_CATEGORY.STRAIGHT_FLUSH;
  else if (countPattern[0] === 4) category = POKER_CATEGORY.FOUR_OF_A_KIND;
  else if (countPattern[0] === 3 && countPattern[1] === 2) category = POKER_CATEGORY.FULL_HOUSE;
  else if (flush) category = POKER_CATEGORY.FLUSH;
  else if (straight) category = POKER_CATEGORY.STRAIGHT;
  else if (countPattern[0] === 3) category = POKER_CATEGORY.THREE_OF_A_KIND;
  else if (countPattern[0] === 2 && countPattern[1] === 2) category = POKER_CATEGORY.TWO_PAIR;
  else if (countPattern[0] === 2) category = POKER_CATEGORY.ONE_PAIR;
  else category = POKER_CATEGORY.HIGH_CARD;

  return deepFreeze({
    category,
    strength: POKER_CATEGORY_STRENGTH[category],
    cardIds: cards.map((card) => card.id),
    straightHigh,
    flushSuit: flush ? cards[0].suit : null,
  });
}

export function classifyBestPokerHand(cardPool) {
  const cards = normalizeCardPool(cardPool);
  const subsets = fiveCardSubsets(cards);
  if (subsets.length === 0) {
    return deepFreeze({ category: null, strength: -1, cardIds: [], reason: "fewer_than_five_cards" });
  }

  let best = null;
  for (const subset of subsets) {
    const classified = classifyFiveCardPoker(subset);
    if (!best || classified.strength > best.strength) best = classified;
  }
  return best;
}

function candidatePeople(cards, context) {
  const ids = new Set();
  for (const card of cards) {
    for (const personId of card.relationalIdentityOptions) ids.add(personId);
  }
  if (context.useVirtualSelf && context.playerId) ids.add(context.playerId);
  return [...ids];
}

function evaluateStandardPoker(hand, cards) {
  const best = classifyBestPokerHand(cards);
  const matched = best.category === hand.requirements.pokerCategory;
  return result({ hand, matched, details: { bestPokerHand: best }, reason: matched ? null : "different_best_poker_category" });
}

function evaluateEchoMultiplicity(hand, cards, context) {
  const multiplicity = hand.requirements.multiplicity;
  for (const personId of candidatePeople(cards, context)) {
    const assignment = assignRequiredPeople(cards, Array(multiplicity).fill(personId), {
      playerId: context.playerId,
      useVirtualSelf: context.useVirtualSelf,
      virtualSelfAllowed: hand.virtualSelfAllowed,
    });
    if (assignment.matched) {
      return result({
        hand,
        matched: true,
        assignments: assignment.assignments,
        subtype: people[personId].displayName,
        details: { personId, multiplicity },
      });
    }
  }
  return result({ hand, matched: false, reason: "no_person_reaches_required_multiplicity" });
}

function evaluateEchoPattern(hand, cards, context) {
  const multiplicities = [...hand.requirements.multiplicities];
  const candidates = candidatePeople(cards, context);

  function search(position, chosenPeople) {
    if (position === multiplicities.length) {
      const requiredPeople = [];
      chosenPeople.forEach((personId, index) => {
        requiredPeople.push(...Array(multiplicities[index]).fill(personId));
      });
      const assignment = assignRequiredPeople(cards, requiredPeople, {
        playerId: context.playerId,
        useVirtualSelf: context.useVirtualSelf,
        virtualSelfAllowed: hand.virtualSelfAllowed,
      });
      if (!assignment.matched) return null;
      return { assignment, chosenPeople: [...chosenPeople] };
    }

    for (const personId of candidates) {
      if (chosenPeople.includes(personId)) continue;
      chosenPeople.push(personId);
      const found = search(position + 1, chosenPeople);
      if (found) return found;
      chosenPeople.pop();
    }
    return null;
  }

  const found = search(0, []);
  if (!found) return result({ hand, matched: false, reason: "echo_pattern_not_found" });
  return result({
    hand,
    matched: true,
    assignments: found.assignment.assignments,
    details: {
      people: found.chosenPeople.map((personId, index) => ({
        personId,
        displayName: people[personId].displayName,
        multiplicity: multiplicities[index],
      })),
    },
  });
}

function evaluateAnyCouple(hand, cards, context) {
  const couplesToCheck = hand.requirements.couples ?? recognizedCouples;
  for (const couple of couplesToCheck) {
    const assignment = assignRequiredPeople(cards, couple.partners, {
      playerId: context.playerId,
      useVirtualSelf: context.useVirtualSelf,
      virtualSelfAllowed: hand.virtualSelfAllowed,
    });
    if (assignment.matched) {
      return result({
        hand,
        matched: true,
        assignments: assignment.assignments,
        subtype: couple.id,
        details: { coupleId: couple.id, partners: couple.partners },
      });
    }
  }
  return result({ hand, matched: false, reason: "no_recognized_couple" });
}

function evaluateExactPeopleGroup(hand, cards, context) {
  const assignment = assignRequiredPeople(cards, hand.requirements.people, {
    playerId: context.playerId,
    useVirtualSelf: context.useVirtualSelf,
    virtualSelfAllowed: hand.virtualSelfAllowed,
  });
  return result({
    hand,
    matched: assignment.matched,
    assignments: assignment.assignments,
    reason: assignment.matched ? null : assignment.reason,
  });
}

function evaluateChooseDistinctPeople(hand, cards, context) {
  const assignment = assignDistinctPeople(
    cards,
    hand.requirements.peoplePool,
    hand.requirements.requiredCount,
    {
      playerId: context.playerId,
      useVirtualSelf: context.useVirtualSelf,
      virtualSelfAllowed: hand.virtualSelfAllowed,
    }
  );
  return result({
    hand,
    matched: assignment.matched,
    assignments: assignment.assignments,
    details: assignment.matched
      ? { people: assignment.assignments.map((item) => item.assignedPersonId) }
      : {},
    reason: assignment.matched ? null : assignment.reason,
  });
}

function evaluateAtTheGrill(hand, cards, context) {
  const { requiredAdults, childrenPool, requiredChildCount } = hand.requirements;
  for (const chosenChildren of combinations(childrenPool, requiredChildCount)) {
    const requiredPeople = [...requiredAdults, ...chosenChildren];
    const assignment = assignRequiredPeople(cards, requiredPeople, {
      playerId: context.playerId,
      useVirtualSelf: context.useVirtualSelf,
      virtualSelfAllowed: hand.virtualSelfAllowed,
    });
    if (assignment.matched) {
      return result({
        hand,
        matched: true,
        assignments: assignment.assignments,
        details: { children: chosenChildren },
      });
    }
  }
  return result({ hand, matched: false, reason: "required_grill_group_not_assignable" });
}

function evaluateExactCardSet(hand, cards) {
  const assignment = requireExactCards(cards, hand.requirements.requiredCardIds);
  return result({ hand, matched: assignment.matched, assignments: assignment.assignments, reason: assignment.matched ? null : assignment.reason });
}

function evaluateAbstractFixedPair(hand) {
  return result({
    hand,
    matched: null,
    qualificationAvailable: false,
    probabilityOnly: true,
    reason: "actual_card_ids_intentionally_not_stored",
    details: { specificPhysicalCardCount: hand.requirements.specificPhysicalCardCount },
  });
}

function evaluateExactAlternatives(hand, cards) {
  const assignment = requireOneExactAlternative(cards, hand.requirements.alternatives);
  return result({
    hand,
    matched: assignment.matched,
    assignments: assignment.assignments,
    details: assignment.matched ? { matchedAlternative: assignment.matchedAlternative } : {},
    reason: assignment.matched ? null : "no_exact_alternative_present",
  });
}

function evaluateExactSetWithOneOf(hand, cards) {
  const slots = [
    ...hand.requirements.requiredCardIds.map((cardId, index) =>
      createExactCardSlot(`required_${index}_${cardId}`, cardId)
    ),
    createExactCardChoiceSlot("one_of", hand.requirements.oneOfCardIds),
  ];
  const assignment = findSlotAssignment({ cardPool: cards, slots });
  return result({ hand, matched: assignment.matched, assignments: assignment.assignments, reason: assignment.matched ? null : assignment.reason });
}

function evaluateGrandparentAndChild(hand, cards, context) {
  const slots = [
    createPersonChoiceSlot("grandparent", hand.requirements.grandparentPeople, {
      allowVirtualSelf: false,
    }),
    createPersonChoiceSlot("ace_child", hand.requirements.childPeople, {
      allowVirtualSelf: true,
      requiredRanks: [hand.requirements.childPhysicalCardsUseRank],
      virtualSelfIgnoresPhysicalFilters: true,
    }),
  ];
  const assignment = findSlotAssignment({
    cardPool: cards,
    slots,
    playerId: context.playerId,
    useVirtualSelf: context.useVirtualSelf,
    virtualSelfAllowed: hand.virtualSelfAllowed,
  });
  return result({ hand, matched: assignment.matched, assignments: assignment.assignments, reason: assignment.matched ? null : assignment.reason });
}

function evaluateHeritage(hand, cards, context) {
  for (const alternative of hand.requirements.alternatives) {
    const assignment = findSlotAssignment({
      cardPool: cards,
      slots: [
        createExactCardSlot("portrait", alternative.portraitCardId),
        createPersonSlot("parent", alternative.parentPerson),
      ],
      playerId: context.playerId,
      useVirtualSelf: context.useVirtualSelf,
      virtualSelfAllowed: hand.virtualSelfAllowed,
    });
    if (assignment.matched) {
      return result({ hand, matched: true, assignments: assignment.assignments, subtype: alternative.parentPerson });
    }
  }
  return result({ hand, matched: false, reason: "no_matching_heritage_line" });
}

function evaluateDoubleHeritage(hand, cards, context) {
  const [queenId, kingId] = hand.requirements.parentPeople;
  const [queenPortrait, kingPortrait] = hand.requirements.requiredPortraitCardIds;
  const assignment = findSlotAssignment({
    cardPool: cards,
    slots: [
      createExactCardSlot("maternal_portrait", queenPortrait),
      createExactCardSlot("paternal_portrait", kingPortrait),
      createPersonSlot("queen", queenId),
      createPersonSlot("king", kingId),
    ],
    playerId: context.playerId,
    useVirtualSelf: context.useVirtualSelf,
    virtualSelfAllowed: hand.virtualSelfAllowed,
  });
  return result({ hand, matched: assignment.matched, assignments: assignment.assignments, reason: assignment.matched ? null : assignment.reason });
}

function evaluateAllSlotsFromGroup(hand, cards, context) {
  const assignment = assignSlotsFromGroup(
    cards,
    hand.requirements.peoplePool,
    hand.requirements.requiredSlotCount,
    {
      playerId: context.playerId,
      useVirtualSelf: context.useVirtualSelf,
      virtualSelfAllowed: hand.virtualSelfAllowed,
    }
  );
  return result({ hand, matched: assignment.matched, assignments: assignment.assignments, reason: assignment.matched ? null : assignment.reason });
}

function evaluateDynamicDuo(hand, cards, context) {
  const contributors = cards.map((card) => ({
    sourceType: CONTRIBUTOR_SOURCE.PHYSICAL_CARD,
    cardId: card.id,
    card,
    personOptions: card.relationalIdentityOptions,
  }));
  if (context.useVirtualSelf && hand.virtualSelfAllowed && context.playerId) {
    contributors.push({
      sourceType: CONTRIBUTOR_SOURCE.VIRTUAL_SELF,
      cardId: null,
      card: null,
      personOptions: [context.playerId],
    });
  }

  for (let index = 0; index < hand.requirements.personPairs.length; index += 1) {
    const personPair = hand.requirements.personPairs[index];
    const rankPair = hand.requirements.rankPairs[index];

    for (let first = 0; first < contributors.length; first += 1) {
      const firstContributor = contributors[first];
      if (!firstContributor.personOptions.includes(personPair[0])) continue;

      for (let second = 0; second < contributors.length; second += 1) {
        if (second === first) continue;
        const secondContributor = contributors[second];
        if (!secondContributor.personOptions.includes(personPair[1])) continue;

        const physicalContributors = [firstContributor, secondContributor].filter(
          (item) => item.sourceType === CONTRIBUTOR_SOURCE.PHYSICAL_CARD
        );
        const virtualSelfUsed = physicalContributors.length < 2;
        const eightCount = physicalContributors.filter(
          (item) => item.card.rank === "8"
        ).length;
        if (eightCount > hand.requirements.maximumEightSubstitutions) continue;

        if (!virtualSelfUsed) {
          const hasNaturalRankCard =
            firstContributor.card.rank === rankPair[0] ||
            secondContributor.card.rank === rankPair[1];
          if (!hasNaturalRankCard) continue;
        }

        const assignments = [
          {
            slotId: "dynamic_duo_0",
            slotKind: "person",
            sourceType: firstContributor.sourceType,
            contributorId:
              firstContributor.sourceType === CONTRIBUTOR_SOURCE.PHYSICAL_CARD
                ? `card:${firstContributor.cardId}`
                : `self:${context.playerId}`,
            cardId: firstContributor.cardId,
            assignedPersonId: personPair[0],
            suit: firstContributor.card?.suit ?? null,
          },
          {
            slotId: "dynamic_duo_1",
            slotKind: "person",
            sourceType: secondContributor.sourceType,
            contributorId:
              secondContributor.sourceType === CONTRIBUTOR_SOURCE.PHYSICAL_CARD
                ? `card:${secondContributor.cardId}`
                : `self:${context.playerId}`,
            cardId: secondContributor.cardId,
            assignedPersonId: personPair[1],
            suit: secondContributor.card?.suit ?? null,
          },
        ];

        return result({
          hand,
          matched: true,
          assignments,
          subtype: `${rankPair[0]}+${rankPair[1]}`,
          details: { personPair, rankPair, eightCount, virtualSelfUsed },
        });
      }
    }
  }
  return result({ hand, matched: false, reason: "no_dynamic_duo_pair" });
}

function childSlot(childId, childRank) {
  return createPersonSlot(`child_${childId}`, childId, {
    allowVirtualSelf: true,
    requiredRanks: [childRank],
    virtualSelfIgnoresPhysicalFilters: true,
  });
}

function coupleIsParentsOfChild(couple, childId, childParents) {
  const parents = childParents[childId] ?? [];
  return couple.partners.every((partner) => parents.includes(partner));
}

function evaluateFamilySleepover(hand, cards, context) {
  const requirements = hand.requirements;
  for (const childId of requirements.childPeople) {
    for (const couple of requirements.auntUncleCouples) {
      if (coupleIsParentsOfChild(couple, childId, requirements.childParents)) continue;

      if (requirements.couplePortraitMaySatisfyBothHosts && couple.weddingCardId) {
        const portraitAssignment = findSlotAssignment({
          cardPool: cards,
          slots: [childSlot(childId, requirements.childRank), createExactCardSlot("hosts_portrait", couple.weddingCardId)],
          playerId: context.playerId,
          useVirtualSelf: context.useVirtualSelf,
          virtualSelfAllowed: hand.virtualSelfAllowed,
        });
        if (portraitAssignment.matched) {
          return result({
            hand,
            matched: true,
            assignments: portraitAssignment.assignments,
            subtype: `${childId}_with_${couple.id}_portrait`,
            details: { childId, hosts: couple.partners, portraitCardId: couple.weddingCardId },
          });
        }
      }

      if (requirements.separateSpouseSlotsAlsoAllowed) {
        const separateAssignment = findSlotAssignment({
          cardPool: cards,
          slots: [
            childSlot(childId, requirements.childRank),
            createPersonSlot("host_1", couple.partners[0]),
            createPersonSlot("host_2", couple.partners[1]),
          ],
          playerId: context.playerId,
          useVirtualSelf: context.useVirtualSelf,
          virtualSelfAllowed: hand.virtualSelfAllowed,
        });
        if (separateAssignment.matched) {
          return result({
            hand,
            matched: true,
            assignments: separateAssignment.assignments,
            subtype: `${childId}_with_${couple.id}`,
            details: { childId, hosts: couple.partners },
          });
        }
      }
    }

    const grandparentsAssignment = findSlotAssignment({
      cardPool: cards,
      slots: [
        childSlot(childId, requirements.childRank),
        createPersonSlot("grandmother_generation", requirements.grandparentsAlternative[0]),
        createPersonSlot("grandfather_generation", requirements.grandparentsAlternative[1]),
      ],
      playerId: context.playerId,
      useVirtualSelf: context.useVirtualSelf,
      virtualSelfAllowed: hand.virtualSelfAllowed,
    });
    if (grandparentsAssignment.matched) {
      return result({
        hand,
        matched: true,
        assignments: grandparentsAssignment.assignments,
        subtype: `${childId}_with_queen_and_king`,
        details: { childId, hosts: requirements.grandparentsAlternative },
      });
    }
  }
  return result({ hand, matched: false, reason: "no_family_sleepover_configuration" });
}

function evaluateSameSuitRelationshipPair(hand, cards) {
  for (const subtype of hand.requirements.allowedSubtypes) {
    if (subtype.type === "choose_distinct_people") {
      const assignment = assignDistinctPeople(cards, subtype.peoplePool, subtype.requiredCount, { sameSuit: true });
      if (assignment.matched) {
        return result({ hand, matched: true, assignments: assignment.assignments, subtype: subtype.id });
      }
    } else if (subtype.type === "recognized_couple") {
      for (const couple of subtype.couples) {
        const assignment = assignRequiredPeople(cards, couple.partners, { sameSuit: true });
        if (assignment.matched) {
          return result({ hand, matched: true, assignments: assignment.assignments, subtype: `${subtype.id}:${couple.id}` });
        }
      }
    } else if (subtype.type === "direct_parent_child") {
      for (const relationship of subtype.relationships) {
        for (const parentId of relationship.parents) {
          for (const childId of relationship.children) {
            const assignment = assignRequiredPeople(cards, [parentId, childId], { sameSuit: true });
            if (assignment.matched) {
              return result({ hand, matched: true, assignments: assignment.assignments, subtype: `${subtype.id}:${relationship.id}:${parentId}:${childId}` });
            }
          }
        }
      }
    }
  }
  return result({ hand, matched: false, reason: "no_same_suit_relationship_pair" });
}

export function evaluateAttendanceHands(cardPool, context = {}) {
  const cards = normalizeCardPool(cardPool);
  const normalizedContext = normalizeContext(context);
  const selectedPlayerIds = normalizedContext.selectedPlayerIds;
  if (selectedPlayerIds.length < 2) {
    throw new RangeError("Attendance evaluation requires at least two selected players");
  }

  const attendanceDefinitions = getAttendanceHands({
    selectedPlayerCount: selectedPlayerIds.length,
    format: normalizedContext.format,
    useVirtualSelf: normalizedContext.useVirtualSelf,
  });
  const virtualSelfAllowed = selectedPlayerIds.length >= 5 && normalizedContext.useVirtualSelf;
  const maximum = maximizeDistinctPeople(cards, selectedPlayerIds, {
    playerId: normalizedContext.playerId,
    useVirtualSelf: normalizedContext.useVirtualSelf,
    virtualSelfAllowed,
  });

  const matchedHands = attendanceDefinitions
    .filter((definition) => maximum.count >= definition.requiredCount)
    .map((definition) => ({ ...definition, matched: true }));

  return deepFreeze({
    maximumRepresented: maximum.count,
    assignments: maximum.assignments,
    generatedHands: attendanceDefinitions,
    matchedHands,
  });
}

function evaluateAttendanceGenerator(hand, cards, context) {
  const attendance = evaluateAttendanceHands(cards, context);
  return result({
    hand,
    matched: attendance.matchedHands.length > 0,
    assignments: attendance.assignments,
    details: attendance,
    reason: attendance.matchedHands.length > 0 ? null : "no_generated_attendance_hand_met",
  });
}

const evaluators = Object.freeze({
  [HAND_EVALUATOR.STANDARD_POKER_CATEGORY]: evaluateStandardPoker,
  [HAND_EVALUATOR.ECHO_MULTIPLICITY]: evaluateEchoMultiplicity,
  [HAND_EVALUATOR.ECHO_PATTERN]: evaluateEchoPattern,
  [HAND_EVALUATOR.ANY_RECOGNIZED_COUPLE]: evaluateAnyCouple,
  [HAND_EVALUATOR.EXACT_PEOPLE_GROUP]: evaluateExactPeopleGroup,
  [HAND_EVALUATOR.CHOOSE_DISTINCT_PEOPLE]: evaluateChooseDistinctPeople,
  [HAND_EVALUATOR.AT_THE_GRILL]: evaluateAtTheGrill,
  [HAND_EVALUATOR.EXACT_CARD_SET]: evaluateExactCardSet,
  [HAND_EVALUATOR.FIXED_SPECIFIC_CARD_PAIR_PROBABILITY]: evaluateAbstractFixedPair,
  [HAND_EVALUATOR.EXACT_CARD_ALTERNATIVES]: evaluateExactAlternatives,
  [HAND_EVALUATOR.EXACT_CARD_SET_WITH_ONE_OF]: evaluateExactSetWithOneOf,
  [HAND_EVALUATOR.GRANDPARENT_AND_CHILD]: evaluateGrandparentAndChild,
  [HAND_EVALUATOR.HERITAGE]: evaluateHeritage,
  [HAND_EVALUATOR.DOUBLE_HERITAGE]: evaluateDoubleHeritage,
  [HAND_EVALUATOR.ALL_SLOTS_FROM_GROUP]: evaluateAllSlotsFromGroup,
  [HAND_EVALUATOR.DYNAMIC_DUO]: evaluateDynamicDuo,
  [HAND_EVALUATOR.FAMILY_SLEEPOVER]: evaluateFamilySleepover,
  [HAND_EVALUATOR.SAME_SUIT_RELATIONSHIP_PAIR]: evaluateSameSuitRelationshipPair,
  [HAND_EVALUATOR.ATTENDANCE_GENERATOR]: evaluateAttendanceGenerator,
});

export function evaluateHand(handOrId, cardPool, context = {}) {
  const hand = normalizeHand(handOrId);
  const cards = normalizeCardPool(cardPool ?? []);
  const normalizedContext = normalizeContext(context);

  if (!hand.supportedFormats.includes(normalizedContext.format)) {
    return result({ hand, matched: false, reason: "unsupported_format" });
  }
  if (cards.length < hand.minimumPhysicalCards) {
    return result({ hand, matched: false, reason: "fewer_than_minimum_physical_cards" });
  }

  const evaluator = evaluators[hand.evaluator];
  if (!evaluator) throw new Error(`No executable evaluator for ${hand.evaluator}`);
  return evaluator(hand, cards, normalizedContext);
}

export function evaluateHands(handDefinitions, cardPool, context = {}) {
  if (!Array.isArray(handDefinitions)) {
    throw new TypeError("handDefinitions must be an array");
  }
  return deepFreeze(handDefinitions.map((hand) => evaluateHand(hand, cardPool, context)));
}

export function qualifyingHands(handDefinitions, cardPool, context = {}) {
  return deepFreeze(
    evaluateHands(handDefinitions, cardPool, context).filter((evaluation) => evaluation.matched === true)
  );
}

export const handEvaluatorMetadata = Object.freeze({
  executableEvaluatorCount: Object.keys(evaluators).length,
  allKnownEvaluatorTypesImplemented: Object.values(HAND_EVALUATOR).every(
    (evaluatorId) => Boolean(evaluators[evaluatorId])
  ),
  dancersUsesAbstractProbabilityOnly: true,
  exactCardHandsRequireActualCards: true,
  virtualSelfHasSuit: false,
  maxPeoplePerPhysicalCardPerEvaluation: 1,
});
