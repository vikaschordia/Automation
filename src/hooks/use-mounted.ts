import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** Lint-clean way to detect client-only mount (avoids the `setState`-in-effect pattern). */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
