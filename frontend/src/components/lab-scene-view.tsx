"use client";

import Link from "next/link";
import type { Dispatch, DragEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode, RefObject, SetStateAction } from "react";
import type { DragDescriptor } from "@/types/workbench";

import { ActionBarPanel } from "@/components/action-bar-panel";
import { AnalyticalBalanceWidget } from "@/components/analytical-balance-widget";
import { BenchToolCard } from "@/components/bench-tool-card";
import { DebugProducePalette, type DebugProducePreset } from "@/components/debug-produce-palette";
import { DropDraftCard } from "@/components/drop-draft-card";
import { FloatingWidget } from "@/components/floating-widget";
import { GrinderWidgetContent } from "@/components/grinder-widget-content";
import { GrossBalanceWidget } from "@/components/gross-balance-widget";
import { LcMsMsInstrumentIllustration } from "@/components/illustrations/lc-msms-instrument-illustration";
import { LimsWidget } from "@/components/lims-widget";
import { ProduceBasketWidget } from "@/components/produce-basket-widget";
import { ProduceLotCard } from "@/components/produce-lot-card";
import { RackWidget } from "@/components/rack-widget";
import { ToolbarPanel } from "@/components/toolbar-panel";
import { TrashWidget } from "@/components/trash-widget";
import { WorkbenchPanel } from "@/components/workbench-panel";
import { WorkspaceEquipmentWidget } from "@/components/workspace-equipment-widget";
import type { AnalyticalBalanceDndApi } from "@/hooks/use-analytical-balance-dnd";
import type { DropDraft } from "@/hooks/use-drop-draft";
import type { GrinderDndApi } from "@/hooks/use-grinder-dnd";
import type { GrossBalanceDndApi } from "@/hooks/use-gross-balance-dnd";
import type { RackDndApi } from "@/hooks/use-rack-dnd";
import type { TrashDndApi } from "@/hooks/use-trash-dnd";
import type { WorkbenchDndApi } from "@/hooks/use-workbench-dnd";
import type { WidgetLayout } from "@/hooks/use-workspace-layout";
import { labWorkflowCategories } from "@/lib/lab-workflow-catalog";
import { createToolbarDragPayload, toDragDescriptor } from "@/lib/workbench-dnd";
import type { Experiment } from "@/types/experiment";
import type {
  BenchLabel,
  BenchSlot,
  BenchToolInstance,
  DropTargetType,
  ExperimentProduceLot,
  ExperimentWorkspaceWidget,
  RackSlot,
  SpatulaState,
  ToolbarDragPayload,
  TrashProduceLotEntry,
  TrashSampleLabelEntry,
  TrashToolEntry,
} from "@/types/workbench";
import { isWorkspaceEquipmentWidgetId } from "@/lib/workspace-widget-ids";

type WidgetId = string;

export type LabSceneViewProps = {
  // Hook APIs
  analyticalBalanceDnd: AnalyticalBalanceDndApi;
  grinderDnd: GrinderDndApi;
  grossBalanceDnd: GrossBalanceDndApi;
  rackDnd: RackDndApi;
  trashDnd: TrashDndApi;
  workbenchDnd: WorkbenchDndApi;

  // Shared DnD state
  clearDropTargets: () => void;
  dndDisabledByAction: boolean;
  isDropTargetHighlighted: (target: DropTargetType) => boolean;
  setActiveDragItem: (item: DragDescriptor | null) => void;
  showDropTargets: (targets: readonly DropTargetType[]) => void;

  // Drop draft
  handleConfirmDropDraft: () => void;
  handleUpdateDropDraftField: (fieldId: string, value: number) => void;
  pendingDropDraft: DropDraft | null;
  renderPendingBenchDropDraft: (slotId: string) => ReactNode;
  setPendingDropDraft: Dispatch<SetStateAction<DropDraft | null>>;

  // Workspace layout
  activeWidgetId: WidgetId | null;
  handleWidgetDragStart: (widgetId: WidgetId, event: ReactMouseEvent<HTMLDivElement>) => void;
  handleWidgetHeightChange: (widgetId: WidgetId, height: number) => void;
  handleWorkspaceDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleWorkspaceDrop: (event: DragEvent<HTMLDivElement>) => void;
  liveWidgetIds: WidgetId[];
  widgetLayout: Record<WidgetId, WidgetLayout>;
  widgetOrder: WidgetId[];
  workspaceCursor: string | undefined;
  workspaceHeight: number;
  workspaceRef: RefObject<HTMLDivElement | null>;

  // Experiment
  experiment: Experiment;
  isCommandPending: boolean;
  statusMessage: string;

  // Rack derived
  getRackIllustrationSlotPosition: (index: number) => { left: string; top: string };
  instrumentStatus: "idle" | "ready";
  isRackSlotHighlighted: boolean;
  rackLoadedCount: number;
  rackOccupiedSlotLiquids: Record<number, BenchToolInstance["liquids"]>;
  rackOccupiedSlots: number[];
  rackSlotCount: number;

  // Balance derived
  analyticalBalanceMeasuredMassG: number | null;
  analyticalBalanceNetMassG: number | null;
  grossBalanceNetMassG: number;

  // UI state
  isBasketOpen: boolean;
  isTrashEmpty: boolean;
  isTrashOpen: boolean;
  setIsBasketOpen: Dispatch<SetStateAction<boolean>>;
  setIsTrashOpen: Dispatch<SetStateAction<boolean>>;

  // Display data
  displayBasketProduceLots: ExperimentProduceLot[];
  displayBasketTool: BenchToolInstance | null;
  displayRackSlots: RackSlot[];
  displaySlots: BenchSlot[];
  displayTrashProduceLots: TrashProduceLotEntry[];
  displayTrashTools: TrashToolEntry[];
  trashedSampleLabels: TrashSampleLabelEntry[];
  trashedWidgets: ExperimentWorkspaceWidget[];

  // Workbench helpers
  canApplyLimsLabelToSlot: (slot: BenchSlot) => boolean;
  formatProduceLotMetadata: (lot: ExperimentProduceLot) => string | null;
  isBenchSlotHighlighted: (slot: BenchSlot) => boolean;

  // Non-DnD workbench handlers
  handleAddWorkbenchSlot: () => void;
  handleApplyLimsLabelTicket: (payload: { basketBag?: true; grossBalanceBag?: true; slotId?: string }) => void;
  handleApplySampleLabel: (slotId: string) => void;
  handleAnalyticalBalanceToolSealToggle: () => void;
  handleBalanceToolSealToggle: () => void;
  handleCreateAppleLot: () => void;
  handleMoveSampleLabel: (targetSlotId: string, payload: { label?: BenchLabel; sourceSlotId?: string }) => void;
  handleRemoveLiquid: (slotId: string, liquidId: string) => void;
  handleRemoveWorkbenchSlot: (slotId: string) => void;
  handleRestoreTrashedSampleLabel: (targetSlotId: string, payload: { trashSampleLabelId?: string }) => void;
  handleSampleLabelTextChange: (slotId: string, labelId: string, text: string) => void;
  handleSaveLimsReception: (payload: {
    entry_id?: string;
    harvest_date: string;
    indicative_mass_g: number;
    measured_sample_mass_g: number | null;
    orchard_name: string;
  }) => void;
  handleToggleToolSeal: (slotId: string, tool: BenchToolInstance) => void;
  handleToolbarItemDrop: (slotId: string, payload: ToolbarDragPayload) => void;
  onCommitGrossBalanceOffset: (nextOffsetG: number) => void;
  onPrintLimsLabel: (entryId?: string) => void;
  onTareAnalyticalBalance: () => void;

  // Spatula
  activeActionId: string | null;
  handleSpatulaToolCardClick: (slotId: string, tool: BenchToolInstance, event: ReactMouseEvent<HTMLElement>) => void;
  handleSpatulaToolIllustrationClick: (slotId: string, tool: BenchToolInstance, event: ReactMouseEvent<HTMLButtonElement>) => void;
  handleSpatulaToolPointerDown: (slotId: string, tool: BenchToolInstance, event: ReactPointerEvent<HTMLElement>) => void;
  handleSpatulaToolPointerUp: () => void;
  isSpatulaMode: boolean;
  setActiveActionId: Dispatch<SetStateAction<string | null>>;
  spatula: SpatulaState;
  spatulaCursorPosition: { x: number; y: number } | null;
  spatulaHintMessage: string | null;
  stopSpatulaPour: () => void;

  // Debug
  debugInventoryEnabled: boolean;
  debugProducePresets: DebugProducePreset[];
};

export function LabSceneView({
  activeActionId,
  analyticalBalanceDnd,
  analyticalBalanceMeasuredMassG,
  analyticalBalanceNetMassG,
  activeWidgetId,
  canApplyLimsLabelToSlot,
  clearDropTargets,
  debugInventoryEnabled,
  debugProducePresets,
  displayBasketProduceLots,
  displayBasketTool,
  displayRackSlots,
  displaySlots,
  displayTrashProduceLots,
  displayTrashTools,
  dndDisabledByAction,
  experiment,
  formatProduceLotMetadata,
  getRackIllustrationSlotPosition,
  grinderDnd,
  grossBalanceDnd,
  grossBalanceNetMassG,
  handleAddWorkbenchSlot,
  handleAnalyticalBalanceToolSealToggle,
  handleApplyLimsLabelTicket,
  handleApplySampleLabel,
  handleBalanceToolSealToggle,
  handleConfirmDropDraft,
  handleCreateAppleLot,
  handleMoveSampleLabel,
  handleRemoveLiquid,
  handleRemoveWorkbenchSlot,
  handleRestoreTrashedSampleLabel,
  handleSampleLabelTextChange,
  handleSaveLimsReception,
  handleSpatulaToolCardClick,
  handleSpatulaToolIllustrationClick,
  handleSpatulaToolPointerDown,
  handleSpatulaToolPointerUp,
  handleToggleToolSeal,
  handleToolbarItemDrop,
  handleUpdateDropDraftField,
  handleWidgetDragStart,
  handleWidgetHeightChange,
  handleWorkspaceDragOver,
  handleWorkspaceDrop,
  isBenchSlotHighlighted,
  isBasketOpen,
  isCommandPending,
  isDropTargetHighlighted,
  isRackSlotHighlighted,
  isSpatulaMode,
  isTrashEmpty,
  isTrashOpen,
  instrumentStatus,
  liveWidgetIds,
  pendingDropDraft,
  rackDnd,
  rackLoadedCount,
  rackOccupiedSlotLiquids,
  rackOccupiedSlots,
  rackSlotCount,
  renderPendingBenchDropDraft,
  setActiveActionId,
  setActiveDragItem,
  setIsBasketOpen,
  setIsTrashOpen,
  setPendingDropDraft,
  showDropTargets,
  spatula,
  spatulaCursorPosition,
  spatulaHintMessage,
  statusMessage,
  stopSpatulaPour,
  trashDnd,
  trashedSampleLabels,
  trashedWidgets,
  widgetLayout,
  widgetOrder,
  workbenchDnd,
  onCommitGrossBalanceOffset,
  onPrintLimsLabel,
  onTareAnalyticalBalance,
  workspaceCursor,
  workspaceHeight,
  workspaceRef,
}: LabSceneViewProps) {
  const pendingGrossBalanceDropDraft =
    pendingDropDraft?.targetKind === "workspace_widget" &&
    pendingDropDraft.targetId === "gross_balance"
      ? pendingDropDraft
      : null;

  const displayBalanceTool = experiment.workspace.widgets.find(
    (w) => w.id === "gross_balance",
  )?.tool ?? null;
  const displayBalanceProduceLot =
    experiment.workspace.widgets.find((w) => w.id === "gross_balance")?.produceLots?.[0] ?? null;
  const displayAnalyticalBalanceTool =
    experiment.workspace.widgets.find((w) => w.id === "analytical_balance")?.tool ?? null;

  const grossBalanceStagedContent = pendingGrossBalanceDropDraft ? (
    <DropDraftCard
      confirmLabel={pendingGrossBalanceDropDraft.confirmLabel}
      fields={pendingGrossBalanceDropDraft.fields}
      onCancel={() => setPendingDropDraft(null)}
      onChangeField={handleUpdateDropDraftField}
      onConfirm={handleConfirmDropDraft}
      title={pendingGrossBalanceDropDraft.title}
    />
  ) : displayBalanceTool ? (
    <div
      data-testid="gross-balance-staged-item"
      onDragOver={grossBalanceDnd.handleBalanceStagedToolDragOver}
      onDrop={grossBalanceDnd.handleBalanceStagedToolDrop}
    >
      <BenchToolCard
        dataDropHighlighted={grossBalanceDnd.isGrossBalanceSampleBagHighlighted}
        draggable
        onDragEnd={clearDropTargets}
        onDragStart={(event) => grossBalanceDnd.handleBalanceItemDragStart(event.dataTransfer)}
        onDragOver={grossBalanceDnd.handleBalanceStagedToolDragOver}
        onDrop={grossBalanceDnd.handleBalanceStagedToolDrop}
        onProduceLotDragEnd={clearDropTargets}
        onProduceLotDragStart={(produceLot, event) =>
          grossBalanceDnd.handleGrossBalanceProduceLotDragStart(produceLot, event.dataTransfer)
        }
        onToggleSeal={handleBalanceToolSealToggle}
        onRemoveLiquid={() => {}}
        tool={{ ...displayBalanceTool, id: `balance-${displayBalanceTool.id}` }}
      />
    </div>
  ) : displayBalanceProduceLot ? (
    <div
      className="cursor-grab rounded-[1rem] border border-amber-200 bg-amber-50/80 p-2.5 shadow-sm active:cursor-grabbing"
      data-testid="gross-balance-staged-item"
      draggable
      onDragEnd={clearDropTargets}
      onDragStart={(event) => grossBalanceDnd.handleBalanceItemDragStart(event.dataTransfer)}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
        Loose material on pan
      </p>
      <ProduceLotCard
        dataTestId={`gross-balance-produce-${displayBalanceProduceLot.id}`}
        draggable={false}
        metadata={formatProduceLotMetadata(displayBalanceProduceLot) ?? ""}
        produceLot={{ ...displayBalanceProduceLot, id: `balance-${displayBalanceProduceLot.id}` }}
        variant="expanded"
      />
    </div>
  ) : null;

  const analyticalBalanceStagedContent = displayAnalyticalBalanceTool ? (
    <div data-testid="analytical-balance-staged-item">
      <BenchToolCard
        draggable
        onDragEnd={clearDropTargets}
        onDragStart={(event) =>
          analyticalBalanceDnd.handleAnalyticalBalanceItemDragStart(event.dataTransfer)
        }
        onToggleSeal={handleAnalyticalBalanceToolSealToggle}
        onRemoveLiquid={() => {}}
        tool={{ ...displayAnalyticalBalanceTool, id: `analytical-${displayAnalyticalBalanceTool.id}` }}
      />
    </div>
  ) : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#fffaf0_0%,#eef6ff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mx-auto w-full">
        <nav aria-label="Breadcrumb" className="mb-3">
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
            href="/"
          >
            <span aria-hidden="true">←</span>
            <span>Experiments</span>
          </Link>
        </nav>
        <header className="mb-8 rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur xl:p-8">
          <h1 className="text-4xl font-semibold tracking-tight xl:text-[3.25rem]">
            Laboratory workspace
          </h1>
        </header>

        <div className="mt-6 grid gap-4 xl:grid-cols-[202px_minmax(0,1fr)_92px] xl:items-start xl:gap-6">
          <div className="space-y-4 xl:sticky xl:top-6 xl:self-start" data-testid="widget-inventory">
            <div>
              <ToolbarPanel
                categories={labWorkflowCategories}
                dragDisabled={dndDisabledByAction}
                onItemDragEnd={clearDropTargets}
                onItemDragStart={(item, allowedDropTargets) => {
                  if (dndDisabledByAction) return;
                  const payload = createToolbarDragPayload(item);
                  showDropTargets(allowedDropTargets);
                  setActiveDragItem(toDragDescriptor(payload));
                }}
              />
            </div>
            {debugInventoryEnabled ? (
              <div data-testid="widget-debug-inventory">
                <DebugProducePalette
                  onItemDragEnd={clearDropTargets}
                  onPresetDragStart={workbenchDnd.handleDebugProducePresetDragStart}
                  presets={debugProducePresets}
                />
              </div>
            ) : null}
          </div>

          <section className="overflow-hidden rounded-[2.25rem] border border-white/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.75),rgba(255,255,255,0.55))] p-4 shadow-[0_28px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:p-6">
            <div className="rounded-[1.6rem] border border-white/70 bg-white/65 px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Custom layout
                </p>
                <p className="min-w-0 truncate text-sm text-slate-600">
                  {isCommandPending ? `${statusMessage} Syncing...` : statusMessage}
                </p>
              </div>
            </div>

            <div
              className={`relative mt-4 overflow-hidden rounded-[2rem] border border-dashed bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.75),rgba(248,250,252,0.7)_40%,rgba(226,232,240,0.55)_100%)] transition-colors ${
                isDropTargetHighlighted("workspace_canvas")
                  ? "border-sky-300/90 ring-2 ring-sky-200/80"
                  : "border-slate-300/80"
              }`}
              data-drop-highlighted={isDropTargetHighlighted("workspace_canvas") ? "true" : "false"}
              data-testid="widget-workspace"
              onDragOverCapture={handleWorkspaceDragOver}
              onDropCapture={handleWorkspaceDrop}
              ref={workspaceRef}
              style={{ cursor: workspaceCursor, minHeight: workspaceHeight }}
            >
              <div
                className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:32px_32px]"
                data-testid="workspace-drop-surface-grid"
              />
              <div
                className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_26%)]"
                data-testid="workspace-drop-surface-glow"
              />

              <FloatingWidget
                id="trash"
                isActive={activeWidgetId === "trash"}
                label="Trash Widget"
                onDragStart={(widgetId, event) => {
                  if (dndDisabledByAction) return;
                  handleWidgetDragStart(widgetId, event);
                }}
                onHeightChange={handleWidgetHeightChange}
                position={widgetLayout.trash}
                zIndex={10 + widgetOrder.indexOf("trash")}
              >
                <TrashWidget
                  dndDisabled={dndDisabledByAction}
                  formatProduceLotMetadata={(lot) => formatProduceLotMetadata(lot) ?? ""}
                  isDropHighlighted={isDropTargetHighlighted("trash_bin")}
                  isEmpty={isTrashEmpty}
                  isOpen={isTrashOpen}
                  onDragOver={trashDnd.handleTrashDragOver}
                  onDrop={trashDnd.handleTrashDrop}
                  onItemDragEnd={clearDropTargets}
                  onToggle={() => setIsTrashOpen((current) => !current)}
                  onToolDragStart={trashDnd.handleTrashToolDragStart}
                  onTrashedWidgetDragStart={trashDnd.handleTrashedWidgetDragStart}
                  onTrashProduceLotDragStart={trashDnd.handleTrashProduceLotDragStart}
                  onTrashSampleLabelDragStart={trashDnd.handleTrashSampleLabelDragStart}
                  trashedProduceLots={displayTrashProduceLots}
                  trashedSampleLabels={trashedSampleLabels}
                  trashedTools={displayTrashTools}
                  trashedWidgets={trashedWidgets}
                />
              </FloatingWidget>

              {liveWidgetIds
                .filter(isWorkspaceEquipmentWidgetId)
                .map((widgetId) => (
                  <FloatingWidget
                    id={widgetId}
                    isActive={activeWidgetId === widgetId}
                    key={widgetId}
                    label={
                      widgetId === "lims"
                        ? "LIMS Widget"
                        : widgetId === "rack"
                          ? "Rack Widget"
                          : widgetId === "instrument"
                            ? "Instrument Widget"
                            : widgetId === "grinder"
                              ? "Grinder Widget"
                              : widgetId === "gross_balance"
                                ? "Gross Balance Widget"
                                : "Produce Basket Widget"
                    }
                    onDragStart={(widgetId, event) => {
                      if (dndDisabledByAction) return;
                      handleWidgetDragStart(widgetId, event);
                    }}
                    onHeightChange={handleWidgetHeightChange}
                    position={widgetLayout[widgetId]}
                    zIndex={10 + widgetOrder.indexOf(widgetId)}
                  >
                    {widgetId === "lims" ? (
                      <LimsWidget
                        entries={experiment.limsEntries}
                        onPrintLabel={onPrintLimsLabel}
                        onSaveReception={handleSaveLimsReception}
                        onTicketDragEnd={clearDropTargets}
                        onTicketDragStart={workbenchDnd.handleLimsTicketDragStart}
                        reception={experiment.limsReception}
                      />
                    ) : widgetId === "basket" ? (
                      <ProduceBasketWidget
                        basketTool={displayBasketTool}
                        dndDisabled={dndDisabledByAction}
                        formatProduceLotMetadata={(lot) => formatProduceLotMetadata(lot) ?? ""}
                        isOpen={isBasketOpen}
                        onBagDragStart={workbenchDnd.handleBasketToolDragStart}
                        onCreateAppleLot={handleCreateAppleLot}
                        onItemDragEnd={clearDropTargets}
                        onProduceDragStart={workbenchDnd.handleBasketProduceDragStart}
                        onToggle={() => setIsBasketOpen((current) => !current)}
                        produceLots={displayBasketProduceLots}
                      />
                    ) : widgetId === "gross_balance" ? (
                      <GrossBalanceWidget
                        isDropHighlighted={isDropTargetHighlighted("gross_balance_widget")}
                        grossMassOffsetG={experiment.limsReception.grossMassOffsetG}
                        measuredGrossMassG={experiment.limsReception.measuredGrossMassG}
                        netMassG={grossBalanceNetMassG}
                        onCommitOffset={onCommitGrossBalanceOffset}
                        onDragOver={grossBalanceDnd.handleGrossBalanceDragOver}
                        onDrop={grossBalanceDnd.handleGrossBalanceDrop}
                        stagedContent={grossBalanceStagedContent}
                      />
                    ) : widgetId === "analytical_balance" ? (
                      <AnalyticalBalanceWidget
                        isDropHighlighted={isDropTargetHighlighted("analytical_balance_widget")}
                        measuredMassG={analyticalBalanceMeasuredMassG}
                        netMassG={analyticalBalanceNetMassG}
                        onDragOver={analyticalBalanceDnd.handleAnalyticalBalanceDragOver}
                        onDrop={analyticalBalanceDnd.handleAnalyticalBalanceDrop}
                        onTare={onTareAnalyticalBalance}
                        stagedContent={analyticalBalanceStagedContent}
                        tareMassG={experiment.analyticalBalance.tareMassG}
                      />
                    ) : widgetId === "rack" ? (
                      <RackWidget
                        dndDisabled={dndDisabledByAction}
                        getSlotPosition={getRackIllustrationSlotPosition}
                        isSlotHighlighted={isRackSlotHighlighted}
                        loadedCount={rackLoadedCount}
                        occupiedSlotLiquids={rackOccupiedSlotLiquids}
                        occupiedSlots={rackOccupiedSlots}
                        onItemDragEnd={clearDropTargets}
                        onRackSlotDragOver={rackDnd.handleRackSlotDragOver}
                        onRackSlotDrop={rackDnd.handleRackSlotDrop}
                        onRackToolDragStart={rackDnd.handleRackToolDragStart}
                        rackSlots={displayRackSlots}
                        slotCount={rackSlotCount}
                      />
                    ) : widgetId === "instrument" ? (
                      <WorkspaceEquipmentWidget
                        eyebrow="LC-MS/MS"
                        footer={
                          instrumentStatus === "ready"
                            ? "The instrument reads as sequence-ready because the rack now contains at least one autosampler vial."
                            : "Populate the rack with at least one autosampler vial to switch the instrument preview into a ready state."
                        }
                      >
                        <LcMsMsInstrumentIllustration
                          className="mx-auto max-w-[36rem]"
                          status={instrumentStatus}
                          testId="lc-msms-instrument-illustration"
                        />
                      </WorkspaceEquipmentWidget>
                    ) : (
                      <WorkspaceEquipmentWidget
                        dataDropHighlighted={isDropTargetHighlighted("grinder_widget") ? "true" : "false"}
                        dropZoneTestId="grinder-dropzone"
                        eyebrow="Cryogenic grinder"
                        onDragOver={grinderDnd.handleGrinderDragOver}
                        onDrop={grinderDnd.handleGrinderDrop}
                      >
                        <GrinderWidgetContent
                          formatProduceLotMetadata={formatProduceLotMetadata}
                          grinder={grinderDnd}
                          isCommandPending={isCommandPending}
                          onCancelDropDraft={() => setPendingDropDraft(null)}
                          onChangeDropDraftField={handleUpdateDropDraftField}
                          onConfirmDropDraft={handleConfirmDropDraft}
                          onDragEnd={clearDropTargets}
                        />
                      </WorkspaceEquipmentWidget>
                    )}
                  </FloatingWidget>
                ))}

              <FloatingWidget
                id="workbench"
                isActive={activeWidgetId === "workbench"}
                label="Workbench Widget"
                onDragStart={(widgetId, event) => {
                  if (dndDisabledByAction) return;
                  handleWidgetDragStart(widgetId, event);
                }}
                onHeightChange={handleWidgetHeightChange}
                position={widgetLayout.workbench}
                zIndex={5}
              >
                <WorkbenchPanel
                  dndDisabled={dndDisabledByAction}
                  onAddWorkbenchSlot={handleAddWorkbenchSlot}
                  onApplyLimsLabelTicket={(slotId) => handleApplyLimsLabelTicket({ slotId })}
                  onApplySampleLabel={handleApplySampleLabel}
                  canApplyLimsLabelTicketToSlot={canApplyLimsLabelToSlot}
                  canDragBenchTool={workbenchDnd.canDragBenchTool}
                  isBenchSlotHighlighted={isBenchSlotHighlighted}
                  onBenchToolClick={handleSpatulaToolCardClick}
                  onBenchToolDragEnd={clearDropTargets}
                  onBenchToolIllustrationClick={handleSpatulaToolIllustrationClick}
                  onBenchToolPointerDown={handleSpatulaToolPointerDown}
                  onBenchToolPointerUp={handleSpatulaToolPointerUp}
                  onBenchToolDragStart={workbenchDnd.handleBenchToolDragStart}
                  onBenchToolDrop={workbenchDnd.handleBenchToolDrop}
                  onProduceLotClick={workbenchDnd.handleWorkbenchProduceLotClick}
                  onMoveSampleLabel={handleMoveSampleLabel}
                  onProduceLotDragStart={workbenchDnd.handleWorkbenchProduceLotDragStart}
                  onProduceDrop={workbenchDnd.handleProduceDrop}
                  onRemoveLiquid={handleRemoveLiquid}
                  onRemoveWorkbenchSlot={handleRemoveWorkbenchSlot}
                  onRestoreTrashedSampleLabel={handleRestoreTrashedSampleLabel}
                  onSampleLabelDragEnd={clearDropTargets}
                  onSampleLabelDragStart={workbenchDnd.handleWorkbenchSampleLabelDragStart}
                  onSampleLabelTextChange={handleSampleLabelTextChange}
                  onToggleToolSeal={handleToggleToolSeal}
                  renderPendingContent={(slot) => renderPendingBenchDropDraft(slot.id)}
                  slots={displaySlots}
                  statusMessage={statusMessage}
                  onToolbarItemDrop={handleToolbarItemDrop}
                />
              </FloatingWidget>
            </div>
          </section>

          <div className="xl:sticky xl:top-6 xl:self-start" data-testid="widget-actions">
            <ActionBarPanel
              activeActionId={activeActionId}
              helperText={isSpatulaMode ? spatulaHintMessage : null}
              onToggleAction={(actionId) => {
                clearDropTargets();
                stopSpatulaPour();
                setActiveActionId((current) => (current === actionId ? null : actionId));
              }}
              spatulaLoaded={spatula.isLoaded}
            />
          </div>
        </div>
      </div>
      {isSpatulaMode && spatulaCursorPosition ? (
        <div
          className="pointer-events-none fixed z-[80] h-7 w-20"
          style={{
            left: spatulaCursorPosition.x + 8,
            top: spatulaCursorPosition.y - 20,
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
      ) : null}
    </main>
  );
}

