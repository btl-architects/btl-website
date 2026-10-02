import { createClient } from '@sanity/client';
import {createImageUrlBuilder, type SanityImageSource} from '@sanity/image-url';
import { buildMode } from '../../server/build-mode.js';
const mode = buildMode({ ...process.env, ...import.meta.env });
export const isPreview = mode.preview;
export const isNoindex = mode.noindex;
export const sanity = createClient({ ...mode.client, perspective: isPreview ? "drafts" : "published" });
const builder = createImageUrlBuilder(sanity);
export const urlFor = (source: SanityImageSource) => builder.image(source);
