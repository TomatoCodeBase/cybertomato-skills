---
domain: news.ycombinator.com
aliases: [Hacker News, HN, YC News]
updated: 2026-04-12
---

## 平台特征
- 技术社区热点聚合，由 Y Combinator 运营
- 用户提交+投票机制，高票帖子代表社区关注焦点
- 纯服务端渲染（经典 HTML），web_fetch / curl 可直接提取
- 需翻墙访问
- 适合捕获技术社区讨论热点，尤其是开源项目发布

## 有效模式
- URL: https://news.ycombinator.com/
- 首页直接 fetch 即可，HTML 结构非常规整
- 也可用官方 API：`https://hacker-news.firebaseio.com/v0/topstories.json`
  → 取前 20 个 ID → `https://hacker-news.firebaseio.com/v0/item/{id}.json` 获取详情
- AI 相关帖子可通过标题关键词过滤：AI, LLM, GPT, Claude, model, open source, transformer

## 提取要点
- 标题即帖子标题，附带原文链接和讨论链接
- 评论数和分数反映热度，高票（>200分）通常是重要事件
- 适合 "🛠️ 产品与技术" 和 "📌 值得关注" 板块

## 已知陷阱
- 首页只有 30 条，且非全部 AI 相关，需关键词过滤
- 需翻墙，国内环境可能无法访问
- 社区偏技术向，产业/商业新闻较少
- 帖子质量波动大，需看分数筛选
