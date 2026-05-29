(function () {
  // 页面数据，用于搜索功能
  const PAGES = [
    { title: "首页", path: "/" },
    { title: "产品", path: "/products.html" },
    { title: "会员", path: "/membership.html" },
    { title: "文章", path: "/article.html" },
    { title: "长文（公众号）", path: "/blog/longform.html" },
    { title: "短帖（X）", path: "/blog/x.html" },
    { title: "专栏", path: "/series.html" },
    { title: "开源项目", path: "/oss.html" },
    { title: "关于", path: "/about.html" },
  ];

  // 在导航栏右侧插入搜索框
  function createSearchBox() {
    const navbarEnd = document.querySelector(".vp-navbar-end");
    if (!navbarEnd) return false;
    if (navbarEnd.querySelector(".custom-search-box")) return true;

    const wrapper = document.createElement("div");
    wrapper.className = "custom-search-box";
    wrapper.style.cssText = "position:relative;display:inline-flex;align-items:center;margin-right:0.5rem;";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "搜索...";
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
      transition: all 0.2s;
      color: rgb(75,85,99);
    `;

    const suggestions = document.createElement("ul");
    suggestions.style.cssText = `
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      width: 220px;
      max-height: 300px;
      overflow-y: auto;
      background: white;
      border: 1px solid rgb(229,231,235);
      border-radius: 8px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
      list-style: none;
      padding: 4px 0;
      margin: 0;
      display: none;
      z-index: 9999;
    `;

    input.addEventListener("focus", () => {
      input.style.width = "180px";
      input.style.borderColor = "rgb(9,109,217)";
    });
    input.addEventListener("blur", () => {
      input.style.width = "120px";
      input.style.borderColor = "rgb(229,231,235)";
      setTimeout(() => { suggestions.style.display = "none"; }, 200);
    });
    input.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) { suggestions.style.display = "none"; return; }
      const matches = PAGES.filter((p) => p.title.toLowerCase().includes(q));
      if (matches.length === 0) {
        suggestions.innerHTML = '<li style="padding:8px 12px;font-size:13px;color:#999;">无结果</li>';
      } else {
        suggestions.innerHTML = matches.map((p) =>
          `<li style="padding:8px 12px;cursor:pointer;font-size:13px;color:#111827;transition:background 0.15s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='white'" onclick="window.location.href='${p.path}'">${p.title}</li>`
        ).join("");
      }
      suggestions.style.display = "block";
    });

    wrapper.appendChild(input);
    wrapper.appendChild(suggestions);

    if (navbarEnd.firstChild) {
      navbarEnd.insertBefore(wrapper, navbarEnd.firstChild);
    } else {
      navbarEnd.appendChild(wrapper);
    }
    return true;
  }

  // 使用 MutationObserver 等待导航栏渲染完成后插入搜索框
  function initSearchBox() {
    if (createSearchBox()) return;
    const observer = new MutationObserver(() => {
      if (createSearchBox()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 5000);
  }

  // 检查登录状态，已登录时将"登录"替换为用户下拉菜单
  async function checkAuth() {
    try {
      const res = await fetch("/api/verify", {
        credentials: "same-origin",
      });
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
      if (item) {
        buildUserDropdown(item, username);
      }
    }
  }

  function buildUserDropdown(item, username) {
    while (item.firstChild) {
      item.removeChild(item.firstChild);
    }

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
        await fetch("/api/logout", {
          method: "POST",
          credentials: "same-origin",
        });
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initSearchBox();
      checkAuth();
    });
  } else {
    initSearchBox();
    checkAuth();
  }
})();
