---
name: zsxq-publish
description: 知识星球内容发布与管理。支持 API 直发（纯文本帖）和 CDP 富文本注入两种通道，以及评论/回答/标签管理。触发词：发布星球、知识星球发布、zsxq发布、星球评论、星球回答
version: 2.0.0
---

# 知识星球内容发布与管理

双通道发布 + 评论/回答/标签管理，基于官方 zsxq-cli 暴露的 API 端点。

## 前置条件

- web-access CDP Proxy 可用（localhost:3456）— 用于获取 cookie 认证
- Chrome 已登录 wx.zsxq.com
- CDP 富文本通道额外需要：编辑页已打开（https://wx.zsxq.com/article?groupId={groupId}）

## API 直发通道（优先使用）

官方 zsxq-cli 的 `topic +create`、`topic +reply`、`topic +answer` 均通过 REST API 直发实现，不依赖 UI 操作。我们复用同一套 API，通过 CDP cookie 认证（sync XHR + withCredentials）。

**优势**：无需打开编辑页、无需处理 Angular isTrusted、无需 DOM 注入、稳定快速。

### API 端点（从 main.js 逆向 + 官方 skill 交叉验证）

| 操作 | 方法 | URL | 说明 |
|------|------|-----|------|
| 发布帖子 | POST | https://api.zsxq.com/v2/groups/{groupId}/topics | 官方 skill `topic +create` 底层调用，支持 title + content |
| 发布文章 | POST | https://api.zsxq.com/v2/groups/{groupId}/topics | 同一端点，文章可能需额外参数 |
| 编辑文章 | PUT | https://api.zsxq.com/v2/groups/{groupId}/topics/{topicId} | — |

源码定位：postTopic: function(e) { return "groups/" + e + "/topics" }

### API 直发模板（通过 CDP eval 执行 sync XHR）

所有 API 调用都通过 CDP eval 注入 sync XHR，复用 Chrome 的 cookie 认证：

**发布帖子：**
```javascript
(function(){
  var x=new XMLHttpRequest();
  x.open("POST","https://api.zsxq.com/v2/groups/{group_id}/topics",false);
  x.withCredentials=true;
  x.setRequestHeader("Content-Type","application/json");
  x.setRequestHeader("Origin","https://wx.zsxq.com");
  x.setRequestHeader("Referer","https://wx.zsxq.com/");
  x.send(JSON.stringify({
    title:"标题文字",
    text:"正文内容\n支持换行",
    topic_type:"talk"
  }));
  var r=JSON.parse(x.responseText);
  return x.status+"|"+JSON.stringify(r);
})()
```

**评论主题：**
```javascript
(function(){
  var x=new XMLHttpRequest();
  x.open("POST","https://api.zsxq.com/v2/topics/{topic_id}/comments",false);
  x.withCredentials=true;
  x.setRequestHeader("Content-Type","application/json");
  x.setRequestHeader("Origin","https://wx.zsxq.com");
  x.setRequestHeader("Referer","https://wx.zsxq.com/");
  x.send(JSON.stringify({
    text:"评论内容",
    // 回复某条评论时加: replied_comment_id:"{comment_id}"
  }));
  var r=JSON.parse(x.responseText);
  return x.status+"|"+JSON.stringify(r);
})()
```

**回答提问（q&a专用，只能回答一次）：**
```javascript
(function(){
  var x=new XMLHttpRequest();
  x.open("POST","https://api.zsxq.com/v2/topics/{topic_id}/answer",false);
  x.withCredentials=true;
  x.setRequestHeader("Content-Type","application/json");
  x.setRequestHeader("Origin","https://wx.zsxq.com");
  x.setRequestHeader("Referer","https://wx.zsxq.com/");
  x.send(JSON.stringify({
    text:"回答内容"
  }));
  var r=JSON.parse(x.responseText);
  return x.status+"|"+JSON.stringify(r);
})()
```

**设置标签：**
```javascript
(function(){
  var x=new XMLHttpRequest();
  x.open("POST","https://api.zsxq.com/v2/topics/{topic_id}/tags",false);
  x.withCredentials=true;
  x.setRequestHeader("Content-Type","application/json");
  x.setRequestHeader("Origin","https://wx.zsxq.com");
  x.setRequestHeader("Referer","https://wx.zsxq.com/");
  x.send(JSON.stringify({
    tags:["标签1","标签2"]
  }));
  var r=JSON.parse(x.responseText);
  return x.status+"|"+JSON.stringify(r);
})()
```

**设为精华：**
```javascript
(function(){
  var x=new XMLHttpRequest();
  x.open("POST","https://api.zsxq.com/v2/topics/{topic_id}/digested",false);
  x.withCredentials=true;
  x.setRequestHeader("Content-Type","application/json");
  x.setRequestHeader("Origin","https://wx.zsxq.com");
  x.setRequestHeader("Referer","https://wx.zsxq.com/");
  x.send(JSON.stringify({digested:true}));
  var r=JSON.parse(x.responseText);
  return x.status+"|"+JSON.stringify(r);
})()
```

⚠️ API 端点路径可能需要根据实际返回调整（如 404 时尝试加 /v2 前缀或换路径）。官方 skill 暴露的工具名（set_topic_tags、set_topic_digested）对应后端的具体路径，可从 `zsxq-cli api list` 获取完整映射。

### 双通道决策

```
收到发布请求
  ├─ 内容是纯文本/Markdown？ → API 直发（POST /v2/groups/{gid}/topics）
  ├─ 内容含 HTML/图片/复杂排版？ → CDP 富文本注入
  ├─ 需要评论？ → API 直发（POST /v2/topics/{tid}/comments）
  ├─ 需要回答提问？ → API 直发（POST /v2/topics/{tid}/answer）
  └─ 需要打标签/设精华？ → API 直发（PUT /v2/topics/{tid}/tags 或 /digested）
```

| 场景 | 通道 | 端点 |
|------|------|------|
| 发布纯文本帖 | API 直发 | POST /v2/groups/{gid}/topics |
| 发布富文本文章 | CDP 注入 | ProseMirror innerHTML + clickAt |
| 评论/回复 | API 直发 | POST /v2/topics/{tid}/comments |
| 回答提问 | API 直发 | POST /v2/topics/{tid}/answer |
| 打标签 | API 直发 | POST /v2/topics/{tid}/tags |
| 设精华 | API 直发 | POST /v2/topics/{tid}/digested |

### 请求头签名（main.js Tt 函数）

- X-Request-Id: 随机UUID（32位hex，含4个连字符）
- X-Timestamp: Unix时间戳（秒）
- X-Version: "2.90.0"（v2 API）或 "3.17.0"（v3）
- X-Signature: MD5(完整URL + " " + 时间戳 + " " + requestId)
- X-Aduid: localStorage.getItem("XAduid")，首次随机生成并存储

签名注意：URL 中单引号替换为 %27；MD5 输入格式为 url + " " + ts + " " + reqId

### 知识星球已加载的加密库（可从页面 JS 上下文复用）

- CryptoJS（Me()）：SHA256、AES-CBC、Utf8 编码等
- MD5（Z()）：Z()(string).toString() 产出 MD5 hex
- JSEncrypt（u()）：RSA 加密
- Ls 类：AES-CBC 加密器

## 编辑页 DOM 结构

知识星球不同星球可能使用不同的编辑器（两种已确认）：

### 类型A：ProseMirror (milkdown) 编辑器
用于"番茄的 OpenClaw 日记"等星球（创建/管理的星球）

| 元素 | 选择器 | 说明 |
|------|--------|------|
| 标题输入框 | input[placeholder="请在这里输入标题"] | 标准 HTML input，React 框架 |
| 正文编辑区 | .ProseMirror | milkdown (ProseMirror) contenteditable |
| 发布按钮 | div 元素，innerText === '发布'，class 含 'btn' | 注意：是 div 不是 button |

### 类型B：Quill 编辑器（默认） → 需切换到 Markdown 模式
用于"番茄 Openclaw 零基础入门陪伴营"等星球（加入的星球）

默认进入是 Quill 富文本编辑器（.ql-editor），**必须先切换到 Markdown 模式**。

**切换 Markdown 模式步骤：**
1. 找到 .toggle-mode.richText（文字："切换到 Markdown 模式 (内测)"）
2. 点击它（用 CDP /click endpoint 或 JS .click()）
3. 弹出确认框："确定要切换编辑器？当前内容将不会同步至新编辑器"
4. 点击"确定"按钮
5. 切换成功标志：
   - 按钮文字变为"切换到富文本模式"
   - 按钮 class 变为 toggle-mode（无 richText）
   - .ql-editor 消失，.ProseMirror 出现
6. 切换后编辑器变为 ProseMirror（milkdown），注入方式与类型A相同

**切换确认弹窗：**
- 点击 .toggle-mode 后会弹出确认框，不会立即切换
- 确认按钮选择器：`.dialog-container .confirm`（innerText === '确定'），用 clickAt 点击
- 弹窗出现时机：点击切换按钮后约 1-2 秒，需 sleep 后再查找
- 如果 `div.confirm` 不生效，试试更精确的 `.dialog-container .confirm`

### 进入编辑页的方式

1. **直接导航（推荐）**：https://wx.zsxq.com/article?groupId={groupId}
2. **从星球页点击**：进入星球 → 点击 .post-article（"写文章"按钮）→ 会跳转到编辑页

注意：点击"写文章"按钮后，实际效果是导航到编辑页 URL（/article?groupId=...），可能是当前 tab 跳转。

**可靠方式**：已知 groupId 时直接导航到编辑页 URL，不依赖点击。

## 完整端到端流程（从主页到发布）

```
1. 打开星球主页或目标星球页
2. 进入编辑页（直接导航或点击"写文章"）
3. [类型B] 切换到 Markdown 模式 → 确认弹窗点"确定"
4. 填写标题（nativeSetter）
5. 注入正文（HTML → ProseMirror innerHTML）
6. 验证内容
7. 点击发布（优先用 API 直发，UI 点击可能被 isTrusted 拦截）
8. 确认跳转到 articles.zsxq.com
9. 打开文章链接
```

## 发布流程（7步）

### Step 1: 找到编辑页 targetId

查看 targets 列表，找到 URL 含 zsxq.com/article 的 tab。没找到时帮用户打开：
curl -s "http://localhost:3456/new?url=https://wx.zsxq.com/article?groupId=28885124282121"

### Step 2: 填写标题

Angular 输入框必须用 nativeSetter。querySelector('input[placeholder="..."]') 在 Angular 组件隔离下可能返回 null，用遍历方式更可靠：

```javascript
(function(){
  try {
    var inputs = document.querySelectorAll('input[type=text]');
    for(var i=0; i<inputs.length; i++){
      if(inputs[i].placeholder && inputs[i].placeholder.indexOf('标题') !== -1){
        var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(inputs[i], '标题文字');
        inputs[i].dispatchEvent(new Event('input', {bubbles: true}));
        inputs[i].dispatchEvent(new Event('change', {bubbles: true}));
        return 'Title set: ' + inputs[i].value;
      }
    }
    return 'Title input not found';
  } catch(e) { return 'Error: ' + e.message; }
})()
```

### Step 3: Markdown 转 HTML

知识星球编辑器接受 HTML。转换规则见 scripts/md_to_zsxq_html.py

### Step 4: 注入正文

**ProseMirror 编辑器**：直接设置 innerHTML + input 事件
**Quill 编辑器**：必须用剪贴板粘贴方式（否则 delta 模型不同步）：

```javascript
var dt = new DataTransfer();
dt.setData('text/html', htmlContent);
var pasteEvent = new ClipboardEvent('paste', {
  clipboardData: dt,
  bubbles: true,
  cancelable: true
});
document.querySelector('.ql-editor').dispatchEvent(pasteEvent);
```

HTML 大于 8KB 时分块拼接，用 --data-binary 发送（不是 -d）。

### Step 5: 验证内容完整性

检查 editorEl.innerText.length 和首尾文字。

### Step 6: 点击发布

**优先方案：CDP /clickAt（真实鼠标事件，2026-04-17 验证通过）**
CDP `/clickAt` 端点使用 `Input.dispatchMouseEvent`，产生 isTrusted=true 的真实鼠标事件，Angular 不会拦截。
```bash
curl -s -X POST "http://localhost:3456/clickAt?target=$TID" -d 'div.post.btn'
```

**备选方案1：API 直发**（需 MD5 签名，页面上下文中 Z() 函数被 Angular 模块作用域隔离，不可直接调用）
POST https://api.zsxq.com/v2/groups/{groupId}//topics，带上签名头。

**备选方案2：JS .click() / CDP /click**（被 Angular isTrusted 拦截，不可用）
遍历 div 找 innerText === '发布' 且 className 含 'btn' 的元素调用 .click()

### Step 7: 确认发布成功

发布成功后页面跳转到 articles.zsxq.com/id_xxxx.html

## 已知坑

1. **-d vs --data-binary**：大 JS 用 -d 会因特殊字符报 Uncaught，必须用 --data-binary
2. **发布按钮是 div**：querySelector('button') 找不到，必须遍历 div 找 innerText === '发布'
3. **标题用 nativeSetter**：React input 不能直接 .value =，必须用 HTMLInputElement.prototype.value 的 nativeSetter + input/change 事件
4. **HTML > 8KB 分块**：单次注入大字符串可能失败，用 JS 分块拼接
5. **标题 input 的 querySelector 可能失败**：Angular 组件隔离/Shadow DOM 下直接 querySelector 可能返回 null。可靠写法：遍历 querySelectorAll('input[type=text]')，通过 placeholder.indexOf('标题') 匹配
6. **注入 JS IIFE 返回 undefined**：赋值语句不是 return 时 CDP eval 返回 undefined，但注入实际成功
7. **保持 HTML 简单**：只用 h2/h3/p/strong/a/blockquote/hr
1. **Angular isTrusted 拦截（关键发现 2026-04-16）**：JS .click()、CDP /click、dispatchEvent 全部被 Angular isTrusted 检查拦截。但 **CDP /clickAt（Input.dispatchMouseEvent）产生 isTrusted=true 事件，Angular 放行**（2026-04-17 验证）
9. **切换 Markdown 弹窗确认**：点击 .toggle-mode 后弹出确认框，必须点"确定"才生效
10. **编辑页加载时序**：标题 input 先出现，ProseMirror 编辑器后出现（差2-3秒）
11. **浏览器可能是 headless**：screenX/Y/outerW/H=0 时 OS 级鼠标模拟不可行
12. **Quill 编辑器注入**：直接设置 innerHTML 不会同步 Quill delta 模型。用剪贴板粘贴方式（DataTransfer + ClipboardEvent）。**paste 前必须 `ql.focus()`**，否则 paste 事件不会被编辑器接收
13. **Quill 切换 Markdown 流程（2026-04-19 更新）**：toggle-mode.richText 按钮的触发方式不稳定，/click 和 clickAt 行为可能随 Angular 版本变化。2026-04-19 实测可靠流程：clickAt `.toggle-mode.richText` → sleep 2s → 弹出 dialog-container → clickAt `.dialog-container .confirm`（注意：用 `.dialog-container .confirm` 而非 `div.confirm`，前者更精确可靠）。如果 clickAt 切换按钮未触发弹窗，尝试 `/click`（JS .click()）。切换后验证：`.ql-editor` 消失、`.ProseMirror` 出现
14. **避免 toggle 的备选方案：直接在 Quill 中 paste（2026-04-19）**：当 toggle 切换不稳定时，可以不切 Markdown，直接在 Quill 编辑器中 paste HTML 注入。流程：`document.querySelector('.ql-editor').focus()` → 构造 ClipboardEvent paste → 注入。注意：此方案 paste 成功但 Angular 状态同步可能有延迟，发布按钮可能仍为 disabled，需验证后再发布
15. **CDP /eval Content-Type**：`-d` 默认发 application/x-www-form-urlencoded，对纯 JS 代码通常没问题；但如果 JS 内容含 `=` 或 `&` 字符会被解析，此时用 `--data-binary` + `-H "Content-Type: text/plain"` 更安全

## 星球导航

### 知识星球主页
- URL: https://wx.zsxq.com/group/88885282228812
- 页面结构：左侧是星球列表，分"创建/管理的星球"和"加入的星球"两个区

### 已知星球

| 名称 | groupId | URL | 类型 |
|------|---------|-----|------|
| 番茄的 OpenClaw 日记 | 28885124282121 | https://wx.zsxq.com/group/28885124282121 | 创建/管理 |
| 番茄 Openclaw 零基础入门陪伴营 | 88882824154122 | https://wx.zsxq.com/group/88882824154122 | 加入的星球 |
| 科技如花 | - | - | 创建/管理 |
| 新媒体运营实操 | - | - | 创建/管理 |
| 赛博番茄数字档案集 | - | - | 创建/管理 |
| Aigc商业践行 | - | - | 创建/管理 |
| AI破局俱乐部 | - | - | 加入的星球 |

如果已知 groupId，可以直接导航。

## 发布记录

| 日期 | 标题 | groupId（星球） | 结果 |
|------|------|----------------|------|
| 2026-04-14 | GPT-6发布会前夜奥特曼连遭两次暗杀，Anthropic攥着核武器求白宫接盘 | 28885124282121（日记） | 成功 |
| 2026-04-14 | GPT-6发布会前夜奥特曼连遭两次暗杀，Anthropic攥着核武器求白宫接盘 | 88882824154122（陪伴营） | 成功 |
| 2026-04-15 | OpenAI内部信炮轰Anthropic"注水80亿"，阿里首款机器人曝光让具身智能卷进快递柜 | 28885124282121（日记） | 成功 |
| 2026-04-15 | OpenAI内部信炮轰Anthropic"注水80亿"，阿里首款机器人曝光让具身智能卷进快递柜 | 88882824154122（陪伴营） | 成功 |
| 2026-04-16 | Snap砍千人喂AI，MiniMax养马进化：Agent战争打到"偷代码"了 | 28885124282121（日记） | 内容注入成功（标题nativeSetter+正文Quill剪贴板粘贴），发布由用户手动点击完成 |
| 2026-04-16 | Snap砍千人喂AI，MiniMax养马进化：Agent战争打到"偷代码"了 | 88882824154122（陪伴营） | 同上，两个星球均手动发布成功 |
| 2026-04-17 | Claude强实名引爆全网，OpenAI暗放GPT-5.4：AI行业安全与竞赛同时失控 | 28885124282121（日记） | 完整自动化成功：nativeSetter标题+ProseMirror innerHTML注入+clickAt发布 |
| 2026-04-17 | Claude强实名引爆全网，OpenAI暗放GPT-5.4：AI行业安全与竞赛同时失控 | 88882824154122（陪伴营） | 完整自动化成功：clickAt切Markdown→clickAt确认→nativeSetter标题+ProseMirror注入+clickAt发布 |
| 2026-04-19 | Claude Design 硬刚 Figma 的背后，是 Anthropic 300 亿美元的底气 | 88882824154122（陪伴营） | 完整自动化成功：clickAt切Markdown→clickAt `.dialog-container .confirm`→nativeSetter标题+ProseMirror注入+clickAt发布 |
