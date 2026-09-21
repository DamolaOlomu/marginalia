export const CHANGE_EVENT = "marginalia:changed";

/** Tells every mounted list (margin chips, library, chapter dots) to reload. */
export function announceChange(): void {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
