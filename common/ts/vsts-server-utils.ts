import * as path from 'path';
import * as fs from 'fs-extra';
import * as tl from 'vsts-task-lib/task';

export function publishBuildSummary(summary: string, endpointType = 'SonarQube') {
  uploadBuildSummary(saveBuildSummary(summary), `${endpointType} Analysis Report`);
}

export function saveBuildSummary(summary: string): string {
  const filePath = path.join(getStagingDirectory(), 'SonarQubeBuildSummary.md');
  fs.writeFileSync(filePath, summary);
  tl.debug(`[SQ] Summary saved at: ${filePath}`);
  return filePath;
}

export function getStagingDirectory(): string {
  const dir = path.join(tl.getVariable('build.artifactStagingDirectory'), '.sqAnalysis');
  fs.ensureDirSync(dir);
  return dir;
}

export function uploadBuildSummary(summaryPath: string, title: string): void {
  tl.debug(`[SQ] Uploading build summary from ${summaryPath}`);
  tl.command(
    'task.addattachment',
    {
      type: 'Distributedtask.Core.Summary',
      name: title
    },
    summaryPath
  );
}

export function runMsBuildBegin(projectKey: string) {
  const scannerExe = tl.resolve(
    __dirname,
    'sonar-scanner-msbuild',
    'SonarQube.Scanner.MSBuild.exe'
  );
  tl.setVariable('SONARQUBE_SCANNER_MSBUILD_EXE', scannerExe);
  const msBuildScannerRunner = tl.tool(scannerExe);
  msBuildScannerRunner.arg('begin');
  msBuildScannerRunner.arg('/k:' + projectKey);
  return msBuildScannerRunner.exec();
}

export function runMsBuildEnd() {
  const scannerExe = tl.getVariable('SONARQUBE_SCANNER_MSBUILD_EXE');
  const msBuildScannerRunner = tl.tool(scannerExe);
  msBuildScannerRunner.arg('end');
  return msBuildScannerRunner.exec();
}

export function runScannerCli() {
  const isWindows = tl.osType().match(/^Win/);
  let scannerExe = tl.resolve(__dirname, 'sonar-scanner', 'bin', 'sonar-scanner');
  const scannerRunner = tl.tool(scannerExe);
  if (isWindows) {
    scannerExe += '.bat';
  }
  return scannerRunner.exec();
}
