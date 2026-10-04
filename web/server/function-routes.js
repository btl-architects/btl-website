// Protected drafts and public branch previews retain middleware on every URL.
// Published production pages and assets can use Pages' static delivery directly.
export function functionRoutes(marker) {
  if (!marker || typeof marker.preview !== 'boolean' || typeof marker.noindex !== 'boolean') {
    throw new Error('A complete build-mode marker is required before selecting Function routes.');
  }
  if (marker.preview && !marker.noindex) throw new Error('Draft output must be non-indexable.');
  return {version: 1, include: marker.preview || marker.noindex ? ['/*'] : ['/build-status.json'], exclude: []};
}
