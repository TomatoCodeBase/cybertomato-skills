---
name: toutiao-auto
description: 头条号自动化（微头条+文章）。支持选题分析、活动参与、话题添加、自动发布。依赖web-access的CDP能力。触发词：发头条、头条发布、头条任务、toutiao、头条活动、头条投稿、头条自动。
when_to_use: 用户要求在今日头条发布内容（微头条或文章）、参与创作活动、查看头条任务列表时使用。
---

# 头条号发布技能

通过CDP（chrome-remote-interface）操作头条号后台，完成内容发布和活动参与。

## 前置条件

- web-access CDP可用（端口3456）
- Chrome已登录头条号（mp.toutiao.com）

## 关键经验（踩坑记录）

1. **curl中文编码问题（PowerShell和MINGW64均受影响，2026-04-13验证）**：`curl -d '中文'` 在 PowerShell 和 MINGW64/Git Bash 下都会损坏 UTF-8 编码导致乱码。`--data-binary` 同样不行。**唯一可靠方式**：将 JS 内容写入 `.js` 文件（UTF-8），用 `curl -d @/tmp/xxx.js` 从文件读取传递
2. **ProseMirror编辑器**：微头条编辑器是`[contenteditable=true]`的ProseMirror，用`innerHTML`赋值+`input`事件触发
3. **话题添加**：通过工具栏「话题」按钮→输入框`input[placeholder=\u641c\u7d22\u8bdd\u9898]`→用nativeInputValueSetter设置值→等待下拉→点击`.forum-list-item`
4. **活动参与方式**：头条活动（如每日幸运签、春日生活打卡季）**通过发微头条带话题参与**，不需要进入活动详情页。发布微头条时添加对应话题标签即视为打卡/参与
5. **首页活动卡片无链接**：首页推荐的活动卡片（`.home-creative-activity-list-card`）是纯展示HTML，没有`<a href>`、没有`onclick`、没有`data-url`。JS `click()`、`MouseEvent dispatch`、`clickAt`均无法触发跳转（SPA事件未绑定在DOM层）。**正确做法**：从卡片标题提取活动名→在发布页通过话题搜索功能添加对应话题→发布微头条
6. **活动发现**：`创作活动`页面（task-list）可能显示0个活动，但实际可用活动在**头条号首页**的「为你推荐以下创作活动」卡片区域。活动列表只展示部分活动，推荐卡片展示更多
7. **任务列表筛选**：筛选栏用`.filter-item span`文本匹配点击
8. **编辑器残留草稿**：在同一tab内导航回发布页时，编辑器可能残留上一次的内容。重新写入新内容前需先确认或覆盖（直接innerHTML赋值会覆盖）
9. **发布按钮必须用CDP真实点击**：`button.publish-content` 的 React 合成事件在 JS `el.click()` 下可能只触发视觉反馈不执行发布，必须用 `/clickAt`（CDP `Input.dispatchMouseEvent`）代替 `/click`（2026-04-10）
10. **话题标签可能重复**：点击 `.forum-list-item` 后可能生成重复的 `.tteditor-forum` 元素。添加后需检查 `document.querySelectorAll('.tteditor-forum')` 数量，超过1个则 `.remove()` 多余项（保留第一个）。重复标签不影响发布但影响观感（2026-04-13验证）
11. **话题按钮点击方式**：`button.syl-toolbar-button`（文本为"话题"的按钮）行为不稳定。JS `.click()` 在编辑器已聚焦时**有时能成功**弹出搜索面板（2026-04-17验证成功），但也有时只触发视觉反馈不弹出面板（2026-04-14遇到）。**推荐流程**：①先 `/clickAt [contenteditable=true]` 聚焦编辑器 → ②JS `.click()` 点击话题按钮 → ③检查 `input.byte-input` 是否出现，如未出现则用 `/clickAt [data-testid="topic-btn"]`（先通过 `/eval` 设置 `data-testid`）重试
12. **话题搜索框选择器**：`input[placeholder="搜索话题"]` 在 curl `-d` 传参时引号转义容易出错。**可靠替代**：`input.byte-input`（字节跳动组件库class，固定存在），用 `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set` 设值后触发 input+change 事件（2026-04-14验证）
13. **话题按钮点击前需先聚焦编辑器**：新打开发布页后，直接点击话题按钮可能无法弹出搜索面板。需先点击编辑器区域获取焦点，再点击话题按钮。顺序：写内容 → 点击编辑器聚焦 → 点击话题按钮 → 输入搜索 → 选择话题（2026-04-14验证）

## 内容策略

### 内容定位
- **领域**：AI、科技、独立开发、效率工具、OpenClaw等科技向内容
- **禁止**：涉及小石榴/家庭私人生活、纯生活流水账
- **人设**：AI领域的独立开发者，关注技术趋势和实用工具

### 内容来源（优先级）
1. `D:\cybertomato\03-内容工厂\日报\` — 每日AI热点日报，从中提炼一个点展开
2. 知乎打卡想法 — 可复用当天知乎想法的核心观点，适配头条风格
3. 公众号文章精华 — 可提取已发布文章的核心观点做微头条版
4. **头条搜索热点**（兜底） — 当本地文件不可用时（云沙箱/不同机器/D盘未挂载），通过CDP在 `toutiao.com/search/?keyword=AI最新消息` 搜索当日AI热点，从搜索结果中选取热榜话题展开（2026-04-12）

### 选题原则
- **一个微头条讲透一个点**，不堆砌信息
- 优先选趣味性强、容易引发讨论的角度
- 避免地缘政治等敏感话题
- 万维钢文风：口语化短句、设问自答、直接给结论

### 内容生成流程
1. 尝试读取最新AI热点日报（`D:\cybertomato\03-内容工厂\日报\YYYY-MM-DD-AI热点日报.md`）；若本地文件不可用（D盘未挂载等），通过CDP在 `toutiao.com/search/?keyword=AI最新消息` 搜索当日热榜作为内容来源
2. 从中选1-2个最有话题性的点
3. 用自己的话重新组织（不照搬原文）
4. 带打卡话题标签（如 #4月每日幸运签#）
5. 发布

## 步骤

### 1. 发现活动（可选）

**方式A：首页推荐卡片**（推荐）
```
navigate → https://mp.toutiao.com/profile_v4/index
/eval → document.querySelectorAll('.home-creative-activity-list-card') 提取卡片标题和奖金信息
```
从卡片标题提取活动名，后续在发布页通过话题功能添加。

**方式B：创作活动列表**（可能为空）
```
navigate → https://mp.toutiao.com/profile_v4/activity/task-list
```
注意：此列表经常显示0个活动，实际活动在首页推荐区域。

**方式C：toutiao.com搜索活动名**（了解活动规则）
```
new?url=https://www.toutiao.com/search/?keyword={活动名}
```
查看其他用户的参与格式（发微头条+带话题），确认参与方式。

**Success criteria**: 输出活动名称和对应话题标签。

### 2. 分析任务活动详情（可选）

```
GET /eval?target={id} → 点击筛选 → 提取活动卡片信息
```

提取字段：活动名、奖金总额、参与人数、参与状态（`.card-title.end`标记已结束）

**人均奖金** = 奖金总额 ÷ 参与人数，优先选择人均高+参与少的活动。

**Success criteria**: 输出活动列表含奖金和参与人数。

### 2. 打开发布页

微头条：`https://mp.toutiao.com/profile_v4/weitoutiao/publish`
文章：`https://mp.toutiao.com/profile_v4/graphic/publish`

```
GET /new?url={发布页URL}
```

**Success criteria**: 页面加载完成，编辑器可见。

### 3. 填写内容

用Unicode escape写入ProseMirror编辑器：

```javascript
// 1. 写入JS文件避免编码问题
// 2. 用nativeInputValueSetter或innerHTML赋值
// 3. 触发input事件
var editor = document.querySelector('[contenteditable=true]');
editor.innerHTML = '<p>\u5185\u5bb9</p>';
editor.dispatchEvent(new Event('input', {bubbles:true}));
```

**Success criteria**: 截图确认内容正确显示。

### 4. 添加话题

```javascript
// 点击工具栏话题按钮
document.querySelectorAll('.syl-toolbar-button') 
  → 找textContent.includes('\u8bdd\u9898')的button → click()
// 等待输入框出现
input = document.querySelector('input[placeholder=\u641c\u7d22\u8bdd\u9898]')
// 用nativeInputValueSetter设置搜索词
var setter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype, 'value').set;
setter.call(input, '\u8bdd\u9898\u540d');
input.dispatchEvent(new Event('input',{bubbles:true}));
input.dispatchEvent(new Event('change',{bubbles:true}));
// 等待下拉结果，点击 .forum-list-item
```

可重复添加多个话题。正文中的`#话题#`文字会与话题标签重复，需删除。

**Success criteria**: 话题标签出现在编辑器上方/下方。

### 5. 截图确认

发布前截图确认内容正确（话题标签、正文、格式）。

```
GET /screenshot?target={id}&file=/tmp/shot.png
```

### 6. 发布

**必须使用CDP真实点击**（`/clickAt`），不能用JS `.click()`（`/click`）——头条React SPA的发布按钮onClick绑定在合成事件上，JS点击可能只触发视觉反馈（按钮变色）但不执行实际发布逻辑。

```
POST /clickAt?target={id} → 选择器: button.publish-content
```

发布成功后页面会跳转到列表页。

**Success criteria**: 页面URL变为`mp.toutiao.com/profile_v4/weitoutiao`

**Human checkpoint**: 发布是不可逆操作，首次使用建议截图确认后再发布。

## 常用URL

- 创作后台首页: `https://mp.toutiao.com/profile_v4/index`
- 任务列表: `https://mp.toutiao.com/profile_v4/activity/task-list`
- 微头条发布: `https://mp.toutiao.com/profile_v4/weitoutiao/publish`
- 文章发布: `https://mp.toutiao.com/profile_v4/graphic/publish`
- 草稿箱: `https://mp.toutiao.com/profile_v4/manage/draft-list`
