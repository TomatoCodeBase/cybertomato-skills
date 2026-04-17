---
name: glm-coding-grabber
description: GLM Coding 套餐抢购专项。针对 bigmodel.cn/glm-coding 页面的 Vue SPA 购买流程，包含产品ID、选择器、售罄检测和自动点击。触发词：抢Coding套餐、Coding代抢。
triggers:
  - 抢Coding套餐
  - Coding代抢
  - glm coding抢购
  - Coding Plan抢购
version: "1.0"
created: "2026-04-17"
---

# GLM Coding 套餐抢购

## 前置条件

- CDP Proxy 运行中（localhost:3456）
- Chrome 已登录 bigmodel.cn
- 页面已加载 `https://bigmodel.cn/glm-coding`

## 产品数据

| 套餐 | productId | 连续包月价 | 首月价 |
|------|-----------|-----------|--------|
| Lite | product-02434c | 49 | 18 |
| Pro | product-1df3e1 | 149 | 90 |
| Max | product-2fc421 | 469 | 180 |

连续包季（9折）：Lite 44.1, Pro 134.1, Max 422.1
连续包年（8折）：Lite 39.2, Pro 119.2, Max 375.2

## 关键选择器

```
套餐卡片:     .package-card-box        (索引: 0=Lite, 1=Pro, 2=Max)
购买按钮:     button.buy-btn           (与卡片同序)
卡片名称:     .package-card-title .font-prompt
价格数字:     .price-number
周期切换:     .switch-tab-item         (0=月 active, 1=季, 2=年)
活动标签:     .switch-tab-item.active
折扣标签:     .discount-tip
```

## Vue 购买调用链

1. `button.buy-btn` click → 卡片组件 emit `clickBtn`
2. 父组件 `gotoPayFn(cardData)`:
   - `cardData.disabled=true` → 直接 return（必须等变 false）
   - `cardData.soldOut=true` → 禁售
   - 通过后 → `$refs.payComponentRef.payDialogVisible = true`
3. PayComponent `payPreviewFn()`:
   - 参数：`{productId, invitationCode, ticket, randstr}`
   - 检查 `soldOut` → 警告"已达今日售卖上限"
   - 成功 → `priceData` + `getPayStatusFn()` 轮询直到 `SUCCESS`
4. 支付方式：`selectPayTypeFn(type)` — "alipay" 或 "wxpay"

## 售罄状态检测

售罄时：
- HTML: `disabled="disabled"` class含 `is-disabled disabled`
- Vue: `cardData.disabled=true, cardData.soldOut=true`
- 按钮文本: "暂时售罄 ｜XX月XX日 XX:XX 补货"

检测脚本（CDP eval）：
```javascript
(() => {
  const boxes = document.querySelectorAll(".package-card-box");
  const card = boxes[TARGET_INDEX]; // Pro=1
  const btn = card.querySelector("button.buy-btn");
  const vm = card.__vue__;
  return JSON.stringify({
    disabled: btn.disabled,
    soldOut: vm.cardData.soldOut,
    canPurchase: vm.cardData.canPurchase,
    btnText: btn.innerText.trim().substring(0, 30)
  });
})()
```

## 推荐抢购流程（Pro 连续包月）

### Step 1: 找到/创建 tab

确认页面已在浏览器中打开（title="智谱AI开放平台" url含 glm-coding）。
获取 targetId 记为 TID。

### Step 2: 提前轮询按钮状态（补货前 10 秒开始）

每秒通过 CDP eval 检测 Pro 卡片的 `disabled` 和 `soldOut`。
当两者均变为 false 时立即点击 `button.buy-btn`。

### Step 3: 处理购买后续

点击后等待 1 秒，检查：
- 是否有确认弹窗（"继续购买"/"确定"）→ 点击
- 支付弹窗是否打开（PayComponent.payDialogVisible）
- 通知用户在浏览器中完成支付

### Step 4: 确认结果

检查页面文本是否出现"购买成功"/"已售罄"等关键词。
截图发送给用户确认。

## 注意事项

- 补货时间精确到分钟，按钮文本中显示具体时间
- 购买需要验证码（ticket + randstr），首次可能需要用户手动操作
- AES 密钥：`zhiPuAi123456789`（PayComponent KEY 字段）
- API 需要 Authorization header（cookie 中的 bigmodel_token_production JWT）
- 站点限流可能阻断页面加载，需用限流突破策略（见 glm-package-grabber skill）
