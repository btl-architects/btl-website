import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
mkdirSync('reports',{recursive:true});
// Exercise the local serving runtime before timing the client. A freshly
// started Wrangler process otherwise initializes its asset-serving paths while
// Chrome is competing for the same CI CPUs. This does not warm Chrome's cache:
// every Lighthouse run still launches a fresh browser with default throttling.
const origin = 'http://127.0.0.1:8788';
const response = await fetch(origin);
if (!response.ok) throw new Error('Performance server is not ready');
const home = await response.text();
const resources = [...new Set([...home.matchAll(/(?:src|href)="(\/[^"#]*)"/g)].map(m => m[1]))];
for (let i = 0; i < resources.length; i += 4) {
  await Promise.all(resources.slice(i, i + 4).map(async path => {
    const asset = await fetch(origin + path);
    if (!asset.ok) throw new Error(`Performance server resource unavailable: ${path}`);
    await asset.arrayBuffer();
  }));
}
console.log(`Serving runtime ready; ${resources.length} local resources checked. Lighthouse browser caches remain cold.`);
const failed=[];
for(const [name,path] of [['home','/'],['project','/projects/nelly-house/'],['contact','/contact/']]) {
  const report=`reports/${name}.json`;
  /* --save-assets keeps Chrome's trace beside the report, so a failure in CI
     arrives with the evidence of what the main thread was doing — CI's machine
     behaves unlike a laptop, and a score alone cannot say why. */
  const run=spawnSync('npx',['--no-install','lighthouse',`http://127.0.0.1:8788${path}`,'--quiet','--chrome-flags=--headless --no-sandbox','--output=json',`--output-path=${report}`,'--save-assets'],{stdio:'inherit'});
  if(run.status!==0)process.exit(run.status || 1);
  const data=JSON.parse(readFileSync(report,'utf8'));
  const lcp=data.audits['largest-contentful-paint'].numericValue,cls=data.audits['cumulative-layout-shift'].numericValue;
  const score=data.categories.performance.score;
  console.log(`${name}: performance ${Math.round(score*100)}, LCP ${Math.round(lcp)}ms, CLS ${cls}`);
  if(score < .95 || lcp >= 2000 || cls >= .02)failed.push(`${name} (score ${Math.round(score*100)}, LCP ${Math.round(lcp)}ms, CLS ${cls}); inspect ${report}`);
}
/* Every page is measured before failing, not just up to the first miss — the
   project and contact pages had never been measured in CI at all. */
if(failed.length)throw new Error('Launch performance targets missed:\n  '+failed.join('\n  '));
