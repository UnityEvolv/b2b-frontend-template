/**
 * Guests invited to a room (UO-110, UO-116): the choices web and the phone
 * offer, and who is offered them. The office service decides each invite
 * again; this only decides what to show.
 */

/** How long a guest may come back for, in hours: the choices offered. */
export const GUEST_WINDOWS = [2, 24, 72, 168, 720] as const
export type GuestWindow = (typeof GUEST_WINDOWS)[number]

/** A week, unless the person chooses otherwise. */
export const DEFAULT_GUEST_WINDOW: GuestWindow = 168

/**
 * Whether to offer inviting a guest to a room: anyone but a guest, into a
 * working or meeting room they are in. Reception and the break room are
 * open to every guest already.
 */
export function canInviteGuest(role: string, roomType: string, inside: boolean): boolean {
  return inside && role !== 'guest' && (roomType === 'workspace' || roomType === 'meeting')
}

/** An invite that can still be extended or withdrawn. */
export function grantIsOpen(status: string): boolean {
  return status !== 'revoked'
}
