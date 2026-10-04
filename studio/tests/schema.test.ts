import {strict as assert} from "node:assert";
import {test} from "node:test";
import person from "../schemas/person.ts";
import {figure} from "../schemas/objects.ts";

function customRule(field: {validation?: unknown}) {
  let validate!: (value: unknown, context: {document: {_type?: string; tier?: string;showInTeam?:boolean}}) => boolean | string;
  if (typeof field.validation !== "function") throw new Error("Expected a validation rule");
  field.validation({custom: (callback: typeof validate) => {validate = callback; return {};}});
  return validate;
}

test("People cards require a designation; a principal hidden from the roster can omit it", () => {
  const validate = customRule(person.fields.find((field) => field.name === "role")!);
  assert.equal(validate(undefined, {document: {tier: "principal",showInTeam:false}}), true);
  assert.equal(typeof validate("  ", {document: {tier: "principal",showInTeam:true}}), 'string');
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

import {imageResolutionWarning} from '../schemas/imageResolution.ts';

test('image clarity guidance measures the saved crop and remains a warning', () => {
  assert.equal(imageResolutionWarning({asset: {_ref: 'image-photo-4000x3000-jpg'}}), true);
  assert.equal(typeof imageResolutionWarning({asset: {_ref: 'image-photo-914x1279-jpg'}}), 'string');
  const cropped = imageResolutionWarning({asset: {_ref: 'image-photo-4000x3000-jpg'}, crop: {left: .4, right: .4, top: .3, bottom: .3}});
  assert.match(String(cropped), /800 × 1200.*after its saved crop/);
  assert.equal(imageResolutionWarning({asset: {_ref: 'image-logo-100x100-svg'}}), true);
  assert.equal(imageResolutionWarning(undefined), true);
});

import heroClip from '../schemas/heroClip.ts';

test('automatic films require a completed public MP4 before publishing', async () => {
  const fields = heroClip.fields;
  const callbacks: Function[] = [];
  const r: any = {custom: (callback: Function) => {callbacks.push(callback); return r;}};
  (fields.find(field => field.name === 'videoMux')!.validation as Function)(r);
  const context: any = {parent:{videoMode:'mux'}, getClient: () => ({fetch:async () => ({status:'ready',data:{playback_ids:[{id:'public123',policy:'public'}],static_renditions:{files:[{name:'highest.mp4',ext:'mp4',status:'ready'}]}}})})};
  assert.equal(typeof callbacks[0](undefined,context), 'string');
  assert.equal(callbacks[0]({asset:{_ref:'video-id'}},context),true);
  assert.equal(await callbacks[1]({asset:{_ref:'video-id'}},context),true);
  context.getClient = () => ({fetch:async () => ({status:'preparing'})});
  assert.equal(typeof await callbacks[1]({asset:{_ref:'video-id'}},context),'string');
  assert.equal(await callbacks[1]({asset:{_ref:'video-id'}},{...context,parent:{videoMode:'file'}}),true);
});

test('a prohibited publication-owned image cannot be published while reusable licences remain valid', () => {
  const field=figure.fields.find(field=>field.name==='rights')!;
  let validate!: (value: unknown) => boolean | string;
  const r:any={required:()=>r,custom:(callback:typeof validate)=>{validate=callback;return r;}};
  (field.validation as Function)(r);
  for(const licence of ['owned','client-supplied','licensed']) assert.equal(validate(licence),true);
  for(const licence of ['publication','unknown',undefined]) assert.equal(typeof validate(licence),'string');
});

import project from '../schemas/project.ts';
import category from '../schemas/category.ts';
import location from '../schemas/location.ts';

test('Studio refuses unsafe route segments and reserved project paths before publication', () => {
  for (const schema of [project,category,location,person]) {
    let validate!: (value: any) => boolean | string;
    const r:any={required:()=>r,custom:(callback:typeof validate)=>{validate=callback;return r;}};
    (schema.fields.find(field=>field.name==='slug')!.validation as Function)(r);
    assert.equal(validate({current:'safe-web-address'}),true,schema.name);
    for(const current of ['../escape','unsafe/path','Capitalised','contains spaces']) assert.equal(typeof validate({current}),'string',schema.name);
    if(schema.name==='person') assert.equal(validate(undefined),true,'optional person profiles remain optional');
    if(schema.name==='project') for(const current of ['type','place']) assert.equal(typeof validate({current}),'string');
    if(['category','location'].includes(schema.name)) assert.equal(typeof validate({current:'x'.repeat(41)}),'string');
  }
});
