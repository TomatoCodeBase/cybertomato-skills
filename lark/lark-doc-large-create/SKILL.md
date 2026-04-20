---
name: lark-doc-large-create
version: 1.0.0
description: "飞书文档大内容创建策略：当文档含大量图片或长 Markdown 时，避免异步任务卡死，采用「先建空文档 → 再 overwrite」的两步法。"
---

# 飞书大文档创建策略

## 问题

`lark-cli docs +create --markdown <长内容>` 在内容较长或包含多张图片时，可能返回异步任务：

```json
{
  "ok": true,
  "data": {
    "status": "running",
    "task_id": "xxx",
    "message": "Task is processing in the background..."
  }
}
```

**无法轮询结果**：
- `+create` 没有 `--task-id` 参数
- `drive +task_result` 仅适用于 drive import/export，不适用 docs 创建
- 没有 `lark-cli tasks` 命令

## 解决方案：两步法

### 第 1 步：创建空文档（同步，立即返回 doc_id）

```bash
lark-cli docs +create --title "文档标题" --markdown "占位内容" --as user
```

返回结果包含 `doc_id` 和 `doc_url`，同步完成。

### 第 2 步：用 overwrite 写入完整内容

```bash
lark-cli docs +update --doc "<doc_id>" --mode overwrite --markdown @content.md --as user
```

使用 `@file` 从文件读取 Markdown（避免 shell 转义问题），overwrite 会清空后重写。

## 注意事项

1. **`@file` 路径**：必须是相对路径，不能是绝对路径。先 `cd` 到文件所在目录再执行：
   ```bash
   cd /tmp && lark-cli docs +update --doc "xxx" --mode overwrite --markdown @content.md --as user
   ```

2. **图片下载失败**：外部图床 URL 可能无法被飞书服务器访问，会返回 warning：
   ```json
   {"warnings": ["[WARNING:IMAGE_DOWNLOAD_FAILED] Image download failed: https://..."]}
   ```
   文档仍会创建成功，只是该图片缺失。后续可用 `replace_all` 重试，或手动在飞书中插入。

3. **overwrite 风险**：overwrite 会清空文档再重写。如果文档已有评论、协作历史等不可重建内容，慎用。对于新建文档无此顾虑。

4. **分段追加**：内容特别长时，可用 `--mode append` 分段写入，降低超时风险。

## 适用场景

- Markdown 内容超过 ~3000 字符
- 包含 3 张以上外部图片
- 需要确保同步返回 doc_id（如自动化脚本）
