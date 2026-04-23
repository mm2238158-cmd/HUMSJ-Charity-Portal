import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAq6qiegpT5TIQ6bHPOfi08gvrxcuP0Zt4",
  authDomain: "humsj-charity-portal.firebaseapp.com",
  projectId: "humsj-charity-portal",
  storageBucket: "humsj-charity-portal.firebasestorage.app",
  messagingSenderId: "470045440501",
  appId: "1:470045440501:web:cbe030c944f34beb1048bc",
  measurementId: "G-VSED277MTQ",
};

const app: FirebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Lazy analytics — only in browser, only if supported
export async function initAnalytics() {
  if (typeof window === "undefined") return null;
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (await isSupported()) return getAnalytics(app);
  } catch {
    // ignore
  }
  return null;
}

export default app;
