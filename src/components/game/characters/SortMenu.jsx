import { motion, AnimatePresence } from "framer-motion";
import { TEAL, AMBER } from "@/lib/arcade";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const SORT_OPTIONS = [
  { id: "rarity_desc", label: "Rarità (alta → bassa)" },
  { id: "rarity_asc", label: "Rarità (bassa → alta)" },
  { id: "level_desc", label: "Livello (alto → basso)" },
  { id: "level_asc", label: "Livello (basso → alto)" },
  { id: "hp_desc", label: "HP (alto → basso)" },
  { id: "atk_desc", label: "Attacco (alto → basso)" },
  { id: "name_asc", label: "Nome (A → Z)" },
];

export default function SortMenu({ open, onClose, value, onChange }) {
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
            className={`mx-4 mb-24 w-full max-w-md overflow-hidden rounded-2xl ${TEAL} border-2 border-black shadow-[0_4px_0_0_#000] sm:mb-0`}
          >
            <div className="flex items-center justify-between border-b-2 border-black px-4 py-3">
              <h2 className="text-base uppercase tracking-wide">Ordina</h2>
              <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-[#0b161b]">
                <X size={14} className="text-[#f5a623]" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {SORT_OPTIONS.map((opt) => {
                const on = value === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      onClose();
                    }}
                    className={cn(
                      "mb-1 flex w-full items-center justify-between rounded-xl border-2 border-black px-3 py-2.5 text-left text-xs uppercase tracking-wide shadow-[0_2px_0_0_#000]",
                      on ? AMBER : "bg-[#0b161b] text-white hover:bg-[#0d2a2c]"
                    )}
                  >
                    <span>{opt.label}</span>
                    {on && <Check size={14} className="text-black" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
