import * as tl from "azure-pipelines-task-lib/task";
import analyzeTask from "../../../../../common/ts/analyze-task";

async function run() {
  try {
    await analyzeTask(__dirname);
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
