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
/* Mouse first, keyboard after — the way most people actually mix them. A
   card's last pointer press used to be kept for ever, so Enter after any click
   read as a drag and the browser left the index for the project's own page. */
test('a project opened by mouse and closed can be reopened from the keyboard in place',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/projects/');
  const entry=page.locator('[data-project]').first();
  await page.locator('.pcard').first().click({position:{x:120,y:60}});
  await expect(entry).toHaveAttribute('aria-expanded','true');
  /* Safari does not focus what a mouse clicks, so the keyboard user's first
     step there is to reach the card; the pointer press is still on record. */
  await entry.focus();
  await page.keyboard.press('Escape');await expect(entry).toBeFocused();
  await expect(entry).toHaveAttribute('aria-expanded','false');
  await page.evaluate(()=>{(window as any).stayed=true;});
  await page.keyboard.press('Enter');await expect(entry).toHaveAttribute('aria-expanded','true');
  expect(await page.evaluate(()=>(window as any).stayed)).toBe(true);
});
/* The viewer captures the pointer, so every click arrived addressed to the
   stage and a click on the photograph — under a magnifier cursor — closed it. */
test('clicking the photograph in the viewer zooms; clicking around it closes',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/projects/nelly-house/');
  await page.locator('.rail__f').first().click();
  const viewer=page.getByRole('dialog',{name:'Photograph viewer'});await expect(viewer).toBeVisible();
  const stage=page.locator('.lb__stage');const photo=page.locator('.lb__img');
  await expect(photo).toHaveJSProperty('complete',true);
  const box=(await photo.boundingBox())!;
  await photo.click();await expect(stage).toHaveAttribute('data-zoomed','true');await expect(viewer).toBeVisible();
  /* Zooming fetches a sharper rendition than the 2000px one it opened on. */
  await expect(photo).toHaveAttribute('src',/[?&]w=(3500|6000)\b/,{timeout:20000});
  /* The mouse steers without a button: at the fitted frame's left edge the
     photograph's left edge is on screen, at its right edge its right edge. */
  const view=page.viewportSize()!;
  await page.mouse.move(Math.max(1,box.x-6),box.y+box.height/2);
  await expect.poll(async()=>Math.round((await photo.boundingBox())!.x)).toBeGreaterThanOrEqual(-1);
  await page.mouse.move(Math.min(view.width-2,box.x+box.width+6),box.y+box.height/2);
  await expect.poll(async()=>{const b=(await photo.boundingBox())!;return Math.round(b.x+b.width)}).toBeLessThanOrEqual(view.width+1);
  await expect(viewer).toBeVisible();
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await expect(stage).toHaveAttribute('data-zoomed','false');await expect(viewer).toBeVisible();
  await page.mouse.click(box.x+box.width/2,Math.max(2,box.y-20));
  await expect(viewer).toBeHidden();
});
/* A project's own page steps its photographs with the same row an open card
   has (RailNav): the arrow moves the strip, and the counter follows it. */
test('a project page steps its photographs with the shared control row',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/projects/nelly-house/');
  const row=page.locator('[data-rail] + [data-nav]');
  await expect(row).toBeVisible();await expect(row.locator('[data-pos]')).toHaveText(/^01 \/ \d\d$/);
  await row.getByRole('button',{name:'Next photographs in Nelly House'}).click();
  await expect(row.locator('[data-pos]')).not.toHaveText(/^01 /);
  await expect(page.getByRole('button',{name:'Next photographs',exact:true})).toHaveCount(0);
});
/* On a computer tel: has nothing to open, so the click copies the number and a
   tooltip says so; the link's own text is left alone. Chromium only: WebKit's
   test browser grants no clipboard access. */
test('clicking the phone number on a computer copies it with a tooltip',async({page,context,browserName})=>{
  test.skip(browserName!=='chromium','clipboard permission is Chromium-only in Playwright');
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.goto('/contact/');
  const phone=page.locator('main a[href^="tel:"]').first();
  const number=(await phone.textContent())!.trim();
  await phone.click();
  await expect(page.locator('.tip[data-show]')).toHaveText('Copied');
  await expect(phone).toHaveText(number);
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(number);
  await expect(page).toHaveURL(/\/contact\/$/);
  await expect(page.locator('.tip[data-show]')).toHaveCount(0);
});
/* What a trigger opens must follow it in the tab order. */
test('Tab after opening a project moves into its photographs',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/projects/');
  const entry=page.locator('[data-project]').first();
  await entry.press('Enter');await expect(entry).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Tab');
  await expect(page.locator('.pcard[data-open="true"] .rail__f').first()).toBeFocused();
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
