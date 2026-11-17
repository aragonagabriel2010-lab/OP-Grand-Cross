import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import BottomNav from "@/components/game/BottomNav";
import GameTopBar from "@/components/game/GameTopBar";
import { TEAL, AMBER, PANEL } from "@/lib/arcade";
import { Map, Castle, ChevronRight, Coins, Hexagon, Shirt, Sparkles, Dumbbell } from "lucide-react";

const MODES = [
  {
    id: "story",
    to: "/fight/story",
    title: "Storia",
    subtitle: "East Blue · Grand Line · missioni secondarie",
    blurb: "Scegli il viaggio, completa i capitoli e sblocca le isole successive.",
    Icon: Map,
    accent: "#f5a623",
  },
  {
    id: "fortress",
    to: "/fight/fortress",
    title: "Fortezza",
    subtitle: "Farm materiali · monete · gear",
    blurb: "4 percorsi da 10 livelli · reset settimanale · loot scalabile.",
    Icon: Castle,
    accent: "#38bdf8",
  },
  {
    id: "practice",
    to: "/battle/1?mode=practice",
    title: "Practice",
    subtitle: "Allenamento · 0 energia",
    blurb: "Prova combo, carte e il sub senza ricompense.",
    Icon: Dumbbell,
    accent: "#a78bfa",
  },
];

/** Catalogo modalità combattimento (Fight hub). */
export default function Fight() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0b161b] pb-24 text-white">
      <GameTopBar showBack backTo="/" />
      <div className={`border-b-2 border-black ${TEAL}`}>
        <div className="mx-auto max-w-md px-4 py-2 text-center">
          <h1 className="text-sm uppercase tracking-wide">Fight</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">Scegli la modalità</p>
        </div>
      </div>

      <main className="mx-auto max-w-md space-y-3 px-4 pt-5">
        {MODES.map((mode, i) => {
          const Icon = mode.Icon;
          const fromLeft = i % 2 === 0;
          return (
            <motion.button
              key={mode.id}
              type="button"
              onClick={() => navigate(mode.to)}
              initial={{ opacity: 0, x: fromLeft ? -22 : 22, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.05 + i * 0.07, type: "spring", stiffness: 340, damping: 24 }}
              whileTap={{ scale: 0.98 }}
              className={`flex w-full items-center gap-3 rounded-2xl ${TEAL} ${PANEL} p-3.5 text-left`}
              style={{ boxShadow: `0 4px 0 0 #000, 0 0 16px ${mode.accent}33` }}
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]"
                style={{ boxShadow: `inset 0 0 14px ${mode.accent}44` }}
              >
                <Icon size={24} style={{ color: mode.accent }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-[0.18em]" style={{ color: mode.accent }}>
                  {mode.subtitle}
                </p>
                <h2 className="text-lg uppercase tracking-wide text-white">{mode.title}</h2>
                <p className="mt-0.5 text-[10px] uppercase leading-snug text-white/55">{mode.blurb}</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-[#f5a623]" />
            </motion.button>
          );
        })}

        <div className={`mt-4 rounded-2xl ${TEAL} ${PANEL} p-3.5`}>
          <p className="mb-2 text-[10px] uppercase tracking-widest text-[#f5a623]">In Fortezza troverai</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { Icon: Coins, label: "Monete / Beri" },
              { Icon: Hexagon, label: "Materiali risveglio" },
              { Icon: Shirt, label: "Materiali equip" },
              { Icon: Sparkles, label: "Loot prossimamente" },
            ].map(({ Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl border-2 border-black bg-[#0b161b] px-2.5 py-2"
              >
                <Icon size={14} className="shrink-0 text-[#f5a623]" />
                <span className="text-[9px] font-bold uppercase text-white/75">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className={`rounded-xl border-2 border-black ${AMBER} px-3 py-2 text-center text-[10px] font-bold uppercase text-black`}>
          Storia = viaggi · Fortezza = farm
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
