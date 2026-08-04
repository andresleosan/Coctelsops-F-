import { describe, expect, it } from 'vitest';

import { safeDestination } from '@/lib/auth-redirect';

describe('safeDestination', () => {
  it.each(['/checkout', '/cuenta?tab=pedidos', '/menu#popular'])('permite rutas locales: %s', (destination) => {
    expect(safeDestination(destination)).toBe(destination);
  });

  it.each([
    undefined,
    '',
    '//evil.com',
    '/\\evil.com',
    '\\evil.com',
    'https://evil.com',
    '/%5C%5Cevil.com',
    '/%2F%2Fevil.com',
    '/ruta/%E0%A4%A',
  ])('rechaza destinos externos o malformados: %s', (destination) => {
    expect(safeDestination(destination)).toBe('/');
  });
});
