import type { BenchSlot, RackSlot } from "@/types/workbench";

export type ExperimentWorkbench = {
  slots: BenchSlot[];
};

export type ExperimentRack = {
  slots: RackSlot[];
};

export type Experiment = {
  id: string;
  status: string;
  workbench: ExperimentWorkbench;
  rack: ExperimentRack;
  audit_log: string[];
};
