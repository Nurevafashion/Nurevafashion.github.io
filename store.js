/* ============================================================
   Nureva Fashion — Data Store (Firebase Firestore + Auth)
   All data lives in Firestore (shared across every visitor).
   Anything changed from the admin panel is synced live to
   every visitor's browser. Images are resized/compressed and
   stored directly in Firestore as base64 — so no Firebase
   Storage or billing card is required; the free Spark plan
   is enough.
   ============================================================ */

const NurevaStore = (() => {
  const CATEGORIES = ["Burqa", "Three-Piece", "Hijab", "Panjabi", "Nureva Signature", "Nureva Classic", "Offers"];

  /* ---------- placeholder image (SVG) ---------- */
  function hashCode(str) { let h = 0; for (let i = 0; i < String(str).length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; } return h; }
  function escapeXml(s) { return String(s).replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c])); }
  function placeholderImage(label, seed) {
    const palettes = [["#3B1F32", "#6B3A57"], ["#5B2A45", "#C9A063"], ["#2A1F26", "#8B6F7A"], ["#4A2545", "#B98D6F"]];
    const p = palettes[Math.abs(hashCode(seed || label)) % palettes.length];
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='${p[0]}'/><stop offset='1' stop-color='${p[1]}'/>
      </linearGradient></defs>
      <rect width='800' height='1000' fill='url(#g)'/>
      <text x='400' y='500' font-family='Georgia,serif' font-size='40' fill='#F7EFE6'
        text-anchor='middle' dominant-baseline='middle' opacity='0.85'>${escapeXml(label)}</text>
    </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  /* ---------- resize/compress an image → base64 (to store in Firestore) ---------- */
  function compressImage(file, maxWidth = 800, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function defaultSettings() {
    return {
      siteName: "Nureva Fashion",
      tagline: "Where Modesty Meets Elegance",
      facebook: "https://facebook.com/Nurevafashion",
      instagram: "",
      messenger: "",
      whatsapp: "",
      phone: "",
      address: "Dhaka, Bangladesh",
      deliveryInsideDhaka: 70,
      deliveryOutsideDhaka: 130,
    };
  }

  /* ---------- in-memory cache, kept in sync via Firestore realtime listeners ---------- */
  const cache = { products: [], covers: [], news: [], settings: defaultSettings(), orders: [] };
  const flags = { products: false, covers: false, news: false, settings: false };
  const listeners = [];
  let resolveReady;
  const ready = new Promise(res => { resolveReady = res; });
  /* Per-collection ready promises. Covers/news/settings are tiny
     documents that sync almost instantly, but products (many items,
     each with photos) can take noticeably longer on a slow connection.
     Pages that only need the fast collections (e.g. the homepage hero,
     or a category page's title/heading) can await just those instead of
     the combined `ready`, so the cover photos and page title show up
     immediately instead of waiting behind the whole product catalogue. */
  let resolveReadyProducts, resolveReadyCovers, resolveReadyNews, resolveReadySettings;
  const readyProducts = new Promise(res => { resolveReadyProducts = res; });
  const readyCovers = new Promise(res => { resolveReadyCovers = res; });
  const readyNews = new Promise(res => { resolveReadyNews = res; });
  const readySettings = new Promise(res => { resolveReadySettings = res; });
  function checkReady() { if (Object.values(flags).every(Boolean)) resolveReady(); }
  function notify() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }
  function onChange(fn) { listeners.push(fn); }

  db.collection("products").onSnapshot(
    snap => { cache.products = snap.docs.map(d => ({ id: d.id, ...d.data() })); flags.products = true; checkReady(); resolveReadyProducts(); notify(); },
    err => { console.error("products sync error:", err); flags.products = true; checkReady(); resolveReadyProducts(); }
  );
  db.collection("banners").doc("main").onSnapshot(
    doc => { cache.covers = doc.exists ? (doc.data().covers || []) : []; flags.covers = true; checkReady(); resolveReadyCovers(); notify(); },
    err => { console.error("covers sync error:", err); flags.covers = true; checkReady(); resolveReadyCovers(); }
  );
  db.collection("news").orderBy("date", "desc").onSnapshot(
    snap => { cache.news = snap.docs.map(d => ({ id: d.id, ...d.data() })); flags.news = true; checkReady(); resolveReadyNews(); notify(); },
    err => { console.error("news sync error:", err); flags.news = true; checkReady(); resolveReadyNews(); }
  );
  db.collection("settings").doc("general").onSnapshot(
    doc => {
      cache.settings = doc.exists ? { ...defaultSettings(), ...doc.data() } : defaultSettings();
      flags.settings = true; checkReady(); resolveReadySettings(); notify();
      /* Durable fallback: cache the last successfully-synced contact
         numbers in localStorage. If a future page load's live Firestore
         sync is delayed/fails (flaky mobile network), the Call/WhatsApp
         buttons can still fall back to the last known-good numbers
         instead of wrongly reporting "not added". */
      try {
        if (cache.settings.phone) localStorage.setItem("nurevaLastPhone", cache.settings.phone);
        if (cache.settings.whatsapp) localStorage.setItem("nurevaLastWhatsapp", cache.settings.whatsapp);
      } catch (e) {}
    },
    err => { console.error("settings sync error:", err); flags.settings = true; checkReady(); resolveReadySettings(); }
  );
  db.collection("orders").orderBy("date", "desc").onSnapshot(
    snap => { cache.orders = snap.docs.map(d => ({ id: d.id, ...d.data() })); notify(); },
    err => console.error("orders sync error:", err)
  );

  /* ---------- Products ---------- */
  const Products = {
    all: () => cache.products,
    get: (id) => cache.products.find(p => p.id === id),
    byCategory: (cat) => cache.products.filter(p => p.category === cat),
    featured: () => cache.products.filter(p => p.isFeatured),
    newArrivals: () => cache.products.filter(p => p.isNew),
    onOffer: () => cache.products.filter(p => p.offerPrice || p.category === "Offers"),
    search: (q) => {
      q = (q || "").trim().toLowerCase();
      if (!q) return [];
      return cache.products.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    },
    add: (data) => db.collection("products").add({ ...data, createdAt: Date.now() }),
    update: (id, patch) => db.collection("products").doc(id).update(patch),
    remove: (id) => db.collection("products").doc(id).delete(),
  };

  /* ---------- Covers (2 fixed homepage covers, each with its own link) ---------- */
  const Covers = {
    all: () => cache.covers,
    set: (arr) => db.collection("banners").doc("main").set({ covers: arr }),
  };

  /* ---------- News ---------- */
  const News = {
    all: () => cache.news,
    add: (text) => db.collection("news").add({ text, date: Date.now() }),
    remove: (id) => db.collection("news").doc(id).delete(),
  };

  /* ---------- Settings ---------- */
  const Settings = {
    get: () => cache.settings,
    update: (patch) => db.collection("settings").doc("general").set({ ...cache.settings, ...patch }, { merge: true }),
  };

  /* ---------- Orders ---------- */
  /* Reliable matching for a customer's own orders. Matching only by the
     phone number typed at checkout is fragile — spacing, +880 vs 0, stray
     characters, or simply typing a different number than the one saved
     on the account would silently hide orders from Tracking. Orders.add()
     also stores customerUid when the shopper is logged in, and byCustomer()
     prefers that exact link, falling back to a digits-only phone
     comparison for guest orders / older records. */
  function normPhone(p) { return String(p || "").replace(/\D/g, "").replace(/^880/, "").replace(/^0/, ""); }

  const Orders = {
    all: () => cache.orders,
    byPhone: (phone) => {
      const p = (phone || "").trim();
      if (!p) return [];
      return cache.orders.filter(o => o.customer && (o.customer.phone || "").trim() === p);
    },
    byCustomer: (uid, phone) => {
      const np = normPhone(phone);
      return cache.orders.filter(o =>
        (uid && o.customerUid === uid) ||
        (np && o.customer && normPhone(o.customer.phone) === np)
      );
    },
    add: (order) => {
      const user = auth.currentUser;
      const payload = { ...order, date: Date.now(), status: "New" };
      if (user && user.email !== ADMIN_EMAIL) payload.customerUid = user.uid;
      return db.collection("orders").add(payload);
    },
    updateStatus: (id, status) => db.collection("orders").doc(id).update({ status }),
    remove: (id) => db.collection("orders").doc(id).delete(),
  };

  /* ---------- Admin auth (Firebase Authentication) ---------- */
  const adminAuthListeners = [];
  const customerAuthListeners = [];
  auth.onAuthStateChanged(user => {
    const isAdminUser = !!user && user.email === ADMIN_EMAIL;
    adminAuthListeners.forEach(fn => fn(isAdminUser));
    customerAuthListeners.forEach(fn => fn(!isAdminUser && user ? user : null));
  });

  const Admin = {
    isLoggedIn: () => !!auth.currentUser && auth.currentUser.email === ADMIN_EMAIL,
    onAuthChange: (fn) => { adminAuthListeners.push(fn); },
    login: (password) => auth.signInWithEmailAndPassword(ADMIN_EMAIL, password),
    logout: () => auth.signOut(),
    changePassword: (newPassword) => {
      if (!auth.currentUser) return Promise.reject(new Error("Not logged in"));
      return auth.currentUser.updatePassword(newPassword);
    },
  };

  /* ---------- Customer accounts (sign up / log in), separate from Admin ---------- */
  const Customer = {
    onAuthChange: (fn) => { customerAuthListeners.push(fn); },
    signUp: (name, phone, email, password, address) => {
      if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) return Promise.reject(new Error("This email can't be used."));
      return auth.createUserWithEmailAndPassword(email, password).then(cred =>
        db.collection("customers").doc(cred.user.uid).set({ name, phone, email, address: address || "", createdAt: Date.now() })
      );
    },
    login: (email, password) => auth.signInWithEmailAndPassword(email, password),
    logout: () => auth.signOut(),
    resetPassword: (email) => auth.sendPasswordResetEmail(email),
    getProfile: () => {
      const user = auth.currentUser;
      if (!user || user.email === ADMIN_EMAIL) return Promise.resolve(null);
      return db.collection("customers").doc(user.uid).get().then(doc => doc.exists ? { uid: user.uid, ...doc.data() } : null);
    },
    /* Update the signed-in customer's own profile fields (e.g. name, phone, address). */
    updateProfile: (patch) => {
      const user = auth.currentUser;
      if (!user || user.email === ADMIN_EMAIL) return Promise.reject(new Error("Not logged in"));
      return db.collection("customers").doc(user.uid).set(patch, { merge: true });
    },
    /* Admin-only: realtime list of every registered customer account. */
    listenAll: (cb) => db.collection("customers").orderBy("createdAt", "desc")
      .onSnapshot(snap => cb(snap.docs.map(d => ({ uid: d.id, ...d.data() }))), err => console.error("customers sync error:", err)),
  };

  /* ---------- Live Chat (customer <-> admin, Firestore realtime) ----------
     chats/{id}            : { name, email, createdAt, lastMessage, lastMessageAt,
                                lastSender, adminUnread, customerUnread, customerLastSeen }
     chats/{id}/messages/* : { sender: "customer"|"admin", text, at }
     A customer's own chat id is kept in localStorage so returning visitors
     continue the same conversation. The full "chats" collection is only ever
     listened to from the admin panel (listenAllChats); customer pages only
     ever read/write their own single chat document. */
  const CHAT_ONLINE_MS = 45000;
  const Chat = {
    ONLINE_MS: CHAT_ONLINE_MS,
    isOnline: (chat) => !!(chat && chat.customerLastSeen && (Date.now() - chat.customerLastSeen) < CHAT_ONLINE_MS),
    getMyChatId: () => { try { return localStorage.getItem("nurevaChatId"); } catch (e) { return null; } },
    start: (name, email) => {
      return db.collection("chats").add({
        name: (name || "").trim(), email: (email || "").trim(),
        createdAt: Date.now(), lastMessage: "", lastMessageAt: Date.now(),
        lastSender: "customer", adminUnread: false, customerUnread: false,
        customerLastSeen: Date.now(),
      }).then(ref => {
        try { localStorage.setItem("nurevaChatId", ref.id); } catch (e) {}
        return ref.id;
      });
    },
    sendMessage: (chatId, sender, text) => {
      const now = Date.now();
      const batch = db.batch();
      const msgRef = db.collection("chats").doc(chatId).collection("messages").doc();
      batch.set(msgRef, { sender, text: String(text).trim(), at: now });
      const patch = { lastMessage: String(text).trim(), lastMessageAt: now, lastSender: sender };
      if (sender === "customer") { patch.adminUnread = true; patch.customerLastSeen = now; }
      else { patch.customerUnread = true; }
      batch.update(db.collection("chats").doc(chatId), patch);
      return batch.commit();
    },
    listenMessages: (chatId, cb) => db.collection("chats").doc(chatId).collection("messages").orderBy("at", "asc")
      .onSnapshot(snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => console.error("chat messages sync error:", err)),
    listenChat: (chatId, cb) => db.collection("chats").doc(chatId)
      .onSnapshot(doc => cb(doc.exists ? { id: doc.id, ...doc.data() } : null), err => console.error("chat sync error:", err)),
    listenAllChats: (cb) => db.collection("chats").orderBy("lastMessageAt", "desc")
      .onSnapshot(snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => console.error("chats sync error:", err)),
    markCustomerRead: (chatId) => chatId ? db.collection("chats").doc(chatId).update({ customerUnread: false }).catch(() => {}) : Promise.resolve(),
    markAdminRead: (chatId) => chatId ? db.collection("chats").doc(chatId).update({ adminUnread: false }).catch(() => {}) : Promise.resolve(),
    heartbeat: (chatId) => chatId ? db.collection("chats").doc(chatId).update({ customerLastSeen: Date.now() }).catch(() => {}) : Promise.resolve(),
    deleteChat: (chatId) => db.collection("chats").doc(chatId).collection("messages").get().then(snap => {
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(db.collection("chats").doc(chatId));
      return batch.commit();
    }),
  };

  /* ---------- demo data (optionally added once from the admin panel) ---------- */
  function seedDemoData() {
    const names = {
      "Burqa": ["Noor Burqa", "Soft Crepe Burqa", "Royal Burqa", "Elegant Burqa"],
      "Three-Piece": ["Georgette Three-Piece", "Cotton Three-Piece", "Premium Three-Piece", "Summer Three-Piece"],
      "Hijab": ["Chiffon Hijab", "Georgette Hijab", "Premium Hijab", "Instant Hijab"],
      "Panjabi": ["Cotton Panjabi", "Silk Panjabi", "Eid Panjabi", "Embroidered Panjabi"],
    };
    let id = 1;
    const batch = db.batch();
    CATEGORIES.forEach(cat => {
      (names[cat] || []).forEach((n, idx) => {
        const price = 1200 + (id % 5) * 400;
        const hasOffer = id % 3 === 0;
        const ref = db.collection("products").doc();
        batch.set(ref, {
          name: n, category: cat, price,
          offerPrice: hasOffer ? Math.round(price * 0.8) : null,
          images: [placeholderImage(n, n + id)],
          description: `${n} — made from premium fabric, comfortable and elegantly designed. Part of the exclusive Nureva Fashion collection.`,
          sizes: cat === "Hijab" ? ["Free Size"] : ["S", "M", "L", "XL"],
          colors: ["Black", "Navy Blue", "Maroon"],
          stock: 15 + (id % 10),
          isNew: idx === 0,
          isFeatured: id % 2 === 0,
          createdAt: Date.now() - id * 100000,
        });
        id++;
      });
    });
    const coverLabels = ["Nureva Fashion", "New Collection 2026"];
    batch.set(db.collection("banners").doc("main"), {
      covers: coverLabels.map((l, i) => ({ image: placeholderImage(l, "cover" + i), link: "products.html" })),
    });
    batch.set(db.collection("settings").doc("general"), defaultSettings(), { merge: true });
    return batch.commit();
  }

  return { CATEGORIES, ready, readyProducts, readyCovers, readyNews, readySettings, isReady: () => Object.values(flags).every(Boolean), onChange, Products, Covers, News, Settings, Orders, Admin, Customer, Chat, placeholderImage, compressImage, seedDemoData };
})();
