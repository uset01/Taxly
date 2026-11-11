import { useEffect, useState } from "react";

/**
 * Animates a numeric currency/counter value from 0 to `targetValue` using ease-out cubic timing.
 */
export function useCountUp(
  targetValue: number,
  active: boolean,
  durationMs = 1000
): number {
  const [value, setValue] = useState<number>(0);

  useEffect(() => {
    if (!active) return;

    let startTime: number | null = null;
    let animationFrameId = 0;

    const step = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setValue(Number((targetValue * easedProgress).toFixed(2)));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setValue(targetValue);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [targetValue, active, durationMs]);

  return active ? value : targetValue;
}

