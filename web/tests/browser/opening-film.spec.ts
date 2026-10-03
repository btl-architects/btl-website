import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const clip = readFileSync(fileURLToPath(new URL('../fixtures/opening-clip.mp4', import.meta.url)));

async function films(page: import('@playwright/test').Page) {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.route('https://cdn.sanity.io/files/**', route => route.fulfill({status: 200, contentType: 'video/mp4', body: clip}));
}

// Build the requested number of clips independently of current client content.
async function sequence(page: import('@playwright/test').Page, total: number) {
  await page.route('http://127.0.0.1:8788/', async route => {
    const response = await route.fetch();
    let count = 0;
    const body = (await response.text()).replace(/<figure class="stage__f"[\s\S]*?<\/figure>/g, frame => {
      if (++count > 1) return '';
      return frame + Array.from({length: total - 1}, () => frame.replace('data-on="true"', 'data-on="false"')).join('');
    });
    expect(count).toBeGreaterThanOrEqual(1);
    await route.fulfill({response, body});
  });
}

test('opening films play their complete duration and the sequence restarts', async ({page}) => {
  await films(page);
  await sequence(page, 3);
  await page.goto('/');
  const frames = page.locator('.stage__f');
  expect(await frames.count()).toBeGreaterThan(1);
  const first = frames.first().locator('video');
  await expect(first).toHaveAttribute('data-playing', 'true');
  await expect(first).toHaveJSProperty('loop', false);
  // The old fixed 6.2-second rotation would cut this eight-second upload short.
  await expect.poll(() => first.evaluate(el => (el as HTMLVideoElement).currentTime), {timeout:12000}).toBeGreaterThan(6.3);
  await expect(frames.first()).toHaveAttribute('data-on', 'true');
  await expect(frames.nth(1)).toHaveAttribute('data-on', 'true', {timeout:5000});
  for (let index = 1; index < await frames.count(); index++) {
    const video = frames.nth(index).locator('video');
    await expect(video).toHaveAttribute('data-playing', 'true');
    await expect.poll(() => video.evaluate(el => (el as HTMLVideoElement).paused)).toBe(false);
    await expect(frames.nth((index + 1) % await frames.count())).toHaveAttribute('data-on', 'true', {timeout:12000});
  }
  await expect.poll(() => first.evaluate(el => (el as HTMLVideoElement).currentTime)).toBeLessThan(2);
});

test('a single uploaded film loops in place', async ({page}) => {
  await films(page);
  await sequence(page, 1);
  await page.goto('/');
  await expect(page.locator('.stage__f')).toHaveCount(1);
  const video = page.locator('.stage__f video');
  await expect(video).toHaveAttribute('data-playing', 'true');
  await expect(video).toHaveJSProperty('loop', true);
  await video.evaluate(el => {const film = el as HTMLVideoElement; film.currentTime = film.duration - .1;});
  await expect.poll(() => video.evaluate(el => (el as HTMLVideoElement).currentTime)).toBeLessThan(2);
  await expect(page.locator('.stage__f')).toHaveAttribute('data-on', 'true');
});

test('founders photograph has enough source detail for a Retina spread', async ({page}) => {
  await page.goto('/');
  const image = page.locator('#people .spread__media img');
  await image.scrollIntoViewIfNeeded();
  const pixels = await image.evaluate(el => ({width: Number(el.getAttribute('width')), height: Number(el.getAttribute('height'))}));
  expect(pixels.width).toBeGreaterThanOrEqual(2000);
  expect(pixels.height).toBeGreaterThanOrEqual(2000);
  await expect(image).toHaveAttribute('alt', /Faizan Hussain.*Thressia Paul/);
  const names = await page.locator('#people .spread__n').allTextContents();
  expect(names.map(name => name.trim())).toEqual(['Ar. Faizan Hussain','Ar. Thressia Paul']);
  // The camera-original crop ends above the visible feet, at 82% of its height.
  await expect(image).toHaveAttribute('src', /rect=371%2C1949%2C3898%2C3758/);
});
