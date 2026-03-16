# Changelog

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
