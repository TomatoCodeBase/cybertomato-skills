---
domain: appfyzwlxtv3046.h5.xet.citv.cn
aliases: [小鹅通, xiaoeknow, xet]
updated: 2026-04-04
---
## 平台特征
- 小鹅通（xiaoe-tech）课程平台，Vue SPA架构
- 课程专栏页目录有分页，pageSize=8，需通过Vue组件方法加载更多
- 默认排序为desc（倒序），切换sort=0为正序
- 课程内容页是音频+文字稿，文字稿在DOM中直接可见
- 用户Chrome天然携带登录态，可直接访问已购课程

## 有效模式
- 获取完整课程列表：通过Vue组件 `getColumnList()` 分页加载
  ```js
  let v = document.querySelector('.column[data-v-2feb7b54]').__vue__;
  v.page = 2; v.getColumnList(); // 加载第2页
  ```
- 课程详情页文字稿可直接从 `document.body.innerText` 提取
- 图片在DOM的img标签中，部分为CDN链接可直接下载
- PowerShell中传中文给curl.exe需用文件方式或避免直接嵌入

## 已知陷阱
- 课程目录页默认只显示8个课程，第9课之后需分页加载
- 倒序排列导致课程编号不连续，需先切换为正序(sort=0)
- 课程音频链接ID不等于课程编号（如a_5c1206e807d28不是第10课）
- 点击list-item不会跳转URL（SPA内部路由），需通过Vue组件获取数据
- PowerShell curl是Invoke-WebRequest别名，需用curl.exe
- PowerShell传中文参数给CDP eval会编码错误，需先写JS文件再读取传递

## 关键CSS选择器
- 课程列表项：`.list-item`
- Vue根组件：`.column[data-v-2feb7b54]`
- 评论区域：`section.commentItem-main`
