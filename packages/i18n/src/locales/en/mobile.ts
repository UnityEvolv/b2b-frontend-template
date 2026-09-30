/**
 * What only the phone says. It reuses `common` and `account` for the rest.
 */
export const mobile = {
  title: '{{product}}',
  notConfigured: 'This build has no API address. Set EXPO_PUBLIC_API_ORIGIN and build again.',
  sessionError: 'Your session could not be loaded. Check your connection and try again.',
  starting: 'Starting {{product}}',
  back: 'Back',
  tabs: {
    label: 'Sections',
    home: 'Notifications',
    you: 'You',
  },
  notifications: {
    failed: 'Your notifications could not be loaded.',
  },
  signIn: {
    intro: 'Sign in with your work address, or the address you were invited with.',
    provider:
      'Your organization has its own sign-in. Your browser opens next; you come back here when it is done.',
    opening: 'Opening your organization’s sign-in…',
    cancelled: 'Sign-in was cancelled. Try again when you are ready.',
    signingIn: 'Signing in…',
  },
  orgs: {
    title: 'Choose an organization',
    intro: 'You belong to more than one organization. Choose where to start; you can switch later.',
    loading: 'Loading your organizations',
    none: 'You do not belong to any organization. Ask for an invitation.',
    failed: 'Could not open that organization. You may no longer belong to it.',
    role: 'Your role: {{role}}',
    here: 'Organization',
    current: 'Current',
    switchHint: 'Switches to this organization. The app reloads there.',
  },
  leave: {
    title: 'Leave this organization',
    intro:
      'You lose access to everything in it. Your other organizations are not affected. Coming back takes a new invitation.',
    owner:
      'You are an Owner. Transfer ownership to someone else in the admin app before you leave.',
    last: 'This is your only organization. Leaving it signs you out.',
    button: 'Leave {{name}}',
    confirmTitle: 'Leave {{name}}?',
    confirmBody: 'You will need a new invitation to come back.',
    confirm: 'Leave',
    failed: 'You could not leave the organization. Try again in a moment.',
    leftLast:
      'You have left your last organization, so you are signed out. Your account stays; an invitation brings you back.',
  },
  you: {
    title: 'You',
    org: 'Organization',
    signOut: 'Sign out',
    signOutHint: 'Signs you out on this phone only.',
    securityHelp: 'An authenticator app, and your recovery codes',
    profileHelp: 'Photo, name, time zone and working hours',
    sessionsHelp: 'Your devices, and signing out of the others',
    orgHelp: 'Switch organization, or leave this one',
  },
  profile: {
    takePhoto: 'Take a photo',
    choosePhoto: 'Choose a photo',
    photoSaved: 'Photo updated.',
    tooLarge: 'That photo is larger than 5 MB. Choose a smaller one.',
    cameraWhy:
      '{{product}} uses the camera only while you take this photo. Your phone asks for permission next.',
    cameraDenied:
      '{{product}} may not use the camera. Choose a photo from your gallery instead, or allow the camera in Settings.',
    libraryDenied: 'Your photos could not be opened. Allow access in Settings and try again.',
    openSettings: 'Open Settings',
    zoneSearch: 'Type a city, like London',
    zoneInvalid: 'That is not a time zone. Use a name like Europe/London.',
    useDevice: 'Use this phone’s zone ({{zone}})',
    timeHint: 'HH:MM, 24-hour',
  },
  sessions: {
    failed: 'Your sessions could not be loaded.',
    thisPhone: 'This phone',
    lastSeen: 'Last seen {{when}}',
    onlyThis: 'You are signed in on this phone only.',
  },
  mfa: {
    samePhone:
      'Is the authenticator app on this phone? Open the link in it; there is nothing to scan.',
    openApp: 'Open in the authenticator app',
    noApp:
      'No app on this phone opened the link. Install an authenticator, or scan the code with another phone.',
    copySecret: 'Copy the key',
    copied: 'Copied.',
    copyCodes: 'Copy the codes',
    shareCodes: 'Share the codes',
    codesFile: '{{product}} recovery codes',
    paste: 'Paste the code',
  },
  invite: {
    checking: 'Checking the invitation',
    verifying: 'Confirming your address',
    linkOpensHere: 'The link in that email opens here, on this phone.',
    acceptedSignIn: 'Invitation accepted. Sign in to continue.',
  },
  password: {
    show: 'Show the password',
    hide: 'Hide the password',
    setDone: 'Your password is set. Sign in with it.',
  },
} as const
