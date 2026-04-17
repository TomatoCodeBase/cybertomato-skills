---
name: session-notes
description: 会话笔记生成与整理，参考Claude Code SessionMemory
when_to_use: 用户说"整理笔记"、"session notes"、"会话笔记"时
---

# Session Notes Skill

会话笔记自动生成工具。从当前会话上下文中提取关键信息，按标准模板整理保存。

## 触发词

`整理笔记`、`session notes`、`会话笔记`

## 执行流程

1. 扫描当前会话上下文（工具调用、文件操作、错误、决策）
2. 按下方模板填充各区域，无内容的区域留空或写 `（无）`
3. 保存到 `memory/session-notes/YYYY-MM-DD-HHmm.md`
4. 如果同一天已有文件（同日期前缀），更新该文件对应区域而非新建

## 模板

```markdown
# {Session Title}

> {YYYY-MM-DD HH:mm} | 会话笔记

## Current State

当前进展与待办：
-

## Task Specification

本次任务目标与要求：

## Files and Functions

| 文件/路径 | 用途 |
|-----------|------|
| | |

## Workflow

常用命令与执行顺序：
1. ``
2. ``

## Errors & Corrections

| 错误 | 修复方式 |
|------|----------|
| | |

## Codebase Documentation

关键组件与架构说明：

## Learnings

- 

## Key Results

- 

## Worklog

| 时间 | 操作 |
|------|------|
| | |
```

## 规则

- **Session Title**：5-10个字的密集标题，概括本次会话核心
- **风格**：简洁信息密集，中文为主，技术术语保留英文
- **每个区域 ≤ 2000 token**
- **Worklog** 只记录关键步骤，不含常规读写
- **Learnings** 记录本次会话中新发现的、可复用的经验
- **Errors & Corrections** 只记有价值的坑，跳过显而易见的错误
- 自动创建 `memory/session-notes/` 目录（如不存在）
