import { writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["tests/run-five-card-probability-validation.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8",
});
const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
await writeFile("five-card-probability-validation-report.txt", output);
process.stdout.write(output);
if (result.status !== 0) process.exit(result.status ?? 1);
