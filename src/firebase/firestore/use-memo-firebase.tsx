import { useMemo } from 'react';

export function useMemoFirebase<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  // This compatibility wrapper intentionally forwards the caller's dependency list.
  // The hooks linter cannot statically inspect a dependency list received as an argument.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(), deps);
}
