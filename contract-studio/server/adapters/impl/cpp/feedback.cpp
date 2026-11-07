// Minimal stdlib C++ adapter for the flat FeedbackForm example.
// For arbitrary nested JSON use a vetted JSON library (e.g. nlohmann/json).
#include <iostream>
#include <iterator>
#include <string>
#include <stdexcept>
#include <cctype>

std::string field(const std::string& json,const std::string& key) {
  auto pos=json.find('"'+key+'"');
  if(pos==std::string::npos) return "";
  pos=json.find(':',pos+key.size()+2);
  if(pos==std::string::npos) throw std::runtime_error("Invalid JSON field");
  ++pos;while(pos<json.size() && std::isspace(static_cast<unsigned char>(json[pos])))++pos;
  if(pos>=json.size()||json[pos]!='"') throw std::runtime_error("Expected string field");
  ++pos; std::string out;
  for(;pos<json.size();++pos) {
    char ch=json[pos];if(ch=='"') return out;
    if(ch=='\\') { if(++pos>=json.size()) break; char c=json[pos];
      switch(c){case 'n':out+='\n';break;case 't':out+='\t';break;case 'r':out+='\r';break;case '"':out+='"';break;case '\\':out+='\\';break;case '/':out+='/';break;
      default:throw std::runtime_error("Unsupported JSON escape in demo");}
    } else out+=ch;
  }
  throw std::runtime_error("Unterminated JSON string");
}
std::string trim(const std::string& s){const auto p=s.find_first_not_of(" \n\r\t");if(p==std::string::npos)return "";auto q=s.find_last_not_of(" \n\r\t");return s.substr(p,q-p+1);}
int countCodePoints(const std::string& s){int n=0;for(unsigned char c:s)if((c&0xc0)!=0x80)++n;return n;}
std::string esc(const std::string& s){std::string r;for(char c:s){switch(c){case '"':r+="\\\"";break;case '\\':r+="\\\\";break;case '\n':r+="\\n";break;case '\r':r+="\\r";break;case '\t':r+="\\t";break;default:r+=c;}}return r;}
int main(){try{
 const std::string json((std::istreambuf_iterator<char>(std::cin)),{});
 const auto title=trim(field(json,"title")), category=trim(field(json,"category")), detail=trim(field(json,"detail"));
 if(countCodePoints(title)<3||countCodePoints(title)>60)std::cout<<R"({"status":"invalid","code":"INVALID_TITLE","message":"标题需为 3–60 字。"})";
 else if(category!="feature"&&category!="bug"&&category!="other")std::cout<<R"({"status":"invalid","code":"INVALID_CATEGORY","message":"请选择合法分类。"})";
 else if(countCodePoints(detail)>500)std::cout<<R"({"status":"invalid","code":"INVALID_DETAIL","message":"内容不能超过 500 字。"})";
 else std::cout<<"{\"status\":\"valid\",\"input\":{\"title\":\""<<esc(title)<<"\",\"category\":\""<<esc(category)<<"\",\"detail\":\""<<esc(detail)<<"\"}}";
 std::cout<<'\n';return 0;
}catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 2;}}
