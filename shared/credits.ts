/** Unknown optional credits are omitted; verified attribution stays untouched.
 * Match the whole field, never words embedded in a real person's name. */
export function optionalPhotographerCredit(value: unknown): string {
  if (typeof value !== 'string') return '';
  if (!value.trim()) return '';
  return /^(?:photographer\s+)?(?:to\s+be\s+confirmed|tbc|tbd)$/i.test(value.trim()) ? '' : value;
}
