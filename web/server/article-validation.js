/* API imports bypass Studio validation. Reject malformed content before render. */
export function articleErrors(blocks = []) {
  const errors = [];
  if (!Array.isArray(blocks)) return ['Article content must be an array'];
  for (const [i, block] of blocks.entries()) {
    const fail = message => errors.push(`article block ${i + 1}: ${message}`);
    if (!block || !['block', 'figure', 'pullQuote'].includes(block._type)) {
      fail('unsupported block type'); continue;
    }
    if (block._type === 'figure') continue; // The common figure guard checks it.
    if (block._type === 'pullQuote') {
      if (typeof block.text !== 'string' || !block.text.trim() || block.text.length > 500) fail('pull quote needs 1–500 characters');
      continue;
    }
    if (!['normal', 'h2', 'h3', 'blockquote', undefined, null].includes(block.style)) fail('unsupported text style');
    if (block.listItem && !['bullet', 'number'].includes(block.listItem)) fail('unsupported list type');
    if (block.level != null && (!Number.isInteger(block.level) || block.level < 1 || block.level > 6)) fail('list depth must be 1–6');
    if (!Array.isArray(block.children) || block.children.some(s => typeof s?.text !== 'string' || s.marks != null && (!Array.isArray(s.marks) || s.marks.some(m => typeof m !== 'string')))) fail('text spans or formatting marks are malformed');
    if (block.markDefs != null && !Array.isArray(block.markDefs)) {fail('link annotations must be an array'); continue;}
    for (const mark of block.markDefs ?? []) {
      if (mark?._type !== 'link') {fail('unsupported link annotation'); continue;}
      try {
        const url = new URL(mark.href);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
      } catch {fail('link needs a public HTTP or HTTPS address');}
    }
  }
  return errors;
}
