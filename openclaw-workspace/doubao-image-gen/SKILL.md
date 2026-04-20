---
name: doubao-image-gen
description: 豆包AI图片生成。支持高质量图片生成，适合需要创意图片、封面图、配图等场景。触发词：生成图片、画图、AI绘图、豆包图片、图片生成。When user wants to generate images using Doubao AI, create illustrations, cover images, or any AI-generated artwork.
---

# 豆包图片生成技能

生成高质量AI图片，基于豆包 Seedream 模型。

## 快速使用

```bash
# 基础调用
curl -X POST https://ark.cn-beijing.volces.com/api/v3/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 22bd3215-baa4-4ab2-872b-a7e2e79d5603" \
  -d '{
    "model": "doubao-seedream-4-5-251128",
    "prompt": "你的图片描述",
    "sequential_image_generation": "disabled",
    "response_format": "url",
    "size": "2K",
    "stream": false,
    "watermark": true
  }'
```

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `prompt` | 图片描述（中文效果更好） | 必填 |
| `size` | 图片尺寸：`1K` / `2K` | `2K` |
| `watermark` | 是否添加水印 | `true` |
| `response_format` | 返回格式：`url` / `b64_json` | `url` |
| `stream` | 是否流式返回 | `false` |

## Prompt 技巧

### 好的Prompt结构
```
[主题] + [场景/环境] + [风格] + [技术细节] + [氛围]
```

### 示例
```
星际穿越，黑洞，黑洞里冲出一辆快支离破碎的复古列车，
抢视觉冲击力，电影大片，末日既视感，动感，对比色，
oc 渲染，光线追踪，动态模糊，景深，超现实主义，
深蓝，画面通过细腻的丰富的色彩层次塑造主体与场景，
质感真实，暗黑风背景的光影效果营造出氛围，
整体兼具艺术幻想感，夸张的广角透视效果，
耀光，反射，极致的光影，强引力，吞噬
```

### 常用风格关键词
- **渲染**: `oc 渲染` `光线追踪` `8K` `超高清`
- **风格**: `电影大片` `赛博朋克` `超现实主义` `极简主义`
- **氛围**: `末日感` `科技感` `梦幻` `暗黑风`
- **视角**: `广角透视` `景深` `动态模糊`

## 使用脚本（推荐）

```bash
# 使用封装脚本
python scripts/doubao-gen.py "你的图片描述"

# 指定尺寸
python scripts/doubao-gen.py "描述" --size 1K

# 不加水印
python scripts/doubao-gen.py "描述" --no-watermark
```

## 注意事项

1. **API Key**: 已内置，无需额外配置
2. **费用**: 按调用次数计费
3. **限制**: 单次生成一张图片
4. **时效**: 返回的URL有效期为24小时
5. **推荐**: 中文Prompt效果更好

## 错误处理

```python
# 常见错误码
400 - 参数错误（检查prompt是否为空）
401 - 认证失败（检查API Key）
429 - 请求过快（稍后重试）
500 - 服务器错误（联系客服）
```

## 最佳实践

1. **Prompt长度**: 建议50-200字，效果最佳
2. **分步生成**: 复杂场景可拆分多次生成
3. **保存图片**: URL有效期内及时下载
4. **迭代优化**: 不满意可调整关键词重试
