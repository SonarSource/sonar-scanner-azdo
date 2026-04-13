import * as tl from "azure-pipelines-task-lib/task";
import * as fs from "fs-extra";
import * as path from "path";
import * as azdoApiUtils from "./../helpers/azdo-api-utils";

export function publishBuildSummary(summary: string, endpointType = "SonarQube") {
  uploadBuildSummary(saveBuildSummary(summary), `${endpointType} Analysis Report`);
}

export function saveBuildSummary(summary: string): string {
  const filePath = path.join(getStagingDirectory(), "SonarQubeBuildSummary.md");
  fs.writeFileSync(filePath, summary);
  // SEC-FIX: Do not log full file path to avoid information disclosure
  tl.debug(`[SQ] Summary file saved.`);
  return filePath;
}

export function getStagingDirectory(): string {
  const dir = path.join(tl.getVariable("build.artifactStagingDirectory"), ".sqAnalysis");
  fs.ensureDirSync(dir);
  return dir;
}

export function uploadBuildSummary(summaryPath: string, title: string): void {
  // SEC-FIX: Do not log full file path to avoid information disclosure
  tl.debug(`[SQ] Uploading build summary.`);
  tl.command(
    "task.addattachment",
    {
      type: "Distributedtask.Core.Summary",
      name: title,
    },
    summaryPath,
  );
}

export async function fillBuildProperty(propertyName: string, propertyValue: string) {
  const properties: azdoApiUtils.IPropertyBag[] = [];

  properties.push({
    propertyName,
    propertyValue,
  });

  await azdoApiUtils.addBuildProperty(properties);
}
