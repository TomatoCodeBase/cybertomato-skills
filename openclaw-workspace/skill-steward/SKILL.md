---
name: skill-steward
description: |
  技能管家 — 一句话完成技能审核、分类、入库、推送全流程。
  扫描 skills-incoming/ 待审区，审核质量，自动分类到 skills/ 正式目录，推送到 GitHub。
  触发词：整理技能、审核新技能、skill-steward。
---

# 技能管家（Skill Steward）

一句话触发，自动完成新技能的审核、分类、入库、推送。

## 触发条件

- 用户说"审核新技能"、"整理技能"、"推送技能"
- 用户说某个 agent 贡献了技能
- 用户说检查 skills-incoming 目录

## 前置条件

- skills-incoming 目录存在：`D:\HermesData\.hermes\skills-incoming\`
- skills 正式目录存在：`D:\HermesData\.hermes\skills\`
- git 已初始化并关联远程仓库

## 执行流程

### Step 1: 扫描待审区

```bash
ls D:\HermesData\.hermes\skills-incoming\
```

排除 README.md，列出所有子目录。每个子目录就是一个待审技能。

如果没有子目录 → 报告"待审区为空，没有新技能需要审核"。

### Step 2: 逐个审核

对每个待审技能执行以下检查：

#### 2.1 格式检查
- [ ] 有 SKILL.md 文件
- [ ] SKILL.md 有 YAML frontmatter（--- 开头和结尾）
- [ ] frontmatter 有 `name` 字段
- [ ] frontmatter 有 `description` 字段

#### 2.2 内容检查
- [ ] 有触发条件或使用场景说明
- [ ] 操作步骤可执行（不是空壳）
- [ ] 步骤不是过于笼统（如只有"用AI完成"这种描述）

#### 2.3 安全检查
- [ ] 无 API 密钥、token、密码硬编码（变量引用如 `${API_KEY}` 是安全的）
- [ ] 无个人隐私信息（身份证号、手机号、银行卡号）
- [ ] 无内部敏感路径泄露（如公司内部服务器地址）

#### 2.4 冲突检查
- 与 `skills/` 下现有同名技能对比
- 如果同名：是改进版还是全新？改进版需标明改进了什么

### Step 3: 输出审核报告

对每个技能输出审核结果：

```
## {技能名}

审核结果：通过 ✅ / 不通过 ❌

格式：✅/❌ 具体问题
内容：✅/❌ 具体问题
安全：✅/❌ 具体问题
冲突：✅ 无冲突 / ⚠️ 与 xxx 技能有重叠

亮点：（如果有）
问题：（如果不通过，列出需要改什么）
```

### Step 4: 分类（仅通过的技能）

根据技能内容判断归入哪个分类目录：

| 分类目录 | 适用范围 |
|---------|---------|
| `openclaw-workspace/` | 实战自动化技能（发布、采集、打卡、内容生产等） |
| `creative/` | 创意内容生成（ASCII、图表、音乐等） |
| `lark/` | 飞书相关（文档、表格、IM等） |
| `note-taking/` | 笔记管理（Obsidian等） |
| `github/` | GitHub 工作流 |
| `mlops/` | ML工程相关 |
| `research/` | 研究、学术、论文 |
| `web/` | 网络访问、爬虫、CDP |
| `productivity/` | 文档、PPT、PDF等效率工具 |
| `media/` | YouTube、GIF、音乐等媒体 |
| `devops/` | 运维、Cron、Webhook |
| `email/` | 邮件相关 |
| `smart-home/` | 智能家居 |
| `autonomous-ai-agents/` | AI Agent 编排 |
| `software-development/` | 软件工程实践 |
| `data-science/` | 数据分析、Jupyter |
| `gaming/` | 游戏相关 |
| `red-teaming/` | 安全测试 |

如果不确定，默认放 `openclaw-workspace/`。

### Step 5: 入库

将通过审核的技能从待审区移入正式目录：

```bash
cp -r skills-incoming/{技能名} skills/{分类目录}/{技能名}
```

如果是已有技能的更新（同名技能），则用新文件覆盖旧文件。

### Step 6: 推送 GitHub

```bash
cd D:\HermesData\.hermes\skills
git add -A
git commit -m "新增/更新 {技能名}: {简短描述}"
git push
```

commit message 格式：
- 新增：`"新增{技能名}: {一句话描述}"`
- 更新：`"更新{技能名}: {改动说明}"`
- 多个技能：`"技能批量更新: 新增{x}个, 更新{y}个"`

### Step 7: 清理待审区

```bash
rm -rf skills-incoming/{已入库的技能名}/
```

保留 README.md 和未通过的技能。

### Step 8: 输出总结

```
审核完成！

通过：{n}个
  - {技能名} → skills/{分类}/
不通过：{m}个
  - {技能名}：{原因}
已推送到 GitHub：✅

仓库地址：https://github.com/TomatoCodeBase/cybertomato-skills
```

## 命令速查

| 用户说 | 执行 |
|-------|------|
| 审核新技能 / 整理技能 | 执行完整流程 Step 1-8 |
| 推送技能到 GitHub | 跳过审核，直接 git push（管理员直接推 main） |
| 只看有什么新技能 | 只执行 Step 1，列出待审技能 |

## 嫁接原则（与现有技能重叠时）

当待审技能和现有技能同名或功能重叠时，不要直接替换，也不要直接拒绝：

1. **保留根** — 现有技能的踩坑记录、环境适配、辅助脚本是核心资产，不丢
2. **吸收枝** — 别人更好的解法或新功能，嫁接到现有技能里，标明来源
3. **分离独立模块** — 如果新技能包含可独立使用的功能，拆成单独技能
4. **记录进化** — commit message 和 SKILL.md 里标注嫁接了什么、来源

**实例：diary-creator 嫁接**
- 澳龙提交了 diary-creator 扩展版（创建+打卡+提醒+分析），与现有 diary-creator（仅创建）重名
- 处理：保留现有创建逻辑+create-diary.cjs脚本，嫁接澳龙的打卡和提醒功能，把分析功能分离为独立的 diary-fenxi 技能
- 结果：两个技能各司其职，无重叠

## 特殊情况

- **用户指定分类**：用户说"放到 lark 目录"，则跳过自动分类，用用户指定的目录
- **用户要求修改**：不通过的技能，记录修改建议，不清除，等贡献者修改后重新审核
- **批量贡献**：一次性多个技能，全部审核完再统一推送一次
- **没有新技能**：待审区为空时，检查 skills 目录本身有无未提交的改动，有则推送
- **同名技能**：按嫁接原则处理，不要直接覆盖
