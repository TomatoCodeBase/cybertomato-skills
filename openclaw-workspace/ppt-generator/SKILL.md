---
name: ppt-generator
description: >
  Generate professional PPT presentations using python-pptx (纯本地，无外部API).
  默认使用小七姐风格：黑白交替 + 橙色强调 + 极简扁平。
  触发词：做PPT、生成PPT、PPT、演示文稿、幻灯片、slides。
  输入：主题 + 内容大纲 → 输出：.pptx 文件并自动打开。
---

# PPT Generator

Generate PPT files via python-pptx. No external API, no internet required.

## Workflow

1. Collect topic, page count, content outline from user
2. Pick style — default: 小七姐 style (see `references/color-palettes.md`)
3. Generate python-pptx script based on `references/slide-templates.md`
4. Execute script, output to `~/workspace/output/{filename}.pptx`
5. Open file for user preview

## Available Scripts

- `scripts/generate.py` — 示例生成脚本（小七姐风格），可参考修改

## Key python-pptx Patterns

```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# Setup
prs = Presentation()
prs.slide_width =Inches(13.333)  # 16:9
prs.slide_height=Inches(7.5)

# Background
bg =slide.background.fill
bg.solid()
bg.fore_color.rgb=RGBColor(0x00,0x00,0x00)

# Text
txBox=slide.shapes.add_textbox(Inches(0.5),Inches(1),Inches(10),Inches(1))
tf=txBox.text_frame
tf.word_wrap=True
p=tf.paragraphs[0]
p.text="Title"
p.font.size=Pt(36)
p.font.color.rgb=RGBColor(0xFF,0xFF,0xFF)
p.font.bold=True
p.font.name='Microsoft YaHei'

# Rounded card
shape=slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,Inches(1),Inches(3),Inches(3),Inches(2))
shape.fill.solid()
shape.fill.fore_color.rgb=RGBColor(0x18,0x18,0x18)
shape.line.fill.background()  # no border

# Accent line
line=slide.shapes.add_shape(MSO_SHAPE.RECTANGLE,Inches(0.5),Inches(2),Inches(1.5),Pt(3))
line.fill.solid()
line.fill.fore_color.rgb=RGBColor(0xE8,0x68,0x00)
line.line.fill.background()

prs.save("output.pptx")
```

## 小七姐风格规则

- 黑白底交替（奇数页黑底，偶数页白底）
- 强调色：橙色 `#E86800`
- 页面左上角编号（01/02/03...）
- 标题下橙色装饰线（1.5in宽，3pt粗）
- 底部右页码，左品牌标识
- 卡片：圆角矩形，无阴影
- 大量留白

## Privacy

- **NEVER** include API keys, tokens, or or secrets
- python-pptx only — no network calls
- All output stays local
