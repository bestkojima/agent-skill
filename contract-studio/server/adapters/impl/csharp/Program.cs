using System.Text.Json;
using System.Text.Json.Serialization;
record Form(string title, string category, string detail);
var text=Console.In.ReadToEnd();
using var json=JsonDocument.Parse(text);
var root=json.RootElement;
string Get(string key)=>root.TryGetProperty(key,out var item)?(item.GetString()??"").Trim():"";
var form=new Form(Get("title"),Get("category"),Get("detail"));
object result=form.title.EnumerateRunes().Count() is <3 or >60
 ? new {status="invalid",code="INVALID_TITLE",message="标题需为 3–60 字。"}
 : form.category is not ("feature" or "bug" or "other")
 ? new {status="invalid",code="INVALID_CATEGORY",message="请选择合法分类。"}
 : form.detail.EnumerateRunes().Count()>500
 ? new {status="invalid",code="INVALID_DETAIL",message="内容不能超过 500 字。"}
 : new {status="valid",input=form};
Console.WriteLine(JsonSerializer.Serialize(result));
