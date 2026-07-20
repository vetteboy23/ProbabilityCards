import assert from "node:assert/strict";
import {
  combinationCount,
  countHandsContainingSpecificCards,
  enumerateFiveCardCombinations,
  calculateFiveCardProbabilitiesExactSync,
} from "../src/fiveCardProbability.js";
import { cardById } from "../src/cards.js";
import { BUILT_IN_HAND } from "../src/hands.js";

const checks = [];
function check(name, condition, details = "") {
  assert.ok(condition, name);
  checks.push(`✓ ${name}${details ? ` — ${details}` : ""}`);
}

check("53-card deck has 2,869,685 five-card combinations", combinationCount(53, 5) === 2869685);
check("54-card deck has 3,162,510 five-card combinations", combinationCount(54, 5) === 3162510);
check("55-card deck has 3,478,761 five-card combinations", combinationCount(55, 5) === 3478761);
check("A fixed pair appears in C(53,3) five-card hands in a 55-card deck", countHandsContainingSpecificCards(55, 2) === combinationCount(53, 3));

const sevenCards = ["2C", "3C", "4C", "5C", "6C", "7C", "8C"].map((id) => cardById[id]);
let sevenCardCombinationCount = 0;
enumerateFiveCardCombinations(sevenCards, () => { sevenCardCombinationCount += 1; });
check("Five-card enumerator visits every C(7,5) combination", sevenCardCombinationCount === 21);

const dancersOnly = calculateFiveCardProbabilitiesExactSync({
  includedJokerIds: [],
  handIds: [BUILT_IN_HAND.DANCERS],
});
const dancers = dancersOnly.handResults[0];
check("Dancers uses an exact closed-form count without storing its card IDs", dancers.calculationMethod === "closed_form_exact");
check("Dancers probability uses the 53-card fixed-pair count", dancers.qualifyingCombinationCount === combinationCount(51, 3));
check("Closed-form-only calculation does not enumerate combinations", dancersOnly.processedCombinationCount === 0);

const dancersWithGameplaySelf = calculateFiveCardProbabilitiesExactSync({
  includedJokerIds: [],
  handIds: [BUILT_IN_HAND.DANCERS],
  useVirtualSelf: true,
});
check(
  "Virtual self may be enabled for gameplay without requiring a player-specific probability",
  dancersWithGameplaySelf.virtualSelfGameplayEnabled === true
);
check(
  "Probability results explicitly exclude virtual self",
  dancersWithGameplaySelf.probabilityUsesVirtualSelf === false
);
check(
  "Virtual-self gameplay setting does not change a hand probability",
  dancersWithGameplaySelf.handResults[0].qualifyingCombinationCount === dancers.qualifyingCombinationCount
);
assert.throws(
  () => calculateFiveCardProbabilitiesExactSync({
    includedJokerIds: [],
    handIds: [BUILT_IN_HAND.DANCERS],
    useVirtualSelf: true,
    playerId: "dopey",
  }),
  /shared and exclude virtual self/
);
check("Player-specific probability inputs are rejected", true);

const exactPairs = calculateFiveCardProbabilitiesExactSync({
  includedJokerIds: [],
  handIds: [BUILT_IN_HAND.JERSEY_PAIR, BUILT_IN_HAND.FAMILY_ALBUM],
});
for (const result of exactPairs.handResults) {
  check(`${result.handName} exact count matches any specified pair`, result.qualifyingCombinationCount === combinationCount(51, 3));
}
check("Exact-pair validation enumerates all 53-card combinations", exactPairs.processedCombinationCount === combinationCount(53, 5));

const ordinaryPoker = calculateFiveCardProbabilitiesExactSync({
  includedJokerIds: [],
  handIds: [
    BUILT_IN_HAND.HIGH_CARD,
    BUILT_IN_HAND.ONE_PAIR,
    BUILT_IN_HAND.TWO_PAIR,
    BUILT_IN_HAND.THREE_OF_A_KIND,
    BUILT_IN_HAND.STRAIGHT,
    BUILT_IN_HAND.FLUSH,
    BUILT_IN_HAND.FULL_HOUSE,
    BUILT_IN_HAND.FOUR_OF_A_KIND,
    BUILT_IN_HAND.STRAIGHT_FLUSH,
    BUILT_IN_HAND.ROYAL_FLUSH,
  ],
});
const ordinaryTotal = ordinaryPoker.handResults.reduce(
  (sum, result) => sum + result.qualifyingCombinationCount,
  0
);
check("Ordinary poker categories partition the entire 53-card five-card space", ordinaryTotal === combinationCount(53, 5));
check("Every ordinary-poker probability is exact", ordinaryPoker.handResults.every((result) => result.exact));

const report = [
  "FIVE-CARD PROBABILITY ENGINE VALIDATION PASSED",
  `${checks.length}/${checks.length} checks passed`,
  "",
  ...checks,
].join("\n");
console.log(report);
