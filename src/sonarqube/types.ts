export type ProjectStatus = {
  status: string;
  conditions: Condition[];
};

export type AnalysisResult = {
  dashboardUrl?: string;
  projectName?: string;
  metrics?: Metric[];
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

export type Metric = {
  custom?: boolean;
  decimalScale?: number;
  description?: string;
  direction?: number;
  domain?: string;
  hidden?: boolean;
  key: string;
  name: string;
  qualitative?: boolean;
  type: string;
};

export type MetricsResponse = {
  metrics: Metric[];
  p: number;
  ps: number;
  total: number;
};

export interface PeriodMeasure {
  bestValue?: boolean;
  index: number;
  value: string;
}

export interface Measure {
  metric: string;
  bestValue?: boolean;
  period?: PeriodMeasure;
  value?: string;
}

export interface MeasureResponse {
  component: {
    measures: Measure[];
  };
  [key: string]: unknown;
}
