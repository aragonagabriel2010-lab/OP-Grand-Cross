import { getFirestore } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

/**
 * Config client Firebase (SICURA da esporre).
 * NON usare mai il file Admin SDK (private_key) nel frontend.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "onepiece-grand-cross.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "onepiece-grand-cross",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "onepiece-grand-cross.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app = null;
let auth = null;
let firestore = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestore = getFirestore(app);
}

export { app, auth, firestore };

export function mapFirebaseUser(user) {
  if (!user) return null;
  return {
    id: user.uid,
    uid: user.uid,
    email: user.email || null,
    full_name: user.displayName || user.email?.split("@")[0] || "Capitano",
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    isAnonymous: false,
    createdAt: user.metadata?.creationTime || null,
    lastLoginAt: user.metadata?.lastSignInTime || null,
    role: "user",
    provider: user.providerData?.[0]?.providerId || "password",
  };
}

export function subscribeAuth(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function loginEmailPassword(email, password) {
  if (!auth) throw new Error("Firebase non configurato. Aggiungi VITE_FIREBASE_* in .env.local");
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return mapFirebaseUser(cred.user);
}

export async function registerEmailPassword(email, password, displayName) {
  if (!auth) throw new Error("Firebase non configurato. Aggiungi VITE_FIREBASE_* in .env.local");
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  return mapFirebaseUser(cred.user);
}

export async function loginGoogle() {
  if (!auth) throw new Error("Firebase non configurato");
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return mapFirebaseUser(cred.user);
}

export async function logoutFirebase() {
  if (!auth) return;
  await signOut(auth);
}

export async function updateDisplayName(name) {
  if (!auth?.currentUser) throw new Error("Nessun utente connesso");
  await updateProfile(auth.currentUser, { displayName: name });
  return mapFirebaseUser(auth.currentUser);
}
