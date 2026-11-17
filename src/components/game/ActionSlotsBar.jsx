import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftRight, Move, Anchor } from "lucide-react";
import { STAR_RANKS } from "@/lib/gameUtils";
import { CharacterArt } from "@/components/game/CharacterCard";
import { TEAL, AMBER } from "@/lib/arcade";
import { cn } from "@/lib/utils";

/**
 * Pedane d'azione + COMBATTI + SUB (solo se c'è riserva).
 */
export default function ActionSlotsBar({
  maxSlots,
  actionQueue,
  teamMembers,
  bench = null,
  dropProvided,
  isDraggingOver,
  canConfirm = false,
  slotsFull = false,
  onConfirm,
  className,
}) {
  const slots = Array.from({ length: Math.max(0, maxSlots) }, (_, i) => actionQueue[i] || null);
  const hasSub = !!bench?.character;

  return (
    <div className={cn("action-play-zone", className)}>
      <div className="action-play-zone__row">
        <div
          ref={dropProvided?.innerRef}
          {...(dropProvided?.droppableProps || {})}
          className={cn(
            "action-pedestals relative flex items-end justify-center gap-2",
            isDraggingOver && "action-pedestals--over",
            slotsFull && "action-pedestals--full"
          )}
        >
          {slots.map((action, i) => (
            <ActionPedestal
              key={`slot-${i}`}
              index={i}
              action={action}
              teamMembers={teamMembers}
            />
          ))}
          {maxSlots === 0 && (
            <p className="py-2 text-[10px] uppercase text-white/50">—</p>
          )}
          <div className="action-slots-bar__placeholder" aria-hidden="true">
            {dropProvided?.placeholder}
          </div>
        </div>

        <CombattiButton
          filled={actionQueue.length}
          max={maxSlots}
          ready={canConfirm}
          glow={slotsFull}
          onConfirm={onConfirm}
        />

        {hasSub && (
          <div
            className="battle-sub-slot"
            title={bench.character.char_name}
            aria-label={`Riserva: ${bench.character.char_name}`}
          >
            <span className="battle-sub-badge__tag">SUB</span>
            <div className="battle-sub-badge__ring">
              <CharacterArt
                character={bench.character}
                className="h-full w-full !object-cover object-top"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CombattiButton({ filled, max, ready, glow, onConfirm }) {
  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => ready && onConfirm?.()}
      className={cn(
        "combatti-anchor",
        ready && "combatti-anchor--armed",
        glow && "combatti-anchor--ready",
        !ready && "combatti-anchor--idle"
      )}
      aria-label="Combatti"
    >
      <span className="combatti-anchor__ring" aria-hidden="true" />
      <span className="combatti-anchor__glow" aria-hidden="true" />
      <Anchor size={22} strokeWidth={2.5} className="combatti-anchor__icon" />
      <span className="combatti-anchor__count">
        {filled}/{max}
      </span>
      <span className="combatti-anchor__label">Combatti!</span>
    </button>
  );
}

function ActionPedestal({ index, action, teamMembers }) {
  const state = !action ? "empty" : action.type === "move" ? "move" : "play";
  const tile = action?.tile;
  const member = tile ? teamMembers[tile.charIndex] : null;
  const move = member?.character?.moves?.[tile?.moveIndex];
  const stars = tile?.stars || 1;
  const rank = STAR_RANKS[stars] || STAR_RANKS[1];

  return (
    <motion.div
      className={cn("action-pedestal", `action-pedestal--${state}`)}
      initial={{ scale: 0.9, opacity: 0.75 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
      aria-label={`Slot ${index + 1}: ${state}`}
    >
      <span className="action-pedestal__glow" aria-hidden="true" />
      <AnimatePresence mode="wait">
        {state === "empty" && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="action-pedestal__body"
          >
            <span className="action-pedestal__hint">{index + 1}</span>
            <span className="action-pedestal__drop">Slot</span>
          </motion.div>
        )}
        {state === "move" && (
          <motion.div
            key="move"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="action-pedestal__body"
          >
            <Move size={18} className="text-[#f5a623]" />
            <ArrowLeftRight size={12} className="text-white/70" />
          </motion.div>
        )}
        {state === "play" && member && move && (
          <motion.div
            key={action.id}
            initial={{ y: 16, scale: 0.7, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="action-pedestal__body action-pedestal__body--play"
            style={{ boxShadow: `0 0 14px ${rank.glow}` }}
          >
            <div
              className="h-10 w-8 overflow-hidden rounded-md border-2 border-black"
              style={{ borderColor: rank.frameLight }}
            >
              <CharacterArt character={member.character} className="h-full w-full !object-cover" />
            </div>
            <span className="action-pedestal__stars" style={{ color: rank.frameLight }}>
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
      <span className="text-white/80">Vicine = fusione</span>
      <span className="text-[#f5a623]">·</span>
      <span className={`rounded px-1 text-black ${AMBER}`}>Ancora</span>
    </div>
  );
}
