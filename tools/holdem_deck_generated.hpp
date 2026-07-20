#pragma once
#include <array>
#include <cstdint>

struct FamilyCard { uint32_t people; int8_t rank; int8_t suit; uint8_t jokerBit; };

constexpr int FAMILY_PERSON_COUNT = 23;
constexpr int P_QUEEN = 0;
constexpr int P_KING = 1;
constexpr int P_DOPEY = 2;
constexpr int P_SNOW_WHITE = 3;
constexpr int P_GRUMPY = 4;
constexpr int P_SNEEZY = 5;
constexpr int P_DOC = 6;
constexpr int P_HAPPY = 7;
constexpr int P_BASHFUL = 8;
constexpr int P_SLEEPY = 9;
constexpr int P_CHEESE = 10;
constexpr int P_OLD_FASHIONED = 11;
constexpr int P_BEER = 12;
constexpr int P_STEAK = 13;
constexpr int P_LIGHT = 14;
constexpr int P_CUBE = 15;
constexpr int P_BALL = 16;
constexpr int P_NET = 17;
constexpr int P_MATERNAL_GRANDMOTHER = 18;
constexpr int P_MATERNAL_GRANDFATHER = 19;
constexpr int P_PATERNAL_GRANDMOTHER = 20;
constexpr int P_KICK = 21;
constexpr int P_FLY = 22;

constexpr std::array<FamilyCard, 55> FAMILY_DECK = {{
  FamilyCard{4u, 0, 0, 0}, // 2C
  FamilyCard{4u, 0, 1, 0}, // 2D
  FamilyCard{4u, 0, 2, 0}, // 2H
  FamilyCard{4u, 0, 3, 0}, // 2S
  FamilyCard{8u, 1, 0, 0}, // 3C
  FamilyCard{8u, 1, 1, 0}, // 3D
  FamilyCard{8u, 1, 2, 0}, // 3H
  FamilyCard{1032u, 1, 3, 0}, // 3S
  FamilyCard{16u, 2, 0, 0}, // 4C
  FamilyCard{16u, 2, 1, 0}, // 4D
  FamilyCard{16u, 2, 2, 0}, // 4H
  FamilyCard{2064u, 2, 3, 0}, // 4S
  FamilyCard{32u, 3, 0, 0}, // 5C
  FamilyCard{32u, 3, 1, 0}, // 5D
  FamilyCard{32u, 3, 2, 0}, // 5H
  FamilyCard{4128u, 3, 3, 0}, // 5S
  FamilyCard{64u, 4, 0, 0}, // 6C
  FamilyCard{64u, 4, 1, 0}, // 6D
  FamilyCard{64u, 4, 2, 0}, // 6H
  FamilyCard{64u, 4, 3, 0}, // 6S
  FamilyCard{128u, 5, 0, 0}, // 7C
  FamilyCard{128u, 5, 1, 0}, // 7D
  FamilyCard{128u, 5, 2, 0}, // 7H
  FamilyCard{16512u, 5, 3, 0}, // 7S
  FamilyCard{256u, 7, 0, 0}, // 9C
  FamilyCard{256u, 7, 1, 0}, // 9D
  FamilyCard{256u, 7, 2, 0}, // 9H
  FamilyCard{4194560u, 7, 3, 0}, // 9S
  FamilyCard{512u, 8, 0, 0}, // 10C
  FamilyCard{512u, 8, 1, 0}, // 10D
  FamilyCard{512u, 8, 2, 0}, // 10H
  FamilyCard{238080u, 8, 3, 0}, // 10S
  FamilyCard{1020u, 6, 0, 0}, // 8C
  FamilyCard{1020u, 6, 1, 0}, // 8D
  FamilyCard{1020u, 6, 2, 0}, // 8H
  FamilyCard{1020u, 6, 3, 0}, // 8S
  FamilyCard{1024u, 9, 0, 0}, // JC
  FamilyCard{2048u, 9, 1, 0}, // JD
  FamilyCard{4096u, 9, 2, 0}, // JH
  FamilyCard{8192u, 9, 3, 0}, // JS
  FamilyCard{1u, 10, 0, 0}, // QC
  FamilyCard{1u, 10, 1, 0}, // QD
  FamilyCard{1u, 10, 2, 0}, // QH
  FamilyCard{786432u, 10, 3, 0}, // QS
  FamilyCard{2u, 11, 0, 0}, // KC
  FamilyCard{2u, 11, 1, 0}, // KD
  FamilyCard{2u, 11, 2, 0}, // KH
  FamilyCard{3145728u, 11, 3, 0}, // KS
  FamilyCard{16384u, 12, 0, 0}, // AC
  FamilyCard{32768u, 12, 1, 0}, // AD
  FamilyCard{131072u, 12, 2, 0}, // AH
  FamilyCard{65536u, 12, 3, 0}, // AS
  FamilyCard{3u, 13, 3, 0}, // CROWN_S
  FamilyCard{2097152u, 14, -1, 1}, // JOKER_KICK
  FamilyCard{524288u, 14, -1, 2}, // JOKER_MATERNAL
}};

constexpr int C_2C = 0;
constexpr int C_2D = 1;
constexpr int C_2H = 2;
constexpr int C_2S = 3;
constexpr int C_3C = 4;
constexpr int C_3D = 5;
constexpr int C_3H = 6;
constexpr int C_3S = 7;
constexpr int C_4C = 8;
constexpr int C_4D = 9;
constexpr int C_4H = 10;
constexpr int C_4S = 11;
constexpr int C_5C = 12;
constexpr int C_5D = 13;
constexpr int C_5H = 14;
constexpr int C_5S = 15;
constexpr int C_6C = 16;
constexpr int C_6D = 17;
constexpr int C_6H = 18;
constexpr int C_6S = 19;
constexpr int C_7C = 20;
constexpr int C_7D = 21;
constexpr int C_7H = 22;
constexpr int C_7S = 23;
constexpr int C_9C = 24;
constexpr int C_9D = 25;
constexpr int C_9H = 26;
constexpr int C_9S = 27;
constexpr int C_10C = 28;
constexpr int C_10D = 29;
constexpr int C_10H = 30;
constexpr int C_10S = 31;
constexpr int C_8C = 32;
constexpr int C_8D = 33;
constexpr int C_8H = 34;
constexpr int C_8S = 35;
constexpr int C_JC = 36;
constexpr int C_JD = 37;
constexpr int C_JH = 38;
constexpr int C_JS = 39;
constexpr int C_QC = 40;
constexpr int C_QD = 41;
constexpr int C_QH = 42;
constexpr int C_QS = 43;
constexpr int C_KC = 44;
constexpr int C_KD = 45;
constexpr int C_KH = 46;
constexpr int C_KS = 47;
constexpr int C_AC = 48;
constexpr int C_AD = 49;
constexpr int C_AH = 50;
constexpr int C_AS = 51;
constexpr int C_CROWN_S = 52;
constexpr int C_JOKER_KICK = 53;
constexpr int C_JOKER_MATERNAL = 54;

constexpr std::array<const char*, 55> FAMILY_CARD_IDS = {{
  "2C",
  "2D",
  "2H",
  "2S",
  "3C",
  "3D",
  "3H",
  "3S",
  "4C",
  "4D",
  "4H",
  "4S",
  "5C",
  "5D",
  "5H",
  "5S",
  "6C",
  "6D",
  "6H",
  "6S",
  "7C",
  "7D",
  "7H",
  "7S",
  "9C",
  "9D",
  "9H",
  "9S",
  "10C",
  "10D",
  "10H",
  "10S",
  "8C",
  "8D",
  "8H",
  "8S",
  "JC",
  "JD",
  "JH",
  "JS",
  "QC",
  "QD",
  "QH",
  "QS",
  "KC",
  "KD",
  "KH",
  "KS",
  "AC",
  "AD",
  "AH",
  "AS",
  "CROWN_S",
  "JOKER_KICK",
  "JOKER_MATERNAL",
}};
