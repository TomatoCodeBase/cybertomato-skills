---
name: aipoju-daka
description: "AI破局(aipoju.com)行动打卡。从Obsidian日志读取内容，通过CDP自动填写表单并提交。支持一人公司、龙虾技能等不同训练营。触发词：一人公司打卡、龙虾技能打卡、AI破局打卡、aipoju打卡"
triggers:
  - 一人公司打卡
  - 龙虾技能打卡
  - AI破局打卡
  - aipoju打卡
  - 打卡
---

# SKILL.md - AI破局行动打卡

> 创建时间：2026-04-16
> 用途：自动从Obsidian日志读取内容，填写AI破局打卡表单并提交

## 触发词

`一人公司打卡`、`AI破局打卡`、`aipoju打卡`

## 前置条件

- CDP Proxy 运行中（`node "D:/HermesData/.hermes/skills/web/web-access/scripts/check-deps.mjs"`）
- 用户已登录 aipoju.com（Chrome 登录态）
- Obsidian 中有当天打卡日志

## 流程

### Step 1: 读取当日打卡日志

- 路径：`D:\cybertomato\00-个人日记\Z知识学习\Y一人公司丨4月\`
- 文件名模式：`Y一人公司丨4月丨YYYY-MM-DD.md`
- 用 search_files 按日期匹配

日志格式：
```markdown
## 今日行动
...
## 今日收获
...
## 下一步行动
...
```

### Step 2: 打开打卡页面

打卡 URL 格式（AI一人公司内容自动化）：
```
https://aipoju.com/user/task-clock-in/08e0a578-1b29-45f0-9455-7a07951675ae/246dae00-6e1e-4ff2-a6f6-0a62be089ddd/AI%E4%B8%80%E4%BA%BA%E5%85%AC%E5%8F%B8%E5%86%85%E5%AE%B9%E8%87%AA%E5%8A%A8%E5%8C%96
```

```bash
curl -s "http://localhost:3456/new?url=<URL>"
```

### Step 3: 填写表单

页面使用 Ant Design (React)，textarea 元素。**必须用 nativeSetter 填值**。

| 字段 | textarea ID | 对应日志章节 |
|------|-------------|-------------|
| 今日行动 * | `form_item_todayAction` | ## 今日行动 |
| 今日收获 * | `form_item_todayAchievement` | ## 今日收获 |
| 好事分享（选填） | `form_item_goodThingsShare` | 无对应，留空 |
| 下一步行动 * | `form_item_nextAction` | ## 下一步行动 |

**填值 JS 模板**（中文内容必须写入 .js 文件再通过 `curl --data-binary @file` 传递，MINGW64 编码陷阱）：

```javascript
(function(){
  var nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
  var fields = [
    {id:'form_item_todayAction', text:'...'},
    {id:'form_item_todayAchievement', text:'...'},
    {id:'form_item_goodThingsShare', text:''},
    {id:'form_item_nextAction', text:'...'}
  ];
  var results = [];
  fields.forEach(function(f){
    var el = document.getElementById(f.id);
    if(!el){results.push({id:f.id,status:'NOT_FOUND'});return;}
    el.focus();
    nativeSetter.call(el, f.text);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    results.push({id:f.id, status:'OK', valLen:el.value.length});
  });
  return JSON.stringify(results);
})()
```

**重要**：JS 文件必须用 write_file 工具写入（保证 UTF-8）。有三种传递方式：

方式C（最可靠，推荐首选）—— node 全链路脚本，完全不碰 bash/curl：
```javascript
// write_file 写完整 .js 脚本，包含：读本地日记 → 正则解析章节 → nativeSetter 填值 → click 提交 → 验证
// 关键点：
// 1. fs.readFileSync(path, 'utf8') 读文件
// 2. 先 .replace(/\r\n/g, '\n').replace(/\r/g, '\n') 去掉 Windows \r（否则正则匹配失败）
// 3. native http 模块 POST 到 CDP proxy，Content-Type: text/plain; charset=utf-8
// 4. JS 代码通过 'eval(' + JSON.stringify(jsCode) + ')' 包裹发送
// 5. JSON.stringify() 内嵌中文值时自动转义，无需手动处理
// 用 write_file 写脚本到临时目录，然后 node xxx.js 执行
```

方式A（备选）—— 先用 node 转义，再用 shell 变量传递：
```bash
# 1. write_file 写 fill.js 到临时目录
# 2. node 转义为 eval() 调用体
node -e "const fs=require('fs'); const js=fs.readFileSync('D:/G谷歌下载/fill.js','utf8'); fs.writeFileSync('D:/G谷歌下载/fill_body.txt', 'eval('+JSON.stringify(js)+')');"
# 3. curl 传递
BODY=$(cat /d/G谷歌下载/fill_body.txt) && curl -s -X POST "http://localhost:3456/eval?target=ID" --data-binary "$BODY"
```

方式B（简单场景）—— 直接用 --data-binary @file：
```bash
curl -s -X POST "http://localhost:3456/eval?target=ID" --data-binary @/tmp/aipoju_fill.js
```

### Step 4: 点击打卡按钮

```bash
curl -s -X POST "http://localhost:3456/click?target=ID" -d 'button.ant-btn-primary'
```

### Step 5: 验证成功

打卡成功后页面 Ant message 组件显示"保存成功"（浮在页面顶部的绿色提示条）。部分页面可能出现"行动海报"文案。

验证 JS：
```javascript
const allText = document.body.innerText;
const msg = document.querySelector('.ant-message-notice');
JSON.stringify({
  hasSave: allText.includes('保存成功'),
  msgText: msg ? msg.textContent : null
});
```

### Step 6: 关闭 tab

```bash
curl -s "http://localhost:3456/close?target=ID"
```

## 注意事项

1. **MINGW64 中文编码**：绝不在 curl -d 中直接写中文，必须通过 .js 文件传递
2. **Ant Design nativeSetter**：React SPA 的 textarea 不能用 `.value = x` 赋值，必须用 nativeSetter
3. **write_file 写 JS**：用 Hermes write_file 工具写 JS 文件保证 UTF-8 编码，不要用 shell heredoc
4. **日志中可能有特殊字符**：如引号、破折号等，在 JS 字符串中需要转义或简化
5. **Windows \r 换行**：Obsidian 日志文件可能有 `\r\n` 换行，正则解析前必须先 `.replace(/\r\n/g, '\n').replace(/\r/g, '\n')`，否则 `\n` 正则匹配失败返回 null

## 不同打卡任务

URL 中的 UUID 对应不同打卡任务。当前已知的：
- AI一人公司内容自动化：`08e0a578-1b29-45f0-9455-7a07951675ae/246dae00-6e1e-4ff2-a6f6-0a62be089ddd/AI%E4%B8%80%E4%BA%BA%E5%85%AC%E5%8F%B8%E5%86%85%E5%AE%B9%E8%87%AA%E5%8A%A8%E5%8C%96`
- 龙虾技能训练营 Agent Skills：`08e0a578-1b29-45f0-9455-7a07951675ae/ef6fb4a0-ad15-45fb-a88c-1a67887b690d/Agent%20Skills`

如果用户提供了不同的打卡 URL，用该 URL 即可，表单结构相同。

## 不同打卡任务的日志路径

| 任务 | 日志路径 | 文件名格式 |
|------|---------|-----------|
| AI一人公司 | `D:\cybertomato\00-个人日记\Z知识学习\Y一人公司丨4月\` | `YYYY-MM-DD--一人公司4月打卡.md` |
| 龙虾技能 | `D:\cybertomato\00-个人日记\Z知识学习\龙虾技能丨4月\` | `YYYY-MM-DD--龙虾技能4月打卡.md` |

## 备选填值方式（无ID时用索引）

部分打卡页面的 textarea 没有 `form_item_xxx` ID，此时用索引定位：

| 字段 | textarea 索引 |
|------|--------------|
| 今日行动 * | textarea[0] |
| 今日收获 * | textarea[1] |
| 好事分享（选填） | textarea[2] |
| 下一步行动 * | textarea[3] |

```javascript
(() => {
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
  const tas = document.querySelectorAll("textarea");
  // 按 index 填值
  nativeSetter.call(tas[0], "今日行动内容...");
  tas[0].dispatchEvent(new Event('input', {bubbles:true}));
  tas[0].dispatchEvent(new Event('change', {bubbles:true}));
  // ... 同理 tas[1], tas[3]
})()
```
