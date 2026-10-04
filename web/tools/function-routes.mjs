import {readFileSync, writeFileSync} from 'node:fs';
import {functionRoutes,previewHeaders} from '../server/function-routes.js';

const dist = new URL('../dist/', import.meta.url);
// The marker is rendered by Astro using exactly the same mode as the pages.
// Missing, invalid or inconsistent markers abort rather than opening previews.
const marker = JSON.parse(readFileSync(new URL('build-status.json', dist), 'utf8'));
const routes = functionRoutes(marker);
writeFileSync(new URL('_routes.json', dist), JSON.stringify(routes) + '\n');
writeFileSync(new URL('_headers', dist), readFileSync(new URL('_headers', dist),'utf8')+previewHeaders(marker));
console.log(`[function-routes] ${marker.preview ? 'all draft requests protected' : 'published pages use static delivery; diagnostic marker guarded'}`);
