import { cn } from "@/lib/utils";

export default function HealthBar({ current, max, color = "#22c55e", className, showText = false }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const low = pct < 30;
  return (
    <div className={cn("relative w-full h-3 rounded-full bg-black/50 overflow-hidden ring-1 ring-black/30", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500 ease-out", low && "animate-pulse")}
        style={{ width: `${pct}%`, background: low ? "#ef4444" : color, boxShadow: `0 0 8px ${low ? "#ef4444" : color}` }}
      />
      {showText && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
          {Math.max(0, Math.round(current))} / {Math.round(max)}
        </span>
      )}
    </div>
  );
}