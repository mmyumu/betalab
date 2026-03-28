type EquipmentIllustrationSurfaceOptions = {
  height: number;
  idPrefix: string;
  radius: number;
  width: number;
  x?: number;
  y?: number;
};

export function buildEquipmentIllustrationSurface({
  height,
  idPrefix,
  radius,
  width,
  x = 0,
  y = 0,
}: EquipmentIllustrationSurfaceOptions) {
  const gradientId = `${idPrefix}-surface-gradient`;

  return {
    defs: (
      <linearGradient
        id={gradientId}
        x1={Math.round(x + width * 0.17)}
        x2={Math.round(x + width * 0.83)}
        y1={Math.round(y + height * 0.07)}
        y2={Math.round(y + height * 0.88)}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#ffffff" offset="0" />
        <stop stopColor="#e2e8f0" offset="1" />
      </linearGradient>
    ),
    surface: (
      <rect fill={`url(#${gradientId})`} height={height} rx={radius} width={width} x={x} y={y} />
    ),
  };
}
