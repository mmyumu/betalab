import {
  getDominantLiquidAccent,
  getLiquidAccentPalette,
  getLiquidVisualSegments,
  neutralLiquidPalette,
} from "@/lib/liquid-visuals";
import type { BenchLiquidPortion, ToolbarAccent } from "@/types/workbench";

type AutosamplerRackIllustrationProps = {
  className?: string;
  occupiedSlotLiquids?: Partial<Record<number, BenchLiquidPortion[]>>;
  occupiedSlots?: number[];
  slotCount?: number;
  testId?: string;
  tone?: "neutral" | "active";
};

const rackPalette = {
  active: {
    frame: "#0f172a",
    panel: "#e2e8f0",
    tray: "#f8fafc",
    shadow: "#cbd5e1",
    slot: "#94a3b8",
    liquid: "#38bdf8",
    accent: "#0ea5e9",
    label: "#334155",
  },
  neutral: {
    frame: "#334155",
    panel: "#e2e8f0",
    tray: "#ffffff",
    shadow: "#e2e8f0",
    slot: "#cbd5e1",
    liquid: "#94a3b8",
    accent: "#64748b",
    label: "#475569",
  },
} as const;

export function AutosamplerRackIllustration({
  className,
  occupiedSlotLiquids,
  occupiedSlots = [],
  slotCount = 12,
  testId,
  tone = "neutral",
}: AutosamplerRackIllustrationProps) {
  const palette = rackPalette[tone];
  const occupiedSet = new Set(
    occupiedSlots.filter((slotNumber) => Number.isInteger(slotNumber) && slotNumber >= 1),
  );
  const slots = Array.from({ length: slotCount }, (_, index) => index + 1);
  const columns = Math.min(6, Math.max(slotCount, 1));
  const baseX = 98;
  const baseY = 106;
  const slotGapX = 70;
  const slotGapY = 84;

  return (
    <div
      aria-label="Autosampler rack illustration"
      className={className}
      data-occupied-count={occupiedSet.size}
      data-slot-count={slotCount}
      data-testid={testId}
      data-tone={tone}
    >
      <svg
        className="h-full w-full"
        fill="none"
        viewBox="0 0 560 320"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect fill="#f8fafc" height="320" rx="36" width="560" />
        <ellipse cx="280" cy="278" fill={palette.shadow} opacity="0.65" rx="186" ry="22" />
        <rect
          fill={palette.panel}
          height="150"
          rx="28"
          stroke={palette.frame}
          strokeWidth="6"
          width="412"
          x="74"
          y="84"
        />
        <rect
          fill={palette.tray}
          height="112"
          rx="22"
          stroke={palette.frame}
          strokeWidth="4"
          width="372"
          x="94"
          y="102"
        />
        <rect
          fill={palette.panel}
          height="22"
          rx="11"
          stroke={palette.frame}
          strokeWidth="4"
          width="156"
          x="202"
          y="50"
        />
        <path d="M186 50H374" stroke={palette.frame} strokeLinecap="round" strokeWidth="5" />

        {slots.map((slotNumber, index) => {
          const column = index % columns;
          const row = Math.floor(index / columns);
          const cx = baseX + column * slotGapX;
          const cy = baseY + row * slotGapY;
          const occupied = occupiedSet.has(slotNumber);
          const slotLiquids = occupiedSlotLiquids?.[slotNumber] ?? [];
          const dominantAccent = getDominantLiquidAccent(slotLiquids, "sky");
          const vialPalette = occupied
            ? slotLiquids.length > 0
              ? getLiquidAccentPalette(dominantAccent)
              : getLiquidAccentPalette("sky")
            : neutralLiquidPalette;
          const liquidSegments = getLiquidVisualSegments(slotLiquids);
          const gradientId = `${testId ?? "autosampler-rack"}-slot-gradient-${slotNumber}`;
          const slotGlow = occupied ? vialPalette.glow : palette.tray;
          const slotLiquid =
            occupied && liquidSegments.length > 1
              ? `url(#${gradientId})`
              : occupied && liquidSegments.length === 1
                ? liquidSegments[0].color
                : occupied
                  ? vialPalette.liquid
                  : palette.slot;
          const vialStroke = occupied ? vialPalette.stroke : palette.frame;

          return (
            <g key={slotNumber}>
              {occupied && liquidSegments.length > 1 ? (
                <defs>
                  <linearGradient
                    data-testid={testId ? `${testId}-slot-gradient-${slotNumber}` : undefined}
                    id={gradientId}
                    x1="0%"
                    x2="0%"
                    y1="100%"
                    y2="0%"
                  >
                    {liquidSegments.flatMap((segment, segmentIndex) => {
                      const start =
                        liquidSegments
                          .slice(0, segmentIndex)
                          .reduce((sum, previousSegment) => sum + previousSegment.ratio, 0) * 100;
                      const end = start + segment.ratio * 100;

                      return [
                        <stop
                          key={`${segment.color}-${segmentIndex}-start`}
                          offset={`${start}%`}
                          stopColor={segment.color}
                        />,
                        <stop
                          key={`${segment.color}-${segmentIndex}-end`}
                          offset={`${end}%`}
                          stopColor={segment.color}
                        />,
                      ];
                    })}
                  </linearGradient>
                </defs>
              ) : null}
              <circle
                cx={cx}
                cy={cy}
                fill={slotGlow}
                r="18"
                stroke={palette.slot}
                strokeWidth="4"
              />
              <circle
                cx={cx}
                cy={cy}
                fill={slotLiquid}
                opacity={occupied ? 0.95 : 0.35}
                r={occupied ? "10" : "6"}
              />
              {occupied ? (
                <>
                  <rect
                    fill="#0f172a"
                    height="14"
                    rx="3"
                    width="10"
                    x={cx - 5}
                    y={cy - 32}
                  />
                  <path
                    d={`M${cx - 7} ${cy - 18}H${cx + 7}V${cy + 4}C${cx + 7} ${cy + 10} ${cx + 3} ${cy + 15} ${cx} ${cy + 15}C${cx - 3} ${cy + 15} ${cx - 7} ${cy + 10} ${cx - 7} ${cy + 4}V${cy - 18}Z`}
                    fill="#f8fafc"
                    opacity="0.96"
                    stroke={vialStroke}
                    strokeWidth="3"
                  />
                  <path
                    data-testid={testId ? `${testId}-slot-liquid-${slotNumber}` : undefined}
                    d={`M${cx - 4} ${cy - 2}H${cx + 4}V${cy + 4}C${cx + 4} ${cy + 7} ${cx + 2} ${cy + 10} ${cx} ${cy + 10}C${cx - 2} ${cy + 10} ${cx - 4} ${cy + 7} ${cx - 4} ${cy + 4}V${cy - 2}Z`}
                    fill={slotLiquid}
                  />
                </>
              ) : null}
              <text
                fill={palette.label}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fontSize="13"
                fontWeight="700"
                textAnchor="middle"
                x={cx}
                y={cy + 38}
              >
                {slotNumber}
              </text>
            </g>
          );
        })}

        <rect fill={palette.accent} height="10" rx="5" width="102" x="116" y="248" />
        <rect fill={palette.slot} height="10" opacity="0.35" rx="5" width="68" x="234" y="248" />
        <rect fill={palette.slot} height="10" opacity="0.35" rx="5" width="86" x="314" y="248" />
      </svg>
    </div>
  );
}
