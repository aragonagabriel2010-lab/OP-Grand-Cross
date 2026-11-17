import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import BottomNav from "@/components/game/BottomNav";
import GameTopBar from "@/components/game/GameTopBar";
import GameModal from "@/components/game/GameModal";
import { useGame } from "@/hooks/useGame";
import { markDailyLoop } from "@/lib/dailyLoop";
import { TEAL, AMBER, PANEL, PANEL_SM } from "@/lib/arcade";
import {
  FORTRESS_LEVELS,
  FORTRESS_ZONES,
  loadFortressProgress,
  canPlayFortressLevel,
  fortressRewardPreview,
  fortressStaminaCost,
  getFortressZone,
} from "@/lib/fortress";
import { computeStamina, canAffordBattle } from "@/lib/stamina";
import {
  Coins,
  Hexagon,
  Shirt,
  Sparkles,
  Lock,
  ChevronRight,
  Castle,
  Check,
  MapPin,
  Skull,
  Ship,
  Waves,
  Zap,
  Gem,
} from "lucide-react";

const ZONE_ICONS = {
  beri: Coins,
  awaken: Hexagon,
  craft: Shirt,
  special: Sparkles,
};

function LevelCard({
  zone,
  level,
  unlocked,
  completed,
  preview,
  cost,
  affordable,
  onPlay,
}) {
  const isBoss = level >= 8;
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: (level - 1) * 0.03 }}
      className={`group relative flex w-full flex-col gap-2 rounded-2xl border-2 border-black p-3 shadow-[0_4px_0_0_#000] ${
        unlocked ? TEAL : "bg-[#0d2a2c] text-white/50 opacity-70"
      }`}
    >
      <button
        type="button"
        disabled={!unlocked}
        onClick={() => unlocked && onPlay()}
        className={`flex w-full items-center gap-3 text-left ${unlocked && !affordable ? "opacity-80" : ""}`}
      >
        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]">
          {completed ? (
            <Check className="text-[#f5a623]" size={22} />
          ) : isBoss ? (
            <Skull className="text-red-400" size={22} />
          ) : unlocked ? (
            <MapPin style={{ color: zone.accent }} size={20} />
          ) : (
            <Lock className="text-white/40" size={18} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: zone.accent }}>
              Lv {level}
            </span>
            {isBoss && (
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
          <h3 className="truncate text-sm uppercase tracking-wide text-white">
            {zone.title} · {level}
          </h3>
          <p className="truncate text-[11px] uppercase tracking-wide text-white/60">
            {preview.chanceLabel}
            {preview.amountHint ? ` · ${preview.amountHint}` : ""}
          </p>
        </div>
        {unlocked && (
          <div className="flex flex-col items-end gap-0.5 pr-1 text-[10px]">
            <span className={`flex items-center gap-1 ${affordable ? "text-[#f5a623]" : "text-red-400"}`}>
              <Zap size={10} /> −{cost}
            </span>
            <span className="flex items-center gap-1 text-[#f5a623]">
              <Coins size={10} /> {preview.berry}
            </span>
            {zone.id === "special" && (
              <span className="flex items-center gap-1 text-[#f5a623]">
                <Gem size={10} /> {preview.amountHint}
              </span>
            )}
          </div>
        )}
      </button>
    </motion.div>
  );
}

/** Hub farm Fortezza — percorsi settimanali da 10 livelli (stessa struttura del serpentone Storia). */
export default function Fortress() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { playerState } = useGame();
  const uid = playerState?.created_by_id || playerState?.id;
  const [progress, setProgress] = useState(() => loadFortressProgress(uid));
  const [now, setNow] = useState(() => Date.now());
  const [alertModal, setAlertModal] = useState(null);

  const selectedZoneId = searchParams.get("zone");
  const zone = getFortressZone(selectedZoneId);

  useEffect(() => {
    if (uid) markDailyLoop(uid, "fortress");
  }, [uid]);

  useEffect(() => {
    setProgress(loadFortressProgress(uid));
  }, [uid]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const live = useMemo(
    () => (playerState ? computeStamina(playerState, now) : null),
    [playerState, now]
  );

  const zoneRows = useMemo(() => {
    return FORTRESS_ZONES.map((z) => {
      const cleared = progress.zones?.[z.id]?.cleared ?? 0;
      return { ...z, cleared, next: Math.min(FORTRESS_LEVELS, cleared + 1) };
    });
  }, [progress]);

  const cleared = zone ? progress.zones?.[zone.id]?.cleared ?? 0 : 0;
  const pct = zone ? Math.round((cleared / FORTRESS_LEVELS) * 100) : 0;

  function openZone(id) {
    setSearchParams({ zone: id });
  }

  function closeZone() {
    setSearchParams({});
  }

  function startLevel(zoneId, level) {
    if (!canPlayFortressLevel(progress, zoneId, level)) return;
    const cost = fortressStaminaCost(level);
    if (playerState && !canAffordBattle(playerState, cost, now)) {
      setAlertModal({
        title: "Energia insufficiente",
        body: `Servono ${cost} energia. Ora ne hai ${live?.stamina ?? 0}/${live?.stamina_max ?? 0}.`,
      });
      return;
    }
    navigate(`/battle/1?mode=fortress&zone=${zoneId}&level=${level}`);
  }

  return (
    <div className="min-h-screen bg-[#0b161b] pb-24 text-white">
      <GameTopBar
        showBack
        backTo="/fight"
        onBack={zone ? closeZone : undefined}
      />
      <div className={`border-b-2 border-black ${TEAL}`}>
        <div className="mx-auto max-w-md px-4 py-2 text-center">
          <p className="text-[9px] uppercase tracking-widest text-[#f5a623]">
            {zone ? "Fortezza" : "Fight"}
          </p>
          <h1 className="text-sm uppercase tracking-wide">{zone ? zone.title : "Fortezza"}</h1>
          <p className="text-[10px] uppercase tracking-wide text-white/55">
            {zone ? zone.subtitle : "Reset ogni lunedì"}
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 pt-5">
        {!zone && (
          <div className="space-y-3">
            <div className={`flex items-start gap-2 rounded-2xl ${TEAL} ${PANEL} p-3`}>
              <Castle size={18} className="mt-0.5 shrink-0 text-[#f5a623]" />
              <p className="text-[11px] uppercase leading-relaxed text-white/70">
                Ogni modalità ha 10 livelli. Ogni settimana riparti dal 1. Più sali, più chance e loot.
              </p>
            </div>

            {zoneRows.map((z, i) => {
              const Icon = ZONE_ICONS[z.id] || Castle;
              const zCleared = z.cleared;
              const zPct = Math.round((zCleared / FORTRESS_LEVELS) * 100);
              return (
                <motion.button
                  key={z.id}
                  type="button"
                  onClick={() => openZone(z.id)}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex w-full items-center gap-3 rounded-2xl ${TEAL} ${PANEL} p-3 text-left`}
                  style={{ boxShadow: `0 4px 0 0 #000, 0 0 12px ${z.accent}28` }}
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]"
                    style={{ boxShadow: `inset 0 0 12px ${z.accent}40` }}
                  >
                    <Icon size={20} style={{ color: z.accent }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] uppercase tracking-widest" style={{ color: z.accent }}>
                      {z.subtitle}
                    </p>
                    <h2 className="truncate text-sm uppercase tracking-wide text-white">{z.title}</h2>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-black bg-[#0b161b]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${zPct}%`, background: z.accent }}
                        />
                      </div>
                      <span className="text-[9px] uppercase text-white/60">
                        {zCleared}/{FORTRESS_LEVELS}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-[#f5a623]" />
                </motion.button>
              );
            })}
          </div>
        )}

        {zone && (
          <>
            <div
              className={`mb-4 rounded-xl border-2 border-black ${TEAL} p-3 shadow-[0_3px_0_0_#000]`}
              style={{ boxShadow: `0 3px 0 0 #000, 0 0 16px ${zone.accent}33` }}
            >
              <div className="flex items-start gap-2">
                <Ship size={16} className="mt-0.5 shrink-0 text-[#f5a623]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase leading-relaxed tracking-wide text-white/75">
                    {zone.hint}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-wide" style={{ color: zone.accent }}>
                    Cerca: {zone.seekLabel} · Beri sempre inclusi
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-black bg-[#0b161b]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: zone.accent }}
                      />
                    </div>
                    <span className="text-[9px] uppercase text-white/60">
                      {cleared}/{FORTRESS_LEVELS} · {pct}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <Waves size={16} style={{ color: zone.accent }} />
              <span className="text-xs uppercase tracking-widest" style={{ color: zone.accent }}>
                Percorso livelli
              </span>
            </div>

            <div className="relative mb-6">
              <div
                className="absolute left-[27px] top-2 bottom-2 w-1 -translate-x-1/2 rounded-full opacity-30"
                style={{ background: zone.accent }}
              />
              <div className="space-y-3">
                {Array.from({ length: FORTRESS_LEVELS }, (_, i) => {
                  const level = i + 1;
                  const unlocked = canPlayFortressLevel(progress, zone.id, level);
                  const completed = level <= cleared;
                  const preview = fortressRewardPreview(zone.id, level);
                  const cost = fortressStaminaCost(level);
                  const affordable = playerState
                    ? canAffordBattle(playerState, cost, now)
                    : true;
                  return (
                    <LevelCard
                      key={level}
                      zone={zone}
                      level={level}
                      unlocked={unlocked}
                      completed={completed}
                      preview={preview}
                      cost={cost}
                      affordable={affordable}
                      onPlay={() => startLevel(zone.id, level)}
                    />
                  );
                })}
              </div>
            </div>

            <div className={`flex items-start gap-2 rounded-xl ${TEAL} ${PANEL_SM} p-3`}>
              <Castle size={16} className="mt-0.5 shrink-0 text-[#f5a623]" />
              <p className="text-[11px] uppercase leading-relaxed tracking-wide text-white/70">
                Ogni lunedì il percorso riparte dal livello 1. Il livello 10 dà le probabilità e le quantità più alte.
              </p>
            </div>
          </>
        )}
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
