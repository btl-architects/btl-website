import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes=['/','/projects/','/projects/nelly-house/','/press/','/people/','/studio/','/contact/'];
test.use({isMobile:true,hasTouch:true,deviceScaleFactor:2});
test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});});

for(const viewport of [{width:768,height:1024},{width:820,height:1180},{width:1024,height:768},{width:1180,height:820},{width:1366,height:1024}]) {
  test(`tablet layout keeps desktop composition and touch targets at ${viewport.width}px`,async({page})=>{
    await page.setViewportSize(viewport);
    for(const route of routes) {
      await page.goto(route,{waitUntil:'domcontentloaded'});
      await page.evaluate(()=>document.fonts.ready);
      expect(await page.evaluate(()=>matchMedia('(hover: none) and (pointer: coarse)').matches)).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await expect(page.locator('.nav')).toBeVisible();
      await expect(page.locator('.burger')).toBeHidden();
      for(const control of await page.locator('.nav__link,.header__logo,.onward,.footer__links a,.chips .chip,.f input:not([type="hidden"]),a.tl[href^="mailto:"],a.tl[href^="tel:"]').all()) {
        const box=await control.boundingBox();
        if(box)expect(box.height).toBeGreaterThanOrEqual(44);
      }
      if(route==='/'||route==='/contact/') {
        for(const mark of await page.locator('.copy-mark').all()) await expect(mark).toBeVisible();
      }
      if(route==='/'||route==='/studio/'||route==='/people/') {
        for(const spread of await page.locator('.spread').all()) {
          const media=await spread.locator('.spread__media').boundingBox();
          const body=await spread.locator('.spread__body').boundingBox();
          if(media&&body) expect(media.x+media.width<=body.x+1||body.x+body.width<=media.x+1).toBe(true);
        }
      }
      if(route==='/projects/nelly-house/') {
        await expect(page.locator('[data-rail] > .rail__note')).toBeVisible();
        await expect(page.locator('.project-note--touch')).toBeHidden();
        const name=(await page.locator('.pjh__name').boundingBox())!;
        const place=(await page.locator('.pjh__place').boundingBox())!;
        expect(place.x).toBeGreaterThan(name.x+name.width-1);
      }
      if(route==='/contact/') {
        const form=(await page.locator('.contact__grid form').boundingBox())!;
        const aside=(await page.locator('.contact__aside').boundingBox())!;
        expect(aside.x).toBeGreaterThan(form.x+form.width-1);
      }
      if(route==='/'||route==='/studio/'||route==='/contact/') {
        const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
        expect(result.violations).toEqual([]);
      }
    }
  });
}

test('tablet project cards open around the touched frame and close with a tap',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/projects/');
  const card=page.locator('.pcard').first();
  const strip=card.locator('[data-strip]');
  await expect(strip).toHaveCSS('overflow-x','auto');
  await expect(strip).toHaveAttribute('tabindex','0');
  await card.locator('.pcard__peek').first().tap();
  await expect(card).toHaveAttribute('data-open','true');
  await expect(strip.locator('.rail__note')).toBeVisible();
  await expect(card.locator(':scope > .rail__note')).toHaveCount(0);
  const viewer=page.getByRole('dialog',{name:'Photograph viewer'});
  await expect(viewer).toBeHidden();
  await card.locator('.rail__f').first().tap();
  await expect(viewer).toBeVisible();
  await viewer.evaluate(el=>{el.setAttribute('data-idle','true');(document.activeElement as HTMLElement)?.blur();});
  await expect(viewer.locator('[data-next]')).toHaveCSS('opacity','1');
  const count=await viewer.locator('[data-count]').textContent();
  await viewer.getByRole('button',{name:'Next photograph'}).tap();
  await expect(viewer.locator('[data-count]')).not.toHaveText(count!);
  await viewer.getByRole('button',{name:'Close',exact:true}).tap();
  await expect(viewer).toBeHidden();
  await page.setViewportSize({width:640,height:900});
  await expect(card.locator(':scope > .rail__note')).toBeVisible();
  await expect(strip.locator('.rail__note')).toHaveCount(0);
  await page.setViewportSize({width:1024,height:768});
  await expect(strip.locator('.rail__note')).toBeVisible();
  await expect(card.locator(':scope > .rail__note')).toHaveCount(0);
  await expect(card.locator('[data-project]')).toHaveAttribute('aria-expanded','true');
  await card.locator('[data-project-close]').tap();
  await expect(card.locator('[data-project]')).toHaveAttribute('aria-expanded','false');
});

test('tablet copy buttons copy details without following contact links',async({page})=>{
  await page.setViewportSize({width:1024,height:768});
  await page.addInitScript(()=>{
    const copies:string[]=[];
    (window as unknown as {tabletCopies:string[]}).tabletCopies=copies;
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async(text:string)=>{copies.push(text);}},configurable:true});
  });
  for(const route of ['/','/contact/']) {
    await page.goto(route);
    const expected=await page.locator('.contact-links a').allTextContents();
    for(const name of ['Copy email address','Copy phone number']) {
      await page.getByRole('button',{name}).tap();
      await expect(page.locator('.tip')).toHaveText('Copied');
      expect(new URL(page.url()).pathname).toBe(route);
    }
    expect(await page.evaluate(()=>(window as unknown as {tabletCopies:string[]}).tabletCopies)).toEqual(expected);
  }
});

test('tablet Press uses the desktop reader with touch controls',async({page})=>{
  await page.setViewportSize({width:1024,height:768});
  await page.goto('/press/');
  const card=page.locator('a[data-article]').first();
  await card.scrollIntoViewIfNeeded();
  const position=await page.evaluate(()=>scrollY);
  await card.tap();
  const reader=page.getByRole('dialog',{name:'Press reader'});
  await expect(reader.locator('.press-article')).toBeVisible();
  await expect(reader).not.toHaveAttribute('data-detent','peek');
  const box=(await reader.boundingBox())!;
  expect(box.y).toBeGreaterThan(0);
  expect(box.y+box.height).toBeLessThan(768);
  await reader.getByRole('button',{name:'Close article'}).tap();
  await expect(reader).toBeHidden();
  expect(await page.evaluate(()=>scrollY)).toBeCloseTo(position,0);
});

test('tablet enquiries show validation and submit a short message once',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  const messages:string[]=[];
  await page.route('https://api.web3forms.com/**',async route=>{
    messages.push(route.request().postDataJSON().message);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true})});
  });
  await page.goto('/contact/');
  await page.getByRole('button',{name:'Send enquiry'}).tap();
  await expect(page.getByRole('status')).toContainText('Please enter your name.');
  expect(messages).toEqual([]);
  await page.locator('[name="access_key"]').evaluate(e=>(e as HTMLInputElement).value='test-only-key');
  await page.getByLabel('Name',{exact:true}).fill('Local test');
  await page.getByLabel('Email',{exact:true}).fill('test@example.com');
  await page.getByLabel('Message',{exact:true}).fill('Hi');
  await page.getByRole('button',{name:'Send enquiry'}).tap();
  await expect(page).toHaveURL(/\/contact\/thanks\/$/);
  expect(messages).toEqual(['Hi']);
});

test('tablet native swipes browse closed galleries without opening them',async({page,browserName})=>{
  test.skip(browserName!=='chromium','Native touch injection is available through Chromium; all engines run tap and layout checks.');
  await page.setViewportSize({width:820,height:1180});
  await page.goto('/projects/');
  const strip=page.locator('[data-strip]').first();
  await strip.scrollIntoViewIfNeeded();
  const box=(await strip.boundingBox())!;
  const input=await page.context().newCDPSession(page);
  const x=box.x+Math.min(box.width-30,600),y=box.y+box.height/2;
  await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=12;i++)await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-400*i/12,y}]});
  await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(()=>strip.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
  await expect(page.locator('[data-project]').first()).toHaveAttribute('aria-expanded','false');
  await expect(page.getByRole('dialog',{name:'Photograph viewer'})).toBeHidden();
  await input.detach();
});
