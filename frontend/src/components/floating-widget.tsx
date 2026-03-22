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
  label: _label,
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
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-20 h-20 cursor-grab select-none touch-none active:cursor-grabbing"
        data-testid={`widget-handle-${id}`}
        onMouseDown={(event) => {
          onDragStart(id, event);
        }}
      />

      <div
        className={`relative ${isActive ? "drop-shadow-[0_26px_44px_rgba(15,23,42,0.18)]" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
