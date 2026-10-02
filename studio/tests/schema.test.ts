import {strict as assert} from "node:assert";
import {test} from "node:test";
import person from "../schemas/person.ts";
import {figure} from "../schemas/objects.ts";

function customRule(field: {validation?: unknown}) {
  let validate!: (value: unknown, context: {document: {_type?: string; tier?: string}}) => boolean | string;
  if (typeof field.validation !== "function") throw new Error("Expected a validation rule");
  field.validation({custom: (callback: typeof validate) => {validate = callback; return {};}});
  return validate;
}

test("founder roles can be omitted, while Team and Alumni still require a role", () => {
  const validate = customRule(person.fields.find((field) => field.name === "role")!);
  assert.equal(validate(undefined, {document: {tier: "principal"}}), true);
  assert.equal(validate("  ", {document: {tier: "principal"}}), true);
  for (const tier of ["team", "alumni"]) {
    assert.equal(typeof validate("  ", {document: {tier}}), "string");
    assert.equal(validate("Architect", {document: {tier}}), true);
  }
});

test("project image roles are hidden and optional for portraits and Press", () => {
  const field = figure.fields.find((field) => field.name === "kind")!;
  const validate = customRule(field);
  assert.equal(typeof field.hidden, "function");
  for (const _type of ["person", "publication"]) {
    assert.equal((field.hidden as Function)({document: {_type}}), true);
    assert.equal(validate(undefined, {document: {_type}}), true);
  }
  assert.equal((field.hidden as Function)({document: {_type: "project"}}), false);
  assert.equal(typeof validate(undefined, {document: {_type: "project"}}), "string");
});
