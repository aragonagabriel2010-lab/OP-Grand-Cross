/**
 * Meta aggiuntiva: unica, clan, descrizioni mosse arricchite.
 * Applicata in characters.js tramite enrichCharacter.
 */

import { normalizeUnique } from "@/lib/uniques";

const EXTRAS = {
  "char-luffy-alvida": {
    clan: "straw-hat",
    unique: {
      type: "passive",
      name: "Volontà del Re",
      description: "Finché Luffy è in campo, aumenta del 8% l'ATK di tutta la Ciurma di Cappello di Paglia.",
      effects: [{ kind: "atk_pct", value: 0.08, clan: "straw-hat" }],
    },
    moveText: {
      "Gomu Gomu no Pistol": "Colpisce un nemico. Danno basato sull'ATK.",
      "Gomu Gomu no Gatling": "Raffica: danno multiplo ridotto ma affidabile.",
      Meat: "Recupera PV. Ideale dopo uno scambio pesante.",
      "Gomu Gomu no Bazooka": "Ultima: enorme danno a un bersaglio.",
    },
  },
  "char-zoro-shells": {
    clan: "straw-hat",
    unique: {
      type: "passive",
      name: "Cacciatore di Pirati",
      description: "In campo: +10% ATK. Se un alleato Mugiwara cade, Zoro guadagna +5% DEF per il resto della battaglia (flavor).",
      effects: [{ kind: "atk_pct", value: 0.1 }],
    },
    moveText: {
      "Haki Focus": "Aumenta l'ATK di Zoro per 2 turni.",
    },
  },
  "char-nami-orange": {
    clan: "straw-hat",
    unique: {
      type: "active",
      name: "Navigatrice della Ciurma",
      description: "Quando Nami usa una cura o un buff, gli alleati Mugiwara recuperano un piccolo bonus (flavor). In campo: +6% DEF di squadra.",
      effects: [{ kind: "def_pct", value: 0.06 }],
    },
  },
  "char-usopp-syrup": {
    clan: "straw-hat",
    unique: {
      type: "bench",
      name: "Bugie Ispiratrici",
      description:
        "Unica da panchina: anche dal 4° slot aumenta del 5% ATK, DEF e PV degli alleati umani senza Frutto del Diavolo (e della Ciurma). Se Usopp è in campo, il bonus resta attivo.",
      effects: [{ kind: "all_pct", value: 0.05 }],
    },
    moveText: {
      "Usopp's Lie":
        "Motivazione finta: aumenta del 20% l'ATK di Usopp per 2 turni e alza del 8% la probabilità di critico degli alleati della Ciurma di Cappello di Paglia.",
      "Hissatsu Usopp Hammer": "Colpo contundente a un nemico.",
      "Kayaku Boshi": "Proiettile esplosivo. Buon danno a distanza.",
      Homerun: "Ultima: danno elevato; chance di stordire (flavor).",
    },
  },
  "char-sanji-baratie": {
    clan: "straw-hat",
    unique: {
      type: "passive",
      name: "Cuoco Combattente",
      description: "In campo: le cure di Sanji sono più efficaci (+12% guarigione flavor) e +7% ATK.",
      effects: [{ kind: "atk_pct", value: 0.07 }],
    },
  },
  "char-luffy-arlong": {
    clan: "straw-hat",
    unique: {
      type: "active",
      name: "Gear del Coraggio",
      description: "Quando Luffy usa l'Ultima, guadagna un picco di ATK. Passivamente +9% ATK in campo.",
      effects: [{ kind: "atk_pct", value: 0.09 }],
    },
  },
  "char-zoro-arlong": {
    clan: "straw-hat",
    unique: {
      type: "passive",
      name: "Niente di Grave",
      description: "In campo: +8% DEF e resiste meglio ai critici (+5% flavor).",
      effects: [{ kind: "def_pct", value: 0.08 }],
    },
  },
  "char-nami-arlong": {
    clan: "straw-hat",
    unique: {
      type: "active",
      name: "Tempesta di Libertà",
      description: "Le abilità Tecnica di Nami infliggono +10% danno. In campo +6% ATK di squadra.",
      effects: [{ kind: "atk_pct", value: 0.06 }],
    },
  },
  "char-helmeppo": {
    clan: "marine-minor",
    unique: {
      type: "bench",
      name: "Figlio del Capitano",
      description:
        "Unica da panchina: anche da sub aumenta del 4% la DEF degli alleati della Marina Minore / Marina.",
      effects: [{ kind: "def_pct", value: 0.04 }],
    },
  },
  "char-coby": {
    clan: "castaway",
    unique: {
      type: "passive",
      name: "Sogno di Giustizia",
      description: "In campo: +6% PV e le cure ricevute sono leggermente più efficaci.",
      effects: [{ kind: "hp_pct", value: 0.06 }],
    },
  },
  "char-shanks": {
    clan: "red-hair",
    unique: {
      type: "active",
      name: "Haki del Conquistatore",
      description: "Presenza oppressiva: in campo +12% ATK. Può intimidire i nemici (flavor).",
      effects: [{ kind: "atk_pct", value: 0.12 }],
    },
  },
  "char-smoker": {
    clan: "vice-admiral",
    unique: {
      type: "passive",
      name: "Jitte di Kairoseki",
      description: "In campo: +10% DEF contro utilizzatori di Frutto; +7% DEF generale.",
      effects: [{ kind: "def_pct", value: 0.07 }],
    },
  },
  "char-sabo": {
    clan: "rev-1st",
    unique: {
      type: "active",
      name: "Fiamma della Rivoluzione",
      description: "In campo: +10% ATK. Le abilità di fuoco (flavor) colpiscono più forte.",
      effects: [{ kind: "atk_pct", value: 0.1 }],
    },
  },
};

function defaultUnique(character) {
  return {
    type: "passive",
    name: `Spirito di ${character.char_name?.split(" ").slice(-1)[0] || "Battaglia"}`,
    description: "Potenzia leggermente le prestazioni mentre è in campo.",
    effects: [{ kind: "atk_pct", value: 0.03 }],
  };
}

function defaultClan(character) {
  if (character.faction === "Marina") return "marine-minor";
  if (character.faction === "Rivoluzionari") return "rev-1st";
  if (character.faction === "Pirati") return "independent";
  return "independent";
}

function enrichMove(move, moveText) {
  if (!move) return move;
  const richer = moveText?.[move.name];
  if (!richer) {
    // descrizione più leggibile di default
    if (move.type === "heal") {
      return {
        ...move,
        description:
          move.description && move.description.length > 20
            ? move.description
            : `Cura alleati. Potenza base ${move.power}: ripristina PV in base alla potenza e al livello.`,
      };
    }
    if (move.type === "buff") {
      return {
        ...move,
        description:
          move.description && move.description.length > 20
            ? move.description
            : `Buff. Potenza ${move.power}: aumenta le prestazioni del bersaglio per alcuni turni.`,
      };
    }
    return {
      ...move,
      description:
        move.description && move.description.length > 20
          ? move.description
          : `Attacco. Potenza ${move.power}: infligge danno in base all'ATK e alle stelle della carta.`,
    };
  }
  return { ...move, description: richer };
}

export function enrichCharacter(character) {
  if (!character || character.role !== "hero") return character;
  const extra = EXTRAS[character.id] || {};
  const unique = normalizeUnique(extra.unique || character.unique || defaultUnique(character), character);
  const clan = extra.clan || character.clan || defaultClan(character);
  const moveText = extra.moveText || {};
  const moves = (character.moves || []).map((m) => enrichMove(m, moveText));
  // crit placeholder stats for UI
  const crit_rate = character.crit_rate ?? 0.05;
  const crit_resist = character.crit_resist ?? 0.05;
  return {
    ...character,
    clan,
    unique,
    moves,
    crit_rate,
    crit_resist,
  };
}

export function enrichCharacters(list) {
  return (list || []).map(enrichCharacter);
}
