import * as tl from "azure-pipelines-task-lib/task";
import analyzeTask from "../../../../../common/ts/analyze-task";
import {
  startIgnoringCertificate,
  stopIgnoringCertificate,
} from "../../../../../common/ts/helpers/request";

async function run() {
  try {
    startIgnoringCertificate();
    const jdkVersionSource = tl.getInput("jdkversion", true);
    await analyzeTask(__dirname, jdkVersionSource);
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  } finally {
    stopIgnoringCertificate();
  }
}

run();
