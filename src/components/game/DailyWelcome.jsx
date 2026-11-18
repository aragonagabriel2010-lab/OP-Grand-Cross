import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/localDb";
import {
  claimDaily,
  claimMonthlyLogin,
  DAILY_GUARANTEED,
  loadDailies,
  loginRewardForDay,
} from "@/lib/dailies";
import {
  monthlyEventFor,
  markDailyWelcomeSeen,
} from "@/lib/monthlyEvents";
import { mergeMaterials, normalizeMaterials } from "@/lib/materials";
import { Gem, Coins, Gift, Hexagon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AudioManager } from "@/lib/AudioManager";

function asset(path) {
  return `${import.meta.env.BASE_URL}${String(path).replace(/^\//, "")}`;
}

function rewardLines(reward) {
  if (!reward) return [];
  const lines = [];
  if (reward.berry) lines.push({ Icon: Coins, text: `+${reward.berry} Beri`, color: "#f5a623" });
  if (reward.strawberry) lines.push({ Icon: Gem, text: `+${reward.strawberry} Fragole`, color: "#f87171" });
  if (reward.materials) {
    const names = {
      sea_crystal: "Cristallo",
      pirate_crest: "Cresta",
      dawn_shard: "Scheggia",
    };
    for (const [id, n] of Object.entries(reward.materials)) {
      if (!n) continue;
      lines.push({ Icon: Hexagon, text: `+${n} ${names[id] || id}`, color: "#38bdf8" });
    }
  }
  if (!lines.length && reward.label) lines.push({ Icon: Gift, text: reward.label, color: "#f5a623" });
  if (!lines.length && reward.rewardLabel) lines.push({ Icon: Gift, text: reward.rewardLabel, color: "#f5a623" });
  return lines;
}

/** Timing ricompensa — totale ~2s */
const REWARD_TOTAL_MS = 2000;
const REWARD_CHARGE_MS = 500;
const REWARD_FLASH_MS = 220;
const REWARD_BEAT_MS = 250;
const REWARD_BEATS = 2;

/**
 * Pop-up ricompensa: carica breve → TIN! → premio → chiusura in 2s.
 */
function RewardReveal({ open, title, reward, onContinue }) {
  const [phase, setPhase] = useState("charge"); // charge → flash → reveal
  const lines = rewardLines(reward);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  useEffect(() => {
    if (!open) return undefined;
    setPhase("charge");
    const tFlash = window.setTimeout(() => {
      setPhase("flash");
      try {
        AudioManager.playUlt?.();
      } catch {
        /* ignore */
      }
    }, REWARD_CHARGE_MS);
    const tReveal = window.setTimeout(
      () => setPhase("reveal"),
      REWARD_CHARGE_MS + REWARD_FLASH_MS
    );
    const tDone = window.setTimeout(() => onContinueRef.current?.(), REWARD_TOTAL_MS);
    return () => {
      window.clearTimeout(tFlash);
      window.clearTimeout(tReveal);
      window.clearTimeout(tDone);
    };
  }, [open, title]);

  if (!open) return null;

  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={(e) => {
        e.stopPropagation();
        if (phase === "reveal") onContinue?.();
      }}
    >
      <AnimatePresence mode="wait">
        {phase === "charge" && (
          <motion.div
            key="charge"
            className="relative flex h-36 w-36 items-center justify-center"
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: [0.88, 1.12, 0.88], opacity: 1 }}
            exit={{ scale: 1.35, opacity: 0 }}
            transition={{
              duration: REWARD_BEAT_MS / 1000,
              repeat: REWARD_BEATS - 1,
              ease: "easeInOut",
            }}
          >
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-[#f5a623]"
              animate={{ boxShadow: ["0 0 12px #f5a62355", "0 0 42px #f5a623cc", "0 0 12px #f5a62355"] }}
              transition={{
                duration: REWARD_BEAT_MS / 1000,
                repeat: REWARD_BEATS - 1,
                ease: "easeInOut",
              }}
            />
            <Sparkles className="relative z-10 text-[#f5a623]" size={42} />
            <p className="absolute -bottom-8 text-[10px] uppercase tracking-[0.25em] text-[#f5a623]">
              …
            </p>
          </motion.div>
        )}
        {phase === "flash" && (
          <motion.div
            key="flash"
            className="absolute inset-0 bg-[#f5a623]/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.45 }}
          />
        )}
        {phase === "reveal" && (
          <motion.div
            key="reveal"
            initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
            className="w-full max-w-xs rounded-2xl border-[3px] border-black bg-[#164446] p-5 text-center shadow-[0_6px_0_0_#000]"
          >
            <motion.p
              className="text-2xl font-black uppercase text-[#f5a623]"
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ textShadow: "0 2px 0 #000" }}
            >
              TIN!
            </motion.p>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-white/55">{title}</p>
            <div className="mt-3 space-y-2">
              {lines.map((l, i) => {
                const Icon = l.Icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ x: -12, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.12 + i * 0.08 }}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-black bg-[#0b161b] px-3 py-2"
                  >
                    <Icon size={16} style={{ color: l.color }} />
                    <span className="text-sm font-bold uppercase" style={{ color: l.color }}>
                      {l.text}
                    </span>
                  </motion.div>
                );
              })}
            </div>
            <p className="mt-4 text-[9px] uppercase tracking-wide text-white/40">Chiusura automatica…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const FLOW = ["chopper", "event", "login", "daily"];

/**
 * Bentornato giornaliero — fullscreen, tap ovunque.
 * Chopper in basso a destra (PNG trasparente) + dialoghi a sinistra.
 */
export default function DailyWelcome({ open, uid, playerState, onDone, refresh, setDailies }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(null); // { title, reward, after }
  const event = monthlyEventFor();
  const loginPreview = loginRewardForDay(new Date().getDate());
  const phase = FLOW[step] || "daily";

  if (!open || typeof document === "undefined") return null;

  async function grantReward(reward) {
    if (!playerState || !reward) return;
    const patch = {};
    if (reward.berry) patch.berry = (playerState.berry || 0) + reward.berry;
    if (reward.strawberry) patch.strawberry = (playerState.strawberry || 0) + reward.strawberry;
    if (reward.materials) {
      patch.materials = mergeMaterials(
        normalizeMaterials(playerState.materials),
        reward.materials
      );
    }
    if (Object.keys(patch).length) {
      const updated = await db.entities.PlayerState.update(playerState.id, patch);
      if (updated) Object.assign(playerState, updated);
      else Object.assign(playerState, patch);
      refresh?.();
    }
  }

  function finish() {
    markDailyWelcomeSeen(uid);
    onDone?.();
  }

  async function advance() {
    if (busy || reveal) return;

    if (phase === "chopper") {
      setStep(1);
      return;
    }

    if (phase === "event") {
      setBusy(true);
      try {
        await grantReward(event.reward);
        setReveal({
          title: event.title,
          reward: { ...event.reward, rewardLabel: event.rewardLabel },
          after: () => {
            setReveal(null);
            setStep(2);
          },
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (phase === "login") {
      setBusy(true);
      try {
        const res = claimMonthlyLogin(uid);
        const reward = res.ok ? res.reward : loginPreview;
        if (res.ok) {
          await grantReward(res.reward);
          setDailies?.(res.data);
        } else {
          setDailies?.(loadDailies(uid));
        }
        setReveal({
          title: res.ok ? `Login giorno ${res.day}` : "Login già ritirato",
          reward: reward || { label: "—" },
          after: () => {
            setReveal(null);
            setStep(3);
          },
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    // daily fragole
    setBusy(true);
    try {
      const res = claimDaily(uid, DAILY_GUARANTEED.id);
      if (res.ok) {
        await grantReward(res.reward);
        setDailies?.(res.data);
      } else {
        setDailies?.(loadDailies(uid));
      }
      setReveal({
        title: DAILY_GUARANTEED.title,
        reward: res.reward || DAILY_GUARANTEED.reward,
        after: () => {
          setReveal(null);
          finish();
        },
      });
    } finally {
      setBusy(false);
    }
  }

  const dialogue =
    phase === "chopper"
      ? {
          name: "Chopper",
          nameColor: "#f472b6",
          lines: ["Capitanoooo!!!", "Mi sei mancato!!!"],
          hint: "*singhiozza*",
        }
      : phase === "event"
        ? {
            name: "Evento del mese",
            nameColor: event.accent,
            lines: [event.title, event.blurb],
            hint: "Tocca — premio evento",
          }
        : phase === "login"
          ? {
              name: "Login giornaliero",
              nameColor: "#f5a623",
              lines: ["Ecco il bonus di oggi!", loginPreview.label],
              hint: "Tocca — ritira login",
            }
          : {
              name: "Razione giornaliera",
              nameColor: "#f87171",
              lines: [DAILY_GUARANTEED.title, DAILY_GUARANTEED.rewardLabel],
              hint: "Tocca — +10 Fragole",
            };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="button"
          tabIndex={0}
          className="fixed inset-0 z-[95] cursor-pointer overflow-hidden bg-[#070f12]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={advance}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              advance();
            }
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 70% 80%, rgba(244,114,182,0.22), transparent 55%), radial-gradient(ellipse 60% 40% at 20% 30%, rgba(245,166,35,0.12), transparent 50%)",
            }}
          />

          {/* Dialoghi a sinistra / centro */}
          <div className="relative z-10 flex h-full max-w-md flex-col justify-center px-4 pb-36 pt-10 sm:mx-auto">
            <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#f5a623]">Bentornato</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="mr-28 max-w-[16rem] rounded-2xl border-2 border-black bg-[#0b161b]/92 px-4 py-3 shadow-[0_4px_0_0_#000] backdrop-blur-sm sm:mr-36 sm:max-w-[18rem]"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: dialogue.nameColor }}>
                  {dialogue.name}
                </p>
                {dialogue.lines.map((line, i) => (
                  <p
                    key={i}
                    className={cn(
                      "mt-1 font-black uppercase leading-snug text-white",
                      i === 0 ? "text-lg sm:text-xl" : "text-[12px] text-white/75"
                    )}
                    style={{ textShadow: "0 2px 0 #000" }}
                  >
                    {line}
                  </p>
                ))}
                <motion.p
                  className="mt-2 text-[10px] uppercase tracking-wide text-white/40"
                  animate={{ opacity: [0.35, 1, 0.35] }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                >
                  {dialogue.hint}
                </motion.p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex gap-1.5">
              {FLOW.map((s, i) => (
                <span
                  key={s}
                  className={cn(
                    "h-1.5 rounded-full border border-black",
                    i === step ? "w-5 bg-[#f5a623]" : "w-1.5 bg-[#164446]"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Chopper PNG trasparente — basso a destra, senza cornice */}
          <motion.img
            src={asset("art/chopper-welcome.png")}
            alt="Chopper"
            draggable={false}
            className="pointer-events-none absolute bottom-0 right-[-4%] z-20 h-[58%] max-h-[420px] w-auto object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.55)] sm:right-0 sm:h-[62%]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: [0, -8, 0], opacity: 1 }}
            transition={{
              opacity: { duration: 0.4 },
              y: { repeat: Infinity, duration: 2.2, ease: "easeInOut" },
            }}
          />

          <p className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 text-[9px] uppercase tracking-[0.2em] text-white/35">
            Tocca ovunque
          </p>

          {reveal && (
            <RewardReveal
              open
              title={reveal.title}
              reward={reveal.reward}
              onContinue={() => reveal.after?.()}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
