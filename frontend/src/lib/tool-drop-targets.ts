import type { DropTargetType, ToolType } from "@/types/workbench";

export function getToolDropTargets(
  toolType: ToolType,
  options?: { includeTrash?: boolean },
): DropTargetType[] {
  const targets: DropTargetType[] = ["workbench_slot"];

  if (toolType === "sample_vial") {
    targets.push("rack_slot");
  }

  if (options?.includeTrash) {
    targets.push("trash_bin");
  }

  return targets;
}

export function getProduceLotDropTargets(): DropTargetType[] {
  return ["workbench_slot", "trash_bin"];
}

export function getSampleLabelDropTargets(): DropTargetType[] {
  return ["workbench_slot", "trash_bin"];
}
