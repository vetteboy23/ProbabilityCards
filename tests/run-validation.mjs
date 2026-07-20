import { validateDeckData, formatValidationReport } from "../src/validateDeck.js";

const report = validateDeckData();
console.log(formatValidationReport(report));

if (!report.passed) {
  process.exitCode = 1;
}
