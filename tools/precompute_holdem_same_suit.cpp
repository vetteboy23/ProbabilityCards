#define FAMILY_PRECOMPUTE_NO_MAIN
#include "precompute_holdem_all.cpp"
#include <queue>

inline uint64_t chooseN(int n,int k){if(k<0||k>n)return 0;uint64_t r=1;for(int i=1;i<=k;++i)r=r*(n-k+i)/i;return r;}
std::array<uint64_t,8> independentPolynomial(const std::vector<int>& vertices){
  int n=vertices.size();std::array<uint64_t,8> p{};uint64_t limit=1ull<<n;
  for(uint64_t s=0;s<limit;++s){int k=__builtin_popcountll(s);if(k>7)continue;bool ok=true;for(int i=0;i<n&&ok;++i)if(s&(1ull<<i))for(int j=i+1;j<n;++j)if((s&(1ull<<j))&&SAME_EDGE[vertices[i]][vertices[j]]){ok=false;break;}if(ok)p[k]++;}
  return p;
}
uint64_t countQualifying(const std::vector<int>& vertices){
  int n=vertices.size();std::vector<int> seen(55);std::array<uint64_t,8> total{};total[0]=1;
  for(int root:vertices)if(!seen[root]){std::vector<int> comp;std::queue<int>q;q.push(root);seen[root]=1;while(!q.empty()){int v=q.front();q.pop();comp.push_back(v);for(int u:vertices)if(!seen[u]&&SAME_EDGE[v][u]){seen[u]=1;q.push(u);}}
    auto poly=independentPolynomial(comp);std::array<uint64_t,8> next{};for(int a=0;a<=7;++a)for(int b=0;b+a<=7;++b)next[a+b]+=total[a]*poly[b];total=next;
  }
  return chooseN(n,7)-total[7];
}
int main(int argc,char**argv){std::string path=argc>1?argv[1]:"holdem-same-suit-counts.json";buildSameEdges();struct C{const char*id;std::vector<int>v;};std::vector<C> cs;std::vector<int>base;for(int i=0;i<53;++i)base.push_back(i);cs.push_back({"none",base});auto k=base;k.push_back(C_JOKER_KICK);cs.push_back({"kick_only",k});auto p=base;p.push_back(C_JOKER_MATERNAL);cs.push_back({"pipe_only",p});auto b=base;b.push_back(C_JOKER_KICK);b.push_back(C_JOKER_MATERNAL);cs.push_back({"both",b});std::ofstream o(path);o<<"{\n  \"generatedBy\": \"tools/precompute_holdem_same_suit.cpp\",\n  \"decks\": {\n";for(size_t i=0;i<cs.size();++i){auto count=countQualifying(cs[i].v);o<<"    \""<<cs[i].id<<"\": {\"deckSize\": "<<cs[i].v.size()<<", \"total\": "<<chooseN(cs[i].v.size(),7)<<", \"count\": "<<count<<"}"<<(i+1<cs.size()?",":"")<<"\n";}o<<"  }\n}\n";}
