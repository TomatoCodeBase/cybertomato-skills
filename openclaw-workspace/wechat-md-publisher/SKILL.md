---
name: wechat-md-publisher
version: 1.0.0
description: 微信公众号 Markdown 转换与发布助手，支持预览、模板、推送草稿箱
---

# 微信公众号 Markdown 发布助手

## 任务目标

将 Markdown 文档转换为微信兼容的 HTML，并推送到公众号草稿箱。

**核心功能**：
- ✅ Markdown → 微信 HTML 转换（v3，代码块完美显示）
- ✅ 预览模式（不推送，只生成 HTML）
- ✅ 模板系统（多种文章风格）
- ✅ 推送草稿箱（支持固定/自定义封面）
- ✅ 返回草稿 ID

**触发词**：微信草稿

**契约书**：微信草稿

---

## 当前模板

### 内置模板（v3 转换器）

| 模板元素 | 样式特征 | CSS 属性 |
|---------|---------|---------|
| **H1 标题** | 居中、大号、粗体 | `font-size: 26px; text-align: center; color: #2c3e50` |
| **H2 标题** | 左对齐、下边框 | `font-size: 22px; border-bottom: 2px solid #3498db` |
| **H3 标题** | 左对齐、左边框 | `font-size: 18px; border-left: 4px solid #3498db` |
| **无序列表** | 蓝色圆点、缩进 | `padding-left: 24px; color: #3498db` |
| **有序列表** | 蓝色数字、缩进 | `padding-left: 32px; color: #3498db` |
| **引用块** | 灰色背景、蓝色左边框 | `background-color: #f8f9fa; border-left: 4px solid #3498db` |
| **代码块** | 浅灰背景、圆角、等宽字体 | `background-color: #f6f8fa; border-radius: 6px; font-family: Consolas` |
| **分隔线** | 灰色细线 | `border-top: 1px solid #e0e0e0` |
| **图片** | 居中、圆角、阴影 | `border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1)` |
| **加粗** | 红色、粗体 | `color: #e74c3c; font-weight: bold` |
| **斜体** | 灰色、斜体 | `font-style: italic; color: #7f8c8d` |
| **行内代码** | 灰色背景、圆角、红色 | `background-color: #f1f2f6; color: #e74c3c` |

### 未来扩展模板

| 模板名称 | 用途 | 特征 |
|---------|------|------|
| **科技风格** | 技术文章 | 蓝紫配色、代码块突出 |
| **极简风格** | 轻松阅读 | 黑白配色、大量留白 |
| **商务风格** | 正式文章 | 深蓝配色、专业感 |
| **活泼风格** | 轻松内容 | 多彩配色、趣味图标 |

---

## 前置准备

### 凭证准备

1. **微信公众号凭证**：
   - 登录微信开发者平台 https://mp.weixin.qq.com
   - 进入"开发"→"基本配置"
   - 获取 AppID 和 AppSecret
   - 启用/重置 AppSecret 需要管理员扫码验证

2. **环境变量设置**：
   ```bash
   # Windows（PowerShell）
   $env:WECHAT_APP_ID='your_app_id'
   $env:WECHAT_APP_SECRET='your_app_secret'

   # 永久设置
   [Environment]::SetEnvironmentVariable('WECHAT_APP_ID','your_app_id','User')
   [Environment]::SetEnvironmentVariable('WECHAT_APP_SECRET','your_app_secret','User')
   ```

### 依赖说明

- Python 脚本：无额外依赖（使用标准库）
- 需要网络访问微信公众号 API

---

## 操作步骤

### 流程 1：预览模式（推荐先预览）

**使用场景**：转换 Markdown 文件，生成 HTML 供预览，不推送到草稿箱

**命令**：
```bash
python scripts/markdown_to_wechat_v2.py --input article.md --output article.html
```

**智能体操作**：
1. 用户说："微信草稿预览 article.md"
2. 读取 Markdown 文件
3. 转换为微信 HTML
4. 保存到 `temp/article.html`
5. 用浏览器打开 HTML 文件
6. 告知用户："预览文件已打开，请确认效果"

**示例对话**：
```
用户: 微信草稿预览 D:\文章\openclaw-guide.md
智能体:
✅ 正在转换...
✅ HTML 已生成：temp/openclaw-guide.html
✅ 浏览器已打开预览文件
📝 文件大小：68KB
🎨 代码块：3个
📊 标题：12个（H1: 1, H2: 8, H3: 3）

请确认效果，满意后说"发布到草稿箱"
```

---

### 流程 2：发布到草稿箱

**使用场景**：转换 Markdown 文件，直接推送到公众号草稿箱

**命令**：
```bash
python scripts/publish_to_draft.py \
  --input article.md \
  --title "文章标题" \
  --author "作者名" \
  --digest "文章摘要" \
  [--thumb-media-id "封面图ID"]  # 可选，不传则使用测试封面
```

**智能体操作**：
1. 用户说："微信草稿 article.md"
2. 读取 Markdown 文件
3. 转换为微信 HTML
4. 检查是否提供封面（不提供则用测试封面）
5. 推送到草稿箱
6. 返回草稿 ID

**示例对话**：
```
用户: 微信草稿 D:\文章\openclaw-guide.md
智能体:
✅ 正在转换...
✅ HTML 已生成（68KB）
✅ 使用测试封面（节省豆包API调用）
✅ 正在推送到草稿箱...

🎉 草稿创建成功！
📝 草稿ID：REDACTED_DRAFT_ID
📋 标题：OpenClaw 工作区文件完全指南
👤 作者：赛博番茄
🎨 封面：测试封面
📊 字数：约 3500 字

请在公众号后台确认并发布
```

---

### 流程 3：批量转换（未来扩展）

**使用场景**：批量转换多个 Markdown 文件

**命令**：
```bash
python scripts/batch_convert.py --input-dir articles/ --output-dir html/
```

**状态**：⏳ 计划中

---

## 契约书系统

### 触发词

**触发词**：`微信草稿`

**契约内容**：
1. 识别用户意图（预览 or 发布）
2. 读取 Markdown 文件
3. 转换为微信 HTML
4. 预览模式：打开浏览器
5. 发布模式：推送到草稿箱

### 交互模式

**模式1：预览模式**
- 用户："微信草稿预览 article.md"
- 智能体：转换 → 打开浏览器 → 等待确认

**模式2：发布模式**
- 用户："微信草稿 article.md"
- 智能体：转换 → 推送草稿箱 → 返回草稿ID

**模式3：完整流程**
- 用户："微信草稿 article.md 标题 作者 摘要"
- 智能体：转换 → 推送草稿箱 → 返回草稿ID

---

## 模板系统

### 当前模板：默认模板（v3）

**样式特征**：
- 蓝色主题（`#3498db`）
- 简洁大气
- 代码块突出
- 100% 微信兼容

**CSS 颜色方案**：
```css
主色调：#3498db（蓝色）
强调色：#e74c3c（红色，用于加粗）
背景色：#f6f8fa（浅灰）
文字色：#2c3e50（深灰蓝）
边框色：#e1e4e8（灰色）
```

### 未来模板（计划中）

**模板1：科技风格**
- 深色背景
- 高亮代码块
- 技术感图标

**模板2：极简风格**
- 黑白配色
- 大量留白
- 专注内容

**模板3：商务风格**
- 深蓝配色
- 专业排版
- 正式感

**模板4：活泼风格**
- 多彩配色
- 趣味图标
- 轻松阅读

**使用方法**（未来）：
```bash
python scripts/markdown_to_wechat_v2.py \
  --input article.md \
  --output article.html \
  --template tech  # 指定模板
```

---

## 技术细节

### 代码块处理（v3 核心修复）

**处理顺序**：
```
1. 去除 markdown 符号（**、*、~~）
2. 转义 HTML 特殊字符（<、>、&）
3. 替换换行符（\n → <br />）
4. 替换缩进（空格 → &nbsp;）
5. 包装在 <section> 中
```

**CSS 属性**（100% 微信兼容）：
```html
<section style="
  background-color: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  margin: 16px 0;
  border: 1px solid #e1e4e8;
  font-family: Consolas, Monaco, monospace;
  font-size: 14px;
  color: #24292e;
  line-height: 1.6;
">
代码内容（用 &lt;br /&gt; 换行，用 &amp;nbsp; 缩进）
</section>
```

### 微信兼容性

**必须遵守**：
1. ✅ 所有样式内联（不用 `<style>` 块）
2. ✅ 嵌套层级 ≤2层（远低于微信5层限制）
3. ✅ 只用微信兼容属性
4. ✅ 代码块用 `<br />` 换行 + `&nbsp;` 缩进

**不稳定的 CSS 属性**：
- ❌ `white-space: pre-wrap`（微信支持不稳定）
- ❌ `counter-reset`（微信不支持）

---

## 注意事项

### 文件大小限制

- 微信公众号草稿 API 对内容长度有限制
- 超过 9000 字建议分批写入
- 使用 `temp/create_draft_from_file.py` 支持大文件

### 测试封面

**固定封面 ID**：`YOUR_THUMB_MEDIA_ID`

**优势**：
- ✅ 节省豆包 API 调用
- ✅ 加快测试速度
- ✅ 减少 Token 消耗

**使用方法**：
```bash
# 不传 --thumb-media-id，自动使用测试封面
python scripts/publish_to_draft.py --input article.md --title "测试文章"
```

---

## 资源索引

- 核心脚本：
  - **[scripts/markdown_to_wechat_v2.py](scripts/markdown_to_wechat_v2.py)** - Markdown 转微信 HTML（v3，推荐）
  - [scripts/markdown_to_wechat_clean.py](scripts/markdown_to_wechat_clean.py) - Markdown 转微信 HTML（简洁版）
  - [scripts/publish_to_draft.py](scripts/publish_to_draft.py) - 推送到草稿箱（待创建）
- 测试文件：
  - [temp/wechat-html-v3-bold-removed.html](../../temp/wechat-html-v3-bold-removed.html) - v3 预览文件
  - [temp/openclaw-guide-v5-v3.html](../../temp/openclaw-guide-v5-v3.html) - 完整HTML示例
- 参考资料：
  - [references/wechat-html-spec.md](references/wechat-html-spec.md) - 微信 HTML 规范（待创建）
  - [.learnings/LEARNINGS.md](../../.learnings/LEARNINGS.md) - 教训记录（LRN-20260322-005、LRN-20260322-006）

---

## 示例对话

### 示例1：预览模式

```
用户: 微信草稿预览 D:\OpenClaw\workspace\temp\openclaw-guide-v5.md

智能体:
✅ 正在转换 Markdown...
✅ HTML 已生成：temp/openclaw-guide-v5-v3.html（68KB）
✅ 浏览器已打开预览文件

📊 转换统计：
- 标题：12个（H1: 1, H2: 8, H3: 3）
- 代码块：8个
- 列表：15个（无序: 10, 有序: 5）
- 引用：3个
- 图片：2个

🎨 样式特征：
- 蓝色主题（#3498db）
- 代码块完美显示（v3 修复）
- 100% 微信兼容

请确认效果，满意后说"发布到草稿箱"
```

### 示例2：发布模式

```
用户: 微信草稿 D:\OpenClaw\workspace\temp\openclaw-guide-v5.md

智能体:
✅ 正在转换 Markdown...
✅ HTML 已生成（68KB）
✅ 使用测试封面（节省豆包API调用）
✅ 正在推送到草稿箱...

🎉 草稿创建成功！

📝 草稿ID：REDACTED_DRAFT_ID
📋 标题：OpenClaw 工作区文件完全指南
👤 作者：赛博番茄
🎨 封面：测试封面
📊 字数：约 3500 字

请在公众号后台确认并发布
```

---

*最后更新：2026-03-22 16:35*
*版本：v1.0.0*
