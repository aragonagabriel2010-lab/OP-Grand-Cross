import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/localDb";

import { useGame } from "@/hooks/useGame";
import GameTopBar from "@/components/game/GameTopBar";
import { CharacterArt } from "@/components/game/CharacterCard";
import UpgradeBurst from "@/components/game/UpgradeBurst";
import { TEAL, AMBER, PANEL, PANEL_SM } from "@/lib/arcade";
import {
  effectiveHp,
  effectiveAttack,
  upgradeCost,
  ascensionCost,
  ATTRIBUTE_INFO,
  RARITY_GLOW,
  RARITY_COLORS,
} from "@/lib/gameUtils";
import {
  ultimatePreview,
  upgradeUltimate,
  ULTIMATE_MAX_LEVEL,
  ULTIMATE_MIN_LEVEL,
  normalizeUltimateFields,
} from "@/lib/ultimate";
import {
  Coins,
  Gem,
  ArrowUp,
  Sparkles,
  Swords,
  Heart,
  Zap,
  Star,
  Hexagon,
  X,
  Shield,
  Users,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

function combatClass(atk, def, hp) {
  return atk * 2 + def + Math.floor(hp / 10);
}

function effectiveDefense(character, owned) {
  const lvl = owned?.level || 1;
  const asc = owned?.ascension || 0;
  const base = Math.round((character.hp || 100) * 0.45);
  return Math.round(base * (1 + (lvl - 1) * 0.06 + asc * 0.12));
}

function MoveIcon({ type, className }) {
  if (type === "heal") return <Heart size={16} className={className} />;
  if (type === "buff") return <Zap size={16} className={className} />;
  return <Swords size={16} className={className} />;
}

export default function CharacterDetail() {
  const { ownedId, characterId } = useParams();
  const navigate = useNavigate();
  const { loading, charMap, owned, playerState, refresh } = useGame();

  const [burst, setBurst] = useState(null);
  const [avatarPulse, setAvatarPulse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedMove, setSelectedMove] = useState(null);
  /** view → preview (70→100) → animating → revealed */
  const [ultiPhase, setUltiPhase] = useState("view");
  const [ultiReveal, setUltiReveal] = useState(null);

  const isLocked = Boolean(characterId);
  const ownedRec = !isLocked ? owned?.find((o) => o.id === ownedId) : null;
  const character = isLocked
    ? charMap[characterId]
    : ownedRec
      ? charMap[ownedRec.character_id]
      : null;
  const ownedNorm = isLocked
    ? character
      ? normalizeUltimateFields({
          id: `locked-${character.id}`,
          character_id: character.id,
          level: 1,
          exp: 0,
          ascension: 0,
          ultimateLevel: ULTIMATE_MIN_LEVEL,
          ultimateTokens: 0,
        })
      : null
    : ownedRec
      ? normalizeUltimateFields(ownedRec)
      : null;
  const ulti = character && ownedNorm ? ultimatePreview(character, ownedNorm) : null;

  const clearBurst = useCallback(() => setBurst(null), []);

  if (loading || !playerState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b161b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
      </div>
    );
  }

  if (!character || !ownedNorm || !ulti || (!isLocked && !ownedRec)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0b161b] text-white">
        <p className="text-sm uppercase tracking-wide text-white/60">Personaggio non trovato</p>
        <button
          onClick={() => navigate("/characters")}
          className={`rounded-xl px-4 py-2 text-sm uppercase tracking-wide ${TEAL} ${PANEL_SM}`}
        >
          Torna ai personaggi
        </button>
      </div>
    );
  }

  const hp = effectiveHp(character, ownedNorm);
  const atk = effectiveAttack(character, ownedNorm);
  const def = effectiveDefense(character, ownedNorm);
  const cc = combatClass(atk, def, hp);
  const attr = ATTRIBUTE_INFO[character.attribute];
  const lvlCost = upgradeCost(ownedNorm.level);
  const ascCost = ascensionCost(ownedNorm.ascension);
  const canLevel = !isLocked && playerState.berry >= lvlCost && ownedNorm.level < 60 && !busy;
  const canAscend = !isLocked && playerState.strawberry >= ascCost && ownedNorm.ascension < 3 && !busy;
  const glow = RARITY_GLOW[character.rarity] || RARITY_GLOW.R;
  const rarityColor = RARITY_COLORS[character.rarity] || RARITY_COLORS.R;
  const canUpgradeUlti = !isLocked && ulti.canUpgrade && !busy;
  const ultMove = ulti.move;
  const normalMoves = (character.moves || []).slice(0, 3);
  const inTeam = !isLocked && (playerState.team || []).includes(ownedNorm.id);

  async function levelUp() {
    if (isLocked || !canLevel) return;
    setBusy(true);
    const nextLevel = ownedNorm.level + 1;
    await db.entities.PlayerState.update(playerState.id, { berry: playerState.berry - lvlCost });
    await db.entities.OwnedCharacter.update(ownedNorm.id, { level: nextLevel, exp: 0 });
    setAvatarPulse(true);
    setBurst({ mode: "level", level: nextLevel, ascension: ownedNorm.ascension });
    refresh();
    setTimeout(() => {
      setAvatarPulse(false);
      setBusy(false);
    }, 900);
  }

  async function ascend() {
    if (isLocked || !canAscend) return;
    setBusy(true);
    const nextAsc = ownedNorm.ascension + 1;
    await db.entities.PlayerState.update(playerState.id, {
      strawberry: playerState.strawberry - ascCost,
    });
    await db.entities.OwnedCharacter.update(ownedNorm.id, { ascension: nextAsc });
    setAvatarPulse(true);
    setBurst({ mode: "ascend", level: ownedNorm.level, ascension: nextAsc });
    refresh();
    setTimeout(() => {
      setAvatarPulse(false);
      setBusy(false);
    }, 1200);
  }

  async function confirmUpgradeUlti() {
    if (isLocked || !canUpgradeUlti || !ulti.next) return;
    setBusy(true);
    setUltiPhase("animating");
    const fromDmg = ulti.current.damage;
    const toDmg = ulti.next.damage;
    const toPower = ulti.next.power;
    const toLevel = ulti.next.level;

    // Shine → explode, poi applica upgrade
    await new Promise((r) => setTimeout(r, 1100));

    try {
      const updated = await upgradeUltimate(ownedNorm.id);
      setAvatarPulse(true);
      setBurst({ mode: "ultimate", level: updated.ultimateLevel });
      setUltiReveal({ fromDmg, toDmg, toPower, toLevel });
      setUltiPhase("revealed");
      refresh();
    } catch (err) {
      console.error(err);
      setUltiPhase("preview");
    } finally {
      setTimeout(() => {
        setAvatarPulse(false);
        setBusy(false);
      }, 1000);
    }
  }

  function openMove(move, index, isUlt) {
    setSelectedMove({ move, index, isUlt });
    setUltiPhase("view");
    setUltiReveal(null);
  }

  function closeMoveSheet() {
    if (ultiPhase === "animating") return;
    setSelectedMove(null);
    setUltiPhase("view");
    setUltiReveal(null);
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#0b161b] text-white">
      <UpgradeBurst
        open={!!burst}
        mode={burst?.mode || "level"}
        level={burst?.level}
        ascension={burst?.ascension}
        onDone={clearBurst}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          background: `
            radial-gradient(ellipse at 78% 40%, ${character.color || "#164446"}50 0%, transparent 55%),
            linear-gradient(180deg, #0d2a2c 0%, #0b161b 45%, #0b161b 100%)
          `,
        }}
      />

      <GameTopBar showBack backTo="/characters" showSettings={false} className="relative z-20 shrink-0" />

      <div className="relative z-10 mx-auto flex w-full max-w-lg shrink-0 items-center gap-2 px-2 py-1">
        <div
          className={cn(
            "shrink-0 rounded-md border-2 border-black px-2 py-1 text-xs font-black uppercase text-black",
            isLocked && "opacity-60"
          )}
          style={{ background: `linear-gradient(135deg, ${rarityColor}, #f5a623)` }}
        >
          {character.rarity}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-[11px] uppercase tracking-widest text-[#f5a623]",
              isLocked && "opacity-50"
            )}
          >
            [{isLocked ? "???" : character.version}]
          </p>
          <h1
            className={cn(
              "truncate text-lg uppercase leading-tight text-white",
              isLocked && "opacity-50"
            )}
            style={{ textShadow: "0 1px 0 #000" }}
          >
            {isLocked ? "???" : character.char_name}
          </h1>
        </div>
        {isLocked ? (
          <div className="shrink-0 rounded-lg border-2 border-black bg-[#0b161b] px-2 py-1">
            <span className="text-[9px] font-bold uppercase text-[#f5a623]">Bloccato</span>
          </div>
        ) : (
          inTeam && (
            <div className={`flex shrink-0 items-center gap-1 rounded-lg border-2 border-black px-2 py-1 ${AMBER}`}>
              <Swords size={12} className="text-black" />
              <span className="text-[9px] font-bold uppercase text-black">Squadra</span>
            </div>
          )
        )}
      </div>

      <main
        className={cn(
          "relative z-10 mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-1.5 pb-1.5",
          isLocked && "brightness-[0.55] contrast-110 saturate-50"
        )}
      >
        <div className="flex min-h-0 flex-1 items-stretch gap-1.5">
          {/* Sinistra: stats + abilità normali */}
          <aside className="flex w-[46%] shrink-0 flex-col gap-1.5">
            <div className={`rounded-xl ${TEAL} border-2 border-black px-2.5 py-2 shadow-[0_2px_0_0_#000]`}>
              <div className="flex items-center justify-between gap-1.5">
                <div>
                  <p className="text-[10px] uppercase text-[#f5a623]">Livello</p>
                  <p className="text-xl font-bold leading-tight">{ownedNorm.level}<span className="text-white/40">/60</span></p>
                </div>
                <button
                  type="button"
                  onClick={levelUp}
                  disabled={!canLevel}
                  className={cn(
                    "flex h-11 w-11 flex-col items-center justify-center rounded-lg border-2 border-black disabled:opacity-40",
                    canLevel ? AMBER : "bg-[#0b161b]"
                  )}
                >
                  <ArrowUp size={14} className={canLevel ? "text-black" : "text-[#f5a623]"} />
                  <span className={cn("flex items-center text-[7px] font-bold", canLevel ? "text-black" : "text-[#f5a623]")}>
                    <Coins size={7} />{lvlCost}
                  </span>
                </button>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full border border-black bg-[#0b161b]">
                <div className="h-full rounded-full bg-[#f5a623]" style={{ width: `${Math.max(4, (ownedNorm.level / 60) * 100)}%` }} />
              </div>
            </div>

            <div className={`rounded-xl ${TEAL} border-2 border-black px-2.5 py-2 shadow-[0_2px_0_0_#000]`}>
              <div className="flex items-center justify-between gap-1.5">
                <div>
                  <p className="text-[10px] uppercase text-[#f5a623]">Risveglio</p>
                  <div className="mt-1 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < ownedNorm.ascension ? "fill-[#f5a623] text-[#f5a623]" : "text-white/20"}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={ascend}
                  disabled={!canAscend}
                  className={cn(
                    "flex h-11 w-11 flex-col items-center justify-center rounded-lg border-2 border-black disabled:opacity-40",
                    canAscend ? AMBER : "bg-[#0b161b]"
                  )}
                >
                  <Sparkles size={13} className={canAscend ? "text-black" : "text-[#f5a623]"} />
                  <span className={cn("flex items-center text-[7px] font-bold", canAscend ? "text-black" : "text-[#f5a623]")}>
                    <Gem size={7} />{ascCost}
                  </span>
                </button>
              </div>
            </div>

            <div className={`rounded-lg ${TEAL} border-2 border-black px-2 py-1.5 shadow-[0_2px_0_0_#000]`}>
              <div className="flex items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded border border-black text-[11px]" style={{ background: attr?.color }}>
                  {attr?.icon}
                </span>
                <span className="truncate text-[10px] font-bold uppercase">{attr?.label}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 border-t border-black/30 pt-1.5">
                <Users size={11} className="shrink-0 text-[#f5a623]" />
                <span className="truncate text-[10px] font-bold uppercase">{character.faction}</span>
              </div>
            </div>

            <div
              className={`rounded-lg ${AMBER} border-2 border-black px-2 py-1.5 text-center`}
              style={{ boxShadow: `0 2px 0 0 #000, 0 0 10px ${glow}` }}
            >
              <p className="text-[8px] uppercase tracking-wide text-black/55">Classe</p>
              <p className="text-xl font-black leading-none text-black tabular-nums">{cc.toLocaleString("it-IT")}</p>
            </div>

            <div className={`rounded-lg ${TEAL} border-2 border-black px-2 py-1.5 shadow-[0_2px_0_0_#000]`}>
              <StatRow icon={<Swords size={14} />} label="ATK" value={atk} />
              <StatRow icon={<Shield size={14} />} label="DEF" value={def} />
              <StatRow icon={<Heart size={14} />} label="PV" value={hp} last />
            </div>

            <section className="flex min-h-0 flex-1 flex-col">
              <p className="mb-1 shrink-0 text-[10px] uppercase tracking-widest text-[#f5a623]">Abilità</p>
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-1">
                {normalMoves.map((m, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => openMove(m, i, false)}
                    className={`flex min-h-0 flex-1 items-center gap-2 rounded-lg ${TEAL} border-2 border-black px-2 py-1.5 shadow-[0_2px_0_0_#000]`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border-2 border-black bg-[#0b161b]">
                      <MoveIcon type={m.type} className="text-[#f5a623]" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-[9px] font-bold uppercase leading-tight text-white">{m.name}</p>
                      <span className="text-[10px] font-bold text-[#f5a623]">
                        {m.type === "attack" ? m.power : `+${m.power}`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          {/* Destra: poster + blocco ultimate */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "relative max-h-full w-full overflow-hidden rounded-xl border-2 border-black bg-[#d4b896]",
                  avatarPulse && "avatar-level-flash"
                )}
                style={{ boxShadow: `0 4px 0 0 #000, 0 0 22px ${glow}` }}
              >
                {character.image_url ? (
                  <img
                    src={character.image_url}
                    alt={character.char_name}
                    className={cn(
                      "block h-auto max-h-full w-full object-contain",
                      isLocked && "brightness-[0.25] saturate-0"
                    )}
                    draggable={false}
                  />
                ) : (
                  <CharacterArt
                    character={character}
                    variant="poster"
                    className={cn("aspect-[3/4] w-full", isLocked && "brightness-[0.25] saturate-0")}
                  />
                )}
                {isLocked && (
                  <>
                    <div className="absolute inset-0 bg-[#0b161b]/45" />
                    <span
                      className="absolute inset-0 flex items-center justify-center text-6xl font-black text-[#f5a623]"
                      style={{ textShadow: "0 3px 0 #000, 0 0 20px rgba(245,166,35,0.5)" }}
                    >
                      ?
                    </span>
                  </>
                )}
                {avatarPulse && <div className="avatar-shine" />}
              </motion.div>
            </div>

            <div className="flex shrink-0 flex-col gap-1.5">
              <div className={`rounded-lg ${TEAL} border-2 border-black px-2 py-1.5 shadow-[0_2px_0_0_#000]`}>
                <div className="flex items-center justify-between">
                  <p className="text-[9px] uppercase text-[#f5a623]">Ulti Lv.{ownedNorm.ultimateLevel}</p>
                  <span className="flex items-center gap-0.5 text-[9px] text-white/50">
                    <Hexagon size={10} />{ownedNorm.ultimateTokens}
                  </span>
                </div>
                <div className="mt-1 flex gap-0.5">
                  {Array.from({ length: ULTIMATE_MAX_LEVEL - ULTIMATE_MIN_LEVEL + 1 }).map((_, i) => {
                    const lv = i + ULTIMATE_MIN_LEVEL;
                    return (
                      <Heart
                        key={lv}
                        size={12}
                        className={lv <= ownedNorm.ultimateLevel ? "fill-[#f5a623] text-[#f5a623]" : "text-white/20"}
                      />
                    );
                  })}
                </div>
              </div>

              {ultMove && (
                <button
                  type="button"
                  onClick={() => openMove(ultMove, 3, true)}
                  className={`flex w-full items-center gap-2 rounded-xl ${AMBER} border-2 border-black px-2.5 py-2 shadow-[0_2px_0_0_#000]`}
                >
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-black">
                    <Zap size={16} className="text-[#f5a623]" />
                    <span className="absolute -right-1 -top-1 rounded border border-black bg-[#f5a623] px-0.5 text-[5px] font-black text-black">
                      ULT
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[10px] font-bold uppercase leading-tight text-black">{ultMove.name}</p>
                    <span className="text-sm font-black text-black">{ulti.current.power}</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Move / Ultimate sheet */}
      <AnimatePresence>
        {selectedMove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center"
            onClick={closeMoveSheet}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-md overflow-hidden rounded-2xl ${
                selectedMove.isUlt ? TEAL : TEAL
              } ${PANEL} p-5`}
            >
              <button
                type="button"
                onClick={closeMoveSheet}
                disabled={ultiPhase === "animating"}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-[#0b161b] disabled:opacity-40"
              >
                <X size={14} className="text-[#f5a623]" />
              </button>

              {!selectedMove.isUlt ? (
                <>
                  <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">
                    Mossa {selectedMove.index + 1}
                  </p>
                  <h3 className="mt-1 text-lg uppercase tracking-wide text-white">{selectedMove.move.name}</h3>
                  <p className="mt-2 text-sm text-white/70">
                    {selectedMove.move.description || "Nessuna descrizione"}
                  </p>
                  <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-black bg-[#0b161b] px-3 py-2">
                    <span className="flex items-center gap-1 text-xs uppercase text-[#f5a623]">
                      <MoveIcon type={selectedMove.move.type} className="text-[#f5a623]" />
                      {selectedMove.move.type}
                    </span>
                    <span className="text-lg font-bold text-[#f5a623]">
                      {selectedMove.move.type === "attack"
                        ? selectedMove.move.power
                        : `+${selectedMove.move.power}`}
                    </span>
                  </div>
                </>
              ) : (
                <UltimateSheetBody
                  ultMove={ultMove}
                  ulti={ulti}
                  ownedNorm={ownedNorm}
                  canUpgradeUlti={canUpgradeUlti}
                  ultiPhase={ultiPhase}
                  ultiReveal={ultiReveal}
                  onPotenzia={() => setUltiPhase("preview")}
                  onAnnullaPreview={() => setUltiPhase("view")}
                  onConferma={confirmUpgradeUlti}
                  onChiudi={closeMoveSheet}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UltimateSheetBody({
  ultMove,
  ulti,
  ownedNorm,
  canUpgradeUlti,
  ultiPhase,
  ultiReveal,
  onPotenzia,
  onAnnullaPreview,
  onConferma,
  onChiudi,
}) {
  const fromDmg = ulti.current.damage;
  const toDmg = ulti.next?.damage ?? fromDmg;
  const fromPower = ulti.current.power;
  const toPower = ulti.next?.power ?? fromPower;

  return (
    <div className="relative">
      <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">Ultimate</p>
      <h3 className="mt-1 pr-8 text-lg uppercase tracking-wide text-white">{ultMove?.name}</h3>
      <p className="mt-1 text-[11px] uppercase text-white/50">
        Lv.{ownedNorm.ultimateLevel}/{ULTIMATE_MAX_LEVEL} · Gettoni{" "}
        <span className="text-[#f5a623]">{ownedNorm.ultimateTokens}</span>
      </p>

      {/* Damage display */}
      <div className="relative mt-4 flex min-h-[5.5rem] items-center justify-center overflow-hidden rounded-xl border-2 border-black bg-[#0b161b] px-3 py-4">
        <AnimatePresence mode="wait">
          {ultiPhase === "view" && (
            <motion.div
              key="view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <p className="text-[9px] uppercase tracking-widest text-white/40">Danno stimato</p>
              <p className="text-3xl font-black tabular-nums text-[#f5a623]">{fromDmg}</p>
              <p className="text-[10px] uppercase text-white/45">Potenza {fromPower}</p>
            </motion.div>
          )}

          {ultiPhase === "preview" && ulti.next && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full items-center justify-center gap-3 text-center"
            >
              <div>
                <p className="text-[8px] uppercase text-white/40">Attuale</p>
                <p className="text-2xl font-black tabular-nums text-white/70">{fromDmg}</p>
              </div>
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-xl font-black text-[#f5a623]"
              >
                →
              </motion.span>
              <div>
                <p className="text-[8px] uppercase text-[#f5a623]">Dopo</p>
                <p className="text-3xl font-black tabular-nums text-[#f5a623]">{toDmg}</p>
              </div>
            </motion.div>
          )}

          {ultiPhase === "animating" && (
            <motion.div
              key="anim"
              className="relative flex h-24 w-full items-center justify-center"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Shine */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-[#f5a623]/40 to-transparent"
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: "100%", opacity: [0, 1, 0] }}
                transition={{ duration: 0.55, ease: "easeInOut" }}
              />
              <motion.p
                className="relative z-10 text-4xl font-black tabular-nums text-[#f5a623]"
                initial={{ scale: 1, filter: "brightness(1)" }}
                animate={{
                  scale: [1, 1.15, 1.35, 0.2],
                  filter: ["brightness(1)", "brightness(1.8)", "brightness(2.2)", "brightness(3)"],
                  opacity: [1, 1, 1, 0],
                }}
                transition={{ duration: 1.05, times: [0, 0.35, 0.7, 1], ease: "easeIn" }}
                style={{ textShadow: "0 0 24px #f5a623" }}
              >
                {fromDmg}
              </motion.p>
              {/* Explode rings */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#f5a623]"
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: [0.3, 2.2], opacity: [0, 0.9, 0] }}
                  transition={{ duration: 0.7, delay: 0.55 + i * 0.1, ease: "easeOut" }}
                />
              ))}
              {Array.from({ length: 10 }).map((_, i) => {
                const angle = (i / 10) * Math.PI * 2;
                return (
                  <motion.span
                    key={i}
                    className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5a623]"
                    initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
                    animate={{
                      x: Math.cos(angle) * 70,
                      y: Math.sin(angle) * 50,
                      opacity: [0, 1, 0],
                      scale: [1, 0.3],
                    }}
                    transition={{ duration: 0.55, delay: 0.65, ease: "easeOut" }}
                  />
                );
              })}
            </motion.div>
          )}

          {ultiPhase === "revealed" && ultiReveal && (
            <motion.div
              key="revealed"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 16 }}
              className="text-center"
            >
              <p className="text-[9px] uppercase tracking-widest text-[#f5a623]">Nuovo danno</p>
              <p
                className="text-4xl font-black tabular-nums text-[#f5a623]"
                style={{ textShadow: "0 0 18px rgba(245,166,35,0.8)" }}
              >
                {ultiReveal.toDmg}
              </p>
              <p className="mt-1 text-[10px] uppercase text-white/50">
                Ulti Lv.{ultiReveal.toLevel} · Potenza {ultiReveal.toPower}
              </p>
              <p className="mt-1 text-[10px] uppercase text-white/35">
                {ultiReveal.fromDmg} → {ultiReveal.toDmg}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {ultiPhase === "preview" && ulti.next && (
        <p className="mt-2 text-center text-[10px] uppercase tracking-wide text-white/45">
          Potenza {fromPower} → {toPower} · −1 Gettone Ulti
        </p>
      )}

      <div className="mt-4 flex gap-2">
        {ultiPhase === "view" && (
          <>
            <button
              type="button"
              onClick={onChiudi}
              className="flex-1 rounded-xl border-2 border-black bg-[#0b161b] py-3 text-xs uppercase text-white"
            >
              Chiudi
            </button>
            <button
              type="button"
              disabled={!canUpgradeUlti}
              onClick={onPotenzia}
              className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-3 text-xs uppercase ${AMBER} border-2 border-black shadow-[0_3px_0_0_#000] disabled:opacity-40`}
            >
              <Zap size={14} /> Potenzia
            </button>
          </>
        )}
        {ultiPhase === "preview" && (
          <>
            <button
              type="button"
              onClick={onAnnullaPreview}
              className="flex-1 rounded-xl border-2 border-black bg-[#0b161b] py-3 text-xs uppercase text-white"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={!canUpgradeUlti}
              onClick={onConferma}
              className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-3 text-xs uppercase ${AMBER} border-2 border-black shadow-[0_3px_0_0_#000] disabled:opacity-40`}
            >
              <Check size={14} /> Conferma
            </button>
          </>
        )}
        {ultiPhase === "animating" && (
          <p className="w-full py-3 text-center text-[11px] uppercase tracking-widest text-[#f5a623]">
            Potenziamento in corso…
          </p>
        )}
      </div>

      {ultiPhase === "view" && !canUpgradeUlti && (
        <p className="mt-2 text-center text-[9px] uppercase text-white/40">
          {ulti.atMax ? "Ultimate al massimo" : "Serve 1 Gettone Ulti (doppioni dal gacha)"}
        </p>
      )}
    </div>
  );
}

function StatRow({ icon, label, value, last }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-1.5 py-1.5",
        !last && "border-b border-black/30"
      )}
    >
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/70">
        <span className="text-[#f5a623]">{icon}</span>
        {label}
      </span>
      <span className="text-base font-bold tabular-nums leading-none text-white">{value}</span>
    </div>
  );
}
