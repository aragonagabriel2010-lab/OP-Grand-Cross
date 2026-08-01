import { useState } from "react";
import { motion } from "framer-motion";
import { ATTRIBUTE_INFO, STAR_RANKS, tileDamage, healMultiplier } from "@/lib/gameUtils";
import { Swords, Heart, Shield, Brain, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

function StarPips({ stars, size = "md" }) {
  const rank = STAR_RANKS[stars] || STAR_RANKS[1];
  const textSize = size === "sm" ? "text-[9px]" : "text-[11px]";
  return (
    <div className="flex items-center justify-center gap-0.5">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(textSize, "leading-none")}
          style={{
            color: n <= stars ? rank.frameLight : "rgba(255,255,255,0.18)",
            textShadow: n <= stars ? `0 0 6px ${rank.glow}` : "none",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function moveTypeMeta(type) {
  switch (type) {
    case "attack":
      return { Icon: Swords, label: "Attacco", color: "#f5a623" };
    case "heal":
      return { Icon: Heart, label: "Cura", color: "#f87171" };
    case "defend":
    case "defense":
    case "guard":
      return { Icon: Shield, label: "Difesa", color: "#60a5fa" };
    case "buff":
      return { Icon: Brain, label: "Buff", color: "#c084fc" };
    default:
      return { Icon: Zap, label: "Abilità", color: "#f5a623" };
  }
}

function cardPowerValue(member, move, stars) {
  if (!move || !member) return null;
  if (move.type === "attack") {
    return tileDamage(member.character, member.owned, move, stars);
  }
  if (move.type === "heal") {
    return Math.round(move.power * healMultiplier(stars));
  }
  return null;
}

/**
 * Carta abilità battaglia — icona tipo + stelle + danno/cura.
 * Hover (o focus) apre popup con dettagli.
 */
export default function SkillCard({
  member,
  move,
  stars = 1,
  selected,
  isUlt,
  advantage = 1,
  displayPower,
  onClick,
  merging = false,
  className,
}) {
  const [tip, setTip] = useState(false);
  const attr = ATTRIBUTE_INFO[member?.character?.attribute] || {};
  const rank = STAR_RANKS[stars] || STAR_RANKS[1];
  const { Icon, label, color } = moveTypeMeta(move?.type);
  const power = displayPower ?? cardPowerValue(member, move, stars);
  const effectText = move?.description || move?.effect || null;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e);
        }
      }}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
      onFocus={() => setTip(true)}
      onBlur={() => setTip(false)}
      whileTap={onClick ? { scale: 0.96 } : undefined}
      animate={
        merging
          ? {
              scale: [1, 1.1, 1],
              boxShadow: [
                `0 3px 0 0 #000, 0 0 8px ${rank.glow}`,
                `0 3px 0 0 #000, 0 0 24px ${rank.glow}`,
                `0 3px 0 0 #000, 0 0 10px ${rank.glow}`,
              ],
            }
          : undefined
      }
      transition={{ duration: 0.55 }}
      className={cn(
        "group relative flex h-[5.75rem] w-[4.25rem] shrink-0 cursor-grab flex-col items-center justify-between overflow-visible rounded-xl border-[3px] px-1 py-1.5 active:cursor-grabbing",
        selected && "ring-2 ring-[#f5a623] ring-offset-1 ring-offset-[#0b161b] -translate-y-0.5",
        merging && "z-10",
        className
      )}
      style={{
        borderColor: selected ? "#f5a623" : rank.frameLight,
        boxShadow: selected
          ? `0 3px 0 0 #000, 0 0 14px ${rank.glow}`
          : `0 3px 0 0 #000, 0 0 8px ${rank.glow}`,
        background: `linear-gradient(160deg, #0d2a2c 0%, #164446 55%, #0b161b 100%)`,
      }}
    >
      {isUlt && (
        <span className="absolute -right-1 -top-1 z-10 rounded border border-black bg-[#f5a623] px-1 text-[6px] font-black text-black">
          ULT
        </span>
      )}

      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-black bg-[#0b161b]"
        style={{ boxShadow: `inset 0 0 10px ${color}33` }}
      >
        <Icon size={20} style={{ color }} strokeWidth={2.4} />
      </div>

      <StarPips stars={stars} size="sm" />

      <div className="flex min-h-[1rem] items-center justify-center">
        {power != null ? (
          <span className="text-[12px] font-black tabular-nums leading-none text-[#f5a623]">
            {move.type === "heal" ? `+${power}` : power}
          </span>
        ) : (
          <span className="text-[9px] font-bold uppercase text-white/35">{label.slice(0, 3)}</span>
        )}
      </div>

      {advantage > 1 && (
        <span className="absolute bottom-0.5 left-0.5 text-[9px] font-black text-lime-400">↑</span>
      )}
      {advantage < 1 && (
        <span className="absolute bottom-0.5 left-0.5 text-[9px] font-black text-red-400">↓</span>
      )}

      {/* Tooltip dettagli */}
      <div
        className={cn(
          "pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 w-40 -translate-x-1/2 rounded-xl border-2 border-black bg-[#0b161b] p-2 shadow-[0_4px_0_0_#000] transition-opacity",
          tip ? "opacity-100" : "opacity-0"
        )}
        style={{ fontFamily: "'Russo One', system-ui, sans-serif" }}
      >
        <p className="text-[10px] font-bold uppercase leading-tight text-white">{move?.name}</p>
        <p className="mt-0.5 truncate text-[8px] uppercase tracking-wide text-[#f5a623]">
          {member?.character?.char_name}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 border-t border-white/10 pt-1.5">
          <span
            className="flex h-5 w-5 items-center justify-center rounded border border-black text-[10px]"
            style={{ background: attr.color }}
          >
            {attr.icon}
          </span>
          <span className="text-[8px] uppercase text-white/70">{attr.label || member?.character?.attribute}</span>
          <span className="ml-auto flex items-center gap-0.5 text-[8px] uppercase text-white/50">
            <Icon size={10} style={{ color }} />
            {label}
          </span>
        </div>
        {effectText && (
          <p className="mt-1.5 text-[8px] leading-snug text-white/65">{effectText}</p>
        )}
        {power != null && (
          <p className="mt-1 text-[9px] font-bold tabular-nums text-[#f5a623]">
            {move.type === "heal" ? `Cura +${power}` : `Danno ${power}`}
          </p>
        )}
        <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-black bg-[#0b161b]" />
      </div>
    </motion.div>
  );
}
