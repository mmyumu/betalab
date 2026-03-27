import type {
  DropTargetType,
  ExperimentWorkspaceWidgetId,
  ToolType,
} from "@/types/workbench";

export function getToolDropTargets(toolType: ToolType): DropTargetType[] {
  const targets: DropTargetType[] = ["workbench_slot", "trash_bin"];

  if (toolType === "sample_vial") {
    targets.splice(1, 0, "rack_slot");
  }

  return targets;
}

export function canToolAcceptLiquids(toolType: ToolType): boolean {
  return toolType !== "sample_bag" && toolType !== "cutting_board";
}

export function canToolAcceptProduce(toolType: ToolType): boolean {
  return toolType === "sample_bag" || toolType === "cutting_board";
}

export function getProduceLotDropTargets(): DropTargetType[] {
  return ["workbench_slot", "trash_bin"];
}

export function getSampleLabelDropTargets(): DropTargetType[] {
  return ["workbench_slot", "trash_bin"];
}

export function isWorkspaceWidgetDiscardable(widgetId: ExperimentWorkspaceWidgetId): boolean {
  return widgetId === "rack" || widgetId === "instrument" || widgetId === "grinder";
}

export function getWorkspaceWidgetDropTargets(
  widgetId: ExperimentWorkspaceWidgetId,
): DropTargetType[] {
  return isWorkspaceWidgetDiscardable(widgetId)
    ? ["workspace_canvas", "trash_bin"]
    : ["workspace_canvas"];
}
