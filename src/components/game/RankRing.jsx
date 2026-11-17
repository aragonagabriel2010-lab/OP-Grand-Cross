import { cn } from "@/lib/utils";

/**
 * Cerchio Rank con anello XP — SVG padded (niente clip) + centro allineato.
 */
export default function RankRing({ level = 1, pct = 0, size = 48, className, compact = false }) {
  const vb = 100;
  const stroke = 9;
  const r = (vb - stroke) / 2 - 1; // lascia margine al bordo del viewBox
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const dash = (clamped / 100) * c;
  // Centro interno: sotto l’anello, con gap costante
  const innerPct = ((r - stroke / 2 - 3) / (vb / 2)) * 100;

  return (
    <div
      className={cn("relative shrink-0 overflow-visible", className)}
      style={{ width: size, height: size }}
      title={`Rank ${level} · ${Math.round(clamped)}%`}
      aria-label={`Rank ${level}, progresso ${Math.round(clamped)} percento`}
    >
      <svg
        viewBox={`0 0 ${vb} ${vb}`}
        width={size}
        height={size}
        className="absolute inset-0 block overflow-visible"
        aria-hidden="true"
      >
        <g transform={`rotate(-90 ${vb / 2} ${vb / 2})`}>
          {/* Traccia vuota */}
          <circle
            cx={vb / 2}
            cy={vb / 2}
            r={r}
            fill="none"
            stroke="#0b161b"
            strokeWidth={stroke}
          />
          {/* Bordo esterno sottile */}
          <circle
            cx={vb / 2}
            cy={vb / 2}
            r={r + stroke / 2}
            fill="none"
            stroke="#000"
            strokeWidth={2}
          />
          {/* Progresso XP */}
          <circle
            cx={vb / 2}
            cy={vb / 2}
            r={r}
            fill="none"
            stroke="#f5a623"
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${dash} ${Math.max(0, c - dash)}`}
            style={{ transition: "stroke-dasharray 0.4s ease" }}
          />
        </g>
      </svg>

      <div
        className="absolute flex flex-col items-center justify-center rounded-full border-2 border-black bg-[#f5a623] shadow-[0_2px_0_0_#000]"
        style={{
          top: `${50 - innerPct / 2}%`,
          left: `${50 - innerPct / 2}%`,
          width: `${innerPct}%`,
          height: `${innerPct}%`,
        }}
      >
        <span className="text-[6px] font-bold uppercase leading-none text-black/55 sm:text-[7px]">
          Rank
        </span>
        <span
          className={cn(
            "font-black leading-none text-black",
            compact ? "text-[13px]" : "text-[15px]"
          )}
        >
          {level}
        </span>
      </div>
    </div>
  );
}
