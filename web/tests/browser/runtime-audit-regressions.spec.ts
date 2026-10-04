import {test,expect} from '@playwright/test';

test.describe('runtime audit regressions',()=>{
  test.use({viewport:{width:1440,height:900}});

  test('reopening during a closing transition removes stale state and duplicated notes',async({page})=>{
    await page.goto('/projects/');
    const card=page.locator('[data-card="nelly-house"]');
    await card.locator('[data-project]').press('Enter');
    await expect(card).toHaveAttribute('data-open','true');
    await page.waitForTimeout(950);
    await card.locator('[data-project-close]').click();
    await expect(card).not.toHaveAttribute('data-open','true');
    await expect(page).toHaveURL(/\/projects\/$/);
    await card.locator('[data-project]').press('Enter');
    await expect(card).toHaveAttribute('data-open','true');
    await expect(card).not.toHaveAttribute('data-closing','');
    await expect(card.locator('.rail__note')).toHaveCount(1);
    await expect(card.locator('.rail__title')).toHaveCount(1);
    expect(await card.locator('[data-strip]').evaluate(el=>el.style.getPropertyValue('--close-shift'))).toBe('');
  });

  test('closing projects consumes the in-page history entry while Back and Forward remain native',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/press/');await page.goto('/projects/');
    for(const slug of ['nelly-house','the-conservatory','teak-and-terra']) {
      const card=page.locator(`[data-card="${slug}"]`);
      await card.locator('[data-project]').press('Enter');
      await expect(page).toHaveURL(new RegExp(`/projects/${slug}/$`));
      await card.locator('[data-project-close]').click();
      await expect(page).toHaveURL(/\/projects\/$/);
      await expect(card).not.toHaveAttribute('data-open','true');
    }
    await page.goBack();await expect(page).toHaveURL(/\/press\/$/);
    await page.goForward();await expect(page).toHaveURL(/\/projects\/$/);
    const first=page.locator('[data-card="nelly-house"]');
    await first.locator('[data-project]').press('Enter');
    await expect(first).toHaveAttribute('data-open','true');
    await page.goBack();await expect(first).not.toHaveAttribute('data-open','true');
    await page.goForward();await expect(first).toHaveAttribute('data-open','true');
  });

  test('switching open projects preserves one project history entry',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/projects/');
    await page.locator('[data-card="nelly-house"] [data-project]').press('Enter');
    await expect(page).toHaveURL(/\/projects\/nelly-house\/$/);
    await page.locator('[data-card="the-conservatory"] [data-project]').press('Enter');
    await expect(page).toHaveURL(/\/projects\/the-conservatory\/$/);
    await page.goBack();await expect(page).toHaveURL(/\/projects\/$/);
    await expect(page.locator('.pcard[data-open="true"]')).toHaveCount(0);
    await page.goForward();await expect(page.locator('[data-card="the-conservatory"]')).toHaveAttribute('data-open','true');
  });

  /* Closing used to step back through history, and both engines then restored
     the index entry's saved scroll: the page jumped to where the card opened. */
  for(const viewport of [{width:1440,height:900,touch:false},{width:390,height:844,touch:true}])
    test(`closing a project leaves the page where the reader is at ${viewport.width}px`,async({browser})=>{
      const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},...(viewport.touch?{hasTouch:true,isMobile:true}:{})});
      const page=await context.newPage();
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.goto('/projects/');
      await page.evaluate(()=>scrollTo(0,300));
      const card=page.locator('.pcard').nth(2);
      await card.evaluate(el=>(el.querySelector('[data-project]') as HTMLElement).click());
      await expect(card).toHaveAttribute('data-open','true');
      await page.waitForTimeout(1000);
      await page.evaluate(()=>scrollBy(0,400));
      await page.waitForTimeout(300);
      // This assertion samples animation frames in its own context. Keep that
      // page foregrounded so Chromium cannot suspend the measurement clock.
      await page.bringToFront();
      expect(await page.evaluate(()=>document.visibilityState)).toBe('visible');
      const result=await card.evaluate(el=>new Promise<{scroll:number[],top:number[],start:number,startTop:number}>(resolve=>{
        const start=scrollY,startTop=el.getBoundingClientRect().top,scroll:number[]=[],top:number[]=[];
        (el.querySelector('[data-project-close]') as HTMLElement).click();
        let frames=0;
        (function sample(){scroll.push(scrollY);top.push(el.getBoundingClientRect().top);
          if(++frames<45)requestAnimationFrame(sample);else resolve({scroll,top,start,startTop});})();
      }));
      await expect(card).not.toHaveAttribute('data-open','true');
      for(const y of result.scroll) expect(Math.abs(y-result.start)).toBeLessThanOrEqual(1);
      for(const t of result.top) expect(Math.abs(t-result.startTop)).toBeLessThanOrEqual(2);
      await expect(page).toHaveURL(/\/projects\/$/);
      await context.close();
    });

  test('a card opened straight after closing another stays open',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/projects/');
    const first=page.locator('[data-card="nelly-house"]'),second=page.locator('[data-card="the-conservatory"]');
    await first.locator('[data-project]').press('Enter');
    await expect(first).toHaveAttribute('data-open','true');
    await page.evaluate(()=>{
      (document.querySelector('[data-card="nelly-house"] [data-project-close]') as HTMLElement).click();
      (document.querySelector('[data-card="the-conservatory"] [data-project]') as HTMLElement).click();
    });
    await page.waitForTimeout(1200);
    await expect(second).toHaveAttribute('data-open','true');
    await expect(page).toHaveURL(/\/projects\/the-conservatory\/$/);
    await page.goBack();
    await expect(second).not.toHaveAttribute('data-open','true');
    await expect(page).toHaveURL(/\/projects\/$/);
  });

  for(const width of [1024,1440]) test(`pure close at page end adds no hold and hides navigation immediately at ${width}px`,async({page})=>{
    await page.goto('/projects/');await page.setViewportSize({width,height:900});
    const card=page.locator('.pcard').last();
    await card.locator('[data-project]').press('Enter');
    await expect(card).toHaveAttribute('data-open','true');await page.waitForTimeout(950);
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
    await card.locator('[data-project-close]').press('Enter');
    await expect(card).not.toHaveAttribute('data-open','true');
    expect(await page.locator('[data-pindex]').evaluate(el=>el.hasAttribute('data-holding'))).toBe(false);
    await expect(card.locator('[data-nav]')).toBeHidden();
    await page.waitForTimeout(800);
    await expect(card.locator('.rail__note')).toHaveCount(0);
  });
});

test.describe('text enlargement and future content',()=>{
  test('navigation falls back to the menu when enlarged labels no longer fit',async({page})=>{
    await page.goto('/people/');await page.setViewportSize({width:820,height:1180});
    await expect(page.locator('.nav')).toBeVisible();
    await page.addStyleTag({content:'html{font-size:150% !important}'});
    const burger=page.getByRole('button',{name:'Menu',exact:true});
    await expect(burger).toBeVisible();await expect(page.locator('.nav')).toBeHidden();
    await burger.press('Enter');
    await expect(page.locator('.menu').getByRole('link',{name:'Home',exact:true})).toBeFocused();
    await page.keyboard.press('Escape');await expect(burger).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(820);
  });

  test('adaptive menu initial focus works with reduced motion and enlarged text',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/people/');
    await page.setViewportSize({width:820,height:1180});
    await page.addStyleTag({content:'html{font-size:150% !important}'});
    const burger=page.getByRole('button',{name:'Menu',exact:true});await expect(burger).toBeVisible();
    await burger.press('Enter');
    await expect(page.locator('.menu').getByRole('link',{name:'Home',exact:true})).toBeFocused();
  });

  test('enlarging nav text alone keeps current keyboard focus reachable',async({page})=>{
    await page.goto('/people/');await page.setViewportSize({width:1280,height:900});
    await page.locator('.nav__link').first().focus();
    await page.addStyleTag({content:'.nav__link{font-size:3rem !important}'});
    await expect(page.getByRole('button',{name:'Menu',exact:true})).toBeFocused();
    await expect(page.locator('.nav')).toBeHidden();
  });

  for(const route of ['/','/contact/','/projects/nelly-house/']) test(`200% text reflows without page overflow on ${route}`,async({page})=>{
    await page.goto(route);await page.setViewportSize({width:390,height:844});
    await page.addStyleTag({content:'html{font-size:200% !important}'});
    await page.evaluate(()=>document.fonts.ready);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test('approved Home contact details stay on one line across normal layouts',async({page})=>{
    await page.goto('/');
    for(const width of [390,820,1440]) {
      await page.setViewportSize({width,height:900});await page.evaluate(()=>document.fonts.ready);
      const lines=await page.locator('.home-contact .contact-links__i > a').evaluateAll(links=>links.map(link=>{
        const text=[...link.childNodes].find(node=>node.nodeType===Node.TEXT_NODE)!;
        const range=document.createRange();range.selectNodeContents(text);
        return [...range.getClientRects()].length;
      }));
      expect(lines).toEqual([1,1]);
    }
  });

  test('enlarged Press credit labels do not overlap their values',async({page})=>{
    await page.goto('/press/elle-decor-nelly-house/');await page.setViewportSize({width:390,height:844});
    await page.addStyleTag({content:'html{font-size:200% !important}'});
    const overlaps=await page.locator('.press-article__credits > div').evaluateAll(rows=>rows.map(row=>{
      const label=row.querySelector('dt')!.getBoundingClientRect(),value=row.querySelector('dd')!.getBoundingClientRect();
      return label.right>value.left+1;
    }));
    expect(overlaps.length).toBeGreaterThan(0);expect(overlaps.some(Boolean)).toBe(false);
  });

  test('a future long principal name wraps inside its existing caption',async({page})=>{
    await page.goto('/');await page.setViewportSize({width:320,height:844});
    await page.locator('.spread__n').first().evaluate(el=>el.textContent='Ar. Annamalai Venkataraghavan Subramaniam-Pillai');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });

  test('automatic warming serializes delayed project responses',async({page})=>{
    await page.setViewportSize({width:1440,height:2400});
    let active=0,maxActive=0,started=0;
    await page.route('**/projects/*/',async route=>{
      if(route.request().resourceType()!=='fetch') {await route.continue();return;}
      active++;started++;maxActive=Math.max(maxActive,active);
      const response=await route.fetch();
      await new Promise(resolve=>setTimeout(resolve,700));
      active--;await route.fulfill({response});
    });
    await page.goto('/projects/');
    await expect.poll(()=>started,{timeout:20000}).toBeGreaterThanOrEqual(3);
    expect(maxActive).toBe(1);
  });

  test('automatic project warming waits for the opening photograph to finish',async({page,request})=>{
    const html=await (await request.get('/projects/')).text();
    const priority=html.match(/<img\b[^>]*fetchpriority="high"[^>]*>/)![0];
    const coverPath=new URL(priority.match(/src="([^"]+)"/)![1].replaceAll('&amp;','&')).pathname;
    let release!:()=>void;
    const held=new Promise<void>(resolve=>release=resolve);
    await page.route(url=>url.pathname===coverPath,async route=>{await held;await route.continue();});
    const warmed:string[]=[];
    page.on('request',req=>{if(req.resourceType()==='fetch' && new URL(req.url()).pathname.startsWith('/projects/')) warmed.push(req.url());});
    try {
      await page.goto('/projects/',{waitUntil:'domcontentloaded'});
      expect(await page.locator('img[fetchpriority="high"]').evaluate(el=>(el as HTMLImageElement).complete)).toBe(false);
      await page.waitForTimeout(750);
      expect(warmed).toEqual([]);
      release();
      await expect.poll(()=>warmed.length,{timeout:15000}).toBeGreaterThan(0);
    } finally {release();}
  });
});

test.describe('inline project reading panels',()=>{
  for(const viewport of [{width:844,height:390},{width:1024,height:600},{width:1280,height:593}])
    test(`long project copy remains reachable at ${viewport.width}×${viewport.height}`,async({page})=>{
      await page.goto('/projects/nelly-house/');await page.setViewportSize(viewport);
      const note=page.locator('[data-rail] > .rail__note');
      for(const enlarged of [false,true]) {
        if(enlarged) await page.addStyleTag({content:'.rail__note :is(p,h2,dt,dd){font-size:200% !important;line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important}.rail__note p{margin-bottom:2em !important}'});
        await note.evaluate(el=>el.scrollTop=0);
        const bounds=await note.evaluate(el=>({panel:el.getBoundingClientRect().top,first:el.firstElementChild!.getBoundingClientRect().top,content:el.scrollHeight,height:el.clientHeight}));
        expect(bounds.first).toBeGreaterThanOrEqual(bounds.panel-1);
        expect(bounds.content).toBeGreaterThan(bounds.height);
        await note.press('End');
        await expect.poll(()=>note.evaluate(el=>el.scrollTop+el.clientHeight)).toBeGreaterThanOrEqual(bounds.content-1);
        const tail=await note.evaluate(el=>({panel:el.getBoundingClientRect().bottom,last:el.lastElementChild!.getBoundingClientRect().bottom}));
        expect(tail.last).toBeLessThanOrEqual(tail.panel+1);
      }
    });
});

test.describe('touch runtime audit regressions',()=>{
  test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
  test('menu focuses its first link with animation enabled and clears state before navigation',async({page})=>{
    await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/studio/');
    await page.getByRole('button',{name:'Menu',exact:true}).press('Enter');
    await expect(page.locator('.menu').getByRole('link',{name:'Home',exact:true})).toBeFocused();
    await page.locator('.menu').getByRole('link',{name:'Press',exact:true}).click();
    await expect(page).toHaveURL(/\/press\/$/);await page.goBack();
    await expect(page).toHaveURL(/\/studio\/$/);
    await expect(page.locator('.menu')).toHaveAttribute('data-open','false');
    await expect(page.locator('main')).toHaveJSProperty('inert',false);
    expect(await page.evaluate(()=>document.documentElement.style.overflow)).toBe('');
  });

  test('opening tap near a viewer arrow remains on the chosen photograph',async({page,browserName})=>{
    test.skip(browserName!=='chromium','Native touch injection requires Chromium CDP.');
    await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/projects/nelly-house/');
    const first=page.locator('[data-rail] .rail__f').first();
    await first.scrollIntoViewIfNeeded();
    // Position the photograph over the location of the viewer Next arrow.
    await first.evaluate(el=>scrollBy(0,el.getBoundingClientRect().top+el.getBoundingClientRect().height/2-innerHeight/2));
    const box=(await first.boundingBox())!;
    const input=await page.context().newCDPSession(page);
    const x=Math.min(354,box.x+box.width-8),y=422;
    expect(x).toBeGreaterThan(box.x);expect(y).toBeGreaterThan(box.y);expect(y).toBeLessThan(box.y+box.height);
    await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect(page.locator('.lb')).toHaveAttribute('data-open','true');
    await expect(page.locator('.lb__count')).toHaveText(/^1 \/ /);
    // A genuinely new press on Next must still work immediately.
    await page.locator('.lb__step--next').tap();
    await expect(page.locator('.lb__count')).toHaveText(/^2 \/ /);
    await input.detach();
  });

  for(const width of [390,820]) test(`viewer keyboard cycle recovers from a photograph tap at ${width}px`,async({page})=>{
    await page.goto('/projects/nelly-house/');await page.setViewportSize({width,height:844});
    await page.locator('[data-rail] .rail__f').first().press('Enter');
    const viewer=page.locator('.lb'),close=viewer.locator('.lb__x'),previous=viewer.locator('.lb__step--prev'),next=viewer.locator('.lb__step--next');
    await expect(close).toBeFocused();
    await viewer.locator('.lb__img').tap();
    await expect(viewer).toHaveAttribute('data-chrome','off');
    await page.keyboard.press('Tab');await expect(close).toBeFocused();
    await expect(viewer.locator('.lb__bar')).toHaveCSS('opacity','1');
    await page.keyboard.press('Tab');await expect(previous).toBeFocused();
    await expect(previous).toHaveCSS('opacity','1');
    await page.keyboard.press('Tab');await expect(next).toBeFocused();
    await page.keyboard.press('Tab');await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');await expect(next).toBeFocused();
    await page.keyboard.press('Shift+Tab');await expect(previous).toBeFocused();
    await page.keyboard.press('Shift+Tab');await expect(close).toBeFocused();
    await page.keyboard.press('Escape');await expect(viewer).toBeHidden();
    await expect(page.locator('[data-rail] .rail__f').first()).toBeFocused();
  });

  for(const width of [390,820]) test(`hardware-keyboard focus restores hidden viewer controls at ${width}px`,async({page,browserName})=>{
    test.skip(browserName!=='chromium','Native touch injection requires Chromium CDP.');
    await page.goto('/projects/nelly-house/');await page.setViewportSize({width,height:844});
    await page.locator('[data-rail] .rail__f').first().press('Enter');
    const photo=page.locator('.lb__img');await expect(photo).toBeVisible();
    const box=(await photo.boundingBox())!;
    const input=await page.context().newCDPSession(page);
    await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
    await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect(page.locator('.lb')).toHaveAttribute('data-chrome','off');
    await page.keyboard.press('Tab');
    await expect(page.locator('.lb__bar')).toHaveCSS('opacity','1');
    for(const arrow of await page.locator('.lb__step').all()) await expect(arrow).toHaveCSS('opacity','1');
    expect(await page.evaluate(()=>document.activeElement?.matches(':focus-visible'))).toBe(true);
    await input.detach();
  });

  test('pinning the social rail produces no container layout-shift entry',async({page,browserName})=>{
    test.skip(browserName!=='chromium','Layout Instability API is exposed by Chromium.');
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.addInitScript(()=>{
      (window as any).__railShifts=[];
      new PerformanceObserver(list=>{
        for(const entry of list.getEntries() as any)
          for(const source of entry.sources??[]) {
            // Other sources may be Text nodes. This checks the container's
            // structural displacement, separately from font-swap text shifts.
            if(source.node instanceof Element && source.node.matches('.landing .srail')) (window as any).__railShifts.push({value:entry.value,previous:source.previousRect,current:source.currentRect});
          }
      }).observe({type:'layout-shift',buffered:true});
    });
    await page.setViewportSize({width:412,height:823});
    await page.route('**/scripts/site.js',async route=>{await new Promise(resolve=>setTimeout(resolve,250));await route.continue();});
    await page.goto('/');await page.evaluate(()=>document.fonts.ready);
    await expect(page.locator('.landing .srail')).toHaveAttribute('data-pinned','');
    await page.waitForTimeout(500);
    expect(await page.evaluate(()=>(window as any).__railShifts)).toEqual([]);
    expect(errors).toEqual([]);
  });
});
