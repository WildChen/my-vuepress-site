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
    // 检查是否已有用户
    const usersList = await env.KV_USERS.list({ prefix: "user:" });
    if (usersList.keys.length > 0) {
      return new Response(
        JSON.stringify({ error: "Setup already completed" }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password || password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Invalid username or password (min 6 chars)" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const salt = env.PASSWORD_SALT || "aron-site-default-salt";
    const passwordHash = await hashPassword(password, username, salt);

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
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
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
