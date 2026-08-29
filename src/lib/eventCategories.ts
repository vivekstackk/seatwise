/**
 * The category vocabulary, shared by the buyer-facing filter, the
 * organizer form, and server-side validation. Kept in its own module
 * because "use server" files may only export async functions, so the
 * organizer actions can't export the list they validate against.
 */
export const EVENT_CATEGORIES = [
  "Music",
  "Comedy",
  "Theatre",
  "Sports",
  "Culture",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];
