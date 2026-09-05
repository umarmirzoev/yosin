(function () {
  "use strict";

  var API_BASE = "https://91.227.41.15.nip.io/api";
  var TOKEN_KEY = "yosin_token";
  var USER_KEY = "yosin_user";

  var STATUS_LABELS = { New: "Новый", Processing: "В обработке", Shipped: "Отправлено", Delivered: "Доставлено", Cancelled: "Отменено" };
  var STATUS_CLASS = { New: "st-new", Processing: "st-processing", Shipped: "st-shipped", Delivered: "st-delivered", Cancelled: "st-cancelled" };
  var STATUS_NUMERIC = { New: 0, Processing: 1, Shipped: 2, Delivered: 3, Cancelled: 4 };
  var STATUS_ORDER = ["New", "Processing", "Shipped", "Delivered", "Cancelled"];

  var els = {};
  var state = {
    categories: [],
    brands: [],
    products: [],
    orders: [],
    customers: [],
    expenses: [],
    stats: null,
    orderFilter: "",
    productFilter: "",
    searchTerm: "",
    editingId: null,
    galleryImages: [],
  };

  /* ---------------- Session ---------------- */
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

  function uploadImage(file) {
    var fd = new FormData();
    fd.append("file", file);
    var headers = {};
    var token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;

    return fetch(API_BASE + "/upload/image", { method: "POST", headers: headers, body: fd })
      .catch(function () {
        throw new Error("Не удалось подключиться к серверу.");
      })
      .then(function (res) {
        if (res.status === 401 || res.status === 403) {
          clearSession();
          showLoginView("Сессия истекла, войдите снова.");
          throw new Error("Требуется повторный вход");
        }
        return res.json().then(function (data) {
          if (!res.ok) throw new Error((data && data.message) || "Не удалось загрузить фото");
          return data;
        });
      });
  }

  /* ---------------- View switching ---------------- */
  function showLoginView(errorMsg) {
    if (els.adminApp) els.adminApp.hidden = true;
    if (els.loginScreen) els.loginScreen.hidden = false;
    if (els.loginError) {
      els.loginError.textContent = errorMsg || "";
      els.loginError.hidden = !errorMsg;
    }
  }

  function showApp() {
    var user = getUser();
    if (!user || user.role !== "Admin") {
      showLoginView("У этого аккаунта нет прав администратора.");
      return;
    }
    if (els.loginScreen) els.loginScreen.hidden = true;
    if (els.adminApp) els.adminApp.hidden = false;
    if (els.adminName) els.adminName.textContent = user.fullName || "Admin";
    if (els.adminAvatar) els.adminAvatar.textContent = (user.fullName || "A").trim().charAt(0).toUpperCase();
    loadAll();
  }

  var VIEW_TITLES = { dashboard: "Дашборд", orders: "Заказы", products: "Товары", customers: "Клиенты", finance: "Финансы" };

  function switchView(view, opts) {
    opts = opts || {};
    document.querySelectorAll(".admin-view").forEach(function (v) { v.classList.remove("active"); });
    var target = document.getElementById("view-" + view);
    if (target) target.classList.add("active");
    if (els.viewTitle) els.viewTitle.textContent = VIEW_TITLES[view] || "";

    document.querySelectorAll(".admin-nav-group").forEach(function (g) {
      g.classList.toggle("active", g.getAttribute("data-group") === view);
    });
    document.querySelectorAll(".admin-nav-sub button").forEach(function (b) {
      b.classList.remove("active");
    });

    if (view === "orders") {
      if (typeof opts.orderFilter === "string") state.orderFilter = opts.orderFilter;
      document.querySelectorAll('.admin-nav-sub button[data-view="orders"]').forEach(function (b) {
        if ((b.getAttribute("data-order-filter") || "") === state.orderFilter) b.classList.add("active");
      });
      document.querySelectorAll(".admin-filter-tab").forEach(function (t) {
        t.classList.toggle("active", (t.getAttribute("data-status") || "") === state.orderFilter);
      });
      renderOrdersTable();
    }
    if (view === "products") {
      if (typeof opts.productFilter === "string") state.productFilter = opts.productFilter;
      document.querySelectorAll('.admin-nav-sub button[data-view="products"]').forEach(function (b) {
        if ((b.getAttribute("data-product-filter") || "") === state.productFilter) b.classList.add("active");
      });
      renderProductsTable();
    }
    if (view === "customers") renderCustomersTable();
    if (view === "finance") { renderFinanceCards(); renderExpensesTable(); }

    closeMobileSidebar();
  }

  function openNavGroup(name) {
    document.querySelectorAll(".admin-nav-group").forEach(function (g) {
      if (g.getAttribute("data-group") === name) g.classList.toggle("open");
      else g.classList.remove("open");
    });
  }

  function closeMobileSidebar() {
    if (els.sidebar) els.sidebar.classList.remove("open");
    if (els.sidebarOverlay) els.sidebarOverlay.hidden = true;
  }

  /* ---------------- Formatting helpers ---------------- */
  function formatMoney(v) {
    if (window.Yosin && typeof window.Yosin.formatPrice === "function") {
      return window.Yosin.formatPrice(v);
    }
    return Number(v || 0).toLocaleString("ru-RU") + " смн";
  }
  function formatDate(v) {
    if (!v) return "";
    try { return new Date(v).toLocaleDateString("ru-RU"); } catch (e) { return ""; }
  }
  function icon(name, size) {
    if (window.Yosin && typeof window.Yosin.icon === "function") return window.Yosin.icon(name, size);
    return "";
  }
  function matchesSearch(fields) {
    var term = (state.searchTerm || "").trim().toLowerCase();
    if (!term) return true;
    return fields.some(function (f) { return String(f || "").toLowerCase().indexOf(term) !== -1; });
  }

  /* ---------------- Data loading ---------------- */
  function loadAll() {
    if (els.loadError) { els.loadError.hidden = true; els.loadError.textContent = ""; }
    Promise.all([
      apiFetch("/categories").catch(function () { return []; }),
      apiFetch("/brands").catch(function () { return []; }),
      apiFetch("/products").catch(function () { return []; }),
      apiFetch("/admin/dashboard/stats").catch(function () { return null; }),
      apiFetch("/orders/admin/all").catch(function () { return []; }),
      apiFetch("/admin/customers").catch(function () { return []; }),
      apiFetch("/expenses").catch(function () { return []; }),
    ])
      .then(function (res) {
        state.categories = res[0] || [];
        state.brands = res[1] || [];
        state.products = Array.isArray(res[2]) ? res[2] : [];
        state.stats = res[3];
        state.orders = Array.isArray(res[4]) ? res[4] : [];
        state.customers = Array.isArray(res[5]) ? res[5] : [];
        state.expenses = Array.isArray(res[6]) ? res[6] : [];

        renderSelectOptions();
        renderStatCards();
        renderRevenueCard();
        renderRecentOrders();
        renderLowStock();
        renderOrdersTable();
        renderProductsTable();
        renderCustomersTable();
        renderFinanceCards();
        renderExpensesTable();
      })
      .catch(function (err) {
        if (els.loadError) {
          els.loadError.hidden = false;
          els.loadError.textContent = err.message || "Ошибка загрузки данных";
        }
      });
  }

  /* ---------------- Dashboard ---------------- */
  function renderStatCards() {
    if (!els.statCards) return;
    var orders = state.orders || [];
    var delivered = orders.filter(function (o) { return o.status === "Delivered"; }).length;
    var inProgress = orders.filter(function (o) { return o.status === "New" || o.status === "Processing" || o.status === "Shipped"; }).length;
    var cancelled = orders.filter(function (o) { return o.status === "Cancelled"; }).length;

    var cards = [
      { label: "Заказы", value: orders.length, sub: state.customers.length + " клиентов", ic: "clipboard", cls: "ic-gold" },
      { label: "Доставлено", value: delivered, sub: "", ic: "checkCircle", cls: "ic-green" },
      { label: "В работе", value: inProgress, sub: "", ic: "clock", cls: "ic-blue" },
      { label: "Отменено", value: cancelled, sub: "", ic: "xCircle", cls: "ic-red" },
    ];
    els.statCards.innerHTML = cards.map(function (c) {
      return '<div class="admin-stat-card">' +
        '<div class="ic ' + c.cls + '">' + icon(c.ic, 21) + "</div>" +
        '<div><div class="label">' + c.label + '</div><div class="value">' + c.value + "</div>" +
        (c.sub ? '<div class="label">' + c.sub + "</div>" : "") +
        "</div></div>";
    }).join("");
  }

  function renderRevenueCard() {
    if (!els.revenueCard) return;
    var s = state.stats;
    if (!s) { els.revenueCard.innerHTML = ""; return; }
    els.revenueCard.innerHTML =
      '<div class="admin-card-head"><h3>Доход платформы</h3></div>' +
      '<div style="display:flex;gap:36px;flex-wrap:wrap;">' +
      '<div><div class="label" style="color:var(--ink-faint);font-size:12px;">Выручка</div><div class="value" style="font-family:\'Fraunces\',Georgia,serif;font-size:22px;font-weight:600;">' + formatMoney(s.totalRevenue) + "</div></div>" +
      '<div><div class="label" style="color:var(--ink-faint);font-size:12px;">Расходы</div><div class="value" style="font-family:\'Fraunces\',Georgia,serif;font-size:22px;font-weight:600;">' + formatMoney(s.totalExpenses) + "</div></div>" +
      '<div><div class="label" style="color:var(--ink-faint);font-size:12px;">Прибыль</div><div class="value" style="font-family:\'Fraunces\',Georgia,serif;font-size:22px;font-weight:600;color:var(--success);">' + formatMoney(s.profit) + "</div></div>" +
      "</div>";
  }

  function orderRowBadge(status) {
    return '<span class="admin-badge ' + (STATUS_CLASS[status] || "") + '">' + (STATUS_LABELS[status] || status) + "</span>";
  }

  function renderRecentOrders() {
    if (!els.recentOrdersTable) return;
    var list = (state.orders || []).slice(0, 5);
    if (!list.length) {
      els.recentOrdersTable.innerHTML = '<p class="admin-empty-row">Заказов пока нет.</p>';
      return;
    }
    els.recentOrdersTable.innerHTML =
      '<table class="admin-data-table"><thead><tr><th>№</th><th>Товаров</th><th>Сумма</th><th>Статус</th><th>Дата</th></tr></thead><tbody>' +
      list.map(function (o) {
        return "<tr><td class='mono'>" + o.orderNumber + "</td><td>" + (o.items || []).length + "</td><td>" + formatMoney(o.totalAmount) + "</td><td>" + orderRowBadge(o.status) + "</td><td>" + formatDate(o.createdAt) + "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  function renderLowStock() {
    if (!els.lowStockList) return;
    var list = (state.stats && state.stats.lowStockProducts) || [];
    if (!list.length) {
      els.lowStockList.innerHTML = '<p class="admin-empty-row">Все товары в достатке.</p>';
      return;
    }
    els.lowStockList.innerHTML = list.map(function (p) {
      return '<div class="admin-lowstock-item"><span class="n">' + p.name + '</span><span class="s">' + p.stock + " шт.</span></div>";
    }).join("");
  }

  /* ---------------- Orders ---------------- */
  function renderOrdersTable() {
    if (!els.ordersTable) return;
    var list = (state.orders || []).filter(function (o) {
      if (state.orderFilter && o.status !== state.orderFilter) return false;
      return matchesSearch([o.orderNumber]);
    });
    if (!list.length) {
      els.ordersTable.innerHTML = '<p class="admin-empty-row">Заказов не найдено.</p>';
      return;
    }
    els.ordersTable.innerHTML =
      '<table class="admin-data-table"><thead><tr><th>№ заказа</th><th>Товаров</th><th>Сумма</th><th>Статус</th><th>Дата</th></tr></thead><tbody>' +
      list.map(function (o) {
        var options = STATUS_ORDER.map(function (s) {
          return '<option value="' + s + '"' + (s === o.status ? " selected" : "") + ">" + STATUS_LABELS[s] + "</option>";
        }).join("");
        return "<tr><td class='mono'>" + o.orderNumber + "</td><td>" + (o.items || []).length + " шт.</td><td>" + formatMoney(o.totalAmount) +
          "</td><td><select class='status-select' data-order-id='" + o.id + "'>" + options + "</select></td><td>" + formatDate(o.createdAt) + "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  function updateOrderStatus(orderId, newStatus) {
    var payload = { status: STATUS_NUMERIC[newStatus] };
    apiFetch("/orders/" + orderId + "/status", { method: "PUT", body: JSON.stringify(payload) })
      .then(function () {
        var order = state.orders.find(function (o) { return String(o.id) === String(orderId); });
        if (order) order.status = newStatus;
        renderStatCards();
        renderOrdersTable();
        renderRecentOrders();
        if (window.Yosin && typeof window.Yosin.showToast === "function") {
          window.Yosin.showToast("Статус заказа обновлён", "check");
        }
      })
      .catch(function (err) {
        window.alert(err.message || "Не удалось обновить статус");
        renderOrdersTable();
      });
  }

  /* ---------------- Products (reused logic) ---------------- */
  function renderSelectOptions() {
    if (els.categorySelect) {
      els.categorySelect.innerHTML = state.categories.map(function (c) { return '<option value="' + c.id + '">' + c.name + "</option>"; }).join("");
    }
    if (els.brandSelect) {
      els.brandSelect.innerHTML = '<option value="">—</option>' + state.brands.map(function (b) { return '<option value="' + b.id + '">' + b.name + "</option>"; }).join("");
    }
    if (els.expenseProductSelect) {
      els.expenseProductSelect.innerHTML = state.products.map(function (p) { return '<option value="' + p.id + '">' + p.name + "</option>"; }).join("");
    }
  }

  function renderProductsTable() {
    if (!els.productsTable) return;
    var list = (state.products || []).filter(function (p) {
      if (state.productFilter === "low" && Number(p.stock) > 5) return false;
      return matchesSearch([p.name, p.categoryName, p.brandName]);
    });
    if (!list.length) {
      els.productsTable.innerHTML = '<p class="admin-empty">Товаров не найдено.</p>';
      return;
    }
    els.productsTable.innerHTML = list.map(function (p) {
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
    }).join("");
  }

  function renderMainImagePreview(url) {
    if (!els.mainImagePreview) return;
    if (url) {
      els.mainImagePreview.innerHTML = '<img src="' + url + '" alt="">';
    } else {
      els.mainImagePreview.innerHTML = icon("box", 22);
    }
  }

  function renderGalleryGrid() {
    if (!els.galleryGrid) return;
    els.galleryGrid.innerHTML = (state.galleryImages || []).map(function (url, idx) {
      return '<div class="admin-gallery-item"><img src="' + url + '" alt="">' +
        '<button type="button" class="rm" data-remove-gallery="' + idx + '">&times;</button></div>';
    }).join("");
  }

  function openProductModal(id) {
    state.editingId = id || null;
    if (els.productForm) els.productForm.reset();
    if (els.productFormError) { els.productFormError.hidden = true; els.productFormError.textContent = ""; }
    if (els.mainImageStatus) els.mainImageStatus.hidden = true;
    if (els.galleryStatus) els.galleryStatus.hidden = true;

    if (id) {
      var p = state.products.find(function (x) { return String(x.id) === String(id); });
      if (els.modalTitle) els.modalTitle.textContent = "Изменить товар";
      if (p) {
        setFieldValue("id", p.id);
        setFieldValue("name", p.name);
        setFieldValue("slug", p.slug);
        setFieldValue("description", p.description);
        setFieldValue("price", p.price);
        setFieldValue("oldPrice", p.oldPrice);
        setFieldValue("costPrice", 0);
        setFieldValue("stock", p.stock);
        setFieldValue("mainImageUrl", p.mainImageUrl);
        setFieldValue("availableColors", p.availableColors);
        setFieldValue("storageOptions", p.storageOptions);
        setFieldValue("categoryId", p.categoryId);
        setFieldValue("brandId", p.brandId);
        renderMainImagePreview(p.mainImageUrl);
        state.galleryImages = Array.isArray(p.images) ? p.images.slice() : [];
      }
    } else {
      if (els.modalTitle) els.modalTitle.textContent = "Добавить товар";
      setFieldValue("id", "");
      renderMainImagePreview(null);
      state.galleryImages = [];
    }
    renderGalleryGrid();
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
    state.galleryImages = [];
  }

  function handleMainImageInput(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (els.mainImageStatus) { els.mainImageStatus.hidden = false; els.mainImageStatus.classList.remove("err"); els.mainImageStatus.textContent = "Загрузка…"; }
    uploadImage(file)
      .then(function (data) {
        setFieldValue("mainImageUrl", data.url);
        renderMainImagePreview(data.url);
        if (els.mainImageStatus) els.mainImageStatus.hidden = true;
      })
      .catch(function (err) {
        if (els.mainImageStatus) {
          els.mainImageStatus.hidden = false;
          els.mainImageStatus.classList.add("err");
          els.mainImageStatus.textContent = err.message || "Не удалось загрузить фото";
        }
      })
      .finally(function () { e.target.value = ""; });
  }

  function handleGalleryInput(e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    if (!files.length) return;
    if (els.galleryStatus) { els.galleryStatus.hidden = false; els.galleryStatus.classList.remove("err"); els.galleryStatus.textContent = "Загрузка…"; }
    Promise.all(files.map(function (f) { return uploadImage(f); }))
      .then(function (results) {
        results.forEach(function (data) { state.galleryImages.push(data.url); });
        renderGalleryGrid();
        if (els.galleryStatus) els.galleryStatus.hidden = true;
      })
      .catch(function (err) {
        if (els.galleryStatus) {
          els.galleryStatus.hidden = false;
          els.galleryStatus.classList.add("err");
          els.galleryStatus.textContent = err.message || "Не удалось загрузить фото";
        }
        renderGalleryGrid();
      })
      .finally(function () { e.target.value = ""; });
  }

  function addBrandQuick() {
    var name = window.prompt("Название бренда (например Apple, Samsung):");
    if (!name || !name.trim()) return;
    apiFetch("/brands", { method: "POST", body: JSON.stringify({ name: name.trim() }) })
      .then(function (brand) {
        state.brands.push(brand);
        renderSelectOptions();
        if (els.brandSelect) els.brandSelect.value = brand.id;
      })
      .catch(function (err) { window.alert(err.message || "Не удалось добавить бренд"); });
  }

  function deleteProduct(id) {
    if (!window.confirm("Удалить этот товар?")) return;
    apiFetch("/products/" + id, { method: "DELETE" })
      .then(function () {
        state.products = state.products.filter(function (p) { return String(p.id) !== String(id); });
        renderProductsTable();
        renderSelectOptions();
        if (window.Yosin && typeof window.Yosin.showToast === "function") {
          window.Yosin.showToast("Товар удалён", "trash");
        }
      })
      .catch(function (err) { window.alert(err.message || "Не удалось удалить товар"); });
  }

  function submitProductForm(e) {
    e.preventDefault();
    var fd = new FormData(els.productForm);
    var id = fd.get("id");
    var payload = {
      name: fd.get("name") || "",
      slug: fd.get("slug") || "",
      description: fd.get("description") || "",
      price: Number(fd.get("price") || 0),
      oldPrice: fd.get("oldPrice") ? Number(fd.get("oldPrice")) : null,
      costPrice: Number(fd.get("costPrice") || 0),
      stock: Number(fd.get("stock") || 0),
      mainImageUrl: fd.get("mainImageUrl") || "",
      availableColors: fd.get("availableColors") ? String(fd.get("availableColors")).trim() : null,
      storageOptions: fd.get("storageOptions") ? String(fd.get("storageOptions")).trim() : null,
      categoryId: Number(fd.get("categoryId") || 0),
      brandId: fd.get("brandId") ? Number(fd.get("brandId")) : null,
      images: (state.galleryImages || []).slice(),
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

  /* ---------------- Customers ---------------- */
  function renderCustomersTable() {
    if (!els.customersTable) return;
    var list = (state.customers || []).filter(function (c) {
      return matchesSearch([c.fullName, c.phone, c.email]);
    });
    if (!list.length) {
      els.customersTable.innerHTML = '<p class="admin-empty-row">Клиентов не найдено.</p>';
      return;
    }
    els.customersTable.innerHTML =
      '<table class="admin-data-table"><thead><tr><th>Имя</th><th>Телефон</th><th>Заказов</th><th>Потрачено</th><th>Регистрация</th></tr></thead><tbody>' +
      list.map(function (c) {
        return "<tr><td>" + (c.fullName || "") + "</td><td class='mono'>" + (c.phone || "") + "</td><td>" + c.ordersCount +
          "</td><td>" + formatMoney(c.totalSpent) + "</td><td>" + formatDate(c.createdAt) + "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  /* ---------------- Finance ---------------- */
  function renderFinanceCards() {
    if (!els.financeCards) return;
    var s = state.stats;
    if (!s) { els.financeCards.innerHTML = ""; return; }
    var cards = [
      { label: "Выручка", value: formatMoney(s.totalRevenue), ic: "wallet", cls: "ic-gold" },
      { label: "Расходы", value: formatMoney(s.totalExpenses), ic: "clipboard", cls: "ic-red" },
      { label: "Прибыль", value: formatMoney(s.profit), ic: "checkCircle", cls: "ic-green" },
    ];
    els.financeCards.innerHTML = cards.map(function (c) {
      return '<div class="admin-stat-card"><div class="ic ' + c.cls + '">' + icon(c.ic, 21) + '</div><div><div class="label">' + c.label + '</div><div class="value">' + c.value + "</div></div></div>";
    }).join("");
  }

  function renderExpensesTable() {
    if (!els.expensesTable) return;
    var list = state.expenses || [];
    if (!list.length) {
      els.expensesTable.innerHTML = '<p class="admin-empty-row">Расходов пока нет.</p>';
      return;
    }
    els.expensesTable.innerHTML =
      '<table class="admin-data-table"><thead><tr><th>Товар</th><th>Сумма</th><th>Описание</th><th>Дата</th><th></th></tr></thead><tbody>' +
      list.map(function (e) {
        return "<tr><td>" + (e.productName || "") + "</td><td>" + formatMoney(e.amount) + "</td><td>" + (e.description || "—") +
          "</td><td>" + formatDate(e.expenseDate) + "</td><td><button type='button' class='btn btn-sm btn-danger-outline' data-delete-expense='" + e.id + "'>Удалить</button></td></tr>";
      }).join("") + "</tbody></table>";
  }

  function openExpenseModal() {
    if (els.expenseForm) els.expenseForm.reset();
    if (els.expenseFormError) { els.expenseFormError.hidden = true; els.expenseFormError.textContent = ""; }
    renderSelectOptions();
    if (els.expenseModal) els.expenseModal.hidden = false;
  }
  function closeExpenseModal() {
    if (els.expenseModal) els.expenseModal.hidden = true;
  }
  function submitExpenseForm(e) {
    e.preventDefault();
    var fd = new FormData(els.expenseForm);
    var payload = {
      productId: Number(fd.get("productId") || 0),
      amount: Number(fd.get("amount") || 0),
      description: fd.get("description") || "",
    };
    apiFetch("/expenses", { method: "POST", body: JSON.stringify(payload) })
      .then(function () {
        closeExpenseModal();
        if (window.Yosin && typeof window.Yosin.showToast === "function") window.Yosin.showToast("Расход добавлен", "check");
        loadAll();
      })
      .catch(function (err) {
        if (els.expenseFormError) {
          els.expenseFormError.hidden = false;
          els.expenseFormError.textContent = err.message || "Не удалось сохранить расход";
        }
      });
  }
  function deleteExpense(id) {
    if (!window.confirm("Удалить этот расход?")) return;
    apiFetch("/expenses/" + id, { method: "DELETE" })
      .then(function () {
        state.expenses = state.expenses.filter(function (e) { return String(e.id) !== String(id); });
        renderExpensesTable();
      })
      .catch(function (err) { window.alert(err.message || "Не удалось удалить расход"); });
  }

  /* ---------------- Auth ---------------- */
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
          return res.text().then(function (t) { throw new Error(t || "Неверный телефон или пароль"); });
        }
        return res.json();
      })
      .then(function (data) {
        if (data.role !== "Admin") throw new Error("Этот номер не имеет прав администратора");
        setSession(data.token, data);
        showApp();
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

  /* ---------------- Wiring ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    els.loginScreen = document.getElementById("adminLoginScreen");
    els.adminApp = document.getElementById("adminApp");
    els.loginForm = document.getElementById("loginForm");
    els.loginError = document.getElementById("loginError");
    els.adminName = document.getElementById("adminName");
    els.adminAvatar = document.getElementById("adminAvatar");
    els.loadError = document.getElementById("adminLoadError");
    els.viewTitle = document.getElementById("viewTitle");
    els.sidebar = document.getElementById("adminSidebar");
    els.sidebarOverlay = document.getElementById("sidebarOverlay");
    els.sidebarToggle = document.getElementById("sidebarToggle");
    els.refreshBtn = document.getElementById("refreshBtn");
    els.globalSearch = document.getElementById("globalSearch");
    els.logoutBtn = document.getElementById("logoutBtn");

    els.statCards = document.getElementById("statCards");
    els.revenueCard = document.getElementById("revenueCard");
    els.recentOrdersTable = document.getElementById("recentOrdersTable");
    els.lowStockList = document.getElementById("lowStockList");
    els.ordersTable = document.getElementById("ordersTable");
    els.customersTable = document.getElementById("customersTable");
    els.financeCards = document.getElementById("financeCards");
    els.expensesTable = document.getElementById("expensesTable");

    els.addProductBtn = document.getElementById("addProductBtn");
    els.productsTable = document.getElementById("productsTable");
    els.productModal = document.getElementById("productModal");
    els.productForm = document.getElementById("productForm");
    els.productFormError = document.getElementById("productFormError");
    els.cancelProductBtn = document.getElementById("cancelProductBtn");
    els.closeProductModal = document.getElementById("closeProductModal");
    els.categorySelect = document.getElementById("categorySelect");
    els.brandSelect = document.getElementById("brandSelect");
    els.addBrandBtn = document.getElementById("addBrandBtn");
    els.modalTitle = document.getElementById("productModalTitle");
    els.mainImagePreview = document.getElementById("mainImagePreview");
    els.mainImageInput = document.getElementById("mainImageInput");
    els.mainImageStatus = document.getElementById("mainImageStatus");
    els.galleryGrid = document.getElementById("galleryGrid");
    els.galleryInput = document.getElementById("galleryInput");
    els.galleryStatus = document.getElementById("galleryStatus");

    els.addExpenseBtn = document.getElementById("addExpenseBtn");
    els.expenseModal = document.getElementById("expenseModal");
    els.expenseForm = document.getElementById("expenseForm");
    els.expenseFormError = document.getElementById("expenseFormError");
    els.expenseProductSelect = document.getElementById("expenseProductSelect");
    els.cancelExpenseBtn = document.getElementById("cancelExpenseBtn");
    els.closeExpenseModal = document.getElementById("closeExpenseModal");

    if (els.loginForm) els.loginForm.addEventListener("submit", submitLoginForm);
    if (els.logoutBtn) els.logoutBtn.addEventListener("click", logout);
    if (els.refreshBtn) els.refreshBtn.addEventListener("click", loadAll);
    if (els.globalSearch) {
      els.globalSearch.addEventListener("input", function () {
        state.searchTerm = els.globalSearch.value || "";
        renderOrdersTable();
        renderProductsTable();
        renderCustomersTable();
      });
    }

    if (els.sidebarToggle) {
      els.sidebarToggle.addEventListener("click", function () {
        els.sidebar.classList.add("open");
        if (els.sidebarOverlay) els.sidebarOverlay.hidden = false;
      });
    }
    if (els.sidebarOverlay) els.sidebarOverlay.addEventListener("click", closeMobileSidebar);

    // Sidebar accordion toggles
    document.querySelectorAll("[data-toggle-group]").forEach(function (btn) {
      btn.addEventListener("click", function () { openNavGroup(btn.getAttribute("data-toggle-group")); });
    });

    // Delegated click for anything with data-view (sidebar top-level items, sub-items, "Все заказы" links in cards)
    document.addEventListener("click", function (e) {
      var el = e.target.closest("[data-view]");
      if (!el) return;
      var view = el.getAttribute("data-view");
      var opts = {};
      if (el.hasAttribute("data-order-filter")) opts.orderFilter = el.getAttribute("data-order-filter");
      if (el.hasAttribute("data-product-filter")) opts.productFilter = el.getAttribute("data-product-filter");
      else if (view === "products" && el.id === "view-products") {}
      switchView(view, opts);
    });

    // Order status filter tabs (inside Orders view)
    if (els.ordersTable) {
      document.querySelectorAll(".admin-filter-tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
          document.querySelectorAll(".admin-filter-tab").forEach(function (t) { t.classList.remove("active"); });
          tab.classList.add("active");
          state.orderFilter = tab.getAttribute("data-status") || "";
          document.querySelectorAll('.admin-nav-sub button[data-view="orders"]').forEach(function (b) {
            b.classList.toggle("active", (b.getAttribute("data-order-filter") || "") === state.orderFilter);
          });
          renderOrdersTable();
        });
      });
      els.ordersTable.addEventListener("change", function (e) {
        var sel = e.target.closest(".status-select");
        if (!sel) return;
        updateOrderStatus(sel.getAttribute("data-order-id"), sel.value);
      });
    }

    // Product modal + table actions
    if (els.addProductBtn) els.addProductBtn.addEventListener("click", function () { openProductModal(null); });
    if (els.cancelProductBtn) els.cancelProductBtn.addEventListener("click", closeProductModal);
    if (els.closeProductModal) els.closeProductModal.addEventListener("click", closeProductModal);
    if (els.productForm) els.productForm.addEventListener("submit", submitProductForm);
    if (els.productModal) {
      els.productModal.addEventListener("click", function (e) { if (e.target === els.productModal) closeProductModal(); });
    }
    if (els.productsTable) {
      els.productsTable.addEventListener("click", function (e) {
        var editId = e.target.getAttribute("data-edit");
        var delId = e.target.getAttribute("data-delete");
        if (editId) openProductModal(editId);
        if (delId) deleteProduct(delId);
      });
    }
    if (els.mainImageInput) els.mainImageInput.addEventListener("change", handleMainImageInput);
    if (els.galleryInput) els.galleryInput.addEventListener("change", handleGalleryInput);
    if (els.addBrandBtn) els.addBrandBtn.addEventListener("click", addBrandQuick);
    if (els.galleryGrid) {
      els.galleryGrid.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-remove-gallery]");
        if (!btn) return;
        var idx = Number(btn.getAttribute("data-remove-gallery"));
        state.galleryImages.splice(idx, 1);
        renderGalleryGrid();
      });
    }

    // Expense modal
    if (els.addExpenseBtn) els.addExpenseBtn.addEventListener("click", openExpenseModal);
    if (els.cancelExpenseBtn) els.cancelExpenseBtn.addEventListener("click", closeExpenseModal);
    if (els.closeExpenseModal) els.closeExpenseModal.addEventListener("click", closeExpenseModal);
    if (els.expenseForm) els.expenseForm.addEventListener("submit", submitExpenseForm);
    if (els.expenseModal) {
      els.expenseModal.addEventListener("click", function (e) { if (e.target === els.expenseModal) closeExpenseModal(); });
    }
    if (els.expensesTable) {
      els.expensesTable.addEventListener("click", function (e) {
        var delId = e.target.getAttribute("data-delete-expense");
        if (delId) deleteExpense(delId);
      });
    }

    if (window.Yosin && typeof window.Yosin.hydrateIcons === "function") {
      window.Yosin.hydrateIcons(document);
    }

    if (getToken() && getUser()) {
      showApp();
    } else {
      showLoginView();
    }
  });
})();
