import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CharacterArt } from "@/components/game/CharacterCard";
import RarityStars from "@/components/game/RarityStars";
import { TEAL, AMBER, PANEL_SM } from "@/lib/arcade";
import { effectiveHp, effectiveAttack, ATTRIBUTE_INFO, RARITY_ORDER } from "@/lib/gameUtils";
import { AttributeIcon } from "@/components/game/AttributeIcons";
import { X, Plus, Heart, Swords, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIVE_SLOTS = [0, 1, 2];
const SUB_SLOT = 3;

function SlotCard({
  slot,
  member,
  charMap,
  selecting,
  onPick,
  onClear,
  label,
  sub,
  compact,
}) {
  const c = member ? charMap[member.character_id] : null;
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <button
        type="button"
        onClick={() => onPick(slot)}
        className={cn(
          "relative w-full rounded-xl border-2 border-black p-1.5 shadow-[0_3px_0_0_#000] transition-all",
          selecting ? AMBER : sub ? "bg-[#0d2430]" : "bg-[#0b161b]",
          selecting && "ring-2 ring-[#f5a623]/70"
        )}
      >
        <span
          className={cn(
            "absolute -top-2 left-1/2 z-[2] -translate-x-1/2 rounded border border-black px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide",
            sub ? "bg-[#38bdf8] text-black" : selecting ? "bg-black text-[#f5a623]" : AMBER
          )}
        >
          {label}
        </span>
        <div className="relative mt-1.5 w-full">
          {member && c ? (
            <>
              <div
                className={cn(
                  "relative aspect-[3/4] w-full overflow-hidden rounded-lg border-2 border-black bg-[#0d2a2c]",
                  sub && "ring-1 ring-[#38bdf8]/45"
                )}
              >
                <CharacterArt character={c} className="h-full w-full" />
              </div>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded bg-[#0b161b] px-0.5">
                <RarityStars rarity={c.rarity} size={compact ? 8 : 9} />
              </div>
              <div
                className={cn(
                  "absolute -bottom-1 -right-1 rounded border border-black px-1 py-0.5 text-[7px] font-bold",
                  selecting ? "bg-black text-[#f5a623]" : AMBER
                )}
              >
                L{member.level}
              </div>
            </>
          ) : (
            <div
              className={cn(
                "flex aspect-[3/4] w-full items-center justify-center rounded-lg border-2 border-dashed",
                selecting
                  ? "border-black bg-[#f5a623]/30 text-black"
                  : sub
                    ? "border-[#38bdf8]/40 bg-[#0a1c24] text-[#38bdf8]/70"
                    : "border-white/25 bg-[#0d2a2c] text-white/35"
              )}
            >
              <Plus size={18} />
            </div>
          )}
        </div>
        <p
          className={cn(
            "mt-1 w-full truncate text-center text-[8px] font-bold uppercase leading-tight",
            selecting ? "text-black" : "text-white"
          )}
        >
          {c ? c.char_name.split(" ").slice(-1)[0] : sub ? "—" : `${slot + 1}`}
        </p>
      </button>
      {member && (
        <button
          type="button"
          onClick={() => onClear(slot)}
          className="mt-1 text-[7px] uppercase tracking-wide text-red-400/90"
        >
          Rimuovi
        </button>
      )}
    </div>
  );
}

/** Equipaggio 3 in gioco + 1 sub in riga, picker a griglia. */
export default function TeamPanel({
  open,
  onClose,
  team,
  owned,
  charMap,
  pickingSlot,
  onPickSlot,
  onAssign,
  onClearSlot,
}) {
  const slots = [0, 1, 2, 3].map((i) => {
    const id = team[i];
    return id ? owned.find((o) => o.id === id) : null;
  });

  const activeOwned = slots.slice(0, 3);
  const totalHp = activeOwned.reduce(
    (s, o) => (o ? s + effectiveHp(charMap[o.character_id], o) : s),
    0
  );
  const totalAtk = activeOwned.reduce(
    (s, o) => (o ? s + effectiveAttack(charMap[o.character_id], o) : s),
    0
  );

  const pickerList = useMemo(
    () =>
      [...owned].sort((a, b) => {
        const ca = charMap[a.character_id];
        const cb = charMap[b.character_id];
        const ra = RARITY_ORDER.indexOf(ca?.rarity);
        const rb = RARITY_ORDER.indexOf(cb?.rarity);
        if (rb !== ra) return rb - ra;
        return (b.level || 1) - (a.level || 1);
      }),
    [owned, charMap]
  );

  const targetSlot =
    pickingSlot != null ? pickingSlot : [0, 1, 2, 3].find((i) => !team[i]) ?? 0;

  function pickCharacter(ownedId) {
    onAssign(targetSlot, ownedId);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/80 p-2.5 backdrop-blur-sm sm:p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className={`mx-auto flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl ${TEAL} border-2 border-black shadow-[0_6px_0_0_#000]`}
          >
            <div className="flex shrink-0 items-center justify-between border-b-2 border-black px-3 py-2.5 sm:px-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm uppercase tracking-wide text-white sm:text-base">
                  <Users size={15} className="text-[#f5a623]" /> Equipaggio
                </h2>
                <p className="text-[9px] uppercase tracking-widest text-[#f5a623]">
                  3 attivi · 1 sub al KO
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b] shadow-[0_2px_0_0_#000]"
              >
                <X size={16} className="text-[#f5a623]" />
              </button>
            </div>

            {/* Formazione: 3 + barra + SUB */}
            <div className="shrink-0 px-3 pt-4 sm:px-4">
              <div className="flex items-stretch gap-1.5 sm:gap-2">
                <div className="flex min-w-0 flex-[3] gap-1.5 sm:gap-2">
                  {ACTIVE_SLOTS.map((slot) => (
                    <SlotCard
                      key={slot}
                      slot={slot}
                      member={slots[slot]}
                      charMap={charMap}
                      selecting={targetSlot === slot}
                      onPick={onPickSlot}
                      onClear={onClearSlot}
                      label={`${slot + 1}`}
                      compact
                    />
                  ))}
                </div>

                <div className="mx-0.5 w-px shrink-0 self-stretch bg-gradient-to-b from-transparent via-[#38bdf8]/70 to-transparent sm:mx-1" />

                <div className="flex w-[22%] shrink-0 sm:w-[23%]">
                  <SlotCard
                    slot={SUB_SLOT}
                    member={slots[SUB_SLOT]}
                    charMap={charMap}
                    selecting={targetSlot === SUB_SLOT}
                    onPick={onPickSlot}
                    onClear={onClearSlot}
                    label="Sub"
                    sub
                    compact
                  />
                </div>
              </div>

              <div
                className={`mt-3 flex items-center justify-between rounded-xl ${PANEL_SM} bg-[#0b161b] px-3 py-2`}
              >
                <span className="flex items-center gap-1 text-[10px] uppercase text-[#f5a623]">
                  <Heart size={12} /> HP
                </span>
                <span className="text-xs font-bold tabular-nums">{totalHp}</span>
                <span className="flex items-center gap-1 text-[10px] uppercase text-[#f5a623]">
                  <Swords size={12} /> ATK
                </span>
                <span className="text-xs font-bold tabular-nums">{totalAtk}</span>
                <span className="text-[8px] uppercase text-white/35">attivi</span>
              </div>

              <p className="mt-2.5 text-center text-[9px] uppercase tracking-widest text-[#f5a623]">
                {targetSlot === SUB_SLOT
                  ? "Slot Sub selezionato · tocca un personaggio"
                  : `Slot ${targetSlot + 1} · tocca un personaggio`}
              </p>
            </div>

            {/* Roster a griglia — scroll frame stile gioco */}
            <div className="relative mt-2 min-h-0 flex-1 border-t-2 border-black">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-6 bg-gradient-to-b from-[#164446] to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-8 bg-gradient-to-t from-[#164446] to-transparent" />
              <div className="game-scroll h-full min-h-[11rem] overflow-y-auto px-3 py-3 pb-8">
                <div className="grid grid-cols-4 gap-2">
                  {pickerList.map((o, i) => {
                    const c = charMap[o.character_id];
                    if (!c) return null;
                    const attr = ATTRIBUTE_INFO[c.attribute];
                    const inTeam = team.includes(o.id);
                    const teamSlot = team.indexOf(o.id);
                    const isSub = teamSlot === SUB_SLOT;
                    const isTarget = inTeam && teamSlot === targetSlot;
                    return (
                      <motion.button
                        key={o.id}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.25) }}
                        onClick={() => pickCharacter(o.id)}
                        className={cn(
                          "group relative flex flex-col items-center gap-0.5 rounded-xl border-2 border-black bg-[#0b161b] p-1 shadow-[0_2px_0_0_#000] transition-transform active:translate-y-0.5",
                          isTarget && "ring-2 ring-[#f5a623]",
                          inTeam && !isTarget && "opacity-80"
                        )}
                      >
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-black bg-[#0d2a2c]">
                          <CharacterArt character={c} className="h-full w-full" />
                          {inTeam && (
                            <span
                              className={cn(
                                "absolute left-0.5 top-0.5 rounded border border-black px-1 text-[6px] font-black uppercase",
                                isSub ? "bg-[#38bdf8] text-black" : AMBER
                              )}
                            >
                              {isSub ? "Sub" : teamSlot + 1}
                            </span>
                          )}
                          <span
                            className="absolute bottom-0.5 left-0.5 flex h-3.5 w-3.5 items-center justify-center rounded border border-black text-white"
                            style={{ background: attr?.color }}
                          >
                            <AttributeIcon attribute={c.attribute} className="attr-glyph h-2.5 w-2.5" />
                          </span>
                          <span
                            className={`absolute bottom-0.5 right-0.5 rounded border border-black px-0.5 text-[6px] font-bold ${AMBER}`}
                          >
                            L{o.level}
                          </span>
                        </div>
                        <div className="px-0.5">
                          <RarityStars rarity={c.rarity} size={7} />
                        </div>
                        <p className="w-full truncate px-0.5 text-center text-[7px] font-bold uppercase leading-tight text-white">
                          {c.char_name}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
                {pickerList.length === 0 && (
                  <p className="py-8 text-center text-[11px] uppercase text-white/45">
                    Nessun personaggio posseduto
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
