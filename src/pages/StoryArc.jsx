import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { db } from "@/lib/localDb";

import { useGame } from "@/hooks/useGame";
import BottomNav from "@/components/game/BottomNav";
import GameTopBar from "@/components/game/GameTopBar";
import { TEAL, AMBER, PANEL_SM } from "@/lib/arcade";
import {
  STORY_ARC_MAP,
  chaptersForArc,
  isArcUnlocked,
} from "@/data/arcs";
import {
  battleStaminaCost,
  computeStamina,
  canAffordBattle,
} from "@/lib/stamina";
import { toast } from "@/components/ui/use-toast";
import { Coins, Gem, Lock, MapPin, Skull, Check, Ship, Zap, Waves } from "lucide-react";

/** Missioni di un arco (isola) del serpentone */
export default function StoryArc() {
  const { arcId } = useParams();
  const arc = STORY_ARC_MAP[arcId];
  const { loading, playerState, refresh } = useGame();
  const [chapters, setChapters] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const list = await db.entities.StoryChapter.list("chapter_number", 80);
      setChapters(list);
    })();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const live = useMemo(
    () => (playerState ? computeStamina(playerState, now) : null),
    [playerState, now]
  );

  useEffect(() => {
    if (!playerState || !live) return;
    if (live.stamina <= (playerState.stamina ?? 0)) return;
    db.entities.PlayerState.update(playerState.id, {
      stamina: live.stamina,
      stamina_max: live.stamina_max,
      stamina_updated_at: live.stamina_updated_at,
    }).then(() => refresh?.());
  }, [live?.stamina, playerState, refresh]);

  if (!arc) return <Navigate to="/story" replace />;

  if (loading || !playerState || !live) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b161b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
      </div>
    );
  }

  const progress = playerState.story_progress;
  const missions = chaptersForArc(chapters, arc.id);
  const unlockedArc = isArcUnlocked(chapters, arc.id, progress);

  if (!unlockedArc) {
    return <Navigate to="/story" replace />;
  }

  function enterBattle(ch) {
    const cost = battleStaminaCost(ch);
    if (!canAffordBattle(playerState, cost, now)) {
      toast({
        title: "Energia insufficiente",
        description: `Servono ${cost} energia. Ora ne hai ${live.stamina}/${live.stamina_max}.`,
        variant: "warning",
      });
      return;
    }
    navigate(`/battle/${ch.chapter_number}`);
  }

  return (
    <div className="min-h-screen bg-[#0b161b] pb-24 text-white">
      <GameTopBar showBack backTo="/story" />
      <div className={`border-b-2 border-black ${TEAL}`}>
        <div className="mx-auto max-w-md px-4 py-2 text-center">
          <p className="text-[9px] uppercase tracking-widest text-[#f5a623]">{arc.sea}</p>
          <h1 className="text-sm uppercase tracking-wide">{arc.name}</h1>
          <p className="text-[10px] uppercase tracking-wide text-white/55">{arc.subtitle}</p>
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 pt-5">
        <div className="mb-4 flex items-center gap-2">
          <Waves size={16} className="text-[#f5a623]" />
          <span className="text-xs uppercase tracking-widest text-[#f5a623]">Missioni</span>
        </div>

        <div
          className={`mb-4 rounded-xl border-2 border-black ${TEAL} p-3 shadow-[0_3px_0_0_#000]`}
          style={{ boxShadow: `0 3px 0 0 #000, 0 0 16px ${arc.accent}33` }}
        >
          <div className="flex items-start gap-2">
            <Ship size={16} className="mt-0.5 shrink-0 text-[#f5a623]" />
            <p className="text-[11px] uppercase leading-relaxed tracking-wide text-white/75">{arc.blurb}</p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-[27px] top-2 bottom-2 w-1 -translate-x-1/2 rounded-full bg-[#f5a623]/30" />
          <div className="space-y-3">
            {missions.map((ch, idx) => {
              const unlocked = ch.chapter_number <= progress;
              const completed = ch.chapter_number < progress;
              const cost = battleStaminaCost(ch);
              const affordable = canAffordBattle(playerState, cost, now);
              return (
                <motion.button
                  key={ch.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && enterBattle(ch)}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`group relative flex w-full items-center gap-3 rounded-2xl border-2 border-black p-3 text-left shadow-[0_4px_0_0_#000] transition-all ${
                    unlocked ? `${TEAL} hover:-translate-y-0.5` : "bg-[#0d2a2c] text-white/50 opacity-70"
                  } ${unlocked && !affordable ? "opacity-80" : ""}`}
                >
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]">
                    {completed ? (
                      <Check className="text-[#f5a623]" size={22} />
                    ) : ch.is_boss ? (
                      <Skull className="text-red-400" size={22} />
                    ) : unlocked ? (
                      <MapPin className="text-[#f5a623]" size={20} />
                    ) : (
                      <Lock className="text-white/40" size={18} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-[#f5a623]">
                        Cap. {ch.chapter_number}
                      </span>
                      {ch.is_boss && (
                        <span className="rounded border-2 border-black bg-red-500/80 px-1.5 py-0.5 text-[9px] uppercase text-white">
                          Boss
                        </span>
                      )}
                      {completed && (
                        <span className={`rounded border-2 border-black px-1.5 py-0.5 text-[9px] uppercase ${AMBER}`}>
                          Completato
                        </span>
                      )}
                    </div>
                    <h3 className="truncate text-sm uppercase tracking-wide text-white">{ch.title}</h3>
                    <p className="truncate text-[11px] uppercase tracking-wide text-white/60">{ch.subtitle}</p>
                  </div>
                  {unlocked && (
                    <div className="flex flex-col items-end gap-0.5 pr-1 text-[10px]">
                      <span className={`flex items-center gap-1 ${affordable ? "text-[#f5a623]" : "text-red-400"}`}>
                        <Zap size={10} /> −{cost}
                      </span>
                      <span className="flex items-center gap-1 text-[#f5a623]">
                        <Coins size={10} /> {ch.reward_berry}
                      </span>
                      <span className="flex items-center gap-1 text-[#f5a623]">
                        <Gem size={10} /> {ch.reward_strawberry}
                      </span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className={`mt-6 flex items-start gap-2 rounded-xl ${TEAL} ${PANEL_SM} p-3`}>
          <Ship size={16} className="mt-0.5 shrink-0 text-[#f5a623]" />
          <p className="text-[11px] uppercase leading-relaxed tracking-wide text-white/70">
            Ogni battaglia consuma energia (−5, boss −8). Si recupera 1 punto ogni 5 minuti.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
