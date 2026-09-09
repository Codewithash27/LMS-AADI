/** Time-based greeting helpers (Campus Axis pattern). */

export function getTimeGreeting(hour = new Date().getHours()): { text: string } {
  if (hour < 12) return { text: "Good morning" };
  if (hour < 17) return { text: "Good afternoon" };
  return { text: "Good evening" };
}

export function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "User";
  return trimmed.split(/\s+/)[0];
}
