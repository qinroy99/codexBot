# UI Console

Web 控制台目录：

- `ui-console/`

## 启动

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\ui-console.ps1
```

默认地址：

- `http://127.0.0.1:3210`

## 当前能力

- 远程桥接总览
- Telegram / 飞书 / Discord / QQ 配置页
- 启动 / 停止 / 重启 bridge
- bridge 状态查看
- SSE 实时日志流
- 日志自动刷新与断线重连
- stale PID 一键修复
- Telegram / 飞书 / Discord / QQ 渠道测试连接
- 会话绑定管理
- 最近审计查看
- doctor 诊断结果查看
- 一键诊断修复
- 运行告警面板与浏览器通知
- 诊断建议模板
- 对话中心与消息详情弹窗
- 对话搜索 / 消息过滤 / 审计导出 / 告警阈值设置

## 新增接口

- `GET /api/bridge/conversations?pid=&q=&active=`
- `GET /api/bridge/messages?sessionId=&limit=&q=&role=`
- `GET /api/bridge/audit?limit=&q=&direction=&channelType=`
- `GET /api/bridge/audit/export?format=json|csv&limit=&q=&direction=&channelType=`

## 技术说明

- 管理 API 使用 Node 内置 `http`
- 配置读写目标：`C:\Users\Administrator\.claude-to-im\config.env`
- 运行态读取目标：`status.json`、`bridge.log`、`bindings.json`、`audit.json`、`sessions.json`、`data/messages/*.json`
- `doctor.ps1` 在受限环境下若无法拉起，会自动回退到内置诊断逻辑

## 当前限制

- 渠道测试连接依赖外网连通性，离线环境下会返回网络错误
- 若运行环境对 `C:\Users\Administrator\.claude-to-im\data` 没有写权限，会话绑定的停用/恢复会返回权限错误
- 告警阈值当前保存在浏览器本地 `localStorage`
- 会话过滤里如果指定 PID 但绑定数据未记录 PID，结果可能为空；这时可先清空 PID 过滤再查
