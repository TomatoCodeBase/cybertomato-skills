# 小红书 DOM 选择器速查

> 最后验证：2026-03-27

## 搜索页结构

```
https://www.xiaohongshu.com/search_result?keyword=XXX&type=1&sort=general
```

## 关键选择器

| 元素 | 选择器 | 说明 |
|------|--------|------|
| 帖子卡片 | `section.note-item` | 每个搜索结果 |
| 帖子链接 | `a[href*="/explore/"]` | href 含 noteId |
| 帖子标题 | 卡片 innerText 第1行 | 无专用 class |
| 作者 | 卡片 innerText 第2行 | 无专用 class |
| 时间 | 卡片 innerText 第3行 | 如"1天前"、"03-14" |
| 点赞数 | 卡片 innerText 第4行 | 纯数字 |

## 链接格式

```
https://www.xiaohongshu.com/explore/{noteId}
```

noteId 为24位十六进制字符串，如 `69b4fddb000000001d01f4b7`。

## 提取脚本（已验证）

```javascript
(function(){
  var r=[];
  var s=new Set();
  document.querySelectorAll('section.note-item').forEach(function(sec){
    var a=sec.querySelector('a[href*="explore"]');
    if(!a) return;
    var h=a.getAttribute('href')||'';
    var m=h.match(/\/explore\/([a-f0-9]+)/);
    if(!m||s.has(m[1])) return;
    s.add(m[1]);
    r.push(m[1]+'|||'+sec.innerText.substring(0,200))
  });
  return r.join('\n')
})()
```

## 变体：提取更多字段

```javascript
(function(){
  var r=[];
  var s=new Set();
  document.querySelectorAll('section.note-item').forEach(function(sec){
    var a=sec.querySelector('a[href*="explore"]');
    if(!a) return;
    var h=a.getAttribute('href')||'';
    var m=h.match(/\/explore\/([a-f0-9]+)/);
    if(!m||s.has(m[1])) return;
    s.add(m[1]);
    var lines=sec.innerText.split('\n').filter(function(l){return l.trim()});
    r.push(JSON.stringify({
      id:m[1],
      title:lines[0]||'',
      author:lines[1]||'',
      time:lines[2]||'',
      likes:lines[3]||'0'
    }))
  });
  return '['+r.join(',')+']'
})()
```

## 注意

- DOM 结构可能随小红书更新变化，如果选择器失效需重新 snapshot 确认
- `innerText` 拆分行数可能因帖子是否有副标题而变化
