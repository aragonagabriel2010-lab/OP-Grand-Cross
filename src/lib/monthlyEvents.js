/**
 * Eventi mensili stile 7DS — premio bentornato del giorno.
 * Welcome / day key: reset a mezzanotte locale.
 */

import { localDayKey } from "@/lib/dayClock";

export const MONTHLY_EVENTS = [
  {
    month: 0,
    id: "new_year_voyage",
    title: "Rotta di Capodanno",
    blurb: "Un nuovo anno in mare aperto!",
    rewardLabel: "+50 Beri · +5 Fragole",
    reward: { berry: 50, strawberry: 5 },
    accent: "#f5a623",
  },
  {
    month: 1,
    id: "winter_island",
    title: "Isola d'Inverno",
    blurb: "Freddo pungente, cuori caldi.",
    rewardLabel: "+40 Beri · +1 Cristallo",
    reward: { berry: 40, materials: { sea_crystal: 1 } },
    accent: "#38bdf8",
  },
  {
    month: 2,
    id: "spring_breeze",
    title: "Brezza di Primavera",
    blurb: "I fiori sbocciano sulla Sunny.",
    rewardLabel: "+45 Beri · +4 Fragole",
    reward: { berry: 45, strawberry: 4 },
    accent: "#4ade80",
  },
  {
    month: 3,
    id: "east_blue_fest",
    title: "Festival East Blue",
    blurb: "Festa in tutto l'East Blue!",
    rewardLabel: "+60 Beri · +6 Fragole",
    reward: { berry: 60, strawberry: 6 },
    accent: "#f5a623",
  },
  {
    month: 4,
    id: "golden_week",
    title: "Settimana Dorata",
    blurb: "Bottino doppio per i coraggiosi.",
    rewardLabel: "+80 Beri · +8 Fragole",
    reward: { berry: 80, strawberry: 8 },
    accent: "#fbbf24",
  },
  {
    month: 5,
    id: "summer_tide",
    title: "Marea Estiva",
    blurb: "Il sole brucia sul ponte!",
    rewardLabel: "+50 Beri · +1 Cresta",
    reward: { berry: 50, materials: { pirate_crest: 1 } },
    accent: "#fb923c",
  },
  {
    month: 6,
    id: "sunny_festival",
    title: "Festival della Sunny",
    blurb: "Chopper ha preparato la festa.",
    rewardLabel: "+70 Beri · +7 Fragole",
    reward: { berry: 70, strawberry: 7 },
    accent: "#f472b6",
  },
  {
    month: 7,
    id: "midsummer_hunt",
    title: "Caccia di Mezza Estate",
    blurb: "Tesori nascosti sotto il sole.",
    rewardLabel: "+55 Beri · +5 Fragole",
    reward: { berry: 55, strawberry: 5 },
    accent: "#f5a623",
  },
  {
    month: 8,
    id: "harvest_sea",
    title: "Raccolto del Mare",
    blurb: "Il bottino di settembre.",
    rewardLabel: "+50 Beri · +1 Scheggia",
    reward: { berry: 50, materials: { dawn_shard: 1 } },
    accent: "#c084fc",
  },
  {
    month: 9,
    id: "halloween_terror",
    title: "Terrore di Halloween",
    blurb: "Anche i pirati hanno paura… un po'.",
    rewardLabel: "+65 Beri · +6 Fragole",
    reward: { berry: 65, strawberry: 6 },
    accent: "#a855f7",
  },
  {
    month: 10,
    id: "alvida_november",
    title: "Sfida Alvida",
    blurb: "Novembre di ferro e cristalli.",
    rewardLabel: "+50 Beri · +2 Cristalli",
    reward: { berry: 50, materials: { sea_crystal: 2 } },
    accent: "#38bdf8",
  },
  {
    month: 11,
    id: "winter_feast",
    title: "Banchetto d'Inverno",
    blurb: "Un brindisi sulla Thousand Sunny!",
    rewardLabel: "+100 Beri · +10 Fragole",
    reward: { berry: 100, strawberry: 10 },
    accent: "#f5a623",
  },
];

export function monthlyEventFor(now = new Date()) {
  const m = now.getMonth();
  return MONTHLY_EVENTS.find((e) => e.month === m) || MONTHLY_EVENTS[10];
}

function todayKey(now = new Date()) {
  return localDayKey(now);
}

function welcomeKey(uid) {
  return `opgv_welcome_${uid || "guest"}`;
}

/** True se il bentornato di oggi non è ancora stato visto. */
export function shouldShowDailyWelcome(uid, now = new Date()) {
  try {
    const raw = localStorage.getItem(welcomeKey(uid));
    if (!raw) return true;
    const data = JSON.parse(raw);
    return data.day !== todayKey(now);
  } catch {
    return true;
  }
}

export function markDailyWelcomeSeen(uid, now = new Date()) {
  try {
    localStorage.setItem(
      welcomeKey(uid),
      JSON.stringify({ day: todayKey(now), seenAt: Date.now() })
    );
  } catch {
    /* ignore */
  }
}
