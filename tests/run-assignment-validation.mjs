import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateCardAssignmentEngine,
  formatCardAssignmentValidationReport,
} from "../src/validateCardAssignment.js";

const report = validateCardAssignmentEngine();
const formatted = formatCardAssignmentValidationReport(report);

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFile), "..");
fs.writeFileSync(
  path.join(projectRoot, "assignment-validation-report.txt"),
  `${formatted}\n`
);

console.log(formatted);
if (!report.passed) process.exitCode = 1;
