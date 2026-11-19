import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/localDb";
import { useGame } from "@/hooks/useGame";
import BottomNav from "@/components/game/BottomNav";
import GameTopBar from "@/components/game/GameTopBar";
import { CharacterArt } from "@/components/game/CharacterCard";
import RarityStars from "@/components/game/RarityStars";
import CharactersSidebar from "@/components/game/characters/CharactersSidebar";
import TeamPanel from "@/components/game/characters/TeamPanel";
import FilterPanel from "@/components/game/characters/FilterPanel";
import SortMenu, { SORT_OPTIONS } from "@/components/game/characters/SortMenu";
import { TEAL, AMBER, PANEL } from "@/lib/arcade";
import { effectiveHp, effectiveAttack, ATTRIBUTE_INFO, RARITY_ORDER } from "@/lib/gameUtils";
import { AttributeIcon } from "@/components/game/AttributeIcons";
import { Users, Search, X, Swords, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const EMPTY_FILTERS = { attributes: [], factions: [], uniqueTypes: [], ownership: "all" };
const TEAM_SIZE = 4;

function emptyTeam() {
  return Array.from({ length: TEAM_SIZE }, () => null);
}

function normalizeTeam(raw) {
  const next = emptyTeam();
  (raw || []).forEach((id, i) => {
    if (i < TEAM_SIZE) next[i] = id || null;
  });
  return next;
}

function sortOwned(list, charMap, sortId) {
  const rows = [...list];
  const rarityIdx = (o) => RARITY_ORDER.indexOf(charMap[o.character_id]?.rarity ?? "C");
  switch (sortId) {
    case "rarity_asc":
      return rows.sort((a, b) => rarityIdx(a) - rarityIdx(b));
    case "level_desc":
      return rows.sort((a, b) => (b.level || 1) - (a.level || 1) || rarityIdx(b) - rarityIdx(a));
    case "level_asc":
      return rows.sort((a, b) => (a.level || 1) - (b.level || 1));
    case "hp_desc":
      return rows.sort(
        (a, b) =>
          effectiveHp(charMap[b.character_id], b) - effectiveHp(charMap[a.character_id], a)
      );
    case "atk_desc":
      return rows.sort(
        (a, b) =>
          effectiveAttack(charMap[b.character_id], b) - effectiveAttack(charMap[a.character_id], a)
      );
    case "name_asc":
      return rows.sort((a, b) =>
        (charMap[a.character_id]?.char_name || "").localeCompare(charMap[b.character_id]?.char_name || "")
      );
    case "rarity_desc":
    default:
      return rows.sort((a, b) => rarityIdx(b) - rarityIdx(a) || (b.level || 1) - (a.level || 1));
  }
}

function sortLockedChars(list, sortId) {
  const rows = [...list];
  const rarityIdx = (c) => RARITY_ORDER.indexOf(c.rarity ?? "C");
  switch (sortId) {
    case "rarity_asc":
      return rows.sort((a, b) => rarityIdx(a) - rarityIdx(b));
    case "name_asc":
      return rows.sort((a, b) => (a.char_name || "").localeCompare(b.char_name || ""));
    case "rarity_desc":
    default:
      return rows.sort(
        (a, b) => rarityIdx(b) - rarityIdx(a) || (a.char_name || "").localeCompare(b.char_name || "")
      );
  }
}

export default function Characters() {
  const { loading, charMap, owned, playerState, refresh } = useGame();
  const navigate = useNavigate();

  const [team, setTeam] = useState([]);
  const [panel, setPanel] = useState(null);
  const [pickingSlot, setPickingSlot] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [query, setQuery] = useState("");
  const [sortId, setSortId] = useState("rarity_desc");

  useEffect(() => {
    if (!playerState) return;
    setTeam(normalizeTeam(playerState.team));
  }, [playerState]);

  useEffect(() => {
    if (!playerState) return;
    const uid = playerState.created_by_id || playerState.id;
    import("@/lib/dailies").then(({ bumpDaily }) => bumpDaily(uid, "open_characters")).catch(() => {});
  }, [playerState]);

  const persistTeam = useCallback(
    async (slots) => {
      if (!playerState) return;
      const fixed = normalizeTeam(slots);
      await db.entities.PlayerState.update(playerState.id, { team: fixed });
      refresh();
    },
    [playerState, refresh]
  );

  const updateTeam = useCallback(
    (slots) => {
      const fixed = normalizeTeam(slots);
      setTeam(fixed);
      persistTeam(fixed);
    },
    [persistTeam]
  );

  const ownedCharIds = useMemo(
    () => new Set((owned || []).map((o) => o.character_id)),
    [owned]
  );

  const heroCatalog = useMemo(() => {
    if (!charMap) return [];
    return Object.values(charMap).filter((c) => c.role === "hero");
  }, [charMap]);

  const filteredOwned = useMemo(() => {
    if (!owned || !charMap) return [];
    let list = owned.filter((o) => charMap[o.character_id]?.role === "hero");

    if (filters.attributes.length) {
      list = list.filter((o) => filters.attributes.includes(charMap[o.character_id].attribute));
    }
    if (filters.factions.length) {
      list = list.filter((o) => filters.factions.includes(charMap[o.character_id].faction));
    }
    if ((filters.uniqueTypes || []).length) {
      list = list.filter((o) =>
        (filters.uniqueTypes || []).includes(charMap[o.character_id]?.unique?.type)
      );
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((o) => {
        const c = charMap[o.character_id];
        return (
          c.char_name.toLowerCase().includes(q) ||
          (c.version || "").toLowerCase().includes(q) ||
          (c.arc || "").toLowerCase().includes(q) ||
          (c.unique?.name || "").toLowerCase().includes(q)
        );
      });
    }
    return sortOwned(list, charMap, sortId);
  }, [owned, charMap, filters, query, sortId]);

  const filteredLocked = useMemo(() => {
    let list = heroCatalog.filter((c) => !ownedCharIds.has(c.id));

    if (filters.attributes.length) {
      list = list.filter((c) => filters.attributes.includes(c.attribute));
    }
    if (filters.factions.length) {
      list = list.filter((c) => filters.factions.includes(c.faction));
    }
    if ((filters.uniqueTypes || []).length) {
      list = list.filter((c) => (filters.uniqueTypes || []).includes(c.unique?.type));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.char_name.toLowerCase().includes(q) ||
          (c.version || "").toLowerCase().includes(q) ||
          (c.arc || "").toLowerCase().includes(q)
      );
    }
    return sortLockedChars(list, sortId);
  }, [heroCatalog, ownedCharIds, filters, query, sortId]);

  const ownership = filters.ownership || "all";
  const showOwned = ownership !== "locked";
  const showLocked = ownership !== "owned";
  const visibleOwned = showOwned ? filteredOwned : [];
  const visibleLocked = showLocked ? filteredLocked : [];

  const filterActive =
    filters.attributes.length > 0 ||
    filters.factions.length > 0 ||
    (filters.uniqueTypes || []).length > 0 ||
    ownership !== "all";
  const searchActive = query.trim().length > 0;
  const sortLabel = SORT_OPTIONS.find((o) => o.id === sortId)?.label || "Ordina";
  const totalVisible = visibleOwned.length + visibleLocked.length;

  function openTool(id) {
    if (id === "search") {
      setPanel((p) => (p === "search" ? null : "search"));
      return;
    }
    if (id === "crew") {
      setPanel("crew");
      setPickingSlot(null);
      return;
    }
    setPanel((p) => (p === id ? null : id));
  }

  function assignToSlot(slot, ownedId) {
    const next = normalizeTeam(team);
    const prevSlot = next.indexOf(ownedId);
    if (prevSlot === slot) {
      setPickingSlot(null);
      return;
    }
    if (prevSlot >= 0) next[prevSlot] = next[slot];
    next[slot] = ownedId;
    updateTeam(next);
    setPickingSlot(null);
  }

  function clearSlot(slot) {
    const next = normalizeTeam(team);
    next[slot] = null;
    updateTeam(next);
    if (pickingSlot === slot) setPickingSlot(null);
  }

  if (loading || !playerState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b161b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b161b] pb-[10.5rem] text-white">
      <GameTopBar />

      <div className={`border-b-2 border-black ${TEAL}`}>
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
          <h1 className="flex items-center gap-2 text-sm uppercase tracking-wide">
            <Users className="text-[#f5a623]" size={18} /> Personaggi
          </h1>
          <span className="text-[10px] uppercase tracking-widest text-[#f5a623]">
            {ownedCharIds.size}/{heroCatalog.length}
          </span>
        </div>
        <AnimatePresence>
          {panel === "search" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t-2 border-black"
            >
              <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-2">
                <Search size={16} className="shrink-0 text-[#f5a623]" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cerca per nome..."
                  className="w-full rounded-lg border-2 border-black bg-[#0b161b] px-3 py-2 text-sm uppercase tracking-wide text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[#f5a623]"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="rounded-lg border-2 border-black bg-[#0b161b] p-2">
                    <X size={14} className="text-[#f5a623]" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mx-auto flex max-w-md gap-2 px-2 pt-3">
        <motion.div
          initial={{ x: -16 }}
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 26, delay: 0.1 }}
        >
          <CharactersSidebar
            active={panel}
            onSelect={openTool}
            filterActive={filterActive}
            searchActive={searchActive}
          />
        </motion.div>

        <main className="min-w-0 flex-1 pr-1">
          {(filterActive || searchActive || sortId !== "rarity_desc") && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 flex flex-wrap items-center gap-1"
            >
              {filterActive && (
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className={`rounded border border-black px-1.5 py-0.5 text-[9px] uppercase ${AMBER}`}
                >
                  {ownership === "owned"
                    ? "Solo posseduti ✕"
                    : ownership === "locked"
                      ? "Solo non posseduti ✕"
                      : "Filtri attivi ✕"}
                </button>
              )}
              {searchActive && (
                <span className="rounded border border-black bg-[#0d2a2c] px-1.5 py-0.5 text-[9px] uppercase text-[#f5a623]">
                  “{query}”
                </span>
              )}
              {sortId !== "rarity_desc" && (
                <span className="rounded border border-black bg-[#0d2a2c] px-1.5 py-0.5 text-[9px] uppercase text-white/70">
                  {sortLabel}
                </span>
              )}
            </motion.div>
          )}

          {totalVisible === 0 ? (
            <motion.div
              initial={{ y: 12 }}
              animate={{ y: 0 }}
              className={`rounded-2xl ${TEAL} border-2 border-black p-6 text-center shadow-[0_3px_0_0_#000]`}
            >
              <p className="text-sm uppercase tracking-wide text-white/70">Nessun personaggio</p>
              <p className="mt-1 text-[10px] uppercase text-[#f5a623]">Prova a cambiare filtri o ricerca</p>
            </motion.div>
          ) : (
            <div className="space-y-5 pb-4">
              {visibleOwned.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2 px-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#f5a623]">
                      Posseduti
                    </span>
                    <span className="text-[9px] uppercase text-white/40">{visibleOwned.length}</span>
                    <div className="h-px flex-1 bg-[#f5a623]/20" />
                  </div>
                  <div className="grid grid-cols-4 gap-x-1.5 gap-y-3">
                    {visibleOwned.map((o, i) => {
                      const c = charMap[o.character_id];
                      const inTeam = team.includes(o.id);
                      const teamSlot = team.indexOf(o.id);
                      const attr = ATTRIBUTE_INFO[c.attribute];
                      return (
                        <motion.button
                          key={o.id}
                          type="button"
                          onClick={() => navigate(`/character/${o.id}`)}
                          initial={{ y: 14, scale: 0.92 }}
                          animate={{ y: 0, scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 24,
                            delay: Math.min(0.08 + i * 0.03, 0.45),
                          }}
                          whileTap={{ scale: 0.96 }}
                          className="group flex flex-col items-center gap-0.5"
                        >
                          <div className="relative w-full">
                            <div
                              className={cn(
                                "relative aspect-[3/4] w-full overflow-hidden rounded-lg border-2 bg-[#0b161b] shadow-[0_3px_0_0_#000] transition-transform group-hover:-translate-y-0.5",
                                inTeam ? "border-[#f5a623]" : "border-black"
                              )}
                              style={
                                inTeam
                                  ? { boxShadow: "0 3px 0 0 #000, 0 0 10px rgba(245,166,35,0.45)" }
                                  : undefined
                              }
                            >
                              <CharacterArt character={c} className="h-full w-full" />
                              {inTeam && (
                                <span
                                  title={teamSlot === 3 ? "Sub" : `Gioco ${teamSlot + 1}`}
                                  className={cn(
                                    "absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded border-2 border-black px-0.5 shadow-[0_2px_0_0_#000]",
                                    teamSlot === 3 ? "bg-[#38bdf8]" : AMBER
                                  )}
                                >
                                  {teamSlot === 3 ? (
                                    <span className="text-[7px] font-black text-black">SUB</span>
                                  ) : (
                                    <Swords size={11} className="text-black" />
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="absolute -top-1 left-1/2 z-[1] -translate-x-1/2 rounded bg-[#0b161b] px-0.5">
                              <RarityStars rarity={c.rarity} size={8} />
                            </div>
                            <div
                              className="absolute -bottom-1 -left-1 z-[1] flex h-5 w-5 items-center justify-center rounded border-2 border-black text-white"
                              style={{ background: attr?.color }}
                            >
                              <AttributeIcon attribute={c.attribute} className="attr-glyph h-3 w-3" />
                            </div>
                            <div
                              className={`absolute -bottom-1 -right-1 z-[1] rounded border border-black px-1 py-0.5 text-[8px] font-bold ${AMBER}`}
                            >
                              L{o.level}
                            </div>
                          </div>
                          <p className="w-full truncate text-center text-[8px] font-bold uppercase leading-tight text-white">
                            {c.char_name}
                          </p>
                          <p className="w-full truncate text-center text-[7px] uppercase text-[#f5a623]">
                            {c.version}
                          </p>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>
              )}

              {visibleLocked.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2 px-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                      Non posseduti
                    </span>
                    <span className="text-[9px] uppercase text-white/30">{visibleLocked.length}</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <div className="grid grid-cols-4 gap-x-1.5 gap-y-3">
                    {visibleLocked.map((c, i) => {
                      const attr = ATTRIBUTE_INFO[c.attribute];
                      return (
                        <motion.button
                          key={c.id}
                          type="button"
                          onClick={() => navigate(`/character/locked/${c.id}`)}
                          initial={{ y: 14, scale: 0.92 }}
                          animate={{ y: 0, scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 24,
                            delay: Math.min(0.08 + (visibleOwned.length + i) * 0.03, 0.55),
                          }}
                          whileTap={{ scale: 0.96 }}
                          className="group flex flex-col items-center gap-0.5"
                        >
                          <div className="relative w-full">
                            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border-2 border-black bg-[#0b161b] shadow-[0_3px_0_0_#000] transition-transform group-hover:-translate-y-0.5">
                              <CharacterArt
                                character={c}
                                className="h-full w-full brightness-[0.15] contrast-125 saturate-0"
                              />
                              <div className="absolute inset-0 bg-[#0b161b]/55" />
                              <span
                                className="absolute inset-0 flex items-center justify-center text-3xl font-black text-[#f5a623]"
                                style={{
                                  textShadow: "0 2px 0 #000, 0 0 12px rgba(245,166,35,0.45)",
                                }}
                              >
                                ?
                              </span>
                            </div>
                            <div className="absolute -top-1 left-1/2 z-[1] -translate-x-1/2 rounded bg-[#0b161b] px-0.5 opacity-70">
                              <RarityStars rarity={c.rarity} size={8} />
                            </div>
                            <div
                              className="absolute -bottom-1 -left-1 z-[1] flex h-5 w-5 items-center justify-center rounded border-2 border-black text-white opacity-80"
                              style={{ background: attr?.color }}
                            >
                              <AttributeIcon attribute={c.attribute} className="attr-glyph h-3 w-3" />
                            </div>
                          </div>
                          <p className="w-full truncate text-center text-[8px] font-bold uppercase leading-tight text-white/50">
                            {c.char_name}
                          </p>
                          <p className="w-full truncate text-center text-[7px] uppercase text-white/25">
                            Non reclutato
                          </p>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>

      <div className="fixed bottom-[4.75rem] left-0 right-0 z-30 mx-auto max-w-md px-2 pb-2 pt-1">
        <div className={`flex items-stretch gap-2 rounded-2xl ${TEAL} ${PANEL} p-1.5`}>
          <button
            type="button"
            onClick={() => openTool("crew")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-black py-2.5 uppercase tracking-wide shadow-[0_2px_0_0_#000] transition-transform active:translate-y-0.5 ${
              panel === "crew" ? AMBER : "bg-[#0b161b] text-white"
            }`}
          >
            <Swords size={16} className={panel === "crew" ? "text-black" : "text-[#f5a623]"} />
            <span className={cn("text-[11px] font-bold", panel === "crew" ? "text-black" : "text-white")}>
              Imposta Squadra
            </span>
          </button>
          <button
            type="button"
            onClick={() => openTool("filter")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-black py-2.5 uppercase tracking-wide shadow-[0_2px_0_0_#000] transition-transform active:translate-y-0.5 ${
              panel === "filter" || filterActive ? AMBER : "bg-[#0b161b] text-white"
            }`}
          >
            <Filter size={16} className={panel === "filter" || filterActive ? "text-black" : "text-[#f5a623]"} />
            <span className={cn("text-[11px] font-bold", panel === "filter" || filterActive ? "text-black" : "text-white")}>
              Filtra
            </span>
          </button>
        </div>
      </div>

      <TeamPanel
        open={panel === "crew"}
        onClose={() => {
          setPanel(null);
          setPickingSlot(null);
        }}
        team={team}
        owned={owned}
        charMap={charMap}
        pickingSlot={pickingSlot}
        onPickSlot={(slot) => setPickingSlot((s) => (s === slot ? null : slot))}
        onAssign={assignToSlot}
        onClearSlot={clearSlot}
      />

      <FilterPanel
        open={panel === "filter"}
        onClose={() => setPanel(null)}
        filters={filters}
        onChange={setFilters}
      />

      <SortMenu
        open={panel === "sort"}
        onClose={() => setPanel(null)}
        value={sortId}
        onChange={setSortId}
      />

      <BottomNav />
    </div>
  );
}
