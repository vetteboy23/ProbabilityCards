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

function defineOptionalHand({
  id,
  name,
  shortDescription,
  ruleSummary,
  virtualSelfAllowed,
  exactCardRequirement = false,
  suitRequirement = false,
}) {
  return Object.freeze({
    id,
    name,
    shortDescription,
    ruleSummary,
    builtIn: false,
    selectable: true,
    virtualSelfAllowed,
    exactCardRequirement,
    suitRequirement,
  });
}

export const optionalHands = Object.freeze([
  defineOptionalHand({
    id: OPTIONAL_HAND.GRANDPARENT_AND_ACE,
    name: "Grandparent and Ace",
    shortDescription: "A grandparent together with one of the four Ace children.",
    ruleSummary:
      "Separate slots represent any grandparent and Cube, Ball, Net, or Light. Virtual self may fill the child slot when applicable.",
    virtualSelfAllowed: true,
  }),
  defineOptionalHand({
    id: OPTIONAL_HAND.HERITAGE,
    name: "Heritage",
    shortDescription: "A parent appears with that parent’s grandparent portrait.",
    ruleSummary:
      "Queen plus Q♠, or King plus K♠, using separate slots. Crown♠ may represent one parent.",
    virtualSelfAllowed: true,
    exactCardRequirement: true,
  }),
  defineOptionalHand({
    id: OPTIONAL_HAND.DOUBLE_HERITAGE,
    name: "Double Heritage",
    shortDescription: "Both parents appear with both grandparent portraits.",
    ruleSummary:
      "Separate slots represent Queen and King, together with the exact Q♠ and K♠ cards. Crown♠ may fill only one parent slot.",
    virtualSelfAllowed: true,
    exactCardRequirement: true,
  }),
  defineOptionalHand({
    id: OPTIONAL_HAND.BROTHER_TIME,
    name: "Brother Time",
    shortDescription: "Every physical card can be assigned as one of the three brothers.",
    ruleSummary:
      "Five slots represent brothers. An 8 may represent one brother per card, and virtual self may fill one slot when the player is a brother.",
    virtualSelfAllowed: true,
  }),
  defineOptionalHand({
    id: OPTIONAL_HAND.SISTER_TIME,
    name: "Sister Time",
    shortDescription: "Every physical card can be assigned as one of the five sisters.",
    ruleSummary:
      "Five slots represent sisters. An 8 may represent one sister per card, and virtual self may fill one slot when the player is a sister.",
    virtualSelfAllowed: true,
  }),
  defineOptionalHand({
    id: OPTIONAL_HAND.DYNAMIC_DUO,
    name: "Dynamic Duo",
    shortDescription: "A paired sibling-rank combination, with one 8 allowed as a substitute.",
    ruleSummary:
      "Qualifying pairs are 2+3, 4+5, 6+7, or 9+10. One physical card may be an 8 replacing either member, and virtual self may fill the matching person slot; two 8s alone do not qualify.",
    virtualSelfAllowed: true,
  }),
  defineOptionalHand({
    id: OPTIONAL_HAND.FAMILY_SLEEPOVER,
    name: "Family Sleepover",
    shortDescription: "An Ace child stays with a non-parent couple or with both grandparents.",
    ruleSummary:
      "One Ace appears with a married couple who are not that child’s parents, either through their wedding portrait or separate spouse cards; Queen and King may instead serve as both grandparents.",
    virtualSelfAllowed: true,
  }),
  defineOptionalHand({
    id: OPTIONAL_HAND.SAME_SUIT_RELATIONSHIP_PAIR,
    name: "Same-Suit Relationship Pair",
    shortDescription: "An approved relationship pair appears in one common suit.",
    ruleSummary:
      "Examples include two brothers, two sisters, a married couple, or a mother and child in the same suit. Virtual self cannot help because it has no suit.",
    virtualSelfAllowed: false,
    suitRequirement: true,
  }),
]);

export const optionalHandById = Object.freeze(
  Object.fromEntries(optionalHands.map((hand) => [hand.id, hand]))
);

export const optionalHandIds = Object.freeze(optionalHands.map((hand) => hand.id));
