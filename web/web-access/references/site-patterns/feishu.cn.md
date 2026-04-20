---
domain: feishu.cn
aliases: [飞书, Feishu, feishu, lark]
updated: 2026-04-16
---

## 平台特征

- 飞书 wiki 长文档使用**虚拟渲染**：即使 `scrollHeight` 高达 72000+px，DOM 中实际只保留视口附近的一小段内容（可能只有 300-700 chars）
- 滚动页面（`window.scrollBy`、`.bear-web-x-container.scrollTop`）**不会**触发更多内容加载到 DOM 中
- 正文编辑器容器是 `.editor-container`，外部滚动容器是 `.bear-web-x-container`（class 含 `catalogue-opened docx-in-wiki`）
- 目录（catalogue）在右侧面板 `.catalogue .catalogue__main` 中，目录项是 `<a>` 标签带 `#hash` 锚点

## 有效模式

### 通过目录链接触发内容加载（唯一可靠方式）

1. 用 `/eval` 提取所有目录链接：
   ```js
   // 获取目录结构和链接
   Array.from(document.querySelectorAll('.catalogue a')).map(a => a.innerText.trim() + ' -> ' + a.href)
   ```
2. 逐个点击目录链接，每次点击后等 1-2 秒，飞书会将对应章节内容加载到虚拟 DOM：
   ```bash
   curl -s -X POST "http://localhost:3456/click?target=ID" -d 'a[href="#doxcnXXXXX"]'
   sleep 2
   ```
3. 用 TreeWalker 提取当前 DOM 中所有文本节点（比 `.innerText` 覆盖更全）：
   ```js
   (() => {
     const walker = document.createTreeWalker(
       document.querySelector('.editor-container'),
       NodeFilter.SHOW_TEXT, null
     );
     let text = '', node;
     while (node = walker.nextNode()) {
       const t = node.textContent.trim();
       if (t) text += t + '\n';
     }
     return text;
   })()
   ```
4. 对每个感兴趣的章节重复 点击->提取 流程，拼接完整内容

### Jina / 静态抓取

- Jina (`r.jina.ai`) 对飞书 wiki 文档**返回空内容**（2026-04-16 测试）
- 飞书 wiki 需要登录态，静态方式无法获取正文

## 已知陷阱

- **直接滚动不会加载内容**：`/scroll` 和 `scrollTop = N` 都无法触发飞书的虚拟渲染加载更多内容（2026-04-16）
- **DOM 文本量不随滚动增长**：无论怎么滚动，`.editor-container.innerText.length` 始终很小（300-700 chars）
- **点击目录链接是唯一触发内容加载的方式**：只有通过点击目录中的锚点链接，飞书才会将对应章节渲染到 DOM
- **内容是覆盖式的**：点击新章节后，之前章节的内容可能从 DOM 中消失，所以需要每点击一个就提取一次
- **飞书文档可能嵌套在知识库 wiki 中**：URL 格式为 `feishu.cn/wiki/XXXX`，带有左侧知识库导航树和右侧目录面板
