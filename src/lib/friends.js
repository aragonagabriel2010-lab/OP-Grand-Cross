/**
 * Amici — codice amico, lista locale, difesa per sfide.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { firestore, isFirebaseConfigured } from "@/lib/firebase";
import { canUseFirestore } from "@/lib/firestoreSave";
import { loadPvpState, RANKED_START_RATING } from "@/lib/pvp";

function friendsKey(uid) {
  return `opgv_friends_${uid || "guest"}`;
}

function codeFromUid(uid) {
  const raw = String(uid || "guest");
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  let n = hash >>> 0;
  for (let i = 0; i < 6; i++) {
    out += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length) >>> 0;
    // mescola di nuovo se si esaurisce, sempre unsigned
    if (n === 0) n = (hash ^ ((i + 1) * 2654435761)) >>> 0;
  }
  return out;
}

export function getMyFriendCode(uid) {
  return codeFromUid(uid);
}

export function loadFriends(uid) {
  try {
    const raw = localStorage.getItem(friendsKey(uid));
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveFriends(uid, list) {
  try {
    localStorage.setItem(friendsKey(uid), JSON.stringify(list || []));
  } catch {
    /* ignore */
  }
}

export function addLocalFriend(uid, friend) {
  const list = loadFriends(uid);
  if (list.some((f) => f.uid === friend.uid || f.code === friend.code)) {
    return { ok: false, reason: "already", list };
  }
  const next = [
    {
      uid: friend.uid,
      code: friend.code,
      name: friend.name || "Pirata",
      addedAt: Date.now(),
    },
    ...list,
  ].slice(0, 40);
  saveFriends(uid, next);
  return { ok: true, list: next };
}

export function removeLocalFriend(uid, friendUid) {
  const next = loadFriends(uid).filter((f) => f.uid !== friendUid);
  saveFriends(uid, next);
  return next;
}

/** Snapshot squadra difesa (max 3) dal team attivo. */
export function buildDefenseRoster(playerState, owned, charMap) {
  const teamIds = (playerState?.team || []).slice(0, 3);
  const roster = [];
  for (const oid of teamIds) {
    const o = (owned || []).find((x) => x.id === oid);
    if (!o) continue;
    const c = charMap?.[o.character_id];
    if (!c) continue;
    roster.push({
      characterId: c.id,
      level: o.level || 1,
      ascension: o.ascension || 0,
      ultimateLevel: o.ultimateLevel || 1,
      name: c.char_name,
      rarity: c.rarity,
      attribute: c.attribute,
    });
  }
  return roster;
}

export function buildPublicProfile({ uid, displayName, playerState, owned, charMap }) {
  const pvp = loadPvpState(uid);
  return {
    uid,
    displayName: displayName || "Capitano",
    friendCode: getMyFriendCode(uid),
    rating: pvp.rating || RANKED_START_RATING,
    wins: pvp.wins || 0,
    losses: pvp.losses || 0,
    defense: buildDefenseRoster(playerState, owned, charMap),
    updatedAt: Date.now(),
  };
}

export async function publishPublicProfile(profile) {
  if (!canUseFirestore() || !profile?.uid) return { ok: false, reason: "offline" };
  try {
    await setDoc(
      doc(firestore, "publicProfiles", profile.uid),
      {
        ...profile,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await setDoc(
      doc(firestore, "friendCodes", profile.friendCode),
      { uid: profile.uid, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return { ok: true };
  } catch (err) {
    console.error("[friends] publish failed", err);
    return { ok: false, reason: "error", error: err };
  }
}

export async function lookupFriendByCode(code) {
  const normalized = String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!normalized) return { ok: false, reason: "empty" };
  if (normalized.length < 4) return { ok: false, reason: "invalid" };

  if (!canUseFirestore() || !isFirebaseConfigured) {
    return { ok: false, reason: "offline" };
  }

  try {
    const codeSnap = await getDoc(doc(firestore, "friendCodes", normalized));
    if (codeSnap.exists()) {
      const { uid } = codeSnap.data() || {};
      if (uid) {
        const prof = await getDoc(doc(firestore, "publicProfiles", uid));
        if (prof.exists()) {
          return { ok: true, profile: { uid, ...prof.data(), friendCode: normalized } };
        }
        return {
          ok: true,
          profile: { uid, friendCode: normalized, displayName: "Pirata", defense: [] },
        };
      }
    }
    const q = query(
      collection(firestore, "publicProfiles"),
      where("friendCode", "==", normalized),
      limit(1)
    );
    const snaps = await getDocs(q);
    if (!snaps.empty) {
      const d = snaps.docs[0];
      return { ok: true, profile: { uid: d.id, ...d.data() } };
    }
    return { ok: false, reason: "not_found" };
  } catch (err) {
    console.error("[friends] lookup failed", err);
    return { ok: false, reason: "network" };
  }
}

export async function fetchLeaderboardProfiles(max = 12) {
  if (!canUseFirestore()) return [];
  try {
    const snaps = await getDocs(query(collection(firestore, "publicProfiles"), limit(max)));
    return snaps.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } catch (err) {
    console.error("[friends] leaderboard fetch failed", err);
    return [];
  }
}

export async function fetchPublicProfile(uid) {
  if (!canUseFirestore() || !uid) return null;
  try {
    const snap = await getDoc(doc(firestore, "publicProfiles", uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() };
  } catch {
    return null;
  }
}
