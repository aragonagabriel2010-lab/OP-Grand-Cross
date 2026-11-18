import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/hooks/useGame";
import { useAuth } from "@/lib/AuthContext";
import BottomNav from "@/components/game/BottomNav";
import GameTopBar from "@/components/game/GameTopBar";
import { TEAL, AMBER, PANEL } from "@/lib/arcade";
import {
  getMyFriendCode,
  loadFriends,
  saveFriends,
  addLocalFriend,
  removeLocalFriend,
  lookupFriendByCode,
  buildPublicProfile,
  publishPublicProfile,
} from "@/lib/friends";
import {
  PVP_KINDS,
  loadPvpState,
  rankFromRating,
  nextRank,
  buildLeaderboard,
  weeklyPrizeForState,
  claimWeeklyPvpPrize,
  CASUAL_WIN_BERRY,
} from "@/lib/pvp";
import { findOpponent, saveMatch, battlePathForKind } from "@/lib/pvpMatch";
import { db } from "@/lib/localDb";
import { toast } from "@/components/ui/use-toast";
import { AudioManager } from "@/lib/AudioManager";
import {
  Users,
  Swords,
  Trophy,
  Search,
  UserPlus,
  Trash2,
  Coins,
  Gem,
  ChevronRight,
  Loader2,
  Gift,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "friends", label: "Amici", Icon: Users },
  { id: "pvp", label: "PvP", Icon: Swords },
  { id: "ladder", label: "Classifica", Icon: Trophy },
];

export default function Friends() {
  const { loading, playerState, owned, charMap, characters, refresh, patchPlayerState } = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "friends";

  const uid = playerState?.created_by_id || playerState?.id || user?.uid;
  const myName =
    user?.full_name || user?.displayName || user?.email?.split("@")[0] || "Capitano";
  const myCode = getMyFriendCode(uid);

  const [friends, setFriends] = useState([]);
  const [codeInput, setCodeInput] = useState("");
  const [addError, setAddError] = useState("");
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(null);
  const [pvpState, setPvpState] = useState(null);
  const [ladder, setLadder] = useState([]);

  const ADD_ERRORS = {
    empty: "Inserisci un codice amico.",
    invalid: "Codice non valido (minimo 4 caratteri).",
    self: "Non puoi aggiungere te stesso.",
    not_found: "Utente non trovato.",
    already: "Questo pirata è già nella tua lista amici.",
    offline: "Sei offline: serve connessione per cercare amici.",
    network: "Errore di rete. Riprova tra poco.",
    full: "Lista amici piena (max 40).",
  };

  function showAddError(reason) {
    setAddError(ADD_ERRORS[reason] || "Impossibile aggiungere");
  }

  useEffect(() => {
    if (!uid) return;
    // rimuovi ghost creati dal vecchio fallback offline (local_*)
    const cleaned = loadFriends(uid).filter((f) => f?.uid && !String(f.uid).startsWith("local_"));
    saveFriends(uid, cleaned);
    setFriends(cleaned);
    setPvpState(loadPvpState(uid));
    setLadder(buildLeaderboard(uid, myName));
  }, [uid, myName]);

  useEffect(() => {
    if (!uid || !playerState || !owned || !charMap) return;
    const profile = buildPublicProfile({
      uid,
      displayName: myName,
      playerState,
      owned,
      charMap,
    });
    publishPublicProfile(profile).catch(() => {});
  }, [uid, playerState, owned, charMap, myName]);

  const rank = useMemo(
    () => rankFromRating(pvpState?.rating || 1000),
    [pvpState]
  );
  const upcoming = useMemo(
    () => nextRank(pvpState?.rating || 1000),
    [pvpState]
  );
  const weekly = useMemo(
    () => weeklyPrizeForState(pvpState || {}),
    [pvpState]
  );

  function setTab(id) {
    setParams(id === "friends" ? {} : { tab: id });
  }

  async function onAddFriend() {
    if (!uid || busy) return;
    setBusy(true);
    setAddError("");
    try {
      const normalized = codeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!normalized) {
        showAddError("empty");
        return;
      }
      if (normalized.length < 4) {
        showAddError("invalid");
        return;
      }
      if (normalized === myCode) {
        showAddError("self");
        return;
      }
      const res = await lookupFriendByCode(normalized);
      if (!res.ok || !res.profile?.uid) {
        showAddError(res.reason || "not_found");
        return;
      }
      if (res.profile.uid === uid || res.profile.friendCode === myCode) {
        showAddError("self");
        return;
      }
      if (friends.length >= 40) {
        showAddError("full");
        return;
      }
      const added = addLocalFriend(uid, {
        uid: res.profile.uid,
        code: res.profile.friendCode || normalized,
        name: res.profile.displayName || "Pirata",
      });
      if (!added.ok) {
        showAddError(added.reason === "already" ? "already" : "already");
        return;
      }
      setFriends(added.list);
      setCodeInput("");
      setAddError("");
      AudioManager.playClick();
      toast({
        title: "Amico aggiunto",
        description: res.profile.displayName || "Pirata",
      });
    } catch {
      showAddError("network");
    } finally {
      setBusy(false);
    }
  }

  function onRemoveFriend(friendUid) {
    setFriends(removeLocalFriend(uid, friendUid));
  }

  async function startMatch(kind, friendProfile = null) {
    if (!uid || searching) return;
    setSearching(kind);
    AudioManager.playClick();
    try {
      await new Promise((r) => setTimeout(r, kind === PVP_KINDS.FRIENDLY ? 600 : 1400 + Math.random() * 900));
      const match = await findOpponent({
        uid,
        kind,
        heroes: characters || Object.values(charMap || {}),
        charMap,
        friendProfile,
      });
      if (!match?.opponent?.fighters?.length) {
        toast({ title: "Nessun avversario", description: "Riprova tra poco." });
        return;
      }
      saveMatch(match);
      navigate(battlePathForKind(kind));
    } catch (err) {
      console.error(err);
      toast({ title: "Ricerca fallita", description: "Riprova." });
    } finally {
      setSearching(null);
    }
  }

  async function onClaimWeekly() {
    if (!uid || !playerState) return;
    const res = claimWeeklyPvpPrize(uid);
    if (!res.ok) {
      toast({
        title: "Non reclamabile",
        description: res.prize.claimed
          ? "Premio già ritirato questa settimana."
          : "Gioca almeno 1 Ranked questa settimana.",
      });
      return;
    }
    const patch = {
      berry: (playerState.berry || 0) + (res.reward.berry || 0),
      strawberry: (playerState.strawberry || 0) + (res.reward.strawberry || 0),
    };
    patchPlayerState?.(patch);
    await db.entities.PlayerState.update(playerState.id, patch);
    setPvpState(res.state);
    refresh?.();
    AudioManager.playHeal();
    toast({
      title: `Premio ${res.prize.tier.name}`,
      description: `+${res.reward.strawberry} Fragole · +${res.reward.berry} Beri`,
    });
  }

  if (loading || !playerState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b161b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b161b] pb-24 text-white">
      <GameTopBar showBack backTo="/" />
      <div className={`border-b-2 border-black ${TEAL}`}>
        <div className="mx-auto max-w-md px-4 py-2 text-center">
          <h1 className="text-sm uppercase tracking-wide">Amici & PvP</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">
            Sfide · Arena · Classifica
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-md gap-1 px-3 pt-3">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-xl border-2 border-black py-2 text-[10px] font-bold uppercase shadow-[0_2px_0_0_#000]",
              tab === id ? `${AMBER} text-black` : "bg-[#0b161b] text-white/70"
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <main className="mx-auto max-w-md space-y-3 px-3 pt-3">
        {tab === "friends" && (
          <>
            <div className={`rounded-2xl ${TEAL} ${PANEL} p-3.5`}>
              <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">Il tuo codice</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="font-mono text-2xl tracking-[0.2em] text-white">{myCode}</p>
                <button
                  type="button"
                  className={`rounded-xl px-3 py-2 text-[10px] font-bold uppercase ${AMBER} border-2 border-black text-black`}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(myCode);
                      toast({ title: "Codice copiato" });
                    } catch {
                      toast({ title: myCode });
                    }
                  }}
                >
                  Copia
                </button>
              </div>
              <p className="mt-2 text-[10px] text-white/50">
                Condividilo per ricevere sfide amichevoli. La tua squadra attiva è la difesa.
              </p>
            </div>

            <div className={`rounded-2xl ${TEAL} ${PANEL} p-3.5`}>
              <p className="mb-2 text-[10px] uppercase tracking-widest text-[#f5a623]">Aggiungi amico</p>
              <div className="flex gap-2">
                <input
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value.toUpperCase());
                    if (addError) setAddError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void onAddFriend();
                  }}
                  placeholder="CODICE"
                  maxLength={8}
                  aria-invalid={!!addError}
                  className={cn(
                    "min-w-0 flex-1 rounded-xl border-2 bg-[#0b161b] px-3 py-2 font-mono text-sm uppercase tracking-widest text-white outline-none",
                    addError ? "border-red-500" : "border-black"
                  )}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={onAddFriend}
                  className={`flex items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-bold uppercase ${AMBER} border-2 border-black text-black disabled:opacity-40`}
                >
                  <UserPlus size={14} />
                  Add
                </button>
              </div>
              {addError && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="mt-2 rounded-xl border-2 border-red-500 bg-[#3b0a0a] px-3 py-2 shadow-[0_3px_0_0_#7f1d1d]"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wide text-red-300">
                    {addError}
                  </p>
                </motion.div>
              )}
            </div>

            <div className="space-y-2">
              {friends.length === 0 && (
                <p className="rounded-xl border-2 border-dashed border-white/15 px-3 py-6 text-center text-[11px] uppercase text-white/40">
                  Nessun amico ancora
                </p>
              )}
              {friends.map((f) => (
                <div
                  key={f.uid}
                  className={`flex items-center gap-2 rounded-2xl ${TEAL} ${PANEL} p-3`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]">
                    <Users size={16} className="text-[#f5a623]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold uppercase">{f.name}</p>
                    <p className="font-mono text-[10px] text-white/45">{f.code}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!!searching}
                    onClick={() => startMatch(PVP_KINDS.FRIENDLY, f)}
                    className={`rounded-xl border-2 border-black ${AMBER} px-2.5 py-2 text-[9px] font-bold uppercase text-black`}
                  >
                    Sfida
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveFriend(f.uid)}
                    className="rounded-xl border-2 border-black bg-[#0b161b] p-2 text-white/50"
                    aria-label="Rimuovi"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "pvp" && (
          <>
            <div className={`rounded-2xl ${TEAL} ${PANEL} p-3.5`}>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]"
                  style={{ boxShadow: `inset 0 0 12px ${rank.color}55` }}
                >
                  <Crown size={20} style={{ color: rank.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: rank.color }}>
                    Ranked · {rank.name}
                  </p>
                  <p className="text-lg font-bold uppercase tabular-nums">{pvpState?.rating ?? 1000} LP</p>
                  <p className="text-[10px] text-white/45">
                    {pvpState?.wins || 0}W · {pvpState?.losses || 0}L
                    {upcoming ? ` · next ${upcoming.name} @ ${upcoming.minRating}` : " · max rank"}
                  </p>
                </div>
              </div>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={!!searching}
              onClick={() => startMatch(PVP_KINDS.CASUAL)}
              className={`flex w-full items-center gap-3 rounded-2xl ${TEAL} ${PANEL} p-3.5 text-left`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]">
                <Coins size={20} className="text-[#f5a623]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">Libero</p>
                <h2 className="text-base uppercase">Ricerca avversario</h2>
                <p className="text-[10px] text-white/55">
                  +{CASUAL_WIN_BERRY} Beri a vittoria · anche in sconfitta un piccolo premio
                </p>
              </div>
              <ChevronRight size={16} className="text-[#f5a623]" />
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={!!searching}
              onClick={() => startMatch(PVP_KINDS.RANKED)}
              className={`flex w-full items-center gap-3 rounded-2xl ${AMBER} ${PANEL} p-3.5 text-left text-black`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black bg-[#0b161b]">
                <Gem size={20} className="text-[#f5a623]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-black/60">Ranked</p>
                <h2 className="text-base uppercase">Partita classificata</h2>
                <p className="text-[10px] text-black/65">
                  +{rank.matchStrawberry} Fragole/rank ({rank.name}) · LP su classifica
                </p>
              </div>
              <ChevronRight size={16} />
            </motion.button>

            <div className={`rounded-2xl ${TEAL} ${PANEL} p-3.5`}>
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#f5a623]">
                  <Gift size={12} /> Premio settimanale
                </p>
                <span className="text-[9px] uppercase text-white/45">
                  Peak {weekly.tier.name}
                </span>
              </div>
              <p className="text-[11px] text-white/70">
                In base al rank più alto della settimana nelle ranked: +{weekly.strawberry} Fragole · +
                {weekly.berry} Beri
              </p>
              <button
                type="button"
                disabled={!weekly.canClaim}
                onClick={onClaimWeekly}
                className={cn(
                  "mt-3 w-full rounded-xl border-2 border-black py-2.5 text-[11px] font-bold uppercase",
                  weekly.canClaim
                    ? `${AMBER} text-black`
                    : "bg-[#0b161b] text-white/35"
                )}
              >
                {weekly.claimed
                  ? "Già ritirato"
                  : weekly.canClaim
                    ? "Ritira premio"
                    : "Gioca 1 Ranked per sbloccare"}
              </button>
            </div>
          </>
        )}

        {tab === "ladder" && (
          <div className={`rounded-2xl ${TEAL} ${PANEL} overflow-hidden`}>
            <div className="border-b-2 border-black px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">Classifica Ranked</p>
            </div>
            <ul className="divide-y divide-black/40">
              {ladder.map((row) => (
                <li
                  key={row.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5",
                    row.isYou && "bg-[#f5a623]/10"
                  )}
                >
                  <span className="w-6 text-center text-[11px] font-bold tabular-nums text-white/50">
                    {row.place}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-bold uppercase", row.isYou && "text-[#f5a623]")}>
                      {row.name}
                      {row.isYou ? " (tu)" : ""}
                    </p>
                    <p className="text-[9px] uppercase" style={{ color: row.rank.color }}>
                      {row.rank.name}
                    </p>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-white/80">{row.rating}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <AnimatePresence>
        {searching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 px-6"
          >
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#f5a623]" />
            <Search className="mb-2 text-[#f5a623]" size={22} />
            <p className="text-sm uppercase tracking-[0.25em] text-[#f5a623]">
              {searching === PVP_KINDS.FRIENDLY
                ? "Preparazione sfida..."
                : "Ricerca avversario..."}
            </p>
            <p className="mt-2 text-center text-[10px] uppercase text-white/45">
              {searching === PVP_KINDS.RANKED
                ? "Matchmaking ranked"
                : searching === PVP_KINDS.CASUAL
                  ? "Arena libera"
                  : "Amichevole"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
