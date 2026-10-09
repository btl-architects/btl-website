/* svh/dvh/lvh need a fallback for browsers that predate them (older Android
 * System WebViews behind in-app browsers, iOS before 15.4). A plain declaration
 * must follow the same property set in vh; a custom property, or a var()
 * fallback, must use the --svh/--dvh tokens, because neither is ever checked
 * where it is written and so cannot fall back. Returns the offending
 * declarations; used by budget.mjs on the source and on the built pages. */
export function viewportUnitProblems(css, name) {
  const problems = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const block of clean.matchAll(/\{([^{}]*)\}/g)) {
    const decls = block[1].split(';').map(d => d.trim()).filter(Boolean);
    decls.forEach((decl, i) => {
      const m = decl.match(/^(--?[\w-]+|[a-z-]+)\s*:\s*([\s\S]*)$/);
      if (!m || !/\d(?:s|d|l)vh\b/.test(m[2])) return;
      const [, prop, value] = m;
      if (/^--[sd]vh$/.test(prop) && /^1[sd]vh$/.test(value.trim())) return;   // the tokens themselves
      if (prop.startsWith('--') || /var\([^)]*\d(?:s|d|l)vh/.test(value)) {
        problems.push(`${name}: ${prop}: ${value.trim()} — custom properties and var() fallbacks must use var(--svh)/var(--dvh), never svh/dvh directly`);
        return;
      }
      const before = decls.slice(0, i).reverse().find(d => d.split(':')[0].trim() === prop);
      if (!before || !/\dvh\b/.test(before) || /\d(?:s|d|l)vh\b/.test(before))
        problems.push(`${name}: ${prop}: ${value.trim()} has no vh fallback before it`);
    });
  }
  return problems;
}
