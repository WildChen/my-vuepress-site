(function () {
  /* ════════════════════════════════════════
     搜索模块：异步加载索引，全文搜索
     ════════════════════════════════════════ */
  let SEARCH_INDEX = [];
  let searchReady = false;
  let searchInputValue = "";   // 保存输入值，Vue 重绘后恢复
  let searchFocused = false;   // 保存焦点状态

  // 加载搜索索引
  async function loadSearchIndex() {
    try {
      const res = await fetch("/search-index.json?v=1");
      if (res.ok) {
        SEARCH_INDEX = await res.json();
        searchReady = true;
        // 索引加载完成后，更新已有搜索框的 placeholder
        updateSearchPlaceholder();
      }
    } catch (e) {
      console.error("[search] index load failed:", e);
    }
  }

  function updateSearchPlaceholder() {
    const input = document.querySelector(".custom-search-box input");
    if (input) input.placeholder = "搜索...";
  }

  // 全文搜索：标题 + 正文
  function doSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q || !searchReady) return [];
    return SEARCH_INDEX.filter((p) => {
      const title = (p.title || "").toLowerCase();
      const text = (p.text || "").toLowerCase();
      return title.includes(q) || text.includes(q);
    }).slice(0, 8);
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlight(text, query) {
    const q = escapeRegExp(query.trim());
    if (!q) return text;
    return text.replace(new RegExp("(" + q + ")", "gi"), '<mark style="background:#fef08a;padding:0 1px;border-radius:2px;">$1</mark>');
  }

  // 提取匹配关键词周围的摘要
  function excerpt(text, query) {
    if (!text) return "";
    const q = query.trim().toLowerCase();
    const t = text.toLowerCase();
    const idx = t.indexOf(q);
    let snippet;
    if (idx === -1) {
      snippet = text.slice(0, 90);
    } else {
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + q.length + 50);
      snippet = text.slice(start, end);
      if (start > 0) snippet = "…" + snippet;
      if (end < text.length) snippet = snippet + "…";
    }
    return highlight(snippet, query);
  }

  // 创建/恢复搜索框
  function createSearchBox() {
    const navbarEnd = document.querySelector(".vp-navbar-end");
    if (!navbarEnd) return false;

    const existing = navbarEnd.querySelector(".custom-search-box");
    if (existing) {
      // 只更新 placeholder，不动已有元素（避免打断用户输入）
      const input = existing.querySelector("input");
      if (input && searchReady && input.placeholder !== "搜索...") {
        input.placeholder = "搜索...";
      }
      return true;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "custom-search-box";
    wrapper.style.cssText = "position:relative;display:inline-flex;align-items:center;margin-right:0.5rem;";

    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = searchReady ? "搜索..." : "加载中...";
    input.autocomplete = "off";
    input.style.cssText = `
      width: 120px;
      height: 32px;
      padding: 0 12px 0 32px;
      border: 1px solid rgb(229,231,235);
      border-radius: 16px;
      font-size: 13px;
      background: rgba(255,255,255,0.9) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.3-4.3'/%3E%3C/svg%3E") 10px center no-repeat;
      background-size: 14px;
      outline: none;
      transition: width 0.2s, border-color 0.2s;
      color: rgb(75,85,99);
    `;

    const suggestions = document.createElement("ul");
    suggestions.style.cssText = `
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      width: 280px;
      max-height: 360px;
      overflow-y: auto;
      background: white;
      border: 1px solid rgb(229,231,235);
      border-radius: 10px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
      list-style: none;
      padding: 6px 0;
      margin: 0;
      display: none;
      z-index: 9999;
    `;

    // 恢复之前保存的状态
    if (searchInputValue) input.value = searchInputValue;

    input.addEventListener("focus", () => {
      input.style.width = "200px";
      input.style.borderColor = "rgb(9,109,217)";
      searchFocused = true;
      if (input.value.trim()) renderSuggestions(input.value, suggestions);
    });

    input.addEventListener("blur", () => {
      input.style.width = "120px";
      input.style.borderColor = "rgb(229,231,235)";
      searchFocused = false;
      setTimeout(() => { suggestions.style.display = "none"; }, 180);
    });

    input.addEventListener("input", (e) => {
      searchInputValue = e.target.value;
      const q = e.target.value.trim();
      if (!q) {
        suggestions.style.display = "none";
        return;
      }
      renderSuggestions(q, suggestions);
    });

    // 键盘导航：ESC 关闭，Enter 跳转到第一个结果
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        suggestions.style.display = "none";
        input.blur();
      }
      if (e.key === "Enter") {
        const first = suggestions.querySelector("li[data-url]");
        if (first) {
          e.preventDefault();
          window.location.href = first.dataset.url;
        }
      }
    });

    wrapper.appendChild(input);
    wrapper.appendChild(suggestions);

    if (navbarEnd.firstChild) {
      navbarEnd.insertBefore(wrapper, navbarEnd.firstChild);
    } else {
      navbarEnd.appendChild(wrapper);
    }

    // 如果之前是聚焦状态，恢复焦点
    if (searchFocused) {
      input.focus();
    }

    return true;
  }

  function renderSuggestions(query, suggestionsEl) {
    const matches = doSearch(query);
    if (matches.length === 0) {
      suggestionsEl.innerHTML = '<li style="padding:12px 14px;font-size:13px;color:#999;text-align:center;">无结果</li>';
    } else {
      suggestionsEl.innerHTML = matches.map((p) => {
        const titleHtml = highlight(p.title, query);
        const excerptHtml = excerpt(p.text, query);
        return `<li data-url="${p.url}" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f3f4f6;transition:background 0.15s;" onmouseenter="this.style.background='#f9fafb'" onmouseleave="this.style.background='white'">
          <div style="font-size:13px;font-weight:500;color:#111827;margin-bottom:3px;line-height:1.4;">${titleHtml}</div>
          ${excerptHtml ? `<div style="font-size:12px;color:#6b7280;line-height:1.45;">${excerptHtml}</div>` : ""}
        </li>`;
      }).join("");

      // 事件委托处理点击
      suggestionsEl.onclick = (e) => {
        const li = e.target.closest("li[data-url]");
        if (li) {
          window.location.href = li.dataset.url;
        }
      };
    }
    suggestionsEl.style.display = "block";
  }

  // 持续监听导航栏，Vue 每次重绘后自动恢复搜索框
  function initSearchBox() {
    createSearchBox();
    const observer = new MutationObserver(() => {
      createSearchBox();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("popstate", () => createSearchBox());
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    history.pushState = function () { originalPush.apply(this, arguments); createSearchBox(); };
    history.replaceState = function () { originalReplace.apply(this, arguments); createSearchBox(); };
  }

  /* ════════════════════════════════════════
     认证模块：检查登录状态，替换"登录"为下拉菜单
     ════════════════════════════════════════ */
  async function checkAuth() {
    try {
      const res = await fetch("/api/verify", { credentials: "same-origin" });
      const data = await res.json();
      if (data.authenticated) {
        replaceLoginWithUser(data.username);
      }
    } catch (e) {
      // API 不可用，保持原样
    }
  }

  function replaceLoginWithUser(username) {
    const observer = new MutationObserver(() => {
      const navItems = document.querySelectorAll(".vp-nav-item");
      navItems.forEach((item) => {
        const link = item.querySelector('a[href="/login.html"]');
        if (link) {
          buildUserDropdown(item, username);
          observer.disconnect();
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const existingLink = document.querySelector('a[href="/login.html"]');
    if (existingLink) {
      observer.disconnect();
      const item = existingLink.closest(".vp-nav-item");
      if (item) buildUserDropdown(item, username);
    }
  }

  function buildUserDropdown(item, username) {
    while (item.firstChild) item.removeChild(item.firstChild);

    const wrapper = document.createElement("div");
    wrapper.className = "vp-dropdown-wrapper";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "vp-dropdown-title";
    button.setAttribute("aria-label", username);

    const icon = document.createElement("span");
    icon.className = "font-icon icon fa-fw fa-sm fas fa-user";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = username;

    const arrow = document.createElement("span");
    arrow.className = "arrow";

    button.appendChild(icon);
    button.appendChild(document.createTextNode(" "));
    button.appendChild(nameSpan);
    button.appendChild(document.createTextNode(" "));
    button.appendChild(arrow);

    const ul = document.createElement("ul");
    ul.className = "vp-dropdown";

    const liAdmin = document.createElement("li");
    liAdmin.className = "vp-dropdown-item";
    const adminA = document.createElement("a");
    adminA.href = "/admin.html";
    adminA.setAttribute("aria-label", "管理后台");
    const adminIcon = document.createElement("span");
    adminIcon.className = "font-icon icon fa-fw fa-sm fas fa-cog";
    const adminText = document.createElement("span");
    adminText.textContent = " 管理后台";
    adminA.appendChild(adminIcon);
    adminA.appendChild(adminText);
    liAdmin.appendChild(adminA);
    ul.appendChild(liAdmin);

    const li = document.createElement("li");
    li.className = "vp-dropdown-item";
    const logoutA = document.createElement("a");
    logoutA.href = "#";
    logoutA.id = "auth-logout";
    logoutA.setAttribute("aria-label", "登出");
    const logoutIcon = document.createElement("span");
    logoutIcon.className = "font-icon icon fa-fw fa-sm fas fa-sign-out-alt";
    const logoutText = document.createElement("span");
    logoutText.textContent = " 登出";
    logoutA.appendChild(logoutIcon);
    logoutA.appendChild(logoutText);
    logoutA.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
        localStorage.removeItem("auth_username");
        window.location.reload();
      } catch (err) {
        console.error("Logout failed:", err);
      }
    });
    li.appendChild(logoutA);
    ul.appendChild(li);

    wrapper.appendChild(button);
    wrapper.appendChild(ul);
    item.appendChild(wrapper);
  }

  /* ════════════════════════════════════════
     启动
     ════════════════════════════════════════ */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      loadSearchIndex();
      initSearchBox();
      checkAuth();
    });
  } else {
    loadSearchIndex();
    initSearchBox();
    checkAuth();
  }
})();
