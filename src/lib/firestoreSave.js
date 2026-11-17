import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { firestore, isFirebaseConfigured } from "@/lib/firebase";

const COLLECTION = "players";

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

export function canUseFirestore() {
  return Boolean(isFirebaseConfigured && firestore);
}

export async function fetchPlayerSave(uid) {
  if (!canUseFirestore() || !uid) return null;
  const snap = await getDoc(doc(firestore, COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  return {
    playerStates: Array.isArray(data.playerStates) ? data.playerStates : [],
    ownedCharacters: Array.isArray(data.ownedCharacters) ? data.ownedCharacters : [],
    battleStats: data.battleStats || null,
  };
}

export async function persistPlayerSave(uid, save) {
  if (!canUseFirestore() || !uid) return;
  const payload = stripUndefined({
    playerStates: save.playerStates || [],
    ownedCharacters: save.ownedCharacters || [],
    battleStats: save.battleStats ?? null,
    schemaVersion: 1,
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(firestore, COLLECTION, uid), payload, { merge: true });
}
