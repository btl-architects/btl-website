import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
export const dist = fileURLToPath(new URL('../dist/',import.meta.url));
export function pages(dir=dist,base='') {
  return readdirSync(dir).flatMap(name=>{
    const path=join(dir,name);
    return statSync(path).isDirectory() ? pages(path,base+'/'+name) : name.endsWith('.html') ? [{path,route:name==='index.html' ? base+'/' : base+'/'+name,html:readFileSync(path,'utf8')}] : [];
  });
}
