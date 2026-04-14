import type { SpatulaState } from "@/types/workbench";

type SpatulaOverlayProps = {
  cursorPosition: { x: number; y: number } | null;
  isSpatulaMode: boolean;
  spatula: SpatulaState;
};

export function SpatulaOverlay({ cursorPosition, isSpatulaMode, spatula }: SpatulaOverlayProps) {
  if (!isSpatulaMode || !cursorPosition) {
    return null;
  }

  const totalMassG = (spatula.produceFractions ?? []).reduce((sum, fraction) => sum + fraction.massG, 0);
  const mass = spatula.isLoaded ? Math.min(totalMassG, 2) : 0;

  return (
    <div
      className="pointer-events-none fixed z-[80]"
      style={{
        left: cursorPosition.x + 4,
        top: cursorPosition.y - 14,
        width: 84,
        height: 28,
      }}
    >
      <svg
        fill="none"
        height={28}
        viewBox="0 0 84 28"
        width={84}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Handle — dark, rounded, right side */}
        <rect fill="#1e293b" height="5" rx="2.5" width="62" x="20" y="11.5" />
        {/* Handle top highlight */}
        <rect fill="#334155" height="1.5" opacity="0.45" rx="0.75" width="58" x="22" y="12.2" />
        {/* Grip notches */}
        <line stroke="#475569" strokeLinecap="round" strokeWidth="0.9" x1="59" x2="59" y1="12.5" y2="15.5" />
        <line stroke="#475569" strokeLinecap="round" strokeWidth="0.9" x1="66" x2="66" y1="12.5" y2="15.5" />
        <line stroke="#475569" strokeLinecap="round" strokeWidth="0.9" x1="73" x2="73" y1="12.5" y2="15.5" />

        {/* Bowl outer */}
        <ellipse cx="10" cy="14" fill="#cbd5e1" rx="10" ry="8" stroke="#475569" strokeWidth="1.2" />
        {/* Bowl inner surface */}
        <ellipse cx="10" cy="14.5" fill="#e2e8f0" rx="7.5" ry="5.5" />
        {/* Bowl rim glint */}
        <ellipse cx="7.5" cy="11.5" fill="none" opacity="0.7" rx="3.5" ry="1.8" stroke="#94a3b8" strokeWidth="0.7" />

        {/* Powder heap in bowl */}
        {spatula.isLoaded ? (
          <ellipse
            cx="10"
            cy="16"
            fill="#d8c9ae"
            rx={5 + mass * 2}
            ry={2.5 + mass * 0.8}
          />
        ) : null}
      </svg>
    </div>
  );
}
