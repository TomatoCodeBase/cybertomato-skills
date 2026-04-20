---
name: ziliu-publisher
description: 字流多平台内容发布工具。推送文章到字流草稿箱、上传封面图、获取预览链接。触发词：推字流、发字流、字流草稿、ziliu。
---

# 字流发布工具

将文章推送到字流（ziliu.online）草稿箱，支持多平台一键分发。

## 配置

- **API Key**: `YOUR_ZILIU_API_KEY`
- **Base URL**: `https://ziliu.online/api`
- **认证头**: `Authorization: Bearer <key>`

## API Endpoints

| 操作 | 方法 | 路径 |
|------|------|------|
| 创建文章 | POST | `/api/articles` |
| 获取文章(预览) | GET | `/api/articles/:id?format=inline` |
| 上传图片 | POST | `/api/upload` |
| 上传视频 | POST | `/api/upload-video` |

## 工作流

### 推送文章

用户说「推字流」时：

1. **确认内容来源**：
   - 对话中直接有文章 → 用对话内容
   - 用户给文件路径 → 读取文件
   - 无内容 → 提示用户先提供文章

2. **提取标题和正文**，调用创建文章API：
   ```bash
   curl -s -X POST https://ziliu.online/api/articles \
     -H "Authorization: Bearer YOUR_ZILIU_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"title":"标题","content":"正文","status":"draft"}'
   ```

3. **返回结果**：
   - 成功：告知文章ID + 提供预览链接
   - 失败：展示错误信息

### 上传封面图

```bash
curl -s -X POST https://ziliu.online/api/upload \
  -H "Authorization: Bearer YOUR_ZILIU_API_KEY" \
  -F "file=@/path/to/image.jpg"
```

### 获取预览

```
GET https://ziliu.online/api/articles/{ARTICLE_ID}?format=inline
```

## 注意事项

- `content` 字段传 Markdown
- `status` 固定为 `draft`（草稿），人工在字流后台确认发布
- 超过500字的内容用文件传递，不要在命令行硬编码
