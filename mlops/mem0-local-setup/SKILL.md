---
name: mem0-local-setup
description: Set up self-hosted Mem0 (local mode) as the memory provider for Hermes Agent. Uses embedded Qdrant + your existing LLM API — no cloud services, no Docker, no extra costs. Data stays local.
version: 1.0.0
tags: [mem0, memory, hermes, self-hosted, qdrant, local]
---

# Mem0 Local Mode Setup for Hermes Agent

## When to Use

- User wants Mem0 memory but doesn't want to use the cloud platform (privacy, cost, or availability)
- User wants automatic fact extraction from conversations without manual memory management
- User already has an LLM API key (GLM, OpenAI, DeepSeek, etc.) and wants to reuse it for memory

## Overview

Mem0 has two modes:
1. **Cloud** — uses `MemoryClient` with Mem0 Platform API (requires `MEM0_API_KEY`)
2. **Local** — uses `Memory` class with embedded Qdrant + your LLM (no cloud dependency)

The local mode is already supported in the Hermes Mem0 plugin (`plugins/memory/mem0/__init__.py`) as of the modification described below.

## Step-by-Step Setup

### 1. Install mem0ai

```bash
# In Hermes venv
source venv/bin/activate  # or .venv/bin/activate
python -m ensurepip       # if pip not present
pip install mem0ai
```

### 2. Configure Hermes

Set the memory provider to mem0 and enable local mode:

```bash
hermes config set memory.provider mem0
```

Or edit `~/.hermes/config.yaml` directly:
```yaml
memory:
  memory_enabled: true
  user_profile_enabled: true
  provider: mem0
```

### 3. Create mem0.json config

Create `~/.hermes/mem0.json`:
```json
{
  "mode": "local",
  "user_id": "hermes-user",
  "agent_id": "hermes"
}
```

The LLM config (model, api_key, base_url) is auto-detected from Hermes `config.yaml` and `.env`. You only need to override if you want different settings for Mem0.

### 4. Set environment variables (if not auto-detected)

The plugin auto-reads from Hermes config, but you can override via env vars:
```bash
# In ~/.hermes/.env
MEM0_MODE=local
MEM0_LLM_MODEL=glm-4-flash
MEM0_LLM_API_KEY=your-key-here
MEM0_LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
MEM0_EMBEDDER_MODEL=embedding-3
MEM0_EMBEDDING_DIMS=2048
```

### 5. Verify

```bash
hermes memory status
```

Or test in Python:
```python
from mem0 import Memory
import os

config = {
    "llm": {
        "provider": "openai",
        "config": {
            "model": "glm-4-flash",
            "api_key": os.environ["GLM_API_KEY"],
            "openai_base_url": "https://open.bigmodel.cn/api/paas/v4",
        }
    },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "embedding-3",
            "api_key": os.environ["GLM_API_KEY"],
            "openai_base_url": "https://open.bigmodel.cn/api/paas/v4",
        }
    },
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "path": os.path.expanduser("~/.hermes/mem0_qdrant"),
            "collection_name": "hermes_memories",
            "embedding_model_dims": 2048,
        }
    }
}

m = Memory.from_config(config)
m.add("I prefer dark mode", user_id="hermes-user")
print(m.search("preferences", user_id="hermes-user"))
```

## Critical Pitfalls

### 1. Embedding dimensions MUST match your model
- `embedding-3` (Z.AI/GLM) outputs **2048** dims, NOT the default 1536
- If you get a dimension mismatch error from Qdrant, you need to **delete the old collection** and recreate:
  ```python
  from qdrant_client import QdrantClient
  client = QdrantClient(path=os.path.expanduser("~/.hermes/mem0_qdrant"))
  client.delete_collection("hermes_memories")
  ```
- The `embedding_model_dims` key in the Qdrant config must match the embedder's output

### 2. Mem0 API return format differs from MemoryClient
- `Memory.search()` returns `{"results": [...]}` dict (not a plain list)
- `Memory.get_all()` returns `{"results": [...]}` dict (not a plain list)
- Each result item is a dict with keys: `id`, `memory`, `hash`, `metadata`, `score` (search only), `created_at`, `updated_at`, `user_id`
- The plugin code handles this automatically via `isinstance` checks

### 3. Local Memory.search() does NOT accept `top_k`
- `Memory.search(query, user_id)` — only accepts `query` and `user_id` (no `top_k`, no `rerank`)
- Passing `top_k` raises: `Memory.search() got an unexpected keyword argument 'top_k'`
- `MemoryClient.search()` (cloud) accepts `top_k`, `rerank` etc. — different API signature
- The plugin code handles this by calling `client.search(query, user_id)` without extra args in local mode
- If you need to limit results, slice the returned list manually

### 4. Config key is `openai_base_url`, not `base_url`
- Mem0's OpenAI provider uses `openai_base_url` for the base URL
- Using `base_url` silently falls back to `https://api.openai.com/v1`

### 5. Qdrant Windows cleanup bug (harmless)
- On Windows, Qdrant local mode throws `ModuleNotFoundError: import of msvcrt halted` during Python shutdown
- This is a known bug in `portalocker` + Qdrant's `__del__` method
- **Completely harmless** — only happens during process exit, doesn't affect data

### 6. Use a cheap model for fact extraction
- Mem0 calls the LLM to extract facts from conversation turns
- This happens on every `sync_turn()` — can be expensive with premium models
- The plugin auto-falls back to `glm-4-flash` when the main model is expensive (claude-opus, gpt-4o, glm-5.1)
- Override with `MEM0_LLM_MODEL` env var or `llm_model` in `mem0.json`

### 7. No Docker needed
- Qdrant runs in embedded/local mode (file-based storage at `~/.hermes/mem0_qdrant/`)
- No Docker, no server process — everything runs in-process

## Supported LLM Providers for Local Mode

Any provider with an OpenAI-compatible API works. Examples:

| Provider | Base URL | Embedding Model | Dims |
|----------|----------|-----------------|------|
| Z.AI / GLM | `https://open.bigmodel.cn/api/paas/v4` | `embedding-3` | 2048 |
| DeepSeek | `https://api.deepseek.com/v1` | (use separate embedder) | varies |
| OpenAI | `https://api.openai.com/v1` | `text-embedding-3-small` | 1536 |
| Local (Ollama) | `http://localhost:11434/v1` | `nomic-embed-text` | 768 |

## Obsidian Integration (Optional)

Once Mem0 local mode is running, you can sync memories to an Obsidian vault for visual browsing.

### Sync Script

Located at `~/.hermes/scripts/mem0_obsidian_sync.py`. Creates:
- `Mem0 Memories/Memories.md` — index page with all memories, grouped by date, with `[[wikilinks]]`
- One `.md` file per memory with YAML frontmatter (`mem0_id`, `mem0_hash`, `created_at`, `updated_at`)

Only updates files when content actually changed (compares hash). Supports `--dry-run`, `--vault PATH`, `--user-id ID`.

### Cron Job (Auto-Sync)

Set up a cron job to sync every 2 hours:

```python
cronjob(
    action="create",
    name="Mem0 → Obsidian 同步",
    schedule="0 */2 * * *",
    script="~/.hermes/scripts/mem0_obsidian_sync.py",
    prompt="Report sync results from the script output.",
    deliver="local",
)
```

### Obsidian Skills

- `obsidian-save` — Save conversation highlights as structured notes
- `obsidian-query` — Enhanced vault search (tags, backlinks, recent, overview)

### Obsidian Sync Pitfalls

1. **Chinese filenames on Windows** — Git Bash terminal displays mojibake for Chinese filenames, but the actual files on disk are correct UTF-8. Verify with `ls` piped through `cat`, or just open Obsidian.
2. **Mem0 auto-deduplication** — When you add a new fact that subsumes an old one, Mem0 may DELETE the old fact and ADD the new one in a single `add()` call. The sync script needs to handle this: the old note file becomes stale (no longer in `get_all()`). The script only writes what `get_all()` returns, so stale files remain on disk — acceptable but worth knowing.
3. **No Docker needed for sync either** — The sync script uses the same in-process Qdrant as the plugin.
4. **Default vault path is often wrong** — The script defaults to `~/Documents/Obsidian Vault` but many users have their vault elsewhere (e.g. `D:\cybertomato`). Always ask the user for their vault path, or check `OBSIDIAN_VAULT_PATH` in `.env`. Set it explicitly:
   ```bash
   # In ~/.hermes/.env
   OBSIDIAN_VAULT_PATH=D:\cybertomato
   ```
   The sync script reads this env var first, then falls back to the hardcoded default.

## File Locations

| File | Purpose |
|------|---------|
| `~/.hermes/mem0.json` | Mem0 plugin config (mode, model overrides) |
| `~/.hermes/mem0_qdrant/` | Qdrant vector storage (auto-created) |
| `~/.hermes/config.yaml` | Hermes main config (memory.provider: mem0) |
| `~/.hermes/.env` | API keys (GLM_API_KEY, OPENAI_API_KEY, etc.) |
| `plugins/memory/mem0/__init__.py` | Plugin code (already modified for local support) |
