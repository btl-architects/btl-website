import {test,expect} from '@playwright/test';

for(const viewport of [{width:1440,height:1300},{width:375,height:900}]) {
  test(`the shared footer follows a full page at ${viewport.width}px`,async({page})=>{
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:'reduce'});
    let referencePadding: string | undefined;
    for(const path of ['/press/','/404.html','/contact/','/people/','/projects/nelly-house/']) {
      await page.goto(path);
      await page.evaluate(()=>document.fonts.ready);
      const layout=await page.evaluate(()=>{
        const main=document.querySelector('main')!.getBoundingClientRect();
        const footer=document.querySelector('footer')!.getBoundingClientRect();
        const style=getComputedStyle(document.querySelector('footer')!);
        return {top:footer.top+scrollY,mainBottom:main.bottom+scrollY,height:innerHeight,
          padding:`${style.paddingTop}/${style.paddingBottom}`,position:style.position,
          bottom:footer.bottom+scrollY,documentHeight:document.documentElement.scrollHeight};
      });
      expect(layout.top,`${path}: footer must follow the first screen`).toBeGreaterThanOrEqual(layout.height-1);
      expect(Math.abs(layout.top-layout.mainBottom),`${path}: footer must follow content`).toBeLessThan(1);
      expect(layout.position).toBe('static');
      referencePadding ??=layout.padding;
      expect(layout.padding,`${path}: footer spacing must match other pages`).toBe(referencePadding);
      expect(Math.abs(layout.bottom-layout.documentHeight)).toBeLessThan(2);
    }
  });
}
