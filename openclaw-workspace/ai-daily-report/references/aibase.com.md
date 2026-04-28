---
domain: aibase.com
aliases: [AIbase, AI基地]
updated: 2026-04-22
---

## 平台特征
- 国内AI新闻聚合平台，更新频率极高（每分钟都有新条目）
- **Next.js SPA**，服务端渲染（SSR），curl 可拿到完整 HTML（~190KB）
- 单页包含 20-30 条新闻
- Jina (r.jina.ai) 可能返回空内容（2026-04-22 验证），不可靠
- [[CDP|CDP]] `/eval` 因 GBK 编码可能返回乱码，遇到乱码切回 curl

## 有效模式
- URL: https://www.aibase.com/zh/news
- **curl 直接抓取**（最可靠，2026-04-22 验证）：
  ```bash
  curl -s -m 20 -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
    "https://www.aibase.com/zh/news" > aibase_raw.html
  ```
- **Python 正则提取**（2026-04-22 验证可用）：
  ```python
  # 链接格式是 /news/NNNNN（不是 /zh/news/XXXXX）
  # 标题在 <h3> 标签内，嵌套在 <a href="/news/NNNNN"> 块中
  re.finditer(r'<a[^>]*href=["\x27](/news/\d+)["\x27][^>]*>(.*?)</a>', html, re.DOTALL)
  # 对每个匹配的 body 提取 h3:
  re.search(r'<h3[^>]*>(.*?)</h3>', body, re.DOTALL)
  ```
- [[CDP|CDP]] `/new` 打开页面后，用 `/eval` 提取：
  ```javascript
  document.querySelectorAll("a[href*='/news/']")
  // 取 textContent（含标题+摘要）和 href
  ```
- 链接格式：相对路径 `/news/NNNNN`（注意：不带 `/zh/` 前缀），补全为 `https://www.aibase.com/news/NNNNN`
- 时间标记格式：`X 小时前.AIbase`，混杂在标题前的 `<span>` 中

## 已知陷阱
- 部分标题带 `.AIbase` 后缀（来源标记），提取时需去掉
- textContent 中包含时间戳和来源后缀（如 `5 小时前.AIbase`），需清洗
- 链接是 `/news/27325` 格式而非 `/zh/news/27325`，正则模式不要硬编码 `/zh/`
- Python3 在 Git Bash 中对中文 URL 编码输出空字符串，URL 编码必须用 Node.js
- Jina 和 web_fetch 都可能返回空，curl 直接抓 HTML + Python 解析是最可靠的降级方案
- **不要用 delegate_task 做网页抓取**：子Agent会尝试 browser_navigate（依赖 agent-browser 模块），而不是 [[CDP|CDP]] proxy 或 curl
