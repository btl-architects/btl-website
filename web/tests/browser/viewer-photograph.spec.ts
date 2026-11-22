import {test,expect,type Page} from '@playwright/test';

/* The viewer must never draw one photograph under another's caption.

   It used to reuse one <img> and change its src. A browser keeps drawing the
   old picture until the new file has arrived, so on a large screen — which asks
   for a large file that nothing has fetched yet — opening the second project's
   first photograph showed the first project's, under the right count and
   caption, until the download finished. Photographs already fetched (the
   neighbours the viewer warms) were right, which is why only the first one
   ever looked wrong.

   Image responses are held for a moment so the gap is wide enough to see. */
async function slowImages(page:Page) {
  await page.route('**/*',async route=>{
    if(route.request().resourceType()==='image') await new Promise(r=>setTimeout(r,1500));
    await route.continue();
  });
}
/* What the middle of the screen shows. Measured in pixels, because Chromium
   reports the outgoing image as gone (currentSrc '') while still painting it. */
const drawn=(page:Page)=>page.screenshot({clip:{x:420,y:250,width:600,height:400}});
const same=(a:Buffer,b:Buffer)=>a.equals(b);
/* Loaded is not drawn: WebKit reports complete a frame or two before it paints.
   A snapshot taken in that gap is an empty stage, and two of those compare equal. */
const painted=(page:Page)=>page.locator('.lb__img').evaluate((im:HTMLImageElement)=>im.decode()
  .then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))));

test('a project\'s first photograph never shows the previous project\'s in the viewer',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/projects/');
  const viewer=page.getByRole('dialog',{name:'Photograph viewer'});
  await page.locator('[data-project]').nth(0).click();
  await page.locator('.pcard[data-open="true"] .rail__f').first().click();
  await expect(viewer).toBeVisible();
  await painted(page);
  const before=await drawn(page);
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();

  await slowImages(page);
  await page.locator('[data-project]').nth(1).click();
  await expect(page.locator('[data-project]').nth(1)).toHaveAttribute('aria-expanded','true');
  await page.locator('.pcard[data-open="true"] .rail__f').first().click();
  await expect(viewer).toBeVisible();
  await expect(page.locator('.lb__count')).toHaveText(/^1 \//);
  expect(same(await drawn(page),before)).toBe(false);
  await painted(page);
  expect(same(await drawn(page),before)).toBe(false);
});

/* The same within one project: a photograph stepped to before it has arrived
   shows nothing rather than the one before it. */
test('stepping to a photograph still downloading never leaves the previous one up',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/projects/nelly-house/');
  const viewer=page.getByRole('dialog',{name:'Photograph viewer'});
  const total=await page.locator('.rail__f').count();
  expect(total).toBeGreaterThan(4);
  await page.locator('.rail__f').first().click();
  await expect(viewer).toBeVisible();
  await painted(page);
  await slowImages(page);
  /* Three steps on: past the two neighbours the viewer warms each way. */
  for(let k=2;k<=4;k++){
    const was=await drawn(page);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.lb__count')).toHaveText(`${k} / ${total}`);
    expect(same(await drawn(page),was)).toBe(false);
    await painted(page);
  }
});
