import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateHandLibrary,
  formatHandValidationReport,
} from "../src/validateHands.js";

const report = validateHandLibrary();
const formatted = formatHandValidationReport(report);

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFile), "..");
fs.writeFileSync(path.join(projectRoot, "hand-validation-report.txt"), `${formatted}\n`);

console.log(formatted);
if (!report.passed) process.exitCode = 1;
