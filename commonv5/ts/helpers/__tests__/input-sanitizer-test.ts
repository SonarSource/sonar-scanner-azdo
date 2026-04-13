// Feature: security-remediation, Property 5: Project key input validation
import * as fc from "fast-check";
import { validateProjectKey } from "../input-sanitizer";

/**
 * Property 5: Project key input validation
 * Validates: Requirements 7.1
 *
 * For any string composed only of [a-zA-Z0-9\-_.:], validateProjectKey SHALL not throw.
 * For any string containing characters outside that set (spaces, shell metacharacters,
 * control chars), validateProjectKey SHALL throw an error.
 */
describe("Property 5: Project key input validation", () => {
  const VALID_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.:";

  // Characters that are NOT in the valid alphabet
  const INVALID_CHARS = " \t\n\r`$&|;!(){}[]<>@#%^*+=~\"'\\,?/\x00\x01\x1f";

  it("should accept any non-empty string from the valid alphabet", () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(...VALID_ALPHABET.split("")), { minLength: 1 }),
        (key: string) => {
          expect(() => validateProjectKey(key)).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should reject strings containing invalid characters", () => {
    fc.assert(
      fc.property(
        // Generate a string that contains at least one invalid character
        fc.tuple(
          fc.stringOf(fc.constantFrom(...VALID_ALPHABET.split(""))),
          fc.constantFrom(...INVALID_CHARS.split("")),
          fc.stringOf(fc.constantFrom(...VALID_ALPHABET.split(""))),
        ),
        ([prefix, invalidChar, suffix]: [string, string, string]) => {
          const key = prefix + invalidChar + suffix;
          expect(() => validateProjectKey(key)).toThrow(/Invalid project key/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should reject empty strings", () => {
    expect(() => validateProjectKey("")).toThrow(/Invalid project key/);
  });
});

// Feature: security-remediation, Property 6: Project name input validation
import { validateProjectName } from "../input-sanitizer";

/**
 * Property 6: Project name input validation
 * Validates: Requirements 7.2
 *
 * For any string containing shell metacharacters (backtick, dollar sign, ampersand,
 * pipe, semicolon, exclamation, parentheses, braces, angle brackets) or control
 * characters (U+0000 through U+001F), validateProjectName SHALL throw an error.
 * For any string composed of printable characters without those metacharacters,
 * validateProjectName SHALL not throw.
 */
describe("Property 6: Project name input validation", () => {
  const SHELL_METACHARACTERS = ["`", "$", "&", "|", ";", "!", "(", ")", "{", "}", "<", ">"];

  // Printable ASCII chars that are NOT shell metacharacters and NOT control chars
  // This includes letters, digits, spaces, and safe punctuation
  const SAFE_PRINTABLE =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.,:@#%^*+=~\"'\\[]?/";

  it("should accept any non-empty string of safe printable characters", () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(...SAFE_PRINTABLE.split("")), { minLength: 1 }),
        (name: string) => {
          expect(() => validateProjectName(name)).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should reject strings containing shell metacharacters", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringOf(fc.constantFrom(...SAFE_PRINTABLE.split(""))),
          fc.constantFrom(...SHELL_METACHARACTERS),
          fc.stringOf(fc.constantFrom(...SAFE_PRINTABLE.split(""))),
        ),
        ([prefix, metaChar, suffix]: [string, string, string]) => {
          const name = prefix + metaChar + suffix;
          expect(() => validateProjectName(name)).toThrow(/Invalid project name/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should reject strings containing control characters (U+0000 through U+001F)", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringOf(fc.constantFrom(...SAFE_PRINTABLE.split(""))),
          fc.integer({ min: 0x00, max: 0x1f }).map((code) => String.fromCharCode(code)),
          fc.stringOf(fc.constantFrom(...SAFE_PRINTABLE.split(""))),
        ),
        ([prefix, controlChar, suffix]: [string, string, string]) => {
          const name = prefix + controlChar + suffix;
          expect(() => validateProjectName(name)).toThrow(/Invalid project name/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should reject empty strings", () => {
    expect(() => validateProjectName("")).toThrow(/Invalid project name/);
  });
});

// Feature: security-remediation, Property 7: Organization input validation
import { validateOrganization } from "../input-sanitizer";

/**
 * Property 7: Organization input validation
 * Validates: Requirements 7.3
 *
 * For any string composed only of [a-zA-Z0-9\-_], validateOrganization SHALL not throw.
 * For any string containing characters outside that set, validateOrganization SHALL throw
 * an error identifying the invalid input.
 */
describe("Property 7: Organization input validation", () => {
  const VALID_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";

  // Characters NOT in the valid alphabet: spaces, punctuation, metacharacters, control chars
  const INVALID_CHARS = " \t\n\r.:`$&|;!(){}[]<>@#%^*+=~\"'\\,?/\x00\x01\x1f";

  it("should accept any non-empty string from the valid alphabet", () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(...VALID_ALPHABET.split("")), { minLength: 1 }),
        (org: string) => {
          expect(() => validateOrganization(org)).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should reject strings containing invalid characters", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringOf(fc.constantFrom(...VALID_ALPHABET.split(""))),
          fc.constantFrom(...INVALID_CHARS.split("")),
          fc.stringOf(fc.constantFrom(...VALID_ALPHABET.split(""))),
        ),
        ([prefix, invalidChar, suffix]: [string, string, string]) => {
          const org = prefix + invalidChar + suffix;
          expect(() => validateOrganization(org)).toThrow(/Invalid organization/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should reject empty strings", () => {
    expect(() => validateOrganization("")).toThrow(/Invalid organization/);
  });
});

// Feature: security-remediation, Property 8: Extra property validation
import { validateExtraProperties } from "../input-sanitizer";

/**
 * Property 8: Extra property validation
 * Validates: Requirements 7.5
 *
 * For any list of key=value strings, if all keys match [a-zA-Z0-9._-]+ and no value
 * contains carriage return or newline characters, validateExtraProperties SHALL return
 * the parsed pairs. If any key does not match or any value contains newline characters,
 * it SHALL throw an error.
 */
describe("Property 8: Extra property validation", () => {
  const VALID_KEY_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-";

  // Characters NOT allowed in property keys (excludes '=' since it acts as the key=value separator)
  const INVALID_KEY_CHARS = " \t`$&|;!(){}[]<>@#%^*+~\"'\\,?/\x00\x01\x1f";

  // Characters that are safe in values (no CR/LF)
  const SAFE_VALUE_CHARS =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.,:@#%^*+=~\"'\\[]?/!(){}|&<>`$;";

  it("should return parsed pairs for valid key=value lines", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.stringOf(fc.constantFrom(...VALID_KEY_ALPHABET.split("")), { minLength: 1 }),
            fc.stringOf(fc.constantFrom(...SAFE_VALUE_CHARS.split(""))),
          ),
          { minLength: 1, maxLength: 10 },
        ),
        (pairs: [string, string][]) => {
          const lines = pairs.map(([key, value]) => `${key}=${value}`);
          const result = validateExtraProperties(lines);
          expect(result).toHaveLength(pairs.length);
          for (let i = 0; i < pairs.length; i++) {
            expect(result[i][0]).toBe(pairs[i][0]);
            expect(result[i][1]).toBe(pairs[i][1]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should throw for lines with invalid property keys", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringOf(fc.constantFrom(...VALID_KEY_ALPHABET.split(""))),
          fc.constantFrom(...INVALID_KEY_CHARS.split("")),
          fc.stringOf(fc.constantFrom(...VALID_KEY_ALPHABET.split(""))),
          fc.stringOf(fc.constantFrom(...SAFE_VALUE_CHARS.split(""))),
        ),
        ([prefix, invalidChar, suffix, value]: [string, string, string, string]) => {
          const invalidKey = prefix + invalidChar + suffix;
          const lines = [`${invalidKey}=${value}`];
          expect(() => validateExtraProperties(lines)).toThrow(/Invalid extra property key/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should throw for values containing newline characters", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringOf(fc.constantFrom(...VALID_KEY_ALPHABET.split("")), { minLength: 1 }),
          fc.stringOf(fc.constantFrom(...SAFE_VALUE_CHARS.split(""))),
          fc.constantFrom("\r", "\n"),
          fc.stringOf(fc.constantFrom(...SAFE_VALUE_CHARS.split(""))),
        ),
        ([key, prefix, newlineChar, suffix]: [string, string, string, string]) => {
          const valueWithNewline = prefix + newlineChar + suffix;
          const lines = [`${key}=${valueWithNewline}`];
          expect(() => validateExtraProperties(lines)).toThrow(/newline injection detected/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should skip comment lines starting with #", () => {
    const lines = ["# this is a comment", "sonar.key=value"];
    const result = validateExtraProperties(lines);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(["sonar.key", "value"]);
  });

  it("should skip lines without = separator", () => {
    const lines = ["no-equals-here", "sonar.key=value"];
    const result = validateExtraProperties(lines);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(["sonar.key", "value"]);
  });

  it("should handle values containing = characters", () => {
    const lines = ["sonar.key=value=with=equals"];
    const result = validateExtraProperties(lines);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(["sonar.key", "value=with=equals"]);
  });
});
