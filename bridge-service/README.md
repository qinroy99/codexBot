# Bridge Service

新的桥接核心目录，按后续重构目标预留边界：

- `api/`: 管理 API 和面板 API
- `core/`: 会话绑定、审计、审批、重试
- `runtime/`: Codex / Claude 等 Agent 运行时
- `store/`: 配置、绑定、消息、审计存储

当前第一步已落地：

- `api/thread-side-panel.mjs`
- `api/thread-panel-api.mjs`
- `../shared/types/bridge-contracts.mjs`
