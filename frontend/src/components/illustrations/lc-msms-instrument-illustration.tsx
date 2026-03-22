type LcMsMsInstrumentIllustrationProps = {
  activeStage?: "lc" | "transfer" | "msms" | null;
  className?: string;
  status?: "idle" | "ready" | "running" | "completed";
  testId?: string;
};

const instrumentPalette = {
  idle: {
    accent: "#94a3b8",
    glow: "#f8fafc",
    frame: "#334155",
    panel: "#e2e8f0",
    pulse: "#cbd5e1",
  },
  ready: {
    accent: "#0ea5e9",
    glow: "#f0f9ff",
    frame: "#0f172a",
    panel: "#e0f2fe",
    pulse: "#7dd3fc",
  },
  running: {
    accent: "#f59e0b",
    glow: "#fffbeb",
    frame: "#0f172a",
    panel: "#fef3c7",
    pulse: "#fbbf24",
  },
  completed: {
    accent: "#10b981",
    glow: "#ecfdf5",
    frame: "#0f172a",
    panel: "#d1fae5",
    pulse: "#34d399",
  },
} as const;

export function LcMsMsInstrumentIllustration({
  activeStage = null,
  className,
  status = "idle",
  testId,
}: LcMsMsInstrumentIllustrationProps) {
  const palette = instrumentPalette[status];
  const lcActive = activeStage === "lc";
  const transferActive = activeStage === "transfer";
  const msmsActive = activeStage === "msms";

  return (
    <div
      aria-label="LC-MS/MS instrument illustration"
      className={className}
      data-active-stage={activeStage ?? "none"}
      data-status={status}
      data-testid={testId}
    >
      <svg
        className="h-full w-full"
        fill="none"
        viewBox="0 0 720 320"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect fill={palette.glow} height="320" rx="36" width="720" />
        <ellipse cx="360" cy="282" fill="#cbd5e1" opacity="0.55" rx="262" ry="24" />

        <rect
          fill={lcActive ? palette.panel : "#f8fafc"}
          height="160"
          rx="28"
          stroke={palette.frame}
          strokeWidth="6"
          width="232"
          x="54"
          y="82"
        />
        <rect
          fill={msmsActive ? palette.panel : "#f8fafc"}
          height="172"
          rx="30"
          stroke={palette.frame}
          strokeWidth="6"
          width="292"
          x="374"
          y="76"
        />
        <path
          d="M286 154H374"
          stroke={transferActive || status === "running" ? palette.accent : "#94a3b8"}
          strokeDasharray="10 10"
          strokeLinecap="round"
          strokeWidth="8"
        />

        <rect fill={palette.accent} height="12" rx="6" width="62" x="84" y="104" />
        <rect fill="#cbd5e1" height="52" rx="14" width="54" x="86" y="132" />
        <rect fill="#cbd5e1" height="52" rx="14" width="54" x="156" y="132" />
        <rect fill="#cbd5e1" height="70" rx="16" width="64" x="214" y="122" />
        <path d="M110 132V112" stroke={palette.frame} strokeLinecap="round" strokeWidth="5" />
        <path d="M180 132V112" stroke={palette.frame} strokeLinecap="round" strokeWidth="5" />
        <rect fill="#0f172a" height="18" rx="9" width="108" x="98" y="204" />
        <rect
          fill={lcActive || status === "running" ? palette.pulse : "#cbd5e1"}
          height="10"
          rx="5"
          width="62"
          x="122"
          y="208"
        />

        <rect fill={palette.accent} height="12" rx="6" width="82" x="404" y="100" />
        <rect fill="#cbd5e1" height="96" rx="18" width="74" x="412" y="128" />
        <rect fill="#e2e8f0" height="20" rx="10" width="30" x="434" y="146" />
        <circle cx="552" cy="176" fill="#0f172a" r="46" />
        <circle cx="552" cy="176" fill="#1e293b" r="24" />
        <circle
          cx="552"
          cy="176"
          fill={msmsActive || status === "running" ? palette.pulse : "#cbd5e1"}
          r="10"
        />
        <rect fill="#cbd5e1" height="82" rx="16" width="86" x="580" y="136" />
        <rect fill="#0f172a" height="14" rx="7" width="46" x="600" y="154" />
        <rect
          fill={msmsActive || status === "completed" ? palette.accent : "#cbd5e1"}
          height="10"
          rx="5"
          width="38"
          x="604"
          y="186"
        />

        <path
          d="M254 160C290 160 308 138 334 138C360 138 366 160 390 160"
          stroke={transferActive || status === "running" ? palette.accent : "#94a3b8"}
          strokeLinecap="round"
          strokeWidth="5"
        />
        <circle
          cx="336"
          cy="138"
          fill={transferActive || status === "running" ? palette.accent : "#cbd5e1"}
          r="8"
        />

        <text
          fill={palette.frame}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="20"
          fontWeight="800"
          x="86"
          y="238"
        >
          LC
        </text>
        <text
          fill={palette.frame}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="20"
          fontWeight="800"
          x="404"
          y="238"
        >
          MS/MS
        </text>
      </svg>
    </div>
  );
}
