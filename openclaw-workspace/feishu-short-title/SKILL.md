---
name: feishu-short-title
description: 读取飞书文档内容，按分类生成3个4-10字短标题建议。触发词：项目标题。
when_to_use: 项目标题
version: 3.1.0
---

# 飞书短标题 (feishu-short-title)

## 触发词
项目标题

## 前置条件
- 用户输入飞书文档链接或doc_token
- 飞书文档可读

## 流程

### Step 1: 解析输入
从用户消息中提取飞书文档标识：
- 飞书文档URL格式：`https://xxx.feishu.cn/docx/{token}` → 提取token
- 直接输入token → 直接使用
- 其他链接格式尝试解析

**Success criteria**: 成功提取doc_token，长度>0

### Step 2: 读取文档内容
使用飞书文档工具读取内容：
- 调用 `feishu_doc` action=read，doc_token=提取的token
- 如果读取失败，提示用户提供有效链接

**Success criteria**: 文档内容长度>0

### Step 3: 分析主题并动态提取分类
从文档内容中提取核心信息，动态生成分类（不硬编码）：

**分类提取规则**：
1. 扫描文档中的技术领域关键词、工具名、应用场景
2. 将相关内容聚类，每个聚类即为一个分类
3. 分类命名：2-4字，格式为「领域+形态」，如 AI文字、AI绘画、AI视频
4. 非AI内容同理：如「私域运营」「跨境电商」「家庭教育」
5. 1个文档通常匹配1-3个分类，不硬凑

**常见分类参考**（仅参考，以文档实际内容为准）：
- AI领域：AI文字、AI绘画、AI视频、AI语音、AI编程、AI数据
- 非AI领域：从内容中提炼，如职场成长、亲子教育、理财投资等

**提取要素**：
- 核心主题（1-2个关键词）
- 目标用户/受众
- 核心价值/卖点
- 调性（专业/轻松/科技/商业）

**Success criteria**: 提取至少1个贴合内容的分类，不生搬硬套

### Step 4: 按分类生成3个标题
基于分析结果，在每个匹配的分类下生成3个最优标题：

**标题规则**：
- 长度：4-10个汉字
- 分隔符：可用 `丨`（如：`AI赋能丨效率倍增`）
- 风格：简洁、有力、好记
- 每个分类下3个标题角度不重复（功能向/价值向/场景向中选3）

**Success criteria**: 每个分类3个标题，每个4-10字

### Step 5: 应用标题（重命名文档）

当用户确认标题后，需要将新标题写入飞书文档。

**⚠️ 关键安全规则：只能用 append 模式 + 空内容 + --new-title，绝对禁止用 overwrite 模式！**

```bash
# ✅ 正确方式：append + 空 markdown + new-title（只改标题，不碰正文）
echo "" | lark-cli docs +update --doc {obj_token} --new-title "新标题" --mode append --markdown -

# ❌ 致命错误：overwrite 模式会清空整个文档正文！
echo "xxx" | lark-cli docs +update --doc {obj_token} --new-title "新标题" --mode overwrite --markdown -
```

**注意**：
- `--doc` 使用的是 `obj_token`（实际文档token），不是 `node_token`（知识库节点token）
- wiki 节点的 `node_token` 和 `obj_token` 不同，需先通过 `wiki spaces get_node` 获取 `obj_token`
- `lark-cli api PATCH "/open-apis/wiki/v2/spaces/{space_id}/nodes/{node_token}"` 此 API **不存在**（404），无法直接改 wiki 节点标题
- append + 空 markdown 会在文档末尾追加一个空行（副作用极小），同时更新标题

**批量重命名流程**（知识库多文档）：
1. 用 `wiki nodes list --page-all` 获取所有节点（含 node_token、obj_token、title）
2. 对每个文档用 `docs +fetch --doc {obj_token}` 读取内容
3. 按 Step 3-4 生成短标题
4. 用 `echo "" | lark-cli docs +update --doc {obj_token} --new-title "短标题" --mode append --markdown -` 逐一改名

### Step 6: 输出并推荐
按固定格式输出，推荐最佳1个：

```
📝 项目标题建议

【AI文字】
01. 标题一（功能向）
02. 标题二（价值向）
03. 标题三（场景向）

【AI绘画】
01. 标题一（功能向）
02. 标题二（价值向）
03. 标题三（场景向）

推荐：[最佳选项] — 理由：[一句话]
```

仅输出文档匹配到的分类，不输出无关分类。

**Success criteria**: 格式完整，推荐项在生成标题之中

---

## 已知陷阱
1. **doc_token解析**：飞书链接有docx/wiki/sheet多种格式，doc_token位置不同，需正则灵活匹配
2. **权限问题**：文档可能是私有的，需要grant_to_requester=true
3. **空文档**：文档存在但内容为空时，提示用户而非强行生成
4. **全匹配触发**：触发词「项目标题」必须完全匹配，避免「标题」等词误触发
5. **分类边界模糊**：跨领域项目可归多个分类，不要硬塞一个
6. **分类不硬编码**：参考分类只是提示，文档内容不在参考范围内时，从内容中提炼新分类名，宁可自造一个贴切的也不要硬套
7. **🚨 overwrite 模式会清空正文**：`docs +update --mode overwrite` 会用 markdown 参数的内容完全替换文档正文。改名时必须用 `--mode append --markdown ""` + `--new-title`，绝不可用 overwrite。曾因此误删一篇完整文档正文（"短视频带货丨从0到40万"），需用户在飞书 Web 端通过版本历史手动恢复。
8. **node_token ≠ obj_token**：wiki 知识库中，`node_token` 是节点标识，`obj_token` 才是实际文档标识。`docs +update --doc` 需要用 `obj_token`，不是 `node_token`。
9. **wiki PATCH API 不存在**：`PATCH /open-apis/wiki/v2/spaces/{space_id}/nodes/{node_token}` 返回 404，无法直接修改 wiki 节点标题。只能通过 `docs +update --new-title` 间接修改。
10. **Git Bash URL 路径污染**：在 Git Bash 中 `lark-cli api PATCH /open-apis/...` 会被转为 Windows 路径（如 `/open-apis/C:/Program Files/Git/...`）。需设置 `MSYS_NO_PATHCONV=1` 环境变量规避。
11. **🚨 Windows换行符污染标题**：从TSV/文本文件读取标题时，Git Bash 可能保留 `\r`，导致飞书标题末尾带有不可见的回车符。必须在读取时 `tr -d '\r\n'` 清理，否则标题看起来正常实际有脏字符，需二次修复重命名。
12. **批量重命名用TSV文件**：将 `obj_token|新标题` 写入TSV文件再循环读取，比heredoc内联数据更可靠——方便预先复核、出错可重跑、避免shell转义问题。