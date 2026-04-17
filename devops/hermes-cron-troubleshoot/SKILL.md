---
name: hermes-cron-troubleshoot
description: Troubleshoot Hermes cron jobs that aren't executing — diagnostic steps and the non-obvious gateway dependency.
trigger: cron jobs not running, last_run_at null, scheduler not firing, scheduled tasks silent
---

# Hermes Cron Troubleshooting

When cron jobs show `last_run_at: null` or appear to silently stop executing.

## Key Architecture Fact

**The cron scheduler is NOT a standalone daemon.** It runs as a background thread (`cron-ticker`) inside the gateway process (`gateway/run.py`). If the gateway isn't running, cron jobs don't fire — silently, with no error.

- `gateway/run.py` line ~8295: `_start_cron_ticker()` — background thread, ticks every 60s
- `cron/scheduler.py` line ~873: `tick()` — checks for due jobs, executes them
- File-based lock (`~/.hermes/cron/.tick.lock`) prevents concurrent ticks if multiple processes overlap

## Diagnostic Steps

1. **Check job status**: `cronjob list` — look for `last_run_at: null` / `last_status: null`
2. **Check model field**: If jobs show `model: null` and `provider: null`, they will fail with HTTP 400. All jobs need an explicit model set via `cronjob update`.
3. **Check if gateway is running**: `ps aux | grep -i hermes` — if nothing, scheduler isn't running
4. **Check cron state**: `ls ~/.hermes/cron/` — if no state.json, jobs have never executed
5. **Verify scripts exist**: Check paths from `cronjob list` output, especially Windows paths (e.g., `D:/...`) which won't resolve on Linux
6. **Run a manual tick with verbose output**: `PYTHONIOENCODING=utf-8 hermes cron tick` — look for HTTP errors in the output that reveal provider/model issues

## Fixes

- **Start the gateway**: `hermes gateway` — this starts the cron ticker thread automatically
- **Manual single tick**: `PYTHONIOENCODING=utf-8 hermes cron tick` — runs one tick cycle for all due jobs without starting the full gateway. Use `PYTHONIOENCODING=utf-8` on Windows to avoid GBK encoding errors from Unicode chars in cron output.
- **Manual job trigger**: `cronjob run <job_id>` — marks a job for execution on next tick. Note: this only queues it — you still need a scheduler tick (gateway or `hermes cron tick`) to actually execute.
- **Fix null model on jobs**: If all jobs fail with `HTTP 400: model: The model code cannot be empty`, the jobs were likely created without specifying a model. Fix with: `cronjob update <job_id> model={"provider": "<provider>", "model": "<model_name>"}`. Batch-fix all jobs at once by updating each one.

## Common Pitfalls

- **Jobs created without model override inherit the config at creation time, which may become stale** — if the provider/model changes later, jobs retain their pinned model (or null if none was set). Always set `model` explicitly when creating jobs.
- **`cronjob run` does NOT immediately execute** — it sets `next_run_at` to now, but actual execution requires a scheduler tick (gateway running or `hermes cron tick`). This is a common misconception.
- Scripts with Windows paths (`D:/HermesData/...`) won't work on Linux sandboxes — the script path needs to be Unix-compatible
- The `deliver: local` setting means results are only saved locally, not sent to any messaging platform — easy to miss output
- No alerting when the scheduler is down — jobs silently stop
- On Windows, `hermes cron tick` can crash with `UnicodeEncodeError: 'gbk' codec can't encode character` — prefix with `PYTHONIOENCODING=utf-8`
