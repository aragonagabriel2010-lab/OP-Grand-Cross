import { motion, AnimatePresence } from "framer-motion";
import { CharacterArt } from "@/components/game/CharacterCard";
import RarityStars from "@/components/game/RarityStars";
import { TEAL, AMBER, PANEL_SM } from "@/lib/arcade";
import { effectiveHp, effectiveAttack, ATTRIBUTE_INFO, RARITY_ORDER } from "@/lib/gameUtils";
import { X, Plus, Heart, Swords, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pannello squadra stile 7DS:GC — slot + lista scorrevole per assegnare */
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
  const teamOwned = [0, 1, 2].map((i) => {
    const id = team[i];
    return id ? owned.find((o) => o.id === id) : null;
  });

  const totalHp = teamOwned.reduce((s, o) => (o ? s + effectiveHp(charMap[o.character_id], o) : s), 0);
  const totalAtk = teamOwned.reduce((s, o) => (o ? s + effectiveAttack(charMap[o.character_id], o) : s), 0);

  const pickerList = [...owned].sort((a, b) => {
    const ca = charMap[a.character_id];
    const cb = charMap[b.character_id];
    const ra = RARITY_ORDER.indexOf(ca?.rarity);
    const rb = RARITY_ORDER.indexOf(cb?.rarity);
    if (rb !== ra) return rb - ra;
    return (b.level || 1) - (a.level || 1);
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className={`mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl ${TEAL} border-2 border-b-0 border-black shadow-[0_-6px_0_0_#000]`}
          >
            <div className="flex items-center justify-between border-b-2 border-black px-4 py-3">
              <div>
                <h2 className="text-base uppercase tracking-wide text-white">Equipaggio</h2>
                <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">Forma la squadra · max 3</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b] shadow-[0_2px_0_0_#000]"
              >
                <X size={16} className="text-[#f5a623]" />
              </button>
            </div>

            <div className="px-4 pt-4">
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((slot) => {
                  const member = teamOwned[slot];
                  const c = member ? charMap[member.character_id] : null;
                  const selecting = pickingSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => onPickSlot(slot)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-2xl border-2 border-black p-2 shadow-[0_3px_0_0_#000] transition-all",
                        selecting ? AMBER : "bg-[#0b161b]"
                      )}
                    >
                      <div className="relative w-full">
                        {member && c ? (
                          <>
                            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border-2 border-black bg-[#0d2a2c]">
                              <CharacterArt character={c} className="h-full w-full" />
                            </div>
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded bg-[#0b161b] px-1">
                              <RarityStars rarity={c.rarity} size={9} />
                            </div>
                            <div className={`absolute -bottom-1 -right-1 rounded px-1 py-0.5 text-[8px] font-bold ${selecting ? "bg-black text-[#f5a623]" : AMBER} border border-black`}>
                              L{member.level}
                            </div>
                          </>
                        ) : (
                          <div className={cn(
                            "flex aspect-[3/4] w-full items-center justify-center rounded-lg border-2 border-dashed",
                            selecting ? "border-black bg-[#f5a623]/30 text-black" : "border-white/30 bg-[#0d2a2c] text-white/40"
                          )}>
                            <Plus size={22} />
                          </div>
                        )}
                      </div>
                      <p className={cn("w-full truncate text-center text-[9px] font-bold uppercase", selecting ? "text-black" : "text-white")}>
                        {c ? c.char_name : `Slot ${slot + 1}`}
                      </p>
                      {member && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onClearSlot(slot);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.stopPropagation();
                              onClearSlot(slot);
                            }
                          }}
                          className="text-[8px] uppercase tracking-wide text-red-400 underline"
                        >
                          Rimuovi
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className={`mt-3 flex items-center justify-between rounded-xl ${PANEL_SM} bg-[#0b161b] px-3 py-2`}>
                <span className="flex items-center gap-1 text-[10px] uppercase text-[#f5a623]"><Heart size={12} /> HP</span>
                <span className="text-xs font-bold">{totalHp}</span>
                <span className="flex items-center gap-1 text-[10px] uppercase text-[#f5a623]"><Swords size={12} /> ATK</span>
                <span className="text-xs font-bold">{totalAtk}</span>
              </div>

              {pickingSlot != null && (
                <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-[#f5a623]">
                  Seleziona un personaggio per lo slot {pickingSlot + 1}
                </p>
              )}
            </div>

            {/* Scrolling frame lista personaggi */}
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto border-t-2 border-black px-3 py-3">
              <div className="space-y-2 pb-6">
                {pickerList.map((o) => {
                  const c = charMap[o.character_id];
                  if (!c) return null;
                  const attr = ATTRIBUTE_INFO[c.attribute];
                  const inTeam = team.includes(o.id);
                  const teamSlot = team.indexOf(o.id);
                  const canPick = pickingSlot != null;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={!canPick && !inTeam}
                      onClick={() => {
                        if (pickingSlot != null) onAssign(pickingSlot, o.id);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border-2 border-black bg-[#0b161b] p-2 text-left shadow-[0_2px_0_0_#000] transition-all",
                        canPick && "hover:-translate-y-0.5 active:translate-y-0",
                        inTeam && "ring-1 ring-[#f5a623]/60",
                        !canPick && !inTeam && "opacity-50"
                      )}
                    >
                      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border-2 border-black bg-[#0d2a2c]">
                        <CharacterArt character={c} className="h-full w-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <RarityStars rarity={c.rarity} size={9} />
                          <span className="rounded px-1 text-[8px] font-bold text-white" style={{ background: attr?.color }}>
                            {attr?.label || c.attribute}
                          </span>
                          {inTeam && (
                            <span className={`rounded border border-black px-1 text-[8px] uppercase ${AMBER}`}>
                              Slot {teamSlot + 1}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm font-bold uppercase tracking-wide text-white">{c.char_name}</p>
                        <p className="truncate text-[10px] uppercase text-[#f5a623]">{c.version} · Lv.{o.level}</p>
                      </div>
                      <div className="text-right text-[10px] uppercase text-white/70">
                        <div>HP {effectiveHp(c, o)}</div>
                        <div>ATK {effectiveAttack(c, o)}</div>
                      </div>
                      {canPick && (
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-black",
                          inTeam && teamSlot === pickingSlot ? AMBER : TEAL
                        )}>
                          {inTeam && teamSlot === pickingSlot ? <Check size={14} className="text-black" /> : <Plus size={14} className="text-[#f5a623]" />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
