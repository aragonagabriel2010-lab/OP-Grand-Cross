import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand, Move, Swords, Sparkles, X } from "lucide-react";
import { TEAL, AMBER, PANEL } from "@/lib/arcade";

const STORAGE_KEY = "opgv_battle_tutorial_v1";

export function shouldShowBattleTutorial() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "done";
  } catch {
    return true;
  }
}

export function markBattleTutorialDone() {
  try {
    localStorage.setItem(STORAGE_KEY, "done");
  } catch {
    /* ignore */
  }
}

const STEPS = [
  {
    icon: Sparkles,
    title: "Benvenuto in battaglia",
    body: "Usa le carte abilità della mano per riempire gli slot azione. Quando gli slot sono pieni, il turno parte.",
  },
  {
    icon: Hand,
    title: "Tocca per giocare",
    body: "Tocca una carta: esce dalla mano e va nello slot. Usa Annulla per ripristinare la mano del turno.",
  },
  {
    icon: Move,
    title: "Fondere le carte",
    body: "Due carte uguali vicine si fondono da sole (★ → ★★ → ★★★), anche dopo averne giocata una in mezzo. Trascina per riordinare (costa 1 slot).",
  },
  {
    icon: Swords,
    title: "Esegui il turno",
    body: "Con almeno una carta negli slot, tocca la barra slot per attaccare. Se li riempi tutti, parte da solo.",
  },
];

/**
 * Overlay tutorial primo combattimento (una volta).
 */
export default function BattleTutorial({ open, onDone }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step >= STEPS.length - 1;

  function finish() {
    markBattleTutorialDone();
    onDone?.();
  }

  function next() {
    if (isLast) finish();
    else setStep((s) => s + 1);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className={`relative w-full max-w-md rounded-2xl ${TEAL} ${PANEL} p-5`}
          >
            <button
              type="button"
              onClick={finish}
              className="absolute right-3 top-3 rounded-lg border-2 border-black bg-[#0b161b] p-1 text-[#f5a623]"
              aria-label="Chiudi tutorial"
            >
              <X size={14} />
            </button>

            <div className="mb-3 flex items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${AMBER} border-2 border-black`}>
                <Icon size={20} className="text-black" />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-[#f5a623]">
                  Tutorial · {step + 1}/{STEPS.length}
                </p>
                <h3 className="text-lg uppercase tracking-wide text-white">{current.title}</h3>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-white/85">{current.body}</p>

            <div className="mt-4 flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full border border-black ${i <= step ? AMBER : "bg-[#0b161b]"}`}
                />
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={finish}
                className="flex-1 rounded-2xl border-2 border-black bg-[#0b161b] py-2.5 text-xs uppercase tracking-wide text-[#f5a623]"
              >
                Salta
              </button>
              <button
                type="button"
                onClick={next}
                className={`flex-[1.4] rounded-2xl py-2.5 text-sm uppercase tracking-wide ${AMBER} ${PANEL}`}
              >
                <span className="font-bold text-black">{isLast ? "Inizia!" : "Avanti"}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
