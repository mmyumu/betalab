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

  return (
    <div
      className="pointer-events-none fixed z-[80] h-7 w-20"
      style={{
        left: cursorPosition.x + 8,
        top: cursorPosition.y - 20,
      }}
    >
      <div className="relative h-full w-full opacity-90">
        <div className="absolute left-0 top-[11px] h-2.5 w-12 rounded-full bg-slate-800" />
        <div className="absolute left-[42px] top-[9px] h-2 w-7 rounded-r-full border border-slate-700 border-l-0 bg-slate-200" />
        {spatula.isLoaded ? (
          <div
            className="absolute left-[40px] rounded-full bg-[#d8c9ae]"
            style={{
              bottom: 9,
              height: `${6 + Math.min(spatula.loadedPowderMassG, 2) * 4}px`,
              width: `${12 + Math.min(spatula.loadedPowderMassG, 2) * 6}px`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
