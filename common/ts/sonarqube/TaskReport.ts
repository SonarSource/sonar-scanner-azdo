import * as path from 'path';
import * as fs from 'fs-extra';
import * as tl from 'vsts-task-lib/task';

export const REPORT_TASK_NAME = 'report-task.txt';

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
    for (const field of ['projectKey', 'ceTaskId', 'serverUrl']) {
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

  public static findTaskFileReport(): string[] {
    const taskReportGlob = path.join('**', REPORT_TASK_NAME);
    const taskReportGlobResult = tl.findMatch(
      tl.getVariable('Agent.BuildDirectory'),
      taskReportGlob
    );
    tl.debug(`[SQ] Searching for ${taskReportGlob} - found ${taskReportGlobResult.length} file(s)`);
    return taskReportGlobResult;
  }

  public static createTaskReportsFromFiles(
    filePaths = TaskReport.findTaskFileReport()
  ): Promise<TaskReport[]> {
    return Promise.all(
      filePaths.map(filePath => {
        if (!filePath) {
          return Promise.reject(
            TaskReport.throwInvalidReport(
              `[SQ] Could not find '${REPORT_TASK_NAME}'.` +
                ` Possible cause: the analysis did not complete successfully.`
            )
          );
        }
        tl.debug(`[SQ] Read Task report file: ${filePath}`);
        return fs.access(filePath, fs.constants.R_OK).then(
          () => this.parseReportFile(filePath),
          () => {
            return Promise.reject(
              TaskReport.throwInvalidReport(`[SQ] Task report not found at: ${filePath}`)
            );
          }
        );
      })
    );
  }

  private static parseReportFile(filePath: string): Promise<TaskReport> {
    return fs.readFile(filePath, 'utf-8').then(
      fileContent => {
        tl.debug(`[SQ] Parse Task report file: ${fileContent}`);
        if (!fileContent || fileContent.length <= 0) {
          return Promise.reject(
            TaskReport.throwInvalidReport(`[SQ] Error reading file: ${fileContent}`)
          );
        }
        try {
          const settings = TaskReport.createTaskReportFromString(fileContent);
          const taskReport = new TaskReport({
            ceTaskId: settings.get('ceTaskId'),
            ceTaskUrl: settings.get('ceTaskUrl'),
            dashboardUrl: settings.get('dashboardUrl'),
            projectKey: settings.get('projectKey'),
            serverUrl: settings.get('serverUrl')
          });
          return Promise.resolve(taskReport);
        } catch (err) {
          if (err && err.message) {
            tl.error(`[SQ] Parse Task report error: ${err.message}`);
          } else if (err) {
            tl.error(`[SQ] Parse Task report error: ${JSON.stringify(err)}`);
          }
          return Promise.reject(err);
        }
      },
      err =>
        Promise.reject(
          TaskReport.throwInvalidReport(
            `[SQ] Error reading file: ${err.message || JSON.stringify(err)}`
          )
        )
    );
  }

  private static createTaskReportFromString(fileContent: string): Map<string, string> {
    const lines: string[] = fileContent.replace(/\r\n/g, '\n').split('\n'); // proofs against xplat line-ending issues
    const settings = new Map<string, string>();
    lines.forEach((line: string) => {
      const splitLine = line.split('=');
      if (splitLine.length > 1) {
        settings.set(splitLine[0], splitLine.slice(1, splitLine.length).join());
      }
    });
    return settings;
  }

  private static throwMissingField(field: string): Error {
    return new Error(`Failed to create TaskReport object. Missing field: ${field}`);
  }

  private static throwInvalidReport(debugMsg: string): Error {
    tl.error(debugMsg);
    return new Error(
      'Invalid or missing task report. Check that the analysis finished successfully.'
    );
  }
}
