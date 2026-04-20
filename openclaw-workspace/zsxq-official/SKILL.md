---
name: zsxq-official
description: 知识星球官方 CLI Skill 参考文档（zsxq-cli）。当前仅支持 macOS/Linux（Go 二进制），Windows 暂不可用。作为 API 参考和未来 Windows 支持后的备用通道。触发词：官方星球、zsxq官方、zsxq-cli
version: 1.0.0
---

# 知识星球官方 CLI Skill（参考用）

## 当前状态

**Windows 不可用**。zsxq-cli 是 Go 编译的原生二进制，仅支持 darwin-arm64/darwin-x64/linux-x64/linux-arm64。
本 skill 作为 API 文档和官方能力的参考存档。

## 安装的官方 Skill

| Skill | 路径 | 说明 |
|-------|------|------|
| zsxq-shared | skills/zsxq-shared/ | 认证登录、诊断配置、安全规则 |
| zsxq-group | skills/zsxq-group/ | 列出星球、浏览主题、查询标签 |
| zsxq-topic | skills/zsxq-topic/ | 搜索、详情、发布、评论、回答、精华、标签 |
| zsxq-note | skills/zsxq-note/ | 个人笔记创建和查看 |
| zsxq-user | skills/zsxq-user/ | 账号信息、跨星球足迹 |

## 官方 API 能力（可通过 api raw 调用）

```bash
zsxq-cli api list                              # 列出所有 MCP 工具
zsxq-cli api call <tool> --params '<json>'     # 调用工具
zsxq-cli api raw --method GET --path /v2/...   # 直接 HTTP
```

### 关键 API 工具

| 工具 | 参数 | 说明 |
|------|------|------|
| get_self_info | {} | 当前用户信息 |
| search_groups | keyword | 搜索星球 |
| search_group_members | group_id, keyword, limit | 搜索成员 |
| get_hashtag_topics | hashtag_id, limit, end_time | 按标签浏览主题 |
| get_topic_comments | topic_id, limit, index | 评论列表（分页） |
| set_topic_digested | topic_id, digested | 设置精华 |
| set_topic_tags | topic_id, titles | 设置标签 |
| get_self_question_topics | topic_filter, count, end_time | 自己的提问 |
| get_user_footprints | user_id, group_id | 用户足迹 |

## 官方 vs 现有 Skill 对比

| 维度 | 官方 zsxq-cli | zsxq-auto + zsxq-publish |
|------|--------------|-------------------------|
| 认证 | OAuth 2.0 + Keychain | CDP 借 Chrome cookie |
| 平台 | macOS/Linux | Windows/MINGW64 |
| 发布 | 纯文本 --content | HTML 富文本 + 图片 |
| 采集 | +topics +search（分页） | sync XHR 直调 API |
| 搜索 | RAG 全文搜索 | 模糊关键词 |
| 飞书 | 无 | 完整 pipeline |

## Windows 适配进度

- [ ] 等官方发布 Windows 二进制（或 WASM）
- [ ] 或通过 WSL 运行
- [ ] 或提取 OAuth token 用于 curl 直接调 API
