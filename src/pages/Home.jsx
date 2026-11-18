import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGame } from "@/hooks/useGame";
import BottomNav from "@/components/game/BottomNav";
import GameTopBar from "@/components/game/GameTopBar";
import SettingsModal from "@/components/game/SettingsModal";
import MissionsHub from "@/components/game/MissionsHub";
import HomeBannerCarousel from "@/components/game/HomeBannerCarousel";
import DailyWelcome from "@/components/game/DailyWelcome";
import { TEAL, AMBER, PANEL } from "@/lib/arcade";
import { db } from "@/lib/localDb";
import { loadDailies } from "@/lib/dailies";
import { eventStatus } from "@/lib/events";
import { shouldShowDailyWelcome } from "@/lib/monthlyEvents";
import { onLocalMidnight } from "@/lib/dayClock";
import { loadDailyLoop, dailyLoopProgress } from "@/lib/dailyLoop";
import { weeklyMetaStatus, claimWeeklyMeta } from "@/lib/weeklyMeta";
import { mergeMaterials } from "@/lib/materials";
import { hasUnlock } from "@/lib/rank";
import { AudioManager } from "@/lib/AudioManager";
import {
  CalendarDays,
  Ship,
  Flame,
  ChevronRight,
  Backpack,
  CookingPot,
  Swords,
  Map,
  Castle,
  Check,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.05 + i * 0.055, type: "spring", stiffness: 380, damping: 26 },
  }),
};

/**
 * Hub principale stile 7DS:GC — ponte della Thousand Sunny
 */
export default function Home() {
  const { loading, playerState, owned, refresh } = useGame();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [dailies, setDailies] = useState(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [loop, setLoop] = useState(null);
  const [weekly, setWeekly] = useState(null);

  const uid = playerState?.created_by_id || playerState?.id;
  const ownedHeroes = useMemo(() => (owned || []).length, [owned]);

  function refreshMeta() {
    if (!uid) return;
    setDailies(loadDailies(uid));
    setWelcomeOpen(shouldShowDailyWelcome(uid));
    setLoop(loadDailyLoop(uid));
    setWeekly(weeklyMetaStatus(uid));
  }

  useEffect(() => {
    if (!uid) return;
    refreshMeta();
  }, [uid, missionsOpen]);

  // A mezzanotte locale: nuovo giorno (dailies / welcome / loop), non rolling 24h
  useEffect(() => {
    if (!uid) return undefined;
    return onLocalMidnight(() => refreshMeta());
  }, [uid]);

  if (loading || !playerState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b161b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
      </div>
    );
  }

  const nextChapter = playerState.story_progress || 1;
  const evt = eventStatus();
  const rank = playerState.account_level || 1;
  const loopData = loop || loadDailyLoop(uid);
  const loopProg = dailyLoopProgress(loopData);
  const weeklyData = weekly || weeklyMetaStatus(uid);

  const loopTiles = [
    {
      id: "story",
      label: "Storia",
      reward: "Capitolo",
      done: !!loopData.story,
      Icon: Map,
      to: "/fight/story",
      accent: "#f5a623",
    },
    {
      id: "fortress",
      label: "Fortezza",
      reward: "Farm",
      done: !!loopData.fortress,
      Icon: Castle,
      to: "/fight/fortress",
      accent: "#38bdf8",
    },
    {
      id: "kitchen",
      label: "Cucina",
      reward: "Buff",
      done: !!loopData.kitchen,
      Icon: CookingPot,
      to: "/kitchen",
      accent: "#f97316",
    },
  ];

  async function onClaimWeekly() {
    const res = claimWeeklyMeta(uid);
    if (!res.ok || !res.reward) return;
    const patch = {};
    if (res.reward.strawberry) {
      patch.strawberry = (playerState.strawberry || 0) + res.reward.strawberry;
    }
    if (res.reward.materials) {
      patch.materials = mergeMaterials(playerState.materials, res.reward.materials);
    }
    if (Object.keys(patch).length) {
      await db.entities.PlayerState.update(playerState.id, patch);
      refresh?.();
    }
    AudioManager.playClick();
    setWeekly(weeklyMetaStatus(uid));
    toast({ title: "Meta settimanale!", description: weeklyData.rewardLabel });
  }

  const hubTiles = [
    {
      id: "inventory",
      label: "Inventario",
      sub: "Materiali · oggetti · cibo",
      Icon: Backpack,
      onClick: () => navigate("/inventory"),
      className: TEAL,
    },
    {
      id: "ship",
      label: "Nave",
      sub: "Hub · prossimamente",
      Icon: Ship,
      onClick: () => navigate("/ship"),
      className: TEAL,
    },
    {
      id: "kitchen",
      label: "Cucina",
      sub: "Pietanze · ingredienti",
      Icon: CookingPot,
      onClick: () => navigate("/kitchen"),
      className: TEAL,
      accent: true,
    },
    {
      id: "friends",
      label: "Amici",
      sub: "Sfide · PvP · classifica",
      Icon: Users,
      onClick: () => navigate("/friends"),
      className: TEAL,
    },
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
        <motion.button
          type="button"
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          onClick={() => navigate("/fight")}
          whileTap={{ scale: 0.98 }}
          className={`flex w-full items-center gap-3 rounded-2xl ${AMBER} ${PANEL} px-4 py-3 text-left`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]">
            <Swords className="text-[#f5a623]" size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-black/60">Fight</p>
            <p className="text-sm font-bold uppercase text-black">Capitolo {nextChapter}</p>
          </div>
          <Flame className="text-black" size={20} />
        </motion.button>

        {/* Loop del giorno — 3 azioni */}
        <motion.section
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className={`mt-3 rounded-2xl ${TEAL} ${PANEL} p-3`}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">Rotta del giorno</p>
            <span className="text-[9px] uppercase tabular-nums text-white/50">
              {loopProg.done}/{loopProg.total}
              {loopProg.complete ? " · Completa" : ""}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {loopTiles.map((t) => {
              const Icon = t.Icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(t.to)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-xl border-2 border-black bg-[#0b161b] px-1.5 py-2.5 shadow-[0_2px_0_0_#000]",
                    t.done && "ring-1 ring-[#f5a623]/50"
                  )}
                >
                  {t.done && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-black bg-[#f5a623]">
                      <Check size={9} className="text-black" />
                    </span>
                  )}
                  <Icon size={16} style={{ color: t.accent }} />
                  <span className="text-[9px] font-bold uppercase text-white">{t.label}</span>
                  <span className="text-[7px] uppercase text-white/45">{t.reward}</span>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* Meta settimanale */}
        <motion.div
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className={`mt-3 rounded-2xl border-2 border-black bg-gradient-to-r from-[#164446] to-[#0b161b] p-3 shadow-[0_3px_0_0_#000]`}
        >
          <div className="flex items-start gap-2">
            <Trophy size={18} className="mt-0.5 shrink-0 text-[#f5a623]" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-widest text-[#f5a623]">Meta settimana</p>
              <p className="text-sm font-bold uppercase text-white">{weeklyData.title}</p>
              <p className="text-[10px] uppercase text-white/55">{weeklyData.blurb}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full border border-black bg-[#0b161b]">
                <div
                  className="h-full rounded-full bg-[#f5a623] transition-all"
                  style={{
                    width: `${Math.min(100, (weeklyData.progress / weeklyData.target) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[9px] uppercase tabular-nums text-white/60">
                  {weeklyData.progress}/{weeklyData.target} Hard
                </span>
                {weeklyData.claimed ? (
                  <span className="text-[9px] uppercase text-[#f5a623]">Ritirato</span>
                ) : weeklyData.done ? (
                  <button
                    type="button"
                    onClick={onClaimWeekly}
                    className={`rounded-lg border-2 border-black px-2 py-1 text-[9px] font-bold uppercase text-black ${AMBER}`}
                  >
                    Ritira
                  </button>
                ) : (
                  <span className="text-[8px] uppercase text-white/40">{weeklyData.rewardLabel}</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {evt.active && hasUnlock(rank, "eventAccess") && (
          <motion.button
            type="button"
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          onClick={() => setMissionsOpen(true)}
          whileTap={{ scale: 0.98 }}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl border-2 border-black bg-gradient-to-r from-[#164446] to-[#3b0a0a] px-4 py-3 text-left shadow-[0_3px_0_0_#000]"
        >
            <Flame className="text-[#f5a623]" size={22} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">Evento attivo</p>
              <p className="text-sm font-bold uppercase text-white">{evt.event.title}</p>
              <p className="truncate text-[10px] uppercase text-white/60">{evt.event.blurb}</p>
            </div>
            <ChevronRight className="text-[#f5a623]" size={16} />
          </motion.button>
        )}

        <motion.button
          type="button"
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          onClick={() => setMissionsOpen(true)}
          whileTap={{ scale: 0.98 }}
          className={`mt-3 flex w-full items-center gap-3 rounded-2xl ${TEAL} ${PANEL} px-4 py-3.5 text-left`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]">
            <CalendarDays className="text-[#f5a623]" size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold uppercase tracking-wide text-white">Missioni</p>
            <p className="text-[10px] uppercase text-white/55">
              Giornaliere · Secondarie · Eventi · Login
            </p>
          </div>
          <ChevronRight className="text-[#f5a623]" size={18} />
        </motion.button>

        <motion.p
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mb-2 mt-5 px-0.5 text-[10px] uppercase tracking-widest text-[#f5a623]"
        >
          Hub di bordo
        </motion.p>

        <div className="grid grid-cols-3 gap-2">
          {hubTiles.map((tile, i) => {
            const Icon = tile.Icon;
            return (
              <motion.button
                key={tile.id}
                type="button"
                custom={4 + i}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                onClick={tile.onClick}
                whileTap={{ scale: 0.96, y: 2 }}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border-2 border-black px-2 py-3 shadow-[0_3px_0_0_#000]",
                  tile.className
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]">
                  <Icon size={18} className={tile.accent ? "text-[#f97316]" : "text-[#f5a623]"} />
                </div>
                <span className="text-[10px] font-bold uppercase leading-tight text-white">{tile.label}</span>
                <span className="text-center text-[7px] uppercase leading-tight text-white/45">{tile.sub}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Annunci in basso */}
        <motion.div
          custom={8}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-5"
        >
          <p className="mb-2 px-0.5 text-[10px] uppercase tracking-widest text-[#f5a623]">
            Annunci
          </p>
          <HomeBannerCarousel onOpenMissions={() => setMissionsOpen(true)} />
        </motion.div>

        <motion.p
          custom={9}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-5 text-center text-[9px] uppercase tracking-[0.2em] text-white/35"
        >
          Ponte della Thousand Sunny
        </motion.p>
      </main>

      <BottomNav />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <MissionsHub
        open={missionsOpen}
        onClose={() => setMissionsOpen(false)}
        playerState={playerState}
        ownedHeroes={ownedHeroes}
        dailies={dailies}
        setDailies={setDailies}
        refresh={refresh}
      />
      <DailyWelcome
        open={welcomeOpen}
        uid={uid}
        playerState={playerState}
        setDailies={setDailies}
        refresh={refresh}
        onDone={() => {
          setWelcomeOpen(false);
          setDailies(loadDailies(uid));
        }}
      />
    </div>
  );
}
