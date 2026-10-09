/* The oldest browsers the site must work in, stated once.
 *
 * Vite 8 minifies CSS with Lightning CSS. Without targets it assumes current
 * browsers and deletes "redundant" fallbacks: `min-height: 100vh` written before
 * `min-height: 100dvh` never reached the published page, so a browser without
 * the small/dynamic viewport units (svh, dvh) got no height at all. That is
 * what shortened the Home opening in Android in-app browsers, which run the
 * phone's System WebView and can lag Chrome by years.
 *
 * Chrome/WebView 90 and Safari 14 (iOS 14) cover those WebViews and older
 * iPhones; both predate svh/dvh, so every fallback is kept. */
export const lightningTargets = {
  chrome: 90 << 16,
  safari: 14 << 16,
  ios_saf: 14 << 16,
  firefox: 90 << 16,
  samsung: 15 << 16,
};
export const esbuildCssTarget = ['chrome90', 'safari14', 'ios14', 'firefox90'];
