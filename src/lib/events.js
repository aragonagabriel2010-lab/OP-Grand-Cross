/**
 * Evento a tempo — finestra settimanale fissa (locale).
 */

export const ACTIVE_EVENT = {
  id: "alvida_challenge_v1",
  title: "Sfida Alvida",
  blurb: "Sconfiggi missioni storia in Hard per Cristalli e Schegge bonus.",
  rewardLabel: "+Cristalli · +Schegge",
  // Giorni della settimana 0=dom … 6=sab — attivo lun–gio
  activeDays: [1, 2, 3, 4],
};

export function isEventActive(now = Date.now()) {
  const day = new Date(now).getDay();
  return ACTIVE_EVENT.activeDays.includes(day);
}

export function eventStatus(now = Date.now()) {
  const active = isEventActive(now);
  const d = new Date(now);
  const day = d.getDay();
  // Prossima apertura: lunedì se fuori finestra
  let daysUntil = 0;
  if (!active) {
    for (let i = 1; i <= 7; i++) {
      if (ACTIVE_EVENT.activeDays.includes((day + i) % 7)) {
        daysUntil = i;
        break;
      }
    }
  }
  return { active, daysUntil, event: ACTIVE_EVENT };
}
