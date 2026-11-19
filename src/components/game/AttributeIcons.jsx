/** Icone SVG attributi (stile slot equip — niente emoji). */

export function IconForza({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <path
        d="M7.2 10.2V8.4c0-1 .8-1.8 1.8-1.8h.4c.7 0 1.3.4 1.6 1l.5 1 .5-1c.3-.6.9-1 1.6-1h.4c1 0 1.8.8 1.8 1.8v1.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6.4 10.2h11.2v4.2c0 2.4-1.9 4.4-4.3 4.4h-2.6c-2.4 0-4.3-2-4.3-4.4v-4.2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path d="M9.2 12.4h5.6M9.2 14.6h5.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Agilità / Velocità — vento + freccia, non un piede */
export function IconAgility({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <path
        d="M4.5 8.2h9.2c1.7 0 2.8 1.8 1.9 3.2L13 15.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.2 12.2h7.4c1.5 0 2.4 1.6 1.6 2.8l-1.5 2.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <path
        d="M14.2 6.2l5.6 5.2-5.6 5.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.22"
      />
      <path d="M4.8 16.8h4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function IconTecnica({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.2" />
      <path
        d="M12 3.6v2.4M12 18v2.4M3.6 12h2.4M18 12h2.4M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M17.8 6.2l-1.7 1.7M7.9 16.1l-1.7 1.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" />
    </svg>
  );
}

const MAP = {
  Forza: IconForza,
  Velocità: IconAgility,
  Tecnica: IconTecnica,
};

export function AttributeIcon({ attribute, className = "attr-glyph" }) {
  const Comp = MAP[attribute] || IconTecnica;
  return <Comp className={className} />;
}
