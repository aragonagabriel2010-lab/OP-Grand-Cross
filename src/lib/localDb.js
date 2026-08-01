/**
 * Game DB — cataloghi statici + salvataggio giocatore.
 * Con Firebase Auth: sync su Firestore `players/{uid}`.
 * Fallback: localStorage (offline / senza login).
 */

import { CHARACTERS, HERO_CHARACTERS } from "@/data/characters";
import { CHAPTERS } from "@/data/chapters";
import { canUseFirestore, fetchPlayerSave, persistPlayerSave } from "@/lib/firestoreSave";
import { loadBattleStats } from "@/lib/playerStats";

const LEGACY_SAVE_KEY = "opgv_save_v1";
const LOCAL_USER = { id: "local-player", email: "local@grandvoyage", role: "user", full_name: "Capitano" };

function cacheKey(uid) {
  return uid ? `opgv_save_${uid}` : LEGACY_SAVE_KEY;
}

function uid(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function emptySave() {
  return { playerStates: [], ownedCharacters: [] };
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw);
    return {
      playerStates: parsed.playerStates || [],
      ownedCharacters: parsed.ownedCharacters || [],
      battleStats: parsed.battleStats || null,
    };
  } catch {
    return emptySave();
  }
}

function writeCache(key, save) {
  localStorage.setItem(key, JSON.stringify(save));
}

function remapOwner(save, ownerId) {
  return {
    playerStates: (save.playerStates || []).map((row) => ({
      ...row,
      created_by_id: ownerId,
    })),
    ownedCharacters: (save.ownedCharacters || []).map((row) => ({
      ...row,
      created_by_id: ownerId,
    })),
    battleStats: save.battleStats || null,
  };
}

function matchesFilter(row, filter = {}) {
  return Object.entries(filter).every(([key, value]) => row[key] === value);
}

function sortBy(rows, orderField) {
  if (!orderField) return rows;
  const desc = orderField.startsWith("-");
  const field = desc ? orderField.slice(1) : orderField;
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : 1;
    return desc ? -cmp : cmp;
  });
}

/** Sessione save corrente (per utente loggato). */
const session = {
  uid: null,
  user: null,
  save: null,
  bindPromise: Promise.resolve(),
  writeTimer: null,
  writeChain: Promise.resolve(),
};

function ownerId() {
  return session.uid || LOCAL_USER.id;
}

function getWorkingSave() {
  if (session.save) return session.save;
  return readCache(cacheKey(session.uid));
}

function scheduleCloudPersist(save) {
  if (!session.uid || !canUseFirestore()) return;
  if (session.writeTimer) clearTimeout(session.writeTimer);
  session.writeTimer = setTimeout(() => {
    session.writeTimer = null;
    const payload = {
      ...save,
      battleStats: loadBattleStats(),
    };
    session.writeChain = session.writeChain
      .then(() => persistPlayerSave(session.uid, payload))
      .catch((err) => {
        console.error("[Firestore] salvataggio fallito", err);
      });
  }, 350);
}

async function commitSave(save) {
  const next = {
    playerStates: save.playerStates || [],
    ownedCharacters: save.ownedCharacters || [],
    battleStats: save.battleStats ?? loadBattleStats(),
  };
  session.save = next;
  writeCache(cacheKey(session.uid), next);
  // cache legacy solo se non loggati (dev locale)
  if (!session.uid) writeCache(LEGACY_SAVE_KEY, next);
  scheduleCloudPersist(next);
  return next;
}

/**
 * Collega il save all'utente Firebase. Da chiamare al login / auth change.
 */
export function bindAuthUser(mappedUser) {
  session.bindPromise = (async () => {
    if (session.writeTimer) {
      clearTimeout(session.writeTimer);
      session.writeTimer = null;
    }
    await session.writeChain.catch(() => {});

    if (!mappedUser?.uid) {
      session.uid = null;
      session.user = null;
      session.save = null;
      return;
    }

    session.uid = mappedUser.uid;
    session.user = mappedUser;

    let cloud = null;
    if (canUseFirestore()) {
      try {
        cloud = await fetchPlayerSave(mappedUser.uid);
      } catch (err) {
        console.error("[Firestore] lettura fallita, uso cache", err);
      }
    }

    const hasCloud =
      cloud &&
      ((cloud.playerStates && cloud.playerStates.length > 0) ||
        (cloud.ownedCharacters && cloud.ownedCharacters.length > 0));

    if (hasCloud) {
      session.save = {
        playerStates: cloud.playerStates,
        ownedCharacters: cloud.ownedCharacters,
        battleStats: cloud.battleStats || null,
      };
    } else {
      // Migra progressi locali verso il cloud al primo accesso
      const legacy = readCache(LEGACY_SAVE_KEY);
      const personal = readCache(cacheKey(mappedUser.uid));
      const source =
        personal.playerStates.length || personal.ownedCharacters.length
          ? personal
          : legacy;
      session.save = remapOwner(source, mappedUser.uid);
      if (canUseFirestore() && (session.save.playerStates.length || session.save.ownedCharacters.length)) {
        try {
          await persistPlayerSave(mappedUser.uid, {
            ...session.save,
            battleStats: session.save.battleStats || loadBattleStats(),
          });
        } catch (err) {
          console.error("[Firestore] migrazione iniziale fallita", err);
        }
      }
    }

    writeCache(cacheKey(mappedUser.uid), session.save);

    // Ripristina stats battaglia da cloud se presenti
    if (session.save.battleStats) {
      try {
        localStorage.setItem("opgv_stats_v1", JSON.stringify(session.save.battleStats));
      } catch {
        /* ignore */
      }
    }
  })();

  return session.bindPromise;
}

export function unbindAuthUser() {
  return bindAuthUser(null);
}

export function whenSaveReady() {
  return session.bindPromise;
}

/** Forza un push su Firestore (es. dopo update stats). */
export async function syncCloudSave() {
  await whenSaveReady();
  if (!session.uid || !canUseFirestore()) return;
  if (session.writeTimer) {
    clearTimeout(session.writeTimer);
    session.writeTimer = null;
  }
  const save = {
    ...getWorkingSave(),
    battleStats: loadBattleStats(),
  };
  session.save = save;
  writeCache(cacheKey(session.uid), save);
  session.writeChain = session.writeChain
    .then(() => persistPlayerSave(session.uid, save))
    .catch((err) => {
      console.error("[Firestore] sync fallito", err);
    });
  await session.writeChain;
}

function catalogEntity(rows) {
  return {
    async list(orderField, limit) {
      let result = sortBy(rows, orderField);
      if (typeof limit === "number") result = result.slice(0, limit);
      return result.map((r) => ({ ...r }));
    },
    async filter(query = {}, orderField, limit) {
      let result = rows.filter((r) => matchesFilter(r, query));
      result = sortBy(result, orderField);
      if (typeof limit === "number") result = result.slice(0, limit);
      return result.map((r) => ({ ...r }));
    },
    async get(id) {
      const row = rows.find((r) => r.id === id);
      return row ? { ...row } : null;
    },
    async create() {
      throw new Error("Catalog entities are read-only");
    },
    async update() {
      throw new Error("Catalog entities are read-only");
    },
    async delete() {
      throw new Error("Catalog entities are read-only");
    },
  };
}

function mutableEntity(collectionKey) {
  return {
    async list(orderField, limit) {
      await whenSaveReady();
      const save = getWorkingSave();
      let result = sortBy(save[collectionKey], orderField);
      if (typeof limit === "number") result = result.slice(0, limit);
      return result.map((r) => ({ ...r }));
    },
    async filter(query = {}, orderField, limit) {
      await whenSaveReady();
      const save = getWorkingSave();
      const { created_by_id: _ignored, ...rest } = query;
      let result = save[collectionKey].filter((r) => matchesFilter(r, rest));
      // Se filtrano per owner, limita all'utente corrente
      if (query.created_by_id) {
        result = result.filter(
          (r) => !r.created_by_id || r.created_by_id === query.created_by_id
        );
      }
      result = sortBy(result, orderField);
      if (typeof limit === "number") result = result.slice(0, limit);
      return result.map((r) => ({ ...r }));
    },
    async get(id) {
      await whenSaveReady();
      const save = getWorkingSave();
      const row = save[collectionKey].find((r) => r.id === id);
      return row ? { ...row } : null;
    },
    async create(data) {
      await whenSaveReady();
      const save = getWorkingSave();
      const row = {
        ...data,
        id: data.id || uid(collectionKey === "ownedCharacters" ? "owned" : "ps"),
        created_by_id: ownerId(),
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };
      const next = {
        ...save,
        [collectionKey]: [...save[collectionKey], row],
      };
      await commitSave(next);
      return { ...row };
    },
    async update(id, data) {
      await whenSaveReady();
      const save = getWorkingSave();
      const idx = save[collectionKey].findIndex((r) => r.id === id);
      if (idx === -1) throw new Error(`Record ${id} not found`);
      const updated = {
        ...save[collectionKey][idx],
        ...data,
        id,
        created_by_id: save[collectionKey][idx].created_by_id || ownerId(),
        updated_date: new Date().toISOString(),
      };
      const list = [...save[collectionKey]];
      list[idx] = updated;
      await commitSave({ ...save, [collectionKey]: list });
      return { ...updated };
    },
    async delete(id) {
      await whenSaveReady();
      const save = getWorkingSave();
      await commitSave({
        ...save,
        [collectionKey]: save[collectionKey].filter((r) => r.id !== id),
      });
      return true;
    },
  };
}

export const auth = {
  async isAuthenticated() {
    return Boolean(session.uid);
  },
  async me() {
    await whenSaveReady();
    if (session.user) {
      return {
        id: session.user.uid,
        uid: session.user.uid,
        email: session.user.email,
        full_name: session.user.full_name,
        role: "user",
      };
    }
    return { ...LOCAL_USER };
  },
  async logout() {
    await unbindAuthUser();
  },
  async redirectToLogin() {},
  setToken() {},
  async loginViaEmailPassword() {
    return { access_token: "local" };
  },
  async register() {
    return { ok: true };
  },
  async verifyOtp() {
    return { access_token: "local" };
  },
  async resendOtp() {},
  async loginWithProvider() {},
  async resetPasswordRequest() {},
  async resetPassword() {},
};

export const entities = {
  Character: catalogEntity(CHARACTERS),
  HeroCharacter: catalogEntity(HERO_CHARACTERS),
  StoryChapter: catalogEntity(CHAPTERS),
  PlayerState: mutableEntity("playerStates"),
  OwnedCharacter: mutableEntity("ownedCharacters"),
};

export function resetLocalSave() {
  localStorage.removeItem(LEGACY_SAVE_KEY);
  if (session.uid) localStorage.removeItem(cacheKey(session.uid));
  session.save = emptySave();
}

export const db = {
  auth,
  entities,
  integrations: {
    Core: {
      UploadFile: async () => ({ file_url: "" }),
    },
  },
};

export default db;
