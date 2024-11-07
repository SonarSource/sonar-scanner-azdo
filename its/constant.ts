// Information about the Azure DevOps location where to run the E2E tests
export const AZDO_BASE_URL = "https://dev.azure.com/";
export const AZDO_ORGANIZATION = "sonarsource";
export const AZDO_PROJECT = "SonarScannerAzdo";
export const AZDO_PIPELINE_NAME_PREFIX = "pipeline-";
export const AZDO_MAIN_PIPELINE_NAME = "SonarSource.sonar-scanner-azdo";

// Information to bind to the SonarCloud used in the E2E tests
export const SONARCLOUD_ORGANIZATION_KEY = "sonarsource-sonar-scanner-azdo-it";
export const SONARCLOUD_SERVICE_CONNECTION = "SonarCloud";
export const SONARQUBE_SERVICE_CONNECTION = "SonarQube";

// Input names for the prepare task
export const CLI_VERSION_INPUT_NAME = "cliScannerVersion";
export const DOTNET_VERSION_INPUT_NAME = "msBuildVersion";

// The following constants are used to identify the different projects used in the E2E tests
// All the *_KEY values are projects that should exist in SonarCloud's ${SONARCLOUD_ORGANIZATION_KEY} organization
// All the *_PATH values are paths to the fixtures in the repository (relative to the root of the repository)

export const FIXTURES_PATH = "its/fixtures";

// CLI Project
export const DUMMY_PROJECT_CLI_KEY = "sonarsource-sonar-scanner-azdo-it_dummy-project-cli";
export const DUMMY_PROJECT_CLI_PATH = FIXTURES_PATH + "/dummy-project-cli";

// .NET Core Project
export const DUMMY_PROJECT_DOTNET_CORE_KEY =
  "sonarsource-sonar-scanner-azdo-it_dummy-project-dotnet-core";
export const DUMMY_PROJECT_DOTNET_CORE_PATH = FIXTURES_PATH + "/dummy-project-dotnet-core";

// .NET Framework Project
export const DUMMY_PROJECT_DOTNET_FRAMEWORK_KEY =
  "sonarsource-sonar-scanner-azdo-it_dummy-project-dotnet-framework";
export const DUMMY_PROJECT_DOTNET_FRAMEWORK_PATH =
  FIXTURES_PATH + "/dummy-project-dotnet-framework";

// Gradle Project
export const DUMMY_PROJECT_GRADLE_KEY = "sonarsource-sonar-scanner-azdo-it_dummy-project-gradle";
export const DUMMY_PROJECT_GRADLE_PATH = FIXTURES_PATH + "/dummy-project-gradle";

// Maven Project
export const DUMMY_PROJECT_MAVEN_KEY = "sonarsource-sonar-scanner-azdo-it_dummy-project-maven";
export const DUMMY_PROJECT_MAVEN_PATH = FIXTURES_PATH + "/dummy-project-maven";

// All tasks are suffixed with this string to avoid task-name conflicts with the real/dogfood extension
export const TASK_NAME_PREFIX = "Test";
