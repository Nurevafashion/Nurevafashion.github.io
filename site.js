/* ============================================================
   Nureva Fashion — Shared Site Behaviours
   ============================================================ */

function formatTaka(n) { return "৳" + Number(n).toLocaleString("en-US"); }

function toast(msg) {
  let el = document.getElementById("siteToast");
  if (!el) { el = document.createElement("div"); el.id = "siteToast"; el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2200);
}

/* ---------- header: mobile drawer + search ---------- */
function initHeader() {
  const menuToggle = document.getElementById("menuToggle");
  const drawer = document.getElementById("navDrawer");
  const overlay = document.getElementById("drawerOverlay");
  const drawerClose = document.getElementById("drawerClose");
  const openDrawer = () => { drawer?.classList.add("open"); overlay?.classList.add("open"); };
  const closeDrawer = () => { drawer?.classList.remove("open"); overlay?.classList.remove("open"); };
  menuToggle?.addEventListener("click", openDrawer);
  drawerClose?.addEventListener("click", closeDrawer);
  overlay?.addEventListener("click", closeDrawer);

  const searchToggle = document.getElementById("searchToggle");
  const searchPanel = document.getElementById("searchPanel");
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");
  searchToggle?.addEventListener("click", () => {
    searchPanel.classList.toggle("open");
    if (searchPanel.classList.contains("open")) searchInput.focus();
  });
  searchInput?.addEventListener("input", () => {
    const q = searchInput.value;
    if (!q.trim()) { searchResults.innerHTML = ""; return; }
    const results = NurevaStore.Products.search(q);
    if (!results.length) { searchResults.innerHTML = `<div style="padding:16px 20px;color:var(--mauve)">No products found</div>`; return; }
    searchResults.innerHTML = results.slice(0, 8).map(p => `
      <a href="product.html?id=${p.id}">
        <img src="${p.images[0]}" alt="${p.name}">
        <div>
          <div style="font-weight:600">${p.name}</div>
          <div style="font-size:0.82rem;color:var(--mauve)">${p.category} · ${formatTaka(p.offerPrice || p.price)}</div>
        </div>
      </a>
    `).join("");
  });

  updateCartBadge();
}

/* ---------- lightbox (click a cover image to view it full-size) ---------- */
function openLightbox(src) {
  let el = document.getElementById("siteLightbox");
  if (!el) {
    el = document.createElement("div");
    el.id = "siteLightbox";
    el.className = "lightbox-overlay";
    el.innerHTML = `<button class="lightbox-close" aria-label="Close">✕</button><img class="lightbox-img" alt="">`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => { if (e.target === el || e.target.classList.contains("lightbox-close")) closeLightbox(); });
  }
  el.querySelector(".lightbox-img").src = src;
  el.classList.add("open");
}
function closeLightbox() {
  const el = document.getElementById("siteLightbox");
  if (el) el.classList.remove("open");
}

/* ---------- hero slider ---------- */
let _heroInterval = null, _heroCurrent = 0;
function initHeroSlider() {
  const wrap = document.getElementById("heroSlider");
  const dotsWrap = document.getElementById("heroDots");
  if (!wrap) return;
  const banners = NurevaStore.Banners.all();
  if (!banners.length) { wrap.innerHTML = ""; if (dotsWrap) dotsWrap.innerHTML = ""; return; }
  wrap.innerHTML = banners.map((src, i) => `<div class="hero-slide ${i === 0 ? "active" : ""}" data-src="${src}" style="background-image:url('${src}')"></div>`).join("");
  if (dotsWrap) dotsWrap.innerHTML = banners.map((_, i) => `<button data-i="${i}" class="${i === 0 ? "active" : ""}" aria-label="Slide ${i + 1}"></button>`).join("");
  _heroCurrent = 0;
  const slides = wrap.querySelectorAll(".hero-slide");
  const dots = dotsWrap ? dotsWrap.querySelectorAll("button") : [];
  slides.forEach(s => { s.style.cursor = "zoom-in"; s.addEventListener("click", () => openLightbox(s.dataset.src)); });
  function show(i) {
    slides.forEach(s => s.classList.remove("active"));
    dots.forEach(d => d.classList.remove("active"));
    slides[i].classList.add("active");
    if (dots[i]) dots[i].classList.add("active");
    _heroCurrent = i;
  }
  dots.forEach(d => d.addEventListener("click", (e) => { e.stopPropagation(); show(Number(d.dataset.i)); }));
  if (_heroInterval) clearInterval(_heroInterval);
  _heroInterval = setInterval(() => show((_heroCurrent + 1) % slides.length), 3000);
}

/* ---------- news ticker ---------- */
function renderNewsTicker() {
  const el = document.getElementById("newsTicker");
  if (!el) return;
  const items = NurevaStore.News.all();
  if (!items.length) { el.style.display = "none"; return; }
  el.style.display = "block";
  el.querySelector(".news-ticker-track").innerHTML = items.map(n => `<span>${n.text}</span>`).join("");
}

/* ---------- product card ---------- */
function productCardHTML(p) {
  const offer = !!p.offerPrice;
  return `
  <div class="product-card">
    <a href="product.html?id=${p.id}" class="product-thumb">
      ${p.isNew ? '<span class="badge">New</span>' : offer ? '<span class="badge offer">Offer</span>' : ""}
      <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
    </a>
    <div class="product-body">
      <div class="product-cat">${p.category}</div>
      <a href="product.html?id=${p.id}"><div class="product-name">${p.name}</div></a>
      <div class="price-row">
        <span class="price-now">${formatTaka(offer ? p.offerPrice : p.price)}</span>
        ${offer ? `<span class="price-old">${formatTaka(p.price)}</span>` : ""}
      </div>
      <a href="product.html?id=${p.id}" class="btn btn-primary">View Details</a>
    </div>
  </div>`;
}
function renderProductGrid(containerId, products, emptyMsg) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!products.length) { el.innerHTML = `<div class="empty-state"><h3>Nothing here yet</h3><p>${emptyMsg || "No products available right now."}</p></div>`; return; }
  el.innerHTML = products.map(productCardHTML).join("");
}

/* ---------- cart (per-device, localStorage — intentionally not shared) ---------- */
function getCart() { try { return JSON.parse(localStorage.getItem("nureva_cart")) || []; } catch (e) { return []; } }
function saveCart(c) { localStorage.setItem("nureva_cart", JSON.stringify(c)); updateCartBadge(); }
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(c => c.productId === item.productId && c.size === item.size && c.color === item.color);
  if (existing) existing.qty += item.qty; else cart.push(item);
  saveCart(cart);
  toast("Added to cart");
}
function updateCartBadge() {
  const badge = document.getElementById("cartCount");
  if (!badge) return;
  const count = getCart().reduce((s, c) => s + c.qty, 0);
  badge.textContent = count;
  badge.style.display = count ? "flex" : "none";
}

/* ---------- settings + footer injection ---------- */
function applySettings() {
  const s = NurevaStore.Settings.get();
  document.querySelectorAll("[data-fb-link]").forEach(el => el.href = s.facebook || "#");
  document.querySelectorAll("[data-site-address]").forEach(el => el.textContent = s.address || "");
  document.querySelectorAll("[data-site-phone]").forEach(el => { if (s.phone) { el.textContent = s.phone; el.href = "tel:" + s.phone; } });
  document.querySelectorAll("[data-tagline]").forEach(el => el.textContent = s.tagline || "");
}
function renderFooter(minimal) {
  const el = document.getElementById("siteFooter");
  if (!el) return;
  const s = NurevaStore.Settings.get();
  const brandCol = `
        <div>
          <div class="foot-logo">Nureva <span>Fashion</span></div>
          <p>${s.tagline || "Where Modesty Meets Elegance"}</p>
          <p>Your trusted destination for premium Burqa, Three-Piece, Hijab and Panjabi.</p>
          <div class="social-row"><a href="${s.facebook || '#'}" target="_blank" rel="noopener" aria-label="Facebook">f</a></div>
        </div>`;
  const shopCol = `
        <div>
          <h4>Shop</h4>
          <a href="products.html">All Products</a>
          <a href="products.html?filter=new">New Arrivals</a>
          <a href="offers.html">Offers</a>
        </div>`;
  const catCol = `
        <div>
          <h4>Categories</h4>
          <a href="products.html?cat=Burqa">Burqa</a>
          <a href="products.html?cat=Three-Piece">Three-Piece</a>
          <a href="products.html?cat=Hijab">Hijab</a>
          <a href="products.html?cat=Panjabi">Panjabi</a>
        </div>`;
  const contactCol = `
        <div>
          <h4>Contact</h4>
          <p>${s.address || "Dhaka, Bangladesh"}</p>
          ${s.phone ? `<a href="tel:${s.phone}">${s.phone}</a>` : ""}
          <a href="contact.html">Contact Form</a>
        </div>`;
  el.innerHTML = `
    <div class="container">
      <div class="footer-grid${minimal ? " footer-grid-minimal" : ""}">
        ${brandCol}
        ${minimal ? "" : shopCol}
        ${minimal ? "" : catCol}
        ${contactCol}
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} Nureva Fashion. All rights reserved.</div>
    </div>
  `;
}

/* ---------- floating contact button (call / WhatsApp / details) ---------- */
function initFab() {
  if (document.getElementById("siteFab")) return;
  const wrap = document.createElement("div");
  wrap.id = "siteFab";
  wrap.className = "fab-container";
  wrap.innerHTML = `
    <a class="fab-option" id="fabDetails" href="contact.html" aria-label="Details">ℹ️</a>
    <a class="fab-option" id="fabWhatsapp" href="#" target="_blank" rel="noopener" aria-label="WhatsApp">💬</a>
    <a class="fab-option" id="fabCall" href="#" aria-label="Call">📞</a>
    <button class="fab-main" id="fabToggle" aria-label="Contact us"><span>⋯</span></button>
  `;
  document.body.appendChild(wrap);
  const toggle = document.getElementById("fabToggle");
  toggle.addEventListener("click", () => {
    wrap.classList.toggle("open");
    toggle.querySelector("span").textContent = wrap.classList.contains("open") ? "✕" : "⋯";
  });
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) { wrap.classList.remove("open"); toggle.querySelector("span").textContent = "⋯"; }
  });

  function applyFabLinks() {
    const s = NurevaStore.Settings.get();
    const callBtn = document.getElementById("fabCall");
    const waBtn = document.getElementById("fabWhatsapp");
    if (s.phone) { callBtn.href = "tel:" + s.phone; callBtn.style.display = ""; }
    else { callBtn.style.display = "none"; }
    if (s.whatsapp) { waBtn.href = `https://wa.me/${s.whatsapp}`; waBtn.style.display = ""; }
    else { waBtn.style.display = "none"; }
  }
  if (window.NurevaStore) { NurevaStore.ready.then(applyFabLinks); NurevaStore.onChange(applyFabLinks); }
}

document.addEventListener("DOMContentLoaded", () => { initHeader(); initFab(); });
