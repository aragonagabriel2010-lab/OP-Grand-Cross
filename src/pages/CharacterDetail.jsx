import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/localDb";

import { useGame } from "@/hooks/useGame";
import GameTopBar from "@/components/game/GameTopBar";
import GameModal from "@/components/game/GameModal";
import { CharacterArt } from "@/components/game/CharacterCard";
import UpgradeBurst from "@/components/game/UpgradeBurst";
import { TEAL, AMBER, PANEL_SM } from "@/lib/arcade";
import {
  effectiveHp,
  effectiveAttack,
  effectiveDefense,
  upgradeCost,
  ATTRIBUTE_INFO,
  RARITY_GLOW,
  RARITY_COLORS,
} from "@/lib/gameUtils";
import {
  awakeningCost,
  canAffordAwakening,
  spendAwakeningMaterials,
  MATERIAL_DEFS,
  normalizeMaterials,
} from "@/lib/materials";
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
  Shield,
  Users,
  Check,
  Lock,
  Shirt,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

function combatClass(atk, def, hp) {
  return atk * 2 + def + Math.floor(hp / 10);
}

function moveIconColor(type) {
  if (type === "heal") return "text-emerald-400";
  if (type === "buff") return "text-sky-400";
  return "text-red-500";
}

function MoveIcon({ type, className }) {
  const color = moveIconColor(type);
  if (type === "heal") return <Heart size={16} className={cn(color, className)} />;
  if (type === "buff") return <Zap size={16} className={cn(color, className)} />;
  return <Swords size={16} className={cn(color, className)} />;
}

const EQUIP_SLOTS = [
  { id: "necklace", label: "Collana" },
  { id: "bracelet", label: "Bracciale" },
  { id: "ring1", label: "Anello 1" },
  { id: "ring2", label: "Anello 2" },
  { id: "belt", label: "Cintura" },
  { id: "essence", label: "Essenza", rare: true },
];

const ACTIONS = [
  { id: "level", label: "LvL UP", Icon: ArrowUp },
  { id: "awaken", label: "Risveglia", Icon: Sparkles },
  { id: "ult", label: "ULT", Icon: Zap },
  { id: "equip", label: "Equip", Icon: Shirt },
];

export default function CharacterDetail() {
  const { ownedId, characterId } = useParams();
  const navigate = useNavigate();
  const { loading, charMap, owned, playerState, refresh, patchPlayerState } = useGame();

  const [burst, setBurst] = useState(null);
  const [avatarPulse, setAvatarPulse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedMove, setSelectedMove] = useState(null);
  const [ultiPhase, setUltiPhase] = useState("view");
  const [ultiReveal, setUltiReveal] = useState(null);
  const [actionPanel, setActionPanel] = useState(null);

  const isLocked = Boolean(characterId);
  const ownedRec = !isLocked && ownedId ? owned?.find((o) => o.id === ownedId) : null;

  let character = null;
  try {
    character = isLocked
      ? charMap?.[characterId] || null
      : ownedRec
        ? charMap?.[ownedRec.character_id] || null
        : null;
  } catch {
    character = null;
  }

  const ownedNorm = (() => {
    if (!character) return null;
    if (isLocked) {
      return normalizeUltimateFields({
        id: `locked-${character.id}`,
        character_id: character.id,
        level: 1,
        exp: 0,
        ascension: 0,
        ultimateLevel: ULTIMATE_MIN_LEVEL,
        ultimateTokens: 0,
      });
    }
    return ownedRec ? normalizeUltimateFields(ownedRec) : null;
  })();

  const ulti =
    character && ownedNorm
      ? ultimatePreview(character, ownedNorm)
      : {
          move: null,
          level: 1,
          tokens: 0,
          atMax: false,
          canUpgrade: false,
          current: { level: 1, power: 0, damage: 0 },
          next: null,
        };

  const clearBurst = useCallback(() => setBurst(null), []);

  if (loading || !playerState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b161b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
      </div>
    );
  }

  if (!character || !ownedNorm || (!isLocked && !ownedRec)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0b161b] text-white">
        <Lock className="text-[#f5a623]" size={28} />
        <p className="text-sm uppercase tracking-wide text-white/60">Personaggio non trovato</p>
        <button
          type="button"
          onClick={() => navigate("/characters")}
          className={`rounded-xl px-4 py-2 text-sm uppercase tracking-wide ${TEAL} ${PANEL_SM}`}
        >
          Torna ai personaggi
        </button>
      </div>
    );
  }

  const hp = effectiveHp(character, ownedNorm) || 0;
  const atk = effectiveAttack(character, ownedNorm) || 0;
  const def = effectiveDefense(character, ownedNorm) || 0;
  const cc = combatClass(atk, def, hp);
  const attr = ATTRIBUTE_INFO[character.attribute] || { label: "—", icon: "?", color: "#164446" };
  const lvlCost = upgradeCost(ownedNorm.level);
  const wakeCost = awakeningCost(ownedNorm.ascension);
  const canLevel = !isLocked && playerState.berry >= lvlCost && ownedNorm.level < 60 && !busy;
  const canAscend =
    !isLocked &&
    ownedNorm.ascension < 3 &&
    !busy &&
    canAffordAwakening(playerState, ownedNorm.ascension);
  const mats = normalizeMaterials(playerState.materials);
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
    const nextBerry = playerState.berry - lvlCost;
    patchPlayerState?.({ berry: nextBerry });
    await db.entities.PlayerState.update(playerState.id, { berry: nextBerry });
    await db.entities.OwnedCharacter.update(ownedNorm.id, { level: nextLevel, exp: 0 });
    try {
      const { bumpDaily } = await import("@/lib/dailies");
      bumpDaily(playerState.created_by_id || playerState.id, "level_up");
      bumpDaily(playerState.created_by_id || playerState.id, "open_characters");
    } catch {
      /* ignore */
    }
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
    const spent = spendAwakeningMaterials(playerState.materials, ownedNorm.ascension);
    const nextStrawberry = playerState.strawberry - spent.strawberryCost;
    patchPlayerState?.({
      strawberry: nextStrawberry,
      materials: spent.materials,
    });
    await db.entities.PlayerState.update(playerState.id, {
      strawberry: nextStrawberry,
      materials: spent.materials,
    });
    await db.entities.OwnedCharacter.update(ownedNorm.id, { ascension: nextAsc });
    try {
      const { bumpDaily } = await import("@/lib/dailies");
      bumpDaily(playerState.created_by_id || playerState.id, "awaken");
    } catch {
      /* ignore */
    }
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
    await new Promise((r) => setTimeout(r, 1100));
    try {
      const updated = await upgradeUltimate(ownedNorm.id);
      try {
        const { bumpDaily } = await import("@/lib/dailies");
        bumpDaily(playerState.created_by_id || playerState.id, "ulti_up");
      } catch {
        /* ignore */
      }
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

  function openAction(id) {
    if (isLocked) return;
    setActionPanel(id);
    if (id === "ult") {
      setUltiPhase("view");
      setUltiReveal(null);
    }
  }

  return (
    <div className="char-sheet relative flex h-[100dvh] flex-col overflow-hidden text-white">
      <UpgradeBurst
        open={!!burst}
        mode={burst?.mode || "level"}
        level={burst?.level}
        ascension={burst?.ascension}
        onDone={clearBurst}
      />

      <div className="char-sheet__bg" aria-hidden="true" style={{ "--char-color": character.color || "#164446" }} />

      <GameTopBar showBack backTo="/characters" showSettings={false} className="relative z-20 shrink-0" />

      <main className="char-sheet__main relative z-10 mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-2 pb-1">
        {/* Hero: un solo blocco — poster + identità */}
        <section className="char-hero shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("char-hero__frame", avatarPulse && "avatar-level-flash")}
            style={{ boxShadow: `0 4px 0 0 #000, 0 0 28px ${glow}` }}
          >
            {character.image_url ? (
              <img
                src={character.image_url}
                alt={character.char_name}
                className={cn("char-hero__art", isLocked && "brightness-75")}
                draggable={false}
              />
            ) : (
              <CharacterArt
                character={character}
                variant="poster"
                className={cn("char-hero__art aspect-[3/4]", isLocked && "brightness-75")}
              />
            )}

            <div className="char-hero__shade" aria-hidden="true" />

            <div className="char-hero__top">
              <span
                className="char-hero__rarity"
                style={{ background: `linear-gradient(135deg, ${rarityColor}, #f5a623)` }}
              >
                {character.rarity || "R"}
              </span>
              {!isLocked && (
                <span className="char-hero__lv">
                  Lv.{ownedNorm.level}
                  <span>/60</span>
                </span>
              )}
              {isLocked ? (
                <span className="char-hero__badge char-hero__badge--lock">
                  <Lock size={11} /> Bloccato
                </span>
              ) : (
                inTeam && (
                  <span className="char-hero__badge char-hero__badge--team">
                    <Swords size={11} /> Squadra
                  </span>
                )
              )}
            </div>

            <div className="char-hero__bottom">
              <p className="char-hero__version">{character.version || "—"}</p>
              <h1 className="char-hero__name">{character.char_name || "Sconosciuto"}</h1>
              <div className="char-hero__tags">
                <span className="char-hero__tag" style={{ background: attr.color }}>
                  {attr.icon} {attr.label}
                </span>
                <span className="char-hero__tag char-hero__tag--muted">
                  <Users size={11} /> {character.faction || "—"}
                </span>
                <span className="char-hero__stars" aria-label={`Risveglio ${ownedNorm.ascension}`}>
                  {[0, 1, 2].map((i) => (
                    <Star
                      key={i}
                      size={12}
                      className={i < ownedNorm.ascension ? "fill-[#f5a623] text-[#f5a623]" : "text-white/25"}
                    />
                  ))}
                </span>
              </div>
              {!isLocked && (
                <div className="char-hero__xp">
                  <div
                    className="char-hero__xp-fill"
                    style={{ width: `${Math.max(4, (ownedNorm.level / 60) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {isLocked && (
              <div className="char-hero__locked">
                <Lock size={28} className="text-[#f5a623]" />
                <p>Non ancora reclutato</p>
                <button type="button" onClick={() => navigate("/gacha")} className="char-hero__gacha">
                  Vai al Gacha
                </button>
              </div>
            )}
            {avatarPulse && <div className="avatar-shine" />}
          </motion.div>
        </section>

        {/* Prestazioni — una sola riga */}
        <section className="char-stats shrink-0">
          <div className="char-stat">
            <Swords size={14} />
            <span>ATK</span>
            <strong>{atk}</strong>
          </div>
          <div className="char-stat">
            <Shield size={14} />
            <span>DEF</span>
            <strong>{def}</strong>
          </div>
          <div className="char-stat">
            <Heart size={14} />
            <span>PV</span>
            <strong>{hp}</strong>
          </div>
          <div className="char-stat char-stat--class">
            <span>Classe</span>
            <strong>{cc.toLocaleString("it-IT")}</strong>
          </div>
        </section>

        {/* Abilità */}
        <section className="char-skills shrink-0">
          <div className="char-skills__head">
            <h2>Abilità</h2>
            <p>Potenza in battaglia da ATK / DEF / Lv</p>
          </div>
          <div className="char-skills__list">
            {normalMoves.map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => openMove(m, i, false)}
                className={cn("char-skill", `char-skill--${m.type || "attack"}`)}
              >
                <span className="char-skill__icon">
                  <MoveIcon type={m.type} />
                </span>
                <span className="char-skill__body">
                  <span className="char-skill__name">{m.name}</span>
                  <span className="char-skill__type">
                    {m.type === "heal" ? "Cura" : m.type === "buff" ? "Buff" : "Attacco"}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {ultMove && (
            <button
              type="button"
              onClick={() => openMove(ultMove, 3, true)}
              className="char-ult"
            >
              <span className="char-ult__badge">ULT</span>
              <span className="char-ult__icon">
                <Zap size={18} />
              </span>
              <span className="char-ult__body">
                <span className="char-ult__name">{ultMove.name}</span>
                <span className="char-ult__meta">
                  Lv.{ownedNorm.ultimateLevel}
                  <span className="char-ult__hearts">
                    {Array.from({ length: ULTIMATE_MAX_LEVEL - ULTIMATE_MIN_LEVEL + 1 }).map((_, i) => {
                      const lv = i + ULTIMATE_MIN_LEVEL;
                      return (
                        <Heart
                          key={lv}
                          size={10}
                          className={
                            lv <= ownedNorm.ultimateLevel
                              ? "fill-[#1a1008] text-[#1a1008]"
                              : "text-black/25"
                          }
                        />
                      );
                    })}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Hexagon size={10} /> {ownedNorm.ultimateTokens}
                  </span>
                </span>
              </span>
            </button>
          )}
        </section>
      </main>

      <nav className="char-actions relative z-20 mx-auto grid w-full max-w-lg shrink-0 grid-cols-4 gap-1.5 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        {ACTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            disabled={isLocked}
            onClick={() => openAction(id)}
            className={cn(
              "char-action",
              id === "equip" && "char-action--muted",
              !isLocked && "active:translate-y-0.5"
            )}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Move sheet */}
      <GameModal
        open={!!selectedMove && !selectedMove.isUlt}
        onClose={closeMoveSheet}
        title={selectedMove ? `Mossa ${(selectedMove.index || 0) + 1}` : "Mossa"}
      >
        {selectedMove && !selectedMove.isUlt && (
          <>
            <h3 className="text-lg uppercase tracking-wide text-white">{selectedMove.move.name}</h3>
            <p className="mt-2 text-sm text-white/70">
              {selectedMove.move.description || "Nessuna descrizione"}
            </p>
            <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-black bg-[#0b161b] px-3 py-2">
              <span className="flex items-center gap-1 text-xs uppercase text-white/70">
                <MoveIcon type={selectedMove.move.type} />
                {selectedMove.move.type}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-white/45">
                Potenza da prestazioni
              </span>
            </div>
          </>
        )}
      </GameModal>

      <GameModal
        open={!!selectedMove?.isUlt || actionPanel === "ult"}
        onClose={() => {
          if (ultiPhase === "animating") return;
          closeMoveSheet();
          if (actionPanel === "ult") setActionPanel(null);
        }}
        title="Ultimate"
        closeOnOverlay={ultiPhase !== "animating"}
      >
        <UltimateSheetBody
          ultMove={ultMove}
          ulti={ulti}
          ownedNorm={ownedNorm}
          canUpgradeUlti={canUpgradeUlti}
          ultiPhase={ultiPhase}
          ultiReveal={ultiReveal}
          locked={isLocked}
          onPotenzia={() => setUltiPhase("preview")}
          onAnnullaPreview={() => setUltiPhase("view")}
          onConferma={confirmUpgradeUlti}
          onChiudi={() => {
            closeMoveSheet();
            setActionPanel(null);
          }}
        />
      </GameModal>

      <GameModal open={actionPanel === "level"} onClose={() => setActionPanel(null)} title="Level Up">
        <p className="text-[11px] uppercase text-white/60">
          Aumenta il livello per potenziare ATK, DEF e PV.
        </p>
        <div className="mt-3 rounded-xl border-2 border-black bg-[#0b161b] px-3 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm uppercase text-white">Lv.{ownedNorm.level}</span>
            <ArrowRight size={14} className="text-[#f5a623]" />
            <span className="text-sm font-bold uppercase text-[#f5a623]">
              Lv.{Math.min(60, ownedNorm.level + 1)}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-[#f5a623]">
            <Coins size={12} /> Costo {lvlCost} Beri
          </p>
        </div>
        <button
          type="button"
          disabled={!canLevel}
          onClick={() => levelUp()}
          className={cn(
            "mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-black py-3 text-xs font-bold uppercase disabled:opacity-40",
            AMBER,
            "text-black"
          )}
        >
          <ArrowUp size={14} /> Aumenta livello
        </button>
      </GameModal>

      <GameModal open={actionPanel === "awaken"} onClose={() => setActionPanel(null)} title="Risveglio">
        <p className="text-[11px] uppercase text-white/60">
          Spendi materiali per salire di grado (stelle).
        </p>
        <div className="mt-3 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <Star
              key={i}
              size={22}
              className={i < ownedNorm.ascension ? "fill-[#f5a623] text-[#f5a623]" : "text-white/20"}
            />
          ))}
        </div>
        {ownedNorm.ascension < 3 ? (
          <div className="mt-3 space-y-1.5 rounded-xl border-2 border-black bg-[#0b161b] p-3">
            <p className="flex items-center gap-1 text-[11px] uppercase text-[#f5a623]">
              <Gem size={12} /> {wakeCost.strawberry} Fragole
            </p>
            {Object.entries(wakeCost.materials)
              .filter(([, n]) => n > 0)
              .map(([id, n]) => (
                <p
                  key={id}
                  className="flex items-center gap-1 text-[11px] uppercase"
                  style={{ color: MATERIAL_DEFS[id]?.color }}
                >
                  <Hexagon size={12} />
                  {MATERIAL_DEFS[id]?.name}: {mats[id] || 0}/{n}
                </p>
              ))}
          </div>
        ) : (
          <p className="mt-3 text-center text-xs uppercase text-[#f5a623]">Risveglio al massimo</p>
        )}
        <button
          type="button"
          disabled={!canAscend}
          onClick={() => ascend()}
          className={cn(
            "mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-black py-3 text-xs font-bold uppercase disabled:opacity-40",
            AMBER,
            "text-black"
          )}
        >
          <Sparkles size={14} /> Risveglia
        </button>
      </GameModal>

      <GameModal open={actionPanel === "equip"} onClose={() => setActionPanel(null)} title="Equipaggiamento">
        <p className="mb-3 text-[10px] uppercase tracking-wide text-white/55">
          Slot gear · forging e drop in arrivo
        </p>
        <div className="grid grid-cols-2 gap-2">
          {EQUIP_SLOTS.map((slot) => (
            <button
              key={slot.id}
              type="button"
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border-2 border-black bg-[#0b161b] px-2 py-3 text-center shadow-[0_2px_0_0_#000]",
                slot.rare && "ring-1 ring-[#c084fc]/50"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg border-2 border-dashed border-white/25",
                  slot.rare && "border-[#c084fc]/50"
                )}
              >
                <Shirt size={16} className={slot.rare ? "text-[#c084fc]" : "text-white/35"} />
              </div>
              <span className={cn("text-[9px] font-bold uppercase", slot.rare ? "text-[#c084fc]" : "text-white/70")}>
                {slot.label}
              </span>
              <span className="text-[8px] uppercase text-white/35">Vuoto</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-[9px] uppercase text-[#f5a623]">
          Essenza = pezzo raro da forgiare / farmare
        </p>
      </GameModal>
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
  locked,
  onPotenzia,
  onAnnullaPreview,
  onConferma,
  onChiudi,
}) {
  const fromDmg = ulti.current?.damage ?? 0;
  const toDmg = ulti.next?.damage ?? fromDmg;
  const fromPower = ulti.current?.power ?? 0;
  const toPower = ulti.next?.power ?? fromPower;

  if (!ultMove) {
    return <p className="text-sm uppercase text-white/50">Nessuna ultimate disponibile</p>;
  }

  return (
    <div className="relative">
      <h3 className="pr-2 text-lg uppercase tracking-wide text-white">{ultMove.name}</h3>
      <p className="mt-1 text-[11px] uppercase text-white/50">
        Lv.{ownedNorm.ultimateLevel}/{ULTIMATE_MAX_LEVEL} · Gettoni{" "}
        <span className="text-[#f5a623]">{ownedNorm.ultimateTokens}</span>
      </p>

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
              <span className="text-xl font-black text-[#f5a623]">→</span>
              <div>
                <p className="text-[8px] uppercase text-[#f5a623]">Dopo</p>
                <p className="text-3xl font-black tabular-nums text-[#f5a623]">{toDmg}</p>
              </div>
            </motion.div>
          )}
          {ultiPhase === "animating" && (
            <motion.div key="anim" className="relative flex h-24 w-full items-center justify-center">
              <motion.p
                className="relative z-10 text-4xl font-black tabular-nums text-[#f5a623]"
                animate={{ scale: [1, 1.2, 0.2], opacity: [1, 1, 0] }}
                transition={{ duration: 1 }}
              >
                {fromDmg}
              </motion.p>
            </motion.div>
          )}
          {ultiPhase === "revealed" && ultiReveal && (
            <motion.div
              key="revealed"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <p className="text-[9px] uppercase tracking-widest text-[#f5a623]">Nuovo danno</p>
              <p className="text-4xl font-black tabular-nums text-[#f5a623]">{ultiReveal.toDmg}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!locked && (
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
        </div>
      )}
      {locked && (
        <p className="mt-3 text-center text-[10px] uppercase text-white/45">
          Recluta il personaggio per potenziare l&apos;ULT
        </p>
      )}
      {ultiPhase === "view" && !locked && !canUpgradeUlti && (
        <p className="mt-2 text-center text-[9px] uppercase text-white/40">
          {ulti.atMax ? "Ultimate al massimo" : "Serve 1 Gettone Ulti (doppioni dal gacha)"}
        </p>
      )}
    </div>
  );
}

