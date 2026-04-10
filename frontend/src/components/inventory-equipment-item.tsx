"use client";

import type { ReactNode } from "react";

import { EquipmentCardHeader } from "@/components/equipment-card-header";
import { dragAffordanceClassName } from "@/lib/drag-affordance";

type InventoryEquipmentItemProps = {
  dataTestId: string;
  icon: ReactNode;
  onDragEnd?: () => void;
  onDragStart?: (dataTransfer: DataTransfer) => void;
  subtitle: ReactNode;
  title: ReactNode;
};

export function InventoryEquipmentItem({
  dataTestId,
  icon,
  onDragEnd,
  onDragStart,
  subtitle,
  title,
}: InventoryEquipmentItemProps) {
  return (
    <div
      className={`${onDragStart ? dragAffordanceClassName : ""} rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-transform ${onDragStart ? "hover:-translate-y-0.5" : ""}`.trim()}
      data-testid={dataTestId}
      draggable={Boolean(onDragStart)}
      onDragEnd={() => {
        onDragEnd?.();
      }}
      onDragStart={(event) => {
        onDragStart?.(event.dataTransfer);
      }}
      title={typeof subtitle === "string" ? subtitle : undefined}
    >
      <EquipmentCardHeader
        description={subtitle}
        leading={icon}
        title={title}
        variant="compact"
      />
    </div>
  );
}
