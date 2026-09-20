export function normalizePath(path) {
  if (typeof path !== 'string' || !path.trim()) throw new Error('Redirect paths must be nonempty strings.');
  const value = path.trim();
  if (value.startsWith('https://')) {
    const url = new URL(value);
    if (url.username || url.password || /\s/.test(value)) throw new Error('Invalid external redirect.');
    return value;
  }
  if (!value.startsWith('/') || value.startsWith('//') || /[\s?#:*\\]/.test(value)) throw new Error(`Use an exact internal path: ${value}`);
  const normalized = value.toLowerCase();
  return normalized === '/' || normalized.endsWith('/') || /\.[a-z0-9]+$/.test(normalized) ? normalized : normalized+'/';
}
export function resolveRedirects(rows, pages) {
  const map = new Map();
  for (const row of rows) {
    const from = normalizePath(row.from), to = normalizePath(row.to);
    if (!from.startsWith('/')) throw new Error('Redirect sources must be internal.');
    if (from === to) throw new Error(`Self redirect: ${from}`);
    if (map.has(from)) throw new Error(`Duplicate redirect: ${from}`);
    if (pages.has(from)) throw new Error(`Redirect shadows a real page: ${from}`);
    map.set(from,{to,permanent:row.permanent !== false});
  }
  const resolved = [];
  for (const [from,rule] of map) {
    const seen = new Set([from]); let to = rule.to; let permanent = rule.permanent;
    while (map.has(to)) {
      if (seen.has(to)) throw new Error(`Redirect loop: ${from}`);
      seen.add(to); const next = map.get(to); permanent = permanent && next.permanent; to = next.to;
    }
    if (to.startsWith('/') && !pages.has(to)) throw new Error(`Missing redirect target: ${from} -> ${to}`);
    resolved.push({from,to,permanent});
  }
  return resolved;
}
