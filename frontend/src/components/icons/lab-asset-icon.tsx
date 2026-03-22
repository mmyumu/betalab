import type { ReactNode } from "react";

import type { LiquidType, ToolType, ToolbarAccent } from "@/types/workbench";

type LabAssetIconProps = {
  accent: ToolbarAccent;
  className?: string;
  fillRatio?: number;
  kind: ToolType | LiquidType;
  tone?: "accent" | "neutral";
};

const accentPalette: Record<ToolbarAccent, { liquid: string; glow: string; stroke: string }> = {
  amber: {
    liquid: "#f59e0b",
    glow: "#fef3c7",
    stroke: "#92400e",
  },
  emerald: {
    liquid: "#10b981",
    glow: "#d1fae5",
    stroke: "#065f46",
  },
  rose: {
    liquid: "#fb7185",
    glow: "#ffe4e6",
    stroke: "#9f1239",
  },
  sky: {
    liquid: "#38bdf8",
    glow: "#e0f2fe",
    stroke: "#0c4a6e",
  },
};

const neutralPalette = {
  liquid: "#cbd5e1",
  glow: "#f8fafc",
  stroke: "#64748b",
};

const clampRatio = (value: number | undefined) => {
  if (value === undefined) {
    return 0.42;
  }

  return Math.min(Math.max(value, 0), 1);
};

function VesselFrame({
  children,
  glow,
  label,
  stroke,
}: {
  children: ReactNode;
  glow: string;
  label: string;
  stroke: string;
}) {
  return (
    <svg
      aria-label={label}
      className="h-full w-full"
      fill="none"
      viewBox="0 0 88 120"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill={glow} height="120" rx="28" width="88" />
      <g stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4">
        {children}
      </g>
    </svg>
  );
}

function VolumetricFlaskIcon({
  fillRatio,
  glow,
  label,
  liquid,
  stroke,
}: {
  fillRatio: number;
  glow: string;
  label: string;
  liquid: string;
  stroke: string;
}) {
  const liquidTop = 90 - fillRatio * 26;

  return (
    <VesselFrame glow={glow} label={label} stroke={stroke}>
      <path d="M38 18H50" />
      <path d="M40 18V36L22 92C20 98 24 104 30 104H58C64 104 68 98 66 92L48 36V18" />
      <path d="M31 50H57" opacity="0.45" />
      <path d={`M28 ${liquidTop}H60V94C60 98 57 100 54 100H34C31 100 28 98 28 94V${liquidTop}Z`} fill={liquid} stroke="none" />
      <path d={`M28 ${liquidTop}C35 ${liquidTop - 2} 53 ${liquidTop + 2} 60 ${liquidTop}`} opacity="0.65" />
    </VesselFrame>
  );
}

function CentrifugeTubeIcon({
  fillRatio,
  glow,
  label,
  liquid,
  stroke,
}: {
  fillRatio: number;
  glow: string;
  label: string;
  liquid: string;
  stroke: string;
}) {
  const liquidTop = 86 - fillRatio * 38;

  return (
    <VesselFrame glow={glow} label={label} stroke={stroke}>
      <rect fill="#fff" height="12" rx="5" stroke={stroke} width="34" x="27" y="16" />
      <path d="M29 28H59V80C59 85 57 90 53 94L47 102C45 104 43 104 41 102L35 94C31 90 29 85 29 80V28Z" />
      <path d={`M33 ${liquidTop}H55V80C55 83 54 86 52 89L46 97C45 98 43 98 42 97L36 89C34 86 33 83 33 80V${liquidTop}Z`} fill={liquid} stroke="none" />
      <path d={`M33 ${liquidTop}C39 ${liquidTop - 2} 49 ${liquidTop + 2} 55 ${liquidTop}`} opacity="0.65" />
    </VesselFrame>
  );
}

function CleanupTubeIcon({
  fillRatio,
  glow,
  label,
  liquid,
  stroke,
}: {
  fillRatio: number;
  glow: string;
  label: string;
  liquid: string;
  stroke: string;
}) {
  const liquidTop = 84 - fillRatio * 34;

  return (
    <VesselFrame glow={glow} label={label} stroke={stroke}>
      <rect fill="#fff" height="11" rx="4" stroke={stroke} width="30" x="29" y="18" />
      <path d="M31 29H57V84C57 93 51 100 44 104C37 100 31 93 31 84V29Z" />
      <path d={`M35 ${liquidTop}H53V82C53 87 50 92 44 96C38 92 35 87 35 82V${liquidTop}Z`} fill={liquid} stroke="none" />
      <path d={`M35 ${liquidTop}C40 ${liquidTop - 1} 48 ${liquidTop + 2} 53 ${liquidTop}`} opacity="0.65" />
    </VesselFrame>
  );
}

function SampleVialIcon({
  fillRatio,
  glow,
  label,
  liquid,
  stroke,
}: {
  fillRatio: number;
  glow: string;
  label: string;
  liquid: string;
  stroke: string;
}) {
  const liquidTop = 86 - fillRatio * 30;

  return (
    <VesselFrame glow={glow} label={label} stroke={stroke}>
      <rect fill="#1e293b" height="18" rx="4" stroke="none" width="34" x="27" y="16" />
      <path d="M30 34H58V92C58 99 52 104 44 104C36 104 30 99 30 92V34Z" />
      <path d={`M34 ${liquidTop}H54V90C54 95 50 99 44 99C38 99 34 95 34 90V${liquidTop}Z`} fill={liquid} stroke="none" />
      <path d={`M34 ${liquidTop}C40 ${liquidTop - 2} 48 ${liquidTop + 2} 54 ${liquidTop}`} opacity="0.65" />
    </VesselFrame>
  );
}

function BeakerIcon({
  fillRatio,
  glow,
  label,
  liquid,
  stroke,
}: {
  fillRatio: number;
  glow: string;
  label: string;
  liquid: string;
  stroke: string;
}) {
  const liquidTop = 90 - fillRatio * 34;

  return (
    <VesselFrame glow={glow} label={label} stroke={stroke}>
      <path d="M22 26H28" />
      <path d="M28 26H60L56 100H32L28 26Z" />
      <path d={`M33 ${liquidTop}H55L53 96H35L33 ${liquidTop}Z`} fill={liquid} stroke="none" />
      <path d={`M33 ${liquidTop}C39 ${liquidTop - 2} 49 ${liquidTop + 1} 55 ${liquidTop}`} opacity="0.65" />
      <path d="M54 42H58" opacity="0.45" />
      <path d="M52 52H57" opacity="0.45" />
    </VesselFrame>
  );
}

function AmberBottleIcon({
  fillRatio,
  glow,
  label,
  liquid,
  stroke,
}: {
  fillRatio: number;
  glow: string;
  label: string;
  liquid: string;
  stroke: string;
}) {
  const liquidTop = 82 - fillRatio * 28;

  return (
    <VesselFrame glow={glow} label={label} stroke={stroke}>
      <rect fill="#1e293b" height="12" rx="3" stroke="none" width="20" x="34" y="16" />
      <path d="M36 28H52V38H58V92C58 99 52 104 44 104C36 104 30 99 30 92V38H36V28Z" />
      <path d={`M34 ${liquidTop}H54V90C54 95 50 100 44 100C38 100 34 95 34 90V${liquidTop}Z`} fill={liquid} stroke="none" opacity="0.9" />
      <path d={`M34 ${liquidTop}C40 ${liquidTop - 2} 48 ${liquidTop + 1} 54 ${liquidTop}`} opacity="0.65" />
    </VesselFrame>
  );
}

function ReagentBottleIcon({
  fillRatio,
  glow,
  label,
  liquid,
  stroke,
}: {
  fillRatio: number;
  glow: string;
  label: string;
  liquid: string;
  stroke: string;
}) {
  const liquidTop = 84 - fillRatio * 32;

  return (
    <VesselFrame glow={glow} label={label} stroke={stroke}>
      <rect fill="#1e293b" height="12" rx="3" stroke="none" width="18" x="35" y="16" />
      <path d="M32 28H56V38L60 44V92C60 99 53 104 44 104C35 104 28 99 28 92V44L32 38V28Z" />
      <path d={`M32 ${liquidTop}H56V90C56 95 51 100 44 100C37 100 32 95 32 90V${liquidTop}Z`} fill={liquid} stroke="none" />
      <path d={`M32 ${liquidTop}C38 ${liquidTop - 2} 50 ${liquidTop + 2} 56 ${liquidTop}`} opacity="0.65" />
    </VesselFrame>
  );
}

export function LabAssetIcon({
  accent,
  className,
  fillRatio,
  kind,
  tone = "accent",
}: LabAssetIconProps) {
  const palette = tone === "neutral" ? neutralPalette : accentPalette[accent];
  const normalizedFill = clampRatio(fillRatio);
  const label = kind.replace(/_/g, " ");

  const sharedProps = {
    fillRatio: normalizedFill,
    glow: palette.glow,
    label,
    liquid: palette.liquid,
    stroke: palette.stroke,
  };

  let icon: ReactNode;

  switch (kind) {
    case "volumetric_flask":
      icon = <VolumetricFlaskIcon {...sharedProps} />;
      break;
    case "centrifuge_tube":
      icon = <CentrifugeTubeIcon {...sharedProps} />;
      break;
    case "cleanup_tube":
      icon = <CleanupTubeIcon {...sharedProps} />;
      break;
    case "sample_vial":
      icon = <SampleVialIcon {...sharedProps} />;
      break;
    case "beaker":
      icon = <BeakerIcon {...sharedProps} />;
      break;
    case "amber_bottle":
      icon = <AmberBottleIcon {...sharedProps} />;
      break;
    case "ultrapure_water":
    case "acetonitrile":
    case "methanol":
    case "formic_acid":
    case "matrix_blank":
    case "apple_extract":
      icon = <ReagentBottleIcon {...sharedProps} />;
      break;
    default:
      icon = <ReagentBottleIcon {...sharedProps} />;
  }

  return (
    <div className={className} data-kind={kind} data-tone={tone}>
      {icon}
    </div>
  );
}
