import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/localDb";
import GameModal from "@/components/game/GameModal";
import { TEAL, AMBER, PANEL_SM } from "@/lib/arcade";
import {
  SECONDARY_DEFS,
  todaysDailyDefs,
  claimDaily,
  claimSecondary,
  claimMonthlyLogin,
  missionStatus,
  secondaryStatus,
  monthlyLoginGrid,
  bumpDaily,
  DAILY_GUARANTEED,
} from "@/lib/dailies";
import { eventStatus } from "@/lib/events";
import { hasUnlock } from "@/lib/rank";
import { toast } from "@/components/ui/use-toast";
import { Check, ChevronRight, Flame, Gift, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "daily", label: "Giornaliere" },
  { id: "secondary", label: "Secondarie" },
  { id: "events", label: "Eventi" },
  { id: "login", label: "Login" },
];

const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export default function MissionsHub({
  open,
  onClose,
  playerState,
  ownedHeroes = 0,
  dailies,
  setDailies,
  refresh,
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("daily");
  const uid = playerState?.created_by_id || playerState?.id;
  const evt = eventStatus();
  const grid = useMemo(
    () => (dailies ? monthlyLoginGrid(dailies) : null),
    [dailies]
  );
  const todayMissions = useMemo(
    () => (dailies ? todaysDailyDefs(dailies) : []),
    [dailies]
  );

  useEffect(() => {
    if (!open || !uid) return;
    const next = bumpDaily(uid, "open_missions");
    setDailies?.(next);
  }, [open, uid, setDailies]);

  async function applyReward(reward) {
    if (!playerState || !reward) return;
    const { mergeMaterials, normalizeMaterials } = await import("@/lib/materials");
    const patch = {};
    if (reward.berry) patch.berry = playerState.berry + reward.berry;
    if (reward.strawberry) patch.strawberry = playerState.strawberry + reward.strawberry;
    if (reward.materials) {
      patch.materials = mergeMaterials(normalizeMaterials(playerState.materials), reward.materials);
    }
    if (Object.keys(patch).length) {
      await db.entities.PlayerState.update(playerState.id, patch);
      refresh?.();
    }
  }

  return (
    <GameModal open={open} onClose={onClose} title="Missioni">
      <div className="mb-3 grid grid-cols-4 gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg border-2 border-black px-1 py-2 text-[8px] font-bold uppercase tracking-wide",
              tab === t.id ? AMBER + " text-black" : "bg-[#0b161b] text-white/70"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "daily" && dailies && (
        <div className="space-y-2">
          <p className="px-0.5 text-[9px] uppercase tracking-wide text-white/45">
            3 casuali + 1 fissa · si rinnovano ogni giorno
          </p>
          {todayMissions.map((m) => {
            const st = missionStatus(dailies, m.id);
            const isFixed = m.id === DAILY_GUARANTEED.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={async () => {
                  if (st.claimed) return;
                  if (st.done) {
                    const res = claimDaily(uid, m.id);
                    if (!res.ok) return;
                    await applyReward(res.reward);
                    setDailies(res.data);
                    toast({ title: "Missione completata", description: m.rewardLabel });
                    return;
                  }
                  if (!m.route) return;
                  onClose();
                  navigate(m.route);
                }}
                className={cn(
                  `flex w-full items-center justify-between rounded-xl ${TEAL} ${PANEL_SM} px-3 py-2.5 text-left`,
                  isFixed && "ring-1 ring-[#f5a623]/50",
                  st.claimed && "opacity-55"
                )}
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-white">
                    {isFixed ? `★ ${m.title}` : m.title}
                  </p>
                  <p className="text-[10px] uppercase text-[#f5a623]">
                    {m.rewardLabel} · {Math.min(st.progress, st.target)}/{st.target}
                  </p>
                </div>
                {st.claimed ? (
                  <Check size={16} className="text-[#f5a623]" />
                ) : st.done ? (
                  <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase text-black ${AMBER}`}>Ritira</span>
                ) : (
                  <ChevronRight size={16} className="text-[#f5a623]" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {tab === "secondary" && dailies && (
        <div className="space-y-2">
          {SECONDARY_DEFS.map((m) => {
            const ctx = {
              storyProgress: playerState?.story_progress || 1,
              accountLevel: playerState?.account_level || 1,
              ownedHeroes,
            };
            const st = secondaryStatus(dailies, m, ctx);
            return (
              <button
                key={m.id}
                type="button"
                disabled={st.claimed || !st.done}
                onClick={async () => {
                  const res = claimSecondary(uid, m.id, ctx);
                  if (!res.ok) return;
                  await applyReward(res.reward);
                  setDailies(res.data);
                  toast({ title: "Ricompense ritirate", description: m.rewardLabel });
                }}
                className={cn(
                  `flex w-full items-center justify-between rounded-xl ${TEAL} ${PANEL_SM} px-3 py-2.5 text-left`,
                  st.claimed && "opacity-55"
                )}
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-white">{m.title}</p>
                  <p className="text-[10px] uppercase text-[#f5a623]">
                    {m.rewardLabel} · {st.progress}/{st.target}
                  </p>
                </div>
                {st.claimed ? (
                  <Check size={16} className="text-[#f5a623]" />
                ) : st.done ? (
                  <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase text-black ${AMBER}`}>Ritira</span>
                ) : (
                  <span className="text-[9px] uppercase text-white/40">In corso</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {tab === "events" && (
        <div className={`rounded-xl ${TEAL} ${PANEL_SM} p-4`}>
          {evt.active && hasUnlock(playerState?.account_level || 1, "eventAccess") ? (
            <>
              <div className="flex items-center gap-2">
                <Flame className="text-[#f5a623]" size={18} />
                <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">Evento attivo</p>
              </div>
              <p className="mt-2 text-sm font-bold uppercase text-white">{evt.event.title}</p>
              <p className="mt-1 text-[11px] uppercase text-white/60">{evt.event.blurb}</p>
              <p className="mt-2 text-[10px] uppercase text-[#f5a623]">{evt.event.rewardLabel}</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("/fight");
                }}
                className={`mt-4 w-full rounded-xl border-2 border-black py-2.5 text-xs font-bold uppercase ${AMBER} text-black`}
              >
                Vai alle missioni
              </button>
            </>
          ) : (
            <>
              <CalendarDays className="text-[#f5a623]" size={18} />
              <p className="mt-2 text-sm font-bold uppercase text-white">Nessun evento attivo</p>
              <p className="mt-1 text-[11px] uppercase text-white/55">
                {evt.daysUntil > 0
                  ? `Prossimo evento tra ${evt.daysUntil} giorni`
                  : "Torna più tardi"}
              </p>
              {!hasUnlock(playerState?.account_level || 1, "eventAccess") && (
                <p className="mt-2 text-[10px] uppercase text-[#f5a623]">
                  Sblocca eventi al Rank {2}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {tab === "login" && grid && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wide text-[#f5a623]">
              {MONTH_NAMES[grid.month]} {grid.year}
            </p>
            <p className="text-[9px] uppercase text-white/45">Giorni saltati persi</p>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {grid.cells.map((cell) => (
              <div
                key={cell.day}
                className={cn(
                  "flex min-h-[2.85rem] flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-black px-0.5 py-1 text-center",
                  cell.state === "today" && AMBER,
                  cell.state === "claimed" && "bg-[#0d3436]",
                  cell.state === "missed" && "bg-[#1a0a0a] opacity-55",
                  cell.state === "future" && "bg-[#0b161b] opacity-50"
                )}
              >
                <span
                  className={cn(
                    "text-[13px] font-black leading-none",
                    cell.state === "today" ? "text-black" : "text-white"
                  )}
                >
                  {cell.day}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold leading-none tabular-nums",
                    cell.state === "today" ? "text-black/75" : "text-[#f5a623]",
                    cell.state === "missed" && "text-white/50"
                  )}
                >
                  {cell.state === "missed" ? "—" : cell.label || "?"}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={!grid.cells.find((c) => c.state === "today")}
            onClick={async () => {
              const res = claimMonthlyLogin(uid);
              if (!res.ok) return;
              await applyReward(res.reward);
              setDailies(res.data);
              toast({
                title: `Login giorno ${res.day}`,
                description: res.reward?.label || "Premio ritirato",
              });
            }}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-black py-3 text-xs font-bold uppercase disabled:opacity-45 ${AMBER} text-black`}
          >
            <Gift size={14} />
            Ritira bonus di oggi
          </button>
        </div>
      )}
    </GameModal>
  );
}
