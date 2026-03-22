"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

type FloatingWidgetProps = {
  children: ReactNode;
  id: string;
  isActive?: boolean;
  label: string;
  onDragStart: (widgetId: string, event: ReactMouseEvent<HTMLDivElement>) => void;
  onHeightChange?: (widgetId: string, height: number) => void;
  position: {
    width: number;
    x: number;
    y: number;
  };
  zIndex: number;
};

export function FloatingWidget({
  children,
  id,
  isActive = false,
  label,
  onDragStart,
  onHeightChange,
  position,
  zIndex,
}: FloatingWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !onHeightChange) {
      return;
    }

    const reportHeight = () => {
      onHeightChange(id, node.getBoundingClientRect().height);
    };

    reportHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      reportHeight();
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [id, onHeightChange]);

  return (
    <div
      className="absolute"
      data-testid={`widget-${id}`}
      ref={containerRef}
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        zIndex,
      }}
    >
      <div
        className={`mb-3 flex items-center justify-between rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] shadow-sm backdrop-blur transition ${
          isActive
            ? "border-slate-900/20 bg-slate-950 text-white"
            : "border-white/80 bg-white/75 text-slate-600"
        } select-none touch-none cursor-grab active:cursor-grabbing`}
        data-testid={`widget-handle-${id}`}
        onMouseDown={(event) => {
          onDragStart(id, event);
        }}
      >
        <span className="flex items-center gap-2">
          <span className="grid grid-cols-2 gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-current/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-current/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-current/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-current/70" />
          </span>
          {label}
        </span>
        <span className={isActive ? "text-white/70" : "text-slate-400"}>Move</span>
      </div>

      <div className={isActive ? "drop-shadow-[0_26px_44px_rgba(15,23,42,0.18)]" : ""}>{children}</div>
    </div>
  );
}
