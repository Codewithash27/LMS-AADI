import { getProfilePhotoSrc } from "@/lib/profile-photo";

export const AVATAR_PALETTE = ["#7C6CFF", "#43D9E8", "#D4FF3F", "#FF8A6B", "#F5B94A"] as const;

export function avatarColor(id: number) {
  return AVATAR_PALETTE[Math.abs(id) % AVATAR_PALETTE.length];
}

export function studentInitials(firstName?: string, lastName?: string) {
  return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() || "?";
}

export function studentSubline(username?: string, email?: string) {
  const handle = username?.trim();
  const mail = email?.trim();
  const parts: string[] = [];
  if (handle) {
    parts.push(handle.startsWith("@") ? handle : `@${handle}`);
  }
  if (mail && mail.toLowerCase() !== handle?.toLowerCase()) {
    parts.push(mail);
  }
  return parts.join(" · ");
}

export function statusDisplay(status?: string) {
  if (status === "inactive") return { label: "Inactive", dot: "#FF8FA6" };
  if (status === "pending") return { label: "Pending", dot: "#F7C766" };
  return { label: "Active", dot: "#3DDC97" };
}

export function normalizeStudentStatus(status?: string) {
  if (status === "inactive" || status === "pending") return status;
  return "active";
}

export function photoSrc(profilePhoto?: string | null) {
  return getProfilePhotoSrc(profilePhoto);
}

export const dash = "—";
