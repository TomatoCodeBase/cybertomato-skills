---
domain: chinaz.com
aliases: [站长之家, chinaz]
updated: 2026-04-12
---

## 平台特征
- 综合科技新闻站，有 AI 频道但非纯 AI 站
- **JS 动态渲染**，curl + regex 提取不到有效内容
- **web_fetch / curl 无法提取新闻列表**，必须用 CDP Proxy 的 `/eval` 提取 DOM
- AI 新闻混杂在普通科技新闻中，需要关键词过滤

## 有效模式
- URL: https://www.chinaz.com/ai/ （AI频道）
- CDP `/new` 打开页面后，用 `/eval` 提取：
  ```javascript
  // 获取所有链接，按 AI 关键词过滤
  const aiKeywords = ['AI','人工智能','大模型','GPT','Claude','Gemini','DeepSeek','LLM','智谱','通义','文心','Kimi','豆包','Sora','Agent','机器学习','开源模型'];
  document.querySelectorAll("a[href]")
    .filter(a => aiKeywords.some(kw => a.textContent.includes(kw)))
  // 取 textContent 和 href，去重
  ```
- 链接格式：完整路径 `https://www.chinaz.com/xxxx/xxxxx.shtml`

## 已知陷阱
- AI 新闻占比低，大部分是普通科技/互联网新闻，必须关键词过滤
- 页面有大量广告和推广链接，需按 title 长度和去重过滤
- 某些链接是站内跳转链接（带 redirect），不是直接文章链接
- Python3 在 Git Bash 中对中文 URL 编码输出空字符串，URL 编码必须用 Node.js
