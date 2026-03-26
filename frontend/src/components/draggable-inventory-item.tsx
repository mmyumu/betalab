"use client";

import type { ReactNode } from "react";

import { dragAffordanceClassName } from "@/lib/drag-affordance";

type DraggableInventoryItemProps = {
  badge?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  dataTestId: string;
  leading?: ReactNode;
  onDragEnd: () => void;
  onDragStart: (dataTransfer: DataTransfer) => void;
  subtitle: ReactNode;
  title: ReactNode;
};

export function DraggableInventoryItem({
  badge,
  children,
  className = "",
  contentClassName = "",
  dataTestId,
  leading,
  onDragEnd,
  onDragStart,
  subtitle,
  title,
}: DraggableInventoryItemProps) {
  return (
    <div
      className={`${dragAffordanceClassName} flex items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2 ${className}`.trim()}
      data-testid={dataTestId}
      draggable
      onDragEnd={onDragEnd}
      onDragStart={(event) => onDragStart(event.dataTransfer)}
    >
      <div className={`min-w-0 ${contentClassName}`.trim()}>
        {leading ? <div className="flex min-w-0 items-center gap-3">{leading}<div className="min-w-0">{title}{subtitle}</div></div> : (
          <>
            {title}
            {subtitle}
          </>
        )}
        {children}
      </div>
      {badge ?? null}
    </div>
  );
}
