import {
  PERSON,
  people,
  siblingIds,
  sisterIds,
  brotherIds,
  couples,
  parentChildRelationships,
} from "./people.js";
import { cardById } from "./cards.js";

export const HAND_AVAILABILITY = Object.freeze({
  BUILT_IN: "built_in",
  SELECTABLE: "selectable",
  GENERATED: "generated",
});

export const HAND_CATEGORY = Object.freeze({
  STANDARD_POKER: "standard_poker",
  ECHO: "echo",
  RELATIONSHIP: "relationship",
  EXACT_CARD: "exact_card",
  ATTENDANCE: "attendance",
});

export const HAND_EVALUATOR = Object.freeze({
  STANDARD_POKER_CATEGORY: "standard_poker_category",
  ECHO_MULTIPLICITY: "echo_multiplicity",
  ECHO_PATTERN: "echo_pattern",
  ANY_RECOGNIZED_COUPLE: "any_recognized_couple",
  EXACT_PEOPLE_GROUP: "exact_people_group",
  CHOOSE_DISTINCT_PEOPLE: "choose_distinct_people",
  AT_THE_GRILL: "at_the_grill",
  EXACT_CARD_SET: "exact_card_set",
  FIXED_SPECIFIC_CARD_PAIR_PROBABILITY: "fixed_specific_card_pair_probability",
  EXACT_CARD_ALTERNATIVES: "exact_card_alternatives",
  EXACT_CARD_SET_WITH_ONE_OF: "exact_card_set_with_one_of",
  GRANDPARENT_AND_CHILD: "grandparent_and_child",
  HERITAGE: "heritage",
  DOUBLE_HERITAGE: "double_heritage",
  ALL_SLOTS_FROM_GROUP: "all_slots_from_group",
  DYNAMIC_DUO: "dynamic_duo",
  FAMILY_SLEEPOVER: "family_sleepover",
  SAME_SUIT_RELATIONSHIP_PAIR: "same_suit_relationship_pair",
  ATTENDANCE_GENERATOR: "attendance_generator",
});

export const RANKING_MODE = Object.freeze({
  CALCULATED_PROBABILITY: "calculated_probability",
  FIXED_TIER: "fixed_tier",
  GENERATED_PROBABILITY: "generated_probability",
});

export const RANKING_TIER = Object.freeze({
  RARE_EXACT_PAIR: "rare_exact_pair",
});

export const OPTIONAL_HAND = Object.freeze({
  GRANDPARENT_AND_ACE: "grandparent_and_ace",
  HERITAGE: "heritage",
  DOUBLE_HERITAGE: "double_heritage",
  BROTHER_TIME: "brother_time",
  SISTER_TIME: "sister_time",
  DYNAMIC_DUO: "dynamic_duo",
  FAMILY_SLEEPOVER: "family_sleepover",
  SAME_SUIT_RELATIONSHIP_PAIR: "same_suit_relationship_pair",
});

export const BUILT_IN_HAND = Object.freeze({
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

  ECHO_PAIR: "echo_pair",
  ECHO_TWO_PAIR: "echo_two_pair",
  ECHO_THREE_OF_A_KIND: "echo_three_of_a_kind",
  ECHO_FULL_HOUSE: "echo_full_house",
  ECHO_FOUR_OF_A_KIND: "echo_four_of_a_kind",
  ECHO_FIVE_OF_A_KIND: "echo_five_of_a_kind",
  ECHO_SIX_OF_A_KIND: "echo_six_of_a_kind",
  ECHO_SEVEN_OF_A_KIND: "echo_seven_of_a_kind",
  ECHO_EIGHT_OF_A_KIND: "echo_eight_of_a_kind",

  MARRIED_COUPLE: "married_couple",
  HAPPY_AND_LIGHT: "happy_and_light",
  THREE_BROTHERS: "three_brothers",
  THREE_SISTERS: "three_sisters",
  FOUR_SISTERS: "four_sisters",
  FIVE_SISTERS: "five_sisters",
  THREE_KIDS: "three_kids",
  THREE_AT_THE_GRILL: "three_at_the_grill",
  FOUR_AT_THE_GRILL: "four_at_the_grill",
  FIVE_AT_THE_GRILL: "five_at_the_grill",

  JERSEY_PAIR: "jersey_pair",
  DANCERS: "dancers",
  FAMILY_ALBUM: "family_album",
  GRANDPARENTS_ALBUM: "grandparents_album",
  FUN_FLIGHT: "fun_flight",
  FULL_ANCESTRY: "full_ancestry",

  ATTENDANCE_FAMILY: "attendance_players_represented",
});

export const FORMATS = Object.freeze([
  "five_card_draw",
  "texas_holdem",
]);

export const grandparentIds = Object.freeze([
  PERSON.MATERNAL_GRANDMOTHER,
  PERSON.MATERNAL_GRANDFATHER,
  PERSON.PATERNAL_GRANDMOTHER,
  PERSON.KICK,
]);

export const grandchildIds = Object.freeze([
  PERSON.LIGHT,
  PERSON.CUBE,
  PERSON.BALL,
  PERSON.NET,
]);

export const sleepyChildIds = Object.freeze([
  PERSON.CUBE,
  PERSON.BALL,
  PERSON.NET,
]);

/*
 * `couples` contains the four sibling-generation married couples.
 * This broader list also recognizes Queen/King and both grandparent couples.
 */
export const recognizedCouples = Object.freeze([
  ...couples,
  Object.freeze({
    id: "queen_king",
    partners: Object.freeze([PERSON.QUEEN, PERSON.KING]),
    weddingCardId: null,
  }),
  Object.freeze({
    id: "maternal_grandparents",
    partners: Object.freeze([
      PERSON.MATERNAL_GRANDMOTHER,
      PERSON.MATERNAL_GRANDFATHER,
    ]),
    weddingCardId: null,
  }),
  Object.freeze({
    id: "paternal_grandparents",
    partners: Object.freeze([PERSON.PATERNAL_GRANDMOTHER, PERSON.KICK]),
    weddingCardId: null,
  }),
]);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return value;
}

function defineHand({
  id,
  name,
  availability,
  category,
  evaluator,
  description,
  shortDescription = description,
  ruleSummary = description,
  minimumPhysicalCards = 0,
  minimumContributingSlots = minimumPhysicalCards,
  virtualSelfAllowed = false,
  exactCardRequirement = false,
  suitRequirement = false,
  supportedFormats = FORMATS,
  rankingMode = RANKING_MODE.CALCULATED_PROBABILITY,
  rankingTier = null,
  requirements = {},
  notes = [],
}) {
  return deepFreeze({
    id,
    name,
    availability,
    builtIn: availability === HAND_AVAILABILITY.BUILT_IN,
    selectable: availability === HAND_AVAILABILITY.SELECTABLE,
    generated: availability === HAND_AVAILABILITY.GENERATED,
    category,
    evaluator,
    description,
    shortDescription,
    ruleSummary,
    minimumPhysicalCards,
    minimumContributingSlots,
    virtualSelfAllowed,
    exactCardRequirement,
    suitRequirement,
    supportedFormats: [...supportedFormats],
    rankingMode,
    rankingTier,
    requirements,
    notes: [...notes],
  });
}

const standardPokerHands = [
  [BUILT_IN_HAND.HIGH_CARD, "High Card", "high_card"],
  [BUILT_IN_HAND.ONE_PAIR, "One Pair", "one_pair"],
  [BUILT_IN_HAND.TWO_PAIR, "Two Pair", "two_pair"],
  [BUILT_IN_HAND.THREE_OF_A_KIND, "Three of a Kind", "three_of_a_kind"],
  [BUILT_IN_HAND.STRAIGHT, "Straight", "straight"],
  [BUILT_IN_HAND.FLUSH, "Flush", "flush"],
  [BUILT_IN_HAND.FULL_HOUSE, "Full House", "full_house"],
  [BUILT_IN_HAND.FOUR_OF_A_KIND, "Four of a Kind", "four_of_a_kind"],
  [BUILT_IN_HAND.STRAIGHT_FLUSH, "Straight Flush", "straight_flush"],
  [BUILT_IN_HAND.ROYAL_FLUSH, "Royal Flush", "royal_flush"],
].map(([id, name, categoryValue]) =>
  defineHand({
    id,
    name,
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.STANDARD_POKER,
    evaluator: HAND_EVALUATOR.STANDARD_POKER_CATEGORY,
    description: `${name} under the ordinary poker rules for the selected deck.`,
    minimumPhysicalCards: 5,
    virtualSelfAllowed: false,
    requirements: {
      pokerCategory: categoryValue,
      crownInOrdinaryStraights: false,
      rankedJokersInOrdinaryStraights: false,
      jokersAreWild: false,
    },
  })
);

const echoHands = [
  defineHand({
    id: BUILT_IN_HAND.ECHO_PAIR,
    name: "Echo Pair",
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.ECHO,
    evaluator: HAND_EVALUATOR.ECHO_MULTIPLICITY,
    description: "The same person is represented in two contributing slots.",
    minimumPhysicalCards: 1,
    minimumContributingSlots: 2,
    virtualSelfAllowed: true,
    requirements: { multiplicity: 2 },
  }),
  defineHand({
    id: BUILT_IN_HAND.ECHO_TWO_PAIR,
    name: "Echo Two Pair",
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.ECHO,
    evaluator: HAND_EVALUATOR.ECHO_PATTERN,
    description: "Two different people are each represented twice.",
    minimumPhysicalCards: 3,
    minimumContributingSlots: 4,
    virtualSelfAllowed: true,
    requirements: { multiplicities: [2, 2], requireDifferentPeople: true },
  }),
  defineHand({
    id: BUILT_IN_HAND.ECHO_THREE_OF_A_KIND,
    name: "Echo Three of a Kind",
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.ECHO,
    evaluator: HAND_EVALUATOR.ECHO_MULTIPLICITY,
    description: "The same person is represented in three contributing slots.",
    minimumPhysicalCards: 2,
    minimumContributingSlots: 3,
    virtualSelfAllowed: true,
    requirements: { multiplicity: 3 },
  }),
  defineHand({
    id: BUILT_IN_HAND.ECHO_FULL_HOUSE,
    name: "Echo Full House",
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.ECHO,
    evaluator: HAND_EVALUATOR.ECHO_PATTERN,
    description:
      "One person is represented three times and another person twice.",
    minimumPhysicalCards: 4,
    minimumContributingSlots: 5,
    virtualSelfAllowed: true,
    requirements: { multiplicities: [3, 2], requireDifferentPeople: true },
  }),
  ...[
    [BUILT_IN_HAND.ECHO_FOUR_OF_A_KIND, "Echo Four of a Kind", 4],
    [BUILT_IN_HAND.ECHO_FIVE_OF_A_KIND, "Echo Five of a Kind", 5],
    [BUILT_IN_HAND.ECHO_SIX_OF_A_KIND, "Echo Six of a Kind", 6],
    [BUILT_IN_HAND.ECHO_SEVEN_OF_A_KIND, "Echo Seven of a Kind", 7],
    [BUILT_IN_HAND.ECHO_EIGHT_OF_A_KIND, "Echo Eight of a Kind", 8],
  ].map(([id, name, multiplicity]) =>
    defineHand({
      id,
      name,
      availability: HAND_AVAILABILITY.BUILT_IN,
      category: HAND_CATEGORY.ECHO,
      evaluator: HAND_EVALUATOR.ECHO_MULTIPLICITY,
      description: `The same person is represented in ${multiplicity} contributing slots.`,
      minimumPhysicalCards: Math.max(1, multiplicity - 1),
      minimumContributingSlots: multiplicity,
      virtualSelfAllowed: true,
      requirements: { multiplicity },
      notes: [
        "The selected game format and virtual-self setting determine whether this level is possible.",
      ],
    })
  ),
];

const relationshipHands = [
  defineHand({
    id: BUILT_IN_HAND.MARRIED_COUPLE,
    name: "Married Couple",
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.RELATIONSHIP,
    evaluator: HAND_EVALUATOR.ANY_RECOGNIZED_COUPLE,
    description:
      "Two contributing slots represent both members of any recognized couple.",
    minimumPhysicalCards: 1,
    minimumContributingSlots: 2,
    virtualSelfAllowed: true,
    requirements: {
      couples: recognizedCouples.map(({ id, partners }) => ({ id, partners })),
      requireSeparateSlots: true,
      multiPersonCardMayFillOnlyOnePartner: true,
    },
  }),
  defineHand({
    id: BUILT_IN_HAND.HAPPY_AND_LIGHT,
    name: "Happy and Light",
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.RELATIONSHIP,
    evaluator: HAND_EVALUATOR.EXACT_PEOPLE_GROUP,
    description: "Happy and Light are represented in two separate slots.",
    minimumPhysicalCards: 1,
    minimumContributingSlots: 2,
    virtualSelfAllowed: true,
    requirements: {
      people: [PERSON.HAPPY, PERSON.LIGHT],
      distinctPeople: true,
      requireSeparateSlots: true,
    },
  }),
  defineHand({
    id: BUILT_IN_HAND.THREE_BROTHERS,
    name: "Three Brothers",
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.RELATIONSHIP,
    evaluator: HAND_EVALUATOR.EXACT_PEOPLE_GROUP,
    description: "Dopey, Doc, and Bashful are represented in separate slots.",
    minimumPhysicalCards: 2,
    minimumContributingSlots: 3,
    virtualSelfAllowed: true,
    requirements: {
      people: [...brotherIds],
      distinctPeople: true,
      requireSeparateSlots: true,
    },
  }),
  ...[
    [BUILT_IN_HAND.THREE_SISTERS, "Three Sisters", 3],
    [BUILT_IN_HAND.FOUR_SISTERS, "Four Sisters", 4],
    [BUILT_IN_HAND.FIVE_SISTERS, "Five Sisters", 5],
  ].map(([id, name, requiredCount]) =>
    defineHand({
      id,
      name,
      availability: HAND_AVAILABILITY.BUILT_IN,
      category: HAND_CATEGORY.RELATIONSHIP,
      evaluator: HAND_EVALUATOR.CHOOSE_DISTINCT_PEOPLE,
      description: `${requiredCount} different sisters are represented in separate slots.`,
      minimumPhysicalCards: requiredCount - 1,
      minimumContributingSlots: requiredCount,
      virtualSelfAllowed: true,
      requirements: {
        peoplePool: [...sisterIds],
        requiredCount,
        distinctPeople: true,
        requireSeparateSlots: true,
      },
    })
  ),
  defineHand({
    id: BUILT_IN_HAND.THREE_KIDS,
    name: "The Three Kids",
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.RELATIONSHIP,
    evaluator: HAND_EVALUATOR.EXACT_PEOPLE_GROUP,
    description: "Cube, Ball, and Net are represented in separate slots.",
    minimumPhysicalCards: 2,
    minimumContributingSlots: 3,
    virtualSelfAllowed: true,
    requirements: {
      people: [...sleepyChildIds],
      distinctPeople: true,
      requireSeparateSlots: true,
    },
  }),
  ...[
    [BUILT_IN_HAND.THREE_AT_THE_GRILL, "Three at the Grill", 1],
    [BUILT_IN_HAND.FOUR_AT_THE_GRILL, "Four at the Grill", 2],
    [BUILT_IN_HAND.FIVE_AT_THE_GRILL, "Five at the Grill", 3],
  ].map(([id, name, childCount]) =>
    defineHand({
      id,
      name,
      availability: HAND_AVAILABILITY.BUILT_IN,
      category: HAND_CATEGORY.RELATIONSHIP,
      evaluator: HAND_EVALUATOR.AT_THE_GRILL,
      description: `Sleepy, Steak, and ${
        childCount === 1 ? "one child" : childCount === 2 ? "two children" : "all three children"
      } are represented in separate slots.`,
      minimumPhysicalCards: childCount + 1,
      minimumContributingSlots: childCount + 2,
      virtualSelfAllowed: true,
      requirements: {
        requiredAdults: [PERSON.SLEEPY, PERSON.STEAK],
        childrenPool: [...sleepyChildIds],
        requiredChildCount: childCount,
        distinctPeople: true,
        requireSeparateSlots: true,
        tenOfSpadesMayRepresentOneHouseholdMember: true,
      },
    })
  ),
];

const rareExactPairHands = [
  defineHand({
    id: BUILT_IN_HAND.JERSEY_PAIR,
    name: "Jersey Pair",
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.EXACT_CARD,
    evaluator: HAND_EVALUATOR.EXACT_CARD_SET,
    description: "The exact J♠ Steak card and A♠ Ball card appear together.",
    minimumPhysicalCards: 2,
    virtualSelfAllowed: false,
    exactCardRequirement: true,
    rankingMode: RANKING_MODE.FIXED_TIER,
    rankingTier: RANKING_TIER.RARE_EXACT_PAIR,
    requirements: { requiredCardIds: ["JS", "AS"] },
  }),
  defineHand({
    id: BUILT_IN_HAND.DANCERS,
    name: "Dancers",
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.EXACT_CARD,
    evaluator: HAND_EVALUATOR.FIXED_SPECIFIC_CARD_PAIR_PROBABILITY,
    description: "A fixed pair of two specific physical cards appears together.",
    minimumPhysicalCards: 2,
    virtualSelfAllowed: false,
    exactCardRequirement: true,
    rankingMode: RANKING_MODE.FIXED_TIER,
    rankingTier: RANKING_TIER.RARE_EXACT_PAIR,
    requirements: { specificPhysicalCardCount: 2 },
    notes: [
      "The actual card IDs are intentionally not stored because only the exact pair probability is needed.",
    ],
  }),
  defineHand({
    id: BUILT_IN_HAND.FAMILY_ALBUM,
    name: "Family Album",
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.EXACT_CARD,
    evaluator: HAND_EVALUATOR.EXACT_CARD_SET,
    description: "The exact 7♠ and 10♠ household portraits appear together.",
    minimumPhysicalCards: 2,
    virtualSelfAllowed: false,
    exactCardRequirement: true,
    rankingMode: RANKING_MODE.FIXED_TIER,
    rankingTier: RANKING_TIER.RARE_EXACT_PAIR,
    requirements: { requiredCardIds: ["7S", "10S"] },
  }),
  defineHand({
    id: BUILT_IN_HAND.GRANDPARENTS_ALBUM,
    name: "Grandparents Album",
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.EXACT_CARD,
    evaluator: HAND_EVALUATOR.EXACT_CARD_SET,
    description: "The exact Q♠ and K♠ grandparent portraits appear together.",
    minimumPhysicalCards: 2,
    virtualSelfAllowed: false,
    exactCardRequirement: true,
    rankingMode: RANKING_MODE.FIXED_TIER,
    rankingTier: RANKING_TIER.RARE_EXACT_PAIR,
    requirements: { requiredCardIds: ["QS", "KS"] },
  }),
  defineHand({
    id: BUILT_IN_HAND.FUN_FLIGHT,
    name: "Fun Flight",
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.EXACT_CARD,
    evaluator: HAND_EVALUATOR.EXACT_CARD_ALTERNATIVES,
    description:
      "The exact 9♠ Fly portrait appears with K♠ or Kick’s Joker.",
    minimumPhysicalCards: 2,
    virtualSelfAllowed: false,
    exactCardRequirement: true,
    rankingMode: RANKING_MODE.FIXED_TIER,
    rankingTier: RANKING_TIER.RARE_EXACT_PAIR,
    requirements: {
      alternatives: [
        ["9S", "KS"],
        ["9S", "JOKER_KICK"],
      ],
      notes:
        "Its true probability may differ by Joker setting, but its gameplay rank is tied to the other rare exact pairs.",
    },
  }),
];

const otherBuiltInHands = [
  defineHand({
    id: BUILT_IN_HAND.FULL_ANCESTRY,
    name: "Full Ancestry",
    availability: HAND_AVAILABILITY.BUILT_IN,
    category: HAND_CATEGORY.EXACT_CARD,
    evaluator: HAND_EVALUATOR.EXACT_CARD_SET_WITH_ONE_OF,
    description:
      "Crown♠, Q♠, K♠, and one wedding Spade appear together.",
    minimumPhysicalCards: 4,
    virtualSelfAllowed: false,
    exactCardRequirement: true,
    requirements: {
      requiredCardIds: ["CROWN_S", "QS", "KS"],
      oneOfCardIds: ["3S", "4S", "5S"],
    },
  }),
];

const selectableHandDefinitions = [
  defineHand({
    id: OPTIONAL_HAND.GRANDPARENT_AND_ACE,
    name: "Grandparent and Ace",
    availability: HAND_AVAILABILITY.SELECTABLE,
    category: HAND_CATEGORY.RELATIONSHIP,
    evaluator: HAND_EVALUATOR.GRANDPARENT_AND_CHILD,
    description: "A grandparent is represented with one of the four Ace children.",
    shortDescription: "A grandparent together with one of the four Ace children.",
    ruleSummary:
      "Separate slots represent any grandparent and Light, Cube, Ball, or Net. Virtual self may fill the child slot when applicable.",
    minimumPhysicalCards: 1,
    minimumContributingSlots: 2,
    virtualSelfAllowed: true,
    requirements: {
      grandparentPeople: [...grandparentIds],
      childPeople: [...grandchildIds],
      childPhysicalCardsUseRank: "A",
      allowVirtualSelfForChild: true,
      requireSeparateSlots: true,
    },
  }),
  defineHand({
    id: OPTIONAL_HAND.HERITAGE,
    name: "Heritage",
    availability: HAND_AVAILABILITY.SELECTABLE,
    category: HAND_CATEGORY.RELATIONSHIP,
    evaluator: HAND_EVALUATOR.HERITAGE,
    description: "A parent appears with that parent’s grandparent portrait.",
    shortDescription: "A parent appears with that parent’s grandparent portrait.",
    ruleSummary:
      "Queen plus Q♠, or King plus K♠, using separate slots. Crown♠ may represent one parent, and virtual self may fill the matching parent slot.",
    minimumPhysicalCards: 1,
    minimumContributingSlots: 2,
    virtualSelfAllowed: true,
    exactCardRequirement: true,
    requirements: {
      alternatives: [
        { parentPerson: PERSON.QUEEN, portraitCardId: "QS" },
        { parentPerson: PERSON.KING, portraitCardId: "KS" },
      ],
      parentMayBeCrown: true,
      requireSeparateSlots: true,
    },
  }),
  defineHand({
    id: OPTIONAL_HAND.DOUBLE_HERITAGE,
    name: "Double Heritage",
    availability: HAND_AVAILABILITY.SELECTABLE,
    category: HAND_CATEGORY.RELATIONSHIP,
    evaluator: HAND_EVALUATOR.DOUBLE_HERITAGE,
    description: "Both parents appear with both grandparent portraits.",
    shortDescription: "Both parents appear with both grandparent portraits.",
    ruleSummary:
      "Separate slots represent Queen and King with the exact Q♠ and K♠ cards. Crown♠ may fill only one parent slot, and virtual self may fill one matching parent slot.",
    minimumPhysicalCards: 3,
    minimumContributingSlots: 4,
    virtualSelfAllowed: true,
    exactCardRequirement: true,
    requirements: {
      parentPeople: [PERSON.QUEEN, PERSON.KING],
      requiredPortraitCardIds: ["QS", "KS"],
      crownCardId: "CROWN_S",
      crownMayFillMaximumParentSlots: 1,
      virtualSelfMayFillMaximumParentSlots: 1,
      requireSeparateSlots: true,
    },
  }),
  defineHand({
    id: OPTIONAL_HAND.BROTHER_TIME,
    name: "Brother Time",
    availability: HAND_AVAILABILITY.SELECTABLE,
    category: HAND_CATEGORY.RELATIONSHIP,
    evaluator: HAND_EVALUATOR.ALL_SLOTS_FROM_GROUP,
    description: "Five contributing slots can each be assigned as a brother.",
    shortDescription: "Five contributing slots all represent brothers.",
    ruleSummary:
      "Each slot represents Dopey, Doc, or Bashful. An 8 may fill one brother slot, and virtual self supplies one slot when the player is a brother.",
    minimumPhysicalCards: 4,
    minimumContributingSlots: 5,
    virtualSelfAllowed: true,
    requirements: {
      peoplePool: [...brotherIds],
      requiredSlotCount: 5,
      distinctPeopleRequired: false,
      everyContributingSlotMustMatchGroup: true,
    },
  }),
  defineHand({
    id: OPTIONAL_HAND.SISTER_TIME,
    name: "Sister Time",
    availability: HAND_AVAILABILITY.SELECTABLE,
    category: HAND_CATEGORY.RELATIONSHIP,
    evaluator: HAND_EVALUATOR.ALL_SLOTS_FROM_GROUP,
    description: "Five contributing slots can each be assigned as a sister.",
    shortDescription: "Five contributing slots all represent sisters.",
    ruleSummary:
      "Each slot represents Snow White, Grumpy, Sneezy, Happy, or Sleepy. An 8 may fill one sister slot, and virtual self supplies one slot when the player is a sister.",
    minimumPhysicalCards: 4,
    minimumContributingSlots: 5,
    virtualSelfAllowed: true,
    requirements: {
      peoplePool: [...sisterIds],
      requiredSlotCount: 5,
      distinctPeopleRequired: false,
      everyContributingSlotMustMatchGroup: true,
    },
  }),
  defineHand({
    id: OPTIONAL_HAND.DYNAMIC_DUO,
    name: "Dynamic Duo",
    availability: HAND_AVAILABILITY.SELECTABLE,
    category: HAND_CATEGORY.RELATIONSHIP,
    evaluator: HAND_EVALUATOR.DYNAMIC_DUO,
    description:
      "One of the paired sibling-rank combinations is completed, with one 8 allowed as a substitute.",
    shortDescription: "A paired sibling-rank combination, with one 8 allowed as a substitute.",
    ruleSummary:
      "Qualifying pairs are 2+3, 4+5, 6+7, or 9+10. One 8 or virtual self may replace one matching person slot; two 8s alone do not qualify.",
    minimumPhysicalCards: 1,
    minimumContributingSlots: 2,
    virtualSelfAllowed: true,
    requirements: {
      rankPairs: [
        ["2", "3"],
        ["4", "5"],
        ["6", "7"],
        ["9", "10"],
      ],
      personPairs: [
        [PERSON.DOPEY, PERSON.SNOW_WHITE],
        [PERSON.GRUMPY, PERSON.SNEEZY],
        [PERSON.DOC, PERSON.HAPPY],
        [PERSON.BASHFUL, PERSON.SLEEPY],
      ],
      maximumEightSubstitutions: 1,
      maximumVirtualSelfSubstitutions: 1,
      requireAtLeastOneNaturalRankCardWhenNoVirtualSelf: true,
      requireSeparateSlots: true,
    },
  }),
  defineHand({
    id: OPTIONAL_HAND.FAMILY_SLEEPOVER,
    name: "Family Sleepover",
    availability: HAND_AVAILABILITY.SELECTABLE,
    category: HAND_CATEGORY.RELATIONSHIP,
    evaluator: HAND_EVALUATOR.FAMILY_SLEEPOVER,
    description:
      "One Ace child appears with a non-parent married couple or with Queen and King as both grandparents.",
    shortDescription: "An Ace child stays with a non-parent couple or with both grandparents.",
    ruleSummary:
      "A child appears with a married couple who are not that child’s parents, through their wedding portrait or separate spouse slots; Queen and King may instead serve as both grandparents. Virtual self may fill one person slot.",
    minimumPhysicalCards: 1,
    minimumContributingSlots: 3,
    virtualSelfAllowed: true,
    exactCardRequirement: true,
    requirements: {
      childPeople: [...grandchildIds],
      childRank: "A",
      auntUncleCouples: couples.map(({ id, partners, weddingCardId }) => ({
        id,
        partners,
        weddingCardId,
      })),
      childParents: {
        [PERSON.LIGHT]: [PERSON.HAPPY],
        [PERSON.CUBE]: [PERSON.SLEEPY, PERSON.STEAK],
        [PERSON.BALL]: [PERSON.SLEEPY, PERSON.STEAK],
        [PERSON.NET]: [PERSON.SLEEPY, PERSON.STEAK],
      },
      grandparentsAlternative: [PERSON.QUEEN, PERSON.KING],
      couplePortraitMaySatisfyBothHosts: true,
      separateSpouseSlotsAlsoAllowed: true,
      virtualSelfMayFillMaximumPersonSlots: 1,
    },
  }),
  defineHand({
    id: OPTIONAL_HAND.SAME_SUIT_RELATIONSHIP_PAIR,
    name: "Same-Suit Relationship Pair",
    availability: HAND_AVAILABILITY.SELECTABLE,
    category: HAND_CATEGORY.RELATIONSHIP,
    evaluator: HAND_EVALUATOR.SAME_SUIT_RELATIONSHIP_PAIR,
    description: "An approved relationship pair appears in one common suit.",
    shortDescription: "An approved relationship pair appears in one common suit.",
    ruleSummary:
      "Qualifying subtypes include two brothers, two sisters, a married couple, or a direct parent and child in the same suit. Virtual self cannot help because it has no suit.",
    minimumPhysicalCards: 2,
    minimumContributingSlots: 2,
    virtualSelfAllowed: false,
    suitRequirement: true,
    requirements: {
      allowedSubtypes: [
        {
          id: "two_brothers_same_suit",
          type: "choose_distinct_people",
          peoplePool: [...brotherIds],
          requiredCount: 2,
        },
        {
          id: "two_sisters_same_suit",
          type: "choose_distinct_people",
          peoplePool: [...sisterIds],
          requiredCount: 2,
        },
        {
          id: "married_couple_same_suit",
          type: "recognized_couple",
          couples: recognizedCouples.map(({ id, partners }) => ({ id, partners })),
        },
        {
          id: "parent_child_same_suit",
          type: "direct_parent_child",
          relationships: parentChildRelationships.map(({ id, parents, children }) => ({
            id,
            parents,
            children,
          })),
        },
      ],
      requireSameSuit: true,
      requireSeparatePhysicalCards: true,
      multiPersonCardMayFillOnlyOnePerson: true,
    },
  }),
];

const generatedHands = [
  defineHand({
    id: BUILT_IN_HAND.ATTENDANCE_FAMILY,
    name: "Players Represented",
    availability: HAND_AVAILABILITY.GENERATED,
    category: HAND_CATEGORY.ATTENDANCE,
    evaluator: HAND_EVALUATOR.ATTENDANCE_GENERATOR,
    description:
      "Runtime-generated hands based on the selected number of players and game format.",
    minimumPhysicalCards: 0,
    virtualSelfAllowed: true,
    rankingMode: RANKING_MODE.GENERATED_PROBABILITY,
    requirements: {
      twoPlayers: [2],
      threePlayers: [2, 3],
      fourPlayers: [3, 4],
      fiveOrMorePlayersStartAt: 4,
      fiveCardMaximumWithoutSelf: 5,
      fiveCardMaximumWithSelf: 6,
      holdemMaximumWithoutSelf: 7,
      holdemMaximumWithSelf: 8,
      virtualSelfDisabledForPlayerCounts: [2, 3, 4],
      multiPersonCardMayFillOnlyOnePlayer: true,
      probabilityUsesVirtualSelf: false,
    },
    notes: [
      "Virtual self may upgrade a hand during play, but generated probability rankings use physical cards only.",
    ],
  }),
];

export const handDefinitions = Object.freeze([
  ...standardPokerHands,
  ...echoHands,
  ...relationshipHands,
  ...rareExactPairHands,
  ...otherBuiltInHands,
  ...selectableHandDefinitions,
  ...generatedHands,
]);

export const handById = Object.freeze(
  Object.fromEntries(handDefinitions.map((hand) => [hand.id, hand]))
);

export const builtInHands = Object.freeze(
  handDefinitions.filter((hand) => hand.builtIn)
);

export const selectableHands = Object.freeze(
  handDefinitions.filter((hand) => hand.selectable)
);

export const generatedHandFamilies = Object.freeze(
  handDefinitions.filter((hand) => hand.generated)
);

export const selectableHandIds = Object.freeze(
  selectableHands.map((hand) => hand.id)
);

export const builtInHandIds = Object.freeze(
  builtInHands.map((hand) => hand.id)
);

export const fixedRankingTiers = Object.freeze({
  [RANKING_TIER.RARE_EXACT_PAIR]: Object.freeze({
    id: RANKING_TIER.RARE_EXACT_PAIR,
    name: "Rare Exact Pair",
    handIds: Object.freeze(
      rareExactPairHands.map((hand) => hand.id)
    ),
    rankingRule:
      "All members tie for gameplay rank; actual probabilities may still be displayed.",
  }),
});

export function getHandsForGame({ selectedOptionalHandIds = [] } = {}) {
  if (!Array.isArray(selectedOptionalHandIds)) {
    throw new TypeError("selectedOptionalHandIds must be an array");
  }

  const unknownIds = selectedOptionalHandIds.filter(
    (id) => !selectableHandIds.includes(id)
  );
  if (unknownIds.length > 0) {
    throw new RangeError(`Unknown selectable hand IDs: ${unknownIds.join(", ")}`);
  }

  const selectedSet = new Set(selectedOptionalHandIds);
  return Object.freeze([
    ...builtInHands,
    ...selectableHands.filter((hand) => selectedSet.has(hand.id)),
  ]);
}

export const handLibraryMetadata = Object.freeze({
  version: 2,
  relationalCardMaximumPeoplePerPhysicalCard: 1,
  virtualSelfIsPhysicalCard: false,
  virtualSelfHasSuit: false,
  probabilityUsesVirtualSelf: false,
  probabilityRankingScope: "shared_table_ranking",
  jokersAreWild: false,
  standardPokerHandCount: standardPokerHands.length,
  builtInHandCount: builtInHands.length,
  selectableHandCount: selectableHands.length,
  generatedHandFamilyCount: generatedHandFamilies.length,
  knownPersonCount: Object.keys(people).length,
  knownCardCount: Object.keys(cardById).length,
});
