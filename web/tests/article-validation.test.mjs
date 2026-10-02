import test from 'node:test';
import assert from 'node:assert/strict';
import {articleErrors} from '../server/article-validation.js';
test('API-authored content must remain renderable without trusting CMS validators', () => {
  for (const value of [null, {}, [{_type:'unknown'}], [{_type:'block'}], [{_type:'block',children:[{text:7}]}],
    [{_type:'block',children:[{text:'Text',marks:'strong'}]}], [{_type:'pullQuote',text:''}],
    [{_type:'block',children:[],level:99}], [{_type:'block',children:[],markDefs:[{_type:'link',href:'javascript:alert(1)'}]}],
    [{_type:'block',children:[],markDefs:[{_type:'link',href:'https://user:secret@example.com/'}]}]]) {
    assert.ok(articleErrors(value).length, JSON.stringify(value));
  }
  assert.deepEqual(articleErrors([{_type:'block',style:'h2',children:[{text:'A heading'}]},
    {_type:'block',children:[{text:'A nested list',marks:[]}],listItem:'number',level:2},
    {_type:'pullQuote',text:'An editorial excerpt'}, {_type:'figure'}]), []);
});
