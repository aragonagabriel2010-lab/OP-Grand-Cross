import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { RARITY_STARS, RARITY_COLORS } from "@/lib/gameUtils";

export default function RarityStars({ rarity, size = 12, className }) {
  const count = RARITY_STARS[rarity] || 1;
  return (
    <div className={cn("flex gap-0.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={2}
          className="fill-amber-400 text-amber-400 drop-shadow-[0_0_3px_rgba(245,158,11,0.6)]"
        />
      ))}
    </div>
  );
}