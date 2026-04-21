---
name: zhihu-auto
description: 知乎全自动化工具。覆盖内容发布（想法/文章/回答）、创作打卡挑战赛（签到+互动任务）、互动操作（点赞/关注/评论）。通过CDP直连用户Chrome，天然携带登录态。
when_to_use: |
  Use when user mentions: 发知乎、知乎想法、知乎打卡、知乎发布、知乎签到、zhihu、完成知乎任务、知乎挑战赛、知乎互动。
  Also use when user provides a zhihu.com URL and asks to interact with it (comment, like, follow, answer).
argument-hint: "[内容文本 | 任务URL]"
---

# 知乎全自动化 (zhihu-publisher)

通过 CDP Proxy 操作用户已登录的 Chrome，完成知乎发布、打卡、互动等操作。

## 前置条件

- **Chrome CDP** 已启用：地址栏 `chrome://inspect/#remote-debugging`，勾选远程调试
- **CDP Proxy** 运行中：`node "$CLAUDE_SKILL_DIR/scripts/check-deps.mjs"`
- 用户已在 Chrome 中登录知乎

## 前置检查

```bash
node "$CLAUDE_SKILL_DIR/scripts/check-deps.mjs"
```

## 核心操作

### 一、发布想法

**Step 1: 打开编辑器**

知乎想法编辑器没有独立 URL。

**推荐方式**：从创作中心触发（更稳定）：
```
navigate → https://www.zhihu.com/creator
```
然后点击页面中的"发想法"按钮（TreeWalker 文本搜索定位 `button` 含"发想法"文本，CDP `/clickAt` 点击）。

**备选方式**：从首页弹窗触发（可能重定向到搜索页，不稳定）：
```
navigate → https://www.zhihu.com/?writepin
```
页面加载后，用截图确认弹窗是否出现。如果没有弹窗，可能被搜索框遮挡，按 Escape 关闭搜索后再试。

**Step 2: 填入内容（Draft.js 想法编辑器）**

知乎想法编辑器使用 Draft.js，**必须用 ClipboardEvent paste**：

```javascript
const editor = document.querySelector('.public-DraftEditor-content');
editor.focus();
const text = "内容文本";
const dt = new DataTransfer();
dt.setData('text/plain', text);
dt.setData('text/html', text.split('\n').map(l => `<p>${l || '<br>'}</p>`).join(''));
const pe = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt });
editor.dispatchEvent(pe);
editor.innerText.length  // 验证 > 0
```

⚠️ `execCommand` 对想法编辑器**无效**（返回 true 但 Draft.js 不更新内部状态）。

**Step 3: 发布**

```javascript
const btn = [...document.querySelectorAll('button')].find(b => /发布/.test(b.innerText) && !b.disabled);
btn.click();
```

**Step 4: 验证**

```
navigate → https://www.zhihu.com/creator/manage/creation/pin
```

---

### 二、发布评论（Draft.js 评论编辑器）

与想法编辑器不同，**评论区 Draft.js 支持 `execCommand('insertText')`**。

**Step 1: 找到并点击评论按钮**

评论按钮文本格式为「X 条评论」：

```javascript
const btn = [...document.querySelectorAll('button')].find(b => /条评论/.test(b.innerText));
btn.click();
```

**Step 2: 定位评论编辑器**

页面可能同时存在多个 Draft.js 编辑器（想法编辑器 + 评论编辑器），评论编辑器通常是**最后一个**：

```javascript
const editors = [...document.querySelectorAll('.public-DraftEditor-content')];
const editor = editors[editors.length - 1];  // 取最后一个
editor.focus();
```

**Step 3: 填入内容**

```javascript
document.execCommand('selectAll', false, null);
document.execCommand('insertText', false, '你的评论内容，至少10个字');
```

**Step 4: 发布**

```javascript
const btn = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === '发布');
if (!btn.disabled) btn.click();
```

**Success criteria**: `editor.innerText.length > 0` 且发布按钮非 disabled。

---

### 三、点赞

```javascript
// 点赞第一个回答
const btn = [...document.querySelectorAll('button')].find(b => /赞同/.test(b.innerText) && !b.disabled);
if (btn) btn.click();
```

**Success criteria**: 按钮文本从「赞同 N」变为「已赞同 N」。

---

### 四、关注用户

**最佳实践：导航到目标用户的个人主页操作，而非在列表页/打卡页操作。**

原因：列表页和打卡页的关注按钮样式不统一（可能是 div/span 而非 button），且部分页面懒加载导致按钮不可见。个人主页始终有 `button.FollowButton`，稳定性最高。

```javascript
// ✅ 推荐：在个人主页操作（如 /people/lengzhe）
// POST /click?target=xxx  body: button.FollowButton
```

```javascript
// ⚠️ 不可靠：在列表页/打卡页查找关注按钮
// 打卡页关注推荐列表的按钮可能是普通 div/span，不是 FollowButton
// 用 innerText.trim() === '关注' 匹配，需排除"关注问题"和"已关注"
const btns = [...document.querySelectorAll('button')].filter(b => {
  const t = b.innerText.trim();
  return t === '关注' && !b.disabled;
});
```

**Success criteria**: 按钮文本变为「已关注」。

---

### 五、创作打卡挑战赛

URL 格式: `https://www.zhihu.com/parker/campaign/{id}`

⚠️ **Campaign 链接会过期**：用户提供的 campaign URL 可能已结束（页面显示"活动已结束"）。此时需导航到创作中心 `/creator`，从页面底部"去打卡"按钮的 `a[href]` 提取当前有效的 campaign 链接（格式如 `/parker/campaign/2023000440720115522?zh_hide_nav_bar=true`，去掉 `zh_hide_nav_bar` 参数再导航）。

**提取有效 campaign 链接**：
```javascript
var links=[...document.querySelectorAll("a[href]")].filter(a=>a.href.includes("parker")||a.href.includes("campaign")).map(a=>({href:a.href,text:a.innerText.trim().substring(0,50)}));
// 取第一个"去打卡"对应的链接
```

打卡每日任务结构：
- **创作任务** (1/1): 发布1篇回答(100字+) 或 发布1条想法(30字+)
- **互动任务** (3/3 任选3): 关注知友 / 发布问题 / 发布评论 / 送出赞同

**完整操作流程**:

#### Step 1: 报名（每次会话必须）

打卡页是SPA，报名状态存在内存中，**导航离开或刷新后丢失**。每次打卡流程开始必须重新报名。

⚠️ 报名按钮**必须用 CDP `clickAt`（真实鼠标事件）点击**，JS `el.click()` 无效。

```
POST /clickAt?target=xxx  body: .BottomBar-button-w3GcL
```

⚠️ **报名按钮不稳定**：clickAt 返回 `clicked: true` 但按钮文本可能不变，滚动后也可能看不到任务区域（全文仅 200+ 字）。这是 SPA 的不稳定性，不影响实际状态——跳过报名，直接在新 tab 完成任务，最后用创作中心验证即可。

**Success criteria**: 底部按钮文本从「立即报名」变为「已报名」（可能不立即反映，以创作中心最终验证为准）。

#### Step 2: 滚动到任务区域

报名后任务区域在页面下方，**必须用 JS `window.scrollTo` 滚动**，CDP scroll API 不会触发SPA的 IntersectionObserver 渲染。

```javascript
// 分段滚动，每段等2秒让SPA渲染
for (let y = 0; y < sh; y += 1000) {
  window.scrollTo(0, Math.min(y, document.documentElement.scrollHeight));
}
```

**Success criteria**: `innerText` 包含「今日任务」。

#### Step 3: 执行未完成任务

解析当前进度：
- 已完成项显示「已完成」
- 未完成项显示「去XXX」按钮

遍历 DOM 找到「去完成」元素，用 TreeWalker 向上查找父容器判断属于哪个任务类型。

**关键**：点击「去完成」后页面会跳转到新视图（如关注推荐列表），操作完成后需重新导航回打卡页、重新报名、重新滚动。

建议操作顺序：**先完成所有互动任务（在新tab中执行），最后在打卡页执行创作任务**，减少来回切换。

⚠️ **互动任务在新 tab 中操作时，问题 URL 需注意**：CDP `/new?url=` 打开知乎问题链接时可能被重定向到首页（JS 路由型 SPA 的通病）。解决方案：先导航到热榜 `/hot` 获取真实链接，再通过页面内 `a[href]` 提取完整 URL（这些 URL 天然携带平台所需上下文），而非手动构造问题 URL。

#### Step 4: 验证最终进度

⚠️ **不要在打卡页验证**（需反复报名+滚动，不可靠）。

**推荐验证方式**：导航到创作中心，底部直接显示打卡状态：
```
navigate → https://www.zhihu.com/creator
```

页面底部包含：「今日已打卡成功」「本周打卡天数 X 天」。

---

## CDP Proxy API 速查

所有操作通过 HTTP 调用 `localhost:3456`：

| 操作 | 命令 |
|------|------|
| 列出 tab | `GET /targets` |
| 新建 tab | `GET /new?url=URL` |
| 导航 | `GET /navigate?target=ID&url=URL` |
| 截图 | `GET /screenshot?target=ID&file=path.png` |
| 执行 JS | `POST /eval?target=ID`，body = 纯 JS（text/plain） |
| 点击 | `POST /click?target=ID`，body = CSS选择器 |
| 滚动 | `GET /scroll?target=ID&y=N` 或 `&direction=bottom` |
| 关闭 tab | `GET /close?target=ID` |

**注意**：
- `/eval` body 用 `Content-Type: text/plain`，不是 JSON
- 包含中文/引号的 JS **不要用 PowerShell curl.exe -d** 传，用 Node.js 脚本
- 操作完成后用 `/close` 关闭自己创建的 tab

---

## Node.js 调用模板

```javascript
const http = require('http');
function evalJS(target, js) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 3456,
      path: '/eval?target=' + target,
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d).value));
    });
    req.on('error', reject);
    req.end(js);
  });
}
```

⚠️ CDP `/eval` 返回 `{"value": ...}` 格式，需 `.value` 提取实际值。

---

## API 直调方法（比 CDP 点击更可靠）

在 CDP `/eval` 中用 `fetch()` 调用知乎内部 API，天然携带 Cookie 登录态，**远比 CDP 点击 UI 按钮可靠**。适用于关注、评论等操作。

### 关注用户（API 方式）

```javascript
// 替代 CDP 点击，直接调 API 关注
fetch("https://www.zhihu.com/api/v4/members/{url_token}/followers", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" }
}).then(r => r.json()).then(d => d.follower_count)  // 返回新的关注者数
```

**url_token** 从用户主页 URL 提取，如 `/people/tang-yuan-85-84-3` → `tang-yuan-85-84-3`

### 发布评论（API 方式）

```javascript
// 需要先获取 answer_id
// 从 DOM 中提取: document.querySelector(".AnswerItem").getAttribute("name")
// 或从 data-zop JSON 中提取 itemId
const answerId = document.querySelector(".AnswerItem").getAttribute("name");

fetch(`https://www.zhihu.com/api/v4/answers/${answerId}/comments`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content: "评论内容，至少10个字" })
}).then(r => r.json()).then(d => d.id)  // 返回评论ID表示成功
```

**answer_id 提取方式**：`data-zop` 属性是 JSON 字符串，内含 `itemId` 字段。

---

## 已知陷阱

### 编辑器相关
1. **Draft.js 想法编辑器**：`execCommand` 无效，必须用 ClipboardEvent paste
2. **Draft.js 评论编辑器**：`execCommand('insertText')` 有效（与想法编辑器不同！）
3. **多个 Draft.js 编辑器共存**：页面同时存在想法编辑器和评论编辑器时，用索引 `[length-1]` 取最后一个
4. **评论按钮文本**：不是"评论"，而是"X 条评论"格式
5. **发布按钮 disabled**：内容未正确写入时发布按钮是 disabled 的，不要强行点击
6. **搜索弹窗遮挡**：从 `?writepin` 进入时可能触发搜索弹窗，按 Escape 关闭

### 互动相关
7. **关注按钮不在 FollowButton 类中**：打卡页关注推荐列表的"关注"按钮是普通 `div/span`，用 `innerText.trim() === '关注'` 匹配，不要限定 `FollowButton` class
8. **关注按钮排除**：需排除"关注问题"和"已关注"，只取未关注状态

### 打卡挑战赛相关（2026-04-04 实战记录）
9. **报名必须用 clickAt**：报名按钮（`.BottomBar-button-w3GcL`）只响应真实鼠标事件，`el.click()` 和 `dispatchEvent(MouseEvent)` 均无效，必须用 CDP `POST /clickAt`
10. **报名状态不持久**：SPA 内存状态，导航离开、刷新页面、新tab打开均会丢失，每次会话需重新报名
11. **报名可能不反映**：clickAt 返回成功但按钮文本不变、任务区域不渲染（2026-04-08 遇到），此时跳过报名直接完成任务，用创作中心验证。注意：`document.body.innerText` 和 `document.querySelector(".BottomBar-button-w3GcL").innerText` 可能返回不同结果（body 返回初始渲染文本"立即报名"，元素选择器返回真实状态"已报名"），验证报名状态时务必用元素选择器而非 body.innerText（2026-04-13 验证）
12. **CDP scroll 不触发 SPA 渲染**：打卡页任务区域依赖 IntersectionObserver，只有 JS `window.scrollTo` 才能触发渲染，CDP `/scroll` API 无效
13. **任务区域需分段滚动**：一次性 `scrollTo(bottom)` 可能不够，建议分 500-1000px 步进，每步等 2 秒
14. **"去完成"按钮定位**：用 TreeWalker 遍历 `nodeType === 3` 的文本节点找精确匹配，再向上 5 层找父容器判断任务类型
15. **验证用创作中心**：打卡页验证需反复报名+滚动，不可靠。创作中心 `/creator` 底部直接显示「今日已打卡成功」和「本周打卡天数」，是最可靠的验证入口
16. **PowerShell 转义**：包含中文/引号的 JS 用 Node.js 脚本执行，不要用 curl.exe -d
17. **CDP eval 返回格式**：返回 `{"value": ...}` 需 `.value` 提取；navigate/close 返回可能为空，需 try-catch
18. **"立即报名"非 button**：是普通 DIV，`querySelectorAll('button')` 找不到，需用 TreeWalker 或 `querySelector('.BottomBar-button-w3GcL')`
19. **新tab打开问题URL可能重定向**：CDP `/new?url=question/xxx` 可能被知乎SPA路由重定向到首页，应先从热榜或推荐页抓取真实链接
20. **关注操作去个人主页**：列表页/打卡页的关注按钮不可靠（样式不统一、懒加载），个人主页始终有 `button.FollowButton`
21. **Campaign URL 会过期**：用户提供的 campaign 链接可能已结束（显示"活动已结束"），需从创作中心 `/creator` 页面提取当前有效的 campaign 链接。创作中心底部"去打卡"按钮的 `href` 即为有效链接
22. **零宽字符干扰按钮匹配**：知乎按钮文本常含 U+200B（零宽空格）和换行符，如 `"​\n 关注"`。匹配时需 `.replace(/[\u200b\s]/g, "")` 清理后再比较
23. **API 直调优于 CDP 点击**：关注用 `fetch("/api/v4/members/{token}/followers", {method:"POST"})`，评论用 `fetch("/api/v4/answers/{aid}/comments", {method:"POST"})`，比 CDP 模拟点击更可靠（避免零宽字符、懒加载、SPA 状态等问题）
24. **Answer ID 从 data-zop 提取**：回答的 DOM 元素有 `data-zop` 属性（JSON 字符串），其中 `itemId` 即为 answer_id，用于评论 API
25. **赞同按钮需 scrollIntoView**：赞同按钮常在视口外（getBoundingClientRect 返回负 y 值），需先 `scrollIntoView({block:"center"})` 再点击
26. **按钮索引定位法**：知乎按钮 innerText 含零宽字符（U+200B）和换行符，文本匹配不稳定。更可靠方式是 `[...document.querySelectorAll('button')]` 取全部按钮数组，按索引定位目标按钮（先用 `/eval` 列出所有按钮的 index + innerText 确认索引号）
27. **想法发布按钮：所有点击方式（click/clickAt/el.click()）均无效（2026-04-21 XHR拦截器确认）**：当 Draft.js React state 为空（isTrusted:false ClipboardEvent 导致），无论用 JS `el.click()`、CDP `/click`、还是 CDP `/clickAt`，发布按钮都只产生视觉反馈（按钮变色/文字变化），但不发送任何 API 请求。XHR 拦截器证实：零个 pin/draft 请求。根因不是点击方式，而是知乎前端逻辑检查到 Draft.js state 为空后拒绝提交。⚠️ 回答编辑器的"发布回答"按钮（button index 51+）无可靠 CSS 选择器，只能用索引定位——此时需确保 Draft.js 内容正确写入（避免 selectAll+delete 损坏 state），否则任何点击方式也无法提交（2026-04-20 实战）
28. **发布按钮 CSS 选择器用组合类名**：`button.Button--blue` 可能匹配页面上多个蓝色按钮（如导航按钮），点击后返回空文本且实际未触发发布。可靠选择器：`button.Button--blue.Button--secondary`（2026-04-12 实战验证）
29. **发布后编辑器弹窗可能不关闭**：从创作中心发想法，点击发布后按钮经历"发布→发布中→发布"变化，但编辑器弹窗（Draft.js）可能保持打开，hasEditor 仍为 true。这不代表发布失败，需去内容管理页 `/creator/manage/creation/pin` 验证（2026-04-12）
28. **不要对 Draft.js 编辑器 selectAll + delete 后再 paste/insertText**：清空操作会破坏 Draft.js EditorState，后续无论 ClipboardEvent paste 还是 execCommand insertText 都会出问题。想法编辑器：paste 后无法生效；回答编辑器：insertText 后 DOM 显示正确内容（331字）但提交失败（按钮"发布中..."→恢复原状）。**回答编辑器 insertText 失败（截断）后，不要尝试清除重写，应直接放弃该次写入**，换问题页重新打开编辑器，或切换到发想法（2026-04-20 回答编辑器实战）
29. **Hermes 终端执行 Node.js 脚本报 `stdin is not a tty`**：终端环境的 BASH_ENV 配置导致 `node script.js` 失败。解决方式：`BASH_ENV=\"\" /c/Program\\ Files/nodejs/node.exe script.js`，或在非 TTY 环境直接用 curl 逐条调用 CDP API 而非 Node.js 脚本
30. **⚠️ 创作中心"发想法"按钮打开的是文章编辑器，不是想法编辑器**：创作中心 `/creator` 首页有个"发想法"按钮（css-1hj0j6m，位于"分享此刻的想法..."输入区域旁），点击后实际打开的是**文章编辑器**（有"标题" textarea），不是想法编辑器！不要用这个按钮发想法（2026-04-13 实战验证）
31. **想法编辑器推荐入口：`?writepin`**：在当前 tab 用 `window.location.href = "https://www.zhihu.com/?writepin"` 导航（不要用 CDP `/navigate` 端点，可能不生效）。页面会弹出 Modal 弹窗含 Draft.js 编辑器。编辑器选择器 `.public-DraftEditor-content`，位于 `.Modal-wrapper` 容器内（2026-04-13 实战验证）
32. **Draft.js 编辑器数量随入口不同而变化**：`?writepin` 弹窗产生 1 个编辑器（Modal 内），创作中心文章编辑器有 textarea + DraftEditor 两个。写入内容前先检查编辑器数量和尺寸，取位于 Modal 内的那个（2026-04-13 更正）
32. **热榜是互动任务的最佳问题来源**：直接 CDP `/new?url=question/xxx` 常被重定向到首页。推荐导航到 `/hot`，从页面内 `a[href]` 提取问题链接（这些链接天然带平台上下文），然后用 `/navigate` 在同一 tab 打开。热榜还能按领域筛选（如 AI/科技），更容易找到与打卡内容主题一致的问题，在同一问题页连续完成赞同+评论两个互动任务
33. **赞同+评论组合操作**：在同一问题页先赞同回答（`likeBtn.click()`），再用 API 评论（`fetch /api/v4/answers/{aid}/comments`），无需导航到新页面。评论所需的 answer_id 可从 `data-zop` 属性的 `itemId` 字段提取，或从 DOM `.AnswerItem[name]` 获取
34. **clickAt 响应文本是点击瞬间快照，非最终状态**：`clickAt` 返回 `{"text":"立即报名"}` 但随后 `querySelector` 查询同一元素 innerText 为"已报名"。clickAt 的 text 字段是点击时刻的 DOM 快照，SPA 状态更新是异步的。判断操作是否生效必须用单独的 `/eval` 查询元素实际文本，不能依赖 clickAt 响应中的 text（2026-04-13 实战）
35. **API 评论成功 ≠ 打卡页立即反映**：通过 `fetch /api/v4/answers/{aid}/comments` 发评论成功（返回 comment ID），但返回打卡页查看任务进度仍显示"去评论"和 2/3。可能原因：打卡页 SPA 内存状态不会因外部 API 操作自动刷新；或评论所在问题不在打卡页推荐列表中不被计入。最终以创作中心 `/creator` 的「本周打卡天数」为准——发评论后直接去创作中心验证，不必反复回打卡页确认（2026-04-13 实战）
36. **发布按钮粘贴后需手动触发 React 状态更新**：ClipboardEvent paste 写入内容后，发布按钮（button.css-wfbczc）仍为 disabled。需 `editor.click(); editor.focus(); editor.dispatchEvent(new Event("input", {bubbles: true}));` 触发 React onChange 回调，按钮才会变为 enabled（2026-04-13 实战）
37. **想法发布按钮必须用 CDP `/clickAt`（isTrusted:true）**：发布按钮 `button.css-wfbczc.Button--blue.Button--secondary` 在 Modal 内，CDP `/click`（JS el.click()，isTrusted:false）只触发视觉反馈（按钮变色）但不发送 API 请求，内容不会发布。必须用 `/clickAt`（CDP Input.dispatchMouseEvent，isTrusted:true）才能完整触发提交逻辑（2026-04-21 实战：`/click` 失败，`/clickAt` 成功，内容管理页验证通过）
39. **CDP `/navigate` 端点不可靠，用 `window.location.href` 替代**：从创作中心页面用 CDP `/navigate` 导航到其他 URL（如 `/?writepin`）可能不生效（URL 不变）。改用 `/eval` 执行 `window.location.href = "https://www.zhihu.com/?writepin"` 更可靠。新 tab 创建（`/new`）也可能停在 `about:blank`，不建议用新 tab 方式导航知乎页面（2026-04-13 实战）
40. **评论 DOM 回退方案（API 失败时）**：API 评论（`POST /api/v4/answers/{aid}/comments`）可能返回 404 或认证错误（缺少 z_c0 token 时）。DOM 回退流程：① 点击 `button.ContentItem-action` 含"N 条评论"展开评论区 → ② 点击"回复"按钮展开回复编辑器 → ③ 回复编辑器是 `editors[1]`（index 1，index 0 是写回答编辑器）→ ④ `editor.focus(); document.execCommand('insertText', false, text)` 写入 → ⑤ 从 editor 向上遍历 parentElement 找到含"发布"按钮的容器（约 depth 6）→ ⑥ 按钮从 disabled 变为 enabled 后点击（2026-04-14 实战）
41. **`/pins/create` 是死链接**：`https://www.zhihu.com/pins/create` 返回空白页面（bodyLen≈20），不要用这个 URL 创建想法（2026-04-14 实战）
42. **创作中心"发想法"按钮行为不稳定**：有时打开文章编辑器（有标题 textarea，pitfall #30），有时直接打开 Draft.js 想法编辑器。行为可能取决于点击位置或页面状态。如果点开后看到 textarea + DraftEditor 两个编辑器，说明是文章编辑器，需关闭后改用 `?writepin` 入口（2026-04-14 实战）
43. **想法发布成功标志**：点击发布后，编辑器 innerText 清空为仅一个换行符（`len: 1`）即表示发布成功，编辑器弹窗可能不关闭。需到 `/creator/manage/creation/pin` 最终验证（2026-04-14 实战）
38. **创作中心 DOM 不可遍历**：创作中心 `/creator` 页面的"发布内容"文本在 `document.body.innerText` 中可见，但在 `innerHTML`、`querySelector`、`TreeWalker`、`XPath`、递归 `childNodes` 遍历中均找不到。不是 Shadow DOM（shadowRoot 搜索为空），不是 iframe。原因未知，可能是知乎自研框架的虚拟渲染机制。解决方案：用 `getComputedStyle(el).cursor === "pointer"` + 位置筛选来找可点击元素（2026-04-13 实战）
44. **execCommand insertText 多段落文本在回答编辑器中被截断（2026-04-18）**：写入627字（3段，\n\n分隔）后 innerText 只剩最后一段156字。短文本（~200字单段）也出现写入416字但 innerText 仅208字的差异。发布按钮变"发布中"但不提交（与想法编辑器同一 Draft.js 状态同步问题）
45. **"写回答"按钮在发布失败后消失（2026-04-18）**：在同一问题页尝试写回答后点发布（按钮变"发布中"），实际未提交。刷新或重新导航回该问题后，"写回答"按钮消失（可能系统认为已有草稿/回答）。需换一个问题页重新操作
46. **仅互动任务即可完成打卡（2026-04-18 验证）**：完成赞同+评论+关注3个互动任务后，创作中心显示"今日已打卡成功"，未完成任何创作任务。如果写回答/发想法遇到 Draft.js 状态问题，优先确保3个互动任务完成即可

---

## 一键打卡脚本

```bash
# 完整打卡（互动+创作+验证）
python zhihu-auto/scripts/zhihu_daka.py

# 仅互动任务（3/3，通常足够完成打卡）
python zhihu-auto/scripts/zhihu_daka.py --interact-only

# 自定义想法内容
python zhihu-auto/scripts/zhihu_daka.py --content "你的想法内容，至少60字"

# 自定义评论内容
python zhihu-auto/scripts/zhihu_daka.py --comment "你的评论，至少10字"
```

脚本流程（6步，单次执行）：
1. 热榜找 AI 相关问题（优先匹配 AI/科技关键词）
2. 赞同回答（DOM click）
3. API 评论（fetch POST，比 DOM 操作可靠）
4. API 关注作者（fetch POST）
5. 发想法（`?writepin` + ClipboardEvent paste，备用：仅互动任务也够打卡）
6. 创作中心验证打卡天数

---

## 站点经验

```yaml
domain: zhihu.com
aliases: [知乎]
updated: 2026-04-13
```

### 平台特征
- 编辑器：Draft.js（`public-DraftEditor-content`）
- 想法编辑器：推荐用 `?writepin`（`window.location.href = "https://www.zhihu.com/?writepin"`），弹出 Modal 含 1 个编辑器。⚠️ 创作中心首页的"发想法"按钮实际打开文章编辑器，不是想法编辑器（2026-04-13 验证）
- 评论编辑器：点击"X 条评论"按钮展开，Editor 在 DOM 末尾
- 打卡挑战赛：`/parker/campaign/{id}`，核心区域懒加载
- 反爬：中等，频繁操作可能触发验证码
- 登录态：Cookie `d_c0` + `z_c0`

### 典型打卡执行流程（端到端）

以下为一次完整打卡的最优执行路径（2026-04-17 实战更新）：

```
1. 创作中心 /creator → 提取当前有效 campaign 链接
2. 打卡页 /parker/campaign/{id} → clickAt 报名（可跳过，以创作中心最终验证为准）
3. 热榜 /hot → 找相关问题（筛选 AI/科技类）
4. 问题页 → 赞同回答（CDP /click button.VoteButton）
5. 同一问题页 → API 评论（fetch /api/v4/answers/{aid}/comments）— 比 DOM 操作更可靠
6. API 关注（fetch /api/v4/members/{token}/followers）— 无需打开用户主页
7. 创作任务：推荐在同一问题页写回答（100字+），而非发想法（想法自动化2026-04-16后不可靠）
   - 点击"写回答"按钮（页面上通常有2个，用索引定位如 buttons[14]）
   - 回答编辑器支持 execCommand insertText（已验证464字写入成功）
   - 问题页写回答不会"跑题"（因为已经在相关问题下）
8. 创作中心 /creator → 验证"今日已打卡成功"
```

**创作任务优先级（2026-04-17）**：写回答 > 发想法。回答编辑器 execCommand insertText 可靠写入，想法编辑器因 isTrusted:false + React state 不同步导致自动化失败。

**仅互动任务也可完成打卡（2026-04-18 验证）**：完成赞同+评论+关注3个互动任务后，创作中心显示"今日已打卡成功"，未完成任何创作任务。如果写回答/发想法遇到 Draft.js 状态问题，优先确保3个互动任务完成即可。

**备选路径**（API 评论可用时，2026-04-13 验证）：

```
步骤 5 替换为：同一问题页 → API 评论（fetch /api/v4/answers/{aid}/comments）
步骤 6 替换为：API 关注（fetch /api/v4/members/{token}/followers）— 无需打开用户主页
```

**效率技巧**：
- 步骤 4+5 可在同一问题页完成，赞同后立即展开评论区评论
- 步骤 6 关注用户也可直接在当前页面 eval fetch API（如果 API 可用），无需导航到用户主页
- 步骤 3 热榜找问题的优势：避免 CDP 直接导航 question URL 被重定向到首页
- 步骤 7 用创作中心按钮发想法，如果看到 textarea 说明打开了文章编辑器，改用 `?writepin`
- 步骤 8 如果之前跳过了报名，打卡页可能不显示任务进度，改用创作中心 `/creator` 验证

### 有效模式
- 想法创建（⚠️ 2026-04-16 后不可靠）：`window.location.href = "https://www.zhihu.com/?writepin"` → 弹出 Modal 含 1 个 Draft.js 编辑器 → ClipboardEvent paste **会产生逐字`<br>`乱码**（isTrusted:false 问题），execCommand insertText 写入 DOM 但 PinCreateForm React state 不更新（发布按钮点击后无 API 请求）。如自动化失效，内容已准备好，用户手动 Ctrl+V 粘贴 + 点击发布即可（约 10 秒）
- 想法创建（⚠️ 不可靠）：创作中心 `/creator` 点击"发想法"按钮（2026-04-13 验证：实际打开文章编辑器而非想法编辑器）
- 想法创建（手动备选）：当自动化 paste 失效时，内容已写入 DOM 可见，用户手动 Ctrl+A → Ctrl+V 覆盖粘贴 + 点击发布即可（约 10 秒）
- 内容管理：`https://www.zhihu.com/creator/manage/creation/pin`
- 创作中心：`https://www.zhihu.com/creator`（最可靠的打卡状态验证入口 + 有效 campaign 链接来源）
- 问题回答：直接导航到问题 URL，使用页面内的回答编辑器
- 评论：先点击"X 条评论"按钮展开评论区，或用 API `POST /api/v4/answers/{aid}/comments`
- 关注：API `POST /api/v4/members/{url_token}/followers`（比 CDP 点击可靠）
- 赞同：CDP 点击 `button` 中含"赞同"文本的元素（需 scrollIntoView 先滚到可视区），验证按钮变为"已赞同 N"
- 互动问题来源：推荐从热榜 `/hot` 找相关问题（避免直接导航 question URL 被重定向），在同一问题页可连续完成赞同+评论两个互动任务

### API 端点（页内 fetch 天然带 Cookie）
- 关注：`POST /api/v4/members/{url_token}/followers` → `{follower_count: N}`
- 评论：`POST /api/v4/answers/{answer_id}/comments` body:`{content:"..."}` → `{id: N, ...}`
- 想法：**API 完全不可用（2026-04-16 深度验证）** — `POST /api/v4/pins` 传 JSON `{content:"..."}` → 400 "Missing argument content"；JSON `{data:{content:"..."}}` → 400；form-urlencoded `content=...` → 403（缺 `x-zse-93/96` 签名头）。唯一通道：Draft.js 编辑器，但自动化发布也受限（见上方「想法创建」有效模式说明）

### 已知陷阱
- `?writepin` 是最可靠的想法编辑器入口（2026-04-13 验证）。⚠️ 创作中心"发想法"按钮实际打开文章编辑器（有"标题"输入框），不是想法编辑器
- 粘贴内容后发布按钮可能仍 disabled，需 `editor.click(); editor.focus(); editor.dispatchEvent(new Event("input", {bubbles: true}));` 触发 React 状态更新
- CDP `/navigate` 端点可能不生效（尤其从创作中心页面），用 `/eval` 执行 `window.location.href = "URL"` 替代
- 发布后弹窗关闭 ≠ 发布成功，需到内容管理页验证
- 评论区展开后编辑器在 DOM 末尾出现，需等待 DOM 更新
- `execCommand` 对想法编辑器无效但对评论编辑器有效（Draft.js 版本/配置差异）
- 打卡页是纯 SPA，所有状态（报名、进度）仅在内存中，不支持持久化验证
- 创作中心 `/creator` 是查看打卡进度的最可靠页面
- 关注推荐列表的关注按钮不是 `FollowButton`，是普通 DOM 元素
- **自动发回答必须匹配问题主题**：直接把日报/文章内容贴到不相关问题下会被用户投诉"回答和题目不相符"。发回答前必须确认内容与问题强相关，或用想法发布（想法无问题上下文，不会跑题）（2026-04-14 实战）
- **删除回答 API**：在 CDP `/eval` 中执行 `fetch('/api/v4/answers/{answer_id}', {method:'DELETE', headers:{'x-xsrftoken': document.cookie.match(/_xsrf=([^;]+)/)[1]}})` → `{success:true}`。注意必须在已登录的知乎页面内执行（利用页面 Cookie）（2026-04-14 实战）
- **删除想法 API**：`DELETE /api/v4/pins/{pin_id}`，用法同删除回答，返回 `{success:true}`（2026-04-14 实战）
- **⚠️ execCommand('selectAll') + insertText 在 Draft.js 想法编辑器中会导致内容倒序**：内容首尾拼接（开头变成原文末尾，末尾变成原文开头），617字内容只剩标签行。原因是 selectAll 后 Draft.js 光标位置行为异常。**正确方法**：确保编辑器为空状态下直接 `insertText`（不做 selectAll），或使用 ClipboardEvent paste（2026-04-14 实战，连续3次复现）
- **⚠️ innerHTML 设置 Draft.js 内容不触发 React 状态更新**：`editor.innerHTML = html` 后 innerText 显示正确内容（617 chars），但发布按钮保持 disabled。Draft.js 的内部 EditorState 不感知 DOM 直接变更。必须用 execCommand 或 ClipboardEvent 写入（2026-04-14 实战）
- **⚠️ 想法发布在 2026-04-16 全面失效，2026-04-21 再次确认（含 XHR 拦截器诊断）**：
  - **ClipboardEvent paste 产生乱码**：`isTrusted:false` 被 Draft.js 识别，内容写入后每个字符变成独立段落（逐字 `<br>`）。之前 2026-04-14 成功是因为 Draft.js 版本或运行环境差异。已验证：paste 事件的 `clipboardData.getData()` 正确返回内容，但 `isTrusted:false` 导致 Draft.js 处理逻辑异常
  - **execCommand insertText 写入 DOM 和底层 EditorState 但不更新 PinCreateForm**：DOM 显示 710 字、Draft.js Plugin Editor 的 `getEditorState().getCurrentContent().getPlainText()` 返回 710 字，但发布按钮点击后无网络请求发出。原因是 PinCreateForm 组件的 React state 不感知底层 Draft.js 的变更
  - **直接调用 onChange/props.onChange 无效**：找到 Draft.js Plugin Editor（`stateNode` at fiber depth=4）并调用 `pluginEditor.onChange(es)` 和 `props.onChange(es)` 均不触发 PinCreateForm 重新渲染。React 批处理机制阻止了非事件流中的状态传播
  - **API 直发全部失败**：`POST /api/v4/pins` JSON `{content:"..."}` → 400 "Missing argument content"；JSON `{data:{content:"..."}}` → 400；form-urlencoded → 403（需签名头 `x-zse-93/96`）
  - **可用的 Fiber 调试路径**：`editor.__reactFiber$xxx` → depth=3 `stateNode` = Draft.js Plugin Editor（有 `_latestEditorState`、`getEditorState`、`onChange`）→ depth=4 的 `memoizedProps.editorState` 有 `[native code]` 的 onChange（useState setter 包装）
  - **clickAt 同样无效（2026-04-21 XHR拦截器确认）**：挂载 XHR+fetch 拦截器后，clickAt 返回 `{clicked:true}`，但拦截器捕获到零个 pin/draft API 请求（仅一个 analytics 埋点）。发布按钮 enabled 但点击后不发请求。结论：**问题不在点击方式（click/clickAt），而在 Draft.js React state 为空**——无论用哪种点击，知乎前端逻辑检查到 state 为空就不提交
  - **结论：当前无法通过 CDP proxy 可靠发布想法**。唯一可靠方案：(1) 手动在浏览器中粘贴内容并点击发布（内容可提前写入DOM，用户 Ctrl+A → Ctrl+V 覆盖粘贴 + 点击发布，约10秒），或 (2) 逆向知乎签名算法后直接调 API，或 (3) 用 Playwright/Puppeteer 直连 Chrome（绕过 CDP proxy，可产生 isTrusted:true 的事件）
  - **调试技巧：XHR拦截器诊断发布是否真正提交**：在页面注入 `XMLHttpRequest.prototype.open` 和 `window.fetch` 拦截器，记录所有请求的 method/url/status。点击发布后检查是否有 pin/draft 相关请求，可100%确定是"前端没提交"还是"提交了但失败"
- **⚠️ 发布按钮"失败"但内容实际已提交**：发布按钮变为"发布中"再恢复原状，前端表现为失败，但某些情况下内容已成功提交到后端。反复重试会产生大量重复/乱码想法（2026-04-16 实战：一次会话产生了 8 条想法，6 条乱码 + 2 条正常）。**发布后务必导航到 `/creator/manage/creation/pin` 检查实际发布情况，不要仅以按钮状态判断**
- **批量删除想法**：在 `/eval` 中用 `Promise.all(ids.map(id => fetch('/api/v4/pins/' + id, {method:'DELETE', credentials:'include'})))` 批量删除。注意已删除的想法在管理页可能仍显示（缓存），刷新页面后消失。删除不存在的想法返回 `{"error":{"code":"ForbiddenError"}}` 而非 `{"success":true}`
- **想法 API 直发确认不可用**：`POST /api/v4/pins` 传 JSON `{content: "..."}` 返回 `"Missing argument content"`（400），传 form-urlencoded `content=...` 结果未知（被中断）。`/api/v4/pinsV2` 返回 404。Draft.js 编辑器仍是唯一发布通道（2026-04-16 再次验证）
- **评论回复编辑器索引**：问题页 editors[0] 是"写回答"编辑器，editors[1] 是点击"回复"展开的评论输入框。评论发布按钮需从 editor 向上遍历 parentElement 约6层找到，`disabled` 状态随内容自动切换（2026-04-14 实战）
- 活动链接从创作中心提取时带 `?zh_hide_nav_bar=true` 参数，直接导航可能报错，建议去掉该参数
- 推荐问题列表的链接在初始渲染时可能为空（懒加载），需等待或滚动触发
- CDP 新 tab 打开问题 URL 可能被路由重定向到首页，应先从页面内抓取真实链接
- 关注操作在个人主页最可靠（始终有 `button.FollowButton`），列表页按钮样式不统一
- 打卡 SPA 的报名按钮不稳定，clickAt 成功后可能不反映文本变化，以创作中心验证为准
- clickAt 响应中的 text 是点击瞬间快照，SPA 异步更新后元素文本会变，验证状态需单独 `/eval` 查询（2026-04-13）
- API 评论成功后打卡页任务进度不立即更新（SPA 内存状态），直接去创作中心验证本周打卡天数即可（2026-04-13）
