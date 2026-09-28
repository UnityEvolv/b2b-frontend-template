import * as ImagePicker from 'expo-image-picker'

/**
 * A profile photo from the camera or the gallery (UO-91), cropped square by
 * the system's own editor before it leaves the phone. The server crops and
 * scales again; this only saves uploading what would be thrown away.
 */
export type PhotoSource = 'camera' | 'library'

export interface PickedPhoto {
  uri: string
  name: string
  type: string
  size?: number
}

export type PickOutcome =
  | { kind: 'picked'; photo: PickedPhoto }
  | { kind: 'cancelled' }
  /** The person said no; `settings` when only the system's settings can undo it. */
  | { kind: 'denied'; source: PhotoSource; settings: boolean }

/** Whether the camera would ask, or has already been refused for good. */
export async function cameraPermission(): Promise<'granted' | 'ask' | 'blocked'> {
  const current = await ImagePicker.getCameraPermissionsAsync()
  if (current.granted) return 'granted'
  return current.canAskAgain ? 'ask' : 'blocked'
}

/**
 * A photo from the camera or the gallery. Cropped square for a profile
 * photo; as taken otherwise.
 */
export async function pickPhoto(
  source: PhotoSource,
  { crop = true }: { crop?: boolean } = {},
): Promise<PickOutcome> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      return { kind: 'denied', source, settings: !permission.canAskAgain }
    }
  }
  // The gallery is the system photo picker, which needs no permission: the
  // person chooses one photo and the app sees only that one.
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    ...(crop ? { allowsEditing: true, aspect: [1, 1] as [number, number] } : {}),
    quality: 0.85,
  }
  let result: ImagePicker.ImagePickerResult
  try {
    result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)
  } catch {
    return { kind: 'denied', source, settings: true }
  }
  const asset = result.canceled ? undefined : result.assets[0]
  if (!asset) return { kind: 'cancelled' }
  const type = asset.mimeType ?? 'image/jpeg'
  return {
    kind: 'picked',
    photo: {
      uri: asset.uri,
      type,
      name: asset.fileName ?? `photo.${type.split('/')[1] ?? 'jpg'}`,
      ...(asset.fileSize ? { size: asset.fileSize } : {}),
    },
  }
}

/** The largest photo the service takes: five megabytes. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024

/** A file part as React Native's FormData takes one: by address, not by bytes. */
export function filePart(file: { uri: string; name: string; type: string }): Blob {
  return file as unknown as Blob
}
