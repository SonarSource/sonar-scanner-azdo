import { stringify } from "yaml";
import {
  CLI_VERSION_INPUT_NAME,
  DOTNET_VERSION_INPUT_NAME,
  DUMMY_PROJECT_CLI_PATH,
  DUMMY_PROJECT_DOTNET_CORE_PATH,
  DUMMY_PROJECT_DOTNET_FRAMEWORK_PATH,
  DUMMY_PROJECT_GRADLE_PATH,
  DUMMY_PROJECT_MAVEN_PATH,
  PROJECT_KEY,
  PROJECT_NAME,
  SONARCLOUD_ORGANIZATION,
  SONARCLOUD_SERVICE_CONNECTION,
  SONARQUBE_SERVICE_CONNECTION,
} from "./constant";
import { PipelineCombination, TaskDefinition, YamlContent } from "./types";

function generatePipelineHeader(config: PipelineCombination): YamlContent {
  return {
    trigger: "none",
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
  const prepareTask: TaskDefinition = {
    task: generateTaskName(config, "Prepare"),
    inputs:
      config.version.extension === "sonarcloud"
        ? {
            SonarCloud: SONARCLOUD_SERVICE_CONNECTION,
            organization: SONARCLOUD_ORGANIZATION,
            scannerMode: config.scanner.type,
          }
        : {
            SonarQube: SONARQUBE_SERVICE_CONNECTION,
            scannerMode: config.scanner.type,
          },
  };

  // Setup scanner inputs
  if (config.scanner.type === "other") {
    prepareTask.inputs!.projectKey = PROJECT_KEY;
  } else if (config.scanner.type === "cli") {
    prepareTask.inputs = {
      ...prepareTask.inputs,
      configMode: "manual",
      cliProjectKey: DUMMY_PROJECT_CLI_PATH,
      cliProjectName: PROJECT_NAME,
      cliSources: DUMMY_PROJECT_CLI_PATH,
      [CLI_VERSION_INPUT_NAME]: config.scanner.version,
    };
  } else if (config.scanner.type === "dotnet") {
    const projectPath =
      config.os === "unix" ? DUMMY_PROJECT_DOTNET_CORE_PATH : DUMMY_PROJECT_DOTNET_FRAMEWORK_PATH;

    prepareTask.inputs = {
      ...prepareTask.inputs,
      projectKey: projectPath,
      projectName: PROJECT_NAME,
      extraProperties: `sonar.projectBaseDir=$(Build.SourcesDirectory)/${projectPath}`,
      [DOTNET_VERSION_INPUT_NAME]: config.scanner.version,
    };
  } else {
    throw new Error(`Unsupported scanner type: ${config.scanner.type}`);
  }

  const tasks = [prepareTask];

  // .NET Core
  if (config.scanner.type === "dotnet" && config.os === "unix") {
    tasks.push({
      script: "dotnet build --configuration Release",
      workingDirectory: DUMMY_PROJECT_DOTNET_CORE_PATH,
    });
  }

  // .NET Framework
  if (config.scanner.type === "dotnet" && config.os === "windows") {
    // unshift
    tasks.unshift({
      task: "NuGetCommand@2",
      inputs: {
        restoreSolution: DUMMY_PROJECT_DOTNET_FRAMEWORK_PATH + "/*.sln",
      },
    });
    tasks.unshift({
      task: "NuGetToolInstaller@1",
      inputs: {},
    });
    tasks.push({
      task: "DotNetCoreCLI@2",
      inputs: {},
    });
  }

  // Gradle
  if (config.scanner.type === "other" && config.scanner.subtype === "gradle") {
    tasks.push({
      task: "Gradle@3",
      inputs: {
        gradleWrapperFile: DUMMY_PROJECT_GRADLE_PATH + "/gradlew",
        workingDirectory: DUMMY_PROJECT_GRADLE_PATH,
        tasks: "build",
        javaHomeOption: "JDKVersion",
        jdkVersionOption: "1.17",
        sonarQubeRunAnalysis: true,
        sqGradlePluginVersionChoice: "build",
        spotBugsAnalysis: false,
      },
    });
  }

  // Maven
  if (config.scanner.type === "other" && config.scanner.subtype === "maven") {
    tasks.unshift({
      task: "JavaToolInstaller@1",
      inputs: {
        versionSpec: "17",
        jdkArchitectureOption: "x64",
        jdkSourceOption: "PreInstalled",
      },
    });
    tasks.push({
      task: "Maven@4",
      inputs: {
        mavenPomFile: DUMMY_PROJECT_MAVEN_PATH + "/pom.xml",
        goals: "package",
        options: "-X",
        sonarQubeRunAnalysis: true,
      },
    });
  }

  return tasks;
}

function generateAnalyzeTasks(config: PipelineCombination): TaskDefinition[] {
  if (config.scanner.type === "other") {
    return [];
  }

  return [
    {
      task: generateTaskName(config, "Analyze"),
      inputs: {},
    },
  ];
}

function generatePipeline(config: PipelineCombination): YamlContent {
  return {
    ...generatePipelineHeader(config),
    steps: [
      ...generatePrepareTasks(config),
      ...generateAnalyzeTasks(config),
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
