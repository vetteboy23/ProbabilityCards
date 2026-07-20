import fs from "node:fs";
import { fullDeck } from "../src/cards.js";
import { people } from "../src/people.js";

const snapshot = {
  generatedFrom: ["src/people.js", "src/cards.js"],
  people: Object.values(people),
  cards: fullDeck,
};

fs.writeFileSync(
  new URL("../deck-snapshot.json", import.meta.url),
  `${JSON.stringify(snapshot, null, 2)}\n`,
  "utf8"
);
