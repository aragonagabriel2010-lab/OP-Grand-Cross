/** Archi della rotta — serpentone dei mari */

export const STORY_ARCS = [
  {
    id: "romance-dawn",
    sea: "East Blue",
    name: "Romance Dawn",
    subtitle: "Il mare di Alvida",
    blurb: "Luffy salpa e affronta la ciurma di Alvida.",
    order: 1,
    accent: "#E11D48",
  },
  {
    id: "shells-town",
    sea: "East Blue",
    name: "Shells Town",
    subtitle: "Il cacciatore di pirati",
    blurb: "Zoro è prigioniero della Marina.",
    order: 2,
    accent: "#64748B",
  },
  {
    id: "orange-town",
    sea: "East Blue",
    name: "Orange Town",
    subtitle: "Il clown e la ladra",
    blurb: "Buggy ha preso il controllo della città.",
    order: 3,
    accent: "#F97316",
  },
  {
    id: "syrup-village",
    sea: "East Blue",
    name: "Syrup Village",
    subtitle: "Il piano del gatto nero",
    blurb: "Usopp e i pirati di Kuro.",
    order: 4,
    accent: "#A16207",
  },
  {
    id: "baratie",
    sea: "East Blue",
    name: "Baratie",
    subtitle: "Il ristorante galleggiante",
    blurb: "Krieg assedia il Baratie. Sanji.",
    order: 5,
    accent: "#EAB308",
  },
  {
    id: "arlong-park",
    sea: "East Blue",
    name: "Arlong Park",
    subtitle: "Il tiranno di Cocoyashi",
    blurb: "Per Nami. Contro Arlong.",
    order: 6,
    accent: "#0EA5E9",
  },
  {
    id: "loguetown",
    sea: "East Blue",
    name: "Loguetown",
    subtitle: "Città dell'inizio e della fine",
    blurb: "Smoker blocca la via verso la Grand Line.",
    order: 7,
    accent: "#94A3B8",
  },
  {
    id: "reverse-mountain",
    sea: "Grand Line",
    name: "Reverse Mountain",
    subtitle: "Ingresso nella Grand Line",
    blurb: "La corrente risale la montagna. Laboon e Twin Cape.",
    order: 8,
    accent: "#38BDF8",
  },
];

export const STORY_ARC_MAP = Object.fromEntries(STORY_ARCS.map((a) => [a.id, a]));

export function chaptersForArc(chapters, arcId) {
  return (chapters || [])
    .filter((c) => c.arc_id === arcId)
    .sort((a, b) => a.chapter_number - b.chapter_number);
}

export function arcBounds(chapters, arcId) {
  const list = chaptersForArc(chapters, arcId);
  if (!list.length) return { first: null, last: null };
  return {
    first: list[0].chapter_number,
    last: list[list.length - 1].chapter_number,
  };
}

/** progress = prossimo capitolo da affrontare (1-based) */
export function isArcUnlocked(chapters, arcId, progress) {
  const { first } = arcBounds(chapters, arcId);
  if (first == null) return false;
  return progress >= first;
}

export function isArcCompleted(chapters, arcId, progress) {
  const { last } = arcBounds(chapters, arcId);
  if (last == null) return false;
  return progress > last;
}

export function arcProgressLabel(chapters, arcId, progress) {
  const list = chaptersForArc(chapters, arcId);
  if (!list.length) return "0/0";
  const done = list.filter((c) => c.chapter_number < progress).length;
  return `${done}/${list.length}`;
}
