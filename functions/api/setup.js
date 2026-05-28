const ALLOWED_ORIGINS = [
  "https://wildchen-github-io.pages.dev",
];

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
  const key = `rate:setup:${ip}`;
  const current = await env.KV_USERS.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= 3) {
    return { allowed: false };
  }
  return { allowed: true, count };
}

async function incrementRateLimit(env, ip) {
  const key = `rate:setup:${ip}`;
  const current = await env.KV_USERS.get(key);
  const count = current ? parseInt(current, 10) + 1 : 1;
  await env.KV_USERS.put(key, String(count), { expirationTtl: 3600 });
  return count;
}

function validateUsername(username) {
  if (!username || typeof username !== "string") return false;
  if (username.length < 3 || username.length > 30) return false;
  return /^[a-zA-Z0-9_-]+$/.test(username);
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

    const usersList = await env.KV_USERS.list({ prefix: "user:" });
    if (usersList.keys.length > 0) {
      return new Response(
        JSON.stringify({ error: "Setup already completed" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { username, password } = await request.json();

    if (!validateUsername(username)) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid username (3-30 chars, alphanumeric, underscore, hyphen only)",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
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
            "Retry-After": "3600",
            ...corsHeaders,
          },
        }
      );
    }

    const passwordHash = await pbkdf2Hash(password, username, salt);

    await env.KV_USERS.put(
      `user:${username}`,
      JSON.stringify({
        passwordHash,
        createdAt: new Date().toISOString(),
      })
    );

    return new Response(
      JSON.stringify({ success: true, message: "Admin user created" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const usersList = await env.KV_USERS.list({ prefix: "user:" });
    const needsSetup = usersList.keys.length === 0;
    return new Response(
      JSON.stringify({ needsSetup }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}

export async function onRequestOptions(context) {
  const { request } = context;
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(request),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}
