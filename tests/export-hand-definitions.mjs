import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  handDefinitions,
  fixedRankingTiers,
  handLibraryMetadata,
} from "../src/hands.js";

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFile), "..");
const output = {
  metadata: handLibraryMetadata,
  fixedRankingTiers,
  hands: handDefinitions,
};

fs.writeFileSync(
  path.join(projectRoot, "hand-definitions.json"),
  `${JSON.stringify(output, null, 2)}\n`
);
