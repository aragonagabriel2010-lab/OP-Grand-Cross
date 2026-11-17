import BottomNav from "@/components/game/BottomNav";
import GameTopBar from "@/components/game/GameTopBar";
import { TEAL, PANEL } from "@/lib/arcade";
import { Ship as ShipIcon } from "lucide-react";

/** Tab placeholder — contenuti futuri (nave / hub secondario). */
export default function Ship() {
  return (
    <div className="min-h-screen bg-[#0b161b] pb-24 text-white">
      <GameTopBar showBack backTo="/" />
      <div className={`border-b-2 border-black ${TEAL}`}>
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-2">
          <ShipIcon className="text-[#f5a623]" size={18} />
          <h1 className="text-sm uppercase tracking-wide">Nave</h1>
        </div>
      </div>
      <main className="mx-auto flex max-w-md flex-col items-center justify-center px-4 pt-24">
        <div className={`w-full rounded-2xl ${TEAL} ${PANEL} px-6 py-12 text-center`}>
          <ShipIcon className="mx-auto text-[#f5a623]" size={40} />
          <p className="mt-4 text-lg font-bold uppercase tracking-widest text-[#f5a623]">
            Work in Progress
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-wide text-white/50">
            Hub nave in arrivo
          </p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
