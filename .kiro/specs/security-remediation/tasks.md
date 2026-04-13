# Implementation Plan: Security Remediation

## Overview

This plan implements 14 security requirements across the CodeScan Azure DevOps Extension. Tasks are ordered so that shared utility modules (LogMasker, InputSanitizer) and dependency upgrades come first, followed by the components that consume them (Endpoint, Scanner, prepare-task, publish-task, request, PowerShell helper). Changes are applied symmetrically to both v4 (`common/ts/`) and v5 (`commonv5/ts/`).

## Tasks

- [x] 1. Upgrade dependencies and add fast-check
  - [x] 1.1 Upgrade root package.json dependencies
    - Verify `event-stream` is 4.0.1 (safe version); add a `resolutions`/`overrides` entry to block any transitive `event-stream` < 4.0.0
    - Ensure `semver` is `^7.6.0` in root devDependencies
    - Add `fast-check` as a devDependency for property-based testing
    - Run `npm install` and verify lock file updates
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.4_

  - [x] 1.2 Verify common/ts and commonv5/ts dependency versions
    - Confirm `common/ts/package.json` has `semver: ^7.6.0`, `fs-extra: ^11.2.0`, `azure-pipelines-task-lib: 4.13.0`
    - Confirm `commonv5/ts/package.json` has `semver: ^7.6.0`, `azure-pipelines-task-lib: 4.13.0`
    - Run `npm install` in each subdirectory and verify lock file updates
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 2. Create LogMasker utility modules
  - [x] 2.1 Create `common/ts/helpers/log-masker.ts`
    - Implement `maskScannerParams(json: string): string` — replaces values of `sonar.login`, `sonar.token`, `sonar.password` with `[REDACTED]`
    - Implement `maskAuthorizationHeader(headers: Record<string, string>): Record<string, string>` — replaces `Authorization` value with `[REDACTED]`
    - Implement `maskUrlCredentials(url: string): string` — strips userinfo component from URLs
    - Export `REDACTED` constant as `[REDACTED]`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 2.2 Create `commonv5/ts/helpers/log-masker.ts`
    - Mirror the same implementation as v4 LogMasker
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 2.3 Write property test for Authorization header masking (v5)
    - **Property 9: Authorization header masking**
    - **Validates: Requirements 8.1**
    - Create `commonv5/ts/helpers/__tests__/log-masker-test.ts`
    - Use fast-check to generate random header objects with Authorization values
    - Assert returned object has `Authorization: [REDACTED]` and all other headers preserved

  - [ ]* 2.4 Write property test for scanner params log masking (v5)
    - **Property 10: Scanner params log masking**
    - **Validates: Requirements 8.2, 14.1**
    - In `commonv5/ts/helpers/__tests__/log-masker-test.ts`
    - Use fast-check to generate random JSON objects with `sonar.login`, `sonar.token`, `sonar.password` keys
    - Assert those values are replaced with `[REDACTED]` and other keys preserved

  - [ ]* 2.5 Write property test for URL credential stripping (v5)
    - **Property 11: URL credential stripping**
    - **Validates: Requirements 8.4**
    - In `commonv5/ts/helpers/__tests__/log-masker-test.ts`
    - Use fast-check to generate random URLs with/without userinfo
    - Assert userinfo is removed from output, URLs without userinfo are unchanged

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Harden InputSanitizer modules
  - [x] 4.1 Review and fix `common/ts/helpers/input-sanitizer.ts`
    - Verify `PROJECT_NAME_PATTERN` regex correctly rejects `$`, backtick, `&`, `|`, `;`, `!`, `(`, `)`, `{`, `}`, `<`, `>` and control chars U+0000–U+001F
    - Fix the regex if the current pattern contains UUID artifacts instead of the intended `$` character class
    - Ensure all functions throw descriptive errors with field name and expected format
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 4.2 Review and fix `commonv5/ts/helpers/input-sanitizer.ts`
    - Apply the same regex fix as v4 for `PROJECT_NAME_PATTERN`
    - Ensure symmetric behavior with v4
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 4.3 Write property test for project key validation
    - **Property 5: Project key input validation**
    - **Validates: Requirements 7.1**
    - Create `commonv5/ts/helpers/__tests__/input-sanitizer-test.ts`
    - Use fast-check to generate strings from valid alphabet (`a-zA-Z0-9-_.:`) and invalid alphabet (with spaces, metacharacters, control chars)
    - Assert valid strings don't throw, invalid strings throw

  - [ ] 4.4 Write property test for project name validation
    - **Property 6: Project name input validation**
    - **Validates: Requirements 7.2**
    - In `commonv5/ts/helpers/__tests__/input-sanitizer-test.ts`
    - Use fast-check to generate strings with/without shell metacharacters and control characters
    - Assert metacharacter/control-char strings throw, clean printable strings don't throw

  - [ ] 4.5 Write property test for organization validation
    - **Property 7: Organization input validation**
    - **Validates: Requirements 7.3**
    - In `commonv5/ts/helpers/__tests__/input-sanitizer-test.ts`
    - Use fast-check to generate strings from valid (`a-zA-Z0-9-_`) and invalid alphabets
    - Assert valid strings don't throw, invalid strings throw

  - [ ] 4.6 Write property test for extra property validation
    - **Property 8: Extra property validation**
    - **Validates: Requirements 7.5**
    - In `commonv5/ts/helpers/__tests__/input-sanitizer-test.ts`
    - Use fast-check to generate key=value pairs with valid/invalid keys and values with/without newlines
    - Assert valid pairs return parsed results, invalid keys or newline values throw

- [x] 5. Harden Endpoint classes (HTTPS enforcement, redacted serialization)
  - [x] 5.1 Update `common/ts/sonarqube/Endpoint.ts`
    - Verify HTTPS enforcement in constructor rejects `http://` URLs when `allowInsecureConnection` is false
    - Verify `toRedactedJson()` masks token, username, password with `[REDACTED]`
    - Ensure `getEndpoint()` requests only minimum authorization parameters per endpoint type
    - Use `maskUrlCredentials()` from LogMasker before logging the endpoint URL in error messages
    - _Requirements: 6.1, 6.4, 9.1, 9.2, 9.3, 14.2_

  - [x] 5.2 Update `commonv5/ts/sonarqube/Endpoint.ts`
    - Apply the same HTTPS enforcement, redacted serialization, and scoped auth parameter changes as v4
    - _Requirements: 6.1, 6.4, 9.1, 9.2, 9.3, 14.2_

  - [ ] 5.3 Write property test for HTTPS URL enforcement
    - **Property 4: HTTPS URL enforcement**
    - **Validates: Requirements 6.1, 6.4**
    - In `commonv5/ts/sonarqube/__tests__/Endpoint-test.ts`
    - Use fast-check to generate random URLs with http/https schemes and boolean `allowInsecureConnection` flag
    - Assert http + !allowInsecure throws, http + allowInsecure succeeds, https always succeeds

  - [ ] 5.4 Write property test for Endpoint redacted serialization
    - **Property 13: Endpoint redacted serialization**
    - **Validates: Requirements 14.2**
    - In `commonv5/ts/sonarqube/__tests__/Endpoint-test.ts`
    - Use fast-check to generate random EndpointData with non-empty credential fields
    - Assert `toRedactedJson()` output has `[REDACTED]` for credentials, preserves URL/type/organization

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Secure Scanner credential passing via SONAR_TOKEN
  - [x] 7.1 Update `common/ts/sonarqube/Scanner.ts`
    - Verify `ScannerCLI.runAnalysis()` passes credentials via `SONAR_TOKEN` env var scoped to child process
    - Verify `ScannerMSBuild.runPrepare()` passes credentials via `SONAR_TOKEN` env var scoped to child process
    - Ensure no `sonar.login`, `sonar.token`, or `sonar.password` values appear in CLI arguments
    - Add error handling: if no credentials available, fail with "Unable to set SONAR_TOKEN: no authentication credentials available"
    - Wire input validation: call `validateProjectKey`, `validateProjectName`, `validateOrganization` from InputSanitizer in `ScannerCLI.getScanner()` and `ScannerMSBuild.getScanner()`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3_

  - [x] 7.2 Update `commonv5/ts/sonarqube/Scanner.ts`
    - Apply the same SONAR_TOKEN credential passing and input validation changes as v4
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3_

  - [ ] 7.3 Write property test for Scanner credential isolation
    - **Property 1: Scanner credential isolation**
    - **Validates: Requirements 1.1, 1.2**
    - Create `commonv5/ts/sonarqube/__tests__/Scanner-test.ts`
    - Use fast-check to generate random token strings and scanner modes
    - Mock `tl.tool()` and `execAsync` to capture the exec options
    - Assert `SONAR_TOKEN` is set in child env, and CLI args do not contain the token value

- [ ] 8. Secure Prepare Task credential storage and logging
  - [x] 8.1 Update `common/ts/prepare-task.ts`
    - Verify `tl.setVariable("SONARQUBE_ENDPOINT", endpoint.toJson(), true)` uses `isSecret=true`
    - Verify `sanitizeVariable()` strips `sonar.login`, `sonar.token`, `sonar.password` from scanner params before storage
    - Use `maskScannerParams()` from LogMasker before any `tl.debug()` call that logs scanner params
    - Validate `sonar.scanner.metadataFilePath` is within the agent build directory using path resolution
    - Wire `validateExtraProperties()` from InputSanitizer for extra property parsing
    - Ensure variables are set exactly once per execution
    - _Requirements: 4.1, 4.2, 4.3, 7.5, 8.2, 10.1, 10.2, 10.3, 13.1, 14.1_

  - [x] 8.2 Update `commonv5/ts/prepare-task.ts`
    - Apply the same secret storage, log masking, path validation, and input validation changes as v4
    - Verify duplicate `setVariable` calls are removed (already partially done)
    - _Requirements: 4.1, 4.2, 4.3, 7.5, 8.2, 10.1, 10.2, 10.3, 13.1, 14.1_

  - [ ] 8.3 Write property test for Endpoint variable marked as secret
    - **Property 2: Endpoint variable marked as secret**
    - **Validates: Requirements 4.1**
    - In `commonv5/ts/__tests__/prepare-task-test.ts`
    - Use fast-check to generate random EndpointData
    - Mock `tl.setVariable` and assert `isSecret` parameter is `true` for the endpoint variable

  - [ ] 8.4 Write property test for Scanner params credential stripping
    - **Property 3: Scanner params credential stripping**
    - **Validates: Requirements 4.2, 4.3**
    - In `commonv5/ts/__tests__/prepare-task-test.ts`
    - Use fast-check to generate random params objects containing `sonar.login`, `sonar.token`, `sonar.password`
    - Assert the stored JSON does not contain any of those keys or their values

  - [ ] 8.5 Write property test for path traversal prevention
    - **Property 12: Path traversal prevention**
    - **Validates: Requirements 13.1, 13.2**
    - In `commonv5/ts/__tests__/prepare-task-test.ts`
    - Use fast-check to generate random file paths with/without `../` traversal sequences
    - Assert paths escaping the build root are rejected, paths within are accepted

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Secure Request modules and Publish tasks
  - [x] 10.1 Update `common/ts/helpers/request.ts`
    - Verify Authorization headers are not logged in debug output (use `maskAuthorizationHeader` if headers are logged)
    - Verify `/api/server/version` response logs only the version string at debug level
    - _Requirements: 8.1, 8.5, 11.2_

  - [x] 10.2 Update `commonv5/ts/helpers/request.ts`
    - Apply the same log masking changes as v4
    - _Requirements: 8.1, 8.5, 11.2_

  - [x] 10.3 Update `common/ts/publish-task.ts`
    - Retrieve credentials per polling request instead of caching for full polling duration
    - Clear credential references after polling timeout
    - Validate report-task.txt file path does not traverse outside the agent build directory
    - _Requirements: 12.1, 12.2, 13.2, 13.3_

  - [x] 10.4 Update `commonv5/ts/publish-task.ts`
    - Apply the same per-request credential retrieval, timeout cleanup, and path validation changes as v4
    - _Requirements: 12.1, 12.2, 13.2, 13.3_

- [x] 11. Secure PowerShell helper
  - [x] 11.1 Update `common/powershell/SonarQubeHelper.ps1`
    - Verify `SetTaskContextVariable` uses `issecret=true` syntax when `$isSecret` parameter is true
    - Ensure callers of `SetTaskContextVariable` for credential variables (`MSBuild.SonarQube.ServerUsername`, `MSBuild.SonarQube.ServerPassword`) pass `$isSecret=$true`
    - Verify `GetTaskContextVariable` suppresses verbose output for credential variable names (variables matching `*Password*` or `*Token*`)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 12. Update existing test files to use HTTPS URLs
  - [x] 12.1 Update `common/ts/sonarqube/__tests__/Endpoint-test.ts`
    - Change any `http://` test URLs to `https://` or add `allowInsecureConnection` mock where HTTP is intentionally tested
    - Add test cases for HTTPS enforcement and `toRedactedJson()`
    - _Requirements: 6.3_

  - [x] 12.2 Update `commonv5/ts/sonarqube/__tests__/Endpoint-test.ts`
    - Apply the same HTTPS URL and new test case changes as v4
    - _Requirements: 6.3_

  - [ ]* 12.3 Write unit tests for LogMasker (v4)
    - Create `common/ts/helpers/__tests__/log-masker-test.ts`
    - Test `maskScannerParams`, `maskAuthorizationHeader`, `maskUrlCredentials` with specific examples and edge cases
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ]* 12.4 Write unit tests for InputSanitizer (v4)
    - Create `common/ts/helpers/__tests__/input-sanitizer-test.ts`
    - Test `validateProjectKey`, `validateProjectName`, `validateOrganization`, `validateExtraProperties` with valid/invalid inputs
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All changes are applied symmetrically to v4 (`common/ts/`) and v5 (`commonv5/ts/`)
