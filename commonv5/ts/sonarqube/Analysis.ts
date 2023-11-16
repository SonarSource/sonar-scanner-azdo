import * as tl from "azure-pipelines-task-lib/task";
import { formatMeasure } from "../helpers/measures";
import { get } from "../helpers/request";
import Endpoint, { EndpointType } from "./Endpoint";
import Metrics from "./Metrics";

interface IAnalysis {
  status: string;
  conditions: Condition[];
}

interface Condition {
  status: string;
  metricKey: string;
  actualValue?: string;
  comparator?: string;
  periodIndex?: number;
  errorThreshold?: string;
  warningThreshold?: string;
}

const textStyle = (color = "#3E4357") => `
  color: ${color};
  font-family: Inter;
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: normal;
  letter-spacing: -0.14px;`;

const measureStyle = (backgroundColor: string) =>
  `background-color: ${backgroundColor};
  padding: 4px 8px;
  margin: 0px 4px;
  color: #fff;
  letter-spacing: -0.12px;
  line-height: normal;
  font-weight: 500;
  font-size: 12px;`;

const separatorStyle = `
  background: #EBECF0;
  height: 1px;
  margin: 16px 0px;`;

export default class Analysis {
  constructor(
    private readonly analysis: IAnalysis,
    private readonly endpointType: EndpointType,
    private readonly warnings: string[],
    private readonly dashboardUrl?: string,
    private readonly metrics?: Metrics,
    private readonly projectName?: string,
  ) {}

  public get status() {
    return this.analysis.status.toUpperCase();
  }

  public get conditions() {
    return this.analysis.conditions;
  }

  public getFailedConditions() {
    return this.conditions.filter((condition) =>
      ["WARN", "ERROR"].includes(condition.status.toUpperCase()),
    );
  }

  public getHtmlAnalysisReport() {
    tl.debug(`[SQ] Generate analysis report.'`);
    return [
      this.getQualityGateSection(),
      this.getSeparator(),
      this.getQualityGateDetailSection(),
      this.getDashboardLink(),
      this.getWarnings(),
    ]
      .join(" \r\n")
      .trim();
  }

  private getSeparator() {
    return `<div style="${separatorStyle}"></div>`;
  }

  private getQualityGateSection() {
    return `<div style="${textStyle()}">
      <span>${this.projectName ? this.projectName + " " : ""}Quality Gate</span>
      <span style="${measureStyle(this.getQualityGateColor())}">
        ${formatMeasure(this.status, "LEVEL")}
      </span>
    </div>`;
  }

  private getQualityGateDetailSection() {
    const failedConditions = this.getFailedConditions();
    if (!this.metrics || !["WARN", "ERROR"].includes(this.status) || failedConditions.length <= 0) {
      return "";
    }

    const rows = failedConditions.map((condition) => {
      const metric = this.metrics && this.metrics.getMetricByKey(condition.metricKey);
      if (!metric) {
        return null;
      }

      const threshold =
        condition.status === "WARN" ? condition.warningThreshold : condition.errorThreshold;
      return `<li style="list-style: none; margin-top: 13px;">
        <span>${metric.name}</span>
        <span style="${measureStyle(this.getQualityGateColor())}">
          ${formatMeasure(condition.actualValue, metric.type)}</span>
        <span>(required ${
          metric.type !== "RATING" ? formatMeasure(condition.comparator, "COMPARATOR") + " " : ""
        }${formatMeasure(threshold, metric.type)})</span>
      </li>`;
    });

    return `<ul style="${textStyle()}">
        ${rows.join(" \r\n").trim()}
    </ul>\r\n\r\n`; // 2 carriage returns to prevent any malformed summary results
  }

  private getDashboardLink() {
    if (!this.dashboardUrl) {
      return "";
    }
    const linkText = `Detailed ${this.endpointType} report`;

    return `<div style="margin-top: 16px;">
        <a href="${this.dashboardUrl}" style="${textStyle("#5D6CD0")}">
        ${linkText}
        <span class="bowtie-icon bowtie-navigate-external" style="color: #5D6CD0; font-size: 20px; vertical-align: middle;"></span>
        </a>
      </div>`;
  }

  public getWarnings() {
    if (this.warnings.some((w) => w.includes("Please update to at least Java 11"))) {
      return `<br><span>&#9888;</span><b>${this.warnings.find((w) =>
        w.includes("Please update to at least Java 11"),
      )}</b>`;
    } else {
      return "";
    }
  }

  private getQualityGateColor() {
    const colors = {
      OK: "#6EB712",
      WARN: "#F5B840",
      ERROR: "#D92D20",
    };

    return colors[this.status] ?? "#b4b4b4";
  }

  public static getAnalysis({
    analysisId,
    projectName,
    endpoint,
    metrics,
    dashboardUrl,
    warnings,
  }: {
    analysisId: string;
    dashboardUrl?: string;
    endpoint: Endpoint;
    projectName?: string;
    metrics?: Metrics;
    warnings: string[];
  }): Promise<Analysis> {
    tl.debug(`[SQ] Retrieve Analysis id '${analysisId}.'`);
    return get(endpoint, "/api/qualitygates/project_status", true, { analysisId }).then(
      ({ projectStatus }: { projectStatus: IAnalysis }) =>
        new Analysis(projectStatus, endpoint.type, warnings, dashboardUrl, metrics, projectName),
      (err) => {
        if (err && err.message) {
          tl.error(`[SQ] Error retrieving analysis: ${err.message}`);
        } else if (err) {
          tl.error(`[SQ] Error retrieving analysis: ${JSON.stringify(err)}`);
        }
        throw new Error(`[SQ] Could not fetch analysis for ID '${analysisId}'`);
      },
    );
  }
}
