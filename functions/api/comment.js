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

function containsUnsafeImageUrls(content) {
  const matches = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
  for (const match of matches) {
    const urlMatch = match.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (urlMatch) {
      const url = urlMatch[2];
      const allowed =
        url.startsWith("data:image/") || url.startsWith("https://");
      if (!allowed) return true;
    }
  }
  return false;
}

function checkBase64ImageSize(content, maxKB) {
  const matches = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/g) || [];
  let totalBytes = 0;
  for (const match of matches) {
    const parts = match.split(",");
    if (parts.length === 2) {
      totalBytes += parts[1].length * 0.75;
    }
  }
  return totalBytes <= maxKB * 1024;
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

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
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
    if (trimmed.length > 100000) {
      return new Response(
        JSON.stringify({ error: "Content too long" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 安全检查
    if (containsUnsafeImageUrls(trimmed)) {
      return new Response(
        JSON.stringify({ error: "Unsafe image URL detected" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (!checkBase64ImageSize(trimmed, 200)) {
      return new Response(
        JSON.stringify({ error: "Images too large (max 200KB total)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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

    const comment = {
      id: crypto.randomUUID(),
      username: sanitizeContent(username),
      content: sanitizeContent(trimmed),
      createdAt: new Date().toISOString(),
      likes: [],
      replies: [],
    };

    const key = `comments:${page}`;
    const existing = await env.KV_USERS.get(key);
    const list = existing ? JSON.parse(existing) : [];
    list.push(comment);

    if (list.length > 50) {
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
