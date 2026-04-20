# cybertomato-skills

赛博番茄的 Hermes Agent 技能库。

## 关于

这是我个人使用的 AI Agent 技能集合，涵盖内容创作、自动化发布、数据采集、日程管理等多个领域。基于实战踩坑持续迭代。

## 结构

```
skills/
├── autonomous-ai-agents/   # AI Agent 编排（Claude Code、Codex 等）
├── creative/               # 创意内容（ASCII、图表、音乐等）
├── data-science/           # 数据分析、Jupyter
├── devops/                 # 运维、Cron、Webhook
├── github/                 # GitHub 工作流
├── lark/                   # 飞书全系列（文档、表格、日历、IM 等）
├── mcp/                    # MCP 协议
├── media/                  # YouTube、GIF、音乐
├── mlops/                  # ML 工程全栈
├── note-taking/            # Obsidian、笔记管理
├── openclaw-workspace/     # 实战积累的自动化技能
│   ├── ai-daily-report/    # AI 热点日报
│   ├── content-factory-*/  # 内容工厂
│   ├── zsxq-*/             # 知识星球
│   ├── zhihu-auto/         # 知乎自动化
│   ├── toutiao-auto/       # 头条号
│   └── ...                 # 更多实战技能
├── productivity/           # 文档、PPT、PDF
├── research/               # 学术研究、论文
├── software-development/   # 软件工程实践
└── web/                    # 网络访问、爬虫
```

## 使用方法

### Hermes Agent

将整个仓库 clone 到 Hermes 的 skills 目录：

```bash
git clone https://github.com/cybertomato/cybertomato-skills.git ~/.hermes/skills/
```

或作为子目录合并到已有的 skills 目录。

### 其他 AI Agent

每个技能的核心文件是 `SKILL.md`，格式为 YAML frontmatter + Markdown。你可以：
- 直接阅读 `SKILL.md` 了解技能内容
- 提取其中的提示词和方法论适配到你使用的 Agent
- 参考引用文件（`references/`、`scripts/`、`templates/`）

## 技能亮点（实战踩坑版）

这些技能不是理论文档，是真实使用中遇到问题、解决问题后沉淀的：

- **zsxq-publish** — 知识星球发布，踩了 Angular isTrusted、ProseMirror 注入、Quill→Markdown 切换等 13 个坑
- **zhihu-auto** — 知乎全自动化，包括 Draft.js 对抗、API 直发、创作打卡挑战赛
- **ai-daily-report-merge** — 融合日报，自动采集+手动补充信息合并
- **content-factory-engine** — 内容工厂，从选题到成文到排版到推送草稿的完整流水线

## 许可

MIT License — 随便用，改了记得注明来源就行。

## 联系

- 公众号：赛博番茄
- 知识星球：番茄的 OpenClaw 日记
