import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { db } from "@/lib/localDb";

import { useGame } from "@/hooks/useGame";
import { CharacterArt } from "@/components/game/CharacterCard";
import SkillCard from "@/components/game/SkillCard";
import ActionSlotsBar from "@/components/game/ActionSlotsBar";
import { TEAL, AMBER, PANEL, PANEL_SM } from "@/lib/arcade";
import {
  effectiveHp,
  tileDamage,
  enemyDamage,
  comboMultiplier,
  advantageMultiplier,
  createBattleTile,
  healMultiplier,
} from "@/lib/gameUtils";
import {
  dealOpeningHand,
  refillHand,
  removeCharacterCards,
  maxHandSize,
  resolveAdjacentMerges,
  starLabel,
} from "@/lib/battleHand";
import {
  cloneHand,
  canSpendAction,
  queuePlay,
  queueMove,
  unqueuePlay,
  pruneStalePlays,
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
  hasCrowdControl,
  effectsFromMove,
} from "@/lib/battleEffects";
import { ArrowLeft, Swords, RotateCcw, Check, Skull, Coins, Gem, Zap, Undo2, X } from "lucide-react";
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ULT_MAX = 6;

export default function Battle() {
  const { chapterNumber } = useParams();
  const navigate = useNavigate();
  const { loading, charMap, owned, playerState, refresh } = useGame();

  const [chapter, setChapter] = useState(null);
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
  const [staminaSpent, setStaminaSpent] = useState(false);
  const [staminaError, setStaminaError] = useState("");
  const [staminaCostCharged, setStaminaCostCharged] = useState(0);
  /** Coda mosse del turno: play | move — riempie gli Slot Azione */
  const [actionQueue, setActionQueue] = useState([]);
  /** Snapshot mano a inizio turno giocatore (per Annulla) */
  const [turnHandSnapshot, setTurnHandSnapshot] = useState(null);

  const memberHpRef = useRef([]);
  const memberMaxHpRef = useRef([]);
  const enemiesRef = useRef([]);
  const floaterId = useRef(0);
  const ultRef = useRef([]);
  const staminaLockRef = useRef(false);
  /** Evita che un click parta dopo un drag sulla mano */
  const didDragRef = useRef(false);

  function pushLog(msg) {
    setLog((l) => [...l.slice(-3), msg]);
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
    merges.forEach((m) => {
      pushLog(`Fusione! → ${m.intoStars}★ ${starLabel(m.intoStars)}`);
    });
    const ids = merges.map((m) => m.card.id);
    setMergeFlash(ids);
    setTimeout(() => setMergeFlash([]), 650);
  }

  function commitHand(result) {
    setHand(result.hand);
    flashMerges(result.merges);
    return result.hand;
  }

  function onMemberDeath(ci) {
    setHand((h) => {
      const result = removeCharacterCards(h, ci);
      flashMerges(result.merges);
      setActionQueue((q) => pruneStalePlays(q, result.hand));
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
    setHand((h) => h.filter((c) => c.id !== cardId));
    setActionQueue((q) => queuePlay(q, cardId, tile));
  }

  function returnQueuedCard(cardId) {
    if (busy || phase !== "player") return;
    const action = actionQueue.find((a) => a.type === "play" && a.cardId === cardId);
    if (!action) return;
    setActionQueue((q) => unqueuePlay(q, cardId));
    if (action.tile) {
      setHand((h) => [...h, { ...action.tile }]);
    }
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

    // Gioca carta → Slot Azione (esce dalla mano)
    if (destination.droppableId === "action-slots") {
      if (source.droppableId !== "hand") return;
      const tile = hand.find((c) => c.id === draggableId);
      if (!tile) return;
      if (!canSpendAction(actionQueue, maxSlots)) {
        pushLog("Nessuno slot azione libero");
        return;
      }
      setHand((h) => h.filter((c) => c.id !== draggableId));
      setActionQueue((q) => queuePlay(q, draggableId, tile));
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
      setActionQueue((q) => pruneStalePlays(queueMove(q, source.index, destination.index), merged.hand));
      pushLog("Spostamento mano: −1 slot azione");
    }
  }

  useEffect(() => {
    if (loading || initialized) return;
    (async () => {
      const chapters = await db.entities.StoryChapter.filter({ chapter_number: Number(chapterNumber) });
      const ch = chapters[0];
      if (!ch) { navigate("/"); return; }
      const enemyChars = ch.enemy_ids.map((id) => charMap[id]).filter(Boolean);
      const enemyState = enemyChars.map((c) => ({
        character: c,
        hp: effectiveHp(c),
        maxHp: effectiveHp(c),
        status: emptyStatusBoard(),
      }));

      const teamIds = (playerState.team && playerState.team.some(Boolean))
        ? playerState.team.filter(Boolean)
        : (owned[0] ? [owned[0].id] : []);
      const members = teamIds.map((id) => {
        const o = owned.find((x) => x.id === id);
        if (!o) return null;
        const c = charMap[o.character_id];
        if (!c) return null;
        return { character: c, owned: o, status: emptyStatusBoard() };
      }).filter(Boolean);

      if (members.length === 0) { navigate("/characters"); return; }

      const maxes = members.map((m) => effectiveHp(m.character, m.owned));
      memberHpRef.current = [...maxes];
      memberMaxHpRef.current = [...maxes];
      enemiesRef.current = enemyState;
      ultRef.current = members.map(() => 0);

      const aliveIdx = members.map((_, i) => i);
      const dealt = dealOpeningHand(aliveIdx);

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
  }, [loading, initialized, chapterNumber, charMap, owned, playerState, navigate]);

  function drawIntoHand(count) {
    setHand((prev) => {
      const result = refillHand(prev, aliveMembers(), count);
      flashMerges(result.merges);
      return result.hand;
    });
  }

  useEffect(() => {
    if (phase !== "intro" || !chapter || !playerState) return;
    if (staminaLockRef.current || staminaSpent) return;
    staminaLockRef.current = true;
    let cancelled = false;
    (async () => {
      const cost = battleStaminaCost(chapter);
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
  }, [phase, chapter?.id]);

  async function ensureStaminaCharged() {
    if (staminaSpent) return true;
    if (staminaLockRef.current) return false;
    staminaLockRef.current = true;
    const cost = battleStaminaCost(chapter);
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
    const cost = staminaCostCharged || battleStaminaCost(chapter);
    beginPlayerPlanning(hand);
    pushLog(`La battaglia ha inizio! (−${cost} energia)`);
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
    navigate(chapter?.arc_id ? `/story/${chapter.arc_id}` : "/story");
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
        if (hi >= 0) {
          memberHpRef.current[hi] = Math.min(memberMaxHpRef.current[hi], memberHpRef.current[hi] + heal);
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
        await sleep(450);
      } else {
        while (tgt < enemies2.length && enemies2[tgt].hp <= 0) tgt++;
        if (tgt >= enemies2.length) {
          if (isUlt) ult2[ci] = 0;
          continue;
        }
        const typeMult = advantageMultiplier(member.character.attribute, enemies2[tgt].character.attribute);
        const ultLvMult = isUlt ? ultimateLevelMultiplier(member.owned?.ultimateLevel ?? 1) : 1;
        const bonus = isUlt ? 1.5 : 1;
        const dmg = Math.round(
          tileDamage(member.character, member.owned, move, stars) * mult * typeMult * bonus * atkFx * ultLvMult
        );
        enemies2[tgt].hp -= dmg;
        for (const fx of effectsFromMove(move, ci)) {
          enemies2[tgt].status = addEffect(enemies2[tgt].status, fx);
        }
        enemiesRef.current = enemies2;
        setEnemies(enemies2);
        addFloater("enemy", tgt, dmg, typeMult > 1 || isUlt || stars >= 3);
        const starTag = stars > 1 ? ` ${stars}★` : "";
        const tag = typeMult > 1 ? " SUPEREFFICACE!" : typeMult < 1 ? " non molto efficace" : "";
        pushLog(`${member.character.char_name}: ${isUlt ? "ULTIMA! " : ""}${move.name}${starTag} → ${dmg}${tag}`);
        if (isUlt) ult2[ci] = 0;
        else if (ult2[ci] < ULT_MAX) ult2[ci]++;
        await sleep(isUlt ? 550 : 420);
        if (enemies2[tgt].hp <= 0) {
          pushLog(`${enemies2[tgt].character.char_name} sconfitto!`);
          tgt++;
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
    commitHand(refillHand(remaining, alive, 2));

    if (enemies2.every((e) => e.hp <= 0)) {
      await sleep(400);
      recordBattleResult(true);
      setPhase("win");
      await grantRewards();
      setBusy(false);
      return;
    }

    setTarget(tgt < enemies2.length ? tgt : enemies2.findIndex((e) => e.hp > 0));

    await sleep(250);
    await enemyTurn(enemies2);

    if (memberHpRef.current.every((h) => h <= 0)) {
      setBusy(false);
      return;
    }

    setTurn((t) => t + 1);
    beginPlayerPlanning(null);
    setBusy(false);
  }

  // Slot pieni → chiudi il turno (anche se solo spostamenti, senza carte giocate)
  useEffect(() => {
    if (phase !== "player" || busy) return;
    const maxSlots = aliveMembers().length;
    if (maxSlots <= 0) return;
    if (actionQueue.length < maxSlots) return;
    void doAttack();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo quando la coda si riempie
  }, [actionQueue, phase, busy]);

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
    let tgt = target;
    while (tgt < enemies2.length && enemies2[tgt].hp <= 0) tgt++;
    if (tgt >= enemies2.length) { setBusy(false); return; }
    const typeMult = advantageMultiplier(member.character.attribute, enemies2[tgt].character.attribute);
    const dmg = battleUltimateDamage(
      member.character,
      member.owned,
      ultMove,
      3,
      typeMult,
      1.5
    );
    enemies2[tgt].hp -= dmg;
    enemiesRef.current = enemies2;
    setEnemies(enemies2);
    addFloater("enemy", tgt, dmg, true);
    const ultLv = member.owned?.ultimateLevel ?? 1;
    pushLog(`${member.character.char_name}: ULTIMA! ${ultMove.name} (Lv.${ultLv}) → ${dmg}`);
    const ult3 = [...ultRef.current];
    ult3[charIndex] = 0;
    ultRef.current = ult3;
    setUlt(ult3);
    await sleep(550);
    if (enemies2.every((e) => e.hp <= 0)) {
      recordBattleResult(true);
      setPhase("win");
      await grantRewards();
      setBusy(false);
      return;
    }
    setTarget(tgt < enemies2.length ? tgt : enemies2.findIndex((e) => e.hp > 0));
    setBusy(false);
  }

  async function enemyTurn(currentEnemies) {
    setPhase("enemy");
    const alive = currentEnemies.filter((e) => e.hp > 0);
    for (const enemy of alive) {
      const targets = aliveMembers();
      if (targets.length === 0) break;
      const defIdx = targets[Math.floor(Math.random() * targets.length)];
      const defender = teamMembers[defIdx];
      const move = enemy.character.moves[Math.floor(Math.random() * enemy.character.moves.length)];
      const typeMult = advantageMultiplier(enemy.character.attribute, defender.character.attribute);
      const dmg = Math.round(enemyDamage(enemy.character, move) * typeMult);
      memberHpRef.current[defIdx] = Math.max(0, memberHpRef.current[defIdx] - dmg);
      const died = memberHpRef.current[defIdx] <= 0;
      syncMemberHp();
      addFloater("team", defIdx, dmg, typeMult > 1);
      const tag = typeMult > 1 ? " SUPEREFFICACE!" : typeMult < 1 ? " non molto efficace" : "";
      pushLog(`${enemy.character.char_name}: ${move.name} → ${dmg}${tag}`);
      if (died) {
        onMemberDeath(defIdx);
        pushLog(`${defender.character.char_name} è KO!`);
      }
      await sleep(480);
    }
    if (memberHpRef.current.every((h) => h <= 0)) {
      await sleep(300);
      recordBattleResult(false);
      setPhase("lose");
    }
  }

  async function grantRewards() {
    if (!chapter) return;
    await db.entities.PlayerState.update(playerState.id, {
      berry: playerState.berry + chapter.reward_berry,
      strawberry: playerState.strawberry + chapter.reward_strawberry,
      story_progress: Math.max(playerState.story_progress, Number(chapterNumber) + 1),
    });
    refresh();
  }

  function retry() {
    const enemyState = enemies.map((e) => ({
      ...e,
      hp: e.maxHp,
      status: emptyStatusBoard(),
    }));
    memberHpRef.current = [...memberMaxHp];
    enemiesRef.current = enemyState;
    setEnemies(enemyState);
    setMemberHp([...memberMaxHp]);
    setTeamMembers((tm) => tm.map((m) => ({ ...m, status: emptyStatusBoard() })));
    setTurn(1);
    setLog([]);
    setActionQueue([]);
    setTurnHandSnapshot(null);
    setStaminaSpent(false);
    setStaminaError("");
    setPhase("intro");
    const aliveIdx = teamMembers.map((_, i) => i);
    commitHand(dealOpeningHand(aliveIdx));
    ultRef.current = teamMembers.map(() => 0);
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
    <div className="relative h-[100dvh] overflow-hidden bg-[#0b161b] text-white" style={{ fontFamily: "'Russo One', system-ui, sans-serif" }}>
      <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: "radial-gradient(circle at 50% 0%, rgba(22,68,70,0.7), transparent 60%)" }} />

      <div className="relative z-10 mx-auto flex h-[100dvh] max-w-lg flex-col px-2 pt-2">
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between gap-2">
          <button onClick={() => navigate(chapter?.arc_id ? `/story/${chapter.arc_id}` : "/story")} className={`flex h-9 w-9 items-center justify-center rounded-xl ${TEAL} ${PANEL_SM}`}>
            <ArrowLeft size={18} className="text-[#f5a623]" />
          </button>
          <div className={`flex flex-1 items-center justify-center rounded-xl ${TEAL} ${PANEL_SM} px-3 py-1`}>
            <div className="text-center leading-none">
              <p className="text-[8px] uppercase tracking-widest text-[#f5a623]">
                {(chapter?.arc || "").replace(/^(East Blue|Grand Line)\s*-\s*/i, "")}
              </p>
              <h2 className="mt-0.5 text-xs uppercase tracking-wide text-white">{chapter?.title}</h2>
            </div>
          </div>
          <div className={`rounded-xl px-2.5 py-1.5 text-[11px] uppercase tracking-wide ${AMBER} ${PANEL_SM}`}>
            T·{turn}
          </div>
        </div>

        {(() => {
          const maxSlots = aliveMembers().length;
          const playCount = playCardIds(actionQueue).length;
          const canReset = actionQueue.length > 0 && !!turnHandSnapshot;
          const planning = phase === "player";

          const battlefield = (
            <div className="mt-2 flex min-h-0 flex-1 flex-col">
              {/* Zona nemica */}
              <div className="flex min-h-0 flex-1 gap-1.5">
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className={`min-h-[2.25rem] rounded-xl ${TEAL} ${PANEL_SM} px-2.5 py-1`}>
                    {log.slice(-2).map((l, i) => (
                      <p key={i} className="text-[9px] uppercase leading-snug tracking-wide text-white/90">{l}</p>
                    ))}
                    {log.length === 0 && (
                      <p className="text-[9px] uppercase tracking-wide text-white/40">Inizia il tuo turno</p>
                    )}
                  </div>
                  <div className="relative flex min-h-0 flex-1 items-center justify-center">
                    {phase === "enemy" && (
                      <div className={`animate-pulse rounded-xl px-4 py-2 text-xs uppercase tracking-widest ${TEAL} ${PANEL_SM} text-[#f5a623]`}>
                        Turno nemico...
                      </div>
                    )}
                  </div>
                </div>

                <aside className="battle-sidebar battle-sidebar--enemy flex w-[4.5rem] shrink-0 flex-col items-center gap-2 self-start py-1">
                  <span className="battle-sidebar__label">Enemy</span>
                  {enemies.map((e, i) => {
                    const alive = e.hp > 0;
                    const isTarget = target === i && alive && planning;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!alive || !planning}
                        onClick={() => setTarget(i)}
                        className="flex w-full flex-col items-center gap-0.5"
                      >
                        <motion.div
                          animate={isTarget ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                          transition={{ repeat: isTarget ? Infinity : 0, duration: 1 }}
                          className={`relative h-[3.6rem] w-[3rem] overflow-hidden rounded-xl border-2 border-black bg-[#0b161b] shadow-[0_2px_0_0_#000] ${alive ? "" : "opacity-40 grayscale"}`}
                          style={isTarget ? { boxShadow: "0 0 0 2px #f5a623, 0 2px 0 0 #000" } : undefined}
                        >
                          <CharacterArt character={e.character} className="h-full w-full" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <AnimatePresence>
                            {floaters.filter((f) => f.side === "enemy" && f.index === i).map((f) => (
                              <motion.div
                                key={f.id}
                                initial={{ y: 0, opacity: 1 }}
                                animate={{ y: -20, opacity: 0 }}
                                className="absolute inset-x-0 top-2 text-center text-sm font-black"
                                style={{ color: "#f5a623", textShadow: "0 1px 0 #000" }}
                              >
                                -{f.dmg}
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          {!alive && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Skull className="text-white/80" size={16} />
                            </div>
                          )}
                          {isTarget && (
                            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-black bg-[#f5a623] text-[8px] font-black text-black">
                              !
                            </div>
                          )}
                        </motion.div>
                        <div className="h-1 w-10 overflow-hidden rounded-full border border-black bg-[#0b161b]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(0, (e.hp / e.maxHp) * 100)}%`,
                              background: e.character.color || "#ef4444",
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </aside>
              </div>

              {/* Linea di metà campo */}
              <div className="battle-midline" aria-hidden="true">
                <span className="battle-midline__rule" />
              </div>

              {/* Zona giocatore */}
              <div className="flex shrink-0 items-end justify-between gap-2 pt-1">
                <aside className="battle-sidebar battle-sidebar--ally flex w-[4.5rem] shrink-0 flex-col items-center gap-2 py-1">
                  <span className="battle-sidebar__label">Ally</span>
                  {teamMembers.map((m, i) => {
                    const charge = ult[i] || 0;
                    const ready = charge >= ULT_MAX;
                    const hp = memberHp[i] || 0;
                    const max = memberMaxHp[i] || 1;
                    const dead = hp <= 0;
                    return (
                      <div key={i} className="flex w-full flex-col items-center gap-0.5">
                        <div className="relative h-[3.6rem] w-[3rem] overflow-hidden rounded-xl border-2 border-black bg-[#0b161b] shadow-[0_2px_0_0_#000]">
                          <CharacterArt character={m.character} className={`h-full w-full ${dead ? "opacity-40 grayscale" : ""}`} />
                          {dead && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <Skull className="text-white/80" size={14} />
                            </div>
                          )}
                          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded border border-black bg-[#f5a623] px-0.5 text-[6px] font-bold text-black">
                            L{m.owned.level}
                          </span>
                          <AnimatePresence>
                            {floaters.filter((f) => f.side === "team" && f.index === i).map((f) => (
                              <motion.div
                                key={f.id}
                                initial={{ y: 0, opacity: 1 }}
                                animate={{ y: -18, opacity: 0 }}
                                className="absolute inset-x-0 -top-0.5 text-center text-xs font-black"
                                style={{ color: f.crit ? "#f5a623" : "#ef4444", textShadow: "0 1px 0 #000" }}
                              >
                                {f.crit ? "+" : "-"}{f.dmg}
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                        <div className="h-1 w-10 overflow-hidden rounded-full border border-black bg-[#0b161b]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(0, (hp / max) * 100)}%`, background: dead ? "#3b0a0a" : "#22c55e" }}
                          />
                        </div>
                        <div className="h-1 w-10 overflow-hidden rounded-full border border-black bg-[#0b161b]">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${(charge / ULT_MAX) * 100}%`, background: ready ? "#f5a623" : "#0d3436" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </aside>

                {planning && (
                  <Droppable droppableId="action-slots" isDropDisabled={busy || actionQueue.length >= maxSlots}>
                    {(provided, snapshot) => (
                      <ActionSlotsBar
                        maxSlots={maxSlots}
                        actionQueue={actionQueue}
                        teamMembers={teamMembers}
                        dropProvided={provided}
                        isDraggingOver={snapshot.isDraggingOver}
                        canConfirm={playCount > 0 && !busy}
                        onConfirm={() => void doAttack()}
                        onReturnPlay={returnQueuedCard}
                        compact
                        className="w-[4.5rem] shrink-0"
                      />
                    )}
                  </Droppable>
                )}
              </div>
            </div>
          );

          const handPanel = planning && (
            <div className="hand-dock shrink-0 pb-1 pt-1">
              <div className="mb-0.5 flex items-center justify-between gap-2 px-0.5">
                <span className="text-[9px] uppercase tracking-widest text-[#f5a623]">
                  Mano {hand.length}/{maxHandSize(maxSlots || teamMembers.length)}
                </span>
                <div className="flex items-center gap-1.5">
                  {playCount >= 2 && (
                    <span className={`rounded border border-black px-2 py-0.5 text-[9px] uppercase tracking-wide shadow-[0_2px_0_0_#000] ${AMBER}`}>
                      Combo x{comboMultiplier(playCount, resolvePlayOrder(actionQueue, hand)).toFixed(2)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={resetTurnActions}
                    disabled={busy || !canReset}
                    className={`flex items-center gap-1 rounded border-2 border-black px-2 py-0.5 text-[9px] uppercase tracking-wide shadow-[0_2px_0_0_#000] ${TEAL} text-[#f5a623] disabled:opacity-40`}
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
                        "hand-rail flex w-full items-end justify-center overflow-x-auto px-0.5",
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
                                  "relative shrink-0",
                                  dragSnapshot.isDragging && "skill-card--dragging z-[60]"
                                )}
                                style={{
                                  ...dragProvided.draggableProps.style,
                                  marginLeft: idx === 0 ? 0 : -22,
                                  zIndex: dragSnapshot.isDragging ? 60 : idx + 1,
                                }}
                                onClick={() => {
                                  if (dragSnapshot.isDragging || didDragRef.current) return;
                                  playCardFromHand(tile.id);
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
              {phase === "enemy" && <div className="h-4 shrink-0" />}
            </>
          );
        })()}
      </div>

      {/* Intro overlay */}
      <AnimatePresence>
        {phase === "intro" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ y: 40 }} animate={{ y: 0 }} className={`w-full max-w-md rounded-2xl ${TEAL} ${PANEL} p-5`}>
              <p className="text-[10px] uppercase tracking-widest text-[#f5a623]">{chapter?.subtitle}</p>
              <h3 className="mt-1 text-xl uppercase tracking-wide text-white">{chapter?.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/90">{chapter?.dialogue_before}</p>
              {(() => {
                const cost = battleStaminaCost(chapter);
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
              <h3 className="text-2xl uppercase tracking-wide text-[#f5a623]">Vittoria!</h3>
              <p className="mt-2 text-sm text-white/90">{chapter?.dialogue_after}</p>
              <div className="mt-4 flex justify-center gap-3">
                <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 ${AMBER} ${PANEL} shadow-[0_3px_0_0_#000]`}>
                  <Coins size={16} className="text-black" /> <span className="font-bold text-black">+{chapter?.reward_berry}</span>
                </div>
                <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 ${TEAL} border-2 border-black shadow-[0_3px_0_0_#000]`}>
                  <Gem size={16} className="text-[#f5a623]" /> <span className="font-bold text-[#f5a623]">+{chapter?.reward_strawberry}</span>
                </div>
              </div>
              <button onClick={() => navigate(chapter?.arc_id ? `/story/${chapter.arc_id}` : "/story")} className={`mt-5 w-full rounded-2xl py-3 text-base uppercase tracking-wide ${AMBER} ${PANEL}`}>
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
                <button onClick={() => navigate("/characters")} className={`flex-1 rounded-2xl py-3 text-sm uppercase tracking-wide ${TEAL} ${PANEL}`}>
                  Personaggi
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