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
  mainChaptersForArc,
  sideChaptersForArc,
  isArcUnlocked,
  arcProgressLabel,
  arcCompletionPct,
  isSideUnlocked,
  isSideCleared,
} from "@/data/arcs";
import {
  battleStaminaCost,
  computeStamina,
  canAffordBattle,
} from "@/lib/stamina";
import GameModal from "@/components/game/GameModal";
import { Coins, Gem, Lock, MapPin, Skull, Check, Ship, Zap, Waves, Flame, Flag } from "lucide-react";
import { hasUnlock } from "@/lib/rank";

function MissionCard({
  ch,
  unlocked,
  completed,
  enterBattle,
  playerState,
  now,
  hardUnlocked,
  side,
}) {
  const cost = battleStaminaCost(ch);
  const hardCost = cost + 3;
  const affordable = canAffordBattle(playerState, cost, now);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className={`group relative flex w-full flex-col gap-2 rounded-2xl border-2 border-black p-3 shadow-[0_4px_0_0_#000] ${
        unlocked ? TEAL : "bg-[#0d2a2c] text-white/50 opacity-70"
      }`}
    >
      <button
        type="button"
        disabled={!unlocked}
        onClick={() => unlocked && enterBattle(ch, false)}
        className={`flex w-full items-center gap-3 text-left ${unlocked && !affordable ? "opacity-80" : ""}`}
      >
        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]">
          {completed ? (
            <Check className="text-[#f5a623]" size={22} />
          ) : ch.is_boss ? (
            <Skull className="text-red-400" size={22} />
          ) : side ? (
            <Flag className="text-[#38bdf8]" size={20} />
          ) : unlocked ? (
            <MapPin className="text-[#f5a623]" size={20} />
          ) : (
            <Lock className="text-white/40" size={18} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[#f5a623]">
              {side ? "Side" : `Cap. ${ch.chapter_number}`}
            </span>
            {side && (
              <span className="rounded border-2 border-black bg-[#38bdf8]/25 px-1.5 py-0.5 text-[9px] uppercase text-[#38bdf8]">
                Secondaria
              </span>
            )}
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
      </button>
      {completed && !side && (
        <button
          type="button"
          onClick={() => enterBattle(ch, true)}
          className={`flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-black py-1.5 text-[10px] uppercase tracking-wide ${
            hardUnlocked ? `${AMBER} text-black` : "bg-[#0b161b] text-white/45"
          }`}
        >
          {hardUnlocked ? <Flame size={12} /> : <Lock size={12} />}
          Hard · −{hardCost} energia · loot ×1.5
          {!hardUnlocked && " · Rank 3"}
        </button>
      )}
    </motion.div>
  );
}

/** Missioni di un arco (isola) del serpentone */
export default function StoryArc() {
  const { arcId } = useParams();
  const arc = STORY_ARC_MAP[arcId];
  const { loading, playerState, refresh } = useGame();
  const [chapters, setChapters] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [alertModal, setAlertModal] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const list = await db.entities.StoryChapter.list("chapter_number", 120);
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

  if (!arc) return <Navigate to="/fight/story" replace />;

  if (loading || !playerState || !live) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b161b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
      </div>
    );
  }

  const progress = playerState.story_progress;
  const sideCleared = playerState.side_cleared || [];
  const missions = mainChaptersForArc(chapters, arc.id);
  const sides = sideChaptersForArc(chapters, arc.id);
  const unlockedArc = isArcUnlocked(chapters, arc.id, progress);
  const label = arcProgressLabel(chapters, arc.id, progress);
  const pct = arcCompletionPct(chapters, arc.id, progress);

  if (!unlockedArc) {
    return <Navigate to="/fight/story" replace />;
  }

  const hardUnlocked = hasUnlock(playerState.account_level || 1, "hardMode");

  function enterBattle(ch, hard = false) {
    if (hard && !hardUnlocked) {
      setAlertModal({
        title: "Hard mode bloccata",
        body: "Raggiungi Rank 3 per sbloccare la modalità Hard.",
      });
      return;
    }
    const cost = battleStaminaCost(ch, { hard });
    if (!canAffordBattle(playerState, cost, now)) {
      setAlertModal({
        title: "Energia insufficiente",
        body: `Servono ${cost} energia. Ora ne hai ${live.stamina}/${live.stamina_max}.`,
      });
      return;
    }
    navigate(`/battle/${ch.chapter_number}${hard ? "?mode=hard" : ""}`);
  }

  return (
    <div className="min-h-screen bg-[#0b161b] pb-24 text-white">
      <GameTopBar showBack backTo="/fight/story" />
      <div className={`border-b-2 border-black ${TEAL}`}>
        <div className="mx-auto max-w-md px-4 py-2 text-center">
          <p className="text-[9px] uppercase tracking-widest text-[#f5a623]">{arc.sea}</p>
          <h1 className="text-sm uppercase tracking-wide">{arc.name}</h1>
          <p className="text-[10px] uppercase tracking-wide text-white/55">{arc.subtitle}</p>
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 pt-5">
        <div
          className={`mb-4 rounded-xl border-2 border-black ${TEAL} p-3 shadow-[0_3px_0_0_#000]`}
          style={{ boxShadow: `0 3px 0 0 #000, 0 0 16px ${arc.accent}33` }}
        >
          <div className="flex items-start gap-2">
            <Ship size={16} className="mt-0.5 shrink-0 text-[#f5a623]" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase leading-relaxed tracking-wide text-white/75">{arc.blurb}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-black bg-[#0b161b]">
                  <div className="h-full rounded-full bg-[#f5a623]" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[9px] uppercase text-white/60">
                  {label} · {pct}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <Waves size={16} className="text-[#f5a623]" />
          <span className="text-xs uppercase tracking-widest text-[#f5a623]">Missioni principali</span>
        </div>

        <div className="relative mb-8">
          <div className="absolute left-[27px] top-2 bottom-2 w-1 -translate-x-1/2 rounded-full bg-[#f5a623]/30" />
          <div className="space-y-3">
            {missions.map((ch) => {
              const unlocked = ch.chapter_number <= progress;
              const completed = ch.chapter_number < progress;
              return (
                <MissionCard
                  key={ch.id}
                  ch={ch}
                  unlocked={unlocked}
                  completed={completed}
                  enterBattle={enterBattle}
                  playerState={playerState}
                  now={now}
                  hardUnlocked={hardUnlocked}
                />
              );
            })}
          </div>
        </div>

        {sides.length > 0 && (
          <>
            <div className="mb-3 flex items-center gap-2">
              <Flag size={16} className="text-[#38bdf8]" />
              <span className="text-xs uppercase tracking-widest text-[#38bdf8]">Missioni secondarie</span>
            </div>
            <div className="space-y-3">
              {sides.map((ch) => {
                const unlocked = isSideUnlocked(ch, progress);
                const completed = isSideCleared(ch, sideCleared);
                return (
                  <MissionCard
                    key={ch.id}
                    ch={ch}
                    unlocked={unlocked}
                    completed={completed}
                    enterBattle={enterBattle}
                    playerState={playerState}
                    now={now}
                    hardUnlocked={hardUnlocked}
                    side
                  />
                );
              })}
            </div>
          </>
        )}

        <div className={`mt-6 flex items-start gap-2 rounded-xl ${TEAL} ${PANEL_SM} p-3`}>
          <Ship size={16} className="mt-0.5 shrink-0 text-[#f5a623]" />
          <p className="text-[11px] uppercase leading-relaxed tracking-wide text-white/70">
            Le secondarie non avanzano la storia: servono per farm e missioni extra. Energia −5 (−8 boss).
          </p>
        </div>
      </main>

      <BottomNav />

      <GameModal
        open={!!alertModal}
        onClose={() => setAlertModal(null)}
        title={alertModal?.title}
      >
        <p className="text-sm uppercase tracking-wide text-white/80">{alertModal?.body}</p>
        <button
          type="button"
          onClick={() => setAlertModal(null)}
          className={`mt-4 w-full rounded-xl border-2 border-black py-2.5 text-xs font-bold uppercase text-black ${AMBER}`}
        >
          Ho capito
        </button>
      </GameModal>
    </div>
  );
}
