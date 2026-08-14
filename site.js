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
  const coverLinks = ["products.html?cat=Nureva%20Signature", "offers.html"];
  wrap.innerHTML = covers.map((c, i) => {
    const link = coverLinks[i] || "products.html";
    return `
    <div class="cover-block">
      <a href="${link}" class="cover-card">
        <img src="${c.image}" alt="Cover">
      </a>
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
    <a class="fab-option fab-option-alert" id="fabDetails" href="contact.html" aria-label="Details">
      <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4.5" fill="currentColor"/><rect x="11" y="8" width="2" height="6.5" rx="1" fill="#F3E6CC"/><circle cx="12" cy="17" r="1.2" fill="#F3E6CC"/></svg>
    </a>
    <button type="button" class="fab-option" id="fabMessage" aria-label="Live Chat">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="13" rx="3.5"/><path d="M8.5 17.5v3l3.5-3"/></svg>
      <span class="fab-badge-dot" id="fabChatDot"></span>
    </button>
    <a class="fab-option" id="fabWhatsapp" href="#" rel="noopener" aria-label="WhatsApp">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.4 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm5.4 14.2c-.2.6-1.3 1.2-1.8 1.3-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.5-.6-2.7-1.2-4.5-3.9-4.6-4.1-.1-.2-1.1-1.5-1.1-2.9 0-1.3.7-2 1-2.3.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .5.4.2.5.7 1.8.8 1.9.1.1.1.3 0 .4-.1.2-.1.3-.3.5-.1.2-.3.3-.4.5-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.6.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.2.1 1.5.7 1.7.8.2.1.4.2.4.3.1.2.1.7-.1 1.3z"/></svg>
    </a>
    <a class="fab-option" id="fabCall" href="#" aria-label="Call">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .5 1 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 3.9c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.2 1L6.6 10.8z"/></svg>
    </a>
    <button class="fab-main" id="fabToggle" type="button" aria-label="Contact us">
      <span class="fab-icon-wrap fab-icon-dots">
        <span class="fab-dot"></span><span class="fab-dot"></span><span class="fab-dot"></span>
      </span>
      <svg class="fab-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
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
    wrap.classList.remove("open");
    openChatPanel();
  };

  const callBtn = document.getElementById("fabCall");
  const waBtn = document.getElementById("fabWhatsapp");

  /* Read settings fresh at the moment of the tap (rather than trusting a
     pre-computed href) so a slow/late Firestore sync can never leave the
     button pointing at the placeholder "#", which is what made Call look
     like it was just scrolling the page to the top. */
  callBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    const s = (window.NurevaStore && NurevaStore.Settings.get()) || {};
    let phone = (s.phone || "").trim();
    if (!phone) { try { phone = localStorage.getItem("nurevaLastPhone") || ""; } catch (err) {} }
    if (!phone) { toast("ফোন নম্বর এখনো যোগ করা হয়নি"); return; }
    window.location.href = "tel:" + phone;
  });

  waBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    const s = (window.NurevaStore && NurevaStore.Settings.get()) || {};
    let digits = (s.whatsapp || "").replace(/[^0-9]/g, "");
    if (!digits) { try { digits = (localStorage.getItem("nurevaLastWhatsapp") || "").replace(/[^0-9]/g, ""); } catch (err) {} }
    if (!digits) { toast("WhatsApp নম্বর এখনো যোগ করা হয়নি"); return; }
    window.open("https://wa.me/" + digits, "_blank", "noopener");
  });

  function applyFabLinks() {
    const s = NurevaStore.Settings.get();
    const phone = (s.phone || "").trim();
    const digits = (s.whatsapp || "").replace(/[^0-9]/g, "");
    /* href kept in sync too (for long-press "copy link", accessibility,
       and as a fallback) — the click handlers above remain the source
       of truth for the actual tap. */
    callBtn.href = phone ? "tel:" + phone : "#";
    callBtn.style.display = phone ? "" : "none";
    waBtn.href = digits ? "https://wa.me/" + digits : "#";
    waBtn.style.display = digits ? "" : "none";
  }
  if (window.NurevaStore) { NurevaStore.ready.then(applyFabLinks); NurevaStore.onChange(applyFabLinks); }
}

/* ---------- live chat widget (customer side) ---------- */
let chatMsgUnsub = null, chatBadgeUnsub = null, chatHeartbeatTimer = null;

function escapeChatHtml(s) { return String(s).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c])); }

function buildChatPanel() {
  if (document.getElementById("chatPanel")) return;
  const overlay = document.createElement("div");
  overlay.id = "chatPanelOverlay";
  overlay.className = "chat-panel-overlay";
  document.body.appendChild(overlay);

  const panel = document.createElement("div");
  panel.id = "chatPanel";
  panel.className = "chat-panel";
  panel.innerHTML = `
    <div class="chat-panel-head">
      <div>
        <div class="chat-panel-title">Live Chat</div>
        <div class="chat-panel-sub">Nureva Fashion Support</div>
      </div>
      <button type="button" id="chatPanelClose" aria-label="Close">✕</button>
    </div>
    <div class="chat-panel-body">
      <form id="chatStartForm" class="chat-start-form">
        <p>Send us a message and our team will reply here shortly.</p>
        <div class="form-group"><input type="text" id="chatNameInput" placeholder="Your Name" required></div>
        <div class="form-group"><input type="email" id="chatEmailInput" placeholder="Your Email" required></div>
        <button type="submit" class="btn btn-primary btn-block">Start Chat</button>
      </form>
      <div class="chat-thread" id="chatThread" style="display:none"></div>
    </div>
    <form id="chatSendForm" class="chat-send-form" style="display:none">
      <input type="text" id="chatMsgInput" placeholder="Type a message..." autocomplete="off" required>
      <button type="submit" aria-label="Send">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </form>`;
  document.body.appendChild(panel);

  overlay.addEventListener("click", closeChatPanel);
  document.getElementById("chatPanelClose").addEventListener("click", closeChatPanel);

  document.getElementById("chatStartForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("chatNameInput").value.trim();
    const email = document.getElementById("chatEmailInput").value.trim();
    if (!name || !email || !window.NurevaStore) return;
    NurevaStore.Chat.start(name, email)
      .then(id => openConversationView(id))
      .catch(err => toast("Could not start chat: " + err.message));
  });

  document.getElementById("chatSendForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("chatMsgInput");
    const text = input.value.trim();
    const chatId = window.NurevaStore && NurevaStore.Chat.getMyChatId();
    if (!text || !chatId) return;
    input.value = "";
    NurevaStore.Chat.sendMessage(chatId, "customer", text).catch(() => toast("Message failed to send"));
  });
}

function showChatStartForm() {
  document.getElementById("chatStartForm").style.display = "block";
  document.getElementById("chatThread").style.display = "none";
  document.getElementById("chatSendForm").style.display = "none";
}

function renderChatThread(msgs) {
  const el = document.getElementById("chatThread");
  if (!el) return;
  el.innerHTML = msgs.length ? msgs.map(m => `
    <div class="chat-bubble ${m.sender === "admin" ? "from-admin" : "from-customer"}">
      <div class="chat-bubble-text">${escapeChatHtml(m.text)}</div>
      <div class="chat-bubble-time">${new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
    </div>
  `).join("") : `<div class="chat-empty">Say hello! 👋</div>`;
  el.scrollTop = el.scrollHeight;
}

function openConversationView(chatId) {
  document.getElementById("chatStartForm").style.display = "none";
  document.getElementById("chatThread").style.display = "flex";
  document.getElementById("chatSendForm").style.display = "flex";
  NurevaStore.Chat.markCustomerRead(chatId);
  const dot = document.getElementById("fabChatDot"); if (dot) dot.style.display = "none";
  if (chatMsgUnsub) chatMsgUnsub();
  chatMsgUnsub = NurevaStore.Chat.listenMessages(chatId, (msgs) => { renderChatThread(msgs); NurevaStore.Chat.markCustomerRead(chatId); });
  NurevaStore.Chat.heartbeat(chatId);
  if (chatHeartbeatTimer) clearInterval(chatHeartbeatTimer);
  chatHeartbeatTimer = setInterval(() => NurevaStore.Chat.heartbeat(chatId), 20000);
}

function openChatPanel() {
  buildChatPanel();
  document.getElementById("chatPanel").classList.add("open");
  document.getElementById("chatPanelOverlay").classList.add("open");
  const chatId = window.NurevaStore && NurevaStore.Chat.getMyChatId();
  if (chatId) openConversationView(chatId); else showChatStartForm();
}
function closeChatPanel() {
  document.getElementById("chatPanel")?.classList.remove("open");
  document.getElementById("chatPanelOverlay")?.classList.remove("open");
  if (chatMsgUnsub) { chatMsgUnsub(); chatMsgUnsub = null; }
  if (chatHeartbeatTimer) { clearInterval(chatHeartbeatTimer); chatHeartbeatTimer = null; }
}

/* keeps the little red dot on the FAB in sync even while the chat panel is closed */
function initChatWidget() {
  buildChatPanel();
  if (!window.NurevaStore) return;
  NurevaStore.ready.then(() => {
    const chatId = NurevaStore.Chat.getMyChatId();
    if (!chatId) return;
    chatBadgeUnsub = NurevaStore.Chat.listenChat(chatId, (chat) => {
      const dot = document.getElementById("fabChatDot");
      if (!dot) return;
      const panelOpen = document.getElementById("chatPanel")?.classList.contains("open");
      dot.style.display = (chat && chat.customerUnread && !panelOpen) ? "block" : "none";
    });
  });
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

/* ---------- scroll-to-top button ---------- */
function initScrollTop() {
  if (document.getElementById("scrollTopBtn")) return;
  const btn = document.createElement("button");
  btn.id = "scrollTopBtn";
  btn.type = "button";
  btn.className = "scroll-top-btn";
  btn.setAttribute("aria-label", "Scroll to top");
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"/></svg>`;
  document.body.appendChild(btn);

  function toggleVisibility() {
    if (window.scrollY > 400) btn.classList.add("show");
    else btn.classList.remove("show");
  }
  window.addEventListener("scroll", toggleVisibility, { passive: true });
  toggleVisibility();

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.NurevaStore) { try { sessionStorage.removeItem("nurevaReloadCount"); } catch (e) {} }
  initHeader(); initFab(); initChatWidget(); initBottomNav(); initScrollTop();
});
