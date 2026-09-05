(function () {
  "use strict";

  var API_BASE = "http://91.227.41.15/api";
  var TOKEN_KEY = "yosin_token";
  var USER_KEY = "yosin_user";

  var els = {};
  var state = {
    categories: [],
    brands: [],
    products: [],
    editingId: null,
  };

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
          showLoginView("Сессия истекла, войдите снова.");
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

  function showLoginView(errorMsg) {
    if (els.dashboardView) els.dashboardView.hidden = true;
    if (els.loginView) els.loginView.hidden = false;
    if (els.loginError) {
      els.loginError.textContent = errorMsg || "";
      els.loginError.hidden = !errorMsg;
    }
  }

  function showDashboardView() {
    var user = getUser();
    if (!user || user.role !== "Admin") {
      // Logged in as an ordinary customer (shared session with the profile
      // page) - don't clear their session, just explain this area is
      // admin-only and keep them on the login screen.
      showLoginView("У этого аккаунта нет прав администратора.");
      return;
    }
    if (els.loginView) els.loginView.hidden = true;
    if (els.dashboardView) els.dashboardView.hidden = false;
    if (els.adminGreeting) {
      els.adminGreeting.textContent = "Здравствуйте, " + (user.fullName || "Админ");
    }
    loadAll();
  }

  function formatMoney(v) {
    if (window.Yosin && typeof window.Yosin.formatPrice === "function") {
      return window.Yosin.formatPrice(v);
    }
    return Number(v || 0).toLocaleString("ru-RU") + " сомони";
  }

  function icon(name, size) {
    if (window.Yosin && typeof window.Yosin.icon === "function") {
      return window.Yosin.icon(name, size);
    }
    return "";
  }

  function loadAll() {
    if (els.loadError) { els.loadError.hidden = true; els.loadError.textContent = ""; }
    Promise.all([
      apiFetch("/categories").catch(function () { return []; }),
      apiFetch("/brands").catch(function () { return []; }),
      apiFetch("/admin/dashboard/stats").catch(function () { return null; }),
      apiFetch("/products").catch(function () { return []; }),
    ])
      .then(function (res) {
        state.categories = res[0] || [];
        state.brands = res[1] || [];
        var stats = res[2];
        state.products = (res[3] && res[3].items) ? res[3].items : (Array.isArray(res[3]) ? res[3] : []);
        renderStats(stats);
        renderSelectOptions();
        renderProductsTable();
      })
      .catch(function (err) {
        if (els.loadError) {
          els.loadError.hidden = false;
          els.loadError.textContent = err.message || "Ошибка загрузки данных";
        }
      });
  }

  function renderStats(stats) {
    if (!els.stats) return;
    if (!stats) { els.stats.innerHTML = ""; return; }
    var items = [
      { label: "Выручка", value: formatMoney(stats.totalRevenue) },
      { label: "Расходы", value: formatMoney(stats.totalExpenses) },
      { label: "Прибыль", value: formatMoney(stats.profit) },
      { label: "Заказов всего", value: stats.totalOrders },
      { label: "Новых заказов", value: stats.newOrders },
      { label: "Товаров", value: stats.totalProducts },
    ];
    els.stats.innerHTML = items
      .map(function (it) {
        return '<span class="admin-stat"><b>' + it.value + "</b>" + it.label + "</span>";
      })
      .join("");
  }

  function renderSelectOptions() {
    if (els.categorySelect) {
      els.categorySelect.innerHTML = state.categories
        .map(function (c) { return '<option value="' + c.id + '">' + c.name + "</option>"; })
        .join("");
    }
    if (els.brandSelect) {
      els.brandSelect.innerHTML = state.brands
        .map(function (b) { return '<option value="' + b.id + '">' + b.name + "</option>"; })
        .join("");
    }
  }

  function renderProductsTable() {
    if (!els.productsTable) return;
    if (!state.products.length) {
      els.productsTable.innerHTML = '<p class="admin-empty">Товаров пока нет.</p>';
      return;
    }
    els.productsTable.innerHTML = state.products
      .map(function (p) {
        var lowStock = Number(p.stock) <= 5;
        return (
          '<div class="admin-row" data-id="' + p.id + '">' +
            '<div class="admin-row-thumb">' + icon("box", 26) + "</div>" +
            '<div class="admin-row-main">' +
              '<div class="admin-row-name">' + (p.name || "") + "</div>" +
              '<div class="admin-row-sub">' + (p.categoryName || "") + " · " + (p.brandName || "") + "</div>" +
            "</div>" +
            '<div class="admin-row-price">' + formatMoney(p.price) + "</div>" +
            '<div class="admin-row-stock' + (lowStock ? " low" : "") + '">' + p.stock + " шт." + "</div>" +
            '<div class="admin-row-actions">' +
              '<button type="button" class="btn btn-sm" data-edit="' + p.id + '">Изменить</button>' +
              '<button type="button" class="btn btn-sm btn-danger-outline" data-delete="' + p.id + '">Удалить</button>' +
            "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function openProductModal(id) {
    state.editingId = id || null;
    if (els.productForm) els.productForm.reset();
    if (els.productFormError) { els.productFormError.hidden = true; els.productFormError.textContent = ""; }

    if (id) {
      var p = state.products.find(function (x) { return String(x.id) === String(id); });
      if (els.modalTitle) els.modalTitle.textContent = "Изменить товар";
      if (p) {
        setFieldValue("productId", p.id);
        setFieldValue("name", p.name);
        setFieldValue("slug", p.slug);
        setFieldValue("description", p.description);
        setFieldValue("price", p.price);
        setFieldValue("oldPrice", p.oldPrice);
        setFieldValue("costPrice", 0);
        setFieldValue("stock", p.stock);
        setFieldValue("mainImageUrl", p.mainImageUrl);
        setFieldValue("categoryId", p.categoryId);
        setFieldValue("brandId", p.brandId);
      }
    } else {
      if (els.modalTitle) els.modalTitle.textContent = "Добавить товар";
      setFieldValue("productId", "");
    }
    if (els.productModal) els.productModal.hidden = false;
  }

  function setFieldValue(name, value) {
    if (!els.productForm) return;
    var field = els.productForm.elements[name];
    if (field) field.value = value == null ? "" : value;
  }

  function closeProductModal() {
    if (els.productModal) els.productModal.hidden = true;
    state.editingId = null;
  }

  function deleteProduct(id) {
    if (!window.confirm("Удалить этот товар?")) return;
    apiFetch("/products/" + id, { method: "DELETE" })
      .then(function () {
        state.products = state.products.filter(function (p) { return String(p.id) !== String(id); });
        renderProductsTable();
        if (window.Yosin && typeof window.Yosin.showToast === "function") {
          window.Yosin.showToast("Товар удалён", "trash");
        }
      })
      .catch(function (err) {
        window.alert(err.message || "Не удалось удалить товар");
      });
  }

  function submitProductForm(e) {
    e.preventDefault();
    var fd = new FormData(els.productForm);
    var id = fd.get("productId");
    var payload = {
      name: fd.get("name") || "",
      slug: fd.get("slug") || "",
      description: fd.get("description") || "",
      price: Number(fd.get("price") || 0),
      oldPrice: fd.get("oldPrice") ? Number(fd.get("oldPrice")) : null,
      costPrice: Number(fd.get("costPrice") || 0),
      stock: Number(fd.get("stock") || 0),
      mainImageUrl: fd.get("mainImageUrl") || "",
      categoryId: Number(fd.get("categoryId") || 0),
      brandId: fd.get("brandId") ? Number(fd.get("brandId")) : null,
    };

    var request;
    if (id) {
      payload.isActive = true;
      request = apiFetch("/products/" + id, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      request = apiFetch("/products", { method: "POST", body: JSON.stringify(payload) });
    }

    request
      .then(function () {
        closeProductModal();
        if (window.Yosin && typeof window.Yosin.showToast === "function") {
          window.Yosin.showToast(id ? "Товар обновлён" : "Товар добавлен", "check");
        }
        loadAll();
      })
      .catch(function (err) {
        if (els.productFormError) {
          els.productFormError.hidden = false;
          els.productFormError.textContent = err.message || "Не удалось сохранить товар";
        }
      });
  }

  function submitLoginForm(e) {
    e.preventDefault();
    var fd = new FormData(els.loginForm);
    var phone = fd.get("phone");
    var password = fd.get("password");

    if (els.loginError) els.loginError.hidden = true;

    fetch(API_BASE + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone, password: password }),
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
        if (data.role !== "Admin") {
          throw new Error("Этот номер не имеет прав администратора");
        }
        setSession(data.token, data);
        showDashboardView();
      })
      .catch(function (err) {
        if (els.loginError) {
          els.loginError.hidden = false;
          els.loginError.textContent = err.message || "Ошибка входа";
        }
      });
  }

  function logout() {
    clearSession();
    showLoginView();
  }

  document.addEventListener("DOMContentLoaded", function () {
    els.loginView = document.getElementById("adminLoginView");
    els.dashboardView = document.getElementById("adminDashboardView");
    els.loginForm = document.getElementById("loginForm");
    els.loginError = document.getElementById("loginError");
    els.adminGreeting = document.getElementById("adminGreeting");
    els.stats = document.getElementById("adminStats");
    els.addProductBtn = document.getElementById("addProductBtn");
    els.logoutBtn = document.getElementById("logoutBtn");
    els.loadError = document.getElementById("adminLoadError");
    els.productsTable = document.getElementById("productsTable");
    els.productModal = document.getElementById("productModal");
    els.productForm = document.getElementById("productForm");
    els.productFormError = document.getElementById("productFormError");
    els.cancelProductBtn = document.getElementById("cancelProductBtn");
    els.saveProductBtn = document.getElementById("saveProductBtn");
    els.closeProductModal = document.getElementById("closeProductModal");
    els.categorySelect = document.getElementById("categorySelect");
    els.brandSelect = document.getElementById("brandSelect");
    els.modalTitle = document.getElementById("productModalTitle");

    if (els.loginForm) els.loginForm.addEventListener("submit", submitLoginForm);
    if (els.logoutBtn) els.logoutBtn.addEventListener("click", logout);
    if (els.addProductBtn) els.addProductBtn.addEventListener("click", function () { openProductModal(null); });
    if (els.cancelProductBtn) els.cancelProductBtn.addEventListener("click", closeProductModal);
    if (els.closeProductModal) els.closeProductModal.addEventListener("click", closeProductModal);
    if (els.productForm) els.productForm.addEventListener("submit", submitProductForm);
    if (els.productModal) {
      els.productModal.addEventListener("click", function (e) {
        if (e.target === els.productModal) closeProductModal();
      });
    }
    if (els.productsTable) {
      els.productsTable.addEventListener("click", function (e) {
        var editId = e.target.getAttribute("data-edit");
        var delId = e.target.getAttribute("data-delete");
        if (editId) openProductModal(editId);
        if (delId) deleteProduct(delId);
      });
    }

    if (window.Yosin && typeof window.Yosin.hydrateIcons === "function") {
      window.Yosin.hydrateIcons(document);
    }

    if (getToken() && getUser()) {
      showDashboardView();
    } else {
      showLoginView();
    }
  });
})();
