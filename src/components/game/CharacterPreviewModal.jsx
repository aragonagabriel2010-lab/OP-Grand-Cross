import GameModal from "@/components/game/GameModal";
import { CharacterArt } from "@/components/game/CharacterCard";
import RarityStars from "@/components/game/RarityStars";
import { ATTRIBUTE_INFO } from "@/lib/gameUtils";
import { AttributeIcon } from "@/components/game/AttributeIcons";
import { clanInfo } from "@/lib/clans";
import { normalizeUnique, uniqueTypeInfo } from "@/lib/uniques";
import { AMBER, TEAL, PANEL_SM } from "@/lib/arcade";
import { Swords, Heart, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function MoveIcon({ type }) {
  if (type === "heal") return <Heart size={14} className="text-emerald-400" />;
  if (type === "buff") return <Zap size={14} className="text-sky-400" />;
  return <Swords size={14} className="text-red-400" />;
}

/**
 * Anteprima personaggio (tassi gacha / locked): arte, unica, abilità.
 */
export default function CharacterPreviewModal({ open, onClose, character }) {
  if (!character) return null;
  const attr = ATTRIBUTE_INFO[character.attribute] || { label: "—", color: "#164446" };
  const unique = normalizeUnique(character.unique, character);
  const uType = uniqueTypeInfo(unique.type);
  const clan = clanInfo(character.clan);
  const moves = character.moves || [];
  const normals = moves.slice(0, 3);
  const ult = moves[3];

  return (
    <GameModal open={open} onClose={onClose} title={character.char_name}>
      <div className="space-y-3">
        <div className="flex gap-3">
          <div
            className="relative h-36 w-28 shrink-0 overflow-hidden rounded-xl border-2 border-black bg-[#0b161b]"
            style={{ boxShadow: "0 3px 0 0 #000" }}
          >
            <CharacterArt
              character={character}
              className="h-full w-full object-cover object-[center_18%]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <RarityStars rarity={character.rarity} size={12} />
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase"
                style={{ color: attr.color }}
              >
                <AttributeIcon attribute={character.attribute} className="attr-glyph h-3 w-3" />
                {attr.label}
              </span>
            </div>
            {character.version && (
              <p className="mt-1 text-[10px] uppercase tracking-wide text-white/55">
                {character.version}
              </p>
            )}
            <p className="mt-1 text-[10px] uppercase tracking-wide text-white/50">{clan.label}</p>
            <p className="mt-2 text-[10px] uppercase tracking-widest" style={{ color: uType.color }}>
              Unica · {uType.label}
            </p>
            <p className="mt-0.5 text-sm font-bold uppercase text-[#f5a623]">{unique.name}</p>
            <p className="mt-1 text-[11px] leading-snug text-white/75">{unique.description}</p>
          </div>
        </div>

        <div className={`rounded-xl ${TEAL} ${PANEL_SM} p-2.5`}>
          <p className="mb-2 flex items-center gap-1 text-[10px] uppercase tracking-widest text-[#f5a623]">
            <Sparkles size={12} /> Abilità
          </p>
          <ul className="space-y-1.5">
            {normals.map((m, i) => (
              <li
                key={i}
                className="rounded-lg border border-black/50 bg-[#0b161b] px-2.5 py-2"
              >
                <div className="flex items-center gap-2">
                  <MoveIcon type={m.type} />
                  <span className="text-[11px] font-bold uppercase text-white">{m.name}</span>
                  <span className="ml-auto text-[9px] uppercase text-white/40">
                    {m.type === "heal" ? "Cura" : m.type === "buff" ? "Buff" : "ATK"} · {m.power}
                  </span>
                </div>
                {m.description && (
                  <p className="mt-1 text-[10px] leading-snug text-white/60">{m.description}</p>
                )}
              </li>
            ))}
            {ult && (
              <li className={cn("rounded-lg border-2 border-black px-2.5 py-2", AMBER)}>
                <div className="flex items-center gap-2 text-black">
                  <Zap size={14} />
                  <span className="text-[11px] font-bold uppercase">ULT · {ult.name}</span>
                  <span className="ml-auto text-[9px] uppercase">Pot. {ult.power}</span>
                </div>
                {ult.description && (
                  <p className="mt-1 text-[10px] leading-snug text-black/70">{ult.description}</p>
                )}
              </li>
            )}
          </ul>
        </div>
      </div>
    </GameModal>
  );
}
