---
name: ai-daily-report
description: AI热点日报生成器。每天自动采集全球AI热点，整理为中文日报写入Obsidian。支持手动触发和cron定时执行。Automated AI news digest — crawls global AI headlines daily, curates a Chinese-language report, and writes to Obsidian. Supports manual trigger and cron scheduling.
when_to_use: |
  Use when user mentions: AI日报、AI热点、热点日报、采集日报、补采日报、AI news digest、AI daily report、daily AI roundup、AI headlines.
  Also use when user wants to generate a curated AI news digest, or review today's AI news.
argument-hint: "[YYYY-MM-DD]（可选，默认今天）"
---

# AI热点日报生成器

## 完整执行流程

```
Step 1: 读取配置 → 获取数据源列表、x_accounts等
Step 2: Tier 1 采集 → CDP抓取 AIbase + 站长之家 + 36氪
Step 3: 去重合并 → 按标题相似度去重，同一事件只保留信息量最大的一条
Step 4: Tier 2/2.5 补充 → web_search + x_search + 海外源（尽量做）
Step 5: CP1 确认 → 展示采集条目数+标题摘要，用户确认覆盖面
Step 6: 编写日报 → 按格式模板填充，生成2个候选标题
Step 7: CP2 确认 → 用户选择/修改标题
Step 8: 写入 Obsidian → curl PUT + 验证
Step 9: 打开 Obsidian → obsidian:// URI
```

## 配置

读取配置文件获取数据源和采集策略：
```bash
# 优先读取 Hermes 标准路径
node -e "const fs=require('fs'),path=require('path'),p=path.join(require('os').homedir(),'.hermes','config','ai-daily-report.json'); if(fs.existsSync(p)){console.log(JSON.stringify(JSON.parse(fs.readFileSync(p,'utf-8')),null,2))}else{console.error('Config not found: '+p)}"
```

⚠️ **备选路径**：如果上述路径不存在，检查 `$HERMES_HOME/config/ai-daily-report.json` 或 `D:/OpenClaw/workspace/config/ai-daily-report.json`（Windows 共享文件系统）。

## 数据源与采集

**核心原则：国内聚合源信息密度最高，一次fetch拿全量。搜索是补充，不是主力。**

所有数据源均需 **CDP Proxy（web-access skill）抓取**（JS渲染SPA，curl无法提取）。每个源的详细 DOM 提取模式和已知陷阱见 references 目录下的独立文件。

| 源 | URL | Tier | 抓取方式 | DOM 提取模式 | Reference |
|---|-----|------|----------|-------------|-----------|
| AIbase | https://www.aibase.com/zh/news | 1（必须） | CDP | `document.querySelectorAll("a[href*='/news/']")` → textContent + href；⚠️ 标题含 `X小时前.AIbase` 需清洗 | aibase.com.md |
| 站长之家AI | https://www.chinaz.com/ai/ | 1（必须） | CDP | `document.querySelectorAll("a[href]")` → 按 AI 关键词过滤 | chinaz.com.md |
| 36氪 | https://36kr.com | 1（必须） | CDP | 同站长，用 `/eval` 提取含 AI 关键词的链接；⚠️ 偶尔触发反爬验证码，重试一次 | 36kr.com.md |
| The Verge AI | https://www.theverge.com/ai-artificial-intelligence | 2.5（补充） | web_fetch（SSR） | ⚠️ 国内被墙，CDP返回 chrome-error，跳过 | theverge.com.md |
| VentureBeat AI | https://venturebeat.com/category/ai/ | 2.5（补充） | CDP（JS渲染） | - | venturebeat.com.md |
| Hacker News | https://news.ycombinator.com/ | 2.5（补充） | web_fetch / Firebase API | - | news.ycombinator.com.md |

从 Tier 1 提取80%以上的日报内容。

### 采集流程

1. 启动 CDP Proxy：`bash "$HERMES_HOME/skills/openclaw-workspace/web-access/scripts/check-deps.sh"`
2. 用 `/new` 打开目标页面，用 `/eval` 提取 DOM（提取模式见上表）
3. 完成后 `/close` 关闭所有自建 tab
4. Tier 2 搜索：在 CDP 中打开 Google 搜索，用 `/eval` 提取 `h3` 标题和链接
5. ⚠️ URL 编码用 Node.js（Python3 在 Git Bash 中有中文编码问题）：
   ```bash
   node -e "console.log(encodeURIComponent('中文路径').replace(/%2F/g, '/'))"
   ```

### 去重规则（Step 3）

三个国内源必然有重复新闻。去重策略：
- **标题相似度**：去掉标点后比较，相似度 >80% 视为同一条（如"XX发布新模型"和"XX 发布新大模型"）
- **URL 去重**：同一事件的不同源报道 → 保留信息量最大的一条，在来源中标注所有源
- **跨源合并**：同一公司的不同新闻（如"豆包上线"和"豆包封杀"）不合并，分别保留

### 搜索补充（Tier 2，尽量做）

1. web_search 搜索海外重大事件，取前3条
2. x_search 搜索行业大佬动态（配置中的 x_accounts），各1条

### 降级策略（Tier 3）

- web_search 失败 → web_fetch 直接抓 Tier 2.5 的网站
- x_search 失败 → 跳过（X动态是锦上添花）
- **不要因为搜索失败就重试多次**，Tier 1 已经足够出高质量日报

⚠️ **新增数据源时**：reference 文件写到 Obsidian vault 的 `数据源/` 目录，Hermes skills 目录的副本仅供加载时参考。

## 日报格式

```markdown
# [金句标题：两个冲突/对比事件并列，有画面感]

> 日期：YYYY-MM-DD 周X

## 🔥 今日重点
（3-5条最重要的新闻，每条：**标题**+一句话摘要+来源链接）

## 🛠️ 产品与技术
（3-5条产品发布、新功能、开源模型等）

## 💬 业界观点
（2-3条大佬观点或深度讨论）

## 🇨🇳 国内动态
（2-3条国内AI相关动态）

## 📌 值得关注
（1-2条深度文章或教程推荐）

---

*数据来源：[列出实际使用的源]*
*采集时间：YYYY-MM-DD HH:mm CST*
```

### 标题写作原则

- **主标题**：两个冲突/对比事件的并列句，有画面感
  - ✅ "大模型变成打工人：GLM-5.1连续工作8小时，GPT-4o之母出走OpenAI"
  - ✅ "开源大模型集体大逃杀：MiniMax 2.7免费，Anthropic 却涨到 3500 亿"
  - ❌ "AI热点日报 2026-04-09"
  - ❌ "今日AI新闻汇总"
- **每条新闻标题**：有信息量，不只是公司名
  - ✅ "哈啰MCP服务上线：AI直接替你叫车"
  - ❌ "哈啰发布新功能"

## 故障处理

| 问题 | 处理 |
|------|------|
| web_fetch 源站超时 | 跳过该源，用其他源补充 |
| web_search 全部失败 | 正常，靠 Tier 1 就够 |
| Obsidian 写入 401 | 缺少 Authorization 头，需 `Bearer $OBSIDIAN_API_KEY` |
| Obsidian 写入 500 + 编码错误 | 中文路径未 URL 编码，用 Node.js encodeURIComponent |
| Obsidian 写入失败 | 检查 API 是否运行（localhost:27123） |
| 写入后内容是 JSON | Body 被错误包装了，确保是纯 Markdown |
| 飞书多维表格 CDP 提取为空 | 飞书 Base 是 canvas/shadow DOM 渲染，querySelector 无效。**首选方案**：用 `lark-cli base +record-list --base-token TOKEN --table-id TABLE_ID --limit 100` 直接读取记录（已验证可用，2026-04-15）。从飞书 URL `/base/{token}?table={table-id}` 提取 token 和 table-id。截图+OCR 和 vision_analyze 均不可靠（超时/模块缺失） |
| vision_analyze 本地文件路径失败 | Windows/MINGW64 下本地路径不稳定，优先考虑其他方式 |
| The Verge 国内被墙 | CDP 返回 chrome-error://chromewebdata，跳过此源，用 VentureBeat 和 Hacker News 补充 |
| AIbase 标题带时间戳和后缀 | textContent 含 `X小时前.AIbase标题...`，需清洗掉时间戳和 `.AIbase` |
| 36氪反爬验证码 | CDP 访问偶尔触发，重试一次，失败则跳过 |
| Python3 中文 URL 编码 | Git Bash 中 urllib 输出空字符串，URL 编码必须用 Node.js |

## 写入 Obsidian

路径：`03-内容工厂/日报/YYYY-MM-DD-AI热点日报.md`

需要 `OBSIDIAN_API_KEY` 环境变量（已在 .env 中配置）。

⚠️ Obsidian REST API 的 `/vault/` 路径已经是 vault 根目录，不要在路径前再加 vault 名前缀。

```bash
# URL 编码中文路径（必须用 Node.js，Python3 在 Git Bash 中会输出空字符串）
ENCODED_PATH=$(node -e "
const p = '03-内容工厂/日报/YYYY-MM-DD-AI热点日报.md';
console.log(encodeURIComponent(p).replace(/%2F/g, '/'));
")

# 写入文件（--data-binary 保留换行和中文）
curl -s -X PUT "http://localhost:27123/vault/$ENCODED_PATH" \
  -H "Authorization: Bearer $OBSIDIAN_API_KEY" \
  -H "Content-Type: text/markdown; charset=utf-8" \
  --data-binary @/path/to/daily-report.md

# 验证写入（正常应返回 "# " 开头的 Markdown，不是 JSON）
curl -s "http://localhost:27123/vault/$ENCODED_PATH" \
  -H "Authorization: Bearer $OBSIDIAN_API_KEY" | head -c 100
```

⚠️ Body 必须是纯 Markdown 文本，不要 JSON.stringify 或用引号包装。

## 打开 Obsidian

```powershell
# vault 参数是 vault 名，file 参数相对于 vault 根目录
start "obsidian://open?vault=VAULT_NAME&file=03-内容工厂/日报/YYYY-MM-DD-AI热点日报.md"
```

⚠️ 将 `VAULT_NAME` 替换为实际的 Obsidian vault 名称。

## 子流程：融合补充（主流程完成后的可选增强）

> **触发条件**：用户在主流程（Step 1-9）完成后说"融合"、"合并补充"等。
> **前置依赖**：自动日报已生成（Step 8 已完成）。无自动日报时无法融合。
> **与主流程的关系**：融合是主流程的**后续可选步骤**，不是替代。主流程产出自动采集版，融合产出增强版（番茄AI热点日报），两者并存。

用户常在自动日报之外，手工收集补充信息（观猹每日上新、通往AGI知识库更新、语鲸日报等），需要将两份来源融合为一份完整日报。

### 输入来源

| 来源 | 位置 | 格式 |
|------|------|------|
|| 自动日报 | `03-内容工厂/日报/YYYY-MM-DD-AI热点日报.md`（通过 Obsidian API 读取） | Markdown（上一流程的输出） ||
|| 手工补充 | `D:\\cybertomato\\03-内容工厂\\日报\\补充信息\\` 目录下的文件 | Markdown ||

**补充信息目录规则（2026-04-17 新增）：**

- 目录路径：`D:\cybertomato\03-内容工厂\日报\补充信息\`
- 文件命名格式：`YYYYMMDDHHMMSS--来源名.md`
  - 日期部分：8位日期 + 6位时分秒（如 `20260417065706`）
  - 来源标签：`--` 后面到 `.md` 前面的部分（如 `waytoagi`、`观猹`）
- 一天可能有多条补充文件（不同来源各一个文件）

**搜索当天所有补充文件：**
```bash
# 用 search_files(target='files', path='D:\\cybertomato\\03-内容工厂\\日报\\补充信息')
# pattern 用日期前缀：YYYYMMDD*（如 20260417*）
# 可匹配当天所有补充文件，忽略时分秒部分
```

来源标签直接从文件名 `--` 后面提取，作为融合版中的来源标注。

⚠️ 如果用户说"融合日报"但补充信息目录下当天没有文件，主动询问："今天补充信息目录下没有找到文件，请提供手工补充信息，可以粘贴文本或告诉我文件路径。"

### 融合流程

1. 在 `03-内容工厂/日报/` 目录下直接写入融合版文件 `YYYY-MM-DD-番茄AI热点日报.md`（与自动采集版平铺，不建子文件夹）
2. 读取自动日报和手工补充信息
3. 按以下规则合并后写入融合版

### 融合规则

**重复合并**：
- 同一事件出现在两份来源中 → 合并为一条，取信息量更大的描述，补充另一份的独有细节
- 同一公司/主题的不同维度事件（如"豆包手机封杀"+"Seeduplex语音上线"）→ 合并为专题，用子项列出

**分级体系**（A+B混合：先分级再按主题分组）：

| 级别 | emoji标题 | 含义 | 正文深度要求 |
|------|-----------|------|-------------|
| S级 | 🔥 今日重点 | 影响全局的标志性事件 | 每条3-5句，必须说清"为什么重要" |
| A级 | ⚡ 格局变化 | 行业格局性变化 | 每条2-3句完整描述 |
| B级 | 🛠️ 产品与技术 | 新发布与更新 | 每条2句，产品必须有功能描述 |
| C级 | 📌 动态与观点 | 行业背景信息 | 每条1-2句 |

**分级后在每个级别内按主题域分组**（安全与监管、模型竞赛、硬件与端侧、创作者生态、工具与开发等）。

### 融合版质量红线（踩到即不合格）

1. **主标题必须是金句风格** — 两个冲突/对比事件并列，有画面感。绝不能用"YYYY-MM-DD AI热点日报（融合版）"这种文件名当标题
2. **每条新闻信息量必须达标** — 绝不能只有半句话。如果补充信息原文太简略，基于标题和常识补足2-3句合理描述
3. **产品上新必须有功能描述** — 不能只有名字+链接，读者不知道这是干嘛的
4. **知识库/资源推荐必须有一句话价值点** — 告诉读者"看这条能学到什么"
5. **S级新闻必须有分析纵深** — 不能一句话带过，要展开"为什么重要""影响什么"
6. **不要在日报正文里放融合说明表** — 元信息（处理了哪些重复项、新增了什么）不属于日报内容

## 检查点（人工确认环节）

以下节点必须暂停等待用户确认后再继续：

| 检查点 | 时机 | 确认内容 |
|--------|------|----------|
| **CP1: 采集结果审核** | Tier1+Tier2 全部完成后、写日报前 | 展示采集到的条目数量和标题摘要，用户确认覆盖面是否足够 |
| **CP2: 标题确认** | 主标题写好后 | 展示候选标题（至少2个），用户选择或修改 |
| **CP3: 融合确认** | 融合版草稿完成后、写入Obsidian前 | 展示融合结果预览，用户确认分级和去重是否合理 |

**自动模式例外**：cron 定时执行时跳过所有检查点，直接按默认流程写入。但在写入的日报顶部标注 `[自动采集，未人工审核]`。

## 质量标准

- 严格用事实，不编造新闻
- 每条必须附来源链接
- 总条目目标：15-25条（不是越多越好，但要有足够覆盖面）
- 如果当天新闻少，每个板块可以缩减到2条，不要凑数
- 如果使用了 CDP，完成后关闭所有自己创建的 tab
- 每条新闻正文至少40-80字，信息量让人看懂"为什么这条新闻重要"
- 产品类条目必须有功能定位描述，不能只写名字
