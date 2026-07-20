import { PERSON, siblingIds } from "./people.js";

export const SUIT = Object.freeze({
  CLUBS: "clubs",
  DIAMONDS: "diamonds",
  HEARTS: "hearts",
  SPADES: "spades",
});

export const SUIT_SYMBOL = Object.freeze({
  [SUIT.CLUBS]: "♣",
  [SUIT.DIAMONDS]: "♦",
  [SUIT.HEARTS]: "♥",
  [SUIT.SPADES]: "♠",
});

export const suits = Object.freeze([
  SUIT.CLUBS,
  SUIT.DIAMONDS,
  SUIT.HEARTS,
  SUIT.SPADES,
]);

export const STANDARD_RANKS = Object.freeze([
  "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A",
]);

export const RANK = Object.freeze({
  CROWN: "CROWN",
  JOKER: "JOKER",
});

export const rankDefinitions = Object.freeze({
  "2": Object.freeze({ label: "2", orderValue: 2, straightValue: 2 }),
  "3": Object.freeze({ label: "3", orderValue: 3, straightValue: 3 }),
  "4": Object.freeze({ label: "4", orderValue: 4, straightValue: 4 }),
  "5": Object.freeze({ label: "5", orderValue: 5, straightValue: 5 }),
  "6": Object.freeze({ label: "6", orderValue: 6, straightValue: 6 }),
  "7": Object.freeze({ label: "7", orderValue: 7, straightValue: 7 }),
  "8": Object.freeze({ label: "8", orderValue: 8, straightValue: 8 }),
  "9": Object.freeze({ label: "9", orderValue: 9, straightValue: 9 }),
  "10": Object.freeze({ label: "10", orderValue: 10, straightValue: 10 }),
  "J": Object.freeze({ label: "Jack", orderValue: 11, straightValue: 11 }),
  "Q": Object.freeze({ label: "Queen", orderValue: 12, straightValue: 12 }),
  "K": Object.freeze({ label: "King", orderValue: 13, straightValue: 13 }),
  [RANK.CROWN]: Object.freeze({
    label: "Crown",
    orderValue: 14,
    straightValue: null,
  }),
  "A": Object.freeze({ label: "Ace", orderValue: 15, straightValue: 14 }),
  [RANK.JOKER]: Object.freeze({
    label: "Joker",
    orderValue: 16,
    straightValue: null,
  }),
});

export const siblingByRank = Object.freeze({
  "2": PERSON.DOPEY,
  "3": PERSON.SNOW_WHITE,
  "4": PERSON.GRUMPY,
  "5": PERSON.SNEEZY,
  "6": PERSON.DOC,
  "7": PERSON.HAPPY,
  "9": PERSON.BASHFUL,
  "10": PERSON.SLEEPY,
});

/*
 * These six non-Spade suit assignments were not finalized in the project brief.
 * They are intentionally isolated here so the rest of the deck model is stable.
 * Change only this object when the actual assignments are confirmed.
 */
export const provisionalIdentityAssignments = Object.freeze({
  status: "provisional",
  jackBySuit: Object.freeze({
    [SUIT.CLUBS]: PERSON.CHEESE,
    [SUIT.DIAMONDS]: PERSON.OLD_FASHIONED,
    [SUIT.HEARTS]: PERSON.BEER,
    [SUIT.SPADES]: PERSON.STEAK,
  }),
  aceBySuit: Object.freeze({
    [SUIT.CLUBS]: PERSON.LIGHT,
    [SUIT.DIAMONDS]: PERSON.CUBE,
    [SUIT.HEARTS]: PERSON.NET,
    [SUIT.SPADES]: PERSON.BALL,
  }),
});

export const unresolvedDeckData = Object.freeze([
  Object.freeze({
    id: "non_spade_jack_suits",
    description:
      "The exact Club, Diamond, and Heart assignments for Cheese, Old Fashioned, and Beer are provisional.",
    blocksDeckValidation: false,
  }),
  Object.freeze({
    id: "non_spade_ace_suits",
    description:
      "The exact Club, Diamond, and Heart assignments for Light, Cube, and Net are provisional.",
    blocksDeckValidation: false,
  }),
  Object.freeze({
    id: "maternal_grandfather_nickname",
    description:
      "The maternal grandfather has no finalized public nickname; his stable person ID is used instead.",
    blocksDeckValidation: false,
  }),
]);

export const relationalCardRule = Object.freeze({
  canChooseAnyDepictedPerson: true,
  maxPeopleRepresentedPerPhysicalCardPerHandEvaluation: 1,
  notes:
    "A multi-person card may be assigned as exactly one person depicted on it for each relational-hand evaluation.",
});

const suitCode = Object.freeze({
  [SUIT.CLUBS]: "C",
  [SUIT.DIAMONDS]: "D",
  [SUIT.HEARTS]: "H",
  [SUIT.SPADES]: "S",
});

function freezeArray(values) {
  return Object.freeze([...values]);
}

function createCard({
  id,
  rank,
  suit = null,
  cardType = "standard",
  primaryPerson = null,
  depicts = [],
  tags = [],
  assignmentStatus = "final",
  notes = null,
}) {
  const rankDefinition = rankDefinitions[rank];
  if (!rankDefinition) {
    throw new Error(`Unknown rank definition: ${rank}`);
  }

  return Object.freeze({
    id,
    rank,
    rankLabel: rankDefinition.label,
    suit,
    suitSymbol: suit ? SUIT_SYMBOL[suit] : null,
    cardType,
    orderValue: rankDefinition.orderValue,
    straightValue: rankDefinition.straightValue,
    primaryPerson,
    depicts: freezeArray(depicts),
    relationalIdentityOptions: freezeArray(depicts),
    tags: freezeArray(tags),
    assignmentStatus,
    notes,
  });
}

const cards = [];

// Ranks 2–7, 9, and 10: one sibling per rank in each standard suit.
for (const [rank, siblingId] of Object.entries(siblingByRank)) {
  for (const suit of suits) {
    const depicts = [siblingId];
    const tags = ["standard_card", "sibling_card", "individual_sibling_rank"];

    if (suit === SUIT.SPADES) {
      tags.push("spade", "historical_spade");

      if (rank === "3") {
        depicts.push(PERSON.CHEESE);
        tags.push("multi_person_card", "wedding_portrait");
      } else if (rank === "4") {
        depicts.push(PERSON.OLD_FASHIONED);
        tags.push("multi_person_card", "wedding_portrait");
      } else if (rank === "5") {
        depicts.push(PERSON.BEER);
        tags.push("multi_person_card", "wedding_portrait");
      } else if (rank === "7") {
        depicts.push(PERSON.LIGHT);
        tags.push(
          "multi_person_card",
          "household_portrait",
          "happy_household_portrait"
        );
      } else if (rank === "9") {
        depicts.push(PERSON.FLY);
        tags.push(
          "multi_person_card",
          "historical_portrait",
          "kick_fly_family_history"
        );
      } else if (rank === "10") {
        depicts.push(PERSON.STEAK, PERSON.CUBE, PERSON.BALL, PERSON.NET);
        tags.push(
          "multi_person_card",
          "household_portrait",
          "sleepy_household_portrait"
        );
      }
    }

    cards.push(
      createCard({
        id: `${rank}${suitCode[suit]}`,
        rank,
        suit,
        primaryPerson: siblingId,
        depicts,
        tags,
      })
    );
  }
}

// The four 8s depict all eight siblings.
for (const suit of suits) {
  cards.push(
    createCard({
      id: `8${suitCode[suit]}`,
      rank: "8",
      suit,
      cardType: "sibling_group_portrait",
      primaryPerson: null,
      depicts: siblingIds,
      tags: [
        "standard_card",
        "eight_card",
        "multi_person_card",
        "sibling_group_portrait",
        ...(suit === SUIT.SPADES ? ["spade", "historical_spade"] : []),
      ],
      notes:
        "For a relational hand, this card may be assigned as exactly one of the eight siblings.",
    })
  );
}

// Four Jacks represent the four husbands. Jack of Spades is finalized as Steak.
for (const suit of suits) {
  const husbandId = provisionalIdentityAssignments.jackBySuit[suit];
  cards.push(
    createCard({
      id: `J${suitCode[suit]}`,
      rank: "J",
      suit,
      primaryPerson: husbandId,
      depicts: [husbandId],
      tags: [
        "standard_card",
        "jack",
        "husband_card",
        ...(suit === SUIT.SPADES
          ? ["spade", "historical_spade", "steak_card", "jersey_card"]
          : []),
      ],
      assignmentStatus:
        suit === SUIT.SPADES ? "final" : provisionalIdentityAssignments.status,
    })
  );
}

// Three non-Spade Queens depict Queen; Queen of Spades depicts maternal grandparents.
for (const suit of [SUIT.CLUBS, SUIT.DIAMONDS, SUIT.HEARTS]) {
  cards.push(
    createCard({
      id: `Q${suitCode[suit]}`,
      rank: "Q",
      suit,
      primaryPerson: PERSON.QUEEN,
      depicts: [PERSON.QUEEN],
      tags: ["standard_card", "queen_card", "parent_card", "mother_card"],
    })
  );
}

cards.push(
  createCard({
    id: "QS",
    rank: "Q",
    suit: SUIT.SPADES,
    cardType: "grandparent_portrait",
    depicts: [PERSON.MATERNAL_GRANDMOTHER, PERSON.MATERNAL_GRANDFATHER],
    tags: [
      "standard_card",
      "spade",
      "historical_spade",
      "multi_person_card",
      "grandparent_portrait",
      "maternal_grandparents_portrait",
    ],
  })
);

// Three non-Spade Kings depict King; King of Spades depicts paternal grandparents.
for (const suit of [SUIT.CLUBS, SUIT.DIAMONDS, SUIT.HEARTS]) {
  cards.push(
    createCard({
      id: `K${suitCode[suit]}`,
      rank: "K",
      suit,
      primaryPerson: PERSON.KING,
      depicts: [PERSON.KING],
      tags: ["standard_card", "king_card", "parent_card", "father_card"],
    })
  );
}

cards.push(
  createCard({
    id: "KS",
    rank: "K",
    suit: SUIT.SPADES,
    cardType: "grandparent_portrait",
    depicts: [PERSON.PATERNAL_GRANDMOTHER, PERSON.KICK],
    tags: [
      "standard_card",
      "spade",
      "historical_spade",
      "multi_person_card",
      "grandparent_portrait",
      "paternal_grandparents_portrait",
      "kick_card",
    ],
  })
);

// Four Aces represent the four grandchildren. Ace of Spades is finalized as Ball.
for (const suit of suits) {
  const childId = provisionalIdentityAssignments.aceBySuit[suit];
  cards.push(
    createCard({
      id: `A${suitCode[suit]}`,
      rank: "A",
      suit,
      primaryPerson: childId,
      depicts: [childId],
      tags: [
        "standard_card",
        "ace",
        "grandchild_card",
        ...(suit === SUIT.SPADES
          ? ["spade", "historical_spade", "ball_card", "jersey_card"]
          : []),
      ],
      assignmentStatus:
        suit === SUIT.SPADES ? "final" : provisionalIdentityAssignments.status,
    })
  );
}

// Additional Crown of Spades: Queen and King together.
cards.push(
  createCard({
    id: "CROWN_S",
    rank: RANK.CROWN,
    suit: SUIT.SPADES,
    cardType: "crown",
    depicts: [PERSON.QUEEN, PERSON.KING],
    tags: [
      "extra_card",
      "spade",
      "historical_spade",
      "multi_person_card",
      "crown_card",
      "royal_couple_portrait",
      "parent_card",
    ],
    notes:
      "Ranks between King and Ace for high-card ordering; excluded from ordinary straights by default.",
  })
);

// Two non-wild Jokers, each representing only the grandfather pictured.
cards.push(
  createCard({
    id: "JOKER_KICK",
    rank: RANK.JOKER,
    cardType: "joker",
    primaryPerson: PERSON.KICK,
    depicts: [PERSON.KICK],
    tags: ["joker", "grandfather_card", "kick_card"],
    notes: "Never wild. Represents only Kick.",
  }),
  createCard({
    id: "JOKER_MATERNAL",
    rank: RANK.JOKER,
    cardType: "joker",
    primaryPerson: PERSON.MATERNAL_GRANDFATHER,
    depicts: [PERSON.MATERNAL_GRANDFATHER],
    tags: ["joker", "grandfather_card", "maternal_grandfather_card"],
    notes: "Never wild. Represents only the maternal grandfather.",
  })
);

export const fullDeck = Object.freeze(cards);

export const cardById = Object.freeze(
  Object.fromEntries(fullDeck.map((card) => [card.id, card]))
);

export const JOKER_IDS = Object.freeze([
  "JOKER_KICK",
  "JOKER_MATERNAL",
]);

export function buildDeck({ includedJokerIds = JOKER_IDS } = {}) {
  if (!Array.isArray(includedJokerIds)) {
    throw new TypeError("includedJokerIds must be an array");
  }

  if (new Set(includedJokerIds).size !== includedJokerIds.length) {
    throw new RangeError("includedJokerIds cannot contain duplicates");
  }

  if (includedJokerIds.some((id) => !JOKER_IDS.includes(id))) {
    throw new RangeError(
      `includedJokerIds may contain only: ${JOKER_IDS.join(", ")}`
    );
  }

  const nonJokers = fullDeck.filter((card) => card.cardType !== "joker");
  const selectedJokers = includedJokerIds.map((id) => cardById[id]);
  return Object.freeze([...nonJokers, ...selectedJokers]);
}
