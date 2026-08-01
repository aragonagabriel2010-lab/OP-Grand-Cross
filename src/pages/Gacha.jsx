import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/localDb";

import { useGame } from "@/hooks/useGame";
import BottomNav from "@/components/game/BottomNav";
import GameTopBar from "@/components/game/GameTopBar";
import { CharacterArt } from "@/components/game/CharacterCard";
import RarityStars from "@/components/game/RarityStars";
import { TEAL, AMBER, PANEL } from "@/lib/arcade";
import { rollRarity, RARITY_GLOW, ATTRIBUTE_INFO } from "@/lib/gameUtils";
import { Gem, Sparkles, X } from "lucide-react";
import { recordGachaPull } from "@/lib/playerStats";
import { addCharacter } from "@/lib/ultimate";

export default function Gacha() {
  const { loading, characters, playerState, refresh } = useGame();
  const [pulling, setPulling] = useState(false);
  const [results, setResults] = useState([]);
  const [showModal, setShowModal] = useState(false);

  if (loading || !playerState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b161b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
      </div>
    );
  }

  const pool = characters || [];

  async function pull(count) {
    const cost = count === 10 ? 270 : 30;
    if (playerState.strawberry < cost || pulling) return;
    setPulling(true);
    await db.entities.PlayerState.update(playerState.id, {
      strawberry: playerState.strawberry - cost,
    });

    const pulled = [];
    for (let i = 0; i < count; i++) {
      const rarity = rollRarity();
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
      }
    }

    setResults(pulled);
    setShowModal(true);
    recordGachaPull(count);
    setPulling(false);
    refresh();
  }

  const odds = [
    { stars: "★★★★", rarity: "SSR", pct: "3%", color: "#f5a623" },
    { stars: "★★★", rarity: "SR", pct: "12%", color: "#a855f7" },
    { stars: "★★", rarity: "R", pct: "30%", color: "#3b82f6" },
    { stars: "★", rarity: "C", pct: "55%", color: "#9ca3af" },
  ];

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
          className={`relative overflow-hidden rounded-2xl ${TEAL} ${PANEL} p-5`}
          initial={{ y: 18, scale: 0.97 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 24, delay: 0.08 }}
        >
          <motion.div
            className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#f5a623]/15 blur-2xl"
            animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.08, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-widest text-[#f5a623]">Recluta ciurma</p>
            <h2 className="mt-1 text-2xl uppercase leading-tight text-white">Reclutamento<br />Cappello di Paglia</h2>
            <p className="mt-2 text-xs uppercase tracking-wide text-white/80">Ottieni versioni dei personaggi di One Piece, dalle comuni alle mitiche SSR!</p>
            <div className="mt-4 space-y-2">
              {odds.map((o, i) => (
                <motion.div
                  key={o.rarity}
                  initial={{ x: -14 }}
                  animate={{ x: 0 }}
                  transition={{ delay: 0.16 + i * 0.05 }}
                  className="flex items-center justify-between rounded-lg border-2 border-black bg-[#0b161b] px-3 py-1.5"
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    <span style={{ color: o.color }}>{o.stars}</span>
                    <span className="uppercase tracking-wide text-white">{o.rarity}</span>
                  </span>
                  <span className="text-xs font-bold text-[#f5a623]">{o.pct}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <motion.button
            type="button"
            onClick={() => pull(1)}
            disabled={pulling || playerState.strawberry < 30}
            initial={{ y: 16 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.28, type: "spring", stiffness: 340, damping: 24 }}
            whileTap={{ scale: 0.97 }}
            className={`relative overflow-hidden rounded-2xl ${TEAL} ${PANEL} p-4 text-left transition-all hover:-translate-y-0.5 disabled:opacity-40`}
          >
            <p className="text-sm uppercase tracking-wide text-white">Estrai ×1</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[#f5a623]"><Gem size={12} /> 30 Fragole</p>
          </motion.button>
          <motion.button
            type="button"
            onClick={() => pull(10)}
            disabled={pulling || playerState.strawberry < 270}
            initial={{ y: 16 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.34, type: "spring", stiffness: 340, damping: 24 }}
            whileTap={{ scale: 0.97 }}
            className={`relative overflow-hidden rounded-2xl ${AMBER} ${PANEL} p-4 text-left transition-all hover:-translate-y-0.5 disabled:opacity-40`}
          >
            <p className="text-sm uppercase tracking-wide text-black">Estrai ×10</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-black"><Gem size={12} /> 270 Fragole</p>
            <span className="absolute right-2 top-2 rounded border-2 border-black bg-black px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#f5a623]">SR+ garantito</span>
          </motion.button>
        </div>

        {pulling && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="h-12 w-12 rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
            <p className="text-sm uppercase tracking-widest text-[#f5a623]">Reclutamento in corso...</p>
          </div>
        )}
      </main>

      <BottomNav />

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className={`relative w-full max-w-md rounded-2xl ${TEAL} ${PANEL} p-5`}>
              <button onClick={() => setShowModal(false)}
                className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg ${TEAL} border-2 border-black`}>
                <X size={16} className="text-[#f5a623]" />
              </button>
              <h3 className="mb-4 text-center text-lg uppercase tracking-wide text-[#f5a623]">Hai reclutato!</h3>
              <div className={results.length > 1 ? "grid max-h-[60vh] grid-cols-3 gap-x-2 gap-y-4 overflow-y-auto px-1" : "flex justify-center"}>
                {results.map((c, i) => {
                  const attr = ATTRIBUTE_INFO[c.attribute];
                  return (
                    <motion.div key={i}
                      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.08, type: "spring" }}
                      className={`flex flex-col items-center gap-1 ${results.length > 1 ? "w-full" : "w-28"}`}>
                      <div className="relative w-full">
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border-2 border-black bg-[#0b161b] shadow-[0_3px_0_0_#000]"
                          style={{ boxShadow: `0 3px 0 0 #000, 0 0 10px ${RARITY_GLOW[c.rarity]}` }}>
                          <CharacterArt character={c} className="h-full w-full" />
                        </div>
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded bg-[#0b161b] px-1">
                          <RarityStars rarity={c.rarity} size={10} />
                        </div>
                        <div className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded border border-black text-[9px]" style={{ background: attr?.color }}>
                          {attr?.icon}
                        </div>
                      </div>
                      <p className="w-full truncate text-center text-[10px] font-bold uppercase text-white">{c.char_name}</p>
                      <p className="w-full truncate text-center text-[8px] uppercase text-[#f5a623]">{c.version}</p>
                      {c.isDuplicate && (
                        <span className="rounded border border-black bg-[#f5a623] px-1 py-0.5 text-[7px] font-bold uppercase text-black">
                          Doppione · +{c.tokensGained || 1} Gettone Ulti
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              <button onClick={() => setShowModal(false)}
                className={`mt-5 w-full rounded-2xl py-3 text-base uppercase tracking-wide ${AMBER} ${PANEL}`}>
                Conferma
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}