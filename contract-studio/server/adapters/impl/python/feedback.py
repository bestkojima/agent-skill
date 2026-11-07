"""Plain Python backend: JSON on stdin and one JSON object on stdout."""
import json
import sys

# @need-ids: REQ_FEEDBACK_VALIDATE
def validate(raw):
    value = {k: str(raw.get(k) or '').strip() for k in ('title', 'category', 'detail')}
    if len(value['title']) < 3 or len(value['title']) > 60:
        return {'status': 'invalid', 'code': 'INVALID_TITLE', 'message': '标题需为 3–60 字。'}
    if value['category'] not in ('feature', 'bug', 'other'):
        return {'status': 'invalid', 'code': 'INVALID_CATEGORY', 'message': '请选择合法分类。'}
    if len(value['detail']) > 500:
        return {'status': 'invalid', 'code': 'INVALID_DETAIL', 'message': '内容不能超过 500 字。'}
    return {'status': 'valid', 'input': value}

if __name__ == '__main__':
    result = validate(json.load(sys.stdin))
    print(json.dumps(result, ensure_ascii=False))
