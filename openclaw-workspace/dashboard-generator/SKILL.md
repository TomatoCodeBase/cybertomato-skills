---
description: 生成艾伊思控制台HTML仪表盘。从MEMORY.md/contracts/cron/skills实时读取系统数据，渲染为可交互的HTML文件（搜索/Tab/复制触发词）。触发词：控制台、生成控制台、dashboard、更新控制台。
when_to_use: 控制台、生成控制台、dashboard、更新控制台、控制面板
version: 1.0.0
---

# 控制台生成器 (dashboard-generator)

## 触发词
控制台、生成控制台、dashboard、更新控制台

## 前置条件
- MEMORY.md 存在且数据最新
- assets/template.html 模板文件存在

## 流程

### Step 1: 采集系统数据
并行读取以下数据源，提取结构化信息：

**1.1 触发词/契约表**（从 MEMORY.md 的「契约书系统」章节）
- 提取每条：触发词、契约名、交互模式(instant/dialog)、级别(L1/L2/L3)

**1.2 技能列表**（从 SKILL.md frontmatter 的 description + when_to_use）
- 读取 `~/.hermes/skills/` 下所有 SKILL.md 的 frontmatter
- 分类：content/tool/productivity/seo/social/system/learning/image
- 提取：名称、描述、触发词、分类

**1.3 Cron任务**（调用 cron list）
- 提取：任务名、计划、模式、状态

**1.4 AI团队**（从 MEMORY.md 的「AI家族」章节）
- 提取：成员名、角色、职责、状态

**Success criteria**: 4个数据源全部成功读取，无null值

### Step 2: 渲染HTML
用 assets/template.html 作为模板，将数据填充为HTML：

**2.1 统计卡片**
- 触发词数 = 契约表行数
- 技能数 = skills目录下SKILL.md文件数
- Cron数 = cron list返回的任务数
- 团队成员数 = AI家族有效成员数

**2.2 契约表**
```html
<tr data-type="{instant|dialog}" data-level="l1|l2|l3">
  <td><span class="trigger-word">{触发词}</span></td>
  <td>{契约名}</td>
  <td><span class="tag tag-{instant|dialog}">...</span></td>
  <td><span class="tag tag-{level}">...</span></td>
  <td>✅ 活跃</td>
</tr>
```

**2.3 技能卡片**
```html
<div class="skill-card" data-cat="{分类}" data-search="{关键词}">
  <div class="skill-header">
    <div class="skill-name">{emoji} {名称}</div>
    <span class="skill-cat cat-{分类}">{分类}</span>
  </div>
  <div class="skill-desc">{描述}</div>
  <div class="skill-triggers">
    <span class="skill-trigger">{触发词}</span>...
  </div>
</div>
```

**2.4 Cron表和AI团队表**直接填充

**Success criteria**: 生成的HTML包含正确的data-type/data-cat属性，所有触发词可点击

### Step 3: 输出与同步
- 写入 `~/workspace/tools/control-dashboard.html`
- 同步到 `C:\Users\FIREBAT\Desktop\control-dashboard.html`
- 更新 header-meta 日期为当天
- 更新 footer 版本号和日期

**Success criteria**: 两个路径文件内容一致，日期为当天

### Step 4: 记录
在 MEMORY.md 的工具相关章节添加/更新控制台位置记录：
```
**艾伊思控制台**：`~/workspace/tools/control-dashboard.html`（桌面同步）
```

**Success criteria**: MEMORY.md 包含控制台文件路径

---

## 输出规范

### 技能分类映射
| 关键词 | 分类 | cat class |
|--------|------|-----------|
| 写作/内容/发布/文章/标题/排版/灵感/解剖/选题 | content | cat-content |
| PPT/数据/幼托/日记/笔记/联网/打卡/爬取/闲鱼/知乎/头条/百家号 | tool | cat-tool |
| 天气/效率/管理 | productivity | cat-productivity |
| SEO/审计/简报/程序化 | seo | cat-seo |
| 推特/虾聊/工作流 | social | cat-social |
| 技能/主动性/自改进/审查/安全/节点/加密货币/会话 | system | cat-system |
| 导师/学习/技术博客 | learning | cat-learning |
| 图片/绘图/画图 | image | cat-image |

### 级别映射
| MEMORY.md标记 | 级别 | data-level |
|--------------|------|------------|
| 无特殊标记 / 简单操作 | L1 | l1 |
| 多步操作 / 需读取多文件 | L2 | l2 |
| 完整Skill流程 | L3 | l3 |

### 技能emoji速查
| 分类 | 默认emoji |
|------|----------|
| 写作类 | 🍅/📝/✍️/📋/🏷️ |
| 工具类 | 📊/📁/📔/📒/🌐/📘/📰/📕/🐟 |
| 社交类 | 🐦/🦞/🤖 |
| 系统类 | 🛠️/🧠/🔄/🛡️/🔒/🔗/💎/🔍 |
| 学习类 | 🎓/💻 |
| 图片类 | 🎨 |
| SEO类 | 🔍/📋/🏭 |
| 效率类 | 🌤️/⏰ |

---

## 关键URL
| 页面 | URL |
|------|-----|
| WebChat | http://127.0.0.1:18789/chat?session=agent%3Amain%3Amain |
| 模板 | assets/template.html |

---

## 已知陷阱（2026-04-03实战记录）
1. **分类不准**：某些skill同时属于多个分类（如web-access既是tool也是social），优先选最常用场景的分类
2. **触发词遗漏**：SKILL.md body里的触发词可能和frontmatter的when_to_use不一致，以when_to_use为准
3. **飞书系列技能**：lark-*系列是平台内置技能，不在workspace/skills下，需要单独从available_skills列表读取frontmatter
4. **HTML转义**：技能描述中可能包含<>&等字符，写入HTML前必须转义
5. **统计数字过时**：如果MEMORY.md未及时更新，统计数据会不准——生成前先提示用户是否需要先更新MEMORY
