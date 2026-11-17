import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/localDb";
import { useGame } from "@/hooks/useGame";
import BottomNav from "@/components/game/BottomNav";
import GameTopBar from "@/components/game/GameTopBar";
import { TEAL, AMBER, PANEL } from "@/lib/arcade";
import {
  RECIPES,
  INGREDIENT_DEFS,
  USABLE_DEFS,
  normalizeIngredients,
  normalizeUsables,
  normalizeFoodBuff,
  canCook,
  cookRecipe,
  eatUsable,
} from "@/lib/inventory";
import { markDailyLoop } from "@/lib/dailyLoop";
import { CookingPot, Flame, Check, Lock, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { AudioManager } from "@/lib/AudioManager";

export default function Kitchen() {
  const { loading, playerState, refresh } = useGame();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);

  if (loading || !playerState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b161b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
      </div>
    );
  }

  const uid = playerState.created_by_id || playerState.id;
  const ingredients = normalizeIngredients(playerState.ingredients);
  const usables = normalizeUsables(playerState.usables);
  const foodBuff = normalizeFoodBuff(playerState.foodBuff);
  const meals = Object.values(USABLE_DEFS).filter((u) => (usables[u.id] || 0) > 0 && u.battleBuff);

  async function craft(recipe) {
    if (busy) return;
    const result = cookRecipe(recipe, playerState);
    if (!result.ok) {
      setFlash({ ok: false, text: result.reason });
      return;
    }
    setBusy(true);
    await db.entities.PlayerState.update(playerState.id, result.patch);
    markDailyLoop(uid, "kitchen");
    AudioManager.playClick();
    await refresh?.();
    setFlash({ ok: true, text: `Pronto: ${result.resultName}` });
    setBusy(false);
    window.setTimeout(() => setFlash(null), 1800);
  }

  async function eat(usableId) {
    if (busy) return;
    const result = eatUsable(playerState, usableId);
    if (!result.ok) {
      setFlash({ ok: false, text: result.reason });
      return;
    }
    setBusy(true);
    await db.entities.PlayerState.update(playerState.id, result.patch);
    markDailyLoop(uid, "kitchen");
    AudioManager.playHeal();
    await refresh?.();
    setFlash({ ok: true, text: `Buff attivo: ${result.label}` });
    setBusy(false);
    window.setTimeout(() => setFlash(null), 1800);
  }

  return (
    <div className="min-h-screen bg-[#0b161b] pb-24 text-white">
      <GameTopBar showBack backTo="/" />
      <div className={`border-b-2 border-black ${TEAL}`}>
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-2">
          <CookingPot className="text-[#f5a623]" size={18} />
          <h1 className="text-sm uppercase tracking-wide">Cucina</h1>
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 pt-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 rounded-2xl ${TEAL} ${PANEL} p-3.5`}
        >
          <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">Sanji’s kitchen</p>
          <p className="mt-1 text-[11px] uppercase leading-relaxed text-white/65">
            Cucina e mangia prima del Fight: la pietanza dà buff ATK in battaglia.
          </p>
          {foodBuff && (
            <p className="mt-2 rounded-lg border-2 border-black bg-[#0b161b] px-2 py-1.5 text-center text-[10px] font-bold uppercase text-[#f97316]">
              Buff attivo · {foodBuff.label}
              {foodBuff.duration === "turns"
                ? ` · ${foodBuff.turnsLeft} turni`
                : " · prossima battaglia"}
            </p>
          )}
        </motion.div>

        {meals.length > 0 && (
          <>
            <p className="mb-2 text-[10px] uppercase tracking-widest text-[#f97316]">Mangia</p>
            <div className="mb-5 space-y-2">
              {meals.map((m) => (
                <div key={m.id} className={`flex items-center gap-3 rounded-2xl ${TEAL} ${PANEL} p-3`}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]">
                    <Utensils size={18} className="text-[#f97316]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold uppercase text-white">{m.name}</p>
                    <p className="text-[9px] uppercase text-white/50">
                      {m.battleBuff.label} · {m.battleBuff.durationLabel} · ×{usables[m.id]}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy || !!foodBuff}
                    onClick={() => eat(m.id)}
                    className={cn(
                      "rounded-xl border-2 border-black px-3 py-2 text-[10px] font-bold uppercase disabled:opacity-40",
                      AMBER,
                      "text-black"
                    )}
                  >
                    Mangia
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mb-2 text-[10px] uppercase tracking-widest text-[#f5a623]">Ricette</p>
        <div className="space-y-3">
          {RECIPES.map((recipe, i) => {
            const ready = canCook(recipe, ingredients);
            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.06 + i * 0.05, type: "spring", stiffness: 320, damping: 24 }}
                className={`rounded-2xl ${TEAL} ${PANEL} p-3.5`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]">
                    <Flame className="text-[#f97316]" size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-white">{recipe.name}</h2>
                    <p className="mt-0.5 text-[10px] uppercase text-white/50">{recipe.blurb}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(recipe.ingredients).map(([id, need]) => {
                        const def = INGREDIENT_DEFS[id];
                        const have = ingredients[id] || 0;
                        const ok = have >= need;
                        return (
                          <span
                            key={id}
                            className={cn(
                              "rounded-lg border-2 border-black px-2 py-1 text-[9px] font-bold uppercase",
                              ok ? "bg-[#0b161b] text-white" : "bg-[#3b0a0a] text-red-300"
                            )}
                          >
                            {def?.name || id} {have}/{need}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!ready || busy}
                  onClick={() => craft(recipe)}
                  className={cn(
                    "mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-black py-2.5 text-xs font-bold uppercase disabled:opacity-40",
                    ready ? `${AMBER} text-black` : "bg-[#0b161b] text-white/45"
                  )}
                >
                  {ready ? <CookingPot size={14} /> : <Lock size={14} />}
                  {ready ? "Cucina" : "Ingredienti mancanti"}
                </button>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              className={cn(
                "fixed bottom-28 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border-2 border-black px-4 py-2.5 text-xs font-bold uppercase shadow-[0_4px_0_0_#000]",
                flash.ok ? AMBER : "bg-[#3b0a0a] text-white"
              )}
            >
              {flash.ok && <Check size={14} />}
              {flash.text}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}
