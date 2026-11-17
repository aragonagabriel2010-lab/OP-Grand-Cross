import { useState } from "react";
import { motion } from "framer-motion";
import { ATTRIBUTE_INFO, STAR_RANKS } from "@/lib/gameUtils";
import { CharacterArt } from "@/components/game/CharacterCard";
import { Swords, Heart, Shield, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Categorie leggibili a colpo d'occhio (stile Grand Cross):
 * Rosso attacco · Verde buff/cura · Blu difesa · Viola speciale/ult
 */
export function moveTypeMeta(type, { isUlt = false } = {}) {
  if (isUlt || type === "ult" || type === "special") {
    return {
      key: "special",
      Icon: Sparkles,
      label: "Speciale",
      color: "#c084fc",
      tint: "#4c1d95",
      powerSuffix: "DMG",
    };
  }
  switch (type) {
    case "heal":
      return {
        key: "buff",
        Icon: Heart,
        label: "Cura",
        color: "#4ade80",
        tint: "#14532d",
        powerSuffix: "HP",
      };
    case "buff":
      return {
        key: "buff",
        Icon: Zap,
        label: "Buff",
        color: "#4ade80",
        tint: "#14532d",
        powerSuffix: "FX",
      };
    case "defend":
    case "defense":
    case "guard":
      return {
        key: "defense",
        Icon: Shield,
        label: "Difesa",
        color: "#60a5fa",
        tint: "#1e3a8a",
        powerSuffix: "DEF",
      };
    case "attack":
    default:
      return {
        key: "attack",
        Icon: Swords,
        label: "Attacco",
        color: "#f87171",
        tint: "#7f1d1d",
        powerSuffix: "DMG",
      };
  }
}

function formatMoveName(name = "") {
  return String(name).trim().toUpperCase();
}

/** Spezza i nomi lunghi in 2 righe (es. GOMU GOMU / NO GATLING) */
function formatMoveNameMultiline(name = "") {
  const t = formatMoveName(name);
  if (t.length <= 11) return t;
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const mid = Math.ceil(parts.length / 2);
    return `${parts.slice(0, mid).join(" ")}\n${parts.slice(mid).join(" ")}`;
  }
  const cut = Math.ceil(t.length / 2);
  return `${t.slice(0, cut)}\n${t.slice(cut)}`;
}

/**
 * Carta abilità — riconoscimento rapido per colore/icona, nome dominante, danno secondario.
 */
export default function SkillCard({
  member,
  move,
  stars = 1,
  selected,
  isUlt,
  advantage = 1,
  onClick,
  merging = false,
  className,
}) {
  const [tip, setTip] = useState(false);
  const attr = ATTRIBUTE_INFO[member?.character?.attribute] || {};
  const rank = STAR_RANKS[stars] || STAR_RANKS[1];
  const typeMeta = moveTypeMeta(move?.type, { isUlt });
  const { Icon, label, color, key: typeKey } = typeMeta;
  const effectText = move?.description || move?.effect || null;
  const rankKey = stars >= 3 ? "gold" : stars === 2 ? "silver" : "bronze";

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
      animate={merging ? { scale: [1, 1.08, 1] } : undefined}
      transition={{ duration: 0.45 }}
      className={cn(
        "skill-card-7ds",
        `skill-card-7ds--${rankKey}`,
        `skill-card-7ds--type-${typeKey}`,
        selected && "skill-card-7ds--selected",
        merging && "skill-card-7ds--merging",
        className
      )}
      style={{
        "--rank-frame": rank.frame,
        "--rank-light": rank.frameLight,
        "--rank-glow": rank.glow,
        "--type-color": color,
        "--type-tint": typeMeta.tint,
      }}
    >
      <span className="skill-card-7ds__bevel" aria-hidden="true" />
      <span className="skill-card-7ds__sheen" aria-hidden="true" />
      <span className="skill-card-7ds__type-wash" aria-hidden="true" />

      {/* Stelle rank (unica riga in alto) */}
      <div className="skill-card-7ds__pips" aria-label={`Rank ${stars} stelle`}>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn("skill-card-7ds__pip", n <= stars && "skill-card-7ds__pip--on")}
          >
            ★
          </span>
        ))}
      </div>

      {/* Illustrazione */}
      <div className="skill-card-7ds__art">
        <div className="skill-card-7ds__art-contrast" aria-hidden="true" />
        <div className="skill-card-7ds__art-zoom">
          {member?.character ? (
            <CharacterArt character={member.character} className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-white/40">?</div>
          )}
        </div>
        <div className="skill-card-7ds__art-shade" aria-hidden="true" />
        {isUlt && <span className="skill-card-7ds__ult">ULT</span>}
      </div>

      {/* Nome dominante */}
      <p className="skill-card-7ds__name" title={formatMoveName(move?.name || label)}>
        {formatMoveNameMultiline(move?.name || label)}
      </p>

      <span className="skill-card-7ds__cat">{label}</span>

      {/* Icona tipo in basso a destra — il danno reale dipende da ATK/DEF/Lv/equip */}
      <div className="skill-card-7ds__footer">
        <div className="skill-card-7ds__type-badge" aria-label={label} title={label}>
          <Icon size={18} strokeWidth={2.6} />
        </div>
      </div>

      {advantage > 1 && <span className="skill-card-7ds__adv skill-card-7ds__adv--up">↑</span>}
      {advantage < 1 && <span className="skill-card-7ds__adv skill-card-7ds__adv--down">↓</span>}

      <div
        className={cn(
          "pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-30 hidden w-44 -translate-x-1/2 rounded-xl border-2 border-black bg-[#0b161b] p-2 shadow-[0_4px_0_0_#000] transition-opacity sm:block",
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
          <span className="text-[8px] uppercase text-white/70">
            {attr.label || member?.character?.attribute}
          </span>
          <span className="ml-auto flex items-center gap-0.5 text-[8px] uppercase text-white/50">
            <Icon size={10} style={{ color }} />
            {label}
          </span>
        </div>
        {effectText && (
          <p className="mt-1.5 text-[8px] leading-snug text-white/65">{effectText}</p>
        )}
        <p className="mt-1 text-[8px] uppercase tracking-wide text-white/45">
          Potenza da prestazioni
        </p>
      </div>
    </motion.div>
  );
}
