﻿# IM Side Panel

这个目录放给 Codex Windows 使用的 IM 侧边面板原型。

## 目标

- 在线程旁展示当前桥接会话
- 展示 IM 最近消息和运行状态
- 复用 bridge service 的统一 API
- 后续可嵌入桌面壳或 Codex Windows 容器

## 当前访问方式

在 `codexBot/ui-console/server.mjs` 启动后，访问：

- `http://127.0.0.1:3210/im-side-panel/`

## 当前依赖接口

- `GET /api/bridge/thread-panel/bootstrap`
- `GET /api/bridge/thread-panel/thread`

## 共享契约

- 面板路由和数据约定来自 `/shared/types/bridge-contracts.mjs`
- 这样桌面壳、Web 控制台、后续 Codex Windows 容器都能复用同一套入口定义
