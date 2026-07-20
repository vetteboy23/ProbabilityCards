import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const setupUI = fs.readFileSync(path.join(root, "src", "setupUI.js"), "utf8");

const checks = [
  ["Results include a Change setup button", index.includes('id="change-setup"')],
  ["Change setup button is excluded from print controls", index.includes('class="ranking-action-buttons"')],
  ["Setup UI reads the Change setup button", setupUI.includes('querySelector("#change-setup")')],
  ["Setup UI registers the Change setup listener", setupUI.includes('addEventListener("click", changeSetup)')],
  ["Change setup hides the ranking", setupUI.includes("rankingResult.hidden = true")],
  ["Change setup preserves the form instead of resetting it", !/function changeSetup\([^)]*\)[\s\S]*?reset\(/.test(setupUI)],
  ["Mobile ranking removes the minimum table width", /@media \(max-width: 720px\)[\s\S]*?\.ranking-table\s*\{[\s\S]*?min-width:\s*0/.test(styles)],
  ["Mobile ranking hides the rank column", /\.ranking-table th:nth-child\(1\)[\s\S]*?display:\s*none/.test(styles)],
  ["Mobile ranking hides the definition column", /\.ranking-table th:nth-child\(3\)[\s\S]*?display:\s*none/.test(styles)],
  ["Mobile probability column is right aligned", /\.ranking-table th:nth-child\(4\)[\s\S]*?text-align:\s*right/.test(styles)],
];

const failed = checks.filter(([, passed]) => !passed);
const lines = [
  "UI STRUCTURE VALIDATION " + (failed.length ? "FAILED" : "PASSED"),
  `${checks.length - failed.length}/${checks.length} checks passed`,
  "",
  ...checks.map(([name, passed]) => `${passed ? "✓" : "✗"} ${name}`),
];

const report = lines.join("\n") + "\n";
fs.writeFileSync(path.join(root, "ui-structure-validation-report.txt"), report);
console.log(report);
if (failed.length) process.exitCode = 1;
