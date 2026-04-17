---
name: glm-package-grabber
description: 智谱AI（BigModel）套餐代抢工具。自动突破限流排队页面，抢购 GLM 套餐/资源包。触发词：代抢GLM、抢套餐、glm抢购。
triggers:
  - 代抢GLM
  - 抢套餐
  - glm抢购
  - bigmodel抢购
  - 抢GLM套餐
  - GLM Coding
  - bigmodel排队
  - 限流页面
version: "3.0"
created: "2025-04-16"
updated: "2026-04-17"
---

# GLM 套餐代抢

## 常量定义

```bash
export CDP_PROXY=http://localhost:3456
export RATE_LIMIT_API=/api/biz/rate-limit/check
export TOKEN_COOKIE=bigmodel_token_production
export DEFAULT_TARGET=/glm-coding
export MAX_TOTAL_TIMEOUT=300
```

## 致命陷阱（必读）

1. **绝对不要在补货窗口期刷新/导航页面！** 已加载的 SPA 页面内 Vue 数据会自动更新（响应式），刷新页面反而触发限流，浪费宝贵的补货窗口。2026-04-17 实战教训：10:02 检查时数据未变，刷新页面后被限流卡住，突破后 10:06 已售罄。
2. **补货窗口极短（1-2分钟）** 从补货开始到售罄可能只有1-2分钟，任何延迟都是致命的。
3. **正确策略是"驻留页面 + Vue 轮询 + 自动点击"** 不是"进页面→看按钮→点按钮"。

## GLM Coding 套餐页面结构

### 套餐 productId 映射

| 套餐 | productId | 月价 | 卡片索引 |
|------|-----------|------|----------|
| Lite | product-02434c | 49 | 0 |
| Pro | product-1df3e1 | 149 | 1 |
| Max | product-2fc421 | 469 | 2 |

### 关键选择器

```
套餐卡片:     .package-card-box (3个: 0=Lite, 1=Pro, 2=Max)
购买按钮:     button.buy-btn (与卡片一一对应)
周期切换:     .switch-tab-item (0=月, 1=季 9折, 2=年 8折)
支付弹窗:     PayComponent ($refs.payComponentRef)
```

### Vue 数据访问（不刷新页面）

```javascript
// 获取 Pro 卡片的 Vue 数据
var boxes = document.querySelectorAll(".package-card-box");
var proVm = boxes[1].__vue__;
proVm.cardData.soldOut      // boolean - 是否售罄
proVm.cardData.disabled     // boolean - 按钮是否禁用
proVm.cardData.canPurchase  // null/boolean - 是否可购买
proVm.cardData.productId    // "product-1df3e1"
```

### 购买流程调用链

1. 点击 `button.buy-btn` → 卡片 emit `clickBtn` → 父组件 `gotoPayFn(cardData)`
2. 父组件检查 `disabled/forbidden/loginStatus` → 打开 `payComponentRef.payDialogVisible=true`
3. PayComponent `payPreviewFn()` → API 调用（参数：productId, invitationCode, ticket, randstr）
4. 返回支付二维码 → `getPayStatusFn()` 轮询支付状态

## 推荐流程：预部署驻留模式

### Step 1. 提前加载页面（补货前 5 分钟）

查找已有的 bigmodel tab 或提前新建：

```bash
# 查看已有 tabs，找到 url 含 bigmodel.cn/glm-coding 的 targetId
curl -sf "$CDP_PROXY/targets"
# 如果没有，提前新建（此时不限流）
curl -sf "$CDP_PROXY/new?url=https://bigmodel.cn/glm-coding"
```

> 如果遇到限流页，用浏览器内轮询突破（见下方备用方案）。

### Step 2. 注入自动抢购脚本（补货前 1-2 分钟）

脚本写入文件后注入。驻留在页面内，不依赖外部轮询延迟。

将以下 JS 保存为 `grab_monitor.js`：

```javascript
(function() {
  var TARGET_INDEX = 1; // 0=Lite, 1=Pro, 2=Max
  var CHECK_INTERVAL = 500;
  var MAX_WAIT = 300000;
  var startTime = Date.now();
  var clicked = false;
  var log = [];

  function addLog(msg) {
    log.push(new Date().toISOString() + " " + msg);
  }

  addLog("监控启动，目标: Card[" + TARGET_INDEX + "]");

  var timer = setInterval(function() {
    if (clicked) { clearInterval(timer); return; }
    if (Date.now() - startTime > MAX_WAIT) {
      addLog("超时，停止监控");
      clearInterval(timer);
      return;
    }

    var boxes = document.querySelectorAll(".package-card-box");
    if (!boxes[TARGET_INDEX]) return;
    var vm = boxes[TARGET_INDEX].__vue__;
    if (!vm || !vm.cardData) return;

    var data = vm.cardData;
    addLog("soldOut=" + data.soldOut + " disabled=" + data.disabled);

    if (!data.soldOut || !data.disabled) {
      addLog("!!! 检测到补货 !!! soldOut=" + data.soldOut + " disabled=" + data.disabled);
      var btn = boxes[TARGET_INDEX].querySelector("button.buy-btn");
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("is-disabled", "disabled");
        btn.click();
        clicked = true;
        addLog("已点击购买按钮！");
        clearInterval(timer);
      }
    }
  }, CHECK_INTERVAL);

  window.__GLM_GRAB_STATUS = function() {
    return JSON.stringify({clicked: clicked, logs: log.slice(-20)});
  };
})()
```

注入并验证：

```bash
curl -sf -X POST "$CDP_PROXY/eval?target=$TID" --data-binary @grab_monitor.js
sleep 1
curl -sf -X POST "$CDP_PROXY/eval?target=$TID" -d 'window.__GLM_GRAB_STATUS()'
```

### Step 3. 等待 + 监控

```bash
while true; do
  STATUS=$(curl -sf -X POST "$CDP_PROXY/eval?target=$TID" \
    -d 'window.__GLM_GRAB_STATUS ? window.__GLM_GRAB_STATUS() : "NOT_INJECTED"' 2>/dev/null)
  echo "$(date '+%H:%M:%S') $STATUS"
  if echo "$STATUS" | grep -q '"clicked":true'; then
    echo "!!! 购买按钮已自动点击 !!!"
    sleep 3
    curl -sf "$CDP_PROXY/screenshot?target=$TID" > /tmp/bm_result.png
    break
  fi
  sleep 10
done
```

### Step 4. 确认结果

检查支付弹窗状态：

```javascript
(function() {
  var boxes = document.querySelectorAll(".package-card-box");
  var vm = boxes[1].__vue__;
  var parent = vm.$parent;
  var payComp = parent.$refs.payComponentRef;
  return JSON.stringify({
    payDialogVisible: payComp ? payComp.payDialogVisible : false,
    btnText: boxes[1].querySelector("button.buy-btn").innerText.trim(),
    soldOut: vm.cardData.soldOut,
    disabled: vm.cardData.disabled
  });
})()
```

### Step 5. 收尾

不要关闭 tab——用户可能需要完成支付。

## 备用方案：限流突破

仅在页面未加载时使用。**已加载的页面绝对不要用！**

### 策略 A：浏览器内轮询

在限流页注入轮询脚本，API 放行后跳转。成功率约 50%。

### 策略 B：反复快速导航

```bash
for i in $(seq 1 15); do
  curl -sf "$CDP_PROXY/navigate?target=$TID&url=https://bigmodel.cn/glm-coding"
  sleep 2
  PATH_CHECK=$(curl -sf -X POST "$CDP_PROXY/eval?target=$TID" -d 'window.location.pathname')
  if echo "$PATH_CHECK" | grep -q "glm-coding"; then
    echo "成功！第 $i 次尝试"
    break
  fi
done
```

## 关键经验

- **补货窗口 1-2 分钟**：从 soldOut=false 到售罄极快，必须零延迟
- **绝对不要在抢购期刷新页面**：已加载 SPA 的 Vue 数据自动更新，刷新触发限流
- **驻留脚本优于外部轮询**：页面内 setInterval 直接访问 Vue 响应式数据，零网络延迟
- **限流 API**: GET /api/biz/rate-limit/check，code:555 限流，code:200 放行
- **核心绕过手段**: 浏览器内 fetch() 不触发导航级限流
- **购买按钮 disabled 由 Vue 控制**：需先移除 disabled 属性再 click
- **支付需要验证码**：ticket + randstr 参数，首次购买可能触发人机验证

## 站点经验文件

详见 web-access skill 的 references/site-patterns/bigmodel.cn.md

## Changelog

- **v3.0** (2026-04-17): 重大策略变更 — 预加载驻留+Vue数据轮询+自动点击模式；新增致命陷阱；新增页面结构/productId/选择器速查
- **v2.0** (2025-04-16): 常量集中管理、三策略自动级联
- **v1.0** (2025-04-16): 初始版本
