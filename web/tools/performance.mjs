import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
mkdirSync('reports',{recursive:true});
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
