/**
 * 搜索功能自测用例
 * 运行方式：node tests/search.test.js
 * 前置条件：npm run docs:build（生成 search-index.json）
 */

const fs = require("fs");
const path = require("path");

// ── 读取构建生成的搜索索引 ──
const INDEX_PATH = path.join(__dirname, "..", "docs", ".vuepress", "dist", "search-index.json");
let FULL_INDEX = [];
try {
  FULL_INDEX = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
} catch (e) {
  console.error("❌ 无法读取搜索索引，请先执行 npm run docs:build");
  console.error("   错误:", e.message);
  process.exit(1);
}

// ── 模拟 auth.js 中的搜索逻辑 ──
function doSearch(query, pages) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return pages.filter((p) => {
    const title = (p.title || "").toLowerCase();
    const text = (p.text || "").toLowerCase();
    return title.includes(q) || text.includes(q);
  });
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text, query) {
  const q = escapeRegExp(query.trim());
  if (!q) return text;
  return text.replace(new RegExp("(" + q + ")", "gi"), '<mark style="background:#fef08a">$1</mark>');
}

function excerpt(text, query) {
  if (!text) return "";
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();
  const idx = t.indexOf(q);
  let snippet;
  if (idx === -1) {
    snippet = text.slice(0, 90);
  } else {
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + q.length + 50);
    snippet = text.slice(start, end);
    if (start > 0) snippet = "…" + snippet;
    if (end < text.length) snippet = snippet + "…";
  }
  return highlight(snippet, query);
}

// ── Fallback 页面列表（auth.js 中硬编码的） ──
const FALLBACK_PAGES = [
  { title: "首页", url: "/", text: "" },
  { title: "产品", url: "/products.html", text: "" },
  { title: "会员", url: "/membership.html", text: "" },
  { title: "全部文章", url: "/article.html", text: "" },
  { title: "长文（公众号）", url: "/blog/longform.html", text: "" },
  { title: "短帖（X）", url: "/blog/x.html", text: "" },
  { title: "专栏", url: "/series.html", text: "" },
  { title: "开源项目", url: "/oss.html", text: "" },
  { title: "关于", url: "/about.html", text: "" },
];

// ── 测试框架 ──
const tests = [];

function test(name, fn) {
  try {
    fn();
    tests.push({ name, status: "PASS" });
  } catch (e) {
    tests.push({ name, status: "FAIL", error: e.message });
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed");
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || "Assertion failed"}: expected "${expected}", got "${actual}"`);
  }
}

// ── 用例 1：索引文件基本检查 ──
test("索引文件存在且格式正确", () => {
  assert(Array.isArray(FULL_INDEX), "索引应为数组");
  assert(FULL_INDEX.length > 0, `索引不应为空，实际 ${FULL_INDEX.length} 条`);
  console.log(`   → 索引包含 ${FULL_INDEX.length} 个页面`);
});

test("每个索引项都有必需的字段", () => {
  FULL_INDEX.forEach((item, i) => {
    assert(item.title, `第 ${i} 项缺少 title`);
    assert(item.url, `第 ${i} 项缺少 url`);
    assert(typeof item.text === "string", `第 ${i} 项 text 不是字符串`);
  });
});

// ── 用例 2：标题搜索 ──
test("标题搜索：搜'产品'应返回 /products.html", () => {
  const results = doSearch("产品", FULL_INDEX);
  assert(results.some((r) => r.url === "/products.html"), "应找到产品页面");
});

test("标题搜索：搜'关于'应返回 /about.html", () => {
  const results = doSearch("关于", FULL_INDEX);
  assert(results.some((r) => r.url === "/about.html"), "应找到关于页面");
});

test("标题搜索：搜'开源'应返回 /oss.html", () => {
  const results = doSearch("开源", FULL_INDEX);
  assert(results.some((r) => r.url === "/oss.html"), "应找到开源项目页面");
});

// ── 用例 3：全文搜索 ──
test("全文搜索：搜'Spring Boot'应返回结果", () => {
  const results = doSearch("Spring Boot", FULL_INDEX);
  assert(results.length > 0, `应找到 Spring Boot 相关内容，实际 ${results.length} 条`);
});

test("全文搜索：搜'AI'应返回多个结果", () => {
  const results = doSearch("AI", FULL_INDEX);
  assert(results.length >= 2, `应找到至少 2 个 AI 相关内容，实际 ${results.length} 条`);
});

test("全文搜索：搜'PmHub'应返回结果", () => {
  const results = doSearch("PmHub", FULL_INDEX);
  assert(results.length > 0, `应找到 PmHub 相关内容，实际 ${results.length} 条`);
});

test("全文搜索：不存在的词应返回空", () => {
  const results = doSearch("xyzabc123456789", FULL_INDEX);
  assertEqual(results.length, 0, "无意义关键词应返回空");
});

// ── 用例 4：中文搜索 ──
test("中文搜索：搜'数据库'应返回结果", () => {
  const results = doSearch("数据库", FULL_INDEX);
  assert(results.length > 0, `应找到数据库相关内容，实际 ${results.length} 条`);
});

test("中文搜索：搜'独立开发'应返回结果", () => {
  const results = doSearch("独立开发", FULL_INDEX);
  assert(results.length > 0, `应找到独立开发相关内容，实际 ${results.length} 条`);
});

// ── 用例 5：Fallback 机制（不依赖索引也能搜） ──
test("Fallback：搜'会员'应返回 /membership.html", () => {
  const results = doSearch("会员", FALLBACK_PAGES);
  assert(results.length === 1, `应返回 1 条，实际 ${results.length} 条`);
  assertEqual(results[0].url, "/membership.html", "应返回会员页面");
});

test("Fallback：搜'专栏'应返回 /series.html", () => {
  const results = doSearch("专栏", FALLBACK_PAGES);
  assert(results.length === 1, `应返回 1 条，实际 ${results.length} 条`);
  assertEqual(results[0].url, "/series.html", "应返回专栏页面");
});

// ── 用例 6：高亮功能 ──
test("高亮：应包裹匹配词", () => {
  const result = highlight("Hello World", "world");
  assert(result.includes('<mark style="background:#fef08a">'), "应包含 mark 标签");
});

test("高亮：中文匹配应正确高亮", () => {
  const result = highlight("Spring Boot 企业级开发", "开发");
  assert(result.includes('<mark style="background:#fef08a">开发</mark>'), "应高亮'开发'");
});

// ── 用例 7：摘要功能 ──
test("摘要：匹配词周围应包含上下文", () => {
  const text = "PmHub 是一个围绕项目管理场景展开的完整实战项目，从需求分析到部署上线";
  const result = excerpt(text, "PmHub");
  assert(result.includes("PmHub"), "摘要应包含匹配词");
  assert(result.includes("…") || result.length > 10, "摘要应包含上下文");
});

test("摘要：未匹配时应返回前90字符（或全文）", () => {
  const longText = "a".repeat(200);
  const result = excerpt(longText, "不存在的词");
  assertEqual(result.length, 90, "未匹配长文本时应返回前90字符");
});

// ── 用例 8：边界情况 ──
test("边界：空查询应返回空数组", () => {
  const results = doSearch("", FULL_INDEX);
  assertEqual(results.length, 0, "空查询应返回空数组");
});

test("边界：仅空格的查询应返回空数组", () => {
  const results = doSearch("   ", FULL_INDEX);
  assertEqual(results.length, 0, "空格查询应返回空数组");
});

test("边界：大小写不敏感", () => {
  const lower = doSearch("spring boot", FULL_INDEX);
  const upper = doSearch("SPRING BOOT", FULL_INDEX);
  assertEqual(lower.length, upper.length, "大小写搜索结果应相同");
});

// ── 输出结果 ──
console.log("\n═══════════════════════════════════════════════════");
console.log("  搜索功能自测用例");
console.log("═══════════════════════════════════════════════════\n");

const passed = tests.filter((t) => t.status === "PASS").length;
const failed = tests.filter((t) => t.status === "FAIL").length;

tests.forEach((t) => {
  const icon = t.status === "PASS" ? "✅" : "❌";
  console.log(`${icon} ${t.name}`);
  if (t.error) console.log(`   → ${t.error}`);
});

console.log("\n───────────────────────────────────────────────────");
console.log(`总计: ${tests.length}  |  通过: ${passed}  |  失败: ${failed}`);
console.log("───────────────────────────────────────────────────\n");

if (failed > 0) {
  console.log("❌ 有测试失败，请修复后再部署\n");
  process.exit(1);
} else {
  console.log("✅ 全部测试通过\n");
}
