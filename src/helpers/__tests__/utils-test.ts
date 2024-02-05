import { sanitizeScannerParams, stringifyScannerParams } from "../utils";

describe("toCleanJSON", () => {
  it("should jsonify", () => {
    expect(stringifyScannerParams({ foo: "a", bar: "b" })).toBe('{"foo":"a","bar":"b"}');
  });
  it("should clean the jsonified object", () => {
    expect(stringifyScannerParams({ foo: "a", bar: undefined, baz: "" })).toBe(
      '{"foo":"a","baz":""}',
    );
  });
});

describe("sanitizeVariable", () => {
  it("should sanitize username and pass", () => {
    expect(
      sanitizeScannerParams({
        foo: "a",
        bar: "b",
        "sonar.login": "aaabbbccc",
        "sonar.password": "fffjjjkkk",
      }),
    ).toStrictEqual({
      foo: "a",
      bar: "b",
    });
  });
});
