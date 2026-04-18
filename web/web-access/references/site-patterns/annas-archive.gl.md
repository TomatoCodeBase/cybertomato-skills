---
domain: annas-archive.gl
aliases: [annas-archive, 安娜的档案, Anna's Archive, annas-archive.pk, annas-archive.gd]
updated: 2026-04-17
---

## 平台特征

- 开放电子书/论文搜索引擎，聚合 LibGen、Z-Lib、Sci-Hub 等源
- 域名频繁更换（2026-04）：.org/.gs/.se/.li/.to/.la 均已失效，当前可用 **.gl**、**.pk**、**.gd**
- 新域名可通过 Reddit r/Annas_Archive 或 GitHub issues 确认
- 中文搜索不可靠（搜索框对中文查询返回空结果），用英文书名搜索
- 首页 `innerText` 被语言选择列表+统计信息+最近下载占据大量篇幅，真正的搜索结果需要滚动或定位到 main 元素内

## 有效模式

### 搜索
- URL: `https://annas-archive.gl/search?q=<英文关键词>`
- 搜索结果在 `<main>` 元素内，以 "RESULTS 1-N (N TOTAL)" 开头

### 定位结果对应的 MD5
- `<main>` 内的 `/md5/` 链接按顺序出现，但每个结果重复 2 次
- **关键陷阱**：`<main>` 内不仅有搜索结果链接，还有"最近下载"区域的链接，两者混在一起无法仅靠 DOM 顺序区分
- 可靠方法：从 `innerText` 的 "RESULTS" 段落解析文本（标题、格式、来源），然后逐个 `navigate` 到候选 MD5 页面检查 `document.title` 确认

### 下载
- **Fast download** (`/fast_download/<md5>/<type>/<server>`)：需会员，非会员跳转到 `fast_download_not_member`
- **Slow download** (`/slow_download/<md5>/<type>/<server>`)：免费可用，页面内有直接下载链接
- 下载链接提取：在 slow download 页面的 `<main>` 中查找文本为 "Download now" 的 `<a>` 元素，其 `href` 为实际文件 URL
- 文件 URL 形如：`https://wbsg8v.xyz/d3/y/.../<filename>.epub`，可用 curl -L 直接下载
- 下载速度约 20KB/s，1.88MB 文件约需 1.5 分钟
- 下载服务器不支持断点续传（无 HTTP Range 支持），`curl -C -` 会报 exit code 33，必须从头下载

### 书籍详情页
- URL: `https://annas-archive.gl/md5/<md5hash>`
- `document.title` 格式：`<书名> - Anna's Archive`

## 已知陷阱

- 域名时效性：旧域名随时可能失效，每次访问前需确认当前域名
- 中文搜索无效：即使书名含中文（如"双语"），也必须用英文搜索
- DOM 顺序不可靠：不能假设 `<main>` 内的前 N 个 MD5 链接对应搜索结果的前 N 条
- CDP `innerText` 淹没：页面顶部语言列表+统计数据占 3000+ 字符，搜索结果文本需要 `indexOf("RESULTS")` 定位
- `document.querySelectorAll` 在 bash heredoc 中引号冲突：写 JS 到临时文件再 `curl -d @/tmp/file.js` 传递
