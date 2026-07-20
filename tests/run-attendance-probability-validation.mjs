import { writeFile } from "node:fs/promises";
import { validateAttendanceProbability } from "../src/validateAttendanceProbability.js";

const result = validateAttendanceProbability();
const report = [
  result.valid
    ? "ATTENDANCE PROBABILITY AUDIT PASSED"
    : "ATTENDANCE PROBABILITY AUDIT FAILED",
  `${result.checks.length}/${result.checks.length + result.failures.length} checks passed`,
  `Independent samples per roster: ${result.samplesPerRoster}`,
  "",
  ...result.checks,
  ...(result.failures.length ? ["", "FAILURES", ...result.failures] : []),
].join("\n");

await writeFile("attendance-probability-validation-report.txt", `${report}\n`);
console.log(report);
if (!result.valid) process.exitCode = 1;
