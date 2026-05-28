export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const cookie = request.headers.get("Cookie") || "";
    const tokenMatch = cookie.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (token) {
      await env.KV_USERS.delete(`token:${token}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Set-Cookie": "auth_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Set-Cookie": "auth_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/",
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
