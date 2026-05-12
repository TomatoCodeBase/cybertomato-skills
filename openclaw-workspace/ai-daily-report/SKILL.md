---
name: ai-daily-report
description: AI鐑偣鏃ユ姤鐢熸垚鍣ㄣ€傛瘡澶╄嚜鍔ㄩ噰闆嗗叏鐞傾I鐑偣锛屾暣鐞嗕负涓枃鏃ユ姤鍐欏叆Obsidian銆傛敮鎸佹墜鍔ㄨЕ鍙戝拰cron瀹氭椂鎵ц銆侫utomated AI news digest 鈥?crawls global AI headlines daily, curates a Chinese-language report, and writes to Obsidian. Supports manual trigger and cron scheduling.
when_to_use: |
  Use when user mentions: AI鏃ユ姤銆丄I鐑偣銆佺儹鐐规棩鎶ャ€侀噰闆嗘棩鎶ャ€佽ˉ閲囨棩鎶ャ€丄I news digest銆丄I daily report銆乨aily AI roundup銆丄I headlines.
  Also use when user wants to generate a curated AI news digest, or review today's AI news.
argument-hint: "[YYYY-MM-DD]锛堝彲閫夛紝榛樿浠婂ぉ锛?
---

# AI鐑偣鏃ユ姤鐢熸垚鍣?

## 鎵ц娴佺▼

```
Step 1: 璇婚厤缃?鈫?鏁版嵁婧愬垪琛ㄣ€亁_accounts
Step 1.5: Tier 0.5 - AIHOT精选 + 公众号爆文
Step 2: Tier 1 閲囬泦 鈫?AIbase + 绔欓暱涔嬪 + 36姘?
Step 3: 鍘婚噸鍚堝苟
Step 4: Tier 2 琛ュ厖 鈫?web_search + x_search + 娴峰婧?
Step 5: CP1 纭 鈫?閲囬泦鏉＄洰鏁?鏍囬鎽樿
Step 6: 缂栧啓鏃ユ姤 鈫?鎸夋牸寮忔ā鏉匡紝鐢熸垚閲戝彞鏍囬
Step 7: CP2 璺宠繃 鈫?鏍囬鑷鍐冲畾
Step 8: 鍐欏叆 Obsidian 鈫?write_file 鐩村啓 vault
Step 9: 鎵撳紑 Obsidian
Step 10: 寰ご鏉″瓨妗?
Step 11: 绠＄嚎琛旀帴妫€鏌ワ紙蹇呭仛锛?
```

## 閲囬泦

**工具优先级：browser snapshot (profile=openclaw, compact=true) > mcp_web_reader_webReader > curl 直连（Windows 常失败） > Jina**
> ⚠️ 实战经验：36氪、站长之家、机器之心都是动态渲染，curl/web_fetch 返回空。browser snapshot（profile=openclaw）是最可靠的方式。不要浪费时间先试 curl 再降级。

| 婧?| URL | Tier | 鎶撳彇鏂瑰紡 | Reference |
|---|-----|------|----------|-----------|
| AIbase | https://www.aibase.com/zh/news | 1 | curl，提取`<a>`中的文章链接浼樺厛锛岄摼鎺ユ牸寮廯/news/NNNNN` | references/aibase.com.md |
| 绔欓暱涔嬪AI | https://www.chinaz.com/ai/ | 1 | curl浼樺厛锛屾爣棰樺湪`<h3>` | references/chinaz.com.md |
| 36氪 | https://36kr.com/information/AI/ | 1 | **browser snapshot (profile=openclaw) 优先**（curl/web_fetch 均因动态渲染返回空），compact=true提取文章卡片和链接，提取`<a>`中的文章链接浼樺厛锛?24KB+锛?| references/36kr.com.md |
| The Verge AI | https://www.theverge.com/ai-artificial-intelligence | 2.5 | 璺宠繃锛堝浗鍐呰澧欙級 | - |
| VentureBeat AI | https://venturebeat.com/category/ai/ | 2.5 | CDP，提取`<a>`中的文章链接 | - |
| Hacker News | https://news.ycombinator.com/ | 2.5 | Firebase API | - |
| AIHOT精选 | https://aihot.virxact.com/ | 0.5 | browser snapshot，提取文章卡片 | references/aihot.virxact.com.md |
| AIHOT公众号爆文 | https://aihot.virxact.com/mp | 0.5 | browser snapshot，提取爆文列表 | references/aihot-mp.virxact.com.md |


- **⛔ 每条新闻必须提取原文链接**：采集列表页时，解析 HTML 中的 `<a href>` 标签，拿到每条新闻的具体文章 URL（如 AIbase 的 `/news/12345`、站长之子的完整文章链接）。禁止用列表页 URL 作为来源链接。如果列表页 HTML 中没有独立文章链接，则用 web_fetch 抓取文章详情页获取链接。
- Tier 1 鎻愬彇80%+鍐呭锛孴ier 2 鎼滅储琛ュ厖娴峰閲嶅ぇ浜嬩欢鍓?鏉?
- x_search 缂?Brave API key 鏃惰烦杩?
- **涓嶈鐢?delegate_task 鍋氱綉椤垫姄鍙?*锛堝瓙Agent鏃燙DP proxy锛?
- 姣忎釜婧愮殑璇︾粏DOM鎻愬彇妯″紡瑙?references/ 鐩綍锛屼笉鍦⊿KILL.md閲嶅

## 鍐欐棩鎶ュ墠蹇呭仛

**纭鏃ユ湡**锛堟瘡娆￠噸鏂扮‘璁わ紝涓嶈兘闈犵寽锛夛細
```javascript
// browser_console expression:
new Date(Date.now() + 8*3600000).toISOString().slice(0,10) + ' weekday=' + (new Date(Date.now() + 8*3600000).getDay()===0?7:new Date(Date.now() + 8*3600000).getDay())
```

**鏁板瓧/浜嬪疄蹇呴』杩囧師鏂?*锛氭爣棰樺厷浼氱渷鐣ュ叧閿檺瀹氳瘝锛屽鍏抽敭鏂伴椈杩涘師鏂囨壂涓€閬嶅啀鍐欍€?

**鎽樿鎵惧弽宸?瀵规瘮**锛氫笉鏄杩颁簨浠讹紝鑰屾槸鎶婃渶鏈夊啿鍑诲姏鐨勫姣旀媺鍑烘潵銆?

## 日报格式

```markdown
# 【金句标题：两个冲突事件并列，有画面感】

> 日期：YYYY-MM-DD 周X
> 采集时间：YYYY-MM-DD HH:mm CST（cron模式标注 [自动采集，未人工审核]）

---

## 🔥 今日重点

### 🎯 S级：标题（有信息量，不只是公司名）

3-4句解读。说清"你能拿它做什么"。
不只是复述事件，而是把最有冲击力的对比拉出来。

> 来源：[来源名](https://原文链接)

---

## 🛠️ 产品与技术

### ⭐ A级：标题
2-3句，说清影响。
> 来源：[来源名](URL)

### 📰 B级：标题
1-2句，简明。
> 来源：[来源名](URL)

---

## 💬 业界观点
（同上格式）

## 🇨🇳 国内动态
（同上格式）

## 📌 值得关注

### 🧠 C级：标题
说清价值点——"看完了能做什么"才值得C级。
> 来源：[来源名](URL)

---
*数据来源：[实际使用的源]*
*采集时间：YYYY-MM-DD HH:mm CST*
```

### 单条条目模板（所有级别通用）

每条包含三个部分：
1. **加粗标题** — 有信息量，不只是公司名
2. **解读段落** — S级3-5句，A级2-3句，B级1-2句，C级1-2句。必须包含对普通人的实际启发
3. **来源链接** — `> 来源：[来源名](具体文章URL)`，禁止用列表页URL

### 多来源合并
同一事件出现在多个源时，合并为一条，来源链接用 `|` 分隔：
> 来源：[36氪/新智元](https://36kr.com/p/xxx) | [AIbase](https://www.aibase.com/zh/news/xxx)

## 鏍囬鍘熷垯

- 鉁?銆屽ぇ妯″瀷鍙樻垚鎵撳伐浜猴細GLM-5.1杩炵画宸ヤ綔8灏忔椂锛孏PT-4o涔嬫瘝鍑鸿蛋OpenAI銆?
- 鉂?銆孉I鐑偣鏃ユ姤 2026-04-09銆?
- 鉂?銆屼粖鏃I鏂伴椈姹囨€汇€?
- 姣忔潯鏂伴椈鏍囬瑕佹湁淇℃伅閲忥紝涓嶅彧鏄叕鍙稿悕

## 鍒嗙骇浣撶郴锛堣瀺鍚堟棩鎶ュ鐢ㄦ瀹氫箟锛?

| 绾у埆 | emoji | 鍚箟 | 娣卞害 |
|------|-------|------|------|
| S绾?| 馃幆 | 浠婃棩鍙敤 | 3-5鍙ワ紝璇存竻銆屼綘鑳芥嬁瀹冨仛浠€涔堛€?|
| A绾?| 鈿?| 鑳藉姏鍗囩骇 | 2-3鍙ワ紝璇存竻褰卞搷 |
| B绾?| 馃摪 | 琛屼笟蹇 | 1-2鍙ワ紝绠€鏄?|
| C绾?| 馃 | 鍊煎緱娣辫 | 1-2鍙ワ紝璇存竻浠峰€肩偣 |

**涓夌瓫鍘熷垯**锛氣憼鑳藉鍒╋紵鈶¤兘鑷姩鍖栵紵鈶㈡墦宸ユ棌浠婂ぉ鑳界敤锛?

**鍋忓ソ鏉冮噸**锛堟櫘閫傛€ф礊瑙?> 鎯呭鎬ц鐐癸紝鎬濈淮妯″紡 > 鍏蜂綋缁撹锛屽彲杩佺Щ鏅烘収 > 涓撳睘缁忛獙锛夛細
1. 鍏嶈垂API/寮€婧愭ā鍨?瀹炴搷鏂规硶璁?鈫?S绾ф牳蹇冪礌鏉?
2. 鑳芥敼鍙樺伐浣滄柟寮忕殑鏁欑▼锛堥檮鍏蜂綋姝ラ锛? 浜у搧鍔熻兘鍙戝竷
3. 琛屼笟鏍煎眬鍙樺寲锛堜及鍊?鏀惰喘/鏋舵瀯锛?鈫?A绾?
4. 鐗瑰畾鍦烘櫙浜у搧/宸ュ叿锛堢數瀛愯。姗便€佺ぞ浜I绛夛級 鈫?B/C绾э紝涓嶅崰S/A
5. 鐭ヨ瘑搴撹祫婧愭湁銆岀湅瀹岃兘鍋氫粈涔堛€嶇殑浠峰€肩偣鎵嶅€煎緱C绾?

**S绾р墹2鏉?*锛堥搧寰嬶紝涓嶅彲杩濆弽锛夈€係绾ч棬妲涳細浠婂ぉ鑺?灏忔椂閰嶇疆锛屼互鍚庢瘡澶╃渷1灏忔椂鐨勬潬鏉嗛」銆?

## 鍐欏叆

**棣栭€?write_file 鐩村啓 vault**锛?
```python
write_file(path="D:/cybertomato/03-鍐呭宸ュ巶/鏃ユ姤/AI鐑偣鏃ユ姤/YYYY-MM-DD-AI鐑偣鏃ユ姤.md", content="...")
```

闄嶇骇鐢?Obsidian REST API锛坙ocalhost:27123锛夛紝闇€ `Bearer $OBSIDIAN_API_KEY`锛屼腑鏂囪矾寰勭敤 Node.js encodeURIComponent銆?

## AIHOT采集 (Tier 0.5)

AIHOT是「数字生命卡兹克」运营的AI热点聚合站，监控168个精选信源（OpenAI/Anthropic官方博客、X/Twitter大佬、arXiv等），经AI评分+精选后展示。优先于Tier 1采集。

采集方式：browser snapshot获取结构化数据，提取每条信息卡片的标题/评分/标签/推荐理由/原文链接。
精选页: https://aihot.virxact.com/ 
公众号爆文页: https://aihot.virxact.com/mp

融合规则：AIHOT条目按标签融入日报对应板块，标注 [AIHOT:XX分]。公众号爆文作为国内动态补充。推荐分>=75优先S/A级。同一事件以AIHOT推荐理由为选题角度。
## Step 10锛氬井澶存潯瀛樻。

鏃ユ姤鍐欏叆鍚庣珛鍗崇敓鎴愶紝閫?-4鏉/A绾х儹鐐规敼鍐欎负鍙ｈ鍖栧井澶存潯锛?00-500瀛楋級锛屽瓨妗ｈ矾寰勶細
`D:\cybertomato\03-鍐呭宸ュ巶\鏃ユ姤\寰ご鏉″瓨妗{YYYY-MM-DD}-寰ご鏉?md`

瀛樻。鍗虫垚鍝侊紝涓嶈嚜鍔ㄥ彂甯冿紝鐢ㄦ埛璇淬€屽彂寰ご鏉°€嶆椂鐢?toutiao-auto 鍙戝竷銆?

## Step 11锛氱绾胯鎺ユ鏌ワ紙涓嶅彲璺宠繃锛?

```bash
ls D:/cybertomato/03-鍐呭宸ュ巶/鏃ユ姤/琛ュ厖淇℃伅/YYYYMMDD* 2>/dev/null
```
- 鏈夎ˉ鍏呮枃浠?鈫?鍛婄煡鐢ㄦ埛锛屾墽琛?ai-daily-report-merge
- 鏃犺ˉ鍏呮枃浠?鈫?姹囨姤銆屾棩鎶?鉁擄紝寰ご鏉?鉁擄紝鏃犺ˉ鍏呬俊鎭烦杩囪瀺鍚堛€?

## 妫€鏌ョ偣

| 妫€鏌ョ偣 | 鏃舵満 | 璇存槑 |
|--------|------|------|
| CP1 | 閲囬泦鍚庛€佸啓鏃ユ姤鍓?| 灞曠ず鏉＄洰鏁?鏍囬鎽樿锛岀敤鎴风‘璁よ鐩栭潰 |
| CP2 | **璺宠繃** | 鏍囬鑷鍐冲畾 |
| CP3 | 铻嶅悎鐗堣崏绋垮悗 | 灞曠ず棰勮锛岀敤鎴风‘璁ゅ垎绾?|

cron妯″紡璺宠繃鎵€鏈夋鏌ョ偣锛岄《閮ㄦ爣娉?`[鑷姩閲囬泦锛屾湭浜哄伐瀹℃牳]`銆?

## 鏁呴殰閫熸煡

| 闂 | 澶勭悊 |
|------|------|
| Windows缁堢杈撳嚭涓虹┖ | 鐢?browser_console expression 鎴?background=true |
| Jina杩斿洖绌?| 涓嶈渚濊禆Jina锛岀敤curl鎴杕cp_web_reader |
| curl鎻愬彇0鏉?| 妫€鏌ラ摼鎺ユ牸寮忓拰HTML缁撴瀯锛岃瑙乺eferences/ |
| Obsidian鍐欏叆500 | 涓枃璺緞鏈猆RL缂栫爜锛岀敤Node.js |
| web_search_prime 鍏ㄨ繑鍥炵┖ | 宸茬煡闂锛?娆′笉鍚屾煡璇㈠潎杩斿洖`[]`銆傞檷绾х敤 mcp_web_reader_webReader 鐩存帴鎶撴捣澶栨簮锛圚N銆乂entureBeat锛夛紝鎴栬烦杩囨悳绱㈣ˉ鍏?|
| VentureBeat web_reader 鍐呭鍋忔棫 | 椤甸潰鍙兘鏄紦瀛樼増锛堝疄娴嬭繑鍥?025-08鍐呭锛夛紝涓嶅彲浣滀负褰撳ぉ鏂伴椈婧愶紝浠呬綔鍘嗗彶鍙傝€?|
| 瀛怉gent缁堢涓嶅彲鐢?| 閲囬泦鍦ㄤ富浼氳瘽鐢╟url+Python瀹屾垚 |
| 绔欓暱涔嬪鏁版嵁鍋忔棫 | AIbase鍜?6姘洿鏂版洿蹇紝绔欓暱涔嬪褰撹ˉ鍏?|
| delegate_task鍋歸eb閲囬泦 | 涓嶉€傜敤锛屽瓙Agent鏃燙DP proxy鍜屽彲闈犵粓绔?|
| Python /tmp/ 璺緞 | Windows涓嶈瘑鍒玀INGW璺緞锛岀敤 D:/tmp/ |
| AIbase鏍囬甯﹀悗缂€ | textContent鍚€孹灏忔椂鍓?AIbase銆嶏紝闇€娓呮礂 |
| 36氪/站长之家 curl 返回空 | 动态渲染站点，必须用 browser snapshot（profile=openclaw），curl/web_fetch 均无效 |

## 璐ㄩ噺鏍囧噯

- 涓ユ牸鐢ㄤ簨瀹烇紝涓嶇紪閫?
- 姣忔潯闄勬潵婧愰摼鎺?
- 鎬绘潯鐩?15-25 鏉★紝鏂伴椈灏戞椂姣忔澘鍧楀彲鍑忓埌2鏉′笉鍑戞暟
- 姣忔潯姝ｆ枃鑷冲皯40-80瀛?
- 浜у搧绫诲繀椤绘湁鍔熻兘瀹氫綅鎻忚堪
- CDP浣跨敤鍚庡叧闂墍鏈夎嚜鍒涘缓tab


