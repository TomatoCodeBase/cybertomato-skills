---
name: obsidian-query
description: Enhanced Obsidian vault querying with smart search, context-aware note reading, tag browsing, backlink discovery, and vault mapping. Uses search_files and read_file tools for reliable cross-platform operation.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [Obsidian, Notes, Knowledge-Base, Search, Wikilinks, Backlinks, Tags, Vault]
    related_skills: [obsidian]
---

# Obsidian Query

Enhanced querying for your Obsidian vault. Smart search, context-aware reading, tag browsing, backlink discovery, and vault mapping — all using `search_files` and `read_file` tools.

**Vault Location:** Set via `OBSIDIAN_VAULT_PATH` environment variable (e.g. in `~/.hermes/.env`).
If unset, defaults to `~/Documents/Obsidian Vault`.

## Quick Reference

| Action | How |
|--------|-----|
| Smart search | Search by filename AND content simultaneously |
| Read with context | Show a note plus its wikilink connections |
| Recent notes | List notes sorted by modification time |
| Tag browse | Find notes by YAML frontmatter tags |
| Backlink discovery | Find notes that reference a given note |
| Vault overview | Generate a structural map of the vault |

---

## 1. Smart Search

Search by filename **and** content at the same time. Uses `search_files` for both.

### Search filenames

```
search_files(
  target="files",
  path="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}",
  pattern="*keyword*"
)
```

### Search note content

```
search_files(
  target="content",
  path="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}",
  pattern="keyword",
  file_glob="*.md"
)
```

### Combined smart search (both filename and content)

Run both searches and merge the results:

```bash
VAULT="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}"
# Use the helper script for combined results
python3 scripts/obsidian_query.py search "keyword" --vault "$VAULT"
```

Or manually with two `search_files` calls:
1. `search_files(target="files", path="$VAULT", pattern="*keyword*")` — finds matching filenames
2. `search_files(target="content", path="$VAULT", pattern="keyword", file_glob="*.md")` — finds matching content

Cross-reference: if a file appears in both, it's a high-confidence match. Deduplicate by file path.

### Search with context (show surrounding lines)

```
search_files(
  target="content",
  path="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}",
  pattern="keyword",
  file_glob="*.md",
  context=3
)
```

---

## 2. Read Note with Context

Read a note **and** extract its wikilink connections to show the knowledge graph neighborhood.

### Step 1: Read the note

```
read_file(path="$VAULT/Note Name.md")
```

### Step 2: Extract wikilinks

After reading, scan the content for `[[Note Name]]` patterns. These are the note's outgoing links.

Wikilink regex: `\[\[([^\]]+)\]\]`

Common variants to handle:
- `[[Note Name]]` — simple link
- `[[Note Name|Display Text]]` — alias link (extract "Note Name" part)
- `[[Note Name#Heading]]` — heading link (extract "Note Name" part)

### Step 3: Show connected notes

For each wikilink found, attempt to read a snippet of the linked note:

```
read_file(path="$VAULT/Linked Note.md", limit=5)
```

This gives context about what each linked note is about without reading the full content.

### Using the helper script

```bash
VAULT="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}"
python3 scripts/obsidian_query.py read "Note Name" --vault "$VAULT"
```

---

## 3. List Recent Notes

Show recently modified notes using file metadata.

```bash
VAULT="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}"
python3 scripts/obsidian_query.py recent --vault "$VAULT" --limit 20
```

Or with `search_files` + sorting:

```
search_files(
  target="files",
  path="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}",
  pattern="*.md"
)
```

Then sort results by modification time (newest first). The `search_files` tool with `target="files"` returns results sorted by modification time by default.

---

## 4. Tag-Based Browsing

Find notes by their YAML frontmatter tags. Obsidian stores tags in the frontmatter block at the top of notes:

```yaml
---
tags: [concept, ai, machine-learning]
---
```

Or:

```yaml
---
tags:
  - concept
  - ai
  - machine-learning
---
```

### Search for a specific tag

```
search_files(
  target="content",
  path="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}",
  pattern="^tags:.*\\btagname\\b",
  file_glob="*.md"
)
```

### Browse all tags in the vault

```bash
VAULT="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}"
python3 scripts/obsidian_query.py tags --vault "$VAULT"
```

### Find notes with a specific tag

```bash
python3 scripts/obsidian_query.py tag-search "machine-learning" --vault "$VAULT"
```

### Inline tags

Obsidian also supports inline tags like `#tagname`. Search for those:

```
search_files(
  target="content",
  path="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}",
  pattern="#tagname",
  file_glob="*.md"
)
```

Be careful to distinguish inline tags from Markdown headings (`# Heading`). Inline tags typically don't have a space after `#` and appear mid-line.

---

## 5. Backlink Discovery

Find all notes that **reference** a given note via `[[Note Name]]` wikilinks. This is the reverse of outgoing links.

### Search for backlinks

```
search_files(
  target="content",
  path="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}",
  pattern="\\[\\[Note Name\\]\\]",
  file_glob="*.md"
)
```

Also search for variant forms:
- `[[Note Name|` — alias links
- `[[Note Name#` — heading links

### Using the helper script

```bash
VAULT="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}"
python3 scripts/obsidian_query.py backlinks "Note Name" --vault "$VAULT"
```

This automatically handles all wikilink variants and shows each backlink with surrounding context.

---

## 6. Full Vault Overview

Generate a structural map of the vault showing folders, note counts, and key connections.

```bash
VAULT="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}"
python3 scripts/obsidian_query.py overview --vault "$VAULT"
```

### Manual overview approach

1. List all markdown files:
   ```
   search_files(target="files", path="$VAULT", pattern="*.md")
   ```

2. Extract folder structure from the file paths returned.

3. For each note, extract wikilinks to build a connection map.

4. Count notes per folder, find orphan notes (no incoming or outgoing links), and identify hub notes (many connections).

### Overview output format

```
VAULT OVERVIEW: ~/Documents/Obsidian Vault
============================================
Total notes: 47
Total folders: 8

FOLDERS:
  / (root) .......... 12 notes
  /Projects ......... 8 notes
  /Concepts ......... 15 notes
  /Daily ............ 7 notes
  /Archive .......... 5 notes

HUB NOTES (most connected):
  1. [[MOC - AI]] .......... 14 links
  2. [[Project Alpha]] ..... 9 links
  3. [[Core Concepts]] ..... 7 links

ORPHANS (no links in or out):
  - [[Untitled]]
  - [[Scratch Pad]]
```

---

## Helper Script

The `scripts/obsidian_query.py` script provides all commands in one place:

```bash
# Smart search (filename + content)
python3 scripts/obsidian_query.py search "keyword" --vault "$VAULT"

# Read note with context (shows wikilinks + snippets of linked notes)
python3 scripts/obsidian_query.py read "Note Name" --vault "$VAULT"

# List recent notes
python3 scripts/obsidian_query.py recent --vault "$VAULT" --limit 20

# List all tags in vault
python3 scripts/obsidian_query.py tags --vault "$VAULT"

# Find notes with a specific tag
python3 scripts/obsidian_query.py tag-search "tag-name" --vault "$VAULT"

# Find backlinks to a note
python3 scripts/obsidian_query.py backlinks "Note Name" --vault "$VAULT"

# Full vault overview
python3 scripts/obsidian_query.py overview --vault "$VAULT"
```

No external dependencies — uses only Python stdlib.

---

## Notes

- Vault paths may contain spaces — always quote them in shell commands
- Wikilink resolution is case-insensitive in Obsidian but case-sensitive in grep; the helper script handles this
- Orphan notes (no links) may still be valuable — they surface in the vault overview
- For creating and appending to notes, see the basic `obsidian` skill
- The helper script uses `os.walk()` for file traversal and `re` for pattern matching — no third-party packages needed
- YAML frontmatter parsing in the helper script handles both list and comma-separated tag formats
