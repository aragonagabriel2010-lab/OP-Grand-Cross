import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

function asset(path) {
  const clean = String(path || "").replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${clean}`;
}

const BANNERS = [
  {
    id: "rotta",
    eyebrow: "Reclutamento",
    title: "Rotta Verso Il Grand Line",
    subtitle: "Nuovo banner · SR+ in ×10",
    cta: "Recluta",
    to: "/gacha",
    image: "banners/rotta-grand-line/banner1.jpg",
    textRight: true,
    gradient: "from-transparent via-[#0b161b]/10 to-[#0b161b]/65",
    accent: "#f5a623",
  },
  {
    id: "bundle",
    eyebrow: "Offerta limitata",
    title: "Nuovo Bundle!",
    subtitle: "Fragole bonus · materiali di risveglio",
    cta: "Apri Gacha",
    to: "/gacha",
    image: "banners/bundle-banner.jpg",
    gradient: "from-[#3b1d0a]/75 via-[#164446]/35 to-transparent",
    accent: "#f5a623",
  },
  {
    id: "story",
    eyebrow: "Avventura",
    title: "Più livelli storia!",
    subtitle: "Nuove isole sul serpentone · Hard mode",
    cta: "Vai a Fight",
    to: "/fight",
    // Smoker: arte preferita, non sostituire
    image: "bounty/smoker-marine.jpg",
    gradient: "from-[#0a1f3b]/90 via-[#164446]/50 to-[#0b161b]/95",
    accent: "#38bdf8",
  },
  {
    id: "login",
    eyebrow: "Ogni giorno",
    title: "Bonus login mensile",
    subtitle: "Ritira i Beri · i giorni saltati sono persi",
    cta: "Missioni",
    to: null,
    action: "missions",
    image: "banners/login-banner.jpg",
    gradient: "from-[#3b2a0a]/75 via-[#164446]/30 to-transparent",
    accent: "#f5a623",
  },
];

/**
 * Carosello annunci Home — banner grandi con arte + testo, auto-scroll.
 */
export default function HomeBannerCarousel({ onOpenMissions, className }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = BANNERS.length;
  const banner = BANNERS[index];

  const go = useCallback(
    (dir) => {
      setIndex((i) => (i + dir + n) % n);
    },
    [n]
  );

  useEffect(() => {
    if (paused) return undefined;
    const id = window.setInterval(() => go(1), 4200);
    return () => window.clearInterval(id);
  }, [paused, go, index]);

  function activate(b) {
    if (b.action === "missions") {
      onOpenMissions?.();
      return;
    }
    if (b.to) navigate(b.to);
  }

  return (
    <section
      className={cn("relative", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="relative h-[9.5rem] overflow-hidden rounded-2xl border-[3px] border-black shadow-[0_4px_0_0_#000] sm:h-[10.5rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.button
            key={banner.id}
            type="button"
            onClick={() => activate(banner)}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="absolute inset-0 block w-full text-left"
            aria-label={`${banner.title}. ${banner.cta}`}
          >
            <img
              src={asset(banner.image)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_20%]"
              draggable={false}
            />
            <div
              className={cn(
                "absolute inset-0",
                banner.textRight ? "bg-gradient-to-l" : "bg-gradient-to-r",
                banner.gradient
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />

            <div
              className={cn(
                "relative z-10 flex h-full max-w-[88%] flex-col justify-end p-3.5 sm:p-4",
                banner.textRight ? "ml-auto items-end text-right" : "items-start text-left"
              )}
            >
              <p
                className="text-[9px] font-bold uppercase tracking-[0.18em]"
                style={{ color: banner.accent }}
              >
                {banner.eyebrow}
              </p>
              <h2
                className="mt-0.5 text-xl font-black uppercase leading-none tracking-wide text-white sm:text-2xl"
                style={{ textShadow: "0 2px 0 #000, 0 0 18px rgba(0,0,0,0.55)" }}
              >
                {banner.title}
              </h2>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-white/80 sm:text-[11px]">
                {banner.subtitle}
              </p>
              <span
                className="mt-2 inline-flex w-fit items-center rounded-lg border-2 border-black px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-black shadow-[0_2px_0_0_#000]"
                style={{ background: banner.accent }}
              >
                {banner.cta}
              </span>
            </div>
          </motion.button>
        </AnimatePresence>

        {/* Wrapper tiene il centro; data-no-lift evita che l'hover arcade sovrascriva -translate-y-1/2 */}
        <div className="pointer-events-none absolute inset-y-0 left-1.5 z-20 flex items-center">
          <button
            type="button"
            data-no-lift
            aria-label="Annuncio precedente"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-black/55 text-sm font-black text-[#f5a623]"
          >
            ‹
          </button>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-1.5 z-20 flex items-center">
          <button
            type="button"
            data-no-lift
            aria-label="Annuncio successivo"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-black/55 text-sm font-black text-[#f5a623]"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5">
        {BANNERS.map((b, i) => (
          <button
            key={b.id}
            type="button"
            aria-label={`Vai a ${b.title}`}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 rounded-full border border-black transition-all",
              i === index ? "w-5 bg-[#f5a623]" : "w-1.5 bg-[#164446]"
            )}
          />
        ))}
      </div>
    </section>
  );
}
