import * as tl from "azure-pipelines-task-lib/task";
import * as fs from "fs-extra";
import { Guid } from "guid-typescript";
import * as path from "path";
import * as semver from "semver";
import { TaskVariables } from "../helpers/constants";
import { log, LogLevel } from "../helpers/logging";
import Endpoint, { EndpointType } from "./Endpoint";

export const REPORT_TASK_NAME = "report-task.txt";
export const SONAR_TEMP_DIRECTORY_NAME = "sonar";

interface ITaskReport {
  ceTaskId: string;
  ceTaskUrl?: string;
  dashboardUrl?: string;
  projectKey: string;
  serverUrl: string;
}

export default class TaskReport {
  private readonly report: ITaskReport;

  constructor(report: Partial<ITaskReport>) {
    for (const field of ["projectKey", "ceTaskId", "serverUrl"]) {
      if (!report[field as keyof ITaskReport]) {
        throw TaskReport.throwMissingField(field);
      }
    }
    this.report = report as ITaskReport;
  }

  public get projectKey() {
    return this.report.projectKey;
  }

  public get ceTaskId() {
    return this.report.ceTaskId;
  }

  public get serverUrl() {
    return this.report.serverUrl;
  }

  public get dashboardUrl() {
    return this.report.dashboardUrl;
  }

  public static getDefaultPathTemplate() {
    return path.join(
      SONAR_TEMP_DIRECTORY_NAME,
      tl.getVariable("Build.BuildId") as string,
      "<GUID>",
      REPORT_TASK_NAME,
    );
  }

  public static getDefaultPath() {
    return path.join(
      tl.getVariable("Agent.TempDirectory") as string,
      TaskReport.getDefaultPathTemplate().replace("<GUID>", Guid.create().toString()),
    );
  }

  public static getDefaultPathGlob() {
    return TaskReport.getDefaultPathTemplate().replace("<GUID>", "**");
  }

  public static findTaskFileReport(endpoint: Endpoint, serverVersion: semver.SemVer): string[] {
    let taskReportGlob: string;
    let taskReportGlobResult: string[];

    if (endpoint.type === EndpointType.SonarQube && semver.satisfies(serverVersion, "<7.2.0")) {
      log(
        LogLevel.INFO,
        "SonarQube version < 7.2.0 detected, falling back to default location(s) for report-task.txt file.",
      );
      taskReportGlob = path.join("**", REPORT_TASK_NAME);
      taskReportGlobResult = tl.findMatch(
        tl.getVariable("Agent.BuildDirectory") as string,
        taskReportGlob,
      );
    } else if (tl.getVariable(TaskVariables.SonarScannerReportTaskFile)) {
      taskReportGlob = tl.getVariable(TaskVariables.SonarScannerReportTaskFile) as string;
      taskReportGlobResult = tl.find(taskReportGlob);
    } else {
      taskReportGlob = TaskReport.getDefaultPathGlob();
      taskReportGlobResult = tl.findMatch(
        tl.getVariable("Agent.TempDirectory") as string,
        taskReportGlob,
      );
    }

    log(
      LogLevel.DEBUG,
      `Searching for ${taskReportGlob} - found ${taskReportGlobResult.length} file(s)`,
    );
    return taskReportGlobResult;
  }

  public static createTaskReportsFromFiles(
    endpoint: Endpoint,
    serverVersion: semver.SemVer,
    filePaths = TaskReport.findTaskFileReport(endpoint, serverVersion),
  ): Promise<TaskReport[]> {
    return Promise.all(
      filePaths.map((filePath) => {
        if (!filePath) {
          return Promise.reject(
            TaskReport.throwInvalidReport(
              `Could not find '${REPORT_TASK_NAME}'.` +
                ` Possible cause: the analysis did not complete successfully.`,
            ),
          );
        }
        log(LogLevel.DEBUG, `Read Task report file: ${filePath}`);
        return fs.access(filePath, fs.constants.R_OK).then(
          () => this.parseReportFile(filePath),
          () => {
            throw TaskReport.throwInvalidReport(`Task report not found at: ${filePath}`);
          },
        );
      }),
    );
  }

  private static parseReportFile(filePath: string): Promise<TaskReport> {
    return fs.readFile(filePath, "utf-8").then(
      (fileContent) => {
        log(LogLevel.DEBUG, `Parse Task report file: ${fileContent}`);
        if (!fileContent || fileContent.length <= 0) {
          throw TaskReport.throwInvalidReport(`Error reading file: ${fileContent}`);
        }
        try {
          const settings = TaskReport.createTaskReportFromString(fileContent);
          const taskReport = new TaskReport({
            ceTaskId: settings.get("ceTaskId"),
            ceTaskUrl: settings.get("ceTaskUrl"),
            dashboardUrl: settings.get("dashboardUrl"),
            projectKey: settings.get("projectKey"),
            serverUrl: settings.get("serverUrl"),
          });
          return taskReport;
        } catch (error: unknown) {
          if (error instanceof Error) {
            log(LogLevel.ERROR, `Parse Task report error: ${error.message}`);
          }
          throw error;
        }
      },
      (err) => {
        throw TaskReport.throwInvalidReport(
          `Error reading file: ${err.message || JSON.stringify(err)}`,
        );
      },
    );
  }

  private static createTaskReportFromString(fileContent: string): Map<string, string> {
    const lines: string[] = fileContent.replace(/\r\n/g, "\n").split("\n"); // proofs against xplat line-ending issues
    const settings = new Map<string, string>();
    lines.forEach((line: string) => {
      const splitLine = line.split("=");
      if (splitLine.length > 1) {
        settings.set(splitLine[0], splitLine.slice(1, splitLine.length).join("="));
      }
    });
    return settings;
  }

  private static throwMissingField(field: string): Error {
    return new Error(`Failed to create TaskReport object. Missing field: ${field}`);
  }

  private static throwInvalidReport(debugMsg: string): Error {
    log(LogLevel.ERROR, debugMsg);
    return new Error(
      "Invalid or missing task report. Check that the analysis finished successfully.",
    );
  }
}
