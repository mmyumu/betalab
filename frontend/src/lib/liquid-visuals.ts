import type { ToolbarAccent } from "@/types/workbench";

type LiquidVisualSource = {
  accent: ToolbarAccent;
  volume_ml: number;
};

export type LiquidVisualPalette = {
  glow: string;
  liquid: string;
  stroke: string;
};

export type LiquidVisualSegment = {
  accent: ToolbarAccent;
  color: string;
  ratio: number;
};

export const liquidAccentPalette: Record<ToolbarAccent, LiquidVisualPalette> = {
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

export const neutralLiquidPalette: LiquidVisualPalette = {
  liquid: "#cbd5e1",
  glow: "#f8fafc",
  stroke: "#64748b",
};

export function getLiquidAccentPalette(accent: ToolbarAccent) {
  return liquidAccentPalette[accent];
}

export function getLiquidVisualSegments(liquids: LiquidVisualSource[]): LiquidVisualSegment[] {
  const validLiquids = liquids.filter((liquid) => Number.isFinite(liquid.volume_ml) && liquid.volume_ml > 0);
  const totalVolume = validLiquids.reduce((sum, liquid) => sum + liquid.volume_ml, 0);

  if (totalVolume <= 0) {
    return [];
  }

  return validLiquids.map((liquid) => ({
    accent: liquid.accent,
    color: liquidAccentPalette[liquid.accent].liquid,
    ratio: liquid.volume_ml / totalVolume,
  }));
}

export function getDominantLiquidAccent(
  liquids: LiquidVisualSource[],
  fallbackAccent: ToolbarAccent,
) {
  const dominantLiquid = liquids.reduce<LiquidVisualSource | null>((current, liquid) => {
    if (liquid.volume_ml <= 0) {
      return current;
    }
    if (!current || liquid.volume_ml > current.volume_ml) {
      return liquid;
    }
    return current;
  }, null);

  return dominantLiquid?.accent ?? fallbackAccent;
}

export function buildCssLinearGradient(
  segments: LiquidVisualSegment[],
  direction = "90deg",
) {
  if (segments.length === 0) {
    return undefined;
  }

  let offset = 0;
  const stops = segments.flatMap((segment, index) => {
    const start = offset;
    offset += segment.ratio * 100;
    const end = index === segments.length - 1 ? 100 : offset;

    return [`${segment.color} ${start}%`, `${segment.color} ${end}%`];
  });

  return `linear-gradient(${direction}, ${stops.join(", ")})`;
}
