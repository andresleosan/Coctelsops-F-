export function isCurrentAuthSession(currentVersion: number, resultVersion: number): boolean {
  return currentVersion === resultVersion;
}
