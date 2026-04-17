---
name: obsidian
description: Read, search, and create notes in the Obsidian vault.
---

# Obsidian Vault

**Location:** Set via `OBSIDIAN_VAULT_PATH` environment variable (check `.env` file).

If unset, defaults to `~/Documents/Obsidian Vault`. Check past sessions if unsure of the path.

Note: Vault paths may contain spaces - always quote them.

## Obsidian CLI (file operations) — IMPORTANT

The Obsidian CLI (v1.12+) is installed and enabled. **Use it for any file move/rename/delete operations inside the vault** — it automatically updates all backlinks and references, preventing broken links.

**MINGW64 path:** `/d/RJCX/Obsidian/Obsidian.com`

PATH is NOT registered — always use the full path. Obsidian must be running for CLI commands to work.

```bash
# Move/rename (updates all [[backlinks]] automatically)
/d/RJCX/Obsidian/Obsidian.com move file="Old Name" to="target-folder"

# Search vault
/d/RJCX/Obsidian/Obsidian.com search query="关键词"

# List backlinks to a file
/d/RJCX/Obsidian/Obsidian.com backlinks file="Note Name"

# Read/append/prepend
/d/RJCX/Obsidian/Obsidian.com read file="Note Name"
/d/RJCX/Obsidian/Obsidian.com append file="Note Name" content="new text"

# Tags, properties, tasks
/d/RJCX/Obsidian/Obsidian.com tags counts sort=count
/d/RJCX/Obsidian/Obsidian.com property:set name=阶段 value=已发布 file="Note Name"
/d/RJCX/Obsidian/Obsidian.com tasks todo

# List orphans (no incoming links) and deadends (no outgoing links)
/d/RJCX/Obsidian/Obsidian.com orphans
/d/RJCX/Obsidian/Obsidian.com deadends
```

**CRITICAL:** Never use `mv` or `rm` directly on vault files. Always use the CLI for move/rename/delete. Direct shell operations break backlinks silently.

For creating new notes or editing content, `write_file` / `patch` tools are fine (no existing links to break).

## Read a note

```bash
VAULT="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}"
cat "$VAULT/Note Name.md"
```

Or use the `read_file` tool directly.

## List notes

Use `search_files` with `target=files` and `pattern=*.md` in the vault directory.

## Search

Use `search_files` with `target=content` and a regex pattern.

## Create a note

Use the `write_file` tool — it creates parent directories automatically.

## Append to a note

Use the `patch` tool, or for simple appends:
```bash
echo "\nNew content here." >> "$VAULT/Existing Note.md"
```

## Open a note in Obsidian

When the user says "open in ob" or "在ob里打开", they want the note opened directly in Obsidian.

```bash
start "obsidian://open?vault=cybertomato&file=$(python3 -c "import urllib.parse; print(urllib.parse.quote('relative/path/to/note.md'))")"
```

Notes:
- On Windows, use `start`; on macOS, use `open`; on Linux, use `xdg-open`
- The `file` parameter uses the path relative to the vault root, with `/` separators, URL-encoded
- The vault name is the folder name of the vault directory (e.g. `cybertomato`)

## Junction Links (exposing external directories inside vault)

To make external directories visible inside Obsidian (e.g. Hermes config, another project), create a Junction link inside the vault:

```powershell
# MUST use PowerShell — cmd.exe mklink silently fails in MINGW64
# Junction (not symlink) — no admin privileges needed
powershell.exe -Command "New-Item -ItemType Junction -Path 'D:\cybertomato\外部目录名' -Target 'D:\external\path'"
```

Key pitfalls:
- **Never use `cmd.exe /c mklink` from MINGW64** — output is swallowed, silently fails on both `/D` (symlink, needs admin) and `/J` (junction)
- **Symlink (`/D`) requires admin UAC** — Junction (`/J`) does NOT, always prefer junction for local paths
- **Target folder must not already exist** — move or rename it first before creating the junction
- Junction only works for local paths (not network), which is fine for vault integration

Example: `D:\cybertomato\Hermes工作区` → `D:\HermesData\.hermes` lets you view/edit Hermes config files directly in Obsidian.

## Wikilinks

Obsidian links notes with `[[Note Name]]` syntax. When creating notes, use these to link related content.
