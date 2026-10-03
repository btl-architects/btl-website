import {test,expect} from '@playwright/test';
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
test('review phone interactions',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const route of ['/press/','/studio/','/people/','/contact/','/projects/','/projects/nelly-house/']) {
    await page.goto(route,{waitUntil:'domcontentloaded'});
    if(route==='/studio/') await page.locator('[data-rail]').scrollIntoViewIfNeeded();
    if(route==='/people/') await page.locator('.team__list').first().scrollIntoViewIfNeeded();
    if(route==='/projects/') {await page.screenshot({path:'/tmp/btl-mobile-project-covers.png'}); await page.locator('[data-project]').first().tap(); await expect(page.locator('.pcard[data-open="true"]')).toBeVisible();}
    await page.evaluate(async()=>{await document.fonts.ready; await Promise.race([Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).map(i=>{i.loading='eager';return i.decode().catch(()=>{});})),new Promise(r=>setTimeout(r,3000))]);});
    await page.screenshot({path:`/tmp/btl-mobile-after-${route.split('/')[1]}.png`});
    console.log(route,await page.evaluate(()=>[...document.querySelectorAll('a,button,input,textarea')].flatMap(el=>{
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      return r.width && r.height && r.top>=0 && r.bottom<=innerHeight && s.visibility!=='hidden' && (r.width<44||r.height<44) ? [{label:(el.getAttribute('aria-label')||el.textContent||el.getAttribute('name')||'').trim().slice(0,60),width:Math.round(r.width),height:Math.round(r.height)}]:[];
    })));
    if(route==='/studio/') {
      await page.locator('[data-rail] .rail__f').first().tap();
      await expect(page.locator('.lb[data-open="true"]')).toBeVisible();
      await expect.poll(()=>page.locator('.lb__img').evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);
      console.log('viewer', JSON.stringify(await page.locator('.lb').evaluate(el=>({viewport:[innerWidth,innerHeight,scrollY],state:el.outerHTML.slice(0,250),parts:[...el.querySelectorAll('.lb__bar,.lb__x,.lb__step')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {class:e.className,box:[r.x,r.y,r.width,r.height],color:s.color,display:s.display,opacity:s.opacity,visibility:s.visibility};})}))));
      await page.screenshot({path:'/tmp/btl-mobile-after-viewer.png'});
    }
  }
});
