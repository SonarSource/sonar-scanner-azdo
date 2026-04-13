# Requirements Document

## Introduction

This document specifies the security remediation requirements for the CodeScan Azure DevOps Extension (sonar-scanner-vsts). The extension provides pipeline tasks (Prepare, Analyze, Publish) for integrating CodeScan/SonarQube analysis into Azure DevOps builds. A security audit identified 22 issues across HIGH, MEDIUM, and LOW severity levels spanning credential exposure, deprecated dependencies, insecure protocols, unvalidated inputs, and excessive logging. This remediation effort addresses all open issues (the Node.js 10 EOL upgrade has already been completed).

## Glossary

- **Extension**: The CodeScan Azure DevOps Extension (sonar-scanner-vsts), comprising pipeline tasks for static analysis integration
- **Prepare_Task**: The pipeline task that configures scanner parameters, endpoint credentials, and environment variables before analysis (common/ts/prepare-task.ts, commonv5/ts/prepare-task.ts)
- **Analyze_Task**: The pipeline task that executes the SonarQube/CodeScan scanner (common/ts/analyze-task.ts, commonv5/ts/analyze-task.ts)
- **Publish_Task**: The pipeline task that polls for analysis results and publishes the Quality Gate status (common/ts/publish-task.ts, commonv5/ts/publish-task.ts)
- **Scanner**: The TypeScript class that invokes CLI or MSBuild scanner executables (common/ts/sonarqube/Scanner.ts, commonv5/ts/sonarqube/Scanner.ts)
- **Endpoint**: The TypeScript class representing a CodeScanCloud or SonarQube service connection, including URL, token, username, and password (common/ts/sonarqube/Endpoint.ts, commonv5/ts/sonarqube/Endpoint.ts)
- **Request_Module**: The HTTP client module used for API calls to the SonarQube/CodeScan server (common/ts/helpers/request.ts, commonv5/ts/helpers/request.ts)
- **PowerShell_Helper**: The PowerShell script providing helper functions for legacy v3 tasks (common/powershell/SonarQubeHelper.ps1)
- **Task_Context_Variable**: An Azure DevOps pipeline variable set via `tl.setVariable()` or `##vso[task.setvariable]` to pass data between tasks
- **SONAR_TOKEN**: An environment variable used to pass authentication tokens to the scanner process without exposing them in CLI arguments
- **Scanner_Params**: The JSON-serialized object stored in the SONARQUBE_SCANNER_PARAMS pipeline variable, containing scanner configuration including credentials
- **Input_Sanitizer**: A validation module that checks and sanitizes user-provided task inputs before use
- **Log_Masker**: A utility that redacts sensitive values from log output before writing to the pipeline log stream

## Requirements

### Requirement 1: Eliminate Password Exposure in CLI Arguments

**User Story:** As a pipeline administrator, I want scanner credentials passed via environment variables instead of CLI arguments, so that passwords are not visible in the process list.

#### Acceptance Criteria

1. WHEN the Scanner executes a CLI or MSBuild scanner process, THE Scanner SHALL pass authentication credentials via the SONAR_TOKEN environment variable instead of CLI arguments
2. THE Scanner SHALL NOT include `sonar.login`, `sonar.token`, or `sonar.password` values as command-line arguments to scanner executables
3. WHEN the SONAR_TOKEN environment variable is set for a scanner process, THE Scanner SHALL scope the environment variable to the child process only
4. IF the SONAR_TOKEN environment variable cannot be set, THEN THE Scanner SHALL fail the task with a descriptive error message

### Requirement 2: Replace Deprecated event-stream Dependency

**User Story:** As a security engineer, I want the backdoored event-stream v3.3.4 dependency removed, so that the extension does not include a package with a known malicious payload.

#### Acceptance Criteria

1. THE Extension SHALL NOT include event-stream version 3.3.4 or any version below 4.0.0 in the root package.json
2. WHEN the event-stream dependency is required for build functionality, THE Extension SHALL use event-stream version 4.x or a safe alternative library
3. THE Extension SHALL pass `npm audit` with zero high or critical vulnerabilities related to event-stream

### Requirement 3: Upgrade Outdated Dependencies with Known CVEs

**User Story:** As a security engineer, I want all dependencies upgraded to versions without known CVEs, so that the extension does not ship vulnerable libraries.

#### Acceptance Criteria

1. THE Extension SHALL use semver version 7.x or later in all package.json files (root, common/ts, commonv5/ts)
2. THE Extension SHALL use fs-extra version 11.x or later in the common/ts/package.json
3. THE Extension SHALL use azure-pipelines-task-lib version 4.13.0 or later in all package.json files
4. THE Extension SHALL NOT include any direct dependency with a known HIGH or CRITICAL severity CVE as reported by `npm audit`
5. WHEN a dependency is upgraded, THE Extension SHALL verify that all existing unit tests pass without modification or with documented adjustments

### Requirement 4: Secure Credential Storage in Prepare Task

**User Story:** As a pipeline administrator, I want credentials stored securely between pipeline tasks, so that tokens and passwords are not exposed in plain-text environment variables.

#### Acceptance Criteria

1. WHEN the Prepare_Task stores the Endpoint JSON in a Task_Context_Variable, THE Prepare_Task SHALL mark the variable as secret using the `isSecret` flag
2. THE Prepare_Task SHALL NOT serialize raw token, username, or password values into non-secret pipeline variables
3. WHEN the Scanner_Params JSON is stored in a Task_Context_Variable, THE Prepare_Task SHALL strip `sonar.login`, `sonar.token`, and `sonar.password` properties from the JSON before storage
4. WHEN a subsequent task requires authentication credentials, THE Endpoint SHALL retrieve credentials from the secret-marked Task_Context_Variable

### Requirement 5: Secure Credential Handling in PowerShell Helper

**User Story:** As a pipeline administrator, I want PowerShell helper scripts to use secret variables for credentials, so that sensitive data is not stored in plain-text task context variables.

#### Acceptance Criteria

1. WHEN the PowerShell_Helper stores the SonarQube server username via SetTaskContextVariable, THE PowerShell_Helper SHALL mark the variable as issecret
2. WHEN the PowerShell_Helper stores the SonarQube server password via SetTaskContextVariable, THE PowerShell_Helper SHALL mark the variable as issecret
3. THE PowerShell_Helper SHALL use the `##vso[task.setvariable variable=NAME;issecret=true;]` syntax for all credential-bearing variables
4. WHEN the PowerShell_Helper reads credentials via GetTaskContextVariable, THE PowerShell_Helper SHALL NOT write credential values to verbose or debug output

### Requirement 6: Enforce HTTPS for All Server Communication

**User Story:** As a security engineer, I want all HTTP communication with SonarQube/CodeScan servers to use HTTPS, so that credentials and analysis data are encrypted in transit.

#### Acceptance Criteria

1. WHEN the Endpoint receives a server URL using the HTTP scheme, THE Endpoint SHALL reject the URL and fail the task with a descriptive error message indicating HTTPS is required
2. THE Request_Module SHALL only send API requests over HTTPS connections
3. WHEN test files reference SonarQube/CodeScan server URLs, THE test files SHALL use HTTPS URLs exclusively
4. WHERE a user configures an exception for local development, THE Endpoint SHALL accept HTTP URLs only when an explicit `allowInsecureConnection` input is set to true

### Requirement 7: Validate and Sanitize Task Inputs

**User Story:** As a security engineer, I want all user-provided task inputs validated and sanitized, so that injection attacks via malicious input values are prevented.

#### Acceptance Criteria

1. WHEN the Scanner receives a project key input, THE Input_Sanitizer SHALL validate that the value matches the allowed pattern of alphanumeric characters, hyphens, underscores, periods, and colons only
2. WHEN the Scanner receives a project name input, THE Input_Sanitizer SHALL validate that the value does not contain shell metacharacters or control characters
3. WHEN the Scanner receives an organization input, THE Input_Sanitizer SHALL validate that the value matches the allowed pattern of alphanumeric characters, hyphens, and underscores only
4. IF any task input fails validation, THEN THE Input_Sanitizer SHALL fail the task with a descriptive error message identifying the invalid input and the expected format
5. WHEN extra properties are provided as key=value pairs, THE Input_Sanitizer SHALL validate that keys match the allowed SonarQube property name pattern and values do not contain newline injection sequences

### Requirement 8: Mask Sensitive Data in Log Output

**User Story:** As a pipeline administrator, I want sensitive data masked in all log output, so that credentials and tokens are not exposed in build logs.

#### Acceptance Criteria

1. WHEN the Request_Module logs an API response for debugging, THE Log_Masker SHALL redact any Authorization header values before writing to the log
2. WHEN the Prepare_Task logs Scanner_Params for debugging, THE Log_Masker SHALL redact `sonar.login`, `sonar.token`, and `sonar.password` values from the JSON output
3. THE Log_Masker SHALL replace sensitive values with a fixed mask string of `[REDACTED]`
4. WHEN the Endpoint URL is logged, THE Log_Masker SHALL NOT include any embedded credentials from the URL (e.g., userinfo component)
5. WHEN the server version string is retrieved from `/api/server/version`, THE Request_Module SHALL log only the version number at debug level without additional server metadata

### Requirement 9: Restrict Endpoint Authorization Parameter Scope

**User Story:** As a security engineer, I want endpoint authorization parameters scoped to the minimum required fields, so that the extension does not request broader access than necessary.

#### Acceptance Criteria

1. WHEN the Endpoint retrieves authorization parameters, THE Endpoint SHALL request only the `apitoken` parameter for CodeScanCloud endpoint types
2. WHEN the Endpoint retrieves authorization parameters for SonarQube endpoint types, THE Endpoint SHALL request only `apitoken`, `username`, and `password` parameters
3. THE Endpoint SHALL NOT store or forward authorization parameters beyond what is required for scanner authentication

### Requirement 10: Prevent Duplicate Endpoint Loading

**User Story:** As a developer, I want the endpoint loaded exactly once per task execution, so that redundant credential retrieval is eliminated and the credential exposure surface is minimized.

#### Acceptance Criteria

1. WHEN the Prepare_Task initializes, THE Prepare_Task SHALL retrieve the Endpoint configuration exactly once per task execution
2. THE Prepare_Task SHALL NOT set the SONARQUBE_ENDPOINT variable more than once per task execution
3. THE Prepare_Task SHALL NOT set the SONARQUBE_SCANNER_MODE variable more than once per task execution

### Requirement 11: Limit API Query Scope

**User Story:** As a security engineer, I want API queries to request only the minimum data needed, so that excessive data retrieval from the server is avoided.

#### Acceptance Criteria

1. WHEN the Extension queries the `/api/metrics/search` endpoint, THE Request_Module SHALL request a page size no larger than the number of metrics actually needed
2. WHEN the Extension queries the `/api/server/version` endpoint, THE Request_Module SHALL use the response only for version comparison and discard the response after parsing

### Requirement 12: Reduce Token Exposure Window During Polling

**User Story:** As a security engineer, I want the token exposure window minimized during Quality Gate polling, so that long-running polling operations do not keep credentials in memory longer than necessary.

#### Acceptance Criteria

1. WHEN the Publish_Task polls for analysis completion, THE Publish_Task SHALL retrieve authentication credentials at the time of each polling request rather than caching them for the full polling duration
2. WHEN the polling timeout of 300 seconds is reached, THE Publish_Task SHALL clear any cached credential references from memory

### Requirement 13: Protect Report Task File Path

**User Story:** As a security engineer, I want the report-task.txt file path handled securely, so that the file path is not exposed in a way that could be exploited.

#### Acceptance Criteria

1. WHEN the Prepare_Task sets the `sonar.scanner.metadataFilePath` property, THE Prepare_Task SHALL validate that the path is within the expected build directory
2. WHEN the Publish_Task reads the report-task.txt file, THE Publish_Task SHALL validate the file path does not traverse outside the agent build directory
3. IF the report-task.txt file path fails validation, THEN THE Publish_Task SHALL fail the task with a descriptive error message

### Requirement 14: Secure Debug Logging of Scanner Parameters

**User Story:** As a pipeline administrator, I want scanner parameters logged safely in debug mode, so that enabling debug logging does not expose credentials.

#### Acceptance Criteria

1. WHEN the Prepare_Task logs the full Scanner_Params JSON via `tl.debug()`, THE Prepare_Task SHALL use the sanitizeScannerParams function to remove credential properties before logging
2. WHEN the Endpoint JSON is logged for debugging, THE Endpoint SHALL redact the token, username, and password fields before serialization
3. THE Extension SHALL NOT log the full SONARQUBE_SCANNER_PARAMS value containing credentials at any log level
