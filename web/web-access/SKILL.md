---
name: web-access
license: MIT
github: https://github.com/eze-is/web-access
triggers:
  - 搜索
  - 抓取
  - 爬取
  - 网页
  - 联网
  - 网络
  - 浏览器
  - CDP
  - 网站访问
  - 小红书
  - 微博
  - 推特
  - 知乎
  - 头条
  - 朋友圈
  - 公众号
  - 截图
  - 下载
description:
  所有联网操作必须通过此 skill 处理，包括：搜索、网页抓取、登录后操作、网络交互等。
  触发场景：用户要求搜索信息、查看网页内容、访问需要登录的网站、操作网页界面、抓取社交媒体内容（小红书、微博、推特等）、读取动态渲染页面、以及任何需要真实浏览器环境的网络任务。
metadata:
  author: 一泽Eze
  version: "2.4.1"
---

# web-access Skill

## 环境说明

> **Hermes 适配**：本 skill 安装在 `D:/HermesData/.hermes/skills/web/web-access/`。原文档中 `$CLAUDE_SKILL_DIR` 即指向此目录。脚本调用示例：
> - `node "$CLAUDE_SKILL_DIR/scripts/check-deps.mjs"` → `node "D:/HermesData/.hermes/skills/web/web-access/scripts/check-deps.mjs"`
> - 站点经验目录：`D:/HermesData/.hermes/skills/web/web-access/references/site-patterns/`

## 前置检查

在开始联网操作前，先检查 CDP 模式可用性：

```bash
node "D:/HermesData/.hermes/skills/web/web-access/scripts/check-deps.mjs"
```

- **Node.js 22+**：必需（使用原生 WebSocket）。版本低于 22 可用但需安装 `ws` 模块。
- **Chrome remote-debugging**：在 Chrome 地址栏打开 `chrome://inspect/#remote-debugging`，勾选 **"Allow remote debugging for this browser instance"** 即可，可能需要重启浏览器。

检查通过后再启动 CDP Proxy 执行操作，未通过则引导用户完成设置。

## 决策流程（TL;DR）

```
收到请求 → 明确目标与成功标准
  │
  ├─ 需要搜索发现信息？ → WebSearch → 拿到URL → 继续
  ├─ URL已知、需提取正文？ → WebFetch / Jina+curl → 完成
  └─ 非公开/反爬/需交互？ → CDP模式
       │
       ├─ 前置检查：check-deps.mjs → Proxy可用？
       ├─ 创建后台tab（/new） → 加载站点经验
       ├─ 读DOM（/eval）→ 目标内容拿到了？→ 是 → 关tab → 结束
       │                                    → 否 → 登录挡住了？→ 提示用户登录
       │                                              → 其他障碍？→ 调整策略
       └─ 站点经验沉淀 → 关闭tab
```

## 浏览哲学

**像人一样思考，兼顾高效与适应性的完成任务。**

执行任务时不会过度依赖固有印象所规划的步骤，而是带着目标进入，边看边判断，遇到阻碍就解决，发现内容不够就深入——全程围绕「我要达成什么」做决策。这个 skill 的所有行为都应遵循这个逻辑。

**① 拿到请求** — 先明确用户要做什么，定义成功标准：什么算完成了？需要获取什么信息、执行什么操作、达到什么结果？这是后续所有判断的锚点。

**② 选择起点** — 根据任务性质、平台特征、达成条件，选一个最可能直达的方式作为第一步去验证。一次成功当然最好；不成功则在③中调整。比如，需要操作页面、需要登录态、已知静态方式不可达的平台（小红书、微信公众号等）→ 直接 CDP

> **CHECKPOINT — 工具选择**：选定工具后，用一句话确认理由：
> - WebSearch → "信息未知，需要发现来源"
> - WebFetch/Jina → "URL已知，只需提取正文"
> - CDP → "需要登录态 / 反爬 / 动态交互 / 已知静态层无效"

**③ 过程校验** — 每一步的结果都是证据，不只是成功或失败的二元信号。用结果对照①的成功标准，更新你对目标的判断：路径在推进吗？结果的整体面貌（质量、相关度、量级）是否指向目标可达？发现方向错了立即调整，不在同一个方式上反复重试——搜索没命中不等于"还没找对方法"，也可能是"目标不存在"；API 报错、页面缺少预期元素、重试无改善，都是在告诉你该重新评估方向。遇到弹窗、登录墙等障碍，判断它是否真的挡住了目标：挡住了就处理，没挡住就绕过——内容可能已在页面 DOM 中，交互只是展示手段。

> **CHECKPOINT — 过程校验**：每完成一个关键操作后（搜索、打开页面、提取内容），必须自问：
> 1. 距离成功标准更近了吗？
> 2. 当前方法连续失败几次了？>=2 次就该换路
> 3. 继续当前路径的预期收益 vs 切换路径的开销？

**④ 完成判断** — 对照定义的任务成功标准，确认任务完成后才停止，但也不要过度操作，不为了"完整"而浪费代价。

## 联网工具选择

- **确保信息的真实性，一手信息优于二手信息**：搜索引擎和聚合平台是信息发现入口。当多次搜索尝试后没有质的改进时，升级到更根本的获取方式：定位一手来源（官网、官方平台、原始页面）。

| 场景 | 工具 |
|------|------|
| 搜索摘要或关键词结果，发现信息来源 | **WebSearch** |
| URL 已知，需要从页面定向提取特定信息 | **WebFetch**（拉取网页内容，由小模型根据 prompt 提取，返回处理后结果） |
| URL 已知，需要原始 HTML 源码（meta、JSON-LD 等结构化字段） | **curl** |
| 非公开内容，或已知静态层无效的平台（小红书、微信公众号等公开内容也被反爬限制） | **浏览器 CDP**（直接，跳过静态层） |
| 需要登录态、交互操作，或需要像人一样在浏览器内自由导航探索 | **浏览器 CDP** |

浏览器 CDP 不要求 URL 已知——可从任意入口出发，通过页面内搜索、点击、跳转等方式找到目标内容。WebSearch、WebFetch、curl 均不处理登录态。

**Jina**（可选预处理层，可与 WebFetch/curl 组合使用，由于其特性可节省 tokens 消耗，请积极在任务合适时组合使用）：第三方网络服务，可将网页转为 Markdown，大幅节省 token 但可能有信息损耗。调用方式为 `r.jina.ai/example.com`（URL 前加前缀，不保留原网址 http 前缀），限 20 RPM。适合文章、博客、文档、PDF 等以正文为核心的页面；对数据面板、商品页等非文章结构页面可能提取到错误区块。

进入浏览器层后，`/eval` 就是你的眼睛和手：

- **看**：用 `/eval` 查询 DOM，发现页面上的链接、按钮、表单、文本内容——相当于「看看这个页面有什么」
- **做**：用 `/click` 点击元素、`/scroll` 滚动加载、`/eval` 填表提交——像人一样在页面内自然导航
- **读**：用 `/eval` 提取文字内容，判断图片/视频是否承载核心信息——是则提取媒体 URL 定向读取或 `/screenshot` 视觉识别

浏览网页时，**先了解页面结构，再决定下一步动作**。不需要提前规划所有步骤。

### 程序化操作与 GUI 交互

浏览器内操作页面有两种方式：

- **程序化方式**（构造 URL 直接导航、eval 操作 DOM）：成功时速度快、精确，但对网站来说不是正常用户行为，更容易触发反爬机制。
- **GUI 交互**（点击按钮、填写输入框、滚动浏览）：GUI 是为人设计的，网站不会限制正常的 UI 操作，确定性最高，但步骤多、速度慢。

根据对目标平台的了解来判断。当程序化方式受阻时，GUI 交互是可靠的兜底。

**站点内 URL 的可靠性**：站点自己生成的链接（DOM 中的 href）天然携带平台所需的完整上下文，而手动构造的 URL 可能缺失隐式必要参数，导致被拦截、返回错误页面、甚至触发反爬。当构造的 URL 出现这类异常时，应考虑是否是缺失参数所致。

## 浏览器 CDP 模式

通过 CDP Proxy 直连用户日常 Chrome，天然携带登录态，无需启动独立浏览器。
若无用户明确要求，不主动操作用户已有 tab，所有操作都在自己创建的后台 tab 中进行，保持对用户环境的最小侵入。不关闭用户 tab 的前提下，完成任务后关闭自己创建的 tab，保持环境整洁。

### 启动

```bash
node "D:/HermesData/.hermes/skills/web/web-access/scripts/check-deps.mjs"
```

脚本会依次检查 Node.js、Chrome 端口，并确保 Proxy 已连接（未运行则自动启动并等待）。Proxy 启动后持续运行。

> **CHECKPOINT — CDP 连通性**：执行任何 CDP 操作前必须确认 Proxy 可用。非 TTY 环境用 `curl -s http://localhost:3456/targets` 替代脚本检查——返回 JSON 数组即为正常。

**非TTY环境**：`check-deps.mjs` 在无 stdin 的环境（如子Agent终端）中会报 `stdin is not a tty` 错误退出。此时跳过脚本，直接用 `curl -s http://localhost:3456/targets` 测试连通性即可——如果返回JSON数组则Proxy正常可用（2026-04-11）。

### Proxy API

所有操作通过 curl 调用 HTTP API：

```bash
# 列出用户已打开的 tab
curl -s http://localhost:3456/targets

# 创建新后台 tab（自动等待加载）
curl -s "http://localhost:3456/new?url=https://example.com"

# 页面信息
curl -s "http://localhost:3456/info?target=ID"

# 执行任意 JS：可读写 DOM、提取数据、操控元素、触发状态变更、提交表单、调用内部方法
curl -s -X POST "http://localhost:3456/eval?target=ID" -d 'document.title'

# 捕获页面渲染状态（含视频当前帧）
curl -s "http://localhost:3456/screenshot?target=ID&file=/tmp/shot.png"

# 导航、后退
curl -s "http://localhost:3456/navigate?target=ID&url=URL"
curl -s "http://localhost:3456/back?target=ID"

# 点击（POST body 为 CSS 选择器）— JS el.click()，简单快速，覆盖大多数场景
curl -s -X POST "http://localhost:3456/click?target=ID" -d 'button.submit'

# 真实鼠标点击 — CDP Input.dispatchMouseEvent，算用户手势，能触发文件对话框
curl -s -X POST "http://localhost:3456/clickAt?target=ID" -d 'button.upload'

# 文件上传 — 直接设置 file input 的本地文件路径，绕过文件对话框
curl -s -X POST "http://localhost:3456/setFiles?target=ID" -d '{"selector":"input[type=file]","files":["/path/to/file.png"]}'

# 滚动（触发懒加载）
curl -s "http://localhost:3456/scroll?target=ID&y=3000"
curl -s "http://localhost:3456/scroll?target=ID&direction=bottom"

# 关闭 tab
curl -s "http://localhost:3456/close?target=ID"
```

### 页面内导航

两种方式打开页面内的链接：

- **`/click`**：在当前 tab 内直接点击，简单直接，串行处理。适合需要在同一页面内连续操作的场景，如点击展开、翻页、进入详情等。
- **`/new` + 完整 URL**：从 DOM 提取对象链接的完整地址（包含所有查询参数），在新 tab 中打开。适合需要同时访问多个页面的场景。

很多网站的链接包含会话相关的参数（如 token），这些参数是正常访问所必需的。提取 URL 时应保留完整地址，不要裁剪或省略参数。

### 媒体资源提取

判断内容在图片里时，用 `/eval` 从 DOM 直接拿图片 URL，再定向读取——比全页截图精准得多。

### 技术事实
- **React controlled input 填值法则**：React SPA（知乎、头条、百家号、小红书等）的输入框不能用 `input.value = x` 或 `setFieldsValue` 直接赋值——数据写入但不会渲染。可靠方式是 `document.execCommand('selectAll')` + `document.execCommand('insertText', false, text)`，这会触发 React 的合成事件链实现渲染。成功率约70%，失败时退回手动输入。
- **ProseMirror/tiptap 编辑器填值法则**：ProseMirror/tiptap 编辑器（Vue 3 站点常见，如 watcha.cn）可用 `document.execCommand('insertText', false, text)` 填入。填入后需触发 `input` 事件让框架同步状态，否则提交按钮可能保持 disabled。页面中常有多个 ProseMirror 实例，按 `getBoundingClientRect().top` 和内容筛选目标编辑器。
- **Draft.js 富文本编辑器填值法则**：Draft.js 编辑器（知乎想法、百家号编辑器等）维护独立的 React EditorState，`execCommand("insertText")` 和 `InputEvent` 都只改 DOM 不改内部状态——UI 看到内容但提交时空。**唯一可靠方式是 `ClipboardEvent paste`**：构造 `DataTransfer` + `ClipboardEvent('paste')` 派发到编辑器元素，Draft.js 会正确处理 paste 事件更新 EditorState。**注意**：不要先 `selectAll + delete` 清空编辑器再 paste，清空操作会破坏 Draft.js 内部状态导致后续 paste 也失效。
- **中文网站零宽字符防御**：中文平台（知乎、百家号、头条等）按钮 innerText 普遍含 U+200B（零宽空格）和换行符，如 `"​\n 关注"`。按文本匹配按钮前，必须 `.replace(/[\u200b\s]/g, "")` 清理。更可靠的方式是跳过文本匹配，改用按钮索引（从 `querySelectorAll('button')` 中按位置取）或直接调站内 API。
- **SPA 按钮点击：CDP /clickAt > JS .click() > CDP /click**：React/SPA 框架的 onClick 绑定在合成事件上，`el.click()` 和 `dispatchEvent(MouseEvent)` 有时只触发视觉反馈（按钮变色、"发布中"等）但不执行实际逻辑。用 CDP `/click` 或 `/clickAt` 端点发送真实鼠标事件才能完整触发。**Angular 生产模式例外**：`/click` 底层是 JS `el.click()`（isTrusted=false）被拦截，必须用 `/clickAt`（isTrusted=true）。当 `.click()` 后按钮状态变化但无网络请求时，换 CDP 真实点击。
- 页面中存在大量已加载但未展示的内容——轮播中非当前帧的图片、折叠区块的文字、懒加载占位元素等，它们存在于 DOM 中但对用户不可见。以数据结构（容器、属性、节点关系）为单位思考，可以直接触达这些内容。
- DOM 中存在选择器不可跨越的边界（Shadow DOM 的 `shadowRoot`、iframe 的 `contentDocument`等）。eval 递归遍历可一次穿透所有层级，返回带标签的结构化内容，适合快速了解未知页面的完整结构。
- `/scroll` 到底部会触发懒加载，使未进入视口的图片完成加载。提取图片 URL 前若未滚动，部分图片可能尚未加载。
- 拿到媒体资源 URL 后，公开资源可直接下载到本地后用读取；需要登录态才可获取的资源才需要在浏览器内 navigate + screenshot。
- 短时间内密集打开大量页面（如批量 `/new`）可能触发网站的反爬风控。
- 平台返回的"内容不存在""页面不见了"等提示不一定反映真实状态，也可能是访问方式的问题（如 URL 缺失必要参数、触发反爬）而非内容本身的问题。
- **MINGW64/PowerShell curl 中文编码陷阱（2026-04-13）**：`curl -d '中文'` 和 `curl --data-binary '中文'` 在 MINGW64/Git Bash 和 PowerShell 下都会损坏 UTF-8 编码。**必须**将含中文的 JS 代码写入 `.js` 文件，用 `curl -d @/tmp/xxx.js` 从文件读取传递。这是 CDP `/eval` 写入中文内容的唯一可靠方式。
- **SPA 路由切换后 fetch 拦截器失效（2026-04-14）**：拦截 `window.fetch` 来监控 API 请求时，Angular 等 SPA 框架在路由切换后可能重建 fetch 引用，导致之前挂载的拦截器丢失。**XHR prototype 拦截器更可靠**：`XMLHttpRequest.prototype.open/send` 是原型方法，不受 SPA 重建影响。需要捕获 SPA 路由切换触发的 API 调用时（如发现隐藏的 API 端点），优先用 XHR 拦截。

### 视频内容获取

用户 Chrome 真实渲染，截图可捕获当前视频帧。核心能力：通过 `/eval` 操控 `<video>` 元素（获取时长、seek 到任意时间点、播放/暂停/全屏），配合 `/screenshot` 采帧，可对视频内容进行离散采样分析。

### 登录判断

用户日常 Chrome 天然携带登录态，大多数常用网站已登录。

登录判断的核心问题只有一个：**目标内容拿到了吗？**

打开页面后先尝试获取目标内容。只有当确认**目标内容无法获取**且判断登录能解决时，才告知用户：
> "当前页面在未登录状态下无法获取[具体内容]，请在你的 Chrome 中登录 [网站名]，完成后告诉我继续。"

登录完成后无需重启任何东西，直接刷新页面继续。

### 任务结束

用 `/close` 关闭自己创建的 tab，必须保留用户原有的 tab 不受影响。

Proxy 持续运行，不建议主动停止——重启后需要在 Chrome 中重新授权 CDP 连接。

## 并行调研：子 Agent 分治策略

任务包含多个**独立**调研目标时（如同时调研 N 个项目、N 个来源），鼓励合理分治给子 Agent 并行执行，而非主 Agent 串行处理。

**好处：**
- **速度**：多子 Agent 并行，总耗时约等于单个子任务时长
- **上下文保护**：抓取内容不进入主 Agent 上下文，主 Agent 只接收摘要，节省 token

**并行 CDP 操作**：每个子 Agent 在当前用户浏览器实例中，自行创建所需的后台 tab（`/new`），自行操作，任务结束自行关闭（`/close`）。所有子 Agent 共享一个 Chrome、一个 Proxy，通过不同 targetId 操作不同 tab，无竞态风险。

**子 Agent Prompt 写法：目标导向，而非步骤指令**
- 必须在子 Agent prompt 中写 `必须加载 web-access skill 并遵循指引` ，子 Agent 会自动加载 skill，无需在 prompt 中复制 skill 内容或指定路径。
- 子 Agent 有自主判断能力。主 Agent 的职责是说清楚**要什么**，仅在必要与确信时限定**怎么做**。过度指定步骤会剥夺子 Agent 的判断空间，反而引入主 Agent 的假设错误。**避免 prompt 用词对子 Agent 行为的暗示**：「搜索xx」会把子 Agent 锚定到 WebSearch，而实际上有些反爬站点需要 CDP 直接访问主站才能有效获取内容。主 Agent 写 prompt 时应描述目标（「获取」「调研」「了解」），避免用暗示具体手段的动词（「搜索」「抓取」「爬取」）。

**分治判断标准：**

| 适合分治 | 不适合分治 |
|----------|-----------|
| 目标相互独立，结果互不依赖 | 目标有依赖关系，下一个需要上一个的结果 |
| 每个子任务量足够大（多页抓取、多轮搜索） | 简单单页查询，分治开销大于收益 |
| 需要 CDP 浏览器或长时间运行的任务 | 几次 WebSearch / Jina 就能完成的轻量查询 |

## 信息核实类任务

核实的目标是**一手来源**，而非更多的二手报道。多个媒体引用同一个错误会造成循环印证假象。

搜索引擎和聚合平台是信息发现入口，是**定位**信息的工具，不可用于直接**证明**真伪。找到来源后，直接访问读取原文。同一原则适用于工具能力/用法的调研——官方文档是一手来源，不确定时先查文档或源码，不猜测。

| 信息类型 | 一手来源 |
|----------|---------|
| 政策/法规 | 发布机构官网 |
| 企业公告 | 公司官方新闻页 |
| 学术声明 | 原始论文/机构官网 |
| 工具能力/用法 | 官方文档、源码 |

**找不到官网时**：权威媒体的原创报道（非转载）可作为次级依据，但需向用户说明："未找到官方原文，以下核实来自[媒体名]报道，存在转述误差可能。"单一来源时同样向用户声明。

## 框架级技术事实（跨站点通用）

不同前端框架对程序化事件注入的容忍度不同，以下基于实测：

### 输入框填值

| 框架 | 可用方式 | 说明 |
|------|---------|------|
| React | nativeSetter | `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, val)` + `new Event('input',{bubbles:true})` |
| Angular | nativeSetter | 同 React，但需额外 dispatch `change` + `blur` 事件 |
| 原生 | 直接赋值 | `.value = val` 即可 |
| ProseMirror | innerHTML | `.innerHTML = html` + `new Event('input',{bubbles:true})` |
| Quill | ClipboardEvent paste | 唯一可靠方式：`new DataTransfer()` + `setData('text/html', html)` + `new ClipboardEvent('paste', ...)`。直接 innerHTML 不同步 delta 模型 |

### 按钮点击

| 框架 | JS .click() / CDP /click | 说明 |
|------|-------------------------|------|
| React | ✅ 可用 | React 不检查 isTrusted |
| Angular (生产模式) | JS .click() ❌ / CDP /click ❌ / CDP /clickAt ✅ | Angular Zone.js 检查 `event.isTrusted`。JS `.click()`、`dispatchEvent()`、CDP `/click`（底层也是 JS el.click()）isTrusted=false 被拦截。但 CDP `/clickAt`（Input.dispatchMouseEvent）产生 isTrusted=true 真实鼠标事件，Angular 放行（2026-04-17 知识星球验证） |
| 原生 | ✅ 可用 | 标准 DOM 事件 |
| Quill 内部按钮 | ⚠️ 看情况 | `.toggle-mode` 等切换按钮在 Angular 站点上同样受 isTrusted 限制 |

### Angular isTrusted 绕过策略

1. **CDP /clickAt**（首选）：`Input.dispatchMouseEvent` 产生 isTrusted=true 事件，Angular 放行（2026-04-17 验证）
2. **API 直发**：逆向 JS bundle 找后端 API 端点，直接 curl 调用（需复制 cookie 和签名头）
3. **用户手动点击**：让用户点击发布/确认按钮（内容已注入好）

### Headless 检测

```javascript
// 判断是否 headless
const isHeadless = window.screenX === 0 && window.screenY === 0 && window.outerWidth === 0 && window.outerHeight === 0;
```

## 站点经验

操作中积累的特定网站经验，按域名存储在 `references/site-patterns/` 下。

已有经验的站点：!`node -e "const fs=require('fs'),p='D:/HermesData/.hermes/skills/web/web-access/references/site-patterns';try{console.log(fs.readdirSync(p).filter(f=>f.endsWith('.md')).map(f=>f.replace(/\\.md$/,'')).join(', ')||'暂无')}catch{console.log('暂无')}"`

确定目标网站后，如果上方列表中有匹配的站点，必须读取对应文件获取先验知识（平台特征、有效模式、已知陷阱）。经验内容标注了发现日期，当作可能有效的提示而非保证——如果按经验操作失败，回退通用模式并更新经验文件。

**CDP 操作完成后必须执行站点经验沉淀**：

1. **新站点**：首次通过 CDP 操作的站点，必须创建 `references/site-patterns/{domain}.md`，记录平台特征、有效模式、已知陷阱
2. **已有站点**：发现了新模式、新陷阱或验证了旧经验已失效，必须追加更新
3. **记录原则**：只写经过验证的事实（选择器、URL结构、操作结果），不写未确认的猜测
4. **记录内容**：关键CSS选择器、页面入口URL、操作步骤、每日上限/频率限制、风控特征
5. **跳过条件**：纯静态页面浏览、WebSearch/WebFetch查询、无交互的简单页面抓取

文件格式：
```markdown
---
domain: example.com
aliases: [示例, Example]
updated: 2026-03-19
---
## 平台特征
架构、反爬行为、登录需求、内容加载方式等事实

## 有效模式
已验证的 URL 模式、操作策略、选择器

## 已知陷阱
什么会失败以及为什么
```
经验/陷阱内容标注发现日期，当作"可能有效的提示"而非"保证正确的事实"。

## References 索引

| 文件 | 何时加载 |
|------|---------|
| `references/cdp-api.md` | 需要 CDP API 详细参考、JS 提取模式、错误处理时 |
| `references/site-patterns/{domain}.md` | 确定目标网站后，读取对应站点经验 |
