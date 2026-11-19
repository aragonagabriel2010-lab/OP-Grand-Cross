/** Icone SVG dedicate per ogni tipo di slot equip. */

export function IconNecklace({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <path
        d="M5 5.5c2.2 3.2 4.4 4.8 7 4.8s4.8-1.6 7-4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 10.2v3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M12 13.2l-2.4 3.6h4.8L12 13.2z"
        fill="currentColor"
        opacity="0.95"
      />
      <circle cx="12" cy="18.2" r="1.55" fill="currentColor" />
    </svg>
  );
}

export function IconBracelet({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <ellipse cx="12" cy="12" rx="7.2" ry="5.2" stroke="currentColor" strokeWidth="1.9" />
      <ellipse cx="12" cy="12" rx="5.1" ry="3.5" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
      <path d="M6.2 10.2h2.2M15.6 10.2h2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="7.4" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function IconRing({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <ellipse cx="12" cy="14.5" rx="6.4" ry="4.2" stroke="currentColor" strokeWidth="1.9" />
      <ellipse cx="12" cy="14.5" rx="4.2" ry="2.6" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
      <path d="M9.6 10.4l2.4-3.6 2.4 3.6H9.6z" fill="currentColor" />
      <path d="M10.4 10.4h3.2" stroke="#0b1216" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

export function IconBelt({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <rect x="3.5" y="10" width="17" height="4.2" rx="1.1" stroke="currentColor" strokeWidth="1.7" />
      <rect x="9.2" y="8.6" width="5.6" height="7" rx="0.9" stroke="currentColor" strokeWidth="1.7" fill="currentColor" fillOpacity="0.2" />
      <path d="M12 9.4v5.4M10.2 12h3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5.2 11.2h2.2M16.6 11.2h2.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export function IconEssence({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <path
        d="M12 3.5l3.2 5.2 5.3.9-3.7 4.1.8 5.4L12 16.6 6.4 19.1l.8-5.4L3.5 9.6l5.3-.9L12 3.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <circle cx="12" cy="11.2" r="2.1" fill="currentColor" />
    </svg>
  );
}

const MAP = {
  necklace: IconNecklace,
  bracelet: IconBracelet,
  ring1: IconRing,
  ring2: IconRing,
  belt: IconBelt,
  essence: IconEssence,
};

export function EquipSlotIcon({ slotId, className = "equip-polar__glyph" }) {
  const Comp = MAP[slotId] || IconNecklace;
  return <Comp className={className} />;
}
