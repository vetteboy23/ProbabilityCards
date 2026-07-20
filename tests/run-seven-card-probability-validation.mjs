import { validateSevenCardProbability } from "../src/validateSevenCardProbability.js";
import { writeFile } from "node:fs/promises";
const result = validateSevenCardProbability();
const lines = [
  "Seven-card Hold’em probability validation",
  "=========================================",
  `Checks: ${result.checkCount}`,
  `Result: ${result.passed ? "PASS" : "FAIL"}`,
  "",
  ...result.checks.map((check, index) => `${String(index + 1).padStart(3, "0")}. ${check.passed ? "PASS" : "FAIL"} — ${check.message}`),
  "",
];
const report = lines.join("\n");
await writeFile(new URL("../seven-card-probability-validation-report.txt", import.meta.url), report);
console.log(report);
