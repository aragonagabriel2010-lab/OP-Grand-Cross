import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/localDb";

import { useGame } from "@/hooks/useGame";
import BottomNav from "@/components/game/BottomNav";
import GameTopBar from "@/components/game/GameTopBar";
import GameModal from "@/components/game/GameModal";
import { CharacterArt } from "@/components/game/CharacterCard";
import RarityStars from "@/components/game/RarityStars";
import { TEAL, AMBER, PANEL } from "@/lib/arcade";
import { rollRarity, RARITY_GLOW, ATTRIBUTE_INFO, GACHA_RATES, RARITY_COLORS } from "@/lib/gameUtils";
import { Gem, Sparkles, X } from "lucide-react";
import GachaHeroBanner from "@/components/game/GachaHeroBanner";
import { recordGachaPull } from "@/lib/playerStats";
import { addCharacter } from "@/lib/ultimate";
import { loadPity, savePity, rollRarityWithPity } from "@/lib/gachaPity";
import { AudioManager } from "@/lib/AudioManager";
import { hasUnlock } from "@/lib/rank";

export default function Gacha() {
  const { loading, characters, playerState, refresh, patchPlayerState } = useGame();
  const [pulling, setPulling] = useState(false);
  const [results, setResults] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [flipPhase, setFlipPhase] = useState(false);
  const [pity, setPity] = useState({ sinceSr: 0, sinceSsr: 0 });

  const uid = playerState?.created_by_id || playerState?.id;

  useEffect(() => {
    if (uid) setPity(loadPity(uid));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    import("@/lib/dailies").then(({ bumpDaily }) => bumpDaily(uid, "open_gacha")).catch(() => {});
  }, [uid]);

  const ratesByRarity = useMemo(() => {
    const heroes = characters || [];
    return GACHA_RATES.map((tier) => ({
      ...tier,
      pctLabel: `${Math.round(tier.chance * 100)}%`,
      color: RARITY_COLORS[tier.rarity] || "#fff",
      list: heroes.filter((c) => c.rarity === tier.rarity),
    }));
  }, [characters]);

  if (loading || !playerState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b161b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
      </div>
    );
  }

  const pool = characters || [];
  const tenCost = hasUnlock(playerState.account_level || 1, "gachaTenDiscount") ? 250 : 270;

  async function pull(count) {
    const cost = count === 10 ? tenCost : 30;
    if (playerState.strawberry < cost || pulling) return;
    setPulling(true);
    setFlipPhase(true);
    AudioManager.playUlt();

    const nextStrawberry = playerState.strawberry - cost;
    patchPlayerState?.({ strawberry: nextStrawberry });
    await db.entities.PlayerState.update(playerState.id, {
      strawberry: nextStrawberry,
    });

    let pityState = loadPity(uid);
    const pulled = [];
    for (let i = 0; i < count; i++) {
      const { rarity, pity: nextPity } = rollRarityWithPity(pityState, rollRarity);
      pityState = nextPity;
      let candidates = pool.filter((c) => c.rarity === rarity);
      if (candidates.length === 0) candidates = pool;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      const result = await addCharacter(chosen.id);
      pulled.push({
        ...chosen,
        isDuplicate: result.isDuplicate,
        tokensGained: result.tokensGained,
      });
    }
    if (count === 10 && !pulled.some((c) => ["SR", "SSR"].includes(c.rarity))) {
      const srPool = pool.filter((c) => ["SR", "SSR"].includes(c.rarity));
      if (srPool.length) {
        const replace = srPool[Math.floor(Math.random() * srPool.length)];
        const result = await addCharacter(replace.id);
        pulled[pulled.length - 1] = {
          ...replace,
          isDuplicate: result.isDuplicate,
          tokensGained: result.tokensGained,
        };
        pityState = { ...pityState, sinceSr: 0 };
        if (replace.rarity === "SSR") pityState.sinceSsr = 0;
      }
    }

    savePity(uid, pityState);
    setPity(pityState);
    setResults(pulled);
    recordGachaPull(count);
    try {
      const { bumpDaily } = await import("@/lib/dailies");
      bumpDaily(uid, "gacha_pull", count);
      if (count >= 10) bumpDaily(uid, "gacha_ten");
      bumpDaily(uid, "open_gacha");
    } catch {
      /* ignore */
    }

    await new Promise((r) => setTimeout(r, 900));
    setFlipPhase(false);
    setShowModal(true);
    setPulling(false);
    refresh();
  }

  return (
    <div className="min-h-screen bg-[#0b161b] pb-24 text-white">
      <GameTopBar />
      <div className={`border-b-2 border-black ${TEAL}`}>
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-2">
          <Sparkles className="text-[#f5a623]" size={18} />
          <h1 className="text-sm uppercase tracking-wide">Gacha</h1>
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 pt-6">
        <motion.div
          className="relative overflow-hidden rounded-2xl border-[3px] border-black shadow-[0_4px_0_0_#000]"
          initial={{ y: 18, scale: 0.97 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 24, delay: 0.08 }}
        >
          <GachaHeroBanner onRates={() => setRatesOpen(true)} />

          {/* Estrazioni dentro la card */}
          <div className={`relative grid grid-cols-2 gap-2.5 border-t-2 border-black ${TEAL} p-3`}>
            <motion.button
              type="button"
              onClick={() => pull(1)}
              disabled={pulling || playerState.strawberry < 30}
              whileTap={{ scale: 0.97 }}
              className={`relative overflow-hidden rounded-xl border-2 border-black bg-[#0b161b] px-3 py-3.5 text-left shadow-[0_3px_0_0_#000] disabled:opacity-40`}
            >
              <p className="text-sm font-bold uppercase tracking-wide text-white">Estrai ×1</p>
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[#f5a623]">
                <Gem size={12} /> 30 Fragole
              </p>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => pull(10)}
              disabled={pulling || playerState.strawberry < tenCost}
              whileTap={{ scale: 0.97 }}
              className={`relative overflow-hidden rounded-xl border-2 border-black ${AMBER} px-3 py-3.5 text-left shadow-[0_3px_0_0_#000] disabled:opacity-40`}
            >
              <span className="absolute right-1.5 top-1.5 rounded border border-black bg-black px-1 py-0.5 text-[8px] font-bold uppercase text-[#f5a623]">
                SR+
              </span>
              <p className="text-sm font-bold uppercase tracking-wide text-black">Estrai ×10</p>
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-black">
                <Gem size={12} /> {tenCost} Fragole
              </p>
            </motion.button>
          </div>
        </motion.div>
      </main>

      <BottomNav />

      <AnimatePresence>
        {flipPhase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
          >
            <motion.div
              animate={{ rotateY: [0, 180, 360], scale: [1, 1.15, 1] }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
              className="flex h-40 w-28 items-center justify-center rounded-2xl border-[3px] border-[#f5a623] bg-gradient-to-br from-[#164446] to-[#0b161b] shadow-[0_0_40px_rgba(245,166,35,0.5)]"
              style={{ transformStyle: "preserve-3d" }}
            >
              <Sparkles className="text-[#f5a623]" size={40} />
            </motion.div>
            <p className="mt-5 text-sm uppercase tracking-[0.3em] text-[#f5a623]">Reclutamento...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <GameModal open={ratesOpen} onClose={() => setRatesOpen(false)} title="Tassi">
        <p className="mb-3 text-[10px] uppercase tracking-wide text-white/50">
          Personaggi ottenibili in questo banner, per rarità
        </p>
        <div className="space-y-3">
          {ratesByRarity.map((tier) => (
            <div key={tier.rarity} className="rounded-xl border-2 border-black bg-[#0b161b] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold uppercase" style={{ color: tier.color }}>
                  {tier.rarity}
                </span>
                <span className="text-sm font-black text-[#f5a623]">{tier.pctLabel}</span>
              </div>
              {tier.list.length === 0 ? (
                <p className="text-[10px] uppercase text-white/40">Nessun personaggio</p>
              ) : (
                <ul className="space-y-1">
                  {tier.list.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 border-t border-white/10 py-1.5 text-[11px] uppercase"
                    >
                      <span className="truncate text-white">{c.char_name}</span>
                      <span className="shrink-0 text-white/45">{c.version}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border-2 border-black bg-[#0b161b] px-2 py-1.5 text-center">
            <p className="text-[8px] uppercase text-white/45">Pity SSR</p>
            <p className="text-sm font-bold text-[#f5a623]">{pity.sinceSsr}/90</p>
          </div>
          <div className="rounded-lg border-2 border-black bg-[#0b161b] px-2 py-1.5 text-center">
            <p className="text-[8px] uppercase text-white/45">Pity SR+</p>
            <p className="text-sm font-bold text-[#a855f7]">{pity.sinceSr}/10</p>
          </div>
        </div>
      </GameModal>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`gacha-results relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl ${TEAL} ${PANEL}`}
            >
              <div className="relative shrink-0 border-b-2 border-black px-4 pb-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-[#0b161b]"
                  aria-label="Chiudi"
                >
                  <X size={16} className="text-[#f5a623]" />
                </button>
                <h3 className="pr-8 text-center text-lg uppercase tracking-wide text-[#f5a623]">
                  Hai reclutato!
                </h3>
                {results.length > 1 && (
                  <p className="mt-1 text-center text-[10px] uppercase tracking-wide text-white/55">
                    {results.length} pull · {results.filter((r) => !r.isDuplicate).length} nuovi ·{" "}
                    {results.filter((r) => r.isDuplicate).length} doppioni
                  </p>
                )}
              </div>

              <div className="gacha-results__scroll-wrap relative min-h-0 flex-1">
                <div
                  className={
                    results.length > 1
                      ? "game-scroll gacha-results__grid max-h-[min(58vh,28rem)] overflow-y-auto overscroll-contain px-3 py-4"
                      : "flex justify-center px-3 py-4"
                  }
                >
                  <div
                    className={
                      results.length > 1
                        ? "grid grid-cols-3 gap-x-2 gap-y-4"
                        : "flex justify-center"
                    }
                  >
                    {results.map((c, i) => {
                      const attr = ATTRIBUTE_INFO[c.attribute];
                      const isNew = !c.isDuplicate;
                      return (
                        <motion.div
                          key={`${c.id || c.char_name}_${i}`}
                          initial={{ scale: 0, rotateY: 90, opacity: 0 }}
                          animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                          transition={{ delay: Math.min(i * 0.07, 0.7), type: "spring", stiffness: 260 }}
                          className={`gacha-result-card flex flex-col items-center gap-1 ${
                            results.length > 1 ? "w-full" : "w-28"
                          } ${isNew ? "gacha-result-card--new" : ""}`}
                        >
                          <div className="relative w-full">
                            <div
                              className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border-2 border-black bg-[#0b161b]"
                              style={{
                                boxShadow: `0 3px 0 0 #000, 0 0 12px ${RARITY_GLOW[c.rarity]}`,
                              }}
                            >
                              <CharacterArt character={c} className="h-full w-full" />
                              {isNew && (
                                <span className="gacha-result-card__new-tag">Nuovo</span>
                              )}
                            </div>
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded bg-[#0b161b] px-1">
                              <RarityStars rarity={c.rarity} size={10} />
                            </div>
                            <div
                              className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded border border-black text-[9px]"
                              style={{ background: attr?.color }}
                            >
                              {attr?.icon}
                            </div>
                          </div>
                          <p className="w-full truncate text-center text-[10px] font-bold uppercase text-white">
                            {c.char_name}
                          </p>
                          <p className="w-full truncate text-center text-[8px] uppercase text-[#f5a623]">
                            {c.version}
                          </p>
                          {c.isDuplicate ? (
                            <span className="gacha-result-card__dup">
                              Doppione · +{c.tokensGained || 1} Ulti
                            </span>
                          ) : (
                            <span className="gacha-result-card__fresh">In ciurma</span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t-2 border-black p-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`w-full rounded-2xl py-3 text-base uppercase tracking-wide ${AMBER} ${PANEL}`}
                >
                  Conferma
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
