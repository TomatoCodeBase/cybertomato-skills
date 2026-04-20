---
name: github-secret-remediation
description: Clean leaked secrets from a GitHub repository — rewrite git history, push, and close secret scanning alerts.
triggers:
  - GitHub secret scanning alert
  - leaked credentials in a repo
  - 用户说密钥泄露、secret scanning、密钥清理
---

# GitHub Secret Scanning Remediation

Clean leaked secrets from a GitHub repository — files + git history + push + alert closure.

## Steps

### 1. Assess the leak

```bash
# View alert (may 403 without admin token — use browser/CDP if needed)
gh api repos/OWNER/REPO/secret-scanning/alerts/ALERT_NUMBER
```

- Identify: **what** was leaked (type, value), **where** (files), **how far** (commits, forks)
- Check working tree:

```bash
grep -rl "SECRET_PATTERN" REPO_DIR --include="*.{md,yaml,yml,json,env,py,js}"
```

### 2. Scan and triage

After identifying the alert secret, **do a broad scan for all secrets** — not just the one GitHub flagged. Real leaks often come in clusters.

```bash
# Scan broadly across all text file types
grep -rn --include="*.md" --include="*.yaml" --include="*.json" --include="*.py" --include="*.js" --include="*.env" \
  -E "(api_key|secret|token|password|credential|Bearer |client_id|app_id).{0,20}[a-zA-Z0-9_\-]{20,}" REPO_DIR/
```

**Triage categories — only clean these:**

| Category | Pattern | Action |
|----------|---------|--------|
| Full secrets in `.env` | `APP_SECRET=<32+ hex chars>` | **Clean** |
| Full secrets in code | `apiKey: 'gk_live_<long hex>'` | **Clean** |
| Draft IDs / resource IDs | `草稿ID: <base64-like string>` | **Clean** |

**Skip these — not real leaks:**

| Category | Pattern | Why skip |
|----------|---------|----------|
| Truncated values | `abc123...xyz` | Already redacted |
| Placeholder patterns | `sk-xxx...xxxx`, `YOUR_API_KEY` | Obviously fake |
| Variable name references | `process.env.SOME_KEY` | Just a reference, no value |
| Public tokens | Twitter guest Bearer token | Publicly known, per-instance identical |
| Frontend hardcoded keys | Zhipu AES key etc. | Same for all users, not a personal secret |

**Key insight:** `.env` files often contain full secrets that appear truncated in docs/logs — always check `.env` files directly.

### 3. Clean working tree

- For 1-2 files: use `patch` tool for precise replacements
- For many files with the same secret: use batch sed:

```bash
find REPO_DIR -type f \( -name "*.js" -o -name "*.py" -o -name "*.md" \) \
  ! -path "*/node_modules/*" -exec sed -i \
  -e "s/actual_secret_value/YOUR_SECRET/g" \
  {} +
```

- Replace with descriptive placeholders: `***`, `YOUR_API_KEY`, `REDACTED_TYPE`
- Commit: `git commit -m "security: remove leaked SECRET_TYPE from FILENAMES"`

### 3. Rewrite git history

```bash
# Install if needed
pip install git-filter-repo

# Create replacement rules file (one per line: OLD==>NEW)
cat > /tmp/secret-replacements.txt << 'EOF'
actual_secret_value==>REDACTED_DESCRIPTION
another_secret==>REDACTED_DESCRIPTION
EOF

cd REPO_DIR
git filter-repo --replace-text /tmp/secret-replacements.txt --force
```

**Pitfalls:**

- `git filter-repo` **removes the `origin` remote** — must re-add before pushing
- Use `--force` flag since it's a non-fresh clone

### 4. Push cleaned history

```bash
git remote add origin https://github.com/OWNER/REPO.git
git push --force origin main
```

- Branch protection with admin bypass allows force push
- This command requires user approval in Hermes

### 5. Verify — local AND online

**Local verification** (fast, checks all git history):

```bash
# For each secret, should return 0
git log -p --all -S "actual_secret_value" 2>/dev/null | wc -l
```

**Online verification** (definitive — what the public can see):

```bash
# GitHub Search API — should return total_count: 0 for each
gh api "search/code?q=SECRET_PATTERN+repo:OWNER/REPO" --jq '.total_count'
```

Both must be 0 before proceeding. GitHub caches search indexes, so if online shows old results, wait a few minutes and retry.

### 6. Close the alert

```bash
# Try API first (needs admin scope on PAT)
gh api -X PATCH repos/OWNER/REPO/secret-scanning/alerts/NUMBER -f state=resolved
```

- If 403 (common — PAT usually lacks `security_events` scope), close via CDP:
  1. Navigate to alert page
  2. Click "Close as" button (may need `btn.click()` via JS, not clickAt)
  3. Select "Revoked" radio/label (`document.querySelectorAll("label")` → find text "Revoked" → `.click()`)
  4. Click "Close alert" submit button
  5. Verify: page should show "Fixed" + "closed this as revoked"
- Close as "revoked" only after key rotation

### 7. Remind user to rotate keys ⚠️

**This is the most critical step.** Repo cleanup alone is insufficient if the secret was publicly exposed.

| Secret Type | Action | Typical URL |
|---|---|---|
| WeChat AppSecret | Reset in MP platform | https://mp.weixin.qq.com |
| API Keys (Volcengine, etc.) | Disable old + create new | Provider console |
| OAuth tokens | Revoke + regenerate | Provider settings |

## ⚠️ Critical: Dangling Commits Remain Accessible

`git-filter-repo` rewrites branch history but **does NOT delete old commit objects from GitHub**. Dangling commits (not reachable from any branch) remain accessible via direct URL:

```
https://github.com/OWNER/REPO/blob/OLD_SHA/path/to/file
```

Anyone who bookmarked or cached the old SHA can still see the original secrets.

**How to detect:**
```bash
# Old root commit (pre-filter-repo) — if this returns content, dangling objects exist
gh api "repos/OWNER/REPO/commits/OLD_SHA" --jq '.sha'
```

**Solutions (pick one):**

| Method | How | Tradeoff |
|--------|-----|----------|
| **Delete + recreate repo** | Settings → Delete → recreate same name → push | Loses stars/issues/PRs. Best for low-engagement repos |
| **GitHub Support ticket** | support.github.com → request GC of dangling objects | Takes 1-2 days. Preserves all metadata |
| **Wait for GC** | GitHub eventually GCs unreachable objects | Timeline unpredictable (weeks to never) |

**Decision guide:**
- 0 forks, 0 stars → just delete + recreate (2 minutes, guaranteed clean)
- Has community engagement → GitHub Support ticket

## Notes

- AppID (public identifiers like WeChat AppID) are not truly secret, but GitHub may flag them
- Forks by other users may retain the old history — only original repo is cleaned
- `git filter-repo --replace-text` is preferred over BFG (simpler, pure Python, pip installable on Windows)
- Always check `.env` files — they often contain full secrets that appear truncated in docs/logs
- After filter-repo + force push, **always test old commit SHAs** to confirm they're inaccessible
