"use client";

import { DraggableInventoryItem } from "@/components/draggable-inventory-item";
import { AppleIllustration } from "@/components/illustrations/apple-illustration";
import { ProduceBasketIllustration } from "@/components/illustrations/produce-basket-illustration";
import { InventoryWidget } from "@/components/inventory-widget";
import type { ExperimentProduceLot } from "@/types/workbench";

type ProduceBasketWidgetProps = {
  dndDisabled?: boolean;
  formatProduceLotMetadata: (produceLot: ExperimentProduceLot) => string;
  isOpen: boolean;
  onCreateAppleLot: () => void;
  onItemDragEnd?: () => void;
  onProduceDragStart?: (
    produceLotId: string,
    produceType: "apple",
    dataTransfer: DataTransfer,
  ) => void;
  onToggle: () => void;
  produceLots: ExperimentProduceLot[];
};

export function ProduceBasketWidget({
  dndDisabled = false,
  formatProduceLotMetadata,
  isOpen,
  onCreateAppleLot,
  onItemDragEnd,
  onProduceDragStart,
  onToggle,
  produceLots,
}: ProduceBasketWidgetProps) {
  return (
    <InventoryWidget
      ariaLabel={`Open produce basket (${produceLots.length} lot${produceLots.length === 1 ? "" : "s"})`}
      buttonTestId="basket-open-button"
      count={produceLots.length}
      countBadgeClassName="absolute right-[22px] top-1"
      countTestId="basket-count-badge"
      frameClassName="rounded-[1.05rem] px-3 py-3.5"
      icon={<ProduceBasketIllustration className="block w-[10.9rem]" itemCount={6} />}
      isOpen={isOpen}
      onToggle={onToggle}
      overlayTestId="basket-dialog-overlay"
      overlayWidthClassName="w-[24rem] max-w-[min(24rem,calc(100vw-2rem))]"
      title="Produce basket"
    >
      <div className="space-y-4">
        <button
          className="w-full rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-100/80"
          data-testid="basket-create-apple-lot-button"
          onClick={onCreateAppleLot}
          type="button"
        >
          <span className="flex items-center gap-3">
            <AppleIllustration className="h-12 w-12 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">
                Create apple lot
              </span>
              <span className="mt-1 block text-sm text-slate-500">
                Add a representative apple lot to the basket.
              </span>
            </span>
          </span>
        </button>
        <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Basket contents
          </p>
          <div className="mt-3 space-y-2">
            {produceLots.length > 0 ? (
              produceLots.map((lot) => (
                <DraggableInventoryItem
                  className="rounded-[0.9rem] bg-white"
                  contentClassName="flex-1"
                  dataTestId={`basket-produce-${lot.id}`}
                  key={lot.id}
                  leading={
                    <AppleIllustration
                      className="h-10 w-10 shrink-0"
                      testId={`basket-produce-illustration-${lot.id}`}
                    />
                  }
                  onDragEnd={dndDisabled ? undefined : onItemDragEnd}
                  onDragStart={
                    dndDisabled || !onProduceDragStart
                      ? undefined
                      : (dataTransfer) => onProduceDragStart(lot.id, lot.produceType, dataTransfer)
                  }
                  subtitle={
                    <span className="block truncate text-xs text-slate-500">
                      {formatProduceLotMetadata(lot)}
                    </span>
                  }
                  title={
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {lot.label}
                    </span>
                  }
                />
              ))
            ) : (
              <p className="text-sm text-slate-500">No produce lots created yet.</p>
            )}
          </div>
        </div>
      </div>
    </InventoryWidget>
  );
}
