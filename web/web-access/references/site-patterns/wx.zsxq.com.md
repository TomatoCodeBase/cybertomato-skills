---
domain: wx.zsxq.com
aliases: [知识星球, zsxq]
updated: 2026-04-16
---
## 平台特征

- **前端框架**：Angular + Zone.js（生产模式）
- **编辑器**：两种——ProseMirror(milkdown) 和 Quill（不同星球不同）
- **CDP proxy**：通过 localhost:3456 操作，Chrome 端口 9222 是 CDP proxy（WebSocket 直连 403）
- **API 域名**：https://api.zsxq.com（前后端分离）

## 有效模式

### 导航
- 编辑页：`https://wx.zsxq.com/article?groupId={groupId}`
- 星球主页：`https://wx.zsxq.com/group/{groupId}`
- 直接导航到编辑页最可靠，不依赖点击

### 标题注入
- nativeSetter + input/change/blur 事件（Angular 输入框）
- 选择器：`input[type=text]` 遍历匹配 placeholder 含"标题"

### 正文注入

**Quill 编辑器（类型B星球，如陪伴营）**：
- 切换 Markdown 模式可能被 isTrusted 拦截，但**不切换也行**
- 直接对 `.ql-editor` 使用 ClipboardEvent paste 注入 HTML
- 代码：`new DataTransfer()` + `setData('text/html', html)` + `new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true})`
- Quill 会正确同步 delta 模型，字数统计准确

**ProseMirror 编辑器（类型A星球，如日记）**：
- `.innerHTML = html` + input 事件即可

### API 直发（2026-04-16 逆向自 main.js）

端点：`POST https://api.zsxq.com/v2/groups/{groupId}/topics`

签名头（main.js Tt 函数）：
- `X-Request-Id`: 随机 UUID (32 hex + 4 hyphens)
- `X-Timestamp`: Unix 秒级时间戳
- `X-Version`: "2.90.0"
- `X-Signature`: MD5(fullUrl + " " + timestamp + " " + requestId)
- `X-Aduid`: localStorage 中的用户 ID

可复用页面已有的加密库：CryptoJS(SHA256/AES)、MD5(Z()函数)、JSEncrypt(RSA)

## 已知陷阱

1. **isTrusted 拦截**（2026-04-16 确认）：Angular 生产模式检查 event.isTrusted，JS .click()、CDP /click、dispatchEvent 全部被静默丢弃。CDP /click 返回 clicked:true 但 Angular 忽略。发布按钮、Markdown 切换按钮均受影响
2. **Quill delta 不同步**：直接设置 `.ql-editor.innerHTML` 不会更新 Quill 内部 delta 模型，导致字数统计不准、内容可能丢失。必须用 ClipboardEvent paste
3. **浏览器可能是 headless**：screenX/Y/outerW/H=0，OS 级鼠标模拟不可行
4. **大 HTML 分块**：>8KB 的 JS 用 --data-binary 发送，不是 -d
5. **编辑器加载时序**：标题 input 先出现，编辑器后出现（2-3秒延迟）
