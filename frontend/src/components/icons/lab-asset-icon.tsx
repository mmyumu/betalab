import { useId } from "react";
import type { ReactNode } from "react";

import {
  getLiquidAccentPalette,
  getLiquidVisualSegments,
  neutralLiquidPalette,
} from "@/lib/liquid-visuals";
import type {
  ExperimentProduceItem,
  LiquidType,
  ToolType,
  ToolbarAccent,
} from "@/types/workbench";

type LabAssetIconProps = {
  accent: ToolbarAccent;
  className?: string;
  fillRatio?: number;
  fillSegments?: Array<{ accent: ToolbarAccent; ratio: number }>;
  kind: ToolType | LiquidType;
  produceItems?: ExperimentProduceItem[];
  tone?: "accent" | "neutral";
};

const clampRatio = (value: number | undefined) => {
  if (value === undefined) {
    return 0.42;
  }

  return Math.min(Math.max(value, 0), 1);
};

function VesselFrame({
  children,
  defs,
  glow,
  label,
  stroke,
}: {
  children: ReactNode;
  defs?: ReactNode;
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
      <defs>{defs}</defs>
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
  liquidDefs,
  liquidFill,
  stroke,
}: {
  fillRatio: number;
  glow: string;
  label: string;
  liquidDefs?: ReactNode;
  liquidFill: string;
  stroke: string;
}) {
  const liquidTop = 90 - fillRatio * 26;

  return (
    <VesselFrame defs={liquidDefs} glow={glow} label={label} stroke={stroke}>
      <path d="M38 18H50" />
      <path d="M40 18V36L22 92C20 98 24 104 30 104H58C64 104 68 98 66 92L48 36V18" />
      <path d="M31 50H57" opacity="0.45" />
      <path
        d={`M28 ${liquidTop}H60V94C60 98 57 100 54 100H34C31 100 28 98 28 94V${liquidTop}Z`}
        fill={liquidFill}
        stroke="none"
      />
      <path d={`M28 ${liquidTop}C35 ${liquidTop - 2} 53 ${liquidTop + 2} 60 ${liquidTop}`} opacity="0.65" />
    </VesselFrame>
  );
}

function CentrifugeTubeIcon({
  fillRatio,
  glow,
  label,
  liquidDefs,
  liquidFill,
  stroke,
}: {
  fillRatio: number;
  glow: string;
  label: string;
  liquidDefs?: ReactNode;
  liquidFill: string;
  stroke: string;
}) {
  const liquidTop = 86 - fillRatio * 38;

  return (
    <VesselFrame defs={liquidDefs} glow={glow} label={label} stroke={stroke}>
      <rect fill="#fff" height="12" rx="5" stroke={stroke} width="34" x="27" y="16" />
      <path d="M29 28H59V80C59 85 57 90 53 94L47 102C45 104 43 104 41 102L35 94C31 90 29 85 29 80V28Z" />
      <path
        d={`M33 ${liquidTop}H55V80C55 83 54 86 52 89L46 97C45 98 43 98 42 97L36 89C34 86 33 83 33 80V${liquidTop}Z`}
        fill={liquidFill}
        stroke="none"
      />
      <path d={`M33 ${liquidTop}C39 ${liquidTop - 2} 49 ${liquidTop + 2} 55 ${liquidTop}`} opacity="0.65" />
    </VesselFrame>
  );
}

function CleanupTubeIcon({
  fillRatio,
  glow,
  label,
  liquidDefs,
  liquidFill,
  stroke,
}: {
  fillRatio: number;
  glow: string;
  label: string;
  liquidDefs?: ReactNode;
  liquidFill: string;
  stroke: string;
}) {
  const liquidTop = 84 - fillRatio * 34;

  return (
    <VesselFrame defs={liquidDefs} glow={glow} label={label} stroke={stroke}>
      <rect fill="#fff" height="11" rx="4" stroke={stroke} width="30" x="29" y="18" />
      <path d="M31 29H57V84C57 93 51 100 44 104C37 100 31 93 31 84V29Z" />
      <path
        d={`M35 ${liquidTop}H53V82C53 87 50 92 44 96C38 92 35 87 35 82V${liquidTop}Z`}
        fill={liquidFill}
        stroke="none"
      />
      <path d={`M35 ${liquidTop}C40 ${liquidTop - 1} 48 ${liquidTop + 2} 53 ${liquidTop}`} opacity="0.65" />
    </VesselFrame>
  );
}

function SampleVialIcon({
  fillRatio,
  glow,
  label,
  liquidDefs,
  liquidFill,
  stroke,
}: {
  fillRatio: number;
  glow: string;
  label: string;
  liquidDefs?: ReactNode;
  liquidFill: string;
  stroke: string;
}) {
  const liquidTop = 86 - fillRatio * 30;

  return (
    <VesselFrame defs={liquidDefs} glow={glow} label={label} stroke={stroke}>
      <rect fill="#1e293b" height="18" rx="4" stroke="none" width="34" x="27" y="16" />
      <path d="M30 34H58V92C58 99 52 104 44 104C36 104 30 99 30 92V34Z" />
      <path
        d={`M34 ${liquidTop}H54V90C54 95 50 99 44 99C38 99 34 95 34 90V${liquidTop}Z`}
        fill={liquidFill}
        stroke="none"
      />
      <path d={`M34 ${liquidTop}C40 ${liquidTop - 2} 48 ${liquidTop + 2} 54 ${liquidTop}`} opacity="0.65" />
    </VesselFrame>
  );
}

function BeakerIcon({
  fillRatio,
  glow,
  label,
  liquidDefs,
  liquidFill,
  stroke,
}: {
  fillRatio: number;
  glow: string;
  label: string;
  liquidDefs?: ReactNode;
  liquidFill: string;
  stroke: string;
}) {
  const liquidTop = 90 - fillRatio * 34;

  return (
    <VesselFrame defs={liquidDefs} glow={glow} label={label} stroke={stroke}>
      <path d="M22 26H28" />
      <path d="M28 26H60L56 100H32L28 26Z" />
      <path d={`M33 ${liquidTop}H55L53 96H35L33 ${liquidTop}Z`} fill={liquidFill} stroke="none" />
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
  liquidDefs,
  liquidFill,
  stroke,
}: {
  fillRatio: number;
  glow: string;
  label: string;
  liquidDefs?: ReactNode;
  liquidFill: string;
  stroke: string;
}) {
  const liquidTop = 82 - fillRatio * 28;

  return (
    <VesselFrame defs={liquidDefs} glow={glow} label={label} stroke={stroke}>
      <rect fill="#1e293b" height="12" rx="3" stroke="none" width="20" x="34" y="16" />
      <path d="M36 28H52V38H58V92C58 99 52 104 44 104C36 104 30 99 30 92V38H36V28Z" />
      <path
        d={`M34 ${liquidTop}H54V90C54 95 50 100 44 100C38 100 34 95 34 90V${liquidTop}Z`}
        fill={liquidFill}
        opacity="0.9"
        stroke="none"
      />
      <path d={`M34 ${liquidTop}C40 ${liquidTop - 2} 48 ${liquidTop + 1} 54 ${liquidTop}`} opacity="0.65" />
    </VesselFrame>
  );
}

function ReagentBottleIcon({
  fillRatio,
  glow,
  label,
  liquidDefs,
  liquidFill,
  stroke,
}: {
  fillRatio: number;
  glow: string;
  label: string;
  liquidDefs?: ReactNode;
  liquidFill: string;
  stroke: string;
}) {
  const liquidTop = 84 - fillRatio * 32;

  return (
    <VesselFrame defs={liquidDefs} glow={glow} label={label} stroke={stroke}>
      <rect fill="#1e293b" height="12" rx="3" stroke="none" width="18" x="35" y="16" />
      <path d="M32 28H56V38L60 44V92C60 99 53 104 44 104C35 104 28 99 28 92V44L32 38V28Z" />
      <path
        d={`M32 ${liquidTop}H56V90C56 95 51 100 44 100C37 100 32 95 32 90V${liquidTop}Z`}
        fill={liquidFill}
        stroke="none"
      />
      <path d={`M32 ${liquidTop}C38 ${liquidTop - 2} 50 ${liquidTop + 2} 56 ${liquidTop}`} opacity="0.65" />
    </VesselFrame>
  );
}

function SampleBagIcon({
  glow,
  label,
  produceItems,
  stroke,
}: {
  glow: string;
  label: string;
  produceItems: ExperimentProduceItem[];
  stroke: string;
}) {
  const isLoaded = produceItems.length > 0;
  const visibleProduceItems = produceItems.slice(0, 3);

  return (
    <VesselFrame glow={glow} label={label} stroke={stroke}>
      <path d={isLoaded ? "M24 22H64" : "M28 22H60"} />
      <path
        d={
          isLoaded
            ? "M28 22L22 38V88C22 98 30 104 40 104H48C58 104 66 98 66 88V38L60 22"
            : "M30 22L26 38V90C26 98 32 104 40 104H48C56 104 62 98 62 90V38L58 22"
        }
      />
      <path d={isLoaded ? "M28 40H60" : "M32 40H56"} opacity="0.4" />
      <path
        d={isLoaded ? "M30 32H58V42H30V32Z" : "M34 32H54V42H34V32Z"}
        fill="#dcfce7"
        stroke="none"
      />
      <path
        d={
          isLoaded
            ? "M26 50C31 45 38 43 44 45C50 47 56 47 62 44V80C62 89 55 96 44 98C33 96 26 89 26 80V50Z"
            : "M32 48C36 46 40 46 44 48C48 50 52 50 56 48V82C56 89 51 94 44 96C37 94 32 89 32 82V48Z"
        }
        fill="#bbf7d0"
        stroke="none"
        opacity="0.85"
      />
      {visibleProduceItems.map((produceItem, index) => {
        const palette =
          produceItem.produceType === "apple"
            ? { fill: "#ef4444", highlight: "#fca5a5", leaf: "#16a34a" }
            : { fill: "#f59e0b", highlight: "#fde68a", leaf: "#65a30d" };
        const positions = [
          { cx: 36, cy: 68, rx: 7, ry: 7 },
          { cx: 52, cy: 64, rx: 8, ry: 8 },
          { cx: 46, cy: 78, rx: 7, ry: 7 },
        ];
        const position = positions[index];

        return (
          <g key={produceItem.id} opacity={0.92}>
            <ellipse
              cx={position.cx}
              cy={position.cy}
              fill={palette.fill}
              rx={position.rx}
              ry={position.ry}
              stroke="none"
            />
            <ellipse
              cx={position.cx - 2}
              cy={position.cy - 2}
              fill={palette.highlight}
              opacity="0.45"
              rx={Math.max(position.rx - 3, 2)}
              ry={Math.max(position.ry - 4, 2)}
              stroke="none"
            />
            <path
              d={`M${position.cx} ${position.cy - position.ry + 1}C${position.cx + 1} ${position.cy - position.ry - 4} ${position.cx + 4} ${position.cy - position.ry - 5} ${position.cx + 6} ${position.cy - position.ry - 3}`}
              stroke={palette.leaf}
              strokeLinecap="round"
              strokeWidth="2.2"
            />
          </g>
        );
      })}
      <path d={isLoaded ? "M34 56H54" : "M38 56H50"} opacity="0.55" />
      <path d={isLoaded ? "M32 64H56" : "M36 64H52"} opacity="0.55" />
      <path d={isLoaded ? "M32 72H56" : "M36 72H52"} opacity="0.55" />
      <path d={isLoaded ? "M28 28H60" : "M30 28H58"} />
    </VesselFrame>
  );
}

export function LabAssetIcon({
  accent,
  className,
  fillRatio,
  fillSegments,
  kind,
  produceItems = [],
  tone = "accent",
}: LabAssetIconProps) {
  const palette = tone === "neutral" ? neutralLiquidPalette : getLiquidAccentPalette(accent);
  const normalizedFill = clampRatio(fillRatio);
  const label = kind.replace(/_/g, " ");
  const gradientId = useId().replace(/:/g, "");
  const normalizedSegments = getLiquidVisualSegments(
    fillSegments?.map((segment) => ({
      accent: segment.accent,
      volume_ml: segment.ratio,
    })) ?? [],
  );
  const displaySegments =
    normalizedSegments.length > 0 ? normalizedSegments : [{ color: palette.liquid, ratio: 1 }];
  const liquidFill =
    displaySegments.length === 1 ? displaySegments[0].color : `url(#${gradientId})`;
  const liquidDefs =
    displaySegments.length > 1 ? (
      <linearGradient id={gradientId} x1="0%" x2="0%" y1="100%" y2="0%">
        {displaySegments.flatMap((segment, index) => {
          const start =
            displaySegments
              .slice(0, index)
              .reduce((sum, previousSegment) => sum + previousSegment.ratio, 0) * 100;
          const end = start + segment.ratio * 100;

          return [
            <stop
              key={`${segment.color}-${index}-start`}
              offset={`${start}%`}
              stopColor={segment.color}
            />,
            <stop
              key={`${segment.color}-${index}-end`}
              offset={`${end}%`}
              stopColor={segment.color}
            />,
          ];
        })}
      </linearGradient>
    ) : null;

  const sharedProps = {
    fillRatio: normalizedFill,
    glow: palette.glow,
    label,
    liquidDefs,
    liquidFill,
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
    case "sample_bag":
      icon = (
        <SampleBagIcon
          glow={palette.glow}
          label={label}
          produceItems={produceItems}
          stroke={palette.stroke}
        />
      );
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
    <div
      className={className}
      data-fill-segments={displaySegments.length}
      data-kind={kind}
      data-produce-count={produceItems.length}
      data-tone={tone}
    >
      {icon}
    </div>
  );
}
