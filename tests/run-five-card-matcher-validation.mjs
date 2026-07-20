import assert from "node:assert/strict";
import { validateFiveCardMatchers } from "../src/validateFiveCardMatcher.js";

const validation = validateFiveCardMatchers({ samplesPerContext: 250 });
const report = [
  validation.valid
    ? "FAST FIVE-CARD MATCHER VALIDATION PASSED"
    : "FAST FIVE-CARD MATCHER VALIDATION FAILED",
  `${validation.checks.length} matcher/context checks completed`,
  `${validation.samplesPerContext} sampled hands per context`,
  "",
  ...validation.checks,
  ...validation.failures.map((failure) => `✗ ${failure}`),
].join("\n");
console.log(report);
assert.equal(validation.valid, true, validation.failures.join("\n"));
