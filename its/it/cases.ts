import {
  DUMMY_PROJECT_CLI_KEY,
  DUMMY_PROJECT_DOTNET_CORE_KEY,
  DUMMY_PROJECT_DOTNET_FRAMEWORK_KEY,
  DUMMY_PROJECT_GRADLE_KEY,
  DUMMY_PROJECT_MAVEN_KEY,
} from "../constant";

type TestCase = {
  sonarHostUrl: string;
  projectKey: string;
  pipelineName: string;
  nloc: number;
};

export const testCases: TestCase[] = [
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_DOTNET_FRAMEWORK_KEY,
    pipelineName: "pipeline-sonarcloud-v3-dotnet-8.0.3.99785-windows",
    nloc: 39,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_DOTNET_FRAMEWORK_KEY,
    pipelineName: "pipeline-sonarcloud-v3-dotnet-embedded-windows",
    nloc: 39,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_DOTNET_CORE_KEY,
    pipelineName: "pipeline-sonarcloud-v3-dotnet-8.0.3.99785-unix",
    nloc: 217,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_DOTNET_CORE_KEY,
    pipelineName: "pipeline-sonarcloud-v3-dotnet-embedded-unix",
    nloc: 217,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_GRADLE_KEY,
    pipelineName: "pipeline-sonarcloud-v3-other-gradle-unix",
    nloc: 9,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_MAVEN_KEY,
    pipelineName: "pipeline-sonarcloud-v3-other-maven-unix",
    nloc: 54,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_CLI_KEY,
    pipelineName: "pipeline-sonarcloud-v3-cli-embedded-unix",
    nloc: 3,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_CLI_KEY,
    pipelineName: "pipeline-sonarcloud-v3-cli-6.2.1.4610-windows",
    nloc: 3,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_CLI_KEY,
    pipelineName: "pipeline-sonarcloud-v1-cli-embedded-unix",
    nloc: 3,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_DOTNET_FRAMEWORK_KEY,
    pipelineName: "pipeline-sonarcloud-v2-dotnet-embedded-windows",
    nloc: 39,
  },
];
