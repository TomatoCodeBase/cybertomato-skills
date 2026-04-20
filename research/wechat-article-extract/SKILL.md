---
name: wechat-article-extract
description: Extract full text content from WeChat public account (微信公众号) articles via curl + Python HTML parsing.
---

# WeChat Article Extraction

Extract readable text from `mp.weixin.qq.com/s/...` URLs when browser tools are unavailable or blocked.

## Method

### Step 1: Fetch HTML with curl

```bash
curl -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  "https://mp.weixin.qq.com/s/ARTICLE_ID" -o ~/wx_article.html
```

- Use `~/wx_article.html` (home directory) — NOT `/tmp/`. On Windows MSYS/Git Bash, `/tmp/` is a virtual path that `curl` writes to but Python cannot read from. Home dir works for both.

- The `-A` (User-Agent) header is **required** — WeChat serves different content or blocks requests without a browser UA.
- `-sL` follows redirects silently.
- File size is typically 1-3 MB (lots of inline JS/CSS).

### Step 2: Extract text with Python

```python
import re, html, os, sys, io

# Fix Windows GBK encoding — REQUIRED on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

filepath = "wx_article.html"  # or full path
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract title — try multiple patterns
title = 'No title'
for pat in [
    r'var msg_title = .(.*?).;',
    r'<title>(.*?)</title>',
    r'var msg_title = &quot;(.*?)&quot;',
]:
    m = re.search(pat, content)
    if m and html.unescape(m.group(1)).strip():
        title = html.unescape(m.group(1))
        break

# Extract article body from js_content div
body_m = re.search(r'id="js_content"[^>]*>(.*?)</div>\s*<script', content, re.DOTALL)
if not body_m:
    body_m = re.search(r'id="js_content"[^>]*>(.*?)</div>', content, re.DOTALL)

if body_m:
    text = body_m.group(1)
    text = re.sub(r'<[^>]+>', '\n', text)
    text = html.unescape(text)
    text = text.replace('\xa0', ' ')  # non-breaking space → normal space
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()
else:
    text = 'Could not extract article body'

print(f'TITLE: {title}\n')
print(text)
```

## Pitfalls (learned the hard way)

### 1. Windows venv activation is different
- **Linux**: `source venv/bin/activate`
- **Windows (Git Bash/MSYS)**: `source venv/Scripts/activate`
- The venv directory structure differs: `Scripts/` vs `bin/`

### 2. Python stdout encoding on Windows
- Windows defaults to GBK encoding for stdout, which **cannot** encode `\xa0` (non-breaking space) or many CJK characters.
- **Fix**: Add `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')` at the top.
- Also explicitly replace `\xa0` with regular space in extracted text.

### 3. Temp file path differs between bash and Python
- In a Windows sandbox with MSYS/Git Bash:
  - Bash `/tmp/` maps to a virtual path that `curl` writes to successfully
  - Python **cannot** find `/tmp/wx_article.html` — it needs the Windows temp path
  - Use `os.environ['TEMP']` (e.g. `C:\Users\NAME\AppData\Local\Temp\`) for Python file operations
  - Or write to a known working directory instead of `/tmp/`

### 4. `python3` may not work on Windows
- `python3` on Windows AppExecution alias may return exit code 49 or hang
- Use `python` (from activated venv) instead

### 5. Title regex is tricky
- WeChat HTML encodes the title with HTML entities in the `var msg_title` JS variable
- The exact quoting varies — try multiple patterns
- Always `html.unescape()` the result

### 6. No venv available — use system Python directly
- If `source venv/bin/activate` and `source venv/Scripts/activate` both fail, find the system Python:
  ```bash
  where python 2>/dev/null
  ```
- Use the full Windows path directly: `"D:/Python/python.exe" script.py`
- `python3` via Windows AppExecution alias returns exit code 49 even for valid scripts — always prefer the real `python.exe`

### 7. Avoid stdout encoding issues — write to file instead
- Instead of `python -c "..."` which may fail on Windows GBK stdout, write the script to a `.py` file first, then run it
- Have the script write output to a file (e.g. `wx_extracted.txt`) instead of printing to stdout
- Then use `read_file` to read the output — avoids all encoding/pty issues

## When to use this

- Browser tools are unavailable (missing dependencies, sandbox restrictions)
- You need the text content of a WeChat article for summarization, translation, or analysis
- The article is publicly accessible (not behind login)

## When NOT to use this

- If browser tools work — they handle rendering better (lazy-loaded images, dynamic content)
- If the article requires WeChat login to view
