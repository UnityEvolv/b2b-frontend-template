import type { SessionCookieStore } from '@b2b-template/client'
import { PRODUCT } from '@b2b-template/product-config'
import * as SecureStore from 'expo-secure-store'

/**
 * The session, kept in the platform keystore (UO-89): Android's Keystore,
 * iOS's Keychain. Only the session cookie the identity service rotates is
 * kept, never an access token, which lives in memory for its fifteen
 * minutes. It survives a restart and goes with a sign-out.
 */
// The keystore takes letters, digits, '.', '-' and '_' in a key.
const KEY = `${PRODUCT.storagePrefix}.session`

export const keystore: SessionCookieStore = {
  async read() {
    try {
      return await SecureStore.getItemAsync(KEY)
    } catch {
      // A keystore that cannot be read (a restored backup on a new device)
      // is a signed-out device, not a crash.
      return null
    }
  },
  async write(value) {
    if (value === null) await SecureStore.deleteItemAsync(KEY)
    else
      await SecureStore.setItemAsync(KEY, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      })
  },
}
