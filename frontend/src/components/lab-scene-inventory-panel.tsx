"use client";

import { DebugProducePalette, type DebugProducePreset } from "@/components/debug-produce-palette";
import { ToolbarPanel } from "@/components/toolbar-panel";
import type { WorkbenchDndApi } from "@/hooks/use-workbench-dnd";
import { labWorkflowCategories } from "@/lib/lab-workflow-catalog";
import { createToolbarDragPayload, toDragDescriptor } from "@/lib/workbench-dnd";
import type { DragDescriptor, DropTargetType } from "@/types/workbench";

type LabSceneInventoryPanelProps = {
  debug: {
    debugInventoryEnabled: boolean;
    debugProducePresets: DebugProducePreset[];
  };
  dnd: {
    clearDropTargets: () => void;
    dndDisabledByAction: boolean;
    setActiveDragItem: (item: DragDescriptor | null) => void;
    showDropTargets: (targets: readonly DropTargetType[]) => void;
    workbench: Pick<WorkbenchDndApi, "handleDebugProducePresetDragStart">;
  };
};

export function LabSceneInventoryPanel({ debug, dnd }: LabSceneInventoryPanelProps) {
  return (
    <div className="space-y-4 xl:sticky xl:top-6 xl:self-start" data-testid="widget-inventory">
      <div>
        <ToolbarPanel
          categories={labWorkflowCategories}
          dragDisabled={dnd.dndDisabledByAction}
          onItemDragEnd={dnd.clearDropTargets}
          onItemDragStart={(item, allowedDropTargets) => {
            if (dnd.dndDisabledByAction) return;
            const payload = createToolbarDragPayload(item);
            dnd.showDropTargets(allowedDropTargets);
            dnd.setActiveDragItem(toDragDescriptor(payload));
          }}
        />
      </div>
      {debug.debugInventoryEnabled ? (
        <div data-testid="widget-debug-inventory">
          <DebugProducePalette
            onItemDragEnd={dnd.clearDropTargets}
            onPresetDragStart={dnd.workbench.handleDebugProducePresetDragStart}
            presets={debug.debugProducePresets}
          />
        </div>
      ) : null}
    </div>
  );
}
