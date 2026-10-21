/**
 * Browser flag recording that the white paper was opened by the first
 * Buy TTTI-T click. Stored per browser; later clicks skip the white paper.
 */
const WHITE_PAPER_SEEN_KEY = "ttti.whitePaperSeen";

/** True once this browser has been sent to the white paper. */
export function hasSeenWhitePaper(): boolean {
  try {
    return window.localStorage.getItem(WHITE_PAPER_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Records the flag (idempotent; storage errors are ignored). */
export function markWhitePaperSeen(): void {
  try {
    window.localStorage.setItem(WHITE_PAPER_SEEN_KEY, "1");
  } catch {
    // Storage unavailable (private mode): the white paper may open again.
  }
}
