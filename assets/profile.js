(function () {
  "use strict";

  var API_BASE = "http://localhost:5080/api";
  var TOKEN_KEY = "yosin_token";
  var USER_KEY = "yosin_user";

  var els = {};

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }
  function getUser() {
    try {
      var raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function setSession(token, user) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {}
  }
  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {}
  }

  function apiFetch(path, opts) {
    opts = opts || {};
    var headers = Object.assign({}, opts.headers || {});
    var token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
    if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

    return fetch(API_BASE + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body,
    })
      .catch(function () {
        throw new Error("Не удалось подключиться к серверу. Бэкенд запущен?");
      })
      .then(function (res) {
        if (res.status === 401 || res.status === 403) {
          clearSession();
          showGuestView("Сессия истекла, войдите снова.");
          throw new Error("Требуется повторный вход");
        }
        if (!res.ok) {
          return res.text().then(function (t) {
            throw new Error(t || ("Ошибка сервера: " + res.status));
          });
        }
        var ct = res.headers.get("content-type") || "";
        if (ct.indexOf("application/json") !== -1) return res.json();
        return null;
      });
  }

  function showGuestView(errorMsg) {
    if (els.accountView) els.accountView.hidden = true;
    if (els.guestView) els.guestView.hidden = false;
    if (els.authError) {
      els.authError.hidden = !errorMsg;
      els.authError.textContent = errorMsg || "";
    }
  }

  function favCount() {
    try {
      var raw = localStorage.getItem("yosin_favs_v1");
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.length : 0;
    } catch (e) { return 0; }
  }

  function statusLabel(status) {
    var map = {
      New: "Новый",
      Processing: "В обработке",
      Shipped: "Доставляется",
      Completed: "Выполнен",
      Cancelled: "Отменён",
    };
    return map[status] || status;
  }

  function formatMoney(v) {
    if (window.Yosin && typeof window.Yosin.formatPrice === "function") {
      return window.Yosin.formatPrice(v);
    }
    return Number(v || 0).toLocaleString("ru-RU") + " смн";
  }

  function renderOrders(orders) {
    if (!els.ordersList) return;
    if (!orders || !orders.length) {
      els.ordersList.innerHTML = '<p class="profile-empty">Заказов пока нет — самое время выбрать что-нибудь в каталоге.</p>';
      return;
    }
    els.ordersList.innerHTML = orders
      .map(function (o) {
        var date = o.createdAt ? new Date(o.createdAt).toLocaleDateString("ru-RU") : "";
        var itemsCount = (o.items || []).length;
        return (
          '<div class="order-card">' +
            '<div class="order-card-top">' +
              '<span class="order-card-num">' + o.orderNumber + "</span>" +
              '<span class="order-card-status">' + statusLabel(o.status) + "</span>" +
            "</div>" +
            '<div class="order-card-date">' + date + " · " + itemsCount + " товар(ов)</div>" +
            '<div class="order-card-total">' + formatMoney(o.totalAmount) + "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function showAccountView() {
    if (els.guestView) els.guestView.hidden = true;
    if (els.accountView) els.accountView.hidden = false;

    var user = getUser();
    if (!user) return;

    if (els.profileName) els.profileName.textContent = user.fullName || "Профиль";
    if (els.profilePhone) els.profilePhone.textContent = user.phone || "";
    if (els.statFavs) els.statFavs.textContent = favCount();
    if (els.sellerBanner) els.sellerBanner.hidden = user.role !== "Admin";

    apiFetch("/orders")
      .then(function (orders) {
        orders = orders || [];
        if (els.statOrders) els.statOrders.textContent = orders.length;
        renderOrders(orders);
      })
      .catch(function () {
        renderOrders([]);
      });
  }

  function submitLogin(e) {
    e.preventDefault();
    var fd = new FormData(els.loginForm);
    if (els.authError) els.authError.hidden = true;

    fetch(API_BASE + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: fd.get("phone"), password: fd.get("password") }),
    })
      .catch(function () {
        throw new Error("Не удалось подключиться к серверу. Бэкенд запущен?");
      })
      .then(function (res) {
        if (!res.ok) {
          return res.text().then(function (t) {
            throw new Error(t || "Неверный телефон или пароль");
          });
        }
        return res.json();
      })
      .then(function (data) {
        setSession(data.token, data);
        showAccountView();
      })
      .catch(function (err) {
        if (els.authError) {
          els.authError.hidden = false;
          els.authError.textContent = err.message || "Ошибка входа";
        }
      });
  }

  function submitRegister(e) {
    e.preventDefault();
    var fd = new FormData(els.registerForm);
    if (els.authError) els.authError.hidden = true;

    fetch(API_BASE + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fd.get("fullName"),
        phone: fd.get("phone"),
        password: fd.get("password"),
      }),
    })
      .catch(function () {
        throw new Error("Не удалось подключиться к серверу. Бэкенд запущен?");
      })
      .then(function (res) {
        if (!res.ok) {
          return res.text().then(function (t) {
            throw new Error(t || "Не удалось зарегистрироваться");
          });
        }
        return res.json();
      })
      .then(function (data) {
        setSession(data.token, data);
        showAccountView();
      })
      .catch(function (err) {
        if (els.authError) {
          els.authError.hidden = false;
          els.authError.textContent = err.message || "Ошибка регистрации";
        }
      });
  }

  function logout() {
    clearSession();
    showGuestView();
  }

  function toggleAuthMode() {
    var showingLogin = !els.loginForm.hidden;
    els.loginForm.hidden = showingLogin;
    els.registerForm.hidden = !showingLogin;
    if (els.authTitle) els.authTitle.textContent = showingLogin ? "Регистрация" : "Вход по номеру";
    if (els.authSwitchBtn) {
      els.authSwitchBtn.textContent = showingLogin ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться";
    }
    if (els.authError) els.authError.hidden = true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    els.guestView = document.getElementById("profileGuestView");
    els.accountView = document.getElementById("profileAccountView");
    els.loginForm = document.getElementById("loginForm");
    els.registerForm = document.getElementById("registerForm");
    els.authTitle = document.getElementById("authTitle");
    els.authSwitchBtn = document.getElementById("authSwitchBtn");
    els.authError = document.getElementById("authError");
    els.profileName = document.getElementById("profileName");
    els.profilePhone = document.getElementById("profilePhone");
    els.statOrders = document.getElementById("statOrders");
    els.statFavs = document.getElementById("statFavs");
    els.sellerBanner = document.getElementById("sellerBanner");
    els.ordersList = document.getElementById("ordersList");
    els.logoutBtn = document.getElementById("logoutBtn");

    if (els.loginForm) els.loginForm.addEventListener("submit", submitLogin);
    if (els.registerForm) els.registerForm.addEventListener("submit", submitRegister);
    if (els.authSwitchBtn) els.authSwitchBtn.addEventListener("click", toggleAuthMode);
    if (els.logoutBtn) els.logoutBtn.addEventListener("click", logout);

    if (window.Yosin && typeof window.Yosin.hydrateIcons === "function") {
      window.Yosin.hydrateIcons(document);
    }

    if (getToken() && getUser()) {
      showAccountView();
    } else {
      showGuestView();
    }
  });
})();
