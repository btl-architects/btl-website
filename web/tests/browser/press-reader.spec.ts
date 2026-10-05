import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('complete Press artwork responds to hover and keyboard focus without clipping', async ({page}) => {
  for (const route of ['/', '/press/']) {
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.goto(route, {waitUntil:'domcontentloaded'});
    const card = page.locator('a.pc--custom').first();
    const image = card.locator('.pc__img');
    const caption = card.locator('.pc__m');
    await card.scrollIntoViewIfNeeded();
    const restingColor = await caption.evaluate(el => getComputedStyle(el).color);
    await card.hover();
    await expect(card).toHaveCSS('cursor','pointer');
    await expect(image).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, -3)');
    await expect(caption).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, -3)');
    await expect(caption).not.toHaveCSS('color',restingColor);
    await expect(image.locator('img')).toHaveCSS('transform','none');
    await expect(image.locator('img')).toHaveCSS('object-fit','contain');
    await page.mouse.move(0,0);
    await page.keyboard.press('Tab');
    await card.focus();
    await expect(image).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, -3)');
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect(image).toHaveCSS('transform','none');
    await expect(caption).toHaveCSS('transform','none');
  }
});

test('BTL reader keeps the page, traps focus, restores scroll and dismisses with Back', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/__reader-demo/');
  const entry = page.locator('a[data-article]').first();
  await entry.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => window.scrollY);
  await entry.press('Enter');
  const reader = page.getByRole('dialog', {name: 'Press reader'});
  await expect(reader).toBeVisible();
  await expect(reader.getByRole('heading', {name: 'A quiet place to read'})).toBeVisible();
  await expect(reader.getByRole('button', {name: 'Close article'})).toBeFocused();
  // A heading-size rule once enlarged the Close label when the mobile label
  // was wrapped in a span. Check actual typography, not just button geometry.
  const controlSizes = await reader.evaluate(el => {
    const fontSize = (selector: string) => parseFloat(getComputedStyle(el.querySelector(selector)!).fontSize);
    return {close: fontSize('.press-reader__close-text'), original: fontSize('.press-reader__original-text'), button: fontSize('.press-reader__close')};
  });
  expect(controlSizes.close).toBe(controlSizes.button);
  expect(controlSizes.close).toBe(controlSizes.original);
  expect(controlSizes.close).toBeLessThanOrEqual(18);
  await expect(reader.locator('.press-reader__close-icon')).toHaveCSS('width', '16px');
  await expect(page).toHaveURL(/\/__reader-demo\/$/);
  await expect(reader.locator('iframe')).toHaveCount(0);
  await expect(reader.locator('.press-article__intro')).toContainText('introduction');
  await expect(reader.locator('.press-article__quote')).toContainText('A place to read');
  await expect(reader.locator('.press-article__credits')).toContainText('Photography');
  await expect(reader.locator('.press-article__body ul > li > ol')).toHaveCount(1);
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await reader.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(result.violations).toEqual([]);
  await page.goBack();
  await expect(reader).not.toBeVisible();
  await expect(entry).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(scroll, 0);
  await entry.press('Enter');
  await expect(reader.getByRole('heading', {name: 'A quiet place to read'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(reader).not.toBeVisible();
  await expect(entry).toBeFocused();
});

test('Press captions follow the photograph anchor inside complete artwork at every breakpoint', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  for (const route of ['/', '/press/']) {
    await page.goto(route);
    const caption = page.locator('.pc__m').first();
    await caption.evaluate(el => el.textContent = 'Feature · A house with a deliberately longer project name in Wayanad · 2026');
    for (const width of [320,375,768,1440]) {
      await page.setViewportSize({width,height:900});
      // WebKit applies responsive layout on the next frame after a viewport
      // change. Measure the settled layout, rather than mixing two sizes.
      await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
      const card = page.locator('.pc').first();
      const image = (await card.locator('.pc__img').boundingBox())!;
      const text = (await card.locator('.pc__m').boundingBox())!;
      const anchor = Number(await card.getAttribute('data-caption-anchor') ?? .5);
      const dimensions = await card.locator('img').evaluate(el => ({width: Number(el.getAttribute('width')),height:Number(el.getAttribute('height'))}));
      const artworkWidth = Math.min(image.width,image.height * dimensions.width / dimensions.height);
      const photographCenter = image.x + (image.width - artworkWidth) / 2 + artworkWidth * anchor;
      expect(Math.abs(photographCenter - text.x - text.width / 2)).toBeLessThan(1);
      expect(text.y - image.y - image.height).toBeGreaterThanOrEqual(0);
      expect(text.y - image.y - image.height).toBeLessThan(20);
      await expect(card.locator('.pc__m')).toHaveCSS('text-align','center');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }
});

test('a publisher frame loads only on opening and is removed on close', async ({page}) => {
  let requests = 0;
  await page.route('https://example.com/embedded-article', async route => {
    requests++;
    await route.fulfill({contentType: 'text/html', body: '<!doctype html><html lang="en"><title>Publisher</title><h1>Publisher article</h1><p>Test publisher content.</p></html>'});
  });
  await page.goto('/__reader-demo/');
  expect(requests).toBe(0);
  await page.locator('a[data-article]').nth(1).click();
  const reader = page.getByRole('dialog', {name: 'Press reader'});
  await expect(reader.locator('iframe')).toHaveAttribute('src', 'https://example.com/embedded-article');
  await expect(page.frameLocator('.press-article__frame').getByRole('heading', {name: 'Publisher article'})).toBeVisible();
  expect(requests).toBe(1);
  await expect(reader.getByRole('link', {name: 'Open original'})).toHaveAttribute('target', '_blank');
  await reader.getByRole('button', {name: 'Close article'}).click();
  await expect(reader).not.toBeVisible();
  await expect(reader.locator('iframe')).toHaveCount(0);
});

test('a blocked publisher retains its escape route and leaves BTL usable', async ({page}) => {
  await page.route('https://example.com/embedded-article', route => route.fulfill({headers: {'X-Frame-Options': 'DENY', 'Content-Security-Policy': "frame-ancestors 'none'"}, contentType: 'text/html', body: '<h1>Embedding blocked</h1>'}));
  await page.goto('/__reader-demo/');
  await page.locator('a[data-article]').nth(1).click();
  const reader = page.getByRole('dialog', {name: 'Press reader'});
  await expect(reader.locator('.press-article__help')).toContainText('If the article does not appear');
  await expect(reader.getByRole('link', {name: 'Open original'})).toHaveAttribute('href', 'https://example.com/embedded-article');
  await reader.getByRole('button', {name: 'Close article'}).click();
  await expect(page.getByRole('heading', {name: 'Press', exact: true})).toBeVisible();
});

test('a failed or cancelled fetch cannot leave the visitor trapped or reopen the panel', async ({page}) => {
  await page.route('**/press/reader-fixture/', route => route.fulfill({status: 503, body: 'Unavailable'}));
  await page.goto('/__reader-demo/');
  await page.locator('a[data-article]').first().click();
  const reader = page.getByRole('dialog', {name: 'Press reader'});
  await expect(reader.getByRole('link', {name: 'Open article page'})).toBeVisible();
  await reader.getByRole('button', {name: 'Close article'}).click();
  await expect(reader).not.toBeVisible();
  await page.unroute('**/press/reader-fixture/');
  await page.route('**/press/reader-fixture/', async route => {await new Promise(r => setTimeout(r, 300)); await route.continue().catch(() => {});});
  await page.locator('a[data-article]').first().click();
  await reader.getByRole('button', {name: 'Close article'}).click();
  await page.waitForTimeout(450);
  await expect(reader).not.toBeVisible();
  expect(await page.evaluate(() => document.body.style.position)).toBe('');
});

test('reader fits phones and honours reduced motion', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 320, height: 650});
  await page.goto('/__reader-demo/');
  await page.locator('a[data-article]').first().click();
  const reader = page.getByRole('dialog', {name: 'Press reader'});
  await expect(reader.getByRole('heading', {name: 'A quiet place to read'})).toBeVisible();
  expect(await reader.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(320);
  expect(await reader.locator('.press-reader__content').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(320);
  const bar = (await reader.locator('.press-reader__bar').boundingBox())!;
  expect(bar.height).toBeLessThanOrEqual(72);
  const source = (await reader.getByRole('link',{name:'Open original',exact:true}).boundingBox())!;
  const close = (await reader.getByRole('button',{name:'Close article'}).boundingBox())!;
  expect(Math.abs(source.y-close.y)).toBeLessThan(1);
  expect(source.width).toBeGreaterThanOrEqual(44);
  expect(close.width).toBeGreaterThanOrEqual(44);
  await expect(reader).toHaveCSS('animation-name', 'none');
  await reader.getByRole('button', {name: 'Close article'}).click();
  await expect(reader).not.toBeVisible();
});

test('external mode uses the same panel and its source opens a new tab; modifier clicks retain native article pages', async ({page, context, browser, browserName}) => {
  await context.route('https://example.com/original', route => route.fulfill({contentType: 'text/html', body: '<h1>Original article</h1>'}));
  await page.goto('/__reader-demo/');
  await page.locator('a[data-article]').nth(2).click();
  const reader = page.getByRole('dialog', {name: 'Press reader'});
  await expect(reader.getByRole('heading', {name: 'A quiet place to read'})).toBeVisible();
  await expect(reader.locator('.press-article__body')).toBeEmpty();
  const [external] = await Promise.all([context.waitForEvent('page'), reader.getByRole('link', {name: 'Read the original on External publication'}).click()]);
  await expect(external).toHaveURL('https://example.com/original');
  await external.close();
  await page.bringToFront();
  // Close traverses the reader's same-URL history entry after hiding the
  // dialog. Do not start a native new-tab navigation while Back is in flight:
  // Chromium can cancel that navigation before it creates the tab.
  await Promise.all([
    page.evaluate(()=>new Promise<void>(resolve=>window.addEventListener('popstate',()=>{
      requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()));
    },{once:true}))),
    reader.getByRole('button', {name: 'Close article'}).click()
  ]);
  await expect(reader).not.toBeVisible();
  const articleOpened = context.waitForEvent('page');
  if (browserName === 'chromium') {
    // Activate the native background target before waiting for Playwright's
    // Page object: CI can record its 200 response without finishing attachment.
    // This selects the tab; it never creates a tab or supplies its navigation.
    const session = await browser.newBrowserCDPSession();
    try {
      const known = new Set((await session.send('Target.getTargets')).targetInfos.map(target=>target.targetId));
      await page.locator('a[data-article]').first().click({modifiers:['ControlOrMeta']});
      let targetId = '';
      await expect.poll(async()=>{
        const targets=(await session.send('Target.getTargets')).targetInfos.filter(target=>target.type==='page' && !known.has(target.targetId));
        targetId=targets.length===1 ? targets[0].targetId : '';
        return targets.length;
      }).toBe(1);
      await session.send('Target.activateTarget',{targetId});
    } finally {await session.detach();}
  } else await page.locator('a[data-article]').first().click({modifiers:['ControlOrMeta']});
  const article = await articleOpened;
  await article.bringToFront();
  // A visible article heading establishes document readiness before reading
  // its location. The cached frame URL can be empty for a noopener tab in CI.
  await expect(article.getByRole('heading', {name: 'A quiet place to read'})).toBeVisible();
  await expect.poll(()=>article.evaluate(()=>location.href)).toMatch(/\/press\/reader-fixture\/$/);
  await expect(reader).not.toBeVisible();
  await article.close();
});

test('BTL-managed article links remain readable without JavaScript', async ({browser,baseURL}) => {
  const context = await browser.newContext({javaScriptEnabled: false});
  const page = await context.newPage();
  await page.goto(new URL('/__reader-demo/',baseURL).href);
  await page.locator('a[data-article]').first().click();
  await expect(page).toHaveURL(/\/press\/reader-fixture\/$/);
  await expect(page.getByRole('heading', {name: 'A quiet place to read'})).toBeVisible();
  await expect(page.locator('.press-article__body')).toContainText('This is sample content');
  await context.close();
});
