import * as tl from "azure-pipelines-task-lib/task";
import analyzeTask from "../../../../../common/ts/analyze-task";

async function run() {
  try {
    const jdkVersionSource = tl.getInput("jdkversion", true);
    await analyzeTask(__dirname, jdkVersionSource);
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
