import { defineUserConfig } from "vuepress";
import { viteBundler } from "@vuepress/bundler-vite";
import { hopeTheme } from "vuepress-theme-hope";

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
    ["script", { src: "/auth.js?v=4", defer: true }],
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
