import {test,expect} from '@playwright/test';
for(const width of [375,1440]) {
  test(`Press cards have equal space above and below at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:1000});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/press/');
    const gaps=await page.evaluate(()=>{
      const bottom=(selector:string)=>document.querySelector(selector)!.getBoundingClientRect().bottom;
      const top=(selector:string)=>document.querySelector(selector)!.getBoundingClientRect().top;
      return {above:top('.credits')-bottom('.index-head__s'),below:top('.onward')-bottom('.credits')};
    });
    expect(gaps.above).toBeGreaterThan(20);
    expect(Math.abs(gaps.above-gaps.below)).toBeLessThan(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
test('existing Press addresses redirect to readable reader URLs',async({request})=>{
  for(const [old,slug] of [['placeholder-dezeen','elle-decor-nelly-house'],['publication-architectural-digest-5-august-2026','architectural-digest-nelly-house']]) {
    const response=await request.get(`/press/${old}/`,{maxRedirects:0});
    expect(response.status()).toBe(301);
    expect(response.headers().location).toContain(`/press/${slug}/`);
    const destination=await request.get(`/press/${slug}/`);
    expect(destination.status()).toBe(200);
  }
});
test('one founder record supplies a name on Home and a designation on People',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#people .spread__r')).toHaveCount(0);
  const names=await page.locator('#people .spread__n').allTextContents();
  // The editorial honorific is the studio's choice; the names and order are the check.
  expect(names.map(n=>n.trim().replace(/^Ar\.\s+/,''))).toEqual(['Faizan Hussain','Thressia Paul']);
  await page.goto('/people/');
  for(const name of ['Faizan Hussain','Thressia Paul']) {
    const card=page.locator('.trow').filter({has:page.locator('.trow__n',{hasText:name})});
    await expect(card).toHaveCount(1);
    await expect(card.locator('.trow__p img')).toHaveCount(1);
    await expect(card.locator('.trow__r')).toHaveText('Principal Architect');
  }
});
