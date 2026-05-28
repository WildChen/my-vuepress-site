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

async function pbkdf2Hash(password, username, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt + username),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIP(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

async function checkRateLimit(env, ip) {
  const key = `rate:login:${ip}`;
  const current = await env.KV_USERS.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= 5) {
    return { allowed: false };
  }
  return { allowed: true, count };
}

async function incrementRateLimit(env, ip) {
  const key = `rate:login:${ip}`;
  const current = await env.KV_USERS.get(key);
  const count = current ? parseInt(current, 10) + 1 : 1;
  await env.KV_USERS.put(key, String(count), { expirationTtl: 300 });
  return count;
}

async function clearRateLimit(env, ip) {
  await env.KV_USERS.delete(`rate:login:${ip}`);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const salt = env.PASSWORD_SALT;
    if (!salt) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Missing username or password" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(env, ip);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many attempts, please try again later" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "300",
            ...corsHeaders,
          },
        }
      );
    }

    const userData = await env.KV_USERS.get(`user:${username}`);

    if (!userData) {
      await incrementRateLimit(env, ip);
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const user = JSON.parse(userData);
    const hashHex = await pbkdf2Hash(password, username, salt);

    if (hashHex !== user.passwordHash) {
      await incrementRateLimit(env, ip);
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    await clearRateLimit(env, ip);

    const token = crypto.randomUUID();
    await env.KV_USERS.put(`token:${token}`, username, {
      expirationTtl: 604800,
    });

    return new Response(JSON.stringify({ success: true, username }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        "Set-Cookie": `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
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
