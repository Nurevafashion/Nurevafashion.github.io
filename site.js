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

/* ---------- homepage covers (2 fixed covers, each with its own Collection button) ---------- */
function renderCovers() {
  const wrap = document.getElementById("coversWrap");
  if (!wrap) return;
  const covers = NurevaStore.Covers.all();
  if (!covers.length) { wrap.innerHTML = ""; return; }
  wrap.innerHTML = covers.map(c => {
    const link = c.link || "products.html";
    return `
    <div class="cover-block">
      <a href="${link}" class="cover-card">
        <img src="${c.image}" alt="Cover">
      </a>
      <a href="${link}" class="btn btn-gold btn-sm cover-btn">Shop Collection</a>
    </div>`;
  }).join("");
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
  const count = getCart().reduce((s, c) => s + c.qty, 0);
  const badge = document.getElementById("cartCount");
  if (badge) { badge.textContent = count; badge.style.display = count ? "flex" : "none"; }
  const bnBadge = document.getElementById("bottomCartCount");
  if (bnBadge) { bnBadge.textContent = count; bnBadge.style.display = count ? "flex" : "none"; }
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
          <div class="social-row">
            <a href="${s.facebook || '#'}" target="_blank" rel="noopener" aria-label="Facebook"><svg width="15" height="15" viewBox="0 0 320 512" fill="white"><path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/></svg></a>
            ${s.instagram ? `<a class="ig" href="${s.instagram}" target="_blank" rel="noopener" aria-label="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.25a3.25 3.25 0 1 1 0-6.5 3.25 3.25 0 0 1 0 6.5zM17.5 6.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z"/></svg></a>` : ""}
            ${s.messenger ? `<a class="msg" href="${s.messenger}" target="_blank" rel="noopener" aria-label="Messenger"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/></svg></a>` : ""}
          </div>
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
    <a class="fab-option" id="fabDetails" href="contact.html" aria-label="Details">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>
    </a>
    <button type="button" class="fab-option" id="fabMessage" aria-label="Live Chat">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>
    <a class="fab-option" id="fabWhatsapp" href="#" target="_blank" rel="noopener" aria-label="WhatsApp">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    </a>
    <a class="fab-option" id="fabCall" href="#" aria-label="Call">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
    </a>
    <button class="fab-main" id="fabToggle" type="button" aria-label="Contact us">
      <span class="fab-dot"></span><span class="fab-dot"></span><span class="fab-dot"></span><span class="fab-dot"></span>
    </button>
  `;
  document.body.appendChild(wrap);

  const toggle = document.getElementById("fabToggle");
  toggle.onclick = function (e) {
    e.stopPropagation();
    wrap.classList.toggle("open");
  };
  document.getElementById("fabMessage").onclick = function (e) {
    e.stopPropagation();
    toast("Live chat is coming soon!");
  };

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

/* ---------- bottom navigation bar ---------- */
function initBottomNav() {
  if (document.getElementById("siteBottomNav")) return;
  const path = location.pathname.split("/").pop() || "index.html";
  const nav = document.createElement("nav");
  nav.id = "siteBottomNav";
  nav.className = "bottom-nav";
  nav.innerHTML = `
    <a href="index.html" class="${path === "index.html" || path === "" ? "active" : ""}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
      Home
    </a>
    <a href="track-order.html" class="${path === "track-order.html" ? "active" : ""}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
      Tracking
    </a>
    <a href="cart.html" class="${path === "cart.html" ? "active" : ""}" style="position:relative">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6h15l-1.5 9h-13z"/><path d="M6 6L4 3H2"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
      Cart
      <span class="bn-badge" id="bottomCartCount">0</span>
    </a>
    <a href="account.html" class="${path === "account.html" ? "active" : ""}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      Account
    </a>
  `;
  document.body.appendChild(nav);
  updateCartBadge();
}

document.addEventListener("DOMContentLoaded", () => { initHeader(); initFab(); initBottomNav(); });
