import { useCallback } from 'react';

/**
 * Rate limiting is handled server-side.
 * The worker returns a limit message via SSE when the daily limit is hit.
 */
export function useRateLimit() {
  const increment = useCallback(() => {}, []);

  return {
    remaining: 999,
    increment,
    isExhausted: false,
  };
}
