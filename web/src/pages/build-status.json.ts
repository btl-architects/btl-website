import type { APIRoute } from 'astro';
import { isPreview, isNoindex } from '../lib/sanity';
import { buildIdentity } from '../../server/build-identity.js';
export const GET: APIRoute = () => Response.json({preview:isPreview, noindex:isNoindex, ...buildIdentity()});
