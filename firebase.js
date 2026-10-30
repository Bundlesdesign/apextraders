// Single reusable Firebase initialization (prevents duplicate app init).
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Public web config (identifies the project; it is NOT a secret and grants no privileges by itself).
export const firebaseConfig = {
  apiKey: "AIzaSyARNdbxdc-qLfWxfabcv5QbHxrHG5SKz1I",
  authDomain: "swifttrack-web1.firebaseapp.com",
  databaseURL: "https://swifttrack-web1-default-rtdb.firebaseio.com",
  projectId: "swifttrack-web1",
  storageBucket: "swifttrack-web1.firebasestorage.app",
  messagingSenderId: "627289261771",
  appId: "1:627289261771:web:e73863d8fc7d456511fd4e"
};
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
