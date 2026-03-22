import type { BenchSlot } from "@/types/workbench";

export type ExperimentWorkbench = {
  slots: BenchSlot[];
};

export type Experiment = {
  id: string;
  status: string;
  workbench: ExperimentWorkbench;
  audit_log: string[];
};
