# 迁移指南：GitHub Pages → Cloudflare Pages

> 目标：将静态网站从 GitHub Pages 迁移到 Cloudflare Pages，获得边缘函数支持（可用于实现登录等功能）。

---

## 方案对比

| 特性 | GitHub Pages | Cloudflare Pages |
|------|-------------|------------------|
| 免费域名 | `wildchen.github.io` | `项目名.pages.dev` |
| 自定义域名 | 支持 | 支持 |
| 边缘函数 | ❌ | ✅ Workers（10 万次/天免费）|
| 登录/后端 | ❌ | ✅ KV + Workers |
| 带宽 | 100 GB/月（ soft limit）| 无限 |
| 构建次数 | 依赖 GitHub Actions | 500 次/月 |

---

## 方案 A：Git 集成自动部署（推荐）

最简单，配置一次后，每次 `git push` 自动构建部署。

### 步骤

#### 1. 注册/登录 Cloudflare

访问 [dash.cloudflare.com](https://dash.cloudflare.com)，用手机号或邮箱注册。

#### 2. 创建 Pages 项目

1. 左侧菜单点击 **Workers & Pages**
2. 点击 **Create application**
3. 选择 **Pages** 标签
4. 点击 **Connect to Git**
5. 授权 GitHub，选择仓库 `wildchen.github.io`

#### 3. 配置构建设置

| 配置项 | 值 |
|--------|-----|
| Project name | `aron-online-site` |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `npm run docs:build` |
| Build output directory | `docs/.vuepress/dist` |

> 注意：本项目使用 VuePress，构建产物在 `docs/.vuepress/dist`，不是默认的 `dist`。

#### 4. 环境变量（可选）

如果构建需要特殊环境变量，在 **Environment variables** 中添加。本项目默认不需要。

#### 5. 保存并部署

点击 **Save and Deploy**，等待 1-2 分钟。

部署成功后，你会获得：
- `https://aron-online-site.pages.dev`（免费域名）
- 每次 push 到 `main` 分支自动重新构建部署

#### 6. 自定义域名（可选）

1. 进入项目 Dashboard → **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入你的域名（如 `aronchen.com`）
4. 按提示配置 DNS（如果域名在 Cloudflare 管理，会自动配置）

---

## 方案 B：Wrangler CLI 手动部署

适合一次性部署，或不想连接 GitHub 仓库的场景。

### 步骤

#### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
# 或
npx wrangler --version
```

#### 2. 登录 Cloudflare

```bash
npx wrangler login
```

这会打开浏览器让你授权。授权完成后，CLI 会保存 token。

#### 3. 创建 Pages 项目

```bash
npx wrangler pages project create aron-online-site
```

#### 4. 部署构建产物

```bash
npm run docs:build
npx wrangler pages deploy docs/.vuepress/dist --project-name=aron-online-site
```

#### 5. 后续更新

每次修改后重复步骤 4 即可。

---

## 迁移后的变化

### 需要修改的文件

1. **`docs/.vuepress/config.ts` 中的 `base`**
   - GitHub Pages 使用 `base: "/"`（根域名）
   - Cloudflare Pages 默认也使用根域名，无需修改
   - 如果使用子路径（如 `aron-online-site.pages.dev/blog`），需要改为 `base: "/blog/"`

2. **删除 GitHub Actions 工作流（如果有）**
   - 检查 `.github/workflows/` 目录
   - 如果使用 Cloudflare Git 集成，不再需要 GitHub Actions 部署

3. **更新仓库链接**
   - 检查项目中是否有硬编码的 `wildchen.github.io` 链接
   - 替换为新的 Cloudflare Pages 域名

### 保留的内容

- 所有 Markdown 内容
- 所有 VuePress/Theme Hope 配置
- 所有自定义样式（SCSS）
- 所有图片和资源文件

---

## 实现登录功能

迁移到 Cloudflare Pages 后，可以通过 Workers + KV 实现登录。

### 架构

```
用户浏览器 → Cloudflare Pages（静态站点）
                 ↓
         Cloudflare Workers（边缘函数，处理登录逻辑）
                 ↓
         Cloudflare KV（存储用户 token 或简单用户数据）
```

### 简单示例

在项目中创建 `functions/api/login.js`：

```javascript
export async function onRequestPost(context) {
  const { request, env } = context;
  const { username, password } = await request.json();
  
  // 简单验证（实际应用应使用哈希密码）
  if (username === "admin" && password === "your-password") {
    const token = crypto.randomUUID();
    await env.KV_USERS.put(token, username, { expirationTtl: 86400 });
    return new Response(JSON.stringify({ token }), {
      headers: { "Content-Type": "application/json" }
    });
  }
  
  return new Response("Unauthorized", { status: 401 });
}
```

### 部署 Workers

1. 在 Cloudflare Dashboard 中创建 KV namespace
2. 绑定到 Pages 项目（Settings → Functions → KV namespace bindings）
3. 提交代码后自动部署

> 详细实现方案待确定需求后再设计。

---

## 常见问题

**Q: 迁移后 GitHub Pages 还能访问吗？**
A: 可以，两者可以同时运行。在 Cloudflare 自定义域名配置完成前，GitHub Pages 作为 fallback。

**Q: 免费额度够用吗？**
A: 个人网站完全够用。Workers 每天 10 万次调用，Pages 无限带宽，KV 1GB 存储。

**Q: 需要改代码吗？**
A: 基本不需要。只有 `base` 路径和硬编码域名可能需要调整。

**Q: 构建失败了怎么办？**
A: 在 Cloudflare Dashboard → Pages → 项目 → Deployments 中查看构建日志，错误信息和本地 `npm run docs:build` 一致。

---

## 下一步

1. 选择方案 A 或方案 B
2. 按步骤完成迁移
3. 验证新域名可访问
4. 如需登录功能，继续设计 Workers + KV 方案
