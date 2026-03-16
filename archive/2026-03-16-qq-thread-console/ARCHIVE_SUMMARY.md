# 2026-03-16 QQ 线程控制台归档

## 归档目标

本次归档覆盖 2026-03-16 围绕 `QQ 桥接内容独立线程展示` 所做的代码、界面和运行验证工作，归档到 `codexBot` 仓库，便于后续维护、发布和回溯。

## 本次同步的程序文件

- `ui-console/server.mjs`
- `ui-console/public/index.html`
- `ui-console/public/app.js`
- `ui-console/public/styles.css`
- `scripts/ui-console.cmd`

以上文件已按 `F:\QBot01\bridge\claude-to-im` 当前已验证版本同步到 `codexBot`。

## 主要改动

### 1. QQ 会话改为线程聚合

- 后端按 `channelType + chatId` 聚合对话
- `GET /api/bridge/conversations` 返回线程级条目
- `GET /api/bridge/messages` 支持通过 `threadKey` 拉取整条线程
- 返回字段新增 `threadKey`、`sessionIds`、`sessionCount`、`messageCount`、`inboundCount`、`outboundCount` 等

### 2. Web 控制台改为左右分栏线程工作区

- 左侧显示线程清单
- 右侧显示固定详情面板
- 支持按渠道筛选
- 支持线程详情自动刷新
- 不再依赖旧的详情弹窗作为唯一查看方式

### 3. 左栏线程卡片进一步优化

- 增加最近更新时间格式化
- 增加“距今多久”显示
- 卡片结构更接近 IM 线程列表
- 统计信息压缩为适合左栏快速浏览的布局

### 4. 中文文案与脚本修复

- 线程区、详情区主要文案改为中文
- 使用实体和转义方式降低编码污染风险
- 修复 `scripts/ui-console.cmd` 内容异常问题

## 验收结果

### 语法校验

- `node --check ui-console/server.mjs` 通过
- `node --check ui-console/public/app.js` 通过

### 接口验收

在本机控制台服务启动后，以下请求已通过：

- `GET http://localhost:3210/` -> `200`
- `GET http://localhost:3210/api/bridge/conversations?channelType=qq`
- `GET http://localhost:3210/api/bridge/messages?threadKey=qq:87978A81AE78EB8229D1E227A3239A8A`

已确认：

- QQ 线程键为 `qq:87978A81AE78EB8229D1E227A3239A8A`
- 线程聚合接口返回 `messageCount: 68`
- 线程详情接口返回 `scope: "thread"`

## 归档建议

- 后续发布时可将本次改动视为 `QQ 线程视图` 相关版本基线
- 若继续演进，可在此目录下追加新的验收记录和回归说明
- 若需要对外发布，建议后续补一条正式 release note
