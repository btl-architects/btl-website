import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync, readdirSync} from 'node:fs';
import {transform} from 'lightningcss';
import {viewportUnitProblems} from '../tools/viewport-units.mjs';
import {lightningTargets} from '../tools/browser-targets.mjs';

test('the minifier keeps vh fallbacks for the browsers the site supports', () => {
  const css = Buffer.from('main{min-height:100vh;min-height:100dvh}.landing{height:100vh;height:100svh}');
  const kept = transform({filename: 'a.css', code: css, minify: true, targets: lightningTargets}).code.toString();
  assert.match(kept, /min-height:100vh;min-height:100dvh/);
  assert.match(kept, /height:100vh;height:100svh/);
});

test('viewport units without a fallback are reported', () => {
  assert.deepEqual(viewportUnitProblems('.a{height:100vh;color:red;height:100svh}', 't'), []);
  assert.deepEqual(viewportUnitProblems(':root{--svh:1vh}@supports (height:1svh){:root{--svh:1svh}}', 't'), []);
  assert.equal(viewportUnitProblems('.a{height:100svh}', 't').length, 1);
  assert.equal(viewportUnitProblems('.a{--x:5svh}', 't').length, 1);
  assert.equal(viewportUnitProblems('.a{top:var(--t,50svh)}', 't').length, 1);
  assert.equal(viewportUnitProblems('.a{max-height:88svh;max-height:88vh}', 't').length, 1);
});

test('the site stylesheets use viewport units only with a fallback', () => {
  const dir = new URL('../src/styles/', import.meta.url);
  for (const file of readdirSync(dir).filter(f => f.endsWith('.css')))
    assert.deepEqual(viewportUnitProblems(readFileSync(new URL(file, dir), 'utf8'), file), []);
});
