---
description: 知识星球帖子批量采集与存档。提取指定星球、指定日期的帖子标题/作者/时间/链接，保存到飞书多维表格。触发词：知识星球采集、zsxq采集、星球帖子、zsxq-auto、抓星球。
when_to_use: 知识星球采集、zsxq采集、星球帖子、zsxq-auto、抓星球
version: 1.1.0
---

# 知识星球帖子采集 (zsxq-auto)

## 触发词
知识星球采集、zsxq采集、星球帖子、zsxq-auto、抓星球

## 前置条件
- web-access skill 的 CDP Proxy 可用（`node check-deps.mjs` 通过）
- 用户 Chrome 已登录 wx.zsxq.com
- 飞书多维表格 API 权限

## 流程

### Step 1: 参数确认

解析用户输入，提取以下参数：

| 参数 | 必需 | 默认 | 说明 |
|------|------|------|------|
| 星球URL/ID | 是 | - | 如 `https://wx.zsxq.com/group/15552545485212` 或 group_id |
| 日期 | 否 | 今天 | 格式 `YYYY-MM-DD` |
| 目标分类 | 否 | 最新 | 精华/最新/中标等 |

URL解析规则：从 `https://wx.zsxq.com/group/{group_id}` 提取 `{group_id}`。

**Success criteria**: group_id 提取成功，日期格式正确

### Step 2: 打开星球页面

```bash
# 创建新tab
curl.exe -s "http://localhost:3456/new?url=https://wx.zsxq.com/group/{group_id}"

# 等待SPA渲染完成（body文本>10K表示加载完成）
# 用轮询方式：每2秒检查一次，最多等15秒
```

**Success criteria**: `document.title` 包含星球名称，`document.body.innerText.length > 10000`

### Step 3: 切换到「最新」分类

如果不是默认分类，需要点击切换：

```javascript
// 找到目标分类并点击
(function(){
  var items = document.querySelectorAll('.menu-container .item');
  for(var i=0;i<items.length;i++){
    if(items[i].innerText.trim() === targetCategory){
      items[i].click();
      return true;
    }
  }
  return false;
})()
```

点击后等待3秒再操作。

**Success criteria**: `.menu-container .item.actived` 的文本匹配目标分类

### Step 4: 提取帖子数据

核心提取脚本（IIFE，避免ES6语法在Angular老版本报错）：

```javascript
(function(){
  var items = document.querySelectorAll('.topic-container > div');
  var result = [];
  for(var i=0;i<items.length;i++){
    // 排除菜单和置顶容器
    var cls = items[i].className;
    if(cls.indexOf('menu-container') !== -1) continue;
    if(cls.indexOf('sticky-topic-container') !== -1) continue;
    
    var t = items[i].innerText;
    var lines = t.split(String.fromCharCode(10));
    if(lines.length < 2) continue;
    
    // 日期过滤
    if(lines[1].indexOf(targetDate) === -1) {
      // 如果帖子比目标日期早，后续也不用看了（已按时间降序）
      if(lines[1] < targetDate) break;
      continue;
    }
    
    // 提取链接（第一个a标签）
    var aTag = items[i].querySelector('a');
    var link = aTag ? aTag.href : '';
    
    // 提取标题：跳过作者和日期行，取后续内容前120字
    var title = lines.slice(2, 6).join(' ').replace(/\s+/g, ' ').substring(0, 120);
    
    result.push({
      author: lines[0].trim(),
      date: lines[1].trim(),
      title: title,
      link: link
    });
  }
  return JSON.stringify(result);
})()
```

**如果首次提取结果为空**：滚动页面后重试
```bash
curl.exe -s "http://localhost:3456/scroll?target={targetId}&y=3000"
# 等待2秒后重新执行提取
```

**Success criteria**: 返回结果数组长度 > 0，每条包含 author/date/title

### Step 5: 创建飞书多维表格并写入数据

```
1. feishu_bitable_create_app(name="知识星球-{星球名}-{日期}")
2. 创建字段（按顺序）：发布时间(DateTime,yyyy/MM/dd HH:mm)、作者(Text)、标题(Text)、链接(URL)
3. ⚠️ create_app 会自动创建10条空记录（rec278开头），必须先 list_records 获取这些空记录ID
4. 用 update_record 覆盖空记录，而不是 create_record 新建
5. 数据按时间升序写入（从早到晚）
6. 返回表格URL给用户
```

**⚠️ 空记录问题（2026-04-04复盘）**：
- `feishu_bitable_create_app` 固定创建10条空占位行
- `cleaned_placeholder_rows: 0` 是误导信息，实际空行并未被清理
- 如果用 create_record 新增，数据会排在10条空行之后，导致前面大量空行
- **正确做法**：list_records 拿到空记录ID，用 update_record 覆盖写入
- 无法删除这些空行（bot 403权限），也无法删除多余的重复记录

**字段映射**：
| 提取字段 | 多维表格字段 | 类型 | 说明 |
|----------|-------------|------|------|
| date | 发布时间 | DateTime | 时间戳(ms)，格式 yyyy/MM/dd HH:mm |
| author | 作者 | Text | 直接写入 |
| title | 标题 | Text | 截取前120字 |
| link | 链接 | URL(field_type=15) | 见下方格式 |

**发布时间字段**：DateTime 类型，`date_formatter` 设为 `yyyy/MM/dd HH:mm`，值用毫秒时间戳。日期和时间合为一列。

**链接字段（关键！）**：
- field_type=15 是 URL 类型，**创建时不要传 property**（不传或传 null）
- 写入值必须是对象格式：`{"text": "查看原文", "link": "https://..."}`
- ❌ 不能直接传字符串 URL（会报 URLFieldConvFail）
- ❌ 不能传 `property: {"is_remote_url": true}`（会报 400）

**权限问题**：
- bot 创建的 base，bot 自己可能无法 delete record（403）
- 解决方案：用 update 覆盖空行，而不是 delete + create
- lark-cli `+record-delete` 同样受此限制

**Success criteria**: 表格可访问，前10行即为数据（无空行），链接可点击跳转，日期时间分列显示

### Step 6: 收尾

```bash
# 关闭CDP tab
curl.exe -s "http://localhost:3456/close?target={targetId}"

# 更新站点经验到 web-access
# references/site-patterns/wx.zsxq.com.md
```

**Success criteria**: tab已关闭，无残留

## 关键URL
| 页面 | URL |
|------|-----|
| 星球首页 | https://wx.zsxq.com |
| 星球帖子 | https://wx.zsxq.com/group/{group_id} |
| 帖子详情 | https://wx.zsxq.com/group/{group_id}/topic/{topic_id} |
| 文章页 | https://articles.zsxq.com/id_{hash}.html |

## 已知陷阱（2026-04-04实战记录）

1. **SPA渲染延迟**：页面URL到位但DOM未完成，body.innerText<10K时需等待。首次navigate到星球页可能只渲染左侧导航，需要等右侧内容加载完成。

2. **分类切换后内容清空**：点击「最新」后 `.topic-container` 可能只剩1个子元素（菜单），需要等待3秒让Angular重新渲染帖子列表。

3. **ES6语法报错**：Angular老版本不支持箭头函数、模板字符串、展开运算符。提取脚本必须用 `function(){}`、`String.fromCharCode(10)`、`var` 写法。否则 `Uncaught` 错误导致提取失败。

4. **直接navigate不如/new可靠**：`/navigate` 到星球URL后页面可能不跳转，建议用 `/new` 创建新tab打开。

5. **外部链接混杂**：部分帖子链接指向飞书文档、腾讯文档等外部平台，不是 articles.zsxq.com 域名。链接字段保存原始href即可。

6. **默认显示「精华」**：进入星球默认展示精华分类，不是最新。要获取当日帖子必须切换到「最新」。

7. **scrolling反爬**：短时间内密集打开大量页面可能触发风控。单次采集建议控制在50条以内，间隔≥1秒。

## 扩展方向
- 定时采集（cron每日自动跑）
- 多星球聚合采集
- 帖子内容全文抓取（进入详情页）
- 按关键词/作者筛选
