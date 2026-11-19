import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Coins, Search, Shirt, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/localDb";
import { AudioManager } from "@/lib/AudioManager";
import {
  EQUIP_SLOTS,
  REFORGE_BERRY_COST,
  SUBSTAT_DEFS,
  SUBSTAT_MAX_PCT,
  computeUniqueValue,
  ensureStarterGear,
  equipGearToCharacter,
  gearInSlot,
  inventoryForSlot,
  normalizeGearList,
  reforgeSubstat,
  slotLabel,
  unequipGear,
  uniqueCapFor,
  uniqueStatLabel,
} from "@/lib/equipment";
import { RARITY_COLORS, RARITY_ORDER } from "@/lib/gameUtils";
import { EquipSlotIcon } from "@/components/game/EquipSlotIcons";

/** Raggi ellisse in % del riquadro (allineati all'alone) */
const ELLIPSE_RX = 41;
const ELLIPSE_RY = 34;

function ellipsePoint(index, total = EQUIP_SLOTS.length) {
  // Partenza in alto, senso orario
  const angleDeg = (360 / total) * index - 90;
  const rad = (angleDeg * Math.PI) / 180;
  return {
    left: 50 + ELLIPSE_RX * Math.cos(rad),
    top: 50 + ELLIPSE_RY * Math.sin(rad),
  };
}

function EquipPolarRing({ gear, ownedId, slotFilter, onPickSlot, leaving }) {
  return (
    <div className="equip-polar" aria-label="Slot equipaggiamento">
      <motion.svg
        className="equip-polar__halo"
        viewBox="0 0 100 100"
        aria-hidden="true"
        preserveAspectRatio="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: 0.22, delay: leaving ? 0 : 0.05 }}
      >
        <ellipse
          cx="50"
          cy="50"
          rx={ELLIPSE_RX}
          ry={ELLIPSE_RY}
          fill="none"
          stroke="rgba(245, 166, 35, 0.45)"
          strokeWidth="0.7"
          strokeDasharray="2.2 1.6"
        />
        <ellipse
          cx="50"
          cy="50"
          rx={ELLIPSE_RX}
          ry={ELLIPSE_RY}
          fill="rgba(4, 10, 12, 0.28)"
          stroke="none"
        />
      </motion.svg>
      <div className="equip-polar__ring">
        {EQUIP_SLOTS.map((slot, i) => {
          const worn = gearInSlot(gear, ownedId, slot.id);
          const active = slotFilter === slot.id;
          const pos = ellipsePoint(i);
          const leaveDelay = (EQUIP_SLOTS.length - 1 - i) * 0.04;
          return (
            <div
              key={slot.id}
              className="equip-polar__slot"
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
            >
              <motion.button
                type="button"
                data-no-lift
                className={cn(
                  "equip-polar__hit",
                  active && "equip-polar__slot--active",
                  worn && "equip-polar__slot--filled",
                  slot.rare && "equip-polar__slot--rare"
                )}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={
                  leaving
                    ? { opacity: 0, scale: 0.35 }
                    : { opacity: 1, scale: 1 }
                }
                transition={
                  leaving
                    ? { delay: leaveDelay, duration: 0.2, ease: [0.4, 0, 1, 1] }
                    : { delay: 0.1 + i * 0.05, type: "spring", stiffness: 420, damping: 24 }
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (leaving) return;
                  onPickSlot(slot.id, worn?.id || null);
                }}
              >
                <span
                  className="equip-polar__gem"
                  style={worn ? { borderColor: RARITY_COLORS[worn.rarity] || "#f5a623" } : undefined}
                >
                  {worn ? (
                    <span className="equip-polar__rarity">{worn.rarity}</span>
                  ) : (
                    <EquipSlotIcon slotId={slot.id} />
                  )}
                </span>
                <span className="equip-polar__label">{slot.label}</span>
              </motion.button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Modalità equip in-page.
 * children({ polar, toolbar, bag, overlays })
 */
export default function CharacterEquipMode({
  ownedId,
  playerState,
  patchPlayerState,
  refresh,
  onExit,
  leaving = false,
  onExitDone,
  children,
}) {
  const [gear, setGear] = useState([]);
  const [slotFilter, setSlotFilter] = useState("necklace");
  const [query, setQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [reforgeIndex, setReforgeIndex] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!playerState) return;
    const ensured = ensureStarterGear(playerState.gear);
    setGear(ensured.gear);
    setSlotFilter("necklace");
    setSelectedId(null);
    setQuery("");
    setRarityFilter(null);
    if (ensured.seeded) {
      patchPlayerState?.({ gear: ensured.gear });
      db.entities.PlayerState.update(playerState.id, { gear: ensured.gear }).then(() => refresh?.());
    }
  }, [playerState?.id]);

  useEffect(() => {
    if (!leaving) return undefined;
    setSelectedId(null);
    setReforgeIndex(null);
    const t = window.setTimeout(() => onExitDone?.(), 380);
    return () => window.clearTimeout(t);
    // onExitDone is stable (useCallback) from parent
  }, [leaving, onExitDone]);

  const selected = useMemo(
    () => normalizeGearList(gear).find((g) => g.id === selectedId) || null,
    [gear, selectedId]
  );

  const inventory = useMemo(() => {
    let list = inventoryForSlot(gear, slotFilter, ownedId);
    if (rarityFilter) list = list.filter((g) => g.rarity === rarityFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          uniqueStatLabel(g).toLowerCase().includes(q) ||
          (g.rarity || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [gear, slotFilter, ownedId, rarityFilter, query]);

  async function persist(nextGear) {
    setGear(nextGear);
    patchPlayerState?.({ gear: nextGear });
    await db.entities.PlayerState.update(playerState.id, { gear: nextGear });
    refresh?.();
  }

  function flash(msg) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1600);
  }

  function closeSheet() {
    setSelectedId(null);
    setReforgeIndex(null);
  }

  function pickSlot(slotId, wornId) {
    setSlotFilter(slotId);
    setSelectedId(wornId);
    setReforgeIndex(null);
    setQuery("");
  }

  async function onApply() {
    if (!selected || busy) return;
    setBusy(true);
    const res = equipGearToCharacter(gear, selected.id, ownedId);
    if (!res.ok) {
      flash(res.reason || "Errore");
      setBusy(false);
      return;
    }
    AudioManager.playClick();
    await persist(res.gear);
    flash("Equipaggiato");
    setBusy(false);
  }

  async function onRemove() {
    if (!selected || busy) return;
    setBusy(true);
    const res = unequipGear(gear, selected.id);
    AudioManager.playClick();
    await persist(res.gear);
    flash("Rimosso");
    closeSheet();
    setBusy(false);
  }

  async function onConfirmReforge() {
    if (!selected || reforgeIndex == null || busy) return;
    if ((playerState.berry || 0) < REFORGE_BERRY_COST) {
      flash("Berry insufficienti");
      return;
    }
    setBusy(true);
    const rolled = reforgeSubstat(selected, reforgeIndex);
    if (!rolled.ok) {
      flash(rolled.reason || "Errore");
      setBusy(false);
      return;
    }
    const nextBerry = (playerState.berry || 0) - REFORGE_BERRY_COST;
    const nextGear = normalizeGearList(gear).map((g) => (g.id === selected.id ? rolled.item : g));
    patchPlayerState?.({ berry: nextBerry, gear: nextGear });
    await db.entities.PlayerState.update(playerState.id, { berry: nextBerry, gear: nextGear });
    setGear(nextGear);
    setSelectedId(rolled.item.id);
    setReforgeIndex(null);
    AudioManager.playLevelUp();
    flash("Riforgiato");
    refresh?.();
    setBusy(false);
  }

  const polar = (
    <EquipPolarRing
      gear={gear}
      ownedId={ownedId}
      slotFilter={slotFilter}
      onPickSlot={pickSlot}
      leaving={leaving}
    />
  );

  const toolbar = (
    <motion.div
      className="equip-toolbar"
      initial={{ opacity: 0, y: 18 }}
      animate={leaving ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 }}
      transition={
        leaving
          ? { duration: 0.22, ease: [0.4, 0, 1, 1] }
          : { delay: 0.28, duration: 0.28, ease: [0.22, 1, 0.36, 1] }
      }
    >
      <button
        type="button"
        data-no-lift
        className="equip-toolbar__back"
        onClick={onExit}
        disabled={leaving}
        aria-label="Indietro"
      >
        <ArrowLeft size={18} />
      </button>
      <label className="equip-toolbar__search">
        <Search size={14} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Cerca · ${slotLabel(slotFilter)}`}
          aria-label="Cerca equipaggiamento"
        />
      </label>
      <div className="equip-toolbar__filters" role="group" aria-label="Filtro rarità">
        <button
          type="button"
          data-no-lift
          className={cn("equip-filter", !rarityFilter && "equip-filter--on")}
          onClick={() => setRarityFilter(null)}
        >
          Tutti
        </button>
        {RARITY_ORDER.map((r) => (
          <button
            key={r}
            type="button"
            data-no-lift
            className={cn("equip-filter", rarityFilter === r && "equip-filter--on")}
            style={rarityFilter === r ? { borderColor: RARITY_COLORS[r], color: RARITY_COLORS[r] } : undefined}
            onClick={() => setRarityFilter((cur) => (cur === r ? null : r))}
          >
            {r}
          </button>
        ))}
      </div>
    </motion.div>
  );

  const bag = (
    <motion.section
      className="equip-inline-bag"
      initial={{ opacity: 0, y: 24 }}
      animate={leaving ? { opacity: 0, y: 22 } : { opacity: 1, y: 0 }}
      transition={
        leaving
          ? { duration: 0.24, ease: [0.4, 0, 1, 1] }
          : { delay: 0.36, duration: 0.3, ease: [0.22, 1, 0.36, 1] }
      }
    >
      <div className="equip-bag__head">
        <p className="equip-slide__section-label">Inventario · {slotLabel(slotFilter)}</p>
        <span className="equip-bag__count">{inventory.length}</span>
      </div>
      <div className="equip-inline-bag__list">
        {inventory.length === 0 && (
          <div className="equip-bag__empty equip-bag__empty--inline">
            <Shirt size={22} />
            <p>Nessun pezzo per questo slot</p>
          </div>
        )}
        {inventory.map((g) => {
          const uv = computeUniqueValue(g);
          const onMe = g.equippedTo === ownedId;
          return (
            <button
              key={g.id}
              type="button"
              data-no-lift
              className={cn("equip-card", selectedId === g.id && "equip-card--sel", onMe && "equip-card--worn")}
              onClick={() => {
                setSelectedId(g.id);
                setReforgeIndex(null);
              }}
            >
              <div className="equip-card__badge" style={{ background: RARITY_COLORS[g.rarity] || "#9CA3AF" }}>
                {g.rarity}
              </div>
              <div className="equip-card__body">
                <p className="equip-card__name">{g.name}</p>
                <p className="equip-card__sub">
                  {uniqueStatLabel(g)} <strong>+{uv}</strong>
                </p>
              </div>
              <div className="equip-card__side">
                {onMe && (
                  <span className="equip-card__worn">
                    <Check size={11} /> On
                  </span>
                )}
                <span className="equip-card__lv">Lv.{g.level}</span>
              </div>
            </button>
          );
        })}
      </div>
    </motion.section>
  );

  const overlays = (
    <>
      <AnimatePresence>
        {selected && (
          <>
            <motion.button
              key="equip-dim"
              type="button"
              data-no-lift
              data-sfx="off"
              className="equip-sheet__dim equip-sheet__dim--inline"
              aria-label="Chiudi dettaglio"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
            />
            <motion.div
              key="equip-sheet"
              className="equip-sheet equip-sheet--inline"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.26, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="equip-sheet__grab" aria-hidden="true" />
              <div className="equip-sheet__scroll game-scroll">
                <div className="equip-sheet__top">
                  <div>
                    <p className="equip-sheet__rarity" style={{ color: RARITY_COLORS[selected.rarity] || "#f5a623" }}>
                      {selected.rarity} · {slotLabel(selected.slot)}
                    </p>
                    <h3>{selected.name}</h3>
                    <p className="equip-sheet__meta">
                      Lv.{selected.level}/15 · Risveglio {selected.ascension}/3
                    </p>
                  </div>
                  <button type="button" data-no-lift className="equip-sheet__close" aria-label="Chiudi" onClick={closeSheet}>
                    <X size={16} />
                  </button>
                </div>

                <div className="equip-unique">
                  <div className="equip-unique__head">
                    <span>Statistica unica</span>
                    <strong>
                      {uniqueStatLabel(selected)} +{computeUniqueValue(selected)}
                      <span> / {uniqueCapFor(selected)}</span>
                    </strong>
                  </div>
                  <div className="equip-bar" aria-hidden="true">
                    <div className="equip-bar__fill equip-bar__fill--unique" style={{ width: `${selected.uniqueBar}%` }} />
                  </div>
                </div>

                <p className="equip-slide__section-label" style={{ marginTop: "0.65rem" }}>
                  Prestazioni · max {SUBSTAT_MAX_PCT}%
                </p>
                <div className="equip-subs">
                  {selected.substats.map((s, i) => {
                    const def = SUBSTAT_DEFS[s.id];
                    const pct = (s.value / SUBSTAT_MAX_PCT) * 100;
                    const forging = reforgeIndex === i;
                    return (
                      <div key={`${selected.id}-${i}`} className={cn("equip-sub", forging && "equip-sub--forge")}>
                        <button
                          type="button"
                          data-no-lift
                          className="equip-sub__hit"
                          onClick={() => setReforgeIndex(forging ? null : i)}
                        >
                          <div className="equip-sub__row">
                            <span>{def?.label || s.id}</span>
                            <strong>{s.value}%</strong>
                          </div>
                          <div className="equip-bar">
                            <div className="equip-bar__fill" style={{ width: `${pct}%` }} />
                          </div>
                        </button>
                        <AnimatePresence>
                          {forging && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="equip-sub__forge"
                            >
                              <p>
                                <Coins size={11} className="mr-1 inline" />
                                Riforgia ({REFORGE_BERRY_COST} Berry)
                              </p>
                              <div className="equip-sub__forge-actions">
                                <button type="button" disabled={busy} onClick={() => setReforgeIndex(null)}>
                                  Annulla
                                </button>
                                <button type="button" disabled={busy} className="equip-sub__forge-go" onClick={onConfirmReforge}>
                                  Riforgia
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="equip-sheet__actions">
                <button type="button" onClick={closeSheet}>
                  Indietro
                </button>
                {selected.equippedTo === ownedId ? (
                  <button type="button" className="equip-sheet__danger" disabled={busy} onClick={onRemove}>
                    Rimuovi
                  </button>
                ) : (
                  <button type="button" className="equip-sheet__apply" disabled={busy} onClick={onApply}>
                    Applica
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast}
            className="equip-slide__toast"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {toast}
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );

  if (typeof children !== "function") return null;
  return children({ polar, toolbar, bag, overlays });
}
