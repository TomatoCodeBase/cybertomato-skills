---
name: cron-cdp-automation
description: Schedule and manage CDP-dependent cron jobs (browser automation tasks like platform check-ins). Covers job staggering, failure recovery strategies, and prompt structure for headless CDP tasks.
when_to_use: |
  Use when scheduling recurring cron jobs that depend on Chrome CDP (localhost:3456).
  Typical scenarios: daily platform check-ins (知乎/头条/百家号), automated publishing, scheduled browser interactions.
  Also use when designing failure recovery for any cron job where partial completion is valuable.
---

# CDP-Dependent Cron Job Scheduling

## Key Principles

### 1. Stagger CDP Jobs (Port 3456 is Single-Session)

CDP proxy on localhost:3456 is a shared resource. Two jobs hitting it simultaneously will conflict.

**Rule**: Space CDP-dependent jobs at least 30 minutes apart.

```
03:00  知乎打卡
03:30  头条打卡
04:00  百家号打卡  (if added later)
```

### 2. Skill Dependencies for CDP Jobs

Every CDP cron job must include `web-access` as the first skill (it provides the CDP capability). Platform-specific skills come after.

```yaml
skills: ["web-access", "zhihu-auto"]      # web-access FIRST
skills: ["web-access", "toutiao-auto"]
```

### 3. Prompt Structure for CDP Cron Jobs

Cron prompts have no chat context. They must be fully self-contained.

**Critical: Use semantic activation, NOT content dumping.**

❌ **Anti-pattern**: Copying skill content (traps, API endpoints, selectors) into the cron prompt. This makes prompts bloated, fragile, and decoupled from skill updates.

✅ **Correct pattern**: Reference skill names in the prompt so the LLM loads them at runtime. The prompt says WHAT to do; the skill says HOW.

```
请帮我完成今天的知乎日常打卡。过程中需结合 `web-access` 获取页面状态（CDP操作），
并调用 `zhihu-auto` 执行签到、互动和发布任务。

完整流程：创作中心提取 campaign → 打卡页报名 → 完成互动任务（赞同/评论/关注）
→ 发想法（创作任务）→ 创作中心验证打卡成功。

最终汇报：打卡是否成功，各项任务完成情况。
```

Rules for cron prompts:
1. **开头一句话**：说清目标 + 显式引用 skill 名（反引号包裹，如 `` `zhihu-auto` ``）
2. **流程骨架**：只写步骤顺序，不写具体操作细节（CSS选择器、API路径等由 skill 提供）
3. **业务约束**：内容来源、风格要求等 skill 无法自行决定的个性化配置
4. **汇报格式**：最终需要输出什么

Principle: **prompt 管"做什么"，skill 管"怎么做"**。Skill 更新了，prompt 不用改。

### 4. Content Fallback Chain

CDP jobs that need content (e.g., daily posts) should have a fallback chain:

```
Primary:   Local files (D:\cybertomato\03-内容工厂\日报\)
Fallback:  CDP search on platform (toutiao.com/search/?keyword=AI最新消息)
Last resort: Generic AI opinion piece (hardcoded topic)
```

## Failure Recovery Strategies

### Strategy A: Progressive Retry + Auto-Degrade (Best for Check-ins)

Core insight: **Keeping the streak alive matters more than perfect execution.**

```
Fail 1x → Immediate retry once (same window, CDP session still warm)
Fail 2x → Retry after 30 min (scheduled re-run via cron)
Fail 3x → Auto-degrade:
  - 知乎: Skip unstable UI (Draft.js editor), only do API-level tasks (赞同+评论+关注 via fetch)
  - 头条: Skip topic/activity matching, post plain text (no topic = still counts as publish)
Fail 5x → Pause job + notify human
```

Degrade logic ensures partial credit even when full flow breaks.

### Strategy B: Heartbeat + Failure Classification (Best for CDP-Specific Jobs)

Before executing, check if the environment is even available:

```
GET /targets → 200 OK → proceed
GET /targets → connection refused → SKIP (no retry, mark as "env failure")
```

Failure categories with different responses:
- **Env failure** (CDP down / Chrome closed): No retry, next scheduled run auto-recovers. 3 consecutive env failures → notify.
- **Logic failure** (page redesign / element missing): Retry once, log error type, try alternative approach next run.
- **Publish failure** (content written but not submitted): Save draft content locally for manual rescue.

### Strategy C: Checkpoint + Resume (Best for Multi-Step Flows)

Each task is a sequence of checkpoints:

```
知乎: [CDP check] → [报名] → [互动×3] → [发想法] → [验证]
头条: [CDP check] → [找活动] → [写内容] → [加话题] → [发布] → [验证]
```

Save checkpoint to file after each step completes. On failure:
- Resume from last successful checkpoint (don't redo completed steps)
- Same checkpoint fails X times → mark step as "broken", skip and continue
- Weekly health report: which steps have low success rates

### 5. Morning Summary Pattern

For users who don't want midnight notifications, add a morning summary job that reads all task results and writes to Obsidian:

```
Schedule: 08:00 daily (after all nightly jobs complete)
Prompt: Read cronjob list → summarize results → write to Obsidian
Deliver: local (or preferred platform)
```

Rules:
- All success → one-line "全部正常"
- Any failure → specific cause + actionable remediation suggestion
- Don't fabricate results — only report what `cronjob list` actually shows

## Implementation Notes

- Cron jobs run in fresh sessions with no chat context — prompts must be complete
- `deliver: local` is usually right for daily check-ins (results go to local notification)
- For critical failures, consider adding `deliver: telegram` or `deliver: discord` to alert immediately
- CDP sessions may leak tabs — prompts should include cleanup (close tabs after use)
- Space CDP jobs at least 1 hour apart (not just 30 min) — complex tasks like check-ins can take 20+ minutes
