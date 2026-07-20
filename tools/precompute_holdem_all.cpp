#include "holdem_deck_generated.hpp"
#include <array>
#include <algorithm>
#include <cstdint>
#include <fstream>
#include <initializer_list>
#include <iostream>
#include <string>
#include <vector>

inline int pc8(uint8_t x){ return __builtin_popcount((unsigned)x); }
inline int pc32(uint32_t x){ return __builtin_popcount(x); }
inline uint32_t PB(int p){ return 1u << p; }

static const std::array<const char*, 42> HAND_IDS = {{
  "high_card","one_pair","two_pair","three_of_a_kind","straight","flush","full_house","four_of_a_kind","straight_flush","royal_flush",
  "echo_pair","echo_two_pair","echo_three_of_a_kind","echo_full_house","echo_four_of_a_kind","echo_five_of_a_kind","echo_six_of_a_kind","echo_seven_of_a_kind","echo_eight_of_a_kind",
  "married_couple","happy_and_light","three_brothers","three_sisters","four_sisters","five_sisters","three_kids","three_at_the_grill","four_at_the_grill","five_at_the_grill",
  "jersey_pair","family_album","grandparents_album","fun_flight","full_ancestry",
  "grandparent_and_ace","heritage","double_heritage","brother_time","sister_time","dynamic_duo","family_sleepover","same_suit_relationship_pair"
}};

enum H {
  H_HIGH,H_PAIR,H_TWO_PAIR,H_TRIPS,H_STRAIGHT,H_FLUSH,H_FULL,H_FOUR,H_SF,H_RF,
  H_E2,H_E22,H_E3,H_E32,H_E4,H_E5,H_E6,H_E7,H_E8,
  H_COUPLE,H_HAPPY_LIGHT,H_3BRO,H_3SIS,H_4SIS,H_5SIS,H_3KIDS,H_GRILL3,H_GRILL4,H_GRILL5,
  H_JERSEY,H_FAMILY_ALBUM,H_GP_ALBUM,H_FUN_FLIGHT,H_FULL_ANCESTRY,
  H_GP_ACE,H_HERITAGE,H_DOUBLE_HERITAGE,H_BRO_TIME,H_SIS_TIME,H_DUO,H_SLEEPOVER,H_SAME_SUIT,
  HCOUNT
};

inline bool hasStraight(uint16_t mask){
  if ((mask & ((1u<<12)|0x0Fu)) == ((1u<<12)|0x0Fu)) return true;
  for(int s=0;s<=8;++s){uint16_t run=(uint16_t)(0x1Fu<<s);if((mask&run)==run)return true;}
  return false;
}

inline int pokerCategory(const std::array<int,7>& ix){
  int rc[15]={0}, sc[4]={0}; uint16_t total=0, sm[4]={0,0,0,0};
  for(int pos=0;pos<7;++pos){const auto& c=FAMILY_DECK[ix[pos]];rc[c.rank]++;if(c.suit>=0)sc[c.suit]++;if(c.rank<13){total|=(uint16_t)(1u<<c.rank);if(c.suit>=0)sm[c.suit]|=(uint16_t)(1u<<c.rank);}}
  constexpr uint16_t royal=(uint16_t)((1u<<8)|(1u<<9)|(1u<<10)|(1u<<11)|(1u<<12));
  bool sf=false;for(int s=0;s<4;++s)if(sc[s]>=5){if((sm[s]&royal)==royal)return H_RF;if(hasStraight(sm[s]))sf=true;}if(sf)return H_SF;
  int pairs=0,trips=0;bool four=false;for(int r=0;r<15;++r){if(rc[r]>=4)four=true;if(rc[r]>=3)trips++;if(rc[r]>=2)pairs++;}
  if(four)return H_FOUR;if(trips>=2||(trips>=1&&pairs>=2))return H_FULL;for(int s=0;s<4;++s)if(sc[s]>=5)return H_FLUSH;if(hasStraight(total))return H_STRAIGHT;if(trips)return H_TRIPS;if(pairs>=2)return H_TWO_PAIR;if(pairs)return H_PAIR;return H_HIGH;
}

inline bool canAssignDistinct(const uint8_t cm[23], const int* persons, int n, uint8_t reserved=0){
  int order[7];for(int i=0;i<n;++i)order[i]=persons[i];
  std::sort(order,order+n,[&](int a,int b){return pc8((uint8_t)(cm[a]&~reserved))<pc8((uint8_t)(cm[b]&~reserved));});
  auto dfs = [&](auto&& self,int at,uint8_t used)->bool{
    if(at==n)return true;uint8_t avail=(uint8_t)(cm[order[at]] & ~used & ~reserved);
    while(avail){uint8_t bit=(uint8_t)(avail & (uint8_t)(-avail));avail^=bit;if(self(self,at+1,(uint8_t)(used|bit)))return true;}return false;
  };
  return dfs(dfs,0,0);
}

inline int maxDistinctFromPool(const std::array<uint32_t,7>& cardPeople, uint32_t pool){
  // Compress pool people to local bits (at most five for current fixed groups).
  int ids[23], n=0;for(int p=0;p<23;++p)if(pool&PB(p))ids[n++]=p;
  uint8_t reach[128]={0}; reach[0]=1;
  for(int i=0;i<7;++i){uint8_t local=0;for(int j=0;j<n;++j)if(cardPeople[i]&PB(ids[j]))local|=(uint8_t)(1u<<j);uint8_t next[128];std::copy(std::begin(reach),std::end(reach),std::begin(next));for(int state=0;state<(1<<n);++state)if(reach[state]){uint8_t avail=(uint8_t)(local & ~state);while(avail){uint8_t b=(uint8_t)(avail & (uint8_t)(-avail));avail^=b;next[state|b]=1;}}std::copy(std::begin(next),std::end(next),std::begin(reach));}
  int best=0;for(int s=0;s<(1<<n);++s)if(reach[s])best=std::max(best,__builtin_popcount((unsigned)s));return best;
}

inline bool pairAssignable(uint32_t a,uint32_t b,int p,int q){return ((a&PB(p))&&(b&PB(q)))||((a&PB(q))&&(b&PB(p)));}

bool SAME_EDGE[55][55];
void buildSameEdges(){
  const int couples[][2]={{P_SNOW_WHITE,P_CHEESE},{P_GRUMPY,P_OLD_FASHIONED},{P_SNEEZY,P_BEER},{P_SLEEPY,P_STEAK},{P_QUEEN,P_KING},{P_MATERNAL_GRANDMOTHER,P_MATERNAL_GRANDFATHER},{P_PATERNAL_GRANDMOTHER,P_KICK}};
  const int pcPairs[][2]={{P_HAPPY,P_LIGHT},{P_SLEEPY,P_CUBE},{P_SLEEPY,P_BALL},{P_SLEEPY,P_NET},{P_STEAK,P_CUBE},{P_STEAK,P_BALL},{P_STEAK,P_NET}};
  uint32_t bro=PB(P_DOPEY)|PB(P_DOC)|PB(P_BASHFUL), sis=PB(P_SNOW_WHITE)|PB(P_GRUMPY)|PB(P_SNEEZY)|PB(P_HAPPY)|PB(P_SLEEPY);
  for(int i=0;i<55;++i)for(int j=i+1;j<55;++j){const auto&a=FAMILY_DECK[i];const auto&b=FAMILY_DECK[j];if(a.suit<0||a.suit!=b.suit)continue;bool ok=false;
    uint32_t am=a.people&bro,bm=b.people&bro;if(am&&bm&&pc32(am|bm)>=2)ok=true;
    am=a.people&sis;bm=b.people&sis;if(am&&bm&&pc32(am|bm)>=2)ok=true;
    for(auto&x:couples)if(pairAssignable(a.people,b.people,x[0],x[1]))ok=true;
    for(auto&x:pcPairs)if(pairAssignable(a.people,b.people,x[0],x[1]))ok=true;
    SAME_EDGE[i][j]=SAME_EDGE[j][i]=ok;
  }
}

inline bool hasIndex(const std::array<int,7>& ix,int target){for(int x:ix)if(x==target)return true;return false;}

inline void buildContributorMasks(const std::array<int,7>& ix,uint8_t cm[23],std::array<uint32_t,7>& cp){
  std::fill(cm,cm+23,0);for(int pos=0;pos<7;++pos){uint32_t m=FAMILY_DECK[ix[pos]].people;cp[pos]=m;while(m){int p=__builtin_ctz(m);cm[p]|=(uint8_t)(1u<<pos);m&=m-1;}}
}

inline bool anyCouple(const uint8_t cm[23]){const int c[][2]={{P_SNOW_WHITE,P_CHEESE},{P_GRUMPY,P_OLD_FASHIONED},{P_SNEEZY,P_BEER},{P_SLEEPY,P_STEAK},{P_QUEEN,P_KING},{P_MATERNAL_GRANDMOTHER,P_MATERNAL_GRANDFATHER},{P_PATERNAL_GRANDMOTHER,P_KICK}};for(auto&x:c)if(cm[x[0]]&&cm[x[1]]&&pc8((uint8_t)(cm[x[0]]|cm[x[1]]))>=2)return true;return false;}

inline bool dynamicDuo(const std::array<int,7>& ix){const int pp[][4]={{P_DOPEY,P_SNOW_WHITE,0,1},{P_GRUMPY,P_SNEEZY,2,3},{P_DOC,P_HAPPY,4,5},{P_BASHFUL,P_SLEEPY,7,8}};for(auto&x:pp)for(int i=0;i<7;++i)if(FAMILY_DECK[ix[i]].people&PB(x[0]))for(int j=0;j<7;++j)if(i!=j&&(FAMILY_DECK[ix[j]].people&PB(x[1]))){int e=(FAMILY_DECK[ix[i]].rank==6)+(FAMILY_DECK[ix[j]].rank==6);if(e>1)continue;if(FAMILY_DECK[ix[i]].rank==x[2]||FAMILY_DECK[ix[j]].rank==x[3])return true;}return false;}

inline bool familySleepover(const std::array<int,7>& ix,const uint8_t cm[23]){
  const int children[4]={P_LIGHT,P_CUBE,P_BALL,P_NET};
  const int couples[4][3]={{P_SNOW_WHITE,P_CHEESE,C_3S},{P_GRUMPY,P_OLD_FASHIONED,C_4S},{P_SNEEZY,P_BEER,C_5S},{P_SLEEPY,P_STEAK,-1}};
  for(int child:children){for(int pos=0;pos<7;++pos){const auto& c=FAMILY_DECK[ix[pos]];if(c.rank!=12||!(c.people&PB(child)))continue;uint8_t reserved=(uint8_t)(1u<<pos);
      for(auto&co:couples){bool parents=(child==P_CUBE||child==P_BALL||child==P_NET)&&co[0]==P_SLEEPY&&co[1]==P_STEAK;if(parents)continue;if(co[2]>=0&&hasIndex(ix,co[2])&&ix[pos]!=co[2])return true;int ps[2]={co[0],co[1]};if(canAssignDistinct(cm,ps,2,reserved))return true;}
      int gp[2]={P_QUEEN,P_KING};if(canAssignDistinct(cm,gp,2,reserved))return true;
  }}return false;
}

inline void evaluateRelational(const std::array<int,7>& ix,std::array<uint64_t,HCOUNT>& out){
  uint8_t cm[23];std::array<uint32_t,7> cp;buildContributorMasks(ix,cm,cp);
  int counts[23];for(int p=0;p<23;++p)counts[p]=pc8(cm[p]);
  bool e2=false,e3=false,e4=false,e5=false,e6=false,e7=false;for(int p=0;p<23;++p){e2|=counts[p]>=2;e3|=counts[p]>=3;e4|=counts[p]>=4;e5|=counts[p]>=5;e6|=counts[p]>=6;e7|=counts[p]>=7;}
  if(e2)out[H_E2]++;if(e3)out[H_E3]++;if(e4)out[H_E4]++;if(e5)out[H_E5]++;if(e6)out[H_E6]++;if(e7)out[H_E7]++;
  bool e22=false,e32=false;for(int a=0;a<23;++a)for(int b=0;b<23;++b)if(a!=b){int u=pc8((uint8_t)(cm[a]|cm[b]));if(counts[a]>=2&&counts[b]>=2&&u>=4)e22=true;if(counts[a]>=3&&counts[b]>=2&&u>=5)e32=true;}if(e22)out[H_E22]++;if(e32)out[H_E32]++;
  if(anyCouple(cm))out[H_COUPLE]++;
  {int p[2]={P_HAPPY,P_LIGHT};if(canAssignDistinct(cm,p,2))out[H_HAPPY_LIGHT]++;}
  {int p[3]={P_DOPEY,P_DOC,P_BASHFUL};if(canAssignDistinct(cm,p,3))out[H_3BRO]++;}
  uint32_t sis=PB(P_SNOW_WHITE)|PB(P_GRUMPY)|PB(P_SNEEZY)|PB(P_HAPPY)|PB(P_SLEEPY);int ms=maxDistinctFromPool(cp,sis);if(ms>=3)out[H_3SIS]++;if(ms>=4)out[H_4SIS]++;if(ms>=5)out[H_5SIS]++;
  {int p[3]={P_CUBE,P_BALL,P_NET};if(canAssignDistinct(cm,p,3))out[H_3KIDS]++;}
  const int kids[3]={P_CUBE,P_BALL,P_NET};bool g3=false,g4=false,g5=false;for(int a=0;a<3;++a){int p3[3]={P_SLEEPY,P_STEAK,kids[a]};g3|=canAssignDistinct(cm,p3,3);for(int b=a+1;b<3;++b){int p4[4]={P_SLEEPY,P_STEAK,kids[a],kids[b]};g4|=canAssignDistinct(cm,p4,4);}}{int p5[5]={P_SLEEPY,P_STEAK,P_CUBE,P_BALL,P_NET};g5=canAssignDistinct(cm,p5,5);}if(g3)out[H_GRILL3]++;if(g4)out[H_GRILL4]++;if(g5)out[H_GRILL5]++;
  if(hasIndex(ix,C_JS)&&hasIndex(ix,C_AS))out[H_JERSEY]++;if(hasIndex(ix,C_7S)&&hasIndex(ix,C_10S))out[H_FAMILY_ALBUM]++;if(hasIndex(ix,C_QS)&&hasIndex(ix,C_KS))out[H_GP_ALBUM]++;if(hasIndex(ix,C_9S)&&(hasIndex(ix,C_KS)||hasIndex(ix,C_JOKER_KICK)))out[H_FUN_FLIGHT]++;if(hasIndex(ix,C_CROWN_S)&&hasIndex(ix,C_QS)&&hasIndex(ix,C_KS)&&(hasIndex(ix,C_3S)||hasIndex(ix,C_4S)||hasIndex(ix,C_5S)))out[H_FULL_ANCESTRY]++;
  uint32_t gpMask=PB(P_MATERNAL_GRANDMOTHER)|PB(P_MATERNAL_GRANDFATHER)|PB(P_PATERNAL_GRANDMOTHER)|PB(P_KICK);bool gpAce=false;for(int i=0;i<7;++i)if(FAMILY_DECK[ix[i]].rank==12){for(int j=0;j<7;++j)if(i!=j&&(FAMILY_DECK[ix[j]].people&gpMask))gpAce=true;}if(gpAce)out[H_GP_ACE]++;
  bool her=false;if(hasIndex(ix,C_QS)){uint8_t r=0;for(int p=0;p<7;++p)if(ix[p]==C_QS)r|=(uint8_t)(1u<<p);if(cm[P_QUEEN]&~r)her=true;}if(hasIndex(ix,C_KS)){uint8_t r=0;for(int p=0;p<7;++p)if(ix[p]==C_KS)r|=(uint8_t)(1u<<p);if(cm[P_KING]&~r)her=true;}if(her)out[H_HERITAGE]++;
  if(hasIndex(ix,C_QS)&&hasIndex(ix,C_KS)){uint8_t r=0;for(int p=0;p<7;++p)if(ix[p]==C_QS||ix[p]==C_KS)r|=(uint8_t)(1u<<p);int ps[2]={P_QUEEN,P_KING};if(canAssignDistinct(cm,ps,2,r))out[H_DOUBLE_HERITAGE]++;}
  uint32_t bro=PB(P_DOPEY)|PB(P_DOC)|PB(P_BASHFUL);int bc=0,sc=0;for(auto m:cp){if(m&bro)bc++;if(m&sis)sc++;}if(bc>=5)out[H_BRO_TIME]++;if(sc>=5)out[H_SIS_TIME]++;if(dynamicDuo(ix))out[H_DUO]++;if(familySleepover(ix,cm))out[H_SLEEPOVER]++;
  bool same=false;for(int i=0;i<7&&!same;++i)for(int j=i+1;j<7;++j)if(SAME_EDGE[ix[i]][ix[j]]){same=true;break;}if(same)out[H_SAME_SUIT]++;
}

#ifndef FAMILY_PRECOMPUTE_NO_MAIN
int main(int argc,char**argv){std::string path=argc>1?argv[1]:"holdem-all-counts.json";buildSameEdges();std::array<std::array<uint64_t,HCOUNT>,4> by{};std::array<uint64_t,4> totals{};std::array<int,7> ix;uint64_t processed=0;
for(int a=0;a<49;++a)for(int b=a+1;b<50;++b)for(int c=b+1;c<51;++c)for(int d=c+1;d<52;++d)for(int e=d+1;e<53;++e)for(int f=e+1;f<54;++f)for(int g=f+1;g<55;++g){ix={a,b,c,d,e,f,g};int jm=FAMILY_DECK[a].jokerBit|FAMILY_DECK[b].jokerBit|FAMILY_DECK[c].jokerBit|FAMILY_DECK[d].jokerBit|FAMILY_DECK[e].jokerBit|FAMILY_DECK[f].jokerBit|FAMILY_DECK[g].jokerBit;totals[jm]++;int pc=pokerCategory(ix);by[jm][pc]++;evaluateRelational(ix,by[jm]);processed++;}
struct Cfg{const char*id;std::vector<int>m;int n;};std::vector<Cfg> cfg={{"none",{0},53},{"kick_only",{0,1},54},{"pipe_only",{0,2},54},{"both",{0,1,2,3},55}};std::ofstream o(path);o<<"{\n  \"generatedBy\": \"tools/precompute_holdem_all.cpp\",\n  \"fullDeckCombinations\": "<<processed<<",\n  \"decks\": {\n";for(size_t ci=0;ci<cfg.size();++ci){uint64_t t=0;for(int m:cfg[ci].m)t+=totals[m];o<<"    \""<<cfg[ci].id<<"\": {\"deckSize\": "<<cfg[ci].n<<", \"total\": "<<t<<", \"counts\": {";for(int h=0;h<HCOUNT;++h){uint64_t v=0;for(int m:cfg[ci].m)v+=by[m][h];if(h)o<<", ";o<<"\""<<HAND_IDS[h]<<"\": "<<v;}o<<"}}"<<(ci+1<cfg.size()?",":"")<<"\n";}o<<"  },\n  \"partitionByJokerMask\": {\n";for(int m=0;m<4;++m){o<<"    \""<<m<<"\": {\"total\": "<<totals[m]<<", \"counts\": {";for(int h=0;h<HCOUNT;++h){if(h)o<<", ";o<<"\""<<HAND_IDS[h]<<"\": "<<by[m][h];}o<<"}}"<<(m<3?",":"")<<"\n";}o<<"  }\n}\n";std::cerr<<"Processed "<<processed<<" combinations\n";}
#endif
