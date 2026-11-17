import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Contatore che anima il delta quando value cambia */
export function StatTicker({ value, className }) {
  const prev = useRef(value);
  const [delta, setDelta] = useState(null);

  useEffect(() => {
    if (value !== prev.current) {
      const d = value - prev.current;
      if (d !== 0) {
        setDelta(d);
        const t = setTimeout(() => setDelta(null), 900);
        prev.current = value;
        return () => clearTimeout(t);
      }
      prev.current = value;
    }
  }, [value]);

  return (
    <div className={`relative ${className || ""}`}>
      <motion.p
        key={value}
        initial={{ scale: 1.25, color: "#f5a623" }}
        animate={{ scale: 1, color: "#ffffff" }}
        transition={{ duration: 0.45 }}
        className="text-xl font-bold text-white"
      >
        {value}
      </motion.p>
      <AnimatePresence>
        {delta != null && (
          <motion.span
            className="absolute -right-1 -top-3 text-xs font-bold text-[#f5a623]"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: -8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            {delta > 0 ? `+${delta}` : delta}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
