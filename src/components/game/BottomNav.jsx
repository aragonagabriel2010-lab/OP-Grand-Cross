import { Link, useLocation } from "react-router-dom";
import { Anchor, Map, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEAL } from "@/lib/arcade";

const items = [
  { to: "/", label: "Home", icon: Anchor, match: (p) => p === "/" },
  { to: "/story", label: "Storia", icon: Map, match: (p) => p === "/story" || p.startsWith("/story/") || p.startsWith("/battle") },
  { to: "/gacha", label: "Gacha", icon: Sparkles, match: (p) => p.startsWith("/gacha") },
  { to: "/characters", label: "Personaggi", icon: Users, match: (p) => p.startsWith("/characters") || p.startsWith("/character") },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 ${TEAL} border-t-2 border-black pb-[env(safe-area-inset-bottom)]`}>
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 uppercase tracking-wide transition-all",
                active ? "text-[#f5a623]" : "text-white/60 hover:text-white"
              )}
            >
              <Icon size={22} className={active ? "drop-shadow-[0_0_6px_rgba(245,166,35,0.7)]" : ""} />
              <span className="text-[10px] font-bold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
