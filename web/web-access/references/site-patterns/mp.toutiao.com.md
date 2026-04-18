---
domain: mp.toutiao.com
aliases: [头条号, toutiao, 今日头条]
updated: 2026-04-11
---
## 平台特征
- 头条号后台 SPA 应用，React 架构
- 微头条编辑器为 ProseMirror（`[contenteditable=true]`）
- 首页有"为你推荐以下创作活动"卡片区域，活动卡片是纯展示 HTML（无链接/onclick）
- 活动参与方式：发微头条时带对应话题标签即可打卡
- 创作活动列表页（task-list）经常显示 0 个活动，实际活动在首页推荐卡片区域

## 有效模式
- 首页 URL: `https://mp.toutiao.com/profile_v4/index`
- 微头条发布: `https://mp.toutiao.com/profile_v4/weitoutiao/publish`
- 编辑器写入: `editor.innerHTML = '<p>...</p>'` + `dispatchEvent(new Event('input', {bubbles:true}))`
- 话题添加: 工具栏"话题"按钮 → `input[placeholder="搜索话题"]` → `nativeInputValueSetter` 设置值 → 等待下拉 → `.forum-list-item` 点击
- 发布按钮: `button.publish-content`（**必须用 `/clickAt` 真实点击**，`/click` 的 JS click() 对 React 合成事件无效，只触发视觉反馈不执行发布逻辑）（2026-04-10）

## 有效模式（续）
- 搜索热点内容: `https://www.toutiao.com/search/?keyword={关键词}` — 搜索结果包含热榜和资讯卡片，可用 `.result-content, .search-card, .feed-card-article-l` 提取正文；热榜区域在页面顶部，`innerText` 即可提取排名和标题（2026-04-12）
- 作品管理页: `https://mp.toutiao.com/profile_v4/manage/content/all` — 可查看已发布内容列表和状态（2026-04-12）

## 已知陷阱
- PowerShell 中文编码问题：JS 中文字符串通过 curl.exe 传递会乱码，必须写文件再传递（2026-04-09）
- 编辑器可能有上次残留草稿，直接 innerHTML 赋值可覆盖
- 活动卡片无链接，不能通过 DOM 事件跳转，需要从标题提取活动名后在发布页通过话题搜索添加
- PowerShell 的 Invoke-WebRequest 对 localhost:3456 POST 可能报 NullReferenceException，用 node.js http 模块替代更可靠（2026-04-09）
- node -e 中的反引号模板字符串在 PowerShell 下转义异常，复杂 JS 必须写文件再读取（2026-04-09）
- 发布按钮 `button.publish-content` 的 React 合成事件在 JS `.click()` 下只触发视觉反馈不执行发布，必须用 `/clickAt`（CDP `Input.dispatchMouseEvent`）（2026-04-10）
- 话题搜索是模糊匹配，去掉活动名标点（如「4月·每日幸运签」搜「4月每日幸运签」）仍可命中，不必逐字复制卡片标题标点（2026-04-10）
- 点击 `.forum-list-item` 可能生成重复的话题标签（两个相同 `.tteditor-forum` 元素），发布前需检查并 `.remove()` 多余的（2026-04-11）
