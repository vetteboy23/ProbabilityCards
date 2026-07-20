import { PERSON, brotherIds, sisterIds } from "./people.js";
import {
  ASSIGNMENT_SLOT,
  assignDistinctPeople,
  assignRequiredPeople,
  assignSlotsFromGroup,
  createExactCardSlot,
  createPersonSlot,
  findSlotAssignment,
  getRepresentablePeople,
  maximizeDistinctPeople,
  normalizeCardPool,
  requireExactCards,
  requireOneExactAlternative,
} from "./cardAssignment.js";

function createReport() {
  const checks = [];
  return {
    check(name, condition, details = "") {
      checks.push({ name, passed: Boolean(condition), details });
    },
    finish() {
      const passedChecks = checks.filter((item) => item.passed).length;
      return Object.freeze({
        passed: passedChecks === checks.length,
        passedChecks,
        totalChecks: checks.length,
        checks: Object.freeze(checks),
      });
    },
  };
}

export function validateCardAssignmentEngine() {
  const report = createReport();
  const check = report.check.bind(report);

  check(
    "8 lists all eight siblings as identity choices",
    getRepresentablePeople("8H").length === 8
  );
  check(
    "10S lists exactly five household members",
    JSON.stringify(getRepresentablePeople("10S")) ===
      JSON.stringify([PERSON.SLEEPY, PERSON.STEAK, PERSON.CUBE, PERSON.BALL, PERSON.NET])
  );
  check(
    "Crown lists Queen and King",
    JSON.stringify(getRepresentablePeople("CROWN_S")) ===
      JSON.stringify([PERSON.QUEEN, PERSON.KING])
  );
  check(
    "Wedding card 3S lists Snow White and Cheese",
    JSON.stringify(getRepresentablePeople("3S")) ===
      JSON.stringify([PERSON.SNOW_WHITE, PERSON.CHEESE])
  );

  check(
    "One 10S cannot fill both Sleepy and Steak slots",
    !assignRequiredPeople(["10S"], [PERSON.SLEEPY, PERSON.STEAK]).matched
  );
  check(
    "10S plus JS can fill Sleepy and Steak separately",
    assignRequiredPeople(["10S", "JS"], [PERSON.SLEEPY, PERSON.STEAK]).matched
  );
  check(
    "One Crown cannot fill both Queen and King slots",
    !assignRequiredPeople(["CROWN_S"], [PERSON.QUEEN, PERSON.KING]).matched
  );
  check(
    "Crown plus QC can fill Queen and King separately",
    assignRequiredPeople(["CROWN_S", "QC"], [PERSON.QUEEN, PERSON.KING]).matched
  );
  check(
    "One wedding portrait cannot fill both spouses",
    !assignRequiredPeople(["3S"], [PERSON.SNOW_WHITE, PERSON.CHEESE]).matched
  );
  check(
    "Wedding portrait plus a separate spouse card can fill both spouses",
    assignRequiredPeople(["3S", "3H"], [PERSON.SNOW_WHITE, PERSON.CHEESE]).matched
  );

  check(
    "An 8 may fill one missing brother slot",
    assignRequiredPeople(["2C", "6D", "8H"], brotherIds).matched
  );
  check(
    "A single 8 cannot fill Three Brothers",
    !assignRequiredPeople(["8H"], brotherIds).matched
  );
  check(
    "Two 8s plus one natural brother can fill Three Brothers",
    assignRequiredPeople(["2C", "8D", "8H"], brotherIds).matched
  );

  check(
    "Two different physical cards may form an Echo for the same person",
    assignRequiredPeople(["10S", "10H"], [PERSON.SLEEPY, PERSON.SLEEPY]).matched
  );
  check(
    "One physical card cannot count twice toward an Echo",
    !assignRequiredPeople(["10S"], [PERSON.SLEEPY, PERSON.SLEEPY]).matched
  );
  check(
    "Virtual self may supply one Echo occurrence",
    assignRequiredPeople(["10S"], [PERSON.SLEEPY, PERSON.SLEEPY], {
      playerId: PERSON.SLEEPY,
      useVirtualSelf: true,
      virtualSelfAllowed: true,
    }).matched
  );

  check(
    "Virtual Dopey can fill one brother slot when enabled",
    assignRequiredPeople(["6C", "9D"], brotherIds, {
      playerId: PERSON.DOPEY,
      useVirtualSelf: true,
      virtualSelfAllowed: true,
    }).matched
  );
  check(
    "Virtual Dopey does not apply when the hand disallows virtual self",
    !assignRequiredPeople(["6C", "9D"], brotherIds, {
      playerId: PERSON.DOPEY,
      useVirtualSelf: true,
      virtualSelfAllowed: false,
    }).matched
  );
  check(
    "Virtual self cannot satisfy an exact-card slot",
    !findSlotAssignment({
      cardPool: [],
      slots: [createExactCardSlot("ace_spades", "AS")],
      playerId: PERSON.BALL,
      useVirtualSelf: true,
      virtualSelfAllowed: true,
    }).matched
  );

  check(
    "Exact-card requirement succeeds only with the actual cards",
    requireExactCards(["JS", "AS", "2C"], ["JS", "AS"]).matched
  );
  check(
    "Exact-card requirement rejects a substitute Ace",
    !requireExactCards(["JS", "AC", "2C"], ["JS", "AS"]).matched
  );
  check(
    "Exact-card alternatives select a present alternative",
    requireOneExactAlternative(["9S", "JOKER_KICK"], [
      ["9S", "KS"],
      ["9S", "JOKER_KICK"],
    ]).matched
  );

  check(
    "A card reserved for an exact slot cannot also fill a person slot",
    !findSlotAssignment({
      cardPool: ["10S"],
      slots: [
        createExactCardSlot("portrait", "10S"),
        createPersonSlot("sleepy", PERSON.SLEEPY),
      ],
    }).matched
  );
  check(
    "A separate card can fill the person slot beside an exact card",
    findSlotAssignment({
      cardPool: ["10S", "10H"],
      slots: [
        createExactCardSlot("portrait", "10S"),
        createPersonSlot("sleepy", PERSON.SLEEPY),
      ],
    }).matched
  );

  const threeSisters = assignDistinctPeople(["3C", "4D", "8H"], sisterIds, 3);
  check("Distinct-person assignment recognizes three different sisters", threeSisters.matched);
  check(
    "Distinct-person assignment records three different identities",
    threeSisters.matched &&
      new Set(threeSisters.assignments.map((item) => item.assignedPersonId)).size === 3
  );
  check(
    "Repeated cards for one sister do not count as three distinct sisters",
    !assignDistinctPeople(["3C", "3D", "3H"], sisterIds, 3).matched
  );

  check(
    "Five group slots can all be assigned as brothers without requiring distinct brothers",
    assignSlotsFromGroup(["2C", "2D", "6C", "8H", "8S"], brotherIds, 5).matched
  );
  check(
    "A non-brother card cannot fill Brother Time",
    !assignSlotsFromGroup(["2C", "2D", "6C", "8H", "AH"], brotherIds, 5).matched
  );

  const attendance = maximizeDistinctPeople(
    ["10S", "JS", "AS", "7S"],
    [PERSON.SLEEPY, PERSON.STEAK, PERSON.BALL, PERSON.HAPPY, PERSON.LIGHT],
    {
      playerId: PERSON.LIGHT,
      useVirtualSelf: true,
      virtualSelfAllowed: true,
    }
  );
  check("Attendance maximizer finds five represented players with virtual self", attendance.count === 5);
  check(
    "Attendance maximizer uses each contributor only once",
    new Set(attendance.assignments.map((item) => item.contributorId)).size === attendance.assignments.length
  );

  check(
    "Same-suit assignment succeeds when both relationship cards share a suit",
    assignRequiredPeople(["3C", "JC"], [PERSON.SNOW_WHITE, PERSON.CHEESE], {
      sameSuit: true,
    }).matched
  );
  check(
    "Same-suit assignment rejects different suits",
    !assignRequiredPeople(["3H", "JC"], [PERSON.SNOW_WHITE, PERSON.CHEESE], {
      sameSuit: true,
    }).matched
  );
  check(
    "Virtual self cannot satisfy a same-suit slot because it has no suit",
    !assignRequiredPeople(["JC"], [PERSON.SNOW_WHITE, PERSON.CHEESE], {
      playerId: PERSON.SNOW_WHITE,
      useVirtualSelf: true,
      virtualSelfAllowed: true,
      sameSuit: true,
    }).matched
  );

  let duplicateCardsRejected = false;
  try {
    normalizeCardPool(["8H", "8H"]);
  } catch (error) {
    duplicateCardsRejected = error instanceof RangeError;
  }
  check("Duplicate physical cards are rejected", duplicateCardsRejected);

  let unknownCardRejected = false;
  try {
    normalizeCardPool(["NOT_A_CARD"]);
  } catch (error) {
    unknownCardRejected = error instanceof RangeError;
  }
  check("Unknown cards are rejected", unknownCardRejected);

  check(
    "Slot kind constants are stable",
    ASSIGNMENT_SLOT.PERSON === "person" && ASSIGNMENT_SLOT.EXACT_CARD === "exact_card"
  );

  return report.finish();
}

export function formatCardAssignmentValidationReport(report) {
  const lines = [
    report.passed
      ? "CARD ASSIGNMENT ENGINE VALIDATION PASSED"
      : "CARD ASSIGNMENT ENGINE VALIDATION FAILED",
    `${report.passedChecks}/${report.totalChecks} checks passed`,
    "",
  ];

  for (const item of report.checks) {
    lines.push(`${item.passed ? "✓" : "✗"} ${item.name}${item.details ? ` — ${item.details}` : ""}`);
  }

  return lines.join("\n");
}
