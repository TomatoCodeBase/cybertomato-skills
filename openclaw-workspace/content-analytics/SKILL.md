---
name: content-analytics
version: 1.0.0
description: 内容数据分析系统 - 从 Excel 到图表的完整流程
---

# 内容数据分析系统

## 任务目标

自动导入微信公众号数据，生成本地 JSON + 图表报告。

**核心功能**：
- ✅ Excel 自动转 CSV
- ✅ 数据解析并存入 JSON
- ✅ 生成文本图表 + Markdown 报告
- ✅ 支持 Windows（PowerShell）

**触发词**：`内容数据分析`

---

## 使用方法

### 方式 1：自动模式

```bash
# 智能体自动查找下载目录的 Excel 文件
用户: 内容数据分析

智能体: [自动执行]
  1. 查找 D:\G谷歌下载\数据明细*.xls
  2. 转换为 CSV
  3. 导入 JSON
  4. 生成图表
```

### 方式 2：指定文件

```bash
# 指定 Excel 文件路径
用户: 内容数据分析 D:\path\to\data.xls

智能体: [执行全流程]
```

### 方式 3：仅生成图表

```bash
# 已有数据，只更新图表
用户: 生成内容图表

智能体: python scripts/generate-analytics-charts.py
```

---

## 文件结构

```
~/workspace/
├── scripts/
│   ├── excel-to-csv.ps1              # Excel 转 CSV
│   ├── import-wechat-analytics.py    # 导入数据
│   ├── generate-analytics-charts.py  # 生成图表
│   └── run-analytics.ps1             # 一键运行
│
└── data/
    └── content-analytics/
        ├── articles.json              # 文章数据（JSON）
        └── charts/
            └── weekly-report.md       # 周报（Markdown）
```

---

## 数据格式

### articles.json

```json
{
  "articles": [
    {
      "title": "文章标题",
      "publishDate": "2026-03-22",
      "metrics": {
        "reach": 1431,        // 送达人数
        "read": 9,            // 阅读人数
        "avgStaySeconds": 24, // 平均停留时长
        "finishRate": 0.111,  // 完读率
        "share": 1,           // 分享
        "like": 0,            // 点赞
        "collect": 0,         // 收藏
        "comment": 0          // 评论
      },
      "channels": {
        "message": 5,         // 公众号消息
        "chat": 3,            // 聊天会话
        "homepage": 1         // 公众号主页
      }
    }
  ],
  "lastUpdated": "2026-03-23 14:26:28",
  "stats": {
    "totalArticles": 1,
    "totalReads": 9,
    "avgFinishRate": 0.111
  }
}
```

---

## 输出示例

### 文本图表

```
======================================================================
📊 本月 TOP 10 文章（按阅读量）
======================================================================
 1. OpenClaw必读：3分钟搞懂工作区文件的5个核心概念
    阅读:    9 | 完读率: 11.1% | ████
======================================================================
```

### Markdown 报告

```markdown
# 内容分析周报

## 总体数据

| 指标 | 数值 |
|------|------|
| 文章总数 | 1 |
| 总阅读量 | 9 |
| 平均完读率 | 11.1% |
```

---

## 执行流程

```
用户触发 → 
  [1/3] Excel → CSV (excel-to-csv.ps1) → 
  [2/3] CSV → JSON (import-wechat-analytics.py) → 
  [3/3] JSON → 图表 (generate-analytics-charts.py) →
  完成
```

---

## 注意事项

### Excel 文件命名

微信导出的文件名格式：
```
数据明细（文章标题...）.xls
```

脚本会自动提取标题和日期。

### 数据更新

- 同一篇文章多次导入 → 自动更新（不会重复）
- 判断依据：文章标题

### 图表类型

当前版本：
- ✅ 文本柱状图（TOP 10）
- ✅ 文本趋势图（最近 7 篇）
- ✅ Markdown 周报

未来版本：
- ⏳ Python matplotlib 图表（PNG）
- ⏳ 飞书同步

---

## 示例对话

### 示例 1：首次导入

```
用户: 内容数据分析

智能体:
📊 内容数据分析系统
==================================================

[1/3] 转换 Excel → CSV...
找到 1 个文件
[OK] Conversion successful!

[2/3] 导入数据...
[1/3] 读取 CSV: 数据明细（xxx）.csv
[2/3] 解析数据...
    标题: OpenClaw必读：3分钟搞懂工作区文件
    发布日期: 2026-03-22
    阅读量: 9
[3/3] 更新数据库...
➕ 添加文章: OpenClaw必读...

✅ 数据已保存

📊 当前统计:
   文章总数: 1
   总阅读量: 9
   平均完读率: 11.1%

[3/3] 生成图表...
✅ Markdown 报告已生成

✅ 分析完成！
📂 数据位置: ~/workspace/data/content-analytics/
📊 图表位置: ~/workspace/data/content-analytics/charts/
```

---

## 技术细节

### Excel 转 CSV

使用 PowerShell + Excel COM 对象：
- 兼容 .xls 和 .xlsx
- 自动处理编码（GBK）

### JSON 解析

Python 脚本：
- 尝试多种编码（gbk, utf-8）
- 智能提取数据指标
- 自动计算统计信息

### 图表生成

Python 脚本：
- ASCII 艺术图表（无需依赖）
- Markdown 报告（可导入 Obsidian）

---

*创建时间：2026-03-23*
*版本：v1.0.0*
