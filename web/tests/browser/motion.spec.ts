import {test, expect} from '@playwright/test';

for (const width of [375, 1440]) {
  test(`scroll entrances stay in the reading area and reveal once at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 900});
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await page.goto('/');
    const card = page.locator('#press .pc').first();
    await card.evaluate(el => window.scrollTo({top: el.getBoundingClientRect().top + scrollY - innerHeight + 12, behavior: 'instant'}));
    await page.waitForTimeout(1350);
    await expect(card).not.toHaveClass(/\bin\b/);
    await expect(card).toHaveCSS('opacity', '0');
    await card.evaluate(el => window.scrollTo({top: el.getBoundingClientRect().top + scrollY - innerHeight * .65, behavior: 'instant'}));
    await expect(card).toHaveClass(/\bin\b/);
    await expect.poll(() => card.evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0);
    expect(await card.evaluate(el => Number(getComputedStyle(el).opacity))).toBeLessThan(1);
    await expect(card).toHaveCSS('opacity', '1');
    await expect(card).toHaveCSS('transform', 'none');
    await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveCSS('opacity', '1');
    await expect(card).toHaveCSS('transform', 'none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

test('motion preference changes reveal pending content permanently', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.goto('/people/');
  const roster = page.locator('.trow').last();
  await expect(roster).not.toHaveClass(/\bin\b/);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect(page.locator('main .rv:not(.in), main .rvc:not(.in)')).toHaveCount(0);
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await expect(roster).toHaveCSS('opacity', '1');
  await expect(roster).toHaveCSS('transform', 'none');
});

test('keyboard focus reveals a below-fold destination immediately', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.goto('/');
  const destination = page.getByRole('link', {name: 'Everyone at btl', exact: true});
  await expect(destination).not.toHaveClass(/\bin\b/);
  await destination.focus();
  expect(await destination.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await expect(destination).toHaveCSS('opacity', '1');
  await expect(destination).toHaveCSS('transform', 'none');
  await destination.press('Enter');
  await expect(page).toHaveURL(/\/people\/$/);
});

test('project entrances preserve expansion and gallery controls', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.goto('/');
  const card = page.locator('.pcard').first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveCSS('opacity', '1');
  await expect(card).toHaveCSS('transform', 'none');
  const height = (await card.boundingBox())!.height;
  const entry = card.locator('[data-project]');
  await entry.click();
  await expect(entry).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(async () => (await card.boundingBox())!.height).toBeGreaterThan(height + 30);
  await expect(card.locator('.rail__f:not(.pcard__peek)').first()).toBeVisible();
  await entry.focus();
  await page.keyboard.press('Escape');
  await expect(entry).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(async () => Math.round((await card.boundingBox())!.height)).toBe(Math.round(height));
});

test('Press and team content stays visible without animation support', async ({browser,baseURL}) => {
  for (const javaScriptEnabled of [false, true]) {
    const context = await browser.newContext({javaScriptEnabled});
    if (javaScriptEnabled) await context.addInitScript(() => {
      Object.defineProperty(window, 'IntersectionObserver', {value: undefined});
      delete (window as any).IntersectionObserver;
    });
    const page = await context.newPage();
    for (const route of ['/press/', '/people/']) {
      await page.goto(new URL(route,baseURL).href);
      const cards = page.locator(route === '/press/' ? '.pc' : '.trow');
      for (const card of await cards.all()) {
        await expect(card).toHaveCSS('opacity', '1');
        await expect(card).toHaveCSS('transform', 'none');
      }
    }
    await context.close();
  }
});

test('focusing an entering Press card keeps its pointer target steady', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.goto('/');
  const card = page.locator('#press .pc').first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/\bin\b/);
  await card.focus();
  await expect(card).not.toHaveAttribute('data-reveal-instant');
  await expect(card).toHaveCSS('transform', 'none');
});

test('initial project cards retain their height animation', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/projects/');
  const card = page.locator('.pcard').first();
  await expect(card).toHaveAttribute('data-reveal-instant');
  const height = (await card.boundingBox())!.height;
  await card.locator('[data-project]').press('Enter');
  await expect(card).toHaveAttribute('data-open', 'true');
  const duration = await card.evaluate(el => {
    const style = getComputedStyle(el);
    return style.transitionDuration.split(',')[style.transitionProperty.split(',').map(p => p.trim()).indexOf('height')];
  });
  expect(parseFloat(duration)).toBeGreaterThan(0);
  await expect.poll(async () => (await card.boundingBox())!.height).toBeGreaterThan(height + 10);
  await expect.poll(async () => Math.round((await card.boundingBox())!.height)).toBe(504);
});
