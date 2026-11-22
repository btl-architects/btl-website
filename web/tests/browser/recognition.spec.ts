import {test, expect} from '@playwright/test';

/* The home Recognition pair rotates through every award and feature
 * (practice request, 2026-11-22). The published dataset may hold only two
 * entries, which never rotate, so the home page is rebuilt here with three:
 * the server's own odd-count markup (the list set twice over, first pair on). */
async function threeEntries(page: import('@playwright/test').Page) {
  await page.route(new URL('/', test.info().project.use.baseURL).href, async route => {
    const response = await route.fetch();
    let body = await response.text();
    // The Recognition card block, rotating or not, depending on how many
    // entries are published.
    const block = /<div class="credits[^"]*"[^>]*>(?:<div class="rot"[^>]*>[\s\S]*?<\/a><\/div>)+<\/div>/.exec(body.slice(body.indexOf('id="recognition"')));
    expect(block).not.toBeNull();
    const cards = [...block![0].matchAll(/<div class="rot"[^>]*>(<a\b[\s\S]*?<\/a>)<\/div>/g)].slice(0, 2).map(m => m[1]);
    expect(cards).toHaveLength(2);
    // Published features can share a caption, so each card is labelled.
    const label = (card: string, text: string) => card.replace(/(<span class="pc__m"[^>]*>)[^<]*/, `$1${text}`);
    const three = [label(cards[0], 'Entry one'), label(cards[0], 'Entry two'), label(cards[1], 'Entry three')];
    const list = [...three, ...three];
    const html = '<div class="credits credits--rotate" data-rotate>' + list.map((card, i) =>
      `<div class="rot" data-slot="${i % 2}" data-rot="${i < 2 ? 'on' : 'off'}"${i < 2 ? '' : ' inert'}>${card}</div>`).join('') + '</div>';
    body = body.replace(block![0], html);
    await route.fulfill({response, body});
  });
}

const visible = (page: import('@playwright/test').Page) =>
  page.locator('[data-rotate] > .rot[data-rot="on"] .pc__m').allTextContents();

test('the home pair rotates through every entry without moving the page', async ({page}) => {
  await page.clock.install();
  await threeEntries(page);
  await page.goto('/');
  const rotor = page.locator('[data-rotate]');
  await rotor.scrollIntoViewIfNeeded();
  const height = (await rotor.boundingBox())!.height;
  const seen = new Set<string>();
  for (let step = 0; step < 3; step++) {
    const pair = await visible(page);
    expect(pair).toHaveLength(2);
    pair.forEach(text => seen.add(text.trim()));
    await expect(page.locator('[data-rotate] > .rot:not([data-rot="on"])').first()).toHaveJSProperty('inert', true);
    await page.mouse.move(0, 0);
    // The first change comes 1.8s after the pair is in view, then every 4.5s.
    await page.clock.runFor(step === 0 ? 1900 : 4600);
    await page.clock.runFor(1800);
    expect((await rotor.boundingBox())!.height).toBeCloseTo(height, 0);
  }
  expect(seen.size).toBe(3);
});

test('the first change comes soon after the pair is in view, and it never stops', async ({page}) => {
  await page.clock.install();
  await threeEntries(page);
  await page.goto('/');
  await page.locator('[data-rotate]').scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const first = await visible(page);
  await page.clock.runFor(2000);
  expect(await visible(page)).not.toEqual(first);
  // Twelve more turns: it keeps rotating for as long as it is in view.
  let last = await visible(page);
  for (let i = 0; i < 12; i++) {
    await page.clock.runFor(4600);
    const now = await visible(page);
    expect(now).not.toEqual(last);
    last = now;
  }
});

/* A tapped card keeps focus, and gets it back when its reader closes. The
   pair once held for any focus inside it, so the first tap stopped it for
   good. Only keyboard focus holds it now. */
test('tapping a card does not stop the rotation', async ({page}) => {
  await page.clock.install();
  await threeEntries(page);
  await page.goto('/');
  await page.locator('[data-rotate]').scrollIntoViewIfNeeded();
  await page.locator('[data-rotate] > .rot[data-rot="on"] .pc').first().evaluate(el => (el as HTMLElement).focus({focusVisible: false} as FocusOptions));
  await page.mouse.move(0, 0);
  const before = await visible(page);
  await page.clock.runFor(2000 + 2600);
  expect(await visible(page)).not.toEqual(before);
});

test('keyboard focus holds the pair', async ({page}) => {
  await page.clock.install();
  await threeEntries(page);
  await page.goto('/');
  await page.locator('[data-rotate]').scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const link = page.locator('[data-rotate] > .rot[data-rot="on"] .pc').first();
  await link.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const before = await visible(page);
  await page.clock.runFor(15000);
  expect(await visible(page)).toEqual(before);
});

test('the pair holds while it is pointed at', async ({page}) => {
  await page.clock.install();
  await threeEntries(page);
  await page.goto('/');
  const rotor = page.locator('[data-rotate]');
  await rotor.scrollIntoViewIfNeeded();
  const before = await visible(page);
  await rotor.hover();
  await page.clock.runFor(15000);
  expect(await visible(page)).toEqual(before);
});

test('two or fewer entries never rotate', async ({page}) => {
  await page.goto('/');
  const sets = await page.locator('#recognition .rot').count();
  test.skip(sets > 2, 'Published content has more than two entries; the fixtures above cover rotation.');
  await expect(page.locator('[data-rotate]')).toHaveCount(0);
  await expect(page.locator('#recognition .rot[data-rot="on"]')).toHaveCount(sets);
});

/* An Instagram post shows only its media: Instagram reports its height and the
   box crops away the white 54px header and 154px footer. This loads the real
   Instagram embed, so it skips (not fails) if Instagram is unreachable. */
test('an Instagram post shows only its media, at its own height, with no inner scroll', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/recognition/');
  const href = await page.locator('#awards a[data-article]').first().getAttribute('href').catch(() => null);
  test.skip(!href, 'No award with a reader page is published.');
  await page.goto(href!);
  const box = page.locator('[data-ig-post]');
  test.skip(!(await box.count()), 'The published award does not embed an Instagram post.');
  await expect(box).toHaveAttribute('data-ready', '', {timeout: 20000}).catch(() => test.skip(true, 'Instagram did not respond.'));
  const frame = box.locator('iframe');
  await expect(frame).toHaveAttribute('scrolling', 'no');
  await expect.poll(() => frame.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  const {boxH, frameH, top, boxW} = await box.evaluate(el => {
    const f = el.querySelector('iframe') as HTMLIFrameElement;
    return {boxH: el.getBoundingClientRect().height, boxW: el.getBoundingClientRect().width, frameH: parseFloat(f.style.height), top: f.style.top};
  });
  expect(top).toBe('-54px');
  expect(boxH).toBeCloseTo(frameH - 208, 0);
  expect(boxH / boxW).toBeGreaterThan(.45);
  expect(boxH / boxW).toBeLessThan(1.45);
  await expect(box.locator('.ig-post__failed')).toBeHidden();
});
