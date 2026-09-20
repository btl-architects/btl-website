import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { buildMode } from '../../server/build-mode.js';
const mode = buildMode({ ...process.env, ...import.meta.env });
export const isPreview = mode.preview;
export const sanity = createClient({ ...mode.client, perspective: isPreview ? "drafts" : "published" });
const builder = imageUrlBuilder(sanity);
export const urlFor = (source: SanityImageSource) => builder.image(source);
