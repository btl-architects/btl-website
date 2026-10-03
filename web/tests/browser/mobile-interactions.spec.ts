import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes=['/','/projects/','/projects/nelly-house/','/press/','/people/','/studio/','/contact/'];

test.describe('phone interactions',()=>{
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});});

  test('links keep a quiet cue, targets have room, and all main routes fit a phone',async({page})=>{
    for(const route of routes) {
      await page.goto(route,{waitUntil:'domcontentloaded'});
      expect(await page.evaluate(()=>matchMedia('(hover: none) and (pointer: coarse)').matches)).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      const onward=page.locator('.onward').first();
      if(await onward.count()) {
        expect(await onward.locator('.onward__t').evaluate(el=>getComputedStyle(el,'::after').clipPath)).toBe('inset(0px)');
        expect((await onward.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      for(const control of await page.locator('.header__logo,.burger,.footer__links a,a.tl[href^="mailto:"],a.tl[href^="tel:"],.chips .chip,.f input:not([type="hidden"])').all()) {
        const box=await control.boundingBox();
        if(box)expect(box.height).toBeGreaterThanOrEqual(44);
      }
      if(route==='/'||route==='/press/')await expect(page.locator('a.pc .pc__action').first()).toBeVisible();
      if(route==='/'||route==='/projects/')await expect(page.locator('.pcard__action').first()).toBeVisible();
    }
    await page.goto('/');
    await expect(page.locator('.footer__mobile-social')).toHaveCSS('display','contents');
    await expect(page.locator('.footer__mobile-social a')).toHaveCount(3);
  });

  test('Press opens with one tap and closes without losing the page',async({page})=>{
    await page.goto('/press/');
    const card=page.locator('a[data-article]').first();
    await card.scrollIntoViewIfNeeded();
    const top=await page.evaluate(()=>scrollY);
    await card.tap();
    const reader=page.getByRole('dialog',{name:'Press reader'});
    await expect(reader).toBeVisible();
    await expect(reader.locator('.press-article')).toBeVisible();
    for(const control of [reader.getByRole('button',{name:'Close article'}),reader.locator('.press-reader__original')]) {
      const box=(await control.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
    }
    expect(await reader.evaluate(el=>el.scrollWidth)).toBeLessThanOrEqual(390);
    await reader.getByRole('button',{name:'Close article'}).tap();
    await expect(reader).toBeHidden();
    expect(await page.evaluate(()=>scrollY)).toBeCloseTo(top,0);
  });

  for(const route of ['/studio/','/projects/']) test(`photographs and viewer controls respond to taps on ${route}`,async({page})=>{
    await page.goto(route);
    if(route==='/projects/') {
      const card=page.locator('[data-project]').first();
      await card.tap();
      await expect(card).toHaveAttribute('aria-expanded','true');
      await expect(page.locator('.pcard[data-open="true"] .rail__f').last()).toBeAttached();
      await expect(page.getByRole('dialog',{name:'Photograph viewer'})).toBeHidden();
    }
    const photo=page.locator(route==='/studio/'?'[data-rail] .rail__f':'.pcard[data-open="true"] .rail__f').first();
    await expect(photo.locator('.photo-cue')).toBeVisible();
    await photo.tap();
    const viewer=page.getByRole('dialog',{name:'Photograph viewer'});
    await expect(viewer).toBeVisible();
    for(const control of await viewer.locator('button').all()) {
      const box=(await control.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x+box.width).toBeLessThanOrEqual(390);expect(box.y+box.height).toBeLessThanOrEqual(844);
    }
    // A touch viewer cannot depend on mouse movement to reveal navigation.
    await viewer.evaluate(el=>{el.setAttribute('data-idle','true');(document.activeElement as HTMLElement)?.blur();});
    await expect(viewer.locator('[data-next]')).toHaveCSS('opacity','1');
    const count=await viewer.locator('[data-count]').textContent();
    await viewer.getByRole('button',{name:'Next photograph'}).tap();
    await expect(viewer.locator('[data-count]')).not.toHaveText(count!);
    await viewer.getByRole('button',{name:'Close'}).tap();
    await expect(viewer).toBeHidden();
    if(route==='/projects/') {
      await page.locator('[data-project-close]').first().tap();
      await expect(page.locator('[data-project]').first()).toHaveAttribute('aria-expanded','false');
    }
  });

  test('native swipes browse strips while vertical gestures scroll the page',async({page,browserName})=>{
    test.skip(browserName!=='chromium','Native touch injection is available through Chromium; both engines run tap and layout checks.');
    const input=await page.context().newCDPSession(page);
    async function swipe(x:number,y:number,dx:number,dy:number) {
      await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      for(let i=1;i<=8;i++)await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});
      await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }
    for(const route of ['/studio/','/projects/']) {
      async function gallery() {
        await page.goto(route);
        if(route==='/projects/') {
          await page.locator('[data-project]').first().tap();
          await expect(page.locator('.pcard[data-open="true"] .rail__f').last()).toBeAttached();
        }
        const rail=page.locator(route==='/studio/'?'[data-rail]':'.pcard[data-open="true"] [data-strip]').first();
        await rail.scrollIntoViewIfNeeded();
        return rail;
      }
      let rail=await gallery();
      let box=(await rail.boundingBox())!;
      const x=300,y=Math.min(Math.max(box.y+box.height/2,180),660);
      await swipe(x,y,-180,0);
      await expect.poll(()=>rail.evaluate(el=>el.scrollLeft)).toBeGreaterThan(80);
      await expect(page.getByRole('dialog',{name:'Photograph viewer'})).toBeHidden();
      rail=await gallery();box=(await rail.boundingBox())!;
      const top=await page.evaluate(()=>scrollY),left=await rail.evaluate(el=>el.scrollLeft);
      const direction=top>100?1:-1;
      await swipe(200,Math.min(Math.max(box.y+box.height/2,180),660),0,140*direction);
      await expect.poll(async()=>((await page.evaluate(()=>scrollY))-top)*-direction).toBeGreaterThan(40);
      expect(await rail.evaluate(el=>el.scrollLeft)).toBeCloseTo(left,0);
      await expect(page.getByRole('dialog',{name:'Photograph viewer'})).toBeHidden();
    }
    await input.detach();
  });

  test('individual project text sits below photographs without a clipped reading panel',async({page})=>{
    await page.goto('/projects/nelly-house/');
    await expect(page.locator('[data-rail] > .rail__note')).toBeHidden();
    const note=page.locator('.project-note--touch');
    await expect(note).toBeVisible();
    expect((await note.boundingBox())!.y).toBeGreaterThan((await page.locator('.railnav').boundingBox())!.y);
    const text=await note.locator('.rail__text').allTextContents();
    expect(text.join('')).toContain('Nestled');
    const size=await note.locator('.rail__note').evaluate(el=>({height:el.clientHeight,content:el.scrollHeight}));
    expect(size.content).toBeLessThanOrEqual(size.height+1);
    await page.locator('[data-gallery-step="1"]').tap();
    await expect.poll(()=>page.locator('[data-rail]').evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  });

  test('menu works with taps and touch layouts retain accessibility at narrow widths',async({page})=>{
    await page.goto('/people/');
    await page.getByRole('button',{name:'Menu',exact:true}).tap();
    const menu=page.getByRole('dialog',{name:'Menu'});
    await expect(menu).toBeVisible();
    await menu.getByRole('link',{name:'Studio',exact:true}).tap();
    await expect(page).toHaveURL(/\/studio\/$/);
    for(const width of [320,390]) {
      await page.setViewportSize({width,height:844});
      for(const route of routes) {
        await page.goto(route);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
        expect(result.violations).toEqual([]);
      }
    }
  });
});

test('mouse layouts keep the original hover treatment at desktop and narrow widths',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto('/');
    await expect(page.locator('.pc__action').first()).toBeHidden();
    await expect(page.locator('.pcard__action').first()).toBeHidden();
    await expect(page.locator('.footer__mobile-social')).toBeHidden();
    expect(await page.locator('.onward__t').first().evaluate(el=>getComputedStyle(el,'::after').clipPath)).toBe('inset(0px 100% 0px 0px)');
    await page.goto('/projects/nelly-house/');
    await expect(page.locator('.project-note--touch')).toBeHidden();
    await expect(page.locator('[data-rail] > .rail__note')).toBeVisible();
    await expect(page.locator('.photo-cue').first()).toBeHidden();
  }
});
