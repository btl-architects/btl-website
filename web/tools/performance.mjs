import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
mkdirSync('reports',{recursive:true});
for(const [name,path] of [['home','/'],['project','/projects/nelly-house/'],['contact','/contact/']]) {
  const report=`reports/${name}.json`;
  const run=spawnSync('npx',['--no-install','lighthouse',`http://127.0.0.1:8788${path}`,'--quiet','--chrome-flags=--headless --no-sandbox','--output=json',`--output-path=${report}`],{stdio:'inherit'});
  if(run.status!==0)process.exit(run.status || 1);
  const data=JSON.parse(readFileSync(report,'utf8'));
  const lcp=data.audits['largest-contentful-paint'].numericValue,cls=data.audits['cumulative-layout-shift'].numericValue;
  const score=data.categories.performance.score;
  console.log(`${name}: performance ${Math.round(score*100)}, LCP ${Math.round(lcp)}ms, CLS ${cls}`);
  if(score < .95 || lcp >= 2000 || cls >= .02)throw new Error(`${name} exceeds the existing launch performance targets; inspect ${report}`);
}
