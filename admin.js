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
  });
}

function renderCurrentPage() {
  if (document.getElementById("statGrid")) renderDashboard();
  if (document.getElementById("productTable")) { renderProductFilterBar(); renderProducts(); }
  if (document.getElementById("bannerGrid")) renderBanners();
  if (document.getElementById("newsList")) renderNews();
  if (document.getElementById("orderTable")) renderOrders();
  if (document.getElementById("setSiteName")) renderSettings();
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
      if (confirm("This adds sample products, 4 cover banners and default settings. Continue?")) {
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

/* ---------- Banners ---------- */
function renderBanners() {
  const banners = NurevaStore.Banners.all();
  const grid = document.getElementById("bannerGrid");
  grid.innerHTML = [0, 1, 2, 3].map(i => `
    <div class="banner-slot">
      <label>Slide ${i + 1}</label>
      <div class="preview"><img src="${banners[i] || NurevaStore.placeholderImage("Slide " + (i + 1))}"></div>
      <input type="file" accept="image/*" data-i="${i}" class="banner-input">
    </div>
  `).join("");
  grid.querySelectorAll(".banner-input").forEach(inp => inp.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await NurevaStore.compressImage(file, 900, 0.7);
      const arr = NurevaStore.Banners.all().slice();
      arr[Number(inp.dataset.i)] = compressed;
      await NurevaStore.Banners.set(arr);
      renderBanners();
      toastAdmin("Cover image updated");
    } catch (err) { alert(err.message); }
  }));
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
  NurevaStore.Settings.update({
    siteName: document.getElementById("setSiteName").value,
    tagline: document.getElementById("setTagline").value,
    facebook: document.getElementById("setFacebook").value,
    instagram: document.getElementById("setInstagram").value,
    messenger: document.getElementById("setMessenger").value,
    phone: document.getElementById("setPhone").value,
    whatsapp: document.getElementById("setWhatsapp").value,
    address: document.getElementById("setAddress").value,
    deliveryInsideDhaka: Number(document.getElementById("setDeliveryIn").value) || 0,
    deliveryOutsideDhaka: Number(document.getElementById("setDeliveryOut").value) || 0,
  }).then(() => toastAdmin("Settings saved"));
});
document.getElementById("passwordForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const pw = document.getElementById("newPassword").value;
  NurevaStore.Admin.changePassword(pw)
    .then(() => { document.getElementById("passwordForm").reset(); toastAdmin("Password changed"); })
    .catch(err => alert(err.message + " (you may need to log out and log back in, then try again — Firebase requires a recent login to change your password)"));
});

/* ---------- toast ---------- */
function toastAdmin(msg) {
  let el = document.getElementById("adminToast");
  if (!el) { el = document.createElement("div"); el.id = "adminToast"; el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2200);
}
