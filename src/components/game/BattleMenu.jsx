import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Gift, Info, Flag, X } from "lucide-react";
import GameModal from "@/components/game/GameModal";
import SettingsModal from "@/components/game/SettingsModal";
import { ATTRIBUTE_INFO, TYPE_TRIANGLE } from "@/lib/gameUtils";
import { AttributeIcon } from "@/components/game/AttributeIcons";
import { TEAL, PANEL_SM } from "@/lib/arcade";
import { cn } from "@/lib/utils";
import { AudioManager } from "@/lib/AudioManager";

/**
 * Rotellina battaglia → colonna: Impostazioni / Ricompense / Info / Arrenditi
 */
export default function BattleMenu({
  chapter,
  practiceMode,
  hardMode,
  onSurrender,
}) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panel, setPanel] = useState(null); // "rewards" | "info" | "surrender"

  function closeAll() {
    setOpen(false);
    setPanel(null);
  }

  function openPanel(id) {
    AudioManager.playClick();
    setOpen(false);
    if (id === "settings") {
      setSettingsOpen(true);
      return;
    }
    setPanel(id);
  }

  const berry = chapter?.reward_berry ?? 0;
  const straw = chapter?.reward_strawberry ?? 0;
  const berryShow = hardMode ? Math.round(berry * 1.5) : berry;
  const strawShow = hardMode ? Math.round(straw * 1.35) : straw;

  return (
    <>
      <div className="relative z-40">
        <button
          type="button"
          aria-label="Menu battaglia"
          aria-expanded={open}
          onClick={() => {
            AudioManager.playClick();
            setOpen((v) => !v);
          }}
          className={cn("battle-gear-btn", open && "battle-gear-btn--open")}
        >
          <Settings size={18} strokeWidth={2.4} />
        </button>

        <AnimatePresence>
          {open && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default bg-black/40"
                aria-label="Chiudi menu"
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="battle-menu-panel absolute left-0 top-12 z-50 flex w-48 flex-col gap-1.5 p-2"
              >
                <MenuRow
                  icon={Settings}
                  label="Impostazioni"
                  onClick={() => openPanel("settings")}
                />
                <MenuRow
                  icon={Gift}
                  label="Ricompense"
                  onClick={() => openPanel("rewards")}
                />
                <MenuRow
                  icon={Info}
                  label="Info"
                  onClick={() => openPanel("info")}
                />
                <MenuRow
                  icon={Flag}
                  label="Arrenditi"
                  danger
                  onClick={() => openPanel("surrender")}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} initialTab="audio" />

      <GameModal
        open={panel === "rewards"}
        onClose={closeAll}
        title="Ricompense"
      >
        <div className="space-y-3 px-4 pb-4 pt-1">
          {practiceMode ? (
            <p className="rounded-xl border-2 border-black bg-[#0b161b] px-3 py-3 text-center text-xs uppercase text-[#38bdf8]">
              Practice · nessuna ricompensa
            </p>
          ) : (
            <>
              <RewardLine label="Beri" value={`+${berryShow}`} accent="#f5a623" />
              <RewardLine label="Fragole" value={`+${strawShow}`} accent="#e11d48" />
              <RewardLine
                label="Rank XP"
                value={hardMode ? "Aumentato" : "Standard"}
                accent="#38bdf8"
              />
              {hardMode && (
                <p className="text-center text-[9px] uppercase tracking-wide text-red-400">
                  Modalità HARD · moltiplicatori attivi
                </p>
              )}
            </>
          )}
        </div>
      </GameModal>

      <GameModal open={panel === "info"} onClose={closeAll} title="Triangolo tipi">
        <div className="space-y-3 px-4 pb-4 pt-1">
          <p className="text-center text-[10px] uppercase tracking-wide text-white/60">
            Forza batte Velocità · Velocità batte Tecnica · Tecnica batte Forza
          </p>
          <div className="mx-auto flex max-w-[14rem] flex-col items-center gap-2">
            {Object.keys(TYPE_TRIANGLE).map((atk) => {
              const def = TYPE_TRIANGLE[atk];
              const a = ATTRIBUTE_INFO[atk] || {};
              const d = ATTRIBUTE_INFO[def] || {};
              return (
                <div
                  key={atk}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl ${TEAL} ${PANEL_SM} px-3 py-2`}
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-white">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-black text-white"
                      style={{ background: a.color }}
                    >
                      <AttributeIcon attribute={atk} className="attr-glyph h-3.5 w-3.5" />
                    </span>
                    {a.label || atk}
                  </span>
                  <span className="text-[9px] font-black uppercase text-[#f5a623]">▶</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-white/80">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-black text-white"
                      style={{ background: d.color }}
                    >
                      <AttributeIcon attribute={def} className="attr-glyph h-3.5 w-3.5" />
                    </span>
                    {d.label || def}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-center text-[9px] text-white/45">
            Superefficace ×1.5 · Debole ×0.75
          </p>
        </div>
      </GameModal>

      <GameModal open={panel === "surrender"} onClose={closeAll} title="Arrenditi" showClose>
        <div className="space-y-4 px-4 pb-4 pt-1">
          <p className="text-center text-sm text-white/85">
            Vuoi abbandonare la battaglia? Conta come sconfitta.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeAll}
              className={`flex flex-1 items-center justify-center gap-1 rounded-2xl border-2 border-black py-3 text-xs uppercase tracking-wide ${TEAL} text-[#f5a623] shadow-[0_3px_0_0_#000]`}
            >
              <X size={14} /> Annulla
            </button>
            <button
              type="button"
              onClick={() => {
                closeAll();
                onSurrender?.();
              }}
              className="flex flex-1 items-center justify-center gap-1 rounded-2xl border-2 border-black bg-[#7f1d1d] py-3 text-xs font-bold uppercase tracking-wide text-red-200 shadow-[0_3px_0_0_#000]"
            >
              <Flag size={14} /> Arrenditi
            </button>
          </div>
        </div>
      </GameModal>
    </>
  );
}

function MenuRow({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border-2 border-black px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide shadow-[0_2px_0_0_#000]",
        danger
          ? "bg-[#3b0a0a] text-red-400"
          : `bg-[#0d2a2c] text-white hover:text-[#f5a623]`
      )}
    >
      <Icon size={15} className={danger ? "text-red-400" : "text-[#f5a623]"} />
      {label}
    </button>
  );
}

function RewardLine({ label, value, accent }) {
  return (
    <div className={`flex items-center justify-between rounded-xl ${TEAL} ${PANEL_SM} px-3 py-2.5`}>
      <span className="text-[10px] uppercase tracking-widest text-white/70">{label}</span>
      <span className="text-sm font-black tabular-nums" style={{ color: accent || "#f5a623" }}>
        {value}
      </span>
    </div>
  );
}
