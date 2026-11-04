/**
 * The /profile card intro plays once per tab session, the same rule as the
 * scan on /. The flag used to be written to localStorage and never read
 * back, so the card replayed on every refresh. CardIntroScreen sets it when
 * the card starts; ReplayIntro reads it to show its button.
 */
const KEY = "intro-profile-seen";

export function profileIntroSeen(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function markProfileIntroSeen() {
  try {
    sessionStorage.setItem(KEY, "true");
    localStorage.removeItem(KEY); // the old per-browser flag
  } catch {}
}
