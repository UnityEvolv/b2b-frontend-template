/**
 * The CAPTCHA provider's addresses (UO-75), in one place: the widget script
 * the public forms load, the origins the security policy must allow for it,
 * and the policy pages the required notice links to. Swapping the provider
 * (Turnstile, say) changes this file and the backend's verifier, nothing else.
 *
 * These are a third party's fixed addresses, not the product's own hosts,
 * which is why they may be written down here rather than derived from the
 * base hostname.
 */

/** Where the widget script comes from. The site key is appended as `render=`. */
export const RECAPTCHA_SCRIPT_URL = 'https://www.google.com/recaptcha/api.js'

/** What the widget needs the browser to reach, by policy directive. */
export const RECAPTCHA_ORIGINS = {
  script: ['https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/'],
  frame: ['https://www.google.com/recaptcha/'],
  connect: ['https://www.google.com/recaptcha/'],
}

/** The pages the notice must link to when the widget's badge is hidden. */
export const RECAPTCHA_POLICY_URLS = {
  privacy: 'https://policies.google.com/privacy',
  terms: 'https://policies.google.com/terms',
}
