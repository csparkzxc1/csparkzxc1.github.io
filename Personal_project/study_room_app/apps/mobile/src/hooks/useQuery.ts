import { useCallback, useEffect, useRef, useState } from "react";

type State<T> =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: Error };

/**
 * Tiny query hook for MVP. Calls `fetcher` on mount and whenever deps
 * change. Returns {status, data, error, refetch}. Avoids react-query
 * dependency until we have multiple screens sharing the same cache.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({
    status: "idle",
    data: null,
    error: null,
  });
  const mounted = useRef(true);

  const run = useCallback(async () => {
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await fetcher();
      if (mounted.current) setState({ status: "success", data, error: null });
    } catch (err) {
      if (mounted.current) {
        setState({ status: "error", data: null, error: err as Error });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mounted.current = true;
    run();
    return () => {
      mounted.current = false;
    };
  }, [run]);

  return { ...state, refetch: run };
}
