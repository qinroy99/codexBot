# Security Policy

## Supported Versions

当前主要维护分支：

- `main`
- 最新 tag 对应版本

## Reporting a Vulnerability

如果你发现以下问题，请不要直接公开提交敏感细节：

- bridge 权限绕过
- 用户数据泄露
- token / secret 暴露
- 任意命令执行
- 审计或会话数据越权访问

建议通过私下渠道联系维护者，并尽量提供：

- 影响范围
- 复现步骤
- 预期与实际结果
- 日志片段（务必脱敏）

## Sensitive Data Rules

请不要在 issue、PR、日志截图中公开这些信息：

- Bot Token
- App Secret
- API Key
- 用户隐私数据
- `C:\Users\Administrator\.claude-to-im` 中的真实敏感配置

## Handling

收到安全问题后，建议流程：

1. 先确认是否可复现
2. 评估影响范围
3. 优先修复高风险问题
4. 修复后再公开必要说明
