import type { Env } from './config'

/**
 * The build's `EXPO_PUBLIC_*` values, each named in full so the bundler
 * inlines it. A service added to the contracts needs a line here to have
 * its own address on a laptop; deployed, the gateway covers it anyway.
 */
export const env: Env = {
  EXPO_PUBLIC_APP_SCHEME: process.env.EXPO_PUBLIC_APP_SCHEME,
  EXPO_PUBLIC_API_ORIGIN: process.env.EXPO_PUBLIC_API_ORIGIN,
  EXPO_PUBLIC_API_ORIGIN_AUDIT: process.env.EXPO_PUBLIC_API_ORIGIN_AUDIT,
  EXPO_PUBLIC_API_ORIGIN_AUTHORIZATION: process.env.EXPO_PUBLIC_API_ORIGIN_AUTHORIZATION,
  EXPO_PUBLIC_API_ORIGIN_BILLING: process.env.EXPO_PUBLIC_API_ORIGIN_BILLING,
  EXPO_PUBLIC_API_ORIGIN_IDENTITY: process.env.EXPO_PUBLIC_API_ORIGIN_IDENTITY,
  EXPO_PUBLIC_API_ORIGIN_NOTIFICATION: process.env.EXPO_PUBLIC_API_ORIGIN_NOTIFICATION,
  EXPO_PUBLIC_API_ORIGIN_ORGANIZATION: process.env.EXPO_PUBLIC_API_ORIGIN_ORGANIZATION,
  EXPO_PUBLIC_API_ORIGIN_USER: process.env.EXPO_PUBLIC_API_ORIGIN_USER,
}
