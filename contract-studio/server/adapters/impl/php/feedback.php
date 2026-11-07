<?php
// PHP backend: stdin/stdout JSON, no framework or HTTP server required.
$input = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$form = [];
foreach (['title','category','detail'] as $key) $form[$key] = trim((string)($input[$key] ?? ''));
$length = function($s) { return preg_match_all('/./us', $s); };
if ($length($form['title']) < 3 || $length($form['title']) > 60) $out=['status'=>'invalid','code'=>'INVALID_TITLE','message'=>'标题需为 3–60 字。'];
elseif (!in_array($form['category'], ['feature','bug','other'], true)) $out=['status'=>'invalid','code'=>'INVALID_CATEGORY','message'=>'请选择合法分类。'];
elseif ($length($form['detail']) > 500) $out=['status'=>'invalid','code'=>'INVALID_DETAIL','message'=>'内容不能超过 500 字。'];
else $out=['status'=>'valid','input'=>$form];
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n";
