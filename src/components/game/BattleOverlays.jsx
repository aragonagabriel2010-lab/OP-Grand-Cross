import { motion, AnimatePresence } from "framer-motion";
import { AMBER } from "@/lib/arcade";
import { starLabel } from "@/lib/battleHand";

/** Banner fusione stelle */
export function MergeBanner({ event }) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.1, y: -10 }}
          className="pointer-events-none absolute inset-x-0 top-[28%] z-[35] flex justify-center px-4"
        >
          <div
            className={`rounded-2xl border-[3px] border-black px-6 py-3 text-center shadow-[0_4px_0_0_#000] ${AMBER}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/70">Fusione</p>
            <p className="text-2xl font-black uppercase tracking-wide text-black">
              {event.intoStars}★ {starLabel(event.intoStars)}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Cinematica ultima */
export function UltCinematic({ event }) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[45] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 1.15, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
            className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border-[3px] border-[#f5a623] bg-gradient-to-br from-[#164446] via-[#0b161b] to-black p-6 text-center shadow-[0_0_40px_rgba(245,166,35,0.45)]"
          >
            <motion.p
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-[11px] uppercase tracking-[0.35em] text-[#f5a623]"
            >
              Ultimate
            </motion.p>
            <motion.h2
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 0.6 }}
              className="mt-2 text-3xl uppercase tracking-wide text-white"
              style={{ textShadow: "0 3px 0 #000, 0 0 20px rgba(245,166,35,0.5)" }}
            >
              {event.moveName}
            </motion.h2>
            <p className="mt-1 text-sm uppercase tracking-wide text-[#f5a623]">{event.charName}</p>
            {event.dmg != null && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-4 text-4xl font-black text-[#f5a623]"
                style={{ textShadow: "0 3px 0 #000" }}
              >
                −{event.dmg}
              </motion.p>
            )}
            <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-[#f5a623]/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -right-4 h-28 w-28 rounded-full bg-[#f5a623]/15 blur-2xl" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
