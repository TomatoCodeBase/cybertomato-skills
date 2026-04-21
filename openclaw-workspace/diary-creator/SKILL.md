---
name: diary-creator
description: |
  番茄日记创建与任务打卡工具。基于 Obsidian 模板创建日记，支持任务打卡（开始/完成）、定时提醒。
  触发词：新建日记、写日记、补日记、打卡、开始任务、完成任务。
---

# 番茄日记创建器

## 触发场景

| 用户说 | 动作 |
|--------|------|
| 新建日记 / 写日记 / 补日记 | 创建日记文件 |
| 新建日记 2026-03-25 | 补建指定日期 |
| 打卡 / 开始 xxx / 完成 xxx | 任务打卡 |
| 日记提醒开/关 | 开关提醒 |

## 前置条件

- Obsidian 运行中 + Local REST API 插件启用（端口 27123）
- 环境变量 `OBSIDIAN_API_KEY`
- 日记模板目录：`D:\\cybertomato\\00-个人日记\\番茄日记\\`

## 模板文件路径

| 模板 | 路径 |
|------|------|
| 工作 | `D:\\cybertomato\\00-个人日记\\番茄日记\\番茄日记模板（工作）.md` |
| 日常 | `D:\\cybertomato\\00-个人日记\\番茄日记\\番茄日记模板（日常）.md` |
| 通用 | `D:\\cybertomato\\00-个人日记\\番茄日记\\番茄日记模板.md` |

用户说"工作日记"→ 用工作模板；"日记"/"日常日记"→ 用通用/日常模板。

## 功能一：创建日记

### 执行流程（Obsidian REST API）

**首选方案**：通过 Obsidian Local REST API（localhost:27123）一步完成，不依赖脚本文件。

1. REST API `GET` 读取对应模板（URL 编码中文路径）
2. 替换 `YYYY-MM-DD` → 实际日期
3. REST API `PUT` 写入日记文件（`Content-Type: text/markdown`）
4. Obsidian URI `obsidian://open?vault=cybertomato&file=...` 打开文件

完整代码见下方「⚠️ 已知问题 & 推荐方案」章节。

### 输出说明

- Python 无报错（exit_code=0）→ 创建成功 → "✓ 日记已创建：{日期}"
- 连接失败 → 提示用户打开 Obsidian

### 三种模板模式

| 模式 | 说明 |
|------|------|
| 通用 | 空白任务，自由填写 |
| 工作 | 预填工作日固定任务 |
| 日常 | 休息日模板 |

支持追加日期参数补建历史日记，如"新建工作日记 2026-04-10"。

## 功能二：任务打卡

通过 Obsidian Local REST API 读写日记内容，操作当天日记中的任务。

### 打卡规则

| 输入 | 动作 |
|------|------|
| 任务名 + 开始时间 | 追加开始时间戳 |
| 任务名 + 第二次时间 | 追加结束时间 + 勾选完成 |
| 仅任务名 | 直接勾选完成 |

### 任务匹配

- 模糊匹配，支持双链格式 `[[#xxx|显示名]]`，匹配显示名
- 只匹配第一个未完成的同名任务
- 找不到时列出所有未完成任务供参考

### 时间戳格式

```
- [ ] 07:00 丨 任务名                                      # 未开始
- [ ] 07:00 丨 任务名丨2026-04-14 07:34:28                 # 已开始
- [x] 07:00 丨 任务名丨2026-04-14 07:34:28丨2026-04-14 08:07:10  # 已完成
```

### 打卡输出

| 标记 | 含义 |
|------|------|
| `START:` | 追加开始时间 |
| `COMPLETE:` | 完成（附耗时） |
| `DONE:` | 快捷完成 |

## 功能三：任务提醒

### 规则

- 每5分钟 cron 扫描当天日记
- 计划时间已过且未完成 → 提醒（同一任务只提醒一次）
- 提醒时段：06:00-22:30
- 支持开关控制

## 任务格式规范

- 统一格式：`- [ ] HH:MM 丨 具体任务描述`
- 时间前置，四位格式（08:00）
- 分隔符用 `丨`
- 任务描述要具体

## ⚠️ 已知问题 & 推荐方案

- **`create-diary.cjs` 脚本为空文件**（0 bytes），不要使用。
- **Obsidian CLI `--help` 会超时**，但 `open` 命令可正常使用。
- **Windows MINGW64 环境下**：`read_file` 可能返回空或超时，terminal 输出可能全部被吞。此时 Python 脚本仍可执行（无输出但无报错），但无法验证结果。

### 推荐方案：Obsidian Local REST API（首选）

**当 `read_file`/terminal 输出不可用时，Obsidian REST API 是最可靠的绕行路径。** 前提是 Obsidian 已运行（本来就是前置条件）。

```python
import urllib.request, os, sys
from datetime import date
from urllib.parse import quote

api_key = os.environ.get('OBSIDIAN_API_KEY', '')
base = 'http://localhost:27123/vault/'

# 1. 读取模板（URL 编码中文路径，safe='/'保留斜杠）
tpl_path = quote('00-个人日记/番茄日记/番茄日记模板（工作）.md', safe='/')
req = urllib.request.Request(base + tpl_path)
if api_key: req.add_header('Authorization', f'Bearer {api_key}')
resp = urllib.request.urlopen(req, timeout=5)
template = resp.read().decode('utf-8')

# 2. 替换日期
today = date.today().isoformat()
content = template.replace('YYYY-MM-DD', today)

# 3. 写入日记（PUT + Content-Type）
out_path = quote(f'00-个人日记/番茄日记/{today}.md', safe='/')
req2 = urllib.request.Request(base + out_path, data=content.encode('utf-8'), method='PUT')
req2.add_header('Content-Type', 'text/markdown')
if api_key: req2.add_header('Authorization', f'Bearer {api_key}')
urllib.request.urlopen(req2, timeout=5)

# 4. 在 Obsidian 中打开
import subprocess
uri = f'obsidian://open?vault=cybertomato&file={quote(f"00-个人日记/番茄日记/{today}.md")}'
subprocess.run(['cmd', '/c', 'start', uri], timeout=10)
```

### 关键教训

- **永远不要凭空编造模板内容**——必须从实际模板文件读取。`read_file` 不可用时就用 REST API。
- **REST API 优先于 Obsidian CLI `read` 命令**——CLI read 输出也被 terminal 吞掉，而 REST API 可在 Python 内完成全流程无需输出。
- Python `urllib.request` 是标准库，无需额外依赖。
- **terminal 前台输出全部为空时**，用 `background=true` 启动命令 + `process(action="wait")` 读取输出，这是获取终端输出的可靠兜底方案。

## 注意事项

1. 日记文件名格式必须为 `YYYY-MM-DD.md`
2. Obsidian 写入中文路径必须 URL 编码
3. 同一任务只匹配第一个未完成的，避免误操作
4. 并行任务是常态不是异常，分析时需校正"墙上时间"和"有效专注时间"
5. 单个任务耗时超2小时的，主动标注"可能含并行等待"

## 日记分析

分析功能由独立技能 `diary-fenxi` 提供，支持：
- 每日摘要（完成率、有效工时、并行率）
- 任务耗时明细
- 周/月趋势分析

详见 diary-fenxi 技能。
