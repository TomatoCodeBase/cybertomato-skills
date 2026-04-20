---
name: using-coze-cli
description: 指导 AI Agent 使用 Coze CLI (`coze`) 完成认证、组织与空间切换、项目开发部署、媒体生成和文件上传。Use when the user asks to use Coze CLI, `coze generate`, `coze code`, `coze file upload`, preview, deploy, or wants an online link for generated files.
---

# Coze CLI 使用技能与避坑指南

## 适用场景
- 用户明确要求"用 Coze CLI"或"用 `coze` 命令"完成任务。
- 需要使用 `coze generate` 生成音频、图片或视频。
- 需要把本地生成文件上传后，将在线可访问链接返回给用户。
- 需要创建 Coze 项目、发送 `message`、查询状态、部署、获取 preview。

## 必须遵守的执行原则

### 1. 用户明确指定 Coze CLI 时，禁止私自改用别的能力
- 如果用户明确要求"用 Coze CLI 生成语音/图片/视频"，就必须优先把 Coze CLI 路径跑通。
- **禁止**在未充分排查 Coze CLI 正确用法前，擅自改用 OpenClaw、自带 TTS、第三方生成接口或 Web 页面手工下载流程。
- 只有在 Coze CLI 明确报错、能力缺失，且已经向用户解释并获得同意时，才允许退回到其他方案。

### 2. 优先使用 `--format json`
- 需要结构化解析结果时，优先增加 `--format json`。
- 注意：`coze code message send --format json` 可能输出 NDJSON 事件流，必须按行解析，不能直接整段 `JSON.parse()`。

### 3. 对用户交付文件时，必须返回在线链接，不要返回本地路径
- 本地路径如 `/tmp/foo.mp3`、`./output/image.png`、相对路径或沙箱路径，对用户不可直接访问。
- 生成文件后，**必须**继续执行 `coze file upload <path>`。
- 最终返回给用户的应是上传后的在线 `URL`，而不是本地文件路径。

## 安装 CLI

```bash
npm install -g @coze/cli
```

如果找不到包，可执行：

```bash
npm config set registry https://registry.npmjs.org/
```

## 常见能力概览

### 身份与上下文
- `coze auth`: 登录、退出、查看状态。
- `coze organization`: 列出组织并切换默认组织。
- `coze space`: 列出空间并切换默认空间。

### 项目与开发
- `coze code project`: 创建、查询、列出、删除项目。
- `coze code message`: 向项目发送需求、查询状态、取消任务。
- `coze code preview`: 获取沙盒预览链接。
- `coze code deploy`: 部署到生产环境并查询部署状态。

### 媒体与文件
- `coze generate image`: 生成图片。
- `coze generate audio`: 生成语音。
- `coze generate video create`: 创建视频生成任务。
- `coze generate video status`: 查询视频生成任务状态。
- `coze file upload`: 上传本地文件并换取在线访问地址。

## 音频生成专项规则

### 核心结论
- 对 `coze generate audio`，**不要只执行裸命令**：

```bash
coze generate audio "你好"
```

- 只跑裸命令时，CLI 可能只返回请求信息或任务参数，**不一定会把音频文件保存到本地**，从而导致 agent 误判为"还需要额外下载步骤"。
- **正确做法**：始终带 `--output-path`。

### 关于 `--output-path`
- `--output-path` 应理解为**保存目录**，不是你最终要返回给用户的在线地址。
- CLI 会在该目录下自动写入生成后的媒体文件名。
- 最稳妥的做法是先创建一个空目录，再把该目录传给 `--output-path`。

### 标准语音生成工作流
1. 创建输出目录。
2. 用 `coze generate audio` 生成到该目录。
3. 在目录里定位新生成的音频文件。
4. 用 `coze file upload` 上传该音频文件。
5. 把上传后得到的在线链接发给用户。

### 推荐命令模板

```bash
mkdir -p /tmp/coze-audio
coze generate audio "这里放要合成的文本" \
  --output-path /tmp/coze-audio \
  --format json
```

如需指定发音人或音频编码，可继续补充参数，例如：

```bash
coze generate audio "这里放要合成的文本" \
  --output-path /tmp/coze-audio \
  --speaker zh_female_xiaohe_uranus_bigtts \
  --audio-format mp3 \
  --sample-rate 24000
```

### 生成后必须继续上传

```bash
coze file upload /tmp/coze-audio/<generated-file>.mp3 --format json
```

### 对用户的交付要求
- 不要只说"已经生成成功"。
- 不要只发本地文件路径。
- 必须把 `coze file upload` 返回的在线链接发给用户。
- 如果返回结构里同时有 `uri` 和 `url`，优先把 `url` 发给用户；`uri` 仅作为内部标识保留。

## 媒体文件交付规则

### 统一交付闭环
- 只要通过 `coze generate` 产出了本地文件，就进入固定闭环：
  `生成本地文件 -> 上传文件 -> 返回在线链接`
- 该规则适用于音频、图片、视频，不只适用于语音。

### 文件上传优先级
- 给用户交付文件时，优先使用 `coze file upload`。
- 不要让用户自己从本地路径、临时目录或沙箱路径取文件。
- 不要把"对象存储链接需要额外步骤"当作默认结论；应先实际执行 `coze file upload`。

## 登录与身份验证

### 避坑：OAuth 授权超时与阻塞问题
- `coze auth login` 的 OAuth 激活链接和设备码通常输出在 `stderr`，需要合并捕获。
- **致命问题**：设备码只有 5 分钟有效期，且命令会前台阻塞等待。如果 Agent 同步等待该命令执行，可能会卡死流程，且用户往往来不及操作。
- **正确做法**：必须将该命令置于后台执行（例如使用 `exec` 工具的 `background: true` 参数，或 bash 的 `&`），并**立即**把获取到的授权链接和设备码（Code）发给用户。
- **提效技巧**：为了让用户体验更好，可以直接将提取到的 Code 拼接到授权链接中发给用户，免去手动输入。例如 Code 为 `ABC-DEF-GHI`，直接返回链接：`https://www.coze.cn/oauth/device-activation?user_code=ABC-DEF-GHI`。

```bash
# 示例：后台执行命令并捕获输出
coze auth login 2>&1 &
```

- 如果提示 `[Auth] No API token found`，先执行：

```bash
coze auth status
```

## 组织与空间上下文
- 如果遇到 `No permission`，通常是组织或空间上下文不对。
- 修正顺序：
  1. `coze config list`
  2. `coze organization list`
  3. `coze space list`
  4. `coze organization use <org_id>`
  5. `coze space use <space_id>`

## 标准 Coze Coding 工作流

### 使用 `@` 语法引用本地文件
- 在 `coze code message send` 中，可直接用 `@文件路径` 引用本地文件，CLI 会自动上传并作为附件发送。
- **示例**：
  ```bash
  coze code message send "请使用这张图片作为头像 @./avatar.png" -p <project-id>
  coze code message send "对比 @src/old.ts 和 @src/new.ts 的差异" -p <project-id>
  ```

### Step 1: 创建或获取项目

```bash
coze code project create [相关参数]
```

记录返回的 `projectId`。

### Step 2: 发送需求

```bash
coze code message send "请优化应用配色..." \
  --project-id <project-id> \
  --format json
```

### Step 3: 部署前先查状态
- 收到"部署"要求时，**必须**先确认 `message status` 已结束。
- 状态为 `processing` 时禁止直接部署，否则可能出现 `refs/heads/main does not exist` 等错误。

```bash
coze code message status --project-id <project-id> --format json
```

### Step 4: 部署
- `deploy` 直接接收项目 ID，**不要**加 `--project-id`。

```bash
coze code deploy <project-id> --format json
```

### Step 5: 查询部署结果

```bash
coze code deploy status <project-id> --format json
```

- 直到 `status` 为 `Succeeded`，再把线上地址返回给用户。

## 长耗时任务处理
- 对 `coze code project create`、`coze code deploy`、媒体生成等长耗时任务，优先采用主动轮询。
- 不能只把结果留在本地日志里等待用户追问。
- 到达终态后，必须主动把最终结果或错误信息反馈给用户。

## 常用命令速查

```bash
# 检查登录状态
coze auth status

# 后台执行登录（捕获 stderr 并防止阻塞）
coze auth login 2>&1 &

# 切换上下文
coze organization use <org_id>
coze space use <space_id>

# 发送项目需求
coze code message send "你的开发需求" --project-id <project_id> --format json

# 查询项目任务状态
coze code message status --project-id <project_id> --format json

# 获取预览链接
coze code preview <project_id>

# 生成语音到目录
coze generate audio "你好" --output-path /tmp/coze-audio --format json

# 上传生成后的文件并拿在线链接
coze file upload /tmp/coze-audio/<generated-file>.mp3 --format json
```

## 典型错误与修正

### 错误 1：用户要求用 Coze CLI，但 agent 改用别的 TTS
- 问题：偏离用户指令，且掩盖了 Coze CLI 实际可用路径。
- 修正：先补上 `--output-path`，完整跑完 Coze CLI 生成与上传闭环。

### 错误 2：把 `coze generate audio` 的请求信息误判为最终结果
- 问题：只拿到了请求元数据，没有拿到用户可访问的音频文件。
- 修正：给命令增加 `--output-path`，然后检查输出目录中的生成文件。

### 错误 3：把本地路径发给用户
- 问题：`/tmp/...` 只能本机访问，用户无法直接打开。
- 修正：始终执行 `coze file upload`，把上传后的在线 `URL` 发给用户。

### 错误 4：误把 `--output-path` 当成最终文件名
- 问题：CLI 帮助说明其语义更接近保存目录。
- 修正：优先传入目录路径，并在生成后从目录中定位实际文件名。

### 错误 5：OAuth 登录卡死或用户来不及授权
- 问题：直接执行 `coze auth login` 会导致 Agent 挂起，且 Code 有 5 分钟过期时间。
- 修正：将命令放入后台执行，并第一时间把包含 `?user_code=...` 的激活链接回复给用户。
