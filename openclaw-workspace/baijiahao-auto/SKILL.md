---
name: baijiahao-auto
description: "百家号文章发布自动化。支持文章填写、封面设置、发布。依赖web-access的CDP能力。"
when_to_use: 用户提到发百家号、百家号发布、百家号打卡、baijiahao
version: 1.0.0
---

# 百家号发布 (baijiahao-auto)

## 触发词
`发百家号`、`百家号发布`、`百家号打卡`、`baijiahao`

## 前置条件
- CDP代理运行中（localhost:3456）
- Chrome已登录百家号
- web-access skill可用

## 文章来源
从Obsidian `03-内容工厂/` 找最终稿或初稿，不问来源

## 流程

### Step 1: 准备内容
- 从Obsidian获取文章Markdown
- 用 `md2html.cjs`（或内联转换）去除YAML frontmatter和Obsidian链接语法 `[[]]` → 纯文本
- 截取标题（第一个 `#` 标题）
- 生成封面图（base64 PNG 780x440）或使用已有封面

**Success criteria**: 标题≥4字，正文>500字，HTML无Obsidian残留

### Step 2: 打开编辑器
```javascript
navigate → https://baijiahao.baidu.com/builder/rc/edit?type=news
```
等待页面加载完成（检查 `document.querySelector('.cheetah-form')` 存在）

**Success criteria**: 编辑器页面加载，表单元素可见

### Step 3: 隐藏新手引导弹窗
百家号有新手引导弹窗（cheetah-tour），必须先关闭：
```js
const tour = document.querySelector('.cheetah-tour');
if (tour) tour.style.display = 'none';
const mask = document.querySelector('.cheetah-tour-mask');
if (mask) mask.style.display = 'none';
```

**Success criteria**: tour元素不可见，不遮挡发布按钮

### Step 4: 填写标题（execCommand方式）
百家号标题是Ant Design Form controlled组件，直接DOM赋值无效。

**可靠方式**（2026-04-08实战验证）：
```js
var inp = document.querySelector('input.cheetah-input');
inp.focus();
document.execCommand('selectAll', false, null);
document.execCommand('insertText', false, '文章标题');
```

**备选方式**（execCommand失败时）：
```js
// React fiber方式（数据写入但可能不渲染）
var inp = document.querySelector('input.cheetah-input');
var fk = Object.keys(inp).find(k => k.startsWith('__reactFiber'));
var fb = inp[fk];
while (fb && !fb.memoizedProps?.form) fb = fb.return;
fb.memoizedProps.form.setFieldsValue({ title: '文章标题' });
// 同时触发原生事件
var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
setter.call(inp, '文章标题');
inp.dispatchEvent(new InputEvent('input', {bubbles: true, data: '文章标题', inputType: 'insertText'}));
```

**选择器注意**：标题input不是`input[maxlength="64"]`，而是`input.cheetah-input`。

**CDP proxy eval注意**：POST body是纯文本不是JSON，`Content-Type: text/plain`。

**Success criteria**: 标题input显示正确文字，字数统计更新

### Step 5: 填写正文（UEditor）
百家号正文使用UEditor富文本编辑器（iframe内嵌）。

**选择器**：iframe id是`ueditor_0`（不是`iframe.edui-default-iframe`）。
```js
var iframe = document.getElementById('ueditor_0');
var editor = iframe.contentWindow.editor;
// 直接设置HTML内容（建议用h2小标题+strong加粗+ul列表，排版更好）
editor.setContent(htmlContent);
// 同步到表单
editor.fireEvent('contentchange');
editor.sync();
```

**排版建议**：用`<h2>`做小标题、`<strong>`加粗关键数据、`<ul><li>`做列表，百家号渲染效果比纯`<p>`好很多。

**Success criteria**: 编辑器内文字>0，底部字数统计显示正确

### Step 6: 设置封面
通过React fiber找到封面区域，或使用已有封面。
**Success criteria**: 封面图显示

### Step 7: 处理弹窗
可能出现的弹窗：
1. **热点话题推荐** → `display:none` 隐藏 `[class*=dialogueWrap]`
2. **风纪检测** → 点击"我知道了"
3. **AI工具引导** → 点击"下一步"或隐藏
4. **生图功能引导** → 隐藏 `.cheetah-tour`

**Success criteria**: 无遮挡弹窗

### Step 8: 发布（⚠️ 已知限制）
**CDP代理无法触发百家号React发布按钮的真实发布逻辑。**
- 发布按钮的onClick只能触发保存草稿。
- 原因：百家号发布按钮是React SPA组件，点击事件经过复杂的`preCheck`→`paramProxy`→`re()`链路，需要完整的事件冒泡和React合成事件系统。CDP代理的 `/click` 和 DOM click 只能触发冒泡的第一层拦截，不会触发后续的API调用。

**解决方案**：
1. 自动完成所有填写并保存草稿
2. 提示用户手动点击"发布"按钮（10秒完成）
3. 或通过百家号内容管理页面草稿列表→修改→发布

**Human checkpoint**: 此步骤必须通知用户手动发布

### Step 9: 验证发布
- 打开草稿列表确认文章不在草稿中
- 或在已发布列表中搜索文章标题

**Success criteria**: 文章出现在已发布列表

## 关键URL
| 页面 | URL |
|------|-----|
| 新建图文 | `https://baijiahao.baidu.com/builder/rc/edit?type=news` |
| 编辑草稿 | `https://baijiahao.baidu.com/builder/rc/edit?type=news&article_id={id}` |
| 草稿列表 | `https://baijiahao.baidu.com/builder/rc/article?type=draft` |
| 任务中心 | `https://baijiahao.baidu.com/builder/rc/taskcenter` |

## 已知限制（2026-04-08实战更新）
1. **标题选择器变更**: `input[maxlength="64"]` 已失效，正确选择器是 `input.cheetah-input`
2. **React controlled input**: `setFieldsValue` 能写数据但不渲染，`execCommand('insertText')` 成功率约70%，两者结合最稳
3. **UEditor iframe id**: 正确的是 `ueditor_0`，不是 `iframe.edui-default-iframe`
4. **UEditor同步**: 设置内容后必须 `editor.fireEvent('contentchange'); editor.sync()`，否则表单不读内容
5. **发布按钮click只保存草稿**: `/click` 和原生 `click()` 都只触发草稿保存，不触发实际发布API
6. **新手引导弹窗遮挡**: `.cheetah-tour` 元素会遮挡页面交互，每次页面加载都需处理
7. **CDP无键盘输入**: 代理的 `/type` 终点，无法模拟键盘输入
8. **CDP proxy eval格式**: POST body是纯文本（text/plain），不是JSON
9. **频繁操作触发服务器异常**: React fiber操作 + 表单赋值过于频繁会触发"服务器开了小差"错误，需要适当间隔
10. **预览页面确认内容**: 用 `/builder/preview/s?id={article_id}` 确认文章内容是否正确
11. **草稿列表点击修改会跳转**: 点击"修改"可能跳转到内容列表而非编辑器，直接用编辑URL更可靠
12. **API发布500**: `/rest/2.0/elite/article/publish` 直接调用返回500，需要完整参数和CSRF token等
