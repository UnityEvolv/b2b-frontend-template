// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Brand } from './brand'

// Another product's config: the brand shows whatever the config says.
vi.mock('@b2b-template/product-config', () => ({
  PRODUCT: { productName: 'Acme Portal', wordmark: ['Acme ', 'Portal'] },
}))
vi.mock('@b2b-template/product-config/logo.svg', () => ({ default: '/assets/acme-logo.svg' }))

afterEach(cleanup)

describe('the brand', () => {
  it('names the product from the config, once, and shows its logo and wordmark', () => {
    const { container } = render(<Brand />)
    const brand = screen.getByRole('img', { name: 'Acme Portal' })
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/assets/acme-logo.svg')
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('')
    const pieces = [...brand.querySelectorAll(':scope > span > span')].map(
      (span) => span.textContent,
    )
    expect(pieces).toEqual(['Acme ', 'Portal'])
    expect(brand.querySelector(':scope > span > span')).toHaveClass('text-secondary')
    expect(brand.querySelector(':scope > span > span + span')).toHaveClass('text-primary')
  })

  it('is a link named for the product when given somewhere to go', () => {
    render(<Brand href="/" />)
    expect(screen.getByRole('link', { name: 'Acme Portal' })).toHaveAttribute('href', '/')
  })

  it('can show just the logo', () => {
    const { container } = render(<Brand logoOnly size="lg" />)
    expect(screen.getByRole('img', { name: 'Acme Portal' })).not.toHaveTextContent('Acme')
    expect(container.querySelector('img')).toHaveStyle({ height: '40px' })
  })
})
