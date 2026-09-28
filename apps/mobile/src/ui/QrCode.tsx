import { PALETTE } from '@b2b-template/theme'
import { useMemo } from 'react'
import Svg, { Path, Rect } from 'react-native-svg'

import { qrShape, QUIET } from '../qr'

/**
 * A QR code for an authenticator app to scan. Always dark on light, in
 * either theme: an inverted code is one many scanners cannot read.
 */
export function QrCode({
  value,
  size = 220,
  label,
}: {
  value: string
  size?: number
  label: string
}) {
  const shape = useMemo(() => qrShape(value), [value])
  const side = shape.size + QUIET * 2
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${side} ${side}`}
      accessibilityLabel={label}
      accessibilityRole="image"
    >
      <Rect x={0} y={0} width={side} height={side} fill={PALETTE.light.surface} />
      <Path d={shape.path} fill={PALETTE.light.text} />
    </Svg>
  )
}
