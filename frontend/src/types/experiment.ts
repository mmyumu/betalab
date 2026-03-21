export type Transition = {
  id: string;
  q1_mz: number;
  q3_mz: number;
  relative_response: number;
};

export type Molecule = {
  id: string;
  name: string;
  retention_time_min: number;
  response_factor: number;
  expected_ion_ratio: number;
  transitions: Transition[];
};

export type ContentPortion = {
  source_id: string;
  source_type: string;
  name: string;
  volume_ml: number;
  analyte_concentration_ng_ml: number;
  matrix_effect_factor: number;
};

export type Container = {
  id: string;
  kind: string;
  label: string;
  capacity_ml: number;
  current_volume_ml: number;
  contents: ContentPortion[];
  analyte_concentration_ng_ml: number;
  matrix_effect_factor: number;
};

export type Rack = {
  positions: Record<string, string | null>;
};

export type ChromatogramPoint = {
  time_min: number;
  intensity: number;
};

export type TransitionResult = {
  transition_id: string;
  area: number;
  height: number;
  chromatogram_points: ChromatogramPoint[];
};

export type RunResult = {
  observed_retention_time: number;
  transition_results: TransitionResult[];
  estimated_concentration_ng_ml: number;
  warnings: string[];
};

export type Run = {
  id: string;
  source_vial_id: string;
  sample_type: string;
  status: string;
  result: RunResult | null;
};

export type Experiment = {
  id: string;
  scenario_id: string;
  status: string;
  molecule: Molecule;
  containers: Record<string, Container>;
  rack: Rack;
  runs: Run[];
  audit_log: string[];
};
