async function hashPassword(password, username, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + username + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Missing username or password" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const userData = await env.KV_USERS.get(`user:${username}`);

    if (!userData) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const user = JSON.parse(userData);
    const salt = env.PASSWORD_SALT || "aron-site-default-salt";
    const hashHex = await hashPassword(password, username, salt);

    if (hashHex !== user.passwordHash) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const token = crypto.randomUUID();
    await env.KV_USERS.put(`token:${token}`, username, {
      expirationTtl: 604800,
    });

    return new Response(JSON.stringify({ token, username }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Set-Cookie": `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
