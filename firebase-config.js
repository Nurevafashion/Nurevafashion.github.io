/* ============================================================
   Nureva Fashion — Firebase Configuration
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyAfXPqWQkC2MHJc_9e0jRWyYxDMVS8TQNI",
  authDomain: "nureva-fashion.firebaseapp.com",
  projectId: "nureva-fashion",
  storageBucket: "nureva-fashion.firebasestorage.app",
  messagingSenderId: "907998217736",
  appId: "1:907998217736:web:f4473a908c1209a94cf3bd",
};

/* The email you use to sign in to the admin panel — must match
   the user you created in Firebase Authentication. */
const ADMIN_EMAIL = "manjidaakter64@gmail.com";

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
