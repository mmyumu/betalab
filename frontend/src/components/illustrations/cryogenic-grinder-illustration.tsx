"use client";

type CryogenicGrinderIllustrationProps = {
  className?: string;
  testId?: string;
};

export function CryogenicGrinderIllustration({
  className,
  testId,
}: CryogenicGrinderIllustrationProps) {
  return (
    <div
      aria-label="Cryogenic grinder illustration"
      className={className}
      data-testid={testId}
    >
      <svg
        className="h-full w-full"
        fill="none"
        viewBox="0 0 480 260"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect fill="#f8fafc" height="260" rx="30" width="480" />
        <ellipse cx="242" cy="226" fill="#cbd5e1" opacity="0.55" rx="152" ry="18" />

        <rect fill="#e2e8f0" height="108" rx="28" stroke="#0f172a" strokeWidth="6" width="208" x="96" y="90" />
        <rect fill="#ffffff" height="54" rx="16" stroke="#334155" strokeWidth="5" width="126" x="136" y="38" />
        <rect fill="#cbd5e1" height="16" rx="8" width="56" x="170" y="24" />
        <path d="M156 65H242" stroke="#7dd3fc" strokeLinecap="round" strokeWidth="8" />
        <circle cx="148" cy="144" fill="#0f172a" r="15" />
        <circle cx="206" cy="144" fill="#0f172a" r="15" />
        <rect fill="#0ea5e9" height="14" rx="7" width="74" x="144" y="170" />

        <rect fill="#cbd5e1" height="120" rx="26" stroke="#334155" strokeWidth="6" width="108" x="314" y="82" />
        <rect fill="#0f172a" height="18" rx="9" width="54" x="340" y="104" />
        <rect fill="#e2e8f0" height="42" rx="14" width="54" x="340" y="134" />
        <path d="M304 136C326 136 328 118 342 118" stroke="#94a3b8" strokeLinecap="round" strokeWidth="6" />
        <path d="M304 160C326 160 328 178 342 178" stroke="#94a3b8" strokeLinecap="round" strokeWidth="6" />

        <circle cx="358" cy="202" fill="#f59e0b" r="9" />
        <circle cx="388" cy="202" fill="#cbd5e1" r="9" />
      </svg>
    </div>
  );
}
