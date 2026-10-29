const runtimeVariables = [
  "PATH", "Path", "PATHEXT", "ComSpec", "COMSPEC", "SystemRoot", "SYSTEMROOT", "WINDIR",
  "TEMP", "TMP", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "HOME", "HOMEDRIVE",
  "HOMEPATH", "JAVA_HOME", "PNPM_HOME",
] as const;

export function selectLocalEmulatorProcessEnvironment(
  baseEnvironment: Record<string, string | undefined>,
): NodeJS.ProcessEnv {
  const environment = {} as NodeJS.ProcessEnv;
  for (const name of runtimeVariables) {
    const value = baseEnvironment[name];
    if (value !== undefined) environment[name] = value;
  }
  return environment;
}
