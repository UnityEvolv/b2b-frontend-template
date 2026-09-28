import { describe, expect, it } from 'vitest'

import { initialStacks, pop, push, replace } from './routes'

describe('the screen stacks', () => {
  it('pushes, replaces and pops within one tab, keeping its first screen', () => {
    let stacks = initialStacks()
    stacks = push(stacks, 'you', { name: 'profile' })
    expect(stacks.you).toHaveLength(2)
    stacks = replace(stacks, 'you', { name: 'sessions' })
    expect(stacks.you[1]).toEqual({ name: 'sessions' })
    stacks = pop(pop(stacks, 'you'), 'you')
    expect(stacks.you).toEqual([{ name: 'you' }])
    expect(stacks.home).toEqual([{ name: 'notifications' }])
  })
})
