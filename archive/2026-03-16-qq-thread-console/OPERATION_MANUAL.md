# codexBot 桥接操作手册

## 1. 适用范围

本手册面向 `F:\QBot01\codexBot` 当前这套纯 Web 版桥接项目，核心场景是：

- QQ 私聊 bot 与本地 Codex 桥接
- Web 控制台配置、监控和排障
- 通过线程视图查看 QQ 对话历史

## 2. 程序目录

项目根目录：`F:\QBot01\codexBot`

关键目录：

- `scripts/`：桥接与控制台启动脚本
- `ui-console/`：Web 控制台服务与前端页面
- `vendor/Claude-to-IM-skill/`：桥接核心依赖
- `config/`：本地模板和辅助配置

真实运行数据目录：`C:\Users\Administrator\.claude-to-im`

关键运行文件：

- `config.env`：桥接配置
- `runtime\bridge.pid`：桥接进程 PID
- `runtime\status.json`：运行状态
- `logs\bridge.log`：桥接日志
- `data\bindings.json`：会话绑定
- `data\audit.json`：审计记录
- `data\sessions.json`：会话索引
- `data\messages\`：消息存档

## 3. 环境准备

### 3.1 进入目录

```powershell
cd F:\QBot01\codexBot
```

### 3.2 检查本机环境

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-env.ps1
```

### 3.3 确认桥接配置存在

配置文件：`C:\Users\Administrator\.claude-to-im\config.env`

至少确认以下项：

- `CTI_RUNTIME=codex`
- `CTI_ENABLED_CHANNELS` 包含 `qq`
- `CTI_DEFAULT_WORKDIR` 指向可工作的目录
- QQ 对应 `App ID`、`App Secret` 已配置

如果你更新过 vendor 依赖，建议执行：

```powershell
cd .\vendor\Claude-to-IM-skill
npm.cmd install
npm.cmd run build
cd ..\..
```

## 4. 启动与停止

### 4.1 桥接控制命令

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 status
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 start
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 stop
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 logs 80
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 doctor
```

推荐顺序：

1. 先执行 `status`
2. 未运行则执行 `start`
3. 异常时执行 `doctor`
4. 再查看 `logs 80`

### 4.2 启动 Web 控制台

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\ui-console.ps1 start
```

也可以直接执行：

```powershell
.\scripts\ui-console.cmd
```

默认地址：`http://127.0.0.1:3210`

## 5. 日常使用流程

### 5.1 只用 QQ

适合简单问答和快速操作。

1. 确认 bridge 已运行
2. 在 QQ 私聊 bot 发送消息
3. bridge 将消息转发给本地 Codex
4. Codex 结果再回传给 QQ

### 5.2 QQ + Web 控制台联动

这是推荐主流程。

1. 打开控制台 `http://127.0.0.1:3210`
2. 在 QQ 私聊 bot 发送消息
3. 在控制台中观察状态、日志和线程变化
4. 必要时进入线程详情查看完整消息

## 6. 控制台模块说明

### 6.1 总览区

用途：

- 查看 bridge 在线状态
- 查看 PID、运行时、启动时间
- 执行启动、停止、重启
- 处理 stale PID
- 执行一键诊断修复

### 6.2 渠道配置区

用途：

- 保存 QQ / Telegram / 飞书 / Discord 配置
- 测试渠道配置是否有效

建议：

- 修改凭据后先测试
- 再回总览区确认状态恢复正常

### 6.3 日志区

用途：

- 查看 bridge 最近输出
- 观察 SSE 实时日志流
- 快速判断配置、网络或运行时错误

### 6.4 会话绑定区

用途：

- 查看 `chatId -> sessionId` 绑定关系
- 停用或恢复绑定
- 辅助判断某条桥接链路是否卡住

### 6.5 QQ 线程工作区

这是本次新增的重点区域。

左侧线程清单：

- 按 `channelType + chatId` 聚合显示线程
- 显示最近更新时间、距今多久、消息统计
- 可按渠道过滤，QQ 可单独查看

右侧线程详情：

- 固定展示当前线程的聚合详情
- 显示关联会话数、总消息数、过滤后消息数
- 可持续刷新，适合观察一条 QQ 线程的完整往来

### 6.6 审计区

用途：

- 查看最近入站和出站记录
- 按关键词、方向、渠道过滤
- 导出 JSON / CSV 留档

### 6.7 运行告警区

用途：

- 查看 bridge 离线、静默或诊断异常提醒
- 配置本地阈值
- 作为日常巡检入口

## 7. 线程视图的实际用法

### 7.1 看某个 QQ 用户是否已经形成独立线程

1. 打开线程工作区
2. 渠道筛选选择 `QQ`
3. 在左栏找到对应 `chatId` 线程
4. 点击后在右侧查看详情

### 7.2 看某次桥接是否有完整回传

1. 在左栏选中线程
2. 观察右侧 `当前 / 过滤后 / 总计` 消息计数
3. 查看最后几条消息是否包含用户输入与 Codex 输出

### 7.3 看一个 QQ 用户是否被分裂到多个会话

1. 打开线程详情
2. 关注 `关联会话` 数量
3. 如数量大于 1，说明同一 QQ 用户在桥接层对应了多个 session

## 8. 常见故障处理顺序

如果 QQ 端不回复，按以下顺序排查：

1. 执行 `status`，确认 bridge 是否在线
2. 打开控制台首页，确认总览区是否在线
3. 查看最近日志
4. 查看最近审计，确认消息是否进入桥接
5. 查看 QQ 线程工作区，确认线程是否生成
6. 查看线程详情，确认是否有回传消息
7. 执行 `doctor`
8. 如仍异常，再执行一键诊断修复

## 9. 常用验收命令

控制台服务启动后，可用以下命令快速验收：

```powershell
Invoke-WebRequest -Uri 'http://localhost:3210/' -UseBasicParsing
Invoke-WebRequest -Uri 'http://localhost:3210/api/bridge/conversations?channelType=qq' -UseBasicParsing
Invoke-WebRequest -Uri 'http://localhost:3210/api/bridge/messages?threadKey=qq:87978A81AE78EB8229D1E227A3239A8A' -UseBasicParsing
```

## 10. 结论

当前推荐工作方式：

- 在 QQ 上发起和接收消息
- 在 Web 控制台里配置、监控和排障
- 在 QQ 线程工作区中查看独立线程和完整消息历史
