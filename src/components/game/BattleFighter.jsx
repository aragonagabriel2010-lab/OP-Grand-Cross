import { motion, AnimatePresence } from "framer-motion";
import { Skull } from "lucide-react";
import { CharacterArt } from "@/components/game/CharacterCard";
import { cn } from "@/lib/utils";

/**
 * Unità arena — template unico per alleati e nemici:
 * nome → ritratto (stesso frame) → HP → gemme ulti (solo alleati)
 */
export default function BattleFighter({
  character,
  side = "ally",
  name,
  hp,
  maxHp,
  ultCharge = 0,
  ultMax = 6,
  level,
  alive = true,
  selected = false,
  floaters = [],
  onClick,
  disabled,
  className,
  depth = 0,
  /** { kind: 'strike'|'support', nudgeX?: number } mentre attacca/cura */
  lunge = null,
  struck = false,
}) {
  const pct = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
  const ready = ultCharge >= ultMax;
  const isEnemy = side === "enemy";
  const label = (name || character?.char_name || "?").toUpperCase();
  const gemCount = Math.min(5, ultMax || 5);
  const lunging = alive && !!lunge;
  const strikeY = isEnemy ? 46 : -52;
  const supportY = isEnemy ? 14 : -16;
  const nudgeX = Number(lunge?.nudgeX) || 0;

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "battle-fighter",
        isEnemy ? "battle-fighter--enemy" : "battle-fighter--ally",
        selected && "battle-fighter--selected",
        !alive && "battle-fighter--dead",
        lunging && "battle-fighter--lunge",
        struck && "battle-fighter--struck",
        className
      )}
      style={{ zIndex: 10 + (isEnemy ? depth : 0) + (lunging ? 20 : 0) }}
    >
      <p className="battle-fighter__name" title={label}>
        {label}
      </p>

      <div className="battle-fighter__stage">
        <span className="battle-fighter__shadow" aria-hidden="true" />
        <motion.div
          className="battle-fighter__sprite"
          animate={
            lunging
              ? {
                  y: lunge.kind === "support" ? supportY : strikeY,
                  x: nudgeX,
                  scale: lunge.kind === "support" ? 1.04 : 1.08,
                }
              : struck
                ? { x: [0, isEnemy ? 7 : -7, 0], y: 0, scale: 1 }
                : selected && alive
                  ? { y: [0, -3, 0], x: 0, scale: 1 }
                  : { y: 0, x: 0, scale: 1 }
          }
          transition={
            lunging
              ? { type: "spring", stiffness: 420, damping: 22 }
              : struck
                ? { duration: 0.28 }
                : selected && alive
                  ? { repeat: Infinity, duration: 1.05 }
                  : { type: "spring", stiffness: 380, damping: 26 }
          }
        >
          <div className="battle-fighter__frame">
            <CharacterArt
              character={character}
              className={cn("battle-fighter__art", !alive && "grayscale")}
            />
            {!alive && (
              <div className="battle-fighter__ko">
                <Skull size={22} className="text-white/85" />
              </div>
            )}
            {level != null && alive && !isEnemy && (
              <span className="battle-fighter__lv">L{level}</span>
            )}
            {selected && alive && <span className="battle-fighter__target">!</span>}
          </div>
        </motion.div>

        <AnimatePresence>
          {floaters.map((f) => (
            <motion.div
              key={f.id}
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{ y: -28, opacity: 0, scale: 1.08 }}
              exit={{ opacity: 0 }}
              className="battle-fighter__floater"
              style={{ color: f.crit ? "#f5a623" : isEnemy ? "#f5a623" : "#ef4444" }}
            >
              {f.crit ? "+" : "-"}
              {f.dmg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="battle-fighter__hud">
        <div className="battle-fighter__hp">
          <div
            className="battle-fighter__hp-fill"
            style={{
              width: `${pct}%`,
              background: !alive
                ? "#3b0a0a"
                : isEnemy
                  ? character?.color || "#ef4444"
                  : undefined,
            }}
          />
        </div>
        {!isEnemy && (
          <div className="battle-fighter__ult" aria-label={`Ultimate ${ultCharge}/${ultMax}`}>
            {Array.from({ length: gemCount }, (_, i) => {
              const filled = ultMax > 0 ? i < Math.round((ultCharge / ultMax) * gemCount) : false;
              return (
                <span
                  key={i}
                  className={cn(
                    "battle-fighter__gem",
                    filled && "battle-fighter__gem--on",
                    ready && "battle-fighter__gem--ready"
                  )}
                />
              );
            })}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
