// Legacy placeholder kept to avoid import-path breakage if old code references this module.
// Active auth/session flow now uses Supabase in-memory session (no localStorage usage).

export function getStoredUserId(): string {
  return "";
}

export function setStoredUser(_userId: string, _email: string): void {
  // no-op
}

export function getStoredUserEmail(): string {
  return "";
}
