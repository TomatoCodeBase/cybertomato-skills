---
name: obsidian-save
description: Save conversation highlights, decisions, and key facts to Obsidian vault as structured notes.
---

# Obsidian Conversation Save

Save the key content of the current conversation to the Obsidian vault.

## Vault Path

```bash
VAULT="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}"
```

## Steps

1. **Summarize** the conversation — extract key points, decisions, action items, and learned facts.

2. **Pick a title** — short, descriptive, based on the main topic.

3. **Format the note** using this template:

```markdown
---
date: {YYYY-MM-DD}
tags: [hermes-conversation]
source: hermes-conversation
---

# {Title}

## Summary

{1-3 sentence overview of the conversation}

## Key Points

- {Point 1}
- {Point 2}
- ...

## Decisions

- {Decision made, if any}

## Action Items

- [ ] {Todo item}
- [ ] {Todo item}

## Code / Artifacts

{If any code was written or files were created, note them here with file paths}

## Related Notes

- [[{wikilink to related topic}]]
```

4. **Save** the note to:
   ```
   $VAULT/Conversations/{YYYY-MM-DD} - {Title}.md
   ```
   Create the `Conversations` folder if it doesn't exist.

5. **Confirm** to the user with the file path.

## Rules

- Use `write_file` tool, not `echo` or `cat`
- Always use YAML frontmatter
- Use `[[wikilinks]]` to cross-reference existing notes when relevant
- Keep the note concise — this is a summary, not a transcript
- If the conversation is trivial (small talk, quick Q&A), skip saving and tell the user
- Filenames must be valid on Windows: no `: * ? " < > |`
