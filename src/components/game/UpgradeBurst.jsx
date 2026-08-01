import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

/**
 * Overlay VFX per level-up / risveglio — glow, anelli, floaters, confetti.
 * mode: "level" | "ascend"
 */
export default function UpgradeBurst({ open, mode = "level", level, ascension, onDone }) {
  useEffect(() => {
    if (!open) return;

    const colors =
      mode === "ascend"
        ? ["#f5a623", "#c084fc", "#e879f9", "#ffffff"]
        : mode === "ultimate"
          ? ["#f5a623", "#fbbf24", "#ffffff", "#164446"]
          : ["#f5a623", "#fbbf24", "#164446", "#ffffff"];

    const burst = (opts) =>
      confetti({
        particleCount: mode === "ascend" ? 90 : mode === "ultimate" ? 75 : 55,
        spread: mode === "ascend" ? 100 : 70,
        origin: { x: 0.5, y: 0.32 },
        colors,
        disableForReducedMotion: true,
        ...opts,
      });

    burst({ startVelocity: 38 });
    const t1 = setTimeout(() => burst({ startVelocity: 28, particleCount: 35 }), 180);
    const t2 = setTimeout(() => {
      if (mode === "ascend") {
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 55,
          origin: { x: 0.2, y: 0.4 },
          colors,
        });
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 55,
          origin: { x: 0.8, y: 0.4 },
          colors,
        });
      }
    }, 280);

    const done = setTimeout(() => onDone?.(), mode === "ascend" ? 2200 : mode === "ultimate" ? 1800 : 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(done);
    };
  }, [open, mode, onDone]);

  const label = mode === "ascend" ? `RISVEGLIO ${ascension}` : mode === "ultimate" ? `ULTI Lv.${level}` : `LIVELLO ${level}`;
  const sub =
    mode === "ascend"
      ? "Potere risvegliato!"
      : mode === "ultimate"
        ? "Ultimate potenziata!"
        : "Potenziamento riuscito!";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[60] flex items-start justify-center pt-[18vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Flash */}
          <motion.div
            className={`absolute inset-0 ${mode === "ascend" ? "bg-fuchsia-500/20" : "bg-[#f5a623]/15"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.55, times: [0, 0.2, 1] }}
          />

          <div className="relative flex flex-col items-center">
            {/* Pulse rings */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`absolute left-1/2 top-8 h-28 w-28 -translate-x-1/2 rounded-full border-2 ${
                  mode === "ascend" ? "border-fuchsia-400" : "border-[#f5a623]"
                }`}
                initial={{ scale: 0.4, opacity: 0.9 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 1.1, delay: i * 0.15, ease: "easeOut" }}
              />
            ))}

            <motion.div
              className={`upgrade-burst-glow relative rounded-2xl border-2 border-black px-6 py-3 shadow-[0_4px_0_0_#000] ${
                mode === "ascend"
                  ? "bg-[#3b0a3a] text-[#f5a623]"
                  : mode === "ultimate"
                    ? "bg-black text-[#f5a623]"
                    : "bg-[#f5a623] text-black"
              }`}
              initial={{ scale: 0.5, y: 20, rotate: -6 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 16 }}
            >
              <p className="text-center text-xl uppercase tracking-wide" style={{ textShadow: mode === "ascend" ? "0 0 12px rgba(245,166,35,0.8)" : "0 2px 0 rgba(0,0,0,0.25)" }}>
                {label}
              </p>
              <p className={`text-center text-[10px] uppercase tracking-widest ${mode === "ascend" ? "text-fuchsia-200" : "text-black/70"}`}>
                {sub}
              </p>
            </motion.div>

            {/* Floating sparks */}
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className={`absolute h-2 w-2 rounded-full ${mode === "ascend" ? "bg-fuchsia-300" : "bg-[#f5a623]"}`}
                  style={{ left: "50%", top: "2.5rem", boxShadow: `0 0 8px ${mode === "ascend" ? "#e879f9" : "#f5a623"}` }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(angle) * 70,
                    y: Math.sin(angle) * 70 - 10,
                    opacity: 0,
                    scale: 0.2,
                  }}
                  transition={{ duration: 0.9, delay: 0.05 * i, ease: "easeOut" }}
                />
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
