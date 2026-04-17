---
domain: mp.toutiao.com
aliases: [头条号, toutiao, 今日头条]
---

## 平台特征
- 头条号后台 SPA 应用，React 架构
- 微头条编辑器为 ProseMirror（`[contenteditable=true]`）
- 文章编辑器也为 ProseMirror（`.ProseMirror`），标题为 textarea
- 首页有"为你推荐以下创作活动"卡片区域，活动卡片是纯展示 HTML（无链接/onclick）
- 活动参与方式：发微头条时带对应话题标签即可打卡

## 有效模式
- 编辑器写入: `innerHTML` 赋值 + `dispatchEvent(new Event('input', {bubbles:true}))`
- 标题写入: `.editor-title textarea` 的 `.value` 赋值 + input 事件
- 话题添加: 工具栏话题按钮 → `input[placeholder="搜索话题"]` → `nativeInputValueSetter` → 等待下拉 → `.forum-list-item`
- 微头条发布按钮: `button.publish-content`
- 文章发布按钮: `button.byte-btn-primary`（文本：预览并发布）
- 广告设置: `label.article-ad-radio`
- 首发设置: `label.checkbot-item`（默认开启）

## 已知陷阱
- 文章发布确认弹窗的「确定发布」按钮不在DOM中（非shadow DOM/iframe），弹窗约500ms自动关闭，需人工点击
- 文章编辑器工具栏没有话题按钮，话题用 `#话题#` 写在正文末尾
- 活动卡片无链接，不能通过DOM事件跳转
- 编辑器可能残留上次草稿，innerHTML赋值可覆盖
- Shell传递中文JS代码容易乱码，建议写文件再读取
