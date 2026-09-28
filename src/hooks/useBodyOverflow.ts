// ============================================================================
// useBodyOverflow.ts — Safe, ref-counted body overflow lock
// Replaces direct document.body.style manipulation.
// Multiple components can lock simultaneously; overflow restores when all unlock.
// ============================================================================

import { useEffect, useRef } from "react";

const lockCount = { current: 0 };

export function useBodyOverflow(locked: boolean) {
  const didLock = useRef(false);

  useEffect(() => {
    if (locked && !didLock.current) {
      lockCount.current += 1;
      didLock.current = true;
      if (lockCount.current === 1) {
        document.body.style.overflow = "hidden";
      }
    } else if (!locked && didLock.current) {
      lockCount.current = Math.max(0, lockCount.current - 1);
      didLock.current = false;
      if (lockCount.current === 0) {
        document.body.style.overflow = "";
      }
    }

    return () => {
      if (didLock.current) {
        lockCount.current = Math.max(0, lockCount.current - 1);
        didLock.current = false;
        if (lockCount.current === 0) {
          document.body.style.overflow = "";
        }
      }
    };
  }, [locked]);
}
