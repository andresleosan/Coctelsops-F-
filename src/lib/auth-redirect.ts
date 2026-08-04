const LOCAL_ORIGIN = 'https://coctels-ops.local';

export function safeDestination(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/';
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return '/';
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\')) {
    return '/';
  }

  try {
    const parsed = new URL(decoded, LOCAL_ORIGIN);
    if (
      parsed.origin !== LOCAL_ORIGIN ||
      !parsed.pathname.startsWith('/') ||
      parsed.pathname.startsWith('//') ||
      parsed.pathname.includes('\\')
    ) {
      return '/';
    }
  } catch {
    return '/';
  }

  return value;
}
