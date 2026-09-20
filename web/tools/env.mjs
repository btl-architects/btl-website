import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createClient} from '@sanity/client';
import {buildMode} from '../server/build-mode.js';
const path = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(path)) process.loadEnvFile(path);
export const mode = buildMode(process.env);
export const client = createClient(mode.client);
