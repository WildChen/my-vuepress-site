(function () {
  // 检测登录状态并更新 UI
  async function checkAuth() {
    try {
      const res = await fetch("/api/verify", {
        credentials: "same-origin",
      });
      const data = await res.json();

      if (data.authenticated) {
        // 已登录：替换 navbar 中的"登录"为"用户菜单"
        replaceLoginWithUser(data.username);
      }
    } catch (e) {
      // API 不可用，保持原样
    }
  }

  function replaceLoginWithUser(username) {
    // 等待 VuePress 渲染完成
    const observer = new MutationObserver(() => {
      const navItems = document.querySelectorAll(".vp-nav-item");
      navItems.forEach((item) => {
        const link = item.querySelector('a[href="/login.html"]');
        if (link) {
          // 替换为下拉菜单样式
          item.innerHTML = `
            <div class="vp-dropdown-wrapper">
              <button type="button" class="vp-dropdown-title" aria-label="${username}">
                <span class="font-icon icon fa-fw fa-sm fas fa-user" style=""></span>
                ${username}
                <span class="arrow"></span>
              </button>
              <ul class="vp-dropdown">
                <li class="vp-dropdown-item">
                  <a href="#" id="auth-logout" aria-label="登出">
                    <span class="font-icon icon fa-fw fa-sm fas fa-sign-out-alt" style=""></span>
                    登出
                  </a>
                </li>
              </ul>
            </div>
          `;

          // 绑定登出事件
          const logoutBtn = item.querySelector("#auth-logout");
          if (logoutBtn) {
            logoutBtn.addEventListener("click", async (e) => {
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
          }

          observer.disconnect();
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 如果 DOM 已经存在，直接执行
    const existingLink = document.querySelector('a[href="/login.html"]');
    if (existingLink) {
      observer.disconnect();
      const item = existingLink.closest(".vp-nav-item");
      if (item) {
        item.innerHTML = `
          <div class="vp-dropdown-wrapper">
            <button type="button" class="vp-dropdown-title" aria-label="${username}">
              <span class="font-icon icon fa-fw fa-sm fas fa-user" style=""></span>
              ${username}
              <span class="arrow"></span>
            </button>
            <ul class="vp-dropdown">
              <li class="vp-dropdown-item">
                <a href="#" id="auth-logout" aria-label="登出">
                  <span class="font-icon icon fa-fw fa-sm fas fa-sign-out-alt" style=""></span>
                  登出
                </a>
              </li>
            </ul>
          </div>
        `;
        const logoutBtn = item.querySelector("#auth-logout");
        if (logoutBtn) {
          logoutBtn.addEventListener("click", async (e) => {
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
        }
      }
    }
  }

  // 页面加载后检测登录状态
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkAuth);
  } else {
    checkAuth();
  }
})();
