// src/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAAGEp19p7AjI0-1r4DJzFXcD53-xcIMnY",
  authDomain: "skillverse-fc72a.firebaseapp.com",
  projectId: "skillverse-fc72a",
  storageBucket: "skillverse-fc72a.appspot.com",
  messagingSenderId: "668498179629",
  appId: "1:668498179629:web:fe979b49c500cd3541eaa4",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// sanity logs — check these in the browser console
console.log("Firebase project (should be skillverse-fc72a):", app.options.projectId);
console.log("Firebase API key (should match your console):", app.options.apiKey);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Expose for quick debugging in DevTools
if (typeof window !== "undefined") {
  window.auth = auth;
}

