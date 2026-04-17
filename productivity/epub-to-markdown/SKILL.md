---
name: epub-to-markdown
description: Convert EPUB files to Markdown for reading in Obsidian. Pandoc first, Python zipfile fallback when pandoc fails.
triggers:
  - epub转markdown
  - epub转md
  - 转换epub
  - convert epub
---

# EPUB to Markdown Converter

Convert EPUB files to Markdown for reading in Obsidian or other Markdown editors.

## When to Use
- User wants to read an EPUB in Obsidian (Obsidian doesn't render EPUB natively)
- User has an EPUB file and wants it converted to plain Markdown

## Approach

### Step 1: Try pandoc first
```bash
pandoc "input.epub" -o "output.md" --wrap=none
```

### Step 2: If pandoc fails, use Python zipfile fallback

Pandoc sometimes fails with "Couldn't extract ePub file: getCompressedData can't find data descriptor signature" — some EPUBs have non-standard ZIP structures that pandoc can't handle but Python's zipfile module tolerates.

Write a Python script to a file (do NOT use `python3 -c` in MINGW64 — quoting breaks, use a .py file):

```python
import zipfile, os, re, html as htmlmod

epub_path = 'INPUT.epub'
out_path = 'OUTPUT.md'

with zipfile.ZipFile(epub_path, 'r') as z:
    html_files = sorted([n for n in z.namelist() if n.endswith(('.html', '.xhtml', '.htm'))])
    
    parts = []
    for hf in html_files:
        try:
            parts.append(z.read(hf).decode('utf-8', errors='ignore'))
        except Exception as e:
            print(f'Error reading {hf}: {e}')
    
    full_text = '\n'.join(parts)
    
    # Remove style/script
    full_text = re.sub(r'<style[^>]*>.*?</style>', '', full_text, flags=re.DOTALL)
    full_text = re.sub(r'<script[^>]*>.*?</script>', '', full_text, flags=re.DOTALL)
    
    # HTML to Markdown conversions
    full_text = re.sub(r'<h1[^>]*>(.*?)</h1>', r'\n# \1\n', full_text, flags=re.DOTALL)
    full_text = re.sub(r'<h2[^>]*>(.*?)</h2>', r'\n## \1\n', full_text, flags=re.DOTALL)
    full_text = re.sub(r'<h3[^>]*>(.*?)</h3>', r'\n### \1\n', full_text, flags=re.DOTALL)
    full_text = re.sub(r'<h4[^>]*>(.*?)</h4>', r'\n#### \1\n', full_text, flags=re.DOTALL)
    full_text = re.sub(r'<p[^>]*>', '\n', full_text)
    full_text = re.sub(r'<br\s*/?>', '\n', full_text)
    full_text = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', full_text, flags=re.DOTALL)
    full_text = re.sub(r'<em[^>]*>(.*?)</em>', r'*\1*', full_text, flags=re.DOTALL)
    full_text = re.sub(r'<li[^>]*>', '\n- ', full_text)
    full_text = re.sub(r'<hr\s*/?>', '\n---\n', full_text)
    
    # Strip remaining tags
    full_text = re.sub(r'<[^>]+>', '', full_text)
    full_text = htmlmod.unescape(full_text)
    full_text = re.sub(r'\n{3,}', '\n\n', full_text).strip()
    
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(full_text)
    print(f'Written to {out_path}, size: {len(full_text)} chars')
```

### Step 3: Run with Hermes venv Python
```bash
/d/Hermes/venv/Scripts/python.exe /tmp/epub2md.py
```

## Pitfalls
- **MINGW64 python3 -c fails (exit code 49)**: Always write a .py file and execute it. Don't use inline `-c` with Python in MINGW64.
- **Use full Windows Python path**: `/d/Hermes/venv/Scripts/python.exe` instead of `python3` which may hang or fail in MINGW64.
- **File paths with Chinese characters**: Work fine with Python's open() and zipfile on Windows — no special handling needed as long as encoding='utf-8'.
- **pandoc EPUB parsing failures**: Common with non-standard EPUBs (especially from Chinese sources). The Python zipfile fallback handles these fine.

## Output Location
- Default save to Obsidian vault: `D:/cybertomato/`
- User's temp download area: `D:/G谷歌下载/`
