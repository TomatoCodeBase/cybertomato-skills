---
name: zhihu-auto
description: 知乎内容发布工具。自动填写并发布知乎内容。通过CDP直连用户Chrome，天然携带登录态。触发词：发知乎、知乎想法、知乎打卡、知乎发布、zhihu。
---

# 知乎发布 (zhihu-publisher)

通过 CDP Proxy 操作用户已登录的 Chrome，自动发布知乎内容。

## 前置条件

- **Chrome CDP** 已启用：地址栏 `chrome://inspect/#remote-debugging`，勾选远程调试
- **CDP Proxy** 运行中：`node skills/web-access-original/scripts/check-deps.mjs`
- 用户已在 Chrome 中登录知乎

## 前置检查

```bash
node skills/web-access-original/scripts/check-deps.mjs
```

## 核心流程

### 1. 打开编辑器

知乎想法编辑器没有独立 URL，必须从首页触发弹窗：

```
navigate → https://www.zhihu.com/?writepin
```

页面加载后，用截图确认弹窗是否出现。如果没有弹窗，可能被搜索框遮挡，按 Escape 关闭搜索后再试。

### 2. 定位编辑器

```javascript
// 确认编辑器存在
document.querySelector('.public-DraftEditor-content')
```

知乎使用 **Draft.js** 富文本编辑器（`public-DraftEditor-content`，`role=textbox`）。

### 3. 填入内容（关键！）

⚠️ **Draft.js 想法编辑器不支持 `execCommand`。必须用 ClipboardEvent paste。**

```javascript
// ✅ 想法编辑器：ClipboardEvent paste
const editor = document.querySelector('.public-DraftEditor-content');
editor.focus();
const text = "内容文本";
const dt = new DataTransfer();
dt.setData('text/plain', text);
dt.setData('text/html', text.split('\n').map(l => `<p>${l || '<br>'}</p>`).join(''));
const pe = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt });
editor.dispatchEvent(pe);
```

```javascript
// ✅ 评论编辑器：execCommand 有效
const editors = [...document.querySelectorAll('.public-DraftEditor-content')];
const editor = editors[editors.length - 1];  // 取最后一个
editor.focus();
document.execCommand('selectAll', false, null);
document.execCommand('insertText', false, '评论内容');
```

```javascript
// ❌ 错误：想法编辑器用 execCommand 无效
document.execCommand('insertText', false, text);  // 返回 true 但 Draft.js 不更新状态
```

### 4. 发布

```javascript
const btn = [...document.querySelectorAll('button')].find(b => /发布/.test(b.innerText) && !b.disabled);
btn.click();
```

发布后等待 2-3 秒，检查弹窗是否关闭。

### 5. 验证

```
navigate → https://www.zhihu.com/creator/manage/creation/pin  （想法）
navigate → https://www.zhihu.com/creator/manage/creation/article （文章）
```

## 常用互动操作

```javascript
// 点赞
[...document.querySelectorAll('button')].find(b => /赞同/.test(b.innerText) && !b.disabled)?.click();

// 关注用户（排除"关注问题"）
[...document.querySelectorAll('button.FollowButton')].find(b => b.innerText.includes('关注') && !b.innerText.includes('问题'))?.click();

// 打开评论区（按钮文本是"X 条评论"）
[...document.querySelectorAll('button')].find(b => /条评论/.test(b.innerText))?.click();
```

## CDP Proxy API 速查

| 操作 | 命令 |
|------|------|
| 列出 tab | `GET /targets` |
| 新建 tab | `GET /new?url=URL` |
| 导航 | `GET /navigate?target=ID&url=URL` |
| 截图 | `GET /screenshot?target=ID&file=path.png` |
| 执行 JS | `POST /eval?target=ID`，body = 纯 JS 文本（text/plain） |
| 点击 | `POST /click?target=ID`，body = CSS选择器 |
| 关闭 tab | `GET /close?target=ID` |

## Node.js 调用模板

```javascript
const http = require('http');
function evalJS(target, js) {
  return new Promise(resolve => {
    const req = http.request({
      hostname: 'localhost', port: 3456,
      path: '/eval?target=' + target,
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.end(js);
  });
}
```

## 已知陷阱

1. **Draft.js 想法编辑器**：`execCommand` 无效，必须用 ClipboardEvent paste
2. **Draft.js 评论编辑器**：`execCommand('insertText')` 有效（与想法编辑器不同！）
3. **多个 Draft.js 编辑器**：评论编辑器通常是 DOM 中最后一个
4. **评论按钮**：文本是"X 条评论"不是"评论"
5. **关注按钮**：在列表页不可靠，**去个人主页操作**（始终有 `button.FollowButton`）
6. **搜索弹窗遮挡**：`?writepin` 可能触发搜索弹窗，按 Escape 关闭
7. **发布按钮 disabled**：内容未写入时不要强行点击
8. **活动页懒加载**：打卡挑战赛在后台 tab 可能渲染不完整，等 3-5 秒
9. **PowerShell 转义**：中文/引号 JS 用 Node.js 脚本执行
10. **问题 URL 重定向**：CDP `/new?url=question/xxx` 可能被重定向到首页，先从热榜抓取真实链接
11. **打卡 SPA 不稳定**：报名 clickAt 成功后按钮文本可能不变，以创作中心验证为准

## 站点经验

```yaml
domain: zhihu.com
aliases: [知乎]
updated: 2026-04-08
```

### 平台特征
- 编辑器：Draft.js（`public-DraftEditor-content`）
- 想法编辑器：无独立 URL，通过首页弹窗触发
- 评论编辑器：点击"X 条评论"展开，Editor 在 DOM 末尾
- 打卡挑战赛：`/parker/campaign/{id}`，核心区域懒加载
- 反爬：中等，频繁操作可能触发验证码
- 登录态：Cookie `d_c0` + `z_c0`

### 有效模式
- 想法创建：`https://www.zhihu.com/?writepin`（需等待弹窗）
- 内容管理：`https://www.zhihu.com/creator/manage/creation/pin`
- 创作中心：`https://www.zhihu.com/creator`（验证打卡进度的最可靠入口）
- 点赞/评论：导航到具体问题页操作
- 关注：**导航到用户个人主页操作**（始终有 `button.FollowButton`），列表页按钮样式不统一
- 热榜链接抓取：导航到 `/hot`，从页面内 `a[href*="/question/"]` 提取真实链接

### API 端点（页内 fetch 天然带 Cookie）
- 关注：`POST /api/v4/members/{url_token}/followers` → `{follower_count: N}` — 比 CDP 点击可靠，绕过零宽字符和懒加载
- 评论：`POST /api/v4/answers/{answer_id}/comments` body:`{content:"..."}` → `{id: N, ...}` — answer_id 从 `.AnswerItem[name]` 属性提取
- 想法：**API 不可用** — `POST /api/v4/pins` 无论传 `{content}` 还是 `{pin:{content}}` 均返回 400；`/api/v4/pinsV2` 返回 404。唯一方式：Draft.js 编辑器 + ClipboardEvent paste

### 已知陷阱
- `?writepin` 可能重定向到首页
- 发布后弹窗关闭 ≠ 发布成功
- `execCommand` 对想法编辑器无效但对评论编辑器有效（Draft.js 版本/配置差异）
- `execCommand("insertText")` 对想法编辑器更危险：改了 DOM 但 Draft.js 内部 state 不更新，发布按钮变"发布中"却不发请求 — **必须用 ClipboardEvent paste**
- **不要对 Draft.js 编辑器执行 selectAll + delete 后再 paste** — 清空操作会破坏编辑器内部状态，后续 paste 无法生效
- 评论区展开后编辑器需等待 DOM 更新
- CDP 新 tab 打开问题 URL 可能被 SPA 路由重定向到首页
- 关注按钮在列表页/打卡页不可靠，个人主页始终有 `button.FollowButton`
- 打卡挑战赛 SPA 极不稳定，报名按钮可能 clickAt 成功但不反映状态
- **按钮文本含零宽字符**：知乎按钮 innerText 常含 U+200B 和换行符（如 `"​\n 关注"`），匹配前必须 `.replace(/[\u200b\s]/g, "")` 清理
- **发布按钮必须用 CDP `/click` 点击**：`el.click()` 和 `dispatchEvent(MouseEvent)` 能让按钮变"发布中"，但实际不发请求。用 `/click` 端点（CDP 真实点击）才能成功发布

### 通用经验（可迁移到其他站点）
1. **需要跟用户交互的操作（关注/私信），去该用户的个人主页最可靠** — 列表页的按钮受懒加载和样式差异影响，个人主页的 DOM 结构最稳定
2. **JS 路由型 SPA 的页面，CDP `/new?url=` 打开深层链接可能被重定向** — 应先导航到入口页，从 DOM 中提取真实链接再操作
3. **验证任务完成状态，不要用任务页本身验证** — SPA 内存状态不稳定，用独立的验证页面更可靠
4. **中文网站按钮文本普遍含零宽字符（U+200B）和换行符** — 不止知乎，百家号、微信公众号等也有。匹配按钮 innerText 前统一 `.replace(/[\u200b\s]/g, "")` 清理是通用防御策略
5. **API 直调优先于 DOM 点击**：当 UI 按钮被零宽字符、懒加载、SPA 状态等问题阻碍时，`fetch()` 调站内 API 更可靠（天然带 Cookie），但需先拦截网络请求摸清 API 格式
