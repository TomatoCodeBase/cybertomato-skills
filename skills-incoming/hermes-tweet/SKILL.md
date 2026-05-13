---
name: hermes-tweet
description: Native Hermes Agent X/Twitter plugin for Xquik automation. Use for tweet search, replies, user lookup, monitors, follower export, posting, DMs, and approval-gated X actions.
version: 0.1.6
author: Xquik
license: MIT
platforms: [linux, macos]
prerequisites:
  commands: [hermes]
  env_vars: [XQUIK_API_KEY]
metadata:
  hermes:
    tags: [hermes-agent, hermes-plugin, xquik, twitter, x, social-media, automation]
    homepage: https://docs.xquik.com/guides/hermes-tweet
    repository: https://github.com/Xquik-dev/hermes-tweet
    install: hermes plugins install Xquik-dev/hermes-tweet --enable
---

# Hermes Tweet

Hermes Tweet is the native Hermes Agent plugin for Xquik. Use it when a Hermes
session needs to search Twitter/X, read tweet replies, look up users, monitor
tweets, export followers, post tweets or replies, send DMs, or automate X
actions with an explicit approval gate.

This skill is different from the existing `xurl` and `xitter` skills in this
repository. Those skills drive standalone X API CLIs. Hermes Tweet registers
Hermes tools directly through the plugin system, so the agent can discover
Xquik endpoints and route safe reads or approved actions from inside the same
Hermes session.

## Install

```bash
hermes plugins install Xquik-dev/hermes-tweet --enable
```

Configure `XQUIK_API_KEY` in the Hermes runtime environment. Do not paste the
key into chat, issue bodies, logs, or command arguments.

Optional action tools stay gated until the runtime sets:

```bash
HERMES_TWEET_ENABLE_ACTIONS=true
```

Verify the plugin:

```bash
hermes plugins enable hermes-tweet
hermes tools list
```

## Tools

Hermes Tweet exposes 3 tools:

- `tweet_explore` finds Xquik endpoints and explains which tool should handle
  the next step.
- `tweet_read` calls public read-only endpoints after endpoint discovery.
- `tweet_action` calls write, private-read, monitor, webhook, extraction, draw,
  media, posting, reply, DM, follow, or profile-change endpoints only after the
  user approves the exact operation.

## Workflow

1. Start with `tweet_explore` using a short query such as `tweet search`,
   `read replies`, `look up user`, `export followers`, or `post tweet`.
2. Use `tweet_read` only for public `GET` endpoints that are not marked as
   actions.
3. Use `tweet_action` only when actions are enabled and the user has approved
   the endpoint, method, payload, and reason.
4. If `XQUIK_API_KEY` is missing, ask the user to configure it locally without
   requesting the key value.

## Common Requests

Search Twitter/X:

```json
{"query":"tweet search","method":"GET"}
```

Read tweet replies:

```json
{"query":"read replies","method":"GET"}
```

Look up a user:

```json
{"query":"user lookup","method":"GET"}
```

Export followers:

```json
{"query":"export followers","include_actions":true}
```

Post an approved tweet:

```json
{"query":"post tweet","include_actions":true}
```

Send an approved DM:

```json
{"query":"send dm","include_actions":true}
```

## Safety Rules

- Never ask for or reveal API keys, signing keys, passwords, cookies, or TOTP
  secrets.
- Never pass credentials in tool arguments.
- Do not guess endpoint paths. Use the catalog returned by `tweet_explore`.
- Use only catalog-listed `/api/v1/...` endpoints.
- Do not use account connection, re-authentication, API key, billing, credit
  top-up, or support-ticket endpoints.
- Before posting, replying, deleting, following, sending DMs, changing profiles,
  creating monitors, configuring webhooks, running extraction jobs, or drawing
  giveaways, summarize the exact action and wait for approval.
- Do not retry writes through alternate routes after a policy, auth, or account
  state error.

## Documentation

- Hermes Tweet guide: https://docs.xquik.com/guides/hermes-tweet
- Source repository: https://github.com/Xquik-dev/hermes-tweet
