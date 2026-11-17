import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { db } from "@/lib/localDb";
import { useGame } from "@/hooks/useGame";
import { useAuth } from "@/lib/AuthContext";
import SettingsModal from "@/components/game/SettingsModal";
import {
  computeStamina,
  formatRegenCountdown,
  STAMINA_REGEN_MS,
} from "@/lib/stamina";
import { TEAL } from "@/lib/arcade";
import RankRing from "@/components/game/RankRing";
import { xpProgress } from "@/lib/rank";
import { ArrowLeft, Coins, Gem, Zap, Settings, Anchor } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Top bar globale stile 7DS:GC — nome, energia, rank, valute.
 */
export default function GameTopBar({
  showBack = false,
  backTo,
  onBack,
  showSettings = true,
  onSettings,
  className,
}) {
  const navigate = useNavigate();
  const { playerState, refresh, loading } = useGame();
  const { user } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const persisting = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const live = useMemo(
    () => (playerState ? computeStamina(playerState, now) : null),
    [playerState, now]
  );

  useEffect(() => {
    if (!playerState || !live || persisting.current) return;
    if (live.stamina <= (playerState.stamina ?? 0)) return;
    persisting.current = true;
    db.entities.PlayerState.update(playerState.id, {
      stamina: live.stamina,
      stamina_max: live.stamina_max,
      stamina_updated_at: live.stamina_updated_at,
    })
      .then(() => refresh?.())
      .finally(() => {
        persisting.current = false;
      });
  }, [live, playerState, refresh]);

  const name =
    user?.full_name ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Capitano";
  const rankInfo = xpProgress(playerState?.account_xp || 0);
  const level = playerState?.account_level || rankInfo.level || 1;
  const staminaPct = live
    ? Math.min(100, (live.stamina / live.stamina_max) * 100)
    : 0;
  const regenLabel = live ? formatRegenCountdown(live.nextInMs) : null;

  function handleBack() {
    if (onBack) onBack();
    else if (backTo) navigate(backTo);
    else navigate(-1);
  }

  function handleSettings() {
    if (onSettings) onSettings();
    else setSettingsOpen(true);
  }

  return (
    <>
      <header
        className={cn(
          `sticky top-0 z-40 ${TEAL} border-b-2 border-black shadow-[0_3px_0_0_#000]`,
          className
        )}
      >
        <div className="mx-auto flex max-w-md items-center gap-1 px-1.5 py-1.5 sm:gap-1.5 sm:px-2">
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b] shadow-[0_2px_0_0_#000] sm:h-9 sm:w-9"
              aria-label="Indietro"
            >
              <ArrowLeft size={15} className="text-[#f5a623]" />
            </button>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b] sm:h-9 sm:w-9">
              <Anchor size={15} className="text-[#f5a623]" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-bold uppercase leading-tight tracking-wide text-white sm:text-[10px]">
              {loading ? "…" : name}
            </p>
            <div className="mt-0.5 flex items-center gap-1">
              <Zap size={9} className="shrink-0 text-[#f5a623]" />
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full border border-black bg-[#0b161b]">
                <motion.div
                  className="h-full rounded-full bg-[#f5a623]"
                  animate={{ width: `${staminaPct}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="shrink-0 text-[8px] font-bold tabular-nums text-white">
                {live ? `${live.stamina}/${live.stamina_max}` : "—"}
              </span>
            </div>
            <p className="truncate text-[7px] uppercase tracking-wide text-white/40">
              {regenLabel
                ? `+1 tra ${regenLabel}`
                : `Piena · 1/${Math.round(STAMINA_REGEN_MS / 60000)}min`}
            </p>
          </div>

          <RankRing
            level={level}
            pct={rankInfo.atMax ? 100 : rankInfo.pct}
            size={46}
            compact
            className="relative z-10 shrink-0"
          />

          <div className="flex shrink-0 flex-col gap-0.5">
            <div className="flex items-center gap-0.5 rounded-lg border-2 border-black bg-[#0b161b] px-1 py-0.5 sm:gap-1 sm:px-1.5">
              <Coins size={10} className="text-[#f5a623] sm:h-[11px] sm:w-[11px]" />
              <span className="text-[9px] font-bold tabular-nums text-[#f5a623] sm:text-[10px]">
                {playerState?.berry ?? 0}
              </span>
            </div>
            <div className="flex items-center gap-0.5 rounded-lg border-2 border-black bg-[#0b161b] px-1 py-0.5 sm:gap-1 sm:px-1.5">
              <Gem size={10} className="text-[#f5a623] sm:h-[11px] sm:w-[11px]" />
              <span className="text-[9px] font-bold tabular-nums text-[#f5a623] sm:text-[10px]">
                {playerState?.strawberry ?? 0}
              </span>
            </div>
          </div>

          {showSettings && (
            <button
              type="button"
              onClick={handleSettings}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b] shadow-[0_2px_0_0_#000] sm:h-9 sm:w-9"
              aria-label="Impostazioni"
            >
              <Settings size={15} className="text-[#f5a623]" />
            </button>
          )}
        </div>
      </header>

      {!onSettings && (
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      )}
    </>
  );
}
