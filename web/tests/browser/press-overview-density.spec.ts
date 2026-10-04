import {test,expect} from '@playwright/test';

for(const viewport of [{width:375,height:812},{width:667,height:375},{width:768,height:1024},{width:820,height:1180},{width:1180,height:820},{width:1440,height:900},{width:2560,height:1440}]) {
  test(`Press thumbnails stay compact as the index grows at ${viewport.width}px`,async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/press/');
    await page.setViewportSize(viewport);
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>{
      const grid=document.querySelector('.credits')!;
      const seed=grid.firstElementChild!;
      while(grid.children.length<12) {
        const copy=seed.cloneNode(true) as HTMLElement;
        copy.classList.remove('rv');grid.append(copy);
      }
    });
    const cards=await page.locator('.credits .pc').all();
    const boxes=await Promise.all(cards.map(card=>card.boundingBox()));
    const first=boxes[0]!;
    const columns=boxes.filter(box=>box&&Math.abs(box.y-first.y)<1).length;
    if(viewport.width<768) {
      expect(columns).toBe(2);
      const grid=(await page.locator('.credits').boundingBox())!;
      expect(first.width).toBeCloseTo((grid.width-24)/2,1);
    } else {
      expect(columns).toBeGreaterThanOrEqual(3);
      for(const card of cards) {
        const frame=(await card.locator('.pc__img').boundingBox())!;
        expect(Math.round(frame.width*1000)/1000).toBeLessThanOrEqual(viewport.width<=1366?208:240);
        expect(frame.height).toBeLessThanOrEqual(viewport.height*.28+1);
      }
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    for(const box of boxes) {
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x+box!.width).toBeLessThanOrEqual(viewport.width+1);
    }
  });
}

for(const viewport of [{width:1376,height:1032},{width:1600,height:1000}]) {
  test.describe(`large touch tablet ${viewport.width}px`,()=>{
    test.use({viewport,hasTouch:true,isMobile:true});
    test('Press keeps compact previews and swipe reader resting positions',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.goto('/press/');
      const preview=(await page.locator('.pc__img').first().boundingBox())!;
      expect(Math.round(preview.width*1000)/1000).toBeLessThanOrEqual(208);
      await page.locator('a[data-article]').first().tap();
      const reader=page.getByRole('dialog',{name:'Press reader'});
      await expect(reader).toHaveAttribute('data-detent','peek');
      await reader.locator('.press-reader__content').tap();
      await expect(reader).toHaveAttribute('data-detent','full');
      await expect.poll(async()=>Math.round((await reader.boundingBox())!.width)).toBeLessThanOrEqual(896);
      await page.touchscreen.tap(5,25);
      await expect(reader).toBeHidden();
    });
  });
}
