---
name: toutiao-auto
description: 头条号自动化发布（微头条+文章）。通过CDP操控Chrome完成内容填写、话题添加、发布操作。
---

# 头条号发布技能

通过CDP（Chrome DevTools Protocol）操作头条号后台，完成微头条和文章的自动发布。

## 触发条件

- 需要在今日头条发布内容（微头条或文章）
- 参与头条创作活动/打卡
- 查看头条任务列表

## 前置条件

- Chrome已开启远程调试端口（`--remote-debugging-port=9222`）
- Chrome已登录头条号（mp.toutiao.com）
- CDP代理运行中（通过HTTP API操控Chrome）

## 操作步骤

### 1. 发现活动（可选）

**方式A：首页推荐卡片**（推荐，活动最全）
- 导航到 `https://mp.toutiao.com/profile_v4/index`
- 提取 `.home-creative-activity-list-card` 卡片标题和奖金信息
- 从标题提取活动名，后续通过话题功能添加

**方式B：创作活动列表**（可能为空）
- 导航到 `https://mp.toutiao.com/profile_v4/activity/task-list`

> 注意：活动列表经常显示0个活动，实际可用活动在首页推荐区域。

### 2. 打开发布页

| 类型 | URL |
|------|-----|
| 微头条 | `https://mp.toutiao.com/profile_v4/weitoutiao/publish` |
| 文章 | `https://mp.toutiao.com/profile_v4/graphic/publish` |

### 3. 填写内容

**微头条正文**（ProseMirror编辑器）：
```js
var editor = document.querySelector('[contenteditable=true]');
editor.innerHTML = '<p>正文内容</p>';
editor.dispatchEvent(new Event('input', {bubbles: true}));
```

**文章标题**（textarea元素）：
```js
var textarea = document.querySelector('.editor-title textarea');
textarea.value = '文章标题';
textarea.dispatchEvent(new Event('input', {bubbles: true}));
```

**文章正文**（ProseMirror编辑器）：
```js
var editor = document.querySelector('.ProseMirror');
editor.innerHTML = '<p>正文内容</p>';
editor.dispatchEvent(new Event('input', {bubbles: true}));
```

> 注意：文章标题是`<textarea>`元素，不是contenteditable div。

### 4. 添加话题（微头条）

```js
// 1. 点击工具栏话题按钮
document.querySelectorAll('.syl-toolbar-button')
  .find(function(b) { return b.textContent.includes('话题'); })
  .click();
// 2. 等待搜索框出现
var input = document.querySelector('input[placeholder="搜索话题"]');
// 3. 用nativeInputValueSetter设置值
var setter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype, 'value').set;
setter.call(input, '话题名');
input.dispatchEvent(new Event('input', {bubbles: true}));
// 4. 等待下拉出现，点击第一个结果
document.querySelector('.forum-list-item').click();
```

可重复添加多个话题。

> **文章不支持工具栏话题**：文章编辑器工具栏没有话题按钮，需用`#话题#`格式写在正文末尾。

### 5. 发布

**微头条**：
- 点击 `button.publish-content`
- 发布成功后页面跳转到列表页

**文章**：
1. 关闭广告：点击 `label.article-ad-radio`
2. 点击 `button.byte-btn-primary`（「预览并发布」）
3. 弹出确认弹窗后，点击「确定发布」

> ⚠️ 文章确认弹窗的「确定发布」按钮不在DOM中，无法通过CDP自动点击（见下方注意事项）。需要手动操作这一步。

## 常用URL

| 用途 | URL |
|------|-----|
| 创作后台首页 | `https://mp.toutiao.com/profile_v4/index` |
| 任务列表 | `https://mp.toutiao.com/profile_v4/activity/task-list` |
| 微头条发布 | `https://mp.toutiao.com/profile_v4/weitoutiao/publish` |
| 文章发布 | `https://mp.toutiao.com/profile_v4/graphic/publish` |
| 草稿箱 | `https://mp.toutiao.com/profile_v4/manage/draft-list` |

## 注意事项

### 已知限制

1. **文章发布弹窗**：点击「预览并发布」后弹出的确认弹窗，其「确定发布」按钮不在DOM中（不在textContent、innerHTML、shadow DOM、iframe中）。MutationObserver确认弹窗出现时DOM零变化。弹窗约500ms后自动关闭。**需要用户手动点击**。
2. **中文编码**：通过shell传递中文JS代码时容易乱码，建议将JS写到文件中再读取执行。
3. **编辑器残留草稿**：同一tab内重新导航到发布页时，编辑器可能残留上一次内容。直接innerHTML赋值可覆盖。
4. **活动卡片无链接**：首页活动卡片是纯展示HTML，无`<a href>`、`onclick`、`data-url`，无法通过DOM事件触发跳转。需从卡片标题提取活动名后在发布页通过话题添加。

### 关键CSS选择器

| 元素 | 选择器 |
|------|--------|
| 微头条编辑器 | `[contenteditable=true]` |
| 文章标题 | `.editor-title textarea` |
| 文章正文编辑器 | `.ProseMirror` |
| 微头条发布按钮 | `button.publish-content` |
| 文章发布按钮 | `button.byte-btn-primary` |
| 广告设置 | `label.article-ad-radio` |
| 话题搜索框 | `input[placeholder="搜索话题"]` |
| 话题下拉结果 | `.forum-list-item` |
| 话题工具栏按钮 | `.syl-toolbar-button`（textContent包含"话题"） |
| 活动推荐卡片 | `.home-creative-activity-list-card` |
