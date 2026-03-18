# BOT 使用流程

本文档总结在本地使用 `codexBot` / QQ bot 桥接的实际流程。

## 一、准备阶段

1. 进入项目目录

```powershell
cd F:\QBot01\codexBot
```

2. 检查本机环境

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-env.ps1
```

3. 确认真实运行配置已准备好

配置文件位置：

- `C:\Users\Administrator\.claude-to-im\config.env`

重点确认：

- `CTI_RUNTIME`
- `CTI_ENABLED_CHANNELS`
- `CTI_DEFAULT_WORKDIR`
- QQ / Telegram / 飞书 / Discord 对应凭据

4. 首次更新 vendor 依赖时，可执行：

```powershell
cd .\vendor\Claude-to-IM-skill
npm.cmd install
npm.cmd run build
cd ..\..
```

## 二、启动 bridge

常用控制命令：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 status
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 start
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 stop
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 logs 80
powershell -ExecutionPolicy Bypass -File .\scripts\bridge-control.ps1 doctor
```

推荐实际顺序：

1. 先看 `status`
2. 如未运行就 `start`
3. 如异常就先 `doctor`
4. 再看 `logs 80`

## 三、启动 Web 控制台

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\ui-console.ps1
```

浏览器访问：

- `http://127.0.0.1:3210`

## 四、日常使用 bot 的方法

### 方式 A：直接在 QQ 上使用

1. 确认 bridge 已运行
2. 在 QQ 私聊 bot 发消息
3. bot 通过 bridge 把消息转发给本地 Codex
4. Codex 结果再回传到 QQ

适合：

- 简单问答
- 状态确认
- 让 bot 帮你看日志、看配置、排查问题

### 方式 B：QQ + Web 控制台配合使用

推荐作为日常主流程。

1. 在 QQ 发消息给 bot
2. 同时打开 Web 控制台观察运行态
3. 通过控制台查看：
   - bridge 是否在线
   - 最近日志
   - 最近审计
   - 当前会话绑定
   - 对话详情
4. 如 bot 无响应，优先在控制台点：
   - 刷新状态
   - 查看日志
   - doctor
   - 一键诊断修复

## 五、控制台各区域怎么用

### 1. 远程桥接总览

用途：

- 看 bridge 是否在线
- 看 PID / runId / 启动时间
- 启动 / 停止 / 重启 bridge
- 修复 stale PID
- 一键诊断修复

### 2. 渠道配置页

用途：

- 设置 QQ / Telegram / 飞书 / Discord 凭据
- 保存配置
- 测试连接

建议：

- 修改凭据后先测试连接
- 再回总览页确认状态

### 3. 日志区

用途：

- 看 bridge 最近输出
- 观察实时日志流
- 判断是配置问题、额度问题、网络问题还是运行时异常

### 4. 会话绑定管理

用途：

- 看 `chatId -> sessionId` 绑定关系
- 停用或恢复绑定
- 辅助判断某个会话是否卡住

### 5. 对话中心 / 对话详情

用途：

- 按 PID 查看当前会话
- 按关键词搜索会话
- 打开弹窗查看完整消息
- 对消息按关键词和角色过滤

适合排查：

- bot 回复为空
- bot 回复成中间过程文本
- 某个 session 长时间无更新

### 6. 审计区

用途：

- 看最近入站 / 出站记录
- 按关键词、方向、渠道过滤
- 导出 JSON / CSV 留档

### 7. 运行告警 / 阈值设置

用途：

- 看 bridge 是否离线
- 看 doctor MISS 是否超阈值
- 看会话是否长时间静默
- 本地保存告警阈值

## 六、常见故障处理顺序

如果 bot 不回复，建议按这个顺序查：

1. `status` 看 bridge 是否在线
2. 控制台总览看是否 `已连接`
3. 看最近日志
4. 看最近审计是否收到消息
5. 看对话中心是否生成会话
6. 如异常，执行 `doctor`
7. 仍不行，再执行“一键诊断修复”

## 七、目前 bot 的典型工作方式

现在这套桥接更适合：

- 在 QQ 上发消息触发本地 Codex
- 在 Web 控制台里监控整个桥接过程
- 用对话详情、日志、审计来定位异常

一句话总结：

- QQ 用来“发起和接收”
- Web 控制台用来“设置、监控、排障”
