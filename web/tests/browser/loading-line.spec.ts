import {test,expect,type Page} from '@playwright/test';

/* Waiting, on this site, is either invisible or the btl line — never a blank
   that looks broken, and never a loading mark for something that was quick.

   Network throttling, not page.route: Playwright switches the browser cache off
   for as long as any route is installed, and the viewer's stand-in is exactly a
   cache hit. Throttling is a Chromium DevTools feature, so these run there. */
async function throttle(page:Page) {
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:2000,downloadThroughput:30*1024,uploadThroughput:30*1024});
}
const opacity=(page:Page,selector:string)=>page.locator(selector).evaluate(el=>+getComputedStyle(el).opacity);

test('the viewer opens at once on the photograph the page already has, then sharpens',async({page,browserName})=>{
  test.skip(browserName!=='chromium','needs Chromium network throttling');
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/projects/');
  await page.locator('[data-project]').nth(1).click();
  const first=page.locator('.pcard[data-open="true"] .rail__f').first();
  await expect(first.locator('img')).toHaveJSProperty('complete',true);
  const strip=await first.locator('img').evaluate((im:HTMLImageElement)=>im.currentSrc);
  await throttle(page);
  await first.click();
  const photo=page.locator('.lb__img');
  /* Straight away: the strip's own file, already decoded, drawn at the size the
     viewer's file will take — not a strip-sized thumbnail in a large dark room. */
  await expect(photo).toHaveAttribute('src',strip,{timeout:300});
  expect(await photo.evaluate((im:HTMLImageElement)=>im.complete&&im.naturalWidth>0)).toBe(true);
  expect((await photo.boundingBox())!.width).toBeGreaterThan(900);
  await expect(page.locator('.lb')).toHaveAttribute('data-waiting','false');
  /* Then the viewer's own file replaces it in place. */
  await expect(photo).not.toHaveAttribute('src',strip,{timeout:30000});
  expect((await photo.boundingBox())!.width).toBeGreaterThan(900);
});

test('the line sits out a pause, so a quick wait never shows it',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/projects/nelly-house/');
  await page.locator('.rail__f').first().click();
  await expect(page.locator('.lb')).toHaveAttribute('data-waiting','false');
  /* Let the viewer's own file land first: its load ends any wait, forced or not. */
  await page.waitForLoadState('networkidle');
  /* Force the empty-stage state and watch the mark's own clock. */
  await page.evaluate(()=>document.querySelector('.lb')!.setAttribute('data-waiting','true'));
  await page.waitForTimeout(150);
  expect(await opacity(page,'.lb__wait')).toBe(0);
  await expect.poll(()=>opacity(page,'.lb__wait'),{timeout:2000}).toBe(1);
  await page.evaluate(()=>document.querySelector('.lb')!.setAttribute('data-waiting','false'));
  await expect(page.locator('.lb__wait')).toBeHidden();
});

test('opening a project that is still on its way shows the line after its place, then clears it',async({page,browserName})=>{
  test.skip(browserName!=='chromium','needs Chromium network throttling');
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/projects/');
  const card=page.locator('.pcard').last();
  await card.scrollIntoViewIfNeeded();
  await throttle(page);
  /* Name-only cards are not warmed until the visitor nears them; the last one
     is still cold on a throttled line, which is the case the line is for. */
  const box=await card.locator('.pcard__name').boundingBox();
  await card.locator('[data-project]').click();
  const mark=card.locator('.pcard__place .wait');
  await expect(mark).toBeAttached();
  /* Inline and shorter than the line it sits in: the name has not moved. */
  expect((await card.locator('.pcard__name').boundingBox())!.y).toBeCloseTo(box!.y,0);
  await expect.poll(()=>mark.evaluate(el=>+getComputedStyle(el).opacity),{timeout:3000}).toBe(1);
  await expect(card).toHaveAttribute('data-open','true',{timeout:60000});
  await expect(mark).toHaveCount(0);
});

test('the press reader says it is opening, and shows the line rather than the words',async({page})=>{
  /* Every article page never answers, from before the index can warm one. */
  await page.route(/\/press\/[^/]+\/$/,()=>new Promise(()=>{}));
  await page.goto('/press/');
  await page.locator('a[href^="/press/"]:not([href="/press/"])').first().click();
  const status=page.locator('.press-reader__status');
  await expect(status).toHaveText('Opening article…');
  await expect(status.locator('.wait')).toBeAttached();
  await expect.poll(()=>opacity(page,'.press-reader__status .wait'),{timeout:2000}).toBe(1);
});
