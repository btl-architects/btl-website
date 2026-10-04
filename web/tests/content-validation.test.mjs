import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateContent} from '../tools/content-validation.mjs';
import {optionalPhotographerCredit} from '../../shared/credits.ts';

const figure = () => ({hasAsset:true, alt:'Courtyard beneath a tree',rights:'owned',kind:'cover'});
const project = (extra={}) => ({_id:'project-a',title:'House',slug:'house',lifecycle:'published',category:[{_type:'category',label:'Houses',slug:'houses'}],location:{_type:'location',label:'Place',slug:'place'},images:[figure()],...extra});
const dataset = () => ({settingsCount:1,settings:{},projects:[project()],categories:[{_id:'category-a',label:'Houses',slug:'houses'}],locations:[{_id:'location-a',label:'Place',slug:'place'}],people:[],publications:[]});
const errors = (data, options) => validateContent(data, options).errors;

test('a valid published dataset passes without optional year or photographer names', () => {
  const data=dataset();
  assert.deepEqual(errors(data),[]);
  data.projects[0].credits={photographer:'Photographer to be confirmed'};
  assert.deepEqual(errors(data),[]); // Accepted missing attribution is not invented or a release blocker.
});

test('provisional optional photographer fields are omitted, real attribution is preserved', () => {
  for(const value of [undefined,null,'','  ','Photographer to be confirmed',' to be confirmed ','TBC','photographer TBD']) assert.equal(optionalPhotographerCredit(value),'');
  for(const value of ['Abhimanyu K V','TBC Photography','Jane — photographer to be confirmed by editor','  Verified Name  ']) assert.equal(optionalPhotographerCredit(value),value);
});

test('every reusable image licence passes; prohibited and unsupported licences fail', () => {
  for(const rights of ['owned','client-supplied','licensed']) {
    const data=dataset();data.projects[0].images[0].rights=rights;
    assert.deepEqual(errors(data),[]);
  }
  for(const rights of ['publication','unknown',undefined,'press-supplied']) {
    const data=dataset();data.projects[0].images[0].rights=rights;
    assert.ok(errors(data).some(e=>/licence|do not reuse/.test(e)),String(rights));
  }
});

test('nonreuse licensing gate applies to portraits, all Press images and all settings photographs', () => {
  const prohibited=()=>({...figure(),rights:'publication'});
  const sites=[
    d=>d.people.push({_id:'person-a',name:'Name',portrait:prohibited()}),
    d=>d.publications.push({_id:'press-a',slug:'press-a',publication:'Press',image:prohibited()}),
    d=>d.publications.push({_id:'press-a',slug:'press-a',publication:'Press',articleHero:prohibited()}),
    d=>d.publications.push({_id:'press-a',slug:'press-a',publication:'Press',openingMode:'reader',readerContent:[{_type:'figure',...prohibited()}]}),
    ...['founders','teamImage','studioImage'].map(key=>d=>d.settings[key]=prohibited()),
    d=>d.settings.studioImages=[prohibited()],
  ];
  for(const put of sites) {const data=dataset();put(data);assert.ok(errors(data).some(e=>/do not reuse/.test(e)));}
});

test('missing assets and malformed alt text are errors instead of exceptions', () => {
  const data=dataset();data.projects[0].images[0].hasAsset=false;data.projects[0].images[0].alt={text:'not a string'};
  assert.ok(errors(data).some(e=>/no image file/.test(e)));
  assert.ok(errors(data).some(e=>/no alt text/.test(e)));
});

test('unsafe, reserved and duplicate project routes cannot build', () => {
  for(const slug of ['type','place','House!','../house','bad/slug','']) {
    const data=dataset();data.projects[0].slug=slug;
    assert.ok(errors(data).some(e=>/web address/.test(e)),slug);
  }
  const data=dataset();data.projects.push(project({_id:'project-b'}));
  assert.ok(errors(data).some(e=>/already used/.test(e)));
});

test('historical addresses are retained but cannot collide with another project route', () => {
  const data=dataset();data.projects[0].previousSlugs=['old-house','old-house'];
  assert.deepEqual(errors(data),[]);
  data.projects.push(project({_id:'project-b',slug:'old-house'}));
  assert.ok(errors(data).some(e=>/already used/.test(e)));
});

test('category, location and Press route namespaces validate slug shape and duplicates', () => {
  for(const key of ['categories','locations','publications']) {
    const data=dataset();
    data[key]=[{_id:'a',label:'A',slug:'duplicate'},{_id:'b',label:'B',slug:'duplicate'}];
    assert.ok(errors(data).some(e=>/already used/.test(e)),key);
    data[key][1].slug='Bad slug';assert.ok(errors(data).some(e=>/web address/.test(e)),key);
  }
});

test('broken required location/category references cannot silently disappear from pages', () => {
  for(const refs of [{location:null},{category:[null]},{category:[]},{category:[{_type:'person',slug:'houses',label:'Wrong type'}]}]) {
    const data=dataset();Object.assign(data.projects[0],refs);
    assert.ok(errors(data).some(e=>/valid .*reference/.test(e)));
  }
});

test('a duplicate or absent settings singleton cannot silently pick arbitrary page copy', () => {
  for(const settingsCount of [0,2]) {const data=dataset();data.settingsCount=settingsCount;assert.ok(errors(data).some(e=>/exactly one/.test(e)));}
});

test('explicit search metadata and descriptions respect the Studio schema without shortening client headlines', () => {
  const data=dataset();data.projects[0].description='x'.repeat(601);data.settings.pageSeo={home:{description:'x'.repeat(156)}};
  data.publications=[{_id:'press-a',publication:'Press',slug:'press-a',title:'x'.repeat(120)}];
  assert.ok(errors(data).some(e=>/600/.test(e)));assert.ok(errors(data).some(e=>/155/.test(e)));
  data.projects[0].description='x'.repeat(600);data.settings.pageSeo.home.description='x'.repeat(155);
  assert.deepEqual(errors(data),[]);
});

test('archived URLs remain valid and only authenticated preview data may include lifecycle drafts', () => {
  const data=dataset();data.projects[0].lifecycle='archived';assert.deepEqual(errors(data),[]);
  data.projects[0].lifecycle='draft';assert.ok(errors(data).some(e=>/production build/.test(e)));
  assert.deepEqual(errors(data,{preview:true}),[]);
});

test('malformed reader spans are reported without throwing while readable article text still passes', () => {
  const data=dataset();data.publications=[{_id:'press-a',slug:'press-a',openingMode:'reader',readerContent:[null,{_type:'block',children:[null]}]}];
  assert.ok(errors(data).some(e=>/malformed|unsupported/.test(e)));
  data.publications[0].readerContent=[{_type:'block',children:[{text:'A readable article.'}]}];
  assert.deepEqual(errors(data),[]);
});
