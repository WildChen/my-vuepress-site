const ALLOWED_ORIGINS = [
  "https://wildchen-github-io.pages.dev",
];

const COOKIE_NAME = "__Host-auth_token";

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const isLocalhost =
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:");
  const allowed = isLocalhost || ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function getCookieValue(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

function getClientIP(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

function sanitizeContent(content) {
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function checkRateLimit(env, ip) {
  const key = `rate:comment:${ip}`;
  const current = await env.KV_USERS.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= 3) {
    return { allowed: false };
  }
  return { allowed: true, count };
}

async function incrementRateLimit(env, ip) {
  const key = `rate:comment:${ip}`;
  const current = await env.KV_USERS.get(key);
  const count = current ? parseInt(current, 10) + 1 : 1;
  await env.KV_USERS.put(key, String(count), { expirationTtl: 60 });
  return count;
}

// GET - 获取评论列表（无需登录）
export async function onRequestGet(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const url = new URL(request.url);
    const page = url.searchParams.get("page");

    if (!page) {
      return new Response(
        JSON.stringify({ error: "Missing page parameter" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const key = `comments:${page}`;
    const existing = await env.KV_USERS.get(key);
    const comments = existing ? JSON.parse(existing) : [];

    return new Response(
      JSON.stringify({ comments }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

// POST - 提交评论（需要登录）
export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    // 1. 验证登录状态
    const token = getCookieValue(request, COOKIE_NAME);
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const username = await env.KV_USERS.get(`token:${token}`);
    if (!username) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. 获取请求参数
    const { page, content } = await request.json();
    if (!page || !content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing page or content" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return new Response(
        JSON.stringify({ error: "Content cannot be empty" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (trimmed.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Content too long (max 2000 chars)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. 频率限制
    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(env, ip);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many comments, please wait a minute" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
            ...corsHeaders,
          },
        }
      );
    }

    // 4. 存储评论
    const comment = {
      id: crypto.randomUUID(),
      username: sanitizeContent(username),
      content: sanitizeContent(trimmed),
      createdAt: new Date().toISOString(),
    };

    const key = `comments:${page}`;
    const existing = await env.KV_USERS.get(key);
    const list = existing ? JSON.parse(existing) : [];
    list.push(comment);

    // 最多保留 100 条
    if (list.length > 100) {
      list.shift();
    }

    await env.KV_USERS.put(key, JSON.stringify(list));
    await incrementRateLimit(env, ip);

    return new Response(
      JSON.stringify({ success: true, comment }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

export async function onRequestOptions(context) {
  const { request } = context;
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
