import Feather from '@expo/vector-icons/Feather'
import Ionicons from '@expo/vector-icons/Ionicons'

import { useColors } from './theme'

/**
 * Icons on the phone, by the names web uses with unitykit's Icon. unitykit
 * draws Lucide, which grew out of Feather; the same glyphs are here as a
 * font, so a name means the same picture on both. Never an emoji.
 */
const GLYPHS = {
  office: 'grid',
  bell: 'bell',
  chat: 'message-circle',
  profile: 'user',
  back: 'chevron-left',
  forward: 'chevron-right',
  down: 'chevron-down',
  up: 'chevron-up',
  lock: 'lock',
  unlock: 'unlock',
  knock: 'bell',
  reception: 'home',
  break: 'coffee',
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
  mic: 'mic',
  micOff: 'mic-off',
  camera: 'video',
  cameraOff: 'video-off',
  flip: 'refresh-cw',
  speaker: 'volume-2',
  earpiece: 'phone',
  leave: 'phone-off',
  screen: 'monitor',
  send: 'send',
  attach: 'paperclip',
  image: 'image',
  file: 'file',
  bold: 'bold',
  italic: 'italic',
  list: 'list',
  link: 'link',
  code: 'code',
  at: 'at-sign',
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
  hash: 'hash',
  reply: 'corner-up-left',
  more: 'more-horizontal',
  phone: 'phone-call',
} as const

/**
 * The glyphs Feather lacks, from Ionicons: a raised hand is one of
 * unitykit's own icons, and Feather has none.
 */
const IONICONS = {
  hand: 'hand-left-outline',
} as const

export type IconName = keyof typeof GLYPHS | keyof typeof IONICONS

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
  return name in IONICONS ? (
    <Ionicons name={IONICONS[name as keyof typeof IONICONS]} {...common} />
  ) : (
    <Feather name={GLYPHS[name as keyof typeof GLYPHS]} {...common} />
  )
}
