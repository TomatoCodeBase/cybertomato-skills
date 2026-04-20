---
domain: aibase.com
aliases: [AIbase, AI基地]
updated: 2026-04-12
---

## 平台特征
- 国内AI新闻聚合平台，更新频率极高（每分钟都有新条目）
- **Next.js SPA**，服务端渲染但内容嵌入 `__NEXT_DATA__` JSON，curl + regex 无法直接提取
- **web_fetch 可提取新闻列表**（2026-04-19 验证），优先用 web_fetch，CDP 是降级方案
- CDP `/eval` 因 GBK 编码可能返回乱码，遇到乱码切回 web_fetch
- 单页包含 20-30 条新闻

## 有效模式
- URL: https://www.aibase.com/zh/news
- CDP `/new` 打开页面后，用 `/eval` 提取：
  ```javascript
  document.querySelectorAll("a[href*='/news/']")
  // 取 textContent（含标题+摘要）和 href
  ```
- 链接格式：相对路径 `/zh/news/XXXXX`，需补全为 `https://www.aibase.com/zh/news/XXXXX`
- 时间标记格式：`1 天前.AIbase` / `X小时前.AIbase`，混杂在 textContent 开头

## 已知陷阱
- 部分标题带 `.AIbase` 后缀（来源标记），提取时需去掉
- textContent 中包含时间戳和来源后缀（如 `1 天前.AIbase标题...`），需清洗
- 首页有广告和推荐区块，但 CDP eval 选择器 `a[href*='/news/']` 可精确过滤
- 链接是相对路径，不能直接当来源链接使用
- Python3 在 Git Bash 中对中文 URL 编码输出空字符串，URL 编码必须用 Node.js
