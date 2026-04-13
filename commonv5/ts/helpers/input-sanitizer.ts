/**
 * SEC-008: Input validation and sanitization for task inputs.
 * Prevents injection attacks via malicious input values.
 */

/** Allowed: alphanumeric, hyphens, underscores, periods, colons */
const PROJECT_KEY_PATTERN = /^[a-zA-Z0-9\-_.:]+$/;

/** No shell metacharacters or control characters */
const PROJECT_NAME_PATTERN = /^[^\x00-\x1f`\x24&|;!(){}<>]+$/;

/** Allowed: alphanumeric, hyphens, underscores */
const ORGANIZATION_PATTERN = /^[a-zA-Z0-9\-_]+$/;

/** Allowed for extra property keys: sonar-style dotted names */
const PROPERTY_KEY_PATTERN = /^[a-zA-Z0-9._\-]+$/;

/** Newline injection detection */
const NEWLINE_PATTERN = /[\r\n]/;

export function validateProjectKey(value: string): void {
  if (!value || !PROJECT_KEY_PATTERN.test(value)) {
    throw new Error(
      `[SQ] Invalid project key: "${truncate(value)}". ` +
        `Expected: alphanumeric characters, hyphens, underscores, periods, and colons only.`,
    );
  }
}

export function validateProjectName(value: string): void {
  if (!value || !PROJECT_NAME_PATTERN.test(value)) {
    throw new Error(
      `[SQ] Invalid project name: "${truncate(value)}". ` +
        `Must not contain shell metacharacters or control characters.`,
    );
  }
}

export function validateOrganization(value: string): void {
  if (!value || !ORGANIZATION_PATTERN.test(value)) {
    throw new Error(
      `[SQ] Invalid organization: "${truncate(value)}". ` +
        `Expected: alphanumeric characters, hyphens, and underscores only.`,
    );
  }
}

export function validateExtraProperties(lines: string[]): Array<[string, string]> {
  return lines
    .filter((line) => !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      const value = rest.join("=");
      if (!PROPERTY_KEY_PATTERN.test(key)) {
        throw new Error(
          `[SQ] Invalid extra property key: "${truncate(key)}". ` +
            `Expected: alphanumeric characters, dots, hyphens, and underscores only.`,
        );
      }
      if (NEWLINE_PATTERN.test(value)) {
        throw new Error(
          `[SQ] Invalid extra property value for key "${key}": newline injection detected.`,
        );
      }
      return [key, value] as [string, string];
    });
}

function truncate(value: string, maxLen = 50): string {
  if (!value) return "(empty)";
  return value.length > maxLen ? value.substring(0, maxLen) + "..." : value;
}
