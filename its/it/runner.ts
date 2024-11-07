import * as vm from "azure-devops-node-api";
import { generateCombinations, serializeCombination } from "../combination";
import {
  AZDO_PIPELINE_NAME_PREFIX,
  DUMMY_PROJECT_CLI_KEY,
  DUMMY_PROJECT_DOTNET_CORE_KEY,
  DUMMY_PROJECT_DOTNET_FRAMEWORK_KEY,
  DUMMY_PROJECT_GRADLE_KEY,
  DUMMY_PROJECT_MAVEN_KEY,
} from "../constant";
import { PipelineCombination } from "../types";
import { getAzdoApi, runPipeline } from "./azdo";
import { getLastAnalysisDate } from "./sonar";

type TestCase = {
  sonarHostUrl: string;
  projectKey: string;
  pipelineName: string;
};

/**
 * Get a test case from a combination to run
 */
export function getTestCase(combination: PipelineCombination): TestCase {
  let projectKey;
  switch (combination.scanner.type) {
    case "cli":
      projectKey = DUMMY_PROJECT_CLI_KEY;
      break;
    case "dotnet":
      switch (combination.os) {
        case "unix":
          projectKey = DUMMY_PROJECT_DOTNET_CORE_KEY;
          break;
        case "windows":
          projectKey = DUMMY_PROJECT_DOTNET_FRAMEWORK_KEY;
          break;
        default:
          throw new Error(`Unsupported os: ${combination.os}`);
      }
      break;
    case "other":
      switch (combination.scanner.subtype) {
        case "gradle":
          projectKey = DUMMY_PROJECT_GRADLE_KEY;
          break;
        case "maven":
          projectKey = DUMMY_PROJECT_MAVEN_KEY;
          break;
        default:
          throw new Error(`Unsupported scanner subtype: ${combination.scanner.subtype}`);
      }
      break;
  }

  const sonarHostUrl =
    combination.version.extension === "sonarcloud"
      ? "https://sonarcloud.io"
      : "http://localhost:9000"; // SONARAZDO-425 We do not support SonarQube in the E2E tests

  return {
    pipelineName: AZDO_PIPELINE_NAME_PREFIX + serializeCombination(combination),
    projectKey,
    sonarHostUrl,
  };
}

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

  const testCases = generateCombinations().map(getTestCase);

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
          await run(azdoApi, testCase, log);
        }
      })();
    }),
  );
}
