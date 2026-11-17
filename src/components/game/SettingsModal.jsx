import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useGame } from "@/hooks/useGame";
import { loadAudioSettings, saveAudioSettings } from "@/lib/audioSettings";
import { computePlayerStats } from "@/lib/playerStats";
import { updateDisplayName } from "@/lib/firebase";
import { TEAL, AMBER, PANEL, PANEL_SM } from "@/lib/arcade";
import { cn } from "@/lib/utils";
import {
  X,
  User,
  BarChart3,
  Volume2,
  LogOut,
  VolumeX,
  Copy,
  Check,
  Loader2,
} from "lucide-react";

const TABS = [
  { id: "account", label: "Account", icon: User },
  { id: "stats", label: "Statistiche", icon: BarChart3 },
  { id: "audio", label: "Audio", icon: Volume2 },
];

function SliderRow({ label, value, onChange, disabled }) {
  return (
    <div className={cn("space-y-1.5", disabled && "opacity-40")}>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide">
        <span className="text-[#f5a623]">{label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full border border-black bg-[#0b161b] accent-[#f5a623]"
      />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className={`rounded-xl ${TEAL} ${PANEL_SM} p-3`}>
      <p className="text-[9px] uppercase tracking-widest text-[#f5a623]">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

export default function SettingsModal({ open, onClose, initialTab = "account" }) {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { owned, charMap, playerState } = useGame();

  const [tab, setTab] = useState(initialTab);
  const [audio, setAudio] = useState(loadAudioSettings);
  const [displayName, setDisplayName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setAudio(loadAudioSettings());
      setDisplayName(user?.full_name || user?.displayName || "");
      setConfirmLogout(false);
      setNameMsg("");
    }
  }, [open, initialTab, user]);

  const stats = computePlayerStats({ owned, charMap, playerState });

  function patchAudio(partial) {
    const next = saveAudioSettings(partial);
    setAudio(next);
  }

  async function handleSaveName(e) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setNameSaving(true);
    setNameMsg("");
    try {
      await updateDisplayName(displayName.trim());
      await refreshUser?.();
      setNameMsg("Nome aggiornato");
    } catch (err) {
      setNameMsg(err.message || "Errore salvataggio");
    } finally {
      setNameSaving(false);
    }
  }

  async function copyUid() {
    if (!user?.uid && !user?.id) return;
    await navigator.clipboard.writeText(user.uid || user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      onClose?.();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

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
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl ${TEAL} border-2 border-black shadow-[0_6px_0_0_#000]`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-black px-4 py-3">
              <div>
                <h2 className="text-base uppercase tracking-wide text-white">Impostazioni</h2>
                <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">Settings</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b] shadow-[0_2px_0_0_#000]"
              >
                <X size={16} className="text-[#f5a623]" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
              {/* Sidebar tabs */}
              <aside className="flex shrink-0 gap-1 overflow-x-auto border-b-2 border-black p-2 sm:w-36 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r-2">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border-2 border-black px-3 py-2 text-left text-[10px] uppercase tracking-wide shadow-[0_2px_0_0_#000]",
                      tab === id ? AMBER : "bg-[#0b161b] text-white"
                    )}
                  >
                    <Icon size={14} className={tab === id ? "text-black" : "text-[#f5a623]"} />
                    <span className={tab === id ? "text-black font-bold" : ""}>{label}</span>
                  </button>
                ))}
              </aside>

              {/* Content */}
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {tab === "account" && (
                  <div className="space-y-4">
                    <div className={`rounded-xl ${PANEL_SM} bg-[#0b161b] p-3`}>
                      <p className="text-[9px] uppercase tracking-widest text-[#f5a623]">Profilo</p>
                      <p className="mt-1 text-lg uppercase text-white">{user?.full_name || "Capitano"}</p>
                      <p className="text-xs text-white/60">{user?.email || "—"}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <code className="flex-1 truncate rounded border border-black bg-[#164446] px-2 py-1 text-[10px] text-[#f5a623]">
                          {user?.uid || user?.id || "local-player"}
                        </code>
                        <button
                          type="button"
                          onClick={copyUid}
                          className={`rounded-lg border-2 border-black px-2 py-1 ${AMBER}`}
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] uppercase">
                        <div>
                          <p className="text-white/40">Stato</p>
                          <p className="text-white">Connesso</p>
                        </div>
                        <div>
                          <p className="text-white/40">Provider</p>
                          <p className="text-white">{user?.provider || "—"}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-white/40">Registrato</p>
                          <p className="text-white">
                            {user?.createdAt
                              ? new Date(user.createdAt).toLocaleString("it-IT")
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSaveName} className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-[#f5a623]">
                        Cambia nome
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="min-w-0 flex-1 rounded-xl border-2 border-black bg-[#0b161b] px-3 py-2 text-sm uppercase text-white focus:outline-none focus:ring-1 focus:ring-[#f5a623]"
                          maxLength={24}
                        />
                        <button
                          type="submit"
                          disabled={nameSaving}
                          className={`rounded-xl px-3 py-2 text-xs uppercase ${AMBER} border-2 border-black shadow-[0_2px_0_0_#000] disabled:opacity-50`}
                        >
                          {nameSaving ? <Loader2 className="animate-spin" size={14} /> : "Salva"}
                        </button>
                      </div>
                      {nameMsg && <p className="text-[10px] text-[#f5a623]">{nameMsg}</p>}
                    </form>
                  </div>
                )}

                {tab === "stats" && (
                  <div className="grid grid-cols-2 gap-2">
                    <StatCard label="Partite" value={stats.battlesPlayed} />
                    <StatCard label="Vittorie" value={stats.wins} />
                    <StatCard label="Sconfitte" value={stats.losses} />
                    <StatCard label="Win rate" value={`${stats.winRate}%`} />
                    <StatCard label="Personaggi" value={stats.charactersOwned} />
                    <StatCard label="Unici" value={stats.uniqueCharacters} />
                    <StatCard label="Potenza team" value={stats.teamPower} />
                    <StatCard label="Cap. storia" value={stats.storyProgress} />
                    <StatCard label="Lv account" value={stats.accountLevel} />
                    <StatCard label="Gacha" value={stats.gachaPulls} />
                  </div>
                )}

                {tab === "audio" && (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => patchAudio({ muted: !audio.muted })}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border-2 border-black px-3 py-3 shadow-[0_3px_0_0_#000]",
                        audio.muted ? "bg-red-900/80" : AMBER
                      )}
                    >
                      <span className={cn("flex items-center gap-2 text-xs uppercase font-bold", audio.muted ? "text-white" : "text-black")}>
                        {audio.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        {audio.muted ? "Audio disattivato" : "Audio attivo"}
                      </span>
                      <span className={cn("text-[10px] uppercase", audio.muted ? "text-white/70" : "text-black/70")}>
                        Tocca per {audio.muted ? "riattivare" : "silenziare"}
                      </span>
                    </button>

                    <SliderRow
                      label="Volume generale"
                      value={audio.master}
                      disabled={audio.muted}
                      onChange={(master) => patchAudio({ master })}
                    />
                    <SliderRow
                      label="Musica (BGM)"
                      value={audio.bgm}
                      disabled={audio.muted}
                      onChange={(bgm) => patchAudio({ bgm })}
                    />
                    <SliderRow
                      label="Effetti (SFX)"
                      value={audio.sfx}
                      disabled={audio.muted}
                      onChange={(sfx) => patchAudio({ sfx })}
                    />
                    <p className="text-[9px] uppercase tracking-wide text-white/40">
                      Preferenze salvate in locale. Gli SFX UI usano il canale Effetti.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Logout footer */}
            <div className="border-t-2 border-black p-3">
              {!confirmLogout ? (
                <button
                  type="button"
                  onClick={() => setConfirmLogout(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-black bg-red-700 py-3 text-sm uppercase tracking-wide text-white shadow-[0_3px_0_0_#000]"
                >
                  <LogOut size={16} /> Logout
                </button>
              ) : (
                <div className={`rounded-xl ${PANEL_SM} bg-[#3b0a0a] p-3`}>
                  <p className="text-center text-xs uppercase tracking-wide text-white">
                    Sei sicuro di volerti disconnettere?
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmLogout(false)}
                      className={`flex-1 rounded-xl py-2 text-xs uppercase ${TEAL} border-2 border-black`}
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      disabled={loggingOut}
                      onClick={handleLogout}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl border-2 border-black bg-red-600 py-2 text-xs uppercase text-white disabled:opacity-50"
                    >
                      {loggingOut ? <Loader2 className="animate-spin" size={14} /> : <LogOut size={14} />}
                      Conferma
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
