import { defineUserConfig } from "vuepress";
import { viteBundler } from "@vuepress/bundler-vite";
import { hopeTheme } from "vuepress-theme-hope";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* ── 构建时生成搜索索引 ── */
const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, "..");

function scanMd(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      scanMd(p, out);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(p);
    }
  }
  return out;
}

function parseFrontmatter(content: string): Record<string, string> {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const obj: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      val = val.replace(/^["']|["']$/g, "");
      obj[key] = val;
    }
  }
  return obj;
}

function extractH1(content: string): string | undefined {
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, "");
  const m = body.match(/^#\s+(.+)$/m);
  return m?.[1]?.trim();
}

function extractText(content: string): string {
  let text = content.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, "");
  text = text
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+?)\]\([^)]+?\)/g, "$1")
    .replace(/[#*`~\->|]/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 300);
}

function mdToUrl(filePath: string, baseDir: string): string {
  let rel = relative(baseDir, filePath).replace(/\\/g, "/");
  rel = rel.replace(/\.md$/, ".html");
  if (rel === "README.html") return "/";
  if (rel.endsWith("/README.html")) return "/" + rel.slice(0, -"README.html".length);
  return "/" + rel;
}

const mdFiles = scanMd(docsDir).filter((f) => !f.includes(".vuepress"));
const searchIndex = mdFiles
  .map((f) => {
    const content = readFileSync(f, "utf-8");
    const fm = parseFrontmatter(content);
    const h1 = extractH1(content);
    const text = extractText(content);
    const url = mdToUrl(f, docsDir);
    return {
      title: fm.title || h1 || basename(f, ".md"),
      url,
      text,
    };
  })
  .filter(
    (item) =>
      item.title &&
      item.url !== "/login.html" &&
      item.url !== "/admin.html"
  );

writeFileSync(
  join(docsDir, ".vuepress/public/search-index.json"),
  JSON.stringify(searchIndex, null, 2)
);
/* ── 搜索索引生成结束 ── */

export default defineUserConfig({
  bundler: viteBundler(),
  lang: "zh-CN",
  title: "Language shapes our world",
  description: "记录技术实践、产品思考和独立开发历程",
  base: "/",
  appearance: true,

  head: [
    ["link", { rel: "stylesheet", href: "//at.alicdn.com/t/font_3180624_7cy10l7jqqh.css" }],
    ["link", { rel: "icon", type: "image/png", href: "/favicon.png" }],
    ["link", { rel: "apple-touch-icon", href: "/apple-touch-icon.png" }],
    ["script", { src: "/auth.js?v=6", defer: true }],
    ["script", { src: "/comments.js", defer: true }],
  ],

  theme: hopeTheme({
    hostname: "https://wildchen.github.io",

    author: {
      name: "aronchen",
      url: "/about.html",
    },

    logo: "/logo.png",

    repo: "https://github.com/WildChen/wildchen.github.io",
    repoDisplay: true,

    navbar: [
      { text: "首页", link: "/", icon: "home" },
      { text: "产品", link: "/products.html", icon: "star" },
      { text: "会员", link: "/membership.html", icon: "crown" },
      { text: "登录", link: "/login.html", icon: "right-to-bracket" },
      {
        text: "Blog",
        icon: "blog",
        children: [
          { text: "全部", link: "/article.html", icon: "list" },
          { text: "长文（公众号）", link: "/blog/longform.html", icon: "newspaper" },
          { text: "短帖（X）", link: "/blog/x.html", icon: "x-twitter" },
        ],
      },
      { text: "专栏", link: "/series.html", icon: "layer-group" },
      { text: "开源项目", link: "/oss.html", icon: "code-branch" },
      { text: "关于", link: "/about.html", icon: "circle-user" },
      { text: "控制台", link: "/admin.html", icon: "cog" },
    ],

    sidebar: false,

    footer: "MIT Licensed | Copyright © 2026 aronchen",
    displayFooter: true,

    blog: false,
    editLink: false,
    contributors: false,
    lastUpdated: false,

    docsDir: "docs",
    iconAssets: "fontawesome",
    toc: false,
  }),
});
