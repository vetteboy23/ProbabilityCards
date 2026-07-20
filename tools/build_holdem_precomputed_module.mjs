import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const poker = JSON.parse(await readFile(new URL("holdem-poker-counts.json", root), "utf8"));
const relational = JSON.parse(await readFile(new URL("holdem-relational-counts.json", root), "utf8"));
const sameSuit = JSON.parse(await readFile(new URL("holdem-same-suit-counts.json", root), "utf8"));
const decks = {};
for (const key of ["none", "kick_only", "pipe_only", "both"]) {
  const p = poker.decks[key];
  const r = relational.decks[key];
  const s = sameSuit.decks[key];
  if (p.total !== r.total || p.total !== s.total || p.deckSize !== r.deckSize || p.deckSize !== s.deckSize) {
    throw new Error(`Mismatched precomputed sources for ${key}`);
  }
  decks[key] = {
    deckSize: p.deckSize,
    totalCombinationCount: p.total,
    counts: {
      ...p.counts,
      ...r.counts,
      same_suit_relationship_pair: s.count,
    },
  };
}
const payload = {
  version: 1,
  handSize: 7,
  exact: true,
  probabilityUsesVirtualSelf: false,
  generatedFrom: [
    poker.generatedBy,
    relational.generatedBy,
    sameSuit.generatedBy,
  ],
  decks,
};
const source = `// Generated file. Regenerate with tools/build_holdem_precomputed_module.mjs.\nexport const holdemPrecomputed = Object.freeze(${JSON.stringify(payload, null, 2)});\n`;
await writeFile(new URL("src/holdemPrecomputed.js", root), source);
