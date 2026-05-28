(function () {
  const PAGE_PATH = window.location.pathname;

  // 跳过登录页和首页（可选）
  if (PAGE_PATH === "/login.html") return;

  async function loadComments() {
    try {
      const res = await fetch(`/api/comment?page=${encodeURIComponent(PAGE_PATH)}`);
      const data = await res.json();
      renderComments(data.comments || []);
    } catch (e) {
      renderComments([]);
    }
  }

  async function checkAuth() {
    try {
      const res = await fetch("/api/verify", { credentials: "same-origin" });
      const data = await res.json();
      return data.authenticated ? data.username : null;
    } catch (e) {
      return null;
    }
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function renderComments(comments) {
    const container = document.getElementById("comments-container");
    if (!container) return;

    const listEl = container.querySelector(".comments-list");
    const countEl = container.querySelector(".comments-count");

    if (countEl) {
      countEl.textContent = `${comments.length} 条评论`;
    }

    if (listEl) {
      listEl.innerHTML = "";
      if (comments.length === 0) {
        const empty = document.createElement("div");
        empty.className = "comments-empty";
        empty.textContent = "暂无评论，来抢沙发吧~";
        listEl.appendChild(empty);
      } else {
        comments.forEach((c) => {
          const item = document.createElement("div");
          item.className = "comment-item";

          const meta = document.createElement("div");
          meta.className = "comment-meta";

          const userIcon = document.createElement("span");
          userIcon.className = "font-icon icon fa-fw fa-sm fas fa-user-circle";

          const username = document.createElement("span");
          username.className = "comment-username";
          username.textContent = c.username;

          const time = document.createElement("span");
          time.className = "comment-time";
          time.textContent = formatDate(c.createdAt);

          meta.appendChild(userIcon);
          meta.appendChild(document.createTextNode(" "));
          meta.appendChild(username);
          meta.appendChild(document.createTextNode(" · "));
          meta.appendChild(time);

          const content = document.createElement("div");
          content.className = "comment-content";
          content.textContent = c.content;

          item.appendChild(meta);
          item.appendChild(content);
          listEl.appendChild(item);
        });
      }
    }
  }

  async function init() {
    // 找到页面内容容器，在底部插入评论
    const content = document.querySelector(".theme-hope-content") || document.querySelector(".vp-page") || document.querySelector("#app");
    if (!content) return;

    // 检查是否已存在
    if (document.getElementById("comments-container")) return;

    const container = document.createElement("div");
    container.id = "comments-container";
    container.className = "comments-container";

    const title = document.createElement("h3");
    title.className = "comments-title";
    title.textContent = "评论";

    const count = document.createElement("span");
    count.className = "comments-count";
    count.textContent = "0 条评论";

    const header = document.createElement("div");
    header.className = "comments-header";
    header.appendChild(title);
    header.appendChild(count);

    const list = document.createElement("div");
    list.className = "comments-list";

    const divider = document.createElement("hr");
    divider.className = "comments-divider";

    container.appendChild(divider);
    container.appendChild(header);
    container.appendChild(list);

    const username = await checkAuth();

    if (username) {
      // 已登录：显示输入框
      const inputArea = document.createElement("div");
      inputArea.className = "comment-input-area";

      const textarea = document.createElement("textarea");
      textarea.className = "comment-textarea";
      textarea.placeholder = "写下你的想法...";
      textarea.rows = 3;
      textarea.maxLength = 2000;

      const actions = document.createElement("div");
      actions.className = "comment-actions";

      const submitBtn = document.createElement("button");
      submitBtn.className = "comment-submit-btn";
      submitBtn.textContent = "发表评论";

      const errorEl = document.createElement("div");
      errorEl.className = "comment-error";

      submitBtn.addEventListener("click", async () => {
        const content = textarea.value.trim();
        if (!content) {
          errorEl.textContent = "请输入评论内容";
          errorEl.style.display = "block";
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "发送中...";
        errorEl.style.display = "none";

        try {
          const res = await fetch("/api/comment", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ page: PAGE_PATH, content }),
          });

          const data = await res.json();

          if (res.ok) {
            textarea.value = "";
            await loadComments();
          } else {
            errorEl.textContent = data.error || "发送失败";
            errorEl.style.display = "block";
          }
        } catch (e) {
          errorEl.textContent = "网络错误，请重试";
          errorEl.style.display = "block";
        }

        submitBtn.disabled = false;
        submitBtn.textContent = "发表评论";
      });

      actions.appendChild(errorEl);
      actions.appendChild(submitBtn);
      inputArea.appendChild(textarea);
      inputArea.appendChild(actions);
      container.appendChild(inputArea);
    } else {
      // 未登录：提示登录
      const loginTip = document.createElement("div");
      loginTip.className = "comment-login-tip";

      const tipText = document.createTextNode("登录后可以发表评论 ");
      const loginLink = document.createElement("a");
      loginLink.href = "/login.html";
      loginLink.textContent = "去登录 →";

      loginTip.appendChild(tipText);
      loginTip.appendChild(loginLink);
      container.appendChild(loginTip);
    }

    content.appendChild(container);
    await loadComments();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
