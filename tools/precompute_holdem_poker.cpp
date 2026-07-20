#include <array>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <string>

struct Card { int rank; int suit; int jokerBit; };

enum Category {
  HIGH_CARD=0, ONE_PAIR, TWO_PAIR, THREE_KIND, STRAIGHT, FLUSH,
  FULL_HOUSE, FOUR_KIND, STRAIGHT_FLUSH, ROYAL_FLUSH, CATEGORY_COUNT
};

static const char* NAMES[CATEGORY_COUNT] = {
  "high_card","one_pair","two_pair","three_of_a_kind","straight","flush",
  "full_house","four_of_a_kind","straight_flush","royal_flush"
};

inline bool hasStraight(uint16_t mask) {
  // Wheel: A,2,3,4,5 -> bits 12,0,1,2,3
  if ((mask & ((1u<<12)|0x0Fu)) == ((1u<<12)|0x0Fu)) return true;
  for (int start=0; start<=8; ++start) {
    uint16_t run = static_cast<uint16_t>(0x1Fu << start);
    if ((mask & run) == run) return true;
  }
  return false;
}

inline Category classify(const std::array<Card,7>& hand) {
  int rankCounts[15] = {0};
  int suitCounts[4] = {0};
  uint16_t totalMask = 0;
  uint16_t suitMasks[4] = {0,0,0,0};

  for (const auto& c : hand) {
    ++rankCounts[c.rank];
    if (c.suit >= 0) ++suitCounts[c.suit];
    if (c.rank < 13) {
      totalMask |= static_cast<uint16_t>(1u << c.rank);
      if (c.suit >= 0) suitMasks[c.suit] |= static_cast<uint16_t>(1u << c.rank);
    }
  }

  constexpr uint16_t royalMask = static_cast<uint16_t>((1u<<8)|(1u<<9)|(1u<<10)|(1u<<11)|(1u<<12));
  bool straightFlush = false;
  for (int s=0; s<4; ++s) {
    if (suitCounts[s] >= 5) {
      if ((suitMasks[s] & royalMask) == royalMask) return ROYAL_FLUSH;
      if (hasStraight(suitMasks[s])) straightFlush = true;
    }
  }
  if (straightFlush) return STRAIGHT_FLUSH;

  int pairRanks = 0;
  int tripRanks = 0;
  bool four = false;
  for (int r=0; r<15; ++r) {
    if (rankCounts[r] >= 4) four = true;
    if (rankCounts[r] >= 3) ++tripRanks;
    if (rankCounts[r] >= 2) ++pairRanks;
  }
  if (four) return FOUR_KIND;
  if (tripRanks >= 2 || (tripRanks >= 1 && pairRanks >= 2)) return FULL_HOUSE;

  for (int s=0; s<4; ++s) if (suitCounts[s] >= 5) return FLUSH;
  if (hasStraight(totalMask)) return STRAIGHT;
  if (tripRanks >= 1) return THREE_KIND;
  if (pairRanks >= 2) return TWO_PAIR;
  if (pairRanks >= 1) return ONE_PAIR;
  return HIGH_CARD;
}

int main(int argc, char** argv) {
  std::string outPath = argc > 1 ? argv[1] : "holdem-poker-counts.json";
  std::array<Card,55> deck{};
  int idx=0;
  // Standard ranks 2..A encoded 0..12; suits C,D,H,S encoded 0..3.
  for (int rank=0; rank<13; ++rank) {
    for (int suit=0; suit<4; ++suit) deck[idx++] = {rank,suit,0};
  }
  deck[idx++] = {13,3,0}; // Crown of Spades
  deck[idx++] = {14,-1,1}; // Kick Joker
  deck[idx++] = {14,-1,2}; // Pipe Joker

  std::array<std::array<uint64_t,CATEGORY_COUNT>,4> byJokerMask{};
  uint64_t processed=0;
  std::array<Card,7> hand{};
  for (int a=0; a<49; ++a)
  for (int b=a+1; b<50; ++b)
  for (int c=b+1; c<51; ++c)
  for (int d=c+1; d<52; ++d)
  for (int e=d+1; e<53; ++e)
  for (int f=e+1; f<54; ++f)
  for (int g=f+1; g<55; ++g) {
    hand = {deck[a],deck[b],deck[c],deck[d],deck[e],deck[f],deck[g]};
    int jm = deck[a].jokerBit|deck[b].jokerBit|deck[c].jokerBit|deck[d].jokerBit|
             deck[e].jokerBit|deck[f].jokerBit|deck[g].jokerBit;
    ++byJokerMask[jm][classify(hand)];
    ++processed;
  }

  auto sumMask = [&](std::initializer_list<int> masks, int cat) {
    uint64_t total=0; for (int m : masks) total += byJokerMask[m][cat]; return total;
  };
  std::ofstream out(outPath);
  out << "{\n  \"generatedBy\": \"tools/precompute_holdem_poker.cpp\",\n";
  out << "  \"fullDeckCombinations\": " << processed << ",\n";
  out << "  \"decks\": {\n";
  struct Config { const char* name; std::initializer_list<int> masks; int size; };
  Config configs[] = {
    {"none", {0}, 53},
    {"kick_only", {0,1}, 54},
    {"pipe_only", {0,2}, 54},
    {"both", {0,1,2,3}, 55}
  };
  for (int ci=0; ci<4; ++ci) {
    const auto& cfg=configs[ci];
    uint64_t total=0; for(int cat=0;cat<CATEGORY_COUNT;++cat) total += sumMask(cfg.masks,cat);
    out << "    \"" << cfg.name << "\": {\"deckSize\": " << cfg.size << ", \"total\": " << total << ", \"counts\": {";
    for(int cat=0;cat<CATEGORY_COUNT;++cat) {
      if(cat) out << ", ";
      out << "\"" << NAMES[cat] << "\": " << sumMask(cfg.masks,cat);
    }
    out << "}}" << (ci<3 ? "," : "") << "\n";
  }
  out << "  },\n  \"partitionByJokerMask\": {\n";
  for(int m=0;m<4;++m) {
    uint64_t total=0;for(int cat=0;cat<CATEGORY_COUNT;++cat)total+=byJokerMask[m][cat];
    out << "    \"" << m << "\": {\"total\": " << total << ", \"counts\": {";
    for(int cat=0;cat<CATEGORY_COUNT;++cat){if(cat)out<<", ";out<<"\""<<NAMES[cat]<<"\": "<<byJokerMask[m][cat];}
    out << "}}" << (m<3 ? "," : "") << "\n";
  }
  out << "  }\n}\n";
  out.close();
  std::cerr << "Processed " << processed << " combinations\n";
  return 0;
}
