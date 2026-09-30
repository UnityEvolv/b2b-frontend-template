import { PRODUCT } from '@b2b-template/product-config'
import logo from '@b2b-template/product-config/logo.svg'

export type BrandSize = 'sm' | 'md' | 'lg'

export interface BrandProps {
  /** Wraps the brand in a link. Without it, it renders as a labelled image. */
  href?: string
  /** Logo height: `sm` 24px, `md` 30px, `lg` 40px. The wordmark scales with it. */
  size?: BrandSize
  /** Just the logo, for collapsed sidebars and tight headers. */
  logoOnly?: boolean
  className?: string
}

const SIZES: Record<BrandSize, { logo: number; text: string }> = {
  sm: { logo: 24, text: 'text-base' },
  md: { logo: 30, text: 'text-xl' },
  lg: { logo: 40, text: 'text-3xl' },
}

/** The wordmark's pieces take these in turn. */
const TONES = ['text-secondary', 'text-primary']

/**
 * The product's identity, from the product config: its logo, then its
 * wordmark in the theme's two tones.
 *
 * The link or span carries the product name as its accessible name, and the
 * logo and wordmark are hidden, so a screen reader announces the name once
 * rather than the pieces of the wordmark. The tones come from the theme, so
 * light and dark follow without this component knowing either exists.
 */
export function Brand({ href, size = 'md', logoOnly = false, className }: BrandProps) {
  const { logo: height, text } = SIZES[size]
  const content = (
    <>
      <img src={logo} alt="" aria-hidden="true" className="w-auto shrink-0" style={{ height }} />
      {!logoOnly && (
        <span aria-hidden="true" className={`${text} font-semibold tracking-tight leading-none`}>
          {PRODUCT.wordmark.map((piece, index) => (
            <span key={index} className={TONES[index % TONES.length]}>
              {piece}
            </span>
          ))}
        </span>
      )}
    </>
  )
  const props = {
    className: ['inline-flex items-center gap-2 whitespace-pre no-underline', className]
      .filter(Boolean)
      .join(' '),
    'aria-label': PRODUCT.productName,
  }
  return href ? (
    <a href={href} {...props}>
      {content}
    </a>
  ) : (
    <span role="img" {...props}>
      {content}
    </span>
  )
}
