import type { DragEvent } from "react";

import { resolveLabelDropCommand } from "@/lib/label-drop-command-resolver";
import { canResolveLabelDropOnTool, readLabelDragPayload } from "@/lib/label-drop-resolver";
import { labLiquidCatalog } from "@/lib/lab-workflow-catalog";
import { executeAnalyticalBalanceLabelDropCommand } from "@/lib/label-drop-command-executor";
import { executeAnalyticalBalanceToolDropCommand } from "@/lib/tool-drop-command-executor";
import { resolveToolDropCommand } from "@/lib/tool-drop-command-resolver";
import { canResolveDropOnTool } from "@/lib/tool-drop-resolver";
import {
  hasCompatibleDropTarget,
  readAnalyticalBalanceToolDragPayload,
  readBenchToolDragPayload,
  readGrossBalanceToolDragPayload,
  readRackToolDragPayload,
  readToolbarDragPayload,
  readTrashToolDragPayload,
  toDragDescriptor,
  writeAnalyticalBalanceToolDragPayload,
} from "@/lib/workbench-dnd";
import type { DropDraft } from "@/hooks/use-drop-draft";
import type { AnalyticalBalanceToolDragPayload, BenchToolInstance } from "@/types/workbench";
import type { DragStateApi } from "@/hooks/use-drag-state";
import type {
  AddLiquidToAnalyticalBalanceToolPayload,
  MoveRackToolToAnalyticalBalancePayload,
  MoveWorkbenchToolToAnalyticalBalancePayload,
  PlaceToolOnAnalyticalBalancePayload,
  RestoreTrashedToolToAnalyticalBalancePayload,
} from "@/types/api-payloads";

type AnalyticalBalanceDndExperimentApi = {
  addLiquidToAnalyticalBalanceTool: (payload: AddLiquidToAnalyticalBalanceToolPayload) => void;
  applyPrintedLimsLabelToAnalyticalBalanceTool: () => void;
  applySampleLabelToAnalyticalBalanceTool: () => void;
  moveGrossBalanceToolToAnalyticalBalance: () => void;
  moveRackToolToAnalyticalBalance: (payload: MoveRackToolToAnalyticalBalancePayload) => void;
  moveWorkbenchSampleLabelToAnalyticalBalance: (payload: {
    source_slot_id: string;
    label_id: string;
  }) => void;
  moveWorkbenchToolToAnalyticalBalance: (payload: MoveWorkbenchToolToAnalyticalBalancePayload) => void;
  placeToolOnAnalyticalBalance: (payload: PlaceToolOnAnalyticalBalancePayload) => void;
  restoreTrashedSampleLabelToAnalyticalBalance: (payload: {
    trash_sample_label_id: string;
  }) => void;
  restoreTrashedToolToAnalyticalBalance: (payload: RestoreTrashedToolToAnalyticalBalancePayload) => void;
  updateAnalyticalBalanceToolSampleLabelText: (payload: {
    label_id: string;
    sample_label_text: string;
  }) => void;
};

type AnalyticalBalanceDndOptions = {
  analyticalBalanceTool: BenchToolInstance | null;
  dndDisabledByAction: boolean;
  dragState: Pick<DragStateApi, "clearDropTargets" | "setActiveDragItem" | "showDropTargets">;
  experimentApi: AnalyticalBalanceDndExperimentApi;
  setPendingDropDraft: (draft: DropDraft | null) => void;
};

export type AnalyticalBalanceDndApi = {
  handleAnalyticalBalanceDragOver: (event: DragEvent<HTMLElement>) => void;
  handleAnalyticalBalanceDrop: (event: DragEvent<HTMLElement>) => void;
  handleAnalyticalBalanceItemDragStart: (dataTransfer: DataTransfer) => void;
  handleAnalyticalBalanceSampleLabelTextChange: (
    labelId: string,
    sampleLabelText: string,
  ) => void;
};

export function useAnalyticalBalanceDnd({
  analyticalBalanceTool,
  dndDisabledByAction,
  dragState,
  experimentApi,
  setPendingDropDraft,
}: AnalyticalBalanceDndOptions): AnalyticalBalanceDndApi {
  const { clearDropTargets, setActiveDragItem, showDropTargets } = dragState;

  const handleAnalyticalBalanceDragOver = (event: DragEvent<HTMLElement>) => {
    if (dndDisabledByAction) {
      return;
    }
    if (
      canResolveDropOnTool(event.dataTransfer, {
        parentDropTargetTypes: ["analytical_balance_widget"],
        tool: analyticalBalanceTool,
      })
    ) {
      event.preventDefault();
      return;
    }

    if (hasCompatibleDropTarget(event.dataTransfer, "analytical_balance_widget")) {
      event.preventDefault();
    }
  };

  const handleAnalyticalBalanceDrop = (event: DragEvent<HTMLElement>) => {
    if (dndDisabledByAction) {
      return;
    }
    const labelDragPayload = readLabelDragPayload(event.dataTransfer);
    if (
      labelDragPayload &&
      canResolveLabelDropOnTool(event.dataTransfer, {
        parentDropTargetTypes: ["analytical_balance_widget"],
        tool: analyticalBalanceTool,
      })
    ) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();

      const command = resolveLabelDropCommand(labelDragPayload, { kind: "analytical_balance" });
      if (!command) {
        return;
      }

      executeAnalyticalBalanceLabelDropCommand(command, experimentApi);
      return;
    }

    const toolbarPayload = readToolbarDragPayload(event.dataTransfer);
    if (
      toolbarPayload?.itemType === "liquid" &&
      canResolveDropOnTool(event.dataTransfer, {
        parentDropTargetTypes: ["analytical_balance_widget"],
        tool: analyticalBalanceTool,
      })
    ) {
      event.preventDefault();
      event.stopPropagation();
      clearDropTargets();

      const liquidDefinition = labLiquidCatalog[toolbarPayload.itemId];
      setPendingDropDraft({
        commandType: "add_liquid_to_analytical_balance_tool",
        fields: [
          {
            ariaLabel: `${liquidDefinition?.name ?? "Liquid"} draft volume`,
            id: "volume_ml",
            inputStep: 0.1,
            label: "Volume",
            stepAmount: 1,
            unitLabel: "mL",
            value: liquidDefinition?.transfer_volume_ml ?? 0,
            wheelStep: 1,
          },
        ],
        itemId: toolbarPayload.itemId,
        targetId: "analytical_balance",
        targetKind: "workspace_widget",
        title: `Dose ${liquidDefinition?.name ?? "Liquid"}`,
      });
      return;
    }

    if (!hasCompatibleDropTarget(event.dataTransfer, "analytical_balance_widget")) {
      return;
    }

    const toolPayload =
      (toolbarPayload?.itemType === "tool" ? toolbarPayload : null) ??
      readBenchToolDragPayload(event.dataTransfer) ??
      readGrossBalanceToolDragPayload(event.dataTransfer) ??
      readRackToolDragPayload(event.dataTransfer) ??
      readTrashToolDragPayload(event.dataTransfer) ??
      readAnalyticalBalanceToolDragPayload(event.dataTransfer);

    if (!toolPayload) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    clearDropTargets();

    const command = resolveToolDropCommand(toolPayload, { kind: "analytical_balance" });
    if (!command) {
      return;
    }
    executeAnalyticalBalanceToolDropCommand(command, experimentApi);
  };

  const handleAnalyticalBalanceItemDragStart = (dataTransfer: DataTransfer) => {
    if (!analyticalBalanceTool) {
      return;
    }
    if (analyticalBalanceTool.isDraggable === false) {
      return;
    }

    const allowedDropTargets = analyticalBalanceTool.allowedDropTargets ?? [];
    const payload: AnalyticalBalanceToolDragPayload = {
      allowedDropTargets,
      entityKind: "tool",
      sourceId: "analytical_balance",
      sourceKind: "analytical_balance",
      toolId: analyticalBalanceTool.toolId,
      toolType: analyticalBalanceTool.toolType,
    };

    writeAnalyticalBalanceToolDragPayload(dataTransfer, payload);
    showDropTargets(allowedDropTargets);
    setActiveDragItem(toDragDescriptor(payload));
  };

  const handleAnalyticalBalanceSampleLabelTextChange = (
    labelId: string,
    sampleLabelText: string,
  ) => {
    void experimentApi.updateAnalyticalBalanceToolSampleLabelText({
      label_id: labelId,
      sample_label_text: sampleLabelText,
    });
  };

  return {
    handleAnalyticalBalanceDragOver,
    handleAnalyticalBalanceDrop,
    handleAnalyticalBalanceItemDragStart,
    handleAnalyticalBalanceSampleLabelTextChange,
  };
}
