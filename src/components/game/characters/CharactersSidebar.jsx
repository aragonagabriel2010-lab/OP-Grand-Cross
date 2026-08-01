import { cn } from "@/lib/utils";
import { TEAL, AMBER } from "@/lib/arcade";
import { Search, ArrowUpDown } from "lucide-react";

const TOOLS = [
  { id: "search", label: "Cerca", icon: Search },
  { id: "sort", label: "Ordina", icon: ArrowUpDown },
];

export default function CharactersSidebar({ active, onSelect, searchActive }) {
  return (
    <aside className="flex w-[3.75rem] shrink-0 flex-col gap-2 py-1">
      {TOOLS.map(({ id, label, icon: Icon }) => {
        const isOn =
          active === id ||
          (id === "search" && searchActive && active !== "search");
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border-2 border-black px-1 py-2 shadow-[0_3px_0_0_#000] transition-all active:translate-y-0.5 active:shadow-none",
              isOn ? AMBER : `${TEAL} text-white/80 hover:text-white`
            )}
          >
            <Icon size={16} className={isOn ? "text-black" : "text-[#f5a623]"} />
            <span className={cn("text-[7px] font-bold uppercase leading-tight tracking-wide", isOn ? "text-black" : "text-white")}>
              {label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
