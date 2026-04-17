---
name: zdm-auto
description: 什么值得买全自动化工具。覆盖每日签到、好价点值/收藏、文章点赞/收藏、评论、百科点评、爆料投稿、文章发布。通过CDP直连用户Chrome，天然携带登录态。触发词：什么值得买打卡、zdm打卡、smzdm签到、值得买任务、zdm-auto。
when_to_use: 用户要求在什么值得买完成每日任务、签到、爆料、发文章、评论互动时使用。
---

# 什么值得买自动化技能

通过CDP操作用户已登录的Chrome，自动完成什么值得买每日任务获取经验升级。

## 前置条件

- web-access CDP可用（`localhost:3456`）
- Chrome已登录什么值得买（用户名显示在右上角）

## 关键经验（踩坑记录）

1. **PowerShell中文编码**：JS中文字符串必须用Unicode escape（`\u7b7e\u5230`），否则通过curl.exe传递会乱码
2. **ProseMirror编辑器**：文章编辑器使用ProseMirror（`div.ProseMirror`），用`innerHTML`赋值+`input`事件触发
3. **签到是首页弹窗操作**：签到按钮 `a.J_punch` 在首页，点击后弹出签到结果弹窗（`#sign-model`），不是独立页面
4. **签到验证码**：签到可能触发图形验证码弹窗（`#imgcode-model`），需截图人工处理
5. **已签到状态**：`#sign-model` 元素class含 `success_sign` 表示今日已签到
6. **评论输入**：文章详情页评论框是 `textarea.textarea_comment`，非contenteditable
7. **爆料是分步表单**：先粘贴商品URL→自动获取信息→填写价格/推荐理由→提交，不是一步到位
8. **列表页懒加载**：好价列表/文章列表需要滚动加载更多内容
9. **操作间隔**：操作过快触发风控，点值/收藏/评论间需1-2秒间隔
10. **评论去重**：完全相同的评论会被过滤，每条评论内容需有变化
11. **文件传递**：超过500字的JS代码，先写到`.js`文件，再用`Get-Content -Raw -Encoding UTF8`读入后curl传递
12. **文章发布按钮可能需要CDP真实点击**：若JS `.click()` 只触发视觉反馈不执行发布，改用 `/clickAt`

## 内容策略

### 内容定位
- **领域**：AI、科技、独立开发、效率工具
- **禁止**：涉及私人生活内容
- **人设**：科技领域的独立开发者，关注好价和消费决策

### 内容来源（优先级）
1. `D:\cybertomato\03-内容工厂\日报\` — 每日AI热点日报
2. 好价发现 — 从好价列表中找到科技/AI相关商品进行爆料
3. 知乎打卡想法 — 可复用当天知乎想法的核心观点

### 评论生成原则
- 与文章内容相关，不能纯水评
- 每条评论至少15字，有变化
- 避免模板化表达（"写得很好"、"感谢分享"等）

## 步骤

### 1. 每日签到

```
navigate → https://www.smzdm.com/
```

```javascript
// 检查签到状态
var signModel = document.getElementById('sign-model');
var isSigned = signModel && signModel.className.indexOf('success_sign') !== -1;
// 返回 isSigned
```

若未签到：
```
POST /click?target={id} → a.J_punch
```

签到后检查是否弹出验证码（`#imgcode-model`），如有则截图人工处理。

**Success criteria**: `#sign-model` 包含 `success_sign` class。

### 2. 检查经验状态

```
navigate → https://zhiyou.smzdm.com/user/
```

提取：经验值、金币、碎银子、签到天数。

### 3. 好价点值 + 收藏

```
navigate → https://www.smzdm.com/jingxuan/
```

遍历好价卡片，点击"值"和收藏按钮。每个操作间隔1-2秒。
达到每日上限（各20个）后停止。

### 4. 文章点赞 + 收藏

```
navigate → https://post.smzdm.com/
```

从社区列表进入文章详情页，点击点赞和收藏。
- 点赞：`a.J_zhi_like_fav.J_zhi_like_f`
- 收藏：收藏按钮
达到每日上限（各24个）后停止。

### 5. 发布文章评论

进入文章详情页（`https://post.smzdm.com/p/XXXXX/`）：

```javascript
// 填写评论
var textarea = document.querySelector('textarea.textarea_comment');
var setter = Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype, 'value').set;
setter.call(textarea, '\u8bc4\u8bba\u5185\u5bb9');
textarea.dispatchEvent(new Event('input', {bubbles: true}));
textarea.dispatchEvent(new Event('change', {bubbles: true}));
```

```
POST /click?target={id} → .btn_sub
```

每篇文章1条评论，共6篇，内容各不相同。

### 6. 百科商品点评

```
navigate → https://wiki.smzdm.com/
```

找到商品页，填写简短点评后提交。每日5个，经验值最高。

### 7. 爆料投稿（可选）

```
navigate → https://www.smzdm.com/baoliao/
```

分步操作：
1. 粘贴商品URL到输入框
2. 点击"下一步"（`.next`）
3. 等待自动获取信息
4. 填写价格和推荐理由
5. 提交

注意每周有基础条数限制（当前10条）。

### 8. 文章投稿（可选）

```
navigate → https://post.smzdm.com/tougao/
→ 点击"发布新文章" → 进入编辑器
```

编辑器操作：
- 标题：`textarea.article-title`
- 正文：`div.ProseMirror`（innerHTML赋值 + input事件触发）
- 品牌：`input[placeholder="+添加品牌"]`
- 发布：`button.publish-btn`（可能需要 `/clickAt`）

```javascript
// ProseMirror内容注入
var editor = document.querySelector('.ProseMirror');
editor.innerHTML = '<p>\u7b2c\u4e00\u6bb5</p><p>\u7b2c\u4e8c\u6bb5</p>';
editor.dispatchEvent(new Event('input', {bubbles: true}));
```

### 9. 创作活动（可选）

```
navigate → https://zhiyou.smzdm.com/chuangzuohuodong/
```

查看当前可参与的活动，选择合适活动参与。

## 常用URL

| 页面 | URL |
|------|-----|
| 首页（签到） | `https://www.smzdm.com/` |
| 用户中心 | `https://zhiyou.smzdm.com/user/` |
| 好价精选 | `https://www.smzdm.com/jingxuan/` |
| 社区 | `https://post.smzdm.com/` |
| 文章投稿 | `https://post.smzdm.com/tougao/` |
| 爆料投稿 | `https://www.smzdm.com/baoliao/` |
| 创作活动 | `https://zhiyou.smzdm.com/chuangzuohuodong/` |
| 百科 | `https://wiki.smzdm.com/` |
| 我的文章 | `https://zhiyou.smzdm.com/user/article/` |
| 我的爆料 | `https://zhiyou.smzdm.com/user/submit/` |
| 我的收藏 | `https://zhiyou.smzdm.com/user/favorites/youhui/` |
