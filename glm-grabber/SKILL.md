---
name: glm-grabber
description: 智谱AI（BigModel）套餐代抢工具。自动突破限流排队页面，抢购 GLM 套餐/资源包。基于 Vue SPA 页面结构，预部署驻留+自动点击模式。需要 web-access skill 提供浏览器自动化能力。
triggers:
  - 代抢GLM
  - 抢套餐
  - glm抢购
  - bigmodel抢购
  - 抢GLM套餐
  - GLM Coding
  - bigmodel排队
  - 限流页面
  - 抢Coding套餐
version: "4.0"
created: "2025-04-16"
updated: "2026-04-18"
dependencies:
  - web-access（CDP Proxy 浏览器自动化）
---

# GLM 套餐代抢

## 前置条件

- **web-access skill** 已安装（提供 CDP Proxy 浏览器自动化能力）
- CDP Proxy 运行中（`localhost:3456`）
- Chrome 已登录 bigmodel.cn（检查 cookie `bigmodel_token_production`）

## 常量定义

```bash
export CDP_PROXY=http://localhost:3456
export RATE_LIMIT_API=/api/biz/rate-limit/check
export TOKEN_COOKIE=bigmodel_token_production
export DEFAULT_TARGET=/glm-coding
export MAX_TOTAL_TIMEOUT=300
```

---

## 第一部分：限流突破

### 限流机制

访问 bigmodel.cn 高峰期会被重定向到限流页：`https://bigmodel.cn/html/rate-limit.html?redirect=<path>`

**限流 API**：`GET /api/biz/rate-limit/check`
- `{"code":555, "msg":"系统繁忙"}` → 被限流
- `{"code":200, "msg":"操作成功", "data":true}` → 放行
- **注意**：API 放行 ≠ 页面导航放行，两者不同步

### 策略 A：浏览器内轮询（成功率约 50%）

在限流页注入轮询脚本，API 放行后自动跳转：

```javascript
(function() {
  var target = new URLSearchParams(window.location.search).get('redirect') || '/glm-coding';
  var tries = 0;
  var timer = setInterval(function() {
    tries++;
    fetch('/api/biz/rate-limit/check')
      .then(r => r.json())
      .then(d => {
        if (d.code === 200 && d.data === true) {
          clearInterval(timer);
          window.location.replace(target);
        }
      });
    if (tries > 60) clearInterval(timer);
  }, 1000);
})()
```

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

### 策略 C：浏览器内 fetch 绕过

浏览器内 `fetch()` 不触发导航级限流，可以拿到 SPA 的 HTML。但 `document.write` 注入后 JS 资源加载不完整，仅作应急手段。

---

## 第二部分：GLM Coding 套餐页面结构

### 套餐 productId 映射

| 套餐 | productId | 连续包月 | 首月 | 卡片索引 |
|------|-----------|---------|------|---------|
| Lite | product-02434c | 49 | 18 | 0 |
| Pro | product-1df3e1 | 149 | 90 | 1 |
| Max | product-2fc421 | 469 | 180 | 2 |

连续包季（9折）：Lite 44.1, Pro 134.1, Max 422.1
连续包年（8折）：Lite 39.2, Pro 119.2, Max 375.2

### 关键选择器

```
套餐卡片:     .package-card-box        (索引: 0=Lite, 1=Pro, 2=Max)
购买按钮:     button.buy-btn           (与卡片同序)
卡片名称:     .package-card-title .font-prompt
价格数字:     .price-number
周期切换:     .switch-tab-item         (0=月, 1=季, 2=年)
活动标签:     .switch-tab-item.active
折扣标签:     .discount-tip
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

### 售罄状态特征

- HTML: `disabled="disabled"` class 含 `is-disabled disabled`
- Vue: `cardData.disabled=true, cardData.soldOut=true`
- 按钮文本: "暂时售罄 ｜XX月XX日 XX:XX 补货"

### 购买流程调用链

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

---

## 第三部分：推荐流程——预部署驻留模式

### 致命陷阱（必读）

1. **绝对不要在补货窗口期刷新/导航页面！** 已加载的 SPA 页面内 Vue 数据会自动更新（响应式），刷新页面反而触发限流，浪费宝贵的补货窗口。
2. **补货窗口极短（1-2分钟）** 从补货开始到售罄可能只有1-2分钟，任何延迟都是致命的。
3. **正确策略是"驻留页面 + Vue 轮询 + 自动点击"** 不是"进页面→看按钮→点按钮"。

### Step 1. 提前加载页面（补货前 5 分钟）

```bash
# 检查已有 tabs，找到 url 含 bigmodel.cn/glm-coding 的 targetId
curl -sf "$CDP_PROXY/targets"
# 如果没有，提前新建（此时不限流）
curl -sf "$CDP_PROXY/new?url=https://bigmodel.cn/glm-coding"
```

如果遇到限流页，用第一部分的策略 A 突破。

### Step 2. 注入自动抢购脚本（补货前 1-2 分钟）

将以下 JS 写入文件后通过 CDP eval 注入。驻留在页面内，不依赖外部轮询延迟。

保存为 `grab_monitor.js`：

```javascript
(function() {
  var TARGET_INDEX = 1; // 0=Lite, 1=Pro, 2=Max —— 改这里切换目标套餐
  var CHECK_INTERVAL = 500; // 500ms 检测一次
  var MAX_WAIT = 300000; // 5分钟超时
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

    if (!data.soldOut && !data.disabled) {
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
# 写入文件（避免 MINGW64 中文编码问题）
cat > /tmp/grab_monitor.js << 'SCRIPT_EOF'
<上面的JS内容>
SCRIPT_EOF

# 注入
curl -sf -X POST "$CDP_PROXY/eval?target=$TID" --data-binary @/tmp/grab_monitor.js
sleep 1

# 验证注入成功
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

**不要关闭 tab**——用户需要完成支付。

---

## 第四部分：关键经验汇总

| 经验 | 详情 |
|------|------|
| 补货窗口 | 1-2分钟，从 soldOut=false 到售罄极快 |
| 绝对不要刷新页面 | 已加载 SPA 的 Vue 数据自动更新，刷新触发限流 |
| 驻留脚本 > 外部轮询 | 页面内 setInterval 直接访问 Vue 响应式数据，零网络延迟 |
| 限流 API | GET /api/biz/rate-limit/check，555=限流，200=放行 |
| fetch 绕过限流 | 浏览器内 fetch() 不触发导航级限流 |
| 按钮 disabled | 由 Vue 控制，需先移除 disabled 属性再 click |
| 支付验证码 | ticket + randstr 参数，首次购买可能触发人机验证 |
| AES 密钥 | `zhiPuAi123456789`（PayComponent KEY 字段）|
| Auth cookie | `bigmodel_token_production`（JWT, HS512）|
| 编码陷阱 | MINGW64/PowerShell 下 curl 传中文会乱码，必须写文件用 --data-binary @file 传递 |

---

## Changelog

- **v4.0** (2026-04-18): 合并 glm-package-grabber + glm-coding-grabber 为统一技能，标注 web-access 依赖，优化结构为四部分（限流突破/页面结构/推荐流程/经验汇总）
- **v3.0** (2026-04-17): 重大策略变更 — 预加载驻留+Vue数据轮询+自动点击模式；新增致命陷阱；新增页面结构/productId/选择器速查
- **v2.0** (2025-04-16): 常量集中管理、三策略自动级联
- **v1.0** (2025-04-16): 初始版本
