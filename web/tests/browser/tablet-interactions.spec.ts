import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes=['/','/projects/','/projects/nelly-house/','/press/','/people/','/studio/','/contact/'];
test.use({viewport:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:2});
test.beforeEach(async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  // Firefox can wait indefinitely when resizing the initial about:blank
  // mobile page. Load the site before exercising viewport changes.
  await page.goto('/',{waitUntil:'domcontentloaded'});
});

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
        // Firefox reports 44px targets as 43.999998px at device scale 2.
        if(box)expect(Math.round(box.height*1000)/1000).toBeGreaterThanOrEqual(44);
      }
      if(route==='/'||route==='/contact/') {
        for(const mark of await page.locator('.copy-mark').all()) await expect(mark).toBeVisible();
      }
      if(route==='/'||route==='/press/') {
        const cards=page.locator('.credits .pc');
        const first=(await cards.nth(0).boundingBox())!,second=(await cards.nth(1).boundingBox())!;
        expect(first.width).toBeLessThanOrEqual(320);
        expect(first.width).toBeLessThanOrEqual(viewport.height*.34+1);
        expect(second.x).toBeGreaterThan(first.x+first.width);
        expect(Math.abs(second.y-first.y)).toBeLessThan(1);
      }
      if(route==='/'||route==='/projects/') {
        for(const strip of await page.locator('[data-strip]').all()) {
          const box=(await strip.boundingBox())!;
          expect(box.height).toBeLessThanOrEqual(240);
          const frames=await strip.locator('.rail__f').all();
          const widths=await Promise.all(frames.slice(0,2).map(frame=>frame.boundingBox()));
          expect(widths[0]!.width+widths[1]!.width).toBeLessThan(box.width);
        }
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
  await expect(card.locator(':scope > .rail__note')).toBeVisible();
  await expect(strip.locator('.rail__note')).toHaveCount(0);
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
  await page.setViewportSize({width:1440,height:900});
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

test('tablet onward links draw the green underline when their section appears',async({page})=>{
  await page.setViewportSize({width:820,height:1180});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/js/);
  const link=page.getByRole('link',{name:'See every project'});
  const line=link.locator('.onward__t');
  await expect.poll(()=>line.evaluate(el=>getComputedStyle(el,'::after').clipPath)).toBe('inset(0px 100% 0px 0px)');
  await link.scrollIntoViewIfNeeded();
  await expect.poll(()=>line.evaluate(el=>getComputedStyle(el,'::after').clipPath)).toBe('inset(0px)');
  const style=await line.evaluate(el=>{
    const s=getComputedStyle(el,'::after');
    return {duration:s.transitionDuration,delay:s.transitionDelay,colour:s.backgroundColor,mark:getComputedStyle(el).getPropertyValue('--mark').trim()};
  });
  expect(style.duration).toBe('0.7s');
  expect(style.delay).toBe('0.24s');
  expect(style.colour).toBe('rgb(0, 255, 102)');
});

test('tablet Press uses a wider gesture reader and restores the page',async({page})=>{
  await page.setViewportSize({width:1024,height:768});
  await page.goto('/press/');
  const card=page.locator('a[data-article]').first();
  await card.scrollIntoViewIfNeeded();
  const position=await page.evaluate(()=>scrollY);
  await card.tap();
  const reader=page.getByRole('dialog',{name:'Press reader'});
  await expect(reader.locator('.press-article')).toBeVisible();
  await expect(reader).toHaveAttribute('data-detent','peek');
  await page.setViewportSize({width:820,height:1180});
  await expect.poll(async()=>{const box=(await reader.boundingBox())!;return Math.abs(box.y-1180*.38);}).toBeLessThan(1);
  await page.setViewportSize({width:1024,height:768});
  await expect.poll(async()=>{const box=(await reader.boundingBox())!;return Math.abs(box.y-768*.38);}).toBeLessThan(1);
  await reader.locator('.press-reader__content').tap();
  await expect(reader).toHaveAttribute('data-detent','full');
  await expect.poll(async()=>{const box=(await reader.boundingBox())!;return box.y+box.height;}).toBeLessThanOrEqual(768);
  await reader.getByRole('button',{name:'Close article'}).tap();
  await expect(reader).toBeHidden();
  expect(await page.evaluate(()=>scrollY)).toBeCloseTo(position,0);
  await card.tap();
  await expect(reader).toHaveAttribute('data-detent','peek');
  await page.touchscreen.tap(5,25);
  await expect(reader).toBeHidden();
  await card.tap();
  await expect(reader).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(reader).toBeHidden();
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

for(const viewport of [{width:820,height:1180},{width:1024,height:768}]) {
  test(`tablet native swipes browse closed galleries without opening them at ${viewport.width}px`,async({page,browserName})=>{
    test.skip(browserName!=='chromium','Native touch injection is available through Chromium; all engines run tap and layout checks.');
    await page.setViewportSize(viewport);
    const input=await page.context().newCDPSession(page);
    for(const route of ['/','/projects/']) {
      await page.goto(route);
      const strip=page.locator('[data-strip]').first();
      await strip.scrollIntoViewIfNeeded();
      const box=(await strip.boundingBox())!;
      const x=box.x+Math.min(box.width-30,600),y=box.y+box.height/2;
      await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      for(let i=1;i<=12;i++)await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-400*i/12,y}]});
      await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await expect.poll(()=>strip.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
      await expect(page.locator('[data-project]').first()).toHaveAttribute('aria-expanded','false');
      await expect(page.getByRole('dialog',{name:'Photograph viewer'})).toBeHidden();
      await expect(page).toHaveURL(new RegExp(route==='/'?'/$':'/projects/$'));
    }
    await input.detach();
  });
}

for(const viewport of [{width:820,height:1180},{width:1024,height:768}]) {
  test(`tablet photograph gestures zoom, pan, turn and dismiss at ${viewport.width}px`,async({page,browserName})=>{
    test.skip(browserName!=='chromium','Native touch injection is available through Chromium; all engines run tap and layout checks.');
    await page.setViewportSize(viewport);
    await page.goto('/studio/');
    await page.locator('[data-rail] .rail__f').first().tap();
    const viewer=page.getByRole('dialog',{name:'Photograph viewer'});
    const count=viewer.locator('[data-count]');
    await expect(viewer).toBeVisible();
    const input=await page.context().newCDPSession(page);
    const touch=(type:'touchStart'|'touchMove'|'touchEnd',points:{x:number,y:number}[])=>input.send('Input.dispatchTouchEvent',{type,touchPoints:points});
    const x=viewport.width/2,y=viewport.height/2;
    async function tap() {await touch('touchStart',[{x,y}]);await touch('touchEnd',[]);}
    async function drag(dx:number,dy:number) {
      const start=x-dx/2;
      await touch('touchStart',[{x:start,y}]);
      for(let i=1;i<=12;i++)await touch('touchMove',[{x:start+dx*i/12,y:y+dy*i/12}]);
      await touch('touchEnd',[]);
    }
    async function pinch(from:number,to:number) {
      await touch('touchStart',[{x:x-from,y},{x:x+from,y}]);
      for(let i=1;i<=12;i++) {
        const distance=from+(to-from)*i/12;
        await touch('touchMove',[{x:x-distance,y},{x:x+distance,y}]);
      }
      await touch('touchEnd',[]);
    }
    await pinch(60,160);
    await expect(viewer).toHaveAttribute('data-zoomed','true');
    const before=await viewer.locator('.lb__img').evaluate(el=>getComputedStyle(el).transform);
    // A zoomed portrait can still fit across a landscape viewport. Pan along
    // the axis that has off-screen detail rather than pushing against a bound.
    const zoomed=(await viewer.locator('.lb__img').boundingBox())!;
    await drag(zoomed.width>viewport.width?120:0,zoomed.width>viewport.width?0:120);
    await expect(count).toHaveText(/^1 \//);
    await expect.poll(()=>viewer.locator('.lb__img').evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
    await pinch(160,60);
    await expect(viewer).toHaveAttribute('data-zoomed','false');
    await tap();await page.waitForTimeout(60);await tap();
    await expect(viewer).toHaveAttribute('data-zoomed','true');
    await tap();await page.waitForTimeout(60);await tap();
    await expect(viewer).toHaveAttribute('data-zoomed','false');
    await drag(-viewport.width*.45,0);
    await expect(count).toHaveText(/^2 \//);
    await drag(viewport.width*.45,0);
    await expect(count).toHaveText(/^1 \//);
    await drag(0,viewport.height*.3);
    await expect(viewer).toBeHidden();
    await input.detach();
  });
}

test.describe('tablet mouse preview',()=>{
  test.use({hasTouch:false,isMobile:false,viewport:{width:820,height:1180}});
  test('closed project strips browse by dragging without opening a card',async({page})=>{
    for(const route of ['/','/projects/']) {
      await page.goto(route);
      const strip=page.locator('[data-strip]').first();
      await expect(strip).toHaveCSS('overflow-x','auto');
      await strip.scrollIntoViewIfNeeded();
      const box=(await strip.boundingBox())!;
      const x=box.x+box.width*.8,y=box.y+box.height-20;
      await page.mouse.move(x,y);await page.mouse.down();
      await page.mouse.move(x-350,y,{steps:20});await page.mouse.up();
      await expect.poll(()=>strip.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
      await expect(page.locator('[data-project]').first()).toHaveAttribute('aria-expanded','false');
      await expect(page.getByRole('dialog',{name:'Photograph viewer'})).toBeHidden();
      await expect(page).toHaveURL(new RegExp(route==='/'?'/$':'/projects/$'));
      const entry=page.locator('[data-project]').first();
      await page.keyboard.press('Tab');
      await entry.focus();
      await expect(entry).toHaveCSS('opacity','1');
      await page.mouse.click(x-350,y);
      await expect(page.locator('[data-project]').first()).toHaveAttribute('aria-expanded','true');
    }
  });
  test('section underlines animate into view without hovering',async({page})=>{
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.goto('/');
    const link=page.getByRole('link',{name:'See every project'});
    const line=link.locator('.onward__t');
    await expect.poll(()=>line.evaluate(el=>getComputedStyle(el,'::after').clipPath)).toBe('inset(0px 100% 0px 0px)');
    await link.scrollIntoViewIfNeeded();
    await expect(link).not.toHaveCSS('cursor','default');
    await expect.poll(()=>line.evaluate(el=>getComputedStyle(el,'::after').clipPath)).toBe('inset(0px)');
  });
});

for(const viewport of [{width:820,height:1180},{width:1024,height:768}]) {
  test(`tablet Press gestures raise, lower and dismiss the reader at ${viewport.width}px`,async({page,browserName})=>{
    test.skip(browserName!=='chromium','Native touch injection is available through Chromium; all engines run tap and layout checks.');
    await page.setViewportSize(viewport);
    await page.goto('/press/');
    const card=page.locator('a[data-article]').first();
    await card.scrollIntoViewIfNeeded();
    await card.tap();
    const reader=page.getByRole('dialog',{name:'Press reader'});
    await expect(reader.locator('.press-article')).toBeVisible();
    await expect(reader).toHaveAttribute('data-detent','peek');
    await page.waitForTimeout(450);
    const input=await page.context().newCDPSession(page);
    async function swipe(y:number,dy:number) {
      const x=viewport.width/2;
      await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      for(let i=1;i<=20;i++) {
        await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy*i/20}]});
        await page.waitForTimeout(16);
      }
      await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }
    await swipe(viewport.height*.82,-viewport.height*.22);
    await expect(reader).toHaveAttribute('data-detent','full');
    await page.waitForTimeout(450);
    const bar=(await reader.locator('.press-reader__bar').boundingBox())!;
    await swipe(bar.y+bar.height/2,viewport.height*.15);
    await expect(reader).toHaveAttribute('data-detent','peek');
    await page.waitForTimeout(450);
    await swipe(viewport.height*.82,viewport.height*.14);
    await expect(reader).toBeHidden();
    await expect(page).toHaveURL(/\/press\/$/);
    await input.detach();
  });
}
