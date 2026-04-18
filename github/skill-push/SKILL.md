---
name: skill-push
description: 将技能更新推送到 GitHub。包括审核外部贡献（skills-incoming待审区）和常规推送。触发词：推送技能到GitHub、推送技能、skill push。
tags: [github, skills, collaboration]
---

# 技能推送到 GitHub

## 适用场景

- 日常技能更新后推送到 GitHub
- 审核 skills-incoming/ 待审区的外部贡献
- 用户说"推送技能到 GitHub"

## 两种推送方式

### 方式一：常规推送（已有技能更新）

直接执行三连：

```bash
cd /d/HermesData/.hermes/skills
git add -A
git commit -m "<简要说明改了什么>"
git push
```

commit message 要体现改了什么，不要写"update"这种模糊描述。

### 方式二：审核外部贡献（skills-incoming/）

其他 agent 贡献的技能先放在 `D:\HermesData\.hermes\skills-incoming\` 待审区。

#### 审核清单

1. **格式检查**
   - 有 SKILL.md 文件
   - frontmatter 含 name 和 description
   - 文件夹名英文小写短横线格式

2. **内容质量**
   - 触发条件清晰（知道什么场景用）
   - 操作步骤可执行（有具体命令/选择器）
   - 没有大段空洞描述

3. **安全检查**
   - 无 API 密钥、密码、token 硬编码
   - 无个人隐私信息（手机号、身份证、家庭住址）
   - `os.getenv()` / `process.env` 引用是安全的

4. **冲突检查**
   - 和 skills/ 正式目录下已有技能是否重复
   - 如果是改进已有技能，对比 diff 看改动是否合理

5. **完整性**
   - 如果有 scripts/，检查依赖是否合理
   - 如果有 references/，检查内容是否准确

#### 审核通过

1. 确定分类目录（openclaw-workspace/、web/、lark/ 等）
2. 复制到正式目录：`cp -r skills-incoming/{skill-name}/ skills/{category}/{skill-name}/`
3. 暂不清理待审区（等用户确认后再删，防止误删）
4. 推送到 GitHub（三连）
5. 向用户汇报：技能名、放进了哪个目录、审核摘要

#### 审核不通过

1. 列出具体问题（格式不对、步骤缺失、有敏感信息等）
2. 给出修改建议
3. 等待修改后重新审核

## 推送时可能遇到的问题

### 分支保护拒绝 push

如果 `git push` 报 `Changes must be made through a pull request`：
- 检查 bypass list 是否包含 TomatoCodeBase
- 在 GitHub Settings → Rules → main-branch-protection → Bypass list 添加

### gh CLI 路径问题

MINGW64 下 gh 不在 PATH 里，每次需要：
```bash
export PATH="/c/Program Files/GitHub CLI:$PATH"
```

### gh auth 登录超时

代理环境下 `gh auth login --web` 可能超时，用 token 方式：
```bash
echo "YOUR_TOKEN" | gh auth login --with-token
```

Fine-grained token 默认不能创建仓库，需在 token 设置里把 Administration 改为 Read and write。

## 注意事项

- 澳龙（OpenClaw Agent）是同一台电脑上的本地 agent，它操作的是同一份 skills 目录
- 澳龙直接改 skills/ 下的已有技能→我 git diff 审核后推送
- 澳龙写全新技能→应放 skills-incoming/ 待审区
- 分支保护已开启（Ruleset: main-branch-protection），管理员（TomatoCodeBase）在 bypass list 里可直接推 main
- GitHub 仓库：https://github.com/TomatoCodeBase/cybertomato-skills
- 触发词"审核新技能"或"审核 skills-incoming 里的新技能"也走此流程

## 用户向其他 Agent 分发的贡献指引

其他 agent 贡献技能时，给它们的规则核心：

1. 清理原 skill 文件 — 去掉本地路径、个人信息，只保留纯操作逻辑
2. 放到待审区 `D:\HermesData\.hermes\skills-incoming\{skill-name}\`
3. 必须有 SKILL.md（name + description + 触发条件 + 步骤 + 注意事项）
4. 不包含 API 密钥、密码
5. 完成后告诉用户，Hermes 会审核
6. 不要直接放到 `skills\` 目录，那是正式区
