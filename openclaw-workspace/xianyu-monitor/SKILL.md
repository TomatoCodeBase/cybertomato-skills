---
name: xianyu-monitor
description: 闲鱼商品监控与数据采集。搜索关键词提取商品标题、价格、销量、链接；支持价格监控、竞品跟踪、市场分析。触发词：闲鱼监控、闲鱼搜索、闲鱼采集、goofish、xianyu。
version: "1.0.0"
author: 艾伊思
---

# 闲鱼监控 Skill

基于 web-access Skill 的 CDP 浏览器基础设施，对闲鱼（goofish.com）进行商品搜索、数据采集和市场分析。

## 前置依赖

- **web-access Skill**：必须先加载并遵循其 CDP 使用规范
- **Chrome 远程调试**：需开启 Chrome CDP，闲鱼搜索结果为动态渲染，必须通过浏览器获取
- **闲鱼登录态**：搜索页可免登录浏览，但详情和卖家信息需登录

## 操作流程

### 第一步：启动 CDP Proxy

加载 web-access Skill，执行前置检查：

```bash
node "$WEB_ACCESS_SKILL_DIR/scripts/check-deps.mjs"
```

确认 Proxy 运行后继续。

### 第二步：打开闲鱼搜索页

```bash
curl -s "http://localhost:3456/new?url=https://www.goofish.com/search?q=KEYWORD"
```

将 `KEYWORD` 替换为实际搜索词（需 URL 编码中文）。

### 第三步：提取搜索结果

等待页面加载完成后，用 `/eval` 提取商品数据：

```javascript
// 提取搜索结果商品列表
(() => {
  const items = document.querySelectorAll('[class*="feed-item"], [class*="item-card"], [class*="search-result"]');
  const results = [];
  items.forEach(item => {
    const titleEl = item.querySelector('[class*="title"], [class*="name"]');
    const priceEl = item.querySelector('[class*="price"]');
    const linkEl = item.querySelector('a[href*="item"]') || item.querySelector('a');
    const imgEl = item.querySelector('img');
    const locationEl = item.querySelector('[class*="location"], [class*="area"]');
    results.push({
      title: titleEl?.textContent?.trim() || '',
      price: priceEl?.textContent?.trim() || '',
      url: linkEl?.href || '',
      image: imgEl?.src || '',
      location: locationEl?.textContent?.trim() || ''
    });
  });
  return JSON.stringify(results, null, 2);
})()
```

**注意**：闲鱼 DOM 结构可能变化，如果上述选择器不命中，先用 `/eval` 探查页面结构：

```javascript
document.querySelector('#root')?.innerHTML?.substring(0, 2000)
```

根据实际 DOM 结构调整选择器。

### 第四步：滚动加载更多

闲鱼搜索结果为懒加载，需滚动获取更多数据：

```bash
curl -s "http://localhost:3456/scroll?target=TARGET_ID&direction=bottom"
```

等待加载后再次提取。

### 第五步：保存数据

将采集结果保存为 JSON 或 Markdown 到指定路径：

```
D:\cybertomato\05-项目管理\02-副业项目\闲鱼数据\
```

## 数据格式

采集结果统一保存为以下格式：

```json
{
  "keyword": "搜索关键词",
  "timestamp": "2026-04-01T22:00:00+08:00",
  "total": 20,
  "items": [
    {
      "title": "商品标题",
      "price": "¥300",
      "url": "https://www.goofish.com/item/xxx",
      "image": "图片URL",
      "location": "北京",
      "seller": "卖家名（可选）"
    }
  ]
}
```

## 使用场景

### 1. 关键词搜索采集

用户说："搜一下闲鱼上 OpenClaw 安装服务"

→ 打开搜索页 → 提取商品 → 整理成表格 → 保存

### 2. 价格分布分析

用户说："闲鱼上龙虾安装一般多少钱"

→ 搜索多个关键词 → 提取价格 → 统计分布 → 生成报告

### 3. 竞品监控

用户说："帮我看看闲鱼卖OpenClaw教程的有哪些"

→ 搜索 → 采集 → 按价格/销量排序 → 保存

### 4. 定期监控（配合 Cron）

设置定时任务，定期采集指定关键词，对比变化，发现新商品或价格变动时通知用户。

## 闲鱼站点经验

见 `references/goofish.md`（首次成功采集后自动创建）

### 已知特征

- 搜索结果为 SPA 动态渲染，WebFetch 无法获取
- URL 格式：`https://www.goofish.com/search?q=关键词`
- 搜索页可免登录访问
- 详情页 `https://www.goofish.com/item/ITEM_ID` 需要登录
- 懒加载，需滚动获取更多结果
- 可能有反爬机制，避免短时间内密集请求

### URL 编码

中文关键词需 URL 编码：
```bash
node -e "console.log(encodeURIComponent('OpenClaw安装'))"
```

## 注意事项

- 遵守闲鱼用户协议，不要频繁请求
- 采集数据仅供个人分析使用
- 每次采集间隔建议 > 5秒
- 完成后关闭创建的 tab：`curl -s "http://localhost:3456/close?target=TARGET_ID"`

## 与其他 Skill 的联动

- **writing-business-short**：采集数据后可生成商业短文
- **content-factory-publisher**：分析结果可作为公众号选题素材
- **cron**：配合定时任务实现自动监控
