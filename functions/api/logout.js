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

    if (token) {
      await env.KV_USERS.delete(`token:${token}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        "Set-Cookie": `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        "Set-Cookie": `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`,
      },
    });
  }
}

export async function onRequestOptions(context) {
  const { request } = context;
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
