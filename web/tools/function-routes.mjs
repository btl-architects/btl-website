import {readFileSync, writeFileSync} from 'node:fs';
import {functionRoutes} from '../server/function-routes.js';

const dist = new URL('../dist/', import.meta.url);
// The marker is rendered by Astro using exactly the same mode as the pages.
// Missing, invalid or inconsistent markers abort rather than opening previews.
const marker = JSON.parse(readFileSync(new URL('build-status.json', dist), 'utf8'));
const routes = functionRoutes(marker);
writeFileSync(new URL('_routes.json', dist), JSON.stringify(routes) + '\n');
console.log(`[function-routes] ${marker.preview || marker.noindex ? 'all preview requests protected' : 'production uses static delivery; diagnostic marker guarded'}`);
