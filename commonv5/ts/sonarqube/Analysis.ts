import * as tl from "azure-pipelines-task-lib/task";
import { formatMeasure } from "../helpers/measures";
import { EndpointType } from "./Endpoint";
import { AnalysisResult, ProjectStatus } from "./types";

const qualityGateColor = (status: string) => {
  return (
    {
      OK: "#6EB712",
      WARN: "#F5B840",
      ERROR: "#D92D20",
    }[status] ?? "#b4b4b4"
  );
};

const textStyle = (color = "#3E4357") =>
  `
  color: ${color};
  font-family: Inter;
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: normal;
  letter-spacing: -0.14px;`.trim();

const measureStyle = (backgroundColor: string) =>
  `background-color: ${backgroundColor};
  padding: 4px 8px;
  margin: 0px 4px;
  color: #fff;
  letter-spacing: -0.12px;
  line-height: normal;
  font-weight: 500;
  font-size: 12px;`.trim();

const separatorStyle = `
  background: #EBECF0;
  height: 1px;
  margin: 16px 0px;`.trim();

export default class Analysis {
  private readonly endpointType: EndpointType;
  private readonly projectStatus: ProjectStatus;
  private readonly result: AnalysisResult;

  public static getAnalysis(
    endpointType: EndpointType,
    projectStatus: ProjectStatus,
    result: AnalysisResult,
  ): Analysis {
    return new Analysis(endpointType, projectStatus, result);
  }

  constructor(endpointType: EndpointType, projectStatus: ProjectStatus, result: AnalysisResult) {
    this.endpointType = endpointType;
    this.projectStatus = projectStatus;
    this.result = result;
  }

  public getFailedConditions() {
    return this.projectStatus.conditions.filter((condition) =>
      ["WARN", "ERROR"].includes(condition.status.toUpperCase()),
    );
  }

  public getHtmlAnalysisReport() {
    tl.debug("[SQ] Generate analysis report.");

    return [
      this.getHtmlQualityGateSection(),
      this.getHtmlSeparator(),
      this.getHtmlQualityGateDetailSection(),
      this.getHtmlDashboardLink(),
      this.getHtmlWarnings(),
    ].join("");
  }

  private getHtmlSeparator() {
    return `
    <div style="${separatorStyle}"></div>
    `.trim();
  }

  private getHtmlQualityGateSection() {
    return `
    <div style="${textStyle()}">
      <span>${this.result.projectName ? this.result.projectName + " " : ""}Quality Gate</span>
      <span style="${measureStyle(qualityGateColor(this.projectStatus.status))}">
        ${formatMeasure(this.projectStatus.status, "LEVEL")}
      </span>
    </div>
    `.trim();
  }

  private getHtmlQualityGateDetailSection() {
    const failedConditions = this.getFailedConditions();
    if (
      !this.result.metrics ||
      !["WARN", "ERROR"].includes(this.projectStatus.status) ||
      failedConditions.length <= 0
    ) {
      return "";
    }

    const rows = failedConditions.map((condition) => {
      const metric = this.result.metrics?.getMetricByKey(condition.metricKey);
      if (!metric) {
        return null;
      }

      const threshold =
        condition.status === "WARN" ? condition.warningThreshold : condition.errorThreshold;
      return `
      <li style="list-style: none; margin-top: 13px;">
        <span>${metric.name}</span>
        <span style="${measureStyle(qualityGateColor(this.projectStatus.status))}">
          ${formatMeasure(condition.actualValue, metric.type)}</span>
        <span>(required ${
          metric.type !== "RATING" ? formatMeasure(condition.comparator, "COMPARATOR") + " " : ""
        }${formatMeasure(threshold, metric.type)})</span>
      </li>
      `.trim();
    });

    return `
    <ul style="${textStyle()}">
      ${rows.join(" \r\n").trim()}
    </ul>\r\n\r\n
    `.trim(); // 2 carriage returns to prevent any malformed summary results
  }

  private getHtmlDashboardLink() {
    if (!this.result.dashboardUrl) {
      return "";
    }

    return `
    <div style="margin-top: 16px;">
      <a href="${this.result.dashboardUrl}" style="${textStyle("#5D6CD0")}">
      Detailed ${this.endpointType} report
      <span class="bowtie-icon bowtie-navigate-external" style="color: #5D6CD0; font-size: 20px; vertical-align: middle;"></span>
      </a>
    </div>
    `.trim();
  }

  public getHtmlWarnings() {
    if (this.result.warnings.some((w) => w.includes("Please update to at least Java 11"))) {
      return `
      <br>
      <span>&#9888;</span>
      <b>
        ${this.result.warnings.find((w) => w.includes("Please update to at least Java 11"))}
      </b>
      `.trim();
    } else {
      return "";
    }
  }
}
