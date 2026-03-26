"use client";

import type { DragEvent } from "react";

import { DraggableInventoryItem } from "@/components/draggable-inventory-item";
import { InventoryWidget } from "@/components/inventory-widget";
import type {
  ExperimentWorkspaceWidget,
  TrashProduceLotEntry,
  TrashToolEntry,
} from "@/types/workbench";

type TrashWidgetProps = {
  formatProduceLotMetadata: (trashProduceLot: TrashProduceLotEntry["produceLot"]) => string;
  isDropHighlighted: boolean;
  isEmpty: boolean;
  isOpen: boolean;
  onDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
  onToolDragStart: (trashTool: TrashToolEntry, dataTransfer: DataTransfer) => void;
  onToggle: () => void;
  onTrashedWidgetDragStart: (
    widget: ExperimentWorkspaceWidget,
    dataTransfer: DataTransfer,
  ) => void;
  onTrashProduceLotDragStart: (
    trashProduceLot: TrashProduceLotEntry,
    dataTransfer: DataTransfer,
  ) => void;
  onItemDragEnd: () => void;
  trashedProduceLots: TrashProduceLotEntry[];
  trashedTools: TrashToolEntry[];
  trashedWidgets: ExperimentWorkspaceWidget[];
};

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[4.5rem] w-[4.5rem] text-slate-500"
      fill="none"
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M28 30H68" stroke="currentColor" strokeLinecap="round" strokeWidth="6" />
      <path d="M38 20H58" stroke="currentColor" strokeLinecap="round" strokeWidth="6" />
      <path
        d="M34 30V67C34 73 37 76 43 76H53C59 76 62 73 62 67V30"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <path d="M44 40V63" stroke="currentColor" strokeLinecap="round" strokeWidth="6" />
      <path d="M52 40V63" stroke="currentColor" strokeLinecap="round" strokeWidth="6" />
      <path d="M24 30H72" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}

export function TrashWidget({
  formatProduceLotMetadata,
  isDropHighlighted,
  isEmpty,
  isOpen,
  onDragOver,
  onDrop,
  onToolDragStart,
  onToggle,
  onTrashedWidgetDragStart,
  onTrashProduceLotDragStart,
  onItemDragEnd,
  trashedProduceLots,
  trashedTools,
  trashedWidgets,
}: TrashWidgetProps) {
  const trashItemCount =
    trashedTools.length + trashedProduceLots.length + trashedWidgets.length;

  return (
    <InventoryWidget
      buttonTestId="trash-dropzone"
      count={trashItemCount}
      countBadgeClassName="-right-2 -top-2 absolute"
      countTestId="trash-count-badge"
      dataDropHighlighted={isDropHighlighted ? "true" : "false"}
      icon={<TrashIcon />}
      isDropHighlighted={isDropHighlighted}
      isOpen={isOpen}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onToggle={onToggle}
      overlayTestId="trash-dialog-overlay"
      overlayWidthClassName="w-[26rem] max-w-[min(26rem,calc(100vw-2rem))]"
      title="Trash"
    >
      <div className="space-y-2">
        {trashedTools.map((trashTool) => {
          const totalVolume = trashTool.tool.liquids.reduce(
            (sum, liquid) => sum + liquid.volume_ml,
            0,
          );

          return (
            <DraggableInventoryItem
              dataTestId={`trash-tool-${trashTool.id}`}
              key={trashTool.id}
              onDragEnd={onItemDragEnd}
              onDragStart={(dataTransfer) => onToolDragStart(trashTool, dataTransfer)}
              subtitle={
                <p className="truncate text-xs text-slate-500">
                  {trashTool.originLabel}
                  {totalVolume > 0 ? ` • ${totalVolume} mL` : ""}
                </p>
              }
              title={
                <p className="truncate text-sm font-semibold text-slate-900">
                  {trashTool.tool.label}
                </p>
              }
            />
          );
        })}
        {trashedProduceLots.map((trashProduceLot) => (
          <DraggableInventoryItem
            dataTestId={`trash-produce-lot-${trashProduceLot.id}`}
            key={trashProduceLot.id}
            onDragEnd={onItemDragEnd}
            onDragStart={(dataTransfer) =>
              onTrashProduceLotDragStart(trashProduceLot, dataTransfer)
            }
            subtitle={
              <p className="truncate text-xs text-slate-500">
                {trashProduceLot.originLabel} •{" "}
                {formatProduceLotMetadata(trashProduceLot.produceLot)}
              </p>
            }
            title={
              <p className="truncate text-sm font-semibold text-slate-900">
                {trashProduceLot.produceLot.label}
              </p>
            }
          />
        ))}
        {trashedWidgets.map((widget) => (
          <DraggableInventoryItem
            dataTestId={`trash-widget-${widget.id}`}
            key={widget.id}
            onDragEnd={onItemDragEnd}
            onDragStart={(dataTransfer) => onTrashedWidgetDragStart(widget, dataTransfer)}
            subtitle={<p className="truncate text-xs text-slate-500">Workspace widget</p>}
            title={
              <p className="truncate text-sm font-semibold text-slate-900">
                {widget.label}
              </p>
            }
          />
        ))}
        {isEmpty ? (
          <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Trash is empty.
          </div>
        ) : null}
      </div>
    </InventoryWidget>
  );
}
