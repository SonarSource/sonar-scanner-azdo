import {
  AZDO_PIPELINE_NAME_PREFIX,
  DUMMY_PROJECT_CLI_KEY,
  DUMMY_PROJECT_DOTNET_CORE_KEY,
  DUMMY_PROJECT_DOTNET_FRAMEWORK_KEY,
  DUMMY_PROJECT_GRADLE_KEY,
  DUMMY_PROJECT_MAVEN_KEY,
} from "../constant";

export type TestCase = {
  sonarHostUrl: string;
  projectKey: string;
  pipelineName: string;
};

export const testCases: TestCase[] = [
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_DOTNET_FRAMEWORK_KEY,
    pipelineName: `${AZDO_PIPELINE_NAME_PREFIX}sonarcloud-v3-dotnet-8.0.3.99785-windows`,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_DOTNET_FRAMEWORK_KEY,
    pipelineName: `${AZDO_PIPELINE_NAME_PREFIX}sonarcloud-v3-dotnet-embedded-windows`,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_DOTNET_CORE_KEY,
    pipelineName: `${AZDO_PIPELINE_NAME_PREFIX}sonarcloud-v3-dotnet-8.0.3.99785-unix`,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_DOTNET_CORE_KEY,
    pipelineName: `${AZDO_PIPELINE_NAME_PREFIX}sonarcloud-v3-dotnet-embedded-unix`,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_GRADLE_KEY,
    pipelineName: `${AZDO_PIPELINE_NAME_PREFIX}sonarcloud-v3-other-gradle-unix`,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_MAVEN_KEY,
    pipelineName: `${AZDO_PIPELINE_NAME_PREFIX}sonarcloud-v3-other-maven-unix`,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_CLI_KEY,
    pipelineName: `${AZDO_PIPELINE_NAME_PREFIX}sonarcloud-v3-cli-embedded-unix`,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_CLI_KEY,
    pipelineName: `${AZDO_PIPELINE_NAME_PREFIX}sonarcloud-v3-cli-6.2.1.4610-windows`,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_CLI_KEY,
    pipelineName: `${AZDO_PIPELINE_NAME_PREFIX}sonarcloud-v1-cli-embedded-unix`,
  },
  {
    sonarHostUrl: "https://sonarcloud.io",
    projectKey: DUMMY_PROJECT_DOTNET_FRAMEWORK_KEY,
    pipelineName: `${AZDO_PIPELINE_NAME_PREFIX}sonarcloud-v2-dotnet-embedded-windows`,
  },
];
