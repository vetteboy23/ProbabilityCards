import assert from "node:assert/strict";
import {
  buildStaticHandRanking,
  formatProbabilityPercent,
  RANKING_DIRECTION,
} from "../src/ranking.js";
import { RANKING_TIER } from "../src/hands.js";

const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(`✓ ${name}`);
}

const probabilityResult = {
  exact: true,
  format: "five_card_draw",
  deckSize: 55,
  totalCombinationCount: 3478761,
  handResults: [
    {
      handId: "common",
      handName: "Common",
      description: "Common hand",
      category: "relationship",
      probabilityPercent: 20,
      possible: true,
      rankingMode: "calculated_probability",
      rankingTier: null,
    },
    {
      handId: "jersey_pair",
      handName: "Jersey Pair",
      description: "Fixed pair",
      category: "exact_card",
      probabilityPercent: 0.78,
      possible: true,
      rankingMode: "fixed_tier",
      rankingTier: RANKING_TIER.RARE_EXACT_PAIR,
    },
    {
      handId: "fun_flight",
      handName: "Fun Flight",
      description: "Union pair",
      category: "exact_card",
      probabilityPercent: 1.5,
      possible: true,
      rankingMode: "fixed_tier",
      rankingTier: RANKING_TIER.RARE_EXACT_PAIR,
    },
    {
      handId: "rare",
      handName: "Rare",
      description: "Rare hand",
      category: "relationship",
      probabilityPercent: 0.1,
      possible: true,
      rankingMode: "calculated_probability",
      rankingTier: null,
    },
    {
      handId: "attendance_5_of_6",
      handName: "5 Players Represented",
      description: "Five players",
      category: "attendance",
      probabilityPercent: 0.5,
      possible: true,
      rankingMode: "generated_probability",
      rankingTier: null,
    },
    {
      handId: "impossible",
      handName: "Impossible",
      description: "Impossible",
      category: "relationship",
      probabilityPercent: 0,
      possible: false,
      rankingMode: "calculated_probability",
      rankingTier: null,
    },
  ],
};

const setup = {
  attendanceRankingRules: [
    {
      gameplayHandId: "attendance_6_of_6",
      gameplayLabel: "All 6 Players Represented",
      gameplayRequiredCount: 6,
      probabilityHandId: "attendance_5_of_6",
      probabilityLabel: "5 Players Represented",
      probabilityRequiredCount: 5,
      sharesPhysicalMaximumRank: true,
    },
  ],
};

const ranking = buildStaticHandRanking(probabilityResult, setup);
check("Impossible hands are excluded", !ranking.rows.some((row) => row.handId === "impossible"));
check("Rarest calculated hand ranks first", ranking.rows[0].handId === "rare");
const jersey = ranking.rows.find((row) => row.handId === "jersey_pair");
const flight = ranking.rows.find((row) => row.handId === "fun_flight");
check("Fixed-tier hands share a rank", jersey.rank === flight.rank);
check("Fixed-tier hands retain actual percentages", jersey.probabilityPercent !== flight.probabilityPercent);
const five = ranking.rows.find((row) => row.handId === "attendance_5_of_6");
const six = ranking.rows.find((row) => row.handId === "attendance_6_of_6");
check("Virtual-self attendance alias is added", Boolean(six?.gameplayVirtualSelfAlias));
check("Attendance alias shares physical probability", six.probabilityPercent === five.probabilityPercent);
check("Attendance alias shares physical rank", six.rank === five.rank);

const reversed = buildStaticHandRanking(probabilityResult, setup, {
  direction: RANKING_DIRECTION.WEAKEST_FIRST,
});
check("Weakest-first reverses display order", reversed.rows[0].handId === "common");
check("Rank numbers remain strength ranks", reversed.rows[0].rank > reversed.rows.at(-1).rank);
check("Percentage formatter removes excess zeros", formatProbabilityPercent(12.5) === "12.5%");
check("Percentage formatter preserves tiny values", formatProbabilityPercent(0.00001234) === "0.00001234%");

console.log([
  "STATIC RANKING VALIDATION PASSED",
  `${checks.length}/${checks.length} checks passed`,
  "",
  ...checks,
].join("\n"));
