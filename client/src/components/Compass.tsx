// Brújula decorativa: aro, marcas y aguja (la aguja es lo que se anima, ver .compass-needle en index.css).
export function Compass({ className }: { className?: string }) {
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" focusable="false">
      <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="74" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />
      {ticks.map((deg) => (
        <line
          key={deg}
          x1="100" y1="6" x2="100" y2={deg % 90 === 0 ? 20 : deg % 30 === 0 ? 15 : 11}
          stroke="currentColor" strokeOpacity={deg % 90 === 0 ? 0.9 : 0.4} strokeWidth={deg % 90 === 0 ? 2 : 1}
          transform={`rotate(${deg} 100 100)`}
        />
      ))}
      <text x="100" y="40" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor" style={{ fontFamily: "var(--font-display)" }}>N</text>
      <g className="compass-needle">
        <polygon points="100,34 108,100 92,100" fill="var(--accent)" />
        <polygon points="100,166 108,100 92,100" fill="currentColor" fillOpacity="0.5" />
      </g>
      <circle cx="100" cy="100" r="6" fill="var(--ink)" stroke="var(--accent)" strokeWidth="2.5" />
    </svg>
  );
}
