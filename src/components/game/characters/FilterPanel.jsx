import { motion, AnimatePresence } from "framer-motion";
import { TEAL, AMBER, PANEL_SM } from "@/lib/arcade";
import { ATTRIBUTE_INFO } from "@/lib/gameUtils";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const FILTER_ATTRIBUTES = [
  { key: "Forza", label: "Forza" },
  { key: "Tecnica", label: "Tecnica" },
  { key: "Velocità", label: "Agilità" },
];

export const FILTER_FACTIONS = ["Pirati", "Marina", "Rivoluzionari"];

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

  const clear = () => onChange({ attributes: [], factions: [] });
  const hasFilters = filters.attributes.length > 0 || filters.factions.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
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
                    <span className="mr-1">{info?.icon}</span>
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
