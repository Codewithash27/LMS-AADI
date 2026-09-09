/** Resolve stored course thumbnail path to a browser-usable URL. */
export function getCourseThumbnailSrc(
  thumbnail: string | null | undefined
): string | null {
  if (!thumbnail) return null;
  if (
    thumbnail.startsWith("http") ||
    thumbnail.startsWith("data:") ||
    thumbnail.startsWith("blob:") ||
    thumbnail.startsWith("/")
  ) {
    return thumbnail;
  }
  return `/uploads/${thumbnail}`;
}
