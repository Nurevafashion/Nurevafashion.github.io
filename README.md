# Nureva Fashion — Setup & Deployment Guide

Your site runs on **Firebase** (free Spark plan), so every change made in
the admin panel is shared live with every visitor, on any device.

Your project (`nureva-fashion`) and admin login are already wired into
`js/firebase-config.js`. Admin login email: `manjidaakter64@gmail.com`
(sign in with the password you set in Firebase Authentication).

## One thing left to check — Firestore Database
Before the site can save or show products, Firestore needs to be turned on:
1. In the Firebase console, go to **Build → Firestore Database**.
2. Click **Create database** → **Start in production mode** → pick a location close to Bangladesh (e.g. `asia-south1`) → **Enable**.
3. Go to the **Rules** tab and replace the rules with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```
   This means: **anyone can view** products/offers (so customers can browse), but **only a signed-in admin can change anything**. Click **Publish**.

If you've already done this, you're all set — skip to Upload below.

## Upload to GitHub Pages
1. Create a GitHub repository (name it `<username>.github.io` for the root domain, or any name for a project site).
2. Upload every file and folder from this project (`index.html`, `admin.html`, `css/`, `js/`, etc).
3. In the repo, go to **Settings → Pages**, set the branch to `main`, and save. The site goes live shortly after.
4. Your admin panel will be at: `https://<username>.github.io/admin.html`

## Add your products
1. Open your admin panel and log in with your password.
2. On the Dashboard, click **"Add sample demo products"** if you want to start from example products — or go straight to the **Products** tab and click **+ New Product** to add your real catalogue.
3. Upload your 5 cover photos under the **Cover / Slider** tab.
4. Add any running offers by setting an "Offer Price" on a product.
5. Add announcements under **News / Notice** — they'll scroll in a ticker on the homepage.

## Notes
- **Cart** is stored per-device (not shared) — that's normal and correct; each shopper's cart is their own.
- **Orders** placed at checkout are saved to Firestore and show up in the admin **Orders** tab in real time, from any device.
- Firestore's free quota (50K reads / 20K writes per day) is generous for a small-to-medium shop.
- No Firebase Storage and no billing card are used — images are resized/compressed in the browser and stored directly in Firestore.

## File structure
- `index.html` — Homepage (5-image cover slider, changes every 3 seconds)
- `products.html` — All products (with category filters)
- `product.html` — Product detail page
- `offers.html` — Offers page
- `cart.html`, `checkout.html` — Cart and order placement
- `contact.html` — Contact page
- `admin.html` — Admin panel
- `css/`, `js/` — Styles and logic
