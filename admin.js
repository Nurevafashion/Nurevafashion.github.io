/* ============================================================
   Nureva Fashion — Admin Panel Logic (multi-page)
   This single file is shared by admin.html (login) and every
   admin-*.html page. Each protected page gets a real URL, so
   the browser's Back button works normally between them.
   ============================================================ */

function taka(n) { return "৳" + Number(n || 0).toLocaleString("en-US"); }

/* ---------- sidebar: highlight current page ---------- */
document.querySelectorAll(".admin-nav a").forEach(a => {
  const href = a.getAttribute("href");
  if (href && location.pathname.endsWith(href)) a.classList.add("active");
});
document.getElementById("adminMobileToggle")?.addEventListener("click", () => {
  document.querySelector(".admin-sidebar")?.classList.add("open");
  document.getElementById("adminSidebarOverlay")?.classList.add("open");
});
function closeAdminSidebar() {
  document.querySelector(".admin-sidebar")?.classList.remove("open");
  document.getElementById("adminSidebarOverlay")?.classList.remove("open");
}
document.getElementById("adminSidebarClose")?.addEventListener("click", closeAdminSidebar);
document.getElementById("adminSidebarOverlay")?.addEventListener("click", closeAdminSidebar);
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  NurevaStore.Admin.logout().then(() => { location.href = "admin.html"; });
});

/* ---------- auth ---------- */
const isLoginPage = !!document.getElementById("loginForm");

if (isLoginPage) {
  const loginError = document.getElementById("loginError");
  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const pw = document.getElementById("loginPassword").value;
    loginError.style.display = "none";
    NurevaStore.Admin.login(pw)
      .then(() => { location.href = "admin-dashboard.html"; })
      .catch(err => {
        loginError.textContent = "Incorrect password, or the admin account isn't set up yet. See README.md.";
        loginError.style.display = "block";
        console.error(err);
      });
  });
  // already logged in? skip straight to the dashboard
  NurevaStore.Admin.onAuthChange(isLoggedIn => { if (isLoggedIn) location.href = "admin-dashboard.html"; });
} else {
  // protected page: bounce to login if not authenticated, else render this page's content
  NurevaStore.Admin.onAuthChange(isLoggedIn => {
    if (!isLoggedIn) { location.href = "admin.html"; return; }
    NurevaStore.ready.then(renderCurrentPage);
    NurevaStore.onChange(renderCurrentPage);
    initChatSync();
    initCustomersSync();
  });
}

function renderCurrentPage() {
  if (document.getElementById("statGrid")) renderDashboard();
  if (document.getElementById("productTable")) { renderProductFilterBar(); renderProducts(); }
  if (document.getElementById("bannerGrid")) renderBanners();
  if (document.getElementById("newsList")) renderNews();
  if (document.getElementById("orderTable")) renderOrders();
  if (document.getElementById("setSiteName")) renderSettings();
  if (document.getElementById("usersList")) renderUsers();
}

/* ---------- Dashboard ---------- */
function renderDashboard() {
  const products = NurevaStore.Products.all();
  const orders = NurevaStore.Orders.all();
  const stats = [
    { num: products.length, lbl: "Total Products" },
    { num: NurevaStore.Products.onOffer().length, lbl: "Active Offers" },
    { num: orders.length, lbl: "Total Orders" },
    { num: taka(orders.reduce((s, o) => s + (o.total || 0), 0)), lbl: "Total Sales" },
  ];
  document.getElementById("statGrid").innerHTML = stats.map(s => `
    <div class="stat-card"><div class="num">${s.num}</div><div class="lbl">${s.lbl}</div></div>
  `).join("");

  const recent = orders.slice(0, 5);
  document.getElementById("recentOrders").innerHTML = recent.length ? recent.map(o => `
    <div class="admin-list-item">
      <div>
        <strong>${o.customer.name}</strong> — ${o.customer.phone}<br>
        <span style="color:#8A5875;font-size:0.85rem">${o.items.length} item(s) · ${taka(o.total)}</span>
      </div>
      <span class="tag status">${o.status}</span>
    </div>
  `).join("") : `<p style="color:#8A5875">No orders yet.</p>`;

  if (!products.length) {
    document.getElementById("recentOrders").insertAdjacentHTML("beforeend",
      `<div style="margin-top:16px"><button class="btn btn-outline" id="seedDemoBtn">Add sample demo products</button></div>`);
    document.getElementById("seedDemoBtn")?.addEventListener("click", () => {
      if (confirm("This adds sample products, 2 cover images and default settings. Continue?")) {
        NurevaStore.seedDemoData().then(() => toastAdmin("Demo data added")).catch(err => alert(err.message));
      }
    });
  }
}

/* ---------- Products ---------- */
let productFilter = "";
function renderProductFilterBar() {
  const bar = document.getElementById("productFilterBar");
  if (!bar) return;
  const cats = ["", ...NurevaStore.CATEGORIES];
  bar.innerHTML = cats.map(c => `
    <button class="filter-chip ${productFilter === c ? "active" : ""}" data-cat="${c}">${c || "All"}</button>
  `).join("");
  bar.querySelectorAll(".filter-chip").forEach(b => b.addEventListener("click", () => {
    productFilter = b.dataset.cat; renderProducts();
  }));
}

function renderProducts() {
  const list = productFilter ? NurevaStore.Products.byCategory(productFilter) : NurevaStore.Products.all();
  const table = document.getElementById("productTable");
  if (!list.length) {
    table.innerHTML = `<tr><td style="padding:24px;text-align:center;color:#8A5875">No products found</td></tr>`;
    return;
  }
  table.innerHTML = `
    <tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Tags</th><th>Actions</th></tr>
    ${list.map(p => `
      <tr>
        <td><img class="thumb" src="${p.images[0]}" alt="${p.name}"></td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.offerPrice ? `${taka(p.offerPrice)} <s style="color:#8A5875">${taka(p.price)}</s>` : taka(p.price)}</td>
        <td>${p.stock}</td>
        <td>${p.isNew ? '<span class="tag new">New</span>' : ""} ${p.offerPrice ? '<span class="tag offer">Offer</span>' : ""}</td>
        <td class="row-actions">
          <button class="edit-btn" data-id="${p.id}">✎ Edit</button>
          <button class="del-btn" data-id="${p.id}">🗑️ Delete</button>
        </td>
      </tr>
    `).join("")}
  `;
  table.querySelectorAll(".edit-btn").forEach(b => b.addEventListener("click", () => openProductModal(b.dataset.id)));
  table.querySelectorAll(".del-btn").forEach(b => b.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete this product?")) {
      NurevaStore.Products.remove(b.dataset.id).then(() => toastAdmin("Product deleted"));
    }
  }));
}

/* ---------- product modal ---------- */
const productModal = document.getElementById("productModal");
let currentImages = [];

if (productModal) {
  const productForm = document.getElementById("productForm");
  document.getElementById("newProductBtn")?.addEventListener("click", () => openProductModal(null));
  document.getElementById("modalClose").addEventListener("click", closeProductModal);
  document.getElementById("modalCancel").addEventListener("click", closeProductModal);
  productModal.addEventListener("click", (e) => { if (e.target === productModal) closeProductModal(); });

  document.getElementById("pImages").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const compressed = await NurevaStore.compressImage(file, 800, 0.72);
        currentImages.push(compressed);
        renderImagePreview();
      } catch (err) { console.error(err); }
    }
    e.target.value = "";
  });

  productForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("pId").value;
    const name = document.getElementById("pName").value.trim();
    if (!currentImages.length) currentImages = [NurevaStore.placeholderImage(name)];
    const data = {
      name,
      category: document.getElementById("pCategory").value,
      price: Number(document.getElementById("pPrice").value),
      offerPrice: document.getElementById("pOfferPrice").value ? Number(document.getElementById("pOfferPrice").value) : null,
      stock: Number(document.getElementById("pStock").value) || 0,
      sizes: document.getElementById("pSizes").value.split(",").map(s => s.trim()).filter(Boolean),
      colors: document.getElementById("pColors").value.split(",").map(s => s.trim()).filter(Boolean),
      description: document.getElementById("pDescription").value.trim(),
      images: currentImages,
      isNew: document.getElementById("pIsNew").checked,
      isFeatured: document.getElementById("pIsFeatured").checked,
    };
    const action = id ? NurevaStore.Products.update(id, data) : NurevaStore.Products.add(data);
    action.then(() => { closeProductModal(); toastAdmin("Product saved"); })
          .catch(err => alert(err.message));
  });
}

function openProductModal(id) {
  const catSelect = document.getElementById("pCategory");
  catSelect.innerHTML = NurevaStore.CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("");
  const p = id ? NurevaStore.Products.get(id) : null;
  document.getElementById("modalTitle").textContent = p ? "Edit Product" : "New Product";
  document.getElementById("pId").value = p ? p.id : "";
  document.getElementById("pName").value = p ? p.name : "";
  catSelect.value = p ? p.category : NurevaStore.CATEGORIES[0];
  document.getElementById("pPrice").value = p ? p.price : "";
  document.getElementById("pOfferPrice").value = p && p.offerPrice ? p.offerPrice : "";
  document.getElementById("pStock").value = p ? p.stock : 10;
  document.getElementById("pSizes").value = p ? p.sizes.join(", ") : "S, M, L, XL";
  document.getElementById("pColors").value = p ? p.colors.join(", ") : "Black, Navy Blue";
  document.getElementById("pDescription").value = p ? p.description : "";
  document.getElementById("pIsNew").checked = p ? !!p.isNew : false;
  document.getElementById("pIsFeatured").checked = p ? !!p.isFeatured : false;
  currentImages = p ? [...p.images] : [];
  renderImagePreview();
  productModal.classList.add("open");
}
function closeProductModal() {
  productModal.classList.remove("open");
  document.getElementById("productForm").reset();
  currentImages = [];
}
function renderImagePreview() {
  const wrap = document.getElementById("pImagePreview");
  wrap.innerHTML = currentImages.map((img, i) => `
    <div class="thumb-wrap"><img src="${img}"><button type="button" class="rm" data-i="${i}">✕</button></div>
  `).join("");
  wrap.querySelectorAll(".rm").forEach(b => b.addEventListener("click", () => {
    currentImages.splice(Number(b.dataset.i), 1); renderImagePreview();
  }));
}

/* ---------- Covers (2 fixed homepage covers: cover 1 -> Nureva Signature, cover 2 -> Offers) ---------- */
const COVER_LINKS = ["products.html?cat=Nureva%20Signature", "products.html?cat=Nureva%20Classic"];
function renderBanners() {
  const covers = NurevaStore.Covers.all();
  const grid = document.getElementById("bannerGrid");
  grid.innerHTML = [0, 1].map(i => {
    const c = covers[i] || {};
    const dest = i === 0 ? "Nureva Signature" : "Nureva Classic";
    return `
    <div class="banner-slot">
      <label>Cover ${i + 1} <small style="font-weight:400;color:#8A5875">(opens ${dest} when clicked)</small></label>
      <div class="preview"><img src="${c.image || NurevaStore.placeholderImage("Cover " + (i + 1))}"></div>
      <input type="file" accept="image/*" data-i="${i}" class="banner-input">
    </div>
  `;
  }).join("");
  grid.querySelectorAll(".banner-input").forEach(inp => inp.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      // Slightly smaller/more compressed than before — these display at
      // well under their original size on a phone screen anyway, and a
      // lighter payload means the Firestore document (and therefore the
      // homepage) loads noticeably faster on a mobile connection.
      const compressed = await NurevaStore.compressImage(file, 760, 0.62);
      const arr = NurevaStore.Covers.all().slice();
      const i = Number(inp.dataset.i);
      arr[i] = { ...(arr[i] || {}), image: compressed, link: COVER_LINKS[i] };
      await NurevaStore.Covers.set(arr);
      renderBanners();
      toastAdmin("Cover image updated");
    } catch (err) { alert(err.message); }
  }));

  renderOfferBadge();
}

/* ---------- Offer popup badge (floats on the homepage after 4s) ---------- */
function renderOfferBadge() {
  const grid = document.getElementById("offerBadgeGrid");
  if (!grid) return;
  const badge = NurevaStore.Covers.getOfferBadge();
  grid.innerHTML = `
    <div class="banner-slot">
      <label>Popup Badge <small style="font-weight:400;color:#8A5875">(opens Offers page when tapped)</small></label>
      <div class="preview" style="background:repeating-conic-gradient(#f2f2f2 0% 25%, #ffffff 0% 50%) 50% / 16px 16px;">
        ${badge ? `<img src="${badge}" style="object-fit:contain">` : `<span style="color:#8A5875;font-size:0.85rem">No badge uploaded — popup is off</span>`}
      </div>
      <input type="file" accept="image/*" id="offerBadgeInput">
      ${badge ? `<button type="button" class="btn btn-outline" id="offerBadgeRemove" style="margin-top:8px;width:100%">Remove Badge (turn popup off)</button>` : ""}
    </div>
  `;
  document.getElementById("offerBadgeInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      // PNG keeps a transparent background, which these floating badge
      // graphics (like the sample "Offer price / Shop now" badge) almost
      // always rely on — JPEG would fill any transparent area solid
      // white/black and ruin the floating look.
      const compressed = await NurevaStore.compressImage(file, 400, 0.9, "png");
      await NurevaStore.Covers.setOfferBadge(compressed);
      renderOfferBadge();
      toastAdmin("Offer popup badge updated");
    } catch (err) { alert(err.message); }
  });
  document.getElementById("offerBadgeRemove")?.addEventListener("click", async () => {
    if (!confirm("Turn off the offer popup?")) return;
    await NurevaStore.Covers.clearOfferBadge();
    renderOfferBadge();
    toastAdmin("Offer popup turned off");
  });
}

/* ---------- News ---------- */
function renderNews() {
  const list = NurevaStore.News.all();
  document.getElementById("newsList").innerHTML = list.length ? list.map(n => `
    <div class="admin-list-item">
      <span>${n.text}</span>
      <button data-id="${n.id}">🗑️ Remove</button>
    </div>
  `).join("") : `<p style="color:#8A5875">No notices yet</p>`;
  document.querySelectorAll("#newsList button").forEach(b => b.addEventListener("click", () => {
    NurevaStore.News.remove(b.dataset.id);
  }));
}
document.getElementById("newsForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("newsInput");
  if (input.value.trim()) {
    NurevaStore.News.add(input.value.trim()).then(() => { input.value = ""; toastAdmin("Notice added"); });
  }
});

/* ---------- Orders ---------- */
function renderOrders() {
  const orders = NurevaStore.Orders.all();
  const wrap = document.getElementById("orderTable");
  if (!orders.length) {
    wrap.innerHTML = `<p style="color:#8A5875;padding:20px">No orders yet</p>`;
    return;
  }
  const statuses = ["New", "Processing", "Shipped", "Delivered", "Cancelled"];
  wrap.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-card-head">
        <div>
          <strong>${o.customer.name}</strong> · ${o.customer.phone}
          <div style="color:#8A5875;font-size:0.82rem;margin-top:2px">${new Date(o.date).toLocaleString()}</div>
        </div>
        <select data-id="${o.id}" class="order-status">
          ${statuses.map(s => `<option ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
      <div class="order-card-address">
        <strong>Delivery Address:</strong> ${o.customer.address || "—"}, ${o.customer.district || "—"}
        ${o.customer.note ? `<br><strong>Note:</strong> ${o.customer.note}` : ""}
        <br><strong>Payment:</strong> ${o.paymentMethod || "Cash on Delivery"}
      </div>
      <div class="order-card-items">
        ${o.items.map(i => `
          <div class="order-item-row">
            <img src="${i.image}" alt="${i.name}">
            <div class="order-item-info">
              <div style="font-weight:600">${i.name}</div>
              <div style="color:#8A5875;font-size:0.82rem">Size: ${i.size} · Colour: ${i.color} · Qty: ${i.qty}</div>
            </div>
            <div style="font-weight:700">${taka(i.price * i.qty)}</div>
          </div>
        `).join("")}
      </div>
      <div class="order-card-totals">
        <span>Subtotal: ${taka(o.subtotal)}</span>
        <span>Delivery: ${taka(o.deliveryFee)}</span>
        <strong>Total: ${taka(o.total)}</strong>
      </div>
      <div style="margin-top:10px"><button class="del-btn" data-id="${o.id}">🗑️ Delete Order</button></div>
    </div>
  `).join("");
  wrap.querySelectorAll(".order-status").forEach(sel => sel.addEventListener("change", () => {
    NurevaStore.Orders.updateStatus(sel.dataset.id, sel.value);
  }));
  wrap.querySelectorAll(".del-btn").forEach(b => b.addEventListener("click", () => {
    if (confirm("Delete this order?")) NurevaStore.Orders.remove(b.dataset.id);
  }));
}

/* ---------- Settings ---------- */
function renderSettings() {
  /* Guard: if the admin is actively typing in this form, a background
     Firestore update on ANY collection (products/orders/etc.) used to
     re-run this function and silently overwrite whatever they'd just
     typed with the last-saved (often empty) value — so Phone/WhatsApp
     looked "saved" but the blank value that got submitted was really
     the just-clobbered one. Skip the refresh while the form has focus. */
  const formEl = document.getElementById("settingsForm");
  if (formEl && formEl.contains(document.activeElement)) return;
  const s = NurevaStore.Settings.get();
  document.getElementById("setSiteName").value = s.siteName || "";
  document.getElementById("setTagline").value = s.tagline || "";
  document.getElementById("setFacebook").value = s.facebook || "";
  document.getElementById("setInstagram").value = s.instagram || "";
  document.getElementById("setMessenger").value = s.messenger || "";
  document.getElementById("setPhone").value = s.phone || "";
  document.getElementById("setWhatsapp").value = s.whatsapp || "";
  document.getElementById("setAddress").value = s.address || "";
  document.getElementById("setDeliveryIn").value = s.deliveryInsideDhaka || 70;
  document.getElementById("setDeliveryOut").value = s.deliveryOutsideDhaka || 130;
}
document.getElementById("settingsForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const payload = {
    siteName: document.getElementById("setSiteName").value.trim(),
    tagline: document.getElementById("setTagline").value.trim(),
    facebook: document.getElementById("setFacebook").value.trim(),
    instagram: document.getElementById("setInstagram").value.trim(),
    messenger: document.getElementById("setMessenger").value.trim(),
    phone: document.getElementById("setPhone").value.trim(),
    whatsapp: document.getElementById("setWhatsapp").value.replace(/[^0-9]/g, ""),
    address: document.getElementById("setAddress").value.trim(),
    deliveryInsideDhaka: Number(document.getElementById("setDeliveryIn").value) || 0,
    deliveryOutsideDhaka: Number(document.getElementById("setDeliveryOut").value) || 0,
  };
  NurevaStore.Settings.update(payload)
    .then(() => toastAdmin("Settings saved"))
    .catch(err => alert("Settings could not be saved: " + err.message));
});
document.getElementById("passwordForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const pw = document.getElementById("newPassword").value;
  NurevaStore.Admin.changePassword(pw)
    .then(() => { document.getElementById("passwordForm").reset(); toastAdmin("Password changed"); })
    .catch(err => alert(err.message + " (you may need to log out and log back in, then try again — Firebase requires a recent login to change your password)"));
});

/* ---------- Live Chat (admin) ---------- */
let allChats = [];
let selectedChatId = null;
let chatMessagesUnsub = null;
let chatOnlineTimer = null;

function escapeAdminChat(s) { return String(s).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c])); }
function timeAgoShort(ms) {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h";
  return Math.floor(h / 24) + "d";
}

function updateChatBadge() {
  const count = allChats.filter(c => c.adminUnread).length;
  const navBadge = document.getElementById("navChatBadge");
  if (navBadge) { navBadge.textContent = count; navBadge.style.display = count ? "inline-flex" : "none"; }
  const strip = document.getElementById("chatNewMsgBadge");
  if (strip) {
    strip.style.display = count ? "inline-block" : "none";
    strip.innerHTML = `🔔 ${count} New Message${count === 1 ? "" : "s"}`;
  }
  const totalBadge = document.getElementById("chatTotalBadge");
  if (totalBadge) { totalBadge.textContent = count; totalBadge.style.display = count ? "inline-flex" : "none"; }
}

function renderChatCustomerList() {
  const wrap = document.getElementById("chatCustomers");
  if (!wrap) return;
  if (!allChats.length) { wrap.innerHTML = `<p style="padding:16px;color:#8A5875">No conversations yet</p>`; return; }
  wrap.innerHTML = allChats.map(c => `
    <div class="chat-cust-item ${c.id === selectedChatId ? "active" : ""} ${c.adminUnread ? "unread" : ""}" data-id="${c.id}">
      <div class="chat-cust-avatar">${(c.name || "?").charAt(0).toUpperCase()}<span class="chat-online-dot ${NurevaStore.Chat.isOnline(c) ? "online" : ""}"></span></div>
      <div class="chat-cust-info">
        <div class="chat-cust-name">${c.name || "Unknown"} ${c.adminUnread ? '<span class="chat-unread-dot"></span>' : ""}</div>
        <div class="chat-cust-preview">${c.lastSender === "admin" ? "You: " : ""}${c.lastMessage || ""}</div>
      </div>
      <div class="chat-cust-time">${c.lastMessageAt ? timeAgoShort(c.lastMessageAt) : ""}</div>
    </div>
  `).join("");
  wrap.querySelectorAll(".chat-cust-item").forEach(el => el.addEventListener("click", () => openChatConversation(el.dataset.id)));
}

function renderConvStatus(chat) {
  const el = document.getElementById("chatConvStatus");
  if (!el || !chat) return;
  const online = NurevaStore.Chat.isOnline(chat);
  el.innerHTML = `<span class="chat-online-dot ${online ? "online" : ""}"></span> ${online ? "Online" : "Offline"}${chat.email ? " · " + chat.email : ""}`;
}

function openChatConversation(chatId) {
  selectedChatId = chatId;
  const chat = allChats.find(c => c.id === chatId);
  if (!chat) return;
  document.getElementById("chatConvEmpty").style.display = "none";
  document.getElementById("chatConvActive").style.display = "flex";
  document.querySelector(".chat-admin-layout")?.classList.add("mobile-conv-open");
  document.getElementById("chatConvName").textContent = chat.name || "Unknown";
  renderConvStatus(chat);
  renderChatCustomerList();
  NurevaStore.Chat.markAdminRead(chatId);
  if (chatMessagesUnsub) chatMessagesUnsub();
  chatMessagesUnsub = NurevaStore.Chat.listenMessages(chatId, (msgs) => {
    renderChatConvMessages(msgs);
    NurevaStore.Chat.markAdminRead(chatId);
  });
}

function renderChatConvMessages(msgs) {
  const el = document.getElementById("chatConvMessages");
  if (!el) return;
  el.innerHTML = msgs.length ? msgs.map(m => `
    <div class="chat-bubble ${m.sender === "admin" ? "from-admin" : "from-customer"}">
      <div class="chat-bubble-text">${escapeAdminChat(m.text)}</div>
      <div class="chat-bubble-time">${new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
    </div>
  `).join("") : `<p style="color:#8A5875;text-align:center;margin-top:20px">No messages yet</p>`;
  el.scrollTop = el.scrollHeight;
}

document.getElementById("chatReplyForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("chatReplyInput");
  const text = input.value.trim();
  if (!text || !selectedChatId) return;
  input.value = "";
  NurevaStore.Chat.sendMessage(selectedChatId, "admin", text).catch(err => alert("Could not send: " + err.message));
});
document.getElementById("chatBackBtn")?.addEventListener("click", () => {
  document.querySelector(".chat-admin-layout")?.classList.remove("mobile-conv-open");
});
document.getElementById("chatDeleteBtn")?.addEventListener("click", () => {
  if (!selectedChatId) return;
  if (confirm("Delete this entire conversation? This cannot be undone.")) {
    const idToDelete = selectedChatId;
    NurevaStore.Chat.deleteChat(idToDelete).then(() => {
      selectedChatId = null;
      if (chatMessagesUnsub) { chatMessagesUnsub(); chatMessagesUnsub = null; }
      document.getElementById("chatConvActive").style.display = "none";
      document.getElementById("chatConvEmpty").style.display = "flex";
      document.querySelector(".chat-admin-layout")?.classList.remove("mobile-conv-open");
      toastAdmin("Conversation deleted");
    }).catch(err => alert(err.message));
  }
});

/* runs on every protected admin page: keeps the sidebar 🔔 badge live everywhere,
   and — on admin-chat.html specifically — drives the customer list + open conversation */
function initChatSync() {
  NurevaStore.Chat.listenAllChats((chats) => {
    allChats = chats;
    updateChatBadge();
    renderChatCustomerList();
    if (selectedChatId) {
      const c = allChats.find(x => x.id === selectedChatId);
      if (c) renderConvStatus(c);
      else {
        selectedChatId = null;
        if (chatMessagesUnsub) { chatMessagesUnsub(); chatMessagesUnsub = null; }
        const active = document.getElementById("chatConvActive"); if (active) active.style.display = "none";
        const empty = document.getElementById("chatConvEmpty"); if (empty) empty.style.display = "flex";
      }
    }
  });
  if (!chatOnlineTimer) chatOnlineTimer = setInterval(() => { renderChatCustomerList(); if (selectedChatId) { const c = allChats.find(x => x.id === selectedChatId); if (c) renderConvStatus(c); } }, 15000);
}

/* ---------- Account Users ---------- */
let allCustomers = [];
let customersUnsub = null;
let customersSyncStarted = false;

function initCustomersSync() {
  if (customersSyncStarted) return;
  customersSyncStarted = true;
  customersUnsub = NurevaStore.Customer.listenAll((customers) => {
    allCustomers = customers;
    if (document.getElementById("usersList")) renderUsers();
  });
}

/* Match a customer's orders by phone number, since orders aren't linked by
   uid (guests can also order). Cancelled orders are counted separately and
   excluded from "money/products actually bought" totals. */
function customerOrderStats(customer) {
  const phone = (customer.phone || "").trim();
  const orders = phone ? NurevaStore.Orders.byPhone(phone) : [];
  let boughtItems = 0, boughtTotal = 0, cancelledCount = 0;
  orders.forEach(o => {
    if (o.status === "Cancelled") {
      cancelledCount++;
    } else {
      boughtTotal += (o.total || 0);
      boughtItems += (o.items || []).reduce((s, i) => s + (i.qty || 1), 0);
    }
  });
  return { orders, orderCount: orders.length, boughtItems, boughtTotal, cancelledCount };
}

function renderUsers() {
  const listEl = document.getElementById("usersList");
  const statGrid = document.getElementById("userStatGrid");
  if (!listEl) return;

  const totalSpent = allCustomers.reduce((s, c) => s + customerOrderStats(c).boughtTotal, 0);
  const totalCancelled = allCustomers.reduce((s, c) => s + customerOrderStats(c).cancelledCount, 0);
  statGrid.innerHTML = [
    { num: allCustomers.length, lbl: "Total Account Users" },
    { num: taka(totalSpent), lbl: "Total Spent (all users)" },
    { num: totalCancelled, lbl: "Total Cancelled Orders" },
  ].map(s => `<div class="stat-card"><div class="num">${s.num}</div><div class="lbl">${s.lbl}</div></div>`).join("");

  const query = (document.getElementById("userSearch").value || "").trim().toLowerCase();
  const filtered = !query ? allCustomers : allCustomers.filter(c =>
    (c.name || "").toLowerCase().includes(query) ||
    (c.phone || "").toLowerCase().includes(query) ||
    (c.email || "").toLowerCase().includes(query)
  );

  if (!filtered.length) {
    listEl.innerHTML = `<p style="color:#8A5875;padding:20px">${allCustomers.length ? "No users match your search." : "No account users have registered yet."}</p>`;
    return;
  }

  listEl.innerHTML = filtered.map(c => {
    const stats = customerOrderStats(c);
    return `
      <div class="user-card" data-uid="${c.uid}">
        <div class="u-main">
          <strong>${c.name || "—"}</strong>
          <div class="u-sub">${c.phone || "—"} · ${c.email || "—"}</div>
        </div>
        <div class="u-badges">
          <span class="u-badge orders">${stats.orderCount} order(s)</span>
          <span class="u-badge spent">${taka(stats.boughtTotal)}</span>
          ${stats.cancelledCount ? `<span class="u-badge cancel">${stats.cancelledCount} cancelled</span>` : ""}
        </div>
      </div>
    `;
  }).join("");

  listEl.querySelectorAll(".user-card").forEach(card => {
    card.addEventListener("click", () => openUserModal(card.dataset.uid));
  });
}

document.getElementById("userSearch")?.addEventListener("input", renderUsers);

function openUserModal(uid) {
  const c = allCustomers.find(x => x.uid === uid);
  if (!c) return;
  const stats = customerOrderStats(c);
  document.getElementById("umName").textContent = c.name || "Account User";

  const detailsHtml = `
    <div class="detail-row"><span>Mobile Number</span><span>${c.phone || "—"}</span></div>
    <div class="detail-row"><span>Email</span><span>${c.email || "—"}</span></div>
    <div class="detail-row"><span>Address / Location</span><span>${c.address || "—"}</span></div>
    <div class="detail-row"><span>Account Created</span><span>${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</span></div>
  `;

  const statsHtml = `
    <div class="detail-stats">
      <div class="stat-card"><div class="num">${stats.orderCount}</div><div class="lbl">Total Orders Placed</div></div>
      <div class="stat-card"><div class="num">${stats.boughtItems}</div><div class="lbl">Products Bought</div></div>
      <div class="stat-card"><div class="num">${taka(stats.boughtTotal)}</div><div class="lbl">Total Spent</div></div>
      <div class="stat-card" style="border-left-color:#C0143C"><div class="num" style="color:#C0143C">${stats.cancelledCount}</div><div class="lbl">Orders Cancelled</div></div>
    </div>
  `;

  const ordersHtml = stats.orders.length ? stats.orders.map(o => `
    <div class="detail-order-item">
      <div class="doi-head">
        <span>${new Date(o.date).toLocaleDateString()} · ${(o.items || []).length} item(s)</span>
        <span class="tag status">${o.status}</span>
      </div>
      <div style="margin-top:4px">Total: ${taka(o.total)}</div>
    </div>
  `).join("") : `<p style="color:#8A5875;font-size:0.85rem">No orders placed yet.</p>`;

  document.getElementById("umBody").innerHTML = `
    ${detailsHtml}
    ${statsHtml}
    <h4 style="font-family:var(--font-display);color:var(--admin-pink-dark);margin:6px 0 10px">Order History</h4>
    ${ordersHtml}
  `;
  document.getElementById("userModal").classList.add("open");
}
document.getElementById("umClose")?.addEventListener("click", () => document.getElementById("userModal").classList.remove("open"));
document.getElementById("userModal")?.addEventListener("click", (e) => { if (e.target.id === "userModal") e.target.classList.remove("open"); });

/* ---------- toast ---------- */
function toastAdmin(msg) {
  let el = document.getElementById("adminToast");
  if (!el) { el = document.createElement("div"); el.id = "adminToast"; el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2200);
}
