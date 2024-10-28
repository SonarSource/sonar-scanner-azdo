import { stringify } from "yaml";
import {
  CLI_VERSION_INPUT_NAME,
  DOTNET_VERSION_INPUT_NAME,
  PROJECT_KEY,
  PROJECT_NAME,
  SONARCLOUD_ORGANIZATION,
  SONARCLOUD_SERVICE_CONNECTION,
  SONARQUBE_SERVICE_CONNECTION,
} from "./constant";
import { PipelineCombination, TaskDefinition, YamlContent } from "./types";

function generatePipelineHeader(config: PipelineCombination): YamlContent {
  return {
    pool: {
      vmImage: config.os === "unix" ? "ubuntu-latest" : "windows-latest",
    },
    variables: {
      "system.debug": true,
    },
  };
}

function generateTaskName(
  config: PipelineCombination,
  name: "Prepare" | "Analyze" | "Publish",
): string {
  const extension = config.version.extension.replace("sonar", "Sonar");
  const taskName = `${extension.split(":")[0]}${name}`;
  return `${taskName}@${config.version.version}`;
}

function generatePrepareTasks(config: PipelineCombination): TaskDefinition[] {
  const scannerMode = config.scanner === "other" ? "other" : config.scanner.type;

  const prepareTask: TaskDefinition = {
    task: generateTaskName(config, "Prepare"),
    inputs:
      config.version.extension === "sonarcloud"
        ? {
            SonarCloud: SONARCLOUD_SERVICE_CONNECTION,
            organization: SONARCLOUD_ORGANIZATION,
          }
        : {
            SonarQube: SONARQUBE_SERVICE_CONNECTION,
          },
  };

  // Setup scanner inputs
  if (config.scanner === "other") {
    prepareTask.inputs.scannerMode = scannerMode;
  } else if (config.scanner.type === "cli") {
    prepareTask.inputs = {
      ...prepareTask.inputs,
      cliProjectKey: PROJECT_KEY,
      cliProjectName: PROJECT_NAME,
      cliSources: ".",
      [CLI_VERSION_INPUT_NAME]: config.scanner.version,
    };
  } else if (config.scanner.type === "dotnet") {
    prepareTask.inputs = {
      ...prepareTask.inputs,
      projectKey: PROJECT_KEY,
      projectName: PROJECT_NAME,
      [DOTNET_VERSION_INPUT_NAME]: config.scanner.version,
    };
  } else {
    throw new Error(`Unsupported scanner type: ${config.scanner.type}`);
  }

  // TODO: For Maven/Gradle, add mvn/gradle tasks
  // TODO: For .NET, add build step (different for unix/windows)

  return [prepareTask];
}

function generatePipeline(config: PipelineCombination): YamlContent {
  return {
    ...generatePipelineHeader(config),
    steps: [
      ...generatePrepareTasks(config),
      {
        task: generateTaskName(config, "Analyze"),
        inputs: {},
      },
      {
        task: generateTaskName(config, "Publish"),
        inputs: {
          pollingTimeoutSec: "300",
        },
      },
    ],
  };
}

export function generatePipelineFile(config: PipelineCombination): string {
  return [
    "# This pipeline was automatically generated",
    `# Config: ${JSON.stringify(config)}`,
    "",
    stringify(generatePipeline(config)),
  ].join("\n");
}
