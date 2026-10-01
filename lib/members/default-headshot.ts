/** Shown wherever a person has not uploaded their own headshot (companies keep initials). */
export const DEFAULT_HEADSHOT = '/assets/default-headshot.svg';
/** Administrators without a photo show the Physical I/O mark instead. */
export const ADMIN_HEADSHOT = '/assets/admin-headshot.svg';
/** The photo to show for a person: their own, else the admin or default placeholder. */
export function headshot(photoUrl: string | null | undefined, isAdmin = false) { return photoUrl || (isAdmin ? ADMIN_HEADSHOT : DEFAULT_HEADSHOT); }
