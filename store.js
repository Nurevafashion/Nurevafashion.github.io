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
  const CATEGORIES = ["Burqa", "Three-Piece", "Hijab", "Panjabi"];

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
  function checkReady() { if (Object.values(flags).every(Boolean)) resolveReady(); }
  function notify() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }
  function onChange(fn) { listeners.push(fn); }

  db.collection("products").onSnapshot(
    snap => { cache.products = snap.docs.map(d => ({ id: d.id, ...d.data() })); flags.products = true; checkReady(); notify(); },
    err => { console.error("products sync error:", err); flags.products = true; checkReady(); }
  );
  db.collection("banners").doc("main").onSnapshot(
    doc => { cache.covers = doc.exists ? (doc.data().covers || []) : []; flags.covers = true; checkReady(); notify(); },
    err => { console.error("covers sync error:", err); flags.covers = true; checkReady(); }
  );
  db.collection("news").orderBy("date", "desc").onSnapshot(
    snap => { cache.news = snap.docs.map(d => ({ id: d.id, ...d.data() })); flags.news = true; checkReady(); notify(); },
    err => { console.error("news sync error:", err); flags.news = true; checkReady(); }
  );
  db.collection("settings").doc("general").onSnapshot(
    doc => { cache.settings = doc.exists ? { ...defaultSettings(), ...doc.data() } : defaultSettings(); flags.settings = true; checkReady(); notify(); },
    err => { console.error("settings sync error:", err); flags.settings = true; checkReady(); }
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
    onOffer: () => cache.products.filter(p => p.offerPrice),
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
  const Orders = {
    all: () => cache.orders,
    byPhone: (phone) => {
      const p = (phone || "").trim();
      if (!p) return [];
      return cache.orders.filter(o => o.customer && (o.customer.phone || "").trim() === p);
    },
    add: (order) => db.collection("orders").add({ ...order, date: Date.now(), status: "New" }),
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
    signUp: (name, phone, email, password) => {
      if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) return Promise.reject(new Error("This email can't be used."));
      return auth.createUserWithEmailAndPassword(email, password).then(cred =>
        db.collection("customers").doc(cred.user.uid).set({ name, phone, email, createdAt: Date.now() })
      );
    },
    login: (email, password) => auth.signInWithEmailAndPassword(email, password),
    logout: () => auth.signOut(),
    getProfile: () => {
      const user = auth.currentUser;
      if (!user || user.email === ADMIN_EMAIL) return Promise.resolve(null);
      return db.collection("customers").doc(user.uid).get().then(doc => doc.exists ? { uid: user.uid, ...doc.data() } : null);
    },
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
      names[cat].forEach((n, idx) => {
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

  return { CATEGORIES, ready, onChange, Products, Covers, News, Settings, Orders, Admin, Customer, placeholderImage, compressImage, seedDemoData };
})();
