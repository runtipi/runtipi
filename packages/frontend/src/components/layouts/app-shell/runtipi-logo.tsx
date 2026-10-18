export const RuntipiLogo = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true" className="rt-logo">
    <path d="M13 3 L23 22 H3 Z" fill="none" stroke="var(--rt-accent)" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M13 12 L17 22 H9 Z" fill="var(--rt-accent)" />
  </svg>
);
