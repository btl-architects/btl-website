interface UploadedImage {
  asset?: {_ref?: string};
  crop?: {left?: number; right?: number; top?: number; bottom?: number};
}

/** Non-blocking guidance uses the pixels remaining after Sanity's saved crop. */
export function imageResolutionWarning(value?: UploadedImage): true | string {
  const ref = value?.asset?._ref;
  if (!ref || ref.endsWith('-svg')) return true;
  const match = ref.match(/-(\d+)x(\d+)-[a-z]+$/i);
  if (!match) return true;
  const originalWidth = Number(match[1]), originalHeight = Number(match[2]);
  const crop = value?.crop;
  const width = Math.max(1, Math.round(originalWidth - originalWidth * (crop?.right ?? 0) - Math.round(originalWidth * (crop?.left ?? 0))));
  const height = Math.max(1, Math.round(originalHeight - originalHeight * (crop?.bottom ?? 0) - Math.round(originalHeight * (crop?.top ?? 0))));
  if (Math.max(width, height) >= 2000 && Math.min(width, height) >= 1200) return true;
  return `This image has ${width} × ${height} usable pixels${crop ? ' after its saved crop' : ''}. It may look soft when shown large on a sharp screen. Use the original camera file, ideally at least 2000 pixels on the longer side and 1200 on the shorter side after cropping. A small portrait can still be published; this is only a warning.`;
}
