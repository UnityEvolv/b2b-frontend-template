/**
 * What the shell says in every web app and on the phone: sign-in, the account
 * pages, the second factor, invitations, errors, the theme and the menus.
 */
export const common = {
  appBadge: {
    admin: 'Admin',
    platform: 'Platform',
  },
  loading: 'Loading…',
  retry: 'Try again',
  continue: 'Continue',
  orgs: {
    label: 'Organization: {{name}}. Switch organization',
    heading: 'Your organizations',
    choose: 'Choose an organization',
    switchFailed: 'Could not switch. You may no longer belong to that organization.',
  },
  cancel: 'Cancel',
  roles: {
    owner: 'Owner',
    admin: 'Admin',
    billing_admin: 'Billing admin',
    user: 'Member',
    guest: 'Guest',
  },
  invite: {
    title: 'You are invited',
    memberOf: '{{org}} has invited you to join as {{role}}.',
    for: 'This invitation is for {{email}}.',
    name: 'Your name',
    nameHelp: 'How people will see you. Needed if you are new here.',
    accept: 'Accept the invitation',
    accepted: 'Invitation accepted.',
    checkInbox:
      'We have sent you an email to confirm your address. Follow it to set your password.',
    mismatch: 'You are signed in as {{current}}, but this invitation is for {{invited}}.',
    wrongIdentity: 'This invitation belongs to another address. Nothing was added to your account.',
    signOutAndContinue: 'Sign out and continue as the invited address',
    errors: {
      invalid: 'This invitation link is not valid.',
      used: 'This invitation has already been accepted. Sign in instead.',
      revoked: 'This invitation has been withdrawn.',
      expired: 'This invitation has expired. Ask to be invited again.',
      planLimit:
        'The organization is at its plan’s user limit. Ask an administrator; the invitation stays open.',
      unexpected: 'Something went wrong. Try again in a moment.',
    },
  },
  verify: {
    title: 'Confirm your email',
    done: 'Your address is confirmed. Sign in to continue.',
  },
  password: {
    setTitle: 'Choose a password',
    new: 'New password',
    confirm: 'Repeat it',
    save: 'Save password',
    requestNew: 'Ask for a new link',
    forgotTitle: 'Forgot your password',
    forgotHelp:
      'Enter your address. If it has an account, we will email a link to choose a new password.',
    sendLink: 'Email me a link',
    sent: 'If that address has an account, a link is on its way. It works once, for an hour.',
    rules: { length: 'At least 12 characters', match: 'Both entries match' },
    errors: {
      invalidLink: 'This link is not valid any more. Ask for a new one.',
      policy: 'Choose a longer password, and not your email address.',
      mismatch: 'The two entries do not match.',
      captcha: 'The bot check did not pass. Reload the page and try again.',
      unexpected: 'Something went wrong. Try again in a moment.',
    },
  },
  mfa: {
    setupTitle: 'Set up an authenticator',
    settingsTitle: 'Two-step sign-in',
    requiredIntro: 'Your organization requires an authenticator app. It takes a minute.',
    scan: 'Scan this code with your authenticator app.',
    qrAlt: 'QR code for your authenticator app',
    manual: 'Cannot scan? Enter this key instead',
    firstCode: 'Code from the app',
    firstCodeHelp: 'Six digits, to confirm the app is set up.',
    confirm: 'Confirm',
    codes: 'Recovery codes',
    codesOnce: 'These recovery codes are shown once. Each works one time if you lose your phone.',
    download: 'Download the codes',
    saved: 'I have saved these codes somewhere safe',
    enrolled: 'Your authenticator is set up. Sign in again to continue.',
    setUp: 'Set up an authenticator',
    regenerate: 'New recovery codes',
    regeneratePrompt: 'Enter a code from your app to replace your recovery codes.',
    turnOff: 'Turn off',
    turnOffPrompt: 'Enter a code from your app to turn two-step sign-in off.',
    status: {
      on: 'Two-step sign-in is on. {{left}} recovery codes left.',
      off: 'Two-step sign-in is off.',
      required: 'Your organization requires two-step sign-in.',
    },
    errors: {
      codeInvalid: 'That code is not right.',
      expired: 'That link has expired. Sign in again.',
      notEnrolled: 'No authenticator is set up.',
      alreadyEnrolled: 'An authenticator is already set up.',
      localOnly: 'Your organization’s sign-in handles your second step.',
      required: 'Your organization requires two-step sign-in, so it cannot be turned off.',
      unexpected: 'Something went wrong. Try again in a moment.',
    },
  },
  goHome: 'Go to the start page',
  signOut: 'Sign out',
  skipToContent: 'Skip to content',
  navigation: 'Navigation',
  userMenu: 'Account menu for {{name}}',
  profileLink: 'Your profile',
  notificationsLink: 'Notifications',
  theme: {
    label: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'Match my device',
    current: '(current)',
    saveFailed: 'Your theme could not be saved. It will apply on this device only.',
  },
  errors: {
    notFound: {
      title: 'Page not found',
      description: 'The address may be mistyped, or the page may have moved.',
    },
    forbidden: {
      title: 'You do not have access to this page',
      description: 'Ask an administrator in your organization if you need it.',
    },
    unexpected: {
      title: 'Something went wrong',
      description: 'The page hit an error it could not recover from. Trying again usually works.',
    },
  },
  unsupported: {
    title: 'This browser cannot run {{product}}',
    description: 'It is missing features this app needs: {{missing}}.',
    supported:
      'Use the current or previous version of Chrome, Edge, Firefox or Safari, with nothing blocking these features.',
    capability: {
      websocket: 'live updates (WebSockets)',
      storage: 'local storage',
      intl: 'date and number formatting',
    },
  },
  signIn: {
    title: 'Sign in',
    createOrganization: 'New to {{product}}? Create an organization',
    pending: 'Sign-in is being built. Until then, development sessions sign you in automatically.',
    email: 'Email address',
    emailHelp:
      'Your work address. If your organization has its own sign-in, you will be sent there next.',
    continue: 'Continue',
    // The server ended the session while the app was open: revoked from
    // another device, by an administrator, or it expired. Neutral on purpose.
    signedOut: 'You were signed out. Sign in again to continue.',
    orgs: {
      label: 'Organization: {{name}}. Switch organization',
      heading: 'Your organizations',
      choose: 'Choose an organization',
      switchFailed: 'Could not switch. You may no longer belong to that organization.',
    },
    as: 'Signing in as {{email}}',
    password: 'Password',
    changeEmail: 'Use another address',
    forgot: 'Forgot your password?',
    mfa: {
      prompt: 'Enter the code from your authenticator app.',
      code: 'Code',
      help: 'Six digits from the app, or one of your recovery codes.',
      enrollRequired:
        'Your organization requires an authenticator app. Set one up, then sign in again.',
      setUp: 'Set up an authenticator',
    },
    // The desktop app signs in through the person's own browser.
    browser: {
      body: 'Your organization’s sign-in has opened in your browser. Finish there and you will come straight back here.',
      again: 'Start again',
    },
    errors: {
      credentials: 'That email and password do not match.',
      unverified: 'Verify your email address first. Check your inbox, or ask for the link again.',
      noMembership: 'You do not belong to any organization. Ask for an invitation.',
      throttled: 'Too many failed attempts. Try again in a few minutes.',
      codeInvalid: 'That code is not right.',
      providerRefused: 'Your organization’s sign-in did not go through. Try again.',
      attemptExpired: 'That sign-in took too long. Start again.',
      inactive: 'Your account in this organization has been deactivated.',
      planLimit: 'Your organization is at its plan’s user limit. Ask an administrator.',
      notAdmin:
        'This app is for administrators. Your account is not an administrator of any organization.',
      notStaff:
        'This app is for platform staff. Sign in to your organization in the {{product}} app instead.',
      orgSuspended: 'Your organization is suspended. Contact its owner.',
      orgClosing:
        'Your organization is closing and will be deleted 30 days after it was closed. Until then its Owner can reopen it from the link in the email sent when it closed.',
      unexpected: 'Sign-in failed. Try again in a moment.',
    },
  },
  // The notice reCAPTCHA's terms require when its badge is hidden.
  captcha: {
    notice: 'This site is protected by reCAPTCHA and the Google',
    privacy: 'Privacy Policy',
    and: 'and',
    terms: 'Terms of Service',
    apply: ' apply.',
  },
} as const
