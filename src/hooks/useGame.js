import { useState, useEffect, useCallback } from "react";
import { db, whenSaveReady } from "@/lib/localDb";
import { useAuth } from "@/lib/AuthContext";
import { computeStamina, STAMINA_MAX_DEFAULT } from "@/lib/stamina";
import { normalizeUltimateFields, ULTIMATE_MIN_LEVEL, consolidateDuplicateOwned } from "@/lib/ultimate";

export function useGame() {
  const { user, isLoadingAuth, saveReady } = useAuth();
  const [data, setData] = useState({ loading: true });
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isLoadingAuth || !saveReady) {
        setData((d) => ({ ...d, loading: true }));
        return;
      }
      if (!user?.uid) {
        setData({ loading: false, error: new Error("Non autenticato"), refresh });
        return;
      }
      try {
        await whenSaveReady();
        const me = await db.auth.me();
        const [characters, playerStates, owned] = await Promise.all([
          db.entities.Character.list(),
          db.entities.PlayerState.filter({ created_by_id: me.id }),
          db.entities.OwnedCharacter.filter({ created_by_id: me.id }),
        ]);
        const charMap = {};
        characters.forEach((c) => {
          charMap[c.id] = c;
        });
        let playerState = playerStates[0];
        let ownedList = owned;
        if (!playerState) {
          const starter = characters.find(
            (c) => c.char_name === "Monkey D. Luffy" && c.version === "Alvida Arc"
          );
          if (!starter) throw new Error("Starter character missing from catalog");
          const newOwned = await db.entities.OwnedCharacter.create({
            character_id: starter.id,
            level: 1,
            exp: 0,
            ascension: 0,
            ultimateLevel: ULTIMATE_MIN_LEVEL,
            ultimateTokens: 0,
          });
          const now = Date.now();
          playerState = await db.entities.PlayerState.create({
            berry: 500,
            strawberry: 30,
            story_progress: 1,
            team: [newOwned.id],
            account_level: 1,
            stamina: STAMINA_MAX_DEFAULT,
            stamina_max: STAMINA_MAX_DEFAULT,
            stamina_updated_at: now,
          });
          ownedList = [newOwned];
        } else {
          const patch = {};
          if (playerState.account_level == null) patch.account_level = 1;
          if (playerState.stamina == null) patch.stamina = STAMINA_MAX_DEFAULT;
          if (playerState.stamina_max == null) patch.stamina_max = STAMINA_MAX_DEFAULT;
          if (playerState.stamina_updated_at == null) patch.stamina_updated_at = Date.now();

          const base = { ...playerState, ...patch };
          const regen = computeStamina(base);
          if (
            Object.keys(patch).length ||
            regen.stamina !== playerState.stamina ||
            regen.stamina_updated_at !== playerState.stamina_updated_at
          ) {
            playerState = await db.entities.PlayerState.update(playerState.id, {
              ...patch,
              stamina: regen.stamina,
              stamina_max: regen.stamina_max,
              stamina_updated_at: regen.stamina_updated_at,
            });
          }
        }

        // Migrazione soft campi Ultimate su ogni owned
        ownedList = await Promise.all(
          (ownedList || []).map(async (o) => {
            const n = normalizeUltimateFields(o);
            if (o.ultimateLevel == null || o.ultimateTokens == null) {
              return db.entities.OwnedCharacter.update(o.id, {
                ultimateLevel: n.ultimateLevel,
                ultimateTokens: n.ultimateTokens,
              });
            }
            return n;
          })
        );

        // Unisci doppioni preesistenti → Gettoni Ulti
        const consolidated = await consolidateDuplicateOwned(ownedList, playerState);
        ownedList = consolidated.owned;
        if (consolidated.playerState) playerState = consolidated.playerState;

        if (cancelled) return;
        const heroes = characters.filter((c) => c.role === "hero");
        setData({
          loading: false,
          me,
          characters: heroes,
          allCharacters: characters,
          charMap,
          playerState,
          owned: ownedList.map(normalizeUltimateFields),
          refresh,
        });
      } catch (e) {
        if (!cancelled) setData({ loading: false, error: e, refresh });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick, user?.uid, isLoadingAuth, saveReady, refresh]);

  return data;
}
