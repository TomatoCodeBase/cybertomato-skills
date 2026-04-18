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
2. 移动到正式目录：将 skills-incoming/{skill-name}/ 移到 skills/{category}/{skill-name}/
3. 清理待审区：删除 skills-incoming/{skill-name}/
4. 推送到 GitHub（三连）
5. 向用户汇报：技能名、放进了哪个目录、审核摘要

#### 审核不通过

1. 列出具体问题（格式不对、步骤缺失、有敏感信息等）
2. 给出修改建议
3. 等待修改后重新审核

## 注意事项

- 澳龙（OpenClaw Agent）是同一台电脑上的本地 agent，它操作的是同一份 skills 目录
- 澳龙直接改 skills/ 下的已有技能→我 git diff 审核后推送
- 澳龙写全新技能→应放 skills-incoming/ 待审区
- 分支保护已开启，管理员（TomatoCodeBase）可 bypass 直接推 main
