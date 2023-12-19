import Metrics from "./Metrics";

export type ProjectStatus = {
  status: string;
  conditions: Condition[];
};

export type AnalysisResult = {
  dashboardUrl?: string;
  projectName?: string;
  metrics?: Metrics;
  warnings: string[];
};

export type Condition = {
  status: string;
  metricKey: string;
  actualValue?: string;
  comparator?: string;
  periodIndex?: number;
  errorThreshold?: string;
  warningThreshold?: string;
};
