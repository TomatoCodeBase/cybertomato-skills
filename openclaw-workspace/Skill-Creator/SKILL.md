---
description: "Skill全生命周期工具：Create(创建)、Eval(评测)、Improve(改进)、Benchmark(基准测试)。从会话经验固化、结构化需求收集，到评测、迭代、基准确认。当需要创建skill、升级skill、评测skill、固化经验时使用。"
when_to_use: "创建skill、升级skill、评测skill、改进skill、做成skill、固化经验、skill设计、skill评测、skill基准测试、skill方法论、skillify、skill creator"
version: 3.0.0
---

# Skill-Creator

> Skill全生命周期管理：Create → Eval → Improve → Benchmark
> 基于：小七姐八大建构 + Claude Code skillify源码 + Claude Code Skill-Creator插件架构 + 实战经验

---

## 核心理念

**Skill是延迟加载的prompt片段，不是模块、不是进程。**

三个设计源泉：
1. **小七姐八大建构** → skill的灵魂（身份、价值判断、行为模式）
2. **Claude Code Skillify** → skill的骨架（四轮采访、模板规范、渐进式加载）
3. **实战踩坑** → skill的血肉（已知陷阱、Human checkpoint、兜底方案）

---

## 四种模式

触发时自动判断或由用户指定：

| 模式 | 触发场景 | 做什么 |
|------|---------|--------|
| **Create** | "创建skill"、"固化经验"、"做成skill" | 需求收集 → 设计 → 生成SKILL.md |
| **Eval** | "评测skill"、"跑测试" | 执行skill → 对比预期 → 评分 |
| **Improve** | "改进skill"、"优化skill" | 分析评测结果 → 定向修改 |
| **Benchmark** | "基准测试"、"A/B对比" | 多轮运行 → 方差分析 → 稳定性报告 |

---

## 🟢 Create 模式

### 子模式A：从会话固化（Skillify）

适用：刚完成一个可复用的流程，想抓取为skill。

**Step 1: 分析会话**
从当前/指定会话中提取：
- 执行了什么可复用流程
- 输入/参数是什么
- 有哪些步骤（按顺序）
- 每步的成功标准（artifacts/判断依据）
- 番茄在哪里纠正或引导了你
- 用了什么工具和权限
- 用了什么agent
- 目标和最终产出

**Step 2: 需求采访（四轮）**

**Round 1: 高层确认**
- 建议名称和描述，请番茄确认或改名
- 建议目标和成功标准

**Round 2: 细节补充**
- 列出识别到的步骤清单
- 如需参数，建议参数列表
- 运行方式：inline（当前会话）还是 forked（subagent独立上下文）
- 保存位置：
  - **项目级**（`projects/<name>/skills/`）
  - **全局级**（`skills/`）

**Round 3: 逐步拆解**
每个主要步骤（如果不是显而易见的话）：
- 这步产出什么给后续步骤用？（data、artifacts、IDs）
- 怎么证明这步成功了？
- 需要用户确认再继续吗？（不可逆操作必须标注）
- 有没有可以并行的步骤？
- 硬约束/硬偏好？

> 注意：番茄在会话中纠正过的地方，特别关注。

**Round 4: 最终确认**
- 触发词/触发场景
- 其他注意事项
- 简单流程不要过度提问

**Step 3: 生成SKILL.md**

**Step 4: 确认保存**
- 输出完整SKILL.md供审查
- 写入指定位置
- 告知调用方式和编辑方法

### 子模式B：从零创建

适用：番茄描述了一个需求，要从头设计skill。

直接进入 Create Step 2 的需求采访，跳过会话分析。

---

## 🟡 Eval 模式

**前置条件**：skill已有 `## 已知陷阱` 或 `## 评测用例` 章节，或番茄提供评测prompt。

**Step 1: 准备评测**
- 读取目标skill的SKILL.md
- 确定评测维度（按skill类型自动选择或番茄指定）：
  - **准确性**：输出是否符合预期？
  - **完整性**：流程是否全覆盖？
  - **鲁棒性**：边界情况是否处理？
  - **效率**：步骤是否冗余？
  - **安全性**：有无危险操作未标注？

**Step 2: 执行评测**
- 使用subagent运行skill（模拟真实调用）
- 对比输出与预期

**Step 3: 评分**
每个维度1-5分，给出：
- 具体扣分原因
- 改进建议（优先级排序）
- 通过/不通过判定

**评测报告格式**：
```markdown
## 评测报告 - {skill-name}
**日期**：YYYY-MM-DD
**维度评分**：准确X | 完整X | 鲁棒X | 效率X | 安全X
**总分**：X/25

### 发现
1. [问题] 具体描述 → 建议
2. ...

### 结论
✅ PASS / ⚠️ CONDITIONAL / ❌ FAIL
```

---

## 🟠 Improve 模式

**前置条件**：已有评测报告（Eval产出）或番茄描述具体问题。

**Step 1: 分析**
- 读取评测报告或问题描述
- 定位skill中需要修改的部分
- 评估修改影响范围

**Step 2: 修改**
按优先级逐项改进：
1. **Critical**（功能缺陷）：立即修复
2. **High**（流程优化）：显著改进
3. **Medium**（体验提升）：有余力再做
4. **Low**（代码风格）：记录备忘

**Step 3: 验证**
- 修改后重新跑评测用例
- 确认没有引入新问题
- 更新已知陷阱章节

**Step 4: 记录**
- 在SKILL.md `## 更新日志` 追加本次改动
- 如果有通用经验，沉淀到方法论部分

---

## 🔴 Benchmark 模式

**前置条件**：skill已通过Eval。

**Step 1: 准备**
- 确定基准用例（3-10个典型场景）
- 确定运行轮次（建议5-10轮）
- 确定评估指标（质量分、耗时、token消耗）

**Step 2: 执行**
- 每个用例 × 每轮独立运行
- 使用subagent隔离运行环境
- 记录每次运行的完整结果

**Step 3: 分析**
- 计算每个指标的均值、标准差、变异系数
- 识别不稳定用例（CV > 20%）
- 与上一版本对比（如有）

**基准报告格式**：
```markdown
## 基准报告 - {skill-name}
**日期**：YYYY-MM-DD
**轮次**：N轮 × M用例

### 结果汇总
| 用例 | 均分 | 标准差 | CV | 稳定性 |
|------|------|--------|-----|--------|
| case1 | X.X | X.X | X% | ✅/⚠️/❌ |

### 结论
- 平均质量分：X.X/5
- 稳定性：X%用例通过
- 不稳定用例：...
- 建议：...
```

---

## SKILL.md 标准模板

```markdown
---
description: 功能描述+触发场景。
when_to_use: 触发词1、触发词2、触发词3。
version: 1.0.0
---

# 技能名 (skill-name)

## 触发词
触发词1、触发词2、触发词3

## 前置条件
- 条件1

## 流程

### Step 1: 步骤名
具体操作。

**Success criteria**: 可验证标准

### Step 2: ...
...

## 已知陷阱（YYYY-MM-DD实战记录）
1. **标题**：现象+原因+解决方案

## 评测用例（可选）
1. **用例名**：输入→预期输出
```

---

## 目录结构规范

```
skill-name/
├── SKILL.md          # 必须，≤500行
├── scripts/          # 可执行脚本
├── references/       # 参考文档（按需加载）
└── assets/           # 模板/资源
```

**渐进式加载**（Claude Code设计）：
1. **元数据**（name+description）：始终在上下文，~100词
2. **SKILL.md body**：触发后加载，<5k词
3. **references/**：按需加载，无限

---

## 质量检查清单

Create完成后自动跑：

```
[ ] 触发词≤5个，简单直接
[ ] when_to_use 包含所有触发词
[ ] description ≤ 250字符
[ ] 每步都有 Success criteria
[ ] 已知陷阱≥3条（从零创建可豁免，标注"待补充"）
[ ] Human checkpoint 标注在不可逆操作
[ ] SKILL.md ≤ 500行
[ ] 没有README/CHANGELOG等冗余文件
[ ] scripts/里的脚本可以实际运行
[ ] frontmatter格式正确
```

---

## OpenClaw适配说明

- **Create模式**：直接在当前会话进行
- **Eval/Improve模式**：使用 `sessions_spawn` 创建subagent执行skill
- **Benchmark模式**：使用 `sessions_spawn` 批量创建subagent并行执行
- **触发词全匹配**：遵循 AGENTS.md 契约书规则
- **存储路由**：项目级skill放 `projects/`，全局skill放 `skills/`

---

## 核心洞见

1. **Skill本质是延迟加载的prompt片段**——在合适时机注入系统提示
2. **上下文是公共资源**——每个skill都在争token，concise is key
3. **Success criteria让skill自检**——不需要人类判断每步对不对
4. **已知陷阱是skill最有价值的部分**——踩过的坑不写下来，下次还要踩
5. **Human checkpoint不是失败**——自动化有边界，诚实标注比假装能做更有用
6. **模具越精细，产出越可靠**——小七姐方法建构核心
7. **评测驱动改进**——不猜哪里有问题，用数据说话
8. **四轮采访是skill质量的保障**——用户参与设计 > AI自己编

---

## 参考源

- 小七姐提示词八大建构：`D:\cybertomato\00-个人日记\Z知识学习\X小七姐提示词八大建构\`
- Claude Code skillify源码：`D:\G谷歌下载\Z重要资料\CluadeCode源码\claude-code-main\claude-code-main\src\skills\bundled\skillify.ts`
- Claude Code Skill系统精读：`D:\cybertomato\00-个人日记\Z知识学习\ClaudeCode源码精读\01-Skills技能系统.md`
- 实战范例：`skills/zhihu-auto/`、`skills/toutiao-auto/`、`skills/xhs-scraper/`
