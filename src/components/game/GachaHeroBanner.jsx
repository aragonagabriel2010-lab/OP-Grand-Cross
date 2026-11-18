import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function asset(path) {
  return `${import.meta.env.BASE_URL}${String(path).replace(/^\//, "")}`;
}

/**
 * Banner Gacha “Rotta Verso Il Grand Line” — testo in basso a destra + sheen.
 */
export default function GachaHeroBanner({
  onRates,
  title = "Rotta Verso Il Grand Line",
  eyebrow = "Recluta ciurma",
  subtitle = "Dalle comuni alle mitiche SSR",
  className,
}) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {onRates && (
        <button
          type="button"
          onClick={onRates}
          className="absolute left-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-[#0b161b] text-[#f5a623] shadow-[0_2px_0_0_#000]"
          aria-label="Tassi di drop"
        >
          <HelpCircle size={18} />
        </button>
      )}

      <div className="relative aspect-[16/9] min-h-[10rem] w-full overflow-hidden sm:min-h-[11rem]">
        <img
          src={asset("banners/rotta-grand-line/banner1.jpg")}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-[#0b161b]/75 via-[#0b161b]/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0b161b]/70 to-transparent" />

        {/* Sheen lento tipo 7DS */}
        <motion.div
          className="pointer-events-none absolute inset-y-0 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/18 to-transparent"
          animate={{ left: ["-40%", "120%"] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.2 }}
        />

        <motion.div
          className="relative z-10 flex h-full flex-col items-end justify-end p-3.5 text-right sm:p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#f5a623]">{eyebrow}</p>
          <h2
            className="mt-1 max-w-[85%] text-xl uppercase leading-none text-white sm:text-2xl"
            style={{ textShadow: "0 2px 0 #000, 0 0 12px rgba(0,0,0,0.5)" }}
          >
            {title}
          </h2>
          <p className="mt-1.5 max-w-[90%] text-[10px] uppercase tracking-wide text-white/80 sm:text-[11px]">
            {subtitle}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
