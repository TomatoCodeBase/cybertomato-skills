---
name: skill-to-bitable
description: |
  将 OpenClaw skill 写入飞书多维表格（技能清单）。
  当用户要求"把XX技能写入表格"、"录入技能"、"技能登记"、"skill to bitable"时使用。
  也适用于批量录入多个技能到飞书多维表格。
---

# skill-to-bitable

将 skill 信息写入飞书多维表格"技能清单"。

## 目标表格

- **表格URL**: https://s0xpyu2kpl6.feishu.cn/base/MFJLbw5M1anokWsdJGmc9U4gn9f
- **表名**: 技能清单
- **Table ID**: `tbloJevtPScX147y`

## 字段映射

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 技能名称 | text | skill目录名（如 `ai-daily-report`） |
| 功能 | text | 一句话描述技能做什么 |
| 来源 | select | `clawhub` / `自建` / `社区` |
| 分类 | select | 飞书/浏览器/写作/金融/开发/搜索/自动化/数据可视化/安全/其他/排版/资讯采集/知识库 |
| 状态 | select | `启用` / `禁用` / `待审核` / `已废弃` |
| 触发词 | text | 触发关键词，逗号分隔 |
| 适用平台 | select | `Claude Code` / `OpenClaw` / `AutoClaw` |
| SKILL路径 | text | 相对路径，如 `~/.openclaw-autoclaw/skills/<name>/SKILL.md` |
| 质量评分 | number | 1-10 |
| 依赖 | text | 依赖的工具/环境/API |

## 执行流程

### 1. 读取 SKILL.md

从目标技能的 `SKILL.md` 提取信息：
- `name` → 技能名称
- `description` → 功能
- `metadata.openclaw.requires.env` → 依赖
- 正文中的触发词/关键词 → 触发词

```bash
SKILL_PATH="$env:USERPROFILE\.openclaw-autoclaw\skills\<skill-name>\SKILL.md"
```

如果 skill 不在默认目录，先搜索：
```bash
Get-ChildItem -Path "$env:USERPROFILE\.openclaw-autoclaw\skills" -Directory -Filter "*<keyword>*"
```

### 2. 判断分类

根据 description 和功能关键词匹配分类：
- 涉及飞书API → `飞书`
- 浏览器操作/CDP → `浏览器`
- 文章/文案/内容 → `写作`
- 股票/投资/交易 → `金融`
- 代码/编程/部署 → `开发`
- 搜索/爬取/采集 → `搜索`
- cron/定时/批量 → `自动化`
- 图表/仪表盘 → `数据可视化`
- 扫描/安全/检测 → `安全`
- 知识库/笔记/文档 → `知识库`
- 资讯/新闻/日报 → `资讯采集`
- 排版/PPT/格式 → `排版`
- 无法归类 → `其他`

### 3. 检查重复

写入前先搜索是否已存在同名记录：
```bash
lark-cli base +record-search --base-token MFJLbw5M1anokWsdJGmc9U4gn9f --table-id tbloJevtPScX147y --filter '<filter_json>'
```

如果已存在，询问用户是更新还是跳过。

### 4. 写入记录

使用 lark-cli 写入（**不用 feishu_bitable 工具**，该工具依赖 openclaw-lark 插件，可能不可用）：

```python
import subprocess, json

data = json.dumps({
    "技能名称": "<name>",
    "功能": "<description>",
    "来源": "<source>",
    "分类": "<category>",
    "状态": "启用",
    "触发词": "<triggers>",
    "适用平台": "<platform>",
    "SKILL路径": "<path>",
    "质量评分": <score>,
    "依赖": "<dependencies>"
}, ensure_ascii=False)

result = subprocess.run(
    ['D:\\OpenClaw\\lark-cli.CMD', 'base', '+record-upsert',
     '--base-token', 'MFJLbw5M1anokWsdJGmc9U4gn9f',
     '--table-id', 'tbloJevtPScX147y',
     '--json', data],
    capture_output=True, text=True, encoding='utf-8'
)
```

**⚠️ PowerShell 编码陷阱**：PowerShell 会把 JSON 中的中文拆成多个参数。必须用 Python `subprocess` 调用 lark-cli，不能直接在 PowerShell 中传 `--json`。

### 5. 更新记录（如需修改）

```python
result = subprocess.run(
    ['D:\\OpenClaw\\lark-cli.CMD', 'base', '+record-upsert',
     '--base-token', 'MFJLbw5M1anokWsdJGmc9U4gn9f',
     '--table-id', 'tbloJevtPScX147y',
     '--record-id', '<record_id>',
     '--json', json.dumps({"分类": "新分类"}, ensure_ascii=False)],
    capture_output=True, text=True, encoding='utf-8'
)
```

### 6. 删除记录

```python
result = subprocess.run(
    ['D:\\OpenClaw\\lark-cli.CMD', 'base', '+record-delete',
     '--base-token', 'MFJLbw5M1anokWsdJGmc9U4gn9f',
     '--table-id', 'tbloJevtPScX147y',
     '--record-id', '<record_id>',
     '--yes'],
    capture_output=True, text=True, encoding='utf-8'
)
```

## 批量录入

当用户要求录入多个技能时：
1. 扫描 `~/.openclaw-autoclaw/skills/` 下所有目录
2. 逐个读取 SKILL.md frontmatter
3. 跳过已存在的（按技能名称去重）
4. 批量写入，每条确认

## 质量评分参考

| 分数 | 标准 |
|------|------|
| 9-10 | 生产级，稳定可靠，日常高频使用 |
| 7-8 | 功能完整，偶有小问题 |
| 5-6 | 可用但有明显局限 |
| 3-4 | 实验性，不稳定 |
| 1-2 | 半成品/已废弃 |

## 来源判断

| 场景 | 来源 |
|------|------|
| 用户自己写的/本地创建的 | `自建` |
| 从 clawhub.com 安装的 | `clawhub` |
| 从 GitHub/社区获取的 | `社区` |
