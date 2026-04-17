---
name: openclaw-skill-migration
description: Migrate skills from OpenClaw workspace/imports directories into the Hermes native skill system. Use when skills exist under ~/.hermes/skills/openclaw-workspace/ or ~/.hermes/skills/openclaw-imports/ but need to be registered as top-level Hermes skills.
version: 1.0.0
when_to_use: Migrating skills from OpenClaw namespace to Hermes, fixing duplicate skill paths, consolidating skill locations
---

# OpenClaw Skill Migration to Hermes

## Overview

OpenClaw installs skills under namespaced directories (`openclaw-workspace/`, `openclaw-imports/`). Hermes auto-discovers skills by recursively scanning `~/.hermes/skills/` for `SKILL.md` files. Migration is simply copying to a proper top-level category directory — no `skill_manage` registration needed.

## Steps

### 1. Identify source skills

```bash
# List all skills with SKILL.md in openclaw dirs
find ~/.hermes/skills/openclaw-workspace/ -name "SKILL.md" | sort
find ~/.hermes/skills/openclaw-imports/ -name "SKILL.md" | sort
```

### 2. Choose target category directories

Hermes organizes skills by category subdirectory. Create if needed:

```bash
mkdir -p ~/.hermes/skills/web      # for web-access, zsxq-auto
mkdir -p ~/.hermes/skills/lark     # for lark-* skills
```

Existing categories: `autonomous-ai-agents`, `creative`, `data-science`, `devops`, `email`, `gaming`, `github`, `mcp`, `media`, `mlops`, `note-taking`, `productivity`, `research`, `smart-home`, `software-development`

### 3. Copy with cp -r

```bash
# Single skill
cp -r ~/.hermes/skills/openclaw-workspace/web-access-original ~/.hermes/skills/web/web-access

# Bulk (all lark skills)
cp -r ~/.hermes/skills/openclaw-imports/lark-* ~/.hermes/skills/lark/
```

**Critical**: Use the correct source version. OpenClaw often has TWO versions:
- `web-access/` = OpenClaw-adapted (uses built-in browser tool) — WRONG for Hermes
- `web-access-original/` = Original CDP Proxy version — CORRECT for Hermes

Always check the SKILL.md frontmatter `version` and `metadata.adapter` fields to distinguish.

### 4. Verify discovery

```bash
# Check files copied
find ~/.hermes/skills/<category>/ -name "SKILL.md" | wc -l

# Check linked files (scripts, references)
ls ~/.hermes/skills/<category>/<skill>/scripts/
ls ~/.hermes/skills/<category>/<skill>/references/
```

Then use `skill_view(name)` to confirm Hermes can load the skill and its linked files.

### 5. Handle duplicates (optional)

After migration, the old copies in `openclaw-workspace/` and `openclaw-imports/` still exist. Hermes finds BOTH, which can cause confusion (skill_view may return the old path). Two options:

- **Leave them** — safest, avoids breaking OpenClaw if it's still in use
- **Remove them** — cleaner, prevents duplicate discovery:
  ```bash
  rm -rf ~/.hermes/skills/openclaw-workspace/web-access-original
  rm -rf ~/.hermes/skills/openclaw-imports/lark-*
  ```

## Key Facts

- Hermes scans `~/.hermes/skills/` **recursively** for `SKILL.md` files
- No formal `skill_manage` registration needed for file-based skills — just place files correctly
- Skills with `CLAUDE_SKILL_DIR` references (like web-access's `node "$CLAUDE_SKILL_DIR/scripts/cdp-proxy.mjs"`) work because the skill system sets this env var to the directory containing SKILL.md
- `skill_manage(action='create')` is for creating NEW skills from scratch, not migrating existing file-based ones
- lark-shared is a dependency for all other lark-* skills — always include it
- lark-base has 86+ reference files; lark-whiteboard has scenes/ templates — these must be copied together, not just SKILL.md

## Pitfalls

1. **Wrong version of web-access** — the OpenClaw-adapted version (v2.4.0-openclaw) uses `browser action=...` syntax that doesn't work in Hermes. The original (v2.4.1) uses CDP Proxy (`curl localhost:3456/...`) which is correct.
2. **Missing linked files** — skills with scripts/ or references/ subdirectories will fail at runtime if only SKILL.md was copied. Always use `cp -r` not `cp`.
3. **Windows paths** — on Windows, CDP Proxy uses `DevToolsActivePort` from `%LOCALAPPDATA%\Google\Chrome\User Data\`. The scripts handle this automatically.
4. **Frontmatter name field** — the `name` in SKILL.md YAML frontmatter determines the skill's identity for `skill_view()`. If two directories have the same `name`, only one will be found (whichever is scanned first).
