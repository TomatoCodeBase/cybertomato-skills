---
name: daily-syslog
description: 每日系统日志创建与管理。在指定路径下新建当天的系统日志文件，记录当天完成的工作、遇到的问题和经验教训。触发词：新建系统日志、创建日志、写日志、记录日志、系统日志。当新会话启动、每天开始工作、或需要记录已完成任务时使用。
---

# 每日系统日志

## 日志路径

``
D:\cybertomato\Hermes工作区\agents\日志\
``

## 文件命名

``
{YYYY-MM-DD}系统日志.md
``

例：2026-05-13系统日志.md

## 模板

``markdown
# {YYYY-MM-DD} 龙虾系统日志

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
4. **追加内容**：每次完成任务后，用 edit 工具的 oldText/newText 精确替换

## 记录规范

每条日志必须**具体、可回溯**，禁止写模糊描述。对照以下规则：

| ❌ 不要这样写 | ✅ 要这样写 |
|---|---|
| 创建了一个技能 | 创建 `daily-syslog` 技能（路径：`~/.openclaw-autoclaw/skills/daily-syslog/`），触发词：新建系统日志/写日志/记录日志 |
| 装了个工具 | 安装 `web-access` v2.5.0，CDP proxy 已就绪 |
| 发布了文章 | 知识星球发布「xxx」，链接：https://articles.zsxq.com/id_xxx |
| 修了个bug | 修复 ai-daily-report 源链接缺失，改动：采集脚本增加正文URL提取 |

**核心原则：**
- **名字要写全**：技能名、工具名、文件路径、cron ID 等关键标识符必须写出来
- **触发词要写明**：涉及 skill 时必须列出触发词
- **结果要可验证**：写了链接、ID、路径，下次能直接找到
- **可迁移经验是核心**：普适性洞见 > 具体结论，思维模式 > 专属经验

## 写入规则

- 用 `Set-Content` 创建新文件，**必须指定 `-Encoding UTF8`**
- 追加内容用 edit 工具的 oldText/newText 精确替换
- 文件标题统一用「龙虾系统日志」，文件名保持 `{日期}系统日志.md`
- 编码注意事项：PowerShell 默认 GBK，写中文必须 UTF8

## 注意事项

- Obsidian vault 下的文件只能创建/编辑（write/edit），**移动/重命名/删除必须走 Obsidian CLI**
- `read` 工具无法读取 workspace 外路径，用 `exec` + `Get-Content` 替代
- `write` 工具只能写 workspace 内文件，外部路径用 `exec` + `Set-Content`
