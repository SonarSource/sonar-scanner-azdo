import { sanitizeVariable, setIfNotEmpty, toCleanJSON } from "../utils";

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
        '{ "foo": "a", "bar": "b", "sonar.login": "aaabbbccc", "sonar.password": "fffjjjkkk" }'
      )
    ).toBe('{"foo":"a","bar":"b"}');
  });
});

describe("setIfNotEmpty", () => {
  it("should correctly set a property", () => {
    const test = {};
    setIfNotEmpty(test, "foo", "");
    expect(test).toEqual({});
    setIfNotEmpty(test, "foo", undefined);
    expect(test).toEqual({});
    setIfNotEmpty(test, "foo", "bar");
    expect(test).toEqual({ foo: "bar" });
  });
});
