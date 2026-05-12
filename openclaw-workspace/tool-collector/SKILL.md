---
name: tool-collector
description: 精选网页/工具收录。将用户提供的网站URL自动解析后写入飞书多维表格「工具测评」。触发词：精选网页、收录网站、存工具、收录、add tool。
when_to_use: 用户提供一个网站URL，要求收录、存入、放入文档/表格时使用。触发词：精选网页、收录网站、存工具、收录、add tool、工具测评。
version: 1.0.0
---

# 精选网页收录 (tool-collector)

## 触发词
精选网页、收录网站、存工具、收录、add tool、工具测评

## 目标表格
- **App Token**: `CjrEbaLloaHuvmsHhJScNB0XnB5`
- **Table ID**: `tblF8PrZtDpgJLtD`
- **表格名**: 工具测评
- **URL**: https://s0xpyu2kpl6.feishu.cn/base/CjrEbaLloaHuvmsHhJScNB0XnB5

## 字段结构

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| 工具名称 | Text | ✅ | 从页面title/品牌名提取 |
| 一句话描述 | Text | ✅ | 核心功能概括，15-30字 |
| 链接 | Text | ✅ | 用户提供的原始URL |
| 分类 | Text | ✅ | 如：API中转、AI写作、浏览器、开发、自动化、搜索、数据可视化等 |
| 平台 | Text | ❌ | Web/Chrome/桌面/移动端，默认Web |
| 是否免费 | SingleSelect | ❌ | 免费/免费+付费/付费 |
| 测评状态 | SingleSelect | ❌ | 默认填"待测评" |
| 评分 | SingleSelect | ❌ | 1-5星，未测评不填 |
| 测评日期 | DateTime | ❌ | 未测评不填 |
| 优点 | Text | ❌ | |
| 缺点 | Text | ❌ | |
| 适用场景 | Text | ❌ | |
| 备注 | Text | ❌ | 定价信息、特色功能等 |

## 流程

### Step 1: 获取网页内容
优先用 `web_fetch` 抓取页面。若失败（动态渲染站点），用内置 browser（profile=openclaw）打开页面获取 snapshot。

### Step 2: 解析信息
从页面内容中提取：
- **工具名称**：页面 title、品牌 logo 旁文字、或 URL 域名
- **一句话描述**：产品核心功能，简洁概括
- **分类**：根据产品功能判断
- **定价/是否免费**：从 pricing/packages 页面获取
- **备注**：关键定价档位、核心卖点等

### Step 3: 去重
按链接或工具名称查重：
```
feishu_bitable_app_table_record list
  filter: { field_name: "链接", operator: "contains", value: ["域名关键词"] }
```
若已存在则跳过，告知用户"已收录过"。

### Step 4: 写入
```
feishu_bitable_app_table_record create
  app_token: "CjrEbaLloaHuvmsHhJScNB0XnB5"
  table_id: "tblF8PrZtDpgJLtD"
```

### Step 5: 确认
回复用户写入结果摘要。

## 注意事项
- 用户只给 URL 时，自动完成所有步骤，不问多余问题
- 定价信息尽量从页面获取，获取不到就不填
- 分类字段自由填写，不强匹配预设值
- 测评状态默认"待测评"
- 如果用户提供多个URL，逐个处理，批量写入
