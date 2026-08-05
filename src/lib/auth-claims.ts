export function esClaimAdmin(claims: Record<string, unknown> | null | undefined): boolean {
  return claims?.admin === true;
}
