/**
 * The two themes' surfaces by role, for a platform without CSS.
 *
 * Web uses unitykit's token classes; React Native has no stylesheet to
 * reach them through, so the same roles are values here, mirroring
 * unitykit's `tokens.css` one for one. A screen names a role, never a
 * colour: primary for actions, secondary for the second voice (links, the
 * active speaker, unread mentions), and ok, warn, danger and info for
 * status.
 */
import type { Theme } from './index'

export interface Palette {
  /** The page behind everything. */
  background: string
  /** A card or a sheet on the page. */
  surface: string
  /** Something raised above a surface: a menu, a call bar. */
  raised: string
  text: string
  muted: string
  border: string
  /** Primary: actions. `accent` is kept as its older name. */
  accent: string
  onAccent: string
  secondary: string
  onSecondary: string
  danger: string
  onDanger: string
  ok: string
  warn: string
  info: string
  /** Text on an ok, warn or info fill. */
  onStatus: string
  /** The focus ring. */
  focus: string
}

export const PALETTE: Record<Theme, Palette> = {
  light: {
    background: '#FAF8FC',
    surface: '#FFFFFF',
    raised: '#FFFFFF',
    text: '#1B1A1F',
    muted: '#6B6577',
    border: '#E6E1EE',
    accent: '#7A3FD6',
    onAccent: '#FFFFFF',
    secondary: '#0C798A',
    onSecondary: '#FFFFFF',
    danger: '#BE4736',
    onDanger: '#FFFFFF',
    ok: '#297D4E',
    warn: '#966319',
    info: '#0C798A',
    onStatus: '#FFFFFF',
    focus: '#7A3FD666',
  },
  dark: {
    background: '#121212',
    surface: '#1C1B20',
    raised: '#26242C',
    text: '#FFFFFF',
    muted: '#A9A3B5',
    border: '#2E2C35',
    accent: '#C27FFF',
    onAccent: '#121212',
    secondary: '#25E0F8',
    onSecondary: '#121212',
    danger: '#F06A6A',
    onDanger: '#121212',
    ok: '#5CD68C',
    warn: '#F2B84B',
    info: '#25E0F8',
    onStatus: '#121212',
    focus: '#C27FFF66',
  },
}
