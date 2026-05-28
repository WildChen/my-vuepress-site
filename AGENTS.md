# Agent 工作规范

## 部署验证规则

任何代码变更后，必须按以下流程执行：

1. **本地构建通过** — 运行 `npm run docs:build` 确认无报错
2. **推送到远端** — `git commit` 并 `git push origin main`
3. **访问网站验证** — 打开 `https://wildchen.github.io/` 确认变更效果正确后再报告完成

> 不要仅依赖构建成功就断言完成，必须实际访问线上页面验证视觉和位置是否符合预期。

## 系统通知偏好

用户使用 macOS，要求每次任务完成后发送系统级通知（右上角横幅）。

**技术方案**：`terminal-notifier`（通过 `-sender com.microsoft.VSCode` 显示 VSCode 图标）

**快捷脚本**：`/Users/aron/.local/bin/kimi-notify`
```bash
#!/bin/bash
APP_NAME="${1:-aron-online-site}"
MESSAGE="${2:-任务已完成}"
# 限制约 2 行（140 字符）
[ ${#MESSAGE} -gt 140 ] && MESSAGE="${MESSAGE:0:140}…"
/tmp/terminal-notifier.app/Contents/MacOS/terminal-notifier \
    -title "$APP_NAME" \
    -message "$MESSAGE" \
    -sender "com.microsoft.VSCode" \
    -sound "Glass"
```

**调用时机**：每次完成任务并线上验证通过后。

**通知格式**：
- 图标：VSCode 应用图标
- 标题：工程名（如 `aron-online-site`）
- 内容：简要结果（最多约 2 行）

**前台感知**：
- VSCode 在前台时**不发送通知**（避免打扰）
- VSCode 不在前台时正常弹出横幅
- 切回 VSCode 后横幅自动消失（macOS 默认行为，因 `-sender` 归属 VSCode）
