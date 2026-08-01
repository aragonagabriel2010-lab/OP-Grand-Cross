import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftRight, Move, Swords, Heart, Shield, Brain, Zap } from "lucide-react";
import { STAR_RANKS } from "@/lib/gameUtils";
import { TEAL, AMBER } from "@/lib/arcade";
import { cn } from "@/lib/utils";

function slotMoveIcon(type) {
  switch (type) {
    case "attack":
      return Swords;
    case "heal":
      return Heart;
    case "defend":
    case "defense":
    case "guard":
      return Shield;
    case "buff":
      return Brain;
    default:
      return Zap;
  }
}

/**
 * Slot azione — layout compatto verticale (sidebar destra) o barra orizzontale.
 */
export default function ActionSlotsBar({
  maxSlots,
  actionQueue,
  teamMembers,
  dropProvided,
  isDraggingOver,
  canConfirm = false,
  onConfirm,
  onReturnPlay,
  compact = false,
  className,
}) {
  const slots = Array.from({ length: Math.max(0, maxSlots) }, (_, i) => actionQueue[i] || null);

  return (
    <div
      ref={dropProvided?.innerRef}
      {...(dropProvided?.droppableProps || {})}
      role={canConfirm ? "button" : undefined}
      tabIndex={canConfirm ? 0 : undefined}
      onClick={() => {
        if (canConfirm) onConfirm?.();
      }}
      onKeyDown={(e) => {
        if (!canConfirm) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onConfirm?.();
        }
      }}
      className={cn(
        compact ? "action-slots-bar action-slots-bar--compact" : "action-slots-bar",
        isDraggingOver && "action-slots-bar--over",
        canConfirm && "action-slots-bar--ready",
        className
      )}
    >
      {!compact && (
        <div className="mb-1 flex items-center justify-between px-0.5">
          <span className="text-[9px] uppercase tracking-widest text-[#f5a623]">
            Slot {actionQueue.length}/{maxSlots}
          </span>
          <span className="text-[8px] uppercase tracking-wide text-white/45">
            {canConfirm ? "Esegui" : "Gioca"}
          </span>
        </div>
      )}
      {compact && (
        <div className="mb-1 text-center text-[7px] uppercase tracking-widest text-[#f5a623]">
          {actionQueue.length}/{maxSlots}
          {canConfirm ? " · Go" : ""}
        </div>
      )}
      <div
        className={cn(
          compact ? "flex flex-col items-center gap-1.5" : "flex items-stretch justify-center gap-2"
        )}
      >
        {slots.map((action, i) => (
          <ActionSlot
            key={`slot-${i}`}
            index={i}
            action={action}
            teamMembers={teamMembers}
            onReturnPlay={onReturnPlay}
            compact={compact}
          />
        ))}
        {maxSlots === 0 && (
          <p className="py-2 text-[10px] uppercase text-white/50">—</p>
        )}
      </div>
      {dropProvided?.placeholder}
    </div>
  );
}

function ActionSlot({ index, action, teamMembers, onReturnPlay, compact }) {
  const state = !action ? "empty" : action.type === "move" ? "move" : "play";
  const tile = action?.tile;
  const member = tile ? teamMembers[tile.charIndex] : null;
  const move = member?.character?.moves?.[tile?.moveIndex];
  const stars = tile?.stars || 1;
  const rank = STAR_RANKS[stars] || STAR_RANKS[1];
  const canReturn = state === "play" && action?.cardId && onReturnPlay;

  return (
    <motion.div
      layout
      className={cn(
        "action-slot",
        compact && "action-slot--compact",
        `action-slot--${state}`,
        canReturn && "action-slot--returnable"
      )}
      initial={{ scale: 0.92, opacity: 0.7 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
      aria-label={`Slot ${index + 1}: ${state}`}
      role={canReturn ? "button" : undefined}
      tabIndex={canReturn ? 0 : undefined}
      onClick={(e) => {
        if (!canReturn) return;
        e.stopPropagation();
        onReturnPlay(action.cardId);
      }}
      onKeyDown={(e) => {
        if (!canReturn) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onReturnPlay(action.cardId);
        }
      }}
    >
      {!compact && <span className="action-slot__index">{index + 1}</span>}
      <AnimatePresence mode="wait">
        {state === "empty" && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="action-slot__body"
          >
            <span className="action-slot__dash" />
          </motion.div>
        )}
        {state === "move" && (
          <motion.div
            key="move"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="action-slot__body action-slot__body--move"
          >
            <Move size={compact ? 14 : 18} className="text-[#f5a623]" />
            {!compact && <ArrowLeftRight size={12} className="text-white/70" />}
            {!compact && <span className="action-slot__label">Sposta</span>}
          </motion.div>
        )}
        {state === "play" && member && move && (
          <motion.div
            key={action.id}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="action-slot__body action-slot__body--play"
            style={{ boxShadow: `0 0 8px ${rank.glow}` }}
          >
            {(() => {
              const Icon = slotMoveIcon(move.type);
              return (
                <div
                  className={cn(
                    "flex items-center justify-center rounded-lg border-2 border-black bg-[#0b161b]",
                    compact ? "h-7 w-7" : "h-9 w-9"
                  )}
                  style={{ borderColor: rank.frameLight }}
                >
                  <Icon size={compact ? 14 : 18} className="text-[#f5a623]" />
                </div>
              );
            })()}
            <span className="action-slot__stars" style={{ color: rank.frameLight }}>
              {"★".repeat(stars)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ActionSlotsLegend() {
  return (
    <div
      className={`flex shrink-0 items-center justify-center gap-x-2 rounded-lg ${TEAL} border-2 border-black px-2 py-0.5 text-[7px] uppercase tracking-wide`}
    >
      <span className="text-white/55">Tocca = gioca</span>
      <span className="text-[#f5a623]">·</span>
      <span className="text-white/80">Trascina = sposta/fondi</span>
      <span className="text-[#f5a623]">·</span>
      <span className={`rounded px-1 text-black ${AMBER}`}>Slot −1</span>
    </div>
  );
}
