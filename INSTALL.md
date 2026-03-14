# 安装指南

本文档用于在 Windows 环境安装和运行 `codexBot` 的纯 Web 版。

## 1. 环境要求

需要提前安装：

- Git
- Node.js
- npm
- Codex CLI
- Windows PowerShell

建议先执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-env.ps1
```

## 2. 获取项目

如果直接使用当前仓库：

```powershell
git clone https://github.com/qinroy99/codexBot.git
cd codexBot
```

如果使用离线包：

- 解压 `codexBot-web-20260313.zip`
- 进入解压后的项目目录

## 3. 安装 vendor 依赖

`codexBot` 已包含 `vendor/Claude-to-IM-skill`，首次使用前建议安装它的依赖：

```powershell
cd .\vendor\Claude-to-IM-skill
npm.cmd install
npm.cmd run build
cd ..\..
```

## 4. 准备运行配置

真实运行配置不放在仓库中，而是放在：

- `C:\Users\Administrator\.claude-to-im\config.env`

可参考：

- `.env.example`
- `vendor\Claude-to-IM-skill\config.env.example`

至少需要确认：

- 运行时类型
- 默认工作目录
- 启用渠道
- QQ / Telegram / 飞书 / Discord 的对应凭据

## 5. 启动 bridge 控制

常用命令：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 status
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 start
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 stop
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 logs 80
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 doctor
```

## 6. 启动 Web 控制台

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\ui-console.ps1
```

打开浏览器：

- `http://127.0.0.1:3210`

## 7. 控制台可做什么

- 查看 bridge 状态
- 启动 / 停止 / 重启 bridge
- 查看实时日志
- 管理渠道配置
- 查看会话绑定和审计记录
- 查看对话详情与过滤消息
- 导出审计 JSON / CSV
- 执行 doctor 和一键诊断修复

## 8. 常见问题

### 控制台打不开

先确认端口是否被占用，并检查：

```powershell
node -v
powershell -ExecutionPolicy Bypass -File .\scripts\ui-console.ps1
```

### bridge 无法启动

优先执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 doctor
```

### 会话绑定切换失败

通常是 `C:\Users\Administrator\.claude-to-im\data` 写权限不足。

### 渠道测试连接失败

优先检查：

- 本机外网连通性
- 代理配置
- Bot 凭据是否正确
