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

import {
  htmlDiv,
  htmlLink,
  htmlMainDiv,
  htmlMetricList,
  htmlMetricListItem,
  htmlQualityGateHeader,
  htmlSectionDiv,
  htmlSeparator,
} from "../helpers/html";
import { log, LogLevel } from "../helpers/logging";
import { formatMeasure } from "../helpers/measures";
import { EndpointType } from "./Endpoint";
import { AnalysisResult, Measure, ProjectStatus } from "./types";

export default class HtmlAnalysisReport {
  private readonly projectStatus: ProjectStatus;
  private readonly measures: Measure[];
  private readonly result: AnalysisResult;
  private readonly endpointType: EndpointType;

  public static getInstance(
    endpointType: EndpointType,
    projectStatus: ProjectStatus,
    measures: Measure[],
    result: AnalysisResult,
  ): HtmlAnalysisReport {
    return new HtmlAnalysisReport(endpointType, projectStatus, measures, result);
  }

  constructor(
    endpointType: EndpointType,
    projectStatus: ProjectStatus,
    measures: Measure[],
    result: AnalysisResult,
  ) {
    this.projectStatus = projectStatus;
    this.measures = measures;
    this.result = result;
    this.endpointType = endpointType;
  }

  public getFailedConditions() {
    return this.projectStatus.conditions.filter((condition) =>
      ["WARN", "ERROR"].includes(condition.status.toUpperCase()),
    );
  }

  public getHtmlAnalysisReport() {
    log(LogLevel.DEBUG, "Generate analysis report.");

    const html = htmlMainDiv(
      [
        htmlQualityGateHeader(this.projectStatus, this.result.projectName),
        htmlSeparator(),
        this.getHtmlQualityGateDetailSection(),
        this.getHtmlDashboardLink(),
      ].join(""),
    );

    return html;
  }

  private getHtmlQualityGateDetailFailedSection() {
    const rows = this.getFailedConditions()
      .map((condition) => {
        const metric = this.result.metrics?.find((metric) => metric.key === condition.metricKey);
        if (!metric) {
          return null;
        }
        const threshold =
          condition.status === "WARN" ? condition.warningThreshold : condition.errorThreshold;
        const requiredContent =
          (metric.type !== "RATING"
            ? formatMeasure(condition.comparator, "COMPARATOR") + " "
            : "") + formatMeasure(threshold, metric.type);

        return htmlMetricListItem(
          "❌",
          `${formatMeasure(condition.actualValue, metric.type)} ${metric.name}`,
          requiredContent,
        );
      })
      .filter(Boolean) as string[];

    return rows.length > 0 ? htmlSectionDiv("Failed Conditions", htmlMetricList(rows)) : "";
  }

  private getHtmlMeasureListItem(icon: string, metricKey: string, metricName: string) {
    const condition = this.projectStatus.conditions.find((c) => c.metricKey === metricKey);
    const measure = this.measures.find((m) => m.metric === metricKey);
    const metric = this.result.metrics?.find((m) => m.key === metricKey);

    // Try to get the value from the measure, then from the condition
    // There is difference in API response between SonarQube (Server, Cloud)
    // SonarQube Cloud is using periods when SonarQube is using period
    const value =
      measure?.periods?.[0]?.value ??
      measure?.period?.value ??
      measure?.value ??
      condition?.actualValue;

    if (!metric || typeof value === "undefined") {
      return "";
    }

    return htmlMetricListItem(icon, `${formatMeasure(value, metric.type)} ${metricName}`);
  }

  private getHtmlQualityGateDetailPassedSection() {
    const issuesItems = [
      this.getHtmlMeasureListItem("✅", "new_violations", "New issues"),
      this.getHtmlMeasureListItem("🔧", "pull_request_fixed_issues", "Fixed issues"),
      this.getHtmlMeasureListItem("💤", "new_accepted_issues", "Accepted issues"),
    ].filter((item) => item.length > 0);
    const issuesSection =
      issuesItems.length > 0 ? htmlSectionDiv("Issues", htmlMetricList(issuesItems)) : "";

    const measuresItems = [
      this.getHtmlMeasureListItem("✅", "new_security_hotspots", "Security Hotspots"),
      this.getHtmlMeasureListItem("✅", "new_coverage", "Coverage on new code"),
      this.getHtmlMeasureListItem("✅", "new_duplicated_lines_density", "Duplications on new code"),
    ].filter((item) => item.length > 0);
    const measuresSection =
      measuresItems.length > 0 ? htmlSectionDiv("Measures", htmlMetricList(measuresItems)) : "";

    return issuesSection + measuresSection;
  }

  private getHtmlQualityGateDetailSection() {
    if (!this.result.metrics) {
      return "";
    }

    if (["WARN", "ERROR"].includes(this.projectStatus.status)) {
      return this.getHtmlQualityGateDetailFailedSection();
    } else {
      return this.getHtmlQualityGateDetailPassedSection();
    }
  }

  private getHtmlDashboardLink() {
    if (!this.result.dashboardUrl) {
      return "";
    }

    return htmlDiv(
      `margin-top: 24px;
      padding-left: 28px;`,
      htmlLink("", this.result.dashboardUrl, `See analysis details on ${this.endpointType}`),
    );
  }
}
