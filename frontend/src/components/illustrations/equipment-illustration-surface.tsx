type EquipmentIllustrationSurfaceOptions = {
  height: number;
  idPrefix: string;
  radius: number;
  width: number;
};

export function buildEquipmentIllustrationSurface({
  height,
  idPrefix,
  radius,
  width,
}: EquipmentIllustrationSurfaceOptions) {
  const gradientId = `${idPrefix}-surface-gradient`;

  return {
    defs: (
      <linearGradient
        id={gradientId}
        x1={Math.round(width * 0.17)}
        x2={Math.round(width * 0.83)}
        y1={Math.round(height * 0.07)}
        y2={Math.round(height * 0.88)}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#ffffff" offset="0" />
        <stop stopColor="#e2e8f0" offset="1" />
      </linearGradient>
    ),
    surface: (
      <rect fill={`url(#${gradientId})`} height={height} rx={radius} width={width} />
    ),
  };
}
