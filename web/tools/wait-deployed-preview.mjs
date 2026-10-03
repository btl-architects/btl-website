import {appendFileSync} from 'node:fs';
const sha=process.env.DEPLOYMENT_SHA;
const repo=process.env.GITHUB_REPOSITORY;
if(!/^[a-f0-9]{40}$/.test(sha || '') || !/^[\w-]+\/[\w.-]+$/.test(repo || '')) throw new Error('A repository and exact source commit are required.');
const deadline=Date.now()+600000;
while(Date.now()<deadline) {
  const response=await fetch(`https://api.github.com/repos/${repo}/commits/${sha}/check-runs`,{
    headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw new Error(`Cannot read deployment checks (${response.status}).`);
  const data=await response.json();
  const check=data.check_runs.filter(c=>c.name==='Cloudflare Pages').sort((a,b)=>b.id-a.id)[0];
  if(check?.status==='completed') {
    if(check.conclusion!=='success') throw new Error('Cloudflare preview deployment failed.');
    const origin=check.output?.summary?.match(/href=['"](https:\/\/[a-z0-9-]+\.btl-website-3wo\.pages\.dev)\/?['"]/i)?.[1];
    if(!origin) throw new Error('Deployment check did not provide its immutable preview URL.');
    appendFileSync(process.env.GITHUB_ENV,`PERFORMANCE_ORIGIN=${origin}\n`);
    console.log(`Performance target: ${origin} (source ${sha})`);
    process.exit(0);
  }
  await new Promise(resolve=>setTimeout(resolve,15000));
}
throw new Error('No successful deployment for this source commit within ten minutes.');
