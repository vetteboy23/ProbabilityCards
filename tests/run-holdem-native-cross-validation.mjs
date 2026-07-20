import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { fullDeck } from "../src/cards.js";
import { classifyBestPokerHand } from "../src/handEvaluator.js";
import {
  getHandsForGame,
  selectableHandIds,
  HAND_EVALUATOR,
  BUILT_IN_HAND,
} from "../src/hands.js";
import {
  createCardPoolProfile,
  createFastCardPoolMatcher,
} from "../src/fiveCardMatcher.js";
import { writeFile } from "node:fs/promises";

const categoryIndex = {
  high_card: 0, one_pair: 1, two_pair: 2, three_of_a_kind: 3, straight: 4,
  flush: 5, full_house: 6, four_of_a_kind: 7, straight_flush: 8, royal_flush: 9,
};
const hands = getHandsForGame({ selectedOptionalHandIds: selectableHandIds }).filter((hand) =>
  ![
    HAND_EVALUATOR.STANDARD_POKER_CATEGORY,
    HAND_EVALUATOR.FIXED_SPECIFIC_CARD_PAIR_PROBABILITY,
    HAND_EVALUATOR.ATTENDANCE_GENERATOR,
  ].includes(hand.evaluator)
);
const expectedOrder = [
  "echo_pair","echo_two_pair","echo_three_of_a_kind","echo_full_house","echo_four_of_a_kind","echo_five_of_a_kind","echo_six_of_a_kind","echo_seven_of_a_kind","echo_eight_of_a_kind",
  "married_couple","happy_and_light","three_brothers","three_sisters","four_sisters","five_sisters","three_kids","three_at_the_grill","four_at_the_grill","five_at_the_grill",
  "jersey_pair","family_album","grandparents_album","fun_flight","full_ancestry",
  "grandparent_and_ace","heritage","double_heritage","brother_time","sister_time","dynamic_duo","family_sleepover","same_suit_relationship_pair",
];
const byId = new Map(hands.map((hand) => [hand.id, hand]));
for (const id of expectedOrder) if (!byId.has(id)) throw new Error(`Missing JS hand ${id}`);
const context = Object.freeze({ format: "texas_holdem", useVirtualSelf: false, playerId: null, selectedPlayerIds: [] });
const matchers = expectedOrder.map((id) => {
  const matcher = createFastCardPoolMatcher(byId.get(id), context);
  if (!matcher) throw new Error(`Missing matcher ${id}`);
  return matcher;
});

let seed = 0x5eeda11;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;}
function sampleHand(){const pool=[...Array(fullDeck.length).keys()];for(let i=0;i<7;i++){const j=i+Math.floor(random()*(pool.length-i));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,7).sort((a,b)=>a-b);}
const samples=[];for(let i=0;i<3000;i++)samples.push(sampleHand());
const input=samples.map((s)=>s.join(' ')).join('\n')+'\n';
const proc=spawnSync(fileURLToPath(new URL('../tools/evaluate_holdem_samples',import.meta.url)),[],{input,encoding:'utf8',maxBuffer:20*1024*1024});
if(proc.status!==0)throw new Error(proc.stderr||`native evaluator exited ${proc.status}`);
const lines=proc.stdout.trim().split(/\n/);
if(lines.length!==samples.length)throw new Error(`Expected ${samples.length} native rows, got ${lines.length}`);
let checks=0;
for(let i=0;i<samples.length;i++){
 const cards=samples[i].map((index)=>fullDeck[index]);
 const values=lines[i].trim().split(/\s+/).map(Number);
 const poker=classifyBestPokerHand(cards);
 if(values[0]!==categoryIndex[poker.category])throw new Error(`Poker mismatch sample ${i}: native=${values[0]} js=${poker.category} cards=${cards.map(c=>c.id)}`);
 checks++;
 const profile=createCardPoolProfile(cards,context);
 for(let h=0;h<matchers.length;h++){
  const js=matchers[h](profile)?1:0;
  const native=values[h+1];
  if(js!==native)throw new Error(`Hand mismatch ${expectedOrder[h]} sample ${i}: native=${native} js=${js} cards=${cards.map(c=>c.id)}`);
  checks++;
 }
}
const report=[
 'Hold’em native/JavaScript cross-validation',
 '==========================================',
 `Samples: ${samples.length}`,
 `Checks: ${checks}`,
 'Result: PASS',
 'Compared the native precomputation predicates with JavaScript on ordinary poker and every fixed family/optional hand except the abstract Dancers pair and generated attendance hands.',
].join('\n')+'\n';
await writeFile(new URL('../holdem-native-cross-validation-report.txt',import.meta.url),report);
console.log(report);
