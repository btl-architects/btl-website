/** A classification is not proof of permission. This gate enforces the
 * explicit non-reuse choice; the studio must verify all allowed licences. */
export const IMAGE_RIGHTS = ['owned', 'client-supplied', 'licensed', 'publication'] as const;
export function imageRightsError(value: unknown): string | null {
  if (!value) return 'Choose the photograph’s licence.';
  if (!IMAGE_RIGHTS.includes(value as typeof IMAGE_RIGHTS[number])) return 'Choose a supported photograph licence.';
  if (value === 'publication') return 'Publication-owned images marked “do not reuse” cannot be published on this website. Remove the image or obtain permission and record the appropriate licence.';
  return null;
}
