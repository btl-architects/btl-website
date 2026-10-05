import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
mkdirSync('reports',{recursive:true});
const origin=new URL(process.env.PERFORMANCE_ORIGIN || 'https://btldesigns.in').origin;
if(!origin.startsWith('https://')) throw new Error('Launch performance must measure a deployed HTTPS website.');
const runs=Number(process.env.PERFORMANCE_RUNS || 3);
if(!Number.isInteger(runs) || runs<1 || runs>5) throw new Error('Use one to five performance runs.');
console.log(`Measuring ${origin} with mobile throttling and a fresh browser cache for every run.`);
const failed=[];
for(const [name,path] of [['home','/'],['project','/projects/nelly-house/'],['contact','/contact/']]) {
  const results=[];
  for(let i=0;i<runs;i++) {
  const report=`reports/${name}-${i+1}.json`;
  /* --save-assets keeps Chrome's trace beside the report, so a failure in CI
     arrives with the evidence of what the main thread was doing — CI's machine
     behaves unlike a laptop, and a score alone cannot say why. */
  const run=spawnSync('npx',['--no-install','lighthouse',`${origin}${path}`,'--quiet','--chrome-flags=--headless --no-sandbox','--output=json',`--output-path=${report}`,'--save-assets'],{stdio:'inherit'});
  if(run.status!==0)process.exit(run.status || 1);
  const data=JSON.parse(readFileSync(report,'utf8'));
  const lcp=data.audits['largest-contentful-paint'].numericValue,cls=data.audits['cumulative-layout-shift'].numericValue;
  const score=data.categories.performance.score;
  results.push({score,lcp,cls});
  console.log(`${name} run ${i+1}: performance ${Math.round(score*100)}, LCP ${Math.round(lcp)}ms, CLS ${cls}`);
  }
  const median=key=>results.map(r=>r[key]).sort((a,b)=>a-b)[Math.floor(runs/2)];
  const score=median('score'),lcp=median('lcp'),cls=Math.max(...results.map(r=>r.cls));
  console.log(`${name} median: performance ${Math.round(score*100)}, LCP ${Math.round(lcp)}ms, maximum CLS ${cls}`);
  if(score < .95 || lcp >= 2000 || cls >= .02)failed.push(`${name} (score ${Math.round(score*100)}, LCP ${Math.round(lcp)}ms, CLS ${cls}); inspect reports/${name}-*.json`);
}
/* Every page is measured before failing, not just up to the first miss — the
   project and contact pages had never been measured in CI at all. */
if(failed.length)throw new Error('Launch performance targets missed:\n  '+failed.join('\n  '));
