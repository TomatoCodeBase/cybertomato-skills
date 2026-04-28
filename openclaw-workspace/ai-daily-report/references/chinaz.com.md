---
domain: chinaz.com
aliases: [站长之家, chinaz]
updated: 2026-04-22
---

## 平台特征
- 综合科技新闻站，有 AI 频道但非纯 AI 站
- **SSR 渲染**，curl 可拿到完整 HTML（~212KB，2026-04-22 验证）
- Jina (r.jina.ai) 可能返回空内容（2026-04-22 验证），不可靠
- [[CDP|CDP]] `/eval` 因 GBK 编码可能返回乱码，遇到乱码切回 curl
- AI 新闻混杂在普通科技新闻中，需要关键词过滤
- 单页约 20 条 AI 相关新闻（过滤后）

## 有效模式
- URL: https://www.chinaz.com/ai/ （AI频道）
- **curl 直接抓取**（最可靠，2026-04-22 验证）：
  ```bash
  curl -s -m 20 -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
    "https://www.chinaz.com/ai/" > chinaz_raw.html
  ```
- **Python 正则提取**（2026-04-22 验证可用）：
  ```python
  # 标题在 <h3> 标签中，对应的 <a href> 在 <h3> 之前的 500 字符内
  for m in re.finditer(r'<h3>([^<]+)</h3>', html):
      title = m.group(1).strip()
      before = html[max(0, m.start()-500):m.start()]
      link_match = re.findall(r'href=["\x27](https?://[^"\x27]+)["\x27]', before)
      url = link_match[-1] if link_match else ''
  # 用 AI 关键词列表过滤非 AI 内容
  ```
- 链接格式：完整路径 `https://www.chinaz.com/xxxx/xxxxx.shtml`

## 已知陷阱
- AI 新闻占比低，大部分是普通科技/互联网新闻，必须关键词过滤
- 页面有大量广告和推广链接，需按 title 长度和去重过滤
- 某些链接是站内跳转链接（带 redirect），不是直接文章链接
- Python3 在 Git Bash 中对中文 URL 编码输出空字符串，URL 编码必须用 Node.js
- **不要用 delegate_task 做网页抓取**：子Agent会尝试 browser_navigate（依赖 agent-browser 模块），而不是 [[CDP|CDP]] proxy 或 curl
