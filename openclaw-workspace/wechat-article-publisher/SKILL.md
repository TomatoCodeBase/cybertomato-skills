---
name: wechat-article-publisher
description: 微信公众号文章完整管理工具；支持提取文章并转换为 Markdown、创建草稿、发布文章、生成封面图片等全流程功能
---

# 微信公众号文章管理

## 任务目标
- 本 Skill 用于：微信公众号文章的完整管理流程
- 能力包含：
  - **智能创作**：基于参考文章改写、基于标题创作、直接发布
  - **提取转换**：从 mp.weixin.qq.com 链接提取文章并转换为 Markdown 格式
  - **创建草稿**：将内容创建为公众号草稿
  - **发布文章**：发布草稿到公众号
  - **生成封面**：自动生成文章封面图片（支持豆包/千问）
  - **素材管理**：上传图片等素材到微信服务器
- 触发条件：用户需要创作、提取、转换、发布或管理公众号文章
- **默认配置**：
  - 文章字数：1200-1500字（默认要求）
  - 配图数量：3张横屏图片（16:9）
  - 排版主题：根据文章内容自动选择
  - 写作风格：去 AI 化，详见 `HUMANIZE_GUIDE.md`

## 前置准备
- 凭证准备：
  - 微信公众号凭证：需要 AppID 和 AppSecret
    - 登录微信开发者平台 https://mp.weixin.qq.com
    - 进入"开发"→"基本配置"页面
    - 获取 AppID (开发者ID) 和 AppSecret (开发者密码)
    - 启用/重置AppSecret时需要管理员扫码验证
  - 图像生成API凭证（用于生成封面图片）：
    - **豆包（默认）**：需要 API Key
      - 访问火山引擎控制台 https://console.volc.com/iam/keylist
      - 获取 API Key
      - 确保账号已开通豆包图像生成服务权限
    - **千问（可选）**：需要 DashScope API Key
      - 访问阿里云控制台 https://dashscope.console.aliyun.com/
      - 获取 API Key
      - 设置环境变量 `DASHSCOPE_API_KEY`
- 依赖说明：
  - Python 脚本：无额外依赖
  - Node.js 转换器：需要安装依赖（首次使用时）
    ```bash
    cd reader && npm install
    ```
    - 访问火山引擎控制台 https://console.volc.com/iam/keylist
    - 获取 API Key
    - 确保账号已开通豆包图像生成服务权限
- 依赖说明：无额外Python依赖

## 操作步骤

### 流程 0：智能文章创作工作流（推荐）

当用户需要快速创作并发布文章时，使用智能工作流：

#### 🎯 工作流程控制

**两阶段发布流程：**
1. **预览阶段**：如果用户没有明确说"发布到草稿箱"，先输出文章内容供预览
2. **发布阶段**：用户确认后再发布到草稿箱

**示例对话：**
```
用户: 写一篇关于"AI提升工作效率"的文章
智能体: 
[输出文章内容]
---
📝 文章已生成！是否需要发布到草稿箱？

用户: 发布
智能体: 
✅ 正在发布到草稿箱...
✅ 完成！草稿已创建，media_id: xxx
```

**直接发布模式：**
```
用户: 写一篇关于"AI提升工作效率"的文章并发布到草稿箱
智能体: 
1. 搜索资料...
2. 创作文章...
3. 生成封面...
4. 上传到草稿箱...
✅ 完成！草稿已创建，media_id: xxx
```

#### 🖼️ 文章内插图片配置

**配图生成规则**：
- **仅生成文章**（预览模式）：不生成文中配图，只输出文字内容
- **发布到公众号**（发布模式）：必须生成文中配图，默认 3 张

**示例对话**：

**场景 1：仅生成文章（不生成配图）**
```
用户: 写一篇关于"AI提升工作效率"的文章
智能体:
1. 搜索资料并创作文章
2. 输出纯文字内容（不含配图）
---
📝 文章已生成！是否需要发布到草稿箱？
```

**场景 2：发布到公众号（必须生成配图）**
```
用户: 写一篇关于"AI提升工作效率"的文章并发布到草稿箱
智能体:
1. 搜索资料并创作文章
2. 生成 3 张文中配图（横屏 16:9）
3. 上传配图到公众号
4. 生成封面图
5. 创建草稿
✅ 完成！草稿已创建，media_id: xxx
```

**配图规则**：
- 配图数量：默认 3 张（可在 `.env` 中配置 `ARTICLE_IMAGE_COUNT`）
- 配图位置：在文章的主要段落结尾插入
- 图片方向：横屏（16:9 比例）
- 图片提示词：基于段落内容自动生成，后缀添加"16:9横屏构图"

#### 模式 1：基于参考文章改写

用户提供参考文章 URL，智能体自动完成：提取 → 改写 → 生成封面 → 创建草稿

**操作步骤：**
1. 提取参考文章内容（使用 `extract_to_markdown.py`）
2. 智能体改写文章内容
3. 生成封面图片（使用 `generate_cover.py`）
4. 上传封面到微信（使用 `upload_material.py`）
5. 创建草稿（使用 `create_draft.py`）

**示例对话：**
```
用户: 帮我改写这篇文章并发布到草稿箱：https://mp.weixin.qq.com/s/xxx
智能体: 
1. 提取原文内容...
2. 改写文章...
3. 生成封面...
4. 上传到草稿箱...
✅ 完成！草稿已创建，media_id: xxx
```

#### 模式 2：基于标题创作

用户提供标题，智能体自动完成：搜索资料 → 创作文章 → 生成封面 → 创建草稿

**操作步骤：**
1. 使用 `web_fetch` 搜索相关资料
2. 智能体基于资料创作文章
3. 生成封面图片
4. 上传封面到微信
5. 创建草稿

**示例对话：**
```
用户: 写一篇关于"AI如何提升工作效率"的文章并发布到草稿箱
智能体:
1. 搜索相关资料...
2. 创作文章...
3. 生成封面...
4. 上传到草稿箱...
✅ 完成！草稿已创建，media_id: xxx
```

#### 模式 3：直接发布

用户提供完整内容，智能体自动完成：生成封面 → 创建草稿

**操作步骤：**
1. 生成封面图片
2. 上传封面到微信
3. 创建草稿

**可选参数：**
- `--provider doubao|qwen` - 选择图像生成引擎
- `--author "作者名"` - 指定作者
- `--digest "摘要"` - 指定摘要
- `--no-cover` - 不生成封面

### 流程 A：提取文章并转换为 Markdown

当用户提供微信公众号文章链接，需要提取内容并转换为 Markdown 格式时：

1. **提取并转换文章**
   - 调用 `scripts/extract_to_markdown.py` 提取并转换文章
   - 参数说明：
     - `url`: 文章链接（必需，mp.weixin.qq.com）
     - `-o, --output`: 保存 Markdown 文件路径（可选）
     - `--json`: 输出 JSON 格式（可选）
   - 示例：
     ```bash
     # 输出 Markdown 到终端
     python3 scripts/extract_to_markdown.py "https://mp.weixin.qq.com/s?__biz=..."
     
     # 保存为文件
     python3 scripts/extract_to_markdown.py "https://mp.weixin.qq.com/s?__biz=..." -o article.md
     
     # 输出 JSON 格式（含元数据）
     python3 scripts/extract_to_markdown.py "https://mp.weixin.qq.com/s?__biz=..." --json
     ```
   - 返回数据包含：
     - 文章标题、作者、发布时间
     - Markdown 格式的内容
     - 封面图 URL、原文链接
     - 完整的 Markdown 文档（含元数据）

2. **后续处理**
   - 可以基于 Markdown 内容进行编辑、分析
   - 或转换回 HTML 后使用流程 B 发布

### 流程 B：发布带封面的文章到公众号

1. **生成文章内容**
   - 智能体根据主题创作文章标题、正文内容
   - 生成摘要和作者信息（可选）
   - 将正文内容转换为HTML格式
   - 参考 [references/article-format.md](references/article-format.md) 中的格式规范

2. **生成封面图片**
   - 智能体根据文章内容生成封面描述（prompt）
   - 调用 `scripts/generate_cover.py` 生成封面图片
   - 参数说明：
     - `--prompt`: 图片提示词，描述封面内容（必需）
     - `--provider`: 图像生成服务提供商（可选）
       - `doubao` - 豆包（默认）
       - `qwen` - 千问（通义万相）
     - `--size`: 图片尺寸（可选，仅千问支持）
       - `1664*928` - 16:9 横屏（默认）
       - `1024*1024` - 正方形
       - `720*1280` - 9:16 竖屏
       - `1280*720` - 16:9 横屏（小尺寸）
     - `--model`: 千问模型（可选，仅千问支持）
       - `qwen-image-2.0` - 标准版（默认）
       - `qwen-image-2.0-pro` - 专业版
   - 示例：
     ```bash
     # 使用豆包生成（默认）
     python3 scripts/generate_cover.py --prompt "科技风格插画"
     
     # 使用千问生成
     python3 scripts/generate_cover.py --prompt "科技风格插画" --provider qwen
     
     # 使用千问生成正方形封面
     python3 scripts/generate_cover.py --prompt "科技风格插画" --provider qwen --size "1024*1024"
     
     # 使用千问专业版模型
     python3 scripts/generate_cover.py --prompt "科技风格插画" --provider qwen --model qwen-image-2.0-pro
     ```
   - 脚本返回图片URL
   - 下载图片到本地临时文件
   - 调用 `scripts/upload_material.py` 上传图片到微信服务器
   - 参数说明：
     - `--app_id`: 微信公众号AppID（必需）
     - `--app_secret`: 微信公众号AppSecret（必需）
     - `--image_path`: 图片文件路径（必需）
   - 脚本返回 thumb_media_id

3. **创建文章草稿**
   - 调用 `scripts/create_draft.py` 创建草稿
   - 参数说明：
     - `--app_id`: 微信公众号AppID（必需）
     - `--app_secret`: 微信公众号AppSecret（必需）
     - `--title`: 文章标题（必需）
     - `--content`: 文章HTML内容（必需）
     - `--digest`: 文章摘要（可选）
     - `--author`: 作者名称（可选）
     - `--thumb_media_id`: 封面图片media_id（可选，从步骤2获取）
     - `--show_cover_pic`: 是否显示封面，默认为1（可选）
   - 脚本返回 media_id

4. **发布草稿到公众号**
   - 调用 `scripts/publish_draft.py` 发布草稿
   - 参数说明：
     - `--app_id`: 微信公众号AppID（必需）
     - `--app_secret`: 微信公众号AppSecret（必需）
     - `--media_id`: 草稿的media_id（必需）
   - 脚本返回 publish_id

5. **验证发布状态**
   - 根据 publish_id 查询发布状态
   - 确认文章是否成功发布

### 流程 C：发布无封面文章

如果不需要封面图片，可以跳过流程 B 的步骤2，直接执行步骤3创建草稿。

### 可选分支
- 当 **需要智能创作**：使用流程 0 的智能工作流（推荐）
- 当 **需要阅读文章**：使用流程 A 提取并转换为 Markdown
- 当 **需要预览文章**：先创建草稿但不发布，使用草稿预览功能
- 当 **需要发布多篇内容**：重复创建草稿和发布步骤，media_id可复用
- 当 **需要转载文章**：使用流程 0 模式 1（基于参考文章改写）

## 资源索引
- 核心脚本：
  - [scripts/create_article.py](scripts/create_article.py) - 晴能文章创作工作流（新增，支持多种模式）
  - [scripts/extract_to_markdown.py](scripts/extract_to_markdown.py) - 提取文章并转换为 Markdown（参数：url, -o 输出路径, --json）
  - [scripts/generate_cover.py](scripts/generate_cover.py) - 生成封面图片（参数：prompt, --provider, --size, --model）
  - [scripts/upload_material.py](scripts/upload_material.py) - 上传图片到微信（参数：app_id, app_secret, image_path）
  - [scripts/create_draft.py](scripts/create_draft.py) - 创建文章草稿（参数：app_id, app_secret, title, content, digest, author等）
  - [scripts/publish_draft.py](scripts/publish_draft.py) - 发布草稿到公众号（参数：app_id, app_secret, media_id）
- 转换器模块：
  - **[scripts/markdown_to_wechat_v2.py](scripts/markdown_to_wechat_v2.py)** - **推荐** Markdown 转微信公众号 HTML（微信兼容版 v2，修复代码块换行、缩进、双引号问题）
  - [scripts/markdown_to_wechat_clean.py](scripts/markdown_to_wechat_clean.py) - Markdown 转微信公众号 HTML（简洁大气版）
  - [reader/extract_and_convert.js](reader/extract_and_convert.js) - Node.js 提取与转换引擎（由 extract_to_markdown.py 调用）
- 领域参考：
  - [references/wechat-api.md](references/wechat-api.md) - 微信公众号API接口说明（获取access_token、创建草稿、发布接口、上传素材、错误码）
  - [references/article-format.md](references/article-format.md) - 文章HTML格式规范（支持的标签、样式、图片）

## 注意事项
- 文章内容必须符合微信公众号的HTML格式规范
- 封面图片建议尺寸900*383，大小不超过2MB
- app_id和app_secret必须正确，否则无法获取access_token
- 脚本会自动获取access_token，无需手动管理
- 生成封面图片需要豆包图像API凭证
- 发布操作不可逆，建议先创建草稿确认内容
- 注意API调用频率限制

## 使用示例

### 示例0：智能工作流 - 基于参考文章改写（推荐）
```
用户对话：
"帮我改写这篇文章并发布到草稿箱：https://mp.weixin.qq.com/s/xxx"

智能体执行流程：
1. 提取原文
   python3 scripts/extract_to_markdown.py "https://mp.weixin.qq.com/s/xxx" --json

2. 改写文章（智能体使用 AI 能力）
   - 分析原文内容
   - 生成新的标题和内容
   - 保持核心观点，改变表达方式

3. 生成封面
   python3 scripts/generate_cover.py --prompt "为文章《新标题》生成封面" --provider doubao

4. 下载并上传封面
   wget -O cover.jpg "封面URL"
   python3 scripts/upload_material.py --app_id xxx --app_secret xxx --image_path cover.jpg

5. 创建草稿
   python3 scripts/create_draft.py --app_id xxx --app_secret xxx \
     --title "新标题" --content "改写后的HTML内容" --thumb_media_id xxx

✅ 完成！草稿已创建
```

### 示例0.1：智能工作流 - 基于标题创作
```
用户对话：
"写一篇关于'AI如何提升工作效率'的文章并发布到草稿箱"

智能体执行流程：
1. 搜索相关资料
   使用 web_fetch 搜索相关文章和资料

2. 创作文章（智能体使用 AI 能力）
   - 分析搜索结果
   - 生成文章大纲
   - 撰写完整内容

3. 生成封面
   python3 scripts/generate_cover.py --prompt "AI提升工作效率主题插画" --provider qwen

4. 上传封面并创建草稿
   （同上）

✅ 完成！草稿已创建
```

### 示例1：提取文章并转换为 Markdown
```bash
# 提取并输出 Markdown 到终端
python3 scripts/extract_to_markdown.py "https://mp.weixin.qq.com/s?__biz=MzI..."

# 保存为文件
python3 scripts/extract_to_markdown.py "https://mp.weixin.qq.com/s?__biz=..." -o article.md

# 输出 JSON 格式（含完整元数据）
python3 scripts/extract_to_markdown.py "https://mp.weixin.qq.com/s?__biz=..." --json

# 输出示例：
# {
#   "title": "文章标题",
#   "author": "作者",
#   "publishTime": "2026/03/04 10:11:00",
#   "description": "文章摘要",
#   "cover": "https://封面图URL",
#   "link": "https://原文链接",
#   "content": "Markdown 内容...",
#   "fullMarkdown": "# 文章标题\n\n**作者**: ...\n\n..."
# }
```

### 示例1：发布简单的图文文章（无封面）
```bash
# 1. 生成文章内容（智能体完成）
title="如何使用Python处理数据"
content="<section><h2>Python数据处理基础</h2><p>Python提供了强大的数据处理库...</p></section>"

# 2. 创建草稿
python scripts/create_draft.py \
  --app_id "YOUR_APP_ID" \
  --app_secret "YOUR_APP_SECRET" \
  --title "$title" \
  --content "$content" \
  --author "技术团队"
# 输出: media_id="MEDIA_XXX"

# 3. 发布草稿
python scripts/publish_draft.py \
  --app_id "YOUR_APP_ID" \
  --app_secret "YOUR_APP_SECRET" \
  --media_id "MEDIA_XXX"
# 输出: publish_id="PUBLISH_YYY"
```

### 示例2：发布带自动生成封面的文章
```bash
# 1. 生成文章内容和封面描述（智能体完成）
title="产品更新公告"
content="<section><p>本次更新包含以下内容...</p></section>"
cover_prompt="现代科技风格的商业插画，展示产品更新概念，蓝色和紫色渐变背景，简洁专业的商务风格"

# 2. 生成封面图片
python scripts/generate_cover.py --prompt "$cover_prompt"
# 输出: {"success": true, "image_url": "https://...", "revised_prompt": "..."}

# 3. 下载图片（智能体执行）
wget -O cover.jpg "https://..."

# 4. 上传图片到微信
python scripts/upload_material.py \
  --app_id "YOUR_APP_ID" \
  --app_secret "YOUR_APP_SECRET" \
  --image_path "cover.jpg"
# 输出: {"thumb_media_id": "THUMB_XXX", ...}

# 5. 创建草稿（使用封面）
python scripts/create_draft.py \
  --app_id "YOUR_APP_ID" \
  --app_secret "YOUR_APP_SECRET" \
  --title "$title" \
  --content "$content" \
  --digest "产品v2.0版本重要更新" \
  --thumb_media_id "THUMB_XXX" \
  --show_cover_pic 1

# 6. 发布草稿
python scripts/publish_draft.py \
  --app_id "YOUR_APP_ID" \
  --app_secret "YOUR_APP_SECRET" \
  --media_id "MEDIA_YYY"
```

### 示例3：提取文章并重新发布（转载流程）
```bash
# 1. 提取文章并保存为 Markdown
python3 scripts/extract_to_markdown.py "https://mp.weixin.qq.com/s?__biz=..." -o article.md

# 2. 编辑 article.md（可选）

# 3. 将 Markdown 转换为 HTML（智能体完成）
# 使用 markdown 库或其他工具转换

# 4. 生成新封面
python3 scripts/generate_cover.py --prompt "科技风格插画"

# 5. 上传封面
python3 scripts/upload_material.py \
  --app_id "YOUR_APP_ID" \
  --app_secret "YOUR_APP_SECRET" \
  --image_path "cover.jpg"

# 6. 创建草稿
python3 scripts/create_draft.py \
  --app_id "YOUR_APP_ID" \
  --app_secret "YOUR_APP_SECRET" \
  --title "【转载】原文标题" \
  --content "<section>HTML内容</section>" \
  --thumb_media_id "THUMB_XXX"

# 7. 发布
python3 scripts/publish_draft.py \
  --app_id "YOUR_APP_ID" \
  --app_secret "YOUR_APP_SECRET" \
  --media_id "MEDIA_XXX"
```

### 示例4：批量发布文章
```bash
# 文章1
python scripts/create_draft.py \
  --app_id "YOUR_APP_ID" \
  --app_secret "YOUR_APP_SECRET" \
  --title "第一篇文章" \
  --content "..."
python scripts/publish_draft.py \
  --app_id "YOUR_APP_ID" \
  --app_secret "YOUR_APP_SECRET" \
  --media_id "MEDIA_001"

# 文章2
python scripts/create_draft.py \
  --app_id "YOUR_APP_ID" \
  --app_secret "YOUR_APP_SECRET" \
  --title "第二篇文章" \
  --content "..."
python scripts/publish_draft.py \
  --app_id "YOUR_APP_ID" \
  --app_secret "YOUR_APP_SECRET" \
  --media_id "MEDIA_002"
```
