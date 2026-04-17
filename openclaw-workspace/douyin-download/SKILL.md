---
name: douyin-download
description: 抖音无水印视频下载和文案提取工具
metadata:
  openclaw:
    emoji: 🎵
    requires:
      bins: [ffmpeg]
      env: [SILI_FLOW_API_KEY]
---

# douyin-download Skill

抖音无水印视频下载和文案提取工具。

## 功能

- 🎬 获取无水印视频下载链接
- 📊 提取视频互动数据（点赞、评论、收藏、分享）
- 📥 下载抖音视频
- 🎙️ 从视频中提取语音文案（需要 API Key）

## 环境变量

- `SILI_FLOW_API_KEY` - 硅基流动 API 密钥（用于语音转文字）

获取 API Key: https://cloud.siliconflow.cn/

## 使用方法

> 💡 **小贴士**：所有命令中的"抖音链接"均支持直接粘贴**包含中文和特殊符号的完整分享文案**，脚本会自动从中提取有效链接。同时，所有命令也会在终端中展示该视频的点赞、评论、收藏、分享等互动数据。

### 获取视频信息与互动数据

```bash
node ./douyin.js info "抖音分享链接或完整分享文案"
```

### 下载视频

```bash
node ~/.hermes/skills/douyin-download/douyin.js download "抖音链接" -o /tmp/douyin-download
```

### 提取文案与视频数据

```bash
SILI_FLOW_API_KEY="***" node ~/.hermes/skills/douyin-download/douyin.js extract "抖音链接"
```

- 自动下载视频并提取音频
- 自动调用 Silicon Flow ASR 提取文字
- **自动生成包含视频互动数据（点赞、评论、收藏、分享等）的 Markdown 文件**

---

## 📊 飞书多维表格

用于存储分析完成的抖音视频数据。

### 表格信息

> 用户需自行创建飞书多维表格，并将 app_token 和 table_id 保存到记忆（MEMORY.md）中。

**推荐字段结构：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 视频链接 | 🔗 超链接 | 抖音视频分享链接 |
| 标题 | 📝 文本 | 视频标题 |
| 点赞数 | 🔢 数字 | 点赞数量 |
| 评论数 | 🔢 数字 | 评论数量 |
| 收藏数 | 🔢 数字 | 收藏数量 |
| 分享数 | 🔢 数字 | 分享数量 |
| 原始文案 | 📝 文本 | 视频标题描述 |
| 话题标签 | 🏷️ 多选 | AI工具/效率提升/科技数码/职场成长/生活方式/情感心理 |
| AI拆解 | 📝 文本 | AI 分析结果（内容类型/情绪/受众/爆款元素/改编文案建议） |

### 通过 lark-cli 写入记录

```bash
# app_token 和 table_id 从记忆（MEMORY.md）中获取
lark-cli api POST /open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records --data '{
  "fields": {
    "视频链接": {"link": "https://v.douyin.com/xxx/", "text": "点击查看视频"},
    "标题": "视频标题",
    "点赞数": 10000,
    "评论数": 500,
    "收藏数": 8000,
    "分享数": 2000,
    "原始文案": "语音识别提取的完整文案内容",
    "话题标签": ["AI工具", "效率提升"],
    "AI拆解": "【内容类型】...\n【情绪】...\n【改编文案建议】..."
  }
}'
```
