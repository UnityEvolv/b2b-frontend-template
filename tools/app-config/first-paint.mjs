/**
 * The first-paint theme script, apart from the Vite config so a browser test can
 * import it without pulling in the bundler.
 */

/** Must match `THEME_CACHE_KEY` and `DARK_QUERY` in `@b2b-template/ui-web`. A test holds them together. */
export const THEME_CACHE_KEY = 'unityofis:theme'
export const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Sets `data-theme` before anything renders, so the first frame is already in
 * the cached theme and a reload never flashes light at somebody who chose dark.
 * Tiny and dependency-free on purpose: it runs before the app has loaded.
 */
export const FIRST_PAINT_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  THEME_CACHE_KEY,
)});var d=p==='dark'||(p!=='light'&&matchMedia(${JSON.stringify(
  DARK_QUERY,
)}).matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}})()`
