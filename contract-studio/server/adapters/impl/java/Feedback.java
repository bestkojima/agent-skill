// Stdlib-only demonstration for the flat FeedbackForm payload; use Jackson/Gson for nested JSON.
import java.io.*;
import java.nio.charset.StandardCharsets;
public class Feedback {
 static String field(String json,String key) {
  int p=json.indexOf("\""+key+"\"");if(p<0)return "";
  p=json.indexOf(':',p+key.length()+2);if(p<0)throw new IllegalArgumentException("Missing colon");
  p++;while(p<json.length()&&Character.isWhitespace(json.charAt(p)))p++;
  if(p>=json.length()||json.charAt(p)!='"')throw new IllegalArgumentException("Not a string");
  p++;StringBuilder b=new StringBuilder();
  while(p<json.length()){
   char c=json.charAt(p++);if(c=='"')return b.toString();
   if(c=='\\'){if(p>=json.length())break; c=json.charAt(p++);switch(c){case 'n':b.append('\n');break;case 'r':b.append('\r');break;case 't':b.append('\t');break;case '\\':b.append('\\');break;case '"':b.append('"');break;case '/':b.append('/');break;default:throw new IllegalArgumentException("Unsupported escape");}}
   else b.append(c);
  }
  throw new IllegalArgumentException("Unterminated string");
 }
 static String esc(String s){return s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n").replace("\r","\\r").replace("\t","\\t");}
 static int count(String s){return s.codePointCount(0,s.length());}
 // @need-ids: REQ_FEEDBACK_VALIDATE
 public static void main(String[] args)throws Exception{
  String json=new String(System.in.readAllBytes(),StandardCharsets.UTF_8);
  String title=field(json,"title").trim(),category=field(json,"category").trim(),detail=field(json,"detail").trim();String out;
  if(count(title)<3||count(title)>60)out="{\"status\":\"invalid\",\"code\":\"INVALID_TITLE\",\"message\":\"标题需为 3–60 字。\"}";
  else if(!category.equals("feature")&&!category.equals("bug")&&!category.equals("other"))out="{\"status\":\"invalid\",\"code\":\"INVALID_CATEGORY\",\"message\":\"请选择合法分类。\"}";
  else if(count(detail)>500)out="{\"status\":\"invalid\",\"code\":\"INVALID_DETAIL\",\"message\":\"内容不能超过 500 字。\"}";
  else out="{\"status\":\"valid\",\"input\":{\"title\":\""+esc(title)+"\",\"category\":\""+esc(category)+"\",\"detail\":\""+esc(detail)+"\"}}";
  new java.io.PrintStream(System.out,true,StandardCharsets.UTF_8).println(out);
 }
}
