import { defineUserConfig } from "vuepress";
import { viteBundler } from "@vuepress/bundler-vite";
import { hopeTheme } from "vuepress-theme-hope";

export default defineUserConfig({
  bundler: viteBundler(),
  lang: "zh-CN",
  title: "苍何之旅",
  description: "记录技术实践、产品思考和独立开发历程",
  base: "/",

  head: [
    ["style", {}, `
      .vp-hero {
        padding: 86px 0 74px !important;
        background: radial-gradient(circle at 12% 12%, rgba(20, 124, 117, 0.18), rgba(0, 0, 0, 0) 34%),
                    radial-gradient(circle at 86% 18%, rgba(9, 109, 217, 0.18), rgba(0, 0, 0, 0) 32%),
                    linear-gradient(135deg, rgb(248, 251, 255), rgb(238, 245, 251) 48%, rgb(247, 239, 229)) !important;
        border-radius: 12px;
        margin: 2rem;
      }
      .vp-hero h1 {
        font-size: 2.8rem !important;
        font-weight: 600 !important;
        color: rgb(17, 24, 39) !important;
        line-height: 1.25 !important;
        margin-bottom: 1rem !important;
      }
      .vp-hero .vp-hero-description {
        font-size: 1.1rem !important;
        color: rgb(107, 114, 128) !important;
      }
      .vp-hero .vp-hero-actions {
        margin-top: 2rem;
      }
      .vp-hero .vp-hero-action {
        border-radius: 8px !important;
        padding: 0.75rem 1.5rem !important;
      }
      .vp-hero .vp-hero-action.primary {
        background: rgb(9, 109, 217) !important;
      }
      .vp-hero .vp-hero-action.secondary {
        background: rgba(9, 109, 217, 0.1) !important;
        color: rgb(9, 109, 217) !important;
      }
    `],
  ],

  theme: hopeTheme({
    hostname: "https://wildchen.github.io/aron-site",

    author: {
      name: "aronchen",
      url: "/about/",
    },

    logo: "",

    navbar: [
      { text: "首页", link: "/", icon: "home" },
      { text: "产品", link: "/products/", icon: "star" },
      { text: "会员", link: "/membership/", icon: "crown" },
      {
        text: "Blog",
        icon: "blog",
        children: [
          { text: "全部", link: "/article/", icon: "list" },
          { text: "长文", link: "/blog/longform/", icon: "newspaper" },
          { text: "短帖", link: "/blog/x/", icon: "x-twitter" },
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

    plugins: {
      docsearch: false,
    },
  }),
});