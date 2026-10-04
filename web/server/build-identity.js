import {execFileSync} from 'node:child_process';

export function buildIdentity(env = process.env) {
  const provided = env.CF_PAGES_COMMIT_SHA || env.GITHUB_SHA;
  const validSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);
  if (provided && !validSha(provided)) throw new Error('The supplied build source SHA is invalid.');
  let sourceSha = provided || null, sourceDirty = null;
  if (!sourceSha) {
    try {
      sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8', cwd:new URL('../', import.meta.url), stdio:['ignore','pipe','ignore']}).trim();
      sourceDirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], {encoding:'utf8', cwd:new URL('../', import.meta.url), stdio:['ignore','pipe','ignore']}).trim());
    } catch { sourceSha = null; }
  }
  if (sourceSha && !validSha(sourceSha)) throw new Error('The build source SHA is invalid.');
  return {sourceSha, sourceDirty, builtAt:new Date().toISOString()};
}
