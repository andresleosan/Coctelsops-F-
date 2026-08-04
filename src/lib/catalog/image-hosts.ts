export const CATALOG_IMAGE_HOSTS = [
  "placehold.co",
  "images.unsplash.com",
  "picsum.photos",
] as const;

export function isAllowedCatalogImage(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;

  try {
    const url = new URL(value);
    const schemeSeparator = value.indexOf("://");
    const authorityStart = schemeSeparator + 3;
    const remainder = value.slice(authorityStart);
    const authorityEnd = remainder.search(/[/?#]/);
    const authority = remainder.slice(0, authorityEnd === -1 ? remainder.length : authorityEnd);
    const hostPort = authority.slice(authority.lastIndexOf("@") + 1);
    const hasExplicitPort = hostPort.includes(":");
    return url.protocol === "https:"
      && !hasExplicitPort
      && !url.username
      && !url.password
      && CATALOG_IMAGE_HOSTS.includes(url.hostname as (typeof CATALOG_IMAGE_HOSTS)[number]);
  } catch {
    return false;
  }
}
