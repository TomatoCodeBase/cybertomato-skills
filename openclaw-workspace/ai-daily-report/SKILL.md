---
name: ai-daily-report
description: AI热点日报生成器。每天自动采集全球AI热点，整理为中文日报写入Obsidian。支持手动触发和cron定时执行。Automated AI news digest — crawls global AI headlines daily, curates a Chinese-language report, and writes to Obsidian. Supports manual trigger and cron scheduling.
when_to_use: |
  Use when user mentions: AI日报、AI热点、热点日报、采集日报、补采日报、AI news digest、AI daily report、daily AI roundup、AI headlines.
  Also use when user wants to generate a curated AI news digest, or review today's AI news.
argument-hint: "[YYYY-MM-DD]（可选，默认今天）"
---

# AI热点日报生成器

## 执行流程

```
Step 1: 读配置 → 数据源列表、x_accounts
Step 2: Tier 1 采集 → AIbase + 站长之家 + 36氪
Step 3: 去重合并
Step 4: Tier 2 补充 → web_search + x_search + 海外源
Step 5: CP1 确认 → 采集条目数+标题摘要
Step 6: 编写日报 → 按格式模板，生成金句标题
Step 7: CP2 跳过 → 标题自行决定
Step 8: 写入 Obsidian → write_file 直写 vault
Step 9: 打开 Obsidian
Step 10: 微头条存档
Step 11: 管线衔接检查（必做）
```

## 采集

**工具优先级：`mcp_web_reader_webReader` > curl 直连（Windows 常失败，仅作备用）> CDP > Jina**
> ⚠️ 实战经验：curl 在 Windows 环境三个 Tier 1 源均返回空，mcp_web_reader_webReader 是最可靠的首选。不要浪费时间先试 curl 再降级。

| 源 | URL | Tier | 抓取方式 | Reference |
|---|-----|------|----------|-----------|
| AIbase | https://www.aibase.com/zh/news | 1 | curl优先，链接格式`/news/NNNNN` | references/aibase.com.md |
| 站长之家AI | https://www.chinaz.com/ai/ | 1 | curl优先，标题在`<h3>` | references/chinaz.com.md |
| 36氪 | https://36kr.com/information/AI/ | 1 | curl优先（124KB+） | references/36kr.com.md |
| The Verge AI | https://www.theverge.com/ai-artificial-intelligence | 2.5 | 跳过（国内被墙） | - |
| VentureBeat AI | https://venturebeat.com/category/ai/ | 2.5 | CDP | - |
| Hacker News | https://news.ycombinator.com/ | 2.5 | Firebase API | - |

- Tier 1 提取80%+内容，Tier 2 搜索补充海外重大事件前3条
- x_search 缺 Brave API key 时跳过
- **不要用 delegate_task 做网页抓取**（子Agent无CDP proxy）
- 每个源的详细DOM提取模式见 references/ 目录，不在SKILL.md重复

## 写日报前必做

**确认日期**（每次重新确认，不能靠猜）：
```javascript
// browser_console expression:
new Date(Date.now() + 8*3600000).toISOString().slice(0,10) + ' weekday=' + (new Date(Date.now() + 8*3600000).getDay()===0?7:new Date(Date.now() + 8*3600000).getDay())
```

**数字/事实必须过原文**：标题党会省略关键限定词，对关键新闻进原文扫一遍再写。

**摘要找反差/对比**：不是复述事件，而是把最有冲击力的对比拉出来。

## 日报格式

```markdown
# [金句标题：两个冲突/对比事件并列，有画面感]

> 日期：YYYY-MM-DD 周X

## 🔥 今日重点
## 🛠️ 产品与技术
## 💬 业界观点
## 🇨🇳 国内动态
## 📌 值得关注

---
*数据来源：[实际使用的源]*
*采集时间：YYYY-MM-DD HH:mm CST*
```

## 标题原则

- ✅ 「大模型变成打工人：GLM-5.1连续工作8小时，GPT-4o之母出走OpenAI」
- ❌ 「AI热点日报 2026-04-09」
- ❌ 「今日AI新闻汇总」
- 每条新闻标题要有信息量，不只是公司名

## 分级体系（融合日报复用此定义）

| 级别 | emoji | 含义 | 深度 |
|------|-------|------|------|
| S级 | 🎯 | 今日可用 | 3-5句，说清「你能拿它做什么」 |
| A级 | ⚡ | 能力升级 | 2-3句，说清影响 |
| B级 | 📰 | 行业快讯 | 1-2句，简明 |
| C级 | 🧠 | 值得深读 | 1-2句，说清价值点 |

**三筛原则**：①能复利？②能自动化？③打工族今天能用？

**偏好权重**（普适性洞见 > 情境性观点，思维模式 > 具体结论，可迁移智慧 > 专属经验）：
1. 免费API/开源模型+实操方法论 → S级核心素材
2. 能改变工作方式的教程（附具体步骤）> 产品功能发布
3. 行业格局变化（估值/收购/架构） → A级
4. 特定场景产品/工具（电子衣橱、社交AI等） → B/C级，不占S/A
5. 知识库资源有「看完能做什么」的价值点才值得C级

**S级≤2条**（铁律，不可违反）。S级门槛：今天花1小时配置，以后每天省1小时的杠杆项。

## 写入

**首选 write_file 直写 vault**：
```python
write_file(path="D:/cybertomato/03-内容工厂/日报/AI热点日报/YYYY-MM-DD-AI热点日报.md", content="...")
```

降级用 Obsidian REST API（localhost:27123），需 `Bearer $OBSIDIAN_API_KEY`，中文路径用 Node.js encodeURIComponent。

## Step 10：微头条存档

日报写入后立即生成，选3-4条S/A级热点改写为口语化微头条（300-500字），存档路径：
`D:\cybertomato\03-内容工厂\日报\微头条存档\{YYYY-MM-DD}-微头条.md`

存档即成品，不自动发布，用户说「发微头条」时用 toutiao-auto 发布。

## Step 11：管线衔接检查（不可跳过）

```bash
ls D:/cybertomato/03-内容工厂/日报/补充信息/YYYYMMDD* 2>/dev/null
```
- 有补充文件 → 告知用户，执行 ai-daily-report-merge
- 无补充文件 → 汇报「日报 ✓，微头条 ✓，无补充信息跳过融合」

## 检查点

| 检查点 | 时机 | 说明 |
|--------|------|------|
| CP1 | 采集后、写日报前 | 展示条目数+标题摘要，用户确认覆盖面 |
| CP2 | **跳过** | 标题自行决定 |
| CP3 | 融合版草稿后 | 展示预览，用户确认分级 |

cron模式跳过所有检查点，顶部标注 `[自动采集，未人工审核]`。

## 故障速查

| 问题 | 处理 |
|------|------|
| Windows终端输出为空 | 用 browser_console expression 或 background=true |
| Jina返回空 | 不要依赖Jina，用curl或mcp_web_reader |
| curl提取0条 | 检查链接格式和HTML结构，详见references/ |
| Obsidian写入500 | 中文路径未URL编码，用Node.js |
| web_search_prime 全返回空 | 已知问题，6次不同查询均返回`[]`。降级用 mcp_web_reader_webReader 直接抓海外源（HN、VentureBeat），或跳过搜索补充 |
| VentureBeat web_reader 内容偏旧 | 页面可能是缓存版（实测返回2025-08内容），不可作为当天新闻源，仅作历史参考 |
| 子Agent终端不可用 | 采集在主会话用curl+Python完成 |
| 站长之家数据偏旧 | AIbase和36氪更新更快，站长之家当补充 |
| delegate_task做web采集 | 不适用，子Agent无CDP proxy和可靠终端 |
| Python /tmp/ 路径 | Windows不识别MINGW路径，用 D:/tmp/ |
| AIbase标题带后缀 | textContent含「X小时前.AIbase」，需清洗 |

## 质量标准

- 严格用事实，不编造
- 每条附来源链接
- 总条目 15-25 条，新闻少时每板块可减到2条不凑数
- 每条正文至少40-80字
- 产品类必须有功能定位描述
- CDP使用后关闭所有自创建tab
