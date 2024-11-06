import { getAzdoApi, runPipeline } from "./azdo";
import { testCases } from "./cases";
import { getLastAnalysisDate } from "./sonar";

export async function main() {
  const azdoApi = getAzdoApi();

  for (const testCase of testCases) {
    // Run the pipeline
    console.log(`Running pipeline ${testCase.pipelineName}`);
    const previousLastAnalysisDate = await getLastAnalysisDate(testCase.sonarHostUrl, testCase.projectKey);
    await runPipeline(azdoApi, testCase.pipelineName);

    // Verify that there was a new analysis after the pipeline run
    const lastAnalysisDate = await getLastAnalysisDate(testCase.sonarHostUrl, testCase.projectKey);
    if (!lastAnalysisDate || lastAnalysisDate === previousLastAnalysisDate) {
      throw new Error("Analysis date did not change");
    }
  }
}
