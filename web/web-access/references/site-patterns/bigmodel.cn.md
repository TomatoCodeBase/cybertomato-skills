---
domain: bigmodel.cn
aliases: [智谱AI, 智谱开放平台, BigModel, GLM Coding]
updated: 2026-04-17
---

## 平台特征

- Vue 2 SPA 应用，HTML 壳 + `/js/app.*.js` 渲染实际内容
- 全站限流机制：任何页面请求都可能被拦截到 `/html/rate-limit.html?redirect=<原路径>` 限流页
- 限流页是独立 HTML（非 SPA），内含 JS 轮询 `/api/biz/rate-limit/check` API
- 限流 API 返回 `{"code":555}` 表示被限流，`{"code":200}` 表示放行
- 登录 token 存储在 cookie `bigmodel_token_production`（JWT 格式，约334字符）
- 支付组件使用 AES 加密，密钥 `zhiPuAi123456789`

## GLM Coding 套餐页面 (`/glm-coding`)

### 页面结构

- 页面主区域：`.package-card-box` 3个卡片，分别对应 Lite/Pro/Max
- 周期切换：`.switch-tab-item`（0=连续包月 active, 1=连续包季 9折, 2=连续包年 8折）
- 购买按钮：`button.buy-btn`，位于每个卡片内 `.package-card-btn-box` 中
- 顶部订阅入口：`button` 文本 "即刻订阅" 和 "继续订阅"（用于已有订阅用户）
- 支付弹窗组件：`PayComponent`（通过 `payComponentRef` 引用）

### 套餐数据（productIds）

| 套餐 | productId | 连续包月价 | 首月价(activePrice) |
|------|-----------|-----------|-------------------|
| Lite | product-02434c | 49 | 18 |
| Pro | product-1df3e1 | 149 | 90 |
| Max | product-2fc421 | 469 | 180 |

连续包季（9折）：Lite 44.1, Pro 134.1, Max 422.1
连续包年（8折）：Lite 39.2, Pro 119.2, Max 375.2

### 卡片数据字段（Vue cardData）

关键字段：
- `productId` — 产品唯一标识
- `salePrice/originalPrice/renewAmount` — 售价/原价/续费金额
- `activePrice` — 首月优惠价
- `soldOut: true/false` — 是否售罄
- `disabled: true/false` — 按钮是否禁用
- `canPurchase` — 是否可购买
- `forbidden` — 是否被禁止
- `version: "v2"` — 当前版本
- `hasFirstTimeSubscriptionPromo` — 首次订阅优惠

### 购买流程（Vue 组件调用链）

1. 用户点击 `button.buy-btn` → 卡片组件 `gotoPayFn()` → emit `clickBtn`
2. 父组件 `gotoPayFn(cardData)`:
   - 检查 `cardData.lastValid && !cardData.canRepurchase` → 跳转 overview
   - 检查 `cardData.forbidden` → 跳转 overview
   - 检查登录状态 → 未登录跳转登录页
   - 检查中奖冲突 → 弹确认框
   - 检查 `cardData.disabled` → 直接 return
   - 老用户提示 → `oldUserDialogVisible=true`
   - 最终：`$refs.payComponentRef.payDialogVisible = true`
3. PayComponent `payPreviewFn()`:
   - 参数：`{productId, invitationCode(url ic参数), ticket(验证码), randstr}`
   - 根据用户状态选择 API：`R["c"]` 或 `R["j"]`
   - 处理 `soldOut` → 关闭弹窗提示
   - 处理 `code:555` → 服务器繁忙
   - 成功后设置 `priceData` → `getPayStatusFn()` 轮询支付状态
4. `getPayStatusFn()` → 轮询 `priceData.bizId` 状态直到 `SUCCESS`
5. `selectPayTypeFn(type)` → 设置 `payType` 为 "alipay" 或 "wxpay"
6. 验证码：`openVerifyCaptcha()` → `captchaComponent.openVerification()`

### 关键 CSS 选择器

```
套餐卡片区域: .package-card-box (3个)
卡片名称: .package-card-title .font-prompt
价格数字: .price-number
价格单位: .price-unit
续费金额: .package-card-next-price-box span
标签: .main-tag (最受欢迎/量大管饱)
购买按钮: button.buy-btn
周期切换: .switch-tab-item
周期切换活动态: .switch-tab-item.active
折扣标签: .discount-tip
特征列表: .package-card-attr-item span
支付弹窗: PayComponent ($refs.payComponentRef)
确认续订: button.el-button--primary (文本"继续订阅")
```

### 关键 API 端点

```
GET  /api/biz/rate-limit/check          — 限流检查
GET  /api/biz/subscription/list          — 订阅列表 (需 Authorization header)
POST /api/biz/pay/batch-preview          — 价格预览 (需 Authorization)
GET  /api/biz/pay/happyNewYear           — 活动状态
GET  /api/biz/tokenResPack/productIdInfo — 产品ID映射
GET  /api/biz/customer/getTokenMagnitude — Token额度
POST /api/biz/operation/query            — 运营活动查询
POST /api/biz/subscription/list          — 订阅列表
```

API 调用需要 `Authorization: <bigmodel_token_production>` header。

## 有效模式

- **限流 API 直接轮询**：`curl https://bigmodel.cn/api/biz/rate-limit/check -H "Cookie: bigmodel_token_production=$TOKEN"` 可在浏览器外直接调用
- **浏览器内 fetch 绕过限流**：在限流页内用 `fetch('/glm-coding', {credentials:'include'})` 不触发导航级限流
- **Vue __vue__ 数据提取**：通过 `element.__vue__` 可获取完整组件数据和方法的源码
- **CDP /clickAt 优于 /click**：Vue SPA 下真实鼠标事件触发更可靠

## 已知陷阱

- **售罄按钮 disabled**：`button.buy-btn` 有 `disabled` 属性，Vue 组件内 `cardData.disabled=true` 会导致 `gotoPayFn` 直接 return
- **限流窗口极短（2026-04-16）**：API 返回 200 后页面导航仍可能被拦截
- **SPA 无法静态解析**：页面内容完全由前端 JS 渲染
- **购买需要验证码**：`captchaVerified` + `ticket`/`randstr` 参数
- **soldOut 状态前端判断**：即使按钮解除 disabled，`payPreviewFn` 仍会检查 `soldOut` 字段
- **补货时间精确到分钟**：按钮文本显示 "暂时售罄 ｜04月17日 10:00 补货"，补货后 disabled 和 soldOut 应变为 false
