import * as fs from 'fs';
import * as path from 'path';
import * as tl from 'vsts-task-lib/task';

export const REPORT_TASK_NAME = 'report-task.txt';

interface ITaskReport {
  projectKey: string;
  ceTaskId: string;
  serverUrl: string;
  dashboardUrl?: string;
  ceTaskUrl?: string;
}

export default class TaskReport {
  constructor(private report: ITaskReport) {
    for (const field of ['projectKey', 'ceTaskId', 'serverUrl']) {
      if (!report[field]) {
        throw TaskReport.throwMissingField(field);
      }
    }
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

  public static findTaskFileReport(): string | undefined {
    const taskReportGlob = path.join('**', REPORT_TASK_NAME);
    const taskReportGlobResult = tl.findMatch(
      tl.getVariable('Agent.BuildDirectory'),
      taskReportGlob
    );
    tl.debug(`[SQ] Searching for ${taskReportGlob} - found ${taskReportGlobResult.length} file(s)`);

    if (taskReportGlobResult.length > 1) {
      tl.warning(
        `[SQ] Multiple '${REPORT_TASK_NAME}' files found. Choosing the first one. ` +
          `The build summary may not be accurate. ` +
          `Possible cause: multiple analyses during the same build, which is not supported.`
      );
    }

    return taskReportGlobResult[0];
  }

  public static createTaskReportFromFile(
    filePath = TaskReport.findTaskFileReport()
  ): Promise<TaskReport> {
    return new Promise((resolve, reject) => {
      if (!filePath) {
        reject(
          TaskReport.throwInvalidReport(
            `[SQ] Could not find '${REPORT_TASK_NAME}'.` +
              ` Possible cause: the analysis did not complete successfully.`
          )
        );
      }
      tl.debug(`[SQ] Read Task report file: ${filePath}`);
      fs.access(filePath, fs.constants.R_OK, err => {
        if (err) {
          return reject(
            TaskReport.throwInvalidReport(`[SQ] Task report not found at: ${filePath}`)
          );
        }
        fs.readFile(filePath, 'utf-8', (err, fileContent) => {
          tl.debug(`[SQ] Parse Task report file: ${fileContent}`);
          if (err || !fileContent || fileContent.length <= 0) {
            return reject(TaskReport.throwInvalidReport(`[SQ] Error reading file: ${fileContent}`));
          }
          try {
            const settings = TaskReport.createTaskReportFromString(fileContent);
            const taskReport = new TaskReport({
              projectKey: settings.get('projectKey'),
              serverUrl: settings.get('serverUrl'),
              dashboardUrl: settings.get('dashboardUrl'),
              ceTaskId: settings.get('ceTaskId'),
              ceTaskUrl: settings.get('ceTaskUrl')
            });
            return resolve(taskReport);
          } catch (err) {
            if (err && err.message) {
              tl.error(`[SQ] Parse Task report error: ${err.message}`);
            } else if (err) {
              tl.error(`[SQ] Parse Task report error: ${JSON.stringify(err)}`);
            }
            return reject(err);
          }
        });
      });
    });
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
