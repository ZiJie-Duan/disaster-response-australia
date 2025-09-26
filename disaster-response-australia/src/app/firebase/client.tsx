
"use client";

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDi5J8XY-YiWFXJ7PLtpoHVn7qER5YnA9I",
  authDomain: "opgw-f738f.firebaseapp.com",
  projectId: "opgw-f738f",
  storageBucket: "opgw-f738f.firebasestorage.app",
  messagingSenderId: "758384409722",
  appId: "1:758384409722:web:13346baff1d1fda8bbcfc3",
  measurementId: "G-XBQT1DLPED",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

let analytics: unknown = null;
if (typeof window !== "undefined") {
  (async () => {
    try {
      const { getAnalytics } = await import("firebase/analytics");
      analytics = getAnalytics(app);
    } catch {}
  })();
}

export { analytics };