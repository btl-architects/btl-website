import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {pageSearchListing, searchMetadata, businessStructuredData, projectStructuredData, awardName, jsonLd} from '../src/lib/seo.ts';

test('partial or empty search listings preserve existing fallback fields', () => {
  const fallback = {title: 'Original title', description: 'Client’s existing tagline.'};
  assert.deepEqual(searchMetadata(fallback), fallback);
  assert.deepEqual(searchMetadata(fallback, {title: '  ', description: null}), fallback);
  assert.deepEqual(searchMetadata(fallback, {title: ' Search title '}), {title: 'Search title', description: fallback.description});
  assert.deepEqual(searchMetadata(fallback, {description: ' Search description '}), {title: fallback.title, description: 'Search description'});
});

test('main-page overrides never apply to project, article or profile routes', () => {
  const listings = {home: {title: 'Home search title'}, projects: {title: 'Projects search title'}, people: {title: 'People search title'}, press: {title: 'Press search title'}};
  assert.equal(pageSearchListing('/', listings), listings.home);
  assert.equal(pageSearchListing('/projects', listings), listings.projects);
  assert.equal(pageSearchListing('/projects/', listings), listings.projects);
  for (const path of ['/projects/nelly-house/', '/people/faizan-hussain/', '/recognition/elle-decor-nelly-house/', '/contact/thanks/', '/404.html']) {
    assert.equal(pageSearchListing(path, listings), undefined);
  }
  assert.equal(pageSearchListing('/studio/'), undefined);
});

const settings = {
  name: 'btl architects', tagline: 'Client-authored tagline',
  contact: {address: ['4th floor, Chamayam Building', 'Mavoor Rd, Pottamal', 'Kozhikode, Kerala 673016'], phone: '+91 99472 44424', email: 'studio@btldesigns.in'},
  social: [{url: 'https://www.linkedin.com/'}, {url: 'https://www.instagram.com/btl.architects/'}, {url: 'https://www.youtube.com/'}, {url: 'javascript:alert(1)'}, {url: 'https://user:password@example.com/profile'}, {url: 'invalid'}],
};

test('business markup uses a defined type, configured origin and known address facts', () => {
  const original = structuredClone(settings);
  const data = businessStructuredData(settings, 'https://preview.example/', 'https://images.example/studio.jpg');
  assert.equal(data['@type'], 'LocalBusiness');
  assert.equal(data['@id'], 'https://preview.example/#practice');
  assert.equal(data.url, 'https://preview.example/');
  assert.equal(data.logo, 'https://preview.example/favicon.svg');
  assert.equal(data.address.postalCode, '673016');
  assert.equal(data.address.streetAddress, '4th floor, Chamayam Building, Mavoor Rd, Pottamal');
  assert.equal(data.description, settings.tagline);
  assert.deepEqual(data.sameAs, ['https://www.instagram.com/btl.architects/']);
  assert.deepEqual(settings, original);
});

test('missing postcode, hours, image and profiles are omitted rather than fabricated', () => {
  const data = businessStructuredData({...settings, social: [], contact: {...settings.contact, address: ['Studio road', 'Kozhikode, Kerala']}}, 'https://btldesigns.in/');
  for (const key of ['sameAs', 'image', 'openingHoursSpecification', 'geo']) assert.equal(key in data, false);
  assert.equal('postalCode' in data.address, false);
});

test('CMS text cannot close a JSON-LD script element', () => {
  const data = {name: '</script><script>alert(1)</script>', description: 'A & B'};
  const serialized = jsonLd(data);
  assert.doesNotMatch(serialized, /</);
  assert.deepEqual(JSON.parse(serialized), data);
});

test('awards are named on the practice and on the project that won them', () => {
  const award = awardName({publication: 'IIID Kerala Design Awards 2026', title: 'Gold, Single Dwelling'});
  assert.equal(award, 'IIID Kerala Design Awards 2026 · Gold, Single Dwelling');
  const practice = businessStructuredData({name: 'btl architects', tagline: '', social: [],
    contact: {address: ['Kozhikode, Kerala 673016'], phone: '', email: ''}}, 'https://btldesigns.in/', null, [award]);
  assert.deepEqual(practice.award, [award]);
  const none = businessStructuredData({name: 'btl architects', tagline: '', social: [],
    contact: {address: ['Kozhikode'], phone: '', email: ''}}, 'https://btldesigns.in/');
  assert.equal('award' in none, false);
  const work = projectStructuredData({title: 'Nelly House', slug: 'nelly-house', location: 'Wayanad', year: 2025},
    'https://btldesigns.in/', 'https://btldesigns.in/#practice', null, [award]);
  assert.equal(work['@type'], 'CreativeWork');
  assert.equal(work.url, 'https://btldesigns.in/projects/nelly-house/');
  assert.deepEqual(work.creator, {'@id': 'https://btldesigns.in/#practice'});
  assert.deepEqual(work.award, [award]);
});
