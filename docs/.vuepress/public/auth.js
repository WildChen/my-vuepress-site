(function () {
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
    document.addEventListener("DOMContentLoaded", checkAuth);
  } else {
    checkAuth();
  }
})();
