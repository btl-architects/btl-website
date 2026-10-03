import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes=['/','/projects/','/projects/nelly-house/','/press/','/people/','/studio/','/contact/'];

test.describe('phone interactions',()=>{
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});});

  test('a short enquiry on a phone submits once and shows progress',async({page})=>{
    const messages:string[]=[];
    let finish:()=>void=()=>{};
    const responseReady=new Promise<void>(resolve=>{finish=resolve;});
    await page.route('https://api.web3forms.com/**',async route=>{
      messages.push(route.request().postDataJSON().message);
      await responseReady;
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true})});
    });
    await page.goto('/contact/');
    await page.locator('[name="access_key"]').evaluate(e=>(e as HTMLInputElement).value='test-only-key');
    await page.getByLabel('Name',{exact:true}).fill('Local test');
    await page.getByLabel('Email',{exact:true}).fill('test@example.com');
    // Type as a visitor would: programmatic fill alone can bypass minlength.
    await page.getByLabel('Message',{exact:true}).pressSequentially('Hello');
    await page.getByRole('button',{name:'Send enquiry'}).tap();
    await expect(page.getByRole('status')).toHaveText('Sending your enquiry…');
    await expect(page.getByRole('button',{name:'Sending…'})).toBeDisabled();
    await expect.poll(()=>messages).toEqual(['Hello']);
    finish();
    await expect(page).toHaveURL(/\/contact\/thanks\/$/);
    expect(messages).toHaveLength(1);
  });

  test('a phone shows missing and invalid enquiry fields without sending',async({page})=>{
    const outbound:string[]=[];
    await page.route('https://api.web3forms.com/**',route=>{outbound.push(route.request().url());return route.abort();});
    await page.goto('/contact/');
    const send=page.getByRole('button',{name:'Send enquiry'});
    const status=page.getByRole('status');
    await send.tap();
    await expect(status).toContainText('Please enter your name.');
    await expect(page.getByLabel('Name',{exact:true})).toBeFocused();
    await page.getByLabel('Name',{exact:true}).fill('Local test');
    await page.getByLabel('Email',{exact:true}).fill('invalid');
    await send.tap();
    await expect(status).toContainText('Please enter a valid email address.');
    await expect(page.getByLabel('Email',{exact:true})).toHaveAttribute('aria-invalid','true');
    await page.getByLabel('Email',{exact:true}).fill('test@example.com');
    await expect(page.getByLabel('Email',{exact:true})).not.toHaveAttribute('aria-invalid','true');
    await page.getByLabel('Message',{exact:true}).fill('   ');
    await send.tap();
    await expect(status).toContainText('Please enter your message.');
    await expect(page.getByLabel('Message',{exact:true})).toBeFocused();
    expect(outbound).toEqual([]);
  });

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
    }
    await page.goto('/');
    // The social rail stays with the reader on Home, inside the right margin.
    const rail=page.locator('.landing .srail');
    await expect(rail).toHaveCSS('position','fixed');
    await page.evaluate(()=>scrollTo(0,document.body.scrollHeight/2));
    await expect(rail).toBeInViewport();
    const column=(await page.locator('.home-sec__k').first().boundingBox())!.x;
    for(const item of await page.locator('.landing .srail__i').all()) {
      const box=(await item.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.x+box.width).toBeLessThanOrEqual(390);
      const words=await item.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);return r.getBoundingClientRect();});
      expect(words.left).toBeGreaterThanOrEqual(390-column); // clear of the type column
    }
  });

  test('the resting green line marks only onward links',async({page})=>{
    const line=(el:Element,pseudo='::after')=>{
      const s=getComputedStyle(el,pseudo);
      return s.content!=='none'&&s.clipPath==='inset(0px)'&&s.transform==='none'||getComputedStyle(el).textDecorationLine.includes('underline');
    };
    const quiet=async(selectors:string[])=>{
      for(const selector of selectors) for(const el of await page.locator(selector).all()) expect(await el.evaluate(line),selector).toBe(false);
    };
    await page.goto('/');
    // Arrows, contact details, footer and social links already read as tappable.
    await quiet(['.footer a','a[href^="mailto:"]','a[href^="tel:"]','.landing .srail__i']);
    expect(await page.locator('.onward__t').first().evaluate(line)).toBe(true);
    await page.goto('/projects/nelly-house/');
    await quiet(['.pager__n','.pager a']);
    await page.goto('/contact/');
    await quiet(['form a','a.tl']);
    // A link in a sentence carries a raised arrow; contact details a copy mark.
    expect(await page.locator('form a.tl').evaluate(el=>{const s=getComputedStyle(el,'::after');return s.maskImage||s.webkitMaskImage;})).toMatch(/svg/);
    await expect(page.locator('.copy-mark')).toHaveCount(2);
    for(const mark of await page.locator('.copy-mark').all()) await expect(mark).toBeVisible();
    // A linked person's portrait is the cue; the name stays plain.
    await page.goto('/people/');
    await quiet(['a.trow__link .trow__n']);
  });

  test('the copy mark copies the studio details without dialling',async({page,context,browserName})=>{
    test.skip(browserName!=='chromium','Clipboard permission is granted through Chromium.');
    await context.grantPermissions(['clipboard-read','clipboard-write']);
    await page.goto('/contact/');
    await page.getByRole('button',{name:'Copy phone number'}).tap();
    await expect(page.locator('.tip')).toHaveText('Copied');
    expect(await page.evaluate(()=>navigator.clipboard.readText())).toMatch(/^\+91/);
    await expect(page).toHaveURL(/\/contact\/$/);
    const box=(await page.getByRole('button',{name:'Copy phone number'}).boundingBox())!;
    expect(box.width).toBeLessThan(44); // the visible mark; its touch area is the ::before square
  });

  test('an open card on Home keeps its words on the page column',async({page})=>{
    await page.goto('/');
    const edge=(await page.locator('.home-sec__k').first().boundingBox())!.x;
    await page.locator('.pcard__peek').first().tap();
    const note=page.locator('.pcard[data-open="true"] > .rail__note');
    await expect(note.locator('.rail__title')).toBeVisible();
    expect((await note.locator('.rail__title').boundingBox())!.x).toBeCloseTo(edge,0);
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
      await page.locator('.pcard__peek').first().tap();
      await expect(card).toHaveAttribute('aria-expanded','true');
      await expect(page.locator('.pcard[data-open="true"] .rail__f').last()).toBeAttached();
      await expect(page.getByRole('dialog',{name:'Photograph viewer'})).toBeHidden();
    }
    const photo=page.locator(route==='/studio/'?'[data-rail] .rail__f':'.pcard[data-open="true"] .rail__f').first();
    await photo.tap();
    const viewer=page.getByRole('dialog',{name:'Photograph viewer'});
    await expect(viewer).toBeVisible();
    for(const control of await viewer.locator('button').all()) {
      const box=(await control.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x+box.width).toBeLessThanOrEqual(390);expect(box.y+box.height).toBeLessThanOrEqual(844);
    }
    // A touch viewer cannot depend on mouse movement or an idle timer for its arrows.
    await viewer.evaluate(el=>{el.setAttribute('data-idle','true');(document.activeElement as HTMLElement)?.blur();});
    await expect(viewer.locator('[data-next]')).toHaveCSS('opacity','1');
    await expect(viewer).toHaveAttribute('data-chrome','on');
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
          await page.locator('.pcard__peek').first().tap();
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

  test('a closed strip swipes, and a tap opens the card around the chosen frame',async({page,browserName})=>{
    test.skip(browserName!=='chromium','Native touch injection is available through Chromium.');
    await page.emulateMedia({reducedMotion:'no-preference'});
    const input=await page.context().newCDPSession(page);
    await page.goto('/projects/');
    const card=page.locator('.pcard').first(), strip=card.locator('[data-strip]');
    const box=(await strip.boundingBox())!;
    const y=box.y+box.height/2;
    await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:330,y}]});
    for(let i=1;i<=8;i++)await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:330-260*i/8,y}]});
    await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(()=>strip.evaluate(el=>el.scrollLeft)).toBeGreaterThan(120);
    await expect(card).not.toHaveAttribute('data-open','true');
    await expect(card).toHaveAttribute('data-strip-moved','');
    // Let the fling come to rest, or the tap lands on whichever frame is passing.
    let last=-1;
    await expect.poll(async()=>{const now=await strip.evaluate(el=>el.scrollLeft);const still=now===last;last=now;return still;},{intervals:[150]}).toBe(true);
    // The frame nearest the column is the one tapped; the card opens around it.
    const chosen=await strip.evaluate(el=>{
      const start=el.getBoundingClientRect().left+parseFloat(getComputedStyle(el).scrollPaddingLeft);
      const frames=[...el.querySelectorAll('.pcard__peek')];
      return frames.findIndex(f=>f.getBoundingClientRect().right>start+40);
    });
    const frame=strip.locator('.pcard__peek').nth(chosen);
    const fb=(await frame.boundingBox())!;
    await page.touchscreen.tap(Math.max(fb.x,30)+20,fb.y+fb.height/2);
    await expect(card).toHaveAttribute('data-open','true');
    await page.waitForTimeout(900);
    const pad=await strip.evaluate(el=>el.getBoundingClientRect().left+parseFloat(getComputedStyle(el).scrollPaddingLeft));
    expect(Math.abs((await frame.boundingBox())!.x-pad)).toBeLessThan(4);
    await expect(card.locator('[data-pos]')).toHaveText(new RegExp('^0'+(chosen+1)+' / '));
    await input.detach();
  });

  test('a completed photograph tap works when its compatibility click is withheld',async({page,browserName})=>{
    test.skip(browserName!=='chromium','Native touch injection is available through Chromium.');
    await page.goto('/studio/');
    // Reproduce the missing compatibility-click path without a timing delay.
    await page.evaluate(()=>window.addEventListener('click',e=>{
      if((e.target as Element).closest('.rail__f[role="button"]')) {
        e.preventDefault(); e.stopImmediatePropagation();
      }
    },true));
    await page.locator('[data-rail] .rail__f').first().tap();
    const viewer=page.getByRole('dialog',{name:'Photograph viewer'});
    await expect(viewer).toBeVisible();
    await viewer.getByRole('button',{name:'Close'}).click();
    await expect(viewer).toBeHidden();
    await page.locator('[data-rail] .rail__f').first().tap();
    await expect(viewer).toBeVisible();
  });

  test('the viewer answers fingers the way a phone photo app does',async({page,browserName})=>{
    test.skip(browserName!=='chromium','Native touch injection is available through Chromium.');
    const input=await page.context().newCDPSession(page);
    const touch=(type:'touchStart'|'touchMove'|'touchEnd',points:{x:number,y:number}[])=>input.send('Input.dispatchTouchEvent',{type,touchPoints:points});
    async function drag(x:number,y:number,dx:number,dy:number,steps=8) {
      await touch('touchStart',[{x,y}]);
      for(let i=1;i<=steps;i++)await touch('touchMove',[{x:x+dx*i/steps,y:y+dy*i/steps}]);
      await touch('touchEnd',[]);
    }
    async function tap(x:number,y:number) { await touch('touchStart',[{x,y}]); await touch('touchEnd',[]); }
    await page.goto('/studio/');
    await page.locator('[data-rail] .rail__f').first().tap();
    const viewer=page.getByRole('dialog',{name:'Photograph viewer'}), count=viewer.locator('[data-count]');
    await expect(viewer).toBeVisible();
    await expect(count).toHaveText(/^1 \//);
    // A short, slow drag springs back; a long one turns to the next photograph.
    await drag(200,420,-40,0);
    await expect(count).toHaveText(/^1 \//);
    await drag(320,420,-220,0);
    await expect(count).toHaveText(/^2 \//);
    await drag(80,420,220,0);
    await expect(count).toHaveText(/^1 \//);
    // One tap hides and shows the chrome; it neither zooms nor closes.
    await tap(195,420); await page.waitForTimeout(450);
    await expect(viewer).toHaveAttribute('data-chrome','off');
    await expect(viewer).toHaveAttribute('data-zoomed','false');
    await tap(195,420); await page.waitForTimeout(450);
    await expect(viewer).toHaveAttribute('data-chrome','on');
    // Double-tap zooms to the spot, and again comes back out.
    await tap(195,420); await page.waitForTimeout(60); await tap(195,420);
    await expect(viewer).toHaveAttribute('data-zoomed','true');
    // Zoomed, a drag pans the photograph rather than turning the page.
    await drag(195,420,-120,0);
    await expect(count).toHaveText(/^1 \//);
    await tap(195,420); await page.waitForTimeout(60); await tap(195,420);
    await expect(viewer).toHaveAttribute('data-zoomed','false');
    // Pulling down a little springs back; pulling down far closes.
    await drag(195,400,0,60);
    await expect(viewer).toBeVisible();
    await drag(195,380,0,300);
    await expect(viewer).toBeHidden();
    // A tap on the dark around the photograph is the way back.
    await page.locator('[data-rail] .rail__f').first().tap();
    await expect(viewer).toBeVisible();
    const photo=(await viewer.locator('.lb__img').boundingBox())!;
    // Whichever side of the photograph has dark: the sides of a portrait, below a landscape.
    if(photo.x>24) await tap(photo.x/2,420); else await tap(195,Math.min(photo.y+photo.height+24,830));
    await expect(viewer).toBeHidden();
    // ...and that tap's click is spent: it must not reopen a photograph beneath.
    await page.waitForTimeout(600);
    await expect(viewer).toBeHidden();
    // A fresh press is never swallowed by the closing tap's click guard.
    await page.locator('[data-rail] .rail__f').first().tap();
    await expect(viewer).toBeVisible();
    const reopened=(await viewer.locator('.lb__img').boundingBox())!;
    if(reopened.x>24) await tap(reopened.x/2,420); else await tap(195,Math.min(reopened.y+reopened.height+24,830));
    await expect(viewer).toBeHidden();
    // The viewer asks for a file sized to the screen, not the largest one.
    await page.locator('[data-rail] .rail__f').first().tap();
    const w=Number(/[?&]w=(\d+)/.exec((await viewer.locator('.lb__img').getAttribute('src'))!)![1]);
    expect(w).toBeLessThanOrEqual(2000);
    await input.detach();
  });

  test('Press opens as a card to look into, put away with a thumb or a tap outside',async({page,browserName})=>{
    await page.goto('/press/');
    const card=page.locator('a[data-article]').first();
    await card.scrollIntoViewIfNeeded();
    await card.tap();
    const reader=page.getByRole('dialog',{name:'Press reader'});
    await expect(reader).toBeVisible();
    // Already fetched as the cover came near, so the article is simply there.
    await expect(reader.locator('.press-article')).toBeVisible({timeout:1500});
    await expect(reader).toHaveAttribute('data-detent','peek');
    await page.waitForTimeout(500);
    const box=(await reader.boundingBox())!;
    expect(box.y).toBeGreaterThan(844*0.3);            // a look: the page stays in view above
    expect(box.x).toBeGreaterThanOrEqual(8);
    await page.touchscreen.tap(195,box.y/2);
    await expect(reader).toBeHidden();
    await expect(page).toHaveURL(/\/press\/$/);
    if(browserName!=='chromium') return;
    const input=await page.context().newCDPSession(page);
    // At a finger's pace (about half a pixel a millisecond): injected moves
    // are otherwise near-instant, and every pull reads as a flick.
    async function swipe(y:number,dy:number) {
      await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y}]});
      for(let i=1;i<=20;i++){await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y:y+dy*i/20}]});await page.waitForTimeout(16);}
      await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }
    async function open() { await card.tap(); await expect(reader).toHaveAttribute('data-detent','peek'); await page.waitForTimeout(450); }
    // Lowered, a thumb swipe down anywhere on the card puts it away.
    await open();
    await swipe(700,160);
    await expect(reader).toBeHidden();
    // A swipe up raises it to read; so does a tap on it.
    await open();
    await swipe(700,-200);
    await expect(reader).toHaveAttribute('data-detent','full');
    await page.touchscreen.tap(195,30);
    await expect(reader).toBeHidden();
    await open();
    await page.touchscreen.tap(195,720);
    await expect(reader).toHaveAttribute('data-detent','full');
    await page.waitForTimeout(450);
    // Raised, a swipe down part-way through the article scrolls it back...
    const text=reader.locator('.press-reader__content');
    await text.evaluate(el=>{el.scrollTop=400;});
    await swipe(500,150);
    await expect(reader).toHaveAttribute('data-detent','full');
    expect(await text.evaluate(el=>el.scrollTop)).toBeLessThan(400);
    // ...and at the top the same swipe lowers it, and a long pull puts it away.
    await text.evaluate(el=>{el.scrollTop=0;});
    await swipe(400,150);
    await expect(reader).toHaveAttribute('data-detent','peek');
    await page.waitForTimeout(450);
    await swipe(700,-200);
    await expect(reader).toHaveAttribute('data-detent','full');
    await page.waitForTimeout(450);
    await swipe(200,500);
    await expect(reader).toBeHidden();
    await input.detach();
  });

  test('a linked person opens as a card on the same page, like Press',async({page})=>{
    await page.goto('/people/');
    const person=page.locator('a.trow__link[data-article]').first();
    test.skip(!(await person.count()),'No published biographies.');
    await person.scrollIntoViewIfNeeded();
    const top=await page.evaluate(()=>scrollY);
    await person.tap();
    const card=page.getByRole('dialog',{name:'Profile'});
    await expect(card).toBeVisible();
    await expect(page).toHaveURL(/\/people\/$/);
    await expect(card.locator('.spread__say')).toBeVisible();
    await expect(card.locator('.rv').first()).toHaveCSS('opacity','1');
    const box=(await card.boundingBox())!;
    await page.touchscreen.tap(195,Math.max(box.y/2,20));
    await expect(card).toBeHidden();
    expect(await page.evaluate(()=>scrollY)).toBeCloseTo(top,0);
  });

  test('a tapped link answers at once and the next page is fetched ahead',async({page})=>{
    // Hold the next page back (its prefetch too), so this one stays to be checked.
    await page.route('**/projects/',route=>setTimeout(()=>route.continue().catch(()=>{}),5000));
    await page.goto('/');
    const onward=page.locator('a.onward[href="/projects/"]').first();
    await onward.scrollIntoViewIfNeeded();
    await expect(page.locator('link[rel="prefetch"][href="/projects/"]')).toHaveCount(1);
    // Reported from inside the page: a locator would wait for the pending navigation.
    await page.evaluate(()=>{const a=document.querySelector('a.onward[href="/projects/"]')!;
      new MutationObserver(()=>{if(a.hasAttribute('data-going'))console.log('going');}).observe(a,{attributes:true});});
    const going=page.waitForEvent('console',{predicate:m=>m.text()==='going',timeout:1500});
    await onward.tap();
    await going;
    await page.unrouteAll({behavior:'ignoreErrors'});
    // A Press cover opens its card instead of leaving, and must not stay dimmed.
    await page.goto('/press/');
    const cover=page.locator('a[data-article]').first();
    await cover.tap();
    await expect(page.getByRole('dialog',{name:'Press reader'})).toBeVisible();
    await page.waitForTimeout(100);
    await expect(cover).not.toHaveAttribute('data-going','');
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

test('with a mouse, even in a narrow window, the Press card opens raised and scrolls',async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.goto('/press/');
  await page.locator('a[data-article]').first().click();
  const reader=page.getByRole('dialog',{name:'Press reader'});
  await expect(reader.locator('.press-article')).toBeVisible();
  await expect(reader).not.toHaveAttribute('data-detent','peek');
  await expect(reader.locator('.press-reader__content')).toHaveCSS('overflow-y','auto');
  expect((await reader.boundingBox())!.y).toBeLessThan(120);
});

test('mouse layouts show the contact copy mark on hover and focus at desktop and narrow widths',async({page,browserName})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{}},configurable:true}));
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto('/');
    await expect(page.locator('.pcard__action').first()).toBeHidden();
    for(const route of ['/', '/contact/']) {
      if(route!=='/') await page.goto(route);
      for(const kind of ['mailto:', 'tel:']) {
        const link=page.locator(`.contact-links a[href^="${kind}"]`);
        const mark=link.locator('..').locator('.copy-mark');
        const otherMark=page.locator(`.contact-links a[href^="${kind==='mailto:'?'tel:':'mailto:'}"]`).locator('..').locator('.copy-mark');
        await page.mouse.move(0,0);
        await page.locator('.header__logo').focus();
        await expect(mark).toHaveCSS('opacity','0');
        await link.hover();
        await expect(mark).toHaveCSS('opacity','1');
        await expect(otherMark).toHaveCSS('opacity','0');
        expect(await link.evaluate(el=>getComputedStyle(el,'::after').display)).toBe('none');
        await mark.hover();
        await expect(mark).toHaveCSS('opacity','1');
        await mark.click();
        await page.mouse.move(0,0);
        await expect(mark).toHaveCSS('opacity','0');
        await expect(otherMark).toHaveCSS('opacity','0');
        await page.keyboard.press('Tab');
        await link.focus();
        await expect(mark).toHaveCSS('opacity','1');
        await otherMark.locator('..').locator('a').hover();
        await expect(otherMark).toHaveCSS('opacity','0');
        // WebKit follows macOS's default that Tab skips buttons; test the
        // focus treatment directly there, and normal tab order in Chromium.
        if(browserName==='webkit') await mark.focus();
        else await link.press('Tab');
        await expect(mark).toBeFocused();
        await expect(mark).toHaveCSS('opacity','1');
        await mark.press('Tab');
      }
    }
    await page.goto('/');
    expect(await page.locator('.onward__t').first().evaluate(el=>getComputedStyle(el,'::after').clipPath)).toBe('inset(0px 100% 0px 0px)');
    await page.goto('/projects/nelly-house/');
    await expect(page.locator('.project-note--touch')).toBeHidden();
    await expect(page.locator('[data-rail] > .rail__note')).toBeVisible();
  }
});
