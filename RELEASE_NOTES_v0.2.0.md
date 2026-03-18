# Release Notes v0.2.0

发布日期：2026-03-18

## 本次更新

- 控制台升级为更完整的 Windows 风格桥接工作台
- 新增工作区绑定页，可保存默认工作目录、模式和模型策略
- 线程详情页升级为 Agent 时间线视图，支持工具步骤、状态、重试信息展示
- 补齐 `bridge-service`、`shared`、`windows-host` side panel 原型
- QQ 链路增加消息级日志，排障时可直接核对入站与回包

## 适合谁

- 需要把 Codex 工作流桥接到 QQ 等即时通讯工具的 Windows 用户
- 需要在本地控制台里查看线程详情、绑定关系和桥接状态的维护者
- 需要更清晰排查 QQ 入站、处理、回包链路的运维人员

## 主要内容

- `ui-console/public/` 多面板 UI 与线程时间线
- `bridge-service/api/` 线程面板 API 适配层
- `shared/types/bridge-contracts.mjs` 共享契约
- `windows-host/im-side-panel/` Codex Windows 版侧边面板原型
- `vendor/Claude-to-IM-skill/` QQ 日志增强、Windows supervisor 修复、状态清理

## 验收结论

- `http://127.0.0.1:3210` 控制台页面可正常登录和浏览
- QQ 测试消息已确认完成入站、处理、回包与投递
- 日志中文显示恢复正常，不再依赖错误编码展示

## 隐私与配置

- 本次 release 不包含真实 API key、QQ App ID、QQ App Secret
- 真实运行配置、日志和消息数据仍位于 `C:\Users\Administrator\.claude-to-im`
- 仓库中仅保留模板配置与脱敏逻辑
