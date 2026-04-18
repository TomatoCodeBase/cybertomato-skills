---
name: zsxq-auto
description: 知识星球帖子批量采集与存档、API交互（评论/回答/标签/精华/搜索）。基于官方 zsxq-cli 暴露的 API 端点，通过 CDP cookie 认证。触发词：知识星球采集、zsxq采集、星球帖子、抓星球、星球评论、星球标签
version: 4.0.0
---

# 知识星球帖子采集与 API 交互 (zsxq-auto)

基于官方 zsxq-cli 暴露的 API 端点，通过 CDP cookie（sync XHR + withCredentials）认证。

## 前置条件
- web-access CDP Proxy 可用（localhost:3456）
- Chrome 已登录 wx.zsxq.com
- 飞书多维表格 API 权限

## 流程

### Step 1: 参数

| 参数 | 必需 | 默认 | 说明 |
|------|------|------|------|
| 星球URL/ID | 是 | - | `https://wx.zsxq.com/group/{group_id}` |
| 日期 | 否 | 昨天 | `YYYY-MM-DD` |

### Step 2: 打开星球页面

```bash
curl.exe -s "http://localhost:3456/new?url=https://wx.zsxq.com/group/{group_id}"
# 等SPA渲染：body.innerText.length > 10000
```

### Step 3: 切换到「最新」分类

默认显示「精华」，必须切「最新」才能看到当日帖子。

⚠️ JS `.click()` 对 Angular SPA 可能无效，优先用 CDP `/click`：
```bash
# 精华=:nth-child(1), 最新=:nth-child(2), 全部=:nth-child(3)
curl -s -X POST "http://localhost:3456/click?target={targetId}" -d '.menu-container .item:nth-child(2)'
```
点击后等3秒。

### Step 4: 提取帖子信息

#### 4a. API提取（推荐首选）⚡

⚠️ **认证方式选择**（两种都可能有效，取决于CDP环境，必须先测试）：
- **方式A：fetch + credentials:'include' + Origin/Referer头** — 2026-04-19实测成功（sync XHR反而1059）。需带 `Origin: https://wx.zsxq.com` 和 `Referer: https://wx.zsxq.com/` 头
- **方式B：同步 XHR**（`XMLHttpRequest` + `x.withCredentials=true`）— 历史上稳定，但2026-04-19实测返回1059

**关键**：两种都试，哪种能用用哪种。如果都返回1059，说明cookie过期，需要用户重新登录wx.zsxq.com。

⚠️ **fetch 会话快速过期**（2026-04-19）：fetch API 认证在页面加载后有效但短时间内会过期（第二次独立 eval 调用可能返回空数组）。**必须用 Promise.all 一次性发所有请求**，缓存结果到 `window.__zsxq_raw`，再逐批提取。不要分多次 eval 调用 fetch。

```javascript
// 同步XHR方式（推荐）
(function(){
  var x=new XMLHttpRequest();
  x.open("GET","https://api.zsxq.com/v2/groups/{group_id}/topics?scope=all&count=20",false);
  x.withCredentials=true;
  x.send();
  var data=JSON.parse(x.responseText);
  var topics=data.resp_data.topics||[];
  var result=[];
  for(var i=0;i<topics.length;i++){
    var t=topics[i];
    if(t.create_time.indexOf("TARGET_DATE")!==-1){
      // ... extract fields
    }
  }
  return JSON.stringify(result);
})()
```

fetch方式（备选，可能失效）：

⚠️ **必须带 Origin/Referer 头**，否则API可能返回内部错误：
```javascript
(async () => {
    const resp = await fetch('https://api.zsxq.com/v2/groups/{group_id}/topics?count=20', {
        credentials: 'include',
        headers: {
            'Origin': 'https://wx.zsxq.com',
            'Referer': 'https://wx.zsxq.com/'
        }
    });
    const data = await resp.json();
    if (!data.succeeded) return JSON.stringify({error: data.error});
    // ... process topics
})()
```

注意：`count=20`（不带scope参数）即可获取最新帖子。不需要 `scope=all`。

⚠️ **fetch 认证单次有效**：fetch 成功一次后，cookie/token 状态可能变化，第二次 fetch 返回 1059。**必须用 Promise.all 批量并发所有请求，一次性缓存到 window 变量**：

```javascript
// 批量并发模板（3个请求同时发出）
(async function(){
  var urls = [
    'https://api.zsxq.com/v2/groups/GID/topics?count=30',
    'https://api.zsxq.com/v2/hashtags/51111181821124/topics?count=20',
    'https://api.zsxq.com/v2/hashtags/28824885148121/topics?count=20'
  ];
  var results = await Promise.all(urls.map(function(url){
    return fetch(url, {credentials:'include', headers:{'Origin':'https://wx.zsxq.com','Referer':'https://wx.zsxq.com/'}}).then(function(r){return r.json()});
  }));
  window.__zsxq_raw = results.map(function(r){return r.resp_data || r});
  return JSON.stringify(results.map(function(r,i){return {url:urls[i], ok:r.succeeded, count:(r.resp_data&&r.resp_data.topics)?r.resp_data.topics.length:0}}));
})()
```

之后用 `window.__zsxq_raw[0]`/`[1]`/`[2]` 分步读取数据。

旧fetch方式（单请求，不推荐用于多端点场景）：

```javascript
(function(){return new Promise(function(resolve){
  fetch('https://api.zsxq.com/v2/groups/{group_id}/topics?scope=all&count=20',{credentials:'include'})
  .then(function(r){return r.json()}).then(function(data){
    var topics=data.resp_data.topics||[];
    var result=[];
    for(var i=0;i<topics.length;i++){
      var t=topics[i];
      if(t.create_time.indexOf("TARGET_DATE")!==-1){
        var owner=t.talk?t.talk.owner.name:(t.question?t.question.owner.name:(t.article?t.article.owner.name:(t.solution?t.solution.author.name:"")));
        var title=t.title||"";
        if(t.talk&&t.talk.article&&t.talk.article.title) title=t.talk.article.title;
        var text2=t.talk?t.talk.text:(t.question?t.question.text:(t.article?t.article.text:(t.solution?t.solution.text:"")));
        if(!title&&text2) title=text2;
        title=title.replace(/<e[^>]*title="([^"]*)"[^>]*\/>/g,function(m,p1){return decodeURIComponent(p1)});
        title=title.replace(/<[^>]+>/g,"").replace(/\n/g," ").trim();
        result.push({topic_id:t.topic_uid,create_time:t.create_time,owner:owner,title:title.substring(0,120),type:t.type});
      }
    }
    resolve(JSON.stringify({total:topics.length,matched:result}));
  });
})})()
```

#### 4b. 游标分页（突破 20 条限制）⚡

**官方 skill 确认的 end_time 机制**：
topics API 支持 `end_time` 参数（RFC 3339 格式如 `2025-12-01T00:00:00.000+0800`）作为分页游标，`count` 最大 30。上一页返回 `has_more: true` 时，用返回的 `next_end_time` 值继续翻页。

**游标翻页模板（sync XHR）**：
```javascript
// 第一页
(function(){
  var x=new XMLHttpRequest();
  x.open("GET","https://api.zsxq.com/v2/groups/{group_id}/topics?count=30",false);
  x.withCredentials=true;
  x.send();
  var data=JSON.parse(x.responseText);
  var topics=data.resp_data.topics||[];
  var result=[];
  for(var i=0;i<topics.length;i++){
    var t=topics[i];
    var owner=t.talk?t.talk.owner.name:(t.question?t.question.owner.name:(t.article?t.article.owner.name:(t.solution?t.solution.author.name:"")));
    var title=t.title||"";
    if(t.talk&&t.talk.article&&t.talk.article.title) title=t.talk.article.title;
    var text2=t.talk?t.talk.text:(t.question?t.question.text:(t.article?t.article.text:(t.solution?t.solution.text:"")));
    if(!title&&text2){text2=text2.replace(/<e[^>]*title="([^"]*)"[^>]*\/>/g,function(m,p1){return decodeURIComponent(p1)});title=text2.replace(/<[^>]+>/g,"").replace(/\n/g," ").trim();}
    result.push({topic_id:t.topic_uid,create_time:t.create_time,owner:owner,title:title.substring(0,120),type:t.type});
  }
  return JSON.stringify({has_more:data.resp_data.has_more,next_end_time:data.resp_data.next_end_time,count:topics.length,topics:result});
})()

// 后续页（用上一页返回的 next_end_time）
// 改 URL 为 ?count=30&end_time={next_end_time}
```

**多天采集循环**：每次请求返回 `next_end_time`，与目标日期比较，`create_time` 早于目标日期则停止。合并所有页的帖子后去重。

#### 4c. 大数据集分步提取（单页数据过大时）

API返回30条帖子，一次性提取所有字段可能超过CDP eval输出限制。策略：**先缓存到 window 变量，再逐条/分批读取**：

```javascript
// 第1步：缓存完整API响应
(function(){return new Promise(function(resolve){
  fetch('https://api.zsxq.com/v2/groups/{group_id}/topics?scope=all&count=20',{credentials:'include'})
  .then(function(r){return r.json()}).then(function(data){
    window.__zsxq=data.resp_data.topics;
    resolve(String(data.resp_data.topics.length));
  });
})})()

// 第2步：逐条读取（单条不会超限）
// var t=window.__zsxq[i]; t.topic_uid + '|' + t.create_time + '|' + t.type
// q&a类型注意：owner在question.owner_detail（无name字段），questionee有name
```

分批读取示例：前5条用 c≤5 跳过，6-10条用 c>5 && c≤10。

#### 4c. 搜索API（历史帖子，列表20条之外）

```
GET https://api.zsxq.com/v2/search/groups/{group_id}/topics?keyword={关键词}&count=20
```
- 参数是 `keyword` 不是 `q`
- `count>20` 静默返回0条
- 关键词需模糊化（完整标题常0结果，缩短为2-4字核心词）
- 每批≤30个关键词（CDP eval 30秒超时）
- 列表API+搜索API合并后按 `topic_uid` 去重

#### 4c. 板块分类（Hashtags API，推荐首选）⚡

**关键发现**：「最新」tab 的帖子和板块帖子是两套完全不同的内容（不同topic_id），必须分别采集后合并。

**板块帖子通过 Hashtags API 获取**：
```
GET https://api.zsxq.com/v2/hashtags/{hashtag_id}/topics?count=20
```
- 需要认证（sync XHR + withCredentials）
- 返回格式同 topics API，但只含该板块下的帖子

**获取 hashtag_id 的方法**：

**方法A：Hashtags 列表 API（推荐，官方 skill `group +hashtags` 底层）**：
```
GET https://api.zsxq.com/v2/groups/{group_id}/hashtags
```
返回该星球所有标签（hashtag_id + title + topic_count），不需要 XHR 拦截，一条请求搞定。官方 zsxq-cli 的 `group +hashtags` 正是调此 API。适用于任何星球，无需手动维护映射表。

**Hashtags 自动发现模板（sync XHR）**：
```javascript
(function(){
  var x=new XMLHttpRequest();
  x.open("GET","https://api.zsxq.com/v2/groups/{group_id}/hashtags",false);
  x.withCredentials=true;
  x.send();
  var data=JSON.parse(x.responseText);
  var tags=data.resp_data.hashtags||[];
  var result=[];
  for(var i=0;i<tags.length;i++){
    var h=tags[i];
    result.push({hashtag_id:h.hashtag_id,title:h.title,topic_count:h.topic_count});
  }
  return JSON.stringify(result);
})()
```

返回示例：`[{"hashtag_id":"51111181821124","title":"中标","topic_count":42},...]`
采集时用 `topic_count` 过滤低活跃板块，只采集高质量板块。

**方法B：XHR 拦截（旧方法，作为备选）**：
1. 注入XHR拦截器：`XMLHttpRequest.prototype.open/send` 包装，记录URL
2. 逐个点击左侧菜单的板块tab（`document.querySelectorAll('.menu-container .item')[N].click()`）
3. 拦截器捕获 `/v2/hashtags/{id}/topics` 请求，提取hashtag_id
4. 建立 板块名→hashtag_id 映射表

**AI破局俱乐部 已知映射**（仅供质量过滤参考，hashtag_id 通过方法A自动获取，无需手动维护）：
| 板块 | hashtag_id | 质量 |
|------|-----------|------|
| 中标 | 51111181821124 | ✅ 高质量 |
| AI洞察 | 28848524284811 | ✅ 高质量 |
| 破局行动 | 28824885148121 | ✅ 高质量 |
| 破局说说 | 48888144144158 | ❌ 低质 |
| AI风向标 | 15555541155522 | ❌ 低质（批量新闻） |
| 破局好事 | 15548482224152 | ❌ 低质 |
| 洋帆 | 51521128828584 | ❌ 低质 |
| 线下聚会 | 88824444411852 | ❌ 低质 |
| 官方活动 | 48824541142518 | ❌ 低质 |
| 资源对接 | 28888255888511 | ❌ 低质 |
| 问答求助 | 51111152254214 | ❌ 低质 |
| 三天体验卡用户必看 | 48811228258248 | ❌ 低质 |

#### 4c-bis. 低质板块过滤（写入前必做！）

**过滤前置，不要先写再删！**

低质板块列表（适用于AI破局俱乐部）：破局说说、AI风向标、破局好事、洋帆、线下聚会、官方活动、资源对接、问答求助、三天体验卡用户必看。

高质量板块保留：中标、AI洞察、破局行动。

**备选板块检测**（无hashtag_id时）：导航到帖子详情页，读 `<meta name="keywords">`：
```javascript
(function(){var m=document.querySelector('meta[name=keywords]');return m?m.content:'none'})()
```

#### 4d. 标题提取（重要！）

**`tp.title` 字段会被API截断（末尾`...`）**，完整标题必须从 `text` 字段提取：

```javascript
function extractTitle(tp){
  // 1. 优先用 article title
  if(tp.talk&&tp.talk.article&&tp.talk.article.title) return tp.talk.article.title;
  // 2. 从text第一行提取（去掉#标签前缀）
  var text=tp.talk?tp.talk.text:"";
  var clean=text.replace(/<e[^>]*title="([^"]*)"[^>]*\/>/g,function(_,p){return decodeURIComponent(p)}).replace(/<[^>]+>/g,"");
  var lines=clean.split("\n");
  for(var i=0;i<lines.length;i++){
    var l=lines[i].trim();
    if(l.length>0){
      l=l.replace(/^#[^\s]*\s*/,"").trim(); // 去掉#标签前缀
      if(l.length>0) return l;
    }
  }
  return clean.substring(0,80);
}
```

⚠️ `text.split("\\n")` 是错误的！实际换行符是 `"\n"`，不是字面量 `\\n`。

#### 4e. 劣质帖二次过滤（板块内）

- `type=solution` 或 `type=q&a` 且 text<50字 → 纯提问
- 任何 text<30字 → 水帖/打卡
- `type=task` → 无标题，丢弃
- **标题关键词过滤**（2026-04-19 新增）：标题含"打卡"、"签到"、"报到" → 打卡水帖，丢弃。注意用标题而非text判断，因为text可能有150+字但仍是水帖
- **同作者同标题去重**：同一作者在同一天内发多条标题相同的帖子时，保留text最长的那条，短的删除（实测44分钟内同作者同标题发两帖，短帖151字是长帖1833字的子集）

### Step 5: 写入飞书多维表格

```
1. +record-upsert 创建/更新记录（不传 --record-id 新建，传 --record-id 更新已有记录。注意：没有 +record-update 命令）
2. 字段映射（用 field ID 不用中文名）：
   - 发布时间(DateTime): "YYYY-MM-DD HH:mm:ss" 字符串，从 API create_time 转
   - 作者(Text): API owner.name
   - 标题(Text): 截前120字
   - 链接(URL): 先 +field-list 确认类型！
     - text+url风格 → 纯字符串URL
     - field_type=15 → 对象 {"text":"查看原文","link":"https://..."}
   - 板块(Text): meta keywords提取，主板块标"最新"
3. 去重：写入前 +record-list 拉已有记录提取 topic_uid，存在则 upsert 不新建
4. +record-list 每页最多200条，>200需 offset 翻页
```

⚠️ **datetime 字段必须传字符串，禁止传毫秒时间戳！** 毫秒时间戳会被飞书错误解析年份（2026→2025）。正确：`"2026-04-11 23:30:23"`，错误：`1775921423000`

### Step 6: 收尾

```bash
curl.exe -s "http://localhost:3456/close?target={targetId}"
```

## 致命踩坑（按优先级）

1. **topic_id精度丢失**：17-18位整数超 `Number.MAX_SAFE_INTEGER`，`JSON.parse` 截断末位。**用 `topic_uid`（字符串，精确）**
2. **认证方式**：CDP eval 中 fetch 可能无法携带httpOnly cookie（返回code 1059），sync XHR + `withCredentials=true` 更稳定。两种都试，哪种能用用哪种
3. **ES5语法**：Angular老版不支持箭头函数/模板字符串/展开运算符，用 `function(){}` + `var`
4. **CDP /click 优先**：JS `.click()` 对 Angular 组件无效，用 CDP `/click` 端点
5. **<e>标签URL解码**：API返回的title含 `<e type="..." title="%E6%89%8B...">`，必须 `decodeURIComponent` 后再截取，否则标题截断
6. **绝不手算时间戳，传字符串而非毫秒**：`+record-upsert` 的 datetime 字段传毫秒时间戳会被飞书错误解析年份（2026变2025）！必须传 `"YYYY-MM-DD HH:mm:ss"` 字符串格式，如 `"2026-04-11 23:30:23"`。Python `datetime.timestamp()*1000` 生成的毫秒值同样会出错
7. **链接字段两种类型**：写入前 `+field-list` 确认，text+url 传字符串，field_type=15 传对象，搞混必报错
8. **空行占位**：`+record-create` 会产生10条空占位行无法删除(bot 403)，用 `+record-upsert` 覆盖而非 create
9. **低质过滤前置**：先过滤再写入，不要写后再删（+record-delete 需 `--as user`）
10. **去重必须翻页**：`+record-list` 每页上限200，>200条需 offset 翻页再合并去重
11. **搜索关键词模糊化**：完整标题常0结果，缩短2-4字重试
12. **CDP eval每批≤30关键词**：超30个30秒超时
13. **默认显示「精华」**：进星球必须切「最新」才有当日帖子
14. **帖子类型差异**：solution→`solution.text/solution.author.name`，question→`question.text/question.owner.name`，talk→`talk.text/talk.owner.name`
15. **板块检测首选hashtags API**：`/v2/hashtags/{hashtag_id}/topics` 直接按板块取帖子，比meta keywords更可靠。meta keywords是备选方案
16. **tp.title被截断**：API返回的title字段常以`...`结尾，完整标题需从text字段第一行非空非#行提取。text中换行是真实`\n`不是字面量`\\n`
17. **最新tab帖子 ≠ 板块帖子**：两套完全不同的内容（不同topic_id），必须分别采集后合并。"最新"是用户原创帖，板块是精选/分类内容
18. **Shell批量写入避免printf**：标题含emoji/引号/特殊字符时printf会破坏JSON。改用写独立JSON文件+`$(cat file)`读取，或用field ID避免中文key
19. **detail API 对部分帖子失败**：`/v2/topics/{id}` 可能返回 internal error（帖子被删除/限制访问），需 fallback 到 list API 已获取的数据，不要因单条失败阻塞整体流程
20. **lark-cli `--json @file.json` 只接受相对路径**：绝对路径如 `@/tmp/xxx.json` 会报错 `--file must be a relative path within the current directory`，必须用相对路径如 `@./fix.json`
21. **fetch 认证一次性有效**：fetch+credentials 成功获取一次API后，第二次调用可能返回1059（cookie状态变化）。多端点采集必须用 Promise.all 并发，结果缓存到 window 变量分步读取。切勿顺序发起多个fetch
22. **板块API可能返回1059**：`/v2/hashtags/{id}/topics` 端点有时返回code 1059（即使主 topics API 成功），可能是权限/签名问题。遇到时跳过该板块，用已有数据继续

## API 交互能力（基于官方 zsxq-cli 端点）

官方 zsxq-cli 暴露了完整的 REST API，可通过 CDP sync XHR + withCredentials 直接调用。以下为已验证/文档化的端点模板。

### 发评论（topic +reply）

```javascript
(function(){
  var x=new XMLHttpRequest();
  x.open("POST","https://api.zsxq.com/v2/topics/{topic_id}/comments",false);
  x.withCredentials=true;
  x.setRequestHeader("Content-Type","application/json");
  x.setRequestHeader("Origin","https://wx.zsxq.com");
  x.setRequestHeader("Referer","https://wx.zsxq.com/");
  x.send(JSON.stringify({
    text:"评论内容",
    // 楼中楼回复时加: replied_comment_id:"{comment_id}"
  }));
  return x.status+"|"+x.responseText;
})()
```

### 回答提问（topic +answer，q&a 专用，只能回答一次）

```javascript
(function(){
  var x=new XMLHttpRequest();
  x.open("POST","https://api.zsxq.com/v2/topics/{topic_id}/answer",false);
  x.withCredentials=true;
  x.setRequestHeader("Content-Type","application/json");
  x.setRequestHeader("Origin","https://wx.zsxq.com");
  x.setRequestHeader("Referer","https://wx.zsxq.com/");
  x.send(JSON.stringify({
    text:"回答内容"
  }));
  return x.status+"|"+x.responseText;
})()
```

### 设置标签（set_topic_tags）

```javascript
(function(){
  var x=new XMLHttpRequest();
  x.open("POST","https://api.zsxq.com/v2/topics/{topic_id}/tags",false);
  x.withCredentials=true;
  x.setRequestHeader("Content-Type","application/json");
  x.setRequestHeader("Origin","https://wx.zsxq.com");
  x.setRequestHeader("Referer","https://wx.zsxq.com/");
  x.send(JSON.stringify({
    tags:["标签1","标签2"]
  }));
  return x.status+"|"+x.responseText;
})()
```

⚠️ 端点路径可能需要调整，如果 404 尝试：
- `/v2/topics/{topic_id}/hashtags`
- `/v2/groups/{group_id}/topics/{topic_id}/tags`

### 设为精华（set_topic_digested，星主权限）

```javascript
(function(){
  var x=new XMLHttpRequest();
  x.open("POST","https://api.zsxq.com/v2/topics/{topic_id}/digested",false);
  x.withCredentials=true;
  x.setRequestHeader("Content-Type","application/json");
  x.setRequestHeader("Origin","https://wx.zsxq.com");
  x.setRequestHeader("Referer","https://wx.zsxq.com/");
  x.send(JSON.stringify({digested:true}));
  return x.status+"|"+x.responseText;
})()
```

### 获取评论列表（get_topic_comments，分页）

```javascript
(function(){
  var x=new XMLHttpRequest();
  x.open("GET","https://api.zsxq.com/v2/topics/{topic_id}/comments?limit=30",false);
  x.withCredentials=true;
  x.send();
  return x.responseText;
})()
// 翻页：加 &index={上一页返回的index值}
```

### 获取自己发起的提问（get_self_question_topics）

```javascript
(function(){
  var x=new XMLHttpRequest();
  x.open("GET","https://api.zsxq.com/v2/topics?topic_filter=unanswered&count=20",false);
  x.withCredentials=true;
  x.send();
  return x.responseText;
})()
// topic_filter: "unanswered" 或 "answered"
```

### 搜索（RAG 全文搜索，官方 skill topic +search 底层）

官方 skill 的 `topic +search` 使用 RAG 语义搜索，按相关性排序（非关键词模糊匹配）。端点：

```
GET https://api.zsxq.com/v2/search/groups/{group_id}/topics?keyword={关键词}
```

⚠️ 这是已知的搜索 API（关键词匹配），官方 RAG 端点可能不同（可能是 `/v3/search/...` 或独立路径）。等 zsxq-cli Windows 支持后，用 `zsxq-cli api list` 查看完整映射。

### API 交互注意事项

1. **所有写入操作前必须确认用户意图** — 发帖、评论、回答、打标签、设精华均为公开操作
2. **Content-Type 为 application/json** — 所有 POST 请求体用 JSON.stringify
3. **必须带 Origin/Referer 头** — 否则可能返回 403 或内部错误
4. **ES5 语法** — CDP eval 中用 `var` + `function(){}`，不要箭头函数
5. **answer 只能一次** — 每个 q&a 只能回答一次，回答后不可修改
6. **端点路径可能有变** — 官方 zsxq-cli 可能做了 URL 映射/重命名，如果 404 尝试变体路径

---

## 三 Skill 协同 Pipeline

CDP采集 → JSON文件中转 → lark-cli写入，形成稳定pipeline：

```
1. web-access (CDP): 打开知识星球页面 → sync XHR采集API数据
2. Python中间层: 去重(对比飞书已有UID) → 低质过滤 → 生成独立JSON文件(ensure_ascii=True)
3. lark-cli (bash脚本): 循环读取JSON文件 → +record-upsert写入飞书
4. 验证: +record-list 记录总数差值 = 成功插入数
```

关键交接点：
- Python→bash：`ensure_ascii=True` + 绝对路径 `/d/tmp/`（MSYS2边界安全）
- bash→lark-cli：`$(cat file)` 读JSON（避免printf破坏特殊字符）
- 验证：总数差值法（绕过lark-cli输出的Unicode代理对问题）

## 关键配置

```
GROUP_ID=15552545485212
BASE_TOKEN=AaJDbLm4faGF6QsqT4BceZ8vnBg
TABLE_ID=tbl16L7HJIECwi3p
FIELD_IDS=标题:fld4b6ZPGe,发布时间:fld4veA6HK,作者:fldEAGej0T,链接:fldHK0PzkW,板块:flduei9oKf
LARK_CLI=node /d/OpenClaw/node_modules/@larksuite/cli/scripts/run.js
```

⚠️ **lark-cli 调用方式**：2026-04-19验证 `lark-cli.exe` 是原生二进制（非node脚本），直接执行即可：`/d/OpenClaw/node_modules/@larksuite/cli/bin/lark-cli.exe`。如果该二进制不存在，先 `cd /d/OpenClaw && npm install @larksuite/cli` 重装。shell wrapper `/d/OpenClaw/lark-cli` 在 MINGW64 下可能 hang/timeout，优先用 `.exe` 直接调用。若 exe 也不存在，降级用 `node /d/OpenClaw/node_modules/@larksuite/cli/scripts/run.js`。

## 链接构建

统一用 `https://wx.zsxq.com/group/{group_id}/topic/{topic_uid}`，所有帖子类型都有效。

## 批量写入模板

### 方法A: batch-create（推荐，一次性写入多条）⚡

```bash
LARK="/d/OpenClaw/node_modules/@larksuite/cli/bin/lark-cli.exe"
BT="BASE_TOKEN" TI="TABLE_ID"

# Python生成batch JSON到文件
PYTHONIOENCODING=utf-8 python -c "
import json
batch = {
    'fields': ['标题', '发布时间', '作者', '链接', '板块'],
    'rows': [
        ['标题1', '2026-04-15 12:00:00', '作者1', '[查看原文](https://wx.zsxq.com/group/GID/topic/UID1)', '其他'],
        ['标题2', '2026-04-15 13:00:00', '作者2', '[查看原文](https://wx.zsxq.com/group/GID/topic/UID2)', '其他'],
    ]
}
with open('D:/tmp/zsxq_batch.json', 'w', encoding='utf-8') as f:
    json.dump(batch, f, ensure_ascii=False)
"

# bash读取并批量写入
BATCH_JSON=$(cat D:/tmp/zsxq_batch.json)
$LARK base +record-batch-create --base-token $BT --table-id $TI --json "$BATCH_JSON"
```

⚠️ `--json` 格式是 `{"fields":["字段名1",...], "rows":[[值1,...],...]}`，用字段名不用field ID。
⚠️ 链接字段写法：text类型用 `[查看原文](URL)` 格式，field_type=15用对象。
⚠️ bash中 `$(cat file)` 读取JSON，避免shell引号转义问题。

### 方法B: 单条upsert循环

```bash
LARK="/d/OpenClaw/node_modules/@larksuite/cli/bin/lark-cli.exe"
BT="BASE_TOKEN" TI="TABLE_ID"
for line in \
  '{"fld4b6ZPGe":"标题","fld4veA6HK":"2026-04-10 20:25:32","fldEAGej0T":"作者","fldHK0PzkW":"https://wx.zsxq.com/group/GID/topic/UID","flduei9oKf":"AI编程"}' \
; do
  $LARK base +record-upsert --base-token $BT --table-id $TI --json "$line"
  sleep 0.5
done
```
特殊字符安全：写独立JSON文件，`$(cat /tmp/record_$i.json)` 读取。

## 知识星球文章内容提取（articles.zsxq.com）

### 前提
- CDP Proxy 可用（localhost:3456）
- Chrome 已登录 wx.zsxq.com（articles 页面复用同一登录态）

### 为什么需要 CDP
`articles.zsxq.com` 的文章需要登录，curl 只能拿到 SPA 空壳（`<app-root></app-root>`），无法获取内容。

### Step 1: 通过 CDP 打开文章页面

```bash
curl.exe -s "http://localhost:3456/new?url=https://articles.zsxq.com/id_XXXXXXX.html"
# → 返回 targetId
sleep 5
curl.exe -s "http://localhost:3456/info?target=TARGET_ID"
# → 确认 title 和 ready 状态
```

### Step 2: 提取文章 HTML

文章内容在 `article > .ProseMirror` 中（milkdown 编辑器渲染的结果）：

```bash
curl.exe -s -X POST "http://localhost:3456/eval?target=TARGET_ID" \
  -d "(function(){ var a=document.querySelector('article .ProseMirror'); return a?a.innerHTML:'not found'; })()"
```

### Step 3: 提取图片 URL

```bash
curl.exe -s -X POST "http://localhost:3456/eval?target=TARGET_ID" \
  -d "(function(){ var imgs=document.querySelectorAll('article img'); var r=[]; for(var i=0;i<imgs.length;i++){var s=imgs[i].src; if(s&&s.indexOf('article-images')!==-1)r.push(s);} return JSON.stringify(r); })()"
```

图片域名：`article-images.zsxq.com`，URL 可直接用于飞书 `<image url="..."/>` 标签。

### Step 4: 转为 Lark-flavored Markdown 并创建飞书文档

将提取的 HTML 内容转为 markdown，图片用 `<image url="..." align="center"/>` 替换，然后：

```bash
# 先同步创建拿 doc_id
lark-cli docs +create --title "文章标题" --markdown "placeholder" --as user
# 再 overwrite 写完整内容
cd /tmp && lark-cli docs +update --doc "DOC_ID" --mode overwrite --markdown @content.md --as user
```

### 注意事项
- 用完后关闭 CDP tab：`curl.exe -s "http://localhost:3456/close?target=TARGET_ID"`
- 文章标题从 `/info` 的 `title` 字段获取，比从 HTML 中提取更可靠

---

## 文章发布（知识星球编辑器）

### 前提
- 用户已打开文章编辑页：`https://wx.zsxq.com/article?groupId={group_id}`
- CDP Proxy 可用，能找到该 tab

### 编辑器结构
- **标题**：`input[placeholder="请在这里输入标题"]`（Angular 控制的 `<input>`）
- **正文**：`.ProseMirror`（milkdown 编辑器，contenteditable div）

### Step 1: 设置标题

React/Angular 受控输入框必须用 native setter：

```javascript
(function(){
  var input = document.querySelector('input[placeholder="请在这里输入标题"]');
  var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeSetter.call(input, '你的标题');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return 'Title set';
})()
```

### Step 2: Markdown 转 HTML

知识星球编辑器是 ProseMirror（milkdown），接受 HTML innerHTML 注入。先将 Markdown 转为简化 HTML：

```python
import re, json

def md_to_zsxq_html(md_text):
    """将 Markdown 转为知识星球兼容的简化 HTML"""
    lines = md_text.split('\n')
    html_parts = []
    in_blockquote = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if in_blockquote:
                html_parts.append('</blockquote>')
                in_blockquote = False
            continue

        if stripped.startswith('> '):
            if not in_blockquote:
                html_parts.append('<blockquote style="color:#666;border-left:3px solid #ddd;padding-left:10px;margin:8px 0">')
                in_blockquote = True
            content = stripped[2:]
            content = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', content)
            content = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2">\1</a>', content)
            html_parts.append(f'<p>{content}</p>')
            continue
        elif in_blockquote:
            html_parts.append('</blockquote>')
            in_blockquote = False

        if stripped.startswith('## '):
            html_parts.append(f'<h2>{stripped[3:]}</h2>')
            continue
        if stripped.startswith('### '):
            html_parts.append(f'<h3>{stripped[4:]}</h3>')
            continue
        if stripped == '---':
            html_parts.append('<hr>')
            continue

        converted = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', stripped)
        converted = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2">\1</a>', converted)
        if stripped.startswith('- '):
            html_parts.append(f'<p>- {converted[2:]}</p>')
        else:
            html_parts.append(f'<p>{converted}</p>')

    if in_blockquote:
        html_parts.append('</blockquote>')
    return '\n'.join(html_parts)
```

### Step 3: 注入正文到 ProseMirror

**大内容必须分块拼接**，否则 CDP eval 会静默失败：

```javascript
// 在 Python 中生成 JS，HTML 用 json.dumps 分块
// chunk_size = 8000，每块赋值给 html 变量拼接
var html = "";
html += "第一块HTML...";
html += "第二块HTML...";
var editorEl = document.querySelector('.ProseMirror');
editorEl.innerHTML = html;
editorEl.dispatchEvent(new Event('input', { bubbles: true }));
```

写入 JS 文件后用 `curl --data-binary @file.js` 发送（不是 `-d`，避免特殊字符截断）。

### Step 4: 验证

```javascript
(function(){
  var editorEl = document.querySelector('.ProseMirror');
  var text = editorEl.innerText;
  return 'Total: ' + text.length + ', ending: ' + text.substring(text.length - 100);
})()
```

### 致命踩坑（发布相关）

1. **innerHTML 直接设置对 ProseMirror 有效**：知识星球的 milkdown 编辑器不会拦截 innerHTML 赋值（不同于标准 ProseMirror），设置后触发 `input` event 即可
2. **大 JS 必须 --data-binary**：`curl -d @file` 会截断含中文/emoji 的 body，必须用 `--data-binary`
3. **Angular input 需要 native setter**：直接 `.value = '...'` 不触发 Angular 变更检测，必须用 `HTMLInputElement.prototype.value.set` + dispatchEvent
4. **标题不含引号问题**：标题中有引号时用 json.dumps 安全编码
5. **先 focus 再 inject**：注入正文前先 `editorEl.focus()` 确保编辑器处于活跃状态
6. **curl POST 中文文件用 PYTHONIOENCODING=utf-8**：Windows 下 Python 默认 GBK，读写中文文件前设置编码

## Cron 自动化

```
schedule: 0 2 * * *（凌晨2点，帖子全+Chrome存活概率高）
skills: [web-access, zsxq-auto, lark-base]
script: ~/.hermes/scripts/zsxq-daily-prep.py
```

Cron prompt要点：读脚本常量 → +record-list去重 → CDP爬取 → 低质过滤前置 → 写入 → CDP不可用则降级

## Windows 陷阱

- `python3` 不存在，只有 `python`
- **Python subprocess 调 lark-cli 路径失败（WinError 2）**：lark-cli 是 POSIX shell 脚本（`#!/bin/sh`），Windows Python `subprocess.run([LARK, ...])` 无论 `shell=True` 还是 `shell=False` 都无法找到该文件。**必须用 bash 脚本调用 lark-cli**，Python 只负责生成 JSON 文件到 `/d/tmp/`，然后用 bash `for` 循环 + `$(cat file)` 读取并调用 lark-cli
- `start` 命令 exit_code=0 不可信
- +record-upsert 加 `--yes` 会静默失败
- bash中文JSON key编码丢失 → 用 field ID
- **Python `/tmp` ≠ MSYS2 `/tmp`**：Python 的 `tempfile.gettempdir()` 返回 `D:\tmp`（基于Python安装路径），而 MSYS2 bash 的 `/tmp` 是另一个目录。跨边界传文件时统一用绝对路径 `D:\tmp`（Python中）或 `/d/tmp/`（bash中）
- **`ensure_ascii=True`**：Python写JSON给bash/lark-cli消费时必须用 `json.dumps(data, ensure_ascii=True)`，否则中文在Windows MSYS2边界可能乱码
- **lark-cli 输出含无效Unicode代理对**：`+record-list` 的JSON输出可能含孤立代理对（surrogate pairs），导致 Python `json.loads()` 解析失败。验证写入结果改用 **记录总数对比**（写入前后 `| .data.data | length` 的差值），而非查询特定日期记录
- **删除记录需 offset 翻页**：`+record-list` 每页200条，目标记录可能在第2页（offset=200）。删除时先按页遍历找到 record_id，再 `+record-delete --record-id REC_ID`。grep 搜索时 jq 对中文不可靠，用 `grep -o '"topic_uid_value"'` 配合行号定位
- **批量写入模板**：优先用 `+record-batch-create`（一次API调用写入多条，字段名格式 `{"fields":["标题",...], "rows":[[...]]}`），比循环 `+record-upsert` 快10倍且不易出错。每条记录写独立JSON文件到 `/d/tmp/`（`ensure_ascii=True`），bash循环 `for i in $(seq 0 $n); do $LARK base +record-upsert ... --json "$(cat /d/tmp/r_$i.json)"; done`
- **lark-cli 没有 +record-create 命令**：创建单条用 `+record-upsert`（不传 --record-id），批量用 `+record-batch-create`
