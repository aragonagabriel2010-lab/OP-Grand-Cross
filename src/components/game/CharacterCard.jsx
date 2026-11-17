import { cn } from "@/lib/utils";
import RarityStars from "./RarityStars";
import { ATTRIBUTE_INFO, RARITY_GLOW } from "@/lib/gameUtils";

/**
 * Arte personaggio: bounty poster (pirati) / riquadro Marina / etc. via image_url.
 * Sempre a figura intera nel riquadro rettangolare.
 */
export function CharacterArt({ character, className, variant = "avatar" }) {
  const raw = character?.image_url;
  if (raw) {
    const src = raw.startsWith("http")
      ? raw
      : `${import.meta.env.BASE_URL}${raw.replace(/^\//, "")}`;
    return (
      <img
        src={src}
        alt={character.char_name}
        className={cn("object-contain object-center", className)}
        draggable={false}
      />
    );
  }
  const initial = character?.char_name?.[0] || "?";
  return (
    <div
      className={cn("relative flex items-center justify-center overflow-hidden", className)}
      style={{
        background: `radial-gradient(circle at 35% 30%, ${character?.color || "#64748b"}cc, ${character?.color || "#334155"} 55%, #0b161b)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(0,0,0,0.18) 6px, rgba(0,0,0,0.18) 7px)",
        }}
      />
      <span
        className="relative text-4xl font-black text-white/95"
        style={{ textShadow: "0 2px 0 #000, 0 0 12px rgba(255,255,255,0.25)" }}
      >
        {initial}
      </span>
    </div>
  );
}

/** Cornice taglia / poster — rettangolo verticale [] */
export const PORTRAIT_FRAME =
  "relative aspect-[3/4] w-full overflow-hidden rounded-lg border-2 border-black bg-[#0b161b] shadow-[0_3px_0_0_#000]";

export default function CharacterCard({ character, owned, onClick, className, selected, compact }) {
  if (!character) return null;
  const attr = ATTRIBUTE_INFO[character.attribute] || {};
  const glow = RARITY_GLOW[character.rarity];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("group relative flex flex-col items-center gap-1", className)}
    >
      <div className="relative w-full">
        <div
          className={cn(
            PORTRAIT_FRAME,
            "transition-transform duration-200 group-hover:-translate-y-0.5",
            selected && "ring-2 ring-[#f5a623]",
            character.rarity === "SSR" && "rarity-ring-ssr",
            character.rarity === "SR" && "rarity-ring-sr"
          )}
          style={
            character.rarity === "SSR" || character.rarity === "SR"
              ? undefined
              : { boxShadow: `0 3px 0 0 #000, 0 0 8px ${glow}` }
          }
        >
          <CharacterArt character={character} className="h-full w-full" variant="avatar" />
        </div>
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded bg-[#0b161b] px-1">
          <RarityStars rarity={character.rarity} size={11} />
        </div>
        <div
          className="absolute -bottom-1 -left-1 flex h-6 w-6 items-center justify-center rounded border-2 border-black text-[10px]"
          style={{ background: attr.color }}
        >
          <span>{attr.icon}</span>
        </div>
        {owned && !compact && (
          <div className="absolute -bottom-1 -right-1 rounded border border-black bg-[#f5a623] px-1 py-0.5 text-[8px] font-bold text-black">
            L{owned.level}
          </div>
        )}
      </div>
      <p
        className="w-full truncate text-center text-[11px] font-bold uppercase text-white"
        style={{ textShadow: "0 1px 0 #000" }}
      >
        {character.char_name}
      </p>
      <p className="w-full truncate text-center text-[9px] uppercase text-[#f5a623]">{character.version}</p>
    </button>
  );
}
