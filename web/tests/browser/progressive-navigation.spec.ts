import {test,expect} from '@playwright/test';

test.describe('navigation without JavaScript',()=>{
  // Exercise native destinations separately from cross-document animation:
  // Chromium automation's action polling can retain the outgoing context
  // during a no-script view transition. Enhanced motion has its own journeys.
  test.use({javaScriptEnabled:false,reducedMotion:'reduce'});
  for(const width of [390,820,1440]) test(`core routes stay reachable at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto('/people/');
    const header=page.locator('.header');
    expect(await header.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
    const primary=width<768 ? page.locator('.no-script-menu nav') : page.locator('.header__inner > nav');
    if(width<768) {
      await expect(page.locator('.burger')).toBeHidden();
      const summary=page.locator('.no-script-menu summary');
      await summary.focus();await page.keyboard.press('Enter');
    }
    const links=primary.getByRole('link');
    await expect(links).toHaveCount(6);
    for(const link of await links.all()) await expect(link).toBeVisible();
    await expect(primary.getByRole('link',{name:'People',exact:true})).toHaveAttribute('aria-current','page');
    await primary.getByRole('link',{name:'Projects',exact:true}).click();
    await expect(page).toHaveURL(/\/projects\/$/);
    await page.locator('[data-card="nelly-house"] [data-project]').click();
    await expect(page).toHaveURL(/\/projects\/nelly-house\/$/);
    await expect(page.getByRole('heading',{level:1})).toContainText('Nelly House');
    await page.goto('/press/');
    const article=page.locator('a.pc').first();
    await expect(article).toBeVisible();
    const destination=await article.getAttribute('href');
    expect(destination).toBeTruthy();
    // Published external articles retain their ordinary anchor destination;
    // the labelled local reader fixture verifies the managed route fallback.
    await page.goto('/__reader-demo/');
    await page.locator('a[data-article]').first().click();
    await expect(page).toHaveURL(/\/press\/reader-fixture\/$/);
    await expect(page.getByRole('heading',{name:'A quiet place to read'})).toBeVisible();
    await page.goto('/contact/');
    await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
});
