import {strict as assert} from "node:assert";
import {test} from "node:test";
import publication from "../schemas/publication.ts";

function validator(name: string) {
  let validate!: (value: unknown, context: {document: Record<string, unknown>}) => boolean | string;
  const rule = {uri: () => rule, custom: (fn: typeof validate) => {validate = fn; return rule;}};
  const field = publication.fields.find(f => f.name === name)!;
  ((field as {validation?: unknown}).validation as Function)(rule);
  return (value: unknown, document: Record<string, unknown>) => validate(value, {document});
}
test("a BTL reader requires text or an uploaded magazine page, and switching modes preserves content", () => {
  const validate = validator("readerContent");
  for (const content of [undefined, [], [{_type: "block", children: [{text: "  "}]}], [{_type: "figure"}]])
    assert.equal(typeof validate(content, {openingMode: "reader"}), "string");
  assert.equal(validate([{_type: "block", children: [{text: "A feature"}]}], {openingMode: "reader"}), true);
  assert.equal(validate([{_type: "figure", asset: {asset: {_ref: "image-example"}}}], {openingMode: "reader"}), true);
  assert.equal(validate(undefined, {openingMode: "external"}), true);
  assert.equal(validate(undefined, {openingMode: "embed"}), true);
});
test("embedding requires HTTPS; existing linkless awards remain valid", () => {
  const validate = validator("url");
  assert.equal(typeof validate(undefined, {openingMode: "embed"}), "string");
  assert.equal(typeof validate("http://example.com", {openingMode: "embed"}), "string");
  assert.equal(validate("https://example.com", {openingMode: "embed"}), true);
  assert.equal(typeof validate("https://user:secret@example.com/", {openingMode: "reader"}), "string");
  assert.equal(validate(undefined, {openingMode: "reader"}), true);
  assert.equal(validate(undefined, {}), true);
  assert.equal(validate(undefined, {kind: "award", openingMode: "external"}), true);
  assert.equal(typeof validate(undefined, {kind: "press", openingMode: "external"}), "string");
});
