export function isSafeSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 96 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
