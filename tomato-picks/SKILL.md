---
name: tomato-picks
description: '番茄精选网页导航站管理。从飞书多维表格同步数据到本地静态HTML网站。触发词：番茄精选、精选网页、同步网站、更新网站、tomato-picks。'
---

# 番茄精选网页

管理「番茄精选网页」导航站：飞书多维表格 -> 本地HTML同步。

## 数据源

- **飞书多维表格**：`CjrEbaLloaHuvmsHhJScNB0XnB5`，表 `tblF8PrZtDpgJLtD`
- **本地网站**：`D:\G谷歌下载\ai-bot\index.html`
- **配色**：kami紙风格（warm parchment + ink-blue + serif-led）

## 操作流程

### 同步网站（最常用）

用户说"同步网站"/"更新网站"时：

1. 从飞书多维表格读取全部记录（fields: 工具名称、一句话描述、链接、分类、平台、是否免费）
2. 运行 `scripts/sync.py`，自动生成完整HTML并写入 `D:\G谷歌下载\ai-bot\index.html`
3. 确认完成

### 添加工具

1. 写入飞书多维表格
2. 同步网站

### 修改工具

1. 更新飞书多维表格
2. 同步网站

### 修改网站样式

纯视觉变更直接改HTML，不动飞书表格。

## HTML模板结构

单文件HTML，关键结构：

- `header` 固定导航，ink-blue背景
- `div.hero` 标题区
- `div.layout` 左侧分类边栏(sticky) + 右侧工具卡片网格
- `footer` 数据来源链接
- `script` tools数组 + catColors + render函数

CSS变量（kami配色）：
- `--paper:#F7F3ED` 页面底色
- `--paper-card:#FFFCF7` 卡片底色
- `--ink:#1B365D` 墨蓝主色
- `--accent:#8B4513` 棕褐辅助

## 注意事项

- 网站文件在sandbox外，用 exec + Copy-Item 绕行
- 飞书链接字段可能是URL对象或纯文本，脚本需兼容两种
