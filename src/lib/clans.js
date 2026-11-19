/** Clan / ciurma / sottogruppo — etichette per UI e filtri. */

export const CLANS = {
  "straw-hat": {
    id: "straw-hat",
    label: "Ciurma di Cappello di Paglia",
    short: "Mugiwara",
  },
  "red-hair": {
    id: "red-hair",
    label: "Ciurma del Rosso",
    short: "Red Hair",
  },
  "marine-minor": {
    id: "marine-minor",
    label: "Marina Minore",
    short: "Marina ·",
  },
  castaway: {
    id: "castaway",
    label: "Naufrago",
    short: "Naufrago",
  },
  "rev-1st": {
    id: "rev-1st",
    label: "Primo Battaglione dei Rivoluzionari",
    short: "Rivoluzionari",
  },
  "vice-admiral": {
    id: "vice-admiral",
    label: "Armata dei Vice Ammiragli",
    short: "Vice Ammiragli",
  },
  "buggy-crew": {
    id: "buggy-crew",
    label: "Ciurma di Buggy",
    short: "Buggy",
  },
  "alvida-crew": {
    id: "alvida-crew",
    label: "Ciurma di Alvida",
    short: "Alvida",
  },
  "arlong-crew": {
    id: "arlong-crew",
    label: "Ciurma di Arlong",
    short: "Arlong",
  },
  "black-cat": {
    id: "black-cat",
    label: "Pirati del Gatto Nero",
    short: "Gatto Nero",
  },
  krieg: {
    id: "krieg",
    label: "Armata di Don Krieg",
    short: "Krieg",
  },
  independent: {
    id: "independent",
    label: "Indipendente",
    short: "Solo",
  },
};

export function clanInfo(clanId) {
  return CLANS[clanId] || CLANS.independent;
}
