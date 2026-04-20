# Excalidraw Diagrams

Excalidraw files are JSON with `.excalidraw` extension.

## Element Types

### Rectangle
```json
{
  "type": "rectangle",
  "x": 0,
  "y": 0,
  "width": 160,
  "height": 60,
  "angle": 0,
  "strokeColor": "#1971c2",
  "backgroundColor": "#a5d8ff",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "roundness": { "type": 3 }
}
```

### Ellipse
```json
{
  "type": "ellipse",
  "x": 0,
  "y": 0,
  "width": 120,
  "height": 80,
  "strokeColor": "#e67700",
  "backgroundColor": "#ffec99"
}
```

### Diamond
```json
{
  "type": "diamond",
  "x": 0,
  "y": 0,
  "width": 100,
  "height": 80,
  "strokeColor": "#c92a2a",
  "backgroundColor": "#ffa8a8"
}
```

### Arrow
```json
{
  "type": "arrow",
  "x": 160,
  "y": 30,
  "width": 60,
  "height": 0,
  "strokeColor": "#495057",
  "strokeWidth": 2,
  "points": [[0, 0], [60, 0]],
  "lastCommittedPoint": [60, 0],
  "startArrowhead": null,
  "endArrowhead": "arrow"
}
```

### Line
```json
{
  "type": "line",
  "x": 0,
  "y": 0,
  "width": 100,
  "height": 0,
  "strokeColor": "#868e96",
  "strokeWidth": 2,
  "points": [[0, 0], [100, 0]],
  "strokeStyle": "dashed"
}
```

### Text
```json
{
  "type": "text",
  "x": 80,
  "y": 30,
  "text": "Hello World",
  "fontSize": 20,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "strokeColor": "#212529",
  "backgroundColor": "transparent"
}
```

## Color Palette

### Concept Map Colors (Status-based)

| Status | strokeColor | backgroundColor |
|--------|-------------|-----------------|
| Mastered | `#2f9e44` | `#b2f2bb` |
| In Progress | `#1971c2` | `#a5d8ff` |
| Not Started | `#adb5bd` | `#dee2e6` |
| Prerequisite | `#e67700` | `#ffec99` |

### Visual Hierarchy

| Level | Use | Color |
|-------|-----|-------|
| Primary | Main concept boxes | `#1971c2` / `#a5d8ff` |
| Secondary | Related concepts | `#495057` / `#adb5bd` |
| Accent | Important highlights | `#f59e0b` / `#ffec99` |
| Success | Completed items | `#2f9e44` / `#b2f2bb` |
| Danger | Problem areas | `#c92a2a` / `#ffa8a8` |

### Alternative Accent Palettes

| Theme | accent-1 | accent-2 | accent-3 |
|-------|----------|----------|----------|
| Warm | `#f59e0b` | `#ef4444` | `#fbbf24` |
| Nature | `#10b981` | `#06b6d4` | `#34d399` |
| Elegant | `#e2e8f0` | `#f59e0b` | `#cbd5e1` |
| Bold | `#f43f5e` | `#fb923c` | `#f472b6` |

## Layout Guidelines

- Minimum padding between elements: 40px
- Group spacing: 80-100px
- Text padding inside shapes: 20px
- Use larger shapes for main concepts, bolder colors for emphasis

## Common Patterns

### Flowchart Node
```javascript
[
  { type: "rectangle", x: 0, y: 0, width: 160, height: 60, backgroundColor: "#a5d8ff", strokeColor: "#1971c2", roundness: { type: 3 } },
  { type: "text", x: 80, y: 30, text: "Step 1", fontSize: 20, textAlign: "center" }
]
```

### Connection Arrow
```javascript
{ type: "arrow", x: 160, y: 30, width: 60, height: 0, strokeColor: "#495057" }
```

### Decision Diamond
```javascript
{ type: "diamond", x: 0, y: 0, width: 100, height: 80, backgroundColor: "#ffec99", strokeColor: "#f08c00" }
```

### Container/Group Box
```javascript
{ type: "rectangle", x: 0, y: 0, width: 300, height: 200, backgroundColor: "transparent", strokeColor: "#dee2e6", strokeStyle: "dashed" }
```

## Output Format

### Full Excalidraw File Structure
```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "sigma-tutor",
  "elements": [
    // ... elements here
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff",
    "gridItemEnabled": true,
    "gridSize": null
  },
  "files": {}
}
```

### Saving Concept Maps

Save to: `sigma/{topic-slug}/concept-map/{timestamp}.excalidraw`

Example filename: `2025-01-15-143000.Excalidraw`
