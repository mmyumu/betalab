import type {
  LiquidType,
  DropTargetType,
  ExperimentWorkspaceWidgetId,
  ToolType,
} from "@/types/workbench";

export function getToolDropTargets(toolType: ToolType): DropTargetType[] {
  const targets: DropTargetType[] = ["workbench_slot", "trash_bin", "gross_balance_widget"];

  if (toolType === "sample_vial") {
    targets.splice(1, 0, "rack_slot");
  }
  if (toolType === "centrifuge_tube") {
    targets.push("analytical_balance_widget");
  }

  return targets;
}

export function canToolAcceptLiquids(toolType: ToolType): boolean {
  return toolType !== "sample_bag" && toolType !== "cutting_board" && toolType !== "storage_jar";
}

export function canToolAcceptProduce(toolType: ToolType): boolean {
  return toolType === "sample_bag" || toolType === "cutting_board" || toolType === "storage_jar";
}

export function canToolBeSealed(toolType: ToolType): boolean {
  return (
    toolType === "sample_bag" ||
    toolType === "storage_jar" ||
    toolType === "centrifuge_tube" ||
    toolType === "cleanup_tube" ||
    toolType === "sample_vial"
  );
}

export function canToolReceiveContents(toolType: ToolType, isSealed = false): boolean {
  return !canToolBeSealed(toolType) || !isSealed;
}

export function getProduceLotDropTargets(): DropTargetType[] {
  return ["workbench_slot", "grinder_widget", "trash_bin", "gross_balance_widget"];
}

export function getSampleLabelDropTargets(): DropTargetType[] {
  return ["workbench_slot", "trash_bin"];
}

export function getLimsLabelTicketDropTargets(): DropTargetType[] {
  return ["sample_bag_tool", "trash_bin"];
}

export function getLiquidDropTargets(liquidType: LiquidType): DropTargetType[] {
  if (liquidType === "dry_ice_pellets") {
    return ["grinder_widget"];
  }

  return ["workbench_slot"];
}

export function isWorkspaceWidgetDiscardable(widgetId: ExperimentWorkspaceWidgetId): boolean {
  return (
      widgetId === "rack" ||
      widgetId === "instrument" ||
      widgetId === "grinder" ||
      widgetId === "gross_balance" ||
      widgetId === "analytical_balance"
  );
}

export function getWorkspaceWidgetDropTargets(
  widgetId: ExperimentWorkspaceWidgetId,
): DropTargetType[] {
  return isWorkspaceWidgetDiscardable(widgetId)
    ? ["workspace_canvas", "trash_bin"]
    : ["workspace_canvas"];
}
