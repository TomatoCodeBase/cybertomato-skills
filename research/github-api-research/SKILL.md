---
name: github-api-research
description: Research open-source projects using GitHub REST API when browser tools are unavailable or web search fails. Uses GitHub Search API, Repo API, and Readme API to gather project metadata, descriptions, and comparisons.
---

# GitHub API Research

When you need to research open-source projects but browser tools are down, raw.githubusercontent.com times out, or web search APIs are unavailable, use GitHub's REST API directly via curl + Python.

## Method

### Step 1: Search for repos by keyword

```bash
curl -sL --max-time 15 "https://api.github.com/search/repositories?q=KEYWORD+memory+AI+agent&sort=stars&per_page=5" -A "Mozilla/5.0" | python -c "
import sys,json,io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
d=json.load(sys.stdin)
for r in d.get('items',[])[:5]:
    print(f\"{r['full_name']} | Stars:{r['stargazers_count']} | {r['description']}\")
"
```

Use multiple search queries with different keyword combinations to maximize coverage. Run searches in parallel when possible.

### Step 2: Get repo metadata

```bash
curl -sL --max-time 15 "https://api.github.com/repos/OWNER/REPO" -A "Mozilla/5.0" | python -c "
import sys,json,io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
d=json.load(sys.stdin)
print(f'Stars: {d.get(\"stargazers_count\")}')
print(f'Description: {d.get(\"description\")}')
print(f'Language: {d.get(\"language\")}')
print(f'License: {d.get(\"license\",{}).get(\"spdx_id\",\"N/A\")}')
print(f'Topics: {d.get(\"topics\",[])}')
print(f'Homepage: {d.get(\"homepage\")}')
"
```

### Step 3: Get README content (base64 encoded)

```bash
curl -sL --max-time 15 "https://api.github.com/repos/OWNER/REPO/readme" -A "Mozilla/5.0" | python -c "
import sys,json,base64,io,re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
d=json.load(sys.stdin)
content = base64.b64decode(d['content']).decode('utf-8')
# Strip images for cleaner output
content = re.sub(r'!\[.*?\]\(.*?\)', '', content)
content = re.sub(r'<img[^>]*>', '', content)
print(content[:5000])
"
```

### Step 4: Check PyPI for packages

```bash
curl -sL --max-time 10 "https://pypi.org/pypi/PACKAGE_NAME/json" -A "Mozilla/5.0" | python -c "
import sys,json,io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
try:
    d=json.load(sys.stdin)
    print('Name:', d['info']['name'])
    print('Summary:', d['info']['summary'])
    print('Version:', d['info']['version'])
    print('Home:', d['info'].get('home_page',''))
except: print('Not found on PyPI')
"
```

## Pitfalls

### 1. Windows GBK encoding
Windows terminal defaults to GBK, which cannot encode emoji/CJK characters from GitHub content. **Always** add:
```python
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
```

### 2. raw.githubusercontent.com may time out
On some networks (especially China), `raw.githubusercontent.com` is blocked or extremely slow. The README API (`api.github.com/repos/OWNER/REPO/readme`) returns base64-encoded content and goes through `api.github.com`, which is more reliably accessible.

### 3. GitHub API rate limits
Unauthenticated requests are limited to 10/hour for search, 60/hour for other endpoints. If you hit rate limits, the response will contain a `403` status. For heavy research, consider using `GITHUB_TOKEN` env var:
```bash
curl -sL -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/..."
```

### 4. python3 vs python on Windows
On Windows, `python3` may return exit code 49 or hang. Use `python` from an activated venv instead. Find the venv path with `which python`.

### 5. README content can be very large
GitHub READMEs can be 10K+ chars. Always use `[:N]` slicing in print to avoid flooding output. For multi-section reading, use offset slicing like `content[5000:10000]`.

### 6. Search queries need tuning
- Generic terms like "memory AI agent" return too many results
- Try `in:name` qualifier: `hindsight-memory+in:name`
- Combine keywords: `byterover+memory+hermes`
- Try multiple query variations per project — some projects are hard to find with a single search

## When to use this

- Browser tools (Browserbase) are unavailable or broken
- `raw.githubusercontent.com` times out
- You need to compare multiple open-source projects
- Web search APIs (Brave, etc.) are unavailable or timing out
- You need structured data (stars, license, language) for comparison tables

## When NOT to use this

- If browser tools work — they handle dynamic content better
- For non-GitHub projects — use web search instead
- If you need info not in README (wiki, docs site) — fall back to curl on the docs URL
