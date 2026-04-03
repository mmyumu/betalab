import type {
  BenchSlot,
  ExperimentProduceLot,
  ExperimentWorkspaceWidget,
  BenchToolInstance,
  RackSlot,
  LimsReception,
  TrashProduceLotEntry,
  TrashSampleLabelEntry,
  TrashToolEntry,
} from "@/types/workbench";

export type ExperimentWorkbench = {
  slots: BenchSlot[];
};

export type ExperimentRack = {
  slots: RackSlot[];
};

export type ExperimentTrash = {
  produceLots: TrashProduceLotEntry[];
  sampleLabels: TrashSampleLabelEntry[];
  tools: TrashToolEntry[];
};

export type ExperimentWorkspace = {
  produceLots: ExperimentProduceLot[];
  widgets: ExperimentWorkspaceWidget[];
};

export type Experiment = {
  id: string;
  status: string;
  last_simulation_at: string;
  snapshot_version: number;
  workbench: ExperimentWorkbench;
  rack: ExperimentRack;
  trash: ExperimentTrash;
  workspace: ExperimentWorkspace;
  limsReception: LimsReception;
  limsEntries: LimsReception[];
  basketTool: BenchToolInstance | null;
  audit_log: string[];
};

export type ExperimentListEntry = {
  id: string;
  status: string;
  last_simulation_at: string;
  snapshot_version: number;
  updated_at: string;
  last_audit_entry: string | null;
};
