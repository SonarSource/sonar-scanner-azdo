import * as fs from "fs-extra";
import * as tl from "azure-pipelines-task-lib/task";
import { fillBuildProperty } from "./azdo-server-utils";

export function getTaskVersion(path: string): Promise<string> {
  return fs.readFile(path, "utf-8").then(
    (fileContent) => {
      tl.debug(`Parsing task file: ${path}`);
      if (!fileContent || fileContent.length <= 0) {
        return Promise.reject(tl.debug(`Failed to read ${path}`));
      }
      try {
        const manifestContent = JSON.parse(fileContent);
        const majorVersion = manifestContent["version"]["Major"];
        const minorVersion = manifestContent["version"]["Minor"];
        const patchVersion = manifestContent["version"]["Patch"];
        const semver = `${majorVersion}.${minorVersion}.${patchVersion}`;
        return Promise.resolve(semver);
      } catch (err) {
        if (err && err.message) {
          tl.debug(`Parse manifest json error: ${err.message}`);
        } else if (err) {
          tl.error(`Parse manifest json error: ${JSON.stringify(err)}`);
        }
        return Promise.reject(err);
      }
    },
    (err) =>
      Promise.reject(tl.debug(`Error reading ${path}: ${err.message || JSON.stringify(err)}`))
  );
}

export async function extractAndPublishTaskVersion(taskName: string, manifestPath: string) {
  const version = await getTaskVersion(manifestPath);
  tl.debug(`Version to promote from ${manifestPath}: ${version}`);
  await fillBuildProperty(taskName, version);
}
