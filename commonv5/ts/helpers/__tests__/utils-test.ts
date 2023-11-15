import { sanitizeVariable, toCleanJSON } from "../utils";

describe("toCleanJSON", () => {
  it("should jsonify", () => {
    expect(toCleanJSON({ foo: "a", bar: "b" })).toBe('{"foo":"a","bar":"b"}');
  });
  it("should clean the jsonified object", () => {
    expect(toCleanJSON({ foo: "a", bar: undefined, baz: "" })).toBe('{"foo":"a","baz":""}');
  });
});

describe("sanitizeVariable", () => {
  it("should sanitize username and pass", () => {
    expect(
      sanitizeVariable(
        '{ "foo": "a", "bar": "b", "sonar.login": "aaabbbccc", "sonar.password": "fffjjjkkk" }',
      ),
    ).toBe('{"foo":"a","bar":"b"}');
  });
});
