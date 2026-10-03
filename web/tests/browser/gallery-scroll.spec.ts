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

  test(`mouse wheel moves photographs and releases the page at the edges on ${route}`, async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto(route);
    if (route === '/projects/') {
      await page.locator('[data-project]').first().press('Enter');
      await expect(page.locator('.pcard[data-open="true"] .rail__f').last()).toBeAttached();
    }
    const rail = page.locator(route === '/projects/' ? '.pcard[data-open="true"] [data-strip]' : '[data-rail]').first();
    await rail.scrollIntoViewIfNeeded();
    await rail.evaluate(el => { el.scrollLeft = 0; });
    await expect.poll(() => rail.evaluate(el => el.scrollLeft)).toBe(0);
    const box = (await rail.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const top = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 240);
    await expect.poll(() => rail.evaluate(el => el.scrollLeft)).toBeGreaterThan(100);
    expect(await page.evaluate(() => window.scrollY)).toBe(top);
    const forward = await rail.evaluate(el => el.scrollLeft);
    await page.mouse.wheel(0, -120);
    await expect.poll(() => rail.evaluate(el => el.scrollLeft)).toBeLessThan(forward);

    // At both ends, vertical wheel input belongs to the page again.
    for (const end of ['start', 'end']) {
      const released = await rail.evaluate((el, end) => {
        el.scrollLeft = end === 'start' ? 0 : el.scrollWidth;
        const event = new WheelEvent('wheel', {bubbles: true, cancelable: true, deltaY: end === 'start' ? -120 : 120});
        el.dispatchEvent(event);
        return !event.defaultPrevented;
      }, end);
      expect(released).toBe(true);
    }
    await rail.evaluate(el => { el.scrollLeft = el.scrollWidth / 2; });
    const browserZoom = await rail.evaluate(el => {
      const event = new WheelEvent('wheel', {bubbles: true, cancelable: true, deltaY: 120, ctrlKey: true});
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
