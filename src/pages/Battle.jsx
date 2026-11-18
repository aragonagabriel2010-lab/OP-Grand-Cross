import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { db } from "@/lib/localDb";

import { useGame } from "@/hooks/useGame";
import { CharacterArt } from "@/components/game/CharacterCard";
import SkillCard from "@/components/game/SkillCard";
import ActionSlotsBar from "@/components/game/ActionSlotsBar";
import BattleMenu from "@/components/game/BattleMenu";
import BattleFighter from "@/components/game/BattleFighter";
import { TEAL, AMBER, PANEL, PANEL_SM } from "@/lib/arcade";
import {
  effectiveHp,
  tileDamage,
  enemyDamage,
  comboMultiplier,
  advantageMultiplier,
  damageTypeMultiplier,
  effectiveDefense,
  mitigateDamage,
  createBattleTile,
  healMultiplier,
} from "@/lib/gameUtils";
import {
  dealOpeningHand,
  refillHand,
  removeCharacterCards,
  maxHandSize,
  drawCountForTeam,
  resolveAdjacentMerges,
  starLabel,
  supportWindowIndex,
  SUPPORT_PER_WINDOW,
} from "@/lib/battleHand";
import {
  cloneHand,
  canSpendAction,
  queuePlay,
  queueMove,
  pruneStalePlays,
  prunePlaysForCharacter,
  destroyedIdsFromMerges,
  reorderList,
  resolvePlayOrder,
  playCardIds,
} from "@/lib/battleActions";
import {
  emptyStatusBoard,
  addEffect,
  createEffect,
  EFFECT_TYPES,
  attackModifierFromEffects,
  defenseModifierFromEffects,
  hasCrowdControl,
  effectsFromMove,
} from "@/lib/battleEffects";
import { Swords, RotateCcw, Check, Skull, Coins, Gem, Zap, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { recordBattleResult } from "@/lib/playerStats";
import { battleUltimateDamage, ultimateLevelMultiplier, ultimateEffectMultiplier } from "@/lib/ultimate";
import {
  battleStaminaCost,
  canAffordBattle,
  computeStamina,
  spendStamina,
  refundStamina,
} from "@/lib/stamina";
import { toast } from "@/components/ui/use-toast";
import { AudioManager } from "@/lib/AudioManager";
import { chooseEnemyAction, enemyHealAmount } from "@/lib/enemyAi";
import BattleTutorial, { shouldShowBattleTutorial } from "@/components/game/BattleTutorial";
import { MergeBanner, UltCinematic } from "@/components/game/BattleOverlays";
import { rollMissionMaterials, mergeMaterials } from "@/lib/materials";
import { battleRankXp, applyRankXp } from "@/lib/rank";
import { isEventActive } from "@/lib/events";
import {
  getFortressZone,
  buildFortressChapter,
  fortressEnemyMult,
  fortressStaminaCost,
  rollFortressRewards,
  applyFortressRewardPatch,
  markFortressClear,
  FORTRESS_LEVELS,
} from "@/lib/fortress";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ULT_MAX = 6;

/** Indice del prossimo nemico vivo (preferisce `preferred` se ancora in piedi). */
function aliveEnemyIndex(list, preferred = 0) {
  if (!list?.length) return -1;
  const pref = Number(preferred);
  if (Number.isInteger(pref) && pref >= 0 && pref < list.length && list[pref].hp > 0) {
    return pref;
  }
  return list.findIndex((e) => e.hp > 0);
}

function syncEnemies(list, setEnemies, enemiesRef) {
  const next = list.map((e) => ({ ...e }));
  enemiesRef.current = next;
  setEnemies(next);
  return next;
}

export default function Battle() {
  const { chapterNumber } = useParams();
  const [searchParams] = useSearchParams();
  const hardMode = searchParams.get("mode") === "hard";
  const practiceMode = searchParams.get("mode") === "practice";
  const fortressMode = searchParams.get("mode") === "fortress";
  const fortressZoneId = searchParams.get("zone") || "beri";
  const fortressLevel = Math.max(1, Math.min(FORTRESS_LEVELS, Number(searchParams.get("level")) || 1));
  const navigate = useNavigate();
  const { loading, charMap, owned, playerState, refresh } = useGame();

  const [chapter, setChapter] = useState(null);
  const [fortressLoot, setFortressLoot] = useState(null);
  const [enemies, setEnemies] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [memberHp, setMemberHp] = useState([]);
  const [memberMaxHp, setMemberMaxHp] = useState([]);
  const [phase, setPhase] = useState("loading");
  const [hand, setHand] = useState([]);
  const [ult, setUlt] = useState([]);
  const [target, setTarget] = useState(0);
  const [turn, setTurn] = useState(1);
  const [log, setLog] = useState([]);
  const [floaters, setFloaters] = useState([]);
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [mergeFlash, setMergeFlash] = useState([]);
  const [mergeBanner, setMergeBanner] = useState(null);
  const [ultCinematic, setUltCinematic] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [staminaSpent, setStaminaSpent] = useState(false);
  const [staminaError, setStaminaError] = useState("");
  const [staminaCostCharged, setStaminaCostCharged] = useState(0);
  /** Coda mosse del turno: play | move — riempie gli Slot Azione */
  const [actionQueue, setActionQueue] = useState([]);
  /** Snapshot mano a inizio turno giocatore (per Annulla) */
  const [turnHandSnapshot, setTurnHandSnapshot] = useState(null);
  /** Sostituto in panchina (entra al primo KO) */
  const [bench, setBench] = useState(null);
  const [subBanner, setSubBanner] = useState(null);
  /** Affondo attacco/cura: { side, index, kind, nudgeX } */
  const [lunge, setLunge] = useState(null);
  /** Bersaglio che riceve l'impatto (shake) */
  const [struck, setStruck] = useState(null);

  const memberHpRef = useRef([]);
  const memberMaxHpRef = useRef([]);
  const enemiesRef = useRef([]);
  const floaterId = useRef(0);
  const ultRef = useRef([]);
  const staminaLockRef = useRef(false);
  const autoFightLockRef = useRef(false);
  /** Quota cure/buff: 3 ogni 6 turni */
  const supportQuotaRef = useRef({ window: 0, drawn: 0 });
  const benchRef = useRef(null);
  const openingMembersRef = useRef([]);
  const openingBenchRef = useRef(null);
  const foodAtkMultRef = useRef(1);
  const foodBuffTurnsRef = useRef(null); // null = duration battle; number = turns left
  /** Evita che un click parta dopo un drag sulla mano */
  const didDragRef = useRef(false);

  function pushLog(msg) {
    setLog((l) => [...l.slice(-3), msg]);
  }

  function lungeNudge(attackerIndex, targetIndex) {
    const a = Number(attackerIndex) || 0;
    const t = Number(targetIndex) || 0;
    return Math.max(-18, Math.min(18, (t - a) * 14));
  }

  /**
   * Affondo → impatto (execute) → ritorno.
   * Una sola unità per volta, in ordine di abilità.
   */
  async function withAbilityMotion(
    { side, index, kind = "strike", targetSide = null, targetIndex = null, nudgeX = 0 },
    execute
  ) {
    setLunge({ side, index, kind, nudgeX });
    await sleep(kind === "support" ? 220 : 270);
    if (targetSide != null && targetIndex != null) {
      setStruck({ side: targetSide, index: targetIndex });
    }
    if (typeof execute === "function") await execute();
    await sleep(110);
    setStruck(null);
    setLunge(null);
    await sleep(kind === "support" ? 130 : 160);
  }
  function addFloater(side, index, dmg, crit) {
    const id = floaterId.current++;
    setFloaters((f) => [...f, { id, side, index, dmg, crit }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 750);
  }
  function syncMemberHp() {
    setMemberHp([...memberHpRef.current]);
  }
  function aliveMembers() {
    return memberHpRef.current.map((h, i) => ({ h, i })).filter((x) => x.h > 0).map((x) => x.i);
  }
  function healTargetIndex(ci) {
    if (memberHpRef.current[ci] > 0) return ci;
    let best = -1, lo = Infinity;
    memberHpRef.current.forEach((h, i) => { if (h > 0 && h < lo) { lo = h; best = i; } });
    return best;
  }

  /** Feedback fusioni automatiche */
  function flashMerges(merges) {
    if (!merges?.length) return;
    const best = merges.reduce((a, b) => (b.intoStars > a.intoStars ? b : a), merges[0]);
    merges.forEach((m) => {
      pushLog(`Fusione! → ${m.intoStars}★ ${starLabel(m.intoStars)}`);
    });
    const ids = merges.map((m) => m.card.id);
    setMergeFlash(ids);
    setMergeBanner({ id: `m_${Date.now()}`, intoStars: best.intoStars });
    AudioManager.playMerge(best.intoStars);
    void import("@/lib/dailies")
      .then(({ bumpDaily }) => {
        const uid = playerState?.created_by_id || playerState?.id;
        if (uid) bumpDaily(uid, "merge_cards");
      })
      .catch(() => {});
    setTimeout(() => setMergeFlash([]), 700);
    setTimeout(() => setMergeBanner(null), 900);
  }

  function commitHand(result) {
    setHand(result.hand);
    flashMerges(result.merges);
    if (typeof result.supportDrawn === "number") {
      supportQuotaRef.current.drawn = result.supportDrawn;
    }
    return result.hand;
  }

  function resolveMoveType(charIndex, moveIndex) {
    return teamMembers[charIndex]?.character?.moves?.[moveIndex]
      || openingMembersRef.current?.[charIndex]?.character?.moves?.[moveIndex]
      || null;
  }

  /** Allinea la finestra quota (1–6, 7–12, …) al turno corrente. */
  function syncSupportQuota(forTurn = turn) {
    const w = supportWindowIndex(forTurn);
    if (supportQuotaRef.current.window !== w) {
      supportQuotaRef.current = { window: w, drawn: 0 };
      if (w > 0) {
        pushLog(`Finestra support: +${SUPPORT_PER_WINDOW} cure/buff disponibili`);
      }
    }
    return supportQuotaRef.current;
  }

  function drawOpts(extra = {}) {
    const quota = syncSupportQuota(extra.turn ?? turn);
    return {
      resolveMove: resolveMoveType,
      supportDrawn: quota.drawn,
      ...extra,
    };
  }

  /** Togli una carta dalla mano e fondi subito le adiacenze create (gratis). */
  function removeFromHandAndMerge(cardId) {
    const result = resolveAdjacentMerges(hand.filter((c) => c.id !== cardId));
    commitHand(result);
    return result;
  }

  function bringInSub(ci) {
    const sub = benchRef.current;
    if (!sub) return false;
    const maxHp = effectiveHp(sub.character, sub.owned);
    memberHpRef.current[ci] = maxHp;
    memberMaxHpRef.current[ci] = maxHp;
    syncMemberHp();
    setMemberMaxHp([...memberMaxHpRef.current]);
    setTeamMembers((tm) => {
      const next = [...tm];
      next[ci] = { ...sub, status: emptyStatusBoard() };
      return next;
    });
    ultRef.current[ci] = 0;
    setUlt([...ultRef.current]);
    benchRef.current = null;
    setBench(null);
    pushLog(`${sub.character.char_name} entra dalla panchina!`);
    setSubBanner({ id: `sub_${Date.now()}`, name: sub.character.char_name });
    setTimeout(() => setSubBanner(null), 1400);
    setHand((prev) => {
      const cleaned = removeCharacterCards(prev, ci);
      const alive = aliveMembers();
      const result = refillHand(cleaned.hand, alive, drawOpts({ drawCount: drawCountForTeam(alive) }));
      if (typeof result.supportDrawn === "number") {
        supportQuotaRef.current.drawn = result.supportDrawn;
      }
      flashMerges([...(cleaned.merges || []), ...(result.merges || [])]);
      setActionQueue((q) =>
        pruneStalePlays(prunePlaysForCharacter(q, ci), destroyedIdsFromMerges(result.merges))
      );
      return result.hand;
    });
    return true;
  }

  function onMemberDeath(ci) {
    if (bringInSub(ci)) return;
    setHand((h) => {
      const result = removeCharacterCards(h, ci);
      flashMerges(result.merges);
      setActionQueue((q) =>
        pruneStalePlays(prunePlaysForCharacter(q, ci), destroyedIdsFromMerges(result.merges))
      );
      return result.hand;
    });
  }

  function beginPlayerPlanning(nextHand) {
    setActionQueue([]);
    if (nextHand) {
      setTurnHandSnapshot(cloneHand(nextHand));
    } else {
      setTurnHandSnapshot(null);
    }
    setPhase("player");
  }

  /** Snapshot mano dopo KO / refill se deferred */
  useEffect(() => {
    if (phase !== "player" || busy || turnHandSnapshot != null) return;
    setTurnHandSnapshot(cloneHand(hand));
  }, [phase, busy, hand, turnHandSnapshot]);

  function resetTurnActions() {
    if (busy || phase !== "player" || !turnHandSnapshot) return;
    autoFightLockRef.current = false;
    setHand(cloneHand(turnHandSnapshot));
    setActionQueue([]);
    pushLog("Mosse annullate — mano ripristinata");
  }

  function playCardFromHand(cardId) {
    if (busy || phase !== "player" || didDragRef.current) return;
    const maxSlots = aliveMembers().length;
    const tile = hand.find((c) => c.id === cardId);
    if (!tile) return;
    if (!canSpendAction(actionQueue, maxSlots)) {
      pushLog("Nessuno slot azione libero");
      return;
    }
    const merged = removeFromHandAndMerge(cardId);
    setActionQueue((q) =>
      pruneStalePlays(queuePlay(q, cardId, tile), destroyedIdsFromMerges(merged.merges))
    );
    AudioManager.playClick();
  }

  function onDragStart() {
    didDragRef.current = true;
  }

  function onDragEnd(result) {
    window.setTimeout(() => {
      didDragRef.current = false;
    }, 0);
    if (busy || phase !== "player") return;
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const maxSlots = aliveMembers().length;

    // Gioca carta → Slot Azione (esce dalla mano) + merge gratis se si chiudono adiacenze
    if (destination.droppableId === "action-slots") {
      if (source.droppableId !== "hand") return;
      const tile = hand.find((c) => c.id === draggableId);
      if (!tile) return;
      if (!canSpendAction(actionQueue, maxSlots)) {
        pushLog("Nessuno slot azione libero");
        return;
      }
      const merged = removeFromHandAndMerge(draggableId);
      setActionQueue((q) =>
        pruneStalePlays(queuePlay(q, draggableId, tile), destroyedIdsFromMerges(merged.merges))
      );
      return;
    }

    // Riordino / fusione in mano (consuma 1 slot)
    if (destination.droppableId === "hand" && source.droppableId === "hand") {
      if (source.index === destination.index) return;
      if (!canSpendAction(actionQueue, maxSlots)) {
        pushLog("Nessuno slot libero per spostare");
        return;
      }
      const reordered = reorderList(hand, source.index, destination.index);
      const merged = resolveAdjacentMerges(reordered);
      commitHand(merged);
      setActionQueue((q) =>
        pruneStalePlays(queueMove(q, source.index, destination.index), destroyedIdsFromMerges(merged.merges))
      );
      pushLog("Spostamento mano: −1 slot azione");
    }
  }

  function resolveBattleCost(ch = chapter) {
    if (practiceMode) return 0;
    if (fortressMode) return fortressStaminaCost(fortressLevel);
    return battleStaminaCost(ch, { hard: hardMode });
  }

  useEffect(() => {
    if (loading || initialized) return;
    (async () => {
      let ch;
      if (fortressMode) {
        const zone = getFortressZone(fortressZoneId);
        if (!zone) {
          navigate("/fight/fortress");
          return;
        }
        const baseNum = zone.enemyChapter || 1;
        const bases = await db.entities.StoryChapter.filter({ chapter_number: baseNum });
        const base = bases[0] || (await db.entities.StoryChapter.filter({ chapter_number: 1 }))[0];
        if (!base) {
          navigate("/fight/fortress");
          return;
        }
        ch = buildFortressChapter(zone, fortressLevel, base);
      } else {
        const chapters = await db.entities.StoryChapter.filter({ chapter_number: Number(chapterNumber) });
        ch = chapters[0];
      }
      if (!ch) { navigate("/"); return; }
      const enemyChars = ch.enemy_ids.map((id) => charMap[id]).filter(Boolean);
      const hardMult = practiceMode
        ? 0.75
        : fortressMode
          ? fortressEnemyMult(fortressLevel)
          : hardMode
            ? 1.45
            : 1;
      const enemyState = enemyChars.map((c) => {
        const maxHp = Math.round(effectiveHp(c) * hardMult);
        return {
          character: c,
          hp: maxHp,
          maxHp,
          status: emptyStatusBoard(),
        };
      });

      const rawTeam = playerState.team || [];
      const activeIds = [rawTeam[0], rawTeam[1], rawTeam[2]].filter(Boolean);
      const fallbackIds = activeIds.length ? activeIds : owned[0] ? [owned[0].id] : [];
      const toMember = (id) => {
        const o = owned.find((x) => x.id === id);
        if (!o) return null;
        const c = charMap[o.character_id];
        if (!c) return null;
        return { character: c, owned: o, status: emptyStatusBoard() };
      };
      const members = fallbackIds.map(toMember).filter(Boolean);
      const subId = rawTeam[3];
      const subMember =
        subId && !fallbackIds.includes(subId) ? toMember(subId) : null;

      if (members.length === 0) { navigate("/characters"); return; }

      const maxes = members.map((m) => effectiveHp(m.character, m.owned));
      memberHpRef.current = [...maxes];
      memberMaxHpRef.current = [...maxes];
      enemiesRef.current = enemyState;
      ultRef.current = members.map(() => 0);
      benchRef.current = subMember;
      openingMembersRef.current = members;
      openingBenchRef.current = subMember;
      setBench(subMember);

      const aliveIdx = members.map((_, i) => i);
      supportQuotaRef.current = { window: 0, drawn: 0 };
      const dealt = dealOpeningHand(aliveIdx, {
        resolveMove: (ci, mi) => members[ci]?.character?.moves?.[mi] || null,
        supportDrawn: 0,
      });
      supportQuotaRef.current.drawn = dealt.supportDrawn ?? 0;

      setTeamMembers(members);
      setMemberMaxHp([...maxes]);
      setMemberHp([...maxes]);
      setUlt(ultRef.current);
      setEnemies(enemyState);
      setChapter(ch);
      setPhase("intro");
      setHand(dealt.hand);
      setInitialized(true);
    })();
  }, [loading, initialized, chapterNumber, charMap, owned, playerState, navigate, hardMode, practiceMode, fortressMode, fortressZoneId, fortressLevel]);

  function drawIntoHand(count) {
    setHand((prev) => {
      const result = refillHand(prev, aliveMembers(), drawOpts({ drawCount: count }));
      flashMerges(result.merges);
      if (typeof result.supportDrawn === "number") {
        supportQuotaRef.current.drawn = result.supportDrawn;
      }
      return result.hand;
    });
  }

  useEffect(() => {
    if (phase !== "intro" || !chapter || !playerState) return;
    if (practiceMode) {
      setStaminaSpent(true);
      setStaminaCostCharged(0);
      setStaminaError("");
      return;
    }
    if (staminaLockRef.current || staminaSpent) return;
    staminaLockRef.current = true;
    let cancelled = false;
    (async () => {
      const cost = resolveBattleCost(chapter);
      if (!canAffordBattle(playerState, cost)) {
        const live = computeStamina(playerState);
        if (!cancelled) {
          setStaminaError(`Energia insufficiente (${live.stamina}/${live.stamina_max}, servono ${cost})`);
          staminaLockRef.current = false;
        }
        return;
      }
      const spent = spendStamina(playerState, cost);
      if (!spent.ok) {
        staminaLockRef.current = false;
        return;
      }
      await db.entities.PlayerState.update(playerState.id, {
        stamina: spent.stamina,
        stamina_max: spent.stamina_max,
        stamina_updated_at: spent.stamina_updated_at,
      });
      if (cancelled) {
        const refunded = refundStamina({ ...playerState, stamina: spent.stamina, stamina_max: spent.stamina_max, stamina_updated_at: spent.stamina_updated_at }, cost);
        await db.entities.PlayerState.update(playerState.id, {
          stamina: refunded.stamina,
          stamina_max: refunded.stamina_max,
          stamina_updated_at: refunded.stamina_updated_at,
        });
        staminaLockRef.current = false;
        return;
      }
      setStaminaSpent(true);
      setStaminaCostCharged(cost);
      setStaminaError("");
      refresh?.();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, chapter?.id, practiceMode]);

  async function ensureStaminaCharged() {
    if (practiceMode) return true;
    if (staminaSpent) return true;
    if (staminaLockRef.current) return false;
    staminaLockRef.current = true;
    const cost = resolveBattleCost(chapter);
    if (!canAffordBattle(playerState, cost)) {
      const live = computeStamina(playerState);
      setStaminaError(`Energia insufficiente (${live.stamina}/${live.stamina_max}, servono ${cost})`);
      toast({
        title: "Energia insufficiente",
        description: `Servono ${cost} energia per combattere.`,
        variant: "warning",
      });
      staminaLockRef.current = false;
      return false;
    }
    const spent = spendStamina(playerState, cost);
    if (!spent.ok) {
      staminaLockRef.current = false;
      return false;
    }
    await db.entities.PlayerState.update(playerState.id, {
      stamina: spent.stamina,
      stamina_max: spent.stamina_max,
      stamina_updated_at: spent.stamina_updated_at,
    });
    setStaminaSpent(true);
    setStaminaCostCharged(cost);
    setStaminaError("");
    refresh?.();
    return true;
  }

  async function startFight() {
    const ok = await ensureStaminaCharged();
    if (!ok) return;

    // Attiva buff cibo in battaglia (battle = tutta la partita; turns = N turni)
    foodAtkMultRef.current = 1;
    foodBuffTurnsRef.current = null;
    if (!practiceMode && playerState?.foodBuff) {
      try {
        const { activateFoodBuffForBattle, normalizeFoodBuff } = await import("@/lib/inventory");
        const eaten = activateFoodBuffForBattle(playerState);
        if (eaten.ok && eaten.buff) {
          const b = normalizeFoodBuff(eaten.buff);
          foodAtkMultRef.current = b?.atkMult || 1;
          if (b?.duration === "turns") {
            foodBuffTurnsRef.current = b.turnsLeft ?? b.turns ?? 3;
            pushLog(`Buff cucina: ${b.label} · ${foodBuffTurnsRef.current} turni`);
          } else {
            foodBuffTurnsRef.current = null;
            pushLog(`Buff cucina: ${b?.label || "Buff"} · tutta la battaglia`);
          }
        }
      } catch {
        /* ignore */
      }
    }

    const cost = staminaCostCharged || resolveBattleCost(chapter);
    beginPlayerPlanning(hand);
    if (practiceMode) {
      pushLog("Practice — nessun costo energia, nessuna ricompensa");
    } else if (fortressMode) {
      pushLog(`Fortezza Lv ${fortressLevel} — inizio! (−${cost} energia)`);
    } else {
      pushLog(`La battaglia ha inizio${hardMode ? " (HARD)" : ""}! (−${cost} energia)`);
    }
    if (shouldShowBattleTutorial()) setShowTutorial(true);
  }

  async function cancelIntro() {
    const refundAmount = staminaCostCharged;
    if (staminaSpent && refundAmount > 0 && playerState) {
      const refunded = refundStamina(playerState, refundAmount);
      await db.entities.PlayerState.update(playerState.id, {
        stamina: refunded.stamina,
        stamina_max: refunded.stamina_max,
        stamina_updated_at: refunded.stamina_updated_at,
      });
      setStaminaSpent(false);
      setStaminaCostCharged(0);
      staminaLockRef.current = false;
      refresh?.();
      toast({
        title: "Battaglia annullata",
        description: `Energia restituita (+${refundAmount}).`,
        variant: "default",
      });
    }
    navigate(
      practiceMode
        ? "/fight"
        : fortressMode
          ? `/fight/fortress?zone=${fortressZoneId}`
          : chapter?.arc_id
            ? `/fight/story/${chapter.arc_id}`
            : "/fight/story"
    );
  }

  async function doAttack() {
    if (busy || phase !== "player") return;
    const used = resolvePlayOrder(actionQueue, hand);
    // Solo spostamenti (o coda vuota): il turno deve comunque chiudersi se gli slot sono usati
    const maxSlots = aliveMembers().length;
    const slotsFull = maxSlots > 0 && actionQueue.length >= maxSlots;
    if (used.length === 0 && !slotsFull && actionQueue.length === 0) return;
    if (used.length === 0 && !slotsFull) return;

    setBusy(true);
    const ult2 = [...ultRef.current];
    const mult = comboMultiplier(used.length, used);
    let enemies2 = enemiesRef.current.map((e) => ({ ...e, status: e.status || emptyStatusBoard() }));
    let tgt = target;
    const teamStatus = teamMembers.map((m) => m.status || emptyStatusBoard());

    if (used.length === 0) {
      pushLog("Solo spostamenti — turno passato");
    }

    for (const tile of used) {
      const ci = tile.charIndex;
      const stars = tile.stars || 1;
      const member = teamMembers[ci];
      if (!member || memberHpRef.current[ci] <= 0) continue;
      if (hasCrowdControl(teamStatus[ci])) {
        pushLog(`${member.character.char_name} è stordito e salta l'azione!`);
        await sleep(350);
        continue;
      }
      const move = member.character.moves[tile.moveIndex];
      const isUlt = tile.moveIndex === 3;
      const atkFx = attackModifierFromEffects(teamStatus[ci]);

      if (move.type === "buff" || move.type === "heal") {
        if (!isUlt && ult2[ci] < ULT_MAX) ult2[ci]++;
        const fxMult = isUlt ? ultimateEffectMultiplier(member.owned?.ultimateLevel ?? 1) : 1;
        const heal = Math.round(
          move.power * healMultiplier(stars) * (move.type === "heal" ? 1 : 1.5) * fxMult
        );
        const hi = healTargetIndex(ci);
        const supportTarget = hi >= 0 ? hi : ci;
        await withAbilityMotion(
          {
            side: "ally",
            index: ci,
            kind: "support",
            targetSide: "ally",
            targetIndex: supportTarget,
            nudgeX: lungeNudge(ci, supportTarget),
          },
          async () => {
            if (hi >= 0) {
              memberHpRef.current[hi] = Math.min(
                memberMaxHpRef.current[hi],
                memberHpRef.current[hi] + heal
              );
              syncMemberHp();
              addFloater("team", hi, heal, true);
            }
            if (move.type === "buff") {
              teamStatus[hi >= 0 ? hi : ci] = addEffect(
                teamStatus[hi >= 0 ? hi : ci],
                createEffect({ type: EFFECT_TYPES.BUFF_ATK, potency: stars, duration: 2, source: ci })
              );
            }
            for (const fx of effectsFromMove(move, ci)) {
              teamStatus[hi >= 0 ? hi : ci] = addEffect(teamStatus[hi >= 0 ? hi : ci], fx);
            }
            if (isUlt) ult2[ci] = 0;
            pushLog(`${member.character.char_name} usa ${move.name} (${stars}★)! +${heal} HP`);
            AudioManager.playHeal();
          }
        );
      } else {
        tgt = aliveEnemyIndex(enemies2, tgt);
        if (tgt < 0) {
          if (isUlt) ult2[ci] = 0;
          continue;
        }
        const strikeTarget = tgt;
        await withAbilityMotion(
          {
            side: "ally",
            index: ci,
            kind: "strike",
            targetSide: "enemy",
            targetIndex: strikeTarget,
            nudgeX: lungeNudge(ci, strikeTarget),
          },
          async () => {
            const typeMult = damageTypeMultiplier(
              member.character.attribute,
              enemies2[strikeTarget].character
            );
            const ultLvMult = isUlt ? ultimateLevelMultiplier(member.owned?.ultimateLevel ?? 1) : 1;
            const bonus = isUlt ? 1.5 : 1;
            const raw = Math.round(
              tileDamage(member.character, member.owned, move, stars) *
                mult *
                typeMult *
                bonus *
                atkFx *
                ultLvMult *
                (foodAtkMultRef.current || 1)
            );
            const def = effectiveDefense(enemies2[strikeTarget].character);
            const defFx = defenseModifierFromEffects(enemies2[strikeTarget].status);
            const dmg = mitigateDamage(raw, def, defFx);
            enemies2[strikeTarget] = {
              ...enemies2[strikeTarget],
              hp: enemies2[strikeTarget].hp - dmg,
            };
            for (const fx of effectsFromMove(move, ci)) {
              enemies2[strikeTarget] = {
                ...enemies2[strikeTarget],
                status: addEffect(enemies2[strikeTarget].status, fx),
              };
            }
            enemies2 = syncEnemies(enemies2, setEnemies, enemiesRef);
            const wasCrit = typeMult > 1 || isUlt || stars >= 3;
            addFloater("enemy", strikeTarget, dmg, wasCrit);
            AudioManager.playHit(wasCrit);
            const starTag = stars > 1 ? ` ${stars}★` : "";
            const tag = typeMult > 1 ? " SUPEREFFICACE!" : typeMult < 1 ? " non molto efficace" : "";
            pushLog(
              `${member.character.char_name}: ${isUlt ? "ULTIMA! " : ""}${move.name}${starTag} → ${dmg}${tag}`
            );
            if (isUlt) {
              ult2[ci] = 0;
              setUltCinematic({
                id: `u_${Date.now()}`,
                charName: member.character.char_name,
                moveName: move.name,
                dmg,
              });
              AudioManager.playUlt();
            } else if (ult2[ci] < ULT_MAX) {
              ult2[ci]++;
            }
          }
        );
        if (isUlt) {
          await sleep(500);
          setUltCinematic(null);
        }
        if (enemies2[strikeTarget].hp <= 0) {
          pushLog(`${enemies2[strikeTarget].character.char_name} sconfitto!`);
          tgt = aliveEnemyIndex(enemies2, strikeTarget + 1);
        } else {
          tgt = strikeTarget;
        }
      }
    }

    // salva status team (per fasi future)
    setTeamMembers((tm) => tm.map((m, i) => ({ ...m, status: teamStatus[i] })));

    const usedIds = new Set(used.map((c) => c.id));
    setActionQueue([]);
    ultRef.current = ult2;
    setUlt(ult2);

    const alive = aliveMembers();
    const maxH = maxHandSize(alive.length);
    let remaining = hand.filter((c) => !usedIds.has(c.id));
    for (let ci = 0; ci < ult2.length; ci++) {
      if (
        ult2[ci] >= ULT_MAX &&
        teamMembers[ci]?.character?.moves?.[3] &&
        memberHpRef.current[ci] > 0 &&
        !remaining.some((t) => t.charIndex === ci && t.moveIndex === 3) &&
        remaining.length < maxH
      ) {
        remaining.push(createBattleTile(ci, 3, 3));
      }
    }
    // Fine turno giocatore → la pesca conta già sul turno successivo
    const nextTurn = turn + 1;
    syncSupportQuota(nextTurn);
    commitHand(
      refillHand(remaining, alive, drawOpts({ drawCount: drawCountForTeam(alive), turn: nextTurn }))
    );

    // Scala buff cibo a durata turni
    tickFoodBuffAfterPlayerTurn();

    if (enemies2.every((e) => e.hp <= 0)) {
      await sleep(400);
      recordBattleResult(true);
      setPhase("win");
      await grantRewards();
      setBusy(false);
      return;
    }

    setTarget(Math.max(0, aliveEnemyIndex(enemies2, tgt)));

    await sleep(250);
    await enemyTurn(enemies2);

    if (memberHpRef.current.every((h) => h <= 0)) {
      setBusy(false);
      return;
    }

    setTurn((t) => t + 1);
    beginPlayerPlanning(null);
    autoFightLockRef.current = false;
    setBusy(false);
  }

  /** Slot pieni (di solito 3 carte) → combatti automaticamente */
  useEffect(() => {
    if (busy || phase !== "player") return;
    const maxSlots = aliveMembers().length;
    if (maxSlots <= 0 || actionQueue.length < maxSlots) {
      if (actionQueue.length < maxSlots) autoFightLockRef.current = false;
      return undefined;
    }
    if (autoFightLockRef.current) return undefined;
    autoFightLockRef.current = true;
    const t = window.setTimeout(() => {
      void doAttack();
    }, 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionQueue, busy, phase, memberHp, teamMembers]);

  function tickFoodBuffAfterPlayerTurn() {
    if (practiceMode) return;
    if (foodBuffTurnsRef.current == null) return; // duration battle: no tick
    foodBuffTurnsRef.current -= 1;
    if (foodBuffTurnsRef.current <= 0) {
      foodBuffTurnsRef.current = 0;
      foodAtkMultRef.current = 1;
      pushLog("Buff cucina scaduto");
    } else {
      pushLog(`Buff cucina: ${foodBuffTurnsRef.current} turni rimasti`);
    }
  }

  async function endFoodBuffBattle() {
    foodAtkMultRef.current = 1;
    foodBuffTurnsRef.current = null;
    if (practiceMode || !playerState?.foodBuff) return;
    try {
      const { clearFoodBuffAfterBattle } = await import("@/lib/inventory");
      const cleared = clearFoodBuffAfterBattle(playerState);
      if (cleared.ok && cleared.patch) {
        await db.entities.PlayerState.update(playerState.id, cleared.patch);
        refresh?.();
      }
    } catch {
      /* ignore */
    }
  }

  async function surrenderBattle() {
    if (busy || phase === "win" || phase === "lose" || phase === "intro" || phase === "loading") return;
    recordBattleResult(false);
    await endFoodBuffBattle();
    setLunge(null);
    setStruck(null);
    setPhase("lose");
    setBusy(false);
  }

  async function fireUltimate(charIndex) {
    if (busy || phase !== "player") return;
    if (memberHpRef.current[charIndex] <= 0) return;
    const charge = ultRef.current[charIndex] || 0;
    if (charge < ULT_MAX) return;
    const member = teamMembers[charIndex];
    const ultMove = member?.character?.moves?.[3];
    if (!ultMove) return;
    setBusy(true);
    let enemies2 = enemiesRef.current.map((e) => ({ ...e }));
    let tgt = aliveEnemyIndex(enemies2, target);
    if (tgt < 0) { setBusy(false); return; }
    let dealtDmg = 0;
    await withAbilityMotion(
      {
        side: "ally",
        index: charIndex,
        kind: "strike",
        targetSide: "enemy",
        targetIndex: tgt,
        nudgeX: lungeNudge(charIndex, tgt),
      },
      async () => {
        const typeMult = damageTypeMultiplier(member.character.attribute, enemies2[tgt].character);
        const rawUlt = battleUltimateDamage(
          member.character,
          member.owned,
          ultMove,
          3,
          typeMult,
          1.5
        );
        dealtDmg = mitigateDamage(
          rawUlt,
          effectiveDefense(enemies2[tgt].character),
          defenseModifierFromEffects(enemies2[tgt].status)
        );
        enemies2[tgt] = { ...enemies2[tgt], hp: enemies2[tgt].hp - dealtDmg };
        enemies2 = syncEnemies(enemies2, setEnemies, enemiesRef);
        addFloater("enemy", tgt, dealtDmg, true);
        AudioManager.playUlt();
        const ultLv = member.owned?.ultimateLevel ?? 1;
        pushLog(`${member.character.char_name}: ULTIMA! ${ultMove.name} (Lv.${ultLv}) → ${dealtDmg}`);
        setUltCinematic({
          id: `u_${Date.now()}`,
          charName: member.character.char_name,
          moveName: ultMove.name,
          dmg: dealtDmg,
        });
      }
    );
    void import("@/lib/dailies")
      .then(({ bumpDaily }) => {
        const uid = playerState?.created_by_id || playerState?.id;
        if (uid) bumpDaily(uid, "use_ulti");
      })
      .catch(() => {});
    const ult3 = [...ultRef.current];
    ult3[charIndex] = 0;
    ultRef.current = ult3;
    setUlt(ult3);
    await sleep(700);
    setUltCinematic(null);
    if (enemies2.every((e) => e.hp <= 0)) {
      recordBattleResult(true);
      setPhase("win");
      await grantRewards();
      setBusy(false);
      return;
    }
    if (enemies2[tgt].hp <= 0) {
      pushLog(`${enemies2[tgt].character.char_name} sconfitto!`);
    }
    setTarget(Math.max(0, aliveEnemyIndex(enemies2, tgt)));
    setBusy(false);
  }

  async function enemyTurn(currentEnemies) {
    setPhase("enemy");
    let enemies2 = currentEnemies.map((e) => ({
      ...e,
      status: e.status || emptyStatusBoard(),
    }));
    const teamStatus = teamMembers.map((m) => m.status || emptyStatusBoard());

    for (let ei = 0; ei < enemies2.length; ei++) {
      const enemy = enemies2[ei];
      if (enemy.hp <= 0) continue;
      if (hasCrowdControl(enemy.status)) {
        pushLog(`${enemy.character.char_name} è stordito e salta il turno!`);
        await sleep(350);
        continue;
      }

      const targets = aliveMembers();
      if (targets.length === 0) break;

      const action = chooseEnemyAction(enemy, targets, memberHpRef.current, memberMaxHpRef.current);
      if (!action) continue;
      const { move, kind, targetIndex, stunEffect } = action;

      if (kind === "heal") {
        const heal = enemyHealAmount(enemy, move);
        await withAbilityMotion(
          {
            side: "enemy",
            index: ei,
            kind: "support",
            targetSide: "enemy",
            targetIndex: ei,
          },
          async () => {
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
            enemiesRef.current = enemies2;
            setEnemies([...enemies2]);
            addFloater("enemy", ei, heal, true);
            AudioManager.playHeal();
            pushLog(`${enemy.character.char_name}: ${move.name} → +${heal} HP`);
          }
        );
        continue;
      }

      if (kind === "buff") {
        await withAbilityMotion(
          {
            side: "enemy",
            index: ei,
            kind: "support",
            targetSide: "enemy",
            targetIndex: ei,
          },
          async () => {
            enemy.status = addEffect(
              enemy.status,
              createEffect({ type: EFFECT_TYPES.BUFF_DEF, potency: 1, duration: 2, source: ei })
            );
            enemiesRef.current = enemies2;
            setEnemies([...enemies2]);
            pushLog(`${enemy.character.char_name}: ${move.name} — difesa potenziata!`);
          }
        );
        continue;
      }

      const defIdx = targetIndex >= 0 ? targetIndex : targets[0];
      if (hasCrowdControl(teamStatus[defIdx])) {
        // target stordito: colpisci comunque (il CC alleato non blocca ricevere danno)
      }
      await withAbilityMotion(
        {
          side: "enemy",
          index: ei,
          kind: "strike",
          targetSide: "ally",
          targetIndex: defIdx,
          nudgeX: lungeNudge(ei, defIdx),
        },
        async () => {
          const defender = teamMembers[defIdx];
          const typeMult = damageTypeMultiplier(enemy.character.attribute, defender.character);
          const atkFxEnemy = attackModifierFromEffects(enemies2[ei]?.status || enemy.status);
          const enemyAtkMult = practiceMode
            ? 0.85
            : fortressMode
              ? 0.9 + fortressLevel * 0.06
              : hardMode
                ? 1.25
                : 1;
          const raw = Math.round(
            enemyDamage(enemy.character, move) * typeMult * enemyAtkMult * atkFxEnemy
          );
          const def = effectiveDefense(defender.character, defender.owned);
          const defFx = defenseModifierFromEffects(teamStatus[defIdx]);
          const dmg = mitigateDamage(raw, def, defFx);
          memberHpRef.current[defIdx] = Math.max(0, memberHpRef.current[defIdx] - dmg);
          const died = memberHpRef.current[defIdx] <= 0;
          if (stunEffect) {
            teamStatus[defIdx] = addEffect(teamStatus[defIdx], stunEffect);
            pushLog(`${defender.character.char_name} è stordito!`);
          }
          syncMemberHp();
          addFloater("team", defIdx, dmg, typeMult > 1);
          AudioManager.playHit(typeMult > 1);
          const tag = typeMult > 1 ? " SUPEREFFICACE!" : typeMult < 1 ? " non molto efficace" : "";
          pushLog(`${enemy.character.char_name}: ${move.name} → ${dmg}${tag}`);
          if (died) {
            onMemberDeath(defIdx);
            pushLog(`${defender.character.char_name} è KO!`);
          }
        }
      );
    }

    setTeamMembers((tm) => tm.map((m, i) => ({ ...m, status: teamStatus[i] })));
    syncEnemies(enemies2, setEnemies, enemiesRef);

    if (memberHpRef.current.every((h) => h <= 0)) {
      await sleep(300);
      recordBattleResult(false);
      await endFoodBuffBattle();
      setPhase("lose");
    }
  }

  async function grantRewards() {
    await endFoodBuffBattle();
    if (!chapter || practiceMode) return;

    if (fortressMode) {
      const rewards = rollFortressRewards(fortressZoneId, fortressLevel);
      const patch = applyFortressRewardPatch(playerState, rewards);
      const xpGain = battleRankXp({ isBoss: fortressLevel >= 8, hard: fortressLevel >= 6, win: true });
      const rankPatch = applyRankXp(playerState, xpGain);
      await db.entities.PlayerState.update(playerState.id, {
        ...patch,
        account_xp: rankPatch.account_xp,
        account_level: rankPatch.account_level,
      });
      const uid = playerState.created_by_id || playerState.id;
      markFortressClear(uid, fortressZoneId, fortressLevel);
      setFortressLoot(rewards);
      pushLog(`Fortezza: ${rewards.lines.join(" · ")} · +${xpGain} Rank XP`);
      if (rankPatch.leveledUp) {
        toast({
          title: `Rank ${rankPatch.nextLevel}!`,
          description: "Nuovi sblocchi disponibili.",
        });
      }
      try {
        const { bumpDaily } = await import("@/lib/dailies");
        bumpDaily(uid, "battle_win");
        if (Object.values(rewards.materials || {}).some((n) => n > 0)) bumpDaily(uid, "material_drop");
        const { markDailyLoop } = await import("@/lib/dailyLoop");
        markDailyLoop(uid, "fortress");
      } catch {
        /* ignore */
      }
      refresh();
      return;
    }

    const berryMult = hardMode ? 1.5 : 1;
    const berryGain = Math.round(chapter.reward_berry * berryMult);
    const strawGain = Math.round(chapter.reward_strawberry * (hardMode ? 1.35 : 1));
    let matDrop = rollMissionMaterials({ isBoss: !!chapter.is_boss, hard: hardMode });
    if (isEventActive() && hardMode) {
      matDrop = mergeMaterials(matDrop, { sea_crystal: 1, dawn_shard: 1, pirate_crest: 0 });
    }
    const materials = mergeMaterials(playerState.materials, matDrop);
    const xpGain = battleRankXp({ isBoss: !!chapter.is_boss, hard: hardMode, win: true });
    const rankPatch = applyRankXp(playerState, xpGain);
    const patch = {
      berry: playerState.berry + berryGain,
      strawberry: playerState.strawberry + strawGain,
      materials,
      account_xp: rankPatch.account_xp,
      account_level: rankPatch.account_level,
    };
    if (!hardMode && !chapter.is_side) {
      patch.story_progress = Math.max(playerState.story_progress, Number(chapterNumber) + 1);
    }
    if (chapter.is_side) {
      const cleared = new Set(playerState.side_cleared || []);
      cleared.add(chapter.id);
      patch.side_cleared = [...cleared];
    }
    await db.entities.PlayerState.update(playerState.id, patch);
    const matBits = Object.entries(matDrop)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `+${n} ${k.replace("_", " ")}`)
      .join(" · ");
    pushLog(
      `Ricompense${hardMode ? " HARD" : ""}: +${berryGain} Beri · +${strawGain} Fragole · +${xpGain} Rank XP` +
        (matBits ? ` · ${matBits}` : "")
    );
    if (rankPatch.leveledUp) {
      toast({
        title: `Rank ${rankPatch.nextLevel}!`,
        description: "Nuovi sblocchi disponibili.",
      });
    }
    try {
      const { bumpDaily } = await import("@/lib/dailies");
      const uidDaily = playerState.created_by_id || playerState.id;
      bumpDaily(uidDaily, "clear_chapter");
      bumpDaily(uidDaily, "battle_win");
      if (hardMode) bumpDaily(uidDaily, "clear_hard");
      if (chapter.is_boss) bumpDaily(uidDaily, "clear_boss");
      if (Object.values(matDrop).some((n) => n > 0)) bumpDaily(uidDaily, "material_drop");
      if (memberHpRef.current.every((hp, i) => !teamMembers[i] || hp > 0)) {
        bumpDaily(uidDaily, "flawless_clear");
      }
      const { markDailyLoop } = await import("@/lib/dailyLoop");
      markDailyLoop(uidDaily, "story");
      if (hardMode) {
        const { bumpWeeklyHardClear } = await import("@/lib/weeklyMeta");
        bumpWeeklyHardClear(uidDaily);
      }
    } catch {
      /* ignore */
    }
    refresh();
  }

  function retry() {
    const enemyState = enemies.map((e) => ({
      ...e,
      hp: e.maxHp,
      status: emptyStatusBoard(),
    }));
    const members = openingMembersRef.current.map((m) => ({
      ...m,
      status: emptyStatusBoard(),
    }));
    const maxes = members.map((m) => effectiveHp(m.character, m.owned));
    memberHpRef.current = [...maxes];
    memberMaxHpRef.current = [...maxes];
    enemiesRef.current = enemyState;
    benchRef.current = openingBenchRef.current;
    setBench(openingBenchRef.current);
    setEnemies(enemyState);
    setTeamMembers(members);
    setMemberMaxHp([...maxes]);
    setMemberHp([...maxes]);
    setTurn(1);
    setLog([]);
    setActionQueue([]);
    setTurnHandSnapshot(null);
    setStaminaSpent(false);
    setStaminaError("");
    setSubBanner(null);
    setLunge(null);
    setStruck(null);
    setPhase("intro");
    supportQuotaRef.current = { window: 0, drawn: 0 };
    const aliveIdx = members.map((_, i) => i);
    commitHand(
      dealOpeningHand(aliveIdx, {
        resolveMove: (ci, mi) => members[ci]?.character?.moves?.[mi] || null,
        supportDrawn: 0,
      })
    );
    ultRef.current = members.map(() => 0);
    setUlt(ultRef.current);
  }

  if (loading || phase === "loading") {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#0b161b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#164446] border-t-[#f5a623]" />
      </div>
    );
  }

  return (
    <div
      className="battle-stage relative h-[100dvh] overflow-x-hidden overflow-y-hidden text-white"
      style={{ fontFamily: "'Russo One', system-ui, sans-serif" }}
    >
      <div className="battle-stage__map" aria-hidden="true" />
      <div className="battle-stage__vignette" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex h-[100dvh] max-w-lg flex-col overflow-visible px-2 pt-2">
        {/* Header: targa legno + bussola turno */}
        <div className="battle-chrome-header relative flex shrink-0 items-start justify-between gap-2 px-0.5">
          <BattleMenu
            chapter={chapter}
            practiceMode={practiceMode}
            hardMode={hardMode}
            onSurrender={() => void surrenderBattle()}
          />
          <div className="pointer-events-none absolute inset-x-11 top-0 flex flex-col items-center text-center">
            <div className="battle-title-plaque">
              <h2 className="battle-chrome-title">
                {practiceMode ? "Practice" : chapter?.title}
              </h2>
            </div>
            {(practiceMode || hardMode || fortressMode) && (
              <span className={cn("battle-mode-banner", hardMode && !practiceMode && "battle-mode-banner--hard")}>
                {practiceMode ? "Nessun costo" : fortressMode ? `Lv ${fortressLevel}` : "Hard"}
              </span>
            )}
          </div>
          <span className="battle-turn-chip mt-1" title={`Turno ${turn}`}>
            <span className="battle-turn-chip__ring" aria-hidden="true" />
            <span className="battle-turn-chip__needle" aria-hidden="true" />
            <span className="battle-turn-chip__label">T·{turn}</span>
          </span>
        </div>

        {(() => {
          const maxSlots = aliveMembers().length;
          const playCount = playCardIds(actionQueue).length;
          const canReset = actionQueue.length > 0 && !!turnHandSnapshot;
          const planning = phase === "player";

          const battlefield = (
            <div className="mt-1.5 flex min-h-0 flex-1 flex-col">
              {/* Log compatto — evita di ripetere il banner Practice */}
              {(() => {
                const tip =
                  log.slice(-1)[0] ||
                  (phase === "enemy" ? "Turno nemico..." : "Tocca le carte per giocare");
                const hide =
                  /nessun costo|nessuna ricompensa|practice —/i.test(String(tip)) &&
                  log.length <= 1;
                if (hide) return null;
                return (
                  <div className="battle-log-banner shrink-0">
                    <p className="truncate text-[9px] uppercase tracking-wide text-[#f5e6c8]/90">
                      {tip}
                    </p>
                  </div>
                );
              })()}

              {/* Arena 2.5D — nemici in alto a destra, alleati in basso a sinistra */}
              <div className="battle-arena mt-2 flex min-h-0 flex-1 flex-col">
                <div className="battle-arena__floor" aria-hidden="true" />
                <div className="battle-arena__deck">
                  <div className="battle-arena__enemies">
                    {enemies.map((e, i) => {
                      const alive = e.hp > 0;
                      const isTarget = target === i && alive && planning;
                      const enemyLunge =
                        lunge?.side === "enemy" && lunge.index === i
                          ? { kind: lunge.kind, nudgeX: lunge.nudgeX }
                          : null;
                      return (
                        <BattleFighter
                          key={i}
                          side="enemy"
                          character={e.character}
                          name={e.character.char_name}
                          hp={e.hp}
                          maxHp={e.maxHp}
                          alive={alive}
                          selected={isTarget}
                          depth={enemies.length - i}
                          floaters={floaters.filter((f) => f.side === "enemy" && f.index === i)}
                          disabled={!alive || !planning}
                          onClick={() => setTarget(i)}
                          lunge={enemyLunge}
                          struck={struck?.side === "enemy" && struck.index === i}
                        />
                      );
                    })}
                  </div>

                  {phase === "enemy" && (
                    <div className="battle-arena__turn battle-scroll-chip animate-pulse">
                      Turno nemico...
                    </div>
                  )}

                  <div className="battle-midline" aria-hidden="true">
                    <span className="battle-midline__rule" />
                  </div>

                  <div className="battle-arena__allies">
                    {teamMembers.map((m, i) => {
                      const charge = ult[i] || 0;
                      const hp = memberHp[i] || 0;
                      const max = memberMaxHp[i] || 1;
                      const dead = hp <= 0;
                      const allyLunge =
                        lunge?.side === "ally" && lunge.index === i
                          ? { kind: lunge.kind, nudgeX: lunge.nudgeX }
                          : null;
                      return (
                        <BattleFighter
                          key={i}
                          side="ally"
                          character={m.character}
                          name={m.character.char_name}
                          hp={hp}
                          maxHp={max}
                          ultCharge={charge}
                          ultMax={ULT_MAX}
                          level={m.owned?.level}
                          alive={!dead}
                          depth={i}
                          floaters={floaters.filter((f) => f.side === "team" && f.index === i)}
                          lunge={allyLunge}
                          struck={struck?.side === "ally" && struck.index === i}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Pedane 1/2/3 + SUB — combatti auto a slot pieni */}
              {planning && (
                <div className="relative z-[8] flex w-full shrink-0 justify-center overflow-visible pb-1 pt-1">
                  <Droppable droppableId="action-slots" direction="horizontal" isDropDisabled={busy || actionQueue.length >= maxSlots}>
                    {(provided, snapshot) => {
                      const slotsFull = maxSlots > 0 && actionQueue.length >= maxSlots;
                      return (
                        <ActionSlotsBar
                          maxSlots={maxSlots}
                          actionQueue={actionQueue}
                          teamMembers={teamMembers}
                          bench={bench}
                          dropProvided={provided}
                          isDraggingOver={snapshot.isDraggingOver}
                          slotsFull={slotsFull}
                        />
                      );
                    }}
                  </Droppable>
                </div>
              )}
              {!planning && bench?.character && (
                <div className="relative z-[8] flex w-full shrink-0 justify-end overflow-visible px-4 pb-1">
                  <div
                    className="battle-sub-slot"
                    title={bench.character.char_name}
                    aria-label={`Riserva: ${bench.character.char_name}`}
                  >
                    <span className="battle-sub-badge__tag">SUB</span>
                    <div className="battle-sub-badge__ring">
                      <CharacterArt
                        character={bench.character}
                        className="h-full w-full !object-cover object-top"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );

          const handPanel = planning && (
            <div className="hand hand-dock battle-chrome-footer pirate-table shrink-0">
              <span className="pirate-table__rope pirate-table__rope--top" aria-hidden="true" />
              <span className="pirate-table__brass pirate-table__brass--tl" aria-hidden="true" />
              <span className="pirate-table__brass pirate-table__brass--tr" aria-hidden="true" />
              <div className="relative z-0 mb-1 flex items-center justify-between gap-2 px-1.5">
                <span className="battle-hand-label">
                  <span className="battle-hand-label__cap">Mano di carte</span>
                  <span className="battle-hand-label__count">
                    {hand.length}/{maxHandSize(maxSlots || teamMembers.length)}
                  </span>
                </span>
                <div className="flex items-center gap-1.5">
                  {playCount >= 2 && (
                    <span className="battle-chip-amber">
                      Combo x{comboMultiplier(playCount, resolvePlayOrder(actionQueue, hand)).toFixed(2)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={resetTurnActions}
                    disabled={busy || !canReset}
                    className="battle-chip-teal disabled:opacity-40"
                  >
                    <Undo2 size={11} /> Annulla
                  </button>
                </div>
              </div>

              <Droppable droppableId="hand" direction="horizontal" isDropDisabled={busy}>
                {(provided, snapshot) => {
                  const tiles = hand
                    .map((tile) => {
                      const member = teamMembers[tile.charIndex];
                      const move = member?.character?.moves?.[tile.moveIndex];
                      if (!move || !member) return null;
                      return { tile, member, move };
                    })
                    .filter(Boolean);

                  return (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "hand-rail",
                        snapshot.isDraggingOver && "hand-rail--dragging"
                      )}
                    >
                      {tiles.map(({ tile, member, move }, idx) => {
                        const isUltCard = tile.moveIndex === 3;
                        const stars = tile.stars || 1;
                        const tgtEnemy = enemies[target];
                        const adv =
                          move.type === "attack" && tgtEnemy && tgtEnemy.hp > 0
                            ? advantageMultiplier(member.character.attribute, tgtEnemy.character.attribute)
                            : 1;
                        const fanRot = 0;
                        const fanY = 0;

                        return (
                          <Draggable
                            key={tile.id}
                            draggableId={tile.id}
                            index={idx}
                            isDragDisabled={busy}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={cn(
                                  "hand-card-fan",
                                  idx > 0 && "hand-card-fan--overlap",
                                  dragSnapshot.isDragging && "skill-card--dragging"
                                )}
                                style={{
                                  ...dragProvided.draggableProps.style,
                                  zIndex: dragSnapshot.isDragging ? 999 : idx + 1,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.zIndex = "999";
                                }}
                                onMouseLeave={(e) => {
                                  if (dragSnapshot.isDragging) return;
                                  e.currentTarget.style.zIndex = String(idx + 1);
                                }}
                                onClick={() => {
                                  if (dragSnapshot.isDragging || didDragRef.current) return;
                                  playCardFromHand(tile.id);
                                }}
                              >
                                <div
                                  className="hand-card-fan__tilt"
                                  style={{
                                    transform: dragSnapshot.isDragging
                                      ? undefined
                                      : `rotate(${fanRot}deg) translateY(${fanY}px)`,
                                  }}
                                >
                                  <SkillCard
                                    member={member}
                                    move={move}
                                    stars={stars}
                                    isUlt={isUltCard}
                                    advantage={adv}
                                    merging={mergeFlash.includes(tile.id)}
                                    className="pointer-events-none"
                                  />
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  );
                }}
              </Droppable>
            </div>
          );

          if (planning) {
            return (
              <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                {battlefield}
                {handPanel}
              </DragDropContext>
            );
          }

          return (
            <>
              {battlefield}
              {phase === "enemy" && <div className="h-2 shrink-0" />}
            </>
          );
        })()}
      </div>

      <MergeBanner event={mergeBanner} />
      <UltCinematic event={ultCinematic} />
      <BattleTutorial open={showTutorial} onDone={() => setShowTutorial(false)} />

      <AnimatePresence>
        {subBanner && (
          <motion.div
            key={subBanner.id}
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            className="pointer-events-none absolute inset-x-0 top-[28%] z-40 flex justify-center px-4"
          >
            <div className="rounded-2xl border-[3px] border-black bg-[#38bdf8] px-5 py-3 text-center shadow-[0_4px_0_0_#000]">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/60">Sostituzione</p>
              <p className="text-sm font-black uppercase text-black">{subBanner.name} entra!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro overlay */}
      <AnimatePresence>
        {phase === "intro" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ y: 40 }} animate={{ y: 0 }} className={`w-full max-w-md rounded-2xl ${TEAL} ${PANEL} p-5`}>
              <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">
                {practiceMode ? "Allenamento" : chapter?.subtitle}
                {hardMode ? " · HARD" : ""}
                {fortressMode ? " · FORTEZZA" : ""}
                {practiceMode ? " · PRACTICE" : ""}
              </p>
              <h3 className="mt-1 text-xl uppercase tracking-wide text-white">
                {practiceMode ? "Practice" : chapter?.title}
              </h3>
              {hardMode && !practiceMode && (
                <p className="mt-1 text-[10px] uppercase tracking-wide text-red-400">
                  Nemici più forti · loot e Rank XP aumentati
                </p>
              )}
              {fortressMode && (
                <p className="mt-1 text-[10px] uppercase tracking-wide text-[#38bdf8]">
                  Percorso settimanale · più alto = loot migliore
                </p>
              )}
              <p className="mt-3 text-sm leading-relaxed text-white/90">
                {practiceMode
                  ? "Prova combo, carte e il sub senza consumare energia. Nessuna ricompensa."
                  : chapter?.dialogue_before}
              </p>
              {(() => {
                if (practiceMode) {
                  return (
                    <>
                      <div className="mt-3 rounded-xl border-2 border-black bg-[#0b161b] px-3 py-2 text-center text-[10px] uppercase text-[#38bdf8]">
                        Costo 0 · nemici più deboli
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={cancelIntro}
                          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-black bg-[#0b161b] py-3 text-sm uppercase tracking-wide text-[#f5a623] shadow-[0_3px_0_0_#000]"
                        >
                          <X size={16} /> Esci
                        </button>
                        <button
                          type="button"
                          onClick={startFight}
                          className={`flex-[1.4] rounded-2xl py-3 text-sm uppercase tracking-wide ${AMBER} ${PANEL}`}
                        >
                          <span className="flex items-center justify-center gap-2">
                            <Swords size={16} /> Inizia
                          </span>
                        </button>
                      </div>
                    </>
                  );
                }
                const cost = resolveBattleCost(chapter);
                const live = computeStamina(playerState);
                const ok = canAffordBattle(playerState, cost);
                return (
                  <>
                    <div className="mt-3 flex items-center justify-between rounded-xl border-2 border-black bg-[#0b161b] px-3 py-2 text-[10px] uppercase">
                      <span className="flex items-center gap-1 text-[#f5a623]">
                        <Zap size={12} /> Costo
                      </span>
                      <span className={ok ? "font-bold text-white" : "font-bold text-red-400"}>
                        −{cost} · Hai {live.stamina}/{live.stamina_max}
                      </span>
                    </div>
                    {staminaError && (
                      <p className="mt-2 text-center text-[10px] uppercase text-red-400">{staminaError}</p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={cancelIntro}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-black bg-[#0b161b] py-3 text-sm uppercase tracking-wide text-[#f5a623] shadow-[0_3px_0_0_#000]"
                      >
                        <X size={16} /> Annulla
                      </button>
                      <button
                        type="button"
                        disabled={!ok}
                        onClick={startFight}
                        className={`flex-[1.4] rounded-2xl py-3 text-sm uppercase tracking-wide ${AMBER} ${PANEL} disabled:opacity-40`}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Swords size={16} /> Combatti
                        </span>
                      </button>
                    </div>
                    <p className="mt-2 text-center text-[9px] uppercase tracking-wide text-white/45">
                      Annulla: esci e recuperi l&apos;energia
                    </p>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Win overlay */}
      <AnimatePresence>
        {phase === "win" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} className={`w-full max-w-md rounded-2xl ${TEAL} ${PANEL} p-6 text-center`}>
              <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1, transition: { type: "spring" } }}
                className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full ${AMBER} border-[3px] border-black`}>
                <Check className="text-black" size={36} />
              </motion.div>
              <h3 className="text-2xl uppercase tracking-wide text-[#f5a623]">
                {practiceMode ? "Allenamento ok!" : fortressMode ? `Lv ${fortressLevel} chiaro!` : "Vittoria!"}
              </h3>
              <p className="mt-2 text-sm text-white/90">
                {practiceMode
                  ? "Nessuna ricompensa in Practice."
                  : fortressLoot
                    ? fortressLoot.lines.join(" · ")
                    : chapter?.dialogue_after}
              </p>
              {!practiceMode && !fortressMode && (
              <div className="mt-4 flex justify-center gap-3">
                <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 ${AMBER} ${PANEL} shadow-[0_3px_0_0_#000]`}>
                  <Coins size={16} className="text-black" /> <span className="font-bold text-black">+{chapter?.reward_berry}</span>
                </div>
                <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 ${TEAL} border-2 border-black shadow-[0_3px_0_0_#000]`}>
                  <Gem size={16} className="text-[#f5a623]" /> <span className="font-bold text-[#f5a623]">+{chapter?.reward_strawberry}</span>
                </div>
              </div>
              )}
              {fortressMode && fortressLoot && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 ${AMBER} ${PANEL} shadow-[0_3px_0_0_#000]`}>
                    <Coins size={16} className="text-black" />{" "}
                    <span className="font-bold text-black">+{fortressLoot.berry}</span>
                  </div>
                  {fortressLoot.strawberry > 0 && (
                    <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 ${TEAL} border-2 border-black shadow-[0_3px_0_0_#000]`}>
                      <Gem size={16} className="text-[#f5a623]" />{" "}
                      <span className="font-bold text-[#f5a623]">+{fortressLoot.strawberry}</span>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() =>
                  navigate(
                    practiceMode
                      ? "/fight"
                      : fortressMode
                        ? `/fight/fortress?zone=${fortressZoneId}`
                        : chapter?.arc_id
                          ? `/fight/story/${chapter.arc_id}`
                          : "/fight/story"
                  )
                }
                className={`mt-5 w-full rounded-2xl py-3 text-base uppercase tracking-wide ${AMBER} ${PANEL}`}
              >
                Continua
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lose overlay */}
      <AnimatePresence>
        {phase === "lose" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md rounded-2xl border-[3px] border-black bg-[#3b0a0a] p-6 text-center shadow-[0_4px_0_0_#000]">
              <Skull className="mx-auto mb-3 text-red-400" size={48} />
              <h3 className="text-2xl uppercase tracking-wide text-red-400">Sconfitta</h3>
              <p className="mt-2 text-sm text-white/90">La tua ciurma è esausta... Potenzia i tuoi personaggi e riprova!</p>
              <div className="mt-5 flex gap-2">
                <button onClick={() => navigate("/")} className={`flex-1 rounded-2xl py-3 text-sm uppercase tracking-wide ${TEAL} ${PANEL}`}>
                  Home
                </button>
                <button onClick={retry} className={`flex-1 rounded-2xl py-3 text-sm uppercase tracking-wide ${AMBER} ${PANEL}`}>
                  <span className="flex items-center justify-center gap-1"><RotateCcw size={16} /> Riprova</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}