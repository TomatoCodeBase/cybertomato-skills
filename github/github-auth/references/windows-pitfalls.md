# GitHub Auth on Windows: 实战踩坑记录

## 2026-04-18 踩坑

### 1. gh CLI 安装后 PATH 不生效

`winget install GitHub.cli` 安装成功但 `gh` 命令找不到。

```bash
# 需要手动 export（MINGW64）
export PATH="/c/Program Files/GitHub CLI:$PATH"
```

### 2. gh auth login --web 在代理下超时

```bash
# 这个会超时
gh auth login --web -p https

# 解决：用 token 直接认证
echo "ghp_xxx或github_pat_xxx" | gh auth login --with-token
```

### 3. Fine-grained PAT 不能创建仓库

Fine-grained token 默认没有 `Administration` 权限，`gh repo create` 和 GitHub API 都返回 403。

解决：在 GitHub 网页手动创建空仓库，然后 git push。

或者在 token 设置里：Repository permissions → Administration → Read and write。

### 4. git config 需要每个仓库单独设

如果在 skills 目录里 `git init`，需要设置本地用户信息：

```bash
cd /d/HermesData/.hermes/skills
git config user.name "cybertomato"
git config user.email "tomatomind@163.com"
```

### 5. 推送技能到公开仓库前必须扫描敏感信息

扫描模式：
- API key 硬编码值（sk-xxx, ghp_xxx, glpat-xxx, AKIAxxx）
- 密码字段（password=, passwd= 带实际值）
- Bearer token 硬编码
- 邮箱、手机号
- Cookie/session 值
- JWT tokens (eyJ...)

安全的引用方式不算敏感信息：`os.getenv("API_KEY")`, `process.env.XXX`

.gitignore 必须包含：
```
*.bak
__pycache__/
node_modules/
.DS_Store
.bundled_manifest
```
