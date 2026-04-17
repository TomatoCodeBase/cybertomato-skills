---
name: publish-to-github
description: 将本地目录发布到 GitHub 公开仓库的完整流程。包括安全扫描、仓库创建、推送和分支保护。触发词：发布到GitHub、推送仓库、publish to github。
tags: [github, publish, security]
---

# 发布本地目录到 GitHub

## 适用场景

- 将技能库、笔记集合、项目模板等本地目录发布为 GitHub 公开/私有仓库
- 需要确保不泄露敏感信息（API密钥、token、个人隐私）

## 完整流程

### 第一步：安全扫描

推送前必须扫描，防止敏感信息泄露。使用 delegate_task 并行扫描：

**扫描项：**
- 硬编码 API key/secret/token（`sk-xxx`, `ghp_xxx`, `AKIAxxx` 等）
- 密码（`password=`, `passwd=`, `pwd=` 后跟实际值）
- Bearer token 硬编码值
- JWT token（`eyJ...`）
- 真实邮箱、手机号、身份证号
- 家庭住址
- 内部项目名/公司名

**注意区分安全引用和敏感信息：**
- 安全：`${API_KEY}`, `os.getenv("XXX")`, `process.env.XXX` — 这是变量名引用
- 危险：`sk-abc123...`, `ghp_xxx...` — 这是硬编码的实际密钥值

### 第二步：准备仓库文件

创建 `.gitignore` 和 `README.md`：

```bash
# .gitignore 排除：备份文件(*.bak)、编辑器临时文件、__pycache__、node_modules、日志、.tmp
# 同时排除 Hermes 内部文件如 .bundled_manifest
```

README 包含：项目介绍、目录结构、使用方法、许可协议。

### 第三步：初始化 Git 并推送

```bash
cd <目标目录>
git init
git config user.name "<名字>"
git config user.email "<邮箱>"
git add -A
git commit -m "初始提交"
git branch -M main
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

### 第四步：设置分支保护

通过 GitHub 网页设置（Settings → Rules → New rule）：

1. Ruleset Name: `<分支>-branch-protection`
2. Enforcement: Active
3. Target: Include by pattern → 填 `main`
4. Rules: 勾选 "Require a pull request before merging" + "Require approvals"
5. Create

## 坑点记录

### 坑#1: GitHub CLI 认证超时

MINGW64 下 `gh auth login --web` 走代理时可能超时（wsarecv timeout）。

解法：用 token 直接认证：
```bash
echo "ghp_xxx..." | gh auth login --with-token
```

### 坑#2: Fine-grained Token 默认不能建仓库

Fine-grained PAT 默认没有 Administration 权限，`gh repo create` 和 API POST 都会返回 403。

解法：
- 方案A: 在 token 设置里给 Repository permissions → Administration 设为 Read and write
- 方案B: 让用户在 github.com/new 手动创建空仓库

### 坑#3: GitHub 新版 Ruleset 界面

2026年 GitHub 已从旧版 Branch protection rules 迁移到 Rulesets。界面差异：
- 旧版：Settings → Branches → Add rule → Branch name pattern
- 新版：Settings → Rules → New rule → Ruleset Name → 然后通过 "Include by pattern" 指定分支

用户可能困惑找不到 "Branch name pattern" 字段，新版它在 Target branches 区域里。

### 坑#4: MINGW64 下 gh CLI 不在 PATH

winget 安装 gh CLI 后，MINGW64/Git Bash 找不到命令。

解法：
```bash
export PATH="/c/Program Files/GitHub CLI:$PATH"
```

### 坑#5: Git 用户信息未配置

新 git 仓库如果全局没配 user.name/email，commit 会报错或用系统默认值。

解法：在仓库级别配置：
```bash
git config user.name "名字"
git config user.email "邮箱"
```
