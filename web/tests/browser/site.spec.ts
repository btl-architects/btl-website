import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {pages} from '../../tools/pages.mjs';

for(const {route} of pages()) {
  test(`${route} is accessible and fits narrow screens`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    for(const width of [320,375,768,1440]) {
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    expect(result.violations).toEqual([]);expect(errors).toEqual([]);
  });
}
/* A photograph must be fetched at the size it is drawn.
   `sizes` is a promise about layout that nothing checks, and when it under-asks
   the browser picks a smaller file and stretches it — blur that looks like a
   bad upload. It happened to the first six frames of every opened project,
   declared as 400px thumbnails and drawn at 645. So: on a 2x screen, every
   picture's file must carry at least 1.5 pixels per CSS pixel, unless it is
   already the largest file offered. */
async function underResolved(page:import('@playwright/test').Page) {
  await page.evaluate(async()=>{document.querySelectorAll('img').forEach(i=>i.loading='eager');
    await Promise.all([...document.images].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r;})));});
  return page.evaluate(()=>[...document.querySelectorAll('img[srcset]')].flatMap(i=>{
    const im=i as HTMLImageElement,w=im.getBoundingClientRect().width;
    if(w<2||!im.currentSrc)return [];
    const widths=im.srcset.split(/,\s+/).map(c=>+c.trim().split(/\s+/)[1]!.slice(0,-1));
    const got=widths[im.srcset.split(/,\s+/).findIndex(c=>c.trim().split(/\s+/)[0]===im.currentSrc)] ?? 0;
    /* Excused only when nothing sharper exists: the file is the largest offered
       AND the largest offered is the original (Sanity puts it in the URL). The
       looser "largest offered" hid a ladder that offered a 720px upload at 480. */
    const original=+(im.currentSrc.match(/-(\d+)x\d+\.\w+\?/)?.[1] ?? 0);
    const exhausted=got===Math.max(...widths) && (!original || got>=Math.min(original,2000));
    return got && !exhausted && got/w<1.5 ? [`${im.alt.slice(0,40)}: ${got}px file drawn at ${Math.round(w)}px (sizes="${im.sizes}")`] : [];
  }));
}
test.describe('photographs are fetched at the size they are drawn',()=>{
  test.use({deviceScaleFactor:2});
  for(const width of [375,1024,1440]) test(`at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    const found:string[]=[];
    /* domcontentloaded, not load: this walks every route in one test, and the
       home page's film keeps a media request open long enough for `load` to
       outlast the timeout in WebKit and Firefox. The images are awaited
       explicitly below, which is what this actually measures. */
    /* .html is stripped because the server 308s /404.html to /404, and WebKit
       will not settle that redirect inside this test's budget. Same page,
       asked for by the address the site actually publishes. */
    for(const {route} of pages()){await page.goto(route.replace(/\.html$/,''),{waitUntil:'domcontentloaded'});found.push(...(await underResolved(page)).map(s=>`${route} ${s}`));}
    await page.goto('/projects/',{waitUntil:'domcontentloaded'});await page.locator('[data-project]').first().click();
    await expect(page.locator('.pcard[data-open="true"] .rail__f:not(.pcard__peek)').first()).toBeAttached();
    found.push(...(await underResolved(page)).map(s=>`open project ${s}`));
    expect(found).toEqual([]);
  });
});
test('gallery keyboard access, nested Escape, and browser history',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/projects/');
  const entry=page.locator('[data-project]').first();
  await entry.press('Enter');await expect(entry).toHaveAttribute('aria-expanded','true');
  const figure=page.locator('.pcard[data-open="true"] .rail__f').first();
  await figure.press('Enter');await expect(page.getByRole('dialog',{name:'Photograph viewer'})).toBeVisible();
  const total=await page.locator('.pcard[data-open="true"] .rail__f').count();
  await page.keyboard.press('ArrowRight');await expect(page.locator('.lb__count')).toHaveText(`2 / ${total}`);
  await page.keyboard.press('Escape');await expect(entry).toHaveAttribute('aria-expanded','true');await expect(figure).toBeFocused();
  await page.goBack();await expect(entry).toHaveAttribute('aria-expanded','false');
  await page.goForward();await expect(entry).toHaveAttribute('aria-expanded','true');
});
test('menu includes Close in its focus cycle and restores focus',async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto('/contact/');
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  await page.getByRole('link',{name:'Home',exact:true}).press('Shift+Tab');
  await expect(page.getByRole('button',{name:'Close',exact:true})).toBeFocused();
  await expect(page.locator('main')).toHaveJSProperty('inert',true);
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Menu',exact:true})).toBeFocused();
  await expect(page.locator('main')).toHaveJSProperty('inert',false);
});
/* The pause control was removed at the practice's decision, so the assertions
   that clicked it are gone with it. What is still promised — and still worth
   failing a build over — is that the film stops on its own when nobody is
   looking at it. The absence of the control is asserted too, so that if one
   returns it is because somebody chose to add it. */
test('film stops outside the viewport and offers no pause control',async({page})=>{
  await page.goto('/');
  await expect(page.locator('[data-stage-pause]')).toHaveCount(0);
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect.poll(()=>page.locator('video').evaluateAll(v=>v.every(e=>(e as HTMLVideoElement).paused))).toBeTruthy();
});
test('reduced motion never requests video or advances frames',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});const media:string[]=[];page.on('request',r=>{if(r.resourceType()==='media')media.push(r.url());});
  await page.goto('/');await expect(page.locator('video[src]')).toHaveCount(0);
  await page.waitForTimeout(6500);
  await expect(page.locator('.stage__f').first()).toHaveAttribute('data-on','true');expect(media).toEqual([]);
});
/* The form posts from the browser to Web3Forms. Nothing here may reach it:
   every request is intercepted, and a stand-in key is set in the page because
   test builds are never given the real one. */
test('failed enquiry keeps typed message and permits recovery',async({page})=>{
  await page.route('https://api.web3forms.com/**',route=>route.fulfill({status:429,contentType:'application/json',body:JSON.stringify({success:false,message:'Rate limit exceeded.'})}));
  await page.goto('/contact/');
  await page.locator('[name="access_key"]').evaluate(e=>(e as HTMLInputElement).value='test-only-key');
  await page.getByLabel('Name',{exact:true}).fill('Local test');await page.getByLabel('Email',{exact:true}).fill('test@example.com');
  await page.getByLabel('Message',{exact:true}).fill('This is a browser test with no external delivery.');await page.getByRole('button',{name:'Send enquiry'}).click();
  await expect(page.getByRole('status')).toContainText('has not been sent');await expect(page.getByLabel('Message',{exact:true})).toHaveValue('This is a browser test with no external delivery.');await expect(page.getByRole('button',{name:'Send enquiry'})).toBeEnabled();
});
test('a build without the key says so and contacts no one',async({page})=>{
  const outbound:string[]=[];page.on('request',r=>{if(r.url().includes('web3forms'))outbound.push(r.url());});
  await page.goto('/contact/');
  await page.locator('[name="access_key"]').evaluate(e=>(e as HTMLInputElement).value='');
  await page.getByLabel('Name',{exact:true}).fill('Local test');await page.getByLabel('Email',{exact:true}).fill('test@example.com');
  await page.getByLabel('Message',{exact:true}).fill('This must never leave the browser in a keyless build.');await page.getByRole('button',{name:'Send enquiry'}).click();
  await expect(page.getByRole('status')).toContainText('not available on this copy');
  expect(outbound).toEqual([]);
});
