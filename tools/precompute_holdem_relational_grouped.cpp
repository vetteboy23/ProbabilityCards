#define FAMILY_PRECOMPUTE_NO_MAIN
#include "precompute_holdem_all.cpp"
#include <map>

inline uint64_t chooseSmall(int n,int k){if(k<0||k>n)return 0;uint64_t r=1;for(int i=1;i<=k;++i)r=r*(n-k+i)/i;return r;}
struct Group { uint32_t mask; int rep; int count; int jokerBit; };

int main(int argc,char**argv){
  std::string path=argc>1?argv[1]:"holdem-relational-grouped-counts.json";
  buildSameEdges();
  std::map<uint32_t,Group> gm;
  for(int i=0;i<55;++i){auto m=FAMILY_DECK[i].people;auto it=gm.find(m);if(it==gm.end())gm[m]=Group{m,i,1,FAMILY_DECK[i].jokerBit};else{it->second.count++;it->second.jokerBit|=FAMILY_DECK[i].jokerBit;}}
  std::vector<Group> groups;for(auto&kv:gm)groups.push_back(kv.second);
  std::sort(groups.begin(),groups.end(),[](const Group&a,const Group&b){if(a.count!=b.count)return a.count<b.count;return a.jokerBit>b.jokerBit;});
  std::array<std::array<uint64_t,HCOUNT>,4> by{};std::array<uint64_t,4> totals{};std::array<int,7> selected{};uint64_t leaves=0;
  auto rec = [&](auto&& self,int gi,int used,uint64_t ways,int jm)->void{
    if(used==7){leaves++;totals[jm]+=ways;std::array<uint64_t,HCOUNT> tmp{};evaluateRelational(selected,tmp);for(int h=H_E2;h<H_SAME_SUIT;++h)by[jm][h]+=tmp[h]*ways;return;}
    if(gi>=(int)groups.size())return;
    int capacity=0;for(int x=gi;x<(int)groups.size();++x)capacity+=groups[x].count;if(capacity<7-used)return;
    const auto&g=groups[gi];int mt=std::min(g.count,7-used);
    for(int take=0;take<=mt;++take){for(int z=0;z<take;++z)selected[used+z]=g.rep;self(self,gi+1,used+take,ways*chooseSmall(g.count,take),take?jm|g.jokerBit:jm);}
  };
  rec(rec,0,0,1,0);
  struct Cfg{const char*id;std::vector<int>m;int n;};std::vector<Cfg> cfg={{"none",{0},53},{"kick_only",{0,1},54},{"pipe_only",{0,2},54},{"both",{0,1,2,3},55}};
  std::ofstream o(path);o<<"{\n  \"generatedBy\": \"tools/precompute_holdem_relational_grouped.cpp\",\n  \"groupedStateCount\": "<<leaves<<",\n  \"decks\": {\n";
  for(size_t ci=0;ci<cfg.size();++ci){uint64_t t=0;for(int m:cfg[ci].m)t+=totals[m];o<<"    \""<<cfg[ci].id<<"\": {\"deckSize\": "<<cfg[ci].n<<", \"total\": "<<t<<", \"counts\": {";bool first=true;for(int h=H_E2;h<H_SAME_SUIT;++h){if(!first)o<<", ";first=false;uint64_t v=0;for(int m:cfg[ci].m)v+=by[m][h];o<<"\""<<HAND_IDS[h]<<"\": "<<v;}o<<"}}"<<(ci+1<cfg.size()?",":"")<<"\n";}
  o<<"  },\n  \"partitionByJokerMask\": {\n";for(int m=0;m<4;++m){o<<"    \""<<m<<"\": {\"total\": "<<totals[m]<<", \"counts\": {";bool first=true;for(int h=H_E2;h<H_SAME_SUIT;++h){if(!first)o<<", ";first=false;o<<"\""<<HAND_IDS[h]<<"\": "<<by[m][h];}o<<"}}"<<(m<3?",":"")<<"\n";}o<<"  }\n}\n";std::cerr<<"Processed grouped states "<<leaves<<"\n";
}
