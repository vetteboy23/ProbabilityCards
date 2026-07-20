import { fullDeck } from "../src/cards.js";
import { people } from "../src/people.js";
import { writeFile } from "node:fs/promises";

const personIds = Object.keys(people);
const personIndex = Object.fromEntries(personIds.map((id, i) => [id, i]));
const suitCode = { clubs: 0, diamonds: 1, hearts: 2, spades: 3 };
const rankOrder = ["2","3","4","5","6","7","8","9","10","J","Q","K","A","CROWN","JOKER"];
const rankCode = Object.fromEntries(rankOrder.map((r,i)=>[r,i]));
function mask(ids){let m=0;for(const id of ids)m |= (1 << personIndex[id]);return m>>>0;}
function cppId(id){return id.replace(/[^A-Za-z0-9]/g,'_');}
let out = `#pragma once\n#include <array>\n#include <cstdint>\n\nstruct FamilyCard { uint32_t people; int8_t rank; int8_t suit; uint8_t jokerBit; };\n\n`;
out += `constexpr int FAMILY_PERSON_COUNT = ${personIds.length};\n`;
personIds.forEach((id,i)=>{out += `constexpr int P_${cppId(id).toUpperCase()} = ${i};\n`;});
out += `\nconstexpr std::array<FamilyCard, ${fullDeck.length}> FAMILY_DECK = {{\n`;
for(const c of fullDeck){
 const jb=c.id==='JOKER_KICK'?1:c.id==='JOKER_MATERNAL'?2:0;
 out += `  FamilyCard{${mask(c.depicts)}u, ${rankCode[c.rank]}, ${c.suit==null?-1:suitCode[c.suit]}, ${jb}}, // ${c.id}\n`;
}
out += `}};\n\n`;
fullDeck.forEach((c,i)=>{out += `constexpr int C_${cppId(c.id).toUpperCase()} = ${i};\n`;});
out += `\nconstexpr std::array<const char*, ${fullDeck.length}> FAMILY_CARD_IDS = {{\n`;
for(const c of fullDeck) out += `  "${c.id}",\n`;
out += `}};\n`;
await writeFile(new URL('./holdem_deck_generated.hpp', import.meta.url), out);
