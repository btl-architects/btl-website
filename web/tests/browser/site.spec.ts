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
test('motion can be paused and stays stopped outside viewport',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Pause film',exact:true}).click();
  expect(await page.locator('video').evaluateAll(v=>v.every(e=>(e as HTMLVideoElement).paused))).toBeTruthy();
  await page.getByRole('button',{name:'Play film',exact:true}).click();
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect.poll(()=>page.locator('video').evaluateAll(v=>v.every(e=>(e as HTMLVideoElement).paused))).toBeTruthy();
});
test('reduced motion never requests video or advances frames',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});const media:string[]=[];page.on('request',r=>{if(r.resourceType()==='media')media.push(r.url());});
  await page.goto('/');await expect(page.locator('video[src]')).toHaveCount(0);
  await page.waitForTimeout(6500);
  await expect(page.locator('.stage__f').first()).toHaveAttribute('data-on','true');expect(media).toEqual([]);
});
test('failed enquiry keeps typed message and permits recovery',async({page})=>{
  // Never depend on provider credentials, and never send a test email.
  await page.route('**/api/enquiry',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,message:'Please email the studio.'})}));
  await page.goto('/contact/');await page.getByLabel('Name',{exact:true}).fill('Local test');await page.getByLabel('Email',{exact:true}).fill('test@example.com');
  await page.getByLabel('Message',{exact:true}).fill('This is a browser test with no external delivery.');await page.getByRole('button',{name:'Send enquiry'}).click();
  await expect(page.getByRole('status')).toContainText('Please email');await expect(page.getByLabel('Message',{exact:true})).toHaveValue('This is a browser test with no external delivery.');await expect(page.getByRole('button',{name:'Send enquiry'})).toBeEnabled();
});
