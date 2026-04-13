/**
 * SEC-009: Log masking utilities for sensitive data redaction.
 * Prevents credentials and tokens from appearing in build logs.
 */

export const REDACTED = "[REDACTED]";

const SENSITIVE_KEYS = ["sonar.login", "sonar.token", "sonar.password"];

/**
 * Replaces values of sonar.login, sonar.token, and sonar.password
 * with [REDACTED] in a JSON string representing scanner params.
 *
 * Requirements: 8.2, 14.1
 */
export function maskScannerParams(json: string): string {
  const obj = JSON.parse(json);
  for (const key of SENSITIVE_KEYS) {
    if (key in obj) {
      obj[key] = REDACTED;
    }
  }
  return JSON.stringify(obj);
}

/**
 * Returns a copy of the headers object with the Authorization
 * value replaced by [REDACTED].
 *
 * Requirements: 8.1
 */
export function maskAuthorizationHeader(
  headers: Record<string, string>,
): Record<string, string> {
  const masked = { ...headers };
  if ("Authorization" in masked) {
    masked["Authorization"] = REDACTED;
  }
  return masked;
}

/**
 * Strips the userinfo component (user:pass@) from a URL.
 * Returns the URL unchanged if no userinfo is present.
 *
 * Requirements: 8.4
 */
export function maskUrlCredentials(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      parsed.username = "";
      parsed.password = "";
      return parsed.toString();
    }
    return url;
  } catch {
    // If the URL can't be parsed, return it as-is
    return url;
  }
}
