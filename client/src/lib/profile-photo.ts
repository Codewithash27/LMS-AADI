/** Resolve stored profile photo path to a browser-usable URL. */
export function getProfilePhotoSrc(
  photo: string | null | undefined
): string | null {
  if (!photo) return null;
  if (
    photo.startsWith("http") ||
    photo.startsWith("data:") ||
    photo.startsWith("blob:") ||
    photo.startsWith("/")
  ) {
    return photo;
  }
  return `/uploads/${photo}`;
}
