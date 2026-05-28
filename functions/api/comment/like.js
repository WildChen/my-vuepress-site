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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    const { page, commentId } = await request.json();
    if (!page || !commentId) {
      return new Response(
        JSON.stringify({ error: "Missing page or commentId" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const key = `comments:${page}`;
    const existing = await env.KV_USERS.get(key);
    if (!existing) {
      return new Response(
        JSON.stringify({ error: "Comment not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const list = JSON.parse(existing);
    const comment = list.find((c) => c.id === commentId);
    if (!comment) {
      return new Response(
        JSON.stringify({ error: "Comment not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 兼容旧数据
    if (!comment.likes) comment.likes = [];

    const index = comment.likes.indexOf(username);
    let liked;
    if (index >= 0) {
      comment.likes.splice(index, 1);
      liked = false;
    } else {
      comment.likes.push(username);
      liked = true;
    }

    await env.KV_USERS.put(key, JSON.stringify(list));

    return new Response(
      JSON.stringify({ success: true, liked, count: comment.likes.length }),
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
