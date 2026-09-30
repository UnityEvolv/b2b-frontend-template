import Feather from '@expo/vector-icons/Feather'

import { useColors } from './theme'

/**
 * Icons on the phone, by the names web uses with unitykit's Icon. unitykit
 * draws Lucide, which grew out of Feather; the same glyphs are here as a
 * font, so a name means the same picture on both. Never an emoji.
 */
const GLYPHS = {
  bell: 'bell',
  profile: 'user',
  back: 'chevron-left',
  forward: 'chevron-right',
  down: 'chevron-down',
  up: 'chevron-up',
  lock: 'lock',
  unlock: 'unlock',
  people: 'users',
  invite: 'user-plus',
  check: 'check',
  close: 'x',
  info: 'info',
  warn: 'alert-triangle',
  danger: 'alert-octagon',
  copy: 'copy',
  share: 'share-2',
  paste: 'clipboard',
  camera: 'video',
  image: 'image',
  file: 'file',
  link: 'link',
  search: 'search',
  signOut: 'log-out',
  settings: 'settings',
  shield: 'shield',
  key: 'key',
  building: 'briefcase',
  external: 'external-link',
  trash: 'trash-2',
  clock: 'clock',
  show: 'eye',
  hide: 'eye-off',
  more: 'more-horizontal',
} as const

export type IconName = keyof typeof GLYPHS

export function Icon({
  name,
  size = 20,
  color,
}: {
  name: IconName
  size?: number
  /** A role's colour; the text colour when absent. */
  color?: string
}) {
  const colors = useColors()
  const common = {
    size,
    color: color ?? colors.text,
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no' as const,
  }
  return <Feather name={GLYPHS[name]} {...common} />
}
