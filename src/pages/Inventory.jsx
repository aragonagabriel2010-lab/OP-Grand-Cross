import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/localDb";
import { useGame } from "@/hooks/useGame";
import BottomNav from "@/components/game/BottomNav";
import GameTopBar from "@/components/game/GameTopBar";
import { TEAL, AMBER, PANEL, PANEL_SM } from "@/lib/arcade";
import { MATERIAL_DEFS, normalizeMaterials } from "@/lib/materials";
import {
  INVENTORY_SECTIONS,
  INGREDIENT_DEFS,
  ITEM_DEFS,
  USABLE_DEFS,
  normalizeIngredients,
  normalizeItems,
  normalizeUsables,
  normalizeFoodBuff,
  eatUsable,
} from "@/lib/inventory";
import { Hexagon, Backpack, Package, Pill, Carrot } from "lucide-react";
import { cn } from "@/lib/utils";
import { AudioManager } from "@/lib/AudioManager";
import { toast } from "@/components/ui/use-toast";

const SECTION_ICON = {
  materials: Hexagon,
  items: Package,
  usables: Pill,
  ingredients: Carrot,
};

function ItemRow({ name, hint, color, qty, Icon = Hexagon, delay = 0, actionLabel, onAction, actionDisabled }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 340, damping: 26 }}
      className={`flex items-center gap-3 rounded-2xl ${TEAL} ${PANEL} p-4`}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]"
        style={{ boxShadow: `0 0 12px ${color}44` }}
      >
        <Icon size={26} style={{ color }} fill={`${color}33`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold uppercase tracking-wide" style={{ color }}>
          {name}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-white/50">{hint}</p>
        {actionLabel && (
          <button
            type="button"
            disabled={actionDisabled}
            onClick={onAction}
            className={cn(
              "mt-2 rounded-lg border-2 border-black px-2.5 py-1 text-[9px] font-bold uppercase disabled:opacity-40",
              AMBER,
              "text-black"
            )}
          >
            {actionLabel}
          </button>
        )}
      </div>
      <div
        className={`rounded-xl border-2 border-black px-3 py-2 text-center ${PANEL_SM}`}
        style={{ background: "#0b161b" }}
      >
        <p className="text-[8px] uppercase text-white/40">Qty</p>
        <p className="text-xl font-black tabular-nums" style={{ color }}>
          {qty}
        </p>
      </div>
    </motion.div>
  );
}

function EmptyHint({ text }) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border-2 border-dashed border-white/15 px-4 py-8 text-center text-[11px] uppercase tracking-wide text-white/40"
    >
      {text}
    </motion.p>
  );
}

export default function Inventory() {
  const { loading, playerState, refresh } = useGame();
  const [section, setSection] = useState("materials");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!playerState) return;
    const uid = playerState.created_by_id || playerState.id;
    import("@/lib/dailies").then(({ bumpDaily }) => bumpDaily(uid, "open_inventory")).catch(() => {});
  }, [playerState]);

  if (loading || !playerState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b161b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
      </div>
    );
  }

  const mats = normalizeMaterials(playerState.materials);
  const ingredients = normalizeIngredients(playerState.ingredients);
  const items = normalizeItems(playerState.items);
  const usables = normalizeUsables(playerState.usables);
  const foodBuff = normalizeFoodBuff(playerState.foodBuff);
  const active = INVENTORY_SECTIONS.find((s) => s.id === section);

  async function onEat(id) {
    if (busy) return;
    const result = eatUsable(playerState, id);
    if (!result.ok) {
      toast({ title: "Non puoi", description: result.reason, variant: "warning" });
      return;
    }
    setBusy(true);
    await db.entities.PlayerState.update(playerState.id, result.patch);
    AudioManager.playHeal();
    await refresh?.();
    toast({ title: "Buff attivo", description: result.label });
    setBusy(false);
  }

  let rows = [];
  if (section === "materials") {
    rows = Object.values(MATERIAL_DEFS).map((m, i) => (
      <ItemRow
        key={m.id}
        name={m.name}
        hint={m.hint}
        color={m.color}
        qty={mats[m.id] || 0}
        Icon={Hexagon}
        delay={i * 0.04}
      />
    ));
  } else if (section === "ingredients") {
    rows = Object.values(INGREDIENT_DEFS).map((m, i) => (
      <ItemRow
        key={m.id}
        name={m.name}
        hint={m.hint}
        color={m.color}
        qty={ingredients[m.id] || 0}
        Icon={Carrot}
        delay={i * 0.04}
      />
    ));
  } else if (section === "items") {
    const list = Object.values(ITEM_DEFS);
    rows =
      list.length === 0
        ? [<EmptyHint key="e" text="Nessun oggetto · prossimamente" />]
        : list.map((m, i) => (
            <ItemRow
              key={m.id}
              name={m.name}
              hint={m.hint}
              color={m.color}
              qty={items[m.id] || 0}
              Icon={Package}
              delay={i * 0.04}
            />
          ));
  } else if (section === "usables") {
    const list = Object.values(USABLE_DEFS);
    const owned = list.filter((m) => (usables[m.id] || 0) > 0);
    rows =
      owned.length === 0
        ? [<EmptyHint key="e" text="Nessun utilizzabile · cucina qualcosa!" />]
        : owned.map((m, i) => (
            <ItemRow
              key={m.id}
              name={m.name}
              hint={m.hint}
              color={m.color}
              qty={usables[m.id] || 0}
              Icon={Pill}
              delay={i * 0.04}
              actionLabel={m.battleBuff ? "Mangia" : null}
              onAction={() => onEat(m.id)}
              actionDisabled={busy || !!foodBuff}
            />
          ));
  }

  return (
    <div className="min-h-screen bg-[#0b161b] pb-24 text-white">
      <GameTopBar showBack backTo="/" />
      <div className={`border-b-2 border-black ${TEAL}`}>
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-2">
          <Backpack className="text-[#f5a623]" size={18} />
          <h1 className="text-sm uppercase tracking-wide">Inventario</h1>
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 pt-4">
        {foodBuff && (
          <p className="mb-3 rounded-xl border-2 border-black bg-[#0b161b] px-3 py-2 text-center text-[10px] font-bold uppercase text-[#f97316]">
            Buff cibo · {foodBuff.label} ·{" "}
            {foodBuff.duration === "turns"
              ? `${foodBuff.turnsLeft} turni`
              : foodBuff.durationLabel || "prossima battaglia"}
          </p>
        )}

        <div className="mb-4 grid grid-cols-4 gap-1.5">
          {INVENTORY_SECTIONS.map((s) => {
            const Icon = SECTION_ICON[s.id] || Package;
            const on = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 border-black px-1 py-2 shadow-[0_2px_0_0_#000] transition-transform active:translate-y-0.5",
                  on ? "bg-[#f5a623] text-black" : `${TEAL} text-white/70`
                )}
              >
                <Icon size={14} className={on ? "text-black" : "text-[#f5a623]"} />
                <span className="text-[7px] font-bold uppercase leading-tight">{s.label}</span>
              </button>
            );
          })}
        </div>

        <p className="mb-3 text-[10px] uppercase tracking-wide text-white/50">{active?.hint}</p>

        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22 }}
            className="space-y-3"
          >
            {rows}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}
