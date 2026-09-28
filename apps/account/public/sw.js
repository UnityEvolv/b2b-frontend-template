/* global self, URL */
// The service worker for web push. It does one thing: show a push
// the notification service sent, and open the app where it points when the
// person clicks it. It caches nothing.

self.addEventListener('push', (event) => {
  let push = {}
  try {
    push = event.data ? event.data.json() : {}
  } catch {
    return
  }
  // A lapsed push is not shown, even if a vendor held it past its time.
  if (push.expires_at && Date.parse(push.expires_at) < Date.now()) return
  event.waitUntil(
    self.registration.showNotification(push.title || 'Notification', {
      body: push.body || '',
      tag: push.collapse || undefined,
      renotify: Boolean(push.collapse),
      data: { link: typeof push.link === 'string' && push.link.startsWith('/') ? push.link : '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = (event.notification.data && event.notification.data.link) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin && 'focus' in w) {
          w.navigate(link)
          return w.focus()
        }
      }
      return self.clients.openWindow(link)
    }),
  )
})
