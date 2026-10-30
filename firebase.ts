import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Public institutional client web config for Firebase Authentication and Cloud Firestore
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

// Configure local persistence across browser tabs and refreshes
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase persistence initialization:', err);
});
