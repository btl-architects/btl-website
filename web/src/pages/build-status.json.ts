import type { APIRoute } from 'astro';
import { isPreview } from '../lib/sanity';
export const GET: APIRoute = () => Response.json({preview:isPreview});
