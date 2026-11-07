package main
import("encoding/json";"fmt";"os";"strings";"unicode/utf8")
type Form struct {Title string `json:"title"`; Category string `json:"category"`; Detail string `json:"detail"`}
func main(){
 var f Form
 if err:=json.NewDecoder(os.Stdin).Decode(&f);err!=nil{fmt.Fprintln(os.Stderr,err);os.Exit(2)}
 f.Title=strings.TrimSpace(f.Title);f.Category=strings.TrimSpace(f.Category);f.Detail=strings.TrimSpace(f.Detail)
 var out any
 if n:=utf8.RuneCountInString(f.Title);n<3||n>60 {out=map[string]any{"status":"invalid","code":"INVALID_TITLE","message":"标题需为 3–60 字。"}} else if f.Category!="feature"&&f.Category!="bug"&&f.Category!="other" {out=map[string]any{"status":"invalid","code":"INVALID_CATEGORY","message":"请选择合法分类。"}} else if utf8.RuneCountInString(f.Detail)>500 {out=map[string]any{"status":"invalid","code":"INVALID_DETAIL","message":"内容不能超过 500 字。"}} else {out=map[string]any{"status":"valid","input":f}}
 if err:=json.NewEncoder(os.Stdout).Encode(out);err!=nil{os.Exit(2)}
}
