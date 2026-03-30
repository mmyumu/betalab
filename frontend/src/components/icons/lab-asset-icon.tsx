import { useId } from "react";
import type { ReactNode } from "react";

import { AppleLotGlyph } from "@/components/illustrations/apple-illustration";
import {
  getLiquidAccentPalette,
  getLiquidVisualSegments,
  neutralLiquidPalette,
} from "@/lib/liquid-visuals";
import type {
  ExperimentProduceLot,
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
  produceLots?: ExperimentProduceLot[];
  sampleLabelText?: string | null;
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

function DryIcePelletsIcon({
  glow,
  label,
  stroke,
}: {
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
      <g stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 44H64L58 96H30L24 44Z" strokeWidth="4" />
        <path d="M28 44C34 40 54 40 60 44" opacity="0.45" strokeWidth="3" />
      </g>
      <g>
        <rect fill="#e0f2fe" height="12" rx="3" width="12" x="28" y="54" />
        <rect fill="#bae6fd" height="12" rx="3" width="12" x="43" y="52" />
        <rect fill="#dbeafe" height="12" rx="3" width="12" x="37" y="66" />
        <rect fill="#e0f2fe" height="10" rx="2.5" width="10" x="50" y="67" />
        <rect fill="#f8fafc" fillOpacity="0.7" height="4" rx="1.5" width="4" x="31" y="57" />
        <rect fill="#f8fafc" fillOpacity="0.7" height="4" rx="1.5" width="4" x="46" y="55" />
      </g>
    </svg>
  );
}

function CuttingBoardIcon({
  glow,
  label,
  stroke,
}: {
  glow: string;
  label: string;
  stroke: string;
}) {
  return (
    <VesselFrame glow={glow} label={label} stroke={stroke}>
      <rect fill="#f8fafc" height="54" rx="8" stroke={stroke} width="44" x="22" y="34" />
      <circle cx="56" cy="46" fill="none" r="4" stroke={stroke} />
      <path d="M30 54H50" opacity="0.35" />
      <path d="M30 64H58" opacity="0.35" />
      <path d="M30 74H52" opacity="0.35" />
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
  produceLots,
  sampleLabelText,
  stroke,
}: {
  glow: string;
  label: string;
  produceLots: ExperimentProduceLot[];
  sampleLabelText?: string | null;
  stroke: string;
}) {
  const isLoaded = produceLots.length > 0;
  const visibleProduceLots = produceLots.slice(0, 2);
  const normalizedLabelText = sampleLabelText?.trim() ?? "";
  const displayLabelText =
    normalizedLabelText.length > 12
      ? `${normalizedLabelText.slice(0, 12).trimEnd()}...`
      : normalizedLabelText;

  return (
    <VesselFrame glow={glow} label={label} stroke={stroke}>
      <path d={isLoaded ? "M20 22H68" : "M28 22H60"} />
      <path
        d={
          isLoaded
            ? "M24 22L18 38V88C18 98 28 104 39 104H49C60 104 70 98 70 88V38L64 22"
            : "M30 22L26 38V90C26 98 32 104 40 104H48C56 104 62 98 62 90V38L58 22"
        }
      />
      <path d={isLoaded ? "M24 40H64" : "M32 40H56"} opacity="0.4" />
      <path
        d={isLoaded ? "M26 32H62V42H26V32Z" : "M34 32H54V42H34V32Z"}
        fill="#dcfce7"
        stroke="none"
      />
      <path
        d={
          isLoaded
            ? "M22 50C28 44 37 42 44 45C51 48 59 48 66 44V80C66 90 57 97 44 99C31 97 22 90 22 80V50Z"
            : "M32 48C36 46 40 46 44 48C48 50 52 50 56 48V82C56 89 51 94 44 96C37 94 32 89 32 82V48Z"
        }
        fill="#bbf7d0"
        stroke="none"
        opacity="0.85"
      />
      {visibleProduceLots.map((produceLot, index) => {
        if (produceLot.produceType !== "apple") {
          return null;
        }

        return (
          <g
            key={produceLot.id}
            opacity={index === 0 ? 0.9 : 0.76}
            transform={index === 0 ? "translate(23 36) scale(0.42)" : "translate(38 42) scale(0.34)"}
          >
            <AppleLotGlyph
              shadowOpacity={0.04}
              variant={
                produceLot.cutState === "ground"
                  ? "ground"
                  : produceLot.cutState === "whole"
                    ? "whole"
                    : "cut"
              }
            />
          </g>
        );
      })}
      <path d={isLoaded ? "M30 56H58" : "M38 56H50"} opacity="0.55" />
      <path d={isLoaded ? "M28 64H60" : "M36 64H52"} opacity="0.55" />
      <path d={isLoaded ? "M28 72H60" : "M36 72H52"} opacity="0.55" />
      {displayLabelText ? (
        <g data-sample-label-text={normalizedLabelText}>
          <rect
            fill="#f8fafc"
            height={isLoaded ? "16" : "14"}
            rx="3"
            stroke="#7dd3fc"
            strokeWidth="1.5"
            width={isLoaded ? "32" : "28"}
            x={isLoaded ? "28" : "30"}
            y={isLoaded ? "76" : "74"}
          />
          <text
            fill="#0f172a"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontSize={isLoaded ? "5.2" : "4.8"}
            fontWeight="700"
            letterSpacing="0.35"
            textAnchor="middle"
            x={isLoaded ? "44" : "44"}
            y={isLoaded ? "86.2" : "83.5"}
          >
            {displayLabelText}
          </text>
        </g>
      ) : null}
      <path d={isLoaded ? "M24 28H64" : "M30 28H58"} />
    </VesselFrame>
  );
}

export function LabAssetIcon({
  accent,
  className,
  fillRatio,
  fillSegments,
  kind,
  produceLots = [],
  sampleLabelText,
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
    case "cutting_board":
      icon = <CuttingBoardIcon glow={palette.glow} label={label} stroke={palette.stroke} />;
      break;
    case "sample_bag":
      icon = (
        <SampleBagIcon
          glow={palette.glow}
          label={label}
          produceLots={produceLots}
          sampleLabelText={sampleLabelText}
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
    case "dry_ice_pellets":
      icon = <DryIcePelletsIcon glow={palette.glow} label={label} stroke={palette.stroke} />;
      break;
    default:
      icon = <ReagentBottleIcon {...sharedProps} />;
  }

  return (
    <div
      className={className}
      data-fill-segments={displaySegments.length}
      data-kind={kind}
      data-primary-produce-cut-state={produceLots[0]?.cutState ?? ""}
      data-produce-lot-count={produceLots.length}
      data-sample-label-text={sampleLabelText ?? ""}
      data-tone={tone}
    >
      {icon}
    </div>
  );
}
