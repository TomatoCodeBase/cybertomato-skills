---
domain: watcha.cn
aliases: [观猹, Watcha]
updated: 2026-04-15
---
## 平台特征
- Vue 3 SPA（`document.querySelector('#app').__vue_app__` 可检测）
- 产品页 URL 格式：`watcha.cn/products/{slug}`
- 评价系统叫"猹评"，分 GOOD/BAD 两档
- 评价输入框使用 ProseMirror/tiptap 富文本编辑器（`.tiptap.ProseMirror`）
- 页面有多个 ProseMirror 实例（产品描述、评价输入框、评论回复框等），需按位置/内容筛选目标编辑器

## 有效模式
- **填入评价内容**：`document.execCommand('insertText', false, text)` 对 ProseMirror 编辑器有效（2026-04-15）
- **选中 GOOD 评分**：JS `.click()` 即可，按钮 class 会变为含 `bg-(--p-primary-300)! text-white!`
- **提交评价**：必须用 CDP `clickAt`（真实鼠标事件），JS `.click()` 和 `dispatchEvent` 不够
- **提交按钮状态**：填入内容后提交按钮可能仍 disabled，需要在编辑器上 `dispatchEvent(new Event('input', {bubbles: true}))` 同步 Vue 状态，之后按钮变为 enabled（2026-04-15 验证：eval 返回 undefined 但实际生效）

## 已知陷阱
- 按钮索引会随页面状态变化（评价表单展开/关闭后按钮重新渲染，索引漂移）
- `innerText` 含换行符 `\n`，搜索按钮文本时用 `indexOf` 而非精确匹配
- 编辑器数量动态变化（评价提交后从 4 个变为 5 个），需按内容/位置定位而非固定索引
- 提交成功后表单区域（GOOD/BAD/发送猹评/取消按钮）从 DOM 消失，可作为提交成功的间接判断
