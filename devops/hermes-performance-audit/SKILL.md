---
name: hermes-performance-audit
description: "Systematic performance analysis of a Hermes agent deployment. Gathers metrics from the filesystem, analyzes skill dependencies and maturity, checks cron health, evaluates model/config fitness, and produces a scored report with prioritized action items."
when_to_use: "User asks for a performance review, health check, or system audit of their Hermes setup. Also useful after major changes (new skills, cron jobs, model switches) to validate the system."
---

# Hermes Performance Audit

## Overview
Produce a structured performance report for a Hermes deployment by analyzing the `~/.hermes/` filesystem, config, cron jobs, and skill ecosystem.

## Step-by-step Procedure

### Phase 1: Data Collection (parallel where possible)

Gather all raw data before analysis. Use terminal commands:

```bash
# 1. Skill inventory
find ~/.hermes/skills -name "SKILL.md" | wc -l          # total skills
find ~/.hermes/skills -name "*.md" | wc -l               # total docs
ls -d ~/.hermes/skills/openclaw-workspace/*/ 2>/dev/null | wc -l  # workspace skills

# 2. Disk usage by category
du -sh ~/.hermes/skills/*/ 2>/dev/null

# 3. Cron job health - use cronjob(action="list", include_disabled=true)

# 4. Config analysis
cat ~/.hermes/config.yaml
grep -c "API_KEY\|API_SECRET\|TOKEN" ~/.hermes/.env 2>/dev/null

# 5. Per-skill size (for workspace skills)
for s in <skill1> <skill2>; do
  f="$HOME/.hermes/skills/openclaw-workspace/$s/SKILL.md"
  if [ -f "$f" ]; then echo "$s: $(wc -l < "$f") lines"; else echo "$s: MISSING"; fi
done

# 6. Dependency chains - which skills reference web-access (CDP)
grep -rl "web-access" ~/.hermes/skills/openclaw-workspace/*/SKILL.md

# 7. Which skills reference lark-base
grep -rl "lark-base\|lark_base\|feishu" ~/.hermes/skills/openclaw-workspace/*/SKILL.md

# 8. CDP-dependent skills
grep -rl "CDP\|cdp" ~/.hermes/skills/openclaw-workspace/*/SKILL.md

# 9. Site patterns coverage
find ~/.hermes/skills/web/web-access/references/site-patterns -name "*.md" | sort

# 10. Recently modified skills (proxy for active use)
ls -lt ~/.hermes/skills/openclaw-workspace/ | head -20

# 11. Session database
ls -lh ~/.hermes/sessions*.db 2>/dev/null
```

### Phase 2: Analysis

#### 2a. Dependency Graph
- Identify the core dependency node (usually web-access/CDP)
- Map all skills that depend on it - this is the SPOF surface
- Identify secondary dependencies (lark-base, specific APIs)

#### 2b. Skill Maturity Tiering
- Tier 1 (Production): >200 lines SKILL.md, contains pitfalls sections, recent modifications
- Tier 2 (Usable): 100-200 lines, basic structure, fewer edge cases covered
- Tier 3 (Experimental/Missing): <100 lines, or SKILL.md not found where expected

#### 2c. Cron Health
- Check last_run_at and last_status for every job
- Zero-execution jobs = high risk (untested in production)
- Stale scripts (path pointing to wrong directory) = silent failures

#### 2d. Storage Efficiency
- Calculate percentage of disk used by each skill category
- Flag any single category >50% (usually openclaw-workspace)
- Estimate unused skill ratio (skills with no recent modifications and no cron dependency)

#### 2e. Model Fitness
- Check configured model + provider
- Assess tool_use capability (local/smaller models typically lower accuracy than claude/gpt)
- High max_turns (>50) often compensates for model inaccuracy

### Phase 3: Report Generation

Produce a structured report with these sections:

1. System Overview - table of key metrics
2. Disk Usage - visual bar chart (ASCII) with percentages
3. Core Dependency Chain - ASCII tree showing SPOF
4. Cron Health - table with schedule/last_run/status
5. Skill Maturity - tiered boxes with line counts and notes
6. Bottlenecks and Risks - [HIGH/MED/LOW] tagged items
7. Performance Score - 6-8 dimensions, each 1-10, with overall average
8. Priority Action Items - P0/P1/P2 ranked list

### Scoring Dimensions

| Dimension | What it measures |
|-----------|-----------------|
| Automation Coverage | How many platforms/workflows are automated end-to-end |
| Skill Robustness | Average maturity + fallback/degradation quality |
| Cron Reliability | Execution history, error rates, monitoring |
| Storage Efficiency | Disk bloat ratio, unused skill ratio |
| Dependency Decoupling | SPOF count, fallback paths available |
| Model Fitness | Tool-use accuracy, context handling, speed |
| Knowledge Accumulation | Pitfall docs, site-patterns, iterative improvement evidence |

## Phase 4: Bloat Diagnosis & Cleanup

When a skill category occupies >50% of disk, the root cause is almost never "too many skills." Dig deeper:

```bash
# Sort workspace skills by size - the top 2-3 are usually the culprits
du -sh ~/.hermes/skills/openclaw-workspace/*/ 2>/dev/null | sort -rh | head -10
```

### Common bloat patterns

| Pattern | Cause | Fix |
|---------|-------|-----|
| `node_modules/` inside a skill | Skill author committed npm deps instead of using runtime `npm install` | Delete node_modules, ensure package.json exists, add to .gitignore |
| Demo assets (jpeg/mp3/png) in `assets/` | Example/demo media for showcase, not needed at runtime | Delete media files; keep empty assets/ dir structure |
| `vendor/` directory | Vendored libraries that could be installed at runtime | Delete and add install step to SKILL.md |
| `tests/` with large fixtures | Test data committed alongside skill | Delete or move to separate repo |

### Cleanup verification

After deleting bloat:
1. Check SKILL.md doesn't reference deleted files by name (grep for filenames)
2. Verify package.json exists if node_modules was removed (so `npm install` can restore at runtime)
3. Confirm the skill still loads: `du -sh` before and after, target >90% reduction for pure bloat

## Key Bug Patterns to Check

### 1. HERMES_HOME Path Drift in Scripts
Scripts under `~/.hermes/scripts/` often hardcode `Path.home() / ".hermes"` (Python) or `$HOME/.hermes` (bash). When HERMES_HOME env var points elsewhere (e.g., D:\HermesData\.hermes on Windows profiles), these scripts silently use the wrong directory. **Symptom**: cron jobs run without errors but produce no results (env file not found, data directory empty).

**Detection**:
```bash
grep -rn "Path.home.*\.hermes\|HOME.*\.hermes" ~/.hermes/scripts/
```

**Fix pattern** (Python):
```python
def _hermes_home() -> Path:
    env = os.environ.get("HERMES_HOME")
    if env:
        return Path(env)
    return Path.home() / ".hermes"
```
Then replace all `Path.home() / ".hermes"` with `_hermes_home()`.

### 2. CDP Dependency in Cron Scripts
Cron jobs that depend on CDP (browser automation) will hang or fail silently if Chrome/CDP proxy is down. Add a health check at the top of the prep script:

**Detection**: check if a cron job's skills list includes "web-access"

**Fix pattern** (Python prep script):
```python
def check_cdp():
    try:
        req = urllib.request.Request("http://localhost:3456/health", method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = resp.read().decode("utf-8")
            if '"status":"ok"' in data:
                print("CDP_STATUS=ok")
                return True
    except Exception as e:
        print(f"CDP_STATUS=down CDP_ERROR={e}")
        return False
```
When CDP is down, output a WARNING so the agent skips browser operations and reports the issue instead of hanging.

### 3. Lost Skill Recovery
When a SKILL.md file is missing but the knowledge still exists in distributed sources:
1. **site-patterns/** — often contains the most detailed selector/pitfall data (e.g., SMZDM site-patterns had 280+ lines)
2. **Mem0 memories** — search for the skill name + keywords like "踩坑", "选择器", "DOM"
3. **Similar skills as templates** — use a sibling skill (e.g., zhihu-auto) as structural reference
4. **C:\Users old directory** — if profiles were migrated, the old home may still have the file

**Reconstruction order**: site-patterns (factual) → Mem0 (experiential) → template skill (structure) → merge

## Pitfalls

- **du on Windows/Git Bash can hang** - use du -sh on specific directories, not recursive on large trees. Set timeout=10s and accept timeouts.
- **Path differences between profiles** - always use ~/.hermes/ (or $HERMES_HOME), never hardcode. On Windows this resolves to /c/Users/name/.hermes/.
- **"72% disk usage" is usually 2 bloated skills, not 50 skills** - always sort by individual skill size before concluding "too many skills." In practice, node_modules + demo assets account for >90% of bloat in workspace skills.
- **SKILL.md not found does not mean skill missing** - some skills use different casing or are nested in subdirectories. Use find not ls for discovery.
- **Cron jobs show null last_run for new jobs** - this is expected, not an error. Flag it as untested rather than broken.
- **zdm-auto may live under different names** - check for smzdm or alternative Chinese names in SKILL.md content.
- **Config may have profile overrides** - the visible config.yaml may not reflect the active profile. Check for HERMES_HOME env var.
- **Path.home() / ".hermes" in scripts is a silent failure** - when HERMES_HOME points to a different directory, scripts using Path.home() will find the old (possibly stale) data and never report an error. Always check scripts under ~/.hermes/scripts/ for this pattern.
- **Cron job "never executed successfully" usually means a script path bug** - before debugging the agent logic, verify the prep script outputs correct paths and the CDP is reachable.
- **node_modules deletion is safe if package.json is preserved** - add a note in the SKILL.md so future audits don't flag the missing directory as a bug.
- **Before deleting an old .hermes directory, compare unique files** - use `comm -23` between old and new directory listings to find files only in the old location. Back those up first. On Windows with C→D migration: `comm -23 <(ls /c/User/.hermes/sessions/ | sort) <(ls D:/HermesData/.hermes/sessions/ | sort)`. Typical unique files: stray sessions from the transition day, old checkpoints, pastes.
- **Behavioral principles belong in SOUL.md, not skills** — principles like "close the loop" are unconditional constraints, not conditional triggers. Skills are loaded on task match; principles must be always active. Decision framework: unconditional → SOUL.md (identity layer), conditional → skill (tool layer), cross-session recall → Mem0 (memory layer). Don't demote a principle to a skill — it implies "sometimes apply, sometimes don't."
