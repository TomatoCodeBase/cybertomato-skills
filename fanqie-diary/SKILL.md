---
name: fanqie-diary
description: 创建番茄每日日记。触发词：/新建日记、新建日记、创建日记、创建番茄日记、新建番茄日记。
---

# 番茄日记

在 Obsidian 中创建每日番茄日记。

## 路径

`D:\cybertomato\00-个人日记\番茄日记\{YYYY-MM-DD}-番茄日记.md`

## 流程

1. 获取当天日期，格式 `YYYY-MM-DD`
2. 检查文件是否已存在（`Test-Path`），存在则提示用户
3. 读取 `assets/template.md` 作为模板
4. 替换模板中的 `{YYYY-MM-DD}` 和 `{HH:MM}` 为当前时间
5. 用 `exec` + `Set-Content -Encoding UTF8` 写入文件（`write` 工具不能写 workspace 外）
6. 用 `Start-Process` 打开 Obsidian：`obsidian://open?vault=D:\cybertomato&file={URL编码路径}`
7. 创建完成后回复：`✓ 已创建并打开 {日期} 番茄日记`

## 注意

- 模板中有 Obsidian 双向链接 `[[...]]`，原样保留不要修改
- 创建后必须自动打开