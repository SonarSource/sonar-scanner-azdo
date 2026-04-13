# Design Document: Security Remediation

## Overview

This design addresses 14 security requirements identified in the CodeScan Azure DevOps Extension audit. The remediation spans credential handling, dependency upgrades, input validation, log masking, and protocol enforcement across both v4 (`common/ts/`) and v5 (`commonv5/ts/`) task implementations, plus the legacy PowerShell helper.

The changes are organized into five architectural concerns:

1. **Credential lifecycle** — Pass tokens via environment variables, mark pipeline variables as secret, strip credentials from stored JSON (Requirements 1, 4, 5, 9, 10, 12)
2. **Dependency hygiene** — Remove backdoored `event-stream`, upgrade `semver`, `fs-extra`, and `azure-pipelines-task-lib` (Requirements 2, 3)
3. **Transport security** — Enforce HTTPS on Endpoint URLs with an opt-out for local dev (Requirement 6)
4. **Input validation** — Sanitize project keys, names, organizations, and extra properties against injection (Requirement 7)
5. **Log safety** — Mask credentials in debug output, redact Authorization headers, sanitize URL userinfo (Requirements 8, 13, 14)

All changes maintain backward compatibility with existing pipeline configurations. The v4 and v5 codebases share the same patterns, so each fix is applied symmetrically.

## Architecture

The extension follows a three-phase pipeline task model:

```mermaid
flowchart LR
    A[Prepare Task] -->|sets pipeline vars| B[Analyze Task]
    B -->|writes report-task.txt| C[Publish Task]
    A -->|SONARQUBE_ENDPOINT secret| C
    A -->|SONARQUBE_SCANNER_PARAMS| B
    A -->|SONAR_TOKEN env var| B
```

### Key Architectural Decisions

**Decision 1: SONAR_TOKEN via child process environment**
Credentials are passed to scanner executables via the `SONAR_TOKEN` environment variable scoped to the child process (`ToolRunner.exec` options), rather than CLI arguments. This prevents credentials from appearing in `ps` output. The scanner CLI and MSBuild scanner both support `SONAR_TOKEN` natively.

**Decision 2: Centralized InputSanitizer module**
A new `InputSanitizer` module in `helpers/` provides validation functions for project keys, names, organizations, and extra properties. This avoids scattering regex validation across Scanner and prepare-task files.

**Decision 3: Centralized LogMasker module**
A new `LogMasker` module in `helpers/` provides functions to redact sensitive values from JSON strings and URLs. This is used by prepare-task, request, and Endpoint before any `tl.debug()` call.

**Decision 4: HTTPS enforcement at Endpoint construction**
URL scheme validation happens in the `Endpoint` constructor, failing fast before any network call. An `allowInsecureConnection` task input provides an escape hatch for local development.

**Decision 5: Symmetric v4/v5 changes**
Both `common/ts/` and `commonv5/ts/` receive identical fixes. Where the codebases diverge (e.g., v5 has `PROP_NAMES.TOKEN`), the fix accounts for the difference.

## Components and Interfaces

### 1. InputSanitizer (`helpers/input-sanitizer.ts`)

New module providing input validation functions.

```typescript
// helpers/input-sanitizer.ts

const PROJECT_KEY_PATTERN = /^[a-zA-Z0-9\-_.:]+$/;
const ORGANIZATION_PATTERN = /^[a-zA-Z0-9\-_]+$/;
const PROPERTY_KEY_PATTERN = /^[a-zA-Z0-9._\-]+$/;
// PROJECT_NAME_PATTERN rejects control chars (U+0000-U+001F) and
// shell metacharacters: backtick, dollar, ampersand, pipe, semicolon,
// exclamation, parentheses, braces, angle brackets

export function validateProjectKey(value: string): void;
export function validateProjectName(value: string): void;
export function validateOrganization(value: string): void;
export function validateExtraProperties(lines: string[]): Array<[string, string]>;
```

Each function throws with a descriptive error message identifying the invalid input and expected format.

### 2. LogMasker (`helpers/log-masker.ts`)

New module providing log redaction functions.

```typescript
// helpers/log-masker.ts

const REDACTED = "[REDACTED]";
const SENSITIVE_KEYS = ["sonar.login", "sonar.token", "sonar.password"];

export function maskScannerParams(json: string): string;
export function maskAuthorizationHeader(headers: Record<string, string>): Record<string, string>;
export function maskUrlCredentials(url: string): string;
```

### 3. Scanner Changes (`sonarqube/Scanner.ts`)

Modified to pass credentials via environment variable instead of CLI arguments.

```typescript
// In ScannerCLI.runAnalysis() and ScannerMSBuild.runPrepare() / runAnalysis():
// Before exec, set SONAR_TOKEN in the child process environment:
const execOptions: tl.IExecOptions = {
  env: {
    ...process.env,
    SONAR_TOKEN: token,
  },
};
await scannerRunner.execAsync(execOptions);
```

The `toSonarProps()` methods on Endpoint are modified to exclude `sonar.login`, `sonar.token`, and `sonar.password` from the properties that get serialized into `SONARQUBE_SCANNER_PARAMS`.

### 4. Endpoint Changes (`sonarqube/Endpoint.ts`)

- **HTTPS enforcement**: Constructor validates URL scheme, rejects HTTP unless `allowInsecureConnection` is true.
- **Scoped auth params**: `getEndpoint()` requests only the minimum authorization parameters needed per endpoint type.
- **Redacted serialization**: New `toRedactedJson()` method for debug logging that masks credential fields.
- **URL credential stripping**: `maskUrlCredentials()` applied before logging the endpoint URL.

```typescript
constructor(type: EndpointType, data: EndpointData) {
  // ... existing trailing slash removal ...
  if (this.data?.url && !this.data.url.startsWith("https://")) {
    const allowInsecure = tl.getBoolInput("allowInsecureConnection", false);
    if (!allowInsecure) {
      throw new Error(
        "[SQ] HTTPS is required for server URL. " +
        "Set 'allowInsecureConnection' to true to allow HTTP for local development."
      );
    }
  }
}
```

### 5. Prepare Task Changes (`prepare-task.ts`)

- Mark `SONARQUBE_ENDPOINT` variable as secret (already done in v5, needs fix in v4).
- Strip credential properties from `SONARQUBE_SCANNER_PARAMS` JSON before storage.
- Use `LogMasker.maskScannerParams()` before any `tl.debug()` call that logs scanner params.
- Set variables exactly once per execution (remove duplicate `setVariable` calls in v5).
- Validate `sonar.scanner.metadataFilePath` is within the agent build directory.

### 6. Request Module Changes (`helpers/request.ts`)

- Mask Authorization headers before debug logging.
- Log only the version string from `/api/server/version` at debug level.

### 7. PowerShell Helper Changes (`SonarQubeHelper.ps1`)

- `SetTaskContextVariable` for credential variables uses `issecret=true` syntax.
- `GetTaskContextVariable` suppresses verbose output for credential variable names.

```powershell
function SetSecretTaskContextVariable {
    param([string][ValidateNotNullOrEmpty()]$varName,
          [string]$varValue)
    [Environment]::SetEnvironmentVariable($varName, $varValue)
    Write-Host "##vso[task.setvariable variable=$varName;issecret=true;]$varValue"
}
```

### 8. Dependency Upgrades

| Package | Current | Target | Location |
|---------|---------|--------|----------|
| event-stream | 4.0.1 (root) | 4.0.1 (already safe, verify no transitive 3.3.4) | package.json |
| semver | 5.7.2 | ^7.6.0 | common/ts, commonv5/ts, root |
| fs-extra | 5.0.0 (v4), 11.1.1 (v5) | ^11.2.0 (v4) | common/ts/package.json |
| azure-pipelines-task-lib | 4.13.0 (root), 4.7.0 (v5) | 4.13.0 | commonv5/ts/package.json |

## Data Models

### EndpointData (unchanged structure, new validation)

```typescript
interface EndpointData {
  url: string;        // Must be HTTPS (or HTTP with allowInsecureConnection)
  token?: string;     // API token for authentication
  username?: string;  // Username for basic auth
  password?: string;  // Password for basic auth
  organization?: string; // Organization key (CodeScanCloud)
}
```

### ScannerParams (stored in SONARQUBE_SCANNER_PARAMS)

After remediation, the stored JSON will no longer contain credential properties:

```typescript
// Before: { "sonar.host.url": "...", "sonar.login": "token123", "sonar.projectKey": "..." }
// After:  { "sonar.host.url": "...", "sonar.projectKey": "..." }
// Credentials are passed via SONAR_TOKEN env var to child process
```

### InputValidation patterns

The validation patterns are defined using regex. The `projectName` pattern rejects control characters (U+0000-U+001F) and shell metacharacters (backtick, dollar sign, ampersand, pipe, semicolon, exclamation mark, parentheses, braces, angle brackets). All patterns are anchored to match the full string.

| Field | Allowed Characters |
|-------|-------------------|
| projectKey | `a-z A-Z 0-9 - _ . :` |
| projectName | All printable chars except shell metacharacters and control chars |
| organization | `a-z A-Z 0-9 - _` |
| propertyKey | `a-z A-Z 0-9 . _ -` |
| propertyValue | No carriage return or newline (newline injection prevention) |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Scanner credential isolation

*For any* valid authentication token, when the Scanner executes a CLI or MSBuild process, the child process environment SHALL contain `SONAR_TOKEN` set to that token, AND the command-line argument list SHALL NOT contain the token value, `sonar.login`, `sonar.token`, or `sonar.password`.

**Validates: Requirements 1.1, 1.2**

### Property 2: Endpoint variable marked as secret

*For any* valid EndpointData (with any combination of token, username, password), when the Prepare_Task stores the endpoint JSON via `tl.setVariable`, the `isSecret` parameter SHALL be `true`.

**Validates: Requirements 4.1**

### Property 3: Scanner params credential stripping

*For any* scanner params object containing `sonar.login`, `sonar.token`, or `sonar.password` keys with arbitrary string values, the JSON stored in `SONARQUBE_SCANNER_PARAMS` SHALL NOT contain any of those keys or their values.

**Validates: Requirements 4.2, 4.3**

### Property 4: HTTPS URL enforcement

*For any* URL string, if the URL uses the `http://` scheme and `allowInsecureConnection` is `false`, then Endpoint construction SHALL throw an error containing "HTTPS is required". If `allowInsecureConnection` is `true`, Endpoint construction SHALL succeed regardless of scheme. If the URL uses `https://`, construction SHALL always succeed.

**Validates: Requirements 6.1, 6.4**

### Property 5: Project key input validation

*For any* string, if it matches the pattern of alphanumeric characters, hyphens, underscores, periods, and colons only, then `validateProjectKey` SHALL not throw. *For any* string that does not match (including strings with shell metacharacters, spaces, or control characters), `validateProjectKey` SHALL throw an error identifying the invalid input.

**Validates: Requirements 7.1**

### Property 6: Project name input validation

*For any* string containing shell metacharacters (dollar sign, backtick, ampersand, pipe, semicolon, exclamation, parentheses, braces, angle brackets) or control characters (U+0000 through U+001F), `validateProjectName` SHALL throw an error. *For any* string composed of printable characters without those metacharacters, `validateProjectName` SHALL not throw.

**Validates: Requirements 7.2**

### Property 7: Organization input validation

*For any* string, if it matches the pattern of alphanumeric characters, hyphens, and underscores only, then `validateOrganization` SHALL not throw. *For any* string that does not match, `validateOrganization` SHALL throw an error identifying the invalid input.

**Validates: Requirements 7.3**

### Property 8: Extra property validation

*For any* list of `key=value` strings, if all keys match the pattern of alphanumeric characters, dots, underscores, and hyphens, and no value contains carriage return or newline characters, then `validateExtraProperties` SHALL return the parsed pairs. If any key does not match or any value contains newline characters, it SHALL throw an error.

**Validates: Requirements 7.5**

### Property 9: Authorization header masking

*For any* headers object containing an `Authorization` key with an arbitrary string value, `maskAuthorizationHeader` SHALL return a new object where the `Authorization` value is `[REDACTED]` and all other headers are preserved unchanged.

**Validates: Requirements 8.1**

### Property 10: Scanner params log masking

*For any* JSON string representing a scanner params object that contains `sonar.login`, `sonar.token`, or `sonar.password` keys, `maskScannerParams` SHALL return a JSON string where those values are replaced with `[REDACTED]` and all other key-value pairs are preserved.

**Validates: Requirements 8.2, 14.1**

### Property 11: URL credential stripping

*For any* URL string containing a userinfo component (e.g., `https://user:pass@host/path`), `maskUrlCredentials` SHALL return the URL with the userinfo component removed (e.g., `https://host/path`). *For any* URL without userinfo, the URL SHALL be returned unchanged.

**Validates: Requirements 8.4**

### Property 12: Path traversal prevention

*For any* file path string, if the resolved absolute path is not within the agent build directory (e.g., contains `../` sequences that escape the build root), the path validation SHALL reject it with an error. *For any* path that resolves within the build directory, validation SHALL accept it.

**Validates: Requirements 13.1, 13.2**

### Property 13: Endpoint redacted serialization

*For any* EndpointData containing non-empty token, username, or password values, `toRedactedJson()` SHALL return a JSON string where those credential values are replaced with `[REDACTED]`, while the URL, type, and organization fields are preserved.

**Validates: Requirements 14.2**

## Error Handling

### Input Validation Errors
- Invalid project key, name, or organization: Task fails immediately with `tl.setResult(TaskResult.Failed, ...)` including the field name, invalid value (truncated), and expected format.
- Invalid extra property key or newline injection in value: Task fails with a message identifying the offending property line.

### HTTPS Enforcement Errors
- HTTP URL without `allowInsecureConnection`: Endpoint constructor throws, caught by the task entry point which calls `tl.setResult(TaskResult.Failed, ...)` with a message explaining HTTPS is required and how to enable the exception.

### Credential Errors
- Missing or empty token when SONAR_TOKEN is required: Scanner fails the task with "Unable to set SONAR_TOKEN: no authentication credentials available."
- Failed secret variable storage: Azure DevOps task-lib handles this; if `tl.setVariable` fails, the task-lib throws and the task fails.

### Path Validation Errors
- `sonar.scanner.metadataFilePath` outside build directory: Task fails with "Report task file path is outside the build directory."
- `report-task.txt` path traversal: Publish task fails with "Invalid report-task.txt path: directory traversal detected."

### Dependency Errors
- If upgraded dependencies introduce breaking changes: Caught by existing unit tests during CI. The design ensures all existing tests pass after upgrades (Requirement 3.5).

## Testing Strategy

### Unit Tests (Example-Based)

Unit tests cover specific scenarios, edge cases, and integration points:

- **Endpoint**: HTTPS enforcement with various URL formats, `allowInsecureConnection` flag, `getEndpoint` parameter scoping per endpoint type, `toRedactedJson` output format
- **PowerShell Helper**: `issecret=true` syntax in `SetSecretTaskContextVariable`, verbose suppression in `GetTaskContextVariable` (Pester tests)
- **Prepare Task**: Single `setVariable` call per variable, endpoint stored as secret, scanner params stripped of credentials, metadata file path validation
- **Publish Task**: Credential retrieval per polling request, cleanup after timeout
- **Request Module**: Version-only logging from `/api/server/version`, metrics page size parameter
- **Scanner**: `SONAR_TOKEN` scoped to child process, error on missing token

### Property-Based Tests

Property-based tests verify universal correctness properties using [fast-check](https://github.com/dubzzz/fast-check) (TypeScript PBT library).

Each property test:
- Runs a minimum of 100 iterations
- References its design document property via tag comment
- Uses `fast-check` arbitraries to generate random inputs

**Property tests to implement:**

| Property | Module Under Test | Generator Strategy |
|----------|------------------|--------------------|
| 1: Scanner credential isolation | Scanner | Random token strings, scanner modes |
| 2: Endpoint secret storage | prepare-task | Random EndpointData |
| 3: Scanner params stripping | prepare-task / utils | Random params objects with credential keys |
| 4: HTTPS URL enforcement | Endpoint | Random URLs with http/https schemes x boolean flag |
| 5: Project key validation | InputSanitizer | Random strings from valid/invalid alphabets |
| 6: Project name validation | InputSanitizer | Random strings with/without metacharacters |
| 7: Organization validation | InputSanitizer | Random strings from valid/invalid alphabets |
| 8: Extra property validation | InputSanitizer | Random key=value pairs with valid/invalid keys and values |
| 9: Authorization header masking | LogMasker | Random header objects with Authorization values |
| 10: Scanner params log masking | LogMasker | Random JSON with credential keys |
| 11: URL credential stripping | LogMasker | Random URLs with/without userinfo |
| 12: Path traversal prevention | path validation | Random paths with/without ../ traversal |
| 13: Endpoint redacted serialization | Endpoint | Random EndpointData with credentials |

### Test Configuration

- Framework: Jest (existing)
- PBT library: fast-check (to be added as devDependency)
- Minimum iterations: 100 per property
- Tag format: `// Feature: security-remediation, Property {N}: {title}`
- Test location: alongside existing tests in `__tests__/` directories
