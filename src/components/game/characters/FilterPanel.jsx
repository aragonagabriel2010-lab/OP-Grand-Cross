import { motion, AnimatePresence } from "framer-motion";
import { TEAL, AMBER, PANEL_SM } from "@/lib/arcade";
import { ATTRIBUTE_INFO } from "@/lib/gameUtils";
import { AttributeIcon } from "@/components/game/AttributeIcons";
import { UNIQUE_TYPES, UNIQUE_TYPE_LIST } from "@/lib/uniques";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const FILTER_ATTRIBUTES = [
  { key: "Forza", label: "Forza" },
  { key: "Tecnica", label: "Tecnica" },
  { key: "Velocità", label: "Agilità" },
];

export const FILTER_FACTIONS = ["Pirati", "Marina", "Rivoluzionari"];

export const OWNERSHIP_OPTIONS = [
  { id: "all", label: "Tutti" },
  { id: "owned", label: "Solo posseduti" },
  { id: "locked", label: "Solo non posseduti" },
];

export default function FilterPanel({ open, onClose, filters, onChange }) {
  const toggleAttr = (key) => {
    const next = new Set(filters.attributes);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange({ ...filters, attributes: [...next] });
  };

  const toggleFaction = (key) => {
    const next = new Set(filters.factions);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange({ ...filters, factions: [...next] });
  };

  const toggleUnique = (key) => {
    const next = new Set(filters.uniqueTypes || []);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange({ ...filters, uniqueTypes: [...next] });
  };

  const setOwnership = (id) => onChange({ ...filters, ownership: id });

  const clear = () =>
    onChange({ attributes: [], factions: [], uniqueTypes: [], ownership: "all" });
  const hasFilters =
    filters.attributes.length > 0 ||
    filters.factions.length > 0 ||
    (filters.uniqueTypes || []).length > 0 ||
    (filters.ownership && filters.ownership !== "all");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`mx-4 mb-24 w-full max-w-md rounded-2xl ${TEAL} border-2 border-black p-4 shadow-[0_4px_0_0_#000] sm:mb-0`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base uppercase tracking-wide">Filtra</h2>
              <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-[#0b161b]">
                <X size={14} className="text-[#f5a623]" />
              </button>
            </div>

            <p className="mb-2 text-[10px] uppercase tracking-widest text-[#f5a623]">Possesso</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {OWNERSHIP_OPTIONS.map(({ id, label }) => {
                const on = (filters.ownership || "all") === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setOwnership(id)}
                    className={cn(
                      "rounded-lg border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-[0_2px_0_0_#000]",
                      on ? AMBER : "bg-[#0b161b] text-white"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <p className="mb-2 text-[10px] uppercase tracking-widest text-[#f5a623]">Tipo / Attributo</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {FILTER_ATTRIBUTES.map(({ key, label }) => {
                const info = ATTRIBUTE_INFO[key];
                const on = filters.attributes.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleAttr(key)}
                    className={cn(
                      "rounded-lg border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-[0_2px_0_0_#000]",
                      on ? AMBER : "bg-[#0b161b] text-white"
                    )}
                  >
                    <span className="mr-1 inline-flex align-middle" style={{ color: on ? undefined : info?.color }}>
                      <AttributeIcon attribute={key} className="attr-glyph h-3 w-3" />
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>

            <p className="mb-2 text-[10px] uppercase tracking-widest text-[#f5a623]">Fazione</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {FILTER_FACTIONS.map((f) => {
                const on = filters.factions.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFaction(f)}
                    className={cn(
                      "rounded-lg border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-[0_2px_0_0_#000]",
                      on ? AMBER : "bg-[#0b161b] text-white"
                    )}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            <p className="mb-2 text-[10px] uppercase tracking-widest text-[#f5a623]">Unica</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {UNIQUE_TYPE_LIST.map((id) => {
                const info = UNIQUE_TYPES[id];
                const on = (filters.uniqueTypes || []).includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleUnique(id)}
                    className={cn(
                      "rounded-lg border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-[0_2px_0_0_#000]",
                      on ? AMBER : "bg-[#0b161b] text-white"
                    )}
                    style={on ? undefined : { boxShadow: `0 2px 0 0 #000, inset 0 0 0 1px ${info.color}55` }}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={clear}
                disabled={!hasFilters}
                className={`flex-1 rounded-xl py-2.5 text-xs uppercase tracking-wide ${PANEL_SM} bg-[#0b161b] disabled:opacity-40`}
              >
                Azzera
              </button>
              <button type="button" onClick={onClose} className={`flex-1 rounded-xl py-2.5 text-xs uppercase tracking-wide ${AMBER} border-2 border-black shadow-[0_3px_0_0_#000]`}>
                Applica
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
