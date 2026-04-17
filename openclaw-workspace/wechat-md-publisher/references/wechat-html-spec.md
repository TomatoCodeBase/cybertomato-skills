# 微信公众号 HTML 格式规范

> 微信公众号编辑器非常"古典"，HTML 排版有严格限制
> 最后更新：2026-03-22

---

## 核心限制

### 1. 样式规则

**必须使用内联样式**：
```html
<!-- ❌ 错误：不能使用 <style> 块 -->
<style>
.title { color: red; }
</style>
<p class="title">标题</p>

<!-- ✅ 正确：所有样式内联 -->
<p style="color: red; font-size: 16px;">标题</p>
```

### 2. 嵌套层级

**嵌套层级 ≤5层**：
```html
<!-- ❌ 错误：6层嵌套 -->
<section>
  <div>
    <ul>
      <li>
        <span>
          <strong>内容</strong>
        </span>
      </li>
    </ul>
  </div>
</section>

<!-- ✅ 正确：2层嵌套 -->
<section>
  <strong>内容</strong>
</section>
```

### 3. 标签限制

**支持的标签**：
- ✅ `<section>` - 主要容器
- ✅ `<p>` - 段落
- ✅ `<br />` - 换行
- ✅ `<strong>` - 加粗
- ✅ `<em>` - 斜体
- ✅ `<a>` - 链接
- ✅ `<img>` - 图片

**不推荐标签**：
- ⚠️ `<div>` - 可能被过滤
- ⚠️ `<span>` - 功能有限
- ❌ `<style>` - 不支持
- ❌ `<script>` - 不支持

---

## CSS 属性兼容性

### 100% 兼容属性

**文本样式**：
- ✅ `color` - 文字颜色
- ✅ `font-size` - 字号
- ✅ `font-weight` - 粗体
- ✅ `font-style` - 斜体
- ✅ `font-family` - 字体
- ✅ `line-height` - 行高
- ✅ `text-align` - 对齐

**盒模型**：
- ✅ `padding` - 内边距
- ✅ `margin` - 外边距
- ✅ `border` - 边框
- ✅ `border-radius` - 圆角
- ✅ `width` - 宽度
- ✅ `max-width` - 最大宽度

**背景**：
- ✅ `background-color` - 背景色
- ⚠️ `background-image` - 支持有限

**其他**：
- ✅ `box-shadow` - 阴影
- ✅ `opacity` - 透明度

### 不稳定/不支持属性

**不稳定**：
- ⚠️ `white-space: pre-wrap` - 代码块换行（支持不稳定）
- ⚠️ `display: flex` - 弹性布局（支持有限）
- ⚠️ `position` - 定位（支持有限）

**不支持**：
- ❌ `counter-reset` - CSS 计数器
- ❌ `counter-increment` - CSS 计数器
- ❌ `::before` - 伪元素
- ❌ `::after` - 伪元素

---

## 特殊字符处理

### 换行符

**HTML 中的换行符不会渲染**：
```html
<!-- ❌ 错误：\n 不会显示为换行 -->
<section>第一行
第二行</section>

<!-- ✅ 正确：使用 <br /> -->
<section>第一行<br />第二行</section>
```

### 空格

**普通空格会被折叠**：
```html
<!-- ❌ 错误：多个空格会变成1个 -->
<section>    缩进</section>

<!-- ✅ 正确：使用 &nbsp; -->
<section>&nbsp;&nbsp;&nbsp;&nbsp;缩进</section>
```

### 双引号

**双引号转义会显示异常**：
```html
<!-- ❌ 错误：&quot; 显示异常 -->
<section># 先知道&quot;我是谁&quot;</section>

<!-- ✅ 正确：直接使用双引号 -->
<section># 先知道"我是谁"</section>
```

### HTML 转义

**必须转义**：
- ✅ `<` → `&lt;`
- ✅ `>` → `&gt;`
- ✅ `&` → `&amp;`

**不转义**：
- ❌ `"` → `&quot;`（微信中显示异常）
- ❌ `'` → `&apos;`（无需转义）

---

## 代码块最佳实践

### 推荐方案

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
代码内容（用 &lt;br /&gt; 换行，用 &amp;nbsp; 保持缩进）
</section>
```

### 处理流程

```
1. 去除 markdown 符号（**、*、~~）
2. 转义 HTML 特殊字符（< → &lt;, > → &gt;, & → &amp;）
3. 替换换行符（\n → <br />）
4. 替换缩进（空格 → &nbsp;）
5. 包装在 <section> 中
```

### ❌ 不推荐方案

```html
<!-- 不推荐：使用 <pre><code> -->
<pre><code>
代码内容
</code></pre>

<!-- 不推荐：使用 white-space: pre-wrap -->
<section style="white-space: pre-wrap;">
代码内容
</section>
```

---

## 列表最佳实践

### 无序列表

**推荐：每项独立 section**：
```html
<section style="margin: 8px 0; padding: 0 0 0 24px; font-size: 16px; line-height: 1.8; color: #333;">
  <span style="color: #3498db; font-weight: bold; margin-right: 8px;">•</span>列表项1
</section>
<section style="margin: 8px 0; padding: 0 0 0 24px; font-size: 16px; line-height: 1.8; color: #333;">
  <span style="color: #3498db; font-weight: bold; margin-right: 8px;">•</span>列表项2
</section>
```

### 有序列表

**推荐：手动编号**：
```html
<section style="margin: 8px 0; padding: 0 0 0 32px; font-size: 16px; line-height: 1.8; color: #333;">
  <span style="color: #3498db; font-weight: bold; margin-right: 8px;">1.</span>列表项1
</section>
<section style="margin: 8px 0; padding: 0 0 0 32px; font-size: 16px; line-height: 1.8; color: #333;">
  <span style="color: #3498db; font-weight: bold; margin-right: 8px;">2.</span>列表项2
</section>
```

### ❌ 不推荐方案

```html
<!-- 不推荐：使用 <ul><li>（嵌套太深） -->
<ul>
  <li>列表项1</li>
  <li>列表项2</li>
</ul>

<!-- 不推荐：使用 CSS counter（微信不支持） -->
<style>
  ol { counter-reset: item; }
  li { counter-increment: item; }
  li::before { content: counter(item) "."; }
</style>
```

---

## 嵌套层级优化

### 计算规则

每个标签算1层：
```
<section>           <!-- 第1层 -->
  <p>              <!-- 第2层 -->
    <strong>        <!-- 第3层 -->
      内容
    </strong>
  </p>
</section>
```

### 优化策略

**推荐：扁平化结构**：
```html
<!-- 标题：1层 -->
<section style="font-size: 26px; font-weight: bold; color: #2c3e50; text-align: center;">
  标题
</section>

<!-- 段落：1层 -->
<section style="margin: 12px 0; font-size: 16px; line-height: 1.8; color: #333;">
  段落内容
</section>

<!-- 加粗：1层（内联样式） -->
<section style="margin: 12px 0; font-size: 16px; line-height: 1.8; color: #333;">
  这是<strong style="color: #e74c3c; font-weight: bold;">加粗</strong>文字
</section>
```

---

## 颜色方案

### 推荐配色

**主色调**：蓝色系
```css
/* 主色 */
--primary: #3498db;      /* 天蓝色 */
--primary-dark: #2980b9; /* 深蓝色 */

/* 强调色 */
--accent: #e74c3c;       /* 红色（用于加粗） */

/* 背景色 */
--bg-light: #f6f8fa;     /* 浅灰色（代码块） */
--bg-lighter: #f8f9fa;   /* 更浅灰色（引用块） */

/* 文字色 */
--text-primary: #2c3e50; /* 深灰蓝（标题） */
--text-secondary: #333;  /* 深灰（正文） */
--text-muted: #555;      /* 灰色（引用文字） */
--text-code: #24292e;    /* 深灰（代码） */

/* 边框色 */
--border: #e1e4e8;       /* 浅灰色 */
--border-primary: #3498db; /* 蓝色（左边框） */
```

### 颜色单位

**推荐**：
- ✅ 十六进制：`#3498db`
- ✅ RGB：`rgb(52, 152, 219)`

**不推荐**：
- ⚠️ 颜色名称：`blue`（不精确）
- ❌ HSL：`hsl(204, 70%, 53%)`（支持不稳定）

---

## 单位建议

### 推荐单位

**字号**：
- ✅ `px` - 像素（推荐）
- ✅ `em` - 相对单位

**间距**：
- ✅ `px` - 像素（推荐）
- ⚠️ `%` - 百分比（支持有限）

**宽度**：
- ✅ `px` - 像素
- ✅ `%` - 百分比

### 不推荐单位

- ❌ `rem` - 支持不稳定
- ❌ `vw/vh` - 支持不稳定

---

## 测试检查清单

发布前必须检查：

### 结构检查
- [ ] 所有样式内联（无 `<style>` 块）
- [ ] 嵌套层级 ≤5层
- [ ] 只用支持标签（`<section>`、`<p>`、`<br />` 等）

### 样式检查
- [ ] 只用兼容属性
- [ ] 颜色格式正确（十六进制或 RGB）
- [ ] 单位正确（px 或 em）

### 内容检查
- [ ] 代码块用 `<br />` 换行
- [ ] 代码块用 `&nbsp;` 缩进
- [ ] 双引号不转义
- [ ] HTML 特殊字符已转义

### 兼容性检查
- [ ] 在微信公众号后台预览
- [ ] 在手机上预览
- [ ] 检查所有元素显示正常

---

## 参考资料

**官方文档**：
- 微信公众平台开发文档：https://developers.weixin.qq.com/doc/offiaccount/Getting_Started/Overview.html

**教程**：
- 微信公众号编辑器 HTML 规范：https://developers.weixin.qq.com/doc/offiaccount/Asset_Management/Adding_Permanent_Assets.html

**教训记录**：
- LRN-20260322-005：微信公众号 HTML 排版规范
- LRN-20260322-006：代码块内的 markdown 加粗符号需要专门去除

---

*最后更新：2026-03-22*
