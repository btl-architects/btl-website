// Draft output requires authentication on every URL. Published previews use
// static delivery with a build-generated noindex header, like production.
export function functionRoutes(marker) {
  if (!marker || typeof marker.preview !== 'boolean' || typeof marker.noindex !== 'boolean') {
    throw new Error('A complete build-mode marker is required before selecting Function routes.');
  }
  if (marker.preview && !marker.noindex) throw new Error('Draft output must be non-indexable.');
  return {version: 1, include: marker.preview ? ['/*'] : ['/build-status.json'], exclude: []};
}

export function previewHeaders(marker) {
  functionRoutes(marker); // Share the fail-closed build-mode validation.
  return marker.noindex ? '\n/*\n  X-Robots-Tag: noindex, nofollow\n' : '';
}
