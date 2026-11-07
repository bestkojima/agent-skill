use serde_json::{json, Value};
use std::io::{self, Read};
// @need-ids: REQ_FEEDBACK_VALIDATE
fn main() -> Result<(), Box<dyn std::error::Error>> {
 let mut body=String::new();io::stdin().read_to_string(&mut body)?;
 let v:Value=serde_json::from_str(&body)?;
 let s=|key:&str| v.get(key).and_then(Value::as_str).unwrap_or("").trim().to_string();
 let title=s("title");let category=s("category");let detail=s("detail");
 let result=if title.chars().count()<3||title.chars().count()>60 {json!({"status":"invalid","code":"INVALID_TITLE","message":"标题需为 3–60 字。"})}
 else if category!="feature"&&category!="bug"&&category!="other" {json!({"status":"invalid","code":"INVALID_CATEGORY","message":"请选择合法分类。"})}
 else if detail.chars().count()>500 {json!({"status":"invalid","code":"INVALID_DETAIL","message":"内容不能超过 500 字。"})}
 else {json!({"status":"valid","input":{"title":title,"category":category,"detail":detail}})};
 println!("{}",result);Ok(())
}
