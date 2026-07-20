#define FAMILY_PRECOMPUTE_NO_MAIN
#include "precompute_holdem_all.cpp"
#include <iostream>
int main(){buildSameEdges();std::array<int,7> ix;while(std::cin>>ix[0]>>ix[1]>>ix[2]>>ix[3]>>ix[4]>>ix[5]>>ix[6]){std::array<uint64_t,HCOUNT> out{};int pc=pokerCategory(ix);evaluateRelational(ix,out);std::cout<<pc;for(int h=H_E2;h<HCOUNT;++h)std::cout<<' '<<(out[h]?1:0);std::cout<<'\n';}}
