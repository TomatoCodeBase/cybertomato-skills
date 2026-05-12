---
name: daily-syslog
description: 每日系统日志创建与管理。在指定路径下新建当天的系统日志文件，记录当天完成的工作、遇到的问题和经验教训。触发词：新建系统日志、创建日志、写日志、记录日志、系统日志。当新会话启动、每天开始工作、或需要记录已完成任务时使用。
---

# 每日系统日志

## 日志路径

```
D:\cybertomato\Hermes工作区\agents\日志\
```

## 文件命名

```
{YYYY-MM-DD}系统日志.md
```

例：2026-05-13系统日志.md

## 模板

``markdown
# {YYYY-MM-DD} 系统日志

---

## {事项标题} {HH:MM}

**行为目标：** {一句话描述要做什么}

**执行结果：**
- {关键结果1}
- {关键结果2}

**可迁移经验：**
### 1. {经验标题}
{具体经验，格式：问题→原因→解法}

---
``

## 操作流程

1. **确认日期**：用 `Get-Date -Format "yyyy-MM-dd"` 获取当天日期
2. **检查是否已存在**：`Test-Path "D:\cybertomato\Hermes工作区\agents\日志\{日期}系统日志.md"`
3. **不存在则创建**：用 `Set-Content -Encoding UTF8` 写入模板
4. **追加内容**：每次完成任务后，用 `Add-Content` 或 edit 工具追加到文件末尾（在最后一个 `---` 之前）

## 写入规则

- 用 `Set-Content` 创建新文件，**必须指定 `-Encoding UTF8`**
- 追加内容用 edit 工具的 oldText/newText 精确替换
- 每个事项包含：标题+时间、行为目标、执行结果、可迁移经验
- **可迁移经验是核心**：普适性洞见 > 具体结论，思维模式 > 专属经验
- 编码注意事项：PowerShell 默认 GBK，写中文必须 UTF8

## 注意事项

- Obsidian vault 下的文件只能创建/编辑（write/edit），**移动/重命名/删除必须走 Obsidian CLI**
- `read` 工具无法读取 workspace 外路径，用 `exec` + `Get-Content` 替代
- `write` 工具只能写 workspace 内文件，外部路径用 `exec` + `Set-Content`
