import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const clip = readFileSync(fileURLToPath(new URL('../fixtures/opening-clip.mp4', import.meta.url)));

async function films(page: import('@playwright/test').Page) {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  for (const source of ['https://cdn.sanity.io/files/**','https://stream.mux.com/**'])
    await page.route(source, route => {
      // WebKit seeks with byte-range requests. Model the real video CDN;
      // returning the entire file with 200 can leave its decoder stuck.
      const range = route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/);
      const headers = {'Accept-Ranges':'bytes'};
      if (!range) return route.fulfill({status:200,contentType:'video/mp4',headers,body:clip});
      const start=Number(range[1]),end=Math.min(Number(range[2] || clip.length-1),clip.length-1);
      if(start> end) return route.fulfill({status:416,headers:{...headers,'Content-Range':`bytes */${clip.length}`},body:''});
      return route.fulfill({status:206,contentType:'video/mp4',headers:{...headers,'Content-Range':`bytes ${start}-${end}/${clip.length}`},body:clip.subarray(start,end+1)});
    });
}

// Build the requested number of clips independently of current client content.
async function sequence(page: import('@playwright/test').Page, total: number, failedIndex?: number) {
  await page.route(new URL('/',test.info().project.use.baseURL).href, async route => {
    const response = await route.fetch();
    let count = 0;
    const body = (await response.text()).replace(/<figure class="stage__f"[\s\S]*?<\/figure>/g, frame => {
      if (++count > 1) return '';
      return Array.from({length: total}, (_, index) => frame
        .replace('data-on="true"', `data-on="${index===0}"`)
        .replace(/(data-src(?:-portrait)?=")([^"]+)"/g,
          `$1$2?btl-clip=${index}${index===failedIndex?'&amp;btl-missing=1':''}"`)).join('');
    });
    expect(count).toBeGreaterThanOrEqual(1);
    await route.fulfill({response, body});
  });
}

for (const {width,frameCallback} of [{width:390,frameCallback:true},{width:1440,frameCallback:true},{width:390,frameCallback:false}]) {
  test(`a delayed incoming film never exposes its poster at ${width}px${frameCallback?'':' without frame callbacks'}`, async ({page}) => {
    if(!frameCallback) await page.addInitScript(()=>Object.defineProperty(HTMLVideoElement.prototype,'requestVideoFrameCallback',{value:undefined,configurable:true}));
    await films(page);
    await sequence(page,3);
    await page.setViewportSize({width,height:844});
    let release!:()=>void;
    const held=new Promise<void>(resolve=>{release=resolve;});
    let requested=false;
    await page.route('**/*btl-clip=1',async route=>{
      requested=true;
      await held;
      await route.fallback();
    });
    try {
      await page.goto('/');
      const frames=page.locator('.stage__f');
      const first=frames.first().locator('video');
      await expect(first).toHaveAttribute('data-playing','true');
      // Preloading starts as soon as the first film is ready, including clips
      // shorter than the old three-second preload delay.
      await expect.poll(()=>requested).toBe(true);
      await first.evaluate(el=>{const v=el as HTMLVideoElement;v.currentTime=v.duration-.1;});
      await expect(first).toHaveJSProperty('ended',true);
      const samples=await page.evaluate(async()=>{
        const frames=[...document.querySelectorAll('.stage__f')];
        const samples:boolean[]=[];
        for(let i=0;i<45;i++) {
          await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
          samples.push(frames[0].getAttribute('data-on')==='true' && frames[1].getAttribute('data-on')==='false');
        }
        return samples;
      });
      expect(samples.every(Boolean)).toBe(true);
      await page.evaluate(()=>{
        (window as any).__posterFlashes=[];
        const observer=new MutationObserver(()=>{
          const active=document.querySelector('.stage__f[data-on="true"]');
          if(!active?.querySelector('video[data-playing="true"]')) (window as any).__posterFlashes.push(active?.getAttribute('data-label'));
        });
        observer.observe(document.querySelector('[data-stage-frames]')!,{subtree:true,attributes:true,attributeFilter:['data-on','data-playing']});
      });
      release();
      await expect(frames.nth(1)).toHaveAttribute('data-on','true');
      await expect(frames.nth(1).locator('video')).toHaveAttribute('data-playing','true');
      expect(await page.evaluate(()=>(window as any).__posterFlashes)).toEqual([]);
    } finally { release(); }
  });
}

test('a pending film cannot advance after reduced motion is enabled', async ({page}) => {
  await films(page);
  await sequence(page,2);
  let release!:()=>void;
  const held=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/*btl-clip=1',async route=>{await held;await route.fallback();});
  try {
    await page.goto('/');
    const first=page.locator('.stage__f').first().locator('video');
    await expect(first).toHaveAttribute('data-playing','true');
    await first.evaluate(el=>{const v=el as HTMLVideoElement;v.currentTime=v.duration-.1;});
    await expect(first).toHaveJSProperty('ended',true);
    await page.emulateMedia({reducedMotion:'reduce'});
    release();
    await expect(page.locator('.stage__f').first()).toHaveAttribute('data-on','true');
    await expect(page.locator('.stage__f').nth(1)).toHaveAttribute('data-on','false');
    for(const film of await page.locator('.stage__f video').all()) {
      await expect(film).not.toHaveAttribute('src');
      await expect(film).toHaveJSProperty('paused',true);
    }
  } finally { release(); }
});

test('opening films play their complete duration and the sequence restarts', async ({page}) => {
  await films(page);
  await sequence(page, 3);
  await page.goto('/');
  const frames = page.locator('.stage__f');
  expect(await frames.count()).toBeGreaterThan(1);
  const first = frames.first().locator('video');
  await expect(first).toHaveAttribute('data-playing', 'true');
  await expect(first).toHaveJSProperty('loop', false);
  // The old fixed 6.2-second rotation would cut this eight-second upload short.
  await expect.poll(() => first.evaluate(el => (el as HTMLVideoElement).currentTime), {timeout:12000}).toBeGreaterThan(6.3);
  await expect(frames.first()).toHaveAttribute('data-on', 'true');
  await expect(frames.nth(1)).toHaveAttribute('data-on', 'true', {timeout:5000});
  for (let index = 1; index < await frames.count(); index++) {
    const video = frames.nth(index).locator('video');
    await expect(video).toHaveAttribute('data-playing', 'true');
    await expect.poll(() => video.evaluate(el => (el as HTMLVideoElement).paused)).toBe(false);
    await expect(frames.nth((index + 1) % await frames.count())).toHaveAttribute('data-on', 'true', {timeout:12000});
  }
  await expect.poll(() => first.evaluate(el => (el as HTMLVideoElement).currentTime)).toBeLessThan(2);
});

test('a single uploaded film loops in place', async ({page}) => {
  await films(page);
  await sequence(page, 1);
  await page.goto('/');
  await expect(page.locator('.stage__f')).toHaveCount(1);
  const video = page.locator('.stage__f video');
  await expect(video).toHaveAttribute('data-playing', 'true');
  await expect(video).toHaveJSProperty('loop', true);
  await video.evaluate(el => {const film = el as HTMLVideoElement; film.currentTime = film.duration - .1;});
  await expect.poll(() => video.evaluate(el => (el as HTMLVideoElement).currentTime)).toBeLessThan(2);
  await expect(page.locator('.stage__f')).toHaveAttribute('data-on', 'true');
});

test('a failed preloaded film shows its still then continues to the next clip', async ({page}) => {
  await films(page);
  await page.route('**/*btl-missing=1', route => route.fulfill({status:404,body:'Unavailable'}));
  await sequence(page,3,1);
  await page.goto('/');
  const frames=page.locator('.stage__f');
  await expect(frames.first().locator('video')).toHaveAttribute('data-playing','true');
  await expect.poll(() => frames.nth(1).locator('video').evaluate(el => Boolean((el as HTMLVideoElement).error)),{timeout:6000}).toBe(true);
  await expect(frames.first()).toHaveAttribute('data-on','true');
  await expect(frames.nth(1)).toHaveAttribute('data-on','true',{timeout:10000});
  await expect(frames.nth(1).locator('video')).not.toHaveAttribute('data-playing','true');
  await expect(frames.nth(2)).toHaveAttribute('data-on','true',{timeout:9000});
  await expect(frames.nth(2).locator('video')).toHaveAttribute('data-playing','true');
});

test('founders photograph has enough source detail for a Retina spread', async ({page}) => {
  await page.goto('/');
  const image = page.locator('#people .spread__media img');
  await image.scrollIntoViewIfNeeded();
  const pixels = await image.evaluate(el => ({width: Number(el.getAttribute('width')), height: Number(el.getAttribute('height'))}));
  expect(pixels.width).toBeGreaterThanOrEqual(2000);
  expect(pixels.height).toBeGreaterThanOrEqual(2000);
  await expect(image).toHaveAttribute('alt', /Faizan Hussain.*Thressia Paul/);
  const names = await page.locator('#people .spread__n').allTextContents();
  expect(names.map(name => name.trim())).toEqual(['Ar. Faizan Hussain','Ar. Thressia Paul']);
});


for (const width of [375,1440]) {
  test(`published film sources play at ${width}px`, async ({page}) => {
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.setViewportSize({width,height:900});
    await page.goto('/');
    const film=page.locator('.stage__f[data-on="true"] video');
    await expect(film).toHaveAttribute('data-playing','true',{timeout:20000});
    await expect.poll(() => film.evaluate(el => (el as HTMLVideoElement).currentTime)).toBeGreaterThan(.1);
    const source=await film.evaluate(el => ({current:(el as HTMLVideoElement).currentSrc,
      expected:el.getAttribute(window.matchMedia('(max-width:47.99rem)').matches ? 'data-src-portrait' : 'data-src'),
      muted:(el as HTMLVideoElement).muted,error:(el as HTMLVideoElement).error?.code}));
    expect(source.current).toBe(source.expected);
    expect(source.muted).toBe(true);
    expect(source.error).toBeUndefined();
  });
}

for (const width of [390,1440]) {
  test(`hidden film posters do not download on arrival at ${width}px`, async ({page}) => {
    await films(page);
    await page.setViewportSize({width,height:844});
    // A clip's poster may also appear in a legitimate project thumbnail.
    // Tag only the inert poster URLs so that those requests stay distinguishable.
    await page.route(new URL('/',test.info().project.use.baseURL).href,async route=>{
      const response=await route.fetch();
      const body=(await response.text()).replace(/<template data-stage-poster>[\s\S]*?<\/template>/g,
        template=>template.replace(/(\/assets\/media\/[^\s"'<>]+)/g,'$1&amp;btl-poster=1'));
      await route.fulfill({response,body});
    });
    const images:string[]=[];
    page.on('request',request=>{if(request.resourceType()==='image') images.push(request.url());});
    await page.goto('/');
    const first=page.locator('.stage__f').first();
    await expect(first.locator('video')).toHaveAttribute('data-playing','true');
    const hidden=page.locator('.stage__f').filter({has:page.locator('template[data-stage-poster]')});
    expect(await hidden.count()).toBeGreaterThan(0);
    await expect(hidden.locator('img')).toHaveCount(0);
    const urls=await hidden.evaluateAll(frames=>frames.flatMap(frame=>{
      const template=frame.querySelector('template[data-stage-poster]') as HTMLTemplateElement;
      return [...template.content.querySelectorAll('[srcset]')].flatMap(el=>el.getAttribute('srcset')!.split(', ').map(part=>new URL(part.split(' ')[0],location.href).href));
    }));
    expect(images.filter(url=>urls.includes(url))).toEqual([]);
    // A real error still restores the correct authored poster before advancing.
    const second=page.locator('.stage__f').nth(1);
    await expect(second.locator('video')).toHaveCount(1);
    await first.locator('video').evaluate(el=>{const v=el as HTMLVideoElement;v.currentTime=v.duration-.1;});
    await expect(second.locator('video')).toHaveAttribute('data-playing','true');
    await second.locator('video').evaluate(el=>el.dispatchEvent(new Event('error')));
    await expect(second).toHaveAttribute('data-on','true');
    await expect(second.locator('img')).toHaveCount(1);
    await expect.poll(()=>second.locator('img').evaluate(el=>(el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth>0)).toBe(true);
    await expect(second.locator('video')).not.toHaveAttribute('data-playing','true');
  });
}
