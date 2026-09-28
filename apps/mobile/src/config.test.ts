import { describe, expect, it } from 'vitest'

import { configured, origin, readConfig } from './config'

describe('the build configuration', () => {
  it('reads the gateway and per-service ports', () => {
    const config = readConfig(
      {
        EXPO_PUBLIC_API_ORIGIN: 'https://api.example.test/',
        EXPO_PUBLIC_API_ORIGIN_IDENTITY: 'http://192.168.1.20:8093',
      },
      ['identity', 'user'],
    )
    expect(config).toEqual({
      apiOrigin: 'https://api.example.test',
      serviceOrigin: { identity: 'http://192.168.1.20:8093' },
    })
    expect(configured(config)).toBe(true)
  })

  it('treats blanks and non-addresses as not configured', () => {
    expect(origin(' ')).toBeUndefined()
    expect(origin('not a url')).toBeUndefined()
    const config = readConfig({ EXPO_PUBLIC_API_ORIGIN: '' }, ['identity'])
    expect(configured(config)).toBe(false)
  })
})
