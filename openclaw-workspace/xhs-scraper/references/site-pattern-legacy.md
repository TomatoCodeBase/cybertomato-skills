# 小红书 (xiaohongshu.com) 站点经验

> 发现日期：2026-03-27

## 平台特征

- **动态渲染**：必须用 browser 工具，web_fetch 无法获取内容
- **登录态**：需要 `profile="user"` 使用已登录的 Chrome
- **反爬**：evaluate 中不能使用箭头函数，只能用 `function(){}`
- **搜索 URL**：`https://www.xiaohongshu.com/search_result?keyword=XXX&type=1&sort=general`

## DOM 结构

- 帖子卡片：`section.note-item`
- 帖子链接：`a[href*="/explore/"]`
- 链接格式：`https://www.xiaohongshu.com/explore/{noteId}`
- 帖子内容：`section.note-item` 的 `innerText` 包含标题、作者、时间、点赞数

## 数据提取

**有效的 evaluate 写法**：
```javascript
// ✅ 正确 - 用 function 表达式
(function(){ return document.querySelectorAll('a').length })()

// ❌ 错误 - 箭头函数会报 "fn is not a function"
(() => { return 1 })()
```

**批量提取帖子数据**：
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

## 注意事项

- 帖子标题和点赞数在 `innerText` 中混在一起，需要用 `|||` 分隔
- 搜索结果默认显示约22条帖子
- 点击帖子后不会开新标签页，而是导航到帖子详情页（URL 变为 `/explore/{noteId}`）
- `selector` 参数不支持 `profile="user"`，必须全页 snapshot

## 已知问题

- 搜索 "AI活动" 结果中混入了非 AI 活动相关内容（如养生、减肥）
- 部分帖子标题在搜索列表中被截断
