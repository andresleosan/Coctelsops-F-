import { describe, expect, it } from 'vitest';

import { isCurrentAuthSession } from '@/lib/auth-session';

describe('isCurrentAuthSession', () => {
  it('acepta el resultado de la sesión vigente', () => {
    expect(isCurrentAuthSession(3, 3)).toBe(true);
  });

  it('rechaza el resultado de una sesión anterior', () => {
    expect(isCurrentAuthSession(4, 3)).toBe(false);
  });
});
