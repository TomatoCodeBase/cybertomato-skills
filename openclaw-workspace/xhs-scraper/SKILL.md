---
name: xhs-scraper
description: "小红书搜索结果批量爬取。通过 browser evaluate 提取帖子标题、作者、时间、点赞数、链接。触发词：小红书热搜、爬小红书、小红书搜索、xhs搜索。使用场景：用户想从小红书搜索某个关键词的热帖、获取帖子列表、导出小红书数据。"
---

# 小红书搜索爬取

## 前提

- 用户 Chrome 已登录小红书（profile="user"）
- browser 工具可用

## 工作流

### 1. 构建搜索 URL

```
https://www.xiaohongshu.com/search_result?keyword={关键词}&type=1&sort={排序}
```

排序选项：`general`（综合）| `time_descending`（最新）| `hot`（热门）

### 2. 导航到搜索页

```json
browser action=navigate profile="user" url="{搜索URL}"
```

### 3. 提取帖子数据（核心）

**用 browser act evaluate，必须用 `(function(){})()` 格式，禁止箭头函数。**

```javascript
browser act kind=evaluate profile="user" fn="
(function(){
  var r=[];
  var s=new Set();
  document.querySelectorAll('section.note-item').forEach(function(sec){
    var a=sec.querySelector('a[href*=\"explore\"]');
    if(!a) return;
    var h=a.getAttribute('href')||'';
    var m=h.match(/\\/explore\\/([a-f0-9]+)/);
    if(!m||s.has(m[1])) return;
    s.add(m[1]);
    r.push(m[1]+'|||'+sec.innerText.substring(0,200))
  });
  return r.join('\\n')
})()"
```

### 4. 解析数据

每行格式：`noteId|||标题\n作者\n时间\n点赞数`

解析规则：
- `|||` 前是 noteId
- `|||` 后按 `\n` 分割：[0]标题 [1]作者 [2]时间 [3]点赞数
- 链接 = `https://www.xiaohongshu.com/explore/` + noteId

### 5. 输出

默认保存为 CSV 到 `D:\OpenClaw\workspace\data\xhs-{关键词}-{日期}.csv`

CSV 列：标题, 作者, 时间, 点赞数, 链接, 备注

### 6. 翻页（如需超过22条）

当前搜索页默认约22条。如需更多：
1. 用 browser act kind=press 发送 `End` 键滚动加载
2. 等待2秒
3. 重新执行 evaluate 提取（自动去重）

## ⚠️ 注意事项

| 项目 | 规则 |
|------|------|
| evaluate 函数格式 | 只用 `(function(){})()` ，箭头函数报 "fn is not a function" |
| profile | 必须用 `profile="user"`（需要登录态） |
| snapshot | `selector` 参数不支持 `profile="user"`，必须全页 snapshot |
| DOM 选择器 | 帖子卡片 `section.note-item`，链接 `a[href*="/explore/"]` |
| 去重 | 用 Set 按 noteId 去重 |
| 混入内容 | 搜索结果可能包含不相关帖子，在备注列标记 |

## 故障排查

| 问题 | 原因 | 解决 |
|------|------|------|
| "fn is not a function" | 用了箭头函数 | 改用 `(function(){})()` |
| 返回空数组 | 页面未加载完 | 加 `browser act kind=wait` 等待 |
| 结果不相关 | 关键词太宽泛 | 加城市名限定，如"上海 AI活动" |
| 帖子少于预期 | 需要滚动加载 | 发送 End 键触发懒加载 |
