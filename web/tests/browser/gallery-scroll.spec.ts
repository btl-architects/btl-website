import {test, expect} from '@playwright/test';

for (const route of ['/studio/', '/projects/nelly-house/', '/projects/']) {
  test(`dragging photographs pans the gallery without opening the viewer on ${route}`, async ({page}) => {
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(route);
    if (route === '/projects/') {
      await page.locator('[data-project]').first().press('Enter');
      await expect(page.locator('.pcard[data-open="true"] .rail__f').last()).toBeAttached();
    }
    const rail = page.locator(route === '/projects/' ? '.pcard[data-open="true"] [data-strip]' : '[data-rail]').first();
    const photo = rail.locator('.rail__f img').first();
    await photo.scrollIntoViewIfNeeded();
    const before = await rail.evaluate(el => el.scrollLeft);
    const box = (await photo.boundingBox())!;
    const x = Math.min(box.x + box.width / 2, page.viewportSize()!.width - 40);
    const y = box.y + box.height / 2;
    await page.mouse.move(x,y);
    await page.mouse.down();
    await page.mouse.move(x - 140,y,{steps:10});
    await expect(rail).toHaveAttribute('data-dragging','');
    await expect(rail.locator('.rail__f').first()).toHaveCSS('cursor','grabbing');
    await page.mouse.up();
    await expect.poll(() => rail.evaluate(el => el.scrollLeft)).toBeGreaterThan(before + 80);
    await expect(rail).not.toHaveAttribute('data-dragging','');
    await expect(page.getByRole('dialog',{name:'Photograph viewer'})).toBeHidden();
    if (route === '/projects/') await expect(page.locator('[data-project]').first()).toHaveAttribute('aria-expanded','true');
    const forward = await rail.evaluate(el => el.scrollLeft);
    const backStart = Math.min(x,page.viewportSize()!.width - 160);
    await page.mouse.move(backStart,y);
    await page.mouse.down();
    await page.mouse.move(backStart + 100,y,{steps:10});
    await page.mouse.up();
    await expect.poll(() => rail.evaluate(el => el.scrollLeft)).toBeLessThan(forward - 50);
    await expect(page.getByRole('dialog',{name:'Photograph viewer'})).toBeHidden();
    // The next ordinary click must still open the image, without stale drag state.
    await photo.click();
    await expect(page.getByRole('dialog',{name:'Photograph viewer'})).toBeVisible();
  });

  test(`vertical wheel scrolls the page without moving photographs on ${route}`, async ({page}) => {
    await page.setViewportSize({width:1280, height:600});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(route);
    if (route === '/projects/') {
      await page.locator('[data-project]').first().press('Enter');
      await expect(page.locator('.pcard[data-open="true"] .rail__f').last()).toBeAttached();
    }
    const rail = page.locator(route === '/projects/' ? '.pcard[data-open="true"] [data-strip]' : '[data-rail]').first();
    await rail.scrollIntoViewIfNeeded();
    if (route === '/projects/') {
      // Browse once to release the opening position correction, just as a
      // visitor would, before checking wheel input at different positions.
      await page.locator('.pcard[data-open="true"] [data-gallery-step="1"]').click();
    }
    // The old conversion captured vertical input in the middle of the strip.
    // Page scrolling must also work at either gallery edge.
    for (const position of ['middle','start','end']) {
      await rail.scrollIntoViewIfNeeded();
      await rail.evaluate((el, position) => {
        const range = el.scrollWidth - el.clientWidth;
        el.scrollTo({left:position === 'middle' ? range / 2 : position === 'start' ? 0 : range, behavior:'instant'});
      }, position);
      const left = await rail.evaluate(el => el.scrollLeft);
      const box = (await rail.boundingBox())!;
      const y = Math.min(Math.max(box.y + box.height / 2, 140), 560);
      await page.mouse.move(box.x + box.width / 2,y);
      const top = await page.evaluate(() => window.scrollY);
      // Project photographs begin in the first screen; Studio is farther down.
      // Start in a direction with room, then reverse to check both directions.
      const delta = top >= 100 ? -100 : 100;
      await page.mouse.wheel(0,delta);
      await expect.poll(async () => ((await page.evaluate(() => window.scrollY)) - top) * Math.sign(delta)).toBeGreaterThan(40);
      expect(await rail.evaluate(el => el.scrollLeft)).toBeCloseTo(left,0);
      const movedBox = (await rail.boundingBox())!;
      await page.mouse.move(movedBox.x + movedBox.width / 2, Math.min(Math.max(movedBox.y + movedBox.height / 2,140),560));
      const moved = await page.evaluate(() => window.scrollY);
      await page.mouse.wheel(0,-delta);
      await expect.poll(async () => ((await page.evaluate(() => window.scrollY)) - moved) * -Math.sign(delta)).toBeGreaterThan(40);
      expect(await rail.evaluate(el => el.scrollLeft)).toBeCloseTo(left,0);
    }
    const browserZoom = await rail.evaluate(el => {
      const event = new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:120,ctrlKey:true});
      el.dispatchEvent(event);
      return !event.defaultPrevented;
    });
    expect(browserZoom).toBe(true);
  });

  // A fresh gesture avoids WebKit's axis lock joining horizontal input to the
  // preceding vertical wheel gesture. Native horizontal scrolling stays native.
  test(`horizontal wheel input stays native on ${route}`, async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto(route);
    if (route === '/projects/') {
      await page.locator('[data-project]').first().press('Enter');
      await expect(page.locator('.pcard[data-open="true"] .rail__f').last()).toBeAttached();
    }
    const rail = page.locator(route === '/projects/' ? '.pcard[data-open="true"] [data-strip]' : '[data-rail]').first();
    await rail.scrollIntoViewIfNeeded();
    const before = await rail.evaluate(el => el.scrollLeft);
    const box = (await rail.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(160, 0);
    await expect.poll(() => rail.evaluate(el => el.scrollLeft)).toBeGreaterThan(before);
  });
}
