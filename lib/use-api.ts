'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';

/**
 * Minimal data-fetching hook: enough for this app's read-then-refresh screens
 * without pulling in a client-cache library.
 *
 * `path` doubles as the dependency, so building it from state (filters, dates,
 * pagination) is all a screen needs to refetch.
 */
export function useApi<T>(path: string | null, options: { skip?: boolean } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path) && !options.skip);

  // Guards against a slow earlier request overwriting a newer, faster one.
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!path || options.skip) {
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const result = await api.get<T>(path);
      if (id === requestId.current) setData(result);
    } catch (err) {
      if (id === requestId.current) setError(err as ApiError);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [path, options.skip]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load, setData };
}

/** Tracks the in-flight state of a write, so a button can disable itself. */
export function useMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>
) {
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (...args: TArgs) => {
      setPending(true);
      try {
        return await fn(...args);
      } finally {
        setPending(false);
      }
    },
    [fn]
  );

  return { run, pending };
}

/** Delays a fast-changing value — used so a search box does not fire per keystroke. */
export function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
