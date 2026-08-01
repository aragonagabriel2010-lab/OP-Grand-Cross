import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import { useGame } from "@/hooks/useGame";
import BottomNav from "@/components/game/BottomNav";
import GameTopBar from "@/components/game/GameTopBar";
import SettingsModal from "@/components/game/SettingsModal";
import { CharacterArt } from "@/components/game/CharacterCard";
import RarityStars from "@/components/game/RarityStars";
import { TEAL, AMBER, PANEL, PANEL_SM } from "@/lib/arcade";
import {
  Map,
  Sparkles,
  Users,
  CalendarDays,
  Ship,
  ChevronRight,
  Flame,
} from "lucide-react";

/**
 * Hub principale stile 7DS:GC — “ponte” della Thousand Sunny
 */
export default function Home() {
  const { loading, playerState, owned, charMap } = useGame();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const captain = useMemo(() => {
    if (!playerState || !owned?.length) return null;
    const teamId = (playerState.team || []).find(Boolean) || owned[0]?.id;
    const o = owned.find((x) => x.id === teamId) || owned[0];
    if (!o) return null;
    return { owned: o, character: charMap[o.character_id] };
  }, [playerState, owned, charMap]);

  if (loading || !playerState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b161b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
      </div>
    );
  }

  const nextChapter = playerState.story_progress || 1;

  const hubs = [
    { to: "/story", label: "Storia", sub: "Serpentone", icon: Map, accent: AMBER },
    { to: "/characters", label: "Personaggi", sub: "Equipaggio", icon: Users, accent: TEAL },
    { to: "/gacha", label: "Gacha", sub: "Recluta", icon: Sparkles, accent: TEAL },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b161b] pb-24 text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 60% at 50% -10%, rgba(245,166,35,0.18), transparent 55%),
            radial-gradient(ellipse 80% 50% at 80% 40%, rgba(22,68,70,0.55), transparent 50%),
            linear-gradient(180deg, #0b161b 0%, #0d2a2c 45%, #0b161b 100%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-24 h-40 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(245,166,35,0.07) 18px, rgba(245,166,35,0.07) 19px)",
        }}
      />

      <GameTopBar showSettings onSettings={() => setSettingsOpen(true)} />

      <main className="relative z-10 mx-auto max-w-md px-3 pt-4">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-2xl ${TEAL} ${PANEL} p-4`}
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[#f5a623]/15 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="relative">
              <div className="h-32 w-24 overflow-hidden rounded-lg border-[3px] border-black bg-[#0b161b] shadow-[0_4px_0_0_#000,0_0_20px_rgba(245,166,35,0.35)]">
                {captain?.character ? (
                  <CharacterArt character={captain.character} className="h-full w-full" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl text-[#f5a623]">?</div>
                )}
              </div>
              {captain?.character && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded bg-[#0b161b] px-1">
                  <RarityStars rarity={captain.character.rarity} size={10} />
                </div>
              )}
              {captain?.owned && (
                <div className={`absolute -bottom-1 -right-1 rounded border-2 border-black px-1.5 py-0.5 text-[9px] font-bold ${AMBER}`}>
                  L{captain.owned.level}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">Capitano</p>
              <h2 className="truncate text-xl uppercase leading-tight" style={{ textShadow: "0 2px 0 #000" }}>
                {captain?.character?.char_name || "Recluta ciurma"}
              </h2>
              <p className="truncate text-xs uppercase text-white/70">
                {captain?.character?.version || "Forma la squadra"}
              </p>
              <button
                type="button"
                onClick={() => navigate(captain?.owned ? `/character/${captain.owned.id}` : "/characters")}
                className={`mt-2 inline-flex items-center gap-1 rounded-lg border-2 border-black px-2.5 py-1 text-[10px] uppercase tracking-wide ${AMBER} shadow-[0_2px_0_0_#000]`}
              >
                Dettagli <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </motion.section>

        <motion.button
          type="button"
          onClick={() => navigate("/story")}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={`mt-3 flex w-full items-center gap-3 rounded-2xl ${AMBER} ${PANEL} px-4 py-3 text-left`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]">
            <Ship className="text-[#f5a623]" size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-black/60">Prossima rotta</p>
            <p className="text-sm font-bold uppercase text-black">Capitolo {nextChapter}</p>
          </div>
          <Flame className="text-black" size={20} />
        </motion.button>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {hubs.map((h, i) => {
            const Icon = h.icon;
            return (
              <motion.button
                key={h.to}
                type="button"
                onClick={() => navigate(h.to)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.05 }}
                className={`flex flex-col items-center gap-1.5 rounded-2xl ${h.accent} ${PANEL} px-2 py-3 transition-transform active:translate-y-0.5`}
              >
                <Icon size={22} className={h.accent === AMBER ? "text-black" : "text-[#f5a623]"} />
                <span className={`text-[11px] font-bold uppercase tracking-wide ${h.accent === AMBER ? "text-black" : "text-white"}`}>
                  {h.label}
                </span>
                <span className={`text-[8px] uppercase ${h.accent === AMBER ? "text-black/60" : "text-white/50"}`}>{h.sub}</span>
              </motion.button>
            );
          })}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mt-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays size={14} className="text-[#f5a623]" />
            <h3 className="text-xs uppercase tracking-widest text-[#f5a623]">Missioni giornaliere</h3>
          </div>
          <div className="space-y-2">
            {[
              { title: "Completa 1 capitolo", reward: "+50 Beri", action: () => navigate("/story") },
              { title: "Esegui 1 estrazione", reward: "+5 Fragole", action: () => navigate("/gacha") },
              { title: "Potenzia un personaggio", reward: "+30 Beri", action: () => navigate("/characters") },
            ].map((m) => (
              <button
                key={m.title}
                type="button"
                onClick={m.action}
                className={`flex w-full items-center justify-between rounded-xl ${TEAL} ${PANEL_SM} px-3 py-2.5 text-left transition-transform active:translate-y-0.5`}
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-white">{m.title}</p>
                  <p className="text-[10px] uppercase text-[#f5a623]">{m.reward}</p>
                </div>
                <ChevronRight size={16} className="text-[#f5a623]" />
              </button>
            ))}
          </div>
        </motion.section>

        <p className="mt-5 text-center text-[9px] uppercase tracking-[0.2em] text-white/35">
          Ponte della Thousand Sunny
        </p>
      </main>

      <BottomNav />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
