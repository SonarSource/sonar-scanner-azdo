import * as tl from "azure-pipelines-task-lib/task";
import { fetchComponentMeasures, fetchMetrics, fetchProjectStatus } from "./helpers/api";
import { fillBuildProperty, publishBuildSummary } from "./helpers/azdo-server-utils";
import {
  SQ_BRANCH_MEASURES,
  SQ_PULLREQUEST_MEASURES,
  TASK_MISSING_VARIABLE_ERROR_HINT,
  TaskVariables,
} from "./helpers/constants";
import { getServerVersion } from "./helpers/request";
import { TaskJob } from "./run";
import Endpoint, { EndpointData, EndpointType } from "./sonarqube/Endpoint";
import HtmlAnalysisReport from "./sonarqube/HtmlAnalysisReport";
import Task, { TimeOutReachedError } from "./sonarqube/Task";
import TaskReport from "./sonarqube/TaskReport";
import { Measure, Metric } from "./sonarqube/types";

let globalQualityGateStatus = "";

export const publishTask: TaskJob = async (_endpointType: EndpointType) => {
  const missingVariables = [
    TaskVariables.SonarQubeScannerParams,
    TaskVariables.SonarQubeEndpoint,
  ].filter((variable) => typeof tl.getVariable(variable) === "undefined");
  if (missingVariables.length > 0) {
    tl.setResult(
      tl.TaskResult.Failed,
      `Variables are missing. Please make sure that you are running the Prepare and Analyze tasks before running the Publish task.\n${TASK_MISSING_VARIABLE_ERROR_HINT}`,
    );
    return;
  }

  const endpointData: { type: EndpointType; data: EndpointData } = JSON.parse(
    tl.getVariable(TaskVariables.SonarQubeEndpoint),
  );
  const endpoint = new Endpoint(endpointData.type, endpointData.data);
  const metrics = await fetchMetrics(endpoint);

  const timeoutSec = timeoutInSeconds();
  const serverVersion = await getServerVersion(endpoint);
  const taskReports = await TaskReport.createTaskReportsFromFiles(endpoint, serverVersion);

  const analyses = await Promise.all(
    taskReports.map((taskReport) => getReportForTask(taskReport, metrics, endpoint, timeoutSec)),
  );

  if (globalQualityGateStatus === "") {
    globalQualityGateStatus = "ok";
  }

  if (!taskReports.length) {
    tl.warning("No analyses found in this build! Please check your build configuration.");
  } else {
    tl.debug(`Number of analyses in this build: ${taskReports.length}`);
  }

  tl.debug(`Overall Quality Gate status: ${globalQualityGateStatus}`);

  await fillBuildProperty("sonarglobalqualitygate", globalQualityGateStatus);

  publishBuildSummary(analyses.join("\r\n"), endpoint.type);
};

function timeoutInSeconds(): number {
  return Number.parseInt(tl.getInput("pollingTimeoutSec", true), 10);
}

async function fetchRelevantMeasures(
  endpoint: Endpoint,
  componentKey: string,
  metrics: Metric[],
): Promise<Measure[]> {
  // Do not fetch measures for SonarCloud
  if (endpoint.type === EndpointType.SonarCloud) {
    return [];
  }

  // Are we in a PR, non-main branch or main branch?
  const scannerParams = JSON.parse(tl.getVariable(TaskVariables.SonarQubeScannerParams));
  const branch = scannerParams["sonar.branch.name"] ?? null;
  const pullRequest = scannerParams["sonar.pullrequest.key"] ?? null;

  const relevantMetrics = pullRequest ? SQ_PULLREQUEST_MEASURES : SQ_BRANCH_MEASURES;

  // Get only the metrics that are available on the server
  const availableMetrics = relevantMetrics.filter((metric) =>
    metrics.some((m) => m.key === metric),
  );

  if (availableMetrics.length === 0) {
    return [];
  }

  try {
    const data = {
      component: componentKey,
      metricKeys: availableMetrics.join(","),
    };
    if (pullRequest) {
      data["pullRequest"] = pullRequest;
    } else if (branch) {
      data["branch"] = branch;
    }
    return await fetchComponentMeasures(endpoint, data);
  } catch (error) {
    tl.debug(
      `Unable to get measures. It is expected if you are not using a user token but instead a global or project analysis token.`,
    );
    return [];
  }
}

export async function getReportForTask(
  taskReport: TaskReport,
  metrics: Metric[],
  endpoint: Endpoint,
  timeoutSec: number,
): Promise<string> {
  try {
    const task = await Task.waitForTaskCompletion(endpoint, taskReport.ceTaskId, timeoutSec, 1000);
    const projectStatus = await fetchProjectStatus(endpoint, task.analysisId);
    const measures = await fetchRelevantMeasures(endpoint, task.componentKey, metrics);
    const analysis = HtmlAnalysisReport.getInstance(projectStatus, measures, {
      dashboardUrl: taskReport.dashboardUrl,
      metrics,
      projectName: task.componentName,
      warnings: task.warnings,
    });

    if (
      projectStatus.status === "ERROR" ||
      projectStatus.status === "WARN" ||
      projectStatus.status === "NONE"
    ) {
      globalQualityGateStatus = "failed";
    }

    return analysis.getHtmlAnalysisReport();
  } catch (e) {
    if (e instanceof TimeOutReachedError) {
      tl.warning(
        `Task '${taskReport.ceTaskId}' takes too long to complete. Stopping after ${timeoutSec}s of polling. No quality gate will be displayed on build result.`,
      );
      return "";
    } else {
      throw e;
    }
  }
}
