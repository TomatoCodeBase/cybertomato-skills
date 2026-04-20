---
domain: goofish.com
aliases: [闲鱼, xianyu, goofish]
updated: 2026-04-01
---

## 平台特征

- SPA 动态渲染，搜索结果通过 JS 加载，WebFetch/curl 无法获取商品数据
- 搜索页可免登录访问，但部分详情需登录
- 懒加载：需滚动才能加载更多商品
- 反爬：短时间内大量请求可能触发风控

## URL 结构

| 页面 | URL |
|------|-----|
| 搜索 | `https://www.goofish.com/search?q=关键词` |
| 商品详情 | `https://www.goofish.com/item/ITEM_ID` |
| 首页 | `https://www.goofish.com/` |

## 操作策略

1. 通过 CDP Proxy 打开搜索页
2. 等待页面加载（约3-5秒）
3. 用 `/eval` 探查 DOM 结构，定位商品列表容器
4. 提取标题、价格、链接等字段
5. 滚动加载更多，重复提取
6. 完成后关闭 tab

## DOM 选择器（待验证）

闲鱼 DOM 可能频繁变化，以下为初始参考，首次使用时务必先探查实际结构：

- 商品容器：`[class*="feed-item"]` 或 `[class*="item-card"]`
- 标题：`[class*="title"]` 或 `[class*="name"]`
- 价格：`[class*="price"]`
- 链接：`a[href*="item"]`

## 已知陷阱

- 中文关键词必须 URL 编码
- 页面初始加载可能有弹窗/引导层，需先关闭
- 价格文本可能包含"¥"符号和"包邮"等附加文字，需清洗
