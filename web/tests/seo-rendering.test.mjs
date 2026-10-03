import {strict as assert} from 'node:assert';
import {after, before, test} from 'node:test';
import {createServer} from 'vite';
import {getViteConfig} from 'astro/config';
import {experimental_AstroContainer} from 'astro/container';

let server, container, Base, sanity, originalFetch;
const settings = {
  name: 'btl architects', tagline: 'The client’s tagline.',
  address: ['Studio road', 'Kozhikode, Kerala 673016'], phone: '+91 99472 44424',
  email: 'studio@btldesigns.in', social: [], nav: [],
  pageSeo: {home: {title: 'Custom Home search title'}, press: {title: 'Press index search title'}},
};
before(async () => {
  const config = await getViteConfig({server: {middlewareMode: true, hmr: false}, logLevel: 'error'})({command: 'serve', mode: 'test'});
  server = await createServer(config);
  await server[Symbol.for('astro.devServerAppReady')];
  ({sanity} = await server.ssrLoadModule('/src/lib/sanity.ts'));
  originalFetch = sanity.fetch;
  sanity.fetch = async query => query.includes('_type == "category"') ? [] : settings;
  container = await experimental_AstroContainer.create({astroConfig: {site: 'https://btl-website-3wo.pages.dev'}});
  Base = (await server.ssrLoadModule('/src/layouts/Base.astro')).default;
});
after(async () => {if (sanity) sanity.fetch = originalFetch; await server?.close();});

const render = (path, props = {}) => container.renderToString(Base, {
  request: new Request(`https://btl-website-3wo.pages.dev${path}`),
  props: {title: 'Existing title', description: settings.tagline, ...props},
  slots: {default: '<main id="main"><h1>Client-authored heading</h1><p>Client-authored writing.</p></main>'},
});
const body = html => html.slice(html.indexOf('<body'));

test('main-page and explicit search overrides change the head while preserving the complete body', async () => {
  const home = await render('/');
  assert.match(home, /<title>Custom Home search title<\/title>/);
  assert.match(home, /name="description" content="The client’s tagline\."/);
  const ordinary = await render('/people/faizan-hussain/');
  const overridden = await render('/people/faizan-hussain/', {seo: {title: 'Profile search title', description: 'Profile search description'}});
  assert.match(overridden, /<title>Profile search title<\/title>/);
  assert.match(overridden, /property="og:title" content="Profile search title"/);
  assert.match(overridden, /name="twitter:description" content="Profile search description"/);
  assert.equal(body(overridden), body(ordinary));
  assert.match(overridden, /<h1>Client-authored heading<\/h1>/);
});

test('article metadata keeps its editorial headline and preview indexing rules', async () => {
  const html = await render('/press/a-feature/', {
    current: 'press', noindex: true,
    seo: {title: 'Independent search title'},
    article: {date: '2026-10-02', author: 'btl architects', headline: 'Original article headline'},
  });
  assert.match(html, /<title>Independent search title<\/title>/);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  const structured = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  assert.equal(structured.find(d => d['@type'] === 'Article').headline, 'Original article headline');
  assert.equal(structured.find(d => d['@type'] === 'LocalBusiness').address.postalCode, '673016');
  assert.equal(structured.some(d => d['@type'] === 'WebSite'), false);
  const home = await render('/');
  assert.match(home, /"@type":"WebSite"/);
});
