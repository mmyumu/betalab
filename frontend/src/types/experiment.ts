import type {
  BenchSlot,
  ExperimentProduceLot,
  ExperimentWorkspaceWidget,
  RackSlot,
  TrashToolEntry,
} from "@/types/workbench";

export type ExperimentWorkbench = {
  slots: BenchSlot[];
};

export type ExperimentRack = {
  slots: RackSlot[];
};

export type ExperimentTrash = {
  tools: TrashToolEntry[];
};

export type ExperimentWorkspace = {
  produceLots: ExperimentProduceLot[];
  widgets: ExperimentWorkspaceWidget[];
};

export type Experiment = {
  id: string;
  status: string;
  workbench: ExperimentWorkbench;
  rack: ExperimentRack;
  trash: ExperimentTrash;
  workspace: ExperimentWorkspace;
  audit_log: string[];
};
