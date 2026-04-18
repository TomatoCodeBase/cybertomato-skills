---
domain: aipoju.com
aliases: [AI破局, 破局官网, AI破局俱乐部]
updated: 2026-04-16
---

## 平台特征

- Ant Design React SPA，无 isTrusted 限制
- 打卡页面 URL 格式：`/user/task-clock-in/{groupId}/{taskId}/{taskName}`
- 需登录态（用户 Chrome 天然携带）
- 打卡表单为4个 textarea + 图片上传 + 打卡按钮

## 有效模式

### 打卡表单填值（2026-04-16 验证）

表单字段 ID：
| 字段 | ID | 必填 |
|------|----|------|
| 今日行动 | `form_item_todayAction` | 是 |
| 今日收获 | `form_item_todayAchievement` | 是 |
| 好事分享 | `form_item_goodThingsShare` | 否 |
| 下一步行动 | `form_item_nextAction` | 是 |

填值方式：`nativeSetter` + `Event('input')` + `Event('change')`，标准 React 方案，可靠。
中文内容需写入 .js 文件用 `curl --data-binary @file` 传递（MINGW64 编码陷阱）。

打卡按钮选择器：`button.ant-btn-primary`
CDP `/click` 可直接触发，无需 `/clickAt`。

### 成功判断

打卡成功后页面出现"右键点击，保存行动海报"文案和行动海报图片。

## 已知陷阱

- 无特殊陷阱。Ant Design React 标准行为，不像 Angular 有 isTrusted 限制。
