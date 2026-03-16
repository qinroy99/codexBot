# Release Notes v0.1.2

发布日期：2026-03-16

## 本次更新

- QQ 对话中心升级为线程聚合视图
- Web 控制台新增左栏线程清单与右侧固定详情
- 线程卡片增加最近时间、距今显示和紧凑统计信息
- 新增本次改动归档说明与桥接操作手册

## 适合谁

- 主要通过 QQ 私聊与本地 Codex 交互的用户
- 需要在控制台里按线程查看消息历史的用户
- 需要保留运维文档和归档记录的维护者

## 主要内容

- `ui-console/server.mjs` 线程聚合接口
- `ui-console/public/` 线程工作区界面
- `archive/2026-03-16-qq-thread-console/` 归档与手册
- `scripts/ui-console.cmd` 启动脚本修复

## 验收结论

- 控制台首页请求返回 `200`
- QQ 线程列表接口可正常返回聚合线程
- 线程详情接口可通过 `threadKey` 返回整条消息历史

## 备注

- 当前仍为纯 Web 版，不包含桌面壳
- 真实运行配置与日志位于 `C:\Users\Administrator\.claude-to-im`
