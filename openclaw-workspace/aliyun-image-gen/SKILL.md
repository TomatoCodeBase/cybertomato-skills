---
name: aliyun-image-gen
description: 阿里云百炼AI图片生成（Qwen-Image）。支持高质量图片生成，适合需要创意图片、封面图、配图等场景。触发词：阿里云图片、通义万相、百炼图片、qwen-image。When user wants to generate images using Alibaba Cloud Bailian AI, create illustrations, cover images, or any AI-generated artwork.
---

# 阿里云百炼图片生成技能

生成高质量AI图片，基于阿里云通义万相模型。

## 前置条件

**需要API Key**：在阿里云百炼控制台获取
- 控制台：https://bailian.console.aliyun.com/
- 模型市场：qwen-image-2.0

## 快速使用

```bash
# 基础调用（OpenAI兼容格式）
curl -X POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "wanx-v1",
    "input": {
      "prompt": "你的图片描述"
    },
    "parameters": {
      "size": "1024*1024",
      "n": 1
    }
  }'
```

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `prompt` | 图片描述（中文效果更好） | 必填 |
| `size` | 图片尺寸：`512*512` / `1024*1024` | `1024*1024` |
| `n` | 生成数量（1-4） | `1` |
| `style` | 风格：`<auto>` / `<3d cartoon>` / `<anime>` / `<oil painting>` 等 | `<auto>` |

## Prompt 技巧

### 好的Prompt结构
```
[主体] + [动作/状态] + [环境/背景] + [风格] + [细节]
```

### 示例
```
一只可爱的橘猫，坐在窗台上看雨，
温暖的室内灯光，窗外是城市夜景，
治愈系插画风格，柔和的光影，
细腻的毛发质感，温馨氛围
```

### 常用风格关键词
- **艺术风格**: `油画` `水彩` `素描` `动漫` `写实`
- **光影效果**: `柔和光线` `逆光` `电影级光效` `黄金时刻`
- **氛围**: `温馨` `梦幻` `科技感` `赛博朋克` `末日感`
- **视角**: `俯视` `仰视` `平视` `广角` `特写`

## 使用脚本（推荐）

```bash
# 使用封装脚本
python scripts/aliyun-gen.py "你的图片描述" --api-key YOUR_API_KEY

# 指定尺寸
python scripts/aliyun-gen.py "描述" --size 512*512 --api-key YOUR_API_KEY

# 生成多张
python scripts/aliyun-gen.py "描述" --n 4 --api-key YOUR_API_KEY

# 指定风格
python scripts/aliyun-gen.py "描述" --style "<anime>" --api-key YOUR_API_KEY
```

## 注意事项

1. **API Key**: 需要在阿里云百炼控制台获取
2. **费用**: 按调用次数计费
3. **限制**: 单次最多生成4张图片
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

1. **Prompt长度**: 建议20-100字，效果最佳
2. **风格明确**: 使用 `--style` 参数指定风格
3. **保存图片**: URL有效期内及时下载
4. **迭代优化**: 不满意可调整关键词重试

## 配置API Key

**方法1：命令行参数**
```bash
python scripts/aliyun-gen.py "描述" --api-key YOUR_API_KEY
```

**方法2：环境变量**
```bash
export ALIYUN_API_KEY="YOUR_API_KEY"
python scripts/aliyun-gen.py "描述"
```

**方法3：修改脚本**
```python
# 在脚本中直接设置
API_KEY = "YOUR_API_KEY"
```

## 相关链接

- 控制台：https://bailian.console.aliyun.com/
- 文档：https://help.aliyun.com/zh/model-studio/
- 模型市场：https://bailian.console.aliyun.com/cn-beijing/?tab=model#/model-market
