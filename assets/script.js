/* ==========================================================================
   YOSIN STORE — shared app logic
   Vanilla JS, no build step. Product data comes from data/products.js
   (loaded as window.YOSIN_PRODUCTS so pages work over file:// too).
   ========================================================================== */

(function () {
  "use strict";

  var CATEGORY_LABELS = {
    phones: "Смартфоны",
    watches: "Смарт-часы",
    headphones: "Наушники",
    chargers: "Зарядные устройства",
    powerbank: "Powerbank",
    accessories: "Аксессуары"
  };

  var CATEGORY_PLURAL_ICON = {
    phones: "phone",
    watches: "watch",
    headphones: "headphones",
    chargers: "zap",
    powerbank: "battery",
    accessories: "box"
  };

  var FREE_SHIPPING_THRESHOLD = 3000;
  var SHIPPING_FLAT = 40;
  var PROMO_CODES = { "YOSIN10": 0.10, "ZOLOTO": 0.15 };

  var CART_KEY = "yosin_cart_v1";
  var FAV_KEY = "yosin_favs_v1";
  var PROMO_KEY = "yosin_promo_v1";

  /* ---------------- Icons ---------------- */
  var ICON_PATHS = {
    phone: '<rect x="7" y="2" width="10" height="20" rx="2.4" ry="2.4"></rect><line x1="10.5" y1="18.3" x2="13.5" y2="18.3"></line>',
    watch: '<rect x="9" y="1.2" width="6" height="4" rx="1"></rect><rect x="9" y="18.8" width="6" height="4" rx="1"></rect><circle cx="12" cy="12" r="6.6"></circle><path d="M12 9v3l2 1.6"></path>',
    headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"></path><rect x="2" y="15" width="5" height="6.5" rx="2"></rect><rect x="17" y="15" width="5" height="6.5" rx="2"></rect>',
    zap: '<path d="M13 2 4 14h6.5L10 22l9.5-13H13l0.5-7z"></path>',
    battery: '<rect x="2" y="7.5" width="17" height="9" rx="2"></rect><line x1="21.5" y1="10.5" x2="21.5" y2="13.5"></line><path d="M8 9.5 6 12.2h3L7 16.5"></path>',
    box: '<path d="M21 7.5 12 3 3 7.5 12 12l9-4.5z"></path><path d="M3 7.5v9L12 21l9-4.5v-9"></path><line x1="12" y1="12" x2="12" y2="21"></line>',
    search: '<circle cx="11" cy="11" r="7.2"></circle><line x1="21" y1="21" x2="16.4" y2="16.4"></line>',
    heart: '<path d="M12 20.5s-7.2-4.4-9.6-8.6C0.7 8.2 2.3 4 6.3 4c2 0 3.6 1.3 5.7 4 2.1-2.7 3.7-4 5.7-4 4 0 5.6 4.2 3.9 7.9C19.2 16.1 12 20.5 12 20.5z"></path>',
    cart: '<path d="M6.2 7.5h12.6l-1.2 11.3a1.6 1.6 0 0 1-1.6 1.4H9a1.6 1.6 0 0 1-1.6-1.4L6.2 7.5z"></path><path d="M9 7.5V6a3 3 0 0 1 6 0v1.5"></path>',
    menu: '<line x1="3" y1="6.5" x2="21" y2="6.5"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="17.5" x2="21" y2="17.5"></line>',
    x: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
    chevronRight: '<polyline points="9 18 15 12 9 6"></polyline>',
    chevronLeft: '<polyline points="15 18 9 12 15 6"></polyline>',
    arrowRight: '<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>',
    truck: '<rect x="1" y="6.5" width="13" height="10.5" rx="1.2"></rect><path d="M14 10.2h3.8l3.2 3.2v3.6H14z"></path><circle cx="6" cy="19" r="1.7"></circle><circle cx="17.3" cy="19" r="1.7"></circle>',
    shield: '<path d="M12 2.2 20 5.6v5.6c0 5.2-3.5 8.9-8 11-4.5-2.1-8-5.8-8-11V5.6L12 2.2z"></path>',
    award: '<circle cx="12" cy="8.2" r="5.6"></circle><path d="M8.4 13 6.8 21l5.2-2.8 5.2 2.8-1.6-8"></path>',
    check: '<polyline points="20 6 9 17 4 12"></polyline>',
    checkCircle: '<circle cx="12" cy="12" r="9.5"></circle><polyline points="8 12.5 11 15.5 16 9"></polyline>',
    trash: '<polyline points="4 6.5 6 6.5 20 6.5"></polyline><path d="M8.5 6.5V4.8a1.6 1.6 0 0 1 1.6-1.6h3.8a1.6 1.6 0 0 1 1.6 1.6V6.5"></path><path d="M6.5 6.5 7.3 20a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l0.8-13.5"></path>',
    mapPin: '<path d="M12 21.5s-7-6.2-7-11.8a7 7 0 0 1 14 0c0 5.6-7 11.8-7 11.8z"></path><circle cx="12" cy="9.6" r="2.3"></circle>',
    tag: '<path d="M20 12.4 12.6 20a1.7 1.7 0 0 1-2.4 0l-6.2-6.2a1.7 1.7 0 0 1 0-2.4L11.4 4h6.2a2.4 2.4 0 0 1 2.4 2.4v6z"></path><circle cx="15.6" cy="8.4" r="1.3"></circle>',
    home: '<path d="M4 11.5 12 4l8 7.5"></path><path d="M6 10v9.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10"></path><path d="M9.5 20.3v-5.8h5v5.8"></path>',
    grid: '<rect x="3.4" y="3.4" width="7.6" height="7.6" rx="1.8"></rect><rect x="13" y="3.4" width="7.6" height="7.6" rx="1.8"></rect><rect x="3.4" y="13" width="7.6" height="7.6" rx="1.8"></rect><rect x="13" y="13" width="7.6" height="7.6" rx="1.8"></rect>',
    user: '<circle cx="12" cy="8" r="3.6"></circle><path d="M4.5 20.2c1-3.6 4.2-5.6 7.5-5.6s6.5 2 7.5 5.6"></path>',
    clipboard: '<rect x="5.5" y="4" width="13" height="17" rx="2"></rect><path d="M9 4V3.2A1.2 1.2 0 0 1 10.2 2h3.6a1.2 1.2 0 0 1 1.2 1.2V4"></path><line x1="8.5" y1="10.5" x2="15.5" y2="10.5"></line><line x1="8.5" y1="14.5" x2="15.5" y2="14.5"></line>',
    wallet: '<rect x="2.3" y="6" width="19.4" height="13" rx="2.2"></rect><path d="M2.3 10.2h19.4"></path><circle cx="17" cy="14.3" r="1.3"></circle>',
    bell: '<path d="M6 9.2a6 6 0 0 1 12 0c0 4.2 1.6 5.7 2.2 6.8H3.8C4.4 14.9 6 13.4 6 9.2z"></path><path d="M10 19a2 2 0 0 0 4 0"></path>',
    logout: '<path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="15 16 20 12 15 8"></polyline><line x1="20" y1="12" x2="9.5" y2="12"></line>',
    refresh: '<path d="M20 11.5A8 8 0 0 0 6.3 6.3L4 8.6"></path><path d="M4 4v4.6h4.6"></path><path d="M4 12.5a8 8 0 0 0 13.7 4.7L20 15.4"></path><path d="M20 20v-4.6h-4.6"></path>',
    clock: '<circle cx="12" cy="12" r="9.5"></circle><polyline points="12 7 12 12 15.5 14"></polyline>',
    xCircle: '<circle cx="12" cy="12" r="9.5"></circle><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line>',
    chevronDown: '<polyline points="6 9 12 15 18 9"></polyline>'
  };

  function icon(name, size, extraClass) {
    var path = ICON_PATHS[name] || "";
    size = size || 20;
    return '<svg class="icon-wrap' + (extraClass ? " " + extraClass : "") + '" width="' + size + '" height="' + size +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  /* ---------------- Data helpers ---------------- */
  function allProducts() { return window.YOSIN_PRODUCTS || []; }

  /* ---------------- Live catalog from the real backend ----------------
     data/products.js seeds window.YOSIN_PRODUCTS synchronously so pages
     render instantly; real products from the admin panel are fetched here
     and merged in on top, then every page listening via onProductsReady
     re-renders automatically (usually well under a second later). */
  var PRODUCTS_API_BASE = "https://91.227.41.15.nip.io/api";
  var productsReadyCallbacks = [];
  var apiProductsLoaded = false;

  function onProductsReady(cb) {
    if (typeof cb !== "function") return;
    productsReadyCallbacks.push(cb);
    cb();
  }
  function notifyProductsReady() {
    productsReadyCallbacks.slice().forEach(function (cb) {
      try { cb(); } catch (e) {}
    });
  }

  function mapApiProduct(p, categorySlugById) {
    return {
      id: p.slug,
      apiId: p.id,
      name: p.name,
      brand: p.brandName || "",
      category: categorySlugById[p.categoryId] || "accessories",
      price: p.price,
      oldPrice: p.oldPrice || null,
      rating: 0,
      reviews: 0,
      badge: null,
      colors: [],
      availableColors: p.availableColors || "",
      storageOptions: p.storageOptions || "",
      mainImageUrl: p.mainImageUrl || "",
      images: Array.isArray(p.images) ? p.images : [],
      specs: {},
      description: p.description || ""
    };
  }

  function loadApiProducts() {
    Promise.all([
      fetch(PRODUCTS_API_BASE + "/products").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      fetch(PRODUCTS_API_BASE + "/categories").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
    ]).then(function (res) {
      var apiProducts = Array.isArray(res[0]) ? res[0] : [];
      var categories = Array.isArray(res[1]) ? res[1] : [];
      var categorySlugById = {};
      categories.forEach(function (c) { categorySlugById[c.id] = c.slug; });

      var mapped = apiProducts.map(function (p) { return mapApiProduct(p, categorySlugById); });
      var demo = (window.YOSIN_PRODUCTS || []).filter(function (d) {
        return !mapped.some(function (m) { return m.id === d.id; });
      });
      window.YOSIN_PRODUCTS = mapped.concat(demo);
      apiProductsLoaded = true;
      notifyProductsReady();
    });
  }
  loadApiProducts();
  function productById(id) {
    var list = allProducts();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function relatedProducts(product, limit) {
    limit = limit || 4;
    return allProducts()
      .filter(function (p) { return p.category === product.category && p.id !== product.id; })
      .slice(0, limit);
  }
  function categoryLabel(cat) { return CATEGORY_LABELS[cat] || cat; }

  function formatPrice(n) {
    return n.toLocaleString("ru-RU") + " смн";
  }

  function starString(rating) {
    var full = Math.round(rating * 2) / 2;
    var out = "";
    for (var i = 1; i <= 5; i++) {
      if (full >= i) out += "★";
      else if (full >= i - 0.5) out += "★"; // simplified: treat half as full visually, tone via count text
      else out += "☆";
    }
    return out;
  }

  /* ---------------- Storage ---------------- */
  function readJSON(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key));
      return v || fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function getCart() { return readJSON(CART_KEY, []); }
  function setCart(cart) { writeJSON(CART_KEY, cart); updateHeaderBadges(); }
  function cartCount() {
    return getCart().reduce(function (sum, it) { return sum + it.qty; }, 0);
  }
  function addToCart(id, qty) {
    qty = qty || 1;
    var cart = getCart();
    var existing = cart.filter(function (it) { return it.id === id; })[0];
    if (existing) existing.qty += qty; else cart.push({ id: id, qty: qty });
    setCart(cart);
  }
  function setQtyInCart(id, qty) {
    var cart = getCart();
    if (qty <= 0) {
      cart = cart.filter(function (it) { return it.id !== id; });
    } else {
      var existing = cart.filter(function (it) { return it.id === id; })[0];
      if (existing) existing.qty = qty;
    }
    setCart(cart);
  }
  function removeFromCart(id) {
    setCart(getCart().filter(function (it) { return it.id !== id; }));
  }
  function clearCart() { setCart([]); writeJSON(PROMO_KEY, null); }

  function getFavs() { return readJSON(FAV_KEY, []); }
  function isFav(id) { return getFavs().indexOf(id) !== -1; }
  function toggleFav(id) {
    var favs = getFavs();
    var idx = favs.indexOf(id);
    if (idx === -1) favs.push(id); else favs.splice(idx, 1);
    writeJSON(FAV_KEY, favs);
    updateHeaderBadges();
    return favs.indexOf(id) !== -1;
  }

  function getPromo() { return readJSON(PROMO_KEY, null); }
  function applyPromo(code) {
    var normalized = (code || "").trim().toUpperCase();
    if (PROMO_CODES.hasOwnProperty(normalized)) {
      writeJSON(PROMO_KEY, { code: normalized, rate: PROMO_CODES[normalized] });
      return PROMO_CODES[normalized];
    }
    writeJSON(PROMO_KEY, null);
    return null;
  }

  function calcTotals(cartItems) {
    var subtotal = 0;
    cartItems.forEach(function (line) {
      var p = productById(line.product ? line.product.id : line.id);
      if (p) subtotal += p.price * line.qty;
    });
    var promo = getPromo();
    var discount = promo ? Math.round(subtotal * promo.rate) : 0;
    var afterDiscount = subtotal - discount;
    var shipping = afterDiscount >= FREE_SHIPPING_THRESHOLD || afterDiscount === 0 ? 0 : SHIPPING_FLAT;
    var total = afterDiscount + shipping;
    return { subtotal: subtotal, discount: discount, shipping: shipping, total: total, promo: promo };
  }

  function cartLines() {
    return getCart().map(function (it) {
      return { id: it.id, qty: it.qty, product: productById(it.id) };
    }).filter(function (line) { return !!line.product; });
  }

  /* ---------------- Rendering: product thumb / card ---------------- */
  function thumbHTML(product, opts) {
    opts = opts || {};
    var badgeHTML = "";
    if (product.oldPrice) badgeHTML = '<span class="badge">Скидка</span>';
    else if (product.badge === "Новинка") badgeHTML = '<span class="badge new">Новинка</span>';
    else if (product.badge) badgeHTML = '<span class="badge hit">' + product.badge + '</span>';

    var favHTML = "";
    if (opts.withFav !== false) {
      var on = isFav(product.id);
      favHTML = '<button class="fav-toggle' + (on ? " on" : "") + '" data-fav-id="' + product.id + '" aria-label="В избранное" onclick="event.preventDefault();Yosin.handleFavClick(this)">' +
        icon("heart", 15) + '</button>';
    }
    var mediaHTML = product.mainImageUrl
      ? '<img src="' + product.mainImageUrl + '" alt="' + product.name + '" loading="lazy">'
      : icon(CATEGORY_PLURAL_ICON[product.category] || "box", opts.iconSize || 64);
    return '<div class="product-thumb">' + badgeHTML + favHTML + mediaHTML + '</div>';
  }

  function cardHTML(product) {
    var priceRow = '<span class="price">' + formatPrice(product.price) + '</span>' +
      (product.oldPrice ? '<span class="old-price">' + formatPrice(product.oldPrice) + '</span>' : "");
    return (
      '<article class="product-card">' +
      '<a href="product.html?id=' + product.id + '" aria-label="' + product.name + '">' +
      thumbHTML(product) +
      '</a>' +
      '<div class="product-info">' +
      '<span class="brand">' + product.brand + '</span>' +
      '<a href="product.html?id=' + product.id + '"><h3 class="name">' + product.name + '</h3></a>' +
      (product.reviews ? '<div class="rating"><span class="stars">' + starString(product.rating) + '</span><span>' + product.rating.toFixed(1) + ' · ' + product.reviews + '</span></div>' : '') +
      '<div class="price-row">' + priceRow + '</div>' +
      '<div class="add-row">' +
      '<button class="btn btn-ghost" style="flex:0 0 auto;padding:9px 12px;" onclick="Yosin.handleQuickFav(this,\'' + product.id + '\')" aria-label="В избранное">' + icon("heart", 15, isFav(product.id) ? "fav-inline on" : "fav-inline") + '</button>' +
      '<button class="btn btn-primary" onclick="Yosin.handleQuickAdd(this,\'' + product.id + '\')">В корзину</button>' +
      '</div></div></article>'
    );
  }

  function renderGrid(container, products, emptyMessage, emptyIcon, emptyTitle) {
    if (!container) return;
    if (!products.length) {
      container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">' +
        icon(emptyIcon || "search", 56) + '<h3>' + (emptyTitle || "Ничего не найдено") + '</h3><p>' + (emptyMessage || "Попробуйте изменить фильтры или запрос") + '</p></div>';
      return;
    }
    container.innerHTML = products.map(cardHTML).join("");
  }

  /* ---------------- Header / global UI wiring ---------------- */
  function updateHeaderBadges() {
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      var n = cartCount();
      el.textContent = n;
      el.style.display = n > 0 ? "flex" : "none";
    });
    document.querySelectorAll("[data-fav-count]").forEach(function (el) {
      var n = getFavs().length;
      el.textContent = n;
      el.style.display = n > 0 ? "flex" : "none";
    });
  }

  function showToast(message, iconName) {
    var el = document.getElementById("yosin-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "yosin-toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.innerHTML = icon(iconName || "checkCircle", 17) + "<span>" + message + "</span>";
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove("show"); }, 2200);
  }

  function handleQuickAdd(btn, id) {
    addToCart(id, 1);
    var p = productById(id);
    showToast((p ? p.name : "Товар") + " добавлен в корзину", "cart");
  }
  function handleQuickFav(btn, id) {
    var on = toggleFav(id);
    var svg = btn.querySelector("svg");
    if (svg) svg.parentElement.classList.toggle("on", on);
    showToast(on ? "Добавлено в избранное" : "Убрано из избранного", "heart");
  }
  function handleFavClick(btn) {
    var id = btn.getAttribute("data-fav-id");
    var on = toggleFav(id);
    btn.classList.toggle("on", on);
    showToast(on ? "Добавлено в избранное" : "Убрано из избранного", "heart");
    if (document.body.dataset.page === "favorites" && !on) {
      var card = btn.closest(".product-card");
      if (card) card.remove();
      var grid = document.getElementById("favGrid");
      if (grid && !grid.children.length) renderGrid(grid, []);
    }
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function wireHeader() {
    updateHeaderBadges();
    document.querySelectorAll("[data-search-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var q = form.querySelector("input").value.trim();
        window.location.href = "catalog.html" + (q ? "?q=" + encodeURIComponent(q) : "");
      });
    });
    // mark active nav link
    var path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".main-nav a[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === path) a.classList.add("active");
    });
  }

  /* Replace any [data-icon] placeholders declared in markup, e.g. <span data-icon="truck" data-size="18"></span> */
  function hydrateIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach(function (el) {
      var name = el.getAttribute("data-icon");
      var size = el.getAttribute("data-size") || 20;
      el.innerHTML = icon(name, size);
    });
  }

  /* ==========================================================================
     I18N — lightweight translation layer for shared site chrome (header, nav,
     footer, hero, bottom nav). Elements opt in via data-i18n (textContent),
     data-i18n-html (innerHTML, for markup like <em>) or data-i18n-placeholder.
     Product/catalog content stays Russian for now.
     ========================================================================== */
  /* ==========================================================================
     AUTH GATE — the whole site requires a logged-in account (customer or
     admin) before any page content is usable, like Geran's phone login on
     first open. Session helpers here are shared (same localStorage keys) so
     admin.html / profile.html pick up the same session automatically.
     ========================================================================== */
  var API_BASE = "https://91.227.41.15.nip.io/api";
  var TOKEN_KEY = "yosin_token";
  var USER_KEY = "yosin_user";

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

  function renderAuthGate() {
    if (getToken() && getUser()) return;
    if (document.querySelector(".auth-gate")) return;

    var gate = document.createElement("div");
    gate.className = "auth-gate";
    gate.innerHTML =
      '<div class="admin-login-card" style="margin:0;">' +
        '<span style="display:inline-flex;color:var(--gold-deep);margin-bottom:10px;">' + icon("user", 26) + '</span>' +
        '<h3 id="gateTitle" style="margin:10px 0 6px;">Вход по номеру</h3>' +
        '<p style="color:var(--ink-soft);font-size:13.5px;margin:0 0 20px;">Войдите, чтобы пользоваться Yosin Store.</p>' +
        '<form id="gateLoginForm">' +
          '<div class="field" style="margin-bottom:12px;">' +
            '<label>Номер телефона</label>' +
            '<input type="text" name="phone" placeholder="+992 90 000-00-00" required autocomplete="username">' +
          '</div>' +
          '<div class="field" style="margin-bottom:6px;">' +
            '<label>Пароль</label>' +
            '<input type="password" name="password" required autocomplete="current-password">' +
          '</div>' +
          '<button type="submit" class="btn btn-gold btn-block" style="margin-top:14px;">Войти</button>' +
        '</form>' +
        '<form id="gateRegisterForm" hidden>' +
          '<div class="field" style="margin-bottom:12px;">' +
            '<label>Ваше имя</label>' +
            '<input type="text" name="fullName" required autocomplete="name">' +
          '</div>' +
          '<div class="field" style="margin-bottom:12px;">' +
            '<label>Номер телефона</label>' +
            '<input type="text" name="phone" placeholder="+992 90 000-00-00" required autocomplete="username">' +
          '</div>' +
          '<div class="field" style="margin-bottom:6px;">' +
            '<label>Пароль</label>' +
            '<input type="password" name="password" required minlength="6" autocomplete="new-password">' +
          '</div>' +
          '<button type="submit" class="btn btn-gold btn-block" style="margin-top:14px;">Зарегистрироваться</button>' +
        '</form>' +
        '<p id="gateError" class="admin-error" hidden></p>' +
        '<button type="button" id="gateSwitchBtn" class="btn btn-ghost btn-block" style="margin-top:12px;">Нет аккаунта? Зарегистрироваться</button>' +
      '</div>';

    document.body.appendChild(gate);
    document.body.classList.add("gate-locked");

    var loginForm = gate.querySelector("#gateLoginForm");
    var registerForm = gate.querySelector("#gateRegisterForm");
    var title = gate.querySelector("#gateTitle");
    var switchBtn = gate.querySelector("#gateSwitchBtn");
    var errorEl = gate.querySelector("#gateError");

    function setGateError(msg) {
      errorEl.hidden = !msg;
      errorEl.textContent = msg || "";
    }

    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      setGateError("");
      var fd = new FormData(loginForm);
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
          window.location.reload();
        })
        .catch(function (err) {
          setGateError(err.message || "Ошибка входа");
        });
    });

    registerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      setGateError("");
      var fd = new FormData(registerForm);
      fetch(API_BASE + "/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fd.get("fullName"), phone: fd.get("phone"), password: fd.get("password") }),
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
          window.location.reload();
        })
        .catch(function (err) {
          setGateError(err.message || "Ошибка регистрации");
        });
    });

    switchBtn.addEventListener("click", function () {
      var showingLogin = !loginForm.hidden;
      loginForm.hidden = showingLogin;
      registerForm.hidden = !showingLogin;
      title.textContent = showingLogin ? "Регистрация" : "Вход по номеру";
      switchBtn.textContent = showingLogin ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться";
      setGateError("");
    });
  }

  var LANG_KEY = "yosin_lang";

  var I18N = {
    ru: {
      "nav.home": "Главная",
      "nav.catalog": "Каталог",
      "nav.phones": "Смартфоны",
      "nav.watches": "Смарт-часы",
      "nav.favorites": "Избранное",
      "header.searchDesktop": "Найти iPhone, Galaxy Watch…",
      "header.searchMobile": "Найти товар…",
      "hero.eyebrow": "Оригинал · Гарантия 12 месяцев",
      "hero.title": "Техника, которую <em class=\"accent\">приятно</em> дарить и носить.",
      "hero.subtitle": "Смартфоны, смарт-часы, наушники и зарядные устройства проверенных брендов — с честной гарантией и доставкой по Душанбе в день заказа.",
      "hero.ctaCatalog": "Смотреть каталог",
      "hero.ctaPhones": "Смартфоны →",
      "footer.description": "Оригинальная техника с официальной гарантией: смартфоны, смарт-часы, наушники и зарядные устройства. Шоурум в Душанбе и доставка по городу.",
      "footer.catalogTitle": "Каталог",
      "footer.customersTitle": "Покупателям",
      "footer.contactsTitle": "Контакты",
      "footer.headphones": "Наушники",
      "footer.chargers": "Зарядные устройства",
      "footer.powerbanks": "Powerbank",
      "footer.accessories": "Аксессуары",
      "footer.cart": "Корзина",
      "footer.checkout": "Оформление заказа",
      "footer.delivery": "Доставка и оплата",
      "footer.warranty": "Гарантия и возврат",
      "footer.hours": "Пн–Вс, 9:00–20:00",
      "footer.sellerCabinet": "Кабинет продавца",
      "footer.copyright": "© 2026 Yosin Store. Все права защищены.",
      "footer.tagline": "Душанбе · Таджикистан",
      "bn.search": "Поиск",
      "bn.profile": "Профиль"
    },
    tj: {
      "nav.home": "Асосӣ",
      "nav.catalog": "Каталог",
      "nav.phones": "Телефонҳои ҳушманд",
      "nav.watches": "Соатҳои ҳушманд",
      "nav.favorites": "Интихобшуда",
      "header.searchDesktop": "iPhone, Galaxy Watch-ро ҷустуҷӯ кунед…",
      "header.searchMobile": "Молро ҷустуҷӯ кунед…",
      "hero.eyebrow": "Аслӣ · Кафолати 12 моҳ",
      "hero.title": "Техникае, ки тӯҳфа додан ва истифода бурданаш <em class=\"accent\">хушнуд</em> аст.",
      "hero.subtitle": "Телефонҳои ҳушманд, соатҳои ҳушманд, гӯшмонакҳо ва зарядкунакҳои брендҳои боэътимод — бо кафолати ҳалол ва расонидан дар Душанбе дар ҳамон рӯз.",
      "hero.ctaCatalog": "Каталогро дидан",
      "hero.ctaPhones": "Телефонҳо →",
      "footer.description": "Техникаи аслӣ бо кафолати расмӣ: телефонҳои ҳушманд, соатҳои ҳушманд, гӯшмонакҳо ва зарядкунакҳо. Шоуруми мо дар Душанбе ва расонидан дар шаҳр.",
      "footer.catalogTitle": "Каталог",
      "footer.customersTitle": "Барои мизоҷон",
      "footer.contactsTitle": "Тамос",
      "footer.headphones": "Гӯшмонакҳо",
      "footer.chargers": "Зарядкунакҳо",
      "footer.powerbanks": "Повербанк",
      "footer.accessories": "Аксессуарҳо",
      "footer.cart": "Сабад",
      "footer.checkout": "Расмикунонии фармоиш",
      "footer.delivery": "Расонидан ва пардохт",
      "footer.warranty": "Кафолат ва баргардонидан",
      "footer.hours": "Дш–Як, 9:00–20:00",
      "footer.sellerCabinet": "Кабинети фурӯшанда",
      "footer.copyright": "© 2026 Yosin Store. Ҳама ҳуқуқҳо ҳифз шудаанд.",
      "footer.tagline": "Душанбе · Тоҷикистон",
      "bn.search": "Ҷустуҷӯ",
      "bn.profile": "Профил"
    },
    en: {
      "nav.home": "Home",
      "nav.catalog": "Catalog",
      "nav.phones": "Smartphones",
      "nav.watches": "Smart watches",
      "nav.favorites": "Favorites",
      "header.searchDesktop": "Search iPhone, Galaxy Watch…",
      "header.searchMobile": "Search products…",
      "hero.eyebrow": "Original · 12-month warranty",
      "hero.title": "Tech that\u2019s a <em class=\"accent\">pleasure</em> to gift and wear.",
      "hero.subtitle": "Smartphones, smart watches, headphones, and chargers from trusted brands — with an honest warranty and same-day delivery across Dushanbe.",
      "hero.ctaCatalog": "Browse catalog",
      "hero.ctaPhones": "Smartphones →",
      "footer.description": "Original tech with an official warranty: smartphones, smart watches, headphones, and chargers. Showroom in Dushanbe with citywide delivery.",
      "footer.catalogTitle": "Catalog",
      "footer.customersTitle": "For customers",
      "footer.contactsTitle": "Contacts",
      "footer.headphones": "Headphones",
      "footer.chargers": "Chargers",
      "footer.powerbanks": "Powerbank",
      "footer.accessories": "Accessories",
      "footer.cart": "Cart",
      "footer.checkout": "Checkout",
      "footer.delivery": "Delivery & payment",
      "footer.warranty": "Warranty & returns",
      "footer.hours": "Mon–Sun, 9am–8pm",
      "footer.sellerCabinet": "Seller panel",
      "footer.copyright": "© 2026 Yosin Store. All rights reserved.",
      "footer.tagline": "Dushanbe · Tajikistan",
      "bn.search": "Search",
      "bn.profile": "Profile"
    }
  };

  function getLang() {
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved && I18N[saved]) return saved;
    } catch (e) {}
    return "ru";
  }

  function t(key, lang) {
    lang = lang || getLang();
    var dict = I18N[lang] || I18N.ru;
    if (dict[key] != null) return dict[key];
    return I18N.ru[key] != null ? I18N.ru[key] : key;
  }

  function applyLanguage(lang) {
    if (!I18N[lang]) lang = "ru";
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    document.documentElement.setAttribute("lang", lang === "tj" ? "tg" : lang);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"), lang);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"), lang);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder"), lang));
    });
    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });
  }

  function initI18n() {
    applyLanguage(getLang());
  }

  /* Brief branded loading screen shown on every page load, like a native
     app splash. Markup is static HTML (first thing in <body>) so it paints
     instantly; this just fades it out once the page is ready. */
  function initSplash() {
    var splash = document.getElementById("splashScreen");
    if (!splash) return;

    var SPLASH_FLAG = "yosin_splash_shown";
    var alreadyShown = false;
    try { alreadyShown = sessionStorage.getItem(SPLASH_FLAG) === "1"; } catch (e) {}

    if (alreadyShown) {
      // Already saw it once this browsing session (this tab) - don't show it
      // again on every page navigation, only remove it instantly.
      if (splash.parentNode) splash.parentNode.removeChild(splash);
      return;
    }
    try { sessionStorage.setItem(SPLASH_FLAG, "1"); } catch (e) {}

    function hide() {
      splash.classList.add("splash-hide");
      setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 420);
    }
    setTimeout(hide, 550);
  }


  /* Mobile bottom tab bar - Home / Favorites / Search / Catalog / Profile
     (cart stays reachable via the header icon, which is never hidden on
     mobile) */
  function renderBottomNav() {
    if (document.querySelector(".bottom-nav")) return;
    var page = document.body.dataset.page || "";
    function cls(name) { return "bn-item" + (page === name ? " active" : ""); }

    var nav = document.createElement("nav");
    nav.className = "bottom-nav";
    nav.setAttribute("aria-label", "Основная навигация");
    nav.innerHTML =
      '<a href="index.html" class="' + cls("home") + '">' +
        '<span class="bn-icon-wrap">' + icon("home", 21) + '</span><span class="bn-label" data-i18n="nav.home">Главная</span>' +
      '</a>' +
      '<a href="favorites.html" class="' + cls("favorites") + '">' +
        '<span class="bn-icon-wrap">' + icon("heart", 21) + '<span class="count" data-fav-count style="display:none;">0</span></span><span class="bn-label" data-i18n="nav.favorites">Избранное</span>' +
      '</a>' +
      '<button type="button" class="bn-item bn-search" data-bn-search>' +
        '<span class="bn-icon-wrap">' + icon("search", 21) + '</span><span class="bn-label" data-i18n="bn.search">Поиск</span>' +
      '</button>' +
      '<a href="catalog.html" class="' + cls("catalog") + '">' +
        '<span class="bn-icon-wrap">' + icon("grid", 21) + '</span><span class="bn-label" data-i18n="nav.catalog">Каталог</span>' +
      '</a>' +
      '<a href="profile.html" class="' + (page === "profile" || page === "admin" ? "bn-item active" : "bn-item") + '">' +
        '<span class="bn-icon-wrap">' + icon("user", 21) + '</span><span class="bn-label" data-i18n="bn.profile">Профиль</span>' +
      '</a>';

    document.body.appendChild(nav);
    document.body.classList.add("has-bottom-nav");

    nav.querySelector("[data-bn-search]").addEventListener("click", function () {
      var input = document.querySelector(".mobile-search input");
      if (input) {
        input.scrollIntoView({ behavior: "smooth", block: "center" });
        input.focus({ preventScroll: true });
      } else {
        window.location.href = "catalog.html";
      }
    });
  }

  /* Side drawer (mobile hamburger menu) - logo/close header, nav links,
     language switch, and a "Кабинет" button to the seller panel. Opens over
     a dark overlay from the right, like a native app drawer. */
  function renderSideDrawer() {
    if (document.querySelector(".side-drawer")) return;
    var page = document.body.dataset.page || "";
    function itemCls(name) { return "drawer-link" + (page === name ? " active" : ""); }

    var overlay = document.createElement("div");
    overlay.className = "drawer-overlay";

    var drawer = document.createElement("aside");
    drawer.className = "side-drawer";
    drawer.setAttribute("aria-label", "Меню");
    drawer.innerHTML =
      '<div class="drawer-head">' +
        '<a href="index.html" class="drawer-logo">' +
          '<img src="assets/logo.jpg" alt="Yosin Store">' +
          '<span class="wordmark">YOSIN<em>.store</em></span>' +
        '</a>' +
        '<button type="button" class="drawer-close" data-drawer-close aria-label="Закрыть">' + icon("x", 18) + '</button>' +
      '</div>' +
      '<nav class="drawer-nav">' +
        '<a href="index.html" class="' + itemCls("home") + '"><span>' + icon("home", 18) + '<span data-i18n="nav.home">Главная</span></span>' + icon("chevronRight", 16) + '</a>' +
        '<a href="catalog.html" class="' + itemCls("catalog") + '"><span>' + icon("grid", 18) + '<span data-i18n="nav.catalog">Каталог</span></span>' + icon("chevronRight", 16) + '</a>' +
        '<a href="catalog.html?category=phones" class="drawer-link"><span>' + icon("phone", 18) + '<span data-i18n="nav.phones">Смартфоны</span></span>' + icon("chevronRight", 16) + '</a>' +
        '<a href="catalog.html?category=watches" class="drawer-link"><span>' + icon("watch", 18) + '<span data-i18n="nav.watches">Смарт-часы</span></span>' + icon("chevronRight", 16) + '</a>' +
        '<a href="favorites.html" class="' + itemCls("favorites") + '"><span>' + icon("heart", 18) + '<span data-i18n="nav.favorites">Избранное</span></span>' + icon("chevronRight", 16) + '</a>' +
        '<a href="cart.html" class="' + itemCls("cart") + '"><span>' + icon("cart", 18) + '<span data-i18n="footer.cart">Корзина</span></span>' + icon("chevronRight", 16) + '</a>' +
      '</nav>' +
      '<div class="drawer-lang">' +
        '<button type="button" data-lang="ru">RU</button>' +
        '<button type="button" data-lang="tj">TJ</button>' +
        '<button type="button" data-lang="en">EN</button>' +
      '</div>' +
      '<a href="profile.html" class="drawer-cabinet">' + icon("user", 18) + '<span data-i18n="bn.profile">Кабинет</span></a>';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    function openDrawer() {
      drawer.classList.add("open");
      overlay.classList.add("open");
      document.body.classList.add("drawer-locked");
    }
    function closeDrawer() {
      drawer.classList.remove("open");
      overlay.classList.remove("open");
      document.body.classList.remove("drawer-locked");
    }

    overlay.addEventListener("click", closeDrawer);
    drawer.querySelector("[data-drawer-close]").addEventListener("click", closeDrawer);
    drawer.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyLanguage(btn.getAttribute("data-lang"));
      });
    });

    var toggle = document.querySelector("[data-nav-toggle]");
    if (toggle) {
      toggle.innerHTML = icon("menu", 19);
      toggle.addEventListener("click", function () {
        if (drawer.classList.contains("open")) closeDrawer(); else openDrawer();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSplash();
    // renderAuthGate(); // TEMPORARILY DISABLED — site is open without login for now.
    renderSideDrawer();
    renderBottomNav();
    wireHeader();
    hydrateIcons(document);
    initI18n();
    updateHeaderBadges();
  });

  window.Yosin = {
    CATEGORY_LABELS: CATEGORY_LABELS,
    CATEGORY_ICON: CATEGORY_PLURAL_ICON,
    icon: icon,
    allProducts: allProducts,
    onProductsReady: onProductsReady,
    isApiLoaded: function () { return apiProductsLoaded; },
    productById: productById,
    relatedProducts: relatedProducts,
    categoryLabel: categoryLabel,
    formatPrice: formatPrice,
    starString: starString,
    getCart: getCart,
    setCart: setCart,
    cartCount: cartCount,
    addToCart: addToCart,
    setQtyInCart: setQtyInCart,
    removeFromCart: removeFromCart,
    clearCart: clearCart,
    cartLines: cartLines,
    getFavs: getFavs,
    isFav: isFav,
    toggleFav: toggleFav,
    applyPromo: applyPromo,
    getPromo: getPromo,
    calcTotals: calcTotals,
    thumbHTML: thumbHTML,
    cardHTML: cardHTML,
    renderGrid: renderGrid,
    updateHeaderBadges: updateHeaderBadges,
    showToast: showToast,
    handleQuickAdd: handleQuickAdd,
    handleQuickFav: handleQuickFav,
    handleFavClick: handleFavClick,
    getParam: getParam,
    hydrateIcons: hydrateIcons,
    renderBottomNav: renderBottomNav,
    renderSideDrawer: renderSideDrawer,
    renderAuthGate: renderAuthGate,
    getToken: getToken,
    getUser: getUser,
    setSession: setSession,
    clearSession: clearSession,
    API_BASE: API_BASE,
    applyLanguage: applyLanguage,
    getLang: getLang,
    FREE_SHIPPING_THRESHOLD: FREE_SHIPPING_THRESHOLD,
    SHIPPING_FLAT: SHIPPING_FLAT
  };
})();
