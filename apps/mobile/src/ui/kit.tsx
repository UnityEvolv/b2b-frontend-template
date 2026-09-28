import { initials } from '@b2b-template/core'
import { useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Icon, type IconName } from './Icon'
import { useColors } from './theme'

/**
 * The phone's few building blocks, drawn from the palette's roles. What web
 * gets from unitykit's components, a screen here gets from these: a button
 * has a visible label and a disabled state with a reason, a field has a
 * label and an error, and nothing chooses its own colour.
 */

export function Screen({
  title,
  onBack,
  backLabel,
  actions,
  scroll = true,
  children,
  footer,
}: {
  title?: string
  onBack?: () => void
  backLabel?: string
  actions?: ReactNode
  scroll?: boolean
  children: ReactNode
  footer?: ReactNode
}) {
  const colors = useColors()
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1 }}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { flex: 1 }]}>{children}</View>
  )
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      {title !== undefined || onBack ? (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              hitSlop={12}
              style={styles.headerButton}
            >
              <Icon name="back" size={24} />
            </Pressable>
          ) : null}
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            accessibilityRole="header"
            numberOfLines={1}
          >
            {title}
          </Text>
          <View style={styles.headerActions}>{actions}</View>
        </View>
      ) : null}
      {body}
      {footer}
    </SafeAreaView>
  )
}

export function Title({ children }: { children: ReactNode }) {
  const colors = useColors()
  return (
    <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
      {children}
    </Text>
  )
}

export function Body({
  children,
  muted,
  center,
  style,
}: {
  children: ReactNode
  muted?: boolean
  center?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const colors = useColors()
  return (
    <Text
      style={[
        styles.body,
        { color: muted ? colors.muted : colors.text },
        center ? { textAlign: 'center' } : null,
        style as never,
      ]}
    >
      {children}
    </Text>
  )
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  const colors = useColors()
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {title ? (
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  busy,
  icon,
  accessibilityHint,
  compact,
}: {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  disabled?: boolean
  busy?: boolean
  icon?: IconName
  /** Why it is disabled, read out; shown by the screen beside it. */
  accessibilityHint?: string
  compact?: boolean
}) {
  const colors = useColors()
  const fill =
    variant === 'primary'
      ? colors.accent
      : variant === 'danger'
        ? colors.danger
        : variant === 'secondary'
          ? colors.surface
          : 'transparent'
  const ink =
    variant === 'primary'
      ? colors.onAccent
      : variant === 'danger'
        ? colors.onDanger
        : variant === 'secondary'
          ? colors.text
          : colors.accent
  const off = Boolean(disabled || busy)
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy: Boolean(busy) }}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      style={({ pressed }) => [
        compact ? styles.buttonCompact : styles.button,
        {
          backgroundColor: fill,
          borderColor: variant === 'secondary' ? colors.border : fill,
          opacity: off ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {busy ? <ActivityIndicator color={ink} /> : icon ? <Icon name={icon} color={ink} /> : null}
      <Text style={[styles.buttonLabel, { color: ink }]}>{label}</Text>
    </Pressable>
  )
}

export function IconButton({
  icon,
  label,
  onPress,
  disabled,
  active,
  tone = 'default',
  size = 48,
}: {
  icon: IconName
  label: string
  onPress: () => void
  disabled?: boolean
  active?: boolean
  tone?: 'default' | 'danger'
  size?: number
}) {
  const colors = useColors()
  const fill = tone === 'danger' ? colors.danger : active ? colors.accent : colors.raised
  const ink = tone === 'danger' ? colors.onDanger : active ? colors.onAccent : colors.text
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(active) }}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: fill,
          borderWidth: 1,
          borderColor: tone === 'danger' ? fill : colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Icon name={icon} color={ink} size={size * 0.45} />
    </Pressable>
  )
}

export function Field({
  label,
  help,
  error,
  trailing,
  style,
  ...input
}: TextInputProps & {
  label: string
  help?: string
  error?: string | null
  trailing?: ReactNode
}) {
  const colors = useColors()
  const [focused, setFocused] = useState(false)
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.fieldRow}>
        <TextInput
          accessibilityLabel={label}
          {...(help ? { accessibilityHint: help } : {})}
          placeholderTextColor={colors.muted}
          {...input}
          onFocus={(e) => {
            setFocused(true)
            input.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            input.onBlur?.(e)
          }}
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: error ? colors.danger : focused ? colors.accent : colors.border,
            },
            style,
          ]}
        />
        {trailing}
      </View>
      {error ? (
        <Text style={[styles.help, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : help ? (
        <Text style={[styles.help, { color: colors.muted }]}>{help}</Text>
      ) : null}
    </View>
  )
}

export type BannerTone = 'ok' | 'warn' | 'danger' | 'info'

const BANNER_ICONS: Record<BannerTone, IconName> = {
  ok: 'check',
  warn: 'warn',
  danger: 'danger',
  info: 'info',
}

/** A message with its meaning in an icon and the words, never colour alone. */
export function Banner({ tone, children }: { tone: BannerTone; children: ReactNode }) {
  const colors = useColors()
  const edge = colors[tone]
  return (
    <View
      accessibilityLiveRegion={tone === 'danger' || tone === 'warn' ? 'assertive' : 'polite'}
      style={[styles.banner, { borderColor: edge, backgroundColor: colors.surface }]}
    >
      <Icon name={BANNER_ICONS[tone]} color={edge} />
      <Text style={[styles.body, { color: colors.text, flex: 1 }]}>{children}</Text>
    </View>
  )
}

export function Loading({ label }: { label: string }) {
  const colors = useColors()
  return (
    <View style={styles.loading} accessibilityLabel={label} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={[styles.body, { color: colors.muted }]}>{label}</Text>
    </View>
  )
}

export function Row({
  title,
  subtitle,
  onPress,
  leading,
  trailing,
  disabled,
  accessibilityLabel,
  accessibilityHint,
}: {
  title: string
  subtitle?: string | null
  onPress?: () => void
  leading?: ReactNode
  trailing?: ReactNode
  disabled?: boolean
  accessibilityLabel?: string
  accessibilityHint?: string
}) {
  const colors = useColors()
  const content = (
    <>
      {leading}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: colors.muted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  )
  if (!onPress) {
    return <View style={[styles.row, { borderBottomColor: colors.border }]}>{content}</View>
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: Boolean(disabled) }}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
      ]}
    >
      {content}
    </Pressable>
  )
}

export function Badge({
  label,
  tone = 'muted',
}: {
  label: string
  tone?: 'muted' | 'accent' | 'secondary' | 'danger' | 'ok' | 'warn'
}) {
  const colors = useColors()
  const fill =
    tone === 'accent'
      ? colors.accent
      : tone === 'secondary'
        ? colors.secondary
        : tone === 'danger'
          ? colors.danger
          : tone === 'ok'
            ? colors.ok
            : tone === 'warn'
              ? colors.warn
              : colors.border
  const ink =
    tone === 'accent'
      ? colors.onAccent
      : tone === 'secondary'
        ? colors.onSecondary
        : tone === 'danger'
          ? colors.onDanger
          : tone === 'muted'
            ? colors.text
            : colors.onStatus
  return (
    <View style={[styles.badge, { backgroundColor: fill }]}>
      <Text style={[styles.badgeLabel, { color: ink }]}>{label}</Text>
    </View>
  )
}

export function Avatar({
  name,
  uri,
  size = 40,
}: {
  name: string
  uri?: string | null
  size?: number
}) {
  const colors = useColors()
  const round = { width: size, height: size, borderRadius: size / 2 }
  if (uri) {
    return <Image source={{ uri }} style={round} accessibilityIgnoresInvertColors />
  }
  return (
    <View
      style={[
        round,
        { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
      ]}
      importantForAccessibility="no"
    >
      <Text style={{ color: colors.onAccent, fontWeight: '600', fontSize: size * 0.4 }}>
        {initials({ displayName: name, email: '' })}
      </Text>
    </View>
  )
}

/** A choice that is on or off: a day, a theme. Its state is read out, not only coloured. */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  const colors = useColors()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {selected ? <Icon name="check" size={16} color={colors.onAccent} /> : null}
      <Text style={{ color: selected ? colors.onAccent : colors.text, fontWeight: '500' }}>
        {label}
      </Text>
    </Pressable>
  )
}

export function Divider() {
  const colors = useColors()
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
}

export const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22 },
  section: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '600' },
  button: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonCompact: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  field: { gap: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 15, fontWeight: '500' },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  help: { fontSize: 14, lineHeight: 20 },
  banner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 12,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSubtitle: { fontSize: 14, marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeLabel: { fontSize: 12, fontWeight: '600' },
})
