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
    ["link", { rel: "icon", href: "/spongebob.jpg" }],
  ],

  theme: hopeTheme({
    hostname: "https://wildchen.github.io",

    author: {
      name: "aronchen",
      url: "/about/",
    },

    repo: "https://github.com/WildChen/wildchen.github.io",
    repoDisplay: true,

    navbar: [
      { text: "首页", link: "/", icon: "home" },
      { text: "产品", link: "/products/", icon: "star" },
      { text: "会员", link: "/membership/", icon: "crown" },
      {
        text: "Blog",
        icon: "blog",
        children: [
          { text: "全部", link: "/article/", icon: "list" },
          { text: "长文（公众号）", link: "/blog/longform/", icon: "newspaper" },
          { text: "短帖（X）", link: "/blog/x/", icon: "x-twitter" },
        ],
      },
      { text: "专栏", link: "/series/", icon: "layer-group" },
      { text: "开源项目", link: "/oss/", icon: "code-branch" },
      { text: "关于", link: "/about/", icon: "circle-user" },
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
  }),
});
