import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { db } from "@/lib/localDb";

import { useGame } from "@/hooks/useGame";
import BottomNav from "@/components/game/BottomNav";
import GameTopBar from "@/components/game/GameTopBar";
import { TEAL, AMBER, PANEL_SM } from "@/lib/arcade";
import {
  STORY_ARCS,
  isArcUnlocked,
  isArcCompleted,
  arcProgressLabel,
  arcBounds,
} from "@/data/arcs";
import { Lock, Check, Waves, Ship, ChevronRight, Anchor } from "lucide-react";
import { cn } from "@/lib/utils";

/** Serpentone dei mari — scegli un arco, poi le missioni */
export default function Story() {
  const { loading, playerState } = useGame();
  const [chapters, setChapters] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const list = await db.entities.StoryChapter.list("chapter_number", 80);
      setChapters(list);
    })();
  }, []);

  const progress = playerState?.story_progress || 1;

  const seas = useMemo(() => {
    const map = new Map();
    for (const arc of STORY_ARCS) {
      if (!map.has(arc.sea)) map.set(arc.sea, []);
      map.get(arc.sea).push(arc);
    }
    return [...map.entries()];
  }, []);

  if (loading || !playerState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b161b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b161b] pb-24 text-white">
      <GameTopBar showBack backTo="/" />
      <div className={`border-b-2 border-black ${TEAL}`}>
        <div className="mx-auto max-w-md px-4 py-2 text-center">
          <h1 className="text-sm uppercase tracking-wide">Storia</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">Serpentone dei mari</p>
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 pt-5">
        <div className="mb-4 flex items-center gap-2">
          <Waves size={16} className="text-[#f5a623]" />
          <span className="text-xs uppercase tracking-widest text-[#f5a623]">Rotta Grand Voyage</span>
        </div>

        <div className="space-y-8">
          {seas.map(([seaName, arcs]) => (
            <section key={seaName}>
              <div className="mb-3 flex items-center gap-2">
                <Anchor size={14} className="text-[#f5a623]" />
                <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#f5a623]">{seaName}</h2>
                <div className="h-px flex-1 bg-[#f5a623]/25" />
              </div>

              <div className="relative">
                <div className="absolute left-1/2 top-3 bottom-3 w-1 -translate-x-1/2 rounded-full bg-[#f5a623]/25" />
                <div className="space-y-4">
                  {arcs.map((arc, idx) => {
                    const unlocked = isArcUnlocked(chapters, arc.id, progress);
                    const completed = isArcCompleted(chapters, arc.id, progress);
                    const label = arcProgressLabel(chapters, arc.id, progress);
                    const { first } = arcBounds(chapters, arc.id);
                    const current =
                      unlocked && !completed && first != null && progress >= first;
                    const side = idx % 2 === 0 ? "left" : "right";

                    return (
                      <motion.button
                        key={arc.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => unlocked && navigate(`/story/${arc.id}`)}
                        initial={{ opacity: 0, x: side === "left" ? -18 : 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "relative flex w-[78%] items-center gap-2.5 rounded-2xl border-2 border-black p-3 text-left shadow-[0_4px_0_0_#000] transition-all",
                          side === "left" ? "mr-auto" : "ml-auto flex-row-reverse text-right",
                          unlocked
                            ? `${TEAL} hover:-translate-y-0.5`
                            : "bg-[#0d2a2c] text-white/45 opacity-70",
                          current && "ring-2 ring-[#f5a623]"
                        )}
                        style={
                          unlocked
                            ? { boxShadow: `0 4px 0 0 #000, 0 0 14px ${arc.accent}44` }
                            : undefined
                        }
                      >
                        <div
                          className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]"
                          style={{ boxShadow: unlocked ? `inset 0 0 12px ${arc.accent}55` : undefined }}
                        >
                          {completed ? (
                            <Check className="text-[#f5a623]" size={22} />
                          ) : unlocked ? (
                            <Ship className="text-[#f5a623]" size={20} />
                          ) : (
                            <Lock className="text-white/35" size={18} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] uppercase tracking-widest text-[#f5a623]">
                            {arc.subtitle}
                          </p>
                          <h3 className="truncate text-sm uppercase tracking-wide text-white">{arc.name}</h3>
                          <p className="mt-0.5 truncate text-[10px] uppercase text-white/50">{arc.blurb}</p>
                          {unlocked && (
                            <p className="mt-1 text-[9px] uppercase tracking-wide text-white/60">
                              Missioni {label}
                              {completed ? " · Completato" : current ? " · In corso" : ""}
                            </p>
                          )}
                        </div>
                        {unlocked && (
                          <ChevronRight
                            size={16}
                            className={cn("shrink-0 text-[#f5a623]", side === "right" && "rotate-180")}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className={`mt-6 flex items-start gap-2 rounded-xl ${TEAL} ${PANEL_SM} p-3`}>
          <Ship size={16} className="mt-0.5 shrink-0 text-[#f5a623]" />
          <p className="text-[11px] uppercase leading-relaxed tracking-wide text-white/70">
            Tocca un'isola del serpentone per aprire le missioni. Completa i boss per sbloccare il mare successivo.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
