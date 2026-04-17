---
name: doubao-image
description: 豆包SeeDream图片生成技能。通过火山引擎API生成高质量AI图片。触发词：生成图片、AI画图、豆包画图、生成图像、画一张图、AI绘图。
---

# 豆包图片生成

使用火山引擎豆包SeeDream模型生成AI图片。

## 快速使用

```bash
# 生成图片
node scripts/doubao-image.cjs "你的图片描述"
```

## 配额查询

火山引擎暂不支持API查询配额，请在控制台查看：
https://console.volcengine.com/ark

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| prompt | 图片描述文本 | 必填 |
| --size | 图片尺寸: 1024x1024, 2K, 4K | 2K |
| --no-watermark | 不添加水印 | 默认有水印 |
| --json | 输出完整JSON | 关闭 |
| -f <file> | 从文件读取prompt | - |

## 使用示例

**基础用法**：
```bash
node scripts/doubao-image.cjs "一只可爱的猫咪在阳光下打盹"
```

**从文件读取长prompt**：
```bash
node scripts/doubao-image.cjs -f prompt.txt
```

**指定尺寸和无水印**：
```bash
node scripts/doubao-image.cjs "星空下的城市" --size 4K --no-watermark
```

## 输出

- 成功时返回图片URL（24小时有效）
- 使用 `--json` 可获取完整响应数据
