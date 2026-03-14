# Contributing

感谢你参与 `codexBot`。

## 提交前建议

- 先阅读 `README.md` 和 `INSTALL.md`
- 确认你的改动是否影响 bridge 运行路径或本地配置路径
- 不要提交任何真实密钥、token、用户隐私或运行数据

## 开发原则

- 默认保持纯 Web 版方向
- 优先兼容现有 `Claude-to-IM-skill` vendor 结构
- 修改 bridge 行为时，尽量同步更新 `README.md`、`INSTALL.md`、`CHANGELOG.md`
- 避免把本地机器路径再次硬编码回脚本

## 提交流程

1. Fork 或基于当前仓库新建分支
2. 完成改动后自检
3. 补充必要文档
4. 提交 Pull Request

## 自检清单

- `ui-console/server.mjs` 语法通过
- 前端脚本没有明显语法错误
- 关键脚本仍可从仓库根目录运行
- 文档与实际行为一致

## 不应提交的内容

- `C:\Users\Administrator\.claude-to-im` 下的真实运行数据
- token、secret、账号信息
- 与当前任务无关的大型构建产物

## PR 建议说明

请在 PR 中写清楚：

- 改了什么
- 为什么要改
- 如何验证
- 是否影响现有桥接用户
