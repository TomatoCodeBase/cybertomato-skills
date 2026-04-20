---
name: publish-to-lark-doc
version: 1.0.0
description: "将本地文件或网页文章内容发布到飞书文档。覆盖从内容提取、Markdown 转换、到飞书创建的完整流程。触发词：发布到飞书、发飞书文档、创建飞书文档。"
---

# 发布内容到飞书文档

将任意来源（本地 Markdown、网页文章、知识星球等）的内容发布为飞书云文档。

## 核心流程

### 1. 获取内容

| 来源 | 方法 |
|------|------|
| 本地 Markdown 文件 | `read_file` 直接读取 |
| 微信公众号文章 | `curl` 抓取 HTML → Python 提取正文（见 wechat-article-extract skill） |
| 知识星球文章 | CDP proxy 抓取（见下方"知识星球提取"章节） |
| 任意网页 | `curl -sL` 抓取 → Python 解析 |

### 2. 转换为 Lark-flavored Markdown

图片使用 `<image url="..." align="center"/>` 标签，飞书会自动下载上传。

```markdown
段落文字

<image url="https://example.com/image.png" align="center"/>

更多文字
```

### 3. 创建飞书文档（两步法）

⚠️ **关键发现：`docs +create` 含图片时返回异步 task_id，但 lark-cli 没有提供 polling 机制！**

正确做法是两步法：

```bash
# Step 1: 创建空文档（同步，立即返回 doc_id）
lark-cli docs +create --title "标题" --markdown "占位文字" --as user

# Step 2: 用 overwrite 写入完整内容
lark-cli docs +update --doc "DOC_ID" --mode overwrite --markdown @content.md --as user
```

单步法只在内容很短（无图片）时可用：
```bash
lark-cli docs +create --title "标题" --markdown "短内容" --as user
```

## 踩坑记录

### 1. @file 必须用相对路径（Windows）

```bash
# BAD — 报错 "file must be a relative path within the current directory"
lark-cli docs +create --markdown @/tmp/content.md --as user

# GOOD — 先 cd 到文件所在目录
cd /tmp && lark-cli docs +create --markdown @content.md --as user
```

### 2. 异步任务无法轮询

`docs +create` 返回异步 task_id 时：
```json
{"task_id": "xxx-xxx", "status": "running", "message": "Task is processing in the background..."}
```

`lark-cli` 没有提供通用异步任务查询命令：
- `lark-cli task` 是飞书任务功能，不是异步任务
- `lark-cli drive +task_result` 只适用于 drive 的 import/export/move 操作
- 再次调用 `docs +create` 会创建新文档，不会查询旧任务

**解决方案**：用两步法避开异步问题。

### 3. 图片下载可能失败

`docs +update --mode overwrite` 的 warnings 字段会提示失败的图片：
```json
{"warnings": ["[WARNING:IMAGE_DOWNLOAD_FAILED] Image download failed: https://..."]}
```

部分图床链接不稳定，可手动在飞书文档中补充。

### 4. 飞书文档无 H1 标题

`--title` 参数已是文档标题，markdown 内容不要以 `# 标题` 开头，直接从正文或 `## 二级标题` 开始。

## 知识星球文章提取

知识星球文章（`articles.zsxq.com`）需要登录，curl 抓取只会得到 SPA 外壳。通过 CDP proxy 提取：

```bash
# 1. 打开文章页
TARGET=$(curl -s "http://localhost:3456/new?url=https://articles.zsxq.com/id_XXXXX.html" | jq -r '.targetId')

# 2. 等待加载
sleep 5

# 3. 获取标题
curl -s "http://localhost:3456/info?target=$TARGET" | jq -r '.title'

# 4. 提取正文文本
curl -s -X POST "http://localhost:3456/eval?target=$TARGET" \
  -d "(function(){ var a=document.querySelector('article')||document.querySelector('.content'); return a?a.innerText:'no content'; })()"

# 5. 提取图片URL列表
curl -s -X POST "http://localhost:3456/eval?target=$TARGET" \
  -d "(function(){ var imgs=document.querySelectorAll('article img,.content img'); var r=[]; for(var i=0;i<imgs.length;i++){var s=imgs[i].src; if(s&&s.indexOf('http')===0) r.push(s);} return JSON.stringify(r); })()"

# 6. 提取完整HTML（含图片位置）
curl -s -X POST "http://localhost:3456/eval?target=$TARGET" \
  -d "(function(){ var a=document.querySelector('article')||document.querySelector('.content'); return a?a.innerHTML.substring(0,8000):''; })()"

# 7. 关闭tab
curl -s "http://localhost:3456/close?target=$TARGET"
```

从 HTML 中解析 `<img src="...">` 的位置，对应插入到 Markdown 中。

## 检查清单

- [ ] 内容已转为 Lark-flavored Markdown
- [ ] 图片用 `<image url="..." align="center"/>` 标签
- [ ] 无 H1 标题（--title 已是文档标题）
- [ ] 用两步法创建（先空文档，再 overwrite）
- [ ] `@file` 使用相对路径
- [ ] 检查返回结果中的 warnings（图片下载失败等）
