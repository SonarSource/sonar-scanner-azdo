import * as tl from "azure-pipelines-task-lib/task";
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
import { formatMeasure } from "../helpers/measures";
import { AnalysisResult, ProjectStatus } from "./types";

export default class HtmlAnalysisReport {
  private readonly projectStatus: ProjectStatus;
  private readonly result: AnalysisResult;

  public static getInstance(
    projectStatus: ProjectStatus,
    result: AnalysisResult,
  ): HtmlAnalysisReport {
    return new HtmlAnalysisReport(projectStatus, result);
  }

  constructor(projectStatus: ProjectStatus, result: AnalysisResult) {
    this.projectStatus = projectStatus;
    this.result = result;
  }

  public getFailedConditions() {
    return this.projectStatus.conditions.filter((condition) =>
      ["WARN", "ERROR"].includes(condition.status.toUpperCase()),
    );
  }

  public getHtmlAnalysisReport() {
    tl.debug("Generate analysis report.");

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
    const rows = this.getFailedConditions().map((condition) => {
      const metric = this.result.metrics.find((metric) => metric.key === condition.metricKey);
      if (!metric) {
        return null;
      }
      const threshold =
        condition.status === "WARN" ? condition.warningThreshold : condition.errorThreshold;
      const requiredContent =
        (metric.type !== "RATING" ? formatMeasure(condition.comparator, "COMPARATOR") + " " : "") +
        formatMeasure(threshold, metric.type);

      return htmlMetricListItem(
        "❌",
        `${formatMeasure(condition.actualValue, metric.type)} ${metric.name}`,
        requiredContent,
      );
    });

    return rows.length > 0 ? htmlSectionDiv("Failed Conditions", htmlMetricList(rows)) : "";
  }

  private getHtmlQualityGateDetailSection() {
    if (!this.result.metrics) {
      return "";
    }

    if (["WARN", "ERROR"].includes(this.projectStatus.status)) {
      return this.getHtmlQualityGateDetailFailedSection();
    } else {
      return "";
    }
  }

  private getHtmlDashboardLink() {
    if (!this.result.dashboardUrl) {
      return "";
    }

    return htmlDiv(
      `margin-top: 24px;
      padding-left: 28px;`,
      htmlLink("", this.result.dashboardUrl, "See analysis details on SonarQube"),
    );
  }
}
