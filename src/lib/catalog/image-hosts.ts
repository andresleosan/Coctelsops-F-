export const CATALOG_IMAGE_HOSTS = [
  "placehold.co",
  "images.unsplash.com",
  "picsum.photos",
] as const;

export function isAllowedCatalogImage(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;

  try {
    const url = new URL(value);
    const hasExplicitPort = /:\d+(?:[/?#]|$)/.test(value.slice(value.indexOf("://") + 3));
    return url.protocol === "https:"
      && !hasExplicitPort
      && CATALOG_IMAGE_HOSTS.includes(url.hostname as (typeof CATALOG_IMAGE_HOSTS)[number]);
  } catch {
    return false;
  }
}
