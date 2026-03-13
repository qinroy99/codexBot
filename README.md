# codexBot

一个面向 `Claude-to-IM` / `Codex` 的桥接与监控项目，当前以 `QQ 私聊桥接 + Web 控制台` 为核心。

## 包含内容

- IM bridge 控制脚本
- `Claude-to-IM-skill` vendor 副本
- Web 控制台：状态、日志、会话、审计、诊断、修复
- QQ / Telegram / 飞书 / Discord 配置页
- 审计导出、消息过滤、告警阈值设置

## 目录

- `scripts/`：启动、检查、配置脚本
- `ui-console/`：Web 控制台
- `vendor/Claude-to-IM-skill/`：桥接核心依赖
- `config/`：本地配置模板
- `.env.example`：环境变量样例

## 启动 Web 控制台

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\ui-console.ps1
```

默认地址：

- `http://127.0.0.1:3210`

## 常用脚本

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 status
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 start
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 stop
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 logs 80
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 doctor
```

## 说明

- `bridge-control.ps1` 优先使用仓库内 `vendor\Claude-to-IM-skill`，找不到时再回退到已安装 skill
- 控制台运行依赖本机 `node`
- 真实运行配置和日志仍位于 `C:\Users\Administrator\.claude-to-im`
- 本仓库不包含任何生产密钥或用户数据
