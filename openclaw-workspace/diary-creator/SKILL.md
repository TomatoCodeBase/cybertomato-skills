---
name: diary-creator
description: 番茄日记创建工具。基于 Obsidian 模板自动创建日记文件。触发词：新建日记、写日记、补日记。无参数创建今天日记，带日期参数可补建历史日记。已存在的日记不覆盖，直接打开。
---

# 番茄日记创建器

## 触发场景

- 用户说"新建日记" → 创建今天的日记
- 用户说"新建日记 2026-03-25" → 补建指定日期
- 用户说"写日记"、"补日记" → 同上

## 执行流程

1. 运行脚本：`node {SKILL_DIR}/scripts/create-diary.cjs [YYYY-MM-DD]`
2. 脚本自动完成：
   - 检查 Obsidian API（端口 27123）
   - 检查日记是否已存在（已存在则打开，不覆盖）
   - 从磁盘读取模板：`D:\cybertomato\00-个人日记\番茄日记\番茄日记模板.md`
   - 替换日期占位符（`YYYY-MM-DD` → 实际日期）
   - 写入到：`00-个人日记/番茄日记/{date}.md`
   - 在 Obsidian 中打开文件

## 输出说明

- `CREATED` → 新建成功
- `EXISTS` → 已存在，已打开
- `ERROR` → Obsidian 未启动或 API 不可用 → 提示用户打开 Obsidian

## 回复用户

简洁告知结果：
- "✓ 日记已创建：{日期}" 
- "✓ 今天的日记已存在，已打开"

## 依赖

- Obsidian 运行中 + Local REST API 插件启用
- 模板文件存在于磁盘
- 环境变量 `OBSIDIAN_API_KEY`
