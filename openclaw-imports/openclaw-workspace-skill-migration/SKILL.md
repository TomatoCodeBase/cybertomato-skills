---
name: openclaw-workspace-skill-migration
description: Migrate user-created (workspace) skills from OpenClaw to Hermes when `hermes claw migrate` misses them. Use when migrating custom skills like web-access, zhihu-auto that live in the OpenClaw workspace directory, not in the shared skills directory.
---

# OpenClaw Workspace Skill Migration

Migrate user-created (workspace) skills from OpenClaw to Hermes when `hermes claw migrate` misses them.

## Problem

`hermes claw migrate` only scans `~/.openclaw/skills/` (shared/bundled skills). User-created custom skills live in `D:\OpenClaw\workspace\skills\` (or equivalent workspace path) and are NOT included in the migrate scan. The migrate command also lacks a `--only-skills` flag to selectively migrate just skills without touching config, .env, memories, etc.

## Steps

1. **Identify workspace skill source path** — typically `D:/OpenClaw/workspace/skills/` on Windows or the equivalent `workspace/skills/` under the OpenClaw installation directory. Check by looking for skills like `web-access`, `zhihu-auto` that you know are custom.

2. **Create target directory in Hermes**:
   ```bash
   mkdir -p ~/.hermes/skills/openclaw-workspace/
   ```

3. **Copy skills** (exclude .git to avoid permission issues):
   ```bash
   rsync -av --exclude='.git' "D:/OpenClaw/workspace/skills/" ~/.hermes/skills/openclaw-workspace/
   ```
   If rsync unavailable, use `cp -r` and then clean up:
   ```bash
   cp -r "D:/OpenClaw/workspace/skills/"* ~/.hermes/skills/openclaw-workspace/
   find ~/.hermes/skills/openclaw-workspace/ -name ".git" -type d -exec rm -rf {} + 2>/dev/null
   ```

4. **Remove non-skill files** (e.g. `fix-skills.js`, stray scripts):
   ```bash
   rm -f ~/.hermes/skills/openclaw-workspace/fix-skills.js
   ```

5. **Verify Hermes recognizes them**:
   ```bash
   hermes skills list | grep openclaw-workspace
   ```

6. **Verify specific skills**:
   ```bash
   ls ~/.hermes/skills/openclaw-workspace/web-access/SKILL.md
   ls ~/.hermes/skills/openclaw-workspace/zhihu-auto/SKILL.md
   ```

## Pitfalls

- **Windows GBK encoding**: `hermes claw migrate` crashes with `UnicodeEncodeError: 'gbk' codec can't encode character '\u2695'`. Fix: `PYTHONIOENCODING=utf-8 hermes claw migrate --dry-run`
- **Git pack file permission errors**: `cp -r` fails on `.git/objects/pack/` with "Permission denied". Safe to ignore — skill content copies fine. Clean up .git dirs afterward.
- **Shared vs workspace skills**: `~/.openclaw/skills/` has the bundled lark-*, copywriting, etc. (already in `~/.hermes/skills/openclaw-imports/`). Custom skills are in `workspace/skills/`. Don't confuse the two.
- **Don't run `hermes claw migrate` for skills-only**: It will also migrate config, .env, memories, etc. If you only want skills, manually copy as above.

## Step 7: Fix Hardcoded OpenClaw Paths (Critical)

After copying, skills still reference OpenClaw-specific paths. There are **4 categories** of path issues that must be fixed systematically:

### Category 1: `D:\OpenClaw\workspace` paths
- `D:/OpenClaw/workspace/skills/` → `~/.hermes/skills/`
- `D:/OpenClaw/workspace/` (other) → `~/workspace/`
- Affects: ai-daily-report, content-analytics, dashboard-generator, ppt-generator

### Category 2: `D:\\cybertomato` Obsidian vault paths
- **Check first** whether the user actually uses this path — if their Obsidian vault lives at `D:\cybertomato`, these paths are correct and should NOT be changed
- Only replace if the user confirms the vault has moved: `D:\\cybertomato\\...` → `~/obsidian-vault/...`
- **Always preserve** vault name in Obsidian URIs: `obsidian://open?vault=cybertomato` stays unchanged (it's an Obsidian setting, not a file path)
- Affects: content-factory-publisher, diary-creator, hotspot-entertainment-short, lobster-huoke-daka, op-duihua-jilu, project-analyzer, sigma, Skill-Creator, toutiao-auto, writing-business-short, writing-title-wechat, xianyu-monitor

### Category 3: `~/.openclaw` and `/root/.openclaw` paths
- `~/.openclaw/skills/` → `~/.hermes/skills/`
- `~/.openclaw/workspace/` → `~/workspace/`
- `~/.openclaw/openclaw.json` → `~/.hermes/config.yaml`
- `~/.openclaw/hooks/` → `~/.hermes/hooks/`
- `/root/.openclaw/workspace/skills/` → `~/.hermes/skills/`
- `~/.openclaw/` (generic) → `~/.hermes/`
- Affects: douyin-download, self-improving-agent, getnote, getnote-latest

### Category 4: `00-系统手册` prompt library paths
- `00-系统手册/提示词库/` → `00-系统/提示词库/` (drop OpenClaw branding)
- Affects: content-factory-engine, inspiration-capture, project-analyzer

### Fix method

**Before scanning, check user-specific paths.** Read `~/.hermes/memories/USER.md` for the user's Obsidian vault path and other personal directories. If a hardcoded path in a skill matches the user's actual setup, leave it alone.

Scan all SKILL.md and reference files first:
```bash
grep -rn "OpenClaw\|openclaw\|\.openclaw\|D:\\\\\\\\OpenClaw\|cybertomato" ~/.hermes/skills/openclaw-workspace/*/SKILL.md
grep -rn "\.openclaw" ~/.hermes/skills/openclaw-workspace/*/references/*.md
```

Then fix each file using `patch` tool (find-and-replace). For large batches, delegate to 3 parallel subagents — one per category — since there are typically 80+ replacement points across 20+ files.

**Note on parallel delegates**: The 3-delegate approach can fail if one task runs too long (e.g., the cybertomato/Obsidian category is the largest and may timeout/interrupt). If that happens, re-run the interrupted category separately. Better yet, prioritize checking which categories actually need changes before delegating — if the user's Obsidian vault path is unchanged, skip Category 2 entirely.

### Verification

After fixes, re-scan to confirm zero remaining references:
```bash
grep -rn "D:\\\\OpenClaw\|D:/OpenClaw\|/root/\.openclaw" ~/.hermes/skills/openclaw-workspace/ | wc -l
# Should be 0
```
