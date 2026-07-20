import { people } from "./people.js";
import { JOKER_IDS } from "./cards.js";
import { optionalHandById, optionalHandIds } from "./optionalHands.js";

export const GAME_FORMAT = Object.freeze({
  FIVE_CARD_DRAW: "five_card_draw",
  TEXAS_HOLDEM: "texas_holdem",
});

export const GAME_FORMAT_LABEL = Object.freeze({
  [GAME_FORMAT.FIVE_CARD_DRAW]: "Five-card draw",
  [GAME_FORMAT.TEXAS_HOLDEM]: "Texas Hold’em",
});

export const JOKER_OPTION = Object.freeze({
  NONE: "none",
  KICK_ONLY: "kick_only",
  PIPE_ONLY: "pipe_only",
  BOTH: "both",
});

export const JOKER_OPTION_DEFINITIONS = Object.freeze({
  [JOKER_OPTION.NONE]: Object.freeze({
    id: JOKER_OPTION.NONE,
    label: "No Jokers",
    includedJokerIds: Object.freeze([]),
  }),
  [JOKER_OPTION.KICK_ONLY]: Object.freeze({
    id: JOKER_OPTION.KICK_ONLY,
    label: "Kick only",
    includedJokerIds: Object.freeze(["JOKER_KICK"]),
  }),
  [JOKER_OPTION.PIPE_ONLY]: Object.freeze({
    id: JOKER_OPTION.PIPE_ONLY,
    label: "Pipe only",
    includedJokerIds: Object.freeze(["JOKER_MATERNAL"]),
  }),
  [JOKER_OPTION.BOTH]: Object.freeze({
    id: JOKER_OPTION.BOTH,
    label: "Kick and Pipe",
    includedJokerIds: JOKER_IDS,
  }),
});

export const selectablePlayers = Object.freeze(
  Object.values(people)
    .filter((person) => person.selectableAsPlayer)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
);

export const selectablePlayerIds = Object.freeze(
  selectablePlayers.map((person) => person.id)
);

export function formatPlayerCount(count) {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("count must be a non-negative integer");
  }
  return `${count} ${count === 1 ? "player" : "players"}`;
}

export function getPhysicalCardCapacity(format) {
  if (format === GAME_FORMAT.FIVE_CARD_DRAW) return 5;
  if (format === GAME_FORMAT.TEXAS_HOLDEM) return 7;
  throw new RangeError(`Unsupported game format: ${format}`);
}

function attendanceLabel(requiredCount, selectedPlayerCount) {
  if (requiredCount === selectedPlayerCount) {
    if (selectedPlayerCount === 2) return "Both Players Represented";
    return `All ${selectedPlayerCount} Players Represented`;
  }
  return `${requiredCount} Players Represented`;
}

function attendanceId(requiredCount, selectedPlayerCount) {
  return `attendance_${requiredCount}_of_${selectedPlayerCount}`;
}

function getAttendanceRequiredCounts({
  selectedPlayerCount,
  format,
  useVirtualSelf,
}) {
  const physicalCapacity = getPhysicalCardCapacity(format);
  const virtualSelfAllowed = selectedPlayerCount >= 5 && Boolean(useVirtualSelf);
  const requiredCounts = [];

  if (selectedPlayerCount === 2) {
    requiredCounts.push(2);
  } else if (selectedPlayerCount === 3) {
    requiredCounts.push(2, 3);
  } else if (selectedPlayerCount === 4) {
    requiredCounts.push(3, 4);
  } else if (selectedPlayerCount >= 5) {
    const maximumRepresented = Math.min(
      selectedPlayerCount,
      physicalCapacity + (virtualSelfAllowed ? 1 : 0)
    );
    for (let count = 4; count <= maximumRepresented; count += 1) {
      requiredCounts.push(count);
    }
  }

  return {
    physicalCapacity,
    virtualSelfAllowed,
    requiredCounts,
  };
}

export function getAttendanceHands({
  selectedPlayerCount,
  format,
  useVirtualSelf,
}) {
  if (!Number.isInteger(selectedPlayerCount) || selectedPlayerCount < 0) {
    throw new RangeError("selectedPlayerCount must be a non-negative integer");
  }

  const {
    physicalCapacity,
    virtualSelfAllowed,
    requiredCounts,
  } = getAttendanceRequiredCounts({
    selectedPlayerCount,
    format,
    useVirtualSelf,
  });

  return Object.freeze(
    requiredCounts.map((requiredCount) =>
      Object.freeze({
        id: attendanceId(requiredCount, selectedPlayerCount),
        requiredCount,
        selectedPlayerCount,
        label: attendanceLabel(requiredCount, selectedPlayerCount),
        virtualSelfAllowed,
        gameplayUsesVirtualSelf:
          virtualSelfAllowed && requiredCount > 0,
        physicallyPossibleWithoutSelf: requiredCount <= physicalCapacity,
        probabilityBasisRequiredCount: Math.min(
          requiredCount,
          physicalCapacity
        ),
        probabilityBasisHandId: attendanceId(
          Math.min(requiredCount, physicalCapacity),
          selectedPlayerCount
        ),
        probabilityUsesVirtualSelf: false,
        exactCardRequirement: false,
        multiPersonCardsAllowed: true,
        maxPeoplePerPhysicalCard: 1,
      })
    )
  );
}

/**
 * Attendance hands that receive their own calculated probability.
 *
 * Virtual self is intentionally excluded. The resulting list is therefore
 * capped at five represented players in five-card draw and seven in Hold'em.
 */
export function getAttendanceProbabilityHands({ selectedPlayerCount, format }) {
  return getAttendanceHands({
    selectedPlayerCount,
    format,
    useVirtualSelf: false,
  });
}

/**
 * Connects gameplay-only attendance levels to the physical-card probability
 * that supplies their ranking. For example, Six Players Represented in
 * five-card draw uses the rank of Five Players Represented because the sixth
 * representation can only be the player's virtual self.
 */
export function getAttendanceRankingRules({
  selectedPlayerCount,
  format,
  useVirtualSelf,
}) {
  const gameplayHands = getAttendanceHands({
    selectedPlayerCount,
    format,
    useVirtualSelf,
  });
  const probabilityHands = getAttendanceProbabilityHands({
    selectedPlayerCount,
    format,
  });
  const probabilityById = new Map(
    probabilityHands.map((hand) => [hand.id, hand])
  );

  return Object.freeze(
    gameplayHands.map((gameplayHand) => {
      const probabilityHand = probabilityById.get(
        gameplayHand.probabilityBasisHandId
      );
      if (!probabilityHand) {
        throw new Error(
          `No physical probability basis for ${gameplayHand.id}`
        );
      }
      return Object.freeze({
        gameplayHandId: gameplayHand.id,
        gameplayLabel: gameplayHand.label,
        gameplayRequiredCount: gameplayHand.requiredCount,
        probabilityHandId: probabilityHand.id,
        probabilityLabel: probabilityHand.label,
        probabilityRequiredCount: probabilityHand.requiredCount,
        sharesPhysicalMaximumRank:
          gameplayHand.requiredCount > probabilityHand.requiredCount,
        probabilityUsesVirtualSelf: false,
      });
    })
  );
}

export function validateGameSetup({
  selectedPlayerIds,
  selectedOptionalHandIds = [],
  format,
  jokerOption,
  useVirtualSelf,
}) {
  const errors = [];

  if (!Array.isArray(selectedPlayerIds)) {
    errors.push("Selected players must be supplied as an array.");
  } else {
    const uniqueIds = new Set(selectedPlayerIds);
    if (uniqueIds.size !== selectedPlayerIds.length) {
      errors.push("A player cannot be selected more than once.");
    }
    if (selectedPlayerIds.length < 2) {
      errors.push("Select at least two players.");
    }
    for (const personId of selectedPlayerIds) {
      if (!selectablePlayerIds.includes(personId)) {
        errors.push(`The person ${personId} is not eligible for the player roster.`);
      }
    }
  }


  if (!Array.isArray(selectedOptionalHandIds)) {
    errors.push("Optional hands must be supplied as an array.");
  } else {
    if (new Set(selectedOptionalHandIds).size !== selectedOptionalHandIds.length) {
      errors.push("An optional hand cannot be selected more than once.");
    }
    for (const handId of selectedOptionalHandIds) {
      if (!optionalHandIds.includes(handId)) {
        errors.push(`Optional hand ${handId} is not recognized.`);
      }
    }
  }

  if (!Object.values(GAME_FORMAT).includes(format)) {
    errors.push("Choose a supported game format.");
  }

  if (!Object.values(JOKER_OPTION).includes(jokerOption)) {
    errors.push("Choose which Jokers are included.");
  }

  if (typeof useVirtualSelf !== "boolean") {
    errors.push("The virtual-self setting must be true or false.");
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
  });
}

export function buildGameSetup({
  selectedPlayerIds,
  selectedOptionalHandIds = [],
  format,
  jokerOption,
  useVirtualSelf,
}) {
  const validation = validateGameSetup({
    selectedPlayerIds,
    selectedOptionalHandIds,
    format,
    jokerOption,
    useVirtualSelf,
  });

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  const normalizedPlayerIds = [...selectedPlayerIds].sort((a, b) =>
    people[a].displayName.localeCompare(people[b].displayName)
  );
  const normalizedOptionalHandIds = [...selectedOptionalHandIds].sort((a, b) =>
    optionalHandById[a].name.localeCompare(optionalHandById[b].name)
  );
  const jokerDefinition = JOKER_OPTION_DEFINITIONS[jokerOption];
  const attendanceHands = getAttendanceHands({
    selectedPlayerCount: normalizedPlayerIds.length,
    format,
    useVirtualSelf,
  });
  const probabilityAttendanceHands = getAttendanceProbabilityHands({
    selectedPlayerCount: normalizedPlayerIds.length,
    format,
  });
  const attendanceRankingRules = getAttendanceRankingRules({
    selectedPlayerCount: normalizedPlayerIds.length,
    format,
    useVirtualSelf,
  });

  return Object.freeze({
    format,
    formatLabel: GAME_FORMAT_LABEL[format],
    selectedPlayerIds: Object.freeze(normalizedPlayerIds),
    selectedPlayerNames: Object.freeze(
      normalizedPlayerIds.map((personId) => people[personId].displayName)
    ),
    playerCount: normalizedPlayerIds.length,
    selectedOptionalHandIds: Object.freeze(normalizedOptionalHandIds),
    selectedOptionalHandNames: Object.freeze(
      normalizedOptionalHandIds.map((handId) => optionalHandById[handId].name)
    ),
    optionalHandCount: normalizedOptionalHandIds.length,
    useVirtualSelf,
    jokerOption,
    jokerLabel: jokerDefinition.label,
    includedJokerIds: jokerDefinition.includedJokerIds,
    deckSize: 53 + jokerDefinition.includedJokerIds.length,
    physicalCardCapacity: getPhysicalCardCapacity(format),
    attendanceHands,
    attendanceUsesVirtualSelf:
      normalizedPlayerIds.length >= 5 && useVirtualSelf,
    probabilityAttendanceHands,
    attendanceRankingRules,
    probabilityUsesVirtualSelf: false,
    probabilityRankingScope: "shared_table_ranking",
    virtualSelfProbabilityNote:
      "Virtual self is a gameplay bonus and is excluded from all probability calculations.",
  });
}
