# Agent 工作规范

## 部署验证规则

任何代码变更后，必须按以下流程执行：

1. **本地构建通过** — 运行 `npm run docs:build` 确认无报错
2. **推送到远端** — `git commit` 并 `git push origin main`
3. **访问网站验证** — 打开 `https://wildchen.github.io/` 确认变更效果正确后再报告完成

> 不要仅依赖构建成功就断言完成，必须实际访问线上页面验证视觉和位置是否符合预期。
