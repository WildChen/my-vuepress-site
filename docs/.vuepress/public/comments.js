(function () {
  const PAGE_PATH = window.location.pathname;
  let CURRENT_USER = null;

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
      CURRENT_USER = data.authenticated ? data.username : null;
      return CURRENT_USER;
    } catch (e) {
      CURRENT_USER = null;
      return null;
    }
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function createCommentItem(c, level) {
    const item = document.createElement("div");
    item.className = level === 0 ? "comment-item" : "comment-reply-item";
    item.dataset.id = c.id;

    // Meta
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

    // Content
    const content = document.createElement("div");
    content.className = "comment-content";
    content.textContent = c.content;

    item.appendChild(meta);
    item.appendChild(content);

    // Actions (like + reply)
    if (level === 0) {
      const actions = document.createElement("div");
      actions.className = "comment-actions-bar";

      const likes = c.likes || [];
      const isLiked = CURRENT_USER && likes.includes(CURRENT_USER);

      const likeBtn = document.createElement("button");
      likeBtn.className = "comment-action-btn" + (isLiked ? " liked" : "");
      likeBtn.innerHTML = `<span class="font-icon icon fa-fw fa-sm ${isLiked ? 'fas' : 'far'} fa-heart"></span> ${likes.length}`;
      likeBtn.addEventListener("click", async () => {
        if (!CURRENT_USER) {
          window.location.href = "/login.html";
          return;
        }
        likeBtn.disabled = true;
        try {
          const res = await fetch("/api/comment/like", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ page: PAGE_PATH, commentId: c.id }),
          });
          if (res.ok) {
            await loadComments();
          }
        } catch (e) {
          console.error("Like failed:", e);
        }
        likeBtn.disabled = false;
      });

      const replyBtn = document.createElement("button");
      replyBtn.className = "comment-action-btn";
      replyBtn.innerHTML = `<span class="font-icon icon fa-fw fa-sm far fa-comment-dots"></span> 回复`;
      replyBtn.addEventListener("click", () => {
        if (!CURRENT_USER) {
          window.location.href = "/login.html";
          return;
        }
        toggleReplyForm(item, c.id);
      });

      actions.appendChild(likeBtn);
      actions.appendChild(replyBtn);
      item.appendChild(actions);

      // Replies
      const replies = c.replies || [];
      if (replies.length > 0) {
        const repliesWrap = document.createElement("div");
        repliesWrap.className = "comment-replies";
        replies.forEach((r) => {
          repliesWrap.appendChild(createCommentItem(r, 1));
        });
        item.appendChild(repliesWrap);
      }
    }

    return item;
  }

  function toggleReplyForm(item, commentId) {
    let form = item.querySelector(".comment-reply-form");
    if (form) {
      form.style.display = form.style.display === "none" ? "block" : "none";
      return;
    }

    form = document.createElement("div");
    form.className = "comment-reply-form";

    const textarea = document.createElement("textarea");
    textarea.className = "comment-textarea comment-reply-textarea";
    textarea.placeholder = "写下你的回复...";
    textarea.rows = 2;
    textarea.maxLength = 1000;

    const actions = document.createElement("div");
    actions.className = "comment-actions";

    const submitBtn = document.createElement("button");
    submitBtn.className = "comment-submit-btn comment-reply-submit";
    submitBtn.textContent = "回复";

    const errorEl = document.createElement("div");
    errorEl.className = "comment-error";

    submitBtn.addEventListener("click", async () => {
      const content = textarea.value.trim();
      if (!content) {
        errorEl.textContent = "请输入回复内容";
        errorEl.style.display = "block";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "发送中...";
      errorEl.style.display = "none";

      try {
        const res = await fetch("/api/comment/reply", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: PAGE_PATH, commentId, content }),
        });

        const data = await res.json();

        if (res.ok) {
          textarea.value = "";
          form.style.display = "none";
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
      submitBtn.textContent = "回复";
    });

    actions.appendChild(errorEl);
    actions.appendChild(submitBtn);
    form.appendChild(textarea);
    form.appendChild(actions);

    // Insert after actions bar or content
    const insertAfter = item.querySelector(".comment-actions-bar") || item.lastChild;
    if (insertAfter && insertAfter.nextSibling) {
      item.insertBefore(form, insertAfter.nextSibling);
    } else {
      item.appendChild(form);
    }
  }

  function renderComments(comments) {
    const container = document.getElementById("comments-container");
    if (!container) return;

    const listEl = container.querySelector(".comments-list");
    const countEl = container.querySelector(".comments-count");

    const totalReplies = comments.reduce((sum, c) => sum + (c.replies || []).length, 0);
    if (countEl) {
      countEl.textContent = `${comments.length} 条评论 · ${totalReplies} 条回复`;
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
          listEl.appendChild(createCommentItem(c, 0));
        });
      }
    }
  }

  async function init() {
    const content = document.querySelector(".theme-hope-content") || document.querySelector(".vp-page") || document.querySelector("#app");
    if (!content) return;
    if (document.getElementById("comments-container")) return;

    await checkAuth();

    const container = document.createElement("div");
    container.id = "comments-container";
    container.className = "comments-container";

    const title = document.createElement("h3");
    title.className = "comments-title";
    title.textContent = "评论";

    const count = document.createElement("span");
    count.className = "comments-count";
    count.textContent = "0 条评论 · 0 条回复";

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

    if (CURRENT_USER) {
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
      const loginTip = document.createElement("div");
      loginTip.className = "comment-login-tip";

      const tipText = document.createTextNode("登录后可以发表评论、点赞和回复 ");
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
