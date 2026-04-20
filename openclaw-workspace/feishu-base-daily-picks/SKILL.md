---
name: feishu-base-daily-picks
version: 1.0.0
description: 从飞书多维表格按日期筛选帖子，按价值观精选TOP N篇，写推荐理由，存入Obsidian。适用于知识星球/社区内容日报、精选集等场景。
metadata:
  requires:
    bins: ["lark-cli"]
  triggers:
    - "精选帖子"
    - "每日精选"
    - "日报"
    - "帖子推荐"
---

# 飞书多维表格每日精选

## 工作流

1. **获取表结构** — `+table-list` 拿 table-id，`+field-list` 拿字段列表
2. **按日期筛选记录** — `+record-list -q` 用 jq 过滤目标日期
3. **精选TOP N** — 按用户给定的筛选价值观选帖，写推荐理由
4. **存入Obsidian** — 写入对应目录

## 关键步骤详解

### 1. 拿字段顺序（踩坑点）

`+field-list` 返回的字段顺序和 `+record-list` 数据数组的字段顺序**可能不一致**！

- `+field-list` 返回：发布时间、作者、板块、链接、标题
- `+record-list` 实际数据数组：标题、发布时间、作者、链接、板块

**正确做法**：用 `+record-list` 返回的 `fields` 数组确认实际顺序，不要依赖 `+field-list` 的顺序。`fields` 数组与 `data` 数组一一对应。

### 2. 按日期筛选

**踩坑点**：`+field-list` 中 datetime 字段的 `style.format` 显示的是界面格式（如 `yyyy/MM/dd HH:mm`），但 `+record-list` 实际返回的是 `2026-04-10 11:46:19` 格式。

```bash
lark-cli base +record-list \
  --base-token TOKEN --table-id TID --limit 200 \
  -q '[.data.data as $rows | .data.record_id_list as $rids | range(0; $rids | length) | select($rows[.][1] | startswith("2026-04-10")) | {rid: $rids[.], title: $rows[.][0], time: $rows[.][1], author: $rows[.][2], link: $rows[.][3], category: $rows[.][4]}]'
```

- 用 `startswith("2026-04-10")` 匹配日期，**不要**用 `startswith("2026/04/10")`
- `-q` 的 jq 表达式中字段按 `fields` 数组顺序索引：`$rows[.][0]` 是第一个字段
- 如果记录超过200条，用 `--offset` 翻页继续筛

### 3. 精选逻辑

根据用户给的筛选价值观选帖。常见筛选维度：
- **自动化程度**：能用工具自动化的优先（打工族时间少）
- **副业变现**：有直接变现路径的优先
- **省时间避坑**：避坑指南比学习路径更实用
- **实操性**：有具体工具/步骤 > 纯理论/概念

未入选的帖子也用表格简评，说明未选原因，体现筛选逻辑透明。

### 4. 写作风格

- 口语化、简洁、有逻辑
- 每篇推荐：先说结论（为什么选），再展开1-2句具体理由
- 理由要扣住筛选价值观，不要泛泛而谈

### 5. 存入Obsidian

- 文件名：`YYYY-MM-DD 知识星球精选N篇.md`
- 推荐路径：`02-商业思维库/副业实战/`（或用户指定目录）
- 存完后用 `obsidian://open?vault=XXX&file=...` 在Obsidian中打开

## 模板

```markdown
# YYYY-MM-DD 知识星球精选N篇

> 数据源：[飞书多维表格](URL)
> 筛选标准：自动化 > 副业变现 > 省时间避坑
> 目标读者：时间有限的打工族，想靠副业多一份收入

---

## 1. 标题

- 作者：XXX｜板块：XXX
- 链接：[查看原文](URL)

**入选理由：** ...

---

## 未入选帖子简评

| 帖子 | 板块 | 未选原因 |
|------|------|---------|
| ... | ... | ... |
```

## 注意事项

- `+record-list` 单次最多返回200条（API硬上限），超量需 `--offset` 翻页
- jq 过滤在客户端执行，如果需要服务端聚合用 `+data-query`
- 所有 `+xxx-list` 命令禁止并发调用，必须串行
