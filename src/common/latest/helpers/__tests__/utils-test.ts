import { safeStringify, sanitizeScannerParams, stringifyScannerParams } from "../utils";

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

describe("safeStringify", () => {
  it("should stringify normal objects without circular references", () => {
    const obj = { name: "test", value: 42, nested: { key: "value" } };
    expect(safeStringify(obj)).toBe('{"name":"test","value":42,"nested":{"key":"value"}}');
  });

  it("should handle simple circular references", () => {
    const obj: any = { name: "test" };
    obj.self = obj;
    const result = safeStringify(obj);
    expect(result).toBe('{"name":"test","self":"[Circular]"}');
  });

  it("should handle nested circular references", () => {
    const obj: any = { name: "parent", child: { name: "child" } };
    obj.child.parent = obj;
    const result = safeStringify(obj);
    expect(result).toBe('{"name":"parent","child":{"name":"child","parent":"[Circular]"}}');
  });

  it("should handle multiple circular references", () => {
    const obj: any = { name: "root" };
    const child: any = { name: "child", root: obj };
    obj.child = child;
    obj.self = obj;
    const result = safeStringify(obj);
    expect(result).toBe(
      '{"name":"root","child":{"name":"child","root":"[Circular]"},"self":"[Circular]"}',
    );
  });

  it("should handle arrays with circular references", () => {
    const arr: any = [1, 2, 3];
    arr.push(arr);
    const result = safeStringify(arr);
    expect(result).toBe('[1,2,3,"[Circular]"]');
  });

  it("should handle primitives and null values", () => {
    expect(safeStringify(null)).toBe("null");
    expect(safeStringify(42)).toBe("42");
    expect(safeStringify("string")).toBe('"string"');
    expect(safeStringify(true)).toBe("true");
  });

  it("should handle undefined values in objects", () => {
    const obj = { a: 1, b: undefined, c: 3 };
    expect(safeStringify(obj)).toBe('{"a":1,"c":3}');
  });

  it("should handle objects with circular references in arrays", () => {
    const obj: any = { name: "test" };
    obj.arr = [1, obj, 3];
    const result = safeStringify(obj);
    expect(result).toBe('{"name":"test","arr":[1,"[Circular]",3]}');
  });
});
