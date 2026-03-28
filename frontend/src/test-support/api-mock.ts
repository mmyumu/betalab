import { vi } from "vitest";

import type { Experiment } from "@/types/experiment";

export const createExperiment = vi.fn<() => Promise<Experiment>>();
export const sendExperimentCommand = vi.fn<
  (experimentId: string, type: string, payload: Record<string, unknown>) => Promise<Experiment>
>();

function wrapCommand(type: string, buildPayload?: (payload?: Record<string, unknown>) => Record<string, unknown>) {
  return vi.fn((experimentId: string, payload?: Record<string, unknown>) =>
    sendExperimentCommand(experimentId, type, buildPayload ? buildPayload(payload) : payload ?? {}),
  );
}

export const addWorkbenchSlot = vi.fn((experimentId: string) =>
  sendExperimentCommand(experimentId, "add_workbench_slot", {}),
);
export const removeWorkbenchSlot = wrapCommand("remove_workbench_slot");
export const placeToolOnWorkbench = wrapCommand("place_tool_on_workbench");
export const moveToolBetweenWorkbenchSlots = wrapCommand("move_tool_between_workbench_slots");
export const discardWorkbenchTool = wrapCommand("discard_workbench_tool");
export const discardToolFromPalette = wrapCommand("discard_tool_from_palette");
export const discardSampleLabelFromPalette = wrapCommand("discard_sample_label_from_palette");
export const restoreTrashedToolToWorkbenchSlot = wrapCommand("restore_trashed_tool_to_workbench_slot");
export const addWorkspaceWidget = wrapCommand("add_workspace_widget");
export const moveWorkspaceWidget = wrapCommand("move_workspace_widget");
export const discardWorkspaceWidget = wrapCommand("discard_workspace_widget");
export const addLiquidToWorkspaceWidget = wrapCommand("add_liquid_to_workspace_widget");
export const updateWorkspaceWidgetLiquidVolume = wrapCommand("update_workspace_widget_liquid_volume");
export const removeLiquidFromWorkspaceWidget = wrapCommand("remove_liquid_from_workspace_widget");
export const completeGrinderCycle = wrapCommand("complete_grinder_cycle");
export const advanceWorkspaceCryogenics = wrapCommand("advance_workspace_cryogenics");
export const addWorkspaceProduceLotToWidget = wrapCommand("add_workspace_produce_lot_to_widget");
export const moveWorkbenchProduceLotToWidget = wrapCommand("move_workbench_produce_lot_to_widget");
export const restoreTrashedProduceLotToWidget = wrapCommand("restore_trashed_produce_lot_to_widget");
export const createProduceLot = wrapCommand("create_produce_lot");
export const discardWorkspaceProduceLot = wrapCommand("discard_workspace_produce_lot");
export const moveWidgetProduceLotToWorkbenchTool = wrapCommand("move_widget_produce_lot_to_workbench_tool");
export const discardWidgetProduceLot = wrapCommand("discard_widget_produce_lot");
export const placeToolInRackSlot = wrapCommand("place_tool_in_rack_slot");
export const placeWorkbenchToolInRackSlot = wrapCommand("place_workbench_tool_in_rack_slot");
export const moveRackToolBetweenSlots = wrapCommand("move_rack_tool_between_slots");
export const removeRackToolToWorkbenchSlot = wrapCommand("remove_rack_tool_to_workbench_slot");
export const discardRackTool = wrapCommand("discard_rack_tool");
export const restoreTrashedToolToRackSlot = wrapCommand("restore_trashed_tool_to_rack_slot");
export const addLiquidToWorkbenchTool = wrapCommand("add_liquid_to_workbench_tool");
export const addProduceLotToWorkbenchTool = wrapCommand("add_produce_lot_to_workbench_tool");
export const discardProduceLotFromWorkbenchTool = wrapCommand("discard_produce_lot_from_workbench_tool");
export const cutWorkbenchProduceLot = wrapCommand("cut_workbench_produce_lot");
export const moveProduceLotBetweenWorkbenchTools = wrapCommand("move_produce_lot_between_workbench_tools");
export const restoreTrashedProduceLotToWorkbenchTool = wrapCommand("restore_trashed_produce_lot_to_workbench_tool");
export const removeLiquidFromWorkbenchTool = wrapCommand("remove_liquid_from_workbench_tool");
export const applySampleLabelToWorkbenchTool = wrapCommand("apply_sample_label_to_workbench_tool");
export const updateWorkbenchToolSampleLabelText = wrapCommand("update_workbench_tool_sample_label_text");
export const moveSampleLabelBetweenWorkbenchTools = wrapCommand("move_sample_label_between_workbench_tools");
export const discardSampleLabelFromWorkbenchTool = wrapCommand("discard_sample_label_from_workbench_tool");
export const restoreTrashedSampleLabelToWorkbenchTool = wrapCommand("restore_trashed_sample_label_to_workbench_tool");

export function resetApiMocks() {
  vi.clearAllMocks();
}
