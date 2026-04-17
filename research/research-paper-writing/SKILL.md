---
name: research-paper-writing
title: Research Paper Writing Pipeline
description: End-to-end pipeline for writing ML/AI research papers — experiment design, analysis, drafting, revision, submission. Covers NeurIPS, ICML, ICLR, ACL, AAAI, COLM.
version: 3.0.0
---

# Research Paper Writing Pipeline

**非线性迭代循环**：结果触发新实验，审稿触发新分析，不是线性流水线。

```
Phase 0: Setup → Phase 1: Literature → Phase 2: Experiment Design
                                    ↓
Phase 7: Submission ← Phase 6: Review/Revise ← Phase 5: Draft ← Phase 4: Analysis ← Phase 3: Execute
         ↑________________________feedback loops_________________________|
```

## 核心铁律

1. **主动出草稿**，不问"你想怎么写"。高信心→完整草稿，低信心→1-2个靶向问题后草稿
2. **绝不凭记忆生成引用**。AI引用~40%错误率。必须程序化获取，无法验证标 `[CITATION NEEDED]`
3. **论文=故事**。一个清晰贡献，一句话说清。说不清=没准备好写
4. **实验服务声明**。每个实验必须显式映射到它支持的claim，无关实验不跑
5. **Early & often commit**。每批实验、每版草稿都commit

## 引用验证（每条必过5步）

```
1. SEARCH → Semantic Scholar / Exa MCP 搜索
2. VERIFY → 2+来源确认（Semantic Scholar + arXiv/CrossRef）
3. RETRIEVE → DOI content negotiation获取BibTeX
4. VALIDATE → 确认引用的claim确实出现在论文中
5. ADD → 加入bibliography
任一步失败 → [CITATION NEEDED]，告知科学家
```

DOI→BibTeX: `requests.get(f"https://doi.org/{doi}", headers={"Accept":"application/x-bibtex"}).text`

## Autoreason策略选择（非直觉！）

| 场景 | 策略 | 原因 |
|------|------|------|
| 中端模型+约束任务 | **Autoreason** | 甜点。生成-评估差距最大 |
| 中端模型+开放任务 | **Autoreason+scope约束** | 加固定事实/结构/交付物边界 |
| 前沿模型+约束任务 | **Autoreason** | 2/3约束任务仍赢 |
| 前沿模型+开放任务 | **Critique-and-revise** 或 **单次** | 模型自评估够好 |
| 具体技术任务(系统设计) | **Critique-and-revise** | 直接find-fix循环更高效 |
| 模板填充任务 | **单次** | 决策空间最小，迭代无价值 |
| 代码+测试用例 | **Autoreason(代码变体)** | 恢复率62% vs 43% |
| 弱模型(Llama 8B级) | **单次** | 太弱无法生成多样候选 |

**核心洞察**：Autoreason价值取决于**生成能力与自评估能力的差距**。

```
弱模型:  生成差+评估差 → 差距小 → 无价值
中端:    生成还行+评估差 → 差距大 → 最大价值(42/42 perfect Borda)
前沿:    生成好+评估还行 → 差距小 → 仅约束场景有效
```

### Autoreason循环参数

- k=2收敛（k=1过早，k=3太贵无质量增益）
- 3个CoT judge（3x收敛速度）
- Author温度0.8，Judge温度0.3
- 保守平局：incumbent赢

### 失败模式

| 失败 | 检测 | 修复 |
|------|------|------|
| 不收敛(A<15%胜率) | 20+轮A赢<15% | 加scope约束 |
| 合成漂移 | 字数无限增长 | 约束结构和交付物 |
| 低于单次pass | baseline>迭代输出 | 切单次；模型太弱 |
| 过拟合(代码) | 公开测试高/私有低 | 用结构化分析非测试反馈 |

## 写作速查

### Abstract（5句公式）

1. 成就："We introduce/prove/demonstrate..."
2. 为什么难且重要
3. 怎么做（含领域关键词）
4. 什么证据
5. 最remarkable的数字/结果

**删除**泛泛开头如"Large language models have achieved remarkable success..."

### Introduction（≤1.5页）

问题→方法概览→2-4条贡献bullet→Methods第2-3页必须开始

### 每个实验显式标注

- 支持哪个claim
- 观察什么："the blue line shows X, demonstrating Y"

### 统计必做

- Error bars（标明std dev还是std error）
- 95% CI
- 配对检验（McNemar's）
- Effect size（Cohen's d/h）

### 图表规则

- 矢量图（PDF）：`plt.savefig('fig.pdf')`
- 色盲安全调色板（Okabe-Ito / Paul Tol）
- 无图内标题，caption自包含
- booktabs：`\toprule/\midrule/\bottomrule`
- Bold最优值 + 方向符号($\uparrow$/$\downarrow$)

### Related Work

按方法论分组，不要按论文逐个列举。

## 会议速查

| 会议 | 页数 | 特殊要求 |
|------|------|---------|
| NeurIPS | 9 | Paper checklist in appendix |
| ICML | 8 | Broader Impact Statement |
| ICLR | 9 | LLM disclosure |
| ACL | 8(long) | Mandatory Limitations section |
| AAAI | 7 | 严格sty文件，不可修改 |
| COLM | 9 | 面向语言模型社区框架 |

通用：双盲，引用不计页数，附录无限，LaTeX必需。

## 投稿检查清单

```
匿名化:
- [ ] 无作者名/机构
- [ ] 无致谢（接受后加）
- [ ] 自引第三人称："Smith et al. [1]"
- [ ] 代码用 Anonymous GitHub
- [ ] 无机构logo/标识
- [ ] PDF元数据无作者名
- [ ] 数据集名不暴露机构

格式:
- [ ] 页数合规（不含引用和附录）
- [ ] 全矢量图或600DPI PNG
- [ ] 灰度可读
- [ ] 引用编译正确（无"?"）
- [ ] Required sections完整
```

## Rebuttal要点

- 逐条回复，不跳过任何一条
- 最强回复前置
- 简洁直接——审稿人读几十份rebuttal
- 新实验结果必须包含
- latexdiff生成标记PDF
- **绝不**无证据地说"respectfully disagree"

## Hermes工具用法

| 工具 | 场景 |
|------|------|
| `delegate_task` | 并行写各section，各section独立子agent |
| `execute_code` | 引用验证、统计分析、数据聚合 |
| `cronjob` | 实验监控（每30min检查进度），deadline倒计时 |
| `todo` | 跨session状态追踪，每次阶段转换更新 |
| `memory` | 持久化关键决策（contribution framing, venue, reviewer feedback） |
| `web_search`/`web_extract` | 文献发现、引用验证 |

### 实验监控Cron模板

```
1. ps aux | grep <pattern>       # 进程在吗？
2. tail -30 <logfile>            # 最新日志
3. ls results/                   # 新结果？
4. 有结果→分析→git commit→报告
5. 无变化→[SILENT]
```

### Session启动协议

```
1. todo("list")                    # 当前任务
2. memory("read")                  # 关键决策
3. terminal("git log --oneline-10") # 近期commit
4. terminal("ps aux | grep python") # 运行中实验
5. 报告状态，问方向
```

## 参考

- [references/writing-guide.md](references/writing-guide.md) — Gopen & Swan 7原则, Lipton用词
- [references/citation-workflow.md](references/citation-workflow.md) — CitationManager类
- [references/checklists.md](references/checklists.md) — 各会议完整checklist
- [references/reviewer-guidelines.md](references/reviewer-guidelines.md) — 评审标准
- [references/experiment-patterns.md](references/experiment-patterns.md) — 实验设计模式
- [references/autoreason-methodology.md](references/autoreason-methodology.md) — 完整prompts和Borda评分
- [templates/](templates/) — 各会议LaTeX模板
