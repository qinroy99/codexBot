# Changelog

## v0.2.0 - 2026-03-18

### Added

- 新增 `bridge-service / shared / windows-host` 目录边界，为 Codex Windows 版 IM 桥接预留独立宿主结构
- 新增 IM side panel 原型和共享线程契约，可通过 `/im-side-panel` 与 `/shared/` 复用
- 线程详情页升级为 Agent 时间线视图，按消息来源、工具步骤、入站/出站状态分层展示
- 工作区绑定页支持默认工作目录、默认模式、默认模型与是否透传模型配置
- 新增 `ARCHITECTURE.md`、`BOT_USAGE.md` 与桥接服务说明文档

### Changed

- `ui-console/server.mjs` 抽出 `thread-panel-api`，线程面板 bootstrap/detail 查询改为 bridge-service API 适配层
- QQ 适配器与 bridge manager 增加消息级日志，便于核对入站、处理、回包和投递结果
- Windows supervisor 修复 `PATH/Path` 冲突导致的后台启动失败，并统一按 UTF-8 读取日志
- bridge 状态写盘会在成功启动和正常停止时清空 `lastExitReason`
- 控制台 UI 重构为左侧导航 + 多面板工作台，新增远程桥接、工作区绑定、线程详情等视图

### Security

- 补充仓库级忽略规则，避免 `.env`、`config.env`、runtime 数据、日志与 release 制品误入版本库
- 继续保持真实运行配置与密钥仅存放在 `C:\Users\Administrator\.claude-to-im`

### Verification

- `node --check ui-console/public/app.js`
- `node --check ui-console/server.mjs`
- QQ 实测通过：入站、bridge 处理、Codex 回包、出站投递日志闭环可见

## v0.1.2 - 2026-03-16

### Changed

- QQ 对话从会话列表升级为线程聚合视图
- `GET /api/bridge/conversations` 返回线程级数据
- `GET /api/bridge/messages` 支持 `threadKey` 聚合读取
- Web 控制台新增左栏线程清单 + 右侧固定详情布局
- 线程卡片新增最近时间、距今显示和紧凑统计信息
- 修复 `scripts/ui-console.cmd` 启动内容异常问题

### Docs

- 新增 `archive/2026-03-16-qq-thread-console/ARCHIVE_SUMMARY.md`
- 新增 `archive/2026-03-16-qq-thread-console/OPERATION_MANUAL.md`
- 新增 `RELEASE_NOTES_v0.1.2.md`
- 新增 `.github/release-notes/v0.1.2.md`

## v0.1.1 - 2026-03-14

### Added

- README 仓库预览图
- `INSTALL.md` 安装说明
- `RELEASE_NOTES_v0.1.1.md`
- `.github/release-notes/v0.1.1.md`

## v0.1.0 - 2026-03-14

### Added

- 独立 `codexBot` Web 项目仓库
- 纯 Web 控制台发布形态
- QQ / Telegram / 飞书 / Discord 配置页
- bridge 启动、停止、重启、日志、doctor 能力
- SSE 实时日志流
- 会话绑定管理、对话中心、消息详情弹窗
- 消息搜索 / 过滤、审计筛选 / 导出
- 运行告警、建议模板、告警阈值设置
- 一键诊断修复与 stale PID 修复

### Packaging

- 生成 Web ZIP 包
- 生成 Git bundle 包
- 推送到 GitHub 仓库 `qinroy99/codexBot`
