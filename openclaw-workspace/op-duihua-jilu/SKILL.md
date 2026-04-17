---
name: op-duihua-jilu
description: "OP对话记录"
---

# OP对话记录器 (op-duihua-jilu)

自动记录番茄与艾伊思的对话到 `D:\cybertomato\00-个人日记\OP对话\`

## 触发词

`对话记录`、`OP对话`

## 命令

| 指令 | 说明 |
|------|------|
| `对话记录 开` | 启动自动记录（创建cron任务） |
| `对话记录 关` | 停止自动记录（停用cron任务） |
| `对话记录 状态` | 查看当前模式 |
| `对话记录 导出` | 手动立即导出当前会话 |

## 规则

1. 文件路径：`D:\cybertomato\00-个人日记\OP对话\YYYY-MM-DD_OP对话.md`
2. 已存在则追加，不存在则创建
3. 每条对话带时间戳 `YYYY-MM-DD HH:MM:SS`
4. 格式：`**[HH:MM:SS] 番茄**：内容` / `**[HH:MM:SS] 艾伊思**：内容`
5. 开启时自动创建今天文件

## Cron任务配置

- **名称**：`op-duihua-jilu`
- **周期**：每5分钟
- **sessionTarget**：`current`
- **payload**：读取主会话历史，增量追加到当天文件

## 增量逻辑

cron触发时：
1. 用 `sessions_history` 获取最近10条消息
2. 对比已有文件内容，只追加新消息
3. 写入文件
