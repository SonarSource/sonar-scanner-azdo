import * as vm from "azure-devops-node-api";
import { createServiceConnection, getAzdoApi, getServiceConnections, runPipeline } from "./azdo";
import { TestCase, testCases } from "./cases";
import { getLastAnalysisDate } from "./sonar";

import {
  startAndReady,
  getLatestSonarQube,
  generateToken,
  createProject,
  stop,
} from "../tools/orchestrator/src";

// TODO: move to constants
const TIMEOUT_MS = 500_000;

/**
 * We group test cases by project key and parallelize the execution of test cases
 */
export function getExecutionPlan(testCases: TestCase[]): TestCase[][] {
  const groupedTestCases = testCases.reduce(
    (acc, testCase) => {
      const { projectKey } = testCase;
      if (!acc[projectKey]) {
        acc[projectKey] = [];
      }
      acc[projectKey].push(testCase);
      return acc;
    },
    {} as Record<string, TestCase[]>,
  );

  return Object.values(groupedTestCases);
}

async function run(
  azdoApi: vm.WebApi,
  testCase: TestCase,
  log: (...args: any[]) => void = console.log,
) {
  // Run the pipeline
  log("Running pipeline");
  const previousLastAnalysisDate = await getLastAnalysisDate(
    testCase.sonarHostUrl,
    testCase.projectKey,
    log,
  );
  await runPipeline(azdoApi, testCase.pipelineName, log);

  // Verify that there was a new analysis after the pipeline run
  const lastAnalysisDate = await getLastAnalysisDate(
    testCase.sonarHostUrl,
    testCase.projectKey,
    log,
  );
  if (!lastAnalysisDate || lastAnalysisDate === previousLastAnalysisDate) {
    throw new Error("Analysis date did not change");
  }
}

export async function main() {
  const azdoApi = getAzdoApi();

  const executionPlan = getExecutionPlan(testCases);
  console.log(
    `Execution plan: \n${executionPlan.map((testCases) => testCases.map((testCase) => testCase.pipelineName)).join("\n")}`,
  );

  console.log("Running all test cases");
  await Promise.all(
    executionPlan.map((testCases) => {
      return (async () => {
        for (const testCase of testCases) {
          const log = (...args: any[]) => console.log(`[${testCase.pipelineName}]`, ...args);

          let sqPath;
          let token;
          let projectKey: string;
          const isSonarQube = testCase.sonarHostUrl !== "https://sonarcloud.io";
          if (isSonarQube) {
            console.log(`Starting SonarQube instance for ${testCase.pipelineName}`);
            // get latest SQ
            sqPath = await getLatestSonarQube();
            await startAndReady(sqPath, TIMEOUT_MS);
            console.log(`SonarQube instance started.`);

            token = await generateToken();
            console.log(`Token generated.`);
            projectKey = await createProject();
            console.log(`Project created.`);

            try {
              console.log("Start: creating service connection");
              await createServiceConnection(azdoApi, testCase.sonarHostUrl, token);
              console.log("End: creating service connection");
              console.log("Start: getting service connections");
              await getServiceConnections(azdoApi);
              console.log("End: getting service connections");

              await run(azdoApi, testCase, log);
            } catch (e) {
              console.error(e);
            }

            await stop(sqPath);
          } else {
            await run(azdoApi, testCase, log);
          }

          
        }
      })();
    }),
  );
}
