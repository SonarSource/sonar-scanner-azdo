/*
 * Azure DevOps extension for SonarQube
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

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
  periods?: PeriodMeasure[];
  value?: string;
}

export interface MeasureResponse {
  component: {
    measures: Measure[];
  };
  [key: string]: unknown;
}
